//generates unique id
function newUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
    function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
}

var active_context = 'ping_context';
var history = {};
var userlist = {};
var selected_icon = 'arty';
var icon_color = '#ff0000';
var draw_color = '#ff0000';
var ping_color = '#ff0000';
var line_color = '#ff0000';
var socket;
var room;
var background;
var draw_thickness;
var line_thickness;
var my_user;
var undo_list = [];
var redo_list = [];

var shifted; //need to know if the shift key is pressed
$(document).on('keyup keydown', function(e) {
	shifted = e.shiftKey;
	if (!shifted && active_context == "line_context") {
		on_draw_end();
	}
});

var border = 30;
var size = Math.min(window.innerHeight, window.innerWidth) - border;
var renderer = PIXI.autoDetectRenderer(size, size,{backgroundColor : 0xBBBBBB});
var useWebGL = renderer instanceof PIXI.WebGLRenderer;

// create the root of the scene graph
var stage = new PIXI.Container();
var objectContainer = new PIXI.Container();
stage.addChild(objectContainer);

var background_sprite = new PIXI.Sprite();
background_sprite.height = renderer.height;
background_sprite.width = renderer.width;
objectContainer.addChild(background_sprite);

//automatically resize
window.onresize = function() { 
	size = Math.min(window.innerHeight, window.innerWidth) - border;
	renderer.view.style.width = size + "px";
	renderer.view.style.height = size + "px";
	renderer.render(stage);
};

function hex2rgb(hex) {
    if (hex.lastIndexOf('#') > -1) {
        hex = hex.replace(/#/, '0x');
    } else {
        hex = '0x' + hex;
    }
    var r = hex >> 16;
    var g = (hex & 0x00FF00) >> 8;
    var b = hex & 0x0000FF;
    return [r/255, g/255, b/255];
};

function createColorFilterRgb(R, G, B) {
	var filter = new PIXI.filters.ColorMatrixFilter();
	filter.matrix = [
		R, 0, 0, 0, 0,
		0, G, 0, 0, 0,
		0, 0, B, 0, 0,
		0, 0, 0, 1, 0
	]
	return filter;
}

function createColorFilterHex(hex) {
	var rgb = hex2rgb(hex);
	return createColorFilterRgb(rgb[0], rgb[1], rgb[2]);
}

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

function move_entity(entity, delta_x, delta_y) {
	entity.container.x += delta_x;
	entity.container.y += delta_y;
	entity.x += delta_x/stage.width;
	entity.y += delta_y/stage.height;	
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
	delete history[uid];	
	renderer.render(stage);
}

function ping(x, y, color) {
	var texture = PIXI.Texture.fromImage('http://'+location.host+'/icons/circle.png');
	var sprite = new PIXI.Sprite(texture);

	var colorFilter = createColorFilterHex(color);
	sprite.filters = [colorFilter];

	sprite.anchor.set(0.5);
	sprite.scale.x = 0.2;
	sprite.scale.y = 0.2;
	sprite.alpha = 1;
	sprite.x = x*stage.width;
	sprite.y = y*stage.height;
	
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

var graphics;
var new_drawing;
var select_origin;
var selected_entities = [];

function deselect_all() {
	for (entity in selected_entities) {
		selected_entities[entity].container.filters = undefined;
	}
	selected_entities = [];
}

function on_left_click(event) {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	if (active_context == 'draw_context') {	
		this.mouseup = on_draw_end;
		this.mouseupoutside = on_draw_end;
		this.mousemove = on_draw_move;
		new_drawing = {uid : newUid(), type: 'drawing', x:mouse_location.x/stage.width, y:mouse_location.y/stage.height, color:parseInt('0x'+draw_color.substring(1)), thickness:parseFloat(draw_thickness), path:[]};
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * (stage.width/500), parseInt('0x'+draw_color.substring(1)), 1);
		graphics.moveTo(mouse_location.x, mouse_location.y);
		objectContainer.addChild(graphics);
	} else if (active_context == 'line_context') {
		this.mouseup = on_line_end;
		this.mouseupoutside = on_line_end;
		this.mousemove = on_line_move;
		new_drawing = {uid : newUid(), type: 'line', x:mouse_location.x/stage.width, y:mouse_location.y/stage.height, color:parseInt('0x'+line_color.substring(1)), thickness:parseFloat(line_thickness), path:[], is_arrow:($('#arrow').hasClass('active') || $('#dotted_arrow').hasClass('active')), is_dotted:($('#dotted_line').hasClass('active') || $('#dotted_arrow').hasClass('active')) };
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * (stage.width/500), parseInt('0x'+line_color.substring(1)), 1);
		graphics.moveTo(mouse_location.x, mouse_location.y);
		objectContainer.addChild(graphics);
	} else if (active_context == 'icon_context') {
		this.mouseup = on_icon_end;
		this.mouseupoutside = on_icon_end;
	} else if (active_context == 'ping_context') {
		ping(mouse_location.x/stage.width, mouse_location.y/stage.height, ping_color);
		socket.emit("ping", room, mouse_location.x/stage.width, mouse_location.y/stage.height, ping_color);
	} else if (active_context == "select_context") {
		this.mouseup = on_select_end;
		this.mouseupoutside = on_select_end;
		this.mousemove = on_select_move;
		select_origin = [mouse_location.x, mouse_location.y];
		deselect_all();
	} else if (active_context == 'text_context') {
		this.mouseup = on_text_end;
		this.mouseupoutside = on_text_end;
	}
}

function on_select_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	// draw a rounded rectangle
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(2, 0xBBBBBB, 1);
	graphic.beginFill(0xBBBBBB, 0.25);
	graphic.drawRect(select_origin[0], select_origin[1], mouse_location.x-select_origin[0], mouse_location.y-select_origin[1]);
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
	
	x_min = Math.min(mouse_location.x, select_origin[0]);
	y_min = Math.min(mouse_location.y, select_origin[1]);
	x_max = Math.max(mouse_location.x, select_origin[0]);
	y_max = Math.max(mouse_location.y, select_origin[1]);
	
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

function on_line_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.thickness * (stage.width/500), new_drawing.color, 0.5);
	var a;
	if (new_drawing.path.length == 0) {
		a = [new_drawing.x * stage.width, new_drawing.y * stage.height];
	} else {
		a = [(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x) * stage.width,
			 (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y) * stage.height];
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

function on_draw_move() {
	var mouse_location = renderer.plugins.interaction.mouse.global;
	if (active_context == 'draw_context') {
		new_drawing.path.push([mouse_location.x/stage.width - new_drawing.x, mouse_location.y/stage.height - new_drawing.y]);
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
	socket.emit('create_entity', room, new_drawing);
	undo_list.push(new_drawing);
	create_drawing(new_drawing);
	new_drawing = null;
	graphics = null;
}

function on_icon_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var x = mouse_location.x/stage.width;
	var y = mouse_location.y/stage.height;
	var icon = {uid:newUid(), type: 'icon', tank:selected_icon, x:x, y:y, color:icon_color, label:$('#icon_label').val()}
	socket.emit('create_entity', room, icon);
	undo_list.push(icon);
	create_icon(icon);
}

function on_text_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	var mouse_location = renderer.plugins.interaction.mouse.global;	
	var x = mouse_location.x/stage.width;
	var y = mouse_location.y/stage.height;
	var text = {uid:newUid(), type: 'text', x:x, y:y, color:icon_color, text:$('#text_tool_text').val()};
	socket.emit('create_entity', room, text);
	undo_list.push(text);
	create_text(text);
}

function on_line_end() {
	this.mouseup = undefined;
	this.mouseupoutside = undefined;
	this.mousemove = undefined;
	var mouse_location = renderer.plugins.interaction.mouse.global;	
	new_drawing.path.push([mouse_location.x/stage.width - new_drawing.x, mouse_location.y/stage.height - new_drawing.y]);			
	if (!shifted) {
		//checks against an edge case where you haven't moved since the last registered point
		//2 identical points at the end really screws up the math
		if (new_drawing.path.length > 1 
			&& new_drawing.path[new_drawing.path.length-1][0] == new_drawing.path[new_drawing.path.length-2][0]
			&& new_drawing.path[new_drawing.path.length-1][1] == new_drawing.path[new_drawing.path.length-2][1]) {
				new_drawing.path.pop();
		}
		socket.emit('create_entity', room, new_drawing);
		undo_list.push(new_drawing);
		objectContainer.removeChild(graphics);
		create_drawing(new_drawing);
		history[new_drawing.uid] = new_drawing;
		new_drawing = null;
		graphics = null;
	} else {
		var graphic = new PIXI.Graphics();
		graphic.lineStyle(new_drawing.thickness * (stage.width/500), new_drawing.color, 1);
		
		var a;
		if (new_drawing.path.length == 1) {
			a = [new_drawing.x * stage.width, new_drawing.y * stage.height];
		} else {
			a = [(new_drawing.path[new_drawing.path.length - 2][0] + new_drawing.x) * stage.width, 
				 (new_drawing.path[new_drawing.path.length - 2][1] + new_drawing.y) * stage.height];
		}
		var b = [(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x) * stage.width, 
				 (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y) * stage.height];

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
	var size = ""+(stage.width/30)+"px Snippet";
	var text = new PIXI.Text(text_entity.text, {font: size, fill: "white", align: "center"});	
	text.x = text_entity.x * stage.width;
	text.y = text_entity.y * stage.height;
	text.hitArea = new PIXI.Rectangle(text.x, text.y, text.width, text.height);
	
	text_entity.container = new PIXI.Container();
	text_entity.container.addChild(text);
	text_entity.container.hitArea = new PIXI.Rectangle(text.x, text.y, text.width, text.height);
	
	make_draggable(text_entity.container);	
	objectContainer.addChild(text_entity.container);
	text_entity.container.entity = text_entity;
	renderer.render(stage);
	
	history[text_entity.uid] = text_entity;
}
	
function create_icon(icon) {
	var counter = $('#'+icon.tank).find("span");
	counter.text((parseInt(counter.text())+1).toString());
	counter = $("#icon_counter");
	counter.text((parseInt(counter.text())+1).toString());
	var colorFilter = createColorFilterHex(icon.color);
	var texture = PIXI.Texture.fromImage('http://'+location.host+'/icons/'+ icon.tank +'.png');
	var sprite = new PIXI.Sprite(texture);
	sprite.filters = [colorFilter];
	
	icon['container'] = new PIXI.Container();
	icon['container'].x = stage.width*icon.x;
	icon['container'].y = stage.height*icon.y;
	
	sprite.width = stage.width/35;
	sprite.height = stage.height/35;
	sprite.anchor.set(0.5);
		
	if (icon.label != "") {
		var size = ""+(stage.width/30)+"px Snippet";
		var text = new PIXI.Text(icon.label, {font: size, fill: "white", align: "center"});		
		text.x -= text.width/2;
		text.y -= stage.height/22;
		icon['container'].addChild(text);
	}

	icon['container'].addChild(sprite);
	icon['container'].pivot = sprite.position;
	icon['container'].entity = icon; 
	
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
	var increment = (stage.width/60);
	for (var i = increment; i < size; i+=increment) {
		graphic.lineTo(x0 + i*x_diff, y0 + i*y_diff);
		i+=increment;
		if (i > size) { //last bit should never be skipped
			break;
		}
		graphic.moveTo(x0 + i*x_diff, y0 + i*y_diff);
	}
	graphic.lineTo(x0 + size*x_diff, y0 + size*y_diff);
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
	var scale = (stage.width/20);
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
	
	var path_x = []; //[100,200,300,400];
	var path_y = []; //[200,100,100,200];
	
	for (i = 0; i < drawing.path.length; i++) {
		path_x.push((drawing.x + drawing.path[i][0])*stage.width);
		path_y.push((drawing.y + drawing.path[i][1])*stage.height);
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
	graphic.lineStyle(drawing.thickness * (stage.width/500), drawing.color, 1);
	if (drawing.type == "drawing") {
		free_draw(graphic, drawing);	
	} else if (drawing.type == "line") {
		var last_x = drawing.x*stage.width, last_y = drawing.y*stage.height;
		graphic.moveTo(last_x, last_y);
		for (i = 0; i < drawing.path.length; i++) {
			var x_i = (drawing.x + drawing.path[i][0])*stage.width;
			var y_i = (drawing.y + drawing.path[i][1])*stage.height;
			if (!drawing.is_dotted) {
				graphic.lineTo(x_i, y_i);
			} else {
				draw_dotted_line(graphic, last_x, last_y, x_i, y_i);
			}
			last_x = x_i;
			last_y = y_i;
		}
	}

	if (drawing.is_arrow) {
		var a;
		if (drawing.path.length == 1) {
			a = [drawing.x * stage.width, drawing.y * stage.height];
		} else {
			a = [(drawing.x + drawing.path[drawing.path.length-2][0]) * stage.width, 
			     (drawing.y + drawing.path[drawing.path.length-2][1]) * stage.height];
		}
		var b = [(drawing.x + drawing.path[drawing.path.length-1][0]) * stage.width, 
			     (drawing.y + drawing.path[drawing.path.length-1][1]) * stage.height];
		draw_arrow(graphic, a, b);
	}
	
	var texture = graphic.generateTexture();
	var sprite = new PIXI.Sprite(texture);
	var box = graphic.getBounds();
	
	sprite.x = box.x;
	sprite.y = box.y;
	drawing.container = sprite;

	sprite.texture.baseTexture.source.src = drawing.uid;
	make_draggable(drawing.container);
	drawing.container.hitArea = new PIXI.TransparencyHitArea.create(sprite, true);

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
	} else if (entity.type == 'drawing' || entity.type == 'line') {
		create_drawing(entity);
	} else if (entity.type == 'text') {
		create_text(entity);
	}
}

function add_user(user) {
	if (user.id in userlist) {
		var node = $("#"+user.id);
		node.text(user.name);
		node.attr('id', user.id);
	} else {	
		var node = "<button class='list-group-item' data-toggle='button' id='" + user.id + "'>" + user.name + "</button>";
		$('button', node).attr('id', user.id);  // set the attribute 
		$("#userlist").append(node);
	}
	userlist[user.id] = user;
	if (user.role) {
		if (user.role == "owner") {
			$("#"+user.id).css('background-color','lime');
		} else if (user.role == "driver") {
			$("#"+user.id).css('background-color','yellow');
		}
	} else {
		$("#"+user.id).css('background-color','');
	}
	if (user.id == my_user.id) {
		my_user = user;
		update_my_user();
	}
	$("#user_count").text(Object.keys(userlist).length.toString());
}

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
}

function remove_user(user) {
	$("#"+user).remove();
	delete userlist[user];
	$("#user_count").text(Object.keys(userlist).length.toString());
}

//console.log("http://"+location.hostname+":8080/socket.io/socket.io.js");
$.getScript("http://"+location.hostname+":8080/socket.io/socket.io.js", function() {
	socket = io.connect('http://'+location.hostname+':8080');

	$(document).ready(function() {
		room = location.search.split('room=')[1].split("&")[0];
		socket.emit('join_room', room);
		
		$('#draw_context').hide();
		$('#icon_context').hide();
		$('#remove_context').hide();
		$('#text_context').hide();
		$('#line_context').hide();
		$('#ping').addClass('active');
		$('#arty').addClass('selected');
		$('#full_line').addClass('active');
		
		
		//color selections
		$('select[id="icon_colorpicker"]').simplecolorpicker().on('change', function() {
			icon_color = $('select[id="icon_colorpicker"]').val();
		});
		$('select[id="draw_colorpicker"]').simplecolorpicker().on('change', function() {
			draw_color = $('select[id="draw_colorpicker"]').val();
		});
		$('select[id="ping_colorpicker"]').simplecolorpicker().on('change', function() {
			ping_color = $('select[id="ping_colorpicker"]').val();
		});
		$('select[id="line_colorpicker"]').simplecolorpicker().on('change', function() {
			line_color = $('select[id="line_colorpicker"]').val();
		});
		
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
			$(this).addClass('active');
			$(this).siblings().removeClass('active');			
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
			window.history.replaceState("", "", location.origin+location.pathname+"?room="+room); //rewrite url to make pretty
		}
			
		
		function clear(type) {
			for (key in history) {
				if (history[key] && history[key].type == type) {
					remove(key);
					socket.emit('remove', room, key);
				}
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
			for (i in selected_entities) {
				remove(selected_entities[i].uid);
				socket.emit('remove', room, selected_entities[i].uid);
			}
			selected_entities = [];
		});
		
		//sliders
		var draw_thickness_slider = $("#draw_thickness").slider();
		$("#draw_thickness_text").val(draw_thickness_slider.attr('value'));
		draw_thickness = draw_thickness_slider.attr('value');
		draw_thickness_slider.on("slide", function(slideEvt) {
			$("#draw_thickness_text").val(slideEvt.value);
			draw_thickness = slideEvt.value;
		});
		$("#line_thickness_text").change(function () {
			var new_thickness = parseFloat(this.value); 
			if (isNaN(new_thickness)) {
				this.value = draw_thickness;
			} else {
				line_thickness = new_thickness;
				line_thickness_slider.slider('setValue', line_thickness)
			}
		});
		var line_thickness_slider = $("#line_thickness").slider();
		$("#line_thickness_text").val(line_thickness_slider.attr('value'));
		line_thickness = line_thickness_slider.attr('value');
		line_thickness_slider.on("slide", function(slideEvt) {
			$("#line_thickness_text").val(slideEvt.value);
			line_thickness = slideEvt.value;
		});
		$("#draw_thickness_text").change(function () {
			var new_thickness = parseFloat(this.value); 
			if (isNaN(new_thickness)) {
				this.value = draw_thickness;
			} else {
				draw_thickness = new_thickness;
				draw_thickness_slider.slider('setValue', draw_thickness)
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
	
	socket.on('room_data', function(room_data, my_id) {
		my_user_id = my_id;
		for (var user in room_data.userlist) {
			add_user(room_data.userlist[user]);
		}
		for (var key in room_data.history) {
			create_entity(room_data.history[key]);
		}
	});

	socket.on('create_entity', function(entity) {
		create_entity(entity);
	});
	
	socket.on('drag', function(uid, x, y) {
		history[uid].container.x += (x-history[uid].x)*stage.width;
		history[uid].container.y += (y-history[uid].y)*stage.height;
		history[uid].x = x;
		history[uid].y = y;
		renderer.render(stage);
	});

	socket.on('ping', function(x, y, color) {
		ping(x,y,color);
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
	
});

setTimeout(function(){ renderer.render(stage); }, 500);
