# 岩（rockA・rockB・rockC・rockShore）を Blender で作る（docs/12：V5 以降の方針。参考：design-notes/lookdev/atelier/rocks_ref.png）。
# 細かい形（割れた平面＋欠け）→ 三角形を減らした形へ、凹凸と陰を焼く → 灰色の地・上の面と割れ目の苔・地衣の斑点を描く → GLB。
# 寸法は models.js の今の岩と同じ（球の半径 r と中心の高さ）。
# 使い方：<bpy の Python> tools/blender/rocks.py <作業フォルダ> <出力フォルダ（public/assets/lookdev）> [名前…]
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
import numpy as np
from mathutils import Vector
import lib

ROCKS = {
    # 名前: (半径 [x, z奥行, y高さ]（Blender の軸）, 中心の高さ, 割れ面の数, 種, 三角形, 絵の大きさ, 濡れ（岸の岩）)
    'rockA': ((0.9, 0.75, 0.55), 0.28, 9, 2, 700, 512, False),
    'rockB': ((0.7, 0.6, 0.8), 0.36, 9, 11, 700, 512, False),
    'rockC': ((1.5, 1.1, 0.62), 0.24, 11, 21, 900, 512, False),
    'rockShore': ((1.3, 1.1, 1.0), 0.2, 11, 31, 900, 512, True),
}
args = [a for a in sys.argv if not a.endswith('.py')]
WORK, OUT = args[-2] if len(args) >= 2 and not args[-1] in ROCKS else args[-2], args[-1]
names = [a for a in sys.argv if a in ROCKS] or list(ROCKS)
if names != list(ROCKS):
    WORK, OUT = [a for a in sys.argv[1:] if a not in ROCKS][-2:]
os.makedirs(WORK, exist_ok=True)


def build_high(r, cz, planes, seed):
    """球を楕円にし、でたらめな向きの平面で割って平らな面を作る。細かくしてから欠けと粒を足す。"""
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2] + cz))
    for k in range(planes):
        n = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.4, 1))).normalized()
        reach = math.sqrt((n.x * r[0]) ** 2 + (n.y * r[1]) ** 2 + (n.z * r[2]) ** 2)
        co = Vector((0, 0, cz)) + n * reach * (1 - rnd.uniform(0.25, 0.45))
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=n, clear_outer=True)
        edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    # 地面の下は平らに切る（埋めて置く）
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, -0.05), plane_no=(0, 0, -1), clear_outer=True)
    edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    if edges:
        bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    ob = lib.new_obj('high', bm)
    # 細かく（体積を保って格子に作り直す）→ 欠け（大きな凹凸）と粒（細かな凹凸）
    m = ob.modifiers.new('remesh', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = max(r) / 70
    for name, kind, size, strength in (('chips', 'VORONOI', 0.35, 0.05), ('grain', 'CLOUDS', 0.06, 0.012)):
        tex = bpy.data.textures.new(name, kind)
        tex.noise_scale = size
        if kind == 'VORONOI':
            tex.distance_metric = 'DISTANCE'
        d = ob.modifiers.new(name, 'DISPLACE'); d.texture = tex; d.strength = strength; d.mid_level = 0.6 if kind == 'VORONOI' else 0.5
        d.texture_coords = 'OBJECT'
    lib.apply_mods(ob)
    lib.smooth(ob)
    return ob


def build_low(high, target):
    low = high.copy()
    low.data = high.data.copy()
    low.name = 'low'
    bpy.context.scene.collection.objects.link(low)
    d = low.modifiers.new('dec', 'DECIMATE'); d.ratio = min(1.0, target / lib.tris(high))
    lib.apply_mods(low)
    lib.smooth(low)
    # 割れた平面の境（35° より鋭い辺）で面の向きを分ける：平らな面がはっきり読める
    es = low.modifiers.new('split', 'EDGE_SPLIT'); es.split_angle = math.radians(35)
    lib.apply_mods(low)
    return low


def paint(m, wet, seed):
    P, N, AO, valid = m['P'], m['N'], m['AO'], m['valid']
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    n1 = lib.fbm(x, y, z, 1.6, 4, seed)
    n2 = lib.fbm(x, y, z, 6, 3, seed + 5)
    stone = lib.mix(lib.hexc('#bdb8b3'), lib.hexc('#948e8b'), lib.sstep(0.35, 0.7, n1))
    stone = lib.mix(stone, lib.hexc('#b8ad9f'), lib.sstep(0.62, 0.8, n2) * 0.3)          # 明るい粒
    # 割れ目の墨線：低い周波数のノイズの等高線を数本だけ、途切れ途切れに
    cr = np.abs(lib.fbm(x, y, z, 1.3, 3, seed + 17) - 0.5)
    crack = lib.sstep(0.018, 0.004, cr) * lib.sstep(0.45, 0.6, lib.fbm(x, y, z, 3, 2, seed + 19))
    stone = lib.mix(stone, lib.hexc('#3e3640'), crack * 0.75)
    up = N[..., 2]
    # 苔：上を向いた面と、陰（割れ目・くぼみ）に寄せ、斑に
    moss_k = (lib.sstep(0.3, 0.75, up) * 1.0 + lib.sstep(0.6, 0.35, AO) * 0.4) * lib.sstep(0.42, 0.62, lib.fbm(x, y, z, 2.5, 4, seed + 9))
    stone = lib.mix(stone, lib.mix(lib.hexc('#6e7046'), lib.hexc('#8a8752'), n2), moss_k * (0.45 if wet else 0.8))
    # 地衣の白っぽい斑点
    stone = lib.mix(stone, lib.hexc('#c9c3b2'), lib.sstep(0.7, 0.78, lib.fbm(x, y, z, 9, 2, seed + 13)) * 0.6)
    # 下ほど暗い（地面の湿り）、岸の岩は濡れて暗い
    stone = stone * (0.72 + 0.28 * lib.sstep(0.0, 0.45, z))[..., None]
    if wet:
        stone = stone * (0.82 + 0.18 * lib.sstep(0.3, 0.9, z))[..., None]
    stone = stone * (0.65 + 0.35 * AO)[..., None]
    rgba = np.concatenate([stone, np.ones_like(z)[..., None]], -1)
    rgba[~valid] = 0
    rgba[~valid, 3] = 1
    return rgba


for name in names:
    r, cz, planes, seed, target, res, wet = ROCKS[name]
    sc = lib.reset()
    high = build_high(r, cz, planes, seed)
    low = build_low(high, target)
    lib.unwrap(low)
    maps = lib.bake_maps(low, res, high=high)
    rgba = paint(maps, wet, seed)
    bpy.data.objects.remove(high)
    size = lib.export_glb(low, rgba, maps['normal_img'], os.path.join(OUT, f'{name}.glb'), res)
    print('ROCK', name, 'tris', lib.tris(low), 'bytes', size)
