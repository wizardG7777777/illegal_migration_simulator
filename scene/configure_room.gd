@tool
extends EditorScript

func _run():
	var room = get_scene()
	var floor_layer = room.get_node("Floor") as TileMapLayer
	var walls_layer = room.get_node("Walls") as TileMapLayer
	
	if floor_layer == null or walls_layer == null:
		print("Error: Floor or Walls TileMapLayer not found!")
		return
	
	# 清除现有数据
	floor_layer.clear()
	walls_layer.clear()
	
	# 图块坐标（从图块集）
	var brick_wall = Vector2i(13, 2)  # 红色砖墙
	var wood_floor = Vector2i(1, 8)   # 浅色木地板
	
	# 绘制地板（3x4 区域）
	for x in range(-2, 3):
		for y in range(-2, 3):
			floor_layer.set_cell(Vector2i(x, y), 1, wood_floor)
	
	# 绘制墙壁（围绕地板）
	# 上墙
	for x in range(-3, 4):
		walls_layer.set_cell(Vector2i(x, -3), 1, brick_wall)
	# 下墙
	for x in range(-3, 4):
		walls_layer.set_cell(Vector2i(x, 3), 1, brick_wall)
	# 左墙
	for y in range(-2, 3):
		walls_layer.set_cell(Vector2i(-3, y), 1, brick_wall)
	# 右墙
	for y in range(-2, 3):
		walls_layer.set_cell(Vector2i(3, y), 1, brick_wall)
	
	print("Room configured!")
	print("Floor tiles:", 5 * 5, "Wall tiles:", 7 + 7 + 5 + 5)
