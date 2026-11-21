# Blender で見た目の素材を作る共通の部品（docs/12：V5 以降は Blender で作り、絵を焼いて GLB で入れる）。
# 座標は Blender（Z が上・正面は −Y）。glTF に書き出すとゲームの Y 上・+Z 正面になる。
# 流れ：形を作る → （細かい形から）UV・位置・部位・陰（AO）・凹凸を焼く → numpy で色と透明を描く → 1つの材質で GLB → WebP に圧縮
import math, os, subprocess
import bpy, bmesh
import numpy as np
from mathutils import Vector


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 32
    return sc


def new_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def select_only(*obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[-1]


def apply_mods(ob):
    select_only(ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def smooth(ob, on=True):
    for p in ob.data.polygons:
        p.use_smooth = on


def catmull(p, n):
    out = []
    P = [Vector(p[0])] + [Vector(q) for q in p] + [Vector(p[-1])]
    for i in range(1, len(P) - 2):
        for k in range(n):
            t = k / n
            a, b, c, d = P[i - 1], P[i], P[i + 1], P[i + 2]
            out.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
    out.append(Vector(p[-1]))
    return out


# ---------------- 焼き込み ----------------
def _image(name, res):
    return bpy.data.images.new(name, res, res, float_buffer=True, alpha=True)


def _set_materials(obs, builder):
    for ob in obs:
        if not ob.data.materials:
            ob.data.materials.append(bpy.data.materials.new(ob.name + '_m'))
        for k, mat in enumerate(ob.data.materials):
            mat.use_nodes = True
            nt = mat.node_tree
            nt.nodes.clear()
            out = nt.nodes.new('ShaderNodeOutputMaterial')
            builder(nt.nodes, nt.links, k, out)


def _bake(target, kind, img, high=None, **kw):
    for mat in target.data.materials:
        t = mat.node_tree.nodes.new('ShaderNodeTexImage')
        t.image = img
        mat.node_tree.nodes.active = t
    if high is not None:
        select_only(high, target)
        bpy.ops.object.bake(type=kind, margin=8, use_clear=True, use_selected_to_active=True, cage_extrusion=0.06, **kw)
    else:
        select_only(target)
        bpy.ops.object.bake(type=kind, margin=8, use_clear=True, **kw)


def _emit(make):
    def b(nodes, links, k, out):
        em = nodes.new('ShaderNodeEmission')
        make(nodes, links, k, em.inputs['Color'])
        links.new(em.outputs[0], out.inputs['Surface'])
    return b


def _arr(img, res):
    a = np.empty(res * res * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(res, res, 4)


def unwrap(ob, margin=0.006):
    select_only(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')


def bake_maps(ob, res, high=None, bump=None):
    """位置（物体の座標）・面の向き（物体の座標）・部位（材質の番号）・陰（AO）・凹凸（接線の向き）を焼く。
    high＝細かい形（あれば、その形の凹凸と陰を ob へ写す）。bump＝builder(nodes, links, k, out) で凹凸を足すとき。"""
    srcs = [ob] + ([high] if high else [])
    def pos(nodes, links, k, sock):
        g = nodes.new('ShaderNodeNewGeometry')
        m = nodes.new('ShaderNodeVectorMath'); m.operation = 'MULTIPLY_ADD'
        m.inputs[1].default_value = (0.125, 0.125, 0.125); m.inputs[2].default_value = (0.5, 0.5, 0.5)
        links.new(g.outputs['Position'], m.inputs[0]); links.new(m.outputs[0], sock)
    def nrm(nodes, links, k, sock):
        g = nodes.new('ShaderNodeNewGeometry')
        m = nodes.new('ShaderNodeVectorMath'); m.operation = 'MULTIPLY_ADD'
        m.inputs[1].default_value = (0.5, 0.5, 0.5); m.inputs[2].default_value = (0.5, 0.5, 0.5)
        links.new(g.outputs['Normal'], m.inputs[0]); links.new(m.outputs[0], sock)
    def pid(nodes, links, k, sock):
        sock.default_value = (k / 16 + 1 / 32, 0, 0, 1)
    out = {}
    for name, b in (('pos', pos), ('nrm', nrm), ('id', pid)):
        img = _image(name, res)
        _set_materials(srcs, _emit(b))
        _bake(ob, 'EMIT', img, high)
        out[name] = _arr(img, res)
    def diffuse(nodes, links, k, o):
        d = nodes.new('ShaderNodeBsdfDiffuse'); links.new(d.outputs[0], o.inputs['Surface'])
    img = _image('ao', res)
    _set_materials(srcs, diffuse)
    _bake(ob, 'AO', img, high)
    out['ao'] = _arr(img, res)
    img = _image('tn', res)
    _set_materials(srcs, bump or diffuse)
    _bake(ob, 'NORMAL', img, high, normal_space='TANGENT')
    out['tn'] = img
    P = (out['pos'][..., :3] - 0.5) * 8.0
    N = out['nrm'][..., :3] * 2 - 1
    return {'P': P, 'N': N, 'PID': np.floor(out['id'][..., 0] * 16).astype(np.int32), 'AO': out['ao'][..., 0],
            'valid': out['id'][..., 3] > 0.5, 'normal_img': out['tn']}


def export_glb(ob, rgba, normal_img, path, res, webp_quality=88):
    """色（RGBA）と凹凸の絵を1つの材質に貼り、GLB に書き出して WebP に圧縮する。"""
    work = os.path.dirname(path)
    tex = bpy.data.images.new(os.path.basename(path) + '_col', res, res, alpha=True)
    tex.pixels.foreach_set(np.clip(rgba, 0, 1).astype(np.float32).ravel())
    tex.filepath_raw = path.replace('.glb', '_col.png'); tex.file_format = 'PNG'; tex.save()
    n8 = bpy.data.images.new(os.path.basename(path) + '_nrm', res, res, alpha=False)
    n8.pixels.foreach_set(_arr(normal_img, res).ravel())
    n8.filepath_raw = path.replace('.glb', '_nrm.png'); n8.file_format = 'PNG'; n8.save()
    mat = bpy.data.materials.new(os.path.basename(path))
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = tex
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = n8; n8.colorspace_settings.name = 'Non-Color'
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tc.outputs['Alpha'], bsdf.inputs['Alpha'])
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    select_only(ob)
    raw = path.replace('.glb', '_raw.glb')
    bpy.ops.export_scene.gltf(filepath=raw, export_format='GLB', use_selection=True, export_yup=True, export_image_format='AUTO')
    subprocess.run(['npx', '-y', '@gltf-transform/cli@4.1.1', 'webp', raw, path, '--quality', str(webp_quality)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.getsize(path)


# ---------------- 色を描く道具（numpy） ----------------
def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def vnoise(px, py, pz, f, seed=0):
    g = np.random.default_rng(seed).random((64, 64, 64)).astype(np.float32)
    X, Y, Z = px * f, py * f, pz * f
    ix, iy, iz = np.floor(X).astype(int), np.floor(Y).astype(int), np.floor(Z).astype(int)
    fx, fy, fz = X - ix, Y - iy, Z - iz
    fx, fy, fz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    def G(a, b, c):
        return g[a % 64, b % 64, c % 64]
    c00 = G(ix, iy, iz) * (1 - fx) + G(ix + 1, iy, iz) * fx
    c10 = G(ix, iy + 1, iz) * (1 - fx) + G(ix + 1, iy + 1, iz) * fx
    c01 = G(ix, iy, iz + 1) * (1 - fx) + G(ix + 1, iy, iz + 1) * fx
    c11 = G(ix, iy + 1, iz + 1) * (1 - fx) + G(ix + 1, iy + 1, iz + 1) * fx
    return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz


def fbm(px, py, pz, f, oct=4, seed=0):
    s, a, t = 0, 0.5, 0
    for o in range(oct):
        s += a * vnoise(px, py, pz, f * 2 ** o, seed + o)
        t += a
        a *= 0.5
    return s / t


def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    if a.ndim == 1:
        a = a[None, None]
    if b.ndim == 1:
        b = b[None, None]
    return a * (1 - t) + b * t


def sstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
