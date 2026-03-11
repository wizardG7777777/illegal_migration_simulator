@tool
extends EditorScript

func _run():
	var room = get_scene()
	var tilemap = room.get_node("TileMapLayer") as TileMapLayer
	
	if tilemap == null:
		print("Error: TileMapLayer not found!")
		return
	
	# 清除现有数据
	tilemap.clear()
	
	# 图块坐标（从图块集）
	var brick_wall = Vector2i(13, 2)  # 红色砖墙
	var wood_floor = Vector2i(1, 8)   # 浅色木地板
	
	# 房间大小（140x160 像素，32x32 图块 = 约 5x5 图块网格）
	# 地板区域: x从-2到2, y从-2到2（中心位置）
	
	# 绘制地板（3x4 区域，避开墙壁）
	for x in range(-2, 3):
		for y in range(-2, 3):
			tilemap.set_cell(Vector2i(x, y), 2, wood_floor)
	
	# 绘制墙壁（围绕地板）
	# 上墙
	for x in range(-3, 4):
		tilemap.set_cell(Vector2i(x, -3), 2, brick_wall)
	# 下墙
	for x in range(-3, 4):
		tilemap.set_cell(Vector2i(x, 3), 2, brick_wall)
	# 左墙
	for y in range(-2, 3):
		tilemap.set_cell(Vector2i(-3, y), 2, brick_wall)
	# 右墙
	for y in range(-2, 3):
		tilemap.set_cell(Vector2i(3, y), 2, brick_wall)
	
	print("TileMap configured with brick walls and wood floor!")
	print("Floor tiles:", 5 * 5, "Wall tiles:", 7 + 7 + 5 + 5)
