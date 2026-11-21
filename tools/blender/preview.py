# .blend を開き、正面・横・斜めを Workbench で撮って1枚に並べる（形の確認用）。
# 使い方：python tools/blender/preview.py <.blend> <出力png> [中心の高さ] [距離]
import sys, math, os
import bpy
from mathutils import Vector
blend, out = sys.argv[-4], sys.argv[-3]  # 引数：<.blend> <出力png> <中心の高さ> <距離>
cz, dist = float(sys.argv[-2]), float(sys.argv[-1])
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
# 画面の機能（GPU）が無い環境なので Cycles（CPU）で描く
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 24
sc.cycles.use_denoising = False
sc.render.resolution_x, sc.render.resolution_y = 480, 640
w = bpy.data.worlds.new('w')
sc.world = w
w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.8, 0.8, 0.82, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3
sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
sc.collection.objects.link(sun)
sc.render.film_transparent = False
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 50
paths = []
for i, az in enumerate([0, 90, 35]):
    a = math.radians(az)
    cam.location = Vector((math.sin(a) * dist, -math.cos(a) * dist, cz + (0.5 if az == 35 else 0)))
    d = Vector((0, 0, cz)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    p = out.replace('.png', f'_{i}.png')
    sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    paths.append(p)
print('SHOTS', ' '.join(paths))
