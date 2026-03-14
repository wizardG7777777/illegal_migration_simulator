#!/usr/bin/env godot
# 纹理图集分析工具 - 命令行版本
# 使用方法: godot --headless --script script/TextureAnalyzer.gd

extends SceneTree

const TEXTURE_PATH = "res://Modern tiles_Free/Interiors_free/32x32/Room_Builder_free_32x32.png"
const TILE_SIZE = Vector2i(32, 32)

func _init():
	var texture = load(TEXTURE_PATH)
	if not texture:
		print("错误：无法加载纹理，请检查路径: " + TEXTURE_PATH)
		quit()
		return

	var image = texture.get_image()
	if not image:
		print("错误：无法获取图片数据")
		quit()
		return

	var width = image.get_width()
	var height = image.get_height()
	var cols = width / TILE_SIZE.x
	var rows = height / TILE_SIZE.y

	print("========================================")
	print("纹理图集分析报告")
	print("========================================")
	print("路径: %s" % TEXTURE_PATH)
	print("尺寸: %dx%d" % [width, height])
	print("Tile尺寸: %dx%d" % [TILE_SIZE.x, TILE_SIZE.y])
	print("网格: %d列 x %d行 (共 %d 个格子)" % [cols, rows, cols * rows])
	print("========================================")

	var valid_tiles = []

	for y in range(rows):
		for x in range(cols):
			if is_tile_valid(image, x, y):
				valid_tiles.append(Vector2i(x, y))

	print("\n找到 %d 个非空 Tile:" % valid_tiles.size())
	print("----------------------------------------")

	# 按行分组显示
	var tiles_by_row = {}
	for tile in valid_tiles:
		var row = tile.y
		if not tiles_by_row.has(row):
			tiles_by_row[row] = []
		tiles_by_row[row].append(tile.x)

	var row_keys = tiles_by_row.keys()
	row_keys.sort()
	for row in row_keys:
		var cols_in_row = tiles_by_row[row]
		cols_in_row.sort()
		var coords = []
		for c in cols_in_row:
			coords.append("%d:%d" % [c, row])
		print("第 %2d 行: %s" % [row, ", ".join(coords)])

	print("----------------------------------------")
	print("\n所有有效坐标列表 (x:y 格式):")
	for tile in valid_tiles:
		print("  %d:%d" % [tile.x, tile.y])

	print("========================================")
	quit()

func is_tile_valid(image: Image, grid_x: int, grid_y: int) -> bool:
	var start_x = grid_x * TILE_SIZE.x
	var start_y = grid_y * TILE_SIZE.y

	# 检查该格子内是否有非透明像素
	for y in range(TILE_SIZE.y):
		for x in range(TILE_SIZE.x):
			var pixel_color = image.get_pixel(start_x + x, start_y + y)
			if pixel_color.a > 0.0: # Alpha > 0 表示非完全透明
				return true
	return false
