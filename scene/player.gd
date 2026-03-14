extends CharacterBody2D

@export var speed: float = 120.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var interaction_label: Label = $InteractionLabel

var current_interactable = null
var is_sitting = false

func _ready() -> void:
	# 确保动画开始播放
	if sprite:
		sprite.play("idle_side")
	if interaction_label:
		interaction_label.visible = false

func _physics_process(_delta: float) -> void:
	if is_sitting:
		if Input.is_action_just_pressed("interact"):
			stand_up()
		return

	# 处理交互
	if current_interactable and Input.is_action_just_pressed("interact"):
		sit_down(current_interactable)
		return

	# 使用 WASD 获取输入向量
	var direction = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	
	if direction.length() > 0:
		velocity = direction * speed
		
		# 根据方向决定动画
		var anim_name = "run_down"
		
		if abs(direction.x) > abs(direction.y):
			anim_name = "run_side"
			sprite.flip_h = direction.x < 0
		elif direction.y < 0:
			anim_name = "run_up"
		else:
			anim_name = "run_down"
			
		if sprite.animation != anim_name:
			sprite.play(anim_name)
	else:
		velocity = Vector2.ZERO
		
		# 根据当前状态切换到对应的待机动画
		var current = sprite.animation
		var idle_anim = "idle_down"
		
		if "side" in current:
			idle_anim = "idle_side"
		elif "up" in current:
			idle_anim = "idle_up"
		elif "down" in current:
			idle_anim = "idle_down"
			
		if sprite.animation != idle_anim:
			sprite.play(idle_anim)
	
	move_and_slide()

func register_interactable(obj):
	current_interactable = obj
	if interaction_label:
		interaction_label.text = "Press F to sit"
		interaction_label.visible = true

func unregister_interactable(obj):
	if current_interactable == obj:
		current_interactable = null
		if interaction_label:
			interaction_label.visible = false

func sit_down(chair):
	is_sitting = true
	velocity = Vector2.ZERO
	# 移动到椅子位置
	global_position = chair.global_position
	
	# 根据椅子朝向选择坐姿
	# 假设椅子 rotation: 0=up/down?, 90=right, -90=left, 180=down?
	# 简单处理：根据椅子朝向设置动画
	var deg = chair.rotation_degrees
	# 规范化角度
	deg = wrapf(deg, 0, 360)
	
	if deg > 45 and deg < 135: # 90 deg -> Left
		sprite.play("sit_left")
		sprite.flip_h = false
	elif deg > 225 and deg < 315: # 270 deg -> Right
		sprite.play("sit_right")
		sprite.flip_h = false
	elif deg >= 315 or deg <= 45: # 0 deg -> Down
		sprite.play("sit_down")
		sprite.flip_h = false
	else: # 180 deg -> Up
		sprite.play("sit_up")
		sprite.flip_h = false
		
	if interaction_label:
		interaction_label.text = "Press F to stand"

func stand_up():
	is_sitting = false
	global_position = Vector2(-16.0, -16.0)
	sprite.play("idle_down") # 默认站立姿态
	if current_interactable and interaction_label:
		interaction_label.text = "Press F to sit"
