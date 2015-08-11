//generates unique id
function newUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
    function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
}

var min_polygon_end_distance = 0.01; //in ratio to width of map
var active_context = 'ping_context';
var history = {};
var userlist = {};
var selected_icon = 'arty';
var icon_color = '#ff0000';
var draw_color = '#ff0000';
var ping_color = '#ff0000';
var line_color = '#ff0000';
var text_color = '#ffffff';
var rectangle_outline_color = '#ff0000';
var rectangle_fill_color = '#ff0000';
var circle_outline_color = '#ff0000';
var circle_fill_color = '#ff0000';
var polygon_outline_color = '#ff0000';
var polygon_fill_color = '#ff0000';
var socket;
var room;
var background;
var draw_thickness;
var line_thickness;
var rectangle_outline_thickness;
var rectangle_outline_opacity;
var rectangle_fill_opacity;
var circle_outline_thickness;
var circle_outline_opacity;
var circle_fill_opacity;
var polygon_outline_thickness;
var polygon_outline_opacity;
var polygon_fill_opacity;
var my_user;
var undo_list = [];
var redo_list = [];
var is_room_locked;
var tactic_name = "";
var graphics;
var new_drawing;
var left_click_origin;
var selected_entities = [];
var label_font_size = 30;
var last_ping_time;
var icon_scale = 1/35;

var shifted; //need to know if the shift key is pressed
$(document).on('keyup keydown', function(e) {
	shifted = e.shiftKey;
	if (!shifted && active_context == "line_context" && new_drawing) {
		on_line_end();
	}
});

//start pixi renderer
var border = 30;
var size = Math.min(window.innerHeight, window.innerWidth) - border;
var size_x = size;
var size_y = size;
var renderer = PIXI.autoDetectRenderer(size, size,{backgroundColor : 0xBBBBBB});
var useWebGL = renderer instanceof PIXI.WebGLRenderer;

// create the root of the scene graph
var stage = new PIXI.Container();
var objectContainer = new PIXI.Container();
stage.addChild(objectContainer);

//initialize background
var background_sprite = new PIXI.Sprite();
background_sprite.height = renderer.height;
background_sprite.width = renderer.width;
objectContainer.addChild(background_sprite);

//resize the render window
window.onresize = function() { 
	size = Math.min(window.innerHeight, window.innerWidth) - border;
	size_x = size;
	size_y = size;
	renderer.view.style.width = size + "px";
	renderer.view.style.height = size + "px";
	renderer.render(stage);
};

function set_background(new_background) {
	if (background) {
		remove(background.uid);
	}
	background = new_background;
	background_sprite.texture = PIXI.Texture.fromImage(background.path);
	history[background.uid] = background;
	$("#map_select").val(background.path).change();	
	renderer.render(stage);
	background_sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
}

var context_before_drag;
var last_mouse_location;
var move_selected;
function onDragStart(event) {
	if (active_context != 'drag_context') {
		context_before_drag = active_context;
	}
	active_context = "drag_context";
	this.event = event;
	this.alpha = 0.5;
	last_mouse_location = [renderer.plugins.interaction.mouse.global.x, renderer.plugins.interaction.mouse.global.y];
	renderer.render(stage);
	this.mousemove = onDragMove;
	this.mouseup = onDragEnd;
	this.mouseupoutside = onDragEnd;

	move_selected = false;
	if (selected_entities.length > 0) {
		for (var i in selected_entities) {
			if (selected_entities[i].uid == this.entity.uid) {
				move_selected = true;
				break;
			}
		}
		if (move_selected) {
			for (var i in selected_entities) {
				selected_entities[i].container.alpha = 0.5;
			}
		}
	}
}

function draw_rectangle(rectangle) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(4, '#FFFFFF', 1);
	graphic.drawShape(rectangle);
	objectContainer.addChild(graphic);
	renderer.render(stage);	
}

function onDragEnd() {
	if (context_before_drag == 'remove_context') {
		remove(this.entity.uid);
		socket.emit('remove', room, this.entity.uid);
	} else {
		this.dragging = false;
		this.event = undefined;
		if (move_selected) {
			for (var i in selected_entities) {
				selected_entities[i].container.alpha = 1;
				socket.emit("drag", room, selected_entities[i].uid, selected_entities[i].x, selected_entities[i].y);
			}
		} else {
			socket.emit("drag", room, this.entity.uid, this.entity.x, this.entity.y);
			this.alpha = 1;
		}
	}
	this.mousemove = undefined;
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	active_context = context_before_drag;	
	renderer.render(stage);
}

//move an entity but keep it within the bounds
function move_entity(entity, delta_x, delta_y) {
	var new_x = entity.container.x + delta_x;
	var new_y = entity.container.y + delta_y;
	new_x = Math.max(new_x, 0);
	new_y = Math.max(new_y, 0);
	new_x = Math.min(new_x, size - entity.container.width);
	new_y = Math.min(new_y, size - entity.container.height);
	entity.x += (new_x-entity.container.x)/size_x;
	entity.y += (new_y-entity.container.y)/size_y;
	entity.container.x = new_x;
	entity.container.y = new_y;
}

function onDragMove() {
	//move by deltamouse
	var mouse_location = [renderer.plugins.interaction.mouse.global.x, renderer.plugins.interaction.mouse.global.y];
	var delta_x = (mouse_location[0] - last_mouse_location[0]);
	var delta_y = (mouse_location[1] - last_mouse_location[1]);
	
	if (move_selected) {
		for (var i in selected_entities) {
			move_entity(selected_entities[i], delta_x, delta_y);
		}
	} else {
		move_entity(this.entity, delta_x, delta_y);
	}

	last_mouse_location = mouse_location;
	renderer.render(stage);
}

function remove(uid) {
	objectContainer.removeChild(history[uid].container);
	if (history[uid].type == "icon") {
		var counter = $('#'+history[uid].tank).find("span");
		counter.text((parseInt(counter.text())-1).toString());		
		counter = $("#icon_context").find("span").first();
		counter.text((parseInt(counter.text())-1).toString());
	}
	
	//if an item is removed, remove them from selected_entities
	var i = selected_entities.length
	while (i--) {
		if (selected_entities[i].uid == uid) {
			selected_entities.splice(i, 1);
		}
	}
	delete history[uid];	
	renderer.render(stage);
}

function ping(x, y, color) {
	var texture = PIXI.Texture.fromImage('http://'+location.host+'/icons/circle.png');
	var sprite = new PIXI.Sprite(texture);

	sprite.tint = color.replace(/#/, '0x');
	sprite.anchor.set(0.5);
	sprite.scale.x = size_x/3000;
	sprite.scale.y = size_x/3000;
	sprite.alpha = 1;
	sprite.x = x*size_x;
	sprite.y = y*size_y;
	
	objectContainer.addChild(sprite);
	sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	
	fade(sprite, 10, 0.5);
}

function fade(sprite, steps, alpha) {
	if (steps == 0) {
		objectContainer.removeChild(sprite);
		renderer.render(stage);	
		return;
	}
	setTimeout( function() {
		sprite.alpha = alpha;
		sprite.scale.x *= 0.85;
		sprite.scale.y *= 0.85;
		renderer.render(stage);	
		fade(sprite, steps-1, alpha-0.01);		
	}, 50);	
}

function deselect_all() {
	for (entity in selected_entities) {
		selected_entities[entity].container.filters = undefined;
	}
	selected_entities = [];
}

//function fires when mouse is left clicked on the map and it isn't a drag
function on_left_click(event) {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	if (active_context == 'draw_context') {	
		this.mouseup = on_draw_end;
		this.mouseupoutside = on_draw_end;
		this.mousemove = on_draw_move;
		new_drawing = {uid : newUid(), type: 'drawing', x:mouse_location.x/size_x, y:mouse_location.y/size_y, scale:1,color:parseInt('0x'+draw_color.substring(1)), alpha:1, thickness:parseFloat(draw_thickness), path:[]};
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * (size_x/500), parseInt('0x'+draw_color.substring(1)), 1);
		graphics.moveTo(mouse_location.x, mouse_location.y);
		objectContainer.addChild(graphics);
	} else if (active_context == 'line_context') {
		if (!new_drawing) {
			this.mouseup = on_line_end;
			this.mouseupoutside = on_line_end;
			this.mousemove = on_line_move;
			new_drawing = {uid : newUid(), type: 'line', x:mouse_location.x/size_x, y:mouse_location.y/size_y,  scale:1, color:parseInt('0x'+line_color.substring(1)), alpha:1, thickness:parseFloat(line_thickness), path:[], is_arrow:($('#arrow').hasClass('active') || $('#dotted_arrow').hasClass('active')), is_dotted:($('#dotted_line').hasClass('active') || $('#dotted_arrow').hasClass('active')) };
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.thickness * (size_x/500), parseInt('0x'+line_color.substring(1)), 1);
			graphics.moveTo(mouse_location.x, mouse_location.y);
			objectContainer.addChild(graphics);
		}
	} else if (active_context == 'icon_context') {
		this.mouseup = on_icon_end;
		this.mouseupoutside = on_icon_end;
	} else if (active_context == 'ping_context') {
		ping(mouse_location.x/size_x, mouse_location.y/size_y, ping_color);
		socket.emit("ping", room, mouse_location.x/size_x, mouse_location.y/size_y, ping_color);
		last_ping_time = new Date();
		this.mousemove = on_ping_move;
		this.mouseup = on_ping_end;
		this.mouseupoutside = on_ping_end;
	} else if (active_context == "select_context") {
		this.mouseup = on_select_end;
		this.mouseupoutside = on_select_end;
		this.mousemove = on_select_move;
		left_click_origin = [mouse_location.x, mouse_location.y];
		deselect_all();
	} else if (active_context == 'text_context') {
		this.mouseup = on_text_end;
		this.mouseupoutside = on_text_end;
	} else if (active_context == 'rectangle_context') {
		this.mouseup = on_rectangle_end;
		this.mouseupoutside = on_rectangle_end;
		this.mousemove = on_rectangle_move;
		left_click_origin = [mouse_location.x, mouse_location.y];
	} else if (active_context == 'circle_context') {
		this.mouseup = on_circle_end;
		this.mouseupoutside = on_circle_end;
		this.mousemove = on_circle_move;
		left_click_origin = [mouse_location.x, mouse_location.y];
	} else if (active_context == 'polygon_context') {
		if (!new_drawing) {
			this.mouseup = on_polygon_end;
			this.mouseupoutside = on_polygon_end;
			this.mousemove = on_polygon_move;
			new_drawing = {uid : newUid(), type: 'polygon', x:mouse_location.x/size_x, y:mouse_location.y/size_y,  scale:1, outline_thickness:polygon_outline_thickness, outline_color:polygon_outline_color, outline_opacity: polygon_outline_opacity, fill_color: polygon_fill_color, fill_opacity: polygon_fill_opacity, alpha:1, path:[]};
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * (size_x/500), parseInt('0x'+new_drawing.outline_color.substring(1)), new_drawing.outline_opacity);
			graphics.moveTo(mouse_location.x, mouse_location.y);
			graphics.drawShape(new PIXI.Circle(mouse_location.x, mouse_location.y, min_polygon_end_distance*size_x));
			objectContainer.addChild(graphics);
		}
	}
}

function on_polygon_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.outline_thickness * (size_x/500), parseInt('0x'+new_drawing.outline_color.substring(1)), 0.5);
	var a;
	if (new_drawing.path.length == 0) {
		a = [new_drawing.x * size_x, new_drawing.y * size_y];
	} else {
		a = [(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x) * size_x,
			 (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y) * size_y];
	}
	b = [mouse_location.x, mouse_location.y];
	graphic.moveTo(a[0], a[1]);		
	graphic.lineTo(b[0], b[1]);

	graphics.addChild(graphic);
	renderer.render(stage);
	graphics.removeChild(graphic);	
}

function on_polygon_end() {
	var mouse_location = renderer.plugins.interaction.mouse.global;	
	var x = mouse_location.x/size_x;
	var y = mouse_location.y/size_y;
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);

	var squared_distance_to_start = (x - new_drawing.x) * (x - new_drawing.x) + (y - new_drawing.y) * (y - new_drawing.y);
	if (squared_distance_to_start < (min_polygon_end_distance*min_polygon_end_distance)) {
		objectContainer.mouseup = undefined;
		objectContainer.mouseupoutside = undefined;
		objectContainer.mousemove = undefined;
		objectContainer.removeChild(graphics);
		create_polygon(new_drawing);
		snap_and_emit_entity(new_drawing);
		undo_list.push(new_drawing);
		new_drawing = null;
		graphics = null;
	} else {
		new_drawing.path.push([x - new_drawing.x, y - new_drawing.y]);
		var graphic = new PIXI.Graphics();
		//graphic.lineStyle(new_drawing.thickness * (size_x/500), new_drawing.color, 1);
		graphic.lineStyle(new_drawing.outline_thickness * (size_x/500), parseInt('0x'+new_drawing.outline_color.substring(1)), 1);
		
		var a;
		if (new_drawing.path.length == 1) {
			a = [new_drawing.x * size_x, new_drawing.y * size_y];
		} else {
			a = [(new_drawing.path[new_drawing.path.length - 2][0] + new_drawing.x) * size_x, 
				 (new_drawing.path[new_drawing.path.length - 2][1] + new_drawing.y) * size_y];
		}
		var b = [(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x) * size_x, 
				 (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y) * size_y];

		graphic.moveTo(a[0], a[1]);	
		if (!new_drawing.is_dotted) {				 
			graphic.lineTo(b[0], b[1]);
		} else {
			draw_dotted_line(graphic, a[0], a[1], b[0], b[1]);
		}

		graphics.addChild(graphic);
		renderer.render(stage);
	}
}

function draw_shape(outline_thickness, outline_opacity, outline_color, fill_opacity, fill_color, shape) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(outline_thickness, '0x'+outline_color.substring(1), outline_opacity);
	graphic.beginFill('0x'+fill_color.substring(1), fill_opacity);
	graphic.drawShape(shape);
	graphic.endFill();
	return graphic;
}

function on_circle_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	
	var center_x = (left_click_origin[0] + mouse_location.x) / 2;
	var center_y = (left_click_origin[1] + mouse_location.y) / 2;
	var radius = Math.sqrt((left_click_origin[0] - mouse_location.x) * (left_click_origin[0] - mouse_location.x)
						  +(left_click_origin[1] - mouse_location.y) * (left_click_origin[1] - mouse_location.y))
	radius /= 2;
	
	var graphic = draw_shape(circle_outline_thickness,
							 circle_outline_opacity,
							 circle_outline_color,
							 circle_fill_opacity,
							 circle_fill_color,
							 new PIXI.Circle(center_x, center_y, radius)
							);
							
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
}

function on_circle_end() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	
	var center_x = (left_click_origin[0] + mouse_location.x) / 2;
	var center_y = (left_click_origin[1] + mouse_location.y) / 2;
	var radius = Math.sqrt((left_click_origin[0] - mouse_location.x) * (left_click_origin[0] - mouse_location.x)
						  +(left_click_origin[1] - mouse_location.y) * (left_click_origin[1] - mouse_location.y))
	radius /= 2;
	
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	this.mousemove = undefined;
	
	var new_shape = {uid:newUid(), type:'circle', x:center_x/size_x, y:center_y/size_y, radius:radius/size_x, outline_thickness:circle_outline_thickness, outline_color:circle_outline_color, outline_opacity: circle_outline_opacity, fill_opacity: circle_fill_opacity, fill_color: circle_fill_color, alpha:1};	

	create_circle(new_shape);
	snap_and_emit_entity(new_shape);
	undo_list.push(new_shape);
	
}

function on_rectangle_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var left_x = Math.min(left_click_origin[0], mouse_location.x);
	var left_y = Math.min(left_click_origin[1], mouse_location.y);
	var right_x = Math.max(left_click_origin[0], mouse_location.x);
	var right_y = Math.max(left_click_origin[1], mouse_location.y);
	var graphic = draw_shape(rectangle_outline_thickness,
							 rectangle_outline_opacity,
							 rectangle_outline_color,
							 rectangle_fill_opacity,
							 rectangle_fill_color,
							 new PIXI.Rectangle(left_x, left_y, right_x-left_x, right_y-left_y)
							);
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
}

function on_rectangle_end() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var left_x = Math.min(left_click_origin[0], mouse_location.x);
	var left_y = Math.min(left_click_origin[1], mouse_location.y);
	var right_x = Math.max(left_click_origin[0], mouse_location.x);
	var right_y = Math.max(left_click_origin[1], mouse_location.y);
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	this.mousemove = undefined;
	var new_shape = {uid:newUid(), type:'rectangle', x:left_x/size_x, y:left_y/size_y, width:(right_x - left_x)/size_x, height:(right_y - left_y)/size_y, outline_thickness:rectangle_outline_thickness, outline_color:rectangle_outline_color, outline_opacity: rectangle_outline_opacity, fill_opacity: rectangle_fill_opacity, fill_color: rectangle_fill_color, alpha:1};
	create_rectangle(new_shape);
	snap_and_emit_entity(new_shape);
	undo_list.push(new_shape);
}

function on_ping_move() {
	var time = new Date();
	var timeDiff = time - last_ping_time;
	if (timeDiff > 120) {
		var mouse_location = renderer.plugins.interaction.mouse.global;
		ping(mouse_location.x/size_x, mouse_location.y/size_y, ping_color);
		socket.emit("ping", room, mouse_location.x/size_x, mouse_location.y/size_y, ping_color);
		last_ping_time = time;
	}
}

function on_ping_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	this.mousemove = undefined;
}

function on_select_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	// draw a rounded rectangle
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(2, 0xBBBBBB, 1);
	graphic.beginFill(0xBBBBBB, 0.25);
	graphic.drawRect(left_click_origin[0], left_click_origin[1], mouse_location.x-left_click_origin[0], mouse_location.y-left_click_origin[1]);
	graphic.endFill();
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
}

function on_select_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	this.mousemove = undefined;
	
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var filter = new PIXI.filters.ColorMatrixFilter();
	filter.matrix = [
		1, 0, 0, 0, 0,
		0, 1, 0, 0, 0,
		0, 0, 1, 0, 0,
		0, 0, 0, 0.5, 0
	]
	
	x_min = Math.min(mouse_location.x, left_click_origin[0]);
	y_min = Math.min(mouse_location.y, left_click_origin[1]);
	x_max = Math.max(mouse_location.x, left_click_origin[0]);
	y_max = Math.max(mouse_location.y, left_click_origin[1]);
	
	for (key in history) {
		if (history[key] && history[key].container) {
			var box = history[key].container.getBounds();
			if (box.x > x_min && box.y > y_min && box.x + box.width < x_max && box.y + box.height < y_max) {
				history[key].container.filters = [filter];
				selected_entities.push(history[key]);
			}
		}
	}	
	renderer.render(stage);
}

function on_draw_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	if (active_context == 'draw_context') {
		new_drawing.path.push([mouse_location.x/size_x - new_drawing.x, mouse_location.y/size_y - new_drawing.y]);
		graphics.lineTo(mouse_location.x, mouse_location.y);
		renderer.render(stage);
		graphics.moveTo(mouse_location.x, mouse_location.y);
	}
}


function on_draw_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	this.mousemove = undefined;
	var mouse_location = renderer.plugins.interaction.mouse.global;
	objectContainer.removeChild(graphics);
	undo_list.push(new_drawing);
	create_drawing(new_drawing);
	snap_and_emit_entity(new_drawing);
	new_drawing = null;
	graphics = null;
}

function snap_and_emit_entity(entity) {
	move_entity(entity, 0, 0);
	renderer.render(stage);
	var container = entity.container;
	delete entity.container;
	socket.emit('create_entity', room, entity);
	entity.container = container;
	renderer.render(stage);
}

function on_icon_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var x = mouse_location.x/size_x - (icon_scale/2);
	var y = mouse_location.y/size_y - (icon_scale/2);
	var icon = {uid:newUid(), type: 'icon', tank:selected_icon, x:x, y:y, scale:1, color:icon_color, alpha:1, label:$('#icon_label').val(), label_font_size: label_font_size, label_color: "#ffffff", label_font: "Arial"}
	undo_list.push(icon);
	create_icon(icon);
	snap_and_emit_entity(icon);
}

function on_text_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	var mouse_location = renderer.plugins.interaction.mouse.global;	
	var x = mouse_location.x/size_x;
	var y = mouse_location.y/size_y;
	var text = {uid:newUid(), type: 'text', x:x, y:y, scale:1, color:text_color, alpha:1, text:$('#text_tool_text').val(), font_size:font_size, font:'Arial'};
	undo_list.push(text);
	create_text(text);
	snap_and_emit_entity(text);
}

function on_line_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.thickness * (size_x/500), new_drawing.color, 0.5);
	var a;
	if (new_drawing.path.length == 0) {
		a = [new_drawing.x * size_x, new_drawing.y * size_y];
	} else {
		a = [(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x) * size_x,
			 (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y) * size_y];
	}
	b = [mouse_location.x, mouse_location.y];
	graphic.moveTo(a[0], a[1]);		
	graphic.lineTo(b[0], b[1]);

	if (new_drawing.is_arrow) {
		draw_arrow(graphic, a, b);
	}

	graphics.addChild(graphic);
	renderer.render(stage);
	graphics.removeChild(graphic);	
}

function on_line_end() {
	var mouse_location = renderer.plugins.interaction.mouse.global;	
	var x = mouse_location.x/size_x;
	var y = mouse_location.y/size_y;
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);
	new_drawing.path.push([x - new_drawing.x, y - new_drawing.y]);			
	if (!shifted) {
		objectContainer.mouseup = undefined;
		objectContainer.mouseupoutside = undefined;
		objectContainer.mousemove = undefined;
		//checks against an edge case where you haven't moved since the last registered point
		//2 identical points at the end really screws up the math
		if (new_drawing.path.length > 1 
			&& new_drawing.path[new_drawing.path.length-1][0] == new_drawing.path[new_drawing.path.length-2][0]
			&& new_drawing.path[new_drawing.path.length-1][1] == new_drawing.path[new_drawing.path.length-2][1]) {
				new_drawing.path.pop();
		}
		undo_list.push(new_drawing);
		objectContainer.removeChild(graphics);
		create_line(new_drawing);
		snap_and_emit_entity(new_drawing);
		new_drawing = null;
		graphics = null;
	} else {
		var graphic = new PIXI.Graphics();
		//graphic.lineStyle(new_drawing.thickness * (size_x/500), new_drawing.color, 1);
		graphic.lineStyle(new_drawing.thickness * (size_x/500), parseInt('0x'+line_color.substring(1)), 1);
		
		var a;
		if (new_drawing.path.length == 1) {
			a = [new_drawing.x * size_x, new_drawing.y * size_y];
		} else {
			a = [(new_drawing.path[new_drawing.path.length - 2][0] + new_drawing.x) * size_x, 
				 (new_drawing.path[new_drawing.path.length - 2][1] + new_drawing.y) * size_y];
		}
		var b = [(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x) * size_x, 
				 (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y) * size_y];

		graphic.moveTo(a[0], a[1]);	
		if (!new_drawing.is_dotted) {				 
			graphic.lineTo(b[0], b[1]);
		} else {
			draw_dotted_line(graphic, a[0], a[1], b[0], b[1]);
		}

		graphics.addChild(graphic);
		renderer.render(stage);
	}
}

objectContainer.interactive = true;
objectContainer.on('mousedown', on_left_click)

function create_text(text_entity) {
	var size = "bold "+text_entity.font_size*(size_x/800)+"px " + text_entity.font;
	var text = new PIXI.Text(text_entity.text, {font: size, fill: text_entity.color, strokeThickness: 1.5, stroke: "black", align: "center", dropShadow:true, dropShadowDistance:1});	
	text.x = text_entity.x * size_x;
	text.y = text_entity.y * size_y;
	
	text_entity.container = text;
	text.entity = text_entity;
	text_entity.container.alpha = text_entity.alpha;
	
	make_draggable(text_entity.container);	
	objectContainer.addChild(text_entity.container);
	renderer.render(stage);
	
	history[text_entity.uid] = text_entity;
}
	
function create_icon(icon) {
	var counter = $('#'+icon.tank).find("span");
	counter.text((parseInt(counter.text())+1).toString());
	counter = $("#icon_counter");
	counter.text((parseInt(counter.text())+1).toString());
	var texture = PIXI.Texture.fromImage('http://'+location.host+'/icons/'+ icon.tank +'.png');
	var sprite = new PIXI.Sprite(texture);
	sprite.tint = icon.color.replace(/#/, '0x');
	
	icon.container = new PIXI.Container();

	sprite.width = size_x * icon_scale;
	sprite.height = size_y * icon_scale;

	icon.container.x = size_x*icon.x;
	icon.container.y = size_y*icon.y;
	
	if (icon.label != "") {
		var size = "bold "+icon.label_font_size*(size_x/800)+"px " + icon.label_font;
		var text = new PIXI.Text(icon.label, {font: size, fill: icon.label_color, align: "center", strokeThickness: 1.5, stroke: "black", dropShadow:true, dropShadowDistance:1});		
		text.x -= text.width/2;
		text.y += (1/3)*sprite.width/2;
		icon['container'].addChild(text);
	}

	icon.container.addChild(sprite);
	icon.container.pivot = sprite.position;
	icon.container.entity = icon; 
	icon.container.entity
	icon.container.alpha = icon.alpha;
	
	make_draggable(icon['container']);	

	objectContainer.addChild(icon['container']);
	
	renderer.render(stage);
	sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	
	history[icon.uid] = icon;
}

function make_draggable(root) {
	root.interactive = true;
    root.buttonMode = true;
	root.mousedown = onDragStart;
}

function draw_dotted_line(graphic, x0, y0, x1, y1) {
	var x_diff = x1-x0;
	var y_diff = y1-y0;
	var size = Math.sqrt(x_diff*x_diff+y_diff*y_diff);
	x_diff /= size;
	y_diff /= size;
	var increment = (size_x/60);
	for (var i = increment; i < size; i+=increment) {
		graphic.lineTo(x0 + i*x_diff, y0 + i*y_diff);
		i+=increment;
		if (i > size) { //last bit should never be skipped
			break;
		}
		graphic.moveTo(x0 + i*x_diff, y0 + i*y_diff);
	}
	graphic.lineTo(x0 + size*x_diff, y0 + size*y_diff);
	graphic.moveTo(x0 + size*x_diff, y0 + size*y_diff);
}

function draw_arrow(graphic, a, b) {
	var x = (b[0] - a[0]);
	var y = (b[1] - a[1]);
	var angle = 2.6; //in radians, angle between forward facing vector and backward facing arrow head
	var cos_angle = Math.cos(angle);
	var sin_angle = Math.sin(angle);
	var x_1 = x * cos_angle - y * sin_angle;
	var y_1 = x * sin_angle + y * cos_angle;
	var size = Math.sqrt(x_1*x_1 + y_1*y_1);
	x_1 = x_1/size;
	y_1 = y_1/size;
	var x_2 = x * cos_angle + y * sin_angle;
	var y_2 = - x * sin_angle + y * cos_angle;
	size = Math.sqrt(x_2*x_2 + y_2*y_2);
	x_2 = x_2/size;
	y_2 = y_2/size;	
	var scale = (size_x/35);
	graphic.moveTo(b[0], b[1]);	
	graphic.lineTo(b[0] + x_1 * scale, b[1] + y_1 * scale);
	graphic.moveTo(b[0], b[1]);
	graphic.lineTo(b[0] + x_2 * scale, b[1] + y_2 * scale);	
}

/*computes control points given knots K, this is the brain of the operation*/
function computeControlPoints(K)
{
	p1=new Array();
	p2=new Array();
	n = K.length-1;
	
	/*rhs vector*/
	a=new Array();
	b=new Array();
	c=new Array();
	r=new Array();
	
	/*left most segment*/
	a[0]=0;
	b[0]=2;
	c[0]=1;
	r[0] = K[0]+2*K[1];
	
	/*internal segments*/
	for (i = 1; i < n - 1; i++)
	{
		a[i]=1;
		b[i]=4;
		c[i]=1;
		r[i] = 4 * K[i] + 2 * K[i+1];
	}
			
	/*right segment*/
	a[n-1]=2;
	b[n-1]=7;
	c[n-1]=0;
	r[n-1] = 8*K[n-1]+K[n];
	
	/*solves Ax=b with the Thomas algorithm (from Wikipedia)*/
	for (i = 1; i < n; i++)
	{
		m = a[i]/b[i-1];
		b[i] = b[i] - m * c[i - 1];
		r[i] = r[i] - m*r[i-1];
	}
 
	p1[n-1] = r[n-1]/b[n-1];
	for (i = n - 2; i >= 0; --i)
		p1[i] = (r[i] - c[i] * p1[i+1]) / b[i];
		
	/*we have p1, now compute p2*/
	for (i=0;i<n-1;i++)
		p2[i]=2*K[i+1]-p1[i+1];
	
	p2[n-1]=0.5*(K[n]+p1[n-1]);
	
	return {p1:p1, p2:p2};
}

function free_draw(graph, drawing) {
	graph.endFill();
	
	var path_x = [];
	var path_y = [];
	
	for (i = 0; i < drawing.path.length; i++) {
		path_x.push((drawing.x + drawing.path[i][0])*size_x);
		path_y.push((drawing.y + drawing.path[i][1])*size_y);
	}

	var cx = computeControlPoints(path_x);
	var cy = computeControlPoints(path_y);
	
	graph.moveTo(path_x[0], path_y[0]);
	for (i = 0; i < path_x.length-1; i++) {
		graph.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
	}
	graph.graphicsData[0].shape.closed = false;
}

function create_drawing(drawing) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.thickness * (size_x/500), drawing.color, 1);
	free_draw(graphic, drawing);		
	graphic.graphicsData[0].shape.closed = false;
	init_graphic(drawing, graphic);
}

function create_rectangle(drawing) {
	var rect = new PIXI.Rectangle(drawing.x*size_x, drawing.y*size_y, drawing.width*size_x, drawing.height*size_y);
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, rect);
	init_graphic(drawing, graphic);	
}

function create_circle(drawing) {
	var circle = new PIXI.Circle(drawing.x*size_x, drawing.y*size_y, drawing.radius*size_x);
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, circle);
	init_graphic(drawing, graphic);	
}

function create_polygon(drawing) {
	var path = [drawing.x*size_x, drawing.y*size_y];
	for (var i in drawing.path) {
		path.push((drawing.path[i][0]+drawing.x)*size_x);
		path.push((drawing.path[i][1]+drawing.y)*size_y);
	}
	var polygon = new PIXI.Polygon(path);
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, polygon);
	init_graphic(drawing, graphic);	
}

function create_line(drawing) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.thickness * (size_x/500), drawing.color, 1);
	var last_x = drawing.x*size_x, last_y = drawing.y*size_y;
	graphic.moveTo(last_x, last_y);
	for (i = 0; i < drawing.path.length; i++) {
		var x_i = (drawing.x + drawing.path[i][0])*size_x;
		var y_i = (drawing.y + drawing.path[i][1])*size_y;
		if (!drawing.is_dotted) {
			graphic.lineTo(x_i, y_i);
		} else {
			draw_dotted_line(graphic, last_x, last_y, x_i, y_i);
		}
		last_x = x_i;
		last_y = y_i;
	}

	if (drawing.is_arrow) {
		var a;
		if (drawing.path.length == 1) {
			a = [drawing.x * size_x, drawing.y * size_y];
		} else {
			a = [(drawing.x + drawing.path[drawing.path.length-2][0]) * size_x, 
			     (drawing.y + drawing.path[drawing.path.length-2][1]) * size_y];
		}
		var b = [(drawing.x + drawing.path[drawing.path.length-1][0]) * size_x, 
			     (drawing.y + drawing.path[drawing.path.length-1][1]) * size_y];
		draw_arrow(graphic, a, b);
	}
	
	graphic.graphicsData[0].shape.closed = false;
	
	init_graphic(drawing, graphic);
}

function init_graphic(drawing, graphic) {
	var texture = graphic.generateTexture();
	var sprite = new PIXI.Sprite(texture);
	var box = graphic.getBounds();
	
	sprite.x = box.x;
	sprite.y = box.y;
	drawing.container = sprite;
	
	drawing.container.alpha = drawing.alpha;

	sprite.texture.baseTexture.source.src = drawing.uid;
	make_draggable(drawing.container);
	drawing.container.hitArea = new PIXI.TransparencyHitArea.create(sprite, false);

	objectContainer.addChild(drawing.container);
	drawing.container.entity = drawing;
	renderer.render(stage);	
	history[drawing.uid] = drawing;
}

function create_entity(entity) {
	if (entity.type == 'background') {
		set_background(entity);
	} else if (entity.type == 'icon') {
		create_icon(entity);
	} else if (entity.type == 'drawing') {
		create_drawing(entity);
	} else if (entity.type == 'line') {
		create_line(entity);
	} else if (entity.type == 'text') {
		create_text(entity);
	} else if (entity.type == 'rectangle') {
		create_rectangle(entity);
	} else if (entity.type == 'circle') {
		create_circle(entity);
	} else if (entity.type == 'polygon') {
		create_polygon(entity);
	}
}

function update_username(name) {
	if (name != "" && name != my_user.name) {
		my_user.name = name;
		socket.emit("update_user", room, my_user);
	}
	input_node = $("#"+my_user.id).find("input");
	input_node.attr('placeholder',my_user.name);
	input_node.val("");
}

function add_user(user) {
	if (user.id in userlist) {
		var node = $("#"+user.id);
		if (user.id == my_user.id) {
			node.find('input').attr('placeholder', user.name);
		} else {
			node.text(user.name);
		}
	} else {	
		if (user.id == my_user.id) {
			var node = "<div class='btn' style='text-align:left;' id='" + user.id + "'><input type='text' placeholder='"+ user.name + "'></div>";
			$("#userlist").prepend(node);
			input_node = $("#userlist").find("input");
			input_node.on('blur', function() {
				update_username(this.value); //update username when field loses focus
			});
			input_node.onkeypress = function(e) {
				if (!e) e = window.event;
					var keyCode = e.keyCode || e.which;
					if (keyCode == '13') { //update username when enter is pressed
						update_username(this.value);
					}
			}
		} else { 
			var node = "<button class='btn' style='text-align:left;' id='" + user.id + "'>" + user.name + "</button>";
			$("#userlist").append(node);
		}
	}
	userlist[user.id] = user;
	if (user.role) {
		if (user.role == "owner") {
			$("#"+user.id).css('background-color','lime');
		} else if (user.role == "driver") {
			$("#"+user.id).css('background-color','yellow');
		}
	} else {
		$("#"+user.id).css('background-color','#EEEEEE');
	}
	if (user.id == my_user.id) {
		my_user = user;
		update_my_user();
	}
	$("#user_count").text(Object.keys(userlist).length.toString());
}

//function should be called when anything about you as a user changes, it will update the interface
//accordingly
function update_my_user() {
	if (my_user.identity) {
		$("#login_dropdown").removeClass("btn-warning");
		$("#login_dropdown").addClass("btn-success");
		$("#sign_in_text").text("Hi " + my_user.name);
	}	
	if (!my_user.role) {
		$('.left_column').hide();
	} else {
		$('.left_column').show();
	}
	if (my_user.identity) { //logged in
		$("#save_as").show();
		if (tactic_name && tactic_name != "") {
			$("#save").show();
		}
	} else {
		$("#save_as").hide();
		$("#save").hide();
	}
	update_lock();
}

function update_lock() {
	var node = $('#lock').find('img');
	var path = node.attr('src').substring(0, node.attr('src').lastIndexOf("/"));
	
	if (is_room_locked) {
		node.attr('src', path + "/lock.png");
	} else {
		node.attr('src', path + "/unlock.png");
	}
	
	if (is_room_locked && !my_user.role) {
		$('.left_column').hide();
	} else {
		$('.left_column').show();
	}
	
	if (my_user.role == "owner") {
		$('#lock').show();
	} else {
		$('#lock').hide();
	}
}

function remove_user(user) {
	$("#"+user).remove();
	delete userlist[user];
	$("#user_count").text(Object.keys(userlist).length.toString());
}

function chat(message) {
	$("#chat_box").append(message);
	$("#chat_box").scrollTop($("#chat_box")[0].scrollHeight);
}

function isIE(userAgent) {
  userAgent = userAgent || navigator.userAgent;
  return userAgent.indexOf("MSIE ") > -1 || userAgent.indexOf("Trident/") > -1;
}

function initialize_slider(slider_id, slider_text_id, variable_name) {
	var slider = $("#"+ slider_id).slider({tooltip:'hide'});
	$("#"+slider_text_id).val(slider.attr('value'));
	window[variable_name] = parseFloat(slider.attr('value'));
	slider.on("slide", function(slideEvt) {
		$("#"+slider_text_id).val(slideEvt.value);
		window[variable_name] = parseFloat(slideEvt.value);
	});
	$("#"+slider_text_id).change(function () {
		var new_value = parseFloat(this.value); 
		if (isNaN(new_value)) {
			this.value = window[variable_name]; //restore old value
		} else {
			window[variable_name] = new_value;
			slider.slider('setValue', window[variable_name])
		}
	});
}

//clear entities of a certain type from the map
function clear(type) {
	for (key in history) {
		if (history[key] && history[key].type == type) {
			remove(key);
			socket.emit('remove', room, key);
		}
	} 			
}

//connect socket.io socket
$.getScript("http://"+location.hostname+":8000/socket.io/socket.io.js", function() {
	socket = io.connect('http://'+location.hostname+':8000');

	$(document).ready(function() {

		$('#draw_context').hide();
		$('#icon_context').hide();
		$('#remove_context').hide();
		$('#text_context').hide();
		$('#line_context').hide();
		$('#rectangle_context').hide();
		$('#circle_context').hide();
		$('#polygon_context').hide();
		$("#save_as").hide();
		$("#save").hide();
		$('#ping').addClass('active');
		$('#arty').addClass('selected');
		$('#full_line').addClass('active');
	
		$('[data-toggle="popover"]').popover({
			container: 'body',
			html: 'true',
			template: '<div class="popover popover-medium"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
			content: function() {
				return $('#popover-content');
			}
		});

		$(document).on('click', '#store_tactic', function(){
			var name = $(document).find('#tactic_name')[0].value;
			$('#save_as').popover('hide');
			if (name == "") {
				alert("Empty name");
			} else {
				tactic_name = name;
				socket.emit("store", room, name);
				$("#save").show();
				alert("Tactic stored as: " + name);
			}
		});	

		$('#save').click(function() { 
			if (tactic_name && tactic_name != "") {
				socket.emit("store", room, tactic_name);
			}
		});
	  
		room = location.search.split('room=')[1].split("&")[0];
		socket.emit('join_room', room);
		
		
		//color selections
		icon_color = $('select[id="icon_colorpicker"]').val();
		$('select[id="icon_colorpicker"]').simplecolorpicker().on('change', function() {
			icon_color = $('select[id="icon_colorpicker"]').val();
		});
		draw_color = $('select[id="draw_colorpicker"]').val();
		$('select[id="draw_colorpicker"]').simplecolorpicker().on('change', function() {
			draw_color = $('select[id="draw_colorpicker"]').val();
		});
		ping_color = $('select[id="ping_colorpicker"]').val();
		$('select[id="ping_colorpicker"]').simplecolorpicker().on('change', function() {
			ping_color = $('select[id="ping_colorpicker"]').val();
		});
		line_color = $('select[id="line_colorpicker"]').val();
		$('select[id="line_colorpicker"]').simplecolorpicker().on('change', function() {
			line_color = $('select[id="line_colorpicker"]').val();
		});
		text_color = $('select[id="text_colorpicker"]').val();
		$('select[id="text_colorpicker"]').simplecolorpicker().on('change', function() {
			text_color = $('select[id="text_colorpicker"]').val();
		});
		rectangle_outline_color = $('select[id="rectangle_outline_colorpicker"]').val();
		$('select[id="rectangle_outline_colorpicker"]').simplecolorpicker().on('change', function() {
			rectangle_outline_color = $('select[id="rectangle_outline_colorpicker"]').val();
		});
		rectangle_fill_color = $('select[id="rectangle_fill_colorpicker"]').val();
		$('select[id="rectangle_fill_colorpicker"]').simplecolorpicker().on('change', function() {
			rectangle_fill_color = $('select[id="rectangle_fill_colorpicker"]').val();
		});
		circle_outline_color = $('select[id="circle_outline_colorpicker"]').val();
		$('select[id="circle_outline_colorpicker"]').simplecolorpicker().on('change', function() {
			circle_outline_color = $('select[id="circle_outline_colorpicker"]').val();
		});
		circle_fill_color = $('select[id="circle_fill_colorpicker"]').val();
		$('select[id="circle_fill_colorpicker"]').simplecolorpicker().on('change', function() {
			circle_fill_color = $('select[id="circle_fill_colorpicker"]').val();
		});
		polygon_outline_color = $('select[id="polygon_outline_colorpicker"]').val();
		$('select[id="polygon_outline_colorpicker"]').simplecolorpicker().on('change', function() {
			polygon_outline_color = $('select[id="polygon_outline_colorpicker"]').val();
		});
		polygon_fill_color = $('select[id="polygon_fill_colorpicker"]').val();
		$('select[id="polygon_fill_colorpicker"]').simplecolorpicker().on('change', function() {
			polygon_fill_color = $('select[id="polygon_fill_colorpicker"]').val();
		});
		
		//initialize sliders
		initialize_slider("rectangle_outline_thickness", "rectangle_outline_thickness_text", "rectangle_outline_thickness");
		rectangle_outline_thickness = parseFloat($("#rectangle_outline_thickness").val());
		initialize_slider("rectangle_outline_opacity", "rectangle_outline_opacity_text", "rectangle_outline_opacity");
		initialize_slider("rectangle_fill_opacity", "rectangle_fill_opacity_text", "rectangle_fill_opacity");
		initialize_slider("circle_outline_thickness", "circle_outline_thickness_text", "circle_outline_thickness");
		initialize_slider("circle_outline_opacity", "circle_outline_opacity_text", "circle_outline_opacity");
		initialize_slider("circle_fill_opacity", "circle_fill_opacity_text", "circle_fill_opacity");
		initialize_slider("polygon_outline_thickness", "polygon_outline_thickness_text", "polygon_outline_thickness");
		initialize_slider("polygon_outline_opacity", "polygon_outline_opacity_text", "polygon_outline_opacity");
		initialize_slider("polygon_fill_opacity", "polygon_fill_opacity_text", "polygon_fill_opacity");
		initialize_slider("line_thickness", "line_thickness_text", "line_thickness");
		initialize_slider("draw_thickness", "draw_thickness_text", "draw_thickness");
		initialize_slider("font_size", "font_size_text", "font_size");
		initialize_slider("label_font_size", "label_font_size_text", "label_font_size");
		
		$("#chat_input").keyup(function (e) {
			if (e.keyCode == 13) {
				var message = my_user.name + ": " + $("#chat_input").val() + "\n";
				socket.emit("chat", room, message);
				chat(message);
				$("#chat_input").val("");
			}
		});

		$('#export').click(function () {
			renderer.render(stage);	
			var data = renderer.view.toDataURL("image/jpeg", 0.6);			
			if (isIE()) {
				var win=window.open();
				win.document.write("<img src='" + data + "'/>");
			} else {			
				var link = document.createElement("a");
				link.setAttribute("target","_blank");
				if(Blob !== undefined) {
					var blob = new Blob([data], {type: "image/jpeg"});
					link.setAttribute("href", data);
				} else {
					link.setAttribute("href", data);
				}
				link.setAttribute("download", "map.jpg");
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		});
		
		$('#lock').click(function () {
			var node = $(this).find('img');
			var file = node.attr('src').substring(node.attr('src').lastIndexOf("/")+1);
			if (file == "lock.png") {
				is_room_locked = false;				
			} else {
				is_room_locked = true;
			}
			update_lock();
			socket.emit("lock_room", room, is_room_locked);
		});

		//tool select
		$('#contexts').on('click', 'button', function (e) {
			if ( $(this).attr('id') == "undo") {
				var entity = undo_list.pop();
				if (entity) {
					if (entity.uid) {
						remove(entity.uid);
						delete entity.container;
						socket.emit('remove', room, entity.uid);
						redo_list.push(entity);
					}
				}
				return;
			} else if ( $(this).attr('id') == "redo") {
				var entity = redo_list.pop();
				if (entity) {
					if (entity.uid) {
						undo_list.push(entity);
						socket.emit('create_entity', room, entity);
						create_entity(entity);
					}
				}
				return;
			}			
			$('#contexts').find("button").removeClass('active');
			$(this).addClass('active');			
			var new_context = $(this).attr('id')+"_context";	
			var new_context = $(this).attr('id')+"_context";
			if (active_context == new_context) { return; } 			
			$('#'+active_context).hide();
			$('#'+new_context).show();
			active_context = new_context;			
		});	

		$('#line_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});	
		
		$('#userlist').on('click', 'button', function () {
			var id = $(this).attr('id');
			if (id == my_user.id) { return; } //you can't change your own permission level
			if (my_user.role != "owner") { return; } //only the owner can change permission level
			if (!userlist[id].role) { //permission toggle
				userlist[id].role = "driver";
				$(this).css('background-color','yellow');
			} else if (userlist[id].role == "driver") {
				userlist[id].role = "owner";
				$(this).css('background-color','lime');
			} else if (userlist[id].role == "owner"){
				delete userlist[id].role;
				$(this).css('background-color','');
			}
			socket.emit("update_user", room, userlist[id]);
			return false;
		});	
		
		$('#clear_all').click(function() {
			for (key in history) {
				if (history[key] && history[key].type != "background") {
					remove(key);
					socket.emit('remove', room, key);
				}
			} 
		});
		
		$('#login_dropdown_select').on('click', 'a', function () {
			socket.emit("login", this.id, window.location.href);
		});
		
		socket.on('openid_login', function(url) {
			location.href = url;
		});
		
		var openid_exists = location.search.split('openid.assoc_handle=')[1];
		if (openid_exists) {
			socket.emit("login_complete", window.location.href);
			if (!isIE()) {
				window.history.replaceState("", "", location.pathname+"?room="+room); //rewrite url to make pretty
			}
		}
		
		$('#clear_draw').click(function() {
			clear("drawing");
		});
		$('#clear_icons').click(function() {
			clear("icon");
		});
		$('#clear_lines').click(function() {
			clear("line");
		});
		$('#clear_text').click(function() {
			clear("text");
		});
		$('#clear_selected').click(function() {
			var clone = selected_entities.slice(0);
			for (i in clone) {
				remove(clone[i].uid);
				socket.emit('remove', room, clone[i].uid);
			}
		});
		
		//tank icon select
		$('.tank_select').click(function() {
			$('.selected').removeClass('selected'); // removes the previous selected class
			$(this).addClass('selected'); // adds the class to the clicked image
			selected_icon = $(this).attr('id');
		});
		
		$(".edit_window").append(renderer.view);
		var map_select_box = document.getElementById("map_select");
		map_select_box.onchange = function() {
			var path = map_select_box.options[map_select_box.selectedIndex].value;
			if (!background || background.path != path) {
				var uid = background ? background.uid : newUid();
				new_background = {uid:uid, type:'background', path:path};
				socket.emit('create_entity', room, new_background);
				set_background(new_background);
			} 
		}
	});
	
	//network data responses
	
	socket.on('room_data', function(room_data, my_id) {
		is_room_locked = room_data.locked;
		my_user_id = my_id;
		if (room_data.name) {
			tactic_name = room_data.name;
		}
		for (var user in room_data.userlist) {
			add_user(room_data.userlist[user]);
		}
		for (var key in room_data.history) {
			create_entity(room_data.history[key]);
		}
		update_my_user();
	});

	socket.on('create_entity', function(entity) {
		create_entity(entity);
	});
	
	socket.on('drag', function(uid, x, y) {
		history[uid].container.x += (x-history[uid].x)*size_x;
		history[uid].container.y += (y-history[uid].y)*size_y;
		history[uid].x = x;
		history[uid].y = y;
		renderer.render(stage);
	});

	socket.on('ping', function(x, y, color) {
		ping(x,y,color);
	});

	socket.on('chat', function(message) {
		chat(message);
	});
	
	socket.on('identify', function(user) {
		my_user = user;
		update_my_user();
	});

	socket.on('remove', function(uid) {
		remove(uid);
	});

	socket.on('add_user', function(user) {
		add_user(user);
	});

	socket.on('remove_user', function(user) {
		remove_user(user);
	});

	socket.on('update_user', function(user) {
		update_user(user);
	});

	socket.on('lock_room', function(is_locked) {
		is_room_locked = is_locked;
		update_lock();
	});
	
});

setTimeout(function(){ renderer.render(stage); }, 500);
