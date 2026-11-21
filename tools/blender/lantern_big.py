# 大きな石灯籠（lanternBig）を Blender で作る（docs/12 の12章。参考：design-notes/lookdev/atelier/lantern_ref.png）。
# 寸法は models.js の lanternBig と同じ。少ない三角形のきれいな形（低）と、角が欠けて風化した細かい形（高）を作り、高の凹凸と陰を低へ焼く。
# 部位（材質の番号）：0 石 1 火袋（窓は透明・格子は石） 2 灯（光る）
# 使い方：<bpy の Python> tools/blender/lantern_big.py <作業フォルダ> <GLB の出力先>
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
import lib

WORK, GLB = sys.argv[-2], sys.argv[-1]
os.makedirs(WORK, exist_ok=True)
RES = 1024


def box(bm, w, h, d, y0, yaw=0.0, x=0.0, z=0.0, mat=0):
    """ゲームの座標（y 上・z 前）の箱を Blender（z 上・−y 前）へ。底が y0。"""
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    m = Matrix.Translation((x, -z, y0 + h / 2)) @ Matrix.Rotation(math.radians(yaw), 4, 'Z') @ Matrix.Diagonal((w, d, h, 1))
    bmesh.ops.transform(bm, matrix=m, verts=vs)
    for f in {f for v in vs for f in v.link_faces}:
        f.material_index = mat
    return vs


def lathe(bm, pts, seg, y0, rot=0.0, corner=None, mat=0):
    """回転体（ゲームの [半径, 高さ] の点）。corner＝(持ち上げ, 四角へ寄せる割合)：笠の四隅の反り。"""
    rings = []
    rmax = max(p[0] for p in pts)
    for (r, h) in pts:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg + math.radians(rot)
            ca, sa = math.cos(a), math.sin(a)
            rr, lift = r, 0.0
            if corner and r > 0:
                sq = r / max(abs(ca), abs(sa))
                rr = r * (1 - corner[1]) + sq * corner[1]
                c = 1 - abs(abs(ca) - abs(sa))
                lift = corner[0] * c ** 3 * (r / rmax) ** 2
            ring.append(bm.verts.new((ca * rr, sa * rr, y0 + h + lift)))
        rings.append(ring)
    fs = []
    for j in range(len(rings) - 1):
        for i in range(seg):
            a, b, c, d = rings[j][i], rings[j][(i + 1) % seg], rings[j + 1][(i + 1) % seg], rings[j + 1][i]
            if a.co == d.co and b.co == c.co:
                continue
            try:
                f = bm.faces.new((a, b, c, d) if (a is not d and b is not c) else (a, b, c))
                f.material_index = mat
                fs.append(f)
            except ValueError:
                pass
    return rings


def build_low():
    bm = bmesh.new()
    box(bm, 1.62, 0.62, 1.58, -0.16, 2)                     # 基礎
    box(bm, 1.18, 0.26, 1.16, 0.46, -3, 0.02, 0.01)         # 基礎の上段
    lathe(bm, [(0.0, 0.0), (0.47, 0.0), (0.475, 0.12), (0.45, 0.38), (0.41, 0.6), (0.37, 0.77), (0.0, 0.77)], 8, 0.72, 22.5)  # 竿（八角）
    box(bm, 0.86, 0.1, 0.86, 1.48)                           # 中台
    box(bm, 1.08, 0.2, 1.08, 1.57)
    box(bm, 0.74, 0.07, 0.74, 1.77)                          # 火袋の下の帯
    box(bm, 0.74, 0.42, 0.74, 1.83, mat=1)                   # 火袋（窓は絵で抜く）
    box(bm, 0.56, 0.38, 0.56, 1.85, mat=2)                   # 中の灯
    box(bm, 0.74, 0.08, 0.74, 2.24)                          # 火袋の上の帯
    box(bm, 1.3, 0.05, 1.3, 2.31)                            # 笠の裏の板
    lathe(bm, [(0.0, 0.0), (0.8, -0.02), (0.88, 0.04), (0.89, 0.13), (0.8, 0.17), (0.62, 0.22), (0.42, 0.29), (0.24, 0.37), (0.12, 0.41), (0.0, 0.42)],
          24, 2.3, 45 / 2, (0.17, 0.85))                      # 笠：四角に寄せ、四隅が反る
    box(bm, 0.26, 0.14, 0.26, 2.7)                           # 宝珠の首
    lathe(bm, [(0.0, 0.0), (0.13, 0.02), (0.22, 0.09), (0.24, 0.17), (0.21, 0.25), (0.13, 0.31), (0.06, 0.36), (0.025, 0.4), (0.0, 0.42)], 14, 2.83)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = lib.new_obj('low', bm)
    for k in range(3):
        ob.data.materials.append(bpy.data.materials.new(f'p{k}'))
    # 面取り（1段）で角を丸く見せる（陰影の境が柔らかくなる）
    bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = 0.012; bv.segments = 1; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50)
    lib.apply_mods(ob)
    lib.smooth(ob)
    es = ob.modifiers.new('split', 'EDGE_SPLIT'); es.split_angle = math.radians(40)
    lib.apply_mods(ob)
    return ob


def build_high(low):
    high = low.copy(); high.data = low.data.copy(); high.name = 'high'
    bpy.context.scene.collection.objects.link(high)
    m = high.modifiers.new('remesh', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = 0.012
    for name, kind, size, strength in (('chips', 'VORONOI', 0.12, 0.022), ('grain', 'CLOUDS', 0.03, 0.006)):
        tex = bpy.data.textures.new(name, kind); tex.noise_scale = size
        d = high.modifiers.new(name, 'DISPLACE'); d.texture = tex; d.strength = strength; d.mid_level = 0.65 if kind == 'VORONOI' else 0.5
        d.texture_coords = 'OBJECT'
    lib.apply_mods(high)
    lib.smooth(high)
    return high


def paint(m):
    P, N, AO, PID, valid = m['P'], m['N'], m['AO'], m['PID'], m['valid']
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    n1 = lib.fbm(x, y, z, 2.2, 4, 3)
    n2 = lib.fbm(x, y, z, 8, 3, 7)
    col = lib.mix(lib.hexc('#b9b2ab'), lib.hexc('#8f8781'), lib.sstep(0.35, 0.72, n1))
    col = lib.mix(col, lib.hexc('#cfc8bd'), lib.sstep(0.65, 0.8, n2) * 0.35)
    up = N[..., 2]
    moss = lib.sstep(0.25, 0.75, up) * lib.sstep(0.3, 0.5, lib.fbm(x, y, z, 3.5, 4, 11))       # 上を向いた面に厚い苔
    moss = np.maximum(moss, lib.sstep(0.56, 0.7, lib.fbm(x, y, z, 4.5, 4, 12)) * 0.85)            # 側面のまだら
    col = lib.mix(col, lib.mix(lib.hexc('#6f7a3c'), lib.hexc('#9a9a52'), n2), moss * 0.9)
    col = lib.mix(col, lib.hexc('#d6d0c2'), lib.sstep(0.72, 0.8, lib.fbm(x, y, z, 12, 2, 13)) * 0.5)  # 地衣の白い斑点
    cr = np.abs(lib.fbm(x, y, z, 2.0, 3, 17) - 0.5)
    col = lib.mix(col, lib.hexc('#3e3640'), lib.sstep(0.008, 0.002, cr) * lib.sstep(0.5, 0.65, lib.fbm(x, y, z, 5, 2, 19)) * 0.45)
    col = col * (0.75 + 0.25 * lib.sstep(-0.1, 0.6, z))[..., None]                                     # 根元ほど暗い
    col = col * (0.55 + 0.45 * AO)[..., None]
    alpha = np.ones_like(z)
    # 火袋の窓：各面の中央を抜き、縦2本・横2本の格子を残す
    hib = valid & (PID == 1)
    face_x = np.abs(x) > np.abs(y)
    u = np.where(face_x, y, x)          # 面の上での横
    v = z - 2.04                         # 火袋の中心の高さからの縦
    win = (np.abs(u) < 0.19) & (np.abs(v) < 0.15)
    bar = (np.abs(np.abs(u) - 0.065) < 0.014) | (np.abs(np.abs(v) - 0.05) < 0.012) | (np.abs(u) > 0.172) | (np.abs(v) > 0.135)
    alpha[hib & win & ~bar] = 0
    col[hib & win & bar] = lib.hexc('#3e3640') * 0.9 + col[hib & win & bar] * 0.1
    glow = valid & (PID == 2)
    col[glow] = lib.hexc('#f2c27a')
    alpha[glow] = 1
    rgba = np.concatenate([col, alpha[..., None]], -1)
    rgba[~valid] = 0
    rgba[~valid, 3] = 1
    return rgba


lib.reset()
low = build_low()
high = build_high(low)
lib.unwrap(low)
maps = lib.bake_maps(low, RES, high=high)
rgba = paint(maps)
bpy.data.objects.remove(high)
lib.set_glow(low, {2})
size = lib.export_glb(low, rgba, maps['normal_img'], GLB, RES)
print('LANTERN tris', lib.tris(low), 'bytes', size)
