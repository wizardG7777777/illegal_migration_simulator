@tool
extends EditorScript

# 如何使用：
# 1. 在 Godot 编辑器中打开此脚本
# 2. 修改下面的 TEXTURE_PATH 为你要检查的图片路径
# 3. 点击菜单栏 "File" -> "Run" (或按 Ctrl+Shift+X)
# 4. 查看 Output 面板的输出结果

const TEXTURE_PATH = "res://Modern tiles_Free/Interiors_free/32x32/Room_Builder_free_32x32.png"
const TILE_SIZE = Vector2i(32, 32)

func _run():
	var texture = load(TEXTURE_PATH)
	if not texture:
		print("错误：无法加载纹理，请检查路径: " + TEXTURE_PATH)
		return

	var image = texture.get_image()
	if not image:
		print("错误：无法获取图片数据")
		return

	var width = image.get_width()
	var height = image.get_height()
	var cols = width / TILE_SIZE.x
	var rows = height / TILE_SIZE.y

	print("---------- 开始扫描纹理 ----------")
	print("路径: %s" % TEXTURE_PATH)
	print("尺寸: %dx%d" % [width, height])
	print("网格: %dx%d (共 %d 个格子)" % [cols, rows, cols * rows])
	
	var valid_tiles = []
	
	for y in range(rows):
		for x in range(cols):
			if is_tile_valid(image, x, y):
				valid_tiles.append(Vector2i(x, y))

	print("扫描完成！找到 %d 个非空 Tile。" % valid_tiles.size())
	print("有效坐标列表 (Atlas Coords):")
	print(valid_tiles)
	print("----------------------------------")

func is_tile_valid(image: Image, grid_x: int, grid_y: int) -> bool:
	var start_x = grid_x * TILE_SIZE.x
	var start_y = grid_y * TILE_SIZE.y
	
	# 检查该格子内是否有非透明像素
	# 优化：不检查每个像素，只检查中心点或随机采样可能不够准确，建议全扫描或跳跃扫描
	# 这里进行全扫描以保证准确性
	for y in range(TILE_SIZE.y):
		for x in range(TILE_SIZE.x):
			var pixel_color = image.get_pixel(start_x + x, start_y + y)
			if pixel_color.a > 0.0: # Alpha > 0 表示非完全透明
				return true
	return false
