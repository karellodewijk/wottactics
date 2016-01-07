var socket = io.connect('http://'+location.hostname, {
  'reconnect': true,
  'reconnection delay': 500,
  'max reconnection attempts': Infinity
});

//generates unique id
function newUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
    function(c) {
      r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
}

function is_chrome() {
	return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
}
function is_firefox() {
	return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}
function is_safari() {
	return navigator.vendor && navigator.vendor.indexOf('Apple') > -1;
}
function is_ie() {
	return navigator.userAgent.toLowerCase().indexOf('MSIE') > -1;
}

var image_host;
if (is_safari()) {
	image_host = 'http://'+location.host+'/icons/'; //enable for local image hosting
} else {
	image_host = "http://karellodewijk.github.io/icons/";
}
	
var assets;
var game = $('meta[name=game]').attr("content");
if (game == "wows") { //wows
	assets = [image_host+"bb.png", image_host+"cv.png", image_host+"ca.png", image_host+"dd.png"];
} else if (game == "blitz") {
	assets = [image_host+"light.png", image_host+"medium.png", image_host+"heavy.png", image_host+"td.png", image_host+"arty.png"];	
} else if (game == "aw") {
	assets = [image_host+"aw_afv.png", image_host+"aw_lt.png", image_host+"aw_mbt.png", image_host+"aw_spg.png", image_host+"aw_td.png"];
} else {
	assets = [image_host+"light.png", image_host+"medium.png", image_host+"heavy.png", image_host+"arty.png", image_host+"td.png"];	
}

assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"note.png");

var loader = PIXI.loader; 
for (var i in assets) {
	loader.add(assets[i], assets[i]);
}
loader.load();

var min_draw_point_distance = 0.01;
var min_draw_point_distance_sq = min_draw_point_distance * min_draw_point_distance;
var min_polygon_end_distance = 0.01; //in ratio to width of map
var min_polygon_end_distance_touch = 0.025;
var min_track_move_distance = 0.01;
var min_track_move_distance_sq = min_track_move_distance * min_track_move_distance;
var active_context = 'ping_context';
var history = {};
var userlist = {};
var selected_icon;
var icon_color = 0xff0000;
var draw_color = 0xff0000;
var ping_color = 0xff0000;
var track_color = 0xff0000;
var line_color = 0xff0000;
var curve_color = 0xff0000;
var text_color = 0xffffff;
var rectangle_outline_color = 0xff0000;
var rectangle_fill_color = 0xff0000;
var circle_outline_color = 0xff0000;
var circle_fill_color = 0xff0000;
var polygon_outline_color = 0xff0000;
var polygon_fill_color = 0xff0000;
var area_outline_color = 0xff0000;
var area_fill_color = 0xff0000;
var room;
var background;
var draw_thickness;
var curve_thickness;
var line_thickness;
var icon_size;
var rectangle_outline_thickness;
var rectangle_outline_opacity;
var rectangle_fill_opacity;
var circle_outline_thickness;
var circle_outline_opacity;
var circle_fill_opacity;
var polygon_outline_thickness;
var polygon_outline_opacity;
var polygon_fill_opacity;
var area_outline_thickness;
var area_outline_opacity;
var area_fill_opacity;
var my_user;
var undo_list = [];
var redo_list = [];
var is_room_locked;
var tactic_name = "";
var graphics;
var new_drawing;
var left_click_origin;
var selected_entities = [];
var previously_selected_entities = [];
var label_font_size = 30;
var last_ping_time;
var icon_scale = 0.025;
var note_scale = 0.05;
var thickness_scale = 0.0015;
var font_scale = 0.002;
var trackers = {};
var my_tracker;
var last_track_position;
var tracker_width = 0.05;
var tracker_height = 0.05;
var my_user_id;
var clipboard = [];

//keyboard shortcuts
var shifted; //need to know if the shift key is pressed
$(document).on('keyup keydown', function(e) {
	shifted = e.shiftKey;	
	if (document.activeElement.localName != "input") {	
		if (e.type == "keyup") {
			(e.key)
			if (e.ctrlKey) {
				if (e.key == 'z') {
					undo();
				} else if (e.key=='y') {
					redo();
				} else if (e.key=='s') {
					if (my_user.identity && tactic_name && tactic_name != "" && socket) {
						socket.emit("store", room, tactic_name);
					}
				} else if (e.key=='c') {
					copy();
				} else if (e.key=='x') {
					cut();
				} else if (e.key=='v') {
					paste();
				}
			} else if (e.key == "Delete") {
				clear_selected();
			} else if (e.key == "Shift") {
				if (active_context == 'line_context') {
					on_line_end(e);
				}
			}
		}
	}
});

function cut() {
	copy();
	clear_selected();
}

function copy() {
	clipboard = [];
	for (var i in selected_entities) {
		var temp = selected_entities[i].container;
		delete selected_entities[i].container;
		clipboard.push(JSON.parse(JSON.stringify(selected_entities[i])));
		selected_entities[i].container = temp;
	}	
}

function paste() {
	if (clipboard.length == 0) {
		return;
	}
	deselect_all();
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var mouse_x = mouse_x_rel(mouse_location.x);
	var mouse_y = mouse_y_rel(mouse_location.y);
	if (Math.abs(mouse_x) > 1 || Math.abs(mouse_y) > 1) {
		mouse_x = mouse_y = 0;
	}	
	var top = 1;
	var left = 1;
	for (var i in clipboard) {				
		top = Math.min(top, clipboard[i].y);
		left = Math.min(left, clipboard[i].x);
	}
	
	var new_entities = [];
	for (var i in clipboard) {
		var entity = JSON.parse(JSON.stringify(clipboard[i]))
		entity.uid = newUid();
		entity.x = mouse_x + (entity.x - left);
		entity.y = mouse_y + (entity.y - top);
		new_entities.push(entity);
		create_entity(entity);
		snap_and_emit_entity(entity);
		selected_entities.push(entity);
	}
	
	undo_list.push(["add", new_entities]);	
	select_entities();
	renderer.render(stage);
}

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
set_background({uid:newUid(), type:'background', path:""});


//resize the render window
function resize_renderer(new_size_x, new_size_y) {
	var last_size_x = size_x;
	var last_size_y = size_y;
	size_x = new_size_x;
	size_y = new_size_y;
	objectContainer.scale.x *= size_x/last_size_x;
	objectContainer.scale.y *= size_y/last_size_y;	
	renderer.resize(size_x, size_y);
	
	$("#render_frame").attr('style', 'height:' + size_y + 'px; width:' + size_x + 'px;');
	
	for (var i in history) {
		if (history[i] && history[i].type == 'note') {
		    align_note_text(history[i]);
		}
	}
	renderer.render(stage);
};

window.onresize = function() {
	size = Math.min(window.innerHeight, window.innerWidth) - border;
	if (size_x > size_y) {
		resize_renderer(size, size * size_y / size_x);
	} else {
		resize_renderer(size * size_x / size_y, size);
	}
};

function x_rel(x) {
	return x*objectContainer.scale.x/size_x;
}

function x_abs(x) {
	return x*size_x/objectContainer.scale.x;
}

function y_rel(y) {
	return y*objectContainer.scale.y/size_y;
}

function y_abs(y) {
	return y*size_y/objectContainer.scale.y;
}

function mouse_x_abs(x) {
	return x;
}

function mouse_y_abs(y) {
	return y;
}

function mouse_x_rel(x) {
	return x * objectContainer.scale.x / size_x;
}

function mouse_y_rel(y) {
	return y * objectContainer.scale.y / size_y;
}

function set_background(new_background) {
	if (background) {
		remove(background.uid);
	}
	background = new_background;
	
	if (background.path != "") {
		background_sprite.texture = PIXI.Texture.fromImage(background.path);
	} else {
		var empty_backround = new PIXI.Graphics();
		empty_backround.beginFill(0xFFFFFF, 1);
		empty_backround.moveTo(0, 0);
		empty_backround.lineTo(renderer.width, 0);
		empty_backround.lineTo(renderer.width, renderer.height);
		empty_backround.lineTo(0, renderer.height);
		empty_backround.lineTo(0, 0);
		empty_backround.endFill();
		background_sprite.texture = empty_backround.generateTexture();
	}

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
function on_drag_start(e) {
	if (is_room_locked && !my_user.role) {
		if (this.entity.type == 'note') {
			this.mouseup = toggle_note;
			this.touchend = toggle_note;
			this.mouseupoutside = toggle_note;
			this.touchendoutside = toggle_note;
		}
		return;
	}
	if (active_context != 'drag_context') {
		context_before_drag = active_context;
	}
	active_context = "drag_context";
	last_mouse_location = [mouse_x_abs(e.data.getLocalPosition(objectContainer).x), mouse_y_abs(e.data.getLocalPosition(objectContainer).y)];
	renderer.render(stage);
	
	this.mouseup = on_drag_end;
	this.touchend = on_drag_end;
	this.mouseupoutside = on_drag_end;
	this.touchendoutside = on_drag_end;
	this.mousemove = on_drag_move;
	this.touchmove = on_drag_move;

	move_selected = false;
	for (var i in selected_entities) {
		if (selected_entities[i].uid == this.entity.uid) {
			move_selected = true;
			break;
		}
	}
	
	if (!move_selected) {
		deselect_all();
		selected_entities = [this.entity];
		select_entities();
	}
	
	for (var i in selected_entities) {
		selected_entities[i].origin_x = selected_entities[i].x;
		selected_entities[i].origin_y = selected_entities[i].y;
	}
	this.origin_x = this.entity.x;
	this.origin_y = this.entity.y;
}

function toggle_note(e) {
	if (this.is_open) {
		this.is_open = false;
		align_note_text(this.entity);
	} else {
		this.is_open = true;
		align_note_text(this.entity);
	}	
}

function on_drag_end(e) {
	if (this.origin_x == this.entity.x && this.origin_y == this.entity.y) {	
		if (context_before_drag == 'remove_context') {
			remove(this.entity.uid);
			undo_list.push(["remove", [this.entity]]);
			socket.emit('remove', room, this.entity.uid);
		} else if (this.entity.type == 'note') {
			toggle_note.call(this, e);
			deselect_all();
		}
	} else {
		var origin_entity_map = [];
		for (var i in selected_entities) {
			selected_entities[i].container.alpha = 1;
			origin = [selected_entities[i].origin_x, selected_entities[i].origin_y];
			origin_entity_map.push([origin, selected_entities[i]]);
			delete selected_entities[i].origin_x;
			delete selected_entities[i].origin_y;
			socket.emit("drag", room, selected_entities[i].uid, selected_entities[i].x, selected_entities[i].y);
		}
		undo_list.push(["drag", origin_entity_map]);
	}
	this.mouseup = undefined;
	this.touchend = undefined;
	this.mouseupoutside = undefined;
	this.touchendoutside = undefined;
	this.mousemove = undefined;
	this.touchmove = undefined;
	active_context = context_before_drag;	
	renderer.render(stage);
}

//move an entity but keep it within the bounds
function move_entity(entity, delta_x, delta_y) {
	var new_x = entity.container.x + x_abs(delta_x);
	var new_y = entity.container.y + y_abs(delta_y);
	
	new_x = Math.max(new_x, 0);
	new_y = Math.max(new_y, 0);
	new_x = Math.min(new_x, x_abs(1 - x_rel(entity.container.width)));
	new_y = Math.min(new_y, y_abs(1 - y_rel(entity.container.height)));

	//move by relative positioning cause x on the container is the left upper corner of the bounding box
	//and for the entity this is mostly the start point
	
	drag_entity(entity, entity.x + x_rel(new_x - entity.container.x), entity.y + y_rel(new_y - entity.container.y));
}

function on_drag_move(e) {
	//move by deltamouse
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var delta_x = x_rel(mouse_x_abs(mouse_location.x) - last_mouse_location[0]);
	var delta_y = y_rel(mouse_y_abs(mouse_location.y) - last_mouse_location[1]);
	if (move_selected) {
		for (var i in selected_entities) {
			move_entity(selected_entities[i], delta_x, delta_y);
		}
	} else {
		move_entity(this.entity, delta_x, delta_y);
	}

	last_mouse_location = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
	renderer.render(stage);
}

function remove(uid) {
	if (history[uid] && history[uid].container) {
		if (history[uid].type == "note") {
			history[uid].container.menu.remove();
		}
		objectContainer.removeChild(history[uid].container);
		delete history[uid].container;
	}
	if (history[uid] && history[uid].type == "icon") {
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

function move_tracker(uid, delta_x, delta_y) {
	move_track_recursive(uid, delta_x * 0.1, delta_y * 0.1, 10);
}

function move_track_recursive(uid, step_x, step_y, count) {
	if (count) {
		setTimeout( function() {
			if (trackers[uid]) {
				trackers[uid].x += step_x;
				trackers[uid].y += step_y;
				trackers[uid].container.x += x_abs(step_x);
				trackers[uid].container.y += y_abs(step_y);
				renderer.render(stage);
				move_track_recursive(uid, step_x, step_y, count-1);
			}
		}, 20);
	}
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

function setup_mouse_events(on_move, on_release) {
	objectContainer.mouseup = on_release;
	objectContainer.touchend = on_release;
	objectContainer.mouseupoutside = on_release;
	objectContainer.touchendoutside = on_release;
	objectContainer.mousemove = on_move;
	objectContainer.touchmove = on_move;
}

function align_note_text(entity) {
	if (entity.container.is_open) {
		entity.container.menu.attr('style', 'top:' + y_abs(entity.y) * objectContainer.scale.x +'px; left:' + (x_abs(entity.x) + entity.container.width)  * objectContainer.scale.y + 'px; display: block;');
	} else {
		entity.container.menu.attr('style', 'top:' + y_abs(entity.y) * objectContainer.scale.x +'px; left:' + (x_abs(entity.x) + entity.container.width)  * objectContainer.scale.y + 'px; display: block; visibility: hidden;');
	}

}

//function fires when mouse is left clicked on the map and it isn't a drag
function on_left_click(e) {
	if (is_room_locked && !my_user.role) {
		return;
	}
	if (active_context == 'drag_context') {
		return;
	}
	deselect_all();
	var mouse_location = e.data.getLocalPosition(objectContainer);
	if (active_context == 'draw_context') {
		setup_mouse_events(on_draw_move, on_draw_end);
		new_drawing = {uid : newUid(), type: 'drawing', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, color:draw_color, alpha:1, thickness:parseFloat(draw_thickness), is_arrow:false, path:[[0, 0]]};
	} else if (active_context == 'line_context') {
		if (!new_drawing) {
			setup_mouse_events(on_line_move, on_line_end);
			new_drawing = {uid : newUid(), type: 'line', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y),  scale:1, color:line_color, alpha:1, thickness:parseFloat(line_thickness), path:[], is_arrow:($('#arrow').hasClass('active') || $('#dotted_arrow').hasClass('active')), is_dotted:($('#dotted_line').hasClass('active') || $('#dotted_arrow').hasClass('active')) };
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.thickness * x_abs(thickness_scale), line_color, 1);
			graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
			objectContainer.addChild(graphics);
		}
	} else if (active_context == 'polygon_context') {
		if (!new_drawing) {
			setup_mouse_events(on_polygon_move, on_polygon_end);
			new_drawing = {uid : newUid(), type: 'polygon', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, outline_thickness:polygon_outline_thickness, outline_color:polygon_outline_color, outline_opacity: polygon_outline_opacity, fill_color:polygon_fill_color, fill_opacity: polygon_fill_opacity, alpha:1, path:[]};
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
			var end_circle_radius = (e.type == "touchstart") ? min_polygon_end_distance_touch : min_polygon_end_distance;
			graphics.drawShape(new PIXI.Circle(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y), x_abs(end_circle_radius)));
			objectContainer.addChild(graphics);
			renderer.render(stage);
		}
	} else if (active_context == 'curve_context') {
		if (!new_drawing) {
			setup_mouse_events(on_curve_move, on_curve_end);
			new_drawing = {uid : newUid(), type: 'curve', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y),  scale:1, color:curve_color, alpha:1, thickness:parseFloat(curve_thickness), path:[], is_arrow:$('#curve_arrow').hasClass('active'), is_dotted:false};
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.thickness * x_abs(thickness_scale), new_drawing.color, 1);
			objectContainer.addChild(graphics);
		}
	} else if (active_context == 'area_context') {
		if (!new_drawing) {
			setup_mouse_events(on_area_move, on_area_end);
			new_drawing = {uid : newUid(), type: 'area', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, outline_thickness:area_outline_thickness, outline_color:area_outline_color, outline_opacity: area_outline_opacity, fill_color:area_fill_color, fill_opacity: area_fill_opacity, alpha:1, path:[]};
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
			var end_circle_radius = (e.type == "touchstart") ? min_polygon_end_distance_touch : min_polygon_end_distance;
			graphics.drawShape(new PIXI.Circle(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y), x_abs(end_circle_radius)));
			objectContainer.addChild(graphics);
			renderer.render(stage);
		}
	} else if (active_context == 'icon_context') {
		setup_mouse_events(undefined, on_icon_end);
	} else if (active_context == 'ping_context') {
		ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		socket.emit("ping", room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		last_ping_time = new Date();
		setup_mouse_events(on_ping_move, on_ping_end);
	} else if (active_context == "select_context") {
		setup_mouse_events(on_select_move, on_select_end);
		left_click_origin = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
		deselect_all();
	} else if (active_context == 'text_context') {
		setup_mouse_events(undefined, on_text_end);
	} else if (active_context == 'rectangle_context') {
		setup_mouse_events(on_rectangle_move, on_rectangle_end);
		left_click_origin = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
	} else if (active_context == 'circle_context') {
		setup_mouse_events(on_circle_move, on_circle_end);
		left_click_origin = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
	} else if (active_context == 'track_context') {
		if (my_tracker) {
			stop_tracking();
		} else {
			start_tracking(mouse_location);
			on_track_move(e);
		}
	} else if (active_context == 'note_context') {
		setup_mouse_events(undefined, on_note_end);
	}
}

function stop_tracking() {
	setup_mouse_events(undefined, undefined);
	socket.emit("stop_track", room, my_tracker.uid);
	objectContainer.removeChild(my_tracker.container);
	my_tracker = undefined;
	renderer.render(stage);
}

function start_tracking(mouse_location) {
	setup_mouse_events(on_track_move, undefined);
	my_tracker = {uid:newUid(), color: track_color, x: mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y)};
	last_track_position = [my_tracker.x, my_tracker.y];
	socket.emit("track", room, my_tracker);
	create_tracker(my_tracker);
}

function on_note_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var note = {uid:newUid(), type: 'note', x:x, y:y, scale:1, color:text_color, alpha:1, text:"", font_size:font_size, font:'Arial'};
	undo_list.push(["add", [note]]);
	create_note(note);
	note.container.is_open = true;
	align_note_text(note);
	snap_and_emit_entity(note);	
}

function create_note(note) {
	var texture = PIXI.Texture.fromImage(image_host+"note.png");
	var sprite = new PIXI.Sprite(texture);

	sprite.height = (sprite.height/29) * y_abs(note_scale) * note.scale;
	sprite.width = (sprite.width/29) * x_abs(note_scale) * note.scale;
	
	//note.container = new PIXI.Container();
	sprite.x = x_abs(note.x);
	sprite.y = y_abs(note.y);

    note.container = sprite;
	note.container.entity = note; 
	note.container.is_open = false;

	note.container.menu = $('<div class="popover fade right in" role="tooltip"><div style="top: 50%;" class="arrow"></div><h3 style="display: none;" class="popover-title"></h3><div class="popover-content"><textarea id="note_box"></textarea><br /><span id="notification_area" style="float: left;" hidden>Saved</span><div style="float:right;"><button id="save_note">save</button></div></div></div>');
	
	$("#note_box", note.container.menu).val(note.text);
	
	if (is_room_locked && !my_user.role) {
		$('textarea', note.container.menu).prop('readonly', true);
		$('button', note.container.menu).hide();
	}
	
	$("#render_frame").append(note.container.menu);
	$("#save_note", note.container.menu).on('click', function() {
		note.text = $("#note_box", note.container.menu).val();
		$("#notification_area", note.container.menu).show();
		$("#notification_area", note.container.menu).fadeOut("slow");	
		snap_and_emit_entity(note);
	});
	
	align_note_text(note);
		
	make_draggable(note.container);	
	objectContainer.addChild(note.container);
		
	renderer.render(stage);
	sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	history[note.uid] = note;
}

function create_tracker(tracker) {
	var texture = PIXI.Texture.fromImage(image_host + 'recticle.png');
	tracker.container = new PIXI.Sprite(texture);	
	tracker.container.tint = tracker.color;
	tracker.container.anchor.set(0.5);
	tracker.container.x = x_abs(tracker.x);
	tracker.container.y = y_abs(tracker.y);
	tracker.container.width = x_abs(tracker_width);
	tracker.container.height = y_abs(tracker_height);
	trackers[tracker.uid] = tracker;
	objectContainer.addChild(trackers[tracker.uid].container);
	renderer.render(stage);
}

function remove_tracker(uid) {
	objectContainer.removeChild(trackers[uid].container);
	renderer.render(stage);
	delete trackers[uid];
}

function ping(x, y, color) {
	var texture = PIXI.Texture.fromImage(image_host + 'circle.png');
	var sprite = new PIXI.Sprite(texture);

	sprite.tint = color;
	sprite.anchor.set(0.5);
	sprite.width = x_abs(0.075);
	sprite.height = x_abs(0.075);
	sprite.alpha = 1;
	sprite.x = x_abs(x);
	sprite.y = y_abs(y);
	
	objectContainer.addChild(sprite);
	sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	
	fade(sprite, 10, 0.5);
}


function on_track_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	my_tracker.x = x;
	my_tracker.y = y;
	my_tracker.container.x = x_abs(x);
	my_tracker.container.y = x_abs(y);
	renderer.render(stage);
	
	var dist_sq = (last_track_position[0] - my_tracker.x) * (last_track_position[0] - my_tracker.x)
			     +(last_track_position[1] - my_tracker.y) * (last_track_position[1] - my_tracker.y);
	if (dist_sq > min_track_move_distance_sq) {
		socket.emit("track_move", room, my_tracker.uid, my_tracker.x - last_track_position[0], my_tracker.y - last_track_position[1]);
		last_track_position = [my_tracker.x, my_tracker.y];
	}
}

function on_area_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);
	var new_x = x - new_drawing.x;
	var new_y = y - new_drawing.y;
	new_drawing.path.push([new_x, new_y]);
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, 1);	
	free_draw(graphic, new_drawing);
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
	new_drawing.path.pop();
}

function on_area_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);	
	var new_x = x - new_drawing.x;
	var new_y = y - new_drawing.y;
	
	var distance_to_start_sq = (x - new_drawing.x) * (x - new_drawing.x) + (y - new_drawing.y) * (y - new_drawing.y);

	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? min_polygon_end_distance_touch : min_polygon_end_distance;
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius)) {
		setup_mouse_events(undefined, undefined);
		new_drawing.path.push([0, 0]);
		create_area(new_drawing);
		snap_and_emit_entity(new_drawing);
		undo_list.push(["add", [new_drawing]]);	
		objectContainer.removeChild(graphics);
		renderer.render(stage);
		graphics = null;
		new_drawing = null;
	} else {
		new_drawing.path.push([new_x, new_y]);
	}
}

function on_curve_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);
	var new_x = x - new_drawing.x;
	var new_y = y - new_drawing.y;
	new_drawing.path.push([new_x, new_y]);
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.thickness * x_abs(thickness_scale), new_drawing.color, 1);	
	free_draw(graphic, new_drawing);
	
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
	new_drawing.path.pop();
}

function on_curve_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);
	var new_x = x - new_drawing.x;
	var new_y = y - new_drawing.y;
	
	var last_x, last_y;
	if (new_drawing.path.length > 0) {
		last_x = new_drawing.path[new_drawing.path.length-1][0];
		last_y = new_drawing.path[new_drawing.path.length-1][1];
	} else {
		last_x = 0;
		last_y = 0;
	}
	
	var distance_to_last_sq = (new_x - last_x) * (new_x - last_x) + (new_y - last_y) * (new_y - last_y);
	
	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside" || e.type == "touchstart" || e.type == "touchstartoutside") ? min_polygon_end_distance_touch : min_polygon_end_distance;
	
	if (distance_to_last_sq < (end_circle_radius*end_circle_radius)) {
		objectContainer.removeChild(graphics);
		setup_mouse_events(undefined, undefined);
		create_drawing(new_drawing);
		snap_and_emit_entity(new_drawing);
		undo_list.push(["add", [new_drawing]]);
		new_drawing = null;
	} else {
		objectContainer.removeChild(graphics);
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * x_abs(thickness_scale), new_drawing.color, 1);
		graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
		graphics.drawShape(new PIXI.Circle(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y), x_abs(end_circle_radius)));
		objectContainer.addChild(graphics);
		new_drawing.path.push([new_x, new_y]);
		on_curve_move(e);
	}
}

function on_polygon_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, 0.5);
	var a;
	if (new_drawing.path.length == 0) {
		a = [x_abs(new_drawing.x), y_abs(new_drawing.y)];
	} else {
		a = [x_abs(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x),
			 y_abs(new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y)];
	}
	var b = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
	graphic.moveTo(a[0], a[1]);		
	graphic.lineTo(b[0], b[1]);

	graphics.addChild(graphic);
	renderer.render(stage);
	graphics.removeChild(graphic);	
}

function on_polygon_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);

	var distance_to_start_sq = (x - new_drawing.x) * (x - new_drawing.x) + (y - new_drawing.y) * (y - new_drawing.y);
	
	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? min_polygon_end_distance_touch : min_polygon_end_distance;
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius)) {
		setup_mouse_events(undefined, undefined);
		objectContainer.removeChild(graphics);
		create_polygon(new_drawing);
		snap_and_emit_entity(new_drawing);
		undo_list.push(["add", [new_drawing]]);
		new_drawing = null;
		graphics = null;
	} else {
		new_drawing.path.push([x - new_drawing.x, y - new_drawing.y]);
		var graphic = new PIXI.Graphics();
		graphic.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, 1);
		var a;
		if (new_drawing.path.length == 1) {
			a = [x_abs(new_drawing.x), x_abs(new_drawing.y)];
		} else {
			a = [x_abs(new_drawing.path[new_drawing.path.length - 2][0] + new_drawing.x), 
				 y_abs(new_drawing.path[new_drawing.path.length - 2][1] + new_drawing.y)];
		}
		var b = [x_abs(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x), 
				 y_abs(new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y)];

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
	graphic.lineStyle(outline_thickness * x_abs(thickness_scale), outline_color, outline_opacity);
	graphic.beginFill(fill_color, fill_opacity);
	graphic.drawShape(shape);
	graphic.endFill();
	return graphic;
}

function on_circle_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	
	var center_x = (left_click_origin[0] + mouse_x_abs(mouse_location.x)) / 2;
	var center_y = (left_click_origin[1] + mouse_y_abs(mouse_location.y)) / 2;
	var radius = Math.sqrt((left_click_origin[0] - mouse_x_abs(mouse_location.x)) * (left_click_origin[0] - mouse_x_abs(mouse_location.x))+(left_click_origin[1] - mouse_y_abs(mouse_location.y)) * (left_click_origin[1] - mouse_y_abs(mouse_location.y)));
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

function on_circle_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	
	var center_x = (left_click_origin[0] + mouse_x_abs(mouse_location.x)) / 2;
	var center_y = (left_click_origin[1] + mouse_y_abs(mouse_location.y)) / 2;
	var radius = Math.sqrt((left_click_origin[0] - mouse_x_abs(mouse_location.x)) * (left_click_origin[0] - mouse_x_abs(mouse_location.x))+(left_click_origin[1] - mouse_y_abs(mouse_location.y)) * (left_click_origin[1] - mouse_y_abs(mouse_location.y)));
	radius /= 2;
	
	setup_mouse_events(undefined, undefined);
	
	var new_shape = {uid:newUid(), type:'circle', x:x_rel(center_x), y:y_rel(center_y), radius:x_rel(radius), outline_thickness:circle_outline_thickness, outline_color:circle_outline_color, outline_opacity: circle_outline_opacity, fill_opacity: circle_fill_opacity, fill_color:circle_fill_color, alpha:1};	

	create_circle(new_shape);
	snap_and_emit_entity(new_shape);
	undo_list.push(["add", [new_shape]]);
	
}

function on_rectangle_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var left_x = Math.min(left_click_origin[0], mouse_x_abs(mouse_location.x));
	var left_y = Math.min(left_click_origin[1], mouse_y_abs(mouse_location.y));
	var right_x = Math.max(left_click_origin[0], mouse_x_abs(mouse_location.x));
	var right_y = Math.max(left_click_origin[1], mouse_y_abs(mouse_location.y));
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

function on_rectangle_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var left_x = Math.min(left_click_origin[0], mouse_x_abs(mouse_location.x));
	var left_y = Math.min(left_click_origin[1], mouse_y_abs(mouse_location.y));
	var right_x = Math.max(left_click_origin[0], mouse_x_abs(mouse_location.x));
	var right_y = Math.max(left_click_origin[1], mouse_y_abs(mouse_location.y));
	setup_mouse_events(undefined, undefined);
	var new_shape = {uid:newUid(), type:'rectangle', x:x_rel(left_x), y:y_rel(left_y), width:x_rel(right_x - left_x), height:y_rel(right_y - left_y), outline_thickness:rectangle_outline_thickness, outline_color:rectangle_outline_color, outline_opacity: rectangle_outline_opacity, fill_opacity: rectangle_fill_opacity, fill_color:rectangle_fill_color, alpha:1};
	create_rectangle(new_shape);
	snap_and_emit_entity(new_shape);
	undo_list.push(["add", [new_shape]]);
}

function on_ping_move(e) {
	var time = new Date();
	var timeDiff = time - last_ping_time;
	if (timeDiff > 120) {
		var mouse_location = e.data.getLocalPosition(objectContainer);
		ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		socket.emit("ping", room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		last_ping_time = time;
	}
}

function on_ping_end(e) {
	setup_mouse_events(undefined, undefined);
}

function on_select_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	// draw a rounded rectangle
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(2, 0xBBBBBB, 1);
	graphic.beginFill(0xBBBBBB, 0.25);
	graphic.drawRect(left_click_origin[0], left_click_origin[1], mouse_x_abs(mouse_location.x)-left_click_origin[0], mouse_y_abs(mouse_location.y)-left_click_origin[1]);
	graphic.endFill();
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
}

function on_select_end(e) {
	setup_mouse_events(undefined, undefined);

	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x_min = Math.min(mouse_x_abs(mouse_location.x), left_click_origin[0]);
	var y_min = Math.min(mouse_y_abs(mouse_location.y), left_click_origin[1]);
	var x_max = Math.max(mouse_x_abs(mouse_location.x), left_click_origin[0]);
	var y_max = Math.max(mouse_y_abs(mouse_location.y), left_click_origin[1]);
	
	for (var key in history) {
		if (history.hasOwnProperty(key) && history[key].container) {
			var box = history[key].container.getBounds();
			if (box.x > x_min && box.y > y_min && box.x + box.width < x_max && box.y + box.height < y_max) {
				selected_entities.push(history[key]);
			}
		}
	}
	
	select_entities();
	undo_list.push(["select", selected_entities, previously_selected_entities]);
	renderer.render(stage);
}

function select_entities() {
	var filter = new PIXI.filters.ColorMatrixFilter();
	filter.matrix = [
		1, 0, 0, 0, 0,
		0, 1, 0, 0, 0,
		0, 0, 1, 0, 0,
		0, 0, 0, 0.5, 0
	]
	
	for (var i in selected_entities) {
		history[selected_entities[i].uid].container.filters = [filter];
	}
}

function deselect_all() {
	previously_selected_entities = selected_entities;
	for (var entity in selected_entities) {
		selected_entities[entity].container.filters = undefined;
	}
	selected_entities = [];
}

//man, am I not happy about this. Incrementally updating a Pixi.graphics between rendering it,
//causes issues on firefox (TOO_MUCH_MALLOC), so every time you move I draw the last 30 interpollation 
//points and every redraw_countdown interpolation points I redraw the whole history.
var redraw_countdown = 20;
function on_draw_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var a = new_drawing.path[new_drawing.path.length-1];
	var b = [mouse_x_rel(mouse_location.x) - new_drawing.x, 
	         mouse_y_rel(mouse_location.y) - new_drawing.y];
	
	var dist_sq = (a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]);
	
	new_drawing.path.push(b);
	var path = new_drawing.path.slice(Math.max(new_drawing.path.length-30, 0));
	
	var path_x = [];
	var path_y = [];
	
	for (var i = 0; i < path.length; i++) {
		path_x.push(x_abs(new_drawing.x + path[i][0]));
		path_y.push(y_abs(new_drawing.y + path[i][1]));
	}

	var cx = computeControlPoints(path_x);
	var cy = computeControlPoints(path_y);		

	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.thickness * x_abs(thickness_scale), draw_color, 1);
	
	if (path.length >= 30) {
		graphic.moveTo(path_x[5], path_y[5])
		for (var i = 5; i < path_x.length-1; i++) {
			graphic.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
	} else {
		if (path_x.length == 2) {
			graphic.moveTo(path_x[0], path_y[0]);
			graphic.lineTo(path_x[1], path_y[1]);
		} else {
			graphic.moveTo(path_x[0], path_y[0])
			for (var i = 0; i < path_x.length-1; i++) {
				graphic.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
			}
		}
	}
	graphic.graphicsData[graphic.graphicsData.length-1].shape.closed = false;
	
	if ($('#draw_arrow').hasClass('active')) {
		if (path_x.length >= 3) {
			draw_arrow(graphic, [path_x[path_x.length-3], path_y[path_y.length-3]], [path_x[path_x.length-1], path_y[path_y.length-1]]);
		}
	}
	
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
		
	if (dist_sq < min_draw_point_distance_sq) {
		new_drawing.path.pop();
	} else {
		redraw_countdown--;
		if (redraw_countdown == 0) { //redraw ALL
			redraw_countdown = 20;
			objectContainer.removeChild(graphics);
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.thickness * x_abs(thickness_scale), draw_color, 1);
			free_draw(graphics, new_drawing);
			objectContainer.addChild(graphics);
			renderer.render(stage);	
		}
	}
}


function on_draw_end(e) {
	setup_mouse_events(undefined, undefined);
	objectContainer.removeChild(graphics);
	renderer.render(stage);	
	var mouse_location = e.data.getLocalPosition(objectContainer);
	new_drawing.path.push([mouse_x_rel(mouse_location.x) - new_drawing.x, mouse_y_rel(mouse_location.y) - new_drawing.y]);
	new_drawing.is_arrow = $('#draw_arrow').hasClass('active');
	undo_list.push(["add", [new_drawing]]);
	create_drawing(new_drawing);
	snap_and_emit_entity(new_drawing);
	new_drawing = null;
	graphics = null;
}

function snap_and_emit_entity(entity) {
	move_entity(entity, 0, 0);
	renderer.render(stage);
	var container = entity.container;
	entity.container = undefined;
	socket.emit('create_entity', room, entity);
	entity.container = container;
	renderer.render(stage);
}

function on_icon_end(e) {	
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);

	var x = mouse_x_rel(mouse_location.x) - (icon_scale/2);
	var y = mouse_y_rel(mouse_location.y) - (icon_scale/2);
	
	var icon = {uid:newUid(), type: 'icon', tank:selected_icon, x:x, y:y, scale:(icon_size/20), color:icon_color, alpha:1, label:$('#icon_label').val(), label_font_size: label_font_size, label_color: "#ffffff", label_font: "Arial"}
	undo_list.push(["add", [icon]]);
	create_icon(icon);
	snap_and_emit_entity(icon);
}

function on_text_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var text = {uid:newUid(), type: 'text', x:x, y:y, scale:1, color:text_color, alpha:1, text:$('#text_tool_text').val(), font_size:font_size, font:'Arial'};
	undo_list.push(["add", [text]]);
	create_text(text);
	snap_and_emit_entity(text);
}

function on_line_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(new_drawing.thickness * x_abs(thickness_scale), new_drawing.color, 0.5);
	var a;
	if (new_drawing.path.length == 0) {
		a = [x_abs(new_drawing.x), y_abs(new_drawing.y)];
	} else {
		a = [x_abs(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x),
			 y_abs(new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y)];
	}
	var b = [mouse_x_abs(mouse_location.x), mouse_x_abs(mouse_location.y)];
	graphic.moveTo(a[0], a[1]);		
	graphic.lineTo(b[0], b[1]);

	if (new_drawing.is_arrow) {
		draw_arrow(graphic, a, b);
	}

	graphics.addChild(graphic);
	renderer.render(stage);
	graphics.removeChild(graphic);	
}

function on_line_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(objectContainer);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(1, x);
		y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;		
		new_drawing.path.push([x, y]);		
	} catch (e) {}
	// || e.type == 'mouseupoutside' || e.type == 'touchendoutside'
	if (!shifted) {
		setup_mouse_events(undefined, undefined);
		//checks against an edge case where you haven't moved since the last registered point
		//2 identical points at the end really screws up the math
		if (new_drawing.path.length > 1 
			&& new_drawing.path[new_drawing.path.length-1][0] == new_drawing.path[new_drawing.path.length-2][0]
			&& new_drawing.path[new_drawing.path.length-1][1] == new_drawing.path[new_drawing.path.length-2][1]) {
				new_drawing.path.pop();
		}
		undo_list.push(["add", [new_drawing]]);
		objectContainer.removeChild(graphics);
		create_line(new_drawing);
		snap_and_emit_entity(new_drawing);
		new_drawing = null;
		graphics = null;
	} else {
		var graphic = new PIXI.Graphics();
		graphic.lineStyle(new_drawing.thickness * x_abs(thickness_scale), line_color, 1);
		
		var a;
		if (new_drawing.path.length == 1) {
			a = [x_abs(new_drawing.x), y_abs(new_drawing.y)];
		} else {
			a = [x_abs(new_drawing.path[new_drawing.path.length - 2][0] + new_drawing.x), 
				 y_abs(new_drawing.path[new_drawing.path.length - 2][1] + new_drawing.y)];
		}
		var b = [x_abs(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x), 
				 y_abs(new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y)];

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
objectContainer.mousedown = on_left_click;
objectContainer.touchstart = on_left_click;

function create_text(text_entity) {
	var size = "bold "+text_entity.font_size*x_abs(font_scale)+"px " + text_entity.font;
	text_entity.container = new PIXI.Text(text_entity.text, {font: size, fill: text_entity.color, strokeThickness: 1.5, stroke: "black", align: "center", dropShadow:true, dropShadowDistance:1});	
	text_entity.container.x = x_abs(text_entity.x);
	text_entity.container.y = y_abs(text_entity.y);
	
	text_entity.container.entity = text_entity;
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
	var texture = PIXI.Texture.fromImage(image_host + icon.tank +'.png');
	var sprite = new PIXI.Sprite(texture);
	sprite.tint = icon.color;

	//sprite.width = x_abs(icon_scale);
	sprite.height = (sprite.height/29) * y_abs(icon_scale) * icon.scale;
	sprite.width = (sprite.width/29) * x_abs(icon_scale) * icon.scale;
	
	icon.container = new PIXI.Container();
	icon.container.x = x_abs(icon.x);
	icon.container.y = y_abs(icon.y);

	icon.container.addChild(sprite);	
	if (icon.label && icon.label != "") {
		var size = "bold "+icon.label_font_size*x_abs(font_scale)+"px " + icon.label_font;
		var text = new PIXI.Text(icon.label, {font: size, fill: icon.label_color, align: "center", strokeThickness: 1.5, stroke: "black", dropShadow:true, dropShadowDistance:1});		
		text.x += sprite.width/2 - text.width/2;
		text.y += sprite.height;
		icon['container'].addChild(text);
	}

	icon.container.pivot = sprite.position;
	icon.container.entity = icon; 
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
	root.mousedown = on_drag_start;
	root.touchstart = on_drag_start;
}

function draw_dotted_line(graphic, x0, y0, x1, y1) {
	var x_diff = x1-x0;
	var y_diff = y1-y0;
	var size = Math.sqrt(x_diff*x_diff+y_diff*y_diff);
	x_diff /= size;
	y_diff /= size;
	var increment = x_abs(0.01);
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
	var angle = 2.75; //in radians, angle between forward facing vector and backward facing arrow head
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
	var scale = x_abs(1.0/35);
	graphic.moveTo(b[0], b[1]);	
	graphic.lineTo(b[0] + x_1 * scale, b[1] + y_1 * scale);
	graphic.moveTo(b[0], b[1]);
	graphic.lineTo(b[0] + x_2 * scale, b[1] + y_2 * scale);	
}

/*computes control points given knots K, this is the brain of the operation*/
function computeControlPoints(K)
{
	var p1=new Array();
	var p2=new Array();
	var n = K.length-1;
	
	/*rhs vector*/
	var a=new Array();
	var b=new Array();
	var c=new Array();
	var r=new Array();
	
	/*left most segment*/
	a[0]=0;
	b[0]=2;
	c[0]=1;
	r[0] = K[0]+2*K[1];
	
	/*internal segments*/
	for (var i = 1; i < n - 1; i++)
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
	for (var i = 1; i < n; i++)
	{
		var m = a[i]/b[i-1];
		b[i] = b[i] - m * c[i - 1];
		r[i] = r[i] - m*r[i-1];
	}
 
	p1[n-1] = r[n-1]/b[n-1];
	for (var i = n - 2; i >= 0; --i)
		p1[i] = (r[i] - c[i] * p1[i+1]) / b[i];
		
	/*we have p1, now compute p2*/
	for (var i=0;i<n-1;i++)
		p2[i]=2*K[i+1]-p1[i+1];
	
	p2[n-1]=0.5*(K[n]+p1[n-1]);
	
	return {p1:p1, p2:p2};
}

function free_draw(graph, drawing, smooth_out) {
	if (drawing.path.length == 1) {
		var a = [x_abs(drawing.x), y_abs(drawing.y)]
		var b = [x_abs(drawing.x + drawing.path[0][0]), 
		         y_abs(drawing.y + drawing.path[0][1])]
		graph.moveTo(a[0], a[1]);
		graph.lineTo(b[0], b[1]);
		if (drawing.is_arrow) {
			draw_arrow(graph, a, b);
		}
		
	} else {
		var path_x = [x_abs(drawing.x)];
		var path_y = [y_abs(drawing.y)];
		
		for (var i = 0; i < drawing.path.length; i++) {
			path_x.push(x_abs(drawing.x + drawing.path[i][0]));
			path_y.push(y_abs(drawing.y + drawing.path[i][1]));
		}
		
		//smooth out basically means push some of the end points at the beginning 
		//and some of beginning points at the end before we calculate the control points
		var slice_size;
		if (smooth_out) {
			slice_size = Math.min(4, path_x.length-1)
			path_x = path_x.slice(path_x.length-slice_size-1, path_x.length-1).concat(path_x.concat(path_x.slice(1, slice_size+1)))
			path_y = path_y.slice(path_y.length-slice_size-1, path_y.length-1).concat(path_y.concat(path_y.slice(1, slice_size+1)))
		}

		var cx = computeControlPoints(path_x);
		var cy = computeControlPoints(path_y);
		
		if (smooth_out) {
			var left = slice_size;
			var right = path_x.length-slice_size;
			path_x = path_x.slice(left, right)
			path_y = path_y.slice(left, right)
			cx.p1 = cx.p1.slice(left, right)
			cx.p2 = cx.p2.slice(left, right)
			cy.p1 = cy.p1.slice(left, right)
			cy.p2 = cy.p2.slice(left, right)
		}
		
		graph.moveTo(path_x[0], path_y[0]);
		for (var i = 0; i < path_x.length-1; i++) {
			graph.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
		
		if (drawing.is_arrow) {
			if (drawing.type == "drawing") {
				draw_arrow(graph, [path_x[path_x.length-3], path_y[path_y.length-3]], [path_x[path_x.length-1], path_y[path_y.length-1]]);
			} else {
				draw_arrow(graph, [cx.p1[cx.p1.length-1], cy.p1[cy.p1.length-1]], [path_x[path_x.length-1], path_y[path_y.length-1]]);
			}
		}
		
	}
	graph.graphicsData[0].shape.closed = false;
}

function create_drawing(drawing) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.thickness * x_abs(thickness_scale), drawing.color, 1);
	free_draw(graphic, drawing);		
	graphic.graphicsData[0].shape.closed = false;
	init_graphic(drawing, graphic);
}

function create_area(drawing, smooth_point) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.outline_thickness * x_abs(thickness_scale), drawing.outline_color, 1);
	graphic.beginFill(drawing.fill_color, drawing.fill_opacity);
	free_draw(graphic, drawing, true);
	graphic.graphicsData[0].shape.closed = true;
	graphic.endFill();
	init_graphic(drawing, graphic);
}

function create_rectangle(drawing) {
	var rect = new PIXI.Rectangle(x_abs(drawing.x), y_abs(drawing.y), x_abs(drawing.width), y_abs(drawing.height));
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, rect);
	init_graphic(drawing, graphic);	
}

function create_circle(drawing) {
	var circle = new PIXI.Circle(x_abs(drawing.x), y_abs(drawing.y), x_abs(drawing.radius));
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, circle);
	init_graphic(drawing, graphic);	
}

function create_polygon(drawing) {
	var path = [x_abs(drawing.x), y_abs(drawing.y)];
	for (var i in drawing.path) {
		path.push(x_abs(drawing.path[i][0]+drawing.x));
		path.push(y_abs(drawing.path[i][1]+drawing.y));
	}
	var polygon = new PIXI.Polygon(path);
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, polygon);
	init_graphic(drawing, graphic);	
}

function create_line(drawing) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.thickness * x_abs(thickness_scale), drawing.color, 1);
	var last_x = x_abs(drawing.x), last_y = y_abs(drawing.y);
	graphic.moveTo(last_x, last_y);
	for (var i = 0; i < drawing.path.length; i++) {
		var x_i = x_abs(drawing.x + drawing.path[i][0]);
		var y_i = y_abs(drawing.y + drawing.path[i][1]);
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
			a = [x_abs(drawing.x), y_abs(drawing.y)];
		} else {
			a = [x_abs(drawing.x + drawing.path[drawing.path.length-2][0]), 
			     y_abs(drawing.y + drawing.path[drawing.path.length-2][1])];
		}
		var b = [x_abs(drawing.x + drawing.path[drawing.path.length-1][0]), 
			     y_abs(drawing.y + drawing.path[drawing.path.length-1][1])];
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
	drawing.container.hitArea = new PIXI.TransparencyHitArea.create(sprite, false);

	objectContainer.addChild(drawing.container);
	make_draggable(drawing.container);

	drawing.container.entity = drawing;
	renderer.render(stage);	
	history[drawing.uid] = drawing;
}

function create_entity(entity) {	
	if (history[entity.uid]) {
		remove(entity.uid);
	}
	if (entity.type == 'background') {
		set_background(entity);
	} else if (entity.type == 'icon') {
		create_icon(entity);
	} else if (entity.type == 'drawing') {
		create_drawing(entity);
	} else if (entity.type == 'curve') {
		create_drawing(entity);
	} else if (entity.type == 'line') {
		create_line(entity);
	} else if (entity.type == 'text') {
		create_text(entity);
	} else if (entity.type == 'note') {
		create_note(entity);
	} else if (entity.type == 'rectangle') {
		create_rectangle(entity);
	} else if (entity.type == 'circle') {
		create_circle(entity);
	} else if (entity.type == 'polygon') {
		create_polygon(entity);
	} else if (entity.type == 'area') {
		create_area(entity);
	}
}

function update_username(name) {
	if (name != "" && name != my_user.name) {
		my_user.name = name;
		socket.emit("update_user", room, my_user);
	}
	var input_node = $("#"+my_user.id).find("input");
	input_node.attr('placeholder',my_user.name);
	input_node.val("");
}

function add_user(user) {
	if (my_user_id == user.id) {
		my_user = user;
	}
	if (user.id in userlist) {
		var node = $("#"+user.id);
		if (user.id == my_user_id) {
			node.find('input').attr('placeholder', user.name);
		} else {
			node.text(user.name);
		}
	} else {	
		if (user.id == my_user_id) {
			var node = "<div class='btn' style='text-align:left;' id='" + user.id + "'><input type='text' placeholder='"+ user.name + "'></div>";
			$("#userlist").prepend(node);
			var input_node = $("#userlist").find("input");
			input_node.on('blur', function() {
				update_username(this.value); //update username when field loses focus
			});
			input_node.onkeypress = function(e) {
				if (!e) e = window.event;
					keyCode = e.keyCode || e.which;
					if (keyCode == '13') { //update username when enter is pressed
						update_username(this.value);
					}
			}

		} else { 
			var node = "<button class='btn' style='text-align:left;' data-toggle='tooltip' title='Click to toggle this user&#39;s permission.' id='" + user.id + "'>" + user.name + "</button>";
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
	if (user.id == my_user_id) {
		update_my_user();
	}
	$("#user_count").text(Object.keys(userlist).length.toString());
}

//function should be called when anything about you as a user changes, it will update the interface
//accordingly
function update_my_user() {
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
		for (var i in history) {
			if (history[i] && history[i].type == 'note') {
				$('textarea', history[i].container.menu).prop('readonly', true);
				$('button', history[i].container.menu).hide();
			}
		}
	} else {
		$('.left_column').show();
		for (var i in history) {
			if (history[i] && history[i].type == 'note') {
				$('textarea', history[i].container.menu).prop('readonly', false);
				$('button', history[i].container.menu).show();
			}
		}
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

function initialize_color_picker(slider_id, variable_name) {
	window[variable_name] = parseInt('0x'+$('select[id="'+ slider_id + '"]').val().substring(1));
	$('select[id="'+ slider_id + '"]').simplecolorpicker().on('change', function() {
		window[variable_name] = parseInt('0x'+$('select[id="'+ slider_id + '"]').val().substring(1));
	});
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
	var cleared_entities = [];
	for (var key in history) {
		if (history.hasOwnProperty(key) && (history[key].type == type || !type) && (history[key].type != 'background')) {
			var entity = history[key];
			remove(key);
			cleared_entities.push(entity)
			socket.emit('remove', room, key);
		}
	}
	undo_list.push(["remove", cleared_entities]);
}

function undo() {
	var action = undo_list.pop();
	if (action) {
		if (action[0] == "add") {
			for (var i in action[1]) {
				if (action[1][i].uid) {
					remove(action[1][i].uid);
					delete action[1][i].container;
					socket.emit('remove', room, action[1][i].uid);
				}
			}
			redo_list.push(action);
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var uid = action[1][i][1].uid;
				if (history[uid]) { //still exists
					action[1][i][0][0] = history[uid].x;
					action[1][i][0][1] = history[uid].y;
					drag_entity(history[uid], x, y);
					renderer.render(stage);
					socket.emit('drag', room, uid, x, y);
				}
			}
			redo_list.push(action);
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				delete entity.container;
				socket.emit('create_entity', room, entity);
				create_entity(entity);
			}
			redo_list.push(action);
		} else if (action[0] == "select") {
			var new_selected_entities = [];
			for (var i in action[2]) {
				var entity = action[2][i];
				if (history.hasOwnProperty(entity.uid)) {
					new_selected_entities.push(entity);
				}
			}
			deselect_all();
			selected_entities = new_selected_entities;
			select_entities();
			redo_list.push(action);
			renderer.render(stage);
		}
	}
}

function redo() {
	var action = redo_list.pop();
	if (action) {
		if (action[0] == "add") {
			for (var i in action[1]) {
				if (action[1][i].uid) {
					socket.emit('create_entity', room, action[1][i]);
					create_entity(action[1][i]);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var uid = action[1][i][1].uid;
				if (history[uid]) { //still exists
					action[1][i][0][0] = history[uid].x;
					action[1][i][0][1] = history[uid].y;
					drag_entity(history[uid], x, y);
					renderer.render(stage);
					socket.emit('drag', room, uid, x, y);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				if (history.hasOwnProperty(entity.uid)) {
					remove(entity.uid);
					delete entity.container;
					socket.emit('remove', room, entity.uid);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "select") {
			var new_selected_entities = [];
			for (var i in action[1]) {
				var entity = action[1][i];
				if (history.hasOwnProperty(entity.uid)) {
					new_selected_entities.push(entity);
				}
			}
			
			deselect_all();
			selected_entities = new_selected_entities;
			select_entities();
			undo_list.push(action);
			renderer.render(stage);
		}
	}	
}

function clear_selected() {
	var clone = selected_entities.slice(0);
	var cleared_entities = [];
	for (var i in clone) {
		var entity = clone[i];
		remove(clone[i].uid);
		cleared_entities.push(entity)
		socket.emit('remove', room, entity.uid);
	}
	selected_entities = [];
	undo_list.push(["remove", cleared_entities]);
}

function drag_entity(entity, x, y) {
	entity.container.x += x_abs(x-entity.x);
	entity.container.y += y_abs(y-entity.y);
	entity.x = x;
	entity.y = y;
	if (entity.type == 'note') {
		align_note_text(entity);
	}
	renderer.render(stage);	
}

//connect socket.io socket
loader.once('complete', function () {
	$(document).ready(function() {
		//sorts maps alphabetically, can't presort cause it depends on language
		var options = $("#map_select option").sort(function(a,b){ 
			return a.innerHTML > b.innerHTML ? 1 : -1; 
		});
		$("#map_select").empty();
		$("#map_select").append(options.clone());
		$("#map_select").focus();
		$("#map_select").val("");
	
		$('#draw_context').hide();
		$('#draw_context').hide();
		$('#icon_context').hide();
		$('#remove_context').hide();
		$('#text_context').hide();
		$('#line_context').hide();
		$('#rectangle_context').hide();
		$('#circle_context').hide();
		$('#polygon_context').hide();
		$('#curve_context').hide();
		$('#area_context').hide();
		$('#track_context').hide();
		$("#save_as").hide();
		$("#save").hide();
		$('#ping').addClass('active');	
		var first_icon = $("#icon_context").find("button:first");
		first_icon.addClass('selected');
		selected_icon = first_icon.attr("id");

		//color selections
		initialize_color_picker("curve_colorpicker", "curve_color");
		initialize_color_picker("icon_colorpicker", "icon_color");
		initialize_color_picker("draw_colorpicker", "draw_color");
		initialize_color_picker("ping_colorpicker", "ping_color");
		initialize_color_picker("track_colorpicker", "track_color");
		initialize_color_picker("line_colorpicker", "line_color");
		initialize_color_picker("text_colorpicker", "text_color");
		initialize_color_picker("rectangle_outline_colorpicker", "rectangle_outline_color");
		initialize_color_picker("rectangle_fill_colorpicker", "rectangle_fill_color");
		initialize_color_picker("circle_outline_colorpicker", "circle_outline_color");
		initialize_color_picker("circle_fill_colorpicker", "circle_fill_color");
		initialize_color_picker("polygon_outline_colorpicker", "polygon_outline_color");
		initialize_color_picker("polygon_fill_colorpicker", "polygon_fill_color");
		initialize_color_picker("area_outline_colorpicker", "area_outline_color");
		initialize_color_picker("area_fill_colorpicker", "area_fill_color");
		
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
		initialize_slider("area_outline_thickness", "area_outline_thickness_text", "area_outline_thickness");
		initialize_slider("area_outline_opacity", "area_outline_opacity_text", "area_outline_opacity");
		initialize_slider("area_fill_opacity", "area_fill_opacity_text", "area_fill_opacity");
		initialize_slider("line_thickness", "line_thickness_text", "line_thickness");
		initialize_slider("draw_thickness", "draw_thickness_text", "draw_thickness");
		initialize_slider("curve_thickness", "curve_thickness_text", "curve_thickness");
		initialize_slider("font_size", "font_size_text", "font_size");
		initialize_slider("label_font_size", "label_font_size_text", "label_font_size");
		initialize_slider("icon_size", "icon_size_text", "icon_size");

		$('[data-toggle="popover"]').popover({
			container: 'body',
			html: 'true',
			template: '<div class="popover popover-medium"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
			content: function() {
				return $('#popover-content');
			}
		});
		
		room = location.search.split('room=')[1].split("&")[0];
		socket.emit('join_room', room, game);
		
		$(document).on('click', '#store_tactic', function(){
			var name = $(document).find('#tactic_name')[0].value;
			if (name == "") {
				alert("Empty name, tactic not stored");
			} else {
				var tactic_name = name;
				socket.emit("store", room, name);
				$("#save").show();
				//$('#store_tactic_popover').popover('hide');
				$('#store_tactic_popover').popover('destroy');
				$('#store_tactic_popover').popover('destroy');
				alert("Tactic stored as: " + name);
			}
		});	

		$('#save').click(function() { 
			if (tactic_name && tactic_name != "") {
				socket.emit("store", room, tactic_name);
			}
		});

		$('#link').click(function() { 
			var copySupported = document.queryCommandSupported('copy');
			var textArea = document.createElement("textarea");
			var link_text = "http://" + location.host + location.pathname+"?room="+room;
			textArea.value = link_text;
			document.body.appendChild(textArea);
			//textArea.select();
			window.prompt("Copy to clipboard and share with friends:", link_text);
			document.body.removeChild(textArea);
		});
		
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
			var data;
			if (!is_safari()) {
				data = renderer.view.toDataURL("image/jpeg", 0.9);
			} else {
				var new_renderer = new PIXI.CanvasRenderer(size, size,{backgroundColor : 0xBBBBBB});
				new_renderer.render(stage);			
				data = new_renderer.view.toDataURL("image/jpeg", 0.9);
			}
			
			if (is_ie()) {
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
				undo();
				return;
			} else if ( $(this).attr('id') == "redo") {
				redo();
				return;
			} else if ( $(this).attr('id') == "cut") {
				cut();
				return;
			} else if ( $(this).attr('id') == "copy") {
				copy();
				return;
			} else if ( $(this).attr('id') == "paste") {
				paste();
				return;
			}
			
			//dirty trick, if people are still holding shift when changing context, pretend they released it for a sec
			if (shifted && objectContainer.mouseup) { 
				shifted = false;
				objectContainer.mouseup(renderer.plugins.interaction.eventData);
				shifted = true;
			}
			
			$('#contexts').find("button").removeClass('active');
			$(this).addClass('active');			
			var new_context = $(this).attr('id')+"_context";
			if (active_context == new_context) { return; } 	
			if (new_context != "remove_context") {
				deselect_all();
				renderer.render(stage);
			}
			$('#'+active_context).hide();
			$('#'+new_context).show();
			if (my_tracker) {
				stop_tracking();
			} 
			if (new_context == "track_context") {
				start_tracking({x:-10,y:-10});
			}
			active_context = new_context;

		});	

		$('#full_line').addClass('active');	
		$('#line_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#curve_no_arrow').addClass('active');
		$('#curve_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});	
		
		$('#draw_no_arrow').addClass('active');
		$('#draw_type').on('click', 'button', function (e) {
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
			clear();
		});
		
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
		$('#clear_curve').click(function() {
			clear("curve");
		});
		$('#clear_rectangle').click(function() {
			clear("rectangle");
		});
		$('#clear_circle').click(function() {
			clear("circle");
		});
		$('#clear_polygon').click(function() {
			clear("polygon");
		});
		$('#clear_area').click(function() {
			clear("area");
		});
		$('#clear_selected').click(function() {
			clear_selected();
		});
		
		//tank icon select
		$('.tank_select').click(function() {
			$('.selected').removeClass('selected'); // removes the previous selected class
			$(this).addClass('selected'); // adds the class to the clicked image
			selected_icon = $(this).attr('id');
		});
		
		$(renderer.view).attr('style', 'z-index: 0; position: absolute;');
		$(".edit_window").append("<div id='render_frame' style='height:" + size_y + "px; width:" + size_x + "px;'></div>");
		$("#render_frame").append(renderer.view);
		
		
		var map_select_box = document.getElementById("map_select");
		map_select_box.onchange = function() {
			var path = map_select_box.options[map_select_box.selectedIndex].value;
			if (!background || background.path != path) {
				var uid = background ? background.uid : newUid();
				var new_background = {uid:uid, type:'background', path:path};
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
		drag_entity(history[uid], x, y);
	});

	socket.on('ping', function(x, y, color) {
		ping(x,y,color);
	});

	socket.on('chat', function(message) {
		chat(message);
	});

	
	socket.on('identify', function(user) {
		if (!my_user) {
			my_user = user;
		} else {
			my_user.identity = user.identity;
			my_user.name = user.name;
		}
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
	
	socket.on('track', function(tracker) {
		if (!trackers[tracker.uid]) {
			create_tracker(tracker);
		}
	});
	
	socket.on('track_move', function(uid, delta_x, delta_y) {
		move_tracker(uid, delta_x, delta_y)
	});

	socket.on('stop_track', function(uid) {
		remove_tracker(uid)
	});
	
});

setTimeout(function(){ renderer.render(stage); }, 1000);
