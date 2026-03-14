extends StaticBody2D

@onready var interact_area = $InteractArea

func _ready():
	interact_area.body_entered.connect(_on_body_entered)
	interact_area.body_exited.connect(_on_body_exited)

func _on_body_entered(body):
	if body.name == "Player" and body.has_method("register_interactable"):
		body.register_interactable(self)

func _on_body_exited(body):
	if body.name == "Player" and body.has_method("unregister_interactable"):
		body.unregister_interactable(self)
