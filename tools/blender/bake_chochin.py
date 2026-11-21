# 提灯お化けの絵を焼き込み、GLB に書き出す（V5 の Blender 試作）。
# 1. UV を展開 2. 位置・部位・陰（AO）・凹凸（紙のしわ）を Cycles で焼く 3. 位置と部位から numpy で色と透明（破れ穴・口）を描く
# 4. 色（RGBA）と凹凸の絵を1つの材質に貼って GLB に書き出す
# 使い方：python tools/blender/bake_chochin.py <作業フォルダ（chochin_model.blend がある）> <GLB の出力先>
# 出力は <名前>_raw.glb。そのあと画像を WebP に圧縮する：npx -y @gltf-transform/cli@4.1.1 webp X_raw.glb public/assets/lookdev/chochin.glb --quality 90
import sys, os, math
import bpy
import numpy as np

WORK, GLB = sys.argv[-2], sys.argv[-1]
RES = 1024
bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, 'chochin_model.blend'))
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 32
ob = bpy.data.objects['chochin']
bpy.context.view_layer.objects.active = ob
ob.select_set(True)

# ---- 1. UV ----
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.006)
bpy.ops.object.mode_set(mode='OBJECT')

def image(name, float_buf=True):
    im = bpy.data.images.get(name) or bpy.data.images.new(name, RES, RES, float_buffer=float_buf, alpha=True)
    return im

def set_all_materials(builder):
    """全部の材質の中身を作り直す。builder(nodes, links, part番号) が出力につなぐ。焼き先の画像ノードを選んでおく。"""
    for k, mat in enumerate(ob.data.materials):
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        builder(nt.nodes, nt.links, k, out)

def bake(kind, img, **kw):
    for mat in ob.data.materials:
        nt = mat.node_tree
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img
        nt.nodes.active = t
    bpy.ops.object.bake(type=kind, margin=6, use_clear=True, **kw)

def emit_builder(make_color):
    def b(nodes, links, k, out):
        em = nodes.new('ShaderNodeEmission')
        make_color(nodes, links, k, em.inputs['Color'])
        links.new(em.outputs[0], out.inputs['Surface'])
    return b

# 位置（物体の座標。−2〜2 m を 0〜1 に）
def pos_color(nodes, links, k, sock):
    g = nodes.new('ShaderNodeNewGeometry')
    m = nodes.new('ShaderNodeVectorMath'); m.operation = 'MULTIPLY_ADD'
    m.inputs[1].default_value = (0.25, 0.25, 0.25); m.inputs[2].default_value = (0.5, 0.5, 0.5)
    links.new(g.outputs['Position'], m.inputs[0]); links.new(m.outputs[0], sock)
def id_color(nodes, links, k, sock):
    sock.default_value = (k / 8 + 1 / 16, 0, 0, 1)

img_pos, img_id, img_ao, img_n = image('pos'), image('id'), image('ao'), image('nrm')
set_all_materials(emit_builder(pos_color)); bake('EMIT', img_pos)
set_all_materials(emit_builder(id_color)); bake('EMIT', img_id)
def ao_builder(nodes, links, k, out):
    d = nodes.new('ShaderNodeBsdfDiffuse'); links.new(d.outputs[0], out.inputs['Surface'])
set_all_materials(ao_builder); bake('AO', img_ao)

# 凹凸：紙は横の繊維の筋＋しわ、舌は細かな粒、まぶたはしわの輪、ほかは弱い粒
def bump_builder(nodes, links, k, out):
    bs = nodes.new('ShaderNodeBsdfDiffuse')
    bump = nodes.new('ShaderNodeBump')
    tc = nodes.new('ShaderNodeTexCoord')
    nz = nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9 if k == 0 else 30; nz.inputs['Detail'].default_value = 8
    links.new(tc.outputs['Object'], nz.inputs['Vector'])
    h = nz.outputs['Fac']
    if k == 0:
        wv = nodes.new('ShaderNodeTexWave'); wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 26; wv.inputs['Distortion'].default_value = 6
        wv.inputs['Detail'].default_value = 4
        links.new(tc.outputs['Object'], wv.inputs['Vector'])
        mx = nodes.new('ShaderNodeMath'); mx.operation = 'ADD'
        links.new(nz.outputs['Fac'], mx.inputs[0]); links.new(wv.outputs['Fac'], mx.inputs[1])
        h = mx.outputs[0]
    bump.inputs['Strength'].default_value = {0: 0.28, 3: 0.15, 4: 0.2}.get(k, 0.15)
    bump.inputs['Distance'].default_value = 0.02
    links.new(h, bump.inputs['Height']); links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    links.new(bs.outputs[0], out.inputs['Surface'])
set_all_materials(bump_builder); bake('NORMAL', img_n, normal_space='TANGENT')

# ---- 3. numpy で色と透明を描く ----
def arr(img):
    a = np.empty(RES * RES * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(RES, RES, 4)
P = (arr(img_pos)[..., :3] - 0.5) * 4.0
PID = np.floor(arr(img_id)[..., 0] * 8).astype(np.int32)
AO = arr(img_ao)[..., 0]
valid = arr(img_id)[..., 3] > 0.5
x, y, z = P[..., 0], P[..., 1], P[..., 2]
rng = np.random.default_rng(7)

def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)
def vnoise(px, py, pz, f, seed=0):
    """なめらかな値ノイズ（格子の乱数を三重線形補間）。"""
    g = np.random.default_rng(seed).random((64, 64, 64)).astype(np.float32)
    X, Y, Z = px * f, py * f, pz * f
    ix, iy, iz = np.floor(X).astype(int), np.floor(Y).astype(int), np.floor(Z).astype(int)
    fx, fy, fz = X - ix, Y - iy, Z - iz
    fx, fy, fz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    def G(a, b, c): return g[a % 64, b % 64, c % 64]
    c00 = G(ix, iy, iz) * (1 - fx) + G(ix + 1, iy, iz) * fx
    c10 = G(ix, iy + 1, iz) * (1 - fx) + G(ix + 1, iy + 1, iz) * fx
    c01 = G(ix, iy, iz + 1) * (1 - fx) + G(ix + 1, iy, iz + 1) * fx
    c11 = G(ix, iy + 1, iz + 1) * (1 - fx) + G(ix + 1, iy + 1, iz + 1) * fx
    return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz
def fbm(px, py, pz, f, oct=4, seed=0):
    s, a, t = 0, 0.5, 0
    for o in range(oct):
        s += a * vnoise(px, py, pz, f * 2 ** o, seed + o); t += a; a *= 0.5
    return s / t
def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    return a * (1 - t) + b * t
def smooth(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

col = np.zeros((RES, RES, 3), np.float32)
alpha = np.ones((RES, RES), np.float32)
ang = np.arctan2(x, -y)          # 0＝正面
arcS = ang * 0.52                 # 正面からの弧長（m）
n1 = fbm(x, y, z, 3, 4, 1)
n2 = fbm(x, y, z, 12, 3, 2)

# 紙
paper = mix(hexc('#e0cfa6')[None, None], hexc('#b99f74')[None, None], smooth(0.35, 0.7, n1))
paper = mix(paper, hexc('#9a7a50')[None, None], smooth(0.62, 0.8, fbm(x, y, z, 5, 4, 3)) * 0.55)   # しみ
fiber = np.abs(np.sin(z * 140 + n2 * 9)) ** 30
paper = mix(paper, hexc('#8c7454')[None, None], fiber * 0.15 * smooth(0.4, 0.6, fbm(x, y, z, 6, 2, 21)))                                          # 横の繊維の筋
soot = 1 - smooth(0.18, 0.52, z + (n1 - 0.5) * 0.25)
paper = mix(paper, hexc('#2a2420')[None, None], soot * 0.92)                                           # 下の煤
for i, rh in enumerate([0.135 + 0.1 * i for i in range(13)]):                                         # 横の骨の墨線（太い骨は3本に1本、ほかは淡く途切れる）
    strong = 0.8 if i % 3 == 1 else 0.3
    brk = smooth(0.35, 0.55, fbm(x * 3, y * 3, np.full_like(z, rh * 7), 4, 2, 20 + i))
    paper = mix(paper, hexc('#4a3a2c')[None, None], np.exp(-((z - rh) / 0.005) ** 2) * strong * brk)
for k8 in range(8):                                                                                    # 縦の骨（細い線）
    da = np.angle(np.exp(1j * (ang - (k8 + 0.5) * math.pi / 4)))
    paper = mix(paper, hexc('#5a4632')[None, None], np.exp(-((da * 0.52) / 0.004) ** 2) * 0.5)
# 目のまわりのしわ（目の下に弧）
de = np.hypot(arcS, (z - 0.92) * 1.2)
for rr in (0.2, 0.235, 0.27):
    m = np.exp(-((de - rr) / 0.005) ** 2) * (z < 0.95) * smooth(0.25, 0.05, np.abs(arcS))
    paper = mix(paper, hexc('#5c4630')[None, None], m * 0.6)
paper = mix(paper, hexc('#7a5e40')[None, None], np.exp(-((de - 0.17) / 0.04) ** 2) * 0.35)

# 口（三日月の裂け目）と破れ穴：透明。縁は焦げ茶
jag = (fbm(x, y, z, 30, 2, 9) - 0.5) * 0.05
top = 0.64 + 0.42 * arcS ** 2 + jag
bot = 0.36 + 1.25 * arcS ** 2 + jag
front = np.cos(ang) > 0.2
mouth = front & (z < top) & (z > bot)
holes = np.zeros_like(alpha, dtype=bool)
edge = np.zeros_like(alpha)
for (ha, hh, hr) in [(1.1, 1.15, 0.05), (-1.25, 1.02, 0.04), (2.4, 0.8, 0.06), (-2.2, 0.45, 0.05), (0.9, 0.3, 0.035), (-0.75, 0.28, 0.03), (3.0, 1.2, 0.045)]:
    dd = np.hypot(np.angle(np.exp(1j * (ang - ha))) * 0.52, (z - hh) * 1.6) - hr * (1 + (fbm(x, y, z, 18, 2, 11) - 0.5) * 0.9)
    holes |= dd < 0
    edge = np.maximum(edge, np.exp(-np.maximum(dd, 0) / 0.012))
dm = np.minimum(np.abs(z - top), np.abs(z - bot)) * front
edge = np.maximum(edge, np.where(front & (z < top + 0.03) & (z > bot - 0.03), np.exp(-dm / 0.01), 0))
paper = mix(paper, hexc('#5a3e24')[None, None], edge * 0.7)
is_paper = valid & (PID == 0)
col[is_paper] = paper[is_paper]
alpha[is_paper & (mouth | holes)] = 0

# 口の中：歯ぐきの桃色、奥は暗い
m = valid & (PID == 1)
gum = mix(hexc('#d98890')[None, None], hexc('#5a2a30')[None, None], smooth(-0.3, -0.05, y))
col[m] = gum[m]

# 目玉：白目（黄ばみ）→ 琥珀の瞳（外は濃い縁）→ 黒い瞳孔 → 光
m = valid & (PID == 2)
v = np.stack([x, y + 0.5, z - 0.92], -1)
vn = v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)
th = np.arccos(np.clip(-vn[..., 1], -1, 1))
eyec = mix(hexc('#efe6cf')[None, None], hexc('#c79a7a')[None, None], smooth(0.9, 1.4, th) * 0.6)
iris = mix(hexc('#f0a640')[None, None], hexc('#9a5420')[None, None], smooth(0.1, 0.5, th))
iris = mix(iris, hexc('#5a3014')[None, None], np.abs(np.sin(np.arctan2(vn[..., 2], vn[..., 0]) * 18)) ** 6 * 0.4)
eyec = mix(eyec, iris, smooth(0.56, 0.52, th))
eyec = mix(eyec, hexc('#3a2010')[None, None], np.exp(-((th - 0.54) / 0.025) ** 2))
eyec = mix(eyec, hexc('#0c0a0a')[None, None], smooth(0.22, 0.19, th))
hl = np.hypot(vn[..., 0] + 0.16, vn[..., 2] - 0.18)
eyec = mix(eyec, hexc('#ffffff')[None, None], smooth(0.07, 0.05, hl))
col[m] = eyec[m]

# まぶた：紙と同じ黄ばみに少し赤み、しわの線
m = valid & (PID == 3)
lid = mix(hexc('#d6bf92')[None, None], hexc('#a6845e')[None, None], smooth(0.3, 0.7, n1))
lid = mix(lid, hexc('#5c4630')[None, None], np.abs(np.sin(np.hypot(x, z - 0.92) * 220)) ** 20 * 0.4)
col[m] = lid[m]

# 舌：桃色、上は明るく、真ん中の溝は濃い
m = valid & (PID == 4)
tg = mix(hexc('#d9808a')[None, None], hexc('#eeaaa8')[None, None], smooth(0.3, 0.8, fbm(x, y, z, 20, 3, 5)))
tg = mix(tg, hexc('#a84d5c')[None, None], np.exp(-(x / 0.015) ** 2) * 0.6)
col[m] = tg[m]

# 金輪・取っ手・鉤：黒に錆
m = valid & (PID == 5)
mt = mix(hexc('#2a2624')[None, None], hexc('#7a4428')[None, None], smooth(0.58, 0.72, fbm(x, y, z, 14, 4, 6)))
col[m] = mt[m]
# 折れた骨：竹
m = valid & (PID == 6)
col[m] = hexc('#b8a070')

# 陰（AO）を掛ける
col *= (0.45 + 0.55 * AO)[..., None]
out = np.concatenate([np.clip(col, 0, 1), alpha[..., None]], -1).astype(np.float32)
tex = bpy.data.images.new('chochin_col', RES, RES, alpha=True)
tex.pixels.foreach_set(out.ravel())
tex.filepath_raw = os.path.join(WORK, 'chochin_col.png'); tex.file_format = 'PNG'; tex.save()
img_n.filepath_raw = os.path.join(WORK, 'chochin_nrm.png'); img_n.file_format = 'PNG'
nrm8 = bpy.data.images.new('chochin_nrm', RES, RES, alpha=False)
nrm8.pixels.foreach_set(arr(img_n).ravel()); nrm8.filepath_raw = os.path.join(WORK, 'chochin_nrm.png'); nrm8.file_format = 'PNG'; nrm8.save()

# ---- 4. 1つの材質に貼って GLB へ ----
mat = bpy.data.materials.new('chochin')
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']
tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = tex
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm8; tn.image.colorspace_settings.name = 'Non-Color'
nm = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(tc.outputs['Alpha'], bsdf.inputs['Alpha'])
nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
ob.data.materials.clear()
ob.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=GLB.replace('.glb', '_raw.glb'), export_format='GLB', use_selection=True, export_tangents=True, export_yup=True,
                          export_image_format='AUTO')
print('GLB', GLB.replace('.glb', '_raw.glb'))
