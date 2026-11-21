# 提灯お化け（灯魂）を Blender で作る（V5 の Blender 試作。参考：design-notes/lookdev/refs/chochin_*.png）。
# 使い方：python3 -m venv で bpy を入れた Python で  python tools/blender/chochin.py <出力の作業フォルダ>
# 座標：Blender は Z が上・正面は −Y（glTF に書き出すとゲームの Y 上・+Z 正面になる）。寸法はゲームの今の提灯（models.js の chochin）と同じ。
import math, sys, os
import bpy, bmesh
from mathutils import Vector, Matrix, noise

OUT = sys.argv[-1] if len(sys.argv) > 1 else '/tmp/chochin'
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def new_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob

def lerp(a, b, t):
    return a + (b - a) * t

# ---- 胴の輪郭（高さ h → 半径）。models.js の3段の回転体の点をなめらかにつなぐ ----
PROFILE = [(0.0, 0.27), (0.04, 0.37), (0.12, 0.45), (0.26, 0.50), (0.32, 0.506), (0.45, 0.52), (0.6, 0.523), (0.7, 0.525),
           (0.95, 0.52), (1.14, 0.50), (1.28, 0.45), (1.36, 0.37), (1.4, 0.28)]

def prof(h):
    for (h0, r0), (h1, r1) in zip(PROFILE, PROFILE[1:]):
        if h <= h1:
            t = (h - h0) / (h1 - h0)
            t = t * t * (3 - 2 * t)
            return lerp(r0, r1, t)
    return PROFILE[-1][1]

RIB_H = [0.135 + 0.1 * i for i in range(13)]  # 横の骨の高さ（10cm ごと）

def rib_sag(h):
    # 骨の所で紙が内へ締まり、間でふくらむ
    d = min(abs(h - r) for r in RIB_H)
    return 0.012 * (1 - min(1, d / 0.05)) ** 2 - 0.004

EYE_C = (0.0, 0.92)  # 正面の目の中心（角度0、高さ）
EYE_R = 0.15

# ---- 胴（紙）：角度 SEG × 高さ RINGS の格子 ----
SEG, RINGS = 48, 28
bm = bmesh.new()
grid = []
for j in range(RINGS + 1):
    h = 1.4 * j / RINGS
    row = []
    for i in range(SEG):
        a = 2 * math.pi * i / SEG  # 0 = 正面（−Y）
        r = prof(h) - (rib_sag(h) if 0.08 < h < 1.32 else 0)
        # 目のまわりの盛り上がり（まぶたの肉）
        dx = math.atan2(math.sin(a), math.cos(a)) * 0.52
        dy = h - EYE_C[1]
        de = math.hypot(dx, dy * 1.2)
        r += 0.09 * math.exp(-((de / 0.22) ** 2))
        # しわ（ゆるい凹凸）
        p = Vector((math.sin(a) * 2, math.cos(a) * 2, h * 3))
        r += 0.006 * noise.noise(p)
        row.append(bm.verts.new((math.sin(a) * r, -math.cos(a) * r, h)))
    grid.append(row)
for j in range(RINGS):
    for i in range(SEG):
        bm.faces.new((grid[j][i], grid[j][(i + 1) % SEG], grid[j + 1][(i + 1) % SEG], grid[j + 1][i]))
paper = new_obj('paper', bm)

# ---- 口の中（桃色の歯ぐき）：胴の内側の、口の後ろの曲面 ----
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0)
for v in bm.verts:
    v.co = Vector((v.co.x * 0.36, v.co.y * 0.3 - 0.16, v.co.z * 0.16 + 0.6))
mouth = new_obj('mouth', bm)

# ---- 目玉 ----
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=EYE_R)
for v in bm.verts:
    v.co = Vector((v.co.x, v.co.y * 0.85 - 0.5, v.co.z + EYE_C[1]))
eye = new_obj('eye', bm)

# ---- まぶた：上は厚く目の上 1/3 にかぶさる弧、下は薄い弧。端は細くなって紙の盛り上がりに埋もれる ----
def lid_arc(name, t0, t1, R, minor0, drop, n=20, m=6):
    bm = bmesh.new()
    loops = []
    for i in range(n + 1):
        u = i / n
        t = math.radians(t0 + (t1 - t0) * u)
        taper = math.sin(math.pi * u) ** 0.7
        minor = minor0 * (0.25 + 0.75 * taper)
        cx, cz = math.cos(t) * R * 1.12, math.sin(t) * R + EYE_C[1] - drop * taper
        loop = []
        for k in range(m):
            s_ = 2 * math.pi * k / m
            nx, ny, nz = math.cos(t) * math.cos(s_), -math.sin(s_), math.sin(t) * math.cos(s_)
            loop.append(bm.verts.new((cx + nx * minor, -0.5 - EYE_R * 0.55 + ny * minor * 1.6, cz + nz * minor)))
        loops.append(loop)
    for i in range(n):
        for k in range(m):
            bm.faces.new((loops[i][k], loops[i + 1][k], loops[i + 1][(k + 1) % m], loops[i][(k + 1) % m]))
    return new_obj(name, bm)
lid_up = lid_arc('lid', 0, 180, EYE_R * 0.92, 0.055, 0.04)
lid_lo = lid_arc('lidLo', 195, 345, EYE_R * 1.02, 0.035, -0.0)

# ---- 紙のめくれ：破れの縁から垂れる切れ端（薄い板。紙の色は位置から描く） ----
def flap(name, a, h, w, l, tilt):
    bm = bmesh.new()
    R = prof(h) + 0.01
    cx, cy = math.sin(a) * R, -math.cos(a) * R
    tx, ty = math.cos(a), math.sin(a)
    nx, ny = math.sin(a), -math.cos(a)
    pts = [(-w / 2, 0), (w / 2, 0), (w * 0.15, -l), (-w * 0.2, -l * 0.8)]
    vs = [bm.verts.new((cx + tx * u + nx * (-v) * tilt, cy + ty * u + ny * (-v) * tilt, h + v)) for u, v in pts]
    bm.faces.new(vs)
    return new_obj(name, bm)
flaps = [flap(f'flap{i}', *f) for i, f in enumerate([(0.55, 0.64, 0.09, 0.12, 0.35), (-0.6, 0.62, 0.08, 0.1, 0.3), (0.25, 0.42, 0.06, 0.08, 0.2),
                                                     (1.1, 1.12, 0.07, 0.1, 0.4), (-1.3, 1.0, 0.06, 0.09, 0.4), (2.4, 0.78, 0.08, 0.1, 0.4)])]

# ---- 舌：口から前へ出て S 字に垂れ、先が丸く前へ巻く。幅広く平たい ----
pts = [(0.0, -0.40, 0.58), (0.0, -0.58, 0.50), (0.01, -0.64, 0.25), (-0.02, -0.60, -0.15), (0.0, -0.55, -0.55),
       (0.04, -0.60, -0.90), (0.06, -0.70, -1.06), (0.065, -0.76, -1.08)]
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
path = catmull(pts, 6)
TS = 10
bm = bmesh.new()
loops = []
for i, c in enumerate(path):
    t = i / (len(path) - 1)
    tan = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
    side = Vector((1, 0, 0))
    up = tan.cross(side).normalized()
    w = lerp(0.22, 0.10, t ** 0.6) * (1 - max(0, (t - 0.93) / 0.07) ** 2 * 0.8)
    th = lerp(0.05, 0.035, t) * (1 - max(0, (t - 0.93) / 0.07) ** 2 * 0.7)
    loop = []
    for k in range(TS):
        s = 2 * math.pi * k / TS
        x = math.cos(s) * w
        y = math.sin(s) * th
        y -= 0.012 * math.exp(-((x / (w * 0.25)) ** 2)) * (1 if math.sin(s) > 0 else 0)  # 真ん中の溝
        loop.append(bm.verts.new(c + side * x + up * y))
    loops.append(loop)
for i in range(len(loops) - 1):
    for k in range(TS):
        bm.faces.new((loops[i][k], loops[i][(k + 1) % TS], loops[i + 1][(k + 1) % TS], loops[i + 1][k]))
bm.faces.new(list(reversed(loops[-1])))
tongue = new_obj('tongue', bm)

# ---- 上下の黒い金輪・取っ手・鉤 ----
def ring_obj(name, r, z0, z1, seg=40):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2))
    return new_obj(name, bm)
rim_top = ring_obj('rimTop', 0.27, 1.37, 1.51, 28)
rim_bot = ring_obj('rimBot', 0.21, -0.1, 0.04, 28)
def tube_obj(name, ptsl, r, n=6, steps=6):
    path = catmull(ptsl, steps)
    bm = bmesh.new()
    loops = []
    for i, c in enumerate(path):
        tan = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        a = tan.cross(Vector((0, 0, 1)))
        if a.length < 1e-3:
            a = tan.cross(Vector((1, 0, 0)))
        a.normalize()
        b = tan.cross(a)
        loops.append([bm.verts.new(c + (a * math.cos(2 * math.pi * k / n) + b * math.sin(2 * math.pi * k / n)) * r) for k in range(n)])
    for i in range(len(loops) - 1):
        for k in range(n):
            bm.faces.new((loops[i][k], loops[i][(k + 1) % n], loops[i + 1][(k + 1) % n], loops[i + 1][k]))
    return new_obj(name, bm)
handle = tube_obj('handle', [(-0.2, 0, 1.5), (-0.18, 0, 1.64), (-0.09, 0, 1.73), (0, 0, 1.75), (0.09, 0, 1.73), (0.18, 0, 1.64), (0.2, 0, 1.5)], 0.013)
hook = tube_obj('hook', [(0.0, 0, 1.74), (-0.04, 0, 1.8), (-0.03, 0, 1.88), (0.02, 0, 1.9), (0.04, 0, 1.86), (0.0, 0, 1.93), (0.0, 0, 2.15)], 0.012)
# 折れて横へ突き出た骨
ribs = [tube_obj(f'brokenRib{i}', [p0, p1], 0.008, 5, 2) for i, (p0, p1) in enumerate([
    ((0.45, -0.25, 1.03), (0.72, -0.18, 1.06)), ((-0.45, -0.25, 0.63), (-0.74, -0.2, 0.6)), ((0.47, -0.2, 0.63), (0.7, -0.25, 0.62))])]

# ---- 1つにまとめる（部位は頂点グループでなく、材質の番号で覚える：0 紙 1 口 2 目 3 まぶた 4 舌 5 金属 6 骨） ----
PART = {'paper': 0, 'mouth': 1, 'eye': 2, 'lid': 3, 'lidLo': 3, 'tongue': 4, 'rimTop': 5, 'rimBot': 5, 'handle': 5, 'hook': 5}
for ob in list(scene.objects):
    pid = 0 if ob.name.startswith('flap') else PART.get(ob.name, 6)
    for k in range(7):
        ob.data.materials.append(bpy.data.materials.get(f'part{k}') or bpy.data.materials.new(f'part{k}'))
    for p in ob.data.polygons:
        p.material_index = pid
    # なめらかに（陰影）
    for p in ob.data.polygons:
        p.use_smooth = True
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = paper
bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
ob.name = 'chochin'
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
print('TRIS', tris)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'chochin_model.blend'))
