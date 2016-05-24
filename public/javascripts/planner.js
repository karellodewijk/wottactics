var servers = $("#socket_io_servers").attr("data-socket_io_servers").split(',')

var image_host;
function is_safari() {
	return navigator.vendor && navigator.vendor.indexOf('Apple') > -1;
}

var static_host = $("#static_host").attr("data-static_host");
if (is_safari()) {
	image_host = 'http://'+location.host+'/icons/'; //enable for local image hosting
} else {
	image_host = static_host + "/icons/";
}
var asset_host = static_host + "/";

var game = $('meta[name=game]').attr("content");

var loader = PIXI.loader;
var assets = [];
if (game == "wows") { //wows
	assets.push(image_host+"bb.png", image_host+"cv.png", image_host+"ca.png", image_host+"dd.png");
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "blitz") {
	assets.push(image_host+"light.png", image_host+"medium.png", image_host+"heavy.png", image_host+"td.png", image_host+"arty.png");	
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "aw") {
	assets.push(image_host+"aw_afv.png", image_host+"aw_lt.png", image_host+"aw_mbt.png", image_host+"aw_spg.png", image_host+"aw_td.png", image_host+"aw_grid.png");
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "lol") {
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "hots") {
	loader.add("hots_assets.png", asset_host + "hots_assets.png");
	loader.add("hots_assets.json",  asset_host +  "hots_assets.json");
} else {
	loader.add("wot_assets.png", asset_host + "wot_assets.png");
	loader.add("wot_assets.json",  asset_host +  "wot_assets.json");
}

for (var i in assets) {
	loader.add(assets[i], assets[i]);
}

loader.load(setup_assets);

var texture_atlas;
function setup_assets() {
	texture_atlas = {}
	for (var key in loader.resources) {
		if (key.slice(-4) == "json") {
			for (var key2 in loader.resources[key].data.tiles) {
				texture_atlas[key2] = loader.resources[key].data.tiles[key2]; 
			}
		}
	}
}

var room = location.search.split('room=')[1].split("&")[0];	
var nowebgl = location.search.indexOf('nowebgl') != -1;	

function hashstring(str) {
	var sum = 0;
	for (i = 0; i < str.length; i++) {
		sum += str.charCodeAt(i);
	}
	return sum;
}

var server = servers[hashstring(room) % servers.length];

console.log("connecting to server: ", server)

function parse_domain(domain) {
	var subDomain = domain.split('.');	
	if (subDomain.length > 2) {
		subDomain = subDomain.slice(1);
	}
	return '.' + subDomain.join('.')
}

var socket;
if (Modernizr.websockets) {
	socket = io.connect(server, {
		reconnectionDelay: 100,
		reconnectionDelayMax: 500,
		'reconnection limit' : 1000,
		'max reconnection attempts': Infinity,
		query: "connect_sid="+$("#sid").attr("data-sid")+"&host="+parse_domain(location.hostname)
	});	
} else {
	socket = io.connect(server, {
		transports: ['polling'],
		reconnectionDelay: 100,
		reconnectionDelayMax: 500,
		'reconnection limit' : 1000,
		'max reconnection attempts': Infinity,
		query: "connect_sid="+$("#sid").attr("data-sid")+"&host="+parse_domain(location.hostname)
	});	
}

//generates unique ids
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
function is_ie() {
	return navigator.userAgent.toLowerCase().indexOf('msie') > -1 || navigator.userAgent.toLowerCase().indexOf('trident') > -1;
}
function is_edge() {
	return navigator.userAgent.toLowerCase().indexOf('edge') > -1;
}

var last = function(array) {
	return array[array.length-1];
};

function random_darkish_color(){
    var r = (Math.round(Math.random()* 127)).toString(16);
    var g = (Math.round(Math.random()* 127)).toString(16);
    var b = (Math.round(Math.random()* 127)).toString(16);
    return '#' + r + g + b;
}

var ARROW_LOOKBACK = 3;
var MOUSE_DRAW_SMOOTHING = 0.5;
var LEFT_BAR_MIN_WIDTH = 350;
var RIGHT_BAR_MIN_WIDTH = 345;
var SINGLE_SIDE_BAR_MIN_WIDTH = 630;
var MIN_POLYGON_END_DISTANCE = 0.01; //in ratio to width of map
var MIN_POLYGON_END_DISTANCE_TOUCH = 0.025;
var MIN_TRACK_MOVE_DISTANCE_SQ = 0.01 * 0.01;
var ICON_SCALE = 0.025/20;
var NOTE_SCALE = 0.05;
var THICKNESS_SCALE = 0.0015;
var FONT_SCALE = 0.002;

var chat_color = random_darkish_color();
var room_data;
var active_slide = 0;
var active_context = 'ping_context';
var active_menu = 'ping_context';
var userlist = {};
var selected_icon;
var selected_icon_no_color = false;
var icon_extra_scale = 1;
var icon_color = 0xff0000;
var draw_color = 0xff0000;
var ping_color = 0xff0000;
var track_color = 0xff0000;
var line_color = 0xff0000;
var curve_color = 0xff0000;
var text_color = 0xffffff;
var background_text_color = 0x000000;
var rectangle_outline_color = 0xff0000;
var rectangle_fill_color = 0xff0000;
var circle_outline_color = 0xff0000;
var circle_fill_color = 0xff0000;
var polygon_outline_color = 0xff0000;
var polygon_fill_color = 0xff0000;
var area_outline_color = 0xff0000;
var area_fill_color = 0xff0000;
var background;
var draw_thickness;
var curve_thickness;
var line_thickness;
var icon_size;
var ping_size;
var rectangle_outline_thickness;
var rectangle_outline_transparancy;
var rectangle_fill_transparancy;
var circle_outline_thickness;
var circle_outline_transparancy;
var circle_fill_transparancy;
var polygon_outline_thickness;
var polygon_outline_transparancy;
var polygon_fill_transparancy;
var area_outline_thickness;
var area_outline_transparancy;
var area_fill_transparancy;
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
var icon_brightness;
var trackers = {};
var my_tracker;
var last_track_position;
var tracker_width = 0.05;
var tracker_height = 0.05;
var my_user_id;
var clipboard = [];
var slide_name;
var assets_loaded = false;
var select_alpha = 0.6;
var resources_loading = 0;
var circle_draw_style = "edge";
var drag_in_progress = false;
var current_text_element;
var last_mouse_location;
var ping_texture;
var hovering_over;
var just_activated;


var mouse_down_interrupted;
document.body.onmouseup = function() {
  mouse_down_interrupted = true;
}

//keyboard shortcuts
var shifted; //need to know if the shift key is pressed
$(document).on('keyup keydown', function(e) {
	if (!can_edit()) {
		return;
	}
	shifted = e.shiftKey;
	if (document.activeElement.localName != "input") {
		if (e.type == "keydown") {
			if (e.ctrlKey) {
				if (e.keyCode==90) {
					undo();
				} else if (e.keyCode==89) {
					redo();
				} else if (e.keyCode==65) {
					select_all();
					e.preventDefault();
				} else if (e.keyCode==83) {
					if (my_user.logged_in && tactic_name && tactic_name != "" && socket) {
						socket.emit("store", room, tactic_name);
					}
				} else if (e.keyCode==67) {
					copy();
				} else if (e.keyCode==88) {
					cut();
				} else if (e.keyCode==86) {
					paste();
				}
			}
		}
		if (e.type == "keyup") {
			if (e.keyCode==46) {
				clear_selected();
			} else if (e.keyCode==16) {
				if (active_context == 'line_context' && new_drawing) {
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
		selected_entities[i].container = null;
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
	var mouse_x = from_x_local(mouse_location.x);
	var mouse_y = from_y_local(mouse_location.y);
	if (Math.abs(mouse_x) > 1 || Math.abs(mouse_y) > 1) {
		mouse_x = mouse_y = 0;
	}	
	var top = 1;
	var left = 1;
	for (var i in clipboard) {				
		top = Math.min(top, clipboard[i].y);
		left = Math.min(left, clipboard[i].x);
	}

	//selection filter
	var select_filter = new PIXI.filters.ColorMatrixFilter();
	select_filter.matrix = [
		1, 0, 0, 0, 0,
		0, 1, 0, 0, 0,
		0, 0, 1, 0, 0,
		0, 0, 0, 0.5, 0
	]
	
	var new_entities = [];
	for (var i in clipboard) {
		var entity = JSON.parse(JSON.stringify(clipboard[i]))
		entity.uid = newUid();
		entity.x = mouse_x + (entity.x - left);
		entity.y = mouse_y + (entity.y - top);
		new_entities.push(entity);		
		if (entity.type == "icon") {
			create_icon(entity, function(entity) {
				snap_and_emit_entity(entity);
				entity.container.alpha = select_alpha;
				render_scene();
			});
		} else {
			create_entity(entity);
			snap_and_emit_entity(entity);
			entity.container.alpha = select_alpha;
			render_scene();
		}
		selected_entities.push(entity);
	}
	
	undo_list.push(["add", new_entities]);	

}

//start pixi renderer
var border = 30;
var size = Math.min(window.innerHeight, window.innerWidth) - border;
var size_x = size;
var size_y = size;

var renderer;
if (Modernizr.webgl && !nowebgl) {
	renderer = PIXI.autoDetectRenderer(size, size, {backgroundColor : 0xBBBBBB});
} else {
	renderer = new PIXI.CanvasRenderer(size, size, {backgroundColor : 0xBBBBBB});
}

var useWebGL = renderer instanceof PIXI.WebGLRenderer;

renderer.view.addEventListener("wheel", function(e) {
	zoom(0.1, e.deltaY < 0, e);
	e.preventDefault();
});

function zoom(amount, isZoomIn, e) {
	direction = isZoomIn ? 1 : -1;
	var factor = (1 + amount * direction);
	
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var old_scale = objectContainer.scale.x;
	objectContainer.scale.x *= factor;
	objectContainer.scale.y *= factor;
	var new_scale = objectContainer.scale.x;

	//pan to cursor
	var scalechange = new_scale - old_scale;	
	objectContainer.x -= x_abs(from_x_local(mouse_location.x)) * scalechange;
	objectContainer.y -= y_abs(from_y_local(mouse_location.y)) * scalechange;

	correct();
}

function correct() {
	//keep in frame
	objectContainer.x = Math.min(0, objectContainer.x);
	objectContainer.y = Math.min(0, objectContainer.y);
	
	var visible_width = (background_sprite.width * objectContainer.scale.x) + objectContainer.x;
	if (visible_width < draw_canvas.width) {
		objectContainer.x = Math.min(0, draw_canvas.width - (background_sprite.width * objectContainer.scale.x));
		if (objectContainer.x == 0) {
			objectContainer.scale.x = draw_canvas.width / background_sprite.width;		
		}
	}
	
	var visible_height = (background_sprite.height * objectContainer.scale.y) + objectContainer.y;
	if (visible_height < draw_canvas.height) {
		objectContainer.y = Math.min(0, draw_canvas.height - (background_sprite.height * objectContainer.scale.y));
		if (objectContainer.y == 0) {
			objectContainer.scale.y = draw_canvas.height / background_sprite.height;		
		}
	}
	
	//keep aspect ratio
	if (objectContainer.scale.y != objectContainer.scale.x) {
		objectContainer.scale.x = Math.max(objectContainer.scale.x, objectContainer.scale.y)
		objectContainer.scale.y = Math.max(objectContainer.scale.x, objectContainer.scale.y)
	}

	if (room_data) {
		for (var i in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[i]) {
				if (room_data.slides[active_slide].entities[i].type == 'note') {
					align_note_text(room_data.slides[active_slide].entities[i]);
				} 
			}
		}
	}
	
	if (my_tracker) {
		on_track_move();
	}
	
	render_scene();
}

var last_pan_loc;
var panning
var last_move_func, last_end_func;
$(renderer.view).mousedown(function(e) {
    if (e.which === 3 || e.which === 2) {
		last_pan_loc = [renderer.plugins.interaction.mouse.global.x, renderer.plugins.interaction.mouse.global.y];
        setup_mouse_events(on_pan);
		e.preventDefault();
    }
});

renderer.view.addEventListener('contextmenu', function(e) {
    setup_mouse_events(undefined);
	e.preventDefault();
});


$(renderer.view).mouseup(function(e) {
    if (e.which === 3 || e.which === 2) {
        setup_mouse_events(undefined);
		e.preventDefault();
    }
});

var pan_state = {}
function on_pan(e) {
	limit_rate(15, pan_state, function() {
		var mouse_location = renderer.plugins.interaction.mouse.global;
		var diff_x = mouse_location.x - last_pan_loc[0];
		var diff_y = mouse_location.y - last_pan_loc[1];
		last_pan_loc = [mouse_location.x, mouse_location.y];
		objectContainer.x += diff_x;
		objectContainer.y += diff_y;
		correct();
	});
}

// create the root of the scene graph
var stage = new PIXI.Container();
var objectContainer = new PIXI.Container();
stage.addChild(objectContainer);

//initialize background
var background_sprite = new PIXI.Sprite();
background_sprite.height = renderer.height;
background_sprite.width = renderer.width;
objectContainer.addChild(background_sprite);

//initialize grid layer
var grid_layer;
if (game == "aw") {
	grid_layer = new PIXI.Sprite.fromImage(image_host + "aw_grid.png");
} else {
	grid_layer = new PIXI.Sprite.fromImage(image_host + "grid.png");
}
grid_layer.height = renderer.height;
grid_layer.width = renderer.width;
objectContainer.addChild(grid_layer);


var draw_canvas = document.createElement("canvas");
$(draw_canvas).attr('style', 'position:absolute; z-index:'+ 2 + '; pointer-events:none');
draw_canvas.width = renderer.view.width;
draw_canvas.height = renderer.view.height;
draw_context = draw_canvas.getContext("2d");

var temp_draw_canvas = document.createElement("canvas");
$(temp_draw_canvas).attr('style', 'position:absolute; z-index:'+ 3 + '; pointer-events:none');
temp_draw_canvas.width = renderer.view.width;
temp_draw_canvas.height = renderer.view.height;
temp_draw_context = temp_draw_canvas.getContext("2d");

//resize the render window
function resize_renderer(new_size_x, new_size_y) {
	var last_size_x = size_x;
	var last_size_y = size_y;
	size_x = new_size_y;
	size_y = new_size_y;	
	objectContainer.scale.x *= size_y/last_size_y;
	objectContainer.scale.y *= size_y/last_size_y;
	
	draw_canvas.width = new_size_x;
	draw_canvas.height = new_size_y;
	temp_draw_canvas.width = new_size_x;
	temp_draw_canvas.height = new_size_y;
	
	if (background_sprite.texture) {
		background_sprite.width = new_size_x / objectContainer.scale.x;
		background_sprite.height = new_size_y / objectContainer.scale.y;
	}
	
	renderer.resize(new_size_x, new_size_y);
	$("#render_frame").attr('style', 'height:' + new_size_y + 'px; width:' + new_size_x + 'px;');
	$("#edit_window").attr('style', 'height:' + new_size_y + 'px; width:' + new_size_x + 'px;');
	
	zoom(0,true);
	render_scene();
};

window.onresize = function() {
	var ratio = 1;
	if (background_sprite.texture) {
		ratio = background_sprite.texture.width /  background_sprite.texture.height;
	}
	var iface_width = 0;
	if ($("#single_side_bar").length) {
		iface_width = SINGLE_SIDE_BAR_MIN_WIDTH;
	} else {
		iface_width = LEFT_BAR_MIN_WIDTH + RIGHT_BAR_MIN_WIDTH;
	}
		
	if (iface_width < (window.innerWidth / 1.75)) {
		var size_y;
		if ($('#left_side_bar').length) {
			$('#left_side_bar').detach().prependTo($("body"));
			size_y = window.innerHeight - 2;
		} else {
			size_y = window.innerHeight - 10;
		}
		var size_x = size_y * ratio;
		
		if (size_x > window.innerWidth - iface_width) {
			size_x = window.innerWidth - iface_width;			
			size_y = size_x / ratio;
		}
		resize_renderer(size_x, size_y);
	} else {
		if ($('#left_side_bar').length) {
			$('#left_side_bar').detach().appendTo($("body"));
			$('#left_side_bar').css("clear", "both");
			iface_width = RIGHT_BAR_MIN_WIDTH;
		}
		
		var size_x = window.innerWidth - iface_width;
		var size_y = size_x / ratio;
			
		if (size_x < RIGHT_BAR_MIN_WIDTH) {
			var size_x = window.innerWidth
			var size_y = size_x / ratio;
		}
		if (size_y > window.innerHeight) {
			size_y = window.innerHeight;
			size_x = size_y * ratio;
		}
		
		resize_renderer(size_x, size_y);
	}
};

//Absolute coordinates are coordinates pixi within objectContainer, the main screen graph
//Relative coordinates are coordinates with the left upper corner of the backfround equal to [0,0], the height of the background exactly 1 and the width has the same scale as the hight
//local coordinates are coordinates in px, with [0,0] the upper left corner of the renderer.view dom element. 

//absolute -> relative
function x_rel(x) {
	return x/(background_sprite.width);
}

//relative -> absolute
function x_abs(x) {
	return x*(background_sprite.width);
}

//absolute -> relative
function y_rel(y) {
	return y/(background_sprite.height);
}

//relative -> absolute
function y_abs(y) {
	return y*(background_sprite.height);
}

//relative -> local
function to_x_local(x) {
	return objectContainer.x + (x * background_sprite.width) * objectContainer.scale.x;
}

//local -> relative
function from_x_local(x) {
	return (x - objectContainer.x) / objectContainer.scale.x / background_sprite.width;
}

//relative -> local
function to_y_local(y) {
	return objectContainer.y +(y * background_sprite.height) * objectContainer.scale.y;
}

//local -> relaive
function from_y_local(y) {
	return (y - objectContainer.y) / objectContainer.scale.y / background_sprite.height;
}

function mouse_x_abs(x) {
	return x;
}

function mouse_y_abs(y) {
	return y;
}

//translates mouse position from e.data.getLocalPosition(background_sprite) to a relative coordinate
//TODO: consider using renderer.plugins.interaction.mouse.global and from_x_local, from_y_local instead
function mouse_x_rel(x) {
	return x/(background_sprite.width / background_sprite.scale.x);
}

//translates mouse position from e.data.getLocalPosition(background_sprite) to a relative coordinate
function mouse_y_rel(y) {
	return y/(background_sprite.height / background_sprite.scale.y);
}

function set_background(new_background, cb) {
	if (new_background.path != "") {
		resources_loading++;

		var texture = PIXI.Texture.fromImage(new_background.path);

		var on_loaded = function() {
						
			background = new_background;
			history[background.uid] = background;
			background_sprite.texture = texture;	
			window.onresize();				
			room_data.slides[active_slide].entities[new_background.uid] = new_background;
			resources_loading--;
			
			if ($("#map_select option[value='" + background.path + "']").length > 0) {
				$("#map_select").val(background.path).change();	
				$("#use_wotbase").prop("checked", false);
				$('#map_select_container').show();
				$('#wotbase_map_select_container').hide();
			} else if ($("#map_select_wotbase option[value='" + background.path + "']").length > 0) {
				$("#map_select_wotbase").val(background.path).change();
				$("#use_wotbase").prop("checked", true);
				$('#map_select_container').hide();
				$('#wotbase_map_select_container').show();
			} else {
				add_custom_map(background.path)
				$("#map_select").selectpicker('refresh');
				$('#wotbase_map_select_container').hide();
				$('#map_select_container').show();
			}
		
			if (background.size_x && background.size_y && background.size_x > 0 && background.size_y > 0) {
				$("#map_size").text("("+background.size_x+" x "+background.size_y+")");
			} else {
				$("#map_size").text("");
			}
			render_scene();
			if (cb)	cb(true);
		}
		
		if (!texture.baseTexture.hasLoaded) {
			texture.baseTexture.on('loaded', function() {
				on_loaded();
			});
			texture.baseTexture.on('error', function(e) {
				alert("Image exists, but the host does not allow embedding. Try uploading your map to a service such as http://imgur.com.");
				resources_loading--;
				if (cb)	cb(false);
			});
			
		} else {
			on_loaded();
		}
		
	} else {
		background = new_background;
		history[background.uid] = background;
		
		var empty_backround = new PIXI.Graphics();
		empty_backround.beginFill(0xFFFFFF, 1);
		empty_backround.moveTo(0, 0);
		empty_backround.lineTo(renderer.width, 0);
		empty_backround.lineTo(renderer.width, renderer.height);
		empty_backround.lineTo(0, renderer.height);
		empty_backround.lineTo(0, 0);
		empty_backround.endFill();
		background_sprite.texture = empty_backround.generateTexture();
		$("#map_size").text("");

		window.onresize();
		render_scene();	
		if (cb)	cb(true);

	}	
}



var context_before_drag;
var move_selected;
var drag_timeout;
var last_drag_position, last_drag_update;
function on_drag_start(e) {
	drag_in_progress = true;
	if (drag_timeout) {
		clearTimeout(drag_timeout);
	}
	_this = this;
	var mouse_location = e.data.getLocalPosition(background_sprite);
	last_mouse_location = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
	mouse_down_interrupted = false;
	var delay = 0;
	if (active_context == "ping_context" && _this.entity.type != 'note') {
		delay = 300;
	} else if (active_context == "ruler_context") {
		return;
	} else {
		if (active_context != 'drag_context') {
			context_before_drag = active_context;
		}
		active_context = "drag_context";
	}
	drag_timeout = setTimeout(function() {
		var mouse_location = renderer.plugins.interaction.mouse.global;
		last_drag_update = Date.now();
		last_drag_position = [from_x_local(mouse_location.x), from_y_local(mouse_location.y)];
				
		if (mouse_down_interrupted) {
			drag_in_progress = false;
			deselect_all();
			return;
		}
		if (is_room_locked && !my_user.role) {
			if (_this.entity.type == 'note') {
				_this.mouseup = toggle_note;
				_this.touchend = toggle_note;
				_this.mouseupoutside = toggle_note;
				_this.touchendoutside = toggle_note;
			}
			return;
		}

		if (active_context != 'drag_context') {
			context_before_drag = active_context;
		}
		active_context = "drag_context";
		
		render_scene();
		
		_this.mouseup = on_drag_end;
		_this.touchend = on_drag_end;
		_this.mouseupoutside = on_drag_end;
		_this.touchendoutside = on_drag_end;
		_this.mousemove = on_drag_move;
		_this.touchmove = on_drag_move;

		move_selected = false;
		for (var i in selected_entities) {
			if (selected_entities[i].uid == _this.entity.uid) {
				move_selected = true;
				break;
			}
		}
		
		if (!move_selected) {
			deselect_all();
			selected_entities = [_this.entity];
			select_entities();
		}
		
		for (var i in selected_entities) {
			selected_entities[i].origin_x = selected_entities[i].x;
			selected_entities[i].origin_y = selected_entities[i].y;			
			objectContainer.removeChild(selected_entities[i].container);
			objectContainer.addChild(selected_entities[i].container);
		}
		_this.origin_x = _this.entity.x;
		_this.origin_y = _this.entity.y;
		
		drag_in_progress = false;
	
	}, delay);
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

//move an entity but keep it within the bounds
function move_entity(entity, delta_x, delta_y) {
	var new_x = entity.container.x + x_abs(delta_x);
	var new_y = entity.container.y + y_abs(delta_y);
	
	//I don't remember why I restrict moving icons, etc like this.
	//new_x = Math.max(new_x, 0);
	//new_y = Math.max(new_y, 0);
	//var new_x, new_y;
	//if (entity.type == 'icon') {
		//in case of icons, do not count the label as a hit box
		//new_x = Math.min(new_x, x_abs(1 - x_rel(entity.container.getChildAt(0).width)));
		//new_y = Math.min(new_y, y_abs(1 - x_rel(entity.container.getChildAt(0).height)));		
	//} else {	
		//new_x = Math.min(new_x, x_abs(1 - x_rel(entity.container.width)));
		//new_y = Math.min(new_y, y_abs(1 - y_rel(entity.container.height)));
	//}
		
	//move by relative positioning cause x on the container is the left upper corner of the bounding box
	//and for the entity this is mostly the start point
	
	drag_entity(entity, entity.x + x_rel(new_x - entity.container.x), entity.y + y_rel(new_y - entity.container.y));
}

//limits the amount of time f can be called to once every interval
function limit_rate(interval, state, f) {
	clearTimeout(state.timeout);
	if (!state.last_trigger) {
		state.last_trigger = Date.now();
	}
	var time_diff = (Date.now() - state.last_trigger);
	if (time_diff > interval) {
		f();
		state.last_trigger = Date.now();
	} else {
		state.timeout = setTimeout(function() {
			f();
		}, interval + 5)		
	}
}

var drag_state = {};
function on_drag_move(e) {
	_this = this;	
	limit_rate(15, drag_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var mouse_new = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
		//move by deltamouse	
		var delta_x = mouse_new[0] - last_mouse_location[0];
		var delta_y = mouse_new[1] - last_mouse_location[1];
		if (move_selected) {
			for (var i in selected_entities) {
				move_entity(selected_entities[i], delta_x, delta_y);
			}
		} else {
			move_entity(_this.entity, delta_x, delta_y);
		}
		last_mouse_location = mouse_new;
		render_scene();		
	});
}

function on_drag_end(e) {
	limit_rate(15, drag_state, function() {});
	if (this.origin_x == this.entity.x && this.origin_y == this.entity.y) {	
		if (context_before_drag == 'remove_context') {
			remove(this.entity.uid);
			undo_list.push(["remove", [this.entity]]);
			socket.emit('remove', room, this.entity.uid, active_slide);
		} else if (this.entity.type == 'note') {
			toggle_note.call(this, e);
			deselect_all();
		}
	} else {
		var origin_entity_map = [];
		for (var i in selected_entities) {
			origin = [selected_entities[i].origin_x, selected_entities[i].origin_y];
			origin_entity_map.push([origin, selected_entities[i]]);
			delete selected_entities[i].origin_x;
			delete selected_entities[i].origin_y;
			socket.emit("drag", room, selected_entities[i].uid, active_slide, selected_entities[i].x, selected_entities[i].y);
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
	
	render_scene();
}

function remove(uid, keep_entity) {
	if (room_data.slides[active_slide].entities[uid] && room_data.slides[active_slide].entities[uid].container) {
		if (room_data.slides[active_slide].entities[uid].type == "note") {
			room_data.slides[active_slide].entities[uid].container.menu.remove();
		}
		objectContainer.removeChild(room_data.slides[active_slide].entities[uid].container);
		delete room_data.slides[active_slide].entities[uid].container;
		
		if (room_data.slides[active_slide].entities[uid] && room_data.slides[active_slide].entities[uid].type == "icon") {
			try {
				var counter = $('button[id*="'+room_data.slides[active_slide].entities[uid].tank+'"]').find("span");
				counter.text((parseInt(counter.text())-1).toString());		
				counter = $("#icon_context").find("span").first();
				counter.text((parseInt(counter.text())-1).toString());
			} catch (e) {}
		}
	}
	

	
	//if an item is removed, remove them from selected_entities
	var i = selected_entities.length
	while (i--) {
		if (selected_entities[i].uid == uid) {
			selected_entities.splice(i, 1);
		}
	}
	
	if (!keep_entity) {
		delete room_data.slides[active_slide].entities[uid];	
	}
	render_scene();
}

function move_tracker(uid, delta_x, delta_y) {
	var step_x = delta_x * 0.1;
	var step_y = delta_y * 0.1;
	var count = 10;
	var timer = setInterval(function() {
		if (trackers[uid]) {
			trackers[uid].x += step_x;
			trackers[uid].y += step_y;
			trackers[uid].container.x += x_abs(step_x);
			trackers[uid].container.y += y_abs(step_y);
			render_scene();
		}
		count--;
		if (count == 0) {
			clearInterval(timer)
		}
	}, 15);
}

var render_state = {}
function render_scene() {
	limit_rate(15, render_state, function() {
		renderer.render(stage);
	});
}

function ping(x, y, color, size) {
	var sprite = new PIXI.Sprite(ping_texture);

	sprite.tint = color;
	sprite.anchor.set(0.5);
	sprite.height = y_abs(0.01) * (size/10);
	sprite.width = y_abs(0.01) * (size/10);
		
	sprite.x = x_abs(x);
	sprite.y = y_abs(y);

	objectContainer.addChild(sprite);
	render_scene();
	
	var steps = 25;
	var step_size = sprite.height/5;
	var loop = setInterval(function() {
		sprite.height += step_size;
		sprite.width += step_size;
		sprite.alpha -= 0.02;
		render_scene();
		
		steps--;
		if (steps <= 0) {
			clearInterval(loop)
			objectContainer.removeChild(sprite);
			render_scene();			
		}
	}, 20);
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
	if (entity.container) {
		var x = objectContainer.x + x_abs(entity.x) * objectContainer.scale.x + x_abs(0.035) * objectContainer.scale.x;
		var y = objectContainer.y + y_abs(entity.y) * objectContainer.scale.y;
		if (entity.container.is_open) {
			entity.container.menu.attr('style', 'top:' + y +'px; left:' + x + 'px; display: block;');
		} else {
			entity.container.menu.attr('style', 'top:' + y +'px; left:' + x + 'px; display: block; visibility: hidden;');
		}
	}
}

//borrowed from http://www.dbp-consulting.com/tutorials/canvas/CanvasArrow.html
var drawHead=function(ctx,x0,y0,x1,y1,x2,y2,style)
{
  'use strict';
  if(typeof(x0)=='string') x0=parseInt(x0);
  if(typeof(y0)=='string') y0=parseInt(y0);
  if(typeof(x1)=='string') x1=parseInt(x1);
  if(typeof(y1)=='string') y1=parseInt(y1);
  if(typeof(x2)=='string') x2=parseInt(x2);
  if(typeof(y2)=='string') y2=parseInt(y2);
  var radius=3;
  var twoPI=2*Math.PI;

  // all cases do this.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0,y0);
  ctx.lineTo(x1,y1);
  ctx.lineTo(x2,y2);
  switch(style){
    case 0:
      // curved filled, add the bottom as an arcTo curve and fill
      var backdist=Math.sqrt(((x2-x0)*(x2-x0))+((y2-y0)*(y2-y0)));
      ctx.arcTo(x1,y1,x0,y0,.55*backdist);
      ctx.fill();
      break;
    case 1:
      // straight filled, add the bottom as a line and fill.
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.lineTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.lineTo(x0,y0);
      ctx.fill();
      break;
    case 2:
      // unfilled head, just stroke.
      ctx.stroke();
      break;
    case 3:
      //filled head, add the bottom as a quadraticCurveTo curve and fill
      var cpx=(x0+x1+x2)/3;
      var cpy=(y0+y1+y2)/3;
      ctx.quadraticCurveTo(cpx,cpy,x0,y0);
      ctx.fill();
      break;
    case 4:
      //filled head, add the bottom as a bezierCurveTo curve and fill
      var cp1x, cp1y, cp2x, cp2y,backdist;
      var shiftamt=5;
      if(x2==x0){
	// Avoid a divide by zero if x2==x0
	backdist=y2-y0;
	cp1x=(x1+x0)/2;
	cp2x=(x1+x0)/2;
	cp1y=y1+backdist/shiftamt;
	cp2y=y1-backdist/shiftamt;
      }else{
	backdist=Math.sqrt(((x2-x0)*(x2-x0))+((y2-y0)*(y2-y0)));
	var xback=(x0+x2)/2;
	var yback=(y0+y2)/2;
	var xmid=(xback+x1)/2;
	var ymid=(yback+y1)/2;

	var m=(y2-y0)/(x2-x0);
	var dx=(backdist/(2*Math.sqrt(m*m+1)))/shiftamt;
	var dy=m*dx;
	cp1x=xmid-dx;
	cp1y=ymid-dy;
	cp2x=xmid+dx;
	cp2y=ymid+dy;
      }

      ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,x0,y0);
      ctx.fill();
      break;
  }
  ctx.restore();
};
var drawArrow=function(ctx,x1,y1,x2,y2,style,which,angle,d) {
  'use strict';
  // Ceason pointed to a problem when x1 or y1 were a string, and concatenation
  // would happen instead of addition
  if(typeof(x1)=='string') x1=parseInt(x1);
  if(typeof(y1)=='string') y1=parseInt(y1);
  if(typeof(x2)=='string') x2=parseInt(x2);
  if(typeof(y2)=='string') y2=parseInt(y2);
  style=typeof(style)!='undefined'? style:3;
  which=typeof(which)!='undefined'? which:1; // end point gets arrow
  angle=typeof(angle)!='undefined'? angle:Math.PI/8;
  d    =typeof(d)    !='undefined'? d    :10;
  // default to using drawHead to draw the head, but if the style
  // argument is a function, use it instead
  var toDrawHead=typeof(style)!='function'?drawHead:style;

  // For ends with arrow we actually want to stop before we get to the arrow
  // so that wide lines won't put a flat end on the arrow.
  //
  var dist=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
  var ratio=(dist-d/3)/dist;
  var tox, toy,fromx,fromy;
  if(which&1){
    tox=Math.round(x1+(x2-x1)*ratio);
    toy=Math.round(y1+(y2-y1)*ratio);
  }else{
    tox=x2;
    toy=y2;
  }
  if(which&2){
    fromx=x1+(x2-x1)*(1-ratio);
    fromy=y1+(y2-y1)*(1-ratio);
  }else{
    fromx=x1;
    fromy=y1;
  }

  // Draw the shaft of the arrow
  // ctx.beginPath();
  // ctx.moveTo(fromx,fromy);
  // ctx.lineTo(tox,toy);
  // ctx.stroke();

  // calculate the angle of the line
  var lineangle=Math.atan2(y2-y1,x2-x1);
  // h is the line length of a side of the arrow head
  var h=Math.abs(d/Math.cos(angle));

  if(which&1){	// handle far end arrow head
    var angle1=lineangle+Math.PI+angle;
    var topx=x2+Math.cos(angle1)*h;
    var topy=y2+Math.sin(angle1)*h;
    var angle2=lineangle+Math.PI-angle;
    var botx=x2+Math.cos(angle2)*h;
    var boty=y2+Math.sin(angle2)*h;
    toDrawHead(ctx,topx,topy,x2,y2,botx,boty,style);
  }
  if(which&2){ // handle near end arrow head
    var angle1=lineangle+angle;
    var topx=x1+Math.cos(angle1)*h;
    var topy=y1+Math.sin(angle1)*h;
    var angle2=lineangle-angle;
    var botx=x1+Math.cos(angle2)*h;
    var boty=y1+Math.sin(angle2)*h;
    toDrawHead(ctx,topx,topy,x1,y1,botx,boty,style);
  }
}

function hexToRGBA(hex, alpha) {
  var r = parseInt( hex.slice(1,3), 16 ),
      g = parseInt( hex.slice(3,5), 16 ),
      b = parseInt( hex.slice(5,7), 16 );
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function init_canvas(ctx, line_thickness, line_color, style, fill_opacity, fill_color, outline_opacity) {
	var line_color = '#' + ('00000' + (line_color | 0).toString(16)).substr(-6); 

	ctx.lineWidth = line_thickness * (size_x/1000);
	ctx.strokeStyle = line_color;
	ctx.fillStyle = line_color;
	
	//provides some AA
	ctx.shadowBlur = ctx.lineWidth / 2;
	ctx.shadowColor = '#000000';
	
	if ('setLineDash' in ctx) {	
		if (style == "dashed") {
			ctx.setLineDash([10, 10]);
			ctx.lineJoin = ctx.lineCap = 'round';
		} else if (style == "dotted") {
			ctx.setLineDash([line_thickness, line_thickness]);
			ctx.lineJoin = ctx.lineCap = 'butt';
		} else {
			ctx.lineJoin = ctx.lineCap = 'round';
		}
	}
	
	if (typeof fill_opacity !== 'undefined') {  // we assume && fill_color && outline_opacity
		var fill_color = '#' + ('00000' + (fill_color | 0).toString(16)).substr(-6); 
		var fill_rgba = hexToRGBA(fill_color, fill_opacity)
		ctx.fillStyle = fill_rgba;
		var outline_color = '#' + ('00000' + (fill_color | 0).toString(16)).substr(-6); 
		var outline_rgba = hexToRGBA(line_color, outline_opacity)
		ctx.strokeStyle = outline_rgba;
	}		
}

function init_canvases(line_thickness, line_color, style, fill_opacity, fill_color, outline_opacity) {
	start_drawing();
	init_canvas(draw_context, line_thickness, line_color, style, fill_opacity, fill_color, outline_opacity);
	init_canvas(temp_draw_context, line_thickness, line_color, style, fill_opacity, fill_color, outline_opacity);
	draw_context.beginPath();
	temp_draw_context.beginPath();
}

function can_edit() {
	return (!is_room_locked || my_user.role);
}

//convert transprancy in the 0-100(%) range to opacity in 0-1 range
function t2o(transparancy) {
	return (1 - (transparancy/100));
}

//function fires when mouse is left clicked on the map and it isn't a drag
var last_draw_time, last_point;
function on_left_click(e) {
	var mouse_location = e.data.getLocalPosition(background_sprite);
	if (!can_edit()) {
		return;
	}
	document.activeElement.blur();
	if (active_context == 'drag_context') {
		return;
	}
	if (active_context != 'ping_context') {
		deselect_all();
	}
	if (active_context == 'draw_context') {
		setup_mouse_events(on_draw_move, on_draw_end);
		new_drawing = {uid : newUid(), type: 'drawing', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, color:draw_color, alpha:1, thickness:parseFloat(draw_thickness), end:$('#draw_end_type').find('.active').attr('data-end'), style:$('#draw_type').find('.active').attr('data-style'), path:[[0, 0]]};
		init_canvases(new_drawing.thickness, new_drawing.color, new_drawing.style);
		draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
		last_draw_time = Date.now();
		last_point = [to_x_local(mouse_x_rel(mouse_location.x)), to_y_local(mouse_y_rel(mouse_location.y))];
	} else if (active_context == 'ruler_context') {
		setup_mouse_events(on_ruler_move, on_ruler_end);
		init_canvases(0.1, 0xffffff, "full");
		left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];	
	} else if (active_context == 'line_context') {
		if (!new_drawing) {
			setup_mouse_events(on_line_move, on_line_end);
			new_drawing = {uid : newUid(), type: 'line', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, color:line_color, alpha:1, thickness:parseFloat(line_thickness), path:[[0, 0]], end:$('#line_end_type').find('.active').attr('data-end'), style:$('#line_type').find('.active').attr('data-style') };
			init_canvases(new_drawing.thickness, new_drawing.color, new_drawing.style);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
			just_activated = true;
		}
	} else if (active_context == 'polygon_context') {
		if (!new_drawing) {
			setup_mouse_events(on_line_move, on_polygon_end);
			new_drawing = {uid : newUid(), type: 'polygon', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, outline_thickness:polygon_outline_thickness, outline_color:polygon_outline_color, outline_opacity: t2o(polygon_outline_transparancy), fill_color:polygon_fill_color, fill_opacity: t2o(polygon_fill_transparancy), alpha:1, path:[[0,0]], style:$('#polygon_type').find('.active').attr('data-style')};

			init_canvases(new_drawing.outline_thickness, new_drawing.outline_color, new_drawing.style, new_drawing.fill_opacity, new_drawing.fill_color, new_drawing.outline_opacity);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
		
			var end_circle_radius = (e.type == "touchstart") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;
			
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * x_abs(THICKNESS_SCALE), new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)));
			graphics.drawShape(new PIXI.Circle(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)), x_abs(end_circle_radius)));
			objectContainer.addChild(graphics);
			
			just_activated = true;
			render_scene();
		}
	} else if (active_context == 'curve_context') {
		if (!new_drawing) {
			new_drawing = {uid : newUid(), type: 'curve', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y),  scale:1, color:curve_color, alpha:1, thickness:parseFloat(curve_thickness), path:[[0, 0]], end:$('#curve_end_type').find('.active').attr('data-end'), style:$('#curve_type').find('.active').attr('data-style') };

			init_canvases(new_drawing.thickness, new_drawing.color, new_drawing.style);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));

			setup_mouse_events(on_curve_move, on_curve_end);
			just_activated = true;
		}
	} else if (active_context == 'area_context') {
		if (!new_drawing) {
			setup_mouse_events(on_curve_move, on_area_end);
			new_drawing = {uid : newUid(), type: 'area', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, outline_thickness:area_outline_thickness, outline_color:area_outline_color, outline_opacity: t2o(area_outline_transparancy), fill_color:area_fill_color, fill_opacity: t2o(area_fill_transparancy), alpha:1, path:[[0, 0]], style:$('#area_type').find('.active').attr('data-style')};
			
			init_canvases(new_drawing.outline_thickness, new_drawing.outline_color, new_drawing.style, new_drawing.fill_opacity, new_drawing.fill_color, new_drawing.outline_opacity);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
		
			var end_circle_radius = (e.type == "touchstart") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;
			
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * x_abs(THICKNESS_SCALE), new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)));
			graphics.drawShape(new PIXI.Circle(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)), x_abs(end_circle_radius)));
			objectContainer.addChild(graphics);
			
			just_activated = true;
			render_scene();
		}
	} else if (active_context == 'icon_context') {
		setup_mouse_events(undefined, on_icon_end);
	} else if (active_context == 'eraser_context') {
		hovering_over = undefined;
		setup_mouse_events(on_eraser_move, on_eraser_end);
	} else if (active_context == 'ping_context') {
		if (!drag_in_progress) {
			deselect_all();
		}
		
		//ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		//socket.emit('ping_marker', room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		last_ping_time = new Date();
		setup_mouse_events(on_ping_move, on_ping_end);
	} else if (active_context == "select_context") {
		setup_mouse_events(on_select_move, on_select_end);
		init_canvases(2, 0xBBBBBB, 'dotted', 0.25, 0xBBBBBB, 1);
		left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
		deselect_all();
	} else if (active_context == 'text_context') {
		setup_mouse_events(undefined, on_text_end);
	} else if (active_context == 'background_text_context') {
		setup_mouse_events(undefined, on_background_text_end);
	} else if (active_context == 'rectangle_context') {
		if (!new_drawing) {
			setup_mouse_events(on_rectangle_move, on_rectangle_end);
			left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];		
			init_canvases(rectangle_outline_thickness, rectangle_outline_color, $('#rectangle_type').find('.active').attr('data-style'), t2o(rectangle_fill_transparancy), rectangle_fill_color, t2o(rectangle_outline_transparancy));
			new_drawing = true;
			just_activated = true;
		}
	} else if (active_context == 'circle_context') {
		if (!new_drawing) {
			setup_mouse_events(on_circle_move, on_circle_end);
			left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];		
			init_canvases(circle_outline_thickness, circle_outline_color, $('#circle_type').find('.active').attr('data-style'), t2o(circle_fill_transparancy), circle_fill_color, t2o(circle_outline_transparancy));
			circle_draw_style = $('#circle_draw_style').find('.active').attr('data-draw_style')
			new_drawing = true;
			just_activated = true;
		}
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

var eraser_state = {}
function on_eraser_move(e) {
	limit_rate(15, eraser_state, function() {
		if (hovering_over && room_data.slides[active_slide].entities[hovering_over.uid]) {
			remove(hovering_over.uid);
			undo_list.push(["remove", [hovering_over]]);
			socket.emit('remove', room, hovering_over.uid, active_slide);
		}
	});
}

function on_eraser_end(e) {
	setup_mouse_events(undefined, undefined);
}

function stop_tracking() {
	setup_mouse_events(undefined, undefined);
	socket.emit("stop_track", room, my_tracker.uid);
	objectContainer.removeChild(my_tracker.container);
	my_tracker = undefined;
	render_scene();
}

function start_tracking(mouse_location) {
	setup_mouse_events(on_track_move, undefined);
	var shape = $('#track_shape .active').attr('data-cursor');
	var size;
	if (shape == 'dot' || shape == 'cursor') {
		size = 0.025;
	} else {
		size = 0.05;
	}
	my_tracker = {uid:newUid(), shape:shape, size:size, color: track_color, x: mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), owner:my_user.id};
	last_track_position = [my_tracker.x, my_tracker.y];
	socket.emit("track", room, my_tracker);
	create_tracker(my_tracker);
}

function on_note_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);	
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
	var sprite;
	if (texture_atlas["note.png"] && !is_safari()) {
		var img = texture_atlas["note.png"];
		var texture = new PIXI.Texture(loader.resources[img.sprite].texture, new PIXI.Rectangle(img.x, img.y, img.width, img.height));
		sprite = new PIXI.Sprite(texture);
	} else {
		var texture = PIXI.Texture.fromImage(image_host + 'circle.png');
		sprite = new PIXI.Sprite(texture);
	}

	sprite.height = (sprite.height/29) * y_abs(NOTE_SCALE) * note.scale;
	sprite.width = (sprite.width/29) * y_abs(NOTE_SCALE) * note.scale;
	
	//note.container = new PIXI.Container();
	sprite.x = x_abs(note.x);
	sprite.y = y_abs(note.y);

    note.container = sprite;
	note.container.entity = note; 
	note.container.is_open = false;

	note.container.menu = $('<div class="popover fade right in" role="tooltip"><div style="top: 50%;" class="arrow"></div><h3 style="display: none;" class="popover-title"></h3><div class="popover-content"><textarea style="height:400px; width:300px;" id="note_box"></textarea><br /><span id="notification_area" style="float: left;" hidden>Saved</span><div style="float:right; padding:3px;"></div></div></div>');
	
	$("#note_box", note.container.menu).val(note.text);
	
	if (is_room_locked && !my_user.role) {
		$('textarea', note.container.menu).prop('readonly', true);
		$('button', note.container.menu).hide();
	}
	
	$("#render_frame").append(note.container.menu);
	
	$("#note_box", note.container.menu).on('blur', function() {
		if (!can_edit()) {
			return;
		}
		note.text = $("#note_box", note.container.menu).val();
		$("#notification_area", note.container.menu).show();
		$("#notification_area", note.container.menu).fadeOut("slow");
		snap_and_emit_entity(note);
	});

	
	align_note_text(note);
		
	make_draggable(note.container);	
	objectContainer.addChild(note.container);
		
	render_scene();
	sprite.texture.on('update', function() {	
		render_scene();
	});
	room_data.slides[active_slide].entities[note.uid] = note;
}

function create_tracker(tracker) {	
	var texture
	if (texture_atlas[tracker.shape + '.png'] && !is_safari()) {
		var img = texture_atlas[tracker.shape + '.png'];
		texture = new PIXI.Texture(loader.resources[img.sprite].texture, new PIXI.Rectangle(img.x, img.y, img.width, img.height));
	} else {
		texture = PIXI.Texture.fromImage(image_host + tracker.shape + '.png');
	}
	
	tracker.container = new PIXI.Sprite(texture);	
	tracker.container.tint = tracker.color;
	if (tracker.shape != 'cursor') {
		tracker.container.anchor.set(0.5);
	}
	tracker.container.x = x_abs(tracker.x);
	tracker.container.y = y_abs(tracker.y);
		
	var ratio = tracker.container.width/tracker.container.height;
	
	tracker.container.height = y_abs(tracker.size);
	tracker.container.width = tracker.container.height * ratio;	
		
	trackers[tracker.uid] = tracker;
	objectContainer.addChild(trackers[tracker.uid].container);
	render_scene();
}

function remove_tracker(uid) {
	objectContainer.removeChild(trackers[uid].container);
	render_scene();
	delete trackers[uid];
}

var last_track_update = Date.now();

var count
var track_timeout;
var track_state = {}
function on_track_move(e) {
	limit_rate(15, track_state, function() {		
		clearTimeout(track_timeout);
		
		var mouse_location = renderer.plugins.interaction.mouse.global;	
		
		var x = from_x_local(mouse_location.x);
		var y = from_y_local(mouse_location.y);
		my_tracker.x = x;
		my_tracker.y = y;
		my_tracker.container.x = x_abs(x);
		my_tracker.container.y = y_abs(y);
		
		var dist_sq = (last_track_position[0] - my_tracker.x) * (last_track_position[0] - my_tracker.x)
					 +(last_track_position[1] - my_tracker.y) * (last_track_position[1] - my_tracker.y);
		
		var interval = (Date.now() - last_track_update);
		if (dist_sq > MIN_TRACK_MOVE_DISTANCE_SQ || interval > 50) {
			last_track_update = Date.now();
			if (Math.abs(my_tracker.x - last_track_position[0] + my_tracker.y - last_track_position[1]) > 0) {
				socket.emit("track_move", room, my_tracker.uid, my_tracker.x - last_track_position[0], my_tracker.y - last_track_position[1]);
				last_track_position = [my_tracker.x, my_tracker.y];
			}
			render_scene();
		} else {
			track_timeout = setTimeout(function() {
				if (my_tracker) {
					last_track_update = Date.now();
					socket.emit("track_move", room, my_tracker.uid, my_tracker.x - last_track_position[0], my_tracker.y - last_track_position[1]);
					last_track_position = [my_tracker.x, my_tracker.y];
					render_scene();
				}
			}, 55)
		}
	});
}

function on_area_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(background_sprite);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		//x = Math.max(0, x);
		//y = Math.max(0, y);
		//x = Math.min(1, x);
		//y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
	} catch (e) {}
	
	var distance_to_start_sq = x*x + y*y;

	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;

	if (just_activated) {
		var a;
		if (new_drawing.path.length == 1) {
			a = [to_x_local(new_drawing.x), to_y_local(new_drawing.y)];
		} else {
			a = [to_x_local(new_drawing.path[new_drawing.path.length-2][0] + new_drawing.x),
				 to_y_local(new_drawing.path[new_drawing.path.length-2][1] + new_drawing.y)];
		}
		var b = [to_x_local(x + new_drawing.x), to_y_local(y + new_drawing.y)];
		var distance_sq = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)
		just_activated = false;
		if (distance_sq < 0.01) return;
	}
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius)) {
		setup_mouse_events(undefined, undefined);
		
		new_drawing.path.push([0, 0]);

		draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);		
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);
		
		draw_context.beginPath();
		draw_path2(draw_context, null, new_drawing, new_drawing.path.length, 0, new_drawing.path.length, false, true);
		draw_context.stroke();
		draw_context.fill();
		
		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		objectContainer.removeChild(graphics);
		render_scene();
		
		stop_drawing();
		setup_mouse_events(undefined, undefined);
		new_drawing = null;
	
	} else {
		new_drawing.path.push([x, y]);
		
		if (new_drawing.path.length > 9) {
			var n = 30;
			var start_index = Math.max(new_drawing.path.length-10, 0);
			var stop_index = new_drawing.path.length;
			draw_path2(null, draw_context, new_drawing, 30, start_index, stop_index);
			draw_context.stroke();
		}
		on_curve_move(e);
	}
}

var curve_state = {};
function on_curve_move(e) {
	limit_rate(15, curve_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		//x = Math.max(0, x);
		//y = Math.max(0, y);
		//x = Math.min(1, x);
		//y = Math.min(1, y);
		var new_x = x - new_drawing.x;
		var new_y = y - new_drawing.y;
		new_drawing.path.push([new_x, new_y]);

		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		var n = 30;
		var start_index = Math.max(new_drawing.path.length-10, 0);
		var stop_index = new_drawing.path.length;

		temp_draw_context.beginPath();
		draw_path2(temp_draw_context, null, new_drawing, 30, start_index, stop_index, new_drawing.end);
		temp_draw_context.stroke();
		
		new_drawing.path.pop();
	});
}

function on_curve_end(e) {
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	//x = Math.max(0, x);
	//y = Math.max(0, y);
	//x = Math.min(1, x);
	//y = Math.min(1, y);
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
	
	if (just_activated) {
		just_activated = false;
		if (distance_to_last_sq < 0.01) return;
	}
	
	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside" || e.type == "touchstart" || e.type == "touchstartoutside") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;
	
	
	if (distance_to_last_sq < (end_circle_radius*end_circle_radius)) {	
		draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	

		draw_path2(draw_context, null, new_drawing, new_drawing.path.length, 0, new_drawing.path.length, new_drawing.end);		
		draw_context.stroke();

		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		objectContainer.removeChild(graphics);
		render_scene();
		
		stop_drawing();
		setup_mouse_events(undefined, undefined);
		new_drawing = null;
	} else {
		new_drawing.path.push([new_x, new_y]);
		objectContainer.removeChild(graphics);
		
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * x_abs(THICKNESS_SCALE), new_drawing.color, 1);
		graphics.moveTo(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)));
		graphics.drawShape(new PIXI.Circle(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)), x_abs(end_circle_radius)));
		objectContainer.addChild(graphics);
		render_scene();
		
		if (new_drawing.path.length > 9) {
			var n = 30;
			var start_index = Math.max(new_drawing.path.length-10, 0);
			var stop_index = new_drawing.path.length;
			draw_path2(null, draw_context, new_drawing, 30, start_index, stop_index);
			draw_context.stroke();
		}
		on_curve_move(e);
	}
}

function on_polygon_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(background_sprite);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		//x = Math.max(0, x);
		//y = Math.max(0, y);
		//x = Math.min(1, x);
		//y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
	} catch (e) {}

	var distance_to_start_sq = x*x + y*y;

	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;
	
	var a;
	if (new_drawing.path.length == 1) {
		a = [to_x_local(new_drawing.x), to_y_local(new_drawing.y)];
	} else {
		a = [to_x_local(new_drawing.path[new_drawing.path.length-2][0] + new_drawing.x),
			 to_y_local(new_drawing.path[new_drawing.path.length-2][1] + new_drawing.y)];
	}
	var b = [to_x_local(x + new_drawing.x), to_y_local(y + new_drawing.y)];
	
	if (just_activated) {
		var distance_sq = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)
		just_activated = false;
		if (distance_sq < 0.01) return;
	}
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius)) {
		new_drawing.path.push([0, 0]);
		draw_context.lineTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
		draw_context.stroke();
		draw_context.fill();
		
		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		objectContainer.removeChild(graphics);
		render_scene();		
		setup_mouse_events(undefined, undefined);
		stop_drawing();
		new_drawing = null;
	} else {
		if ((new_drawing.path.length == 0) || x != last(new_drawing.path)[0] || y != last(new_drawing.path)[1]) {
			new_drawing.path.push([x, y]);
		}

		draw_context.lineTo(b[0], b[1]);
		draw_context.stroke();
	}
}

function draw_shape(outline_thickness, outline_opacity, outline_color, fill_opacity, fill_color, shape) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(outline_thickness * x_abs(THICKNESS_SCALE), outline_color, outline_opacity);
	graphic.beginFill(fill_color, fill_opacity);
	graphic.drawShape(shape);
	graphic.endFill();
	return graphic;
}

var ruler_state = {}
function on_ruler_move(e) {
	limit_rate(15, ruler_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var map_size_x = background.size_x ? background.size_x : 0;
		var map_size_y = background.size_y ? background.size_y : 0;
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		temp_draw_context.beginPath();
		temp_draw_context.lineWidth = 2 * (size_x/1000);
		temp_draw_context.strokeStyle = "#FFFFFF";
		temp_draw_context.fillStyle = "#FFFFFF";
		temp_draw_context.beginPath();
		temp_draw_context.moveTo(to_x_local(left_click_origin[0]), to_y_local(left_click_origin[1]));		
		temp_draw_context.lineTo(to_x_local(mouse_x_rel(mouse_location.x)), to_y_local(mouse_y_rel(mouse_location.y)));
		temp_draw_context.stroke();	
		var mid_line_x = (to_x_local(left_click_origin[0]) + to_x_local(mouse_x_rel(mouse_location.x))) / 2;
		var mid_line_y = (to_y_local(left_click_origin[1]) + to_y_local(mouse_y_rel(mouse_location.y))) / 2;
		temp_draw_context.font = "22px Arial";		  
		var length = Math.sqrt(Math.pow(map_size_x * (left_click_origin[0] - mouse_x_rel(mouse_location.x)), 2) 
							 + Math.pow(map_size_y * (left_click_origin[1] - mouse_y_rel(mouse_location.y)), 2))  
		temp_draw_context.lineWidth = to_x_local(0.5)/1000;
		temp_draw_context.strokeStyle = "#000000";
		temp_draw_context.fillStyle = "#FFFFFF";
		var unit = "m";
		if (game == "lol") {
			unit = "u";
		}	
		temp_draw_context.fillText(""+Math.round(10*length)/10+unit, mid_line_x, mid_line_y);
	});
}

function on_ruler_end(e) {
	setup_mouse_events(undefined, undefined);
	limit_rate(15, ruler_state, function() {
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	});
}

var circle_state = {}
function on_circle_move(e) {
	limit_rate(15, circle_state, function() {	
		var mouse_location = e.data.getLocalPosition(background_sprite);
		
		var center_x, center_y, radius
		if (circle_draw_style == "edge") {
			center_x = (left_click_origin[0] + mouse_x_rel(mouse_location.x)) / 2;
			center_y = (left_click_origin[1] + mouse_y_rel(mouse_location.y)) / 2;
			radius = Math.sqrt(Math.pow(left_click_origin[0] - mouse_x_rel(mouse_location.x), 2) +
							   Math.pow(left_click_origin[1] - mouse_y_rel(mouse_location.y), 2));
			radius /= 2;
		} else if (circle_draw_style == "radius") {
			center_x = left_click_origin[0];
			center_y = left_click_origin[1];
			radius = Math.sqrt(Math.pow(left_click_origin[0] - mouse_x_rel(mouse_location.x), 2) + 
							   Math.pow(left_click_origin[1] - mouse_y_rel(mouse_location.y), 2));
		}
		
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		temp_draw_context.beginPath();
		temp_draw_context.arc(to_x_local(center_x), to_y_local(center_y), background_sprite.height * objectContainer.scale.y  * radius, 0, 2*Math.PI);
		temp_draw_context.fill();
		temp_draw_context.stroke();
		
		if (circle_draw_style == "radius" && background.size_x && background.size_x > 0 && background.size_y && background.size_y > 0) {
			temp_draw_context.save();
			temp_draw_context.lineWidth = 2 * (size_x/1000);
			temp_draw_context.strokeStyle = "#FFFFFF";
			temp_draw_context.fillStyle = "#FFFFFF";
			temp_draw_context.beginPath();
			temp_draw_context.moveTo(to_x_local(center_x), to_y_local(center_y));		
			temp_draw_context.lineTo(to_x_local(mouse_x_rel(mouse_location.x)), to_y_local(mouse_y_rel(mouse_location.y)));
			temp_draw_context.stroke();
			var mid_line_x = to_x_local((center_x + mouse_x_rel(mouse_location.x)) / 2);
			var mid_line_y = to_y_local((center_y + mouse_y_rel(mouse_location.y)) / 2);
			temp_draw_context.font = "22px Arial";
			var length = Math.sqrt(Math.pow(background.size_x * (center_x - mouse_x_rel(mouse_location.x)), 2) + Math.pow(background.size_y * 
			(center_y - mouse_y_rel(mouse_location.y)), 2))
			temp_draw_context.lineWidth = to_x_local(0.5)/1000;
			temp_draw_context.strokeStyle = "#000000";
			temp_draw_context.fillStyle = "#FFFFFF";
			temp_draw_context.fillText(""+Math.round(10*length)/10+"m", mid_line_x, mid_line_y);
			temp_draw_context.restore();
		}
	});
	
}

function on_circle_end(e) {
	limit_rate(15, circle_state, function() {});
	var mouse_location = e.data.getLocalPosition(background_sprite);

	var center_x, center_y, radius
	if (circle_draw_style == "edge") {
		center_x = (left_click_origin[0] + mouse_x_rel(mouse_location.x)) / 2;
		center_y = (left_click_origin[1] + mouse_y_rel(mouse_location.y)) / 2;
		radius = Math.sqrt(Math.pow(left_click_origin[0] - mouse_x_rel(mouse_location.x), 2) +
				           Math.pow(left_click_origin[1] - mouse_y_rel(mouse_location.y), 2));
		radius /= 2;
	} else if (circle_draw_style == "radius") {
		center_x = left_click_origin[0];
		center_y = left_click_origin[1];
		radius = Math.sqrt(Math.pow(left_click_origin[0] - mouse_x_rel(mouse_location.x), 2) + 
		                   Math.pow(left_click_origin[1] - mouse_y_rel(mouse_location.y), 2));
	}
	
	if (just_activated) {
		var distance_sq = Math.pow(to_x_local(radius), 2)
		just_activated = false;
		if (distance_sq < 0.01) return;
	}
	new_drawing = undefined;
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	temp_draw_context.beginPath();
	temp_draw_context.arc(to_x_local(center_x), to_y_local(center_y), background_sprite.height * objectContainer.scale.y * radius, 0, 2*Math.PI);
	temp_draw_context.fill();
	temp_draw_context.stroke();

	var new_shape = {uid:newUid(), type:'circle', x:center_x, y:center_y, radius:radius, outline_thickness:circle_outline_thickness, outline_color:circle_outline_color, outline_opacity: t2o(circle_outline_transparancy), fill_opacity: t2o(circle_fill_transparancy), fill_color:circle_fill_color, alpha:1, style:$('#circle_type').find('.active').attr('data-style')};
	
	if (circle_draw_style == "radius" && background.size_x && background.size_x > 0 && background.size_y && background.size_y > 0) {
		temp_draw_context.save();
		temp_draw_context.lineWidth = 2 * (size_x/1000);
		temp_draw_context.strokeStyle = "#FFFFFF";
		temp_draw_context.fillStyle = "#FFFFFF";
		temp_draw_context.beginPath();
		temp_draw_context.moveTo(to_x_local(center_x), to_y_local(center_y));		
		temp_draw_context.lineTo(to_x_local(mouse_x_rel(mouse_location.x)), to_y_local(mouse_y_rel(mouse_location.y)));
		temp_draw_context.stroke();
		var mid_line_x = to_x_local((center_x + mouse_x_rel(mouse_location.x)) / 2);
		var mid_line_y = to_y_local((center_y + mouse_y_rel(mouse_location.y)) / 2);
		temp_draw_context.font = "22px Arial";
		var length = Math.sqrt(Math.pow(background.size_x * (center_x - mouse_x_rel(mouse_location.x)), 2) + Math.pow(background.size_y * 
		(center_y - mouse_y_rel(mouse_location.y)), 2))
		temp_draw_context.lineWidth = to_x_local(0.5)/1000;
		temp_draw_context.strokeStyle = "#000000";
		temp_draw_context.fillStyle = "#FFFFFF";
		temp_draw_context.fillText(""+Math.round(10*length)/10+"m", mid_line_x, mid_line_y);
		temp_draw_context.restore();		
		new_shape.draw_radius = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
	}
	

	var success = canvas2container(temp_draw_context, temp_draw_canvas, new_shape);
	if (success) {
		emit_entity(new_shape);
		undo_list.push(["add", [new_shape]]);
	}
		
	stop_drawing();
	setup_mouse_events(undefined, undefined);
}

var rectangle_state = {}
function on_rectangle_move(e) {
	limit_rate(15, rectangle_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);	
		var left_x = Math.min(left_click_origin[0], mouse_x_rel(mouse_location.x));
		var left_y = Math.min(left_click_origin[1], mouse_y_rel(mouse_location.y));
		var right_x = Math.max(left_click_origin[0], mouse_x_rel(mouse_location.x));
		var right_y = Math.max(left_click_origin[1], mouse_y_rel(mouse_location.y));

		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);							
		temp_draw_context.fillRect(to_x_local(left_x), to_y_local(left_y), to_x_local(right_x)-to_x_local(left_x), to_y_local(right_y)-to_y_local(left_y)); 
		temp_draw_context.strokeRect(to_x_local(left_x), to_y_local(left_y), to_x_local(right_x)-to_x_local(left_x), to_y_local(right_y)-to_y_local(left_y));
	});
}

function on_rectangle_end(e) {
	limit_rate(15, rectangle_state, function() {});
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var left_x = Math.min(left_click_origin[0], mouse_x_rel(mouse_location.x));
	var left_y = Math.min(left_click_origin[1], mouse_y_rel(mouse_location.y));
	var right_x = Math.max(left_click_origin[0], mouse_x_rel(mouse_location.x));
	var right_y = Math.max(left_click_origin[1], mouse_y_rel(mouse_location.y));

	if (just_activated) {
		var distance_sq = Math.pow(to_x_local(left_x - right_x), 2) + Math.pow(to_y_local(left_y - right_y), 2)
		just_activated = false;
		if (distance_sq < 0.01) return;
	}
	new_drawing = undefined;
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);							
	temp_draw_context.fillRect(to_x_local(left_x), to_y_local(left_y), to_x_local(right_x)-to_x_local(left_x), to_y_local(right_y)-to_y_local(left_y)); 
	temp_draw_context.strokeRect(to_x_local(left_x), to_y_local(left_y), to_x_local(right_x)-to_x_local(left_x), to_y_local(right_y)-to_y_local(left_y));

	var new_shape = {uid:newUid(), type:'rectangle', x:left_x, y:left_y, width:(right_x - left_x), height:(right_y - left_y), outline_thickness:rectangle_outline_thickness, outline_color:rectangle_outline_color, outline_opacity: t2o(rectangle_outline_transparancy), fill_opacity: t2o(rectangle_fill_transparancy), fill_color:rectangle_fill_color, alpha:1, style:$('#rectangle_type').find('.active').attr('data-style') };
	
	var success = canvas2container(temp_draw_context, temp_draw_canvas, new_shape);
	if (success) {
		emit_entity(new_shape);
		undo_list.push(["add", [new_shape]]);
	}
		
	stop_drawing();
	setup_mouse_events(undefined, undefined);
}

var ping_state = {}
function on_ping_move(e) {
	limit_rate(80, drag_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color, ping_size);
		socket.emit('ping_marker', room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color, ping_size);
	});
}

function on_ping_end(e) {
	clearTimeout(drag_state.timeout);
	var mouse_location = e.data.getLocalPosition(background_sprite);
	ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color, ping_size);
	socket.emit('ping_marker', room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color, ping_size);
	setup_mouse_events(undefined, undefined);
}

var select_state = {}
function on_select_move(e) {
	limit_rate(15, select_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);	
		var left_x = Math.min(left_click_origin[0], mouse_x_rel(mouse_location.x));
		var left_y = Math.min(left_click_origin[1], mouse_y_rel(mouse_location.y));
		var right_x = Math.max(left_click_origin[0], mouse_x_rel(mouse_location.x));
		var right_y = Math.max(left_click_origin[1], mouse_y_rel(mouse_location.y));

		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);							
		temp_draw_context.fillRect(to_x_local(left_x), to_y_local(left_y), to_x_local(right_x)-to_x_local(left_x), to_y_local(right_y)-to_y_local(left_y)); 
		temp_draw_context.strokeRect(to_x_local(left_x), to_y_local(left_y), to_x_local(right_x)-to_x_local(left_x), to_y_local(right_y)-to_y_local(left_y));
	});
}

function on_select_end(e) {	
	limit_rate(15, select_state, function() {
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	});
	
	setup_mouse_events(undefined, undefined);

	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x_min = Math.min(mouse_x_rel(mouse_location.x), left_click_origin[0]);
	var y_min = Math.min(mouse_y_rel(mouse_location.y), left_click_origin[1]);
	var x_max = Math.max(mouse_x_rel(mouse_location.x), left_click_origin[0]);
	var y_max = Math.max(mouse_y_rel(mouse_location.y), left_click_origin[1]);
	
	
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key) && room_data.slides[active_slide].entities[key].container) {
			
			var box_min_x = 1000;
			var box_max_x = -1000;
			var box_min_y = 1000;
			var box_max_y = -1000;
			var entity = room_data.slides[active_slide].entities[key];			
			box_min_x = Math.min(box_min_x, entity.x);
			box_min_y = Math.min(box_min_y, entity.y);
			box_max_x = Math.max(box_max_x, entity.x);
			box_max_y = Math.max(box_max_y, entity.y);			
			if (entity.path) {
				for (var i in entity.path) {
					var tempx = entity.x + entity.path[i][0];
					var tempy = entity.y + entity.path[i][1];
					box_min_x = Math.min(box_min_x, tempx);
					box_min_y = Math.min(box_min_y, tempy);
					box_max_x = Math.max(box_max_x, tempx);
					box_max_y = Math.max(box_max_y, tempy);		
				}
			}
			if (entity.width) {
				var tempx = entity.x + entity.width;
				var tempy = entity.y + entity.height;
				box_min_x = Math.min(box_min_x, tempx);
				box_min_y = Math.min(box_min_y, tempy);
				box_max_x = Math.max(box_max_x, tempx);
				box_max_y = Math.max(box_max_y, tempy);		
			}

			if (box_min_x > x_min && box_min_y > y_min && box_max_x < x_max && box_max_y < y_max) {
				selected_entities.push(room_data.slides[active_slide].entities[key]);
			}
		}
	}
	
	select_entities();
	undo_list.push(["select", selected_entities, previously_selected_entities]);
	render_scene();
}

function brighten(sprite, brightness) {
	var filter = new PIXI.filters.ColorMatrixFilter();
	filter.matrix = [
		1, 0, 0, brightness, 0,
		0, 1, 0, brightness, 0,
		0, 0, 1, brightness, 0,
		0, 0, 0, 1, 0
	]
	sprite.filters = [filter];
}

function select_entities() {
	for (var i in selected_entities) {
		room_data.slides[active_slide].entities[selected_entities[i].uid].container.alpha = select_alpha;
	}
	render_scene();
}

function select_all() {
	previously_selected_entities = selected_entities;
	selected_entities = [];
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key) && room_data.slides[active_slide].entities[key].container) {
			selected_entities.push(room_data.slides[active_slide].entities[key]);
		}
	}
	select_entities();
	undo_list.push(["select", selected_entities, previously_selected_entities]);
}

function deselect_all() {
	previously_selected_entities = selected_entities;
	for (var entity in selected_entities) {
		selected_entities[entity].container.filters = undefined;
		selected_entities[entity].container.alpha = selected_entities[entity].alpha;
	}
	selected_entities = [];
}

function draw_path(graphic, path, start_index, stop_index) {
	var path_x = [];
	var path_y = [];
	
	for (var i = 0; i < path.length; i++) {
		path_x.push(x_abs(new_drawing.x + path[i][0]));
		path_y.push(y_abs(new_drawing.y + path[i][1]));
	}

	var cx = computeControlPoints(path_x);
	var cy = computeControlPoints(path_y);		

	if (start_index == 0) {
		graphic.moveTo(path_x[0], path_y[0]);
		graphic.lineTo(path_x[1], path_y[1]);
		start_index	= 1;
	}

	graphic.moveTo(path_x[start_index], path_y[start_index])
	for (var i = start_index; i < stop_index; i++) {
		graphic.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
	}
	
	graphic.graphicsData[graphic.graphicsData.length-1].shape.closed = false;	
}

function draw_path2(context, context2, drawing, n, start_index, stop_index, end, smooth_out, skip_move) {	
	var i = Math.max(drawing.path.length-n, 0);
	var path = drawing.path.slice(i);
	stop_index -= i;
	start_index -= i;
	
	var path_x = [];
	var path_y = [];
	
	for (var i = 0; i < path.length; i++) {
		path_x.push(to_x_local(drawing.x + path[i][0]));
		path_y.push(to_y_local(drawing.y + path[i][1]));
	}
	
	//smooth out basically means push some of the end points at the beginning 
	//and some of beginning points at the end before we calculate the control points
	if (smooth_out) {
		var slice_size = Math.min(4, path_x.length-1);
		path_x = path_x.slice(path_x.length-slice_size-1, path_x.length-1).concat(path_x.concat(path_x.slice(1, slice_size+1)))
		path_y = path_y.slice(path_y.length-slice_size-1, path_y.length-1).concat(path_y.concat(path_y.slice(1, slice_size+1)))
		start_index += slice_size;
		stop_index += slice_size;
	}

	var cx = computeControlPoints(path_x);
	var cy = computeControlPoints(path_y);		

	if (end == "arrow") {
		if (stop_index - start_index > 2) {
			draw_arrow3(context, [cx.p1[cx.p1.length-1], cy.p1[cy.p1.length-1]], [path_x[path_x.length-1], path_y[path_y.length-1]], drawing);
		} else {
			draw_arrow3(context, [path_x[path_x.length-2], path_y[path_y.length-2]], [path_x[path_x.length-1], path_y[path_y.length-1]], drawing);
		}
		context.beginPath();
	} else if (end == "T") {
		if (stop_index - start_index > 2) {
			draw_T3(context, [cx.p1[cx.p1.length-1], cy.p1[cy.p1.length-1]], [path_x[path_x.length-1], path_y[path_y.length-1]], drawing);
		} else {
			draw_T3(context, [path_x[path_x.length-2], path_y[path_y.length-2]], [path_x[path_x.length-1], path_y[path_y.length-1]], drawing);
		}
		context.stroke();
		context.beginPath();
	}
	
	if (context) {
		if (!skip_move) {
			context.moveTo(path_x[start_index], path_y[start_index]);
		}
		if (context2) {
			context.lineDashOffset = context2.lineDashOffset;
		}
		if (stop_index - start_index == 2) {
			context.lineTo(path_x[1], path_y[1]);
			start_index++;
		}

		var i = start_index;
		for (; i < stop_index-1; i++) {
			context.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
	}

	if (context2) {
		if (path.length == start_index) {
			context2.moveTo(path[0].x, path[0].y);
			context2.lineTo(path[1].x, path[1].y);
		} else if (path.length > start_index) {
			var i = start_index;
			context2.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
	}
}


var draw_state = {}
function on_draw_move(e) {
	limit_rate(20, draw_state, function() {
		var mouse_location = renderer.plugins.interaction.mouse.global;				
		new_x = last_point[0] * MOUSE_DRAW_SMOOTHING + (1-MOUSE_DRAW_SMOOTHING) * mouse_location.x;
		new_y = last_point[1] * MOUSE_DRAW_SMOOTHING + (1-MOUSE_DRAW_SMOOTHING) * mouse_location.y;	
		new_drawing.path.push([from_x_local(new_x) - new_drawing.x, from_y_local(new_y) - new_drawing.y]);
		
		draw_context.quadraticCurveTo(last_point[0], last_point[1], new_x, new_y);	
		draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
		draw_context.stroke();		
		
		temp_draw_context.beginPath();
		temp_draw_context.moveTo(last_point[0], last_point[1]);
		temp_draw_context.quadraticCurveTo(new_x, new_y, mouse_location.x, mouse_location.y);
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);

		new_drawing.path.push([from_x_local(mouse_location.x) - new_drawing.x, from_y_local(mouse_location.y) - new_drawing.y]);		
		if (new_drawing.path.length >= ARROW_LOOKBACK) {	
			if (new_drawing.end == "arrow") {
				temp_draw_context.stroke();
				draw_arrow2(temp_draw_context, new_drawing, ARROW_LOOKBACK);
				temp_draw_context.fill();
			} else if (new_drawing.end == "T") {
				draw_T2(temp_draw_context, new_drawing, ARROW_LOOKBACK);
				temp_draw_context.stroke();
			} else {
				temp_draw_context.stroke();
			}
		} else {
			temp_draw_context.stroke();
		}
		new_drawing.path.pop();
		
		last_point = [new_x, new_y];
	});
}

function on_draw_end(e) {
	limit_rate(20, draw_state, function() {});

	var mouse_location = renderer.plugins.interaction.mouse.global;
	draw_context.quadraticCurveTo(last_point[0], last_point[1], mouse_location.x, mouse_location.y);
	draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
	new_drawing.path.push([from_x_local(mouse_location.x) - new_drawing.x, from_y_local(mouse_location.y) - new_drawing.y]);

	if (new_drawing.path.length > ARROW_LOOKBACK) {	
		if (new_drawing.end == "arrow") {
			draw_context.stroke();
			draw_arrow2(draw_context, new_drawing, ARROW_LOOKBACK);
			draw_context.fill();
		} else if (new_drawing.end == "T") {
			draw_T2(draw_context, new_drawing, ARROW_LOOKBACK);
			draw_context.stroke();
		} else {
			draw_context.stroke();
		}
	} else {
		draw_context.stroke();
	}

	var success = canvas2container(draw_context, draw_canvas, new_drawing);
	if (success) {
		emit_entity(new_drawing);
		undo_list.push(["add", [new_drawing]]);
	}
	
	stop_drawing();	
	draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
	setup_mouse_events(undefined, undefined);
	new_drawing = null;
	
}

function autocrop_canvas(canvas) {
	var ctx = canvas.getContext("2d");
	
	//this code is for clipping
	var w = canvas.width,
	    h = canvas.height,
	    pix = {x:[], y:[]},
	    imageData = ctx.getImageData(0,0,canvas.width,canvas.height),
	    x, y, index;

	for (y = 0; y < h; y++) {
		for (x = 0; x < w; x++) {
			index = (y * w + x) * 4;
			if (imageData.data[index+3] > 0) {
				pix.x.push(x);
				pix.y.push(y);
			}   
		}
	}
	pix.x.sort(function(a,b){return a-b});
	pix.y.sort(function(a,b){return a-b});
	var n = pix.x.length-1;

	x = pix.x[0];
	y = pix.y[0];
	w = pix.x[n] - pix.x[0] + 1;
	h = pix.y[n] - pix.y[0] + 1;
	
	var _canvas = document.createElement("canvas");
	_canvas.width = w;
	_canvas.height = h;
	var _ctx = _canvas.getContext("2d");

	if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
		return null;
	}
	
	var cut = ctx.getImageData(x, y, w, h);
	_ctx.putImageData(cut, 0, 0);
	
	_canvas.x = x;
	_canvas.y = y;
	return _canvas;
}

function createSprite(ctx, canvas) {
	canvas = autocrop_canvas(canvas);
	//generate the pixi sprite and put it in the right spot
	
	if (canvas) {
		var texture = PIXI.Texture.fromCanvas(canvas);
		var sprite = new PIXI.Sprite(texture);
		sprite.x = x_abs(from_x_local(canvas.x));
		sprite.y = y_abs(from_y_local(canvas.y));
		return sprite;
	} else {
		return null;
	}
}

function draw_arrow2(context, drawing, i) {
	var i = Math.max(0, drawing.path.length-i);
	var size = Math.max(Math.min(7*drawing.thickness, 40), 20); //[15 < size < 30]
	var size = size * (size_x/1000);
	var x0 = drawing.path[i][0] - drawing.path[drawing.path.length-1][0];
	var y0 = drawing.path[i][1] - drawing.path[drawing.path.length-1][1];
	l = Math.sqrt(Math.pow(x0,2) + Math.pow(y0,2));
	x0 /= l;
	y0 /= l;
	start_x = to_x_local(drawing.path[drawing.path.length-1][0] + drawing.x);
	start_y = to_y_local(drawing.path[drawing.path.length-1][1] + drawing.y);
	drawArrow(context, start_x, start_y, start_x-(drawing.thickness*x0),start_y-(drawing.thickness*y0), 3, 1, Math.PI/8, size);	
}

function draw_arrow3(context, a, b, drawing) {
	var size = Math.max(Math.min(7*drawing.thickness, 40), 20); //[15 < size < 30]
	var size = size * (size_x/1000);
	var x_diff = b[0] - a[0];
	var y_diff = b[1] - a[1];
	l = Math.sqrt(Math.pow(x_diff,2) + Math.pow(y_diff,2));
	x_diff /= l;
	y_diff /= l;
	drawArrow(context, b[0], b[1], b[0]+(drawing.thickness*x_diff), b[1]+(drawing.thickness*y_diff), 3, 1, Math.PI/8, size);	
}

function draw_T2(context, drawing, i) {
	var i = Math.max(0, drawing.path.length-i);
	var size = Math.max(Math.min(7*drawing.thickness, 40), 20); //[15 < size < 30]
	var size = size * (size_x/1000);
	var x0 = drawing.path[i][0] - drawing.path[drawing.path.length-1][0];
	var y0 = drawing.path[i][1] - drawing.path[drawing.path.length-1][1];
	l = Math.sqrt(Math.pow(x0,2) + Math.pow(y0,2));
	x0 /= l;
	y0 /= l;
	start_x = to_x_local(drawing.path[drawing.path.length-1][0] + drawing.x);
	start_y = to_y_local(drawing.path[drawing.path.length-1][1] + drawing.y);	
	var x_ort = - y0;
	var y_ort = x0;
	
	context.stroke();
	var temp_dash = context.getLineDash()
	context.setLineDash([]);
	context.beginPath();
	context.moveTo(start_x - size * x_ort, start_y - size * y_ort);
	context.lineTo(start_x + size * x_ort, start_y + size * y_ort);
	context.stroke();
	context.setLineDash(temp_dash);
}

function draw_T3(context, a, b, drawing) {
	var size = Math.max(Math.min(7*drawing.thickness, 40), 20); //[15 < size < 30]
	var size = size * (size_x/1000);
	var x_diff = b[0] - a[0];
	var y_diff = b[1] - a[1];
	l = Math.sqrt(Math.pow(x_diff,2) + Math.pow(y_diff,2));
	x_diff /= l;
	y_diff /= l;
	var x_ort = - y_diff;
	var y_ort = x_diff;
	
	context.stroke();
	var temp_dash = context.getLineDash()
	context.setLineDash([]);
	context.beginPath();	
	context.moveTo(b[0] - size * x_ort, b[1] - size * y_ort);
	context.lineTo(b[0] + size * x_ort, b[1] + size * y_ort);
	context.stroke();
	context.setLineDash(temp_dash);
}

function canvas2container(_context, _canvas, entity) {
	var sprite = createSprite(_context, _canvas);
		
	if (sprite) {
		entity.container = sprite;		
		//rescale to objectContainer
		sprite.height /= objectContainer.scale.x;
		sprite.width /= objectContainer.scale.y;
		objectContainer.addChild(sprite);
		
		//make draggable
		sprite.texture.baseTexture.source.src = entity.uid;
		sprite.hitArea = new PIXI.TransparencyHitArea.create(sprite, false);
		make_draggable(sprite);
		sprite.entity = entity;
		
		//send off
		room_data.slides[active_slide].entities[entity.uid] = entity;
		render_scene();	
		
		return true; //success
	} else {
		return false; //failure
	}
}

function create_line2(line) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	_context = _canvas.getContext("2d");
	
	init_canvas(_context, line.thickness, line.color, line.style);
	
	_context.moveTo(to_x_local(line.x), to_y_local(line.y));
	for (var i = 0; i < line.path.length; ++i) {
		var x = to_x_local(line.path[i][0] + line.x);
		var y = to_y_local(line.path[i][1] + line.y);
		_context.lineTo(x,y);
	}
	_context.stroke();
	
	var a;
	if (line.path.length == 1) {
		a = [to_x_local(line.x), to_y_local(line.y)];
	} else {
		a = [to_x_local(line.path[line.path.length-2][0] + line.x),
			 to_y_local(line.path[line.path.length-2][1] + line.y)];
	}
	var b = [to_x_local(last(line.path)[0] + line.x), to_y_local(last(line.path)[1] + line.y)];
	if (line.end == "arrow") {	
		draw_arrow3(_context, a, b, line);
		_context.fill();
	} else if (line.end == "T") {
		draw_T3(_context, a, b, line);
		_context.stroke();			
	}
	
	canvas2container(_context, _canvas, line);
}

function init_shape_canvas(_context, shape) {
	init_canvas(_context, shape.outline_thickness, shape.outline_color, shape.style, shape.fill_opacity, shape.fill_color, shape.outline_opacity)
}

function create_rectangle2(rectangle) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	var _context = _canvas.getContext("2d");
	init_shape_canvas(_context, rectangle);

	_context.fillRect(to_x_local(rectangle.x), to_y_local(rectangle.y), to_x_local(rectangle.width), to_y_local(rectangle.height)); 
	_context.strokeRect(to_x_local(rectangle.x), to_y_local(rectangle.y), to_x_local(rectangle.width), to_y_local(rectangle.height));

	canvas2container(_context, _canvas, rectangle);
}

function create_circle2(circle) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	var _context = _canvas.getContext("2d");
	init_shape_canvas(_context, circle);

	_context.beginPath();
	
	_context.arc(to_x_local(circle.x), to_y_local(circle.y), background_sprite.height * objectContainer.scale.y * circle.radius, 0, 2*Math.PI);
	_context.fill();
	_context.stroke();
	
	if (circle.draw_radius) {
		_context.save();
		_context.lineWidth = 2 * (size_x/1000);
		_context.strokeStyle = "#FFFFFF";
		_context.fillStyle = "#FFFFFF";
		_context.beginPath();
		_context.moveTo(to_x_local(circle.x),to_y_local(circle.y));		
		_context.lineTo(to_x_local(circle.draw_radius[0]), to_y_local(circle.draw_radius[1]));
		_context.stroke();
		var mid_line_x = to_x_local((circle.x + circle.draw_radius[0]) / 2);
		var mid_line_y = to_y_local((circle.y + circle.draw_radius[1]) / 2);
		_context.font = "22px Arial";
		var length = Math.sqrt(Math.pow(background.size_x * (circle.x - circle.draw_radius[0]), 2) + Math.pow(background.size_y * 
		(circle.y - circle.draw_radius[1]), 2))
		_context.lineWidth = to_x_local(0.5)/1000;
		_context.strokeStyle = "#000000";
		_context.fillStyle = "#FFFFFF";
		_context.fillText(""+Math.round(10*length)/10+"m", mid_line_x, mid_line_y);
		_context.restore();
	}
	
	canvas2container(_context, _canvas, circle);
}

function create_polygon2(polygon) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	var _context = _canvas.getContext("2d");
	init_shape_canvas(_context, polygon);

	_context.beginPath();
	_context.moveTo(to_x_local(polygon.x), to_y_local(polygon.y));	
	for (var i = 0; i < polygon.path.length; ++i) {
		var x = to_x_local(polygon.path[i][0] + polygon.x);
		var y = to_y_local(polygon.path[i][1] + polygon.y);
		_context.lineTo(x,y);
	}
	_context.lineTo(to_x_local(polygon.x), to_y_local(polygon.y));
	_context.stroke();
	_context.fill();
	
	canvas2container(_context, _canvas, polygon);
}

function create_area2(area) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	var _context = _canvas.getContext("2d");
	init_shape_canvas(_context, area);

	_context.beginPath();
	draw_path2(_context, null, area, area.path.length, 0, area.path.length, false, true);
	_context.stroke();
	_context.fill();	

	canvas2container(_context, _canvas, area);
}

function create_drawing2(drawing) {
	var color = '#' + ('00000' + (drawing.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	var _context = _canvas.getContext("2d");

	init_canvas(_context, drawing.thickness, drawing.color, drawing.style);
	
	_context.beginPath();
	_context.moveTo(to_x_local(drawing.x), to_y_local(drawing.y));
	
	var p_i = [to_x_local(drawing.x), to_y_local(drawing.y)];
	var p_i_plus_1 = p_i;

	for (i = 1; i <= drawing.path.length - 2; i++) {
		p_i_plus_1 = [to_x_local(drawing.path[i+1][0] + drawing.x), to_y_local(drawing.path[i+1][1] + drawing.y)]
		_context.quadraticCurveTo(p_i[0], p_i[1], p_i_plus_1[0], p_i_plus_1[1]);
		p_i = p_i_plus_1;
	}

	if (drawing.path.length >= ARROW_LOOKBACK) {	
		if (drawing.end == "arrow") {
			_context.stroke();
			draw_arrow2(_context, drawing, ARROW_LOOKBACK);
			_context.fill();
		} else if (drawing.end == "T") {
			draw_T2(_context, drawing, ARROW_LOOKBACK);
			_context.stroke();
		} else {
			_context.stroke();
		}
	} else {
		_context.stroke();
	}
	canvas2container(_context, _canvas, drawing);
}

function create_curve2(drawing) {
	var color = '#' + ('00000' + (drawing.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = renderer.view.width;
	_canvas.height = renderer.view.height;
	var _context = _canvas.getContext("2d");

	init_canvas(_context, drawing.thickness, drawing.color, drawing.style);
	
	_context.beginPath();
	_context.moveTo(size_x*(drawing.x), size_y*(drawing.y));
		
	var n = drawing.path.length;
	draw_path2(_context, undefined, drawing, n, 0, n, drawing.end);
	_context.stroke();
	
	canvas2container(_context, _canvas, drawing);
}

function start_drawing() {
	draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	if ('setLineDash' in temp_draw_context) {
		temp_draw_context.setLineDash([]);
	}
	if ('setLineDash' in draw_context) {
		draw_context.setLineDash([]);
	}
	$(temp_draw_canvas).show();
	$(draw_canvas).show();	
}

function stop_drawing() {
	$(temp_draw_canvas).hide();
	$(draw_canvas).hide();	
}

function snap_and_emit_entity(entity) {
	move_entity(entity, 0, 0);
	render_scene();
	emit_entity(entity);
	render_scene();
}

function emit_entity(entity) {
	var container = entity.container;
	entity.container = undefined;
	socket.emit('create_entity', room, entity, active_slide);
	room_data.slides[active_slide].z_top++;
	entity.z_index = room_data.slides[active_slide].z_top;
	entity.container = container;
	entity.container.mouseover = function() {
		hovering_over = entity;
	}
}

function on_icon_end(e) {	
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);
	
	var color = icon_color;
	if (selected_icon_no_color) {
		color = 16777215; //white
	}
	
	var zoom_level = size_x / (background_sprite.height * objectContainer.scale.y);
	var size = icon_size*icon_extra_scale*ICON_SCALE;
	size *= zoom_level;
	var x = mouse_x_rel(mouse_location.x) - (size/2);
	var y = mouse_y_rel(mouse_location.y) - (size/2);
	
 	var icon = {uid:newUid(), type: 'icon', tank:selected_icon, x:x, y:y, size:size, color:color, alpha:1, label:$('#icon_label').val(), label_font_size: label_font_size, label_color: "#ffffff", label_font: "Open Sans", brightness:parseFloat(icon_brightness)}
	
	undo_list.push(["add", [icon]]);
	create_icon(icon, snap_and_emit_entity);
}

function on_text_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var text = {uid:newUid(), type: 'text', x:x, y:y, scale:1, color:text_color, alpha:1, text:$('#text_tool_text').val(), font_size:font_size, font:'Open Sans'};
	undo_list.push(["add", [text]]);
	current_text_element = text;
	create_text(text);
	snap_and_emit_entity(text);
}

function on_background_text_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var background_text = {uid:newUid(), type: 'background_text', x:x, y:y, scale:1, color:background_text_color, alpha:1, text:$('#text_tool_background_text').val(), font_size:background_font_size, font:'Open Sans'};
	undo_list.push(["add", [background_text]]);
	create_background_text(background_text);
	snap_and_emit_entity(background_text);
}

var line_state = {};
function on_line_move(e) {
	limit_rate(15, line_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var a;
		if (new_drawing.path.length == 0) {
			a = [to_x_local(new_drawing.x), to_y_local(new_drawing.y)];
		} else {
			a = [to_x_local(new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x),
				 to_y_local(new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y)];
		}
		var b = [to_x_local(mouse_x_rel(mouse_location.x)) , to_y_local(mouse_y_rel(mouse_location.y))];
		
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);
		if (new_drawing.end == "arrow") {
			draw_arrow3(temp_draw_context, a, b, new_drawing);
		} else if (new_drawing.end == "T") {
			draw_T3(temp_draw_context, a, b, new_drawing);
			temp_draw_context.stroke();
		}
		temp_draw_context.beginPath();
		temp_draw_context.moveTo(a[0], a[1]);		
		temp_draw_context.lineTo(b[0], b[1]);
		temp_draw_context.stroke();
	});
}

function on_line_end(e) {
	limit_rate(15, line_state, function() {});
	try {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);

		//x = Math.max(0, x);
		//y = Math.max(0, y);
		//x = Math.min(1, x);
		//y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
		if ((new_drawing.path.length == 0) || x != last(new_drawing.path)[0] || y != last(new_drawing.path)[1]) {
			new_drawing.path.push([x, y]);
		}	
	} catch (e) {}
	
	var a;
	if (new_drawing.path.length == 1) {
		a = [to_x_local(new_drawing.x), to_y_local(new_drawing.y)];
	} else {
		a = [to_x_local(new_drawing.path[new_drawing.path.length-2][0] + new_drawing.x),
			 to_y_local(new_drawing.path[new_drawing.path.length-2][1] + new_drawing.y)];
	}
	var b = [to_x_local(last(new_drawing.path)[0] + new_drawing.x), to_y_local(last(new_drawing.path)[1] + new_drawing.y)];
	
	if (just_activated) {
		var distance_sq = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2);
		just_activated = false;
		if (distance_sq < 0.01) return;
	}
	
	draw_context.lineTo(b[0], b[1]);
	draw_context.stroke();
		
	if (!shifted) {
		if (new_drawing.end == "arrow") {
			draw_arrow3(draw_context, a, b, new_drawing);
			draw_context.fill();
		} else if (new_drawing.end == "T") {
			draw_T3(draw_context, a, b, new_drawing);
			draw_context.stroke();			
		}

		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		setup_mouse_events(undefined, undefined);
		stop_drawing();
		new_drawing = null;
	}
}

objectContainer.interactive = true;
objectContainer.mousedown = on_left_click;
objectContainer.touchstart = on_left_click;

function create_text(text_entity) {
	var size = "bold "+text_entity.font_size*x_abs(FONT_SCALE)+"px " + text_entity.font;
	text_entity.container = new PIXI.Text(text_entity.text, {font: size, fill: text_entity.color, strokeThickness: (text_entity.font_size/5), stroke: "black", align: "center", dropShadow:true, dropShadowDistance:1});	
	text_entity.container.x = x_abs(text_entity.x);
	text_entity.container.y = y_abs(text_entity.y);
	
	text_entity.container.entity = text_entity;
	text_entity.container.alpha = text_entity.alpha;
	
	make_draggable(text_entity.container);	
	objectContainer.addChild(text_entity.container);

	room_data.slides[active_slide].entities[text_entity.uid] = text_entity;
}

function create_background_text(text_entity) {
	var size = "bold "+text_entity.font_size*x_abs(FONT_SCALE)+"px " + text_entity.font;
	var text_ = new PIXI.Text(text_entity.text, {font: size, fill: text_entity.color, align: "center"});
	
	var bounds = text_.getBounds();
	bounds.x -= (text_entity.font_size/2);
	bounds.y -= (text_entity.font_size/2);
	bounds.width += text_entity.font_size;
	bounds.height += text_entity.font_size;
	var shape = new PIXI.RoundedRectangle(bounds.x, bounds.y, bounds.width, bounds.height, 10);
	var graphic = draw_shape(1, 1, 0, 1, 16777215, shape);
	
	var container = new PIXI.Container();
	container.addChild(graphic);
	container.addChild(text_);
	
	container.x = x_abs(text_entity.x);
	container.y = y_abs(text_entity.y);
	
	text_entity.container = container;
	text_entity.container.entity = text_entity;
	text_entity.container.alpha = text_entity.alpha;
	
	make_draggable(text_entity.container);	
	objectContainer.addChild(text_entity.container);
	render_scene();
	
	room_data.slides[active_slide].entities[text_entity.uid] = text_entity;
}

function create_icon_cont(icon, texture) {
	var sprite = new PIXI.Sprite(texture);
	sprite.tint = icon.color;

	if (icon.brightness) {
		brighten(sprite, icon.brightness);
	}

	var ratio = sprite.width / sprite.height;
	sprite.height = x_abs(icon.size);
	sprite.width = sprite.height * ratio;	
	
	icon.container = new PIXI.Container();
	icon.container.addChild(sprite);
	icon.container.x = x_abs(icon.x);
	icon.container.y = y_abs(icon.y);
	
	if (icon.label && icon.label != "") {
		var size = "bold "+icon.label_font_size*x_abs(FONT_SCALE)+"px " + icon.label_font;
		var text = new PIXI.Text(icon.label, {font: size, fill: icon.label_color, align: "center", strokeThickness: (icon.label_font_size/5), stroke: "black", dropShadow:true, dropShadowDistance:1});		
		text.x += sprite.width/2 - text.width/2;
		text.y += sprite.height;
		icon['container'].addChild(text);
	}

	icon.container.entity = icon; 
	icon.container.alpha = icon.alpha;
	
	make_draggable(icon.container);	

	objectContainer.addChild(icon['container']);
	render_scene();	
	
	room_data.slides[active_slide].entities[icon.uid] = icon;
}
	
function create_icon(icon, cb_after) {
	try {
		var counter = $('button[id*="'+icon.tank+'"]').find("span");
		counter.text((parseInt(counter.text())+1).toString());		
		counter = $("#icon_counter");
		counter.text((parseInt(counter.text())+1).toString());
	} catch(e) {}

	var path = icon.tank;
	var extension = icon.tank.slice(-3);
	if (extension  != "png" && extension != "jpg") {
		path += ".png";
	}
	
	var texture
	if (texture_atlas[path] && !is_safari()) {
		var img = texture_atlas[path];
		texture = new PIXI.Texture(loader.resources[img.sprite].texture, new PIXI.Rectangle(img.x, img.y, img.width, img.height));
	} else {
		texture = PIXI.Texture.fromImage(image_host + path);
	}
	
	resources_loading++;
	var onloaded = function() {
		create_icon_cont(icon, texture);
		if (cb_after) cb_after(icon);
		resources_loading--;
	}
	
	if (!texture.baseTexture.hasLoaded) {
		texture.baseTexture.on('loaded', function(){
			onloaded()
		});
	} else {
		onloaded();
	}
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
function computeControlPoints(K) {
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
		if (drawing.end == "arrow") {
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
		
		if (drawing.end == "arrow") {
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
	graphic.lineStyle(drawing.thickness * x_abs(THICKNESS_SCALE), drawing.color, 1);
	free_draw(graphic, drawing);		
	graphic.graphicsData[0].shape.closed = false;
	init_graphic(drawing, graphic);
}

function create_area(drawing, smooth_point) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.outline_thickness * x_abs(THICKNESS_SCALE), drawing.outline_color, 1);
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
	graphic.lineStyle(drawing.thickness * x_abs(THICKNESS_SCALE), drawing.color, 1);
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

	if (drawing.end == "arrow") {
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
	render_scene();	
	room_data.slides[active_slide].entities[drawing.uid] = drawing;
}

function create_entity(entity) {
	if (room_data.slides[active_slide].entities[entity.uid]) {
		remove(entity.uid);
	}
	if (entity.type == 'background') {
		set_background(entity);
	} else if (entity.type == 'icon') {
		create_icon(entity);
	} else if (entity.type == 'drawing') {
		create_drawing2(entity);
	} else if (entity.type == 'curve') {
		create_curve2(entity);
	} else if (entity.type == 'line') {
		create_line2(entity);
	} else if (entity.type == 'text') {
		create_text(entity);
	} else if (entity.type == 'background_text') {
		create_background_text(entity);
	} else if (entity.type == 'note') {
		create_note(entity);
	} else if (entity.type == 'rectangle') {
		create_rectangle2(entity);
	} else if (entity.type == 'circle') {
		create_circle2(entity);
	} else if (entity.type == 'polygon') {
		create_polygon2(entity);
	} else if (entity.type == 'area') {
		create_area2(entity);
	}
	
	if (entity.container && entity.type != 'background') {
		entity.container.mouseover = function() {
			hovering_over = entity;
		}
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
	if (my_user.logged_in) { //logged in
		$("#store_tactic_popover").show();
		if (tactic_name && tactic_name != "") {
			$("#save").show();
		}
	} else {
		$("#store_tactic_popover").hide();
		$("#save").hide();
	}
	update_lock();
}

function update_lock() {
	var node = $('#lock div');

	if (is_room_locked) {
		node.removeClass('icon-unlock').addClass('icon-lock');
	} else {
		node.removeClass('icon-lock').addClass('icon-unlock');
	}
	
	if (is_room_locked && !my_user.role) {
		$('.left_column').hide();
		$('#slide_interactive').hide();
		$('#slide_static').show();
		$('#slide_table1').hide();
		for (var i in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[i] && room_data.slides[active_slide].entities[i].type == 'note') {
				if (room_data.slides[active_slide].entities[i].container) {
					$('textarea', room_data.slides[active_slide].entities[i].container.menu).prop('readonly', true);
					$('button', room_data.slides[active_slide].entities[i].container.menu).hide();
				}
			}
		}
		if (my_tracker) {
			stop_tracking();
		}
	} else {
		$('.left_column').show();
		$('#slide_interactive').show();
		$('#slide_static').hide();
		$('#slide_table1').show();
		for (var i in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[i] && room_data.slides[active_slide].entities[i].type == 'note') {
				if (room_data.slides[active_slide].entities[i].container) {
					$('textarea', room_data.slides[active_slide].entities[i].container.menu).prop('readonly', false);
					$('button', room_data.slides[active_slide].entities[i].container.menu).show();
				}
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

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function chat(message, color) {
	message = escapeHtml(message);
	message = message.split(":")
	$("#chat_box").append('<div class="chatmsg"><b style="color:' + color + ';">'+message[0]+'</b>: '+ message.slice(1).join(':') +'<br/></div>');
	$("#chat_box").scrollTop($("#chat_box")[0].scrollHeight);
}

function initialize_color_picker(slider_id, variable_name) {
	if (Modernizr.inputtypes.color) {
		$('#' + slider_id + ' ~ input').show();
	} else {
		$('#' + slider_id + ' ~ input').hide();
	}
	
	var color = $('select[id="'+ slider_id + '"]').val();
	window[variable_name] = parseInt('0x'+color.substring(1));
	
	$('#' + slider_id + ' ~ input').attr('value', color);
	$('#' + slider_id + ' ~ input').val(color);
	
	$('#' + slider_id + ' ~ input').on('change', function() {
		var color = $(this).val();
		window[variable_name] = parseInt('0x'+ color.substring(1));
		$('#' + slider_id + '~ span span[data-selected=""]').removeAttr("data-selected");
	});
	
	$('select[id="'+ slider_id + '"]').simplecolorpicker().on('change', function() {
		var color = $('select[id="'+ slider_id + '"]').val();
		window[variable_name] = parseInt('0x'+ color.substring(1));
		$('#' + slider_id + ' ~ input').first().val(color);
		
		if (variable_name == 'track_color') { //dirty track color switch hack
			if (my_tracker) {
				stop_tracking();
			}
			start_tracking({x:2000,y:2000});			
		}	
	});
}

/*
function initialize_slider(slider_id, slider_text_id, variable_name) {
	var slider = $("#"+ slider_id).bootstrapSlider({tooltip:'hide'});
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
*/

function initialize_slider(slider_id, slider_text_id, variable_name) {
	var slider = $("#"+ slider_id);
	$("#"+slider_text_id).val(slider.attr('value'));
	window[variable_name] = parseFloat(slider.attr('value'));
	slider.on("input", function(slideEvt) {
		$("#"+slider_text_id).val(this.value);
		window[variable_name] = parseFloat(this.value);
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
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key) && (room_data.slides[active_slide].entities[key].type == type || !type) && (room_data.slides[active_slide].entities[key].type != 'background')) {
			var entity = room_data.slides[active_slide].entities[key];
			remove(key);
			cleared_entities.push(entity)
			socket.emit('remove', room, key, active_slide);
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
					socket.emit('remove', room, action[1][i].uid, active_slide);
				}
			}
			redo_list.push(action);
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var uid = action[1][i][1].uid;
				if (room_data.slides[active_slide].entities[uid]) { //still exists
					action[1][i][0][0] = room_data.slides[active_slide].entities[uid].x;
					action[1][i][0][1] = room_data.slides[active_slide].entities[uid].y;
					drag_entity(room_data.slides[active_slide].entities[uid], x, y);
					render_scene();
					socket.emit('drag', room, uid, active_slide, x, y);
				}
			}
			redo_list.push(action);
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				delete entity.container;
				socket.emit('create_entity', room, entity, active_slide);
				create_entity(entity);
			}
			redo_list.push(action);
		} else if (action[0] == "select") {
			var new_selected_entities = [];
			for (var i in action[2]) {
				var entity = action[2][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					new_selected_entities.push(entity);
				}
			}
			deselect_all();
			selected_entities = new_selected_entities;
			select_entities();
			redo_list.push(action);
			render_scene();
		}
	}
}

function redo() {
	var action = redo_list.pop();
	if (action) {
		if (action[0] == "add") {
			for (var i in action[1]) {
				if (action[1][i].uid) {
					socket.emit('create_entity', room, action[1][i], active_slide);
					create_entity(action[1][i]);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var uid = action[1][i][1].uid;
				if (room_data.slides[active_slide].entities[uid]) { //still exists
					action[1][i][0][0] = room_data.slides[active_slide].entities[uid].x;
					action[1][i][0][1] = room_data.slides[active_slide].entities[uid].y;
					drag_entity(room_data.slides[active_slide].entities[uid], x, y);
					render_scene();
					socket.emit('drag', room, uid, active_slide, x, y);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					remove(entity.uid);
					delete entity.container;
					socket.emit('remove', room, entity.uid, active_slide);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "select") {
			var new_selected_entities = [];
			for (var i in action[1]) {
				var entity = action[1][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					new_selected_entities.push(entity);
				}
			}
			
			deselect_all();
			selected_entities = new_selected_entities;
			select_entities();
			undo_list.push(action);
			render_scene();
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
		socket.emit('remove', room, entity.uid, active_slide);
	}
	selected_entities = [];
	undo_list.push(["remove", cleared_entities]);
	if (active_context == "drag_context") {
		active_context = context_before_drag;
	}
}

function drag_entity(entity, x, y) {
	entity.container.x += x_abs(x-entity.x);
	entity.container.y += y_abs(y-entity.y);
	entity.x = x;
	entity.y = y;
	if (entity.type == 'note') {
		align_note_text(entity);
	}
	if (entity.container) {
		objectContainer.removeChild(entity.container);
		objectContainer.addChild(entity.container);
	}
	
	render_scene();	
}

function find_first_slide() {
	var first = Math.pow(2, 52);
	var uid = 0;
	for (var key in room_data.slides) {
		var order = room_data.slides[key].order

		
		if (order < first) {
			first = order;
			uid = key;
		}
	}
	return uid;
}

function find_previous_slide(upper_bound) {
	var largest = -9007199254740990;	
	var uid = 0;
	for (var key in room_data.slides) {
		var order = room_data.slides[key].order
		if ( order < upper_bound && order > largest) {
			largest = order;
			uid = key;
		}
	}
	return uid;
}

function find_next_slide(lower_bound) {
	var smallest = 9007199254740991;	
	var uid = 0;
	for (var key in room_data.slides) {
		var order = room_data.slides[key].order
		if ( order > lower_bound && order < smallest) {
			smallest = order;
			uid = key;
		}
	}
	return uid;
}

function hash(uid) {
	var hash = 0;
	for (var i = 0; i < uid.length; i++) {
		hash += uid.charCodeAt(i);
	}
	return hash;
}

function resolve_order_conflicts(slide) {
	for (var key in room_data.slides) {
		if (room_data.slides[key].order == slide.order) {
			var new_order;
			if (hash(slide.uid) < hash(key)) {
				var prev_slide = find_previous_slide(slide.order);
				var last_order = 0;
				if (prev_slide != 0) {
					last_order = room_data.slides[prev_slide].order;
				}
				slide.order = Math.floor((slide.order - last_order) / 2);
			} else {
				var next_slide = find_next_slide(slide.order);
				var next_order = slide.order + 4294967296;
				if (next_slide != 0) {
					next_order = room_data.slides[next_slide].order;
				}					
				slide.order = Math.floor((next_order - slide.order) / 2);						
			}
			
			resolve_order_conflicts(slide); //we do this again because it might still not be unique
			return;
		}
	}
}

function update_slide_buttons() {
	var prev_slide_uid = find_previous_slide(room_data.slides[active_slide].order);
	var next_slide_uid = find_next_slide(room_data.slides[active_slide].order);
	
	if (prev_slide_uid == 0) {
		document.getElementById("prev_slide").disabled = true;
	} else {
		document.getElementById("prev_slide").disabled = false;
	}
	if (next_slide_uid == 0) {
		document.getElementById("next_slide").disabled = true;
	} else {
		document.getElementById("next_slide").disabled = false;
	}
	if (Object.keys(room_data.slides).length == 1) {
		document.getElementById("remove_slide").disabled = true;
	} else {
		document.getElementById("remove_slide").disabled = false;
	}
	
	if (room_data.slides[active_slide].show_grid) {
		grid_layer.visible = true;
	} else {
		grid_layer.visible = false;
	}
	
	var name = room_data.slides[active_slide].name;
	$('#slide_name_field').val(name);
	$('#slide_name_field2').val(name);
	$('#slide_table').empty();
		
	var current_slide_uid = find_first_slide();
	do {
		var name = room_data.slides[current_slide_uid].name;
				
		if (current_slide_uid == active_slide) {
			$('#slide_table').append("<tr id='" + current_slide_uid + "' style='background-color:#ADD8E6'><td><a id='" + current_slide_uid + "'>" + name + "</a></td></tr>");
		} else {
			$('#slide_table').append("<tr id='" + current_slide_uid + "'><td><a id='" + current_slide_uid + "'>" + name + "</a></td></tr>");
		}
		
		current_slide_uid = find_next_slide(room_data.slides[current_slide_uid].order);
	} while (current_slide_uid != 0);
}

function transition(slide) {	
	var to_remove = [];
	var to_add = [];
	var to_transition = [];
	 
	for (var key in room_data.slides[active_slide].entities) { 
		if (room_data.slides[slide].entities[key]) {
			to_transition.push(key);
		} else {
			to_remove.push(key);
		}
	}	
	for (var key in room_data.slides[slide].entities) {
		if (!room_data.slides[active_slide].entities.hasOwnProperty(key)) {
			to_add.push(key);
		}
	}
	for (var i in to_remove) {
		var key = to_remove[i];
		remove(key, true);
	}

	var new_background_uid;
	for (var i in to_transition) {
		remove(to_transition[i], true);
		to_add.push(to_transition[i]);
		
		//take over the container
		/*
		var key = to_transition[i];
		room_data.slides[slide].entities[key].container = room_data.slides[active_slide].entities[key].container;
		delete room_data.slides[active_slide].entities[key].container;
		if (room_data.slides[slide].entities[key].container) {
			room_data.slides[slide].entities[key].container.entity = room_data.slides[slide].entities[key];
		}

		if (room_data.slides[slide].entities[key].type == "background") {
			new_background_uid = key;
		} else {
			room_data.slides[slide].entities[key].container.x += x_abs(room_data.slides[slide].entities[key].x-room_data.slides[active_slide].entities[key].x);
			room_data.slides[slide].entities[key].container.y += y_abs(room_data.slides[slide].entities[key].y-room_data.slides[active_slide].entities[key].y);
			if (room_data.slides[slide].entities[key].type == 'note') {
				align_note_text(room_data.slides[slide].entities[key]);
			}
		}
		*/
	}

	active_slide = slide;
	
	var add_other_entities = function() {
		try {
			to_add.sort(function(a,b) {	
				return room_data.slides[slide].entities[a].z_index - room_data.slides[slide].entities[b].z_index;
			});
		} catch (e) {}
		
		for (var i in to_add) {
			var key = to_add[i];
			create_entity(room_data.slides[slide].entities[key]);
		}
		render_scene();
	}

	//we need to set the background first cause the canvases may need to be resized before we can draw on them
	if (new_background_uid) {
		set_background(room_data.slides[slide].entities[new_background_uid], function() {
			add_other_entities();
		});
	} else {
		add_other_entities();
	}
		
	update_slide_buttons();
}

function add_entities(entities) {
	
}

function change_slide(slide) {
	if (active_slide == slide) {
		return;
	}
	undo_list = [];
	redo_list = [];
	deselect_all();
	transition(slide);	
}

//create a new slide based on slide
function create_new_slide(slide) {	
	var new_slide = {};
	new_slide.show_grid = room_data.slides[slide].show_grid;
	new_slide.z_top = room_data.slides[slide].z_top;
	new_slide.uid = newUid();
	
	//generate a new name for the slide
	var new_name = room_data.slides[slide].name;
	var res = new_name.split(' ');
	if (!isNaN(parseFloat(res[res.length-1]))) { //ends with a number
		res[res.length-1] = '' + (parseFloat(res[res.length-1]) + 1);
		new_name = res.join(' ');
	} else {
		new_name = new_name + ' 1';
	}
	new_slide.name = new_name;
	new_slide.entities = {};
	
	for (var key in room_data.slides[slide].entities) {
		var temp = room_data.slides[slide].entities[key].container;
		delete room_data.slides[slide].entities[key].container;
		new_slide.entities[key] = JSON.parse(JSON.stringify(room_data.slides[slide].entities[key]));
		room_data.slides[slide].entities[key].container = temp;
	}
	
	
	
	var new_order;
	var next_slide_uid = find_next_slide(room_data.slides[slide].order);
		
	if (next_slide_uid == 0) {
	  new_order = room_data.slides[slide].order + 4294967296;
	} else {
	  new_order = room_data.slides[slide].order + Math.floor((room_data.slides[next_slide_uid].order - room_data.slides[slide].order) / 2);
	  if (new_name == room_data.slides[next_slide_uid].name) {
		  new_slide.name = room_data.slides[slide].name + ' - 1';
	  }
	}

	new_slide.order = new_order;
	return new_slide;
}

function remove_slide(uid) {
	if (Object.keys(room_data.slides).length > 1) {
		if (uid == active_slide) {
			var order = room_data.slides[uid].order;
			var new_slide = find_previous_slide(order);
			if (new_slide == 0) {
				new_slide = find_next_slide(order);
			}
			change_slide(new_slide);
			active_slide = new_slide;
		}
		delete room_data.slides[uid];
	}
	update_slide_buttons();
}

function rename_slide(slide, name) {
	room_data.slides[slide].name = name;
	update_slide_buttons();
}

function add_slide(slide) {
	resolve_order_conflicts(slide);
	room_data.slides[slide.uid] = slide;
	update_slide_buttons();
}

function initialize_map_select(map_select) {
	//sorts maps alphabetically, can't presort cause it depends on language
	var options = map_select.find("option").sort(function(a,b) {
		if ( a.innerHTML < b.innerHTML )
		  return -1;
		if ( a.innerHTML > b.innerHTML )
		  return 1;
		return 0;
	});
	
	map_select.empty().append(options); //ie fix no-op
	map_select.val("");
	
	map_select.change(function() {
		var path = map_select.val();
		if (!background || background.path != path) {
			try_select_map(map_select, path);
		} 
	});	
	
}

function activity_animation(user_id) {
	var user_node = $("#userlist #" + user_id);
	if (!user_node.hasClass('sheen')) {
		user_node.addClass('sheen');
		setTimeout(function () {
			user_node.removeClass('sheen');
		}, 1000)
	}		
}

function try_select_map(map_select, path, custom) {
	var uid = background ? background.uid : newUid();

	var size_x = 0;
	var size_y = 0;

	var data_size = $('option[value="'+ path +'"]').attr('data-size');
	if (data_size) {
		var size = data_size.split('x');
		size_x = parseFloat(size[0]);
		size_y = parseFloat(size[1]);
	}
	
	custom = custom ? true : false;
	var new_background = {uid:uid, type:'background', path:path, size_x:size_x, size_y:size_y, custom:custom};
		
	set_background(new_background, function(success) {
		if (success) {
			socket.emit('create_entity', room, new_background, active_slide);
			render_scene();
		}
	});
}

function add_custom_map(url) {
	var map_select = $("#map_select");
	var node = $('#map_select option[value="' + url + '"]');
	
	if (node.length == 0) {
		var filename = last(url.split('/'));
		var node = $('<option value="' + url + '">' + filename + '</option>');
		map_select.append(node);
	}
	map_select.val(url);
	map_select.selectpicker('refresh');	
} 

//connect socket.io socket
$(document).ready(function() {
	//sorts maps alphabetically, can't presort cause it depends on language
	initialize_map_select($("#map_select"));
	initialize_map_select($("#map_select_wotbase"));
	
	loader.once('complete', function () {
		
		//generate ticks, leveraged from: http://thenewcode.com/864/Auto-Generate-Marks-on-HTML5-Range-Sliders-with-JavaScript
		function ticks(element) {		
			if ('list' in element && 'min' in element && 'max' in element && 'step' in element) {
				var datalist = document.createElement('datalist'),
					minimum = parseFloat(element.getAttribute('min')),
					step = parseFloat(element.getAttribute('step')),
					maximum = parseFloat(element.getAttribute('max'));
					datalist.id = element.getAttribute('list');
					
				if ((Math.abs(maximum - minimum) / step) < 20) {
					for (var i = minimum; i < maximum+step; i = i + step) {
						datalist.innerHTML +="<option value="+i.toFixed(2)+"></option>";
					}
					element.parentNode.insertBefore(datalist, element.nextSibling);
				}
			}
		}
		var lists = document.querySelectorAll("input[type=range][list]"),
		arr = Array.prototype.slice.call(lists);
		arr.forEach(ticks);
		
		
		if (texture_atlas["circle.png"] && !is_safari()) {
			var img = texture_atlas["circle.png"];
			ping_texture = new PIXI.Texture(loader.resources[img.sprite].texture, new PIXI.Rectangle(img.x, img.y, img.width, img.height));
		} else {
			ping_texture = PIXI.Texture.fromImage(image_host + 'circle.png');
		}
		
		// Return a helper with preserved width of cells
		var fixHelper = function(e, ui) {
			ui.children().each(function() {
				$(this).width($(this).width());
			});
			return ui;
		};

		$("#slide_table1 tbody").sortable({
			helper: fixHelper,
			update: function(event, ui) {
				var new_order = 0;
				if (ui.item[0].previousElementSibling) {
					new_order = room_data.slides[ui.item[0].previousElementSibling.id].order;
					if (ui.item[0].nextElementSibling) {
						new_order += room_data.slides[ui.item[0].nextElementSibling.id].order;
						new_order /= 2;
					} else {
						new_order += 4294967296;
					}
				} else {
					new_order = room_data.slides[find_first_slide()].order - 4294967296;
				}
				
				room_data.slides[ui.item[0].id].order = new_order;
				socket.emit('change_slide_order', room, ui.item[0].id, new_order);
				
				update_slide_buttons();
				
			}
		}).disableSelection();

		$('#modal_cancel').click(function (e) {
			$('#myModal').modal('hide');
		});
		
		$('#link_send').click(function (e) {
			var link = $('#send_link').val();
			var i = link.indexOf('room=');
			if (i == -1) {
				alert("No room id found in link.");
			} else {
				tactic_uid = link.slice(i+5).split('&')[0];
				var target = servers[hashstring(tactic_uid) % servers.length];
				$.post('http://'+target+'/add_to_room', {target: tactic_uid, source:room, session_id:$("#sid").attr("data-sid"), host:parse_domain(location.hostname), stored:"false"}).done(function( data ) {
					if (data != "Success") {
						alert(data);
					}
				});
			}
			
			$('#myModal').modal('hide');
		});
		
		$('#use_wotbase').click(function() {
			if ($(this).is(':checked')) {
				$('#map_select_container').hide();
				$('#wotbase_map_select_container').show();
			} else {
				$('#map_select_container').show();
				$('#wotbase_map_select_container').hide();
			}
		});
		
		$('#send_to_link').click(function (e) {
			socket.emit("save_room", room);
			$('#myModal').modal('show');
			$('#myModal').on('shown.bs.modal', function () {
				$("#send_link").focus();
			});
		});

		$('#custom_map').click(function (e) {
			socket.emit("save_room", room);
			$('#map_modal').modal('show');
			$('#map_modal').on('shown.bs.modal', function () {
				$("#send_link").focus();
			});
		});
		
		$('#map_modal_cancel').click(function (e) {
			$('#map_modal').modal('hide');
		});
		
		$('#set_map').click(function (e) {
			var map = $('#map_url').val();
			if (map && map != "") {
				try_select_map($('#map_select'), map, true);
				//add_custom_map(map);
				//$('#map_select').trigger('change');
			}
			$('#map_modal').modal('hide');
		});
		
		//hide all contexts
		$('#contexts ~ div').each(function(){
			$(this).hide();
		})

		//except this one :)
		$('#ping_context').show();
		
		
		$("#store_tactic_popover").hide();
		
		
		$("#save").hide();
		$('#ping').addClass('active');	
		var first_icon = $("#icon_context").find("button:first");
		first_icon.addClass('selected');
		if (first_icon.attr('data-no_color') == 'true') {
			selected_icon_no_color = true;
		} else {
			selected_icon_no_color = false;
		}
		
		selected_icon = first_icon.attr("id");
		if (first_icon.attr('data-scale')) {
			icon_extra_scale = parseFloat(first_icon.attr('data-scale'));
		} else {
			icon_extra_scale = 1;
		}
		
		slide_name = $('#slide_interactive').attr('slide_name');
		
		$('.nav-pills > li > a').click( function() {
			$('.nav-pills > li.active').removeClass('active');
			$(this).parent().addClass('active');
		} );
		
		//color selections
		initialize_color_picker("curve_colorpicker", "curve_color");
		initialize_color_picker("icon_colorpicker", "icon_color");
		initialize_color_picker("draw_colorpicker", "draw_color");
		initialize_color_picker("ping_colorpicker", "ping_color");
		initialize_color_picker("track_colorpicker", "track_color");
		initialize_color_picker("line_colorpicker", "line_color");
		initialize_color_picker("text_colorpicker", "text_color");
		initialize_color_picker("background_text_colorpicker", "background_text_color");
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
		initialize_slider("rectangle_outline_transparancy", "rectangle_outline_transparancy_text", "rectangle_outline_transparancy");
		initialize_slider("rectangle_fill_transparancy", "rectangle_fill_transparancy_text", "rectangle_fill_transparancy");
		initialize_slider("circle_outline_thickness", "circle_outline_thickness_text", "circle_outline_thickness");
		initialize_slider("circle_outline_transparancy", "circle_outline_transparancy_text", "circle_outline_transparancy");
		initialize_slider("circle_fill_transparancy", "circle_fill_transparancy_text", "circle_fill_transparancy");
		initialize_slider("polygon_outline_thickness", "polygon_outline_thickness_text", "polygon_outline_thickness");
		initialize_slider("polygon_outline_transparancy", "polygon_outline_transparancy_text", "polygon_outline_transparancy");
		initialize_slider("polygon_fill_transparancy", "polygon_fill_transparancy_text", "polygon_fill_transparancy");
		initialize_slider("area_outline_thickness", "area_outline_thickness_text", "area_outline_thickness");
		initialize_slider("area_outline_transparancy", "area_outline_transparancy_text", "area_outline_transparancy");
		initialize_slider("area_fill_transparancy", "area_fill_transparancy_text", "area_fill_transparancy");
		initialize_slider("line_thickness", "line_thickness_text", "line_thickness");
		initialize_slider("draw_thickness", "draw_thickness_text", "draw_thickness");
		initialize_slider("curve_thickness", "curve_thickness_text", "curve_thickness");
		initialize_slider("font_size", "font_size_text", "font_size");
		initialize_slider("background_font_size", "background_font_size_text", "background_font_size");
		initialize_slider("label_font_size", "label_font_size_text", "label_font_size");
		initialize_slider("icon_size", "icon_size_text", "icon_size");
		initialize_slider("icon_brightness", "icon_brightness_text", "icon_brightness");
		initialize_slider("ping_size", "ping_size_text", "ping_size");
				
		$('html').click(function(e) {
			if (e.target.id != 'tactic_name') {
				$('[data-toggle="popover"]').popover('hide');
			}
		});
		
		$('[data-toggle="popover"]').popover({
			container: 'body',
			trigger: 'manual',
			html: 'true',
			template: '<div class="popover popover-medium" style="width: 300px;"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"></div></div></div>',
			content: function() {
				return $('#popover-content');
			}
		}).click(function(e) {
			$(this).popover('toggle');
			document.getElementById("tactic_name").setAttribute("value", tactic_name);
			var popover = $(this);
			$(document).on('click', '#store_tactic', function(e) {
				var name = $(document).find('#tactic_name')[0].value;
				name = escapeHtml(name);
				if (name == "") {
					alert("Empty name, tactic not stored");
				} else {
					tactic_name = name;
					document.title = "Tactic - " + tactic_name;
					socket.emit("store", room, name);
					$("#save").show();
					alert("Tactic stored as: " + name);
					e.stopPropagation();
				}
			});
			e.stopPropagation();
		});
		
		$('#slide_table').on('click', 'tr', function() {
			var new_slide = $(this).attr('id');
			if (active_slide == new_slide) {return;}
			socket.emit("change_slide", room, new_slide);
			change_slide(new_slide);
		});
		
		$('#prev_slide').click(function() {
			var prev_slide_uid = find_previous_slide(room_data.slides[active_slide].order);
			if (prev_slide_uid != 0) {
				socket.emit("change_slide", room, prev_slide_uid);
				change_slide(prev_slide_uid);
			}
		});
		$('#next_slide').click(function() {
			var next_slide_uid = find_next_slide(room_data.slides[active_slide].order);
			if (next_slide_uid != 0) {
				socket.emit("change_slide", room, next_slide_uid);
				change_slide(next_slide_uid);
			}
		});
		$('#new_slide').click(function() {
			var new_slide = create_new_slide(active_slide);
			socket.emit("new_slide", room, new_slide);			
			add_slide(new_slide);
			change_slide(new_slide.uid);
		});
		$('#remove_slide').click(function() { //removed active_slide
			if (Object.keys(room_data.slides).length > 1) {
				socket.emit('remove_slide', room, active_slide);
				remove_slide(active_slide);
			}
		});
		$('#save').click(function() { 
			if (tactic_name && tactic_name != "") {
				socket.emit("store", room, tactic_name);
			}
		});
		$("#slide_name_field").focusout(function() {
			rename_slide(active_slide, $(this).val());
			socket.emit("rename_slide", room, active_slide, $(this).val());
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
				socket.emit("chat", room, message, chat_color);
				chat(message, chat_color);
				$("#chat_input").val("");
			}
		});

		$('#export').click(function () {
			render_scene();	
			var new_renderer = new PIXI.CanvasRenderer(size, size,{backgroundColor : 0xBBBBBB});
			new_render_scene();			

			$.getScript("http://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2014-11-29/FileSaver.min.js", function() {
				$.getScript("http://cdnjs.cloudflare.com/ajax/libs/javascript-canvas-to-blob/3.3.0/js/canvas-to-blob.min.js", function() {
					new_renderer.view.toBlob(function(blob){
						if (tactic_name && tactic_name != "") {
							saveAs(blob, tactic_name + ".jpg");
						} else {
							saveAs(blob, "map.jpg");
						}	
					});
				});					
			});
			
			// if (is_ie() || is_edge()) {
				// var win=window.open();
				// win.document.write("<img src='" + data + "'/>");
			// } else {
				// var link = document.createElement("a");
				// link.setAttribute("target","_blank");
				// link.setAttribute("href", data);
				// if (tactic_name && tactic_name != "") {
					// link.setAttribute("download", tactic_name + ".jpg");
				// } else {
					// link.setAttribute("download", "map.jpg");
				// }
				// document.body.appendChild(link);
				// link.click();
				// document.body.removeChild(link);
			// }
		});
		
		
		$('#backup').click(function () {
			$.getScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/2.5.0/jszip.min.js", function(){
				var original_slide = active_slide;
				var zip = new JSZip();
				var new_renderer = new PIXI.CanvasRenderer(size, size, {backgroundColor : 0xBBBBBB});
				var first_slide_uid = find_first_slide();
				var n = 1;
				
				//this code is a synchronous loop with asynchronous calls
				var loop = function(slide_uid) {
					change_slide(slide_uid);
					var it = setInterval(function() {
						if (resources_loading == 0) {
							new_renderer.render(stage);
							var data = new_renderer.view.toDataURL("image/jpeg", 0.9);
							data = data.replace("data:image/jpeg;base64,","");
							zip.file(n.toString() + '-' + room_data.slides[slide_uid].name + ".jpg", data, {base64:true});
							n++;
							next_slide_uid = find_next_slide(room_data.slides[slide_uid].order);
							if (next_slide_uid != 0) {
								clearInterval(it);
								loop(next_slide_uid);
							} else { //loop ended
								clearInterval(it);
								new_renderer.destroy();
								
								var container_backups = {}		
								for (var key in room_data.slides[active_slide].entities) {
									if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
										if (room_data.slides[active_slide].entities[key].container) {
											container_backups[key] = room_data.slides[active_slide].entities[key].container;
											delete room_data.slides[active_slide].entities[key].container
										}
									}
								}

								zip.file("tactic.json", JSON.stringify(room_data, null, 2));
								
								
								for (var key in room_data.slides[active_slide].entities) {
									if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
										if (container_backups[key]) {
											room_data.slides[active_slide].entities[key].container = container_backups[key];
										}
									}
								}

								$.getScript("http://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2014-11-29/FileSaver.min.js", function(){
									var blob = zip.generate({type:"blob"});
									if (tactic_name && tactic_name != "") {
										saveAs(blob, tactic_name + ".zip");
									} else {
										saveAs(blob, "backup.zip");
									}						
								});
							
								change_slide(original_slide);
								render_scene();	
							}
							
						}
					}, 50);
				};
				loop(first_slide_uid);
			});
			
		});

		$('.icon_group').each(function () {
			var link = this.id;
			$('#' + link).click(function () {				
				var icons = $('#' + link + "_list").text().split('\n');
				icons = icons.map(function (str) {
				   return encodeURIComponent(str.trim());
				});
				icons = icons.filter(function (str) {
				   if (str == "") return false;
				   return true;
				});
				var path = $('#' + link + "_list").attr('data-path')
				var scale = parseFloat($('#' + link + "_list").attr('data-scale'));
				var height = parseFloat($('#' + link + "_list").attr('data-height'));
				var no_color = $('#' + link + "_list").attr('data-no_color');
				var style = $('#' + link + "_list").attr('data-style');
				
				if (!$.trim($('#' + link + '_menu').html())) {
					if (style) {
						for (var i in icons) {
							$('#' + link + '_menu').append('<button data-toggle="tooltip" title="'+ icons[i] + '" class="tank_select" data-scale="' + scale + '" data-no_color="' + no_color + '" id="' + path + '/' + icons[i] + '"><div class="' + path + ' ' + path + '-' + icons[i].slice(0, -4) + ' inline"></div></button>')
						}	
					} else {
						for (var i in icons) {
							$('#' + link + '_menu').append('<img height=' + height + ' class="tank_select" data-scale="' + scale + '" data-no_color="' + no_color + '" id="' + path + '/' + icons[i] + '" data-toggle="tooltip" title="'+ icons[i] +'" src=' + image_host + path + '/' + icons[i] + '></img>');
						}					
					}
				}	

			});
		});
		
		$("[id^=icon][id$=context]").each(function() {
			$(this).find('a:first').trigger("click")
		});
		
		$('#lock').click(function () {
			var node = $(this).find('div');
			if (node.hasClass('icon-lock')) {
				is_room_locked = false;				
			} else {
				is_room_locked = true;
			}
			update_lock();
			socket.emit("lock_room", room, is_room_locked);
		});
		
		$('#grid').click(function () {
			grid_layer.visible = !grid_layer.visible;
			room_data.slides[active_slide].show_grid = grid_layer.visible;
			if (can_edit()) {
				socket.emit("show_grid", room, active_slide, grid_layer.visible);
			}
			render_scene();
		});

		//tool select
		$('#contexts').on('click', 'button', function (e) {
			stop_drawing();
			setup_mouse_events(undefined, undefined);
			new_drawing = null;
			if (graphics) {
				objectContainer.removeChild(graphics)
			}
			if (new_drawing) {
				new_drawing = undefined;
			}	
			current_text_element = undefined;
			
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
			var new_menu = $(this).attr('id')+"_context";
			
			if (game == 'sc2') {
				if (new_menu.substring(0, 4) == 'icon') {
					$('#icon_options').detach().appendTo($('#' + new_menu));
					var label = $('#icon_label_container').detach();
					$('#' + new_menu).find('h4').after(label);
				}
			}
						
			if ($(this).attr('data-context')) {
				new_context = $(this).attr('data-context')+"_context";;
			}
			if (my_tracker) {
				stop_tracking();
			} 
			if (new_context == "track_context") {
				start_tracking({x:2000,y:2000});
			}
			
			if (active_menu == new_menu) { return; } 	
			if (new_context != "remove_context") {
				deselect_all();
				render_scene();
			}
						
			$('#'+active_menu).hide();
			$('#'+new_menu).show();	
			active_menu = new_menu;	
			active_context = new_context;
		});	
		
		$('#rectangle_type button[data-style="full"]').addClass('active');	
		$('#rectangle_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#circle_type button[data-style="full"]').addClass('active');
		$('#circle_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#circle_draw_style button[data-draw_style="edge"]').addClass('active');
		$('#circle_draw_style').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#polygon_type button[data-style="full"]').addClass('active');
		$('#polygon_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});

		$('#area_type button[data-style="full"]').addClass('active');
		$('#area_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#line_type button[data-style="full"]').addClass('active');	
		$('#line_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#line_end_type button[data-end="arrow"]').addClass('active');	
		$('#line_end_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});

		$('#curve_type button[data-style="full"]').addClass('active');
		$('#curve_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#curve_end_type button[data-end="arrow"]').addClass('active');
		$('#curve_end_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});	
		
		$('#track_shape button[data-cursor="cursor"]').addClass('active');
		$('#track_shape').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');		
			if (my_tracker) {
				stop_tracking();
			}
			start_tracking({x:2000,y:2000});
		});	
		
		$('#draw_type button[data-style="full"]').addClass('active');	
		$('#draw_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});

		$('#draw_end_type button[data-end="arrow"]').addClass('active');	
		$('#draw_end_type').on('click', 'button', function (e) {
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
		$('#clear_note').click(function() {
			clear("note");
		});		

		//tank icon select
		$('body').on('click', '.tank_select', function() {
			$('.tank_select.selected').removeClass('selected'); // removes the previous selected class
			$(this).addClass('selected'); // adds the class to the clicked image
			selected_icon = $(this).attr('id');
			
			if ($(this).attr('data-no_color') == 'true') {
				selected_icon_no_color = true;
			} else {
				selected_icon_no_color = false;
			}
			if ($(this).attr('data-scale')) {
				icon_extra_scale = parseFloat($(this).attr('data-scale'));
			} else {
				icon_extra_scale = 1;
			}
		});
		
		$(renderer.view).attr('style', 'z-index: 0; position: absolute;');
		$(".edit_window").append("<div id='render_frame' style='height:" + size_y + "px; width:" + size_x + "px;'></div>");
		$("#render_frame").append(renderer.view);
		$(renderer.view).parent().append(temp_draw_canvas);
		$(renderer.view).parent().append(draw_canvas);
		$(temp_draw_canvas).hide();
		$(draw_canvas).hide();
					
		assets_loaded = true;
	});
	
	//network data responses
	socket.on('connect', function() { 
		if (assets_loaded) {
			socket.emit('join_room', room, game);
		} else {
			var timer = setInterval(function() {
				if (assets_loaded) {
					socket.emit('join_room', room, game);
					clearInterval(timer);
				}
			}, 20);
		}
	});
	
	function cleanup() {
		deselect_all();
		undo_list = [];
		redo_list = [];
		if (active_slide) {
			for (var key in room_data.slides[active_slide].entities) {
				if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
					var entity = room_data.slides[active_slide].entities[key];
					remove(key);
				}
			}
		}
		room_data = {};
	}
	
	socket.on('room_data', function(new_room_data, my_id, new_tactic_name) {
		cleanup();

		room_data = new_room_data;
		active_slide = room_data.active_slide;
		is_room_locked = room_data.locked;
		my_user_id = my_id;
		tactic_name = new_tactic_name;
		if (tactic_name && tactic_name != "") {
			document.title = "Tactic - " +  tactic_name;
		}
		for (var user in room_data.userlist) {
			add_user(room_data.userlist[user]);
		}

		var entities = [];
		var background_entity;
		for (var key in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[key].type == 'background') {
				background_entity = room_data.slides[active_slide].entities[key];
			} else {
				entities.push(room_data.slides[active_slide].entities[key])
			}
		}
		
		try {
			entities.sort(function(a,b) {
				return a.z_index - b.z_index;
			})
		} catch (e) {}
		
		if (background_entity) {
			//we need to set the background before we add other entities
			set_background(background_entity, function() {
				//TODO: sort entities by z_index
				for (var i in entities) {
					create_entity(entities[i]);
				}
				render_scene();
			});
		}
						
		for (var key in room_data.trackers) {
			create_tracker(room_data.trackers[key]);
		}
		
		delete room_data.trackers;
		update_slide_buttons();
		update_my_user();
		
		if (my_tracker) {
			stop_tracking();
			start_tracking({x:2000,y:2000});
		}
	});

	socket.on('create_entity', function(entity, slide, user_id) {
		if (slide != active_slide) {
			room_data.slides[slide].entities[entity.uid] = entity;
		} else {
			create_entity(entity);
		}
		activity_animation(user_id)
	});
	
	socket.on('drag', function(uid, slide, x, y, user_id) {
		if (room_data.slides[slide].entities[uid].x == x && room_data.slides[slide].entities[uid].y == y) {
			return; //ignore, it's probably an echo of what I've sent
		}
		if (slide != active_slide) {
			room_data.slides[slide].entities[uid].x = x;
			room_data.slides[slide].entities[uid].y = y;
		} else {
			drag_entity(room_data.slides[active_slide].entities[uid], x, y);
		}
		activity_animation(user_id)
	});

	socket.on('ping_marker', function(x, y, color, size, user_id) {
		ping(x, y, color, size);
		activity_animation(user_id)
	});

	socket.on('chat', function(message, color) {
		chat(message, color);
	});

	
	socket.on('identify', function(user) {
		if (!my_user) {
			my_user = user;
		} else {
			my_user.logged_in = user.logged_in;
			my_user.name = user.name;
		}
		update_my_user();
	});

	socket.on('remove', function(uid, slide, user_id) {
		if (slide != active_slide) {
			delete room_data.slides[slide].entities[uid];
		} else {
			remove(uid);
		}
		activity_animation(user_id)
	});

	socket.on('add_user', function(user) {
		add_user(user);
	});

	socket.on('remove_user', function(user) {
		remove_user(user);
	});

	socket.on('lock_room', function(is_locked, user_id) {
		is_room_locked = is_locked;
		update_lock();
		activity_animation(user_id)
	});

	socket.on('change_slide', function(uid) {
		if (uid != active_slide) {
			change_slide(uid);
		}
	});
	
	socket.on('new_slide', function(slide, user_id) {
		add_slide(slide);
		activity_animation(user_id)
	});
	
	socket.on('remove_slide', function(slide, user_id) {
		if(Object.keys(room_data.slides) <= 1) {
			socket.emit('join_room', room, game);
			return;
		}
		remove_slide(slide);
		activity_animation(user_id)
	});

	socket.on('rename_slide', function(slide, name, user_id) {
		rename_slide(slide, name);
		activity_animation(user_id)
	});

	socket.on('change_slide_order', function(slide, order, user_id) {
		room_data.slides[slide].order = order;
		update_slide_buttons();
		activity_animation(user_id)
	});
	
	socket.on('track', function(tracker, user_id) {
		if (trackers[tracker.uid]) {
			remove_tracker(uid);
		}
		create_tracker(tracker);
		activity_animation(user_id);
	});
	
	socket.on('track_move', function(uid, delta_x, delta_y) {
		move_tracker(uid, delta_x, delta_y)
	});

	socket.on('stop_track', function(uid) {
		remove_tracker(uid)
	});
	
	socket.on('show_grid', function(slide, bool, user_id) {
		room_data.slides[slide].show_grid = bool;
		if (slide == active_slide) {
			grid_layer.visible = bool;
			render_scene();
		}
		activity_animation(user_id)
	});
	
	socket.on('force_reconnect', function() {
		location.reload();
	});
});
