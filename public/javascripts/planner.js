//var servers = $("#socket_io_servers").attr("data-socket_io_servers").split(',')
var servers = [location.host];

var is_video_replay = false;
if (location.pathname.indexOf('planner3') != -1) {
	is_video_replay = true;
}

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
	assets.push(image_host+"rotate.png");
	assets.push(image_host+"bb.png", image_host+"cv.png", image_host+"ca.png", image_host+"dd.png");
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "blitz") {
	assets.push(image_host+"rotate.png");
	assets.push(image_host+"light.png", image_host+"medium.png", image_host+"heavy.png", image_host+"td.png", image_host+"arty.png");	
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "aw") {
	assets.push(image_host+"rotate.png");
	loader.add("aw_assets.png", asset_host + "aw_assets.png");
	loader.add("aw_assets.json",  asset_host +  "aw_assets.json");
} else if (game == "lol") {
	assets.push(image_host+"rotate.png");
	assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");
} else if (game == "hots") {
	assets.push(image_host+"rotate.png");
	loader.add("hots_assets.png", asset_host + "hots_assets.png");
	loader.add("hots_assets.json",  asset_host +  "hots_assets.json");
} else {
	assets.push(image_host+"rotate.png");
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
var wot_live = location.search.indexOf('wot_live') != -1;
var adjust_all_zoom = location.search.indexOf('adjust_zoom') != -1;

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

/*
//get sid from cookie, maybe later
function getCookie(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

var sid = getCookie("connect.sid");
*/

var sid = $("#sid").attr("data-sid")

var socket;
try {
	socket = io.connect(server, {
		reconnectionDelay: 100,
		reconnectionDelayMax: 500,
		'reconnection limit' : 1000,
		'max reconnection attempts': Infinity,
		query: "connect_sid="+sid+"&host="+parse_domain(location.hostname)
	});	
} catch(e) {
	console.log(e);
}

//generate unique id
var valid_chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function newUid() {
	var text = "";
	for(var i=0; i < 14; i++ ) {
		text += valid_chars.charAt(Math.floor(Math.random() * valid_chars.length));
	}
	return text;
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

function random_color(){
    var r = (Math.round(Math.random() * 256)).toString(16);
    var g = (Math.round(Math.random() * 256)).toString(16);
    var b = (Math.round(Math.random() * 256)).toString(16);
    return '#' + ("00" + r.toString(16)).slice(-2) + ("00" + g.toString(16)).slice(-2) + ("00" + b.toString(16)).slice(-2);
}

var ARROW_LOOKBACK = 4;
var MOUSE_DRAW_SMOOTHING = 0.5;
var LEFT_BAR_MIN_WIDTH = 340;
var RIGHT_BAR_MIN_WIDTH = 302;
var SINGLE_SIDE_BAR_MIN_WIDTH;
if (game == 'blitz') {
	SINGLE_SIDE_BAR_MIN_WIDTH = 350;
} else {
	SINGLE_SIDE_BAR_MIN_WIDTH = 630;
}
var MIN_POLYGON_END_DISTANCE = 0.01; //in ratio to width of map
var MIN_POLYGON_END_DISTANCE_TOUCH = 0.025;
var MIN_TRACK_MOVE_DISTANCE_SQ = 0.01 * 0.01;
var ICON_SCALE = 0.025/20;
var NOTE_SCALE = 0.03;
var THICKNESS_SCALE = 1;
var FONT_SCALE = 0.002;
var TEXT_QUALITY = 8;
var DRAW_QUALITY = 4;
var ARROW_SCALE = 0.008;
var ARROW_SCALE2 = 1.7;
var TEND_SCALE = 0.008;
var TEND_SCALE2 = 1.5;
var MAGIC_NUMBER = 25;
var EPSILON = 0.000000001;
var ROTATE_ARROW_SCALE = 0.05;
var ROTATE_ARROW_MARGIN = 0.02;
var TEXT_BOX_QUALITY = 4;
var VIDEO_EXTENSIONS = ['mp4','webgl','avi'];
var VIDEO_SYNC_DELAY = 10000; //in ms
var MOUSE_IDLE_HIDE_TIME = 5000;
var MAX_CANVAS_SIZE = 4096;
var ICON_LABEL_SCALE = 1;
var TEXT_SCALE = 0.80;
var BACKGROUND_TEXT_SCALE = 0.80;
var PING_TIME = 500; //time ping stays in ms


var dpi;
var chat_color = random_darkish_color();
var room_data;
var active_slide = 0;
var active_context = 'ping_context';
var active_menu = 'ping_context';
var userlist = {};
var selected_icon;
var selected_icon_no_color = false;
var label_position = "pos_bottom";
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
var track_size;
var draw_end_size;
var line_end_size;
var curve_end_size;
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
var drag_delay_running = false;
var current_text_element;
var last_mouse_location;
var ping_texture;
var just_activated;
var select_box;
var rotate_arrow0;
var rotate_arrow1;
var rotate_arrow2;
var rotate_arrow3;
var select_box_dirty = false;
var select_center;
var objectContainer;
var fast_container;
var background_sprite;
var renderer;
var size
var size_x;
var size_y;
var useWebGL;
var last_pan_loc;
var panning;
var last_move_func, last_end_func;
var draw_canvas;
var temp_draw_canvas;
var draw_context;
var temp_draw_context;
var grid_layer;
var zoom_level = 1;
var control_camera = false;
var dragging_enabled = true;

//these variables are only for the video replay room
var offset = 0; // time offset from the server in ms 
var sync_start_time;
var progress = 0;
var progress_update = Date.now();
var video_layer;
var manual_pause = false;
var sync_seek = false;
var sync_event;
var clock_sync_event;
var last_video_sync = null;
var timeline;
var timeline_entities = {}; //time->entity map
var video_ready = false;
var video_paused = true;
var initiated_play = false;
var im_syncing = false;
var idleMouseTimer;
var playback_rate = 1.0;
var base_playback_rate = 1.0;

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
				if (e.keyCode==90) { //z
					undo();
				} else if (e.keyCode==89) { //y
					redo();
				} else if (e.keyCode==65) { //a
					select_all();
					e.preventDefault();
				} else if (e.keyCode==83) { //s
					if (my_user.logged_in && tactic_name && tactic_name != "" && socket) {
						socket.emit("store", room, tactic_name);
					}
				} else if (e.keyCode==67) { //c
					copy();
				} else if (e.keyCode==88) { //x
					cut();
				} else if (e.keyCode==86) { //v
					paste();
				}
			} else if (e.keyCode==32) {
				if (video_layer) {
					if (can_edit()) {
						toggle_play();
						e.preventDefault();
					}
				}
			}
		} else if (e.type == "keyup") {
			if (e.keyCode==46) { //del
				clear_selected();
			} else if (e.keyCode==16) { //shift
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
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
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
		render_scene();
	}
	
	select_entities();
	undo_list.push(clone_action(["add", new_entities]));	
}

function adjust_zoom(entity) {
	if (entity.draw_zoom_level) {
		if (!adjust_all_zoom && entity.type != icon) return;
		var scale = zoom_level / entity.draw_zoom_level;
		switch(entity.type) {
			case 'icon': case 'text': case 'note': case 'background_text':
				entity.container.scale.x = entity.container.orig_scale[0] * scale;
				entity.container.scale.y = entity.container.orig_scale[1] * scale;
				break;
			case 'drawing':
				remove(entity.uid);
				create_drawing2(entity, 1/scale, scale);
				break;
			case 'curve':
				remove(entity.uid);
				create_curve2(entity, 1/scale, scale);
				break;
			case 'line':
				remove(entity.uid);
				create_line2(entity, 1/scale, scale);
				break;
			case 'rectangle':
				remove(entity.uid);
				create_rectangle2(entity, 1/scale, scale);
				break;
			case 'circle':
				remove(entity.uid);
				create_circle2(entity, 1/scale, scale);
				break;
			case 'polygon':
				remove(entity.uid);
				create_polygon2(entity, 1/scale, scale);
				break;
			case 'area':
				remove(entity.uid);
				create_area2(entity, 1/scale, scale);
				break;
		}
	}
}

function zoom(amount, isZoomIn, center, e) {
	var old_zoom_level = zoom_level
	var direction = isZoomIn ? 1 : -1;
	var factor = (1 + amount * direction);
	
	objectContainer.scale.x *= factor;
	objectContainer.scale.y *= factor;

	//pan to cursor
	objectContainer.x -= x_abs(center[0] * (1 - 1/factor) * objectContainer.scale.x);
	objectContainer.y -= y_abs(center[1] * (1 - 1/factor) * objectContainer.scale.y);

	correct();

	zoom_level = size_y / (background_sprite.height * objectContainer.scale.y);
	var zoom_factor = old_zoom_level / zoom_level;
	
	for (var i in room_data.slides[active_slide].entities) {
		var entity = room_data.slides[active_slide].entities[i];
		if (entity.container && entity.draw_zoom_level) {
			adjust_zoom(entity)
		}
	}
}

function emit_pan_zoom() {
	socket.emit('pan_zoom', room, zoom_level, from_x_local_vect(objectContainer.x), from_y_local_vect(objectContainer.y));
}

function pan_zoom(new_zoom_level, x, y) {	
	var zoom_factor = zoom_level / new_zoom_level;

	objectContainer.scale.x *= zoom_factor;
	objectContainer.scale.y *= zoom_factor;	
	
	objectContainer.x = to_x_local_vect(x);
	objectContainer.y = to_y_local_vect(y);
	
	zoom_level = size_y / (background_sprite.height * objectContainer.scale.y);
	$('#zoom_level').text((1/zoom_level).toFixed(2));
	render_scene();
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

var pan_state = {}
function on_pan(e) {
	limit_rate(15, pan_state, function() {
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		var diff_x = mouse_location.x - last_pan_loc[0];
		var diff_y = mouse_location.y - last_pan_loc[1];
		last_pan_loc = [mouse_location.x, mouse_location.y];
		objectContainer.x += diff_x;
		objectContainer.y += diff_y;
		correct();
	});
}

//resize the render window
function resize_renderer(new_size_x, new_size_y) {	
	if (video_layer) {
		var videoRatio;
		if (video_layer[0].videoWidth > 0) {
			videoRatio = video_layer[0].videoWidth / video_layer[0].videoHeight;
		} else {
			videoRatio = 16.0/9.0;
		}
		var windowRatio = (new_size_x/new_size_y);
		var border = (new_size_x * (1 - videoRatio/windowRatio) / 2);
		
		$("#edit_window").css('left', '' + border + 'px');
		
		new_size_x = new_size_x - 2 * border;
		video_layer.width(new_size_x);
		video_layer.height(new_size_y);
	} else {
		$("#edit_window").css('left', '0px');	
	}
	
	var last_size_x = size_x;
	var last_size_y = size_y;
	size_x = new_size_x;
	size_y = new_size_y;
	
	draw_canvas.width = new_size_x;
	draw_canvas.height = new_size_y;
	temp_draw_canvas.width = new_size_x;
	temp_draw_canvas.height = new_size_y;

	objectContainer.scale.x *= size_y/last_size_y;
	objectContainer.scale.y *= size_y/last_size_y;

	$("#edit_window").css('width', '' + new_size_x + 'px');
	$("#edit_window").css('height', '' + new_size_y + 'px');

	renderer.resize(new_size_x, new_size_y);

	grid_layer.width = background_sprite.width;
	grid_layer.height = background_sprite.height;
	
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	zoom(0, true, [from_x_local(mouse_location.x), from_y_local(mouse_location.y)]);
};

window.onresize = function() {
	change_background_dim(renderer.view.height)
	
	if (window.location.pathname.indexOf("planner3") != -1) {
		resize_renderer($(window).width(), $(window).height());
		return;
	}
	
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
	
	if (iface_width < (window.innerWidth / 2)) {
		var size_y;
		if ($('#left_side_bar').length) {
			$('#left_side_bar').detach().prependTo($("body"));
			$('#map_select_box').prependTo($("#map_select_section"));
			$('#home_button').prependTo($("#left_navbar"));
			
		}
		size_y = window.innerHeight - 5;
		
		var size_x = size_y * ratio;
		if (size_x + iface_width + MAGIC_NUMBER > window.innerWidth) {
			size_x = window.innerWidth - iface_width - MAGIC_NUMBER;			
			size_y = size_x / ratio;
		}
		resize_renderer(size_x, size_y);
	} else {
		if ($('#left_side_bar').length) {
			$('#left_side_bar').detach().appendTo($("body"));
			$('#map_select_box').prependTo($(".left_column"));
			$('#home_button').prependTo($("#right_navbar"));
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
	render_scene();
};

//Absolute coordinates are coordinates pixi within objectContainer, the main screen graph
//Relative coordinates are coordinates with the left upper corner of the backfround equal to [0,0], the height of the background exactly 1 and the width has the same scale as the hight
//local coordinates are coordinates in px, with [0,0] the upper left corner of the renderer.view dom element. 

//absolute -> relative
function x_rel(x) {
	return x/(background_sprite.height);
}

//relative -> absolute
function x_abs(x) {
	return x*(background_sprite.height);
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
	return objectContainer.x + (x * background_sprite.height) * objectContainer.scale.x;
}

//relative -> local, only scaling, no offset
function to_x_local_vect(x) {
	return (x * background_sprite.height) * objectContainer.scale.x;
}

//local -> relative
function from_x_local(x) {
	return (x - objectContainer.x) / objectContainer.scale.x / background_sprite.height;
}

//local -> relative, only scaling, no offset
function from_x_local_vect(x) {
	return x / objectContainer.scale.x / background_sprite.height;
}

//relative -> local
function to_y_local(y) {
	return objectContainer.y +(y * background_sprite.height) * objectContainer.scale.y;
}

//relative -> local, only scaling, no offset
function to_y_local_vect(y) {
	return (y * background_sprite.height) * objectContainer.scale.y;
}

//local -> relaive
function from_y_local(y) {
	return (y - objectContainer.y) / objectContainer.scale.y / background_sprite.height;
}

//local -> relaive, only scaling, no offset
function from_y_local_vect(y) {
	return y / objectContainer.scale.y / background_sprite.height;
}

function mouse_x_abs(x) {
	return x;
}

function mouse_y_abs(y) {
	return y;
}

//translates mouse position from e.data.getLocalPosition(background_sprite) to a relative coordinate
//TODO: consider using renderer.plugins.interaction.eventData.data.global and from_x_local, from_y_local instead
function mouse_x_rel(x) {
	return x/(background_sprite.height / background_sprite.scale.x);
}

//translates mouse position from e.data.getLocalPosition(background_sprite) to a relative coordinate
function mouse_y_rel(y) {
	return y/(background_sprite.height / background_sprite.scale.y);
}

function is_video(path) {
	return get_video_type(path) != "";
}

function get_video_type(path) {
	var extension = path.split('.').pop();
	for (var i = 0; i < VIDEO_EXTENSIONS.length; i++) {
		if (extension.startsWith(VIDEO_EXTENSIONS[i])) {
			return "video/"+VIDEO_EXTENSIONS[i];
		}
	}
	if (path.toUpperCase().indexOf('YOUTUBE') != -1) {
		return "video/youtube";
	}
	if (path.toUpperCase().indexOf('VIMEO') != -1) {
		return "video/vimeo";
	}
	return "";
}

function reset_background() {
	video_ready = false;
	if (video_media) {
		video_media.setCurrentTime(0);
	}
	if (video_player) {
		video_player.pause();
		video_player.remove();
	}
	if ($('#video_player')) {
		$('#video_player').remove();
	}
	video_layer = null;
	$('#left_detect').unbind('mouseenter');
	$('#right_detect').unbind('mouseenter');
	$('#left_side_bar').unbind('mouseleave');
	$('#right_side_bar').unbind('mouseleave');
	$('#left_side_bar').show();
	$('#right_side_bar').show();
	
	clearTimeout(idleMouseTimer);
}

var video_player;
var video_media;
function init_video_controls() {
	$('#left_detect').mouseenter(function() {
		$('#left_side_bar').show();
	});
	$('#right_detect').mouseenter(function() {
		$('#right_side_bar').show();
	});
	$('#left_side_bar').mouseleave(function() {
		$('#left_side_bar').hide();
	});
	$('#right_side_bar').mouseleave(function() {
		$('#right_side_bar').hide();
	});

	$('#left_side_bar').hide();
	$('#right_side_bar').hide();
}

function start_syncing() {
	clearInterval(sync_event);
	im_syncing = true;
	for (var i = 0; i < 5; i++) { //send 10 syncs in quick succession
		setTimeout(function() {
			var frame = video_progress();
			socket.emit("sync_video", room, frame, get_server_time());
		}, i*2000);
	}
	sync_event = setInterval(function() { //sync every 10s
		var frame = video_progress();
		socket.emit("sync_video", room, frame, get_server_time());
	}, 10000);
}

function play_video_controls() {
	$('.mejs-controls').mouseenter(function() {
		$('.mejs-controls').css('opacity', 1);
	});
	$('.mejs-controls').mouseleave(function() {
		$('.mejs-controls').css('opacity', 0);
	});
	$('.mejs-controls').css('opacity', 0);
	if (can_edit()) {
		$('.mejs-controls').show();
	} else {
		$('.mejs-controls').hide();
	}
}

function pause_video_controls() {
	$('.mejs-controls').unbind('mouseenter');
	$('.mejs-controls').unbind('mouseleave');
	$('.mejs-controls').css('opacity', 1);
}

function toggle_play() {
	if (background.is_video) {
		if (video_paused) {
			var frame = video_progress();
			socket.emit("play_video", room, frame, base_playback_rate);
			initiated_play = true;
			play_video_controls()
			start_syncing();
		} else {
			manual_pause = true;
			video_player.pause();
			pause_video_controls();
		}
	}
}

var ignore_jump = false;
function init_video_triggers() {
	video_media.addEventListener('pause', function(e) {
		if (manual_pause) {
			clearInterval(sync_event);
			im_syncing = false;
			video_paused = true;
			socket.emit("pause_video", room, video_progress());
			manual_pause = false;
		}
	});
	
	video_media.addEventListener('play', function(e) {
		if (initiated_play) {	
			start_syncing();
			initiated_play = false;
		} else {
			stop_syncing();
		}
		//TODO: fix dirty hack because the youtube player starts playing when you seek regradless
		if (video_paused) {
			video_player.pause();
			if (last_video_sync) {
				video_media.currentTime = last_video_sync[0];
			} else {
				video_media.currentTime = 0;
			} 
			video_player.pause();
		}
	});
	
	video_media.addEventListener('ended', function(e) {
		if (im_syncing) {
			socket.emit("pause_video", room, 0);
		}
	});
	
	video_media.addEventListener('timeupdate', function(e) {
		progress = video_media.currentTime;
		progress_update = Date.now();
	})
	
	$('.mejs-playpause-button').unbind('click');
	$('.mejs-playpause-button').click(function(e) {
		toggle_play();
		e.preventDefault();
		return false;
	});
	
	//little bit of a hack to detect seeks, cause the seeked event doesn't work so well
	$(".mejs-time-rail").on('mousedown', function() {
		wait_for_seek(function() {
			socket.emit("seek_video", room, video_progress(), get_server_time());
			if (!video_paused) {
				start_syncing();
			}
			rebuild_timeline();
		})
	});	
	

}

function wait_for_seek(cb) {
	var start_time = Date.now();
	var start_frame = video_progress();
	var changed = setInterval(function() {
		var current_frame = video_progress();
		if (Math.abs(video_progress() - (start_frame + (Date.now() - start_time)/1000)) > 0.05) {
			cb();
			clearInterval(changed);
		}
		if (Date.now() - start_time > 10000) {
			clearInterval(changed);
		}
	}, 5);
}

function change_background_dim(height) {	
	var old_zoom_level = zoom_level;

	var ratio = background_sprite.texture.width / background_sprite.texture.height;
	var width = height * ratio; 
	
	var old_height = background_sprite.height;
	background_sprite.width = width;
	background_sprite.height = height;
	grid_layer.width = background_sprite.width;
	grid_layer.height = background_sprite.height;
	var ratio = height/old_height;
	if (ratio != 1) {
		for (let key in room_data.slides[active_slide].entities) {
			var entity = room_data.slides[active_slide].entities[key];
			if (entity.container) {
				entity.container.x *= ratio;
				entity.container.y *= ratio;
				entity.container.width *= ratio;
				entity.container.height *= ratio;
			}
		}
	}
	
	zoom_level = size_y / (background_sprite.height * objectContainer.scale.y);
	pan_zoom(old_zoom_level, from_x_local_vect(objectContainer.x), from_y_local_vect(objectContainer.y))
	
}

function set_background(new_background, cb) {
	if (new_background.path != "") {
		if (!new_background.is_video) {		
			resources_loading++;

			var texture = PIXI.Texture.fromImage(new_background.path);

			var on_loaded = function() {
				reset_background()
				
				background = new_background;
				history[background.uid] = background;
				background_sprite.texture = texture;
		
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
					$('#wotbase_map_select_container').hide();
					$('#map_select_container').show();
				}
			
				if (background.size_x && background.size_y && background.size_x > 0 && background.size_y > 0) {
					$("#map_size").text("("+background.size_x+" x "+background.size_y+")");
				} else {
					$("#map_size").text("");
				}
					
				window.onresize();
				
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
			reset_background();
			
			background = new_background;
			history[background.uid] = background;

			add_custom_map(background.path)
			$('#wotbase_map_select_container').hide();
			$('#map_select_container').show();
						
			var video_type = get_video_type(new_background.path)
			
			video_layer = $('<video />', {
				id: "video_player",
				autoplay: false,
				controls: true
			});
			
			var video_source = $('<source />', {		
				type: video_type,
				src: new_background.path
			});
			
			video_source.appendTo(video_layer);
			video_layer.appendTo($('#video_div'));

			var done = function() {
				window.onresize();
				render_scene();		
				if (cb)	cb(true);					
			}
			
			video_layer.mediaelementplayer({
				videoHeight: '100%',
				loop:false,
				autoPlay:false,
				enableAutosize: true,
				alwaysShowControls: true,
				speeds: ['0.25', '0.50', '1.00', '1.25', '1.50', '2.00'],
				defaultSpeed: '1.00',		
				speedChar: 'x',
				features: ['playpause','speed','progress','current','duration','tracks','volume'],
				success: function(media, node, player) {
					video_media = media;
					video_paused = !room_data.playing;
					video_player = player;

					if (video_type == 'video/youtube') {
						video_media.pluginApi.pauseVideo();
					}
					
					init_video_controls();					
					$('.mejs-controls').css('z-index', 9);
					$('.mejs-controls').css('position', 'fixed');
					$('.mejs-controls').css('left', '0px');
					$('.mejs-controls').css('bottom', '0px');
					$('.mejs-controls').css('height', '3%');
					init_video_triggers();
					timeline = new FastPriorityQueue();
					video_ready = true;
					
					if (room_data.playing) {
						if (room_data.last_sync) {
							handle_play(room_data.last_sync[0], Date.now());
						} else {
							handle_play(0,Date.now());
						}
					} else {
						if (room_data.last_sync) {
							video_media.setCurrentTime(room_data.last_sync[0]);
							video_player.pause();
						}
					}
					
					if (video_media.pluginType == 'youtube') {
						var temp = video_media.pluginType;
						video_player.options.speeds = video_media.pluginApi.getAvailablePlaybackRates().map(function(x) {return x.toFixed(2);});
						video_player.options.defaultSpeed = '1.00';
						video_media.pluginType = 'native';
						video_player.buildspeed(player, player.controls, player.layers, player.media);
						$('.mejs-playpause-button').after($('.mejs-speed-button'));
						video_media.pluginType = temp;
					}
					
					base_playback_rate = 1.0;
					playback_rate = 1.0;			
					
					$('.mejs-speed-button').find('.mejs-speed-selector').on('click', 'input[type="radio"]', function() {
						var newSpeed = parseFloat($(this).attr('value'));
						socket.emit('change_rate', room, newSpeed);
						set_playback_rate(newSpeed, newSpeed);
						start_syncing();
					});
										
					var forceMouseHide = false;
					$(renderer.view).css('cursor', 'none');
					$(renderer.view).mousemove(function(ev) {
						if(!forceMouseHide) {
							$(renderer.view).css('cursor', 'default');
							clearTimeout(idleMouseTimer);
							idleMouseTimer = setTimeout(function() {
								$(renderer.view).css('cursor', 'none');
								forceMouseHide = true;
								setTimeout(function() {
									forceMouseHide = false;
								}, 200);
							}, MOUSE_IDLE_HIDE_TIME);
						}
					});
					
					
					socket.emit('request_sync', room);
					
					done();
				}
			});
			

		}
	} else {
		reset_background();		
		
		background = new_background;
		history[background.uid] = background;

		$("#map_select").val(background.path).change();	
		$("#use_wotbase").prop("checked", false);
		$('#map_select_container').show();
		$('#wotbase_map_select_container').hide();
		
		var empty_backround = new PIXI.Graphics();
		empty_backround.beginFill(0xFFFFFF, 1);
		
		empty_backround.moveTo(0, 0);
		if (!is_video_replay) {
			empty_backround.lineTo(renderer.width, 0);
			empty_backround.lineTo(renderer.width, renderer.height);
			empty_backround.lineTo(0, renderer.height);
		} else {
			empty_backround.lineTo(window.innerWidth, 0);
			empty_backround.lineTo(window.innerWidth, window.innerHeight);
			empty_backround.lineTo(0, window.innerHeight);			
		}
		empty_backround.lineTo(0, 0);
		
		empty_backround.endFill();
		background_sprite.texture = renderer.generateTexture(empty_backround);
		
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
var dragged_entity;
function on_drag_start(e) {
	if (this == select_box) {
		limit_rate(15, select_box_move_state, function() {});
		select_box.mousemove = undefined;
		select_box.mouseover = undefined;
		select_box.mouseout = undefined;
	}

	drag_delay_running = true;
	if (drag_timeout) {
		clearTimeout(drag_timeout);
	}
	_this = this;
	var mouse_location = e.data.getLocalPosition(background_sprite);
	last_mouse_location = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
	mouse_down_interrupted = false;
	var delay = 0;
	if (active_context == "ping_context" && (!_this.entity || _this.entity.type != 'note')) {
		delay = 300;
	} else if ((active_context == "remove_context" || active_context == "eraser_context")) {
		if (_this.entity) {
			deselect_all();
			remove(_this.entity.uid);
			undo_list.push(clone_action(["remove", [_this.entity]]));
			socket.emit('remove', room, _this.entity.uid, active_slide);
			if (active_context == "eraser_context") {
				on_left_click(e);
			}
		}
		if (_this == select_box) {
			clear_selected();
		}
		e.stopPropagation();
		return;
	} else {
		if (active_context != 'drag_context') {
			context_before_drag = active_context;
		}
		active_context = "drag_context";
		e.stopPropagation();
	}
	drag_timeout = setTimeout(function() {
		if (mouse_down_interrupted) {
			drag_delay_running = false;
			deselect_all();
			return;
		}
				
		if (is_room_locked && !my_user.role) {
			if (_this.entity && _this.entity.type == 'note') {
				_this.mouseup = toggle_note;
				_this.touchend = toggle_note;
				_this.mouseupoutside = toggle_note;
				_this.touchendoutside = toggle_note;
			}
			return;
		}
		
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		last_drag_update = Date.now();
		last_drag_position = [from_x_local(mouse_location.x), from_y_local(mouse_location.y)];
		
		dragged_entity = _this;		
		objectContainer.buttonMode = true;

		if (active_context != 'drag_context') {
			context_before_drag = active_context;
		}
		active_context = "drag_context";
		
		_this.mouseup = on_drag_end;
		_this.touchend = on_drag_end;
		_this.mouseupoutside = on_drag_end;
		_this.touchendoutside = on_drag_end;
		_this.mousemove = on_drag_move;
		_this.touchmove = on_drag_move;
		$('html,body').css('cursor', 'pointer');		
		
		move_selected = false;
		if (_this.entity) {
			for (var i in selected_entities) {
				if (selected_entities[i].uid == _this.entity.uid) {
					move_selected = true;
					break;
				}
			}
		} else {
			move_selected = true;
		}
		
		if (!move_selected) {
			deselect_all();
		}
		
		for (var i in selected_entities) {
			selected_entities[i].origin_x = selected_entities[i].x;
			selected_entities[i].origin_y = selected_entities[i].y;			
			objectContainer.removeChild(selected_entities[i].container);
			objectContainer.addChild(selected_entities[i].container);
		}
		if (_this.entity) {
			_this.entity.origin_x = _this.entity.x;
			_this.entity.origin_y = _this.entity.y;
		}
		
		drag_delay_running = false;
	
		if (select_box) {
			objectContainer.removeChild(select_box);
			objectContainer.addChild(select_box);
		}
		
		render_scene();
	
	}, delay);
}

function toggle_note(e) {
	if (this.entity.is_open) {
		this.entity.is_open = false;
		align_note_text(this.entity);
	} else {
		this.entity.is_open = true;
		align_note_text(this.entity);
	}	
}

//move an entity but keep it within the bounds
function move_entity(entity, delta_x, delta_y) {
	if (entity.container) {
		var new_x = entity.container.x + x_abs(delta_x);
		var new_y = entity.container.y + y_abs(delta_y);
		drag_entity(entity, entity.x + x_rel(new_x - entity.container.x), entity.y + y_rel(new_y - entity.container.y));
	}
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
			state.last_trigger = Date.now();
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
		if (select_box) {
			select_box.x += x_abs(delta_x);
			select_box.y += y_abs(delta_y);
		}
		
		if (select_box) {
			objectContainer.removeChild(select_box);
			objectContainer.addChild(select_box);
		}
	
		last_mouse_location = mouse_new;
		render_scene();		
	});
}

function on_drag_end(e) {
	limit_rate(15, drag_state, function() {});	
	if (this.entity && Math.abs(this.entity.origin_x - this.entity.x) < EPSILON &&  Math.abs(this.entity.origin_y - this.entity.y) < EPSILON) {	
		if (context_before_drag == 'remove_context') {
			remove(this.entity.uid);
			undo_list.push(clone_action(["remove", [this.entity]]));
			socket.emit('remove', room, this.entity.uid, active_slide);
		} else if (this.entity.type == 'note') {
			toggle_note.call(this, e);
			deselect_all();
		}
	} else {
		var undo_action = ["drag", []];
		if (selected_entities.length > 0) {
			for (var i in selected_entities) {
				var origin = [selected_entities[i].origin_x, selected_entities[i].origin_y];
				undo_action[1].push([origin, selected_entities[i].uid]);
				delete selected_entities[i].origin_x;
				delete selected_entities[i].origin_y;
				socket.emit("drag", room, selected_entities[i].uid, active_slide, selected_entities[i].x, selected_entities[i].y);
			}
		} else {
			var origin = [this.entity.origin_x, this.entity.origin_y];
			undo_action[1].push([origin, this.entity.uid]);
			delete this.entity.origin_x;
			delete this.entity.origin_y;
			socket.emit("drag", room, this.entity.uid, active_slide, this.entity.x, this.entity.y);
		}
		undo_list.push(clone_action(undo_action));
	}

	cancel_drag();
	render_scene();
}

function remove(uid, keep_entity) {
	var entity = room_data.slides[active_slide].entities[uid];
	if (entity && entity.container) {
		if (dragged_entity && dragged_entity.entity && dragged_entity.entity.uid == uid) {
			cancel_drag(true);
		}
		
		if (entity.type == "note") {
			entity.container.menu.remove();
		}
		
		objectContainer.removeChild(entity.container);
		delete entity.container;
		
		if (entity.type == "icon") {
			try {
				var counter = $('button[id*="'+room_data.slides[active_slide].entities[uid].tank+'"]').find("span");
				counter[0].innerHTML = parseInt(counter[0].innerHTML)-1;	
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
			if (active_context == 'drag_context' && move_selected) {
				cancel_drag(true);
			}
			break;
		}
	}
	
	if (!keep_entity) {
		delete room_data.slides[active_slide].entities[uid];	
	}
	
	select_box_dirty = true;
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

var scene_dirty = false;
function render_scene() {
	scene_dirty = true;
}

function get_offset() {
	return offset;
}

function get_server_time() {
	return Date.now() + offset;
}

function get_local_time(timestamp) {
	return timestamp - offset;
}


var ping_container_atlas = {}
var ping_texture_atlas = {}
var active_pings = [];

function ping(x, y, color, size) {
	//color = parseInt('0x'+random_color().substring(1));;	
	var fast_container;
	if (!ping_container_atlas[color]) {
		fast_container = new PIXI.particles.ParticleContainer(500, {
			scale: true,
			alpha: true
		});
		ping_container_atlas[color] = fast_container;		
		var temp_sprite = new PIXI.Sprite(ping_texture);
		var canvas = PIXI.CanvasTinter.getTintedTexture(temp_sprite, color);
		ping_texture_atlas[color] = new PIXI.Texture.fromCanvas(canvas);
		objectContainer.addChild(fast_container);
	} else {
		fast_container = ping_container_atlas[color];
	}
	
	var sprite = new PIXI.Sprite(ping_texture_atlas[color]);
	
	sprite.anchor.set(0.5);
	sprite.start_size = y_abs(0.01) * (size/10) * zoom_level;
	
	sprite.height = sprite.start_size;
	sprite.width = sprite.start_size;
		
	sprite.x = x_abs(x);
	sprite.y = y_abs(y);

	sprite.container = fast_container;
	fast_container.addChild(sprite);
	
	sprite.stop_time = Date.now() + PING_TIME;
	sprite.growth = sprite.height * 5;

	render_scene();
	
	active_pings.push(sprite);
}

function update_pings() {
	var time = Date.now();
	active_pings = active_pings.filter(function(el) {
		var sprite = el;
		var delta = sprite.stop_time - time;
		
		var passed = 1 - (delta / PING_TIME);
		var size = sprite.start_size + passed * sprite.growth
		var alpha = 0.5 + (1-passed) * 0.5;
		
		sprite.height = size;
		sprite.width = size;
		sprite.alpha = alpha;
		
		if (delta <= 0) {
			sprite.container.removeChild(sprite);
			render_scene();
			return false;	
		}
		render_scene();
		return true;
	});
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
		if (entity.is_open) {
			var rect = $("#edit_window")[0].getBoundingClientRect();
			var x = rect.left + to_x_local(entity.x) + entity.container.width * objectContainer.scale.x;
			var y = rect.top + to_y_local(entity.y);
			entity.container.menu.attr('style', 'top:' + y +'px; left:' + x + 'px; display:block; z-index:20');
		} else {
			entity.container.menu.css('visibility', 'hidden');
		}
	}
}

//borrowed from http://www.dbp-consulting.com/tutorials/canvas/CanvasArrow.html
//but stripped a bit
var drawArrow=function(ctx,x1,y1,x2,y2,style,which,angle,d) {
	'use strict';
	// calculate the angle of the line
	var lineangle=Math.atan2(y2-y1,x2-x1);

	var h=Math.abs(d/Math.cos(angle));
	var angle1=lineangle+Math.PI+angle;
	var topx=x2+Math.cos(angle1)*h;
	var topy=y2+Math.sin(angle1)*h;
	var angle2=lineangle+Math.PI-angle;
	var botx=x2+Math.cos(angle2)*h;
	var boty=y2+Math.sin(angle2)*h;
	
	ctx.beginPath();
	ctx.moveTo(topx,topy);
	ctx.lineTo(x1,y1);
	ctx.lineTo(botx,boty);
	//var cpx=(topx+x1+botx)/3;
	//var cpy=(topy+y1+boty)/3;
	//ctx.quadraticCurveTo(cpx,cpy,topx,topy);
	ctx.lineTo(topx,topy);

	ctx.stroke();
	ctx.fill();
}

function hexToRGBA(hex, alpha) {
  var r = parseInt( hex.slice(1,3), 16 ),
      g = parseInt( hex.slice(3,5), 16 ),
      b = parseInt( hex.slice(5,7), 16 );
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function init_canvas(ctx, line_thickness, line_color, style, fill_opacity, fill_color, outline_opacity) {
	var line_color = '#' + ('00000' + (line_color | 0).toString(16)).substr(-6); 

	ctx.lineWidth = line_thickness * (size_y/1000) * THICKNESS_SCALE;
			
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
	if (active_context == "drag_context") {
		cancel_drag(true);
	}
	var mouse_location = e.data.getLocalPosition(background_sprite);
	
	if (!can_edit()) {
		setup_mouse_events(on_ruler_move, on_ruler_end);
		init_canvases(0.1, 0xffffff, "full");
		left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];	
		return;
	}
	try {
		document.activeElement.blur();
	} catch(e) {}
	if (active_context == 'drag_context') {
		return;
	}
	if (active_context != 'ping_context') {
		deselect_all();
	}
	if (active_context == 'draw_context') {
		setup_mouse_events(on_draw_move, on_draw_end);
		point_buffer = [];
		new_drawing = {uid : newUid(), type: 'drawing', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:[1,1], color:draw_color, alpha:1, thickness:parseFloat(draw_thickness) * zoom_level, end:$('#draw_end_type').find('.active').attr('data-end'), style:$('#draw_type').find('.active').attr('data-style'), path:[[0, 0]], end_size:draw_end_size*zoom_level, draw_zoom_level:zoom_level};
		init_canvases(parseFloat(draw_thickness), new_drawing.color, new_drawing.style);
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
			new_drawing = {uid : newUid(), type: 'line', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:[1,1], color:line_color, alpha:1, thickness:parseFloat(line_thickness) * zoom_level, path:[[0, 0]], end:$('#line_end_type').find('.active').attr('data-end'), style:$('#line_type').find('.active').attr('data-style'), end_size:line_end_size*zoom_level, draw_zoom_level:zoom_level};
			init_canvases(parseFloat(line_thickness), new_drawing.color, new_drawing.style);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
			just_activated = true;
		}
	} else if (active_context == 'polygon_context') {
		if (!new_drawing) {
			setup_mouse_events(on_line_move, on_polygon_end);
			new_drawing = {uid : newUid(), type: 'polygon', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:[1,1], outline_thickness:polygon_outline_thickness * zoom_level, outline_color:polygon_outline_color, outline_opacity: t2o(polygon_outline_transparancy), fill_color:polygon_fill_color, fill_opacity: t2o(polygon_fill_transparancy), alpha:1, path:[[0,0]], style:$('#polygon_type').find('.active').attr('data-style'), draw_zoom_level:zoom_level};

			init_canvases(polygon_outline_thickness, new_drawing.outline_color, new_drawing.style, new_drawing.fill_opacity, new_drawing.fill_color, new_drawing.outline_opacity);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
		
			var end_circle_radius = (e.type == "touchstart") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;
			
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * THICKNESS_SCALE, new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)));
			graphics.drawShape(new PIXI.Circle(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)), size_y * end_circle_radius * zoom_level));
			objectContainer.addChild(graphics);
			
			just_activated = true;
			render_scene();
		}
	} else if (active_context == 'curve_context') {
		if (!new_drawing) {
			new_drawing = {uid : newUid(), type: 'curve', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y),  scale:[1,1], color:curve_color, alpha:1, thickness:parseFloat(curve_thickness) * zoom_level, path:[[0, 0]], end:$('#curve_end_type').find('.active').attr('data-end'), style:$('#curve_type').find('.active').attr('data-style'), end_size:curve_end_size*zoom_level, draw_zoom_level:zoom_level};

			point_buffer = [to_x_local(mouse_x_rel(mouse_location.x)), to_y_local(mouse_y_rel(mouse_location.y))];
			init_canvases(parseFloat(curve_thickness), new_drawing.color, new_drawing.style);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));

			setup_mouse_events(on_curve_move, on_curve_end);
			just_activated = true;
		}
	} else if (active_context == 'area_context') {
		if (!new_drawing) {
			new_drawing = {uid : newUid(), type: 'area', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:[1,1], outline_thickness:parseFloat(area_outline_thickness) * zoom_level, outline_color:area_outline_color, outline_opacity: t2o(area_outline_transparancy), fill_color:area_fill_color, fill_opacity: t2o(area_fill_transparancy), alpha:1, path:[[0, 0]], style:$('#area_type').find('.active').attr('data-style'), draw_zoom_level:zoom_level};

			point_buffer = [to_x_local(mouse_x_rel(mouse_location.x)), to_y_local(mouse_y_rel(mouse_location.y))];
			init_canvases(parseFloat(area_outline_thickness), new_drawing.outline_color, new_drawing.style, new_drawing.fill_opacity, new_drawing.fill_color, new_drawing.outline_opacity);
			draw_context.moveTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));

			var end_circle_radius = (e.type == "touchstart") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;
			
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * THICKNESS_SCALE, new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)));
			graphics.drawShape(new PIXI.Circle(x_abs(mouse_x_rel(mouse_location.x)), y_abs(mouse_y_rel(mouse_location.y)), size_y * end_circle_radius * zoom_level));
			objectContainer.addChild(graphics);
			
			setup_mouse_events(on_curve_move, on_area_end);
			just_activated = true;
			render_scene();
		}
	} else if (active_context == 'icon_context') {
		setup_mouse_events(undefined, on_icon_end);
	} else if (active_context == 'eraser_context') {
		setup_mouse_events(on_eraser_move, on_eraser_end);
	} else if (active_context == 'ping_context') {
		if (!drag_delay_running) {
			deselect_all();
		}
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
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	limit_rate(5, eraser_state, function() {	
		renderer.plugins.interaction.processInteractive(mouse_location, objectContainer, function(container, hit) {
			if (hit && container.entity && container.entity.type != 'background') {
				var entity = container.entity;
				remove(entity.uid);
				undo_list.push(clone_action(["remove", [entity]]));
				socket.emit('remove', room, entity.uid, active_slide);
			}
		}, true);	
	});
}

function on_eraser_end(e) {
	setup_mouse_events(undefined, undefined);
}

function stop_tracking() {
	limit_rate(15, track_state, function() {});
	setup_mouse_events(undefined, undefined);
	socket.emit("stop_track", room, my_tracker.uid);
	objectContainer.removeChild(my_tracker.container);
	my_tracker = undefined;
	render_scene();
}

function start_tracking(mouse_location) {
	setup_mouse_events(on_track_move);
	var shape = $('#track_shape .active').attr('data-cursor');
	var size;
	if (shape == 'dot' || shape == 'cursor') {
		size = 0.025;
	} else {
		size = 0.05;
	}
	my_tracker = {uid:newUid(), shape:shape, size:(size * (track_size/10)), color: track_color, x: mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), owner:my_user.id};
	last_track_position = [my_tracker.x, my_tracker.y];
	socket.emit("track", room, my_tracker);
	create_tracker(my_tracker);
}

function on_note_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var note = {uid:newUid(), type: 'note', x:x, y:y, scale:[1,1], color:text_color, alpha:1, text:"", font_size:font_size, font:'Arial', height:zoom_level, draw_zoom_level:zoom_level};
	undo_list.push(clone_action(["add", [note]]));
	create_note(note);
	note.container.is_open = true;
	align_note_text(note);
	snap_and_emit_entity(note);	
}

function create_note(note) {
	var texture;
	if (texture_atlas['note.png'] && !is_safari()) {
		var img = texture_atlas['note.png'];
		texture = new PIXI.Texture(loader.resources[img.sprite].texture, new PIXI.Rectangle(img.x, img.y, img.width, img.height));
	} else {
		texture = PIXI.Texture.fromImage(image_host + 'note.png');
	}
	var sprite = new PIXI.Sprite(texture);

	var ratio = sprite.width / sprite.height;
	
	sprite.height = x_abs(NOTE_SCALE) * note.height; 
	sprite.width = sprite.height * ratio;
		
	sprite.x = x_abs(note.x);
	sprite.y = y_abs(note.y);

    note.container = sprite;
	note.container.entity = note; 
	note.container.is_open = false;

	note.container.menu = $('<div class="popover fade right in" role="tooltip"><h3 style="display: none;" class="popover-title"></h3><div class="popover-content"><textarea style="height:400px; width:300px;" id="note_box"></textarea><br /><span id="notification_area" style="float: left;" hidden>Saved</span><div style="float:right; padding:3px;"></div></div></div>');
	
	$("#note_box", note.container.menu).val(note.text);
	
	if (is_room_locked && !my_user.role) {
		$('textarea', note.container.menu).prop('readonly', true);
		$('button', note.container.menu).hide();
	}
	
	$("body").append(note.container.menu);
	
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
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		var x = from_x_local(mouse_location.x);
		var y = from_y_local(mouse_location.y);
		my_tracker.x = x;
		my_tracker.y = y;
		my_tracker.container.x = x_abs(x);
		my_tracker.container.y = y_abs(y);
		
		var dist_sq = (last_track_position[0] - my_tracker.x) * (last_track_position[0] - my_tracker.x)
					 +(last_track_position[1] - my_tracker.y) * (last_track_position[1] - my_tracker.y);
		
		render_scene();
		
		var interval = (Date.now() - last_track_update);
		if (dist_sq > MIN_TRACK_MOVE_DISTANCE_SQ || interval > 50) {
			last_track_update = Date.now();
			if (Math.abs(my_tracker.x - last_track_position[0] + my_tracker.y - last_track_position[1]) > 0) {
				socket.emit("track_move", room, my_tracker.uid, my_tracker.x - last_track_position[0], my_tracker.y - last_track_position[1]);
				last_track_position = [my_tracker.x, my_tracker.y];
			}
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
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	var new_x = mouse_location.x;
	var new_y = mouse_location.y;
	
	var distance_to_start_sq = Math.pow(new_drawing.x - from_x_local(new_x),2) 
							 + Math.pow(new_drawing.y - from_y_local(new_y),2);

	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;

	if (just_activated) {
		just_activated = false;
		if (distance_to_start_sq < EPSILON) return;
	}
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius) * zoom_level ) {
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		var end_points = smooth_draw(temp_draw_context, point_buffer, true);
		temp_draw_context.fill();
		draw_end(temp_draw_context, new_drawing, end_points[0], end_points[1]);
		
		var success = canvas2container(temp_draw_context, temp_draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(clone_action(["add", [new_drawing]]));
		}

		objectContainer.removeChild(graphics);	
		render_scene();	
		stop_drawing();
		setup_mouse_events(undefined, undefined);
		new_drawing = null;	
		
	} else {
		point_buffer.push(mouse_location.x, mouse_location.y);
		new_drawing.path.push([from_x_local(new_x) - new_drawing.x, from_y_local(new_y) - new_drawing.y]);
		
		on_curve_move(e);
	}
}

var curve_state = {};
var point_buffer = []
function on_curve_move(e) {
	limit_rate(20, curve_state, function() {
		var mouse_location = renderer.plugins.interaction.eventData.data.global;

		var new_x = mouse_location.x;
		var new_y = mouse_location.y;	
				
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		point_buffer.push(new_x, new_y);
		var end_points = smooth_draw(temp_draw_context, point_buffer);
		point_buffer.pop();
		point_buffer.pop();

		new_drawing.path.push([from_x_local(mouse_location.x) - new_drawing.x, from_y_local(mouse_location.y) - new_drawing.y]);
		draw_end(temp_draw_context, new_drawing, end_points[0], end_points[1]);
		new_drawing.path.pop();
		
		last_point = [new_x, new_y];
	});
}

function on_curve_end(e) {
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	var new_x = mouse_location.x;
	var new_y = mouse_location.y;

	var distance_to_last_sq = Math.pow(from_x_local(new_x) - new_drawing.x - new_drawing.path[new_drawing.path.length-1][0],2) 
							+ Math.pow(from_y_local(new_y) - new_drawing.y - new_drawing.path[new_drawing.path.length-1][1],2);


	if (just_activated) {
		just_activated = false;
		if (distance_to_last_sq < EPSILON) return;
	}
	
	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside" || e.type == "touchstart" || e.type == "touchstartoutside") ? MIN_POLYGON_END_DISTANCE_TOUCH : MIN_POLYGON_END_DISTANCE;	
	if (distance_to_last_sq < (end_circle_radius*end_circle_radius)*zoom_level) {	
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	

		var end_points = smooth_draw(temp_draw_context, point_buffer);
		draw_end(temp_draw_context, new_drawing, end_points[0], end_points[1]);
				
		var success = canvas2container(temp_draw_context, temp_draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(clone_action(["add", [new_drawing]]));
		}
		objectContainer.removeChild(graphics);
		
		render_scene();	
		stop_drawing();
		setup_mouse_events(undefined, undefined);
		new_drawing = null;
	} else {
		point_buffer.push(mouse_location.x, mouse_location.y);
		new_drawing.path.push([from_x_local(new_x) - new_drawing.x, from_y_local(new_y) - new_drawing.y]);

		objectContainer.removeChild(graphics);		
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * THICKNESS_SCALE, new_drawing.color, 1);
		graphics.moveTo(x_abs(from_x_local(mouse_location.x)), y_abs(from_y_local(mouse_location.y)));
		graphics.drawShape(new PIXI.Circle(x_abs(from_x_local(mouse_location.x)), y_abs(from_y_local(mouse_location.y)), size_y * end_circle_radius * zoom_level));
		objectContainer.addChild(graphics);
		render_scene();	
		
		on_curve_move(e);
	}
}

function on_polygon_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(background_sprite);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
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
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius) * zoom_level) {
		new_drawing.path.push([0, 0]);
		draw_context.lineTo(to_x_local(new_drawing.x), to_y_local(new_drawing.y));
		draw_context.stroke();
		draw_context.fill();
		
		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(clone_action(["add", [new_drawing]]));
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
	graphic.lineStyle(outline_thickness * THICKNESS_SCALE, outline_color, outline_opacity);
	graphic.beginFill(fill_color, fill_opacity);
	graphic.drawShape(shape);
	graphic.endFill();
	graphic.boundsPadding = 1;
	var sprite = new PIXI.Sprite(renderer.generateTexture(graphic));
	return sprite;
}

var ruler_state = {}
function on_ruler_move(e) {
	limit_rate(15, ruler_state, function() {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var map_size_x = background.size_x ? background.size_x : 0;
		var map_size_y = background.size_y ? background.size_y : 0;
		temp_draw_context.lineWidth = 2 * (size_x/1000);
		temp_draw_context.strokeStyle = "#FFFFFF";
		temp_draw_context.fillStyle = "#FFFFFF";
		var center_x = to_x_local(left_click_origin[0]);
		var center_y = to_y_local(left_click_origin[1]);
		var border_x = to_x_local(mouse_x_rel(mouse_location.x));
		var border_y = to_y_local(mouse_y_rel(mouse_location.y));
		var length_local = Math.sqrt(Math.pow(center_x - border_x, 2) + Math.pow(center_y - border_y, 2));

		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		temp_draw_context.beginPath();		
		temp_draw_context.moveTo(border_x, border_y);
		temp_draw_context.lineTo(center_x, center_y);
		temp_draw_context.moveTo(center_x + length_local, center_y);
		temp_draw_context.arc(center_x, center_y, length_local, 0, 2*Math.PI);
		temp_draw_context.stroke();
		
		var mid_line_x = (center_x + to_x_local(mouse_x_rel(mouse_location.x))) / 2;
		var mid_line_y = (center_y + to_y_local(mouse_y_rel(mouse_location.y))) / 2;
		
		temp_draw_context.font = "22px Arial";		  
		var length = Math.sqrt(Math.pow(map_size_x * (left_click_origin[0] - mouse_x_rel(mouse_location.x)), 2) 
							 + Math.pow(map_size_y * (left_click_origin[1] - mouse_y_rel(mouse_location.y)), 2));
							 							 
		temp_draw_context.lineWidth = to_x_local(0.5)/1000;
		temp_draw_context.strokeStyle = "#000000";
		temp_draw_context.fillStyle = "#FFFFFF";
		var label = "";
		if (game == "lol") {
			label += Math.round(10*length)/10 + "u";
		} else if (game == "wows") {
			label += Math.round(0.01*length)/10 + "km";
		} else {
			label += Math.round(10*length)/10 + "m";
		}
		temp_draw_context.fillText(label, mid_line_x, mid_line_y);
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
		//var mouse_location = e.data.getLocalPosition(background_sprite);
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		var x_rel = from_x_local(mouse_location.x)
		var y_rel = from_y_local(mouse_location.y)
		
		var center_x, center_y, radius
		if (circle_draw_style == "edge") {
			center_x = (left_click_origin[0] + x_rel) / 2;
			center_y = (left_click_origin[1] + y_rel) / 2;
			radius = Math.sqrt(Math.pow(to_x_local(left_click_origin[0]) - to_x_local(x_rel), 2) +
							   Math.pow(to_y_local(left_click_origin[1]) - to_y_local(y_rel), 2));
			radius /= 2;
		} else if (circle_draw_style == "radius") {
			center_x = left_click_origin[0];
			center_y = left_click_origin[1];
			radius = Math.sqrt(Math.pow(to_x_local(left_click_origin[0]) - to_x_local(x_rel), 2) +
							   Math.pow(to_y_local(left_click_origin[1]) - to_y_local(y_rel), 2));
		}
		
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
		temp_draw_context.beginPath();
		temp_draw_context.arc(to_x_local(center_x), to_y_local(center_y), radius, 0, 2*Math.PI);
		temp_draw_context.fill();
		temp_draw_context.stroke();
		
		if (circle_draw_style == "radius" && background.size_x && background.size_x > 0 && background.size_y && background.size_y > 0) {
			temp_draw_context.save();
			temp_draw_context.lineWidth = 2 * (size_x/1000);
			temp_draw_context.strokeStyle = "#FFFFFF";
			temp_draw_context.fillStyle = "#FFFFFF";
			temp_draw_context.shadowBlur = 0;
			temp_draw_context.beginPath();
			temp_draw_context.moveTo(to_x_local(center_x), to_y_local(center_y));		
			temp_draw_context.lineTo(to_x_local(x_rel), to_y_local(y_rel));
			temp_draw_context.stroke();
			var mid_line_x = to_x_local((center_x + x_rel) / 2);
			var mid_line_y = to_y_local((center_y + y_rel) / 2);
			temp_draw_context.font = "22px Arial";
			var length = Math.sqrt(Math.pow(background.size_x * (center_x - x_rel), 2) + Math.pow(background.size_y * 
			(center_y - y_rel), 2))
			temp_draw_context.lineWidth = to_x_local(0.5)/1000;
			temp_draw_context.strokeStyle = "#000000";
			temp_draw_context.fillStyle = "#FFFFFF";
			var label = "";
			if (game == "lol") {
				label += Math.round(10*length)/10 + "u";
			} else if (game == "wows") {
				label += Math.round(0.01*length)/10 + "km";
			} else {
				label += Math.round(10*length)/10 + "m";
			}	
			temp_draw_context.fillText(label, mid_line_x, mid_line_y);
			temp_draw_context.stroke();
			temp_draw_context.restore();
		}
	});
	
}

function on_circle_end(e) {
	limit_rate(15, circle_state, function() {});
	var mouse_location = renderer.plugins.interaction.eventData.data.global;		
	var xrel = from_x_local(mouse_location.x)
	var yrel = from_y_local(mouse_location.y)	

	var center_x, center_y, radius
	if (circle_draw_style == "edge") {
		center_x = (left_click_origin[0] + xrel) / 2;
		center_y = (left_click_origin[1] + yrel) / 2;
		radius = Math.sqrt(Math.pow((to_x_local(left_click_origin[0]) - to_x_local(xrel)), 2) +
						   Math.pow((to_y_local(left_click_origin[1]) - to_y_local(yrel)), 2));
		radius /= 2;
	} else if (circle_draw_style == "radius") {
		center_x = left_click_origin[0];
		center_y = left_click_origin[1];
		radius = Math.sqrt(Math.pow(to_x_local(left_click_origin[0]) - to_x_local(xrel), 2) +
						   Math.pow(to_y_local(left_click_origin[1]) - to_y_local(yrel), 2));
	}

	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	temp_draw_context.beginPath();
	temp_draw_context.arc(to_x_local(center_x), to_y_local(center_y), radius, 0, 2*Math.PI);
	temp_draw_context.fill();
	temp_draw_context.stroke();

	var new_shape = {uid:newUid(), type:'circle', x:center_x, y:center_y, radius:from_y_local_vect(radius), outline_thickness:circle_outline_thickness * zoom_level, outline_color:circle_outline_color, outline_opacity: t2o(circle_outline_transparancy), fill_opacity: t2o(circle_fill_transparancy), fill_color:circle_fill_color, alpha:1, style:$('#circle_type').find('.active').attr('data-style'), draw_zoom_level:zoom_level};
	new_drawing = undefined;
	
	if (circle_draw_style == "radius" && background.size_x && background.size_x > 0 && background.size_y && background.size_y > 0) {
		new_shape.draw_radius = [xrel - new_shape.x, yrel - new_shape.y];
		temp_draw_context.save();
		temp_draw_context.lineWidth = 2 * (size_x/1000);
		temp_draw_context.strokeStyle = "#FFFFFF";
		temp_draw_context.fillStyle = "#FFFFFF";
		temp_draw_context.shadowBlur = 0;
		temp_draw_context.beginPath();
		temp_draw_context.moveTo(to_x_local(center_x), to_y_local(center_y));		
		temp_draw_context.lineTo(to_x_local(xrel), to_y_local(yrel));
		temp_draw_context.stroke();
		var mid_line_x = to_x_local((center_x + xrel) / 2);
		var mid_line_y = to_y_local((center_y + yrel) / 2);
		temp_draw_context.font = "22px Arial";
		var length = Math.sqrt(Math.pow(background.size_x * (center_x - xrel), 2) + Math.pow(background.size_y * 
		(center_y - yrel), 2))
		temp_draw_context.lineWidth = to_x_local(0.5)/1000;
		temp_draw_context.strokeStyle = "#000000";
		temp_draw_context.fillStyle = "#FFFFFF";
		var label = "";
		if (game == "lol") {
			label += Math.round(10*length)/10 + "u";
		} else if (game == "wows") {
			label += Math.round(0.01*length)/10 + "km";
		} else {
			label += Math.round(10*length)/10 + "m";
		}	
		temp_draw_context.fillText(label, mid_line_x, mid_line_y);
		temp_draw_context.stroke();
		temp_draw_context.restore();
	}
	
	var success = canvas2container(temp_draw_context, temp_draw_canvas, new_shape);
	if (success) {
		emit_entity(new_shape);
		undo_list.push(clone_action(["add", [new_shape]]));
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

	var new_shape = {uid:newUid(), type:'rectangle', x:left_x, y:left_y, width:(right_x - left_x), height:(right_y - left_y), outline_thickness:rectangle_outline_thickness * zoom_level, outline_color:rectangle_outline_color, outline_opacity: t2o(rectangle_outline_transparancy), fill_opacity: t2o(rectangle_fill_transparancy), fill_color:rectangle_fill_color, alpha:1, style:$('#rectangle_type').find('.active').attr('data-style'), draw_zoom_level:zoom_level};
	
	var success = canvas2container(temp_draw_context, temp_draw_canvas, new_shape);
	if (success) {
		emit_entity(new_shape);
		undo_list.push(clone_action(["add", [new_shape]]));
	}
		
	stop_drawing();
	setup_mouse_events(undefined, undefined);
}

function on_ping_move(e) {
	limit_rate(60, drag_state, function() {
		var time = Date.now();
		if (time - last_ping_time < 10) return;
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		var x = from_x_local(mouse_location.x);
		var y = from_y_local(mouse_location.y);
		last_ping_time = time;
		ping(x, y, ping_color, ping_size);
		socket.emit('ping_marker', room, x, y, ping_color, ping_size);
	});
}

function on_ping_end(e) {
	limit_rate(0, drag_state, function() {});
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	var x = from_x_local(mouse_location.x);
	var y = from_y_local(mouse_location.y);
	ping(x, y, ping_color, ping_size);
	socket.emit('ping_marker', room, x, y, ping_color, ping_size);
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
	
	var x_min = Math.min(x_abs(mouse_x_rel(mouse_location.x)), x_abs(left_click_origin[0]));
	var y_min = Math.min(y_abs(mouse_y_rel(mouse_location.y)), y_abs(left_click_origin[1]));
	var x_max = Math.max(x_abs(mouse_x_rel(mouse_location.x)), x_abs(left_click_origin[0]));
	var y_max = Math.max(y_abs(mouse_y_rel(mouse_location.y)), y_abs(left_click_origin[1]));
	
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key) && room_data.slides[active_slide].entities[key].container) {
			var entity = room_data.slides[active_slide].entities[key];
			var sprite = room_data.slides[active_slide].entities[key].container;
			
			//var rect = {};
			//var angle = -sprite.rotation;		
			//rect.width = Math.abs(sprite.width * Math.cos(angle)) + Math.abs(sprite.height * Math.sin(angle));
			//rect.height = Math.abs(sprite.width * Math.sin(angle)) + Math.abs(sprite.height * Math.cos(angle));
			//rect.x = sprite.x - sprite.anchor.x * rect.width;
			//rect.y = sprite.y - sprite.anchor.y * rect.height;

			var rect = sprite.getBounds();
			rect.width /= objectContainer.scale.x;
			rect.height /= objectContainer.scale.y;
			rect.x = (-objectContainer.x + rect.x) / objectContainer.scale.x;
			rect.y = (-objectContainer.y + rect.y) / objectContainer.scale.y;

			//enable to visualise bounding boxes
			//var shape = new PIXI.Rectangle(0, 0, rect.width, rect.height);
			//var container = draw_shape(1, 1, 0, 0, 16777215, shape);
			//container.x = rect.x;
			//container.y = rect.y;
			//objectContainer.addChild(container)
			
			var box_min_x = rect.x;
			var box_min_y = rect.y;
			var box_max_x = rect.x + rect.width;
			var box_max_y = rect.y + rect.height;
			

			
			if (box_min_x > x_min && box_min_y > y_min && box_max_x < x_max && box_max_y < y_max) {
				selected_entities.push(room_data.slides[active_slide].entities[key]);
			}
		}
	}
	
	select_entities();
	undo_list.push(clone_action(["select", selected_entities, previously_selected_entities]));
	render_scene();
}

function measure_text(entity) {
	return [x_rel(entity.container.width), x_rel(entity.container.height)];
}

function select_box_mousemove(e, ref_x, ref_y, ref_width, ref_height, lock_x, lock_y) {
	limit_rate(15, select_box_move_state, function() {
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		mouse_location.x = x_abs(from_x_local(mouse_location.x));
		mouse_location.y = y_abs(from_y_local(mouse_location.y));
		var x_diff = mouse_location.x - ref_x;
		var y_diff = mouse_location.y - ref_y;	
		var scale_x = Math.abs(x_diff / ref_width);
		var scale_y = Math.abs(y_diff / ref_height);
					
		for (var i in selected_entities) {
			var entity = selected_entities[i];
			if (!lock_x) {
				entity.container.scale.x = scale_x * entity.container.start_scale[0];
				entity.container.x = (entity.container.x_orig - ref_x) * scale_x + ref_x;
			}
			if (!lock_y) {
				entity.container.scale.y = scale_y * entity.container.start_scale[1];
				entity.container.y = (entity.container.y_orig - ref_y) * scale_y + ref_y;
			}
		}
		
		if (!lock_x) {
			select_box.width = Math.abs(ref_x - mouse_location.x);
			select_box.left_x = Math.min(ref_x, mouse_location.x);
			select_box.x = select_box.left_x + select_box.width/2;
		}
		if (!lock_y) {
			select_box.height = Math.abs(ref_y - mouse_location.y);
			select_box.upper_y = Math.min(ref_y, mouse_location.y);
			select_box.y = select_box.upper_y + select_box.height/2;
		}
		
		render_scene();
	});
	e.stopPropagation();
}

function select_box_mouseup(e, ref_x, ref_y, ref_width, ref_height, lock_x, lock_y) {
	limit_rate(15, select_box_move_state, function() {});

	setup_mouse_events(undefined, undefined);
	
	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	mouse_location.x = x_abs(from_x_local(mouse_location.x));
	mouse_location.y = y_abs(from_y_local(mouse_location.y));
	var x_diff = mouse_location.x - ref_x;
	var y_diff = mouse_location.y - ref_y;	
	var scale_x = Math.abs(x_diff / ref_width);
	var scale_y = Math.abs(y_diff / ref_height);
		
	var undo_action = ["drag", []];	
	for (var i in selected_entities) {
		var entity = selected_entities[i];
		
		var scale = [1,1];
		if (entity.scale) {
			scale = [entity.scale[0], entity.scale[1]];
		}
		var origin = [entity.x, entity.y, [scale[0], scale[1]]];
		undo_action[1].push([origin, entity.uid]);	
	
		var x = entity.x;
		var y = entity.y;
		if (!lock_x) {
			x = x_rel((entity.container.x_orig - ref_x) * scale_x + ref_x - entity.container.x_orig) + entity.x;
			scale[0] = scale_x * entity.container.start_scale[0] / entity.container.orig_scale[0];
		}
		if (!lock_y) {
			y = y_rel((entity.container.y_orig - ref_y) * scale_y + ref_y - entity.container.y_orig) + entity.y;
			scale[1] = scale_y * entity.container.start_scale[1] / entity.container.orig_scale[1];
		}
		entity.container.x = entity.container.x_orig;
		entity.container.y = entity.container.y_orig;
		drag_entity(entity, x, y, scale);
		socket.emit('drag', room, entity.uid, active_slide, x, y, scale);

	}
	undo_list.push(clone_action(undo_action));

	select_box.mouseover = on_select_over;
	select_box.mousemove = on_selectbox_move;
	
	if (!lock_x) {
		select_box.width = Math.abs(ref_x - mouse_location.x);
		select_box.left_x = Math.min(ref_x, mouse_location.x);
		select_box.x = select_box.left_x + select_box.width/2;
		
	}
	if (!lock_y) {
		select_box.height = Math.abs(ref_y - mouse_location.y);
		select_box.upper_y = Math.min(ref_y, mouse_location.y);
		select_box.y = select_box.upper_y  + select_box.height/2;
	}
	
	render_scene();
	e.stopPropagation();
}

function prepare_resize(e, ref_x, ref_y, ref_width, ref_height, lock_x, lock_y) {
	for (var i in selected_entities) {
		var entity = selected_entities[i];
		entity.container.x_orig = entity.container.x;
		entity.container.y_orig = entity.container.y;
		entity.container.start_scale = [entity.container.scale.x, entity.container.scale.y];
	}
	
	objectContainer.removeChild(rotate_arrow0);
	objectContainer.removeChild(rotate_arrow1);
	objectContainer.removeChild(rotate_arrow2);
	objectContainer.removeChild(rotate_arrow3);
	
	var mousemove = function(e) { select_box_mousemove(e, ref_x, ref_y, ref_width, ref_height, lock_x, lock_y); };
	var mouseup =  function(e) { select_box_mouseup(e, ref_x, ref_y, ref_width, ref_height, lock_x, lock_y); };
	setup_mouse_events(mousemove, mouseup);
	
	select_box.mouseover = undefined;
	select_box.mousemove = undefined;
	
	e.stopPropagation();
}

var select_box_move_state = {}
function on_selectbox_move(e) {
	limit_rate(15, select_box_move_state, function() {
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		mouse_location.x = x_abs(from_x_local(mouse_location.x));
		mouse_location.y = y_abs(from_y_local(mouse_location.y));
		
		mouse_location.x -= select_box.left_x;
		mouse_location.y -= select_box.upper_y;
		mouse_location.x /= select_box.width;
		mouse_location.y /= select_box.height;
		
		var margin = y_abs(ROTATE_ARROW_MARGIN) * zoom_level;
		var x_margin = margin/select_box.width;
		var y_margin = margin/select_box.height;
		
		var left_x = select_box.left_x;
		var top_y = select_box.upper_y;
		var right_x = left_x + select_box.width;
		var bottom_y = top_y + select_box.height;
		
		if (mouse_location.x < 0-x_margin || mouse_location.x > 1+x_margin || mouse_location.y < 0-y_margin || mouse_location.y > 1+y_margin)  {
			on_select_out(e);
			if (e) {
				e.stopPropagation();
			}
			return;
		}
		
		x_margin = Math.min(x_margin, 0.25);
		y_margin = Math.min(y_margin, 0.25);
		
		if (mouse_location.x < x_margin) {
			if (mouse_location.y < y_margin) { //top-left
				$('html,body').css('cursor', 'nw-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, right_x, bottom_y, select_box.width, select_box.height, false, false); };
				select_box.mousedown = objectContainer.mousedown;
			} else if (mouse_location.y > 1 - y_margin) { //bottom-left
				$('html,body').css('cursor', 'sw-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, right_x, top_y, select_box.width, select_box.height, false, false); };
				select_box.mousedown = objectContainer.mousedown;
			} else { //left
				$('html,body').css('cursor', 'w-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, right_x, 0, select_box.width, select_box.height, false, true); };
				select_box.mousedown = objectContainer.mousedown;
			}
		} else if (mouse_location.x > 1 - x_margin) { //right
			if (mouse_location.y < y_margin) { //top-right
				$('html,body').css('cursor', 'ne-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, left_x, bottom_y, select_box.width, select_box.height, false, false); };
				select_box.mousedown = objectContainer.mousedown;
			} else if (mouse_location.y > 1 - y_margin) { //bottom-right
				$('html,body').css('cursor', 'se-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, left_x, top_y, select_box.width, select_box.height, false, false); };
				select_box.mousedown = objectContainer.mousedown;
			} else { //right
				$('html,body').css('cursor', 'e-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, left_x, 0, select_box.width, select_box.height, false, true); };
				select_box.mousedown = objectContainer.mousedown;
			}
		} else {			
			if (mouse_location.y < y_margin) { //top
				$('html,body').css('cursor', 'n-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, 0, bottom_y, select_box.width, select_box.height, true, false); };
				select_box.mousedown = objectContainer.mousedown;
			} else if (mouse_location.y > 1 - y_margin) { //bottom
				$('html,body').css('cursor', 's-resize');
				objectContainer.mousedown = function(e) { prepare_resize(e, 0, top_y, select_box.width, select_box.height, true, false); };
				select_box.mousedown = objectContainer.mousedown;
			} else {
				$('html,body').css('cursor', 'move');
				select_box.mousedown = on_drag_start;
				objectContainer.mousedown = on_left_click;
			}
		}
	});

	if (e) {
		e.stopPropagation();
	}
}

function on_select_over(e) {
	select_box.mousemove = on_selectbox_move;
	select_box.mouseout = on_select_out;
}

function on_select_out(e) {
	limit_rate(15, select_box_move_state, function() {});
	$('html,body').css('cursor', 'default');
	select_box.mousemove = undefined;
	select_box.mousedown = undefined;
	objectContainer.mousedown = on_left_click;
	select_box.mouseout = undefined;
}

function make_resizable(select_box) {
	select_box.interactive = true;
	select_box.mouseover = on_select_over;
}

function redraw_select_box() {
	if (select_box) {
		select_box.rotation = 0;
		if (selected_entities.length > 0) {
			var x_min = 99999, x_max = -99999, y_min = 99999, y_max = -99999;
			for (var i in selected_entities) {
				var sprite = selected_entities[i].container;
				var rect = {};
						
				var angle = -sprite.rotation;		
				rect.width = Math.abs(sprite.width * Math.cos(angle)) + Math.abs(sprite.height * Math.sin(angle));
				rect.height = Math.abs(sprite.width * Math.sin(angle)) + Math.abs(sprite.height * Math.cos(angle));
				rect.x = sprite.x - sprite.anchor.x * rect.width;
				rect.y = sprite.y - sprite.anchor.y * rect.height;
				
				x_min = Math.min(rect.x, x_min);
				y_min = Math.min(rect.y, y_min);
				x_max = Math.max(rect.x + rect.width, x_max);
				y_max = Math.max(rect.y + rect.height, y_max);	
			}

			select_center = [x_rel(x_min + (x_max - x_min)/2), y_rel(y_min + (y_max - y_min)/2)];
			select_box.left_x = x_min;
			select_box.upper_y = y_min;
			
			select_box.width = x_max - x_min;
			select_box.height = y_max - y_min;
			select_box.x = x_min + select_box.width/2;
			select_box.y = y_min + select_box.height/2;
			
			rotate_arrow0.x = x_min + select_box.width + rotate_arrow0.width/2 + y_abs(ROTATE_ARROW_MARGIN) * zoom_level;
			rotate_arrow0.y = y_min + select_box.height/2;
			rotate_arrow1.x = x_min + select_box.width/2;
			rotate_arrow1.y = y_min - rotate_arrow1.width/2 - y_abs(ROTATE_ARROW_MARGIN) * zoom_level;
			rotate_arrow2.x = x_min - rotate_arrow2.width/2 - y_abs(ROTATE_ARROW_MARGIN) * zoom_level;
			rotate_arrow2.y = y_min + select_box.height/2;
			rotate_arrow3.x = x_min + select_box.width/2;
			rotate_arrow3.y = y_min + rotate_arrow3.width/2 +  select_box.height + y_abs(ROTATE_ARROW_MARGIN) * zoom_level;
		
			objectContainer.removeChild(rotate_arrow0);
			objectContainer.removeChild(rotate_arrow1);
			objectContainer.removeChild(rotate_arrow2);
			objectContainer.removeChild(rotate_arrow3);
			
			objectContainer.addChild(rotate_arrow0);
			objectContainer.addChild(rotate_arrow1);
			objectContainer.addChild(rotate_arrow2);
			objectContainer.addChild(rotate_arrow3);
			
			objectContainer.removeChild(select_box);
			objectContainer.addChild(select_box);
		} else {
			remove_select_box();
		}	
	}
	select_box_dirty = false;
}

function start_rotate_selection(angle, e) {
	limit_rate(15, drag_state, function() {});	
	objectContainer.buttonMode = true;
	
	setup_mouse_events(rotate_selection.bind(undefined, this, angle), stop_rotate_selection.bind(undefined, this, angle))
	var mouse_location = e.data.getLocalPosition(background_sprite);
	last_mouse_location = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
	for (var i in selected_entities) {
		var sprite = room_data.slides[active_slide].entities[selected_entities[i].uid].container;
		sprite.x_orig = sprite.x;
		sprite.y_orig = sprite.y;
		sprite.rotation_orig = sprite.rotation;
	}
	
	objectContainer.removeChild(rotate_arrow0);
	objectContainer.removeChild(rotate_arrow1);
	objectContainer.removeChild(rotate_arrow2);
	objectContainer.removeChild(rotate_arrow3);
	objectContainer.addChild(this);
	
	e.stopPropagation();
}

function rotate_selection(base, angle, e) {
	limit_rate(15, drag_state, function() {	
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var mouse_new = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
		
		var delta_x = mouse_new[0] - last_mouse_location[0];
		var delta_y = mouse_new[1] - last_mouse_location[1];
		
		base.x += x_abs(delta_x);
		base.y += y_abs(delta_y);
		
		var v_x = mouse_new[0] - select_center[0];
		var v_y = mouse_new[1] - select_center[1];
				
		var alpha = Math.atan2(-v_y, v_x);
		
		angle = alpha - angle; 

		var sin_alpha = Math.sin(-angle);
		var cos_alpha = Math.cos(-angle);
		
		for (var i in selected_entities) {
			var sprite = room_data.slides[active_slide].entities[selected_entities[i].uid].container;
			sprite.x = sprite.x_orig;
			sprite.y = sprite.y_orig;
			sprite.x -= x_abs(select_center[0]);
			sprite.y -= y_abs(select_center[1]);
			var temp = sprite.x;
			sprite.x = sprite.x * cos_alpha - sprite.y * sin_alpha;
			sprite.y = temp * sin_alpha + sprite.y * cos_alpha;
			sprite.x += x_abs(select_center[0]);
			sprite.y += y_abs(select_center[1]);
			sprite.rotation = sprite.rotation_orig-angle;
		}
		
		select_box.rotation = -angle;
		last_mouse_location = mouse_new;
		render_scene();		
	});
}

function stop_rotate_selection(base, angle, e) {
	limit_rate(15, drag_state, function() {});
	objectContainer.buttonMode = false;
		
	setup_mouse_events(undefined, undefined);

	var mouse_location = e.data.getLocalPosition(background_sprite);
	var mouse_new = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];
	
	var delta_x = mouse_new[0] - last_mouse_location[0];
	var delta_y = mouse_new[1] - last_mouse_location[1];
	
	base.x += x_abs(delta_x);
	base.y += y_abs(delta_y);
	
	var v_x = mouse_new[0] - select_center[0];
	var v_y = mouse_new[1] - select_center[1];
			
	var alpha = Math.atan2(-v_y, v_x);
	
	angle = alpha - angle; 

	var sin_alpha = Math.sin(-angle);
	var cos_alpha = Math.cos(-angle);

	var undo_action = ["drag", []];
	for (var i in selected_entities) {
		var entity = room_data.slides[active_slide].entities[selected_entities[i].uid];
		var sprite = entity.container;
		var sprite = room_data.slides[active_slide].entities[selected_entities[i].uid].container;
		sprite.x = sprite.x_orig;
		sprite.y = sprite.y_orig;
		sprite.x -= x_abs(select_center[0]);
		sprite.y -= y_abs(select_center[1]);
		var temp = sprite.x;
		sprite.x = sprite.x * cos_alpha - sprite.y * sin_alpha;
		sprite.y = temp * sin_alpha + sprite.y * cos_alpha;
		sprite.x += x_abs(select_center[0]);
		sprite.y += y_abs(select_center[1]);
		
		//TODO: really only this part is different from the rotate_selection function, you can do better
		var scale = [1,1];
		if (entity.scale) {
			scale = [entity.scale[0], entity.scale[1]];
		}
		var orig_rotation = 0;
		if (entity.rotation) {
			orig_rotation = entity.rotation;
		}
		var origin = [entity.x, entity.y, [scale[0], scale[1]], orig_rotation];
		undo_action[1].push([origin, entity.uid]);
		
		var x_diff = sprite.x - sprite.x_orig;
		var y_diff = sprite.y - sprite.y_orig;
		sprite.x = sprite.x_orig;
		sprite.y = sprite.y_orig;
		if (!entity.rotation) {
			entity.rotation = 0;
		}
		var rotation = (entity.rotation + angle) % (2*Math.PI);
		socket.emit("drag", room, entity.uid, active_slide, x_rel(x_abs(entity.x) + x_diff), y_rel(y_abs(entity.y) + y_diff), entity.scale, rotation)
		drag_entity(entity, x_rel(x_abs(entity.x) + x_diff), y_rel(y_abs(entity.y) + y_diff), entity.scale, rotation);
	}
	undo_list.push(clone_action(undo_action));
	select_box_dirty = true;
	render_scene();	
}

function select_entities() {
	remove_select_box();
	var x_min = 99999, x_max = -99999, y_min = 99999, y_max = -99999;
	for (var i in selected_entities) {
		var sprite = room_data.slides[active_slide].entities[selected_entities[i].uid].container;
		var rect = {};
		
		var angle = -sprite.rotation;		
		rect.width = Math.abs(sprite.width * Math.cos(angle)) + Math.abs(sprite.height * Math.sin(angle));
		rect.height = Math.abs(sprite.width * Math.sin(angle)) + Math.abs(sprite.height * Math.cos(angle));
		rect.x = sprite.x - sprite.anchor.x * rect.width;
		rect.y = sprite.y - sprite.anchor.y * rect.height;
		
		x_min = Math.min(x_rel(rect.x), x_min);
		y_min = Math.min(y_rel(rect.y), y_min);
		x_max = Math.max(  x_rel(rect.x)
						 + x_rel(rect.width), x_max);
		y_max = Math.max(  y_rel(rect.y)
						 + y_rel(rect.height), y_max);	
		room_data.slides[active_slide].entities[selected_entities[i].uid].container.alpha = select_alpha;
	}
	
	if (selected_entities.length > 0) {
		select_center = [x_min + (x_max - x_min)/2, y_min + (y_max - y_min)/2];

		var shape = new PIXI.Rectangle(0, 0, x_abs(x_max - x_min), y_abs(y_max - y_min), 5);
		select_box = draw_select_box(shape);
		select_box.anchor.x = 0.5;
		select_box.anchor.y = 0.5;

		var box_x = x_abs(x_min);
		var box_y = y_abs(y_min);
		select_box.left_x = box_x;
		select_box.upper_y = box_y;
		select_box.x = box_x + x_abs(x_max - x_min)/2;
		select_box.y = box_y + y_abs(y_max - y_min)/2;
		make_resizable(select_box);
		
		var texture = new PIXI.Texture.fromImage(image_host + "rotate.png");

		var ratio = texture.width / texture.height;
		var arrow_height = y_abs(ROTATE_ARROW_SCALE) * zoom_level;
		var arrow_width = arrow_height * ratio;
		
		var create_rotate_arrow = function(x, y, angle) {
			var sprite = new PIXI.Sprite(texture);
			sprite.anchor.x = 0.5, sprite.anchor.y = 0.5;
			sprite.width = arrow_width;
			sprite.height = arrow_height;		
			sprite.interactive = true;
			sprite.buttonMode = true;
			sprite.draggable = true;
			sprite.mousedown = start_rotate_selection.bind(sprite, angle);
			sprite.rotation = -angle; //no idea why rotations are reversed, but they are
			sprite.x = x;
			sprite.y = y;
			objectContainer.addChild(sprite);
			return sprite;
		}
				
		rotate_arrow0 = create_rotate_arrow(box_x + select_box.width + arrow_width/2 + y_abs(ROTATE_ARROW_MARGIN) * zoom_level, box_y + select_box.height/2, 0);
		rotate_arrow1 = create_rotate_arrow(box_x + select_box.width/2, box_y - arrow_width/2 - y_abs(ROTATE_ARROW_MARGIN) * zoom_level, Math.PI/2);
		rotate_arrow2 = create_rotate_arrow(box_x - arrow_width/2 - y_abs(ROTATE_ARROW_MARGIN) * zoom_level, box_y + select_box.height/2, Math.PI);
		rotate_arrow3 = create_rotate_arrow(box_x + select_box.width/2, box_y + arrow_width/2 + select_box.height + y_abs(ROTATE_ARROW_MARGIN) * zoom_level, -Math.PI/2);

		objectContainer.addChild(select_box);		
	}

	render_scene();
}

function draw_select_box(shape) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(1 * zoom_level, 16777215, 0.2);
	graphic.beginFill(16777215, 0.2);
	graphic.drawShape(shape);
	graphic.endFill();
	var sprite = new PIXI.Sprite(renderer.generateTexture(graphic));
	return sprite;
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
	undo_list.push(clone_action(["select", selected_entities, previously_selected_entities]));
}

function remove_select_box() {
	limit_rate(15, select_box_move_state, function() {});
	if (select_box) {
		select_box.mousedown = undefined;
		select_box.mousemove = undefined;
		select_box.mouseup = undefined;
		select_box.mouseout = undefined;
		select_box.mouseover = undefined;
		select_box.mouseupoutside = undefined;
		objectContainer.mousedown = on_left_click;
		objectContainer.removeChild(select_box);
		objectContainer.removeChild(rotate_arrow0);
		objectContainer.removeChild(rotate_arrow1);
		objectContainer.removeChild(rotate_arrow2);
		objectContainer.removeChild(rotate_arrow3);
		select_box = undefined;
		render_scene();
	}
	$('html,body').css('cursor', 'default');
}

function deselect_all() {
	remove_select_box();
	previously_selected_entities = selected_entities;
	for (var entity in selected_entities) {
		selected_entities[entity].container.filters = undefined;
		selected_entities[entity].container.alpha = selected_entities[entity].alpha;
	}
	selected_entities = [];
}

var INTERPOLATION_RESOLUTION = 25;
var INTERPOLATION_TENSION = 0.5;
var INTERPOLATION_LOOKBACK = 10;

function smooth_draw(context, point_buffer, closed) {
	var splinePoints = getCurvePoints(point_buffer, INTERPOLATION_TENSION, INTERPOLATION_RESOLUTION, closed);
	context.beginPath();
	context.moveTo(splinePoints[0], splinePoints[1]);
	for (var i = 2; i < splinePoints.length; i+=2) {
		context.lineTo(splinePoints[i], splinePoints[i+1]);
	}
	context.stroke();
	
	//normall I'd just return the last 2 points, but the arrow will always turn out crooked, so I look back a bit further
	var a = (splinePoints[splinePoints.length-2] - splinePoints[splinePoints.length-20])
	var b = (splinePoints[splinePoints.length-1] - splinePoints[splinePoints.length-19])
	var len = Math.sqrt(Math.pow(a,2) + Math.pow(b,2))
	a /= len;
	b /= len;
	
	return [[splinePoints[splinePoints.length-2]-a , splinePoints[splinePoints.length-1]-b], [splinePoints[splinePoints.length-2], splinePoints[splinePoints.length-1]]];	
}

function smooth_draw_incremental(context1, context2, point_buffer, complete) {
	var splinePoints = getCurvePoints(point_buffer, INTERPOLATION_TENSION, INTERPOLATION_RESOLUTION);
	
	var start_i = INTERPOLATION_LOOKBACK * INTERPOLATION_RESOLUTION;
	if (point_buffer.length < 2 * INTERPOLATION_LOOKBACK) {
		start_i = 0;
	}
	if (point_buffer.length == 3 * INTERPOLATION_LOOKBACK) {
		start_i = 2 * INTERPOLATION_LOOKBACK * INTERPOLATION_RESOLUTION;
	}
	
	context2.moveTo(splinePoints[start_i], splinePoints[start_i+1]);
	context2.beginPath();		
	for (var i = start_i+2; i < splinePoints.length; i+=2) {
		context2.lineTo(splinePoints[i], splinePoints[i+1]);
	}
	context2.stroke();
	
	if (point_buffer.length == 2*INTERPOLATION_LOOKBACK || point_buffer.length == 3*INTERPOLATION_LOOKBACK || complete) {
		var start_i = INTERPOLATION_LOOKBACK * INTERPOLATION_RESOLUTION;
		var end_i = complete ? splinePoints.length : splinePoints.length-((INTERPOLATION_LOOKBACK-2) * INTERPOLATION_RESOLUTION);

		if (point_buffer.length == 2*INTERPOLATION_LOOKBACK) {
			start_i = 2;
			context1.beginPath();
			context1.moveTo(splinePoints[0], splinePoints[1]);
		}
		
		//I prefer the beginpath option, but I can't get linedash patterns to line up
		//context1.beginPath();
		context1.clearRect(0, 0, context1.canvas.width, context1.canvas.height);
		
		var i;
		for (i = start_i; i < end_i; i+=2) {
			context1.lineTo(splinePoints[i], splinePoints[i+1]);
		}
		
		context1.stroke();

		if (point_buffer.length == 3 * INTERPOLATION_LOOKBACK) {
			point_buffer.splice(0, INTERPOLATION_LOOKBACK);
		}
	}
}

var draw_state = {}
var point_buffer = []
function on_draw_move(e) {
	limit_rate(20, draw_state, function() {
		var mouse_location = renderer.plugins.interaction.eventData.data.global;

		var new_x = last_point[0] * MOUSE_DRAW_SMOOTHING + (1-MOUSE_DRAW_SMOOTHING) * mouse_location.x;
		var new_y = last_point[1] * MOUSE_DRAW_SMOOTHING + (1-MOUSE_DRAW_SMOOTHING) * mouse_location.y;	
		new_drawing.path.push([from_x_local(new_x) - new_drawing.x, from_y_local(new_y) - new_drawing.y]);
		
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);
		
		point_buffer.push(new_x, new_y, mouse_location.x, mouse_location.y);
		smooth_draw_incremental(draw_context, temp_draw_context, point_buffer);
		point_buffer.pop();
		point_buffer.pop();

		new_drawing.path.push([from_x_local(mouse_location.x) - new_drawing.x, from_y_local(mouse_location.y) - new_drawing.y]);
		
		draw_end_path(temp_draw_context, new_drawing);
		
		new_drawing.path.pop();
		
		last_point = [new_x, new_y];
	});
}

function on_draw_end(e) {
	limit_rate(20, draw_state, function() {});

	var mouse_location = renderer.plugins.interaction.eventData.data.global;
	var new_x = last_point[0];
	var new_y = last_point[1];	
	
	point_buffer.push(new_x, new_y, mouse_location.x, mouse_location.y);
	smooth_draw_incremental(draw_context, temp_draw_context, point_buffer, true);
	
	new_drawing.path.push([from_x_local(mouse_location.x) - new_drawing.x, from_y_local(mouse_location.y) - new_drawing.y]);
	
	draw_context.beginPath();
	draw_end_path(draw_context, new_drawing);
	
	var success = canvas2container(draw_context, draw_canvas, new_drawing);
	if (success) {
		emit_entity(new_drawing);
		undo_list.push(clone_action(["add", [new_drawing]]));
	}
		
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);
	draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
	draw_context.beginPath();
	temp_draw_context.beginPath();
	
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


function drawRotatedImage(context, image, angle) { 
	context.save();
	context.translate((image.width/2), (image.height/2));
	context.rotate(angle);
	context.translate(-(image.width/2), -(image.height/2));
	context.drawImage(image, 0, 0);
 	context.restore(); 
}


function draw_end_path(context, drawing) {
	if (drawing.path.length >= ARROW_LOOKBACK) {
		var i = Math.max(0, drawing.path.length-ARROW_LOOKBACK);
		var a = [to_x_local(drawing.x + drawing.path[i][0]), to_y_local(drawing.y + drawing.path[i][1])]
		var b = [to_x_local(drawing.x + drawing.path[drawing.path.length-1][0]), to_y_local(drawing.y + drawing.path[drawing.path.length-1][1])]
		draw_end(context, drawing, a, b);
	}
}

//draw end. The default scale is if you are drawing on a canvas the exact size of the render window
function draw_end(context, drawing, a, b, scale) {
	if (scale === undefined) scale = 1/zoom_level;
	var size = 10 * (size_y/1000) * scale;
	if (drawing.end_size) {			
		size = drawing.end_size * (size_y/1000) * scale;
	}
	context.stroke();
	context.beginPath();
	if (drawing.end == "arrow") {
		draw_arrow(context, a, b, size);
	} else if (drawing.end == "T") {
		draw_T(context, a, b, size);
	}
}

function draw_arrow(context, a, b, size) {
	var x_diff = b[0] - a[0];
	var y_diff = b[1] - a[1];
	l = Math.sqrt(Math.pow(x_diff,2) + Math.pow(y_diff,2));
	x_diff /= l;
	y_diff /= l;
	drawArrow(context, b[0], b[1], b[0]+x_diff, b[1]+y_diff, 3, 1, Math.PI/8, size * ARROW_SCALE2);
}

function draw_T(context, a, b, size) {
	size *= TEND_SCALE2;
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

function canvas2sprite(_context, _canvas) {
	var sprite = createSprite(_context, _canvas);
		
	if (sprite) {
		//rescale to objectContainer
		sprite.height /= objectContainer.scale.x;
		sprite.width /= objectContainer.scale.y;
		return sprite;
	} else {
		return false; //failure
	}
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

function init_shape_canvas(_context, shape, scale) {
	if(scale === undefined) scale = 1;
	init_canvas(_context, shape.outline_thickness * scale, shape.outline_color, shape.style, shape.fill_opacity, shape.fill_color, shape.outline_opacity)
}

function canvas2container2(_context, _canvas, entity) {
	var texture = PIXI.Texture.fromCanvas(_canvas);
	var sprite = new PIXI.Sprite(texture);
		
	if (sprite) {
		entity.container = sprite;		
		
		//make draggable
		sprite.texture.baseTexture.source.src = entity.uid;
		sprite.hitArea = new PIXI.TransparencyHitArea.create(sprite, false);
		make_draggable(sprite);
		sprite.entity = entity;
		
		//send off
		room_data.slides[active_slide].entities[entity.uid] = entity;
		return true; //success
	} else {
		return false; //failure
	}
}

function draw_entity(drawing, quality_scale, thickness_scale, extra_margin, draw_function) {
	var color = '#' + ('00000' + (drawing.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	var _context = _canvas.getContext("2d");

	var points = []

	var base_resolution = background_sprite.height;
	
	var quality = quality_scale;
	if (drawing.draw_zoom_level) {
		quality /= drawing.draw_zoom_level;
	}
	
	var base_thickness = thickness_scale * quality * (background_sprite.height / renderer.view.height);	
	var margin = 20 + extra_margin * base_thickness;

	if (drawing.path.length > 0) {
		var left = 9999, top = 9999, right = -9999, bottom = -9999;
		for (var i = 0; i < drawing.path.length; i++) {
			var x = drawing.path[i][0];
			var y = drawing.path[i][1];
			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
			points.push(base_resolution * x * quality, base_resolution * y * quality);
		}
				
		_canvas.width = base_resolution * (right - left) * quality + margin;
		_canvas.height = base_resolution * (bottom - top) * quality + margin;
		
		//shift everything, this should make all coords > margin.
		var x_diff = -left * base_resolution * quality + margin/2;
		var y_diff = -top * base_resolution * quality + margin/2;
		for (var i = 0; i < points.length; i+=2) {
			points[i] += x_diff;
			points[i+1] += y_diff;
		}
		
		draw_function(_context, points, quality, base_thickness);
		
		canvas2container2(_context, _canvas, drawing);	
		
		drawing.container.height /= (quality) ;
		drawing.container.width /= (quality) ;
		drawing.container.x = x_abs(drawing.x) + x_abs(left) - (margin/2) / quality;
		drawing.container.y = y_abs(drawing.y) + y_abs(top) - (margin/2) / quality;
	
		drawing.container.orig_scale = [drawing.container.scale.x, drawing.container.scale.y];
		objectContainer.addChild(drawing.container);
		
		render_scene();
	}
}

function create_drawing2(drawing, quality_scale, thickness_scale) {
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;	
	var extra_margin = drawing.thickness;
	if (drawing.end_size) {
		extra_margin = drawing.end_size;
	}
	draw_entity(drawing, quality_scale, thickness_scale, extra_margin, function(_context, points, quality, base_thickness) {
		init_canvas(_context, drawing.thickness * base_thickness, drawing.color, drawing.style);	
		var end_points = smooth_draw(_context, points);
		if (drawing.end) {
			if (drawing.path.length >= ARROW_LOOKBACK) {
				var j = Math.max(0, drawing.path.length-ARROW_LOOKBACK);
				end_points[0] = [points[2*j], points[2*j+1]];
			}
			draw_end(_context, drawing, end_points[0], end_points[1], base_thickness);
		}
	});
}

function create_curve2(drawing, quality_scale, thickness_scale) {
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;
	var extra_margin = drawing.thickness;
	if (drawing.end_size) {
		extra_margin = drawing.end_size;
	}
	draw_entity(drawing, quality_scale, thickness_scale, extra_margin, function(_context, points, quality, base_thickness) {
		init_canvas(_context, drawing.thickness * base_thickness, drawing.color, drawing.style);
		var end_points = smooth_draw(_context, points, false);
		if (drawing.end) {
			draw_end(_context, drawing, end_points[0], end_points[1], base_thickness);
		}
	});
}

function create_line2(line, quality_scale, thickness_scale) {
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;
	var extra_margin = line.thickness;
	if (line.end_size) {
		extra_margin = line.end_size;
	}
	draw_entity(line, quality_scale, thickness_scale, extra_margin, function(_context, points, quality, base_thickness) {		
		init_canvas(_context, line.thickness * base_thickness, line.color, line.style);
		_context.moveTo(points[0], points[1]);
		for (var i = 2; i < points.length; i+=2) {
			_context.lineTo(points[i], points[i+1]);
		}
		_context.stroke();	
		var a;
		if (line.path.length == 1) {
			a = [x_diff, y_diff];
		} else {
			a = [points[points.length-4], points[points.length-3]];
		}
		var b = [points[points.length-2], points[points.length-1]];
		draw_end(_context, line, a, b, base_thickness);
	});
}

function create_area2(area, quality_scale, thickness_scale) {
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;
	var extra_margin = area.outline_thickness;
	if (area.path[area.path.length-1] == [0,0]) {
		area.path.pop();
	}
	draw_entity(area, quality_scale, thickness_scale, extra_margin, function(_context, points, quality, base_thickness) {
		init_shape_canvas(_context, area, base_thickness);
		var end_points = smooth_draw(_context, points, true);
		_context.fill();
	});
}

function create_polygon2(polygon, quality_scale, thickness_scale) {
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;
	var extra_margin = polygon.outline_thickness;
	draw_entity(polygon, quality_scale, thickness_scale, extra_margin, function(_context, points, quality, base_thickness) {
		init_shape_canvas(_context, polygon, base_thickness);
		_context.moveTo(points[0], points[1]);
		for (var i = 2; i < points.length; i+=2) {
			_context.lineTo(points[i], points[i+1]);
		}
		_context.lineTo(points[0], points[1]);
		_context.stroke();
		_context.fill();
	});
}

function create_rectangle2(rectangle, quality_scale, thickness_scale) {	
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;
	var extra_margin = rectangle.outline_thickness;
	
	var _canvas = document.createElement("canvas");
	var _context = _canvas.getContext("2d");
	
	var base_resolution = background_sprite.height;
	
	var quality = quality_scale;
	if (rectangle.draw_zoom_level) {
		quality /= rectangle.draw_zoom_level;
	}
	
	var base_thickness = thickness_scale * quality * (background_sprite.height / renderer.view.height);	
	var margin = 20 + extra_margin * base_thickness;
	
	_canvas.width = base_resolution * rectangle.width * quality + margin;
	_canvas.height = base_resolution * rectangle.height * quality + margin;
	
	init_shape_canvas(_context, rectangle, base_thickness);
	
	_context.fillRect(margin/2, margin/2, base_resolution * rectangle.width * quality, base_resolution * rectangle.height * quality); 
	_context.strokeRect(margin/2, margin/2, base_resolution * rectangle.width * quality, base_resolution * rectangle.height * quality);

	canvas2container2(_context, _canvas, rectangle);

	rectangle.container.x = x_abs(rectangle.x) - (margin/2) / quality;
	rectangle.container.y = y_abs(rectangle.y) - (margin/2) / quality;
	rectangle.container.width /= quality;
	rectangle.container.height /= quality;
	
	rectangle.container.orig_scale = [rectangle.container.scale.x, rectangle.container.scale.y];
	objectContainer.addChild(rectangle.container)
	
	render_scene();
}

function create_circle2(circle, quality_scale, thickness_scale) {	
	if (!quality_scale) quality_scale = 1;
	if (!thickness_scale) thickness_scale = 1;
	var extra_margin = circle.outline_thickness;
	
	var _canvas = document.createElement("canvas");
	var _context = _canvas.getContext("2d");
	
	var base_resolution = background_sprite.height;
	
	var quality = quality_scale;
	if (circle.draw_zoom_level) {
		quality /= circle.draw_zoom_level;
	}
	
	var base_thickness = thickness_scale * quality * (background_sprite.height / renderer.view.height);	
	var margin = 20 + extra_margin * base_thickness;
	
	_canvas.width = 2 * base_resolution * circle.radius * quality + margin;
	_canvas.height = 2 * base_resolution * circle.radius * quality + margin;
	
	init_shape_canvas(_context, circle, base_thickness);

	var radius = to_x_local_vect(circle.radius);
	var offset = base_resolution * circle.radius * quality + margin/2;
		
	_context.beginPath();	
	_context.arc(offset, offset, base_resolution * circle.radius * quality, 0, 2*Math.PI);
	_context.fill();
	_context.stroke();
	
	if (circle.draw_radius) {
		_context.save();
		_context.lineWidth = 2 * (size_y/1000);
		_context.strokeStyle = "#FFFFFF";
		_context.fillStyle = "#FFFFFF";
		_context.beginPath();
		_context.moveTo(offset, offset);		
		_context.lineTo(offset + base_resolution * quality * (circle.draw_radius[0]), offset + base_resolution * quality * (circle.draw_radius[1]));
		_context.stroke();
		var mid_line_x = offset + base_resolution * quality * (circle.draw_radius[0]) / 2;
		var mid_line_y = offset + base_resolution * quality * (circle.draw_radius[1]) / 2;
		_context.font = "22px Arial";
		var length = Math.sqrt(Math.pow(background.size_x * (circle.draw_radius[0]), 2) + Math.pow(background.size_y * 
		(circle.draw_radius[1]), 2))
		_context.lineWidth = to_y_local(0.5)/1000;
		_context.strokeStyle = "#000000";
		_context.fillStyle = "#FFFFFF";
		var label = "";
		if (game == "lol") {
			label += Math.round(10*length)/10 + "u";
		} else if (game == "wows") {
			label += Math.round(0.01*length)/10 + "km";
		} else {
			label += Math.round(10*length)/10 + "m";
		}
		_context.fillText(label, mid_line_x, mid_line_y);
		_context.restore();
}
	
	canvas2container2(_context, _canvas, circle);
	
	circle.container.x = x_abs(circle.x) - base_resolution * circle.radius - (margin/2) / quality;
	circle.container.y = y_abs(circle.y) - base_resolution * circle.radius - (margin/2) / quality;
	circle.container.width /= quality;
	circle.container.height /= quality;
	
	circle.container.orig_scale = [circle.container.scale.x, circle.container.scale.y];
	objectContainer.addChild(circle.container)
	
	render_scene();
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
	emit_entity(entity);
	render_scene();
}

function update_timeline(entity) {
	if (entity.start_time) {	
		var time = entity.start_time;
		while (timeline_entities[time]) {
			time += EPSILON;
		}
		timeline.add(time);
		timeline_entities[time] = entity;
		time = entity.end_time;
		while (timeline_entities[time]) {
			time += EPSILON;
		}
		timeline.add(time)
		timeline_entities[time] = entity;
	}
}

function rebuild_timeline(entity) {
	timeline = new FastPriorityQueue();
	timeline_entities = {}; //time->entity map
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
			if (room_data.slides[active_slide].entities[key].container) {
				update_timeline(room_data.slides[active_slide].entities[key]);
				remove(key, true);
			}
		}
	}
}

function progress_timeline() {
	if (timeline.isEmpty()) return;
	var time = video_progress();
	var next_event_time = timeline.peek();
	
	while (time >= next_event_time) {
		var entity = timeline_entities[next_event_time];
		if (video_progress() >= entity.end_time) {
			if (entity.container) {
				remove(entity.uid, true);
			}
		} else if (entity.start_time <= time) {
			if (!entity.container) {
				create_entity(entity);
			}
		} 
		timeline.poll();
		if (timeline.isEmpty()) break;
		next_event_time = timeline.peek();		
	}
}

function emit_entity(entity) {
	var container = entity.container;
	if (background.is_video) {
		entity.start_time = video_progress();
		entity.end_time = video_progress() + delay;
		update_timeline(entity);
	}	
	entity.container = undefined;
	socket.emit('create_entity', room, entity, active_slide);
	room_data.slides[active_slide].z_top++;
	entity.z_index = room_data.slides[active_slide].z_top;
	entity.container = container;
	center_anchor(entity.container);
}

function on_icon_end(e) {	
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);
	
	var color = icon_color;
	if (selected_icon_no_color) {
		color = 16777215; //white
	}
	
	var size = icon_size*icon_extra_scale*ICON_SCALE;
	size *= zoom_level;
	var x = mouse_x_rel(mouse_location.x) - (size/2);
	var y = mouse_y_rel(mouse_location.y) - (size/2);
	
 	var icon = {uid:newUid(), type: 'icon', tank:selected_icon, x:x, y:y, size:size, color:color, alpha:1, label:$('#icon_label').val(), label_font_size: label_font_size * zoom_level, label_color: "#ffffff", label_font: "Arial", label_pos:label_position, label_background:$('#label_background').get(0).checked, draw_zoom_level:zoom_level}
	
	if (icon.label_background) {
		icon.label_color = "#000000";
	}
	
	undo_list.push(clone_action(["add", [icon]]));
	create_icon(icon, snap_and_emit_entity);
}

function on_text_end(e) {
	var msg = $('#text_tool_text').val();
	setup_mouse_events(undefined, undefined);
	if (msg == "") return;
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var text = {uid:newUid(), type: 'text', x:x, y:y, scale:[1,1], color:text_color, alpha:1, text:msg, font_size:font_size * zoom_level, font:'Arial', draw_zoom_level:zoom_level};
	undo_list.push(clone_action(["add", [text]]));
	current_text_element = text;
	create_text2(text);
	snap_and_emit_entity(text);
}

function on_background_text_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(background_sprite);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var background_text = {uid:newUid(), type: 'background_text', x:x, y:y, scale:[1,1], color:background_text_color, alpha:1, text:$('#text_tool_background_text').val(), font_size:background_font_size * zoom_level, font:'Arial', draw_zoom_level:zoom_level};
	undo_list.push(clone_action(["add", [background_text]]));
	create_background_text2(background_text);
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

		temp_draw_context.beginPath();
		temp_draw_context.moveTo(a[0], a[1]);		
		temp_draw_context.lineTo(b[0], b[1]);
		temp_draw_context.stroke();
		
		draw_end(temp_draw_context, new_drawing, a, b);	
	});
}

function on_line_end(e) {
	limit_rate(15, line_state, function() {});
	try {
		var mouse_location = e.data.getLocalPosition(background_sprite);
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);		
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
		draw_end(draw_context, new_drawing, a, b);

		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(clone_action(["add", [new_drawing]]));
		}
				
		setup_mouse_events(undefined, undefined);
		stop_drawing();
		new_drawing = null;
	}
}


function create_text_sprite(msg, color, font_size, font, background, label_shadow, font_modifier) {
	if(font_modifier === undefined) font_modifier = "";
	var _canvas = document.createElement("canvas");
	var scaling = objectContainer.scale.y;
	var _context = _canvas.getContext("2d");

	var text_quality = TEXT_QUALITY;
	_context.font = font_modifier + " " + Math.round(2 * font_size * scaling * text_quality) + "px "+font;
	
    var metrics = _context.measureText(msg);
	while (metrics.width > MAX_CANVAS_SIZE) {	
		text_quality /= 2;
		_context.font = font_modifier + " " + Math.round(2 * font_size * scaling * text_quality)+ "px "+font;
		metrics = _context.measureText(msg);
	}
	metrics = _context.measureText(msg);
	
	_canvas.height = font_size * scaling * text_quality * 2.5;	
	_canvas.width = metrics.width + _canvas.height*0.2;
	
	if (background) {
		_context.fillStyle = "#ffffff"
		_context.lineWidth = 25
		_context.fillRect(0, 0, metrics.width + _canvas.height*0.2, _canvas.height);
		_context.strokeRect(0, 0, metrics.width + _canvas.height*0.2, _canvas.height);
		
	}
	_context.fillStyle = color;
	_context.font = font_modifier + " " + Math.round(2 * font_size * scaling * text_quality) + "px "+font;

	if (label_shadow) {
		_context.shadowColor = "black";
		_context.shadowOffsetX = text_quality; 
		_context.shadowOffsetY = text_quality; 
		_context.shadowBlur = 5;
	}

	_context.fillText(msg, _canvas.height*0.1, _canvas.height/1.5+_canvas.height*0.1);
	
	var sprite = createSprite(_context, _canvas);
		
	if (sprite) {
		//rescale to objectContainer
		var ratio =	sprite.width / sprite.height;
		sprite.height = Math.round(2 * font_size * scaling) / objectContainer.scale.x;
		sprite.width = sprite.height * ratio;

		sprite.x = 0;
		sprite.y = 0;
		return sprite;
	} else {
		return false;
	}
}

function create_text2(text_entity) {
	var color = '#' + ('00000' + (text_entity.color | 0).toString(16)).substr(-6); 
	var sprite = create_text_sprite(text_entity.text, color, TEXT_SCALE * text_entity.font_size, text_entity.font, false, true)
	
	var ratio = sprite.width / sprite.height;
	sprite.height = x_abs(text_entity.font_size / 530)
	sprite.width = sprite.height * ratio;
	
	if (sprite) {
		text_entity.container = sprite;		
		sprite.x = x_abs(text_entity.x)
		sprite.y = y_abs(text_entity.y)
		
		objectContainer.addChild(sprite);
		
		//make draggable
		sprite.texture.baseTexture.source.src = text_entity.uid;
		make_draggable(sprite);
		sprite.entity = text_entity;
		
		//send off
		room_data.slides[active_slide].entities[text_entity.uid] = text_entity;
		render_scene();	
	}
}

function create_background_text2(text_entity) {
	var color = '#' + ('00000' + (text_entity.color | 0).toString(16)).substr(-6); 
	var sprite = create_text_sprite(text_entity.text, color, BACKGROUND_TEXT_SCALE * text_entity.font_size, text_entity.font, true, false)

	var ratio = sprite.width / sprite.height;
	sprite.height = x_abs(text_entity.font_size / 440)
	sprite.width = sprite.height * ratio;
	
	if (sprite) {
		text_entity.container = sprite;		
		sprite.x = x_abs(text_entity.x)
		sprite.y = y_abs(text_entity.y)
		
		objectContainer.addChild(sprite);
		
		//make draggable
		sprite.texture.baseTexture.source.src = text_entity.uid;
		make_draggable(sprite);
		sprite.entity = text_entity;
		
		//send off
		room_data.slides[active_slide].entities[text_entity.uid] = text_entity;
		render_scene();	
	}
}

function nearestPow2( aSize ){
  return Math.pow( 2, Math.round( Math.log( aSize ) / Math.log( 2 ) ) ); 
}

function create_icon_cont(icon, texture) {
	var sprite = new PIXI.Sprite(texture);
	sprite.tint = icon.color;

	var ratio = sprite.width / sprite.height;
	
	icon.container = sprite;
	icon.container.x = x_abs(icon.x);
	icon.container.y = y_abs(icon.y);

	sprite.height = x_abs(icon.size);
	sprite.width = sprite.height * ratio;
	
	center_anchor(sprite);
	
	if (icon.label && icon.label != "") {
		var text = create_text_sprite(icon.label, icon.label_color, ICON_LABEL_SCALE * icon.label_font_size, icon.label_font, icon.label_background, !icon.label_background, icon.label_font_modifier)
	
		var label_pos = icon.label_pos;
		if (!label_pos) {
			label_pos = "pos_bottom";
		}

		icon.container.addChild(text);
		
		var label_scale;
		if (!icon.label_background) {
			label_scale = 680;
		} else {
			label_scale = 450;
		}
		
		var ratio = text.width / text.height;
		text.height = x_abs(icon.label_font_size / label_scale) / icon.container.scale.y
		text.width = text.height * ratio;
		
		var sprite_width = sprite.width / sprite.scale.x
		var sprite_height = sprite.height / sprite.scale.y
		
		if (label_pos == 'pos_bottom') {
			text.x -= text.width/2;
			text.y += sprite_height/2;
		} else if (label_pos == 'pos_top') {
			text.x -= text.width/2;
			text.y -= text.height + sprite_height/2;
		} else if (label_pos == 'pos_left') {
			text.x -= (text.width + sprite_width/2);
			text.y -= text.height/2;
		} else if (label_pos == 'pos_right') {
			text.x += sprite_width/2;
			text.y -= text.height/2;
		} else if (label_pos == 'pos_top_left') {
			text.x -= (text.width + sprite_width/2);
			text.y -= sprite_height/2 + text.height/2;	
		} else if (label_pos == 'pos_top_right') {
			text.x += sprite_width/2;
			text.y -= sprite_height/2 + text.height/2;			
		} else if (label_pos == 'pos_bottom_left') {
			text.x -= (text.width + sprite_width/2);
		} else if (label_pos == 'pos_bottom_right') {
			text.x += sprite_width/2;
		}
		
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
		counter[0].innerHTML = parseInt(counter[0].innerHTML)+1;
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
	if (dragging_enabled) {
		root.interactive = true;
		root.buttonMode = true;
		root.draggable = true;
		root.mousedown = on_drag_start;
		root.touchstart = on_drag_start;		
	}
	root.orig_scale = [root.scale.x, root.scale.y];
}

function make_undraggable(root) {
	root.interactive = false;
    root.buttonMode = false;
	root.draggable = false;
	delete root.mousedown;
	delete root.touchstart;
}


function center_anchor(obj) {
	var anchor_diff_x = 0.5 - obj.anchor.x;
	var anchor_diff_y = 0.5 - obj.anchor.y;
	obj.anchor.x = 0.5;
	obj.anchor.y = 0.5;
    obj.x += anchor_diff_x * obj.width;
    obj.y += anchor_diff_y * obj.height;
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
		create_text2(entity);
	} else if (entity.type == 'background_text') {
		create_background_text2(entity);
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

	if (entity.container) {
		if (entity.scale) {
			entity.container.scale.x = entity.container.orig_scale[0] * entity.scale[0];
			entity.container.scale.y = entity.container.orig_scale[1] * entity.scale[1];
		}
			
		if (entity.container.anchor) {
			center_anchor(entity.container);
		}
		
		if (entity.rotation) {
			entity.container.rotation = -entity.rotation;
		}
		
		adjust_zoom(entity)
	
		if (background.is_video) {
			update_timeline(entity);
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
			var node = "<div class='btn' style='text-align:left;' id='" + user.id + "'><input maxlength='30' type='text' placeholder='"+ escapeHtml(user.name) + "'></div>";
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
			var node = "<button class='btn' style='text-align:left;' data-toggle='tooltip' title='Click to toggle this user&#39;s permission.' id='" + user.id + "'>" + escapeHtml(user.name) + "</button>";
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
		$('#sign_in_text').text(my_user.name.substring(0,9));
		$('#login_dropdown').removeClass('btn-warning')
		$('#login_dropdown').addClass('btn-success')
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
		$('.mejs-controls').hide();
		$('.left_column').hide();
		$('#slide_interactive').hide();
		$('#slide_static').show();
		$('#slide_table1').hide();
		$('#can_not_edit').show();
		$('#map_select_box').hide();
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
		if (active_context == 'ping_context') {
			objectContainer.mousemove = undefined;
		}
	} else {
		$('.mejs-controls').show();
		$('.left_column').show();
		$('#slide_interactive').show();
		$('#slide_static').hide();
		$('#slide_table1').show();
		$('#can_not_edit').hide();
		$('#map_select_box').show();
		for (var i in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[i] && room_data.slides[active_slide].entities[i].type == 'note') {
				if (room_data.slides[active_slide].entities[i].container) {
					$('textarea', room_data.slides[active_slide].entities[i].container.menu).prop('readonly', false);
					$('button', room_data.slides[active_slide].entities[i].container.menu).show();
				}
			}
		}
	}
	
	if (my_user.role == "owner" || !is_room_locked) {
		if (my_user.logged_in) { //logged in
			$("#store_tactic_popover").show();
			if (tactic_name && tactic_name != "") {
				$("#save").show();
			}
		} else {
			$("#store_tactic_popover").hide();
			$("#save").hide();
		}
		$('#export_tab_button').show();		
	} else {
		$("#store_tactic_popover").hide();
		$("#save").hide();
		$('#export_tab_button').hide();		
	}
	
	if (my_user.role == "owner") {
		$('#lock').show();
		$('#nuke_room').show();
		$('#lock_camera').show();

	} else {
		$('#lock').hide();
		$('#nuke_room').hide();
		$('#lock_camera').hide();
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

//taken from modernizr
function supports_color_input() {
    var inputElem = document.createElement('input'), bool, docElement = document.documentElement, smile = ':)';

    inputElem.setAttribute('type', 'color');
    bool = inputElem.type !== 'text';

    // We first check to see if the type we give it sticks..
    // If the type does, we feed it a textual value, which shouldn't be valid.
    // If the value doesn't stick, we know there's input sanitization which infers a custom UI
    if (bool) {

        inputElem.value         = smile;
        inputElem.style.cssText = 'position:absolute;visibility:hidden;';

        // chuck into DOM and force reflow for Opera bug in 11.00
        // github.com/Modernizr/Modernizr/issues#issue/159
        docElement.appendChild(inputElem);
        docElement.offsetWidth;
        bool = inputElem.value != smile;
        docElement.removeChild(inputElem);
    }

    return bool;
};

function initialize_color_picker(slider_id, variable_name) {
	if (supports_color_input()) {
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

function initialize_slider(slider_id, slider_text_id, variable_name) {
	var slider = $("#"+ slider_id);
	$("#"+slider_text_id).val(slider.attr('value'));
	window[variable_name] = parseFloat(slider.attr('value'));
	slider.on("change", function(slideEvt) {
		$("#"+slider_text_id).val(this.value);
		window[variable_name] = parseFloat(this.value);
	});
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
	undo_list.push(clone_action(["remove", cleared_entities]));
}

function clone_action(action) {
	if (action[1].length) {
		temp_containers = [];
		for (var i = 0; i < action[1].length; i++) {
			temp_containers.push(action[1][i].container);
			action[1][i].container = null;
		}
	}
	
	var new_action = JSON.stringify(action);
	
	if (action[1].length) {
		for (var i = 0; i < action[1].length; i++) {
			action[1][i].container = temp_containers[i];
		}
	}
	
	return JSON.parse(new_action);
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
			redo_list.push(clone_action(action));		
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var scale = action[1][i][0][2];
				var rotation = action[1][i][0][3];
				var uid = action[1][i][1];
				
				if (room_data.slides[active_slide].entities[uid]) { //still exists
					action[1][i][0][0] = room_data.slides[active_slide].entities[uid].x;
					action[1][i][0][1] = room_data.slides[active_slide].entities[uid].y;
					if (room_data.slides[active_slide].entities[uid].scale) {
						action[1][i][0][2] = [room_data.slides[active_slide].entities[uid].scale[0], room_data.slides[active_slide].entities[uid].scale[1]]
					} else {
						action[1][i][0][2] = [1,1]
					}
					if (typeof room_data.slides[active_slide].entities[uid].rotation !== 'undefined') {
						action[1][i][0][3] = room_data.slides[active_slide].entities[uid].rotation;
					}
					drag_entity(room_data.slides[active_slide].entities[uid], x, y, scale, rotation);
					socket.emit('drag', room, uid, active_slide, x, y, scale, rotation);
				}
			}
			redo_list.push(clone_action(action));
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				delete entity.container;
				socket.emit('create_entity', room, entity, active_slide);
				create_entity(entity);
			}
			redo_list.push(clone_action(action));
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
			redo_list.push(clone_action(action));
		}
	}
	render_scene();
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
			undo_list.push(clone_action(action));
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var scale = action[1][i][0][2];
				var rotation = action[1][i][0][3];
				var uid = action[1][i][1];
				if (room_data.slides[active_slide].entities[uid]) { //still exists
					action[1][i][0][0] = room_data.slides[active_slide].entities[uid].x;
					action[1][i][0][1] = room_data.slides[active_slide].entities[uid].y;
					if (room_data.slides[active_slide].entities[uid].scale) {
						action[1][i][0][2] = [room_data.slides[active_slide].entities[uid].scale[0], room_data.slides[active_slide].entities[uid].scale[1]]
					} else {
						action[1][i][0][2] = [1,1]
					}
					if (typeof room_data.slides[active_slide].entities[uid].rotation !== 'undefined') {
						action[1][i][0][3] = room_data.slides[active_slide].entities[uid].rotation;
					}
					drag_entity(room_data.slides[active_slide].entities[uid], x, y, scale, rotation);
					socket.emit('drag', room, uid, active_slide, x, y, scale, rotation);
				}
			}
			undo_list.push(clone_action(action));
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					remove(entity.uid);
					delete entity.container;
					socket.emit('remove', room, entity.uid, active_slide);
				}
			}
			undo_list.push(clone_action(action));
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
			undo_list.push(clone_action(action));
		}
		render_scene();
	}
	
}

function clear_selected() {
	remove_select_box();
	var clone = selected_entities.slice(0);
	var cleared_entities = [];
	for (var i in clone) {
		var entity = clone[i];
		remove(clone[i].uid);
		cleared_entities.push(entity)
		socket.emit('remove', room, entity.uid, active_slide);
	}
	deselect_all();
	selected_entities = [];
	undo_list.push(clone_action(["remove", cleared_entities]));
	if (active_context == "drag_context") {
		cancel_drag(true);
	}
}

function drag_entity(entity, x, y, scale, rotation) {
	if (!entity.container) return;
	entity.container.x += x_abs(x-entity.x);
	entity.container.y += y_abs(y-entity.y);
	entity.x = x;
	entity.y = y;
	entity.scale = scale;
	if (typeof rotation !== 'undefined' && rotation != null) {
		entity.rotation = rotation;
		entity.container.rotation = -rotation;
	}
	if (entity.type == 'note') {
		align_note_text(entity);
	}
	if (entity.container) {
		objectContainer.removeChild(entity.container);
		objectContainer.addChild(entity.container);
		if (scale) {
			entity.container.scale.x = entity.container.orig_scale[0] * scale[0];
			entity.container.scale.y = entity.container.orig_scale[1] * scale[1];
		}
	}
	
	select_box_dirty = false;
	for (var i in selected_entities) {
		if (selected_entities[i].uid == entity.uid) {
			select_box_dirty = true;
		}
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
	
	var name = escapeHtml(room_data.slides[active_slide].name);
	$('#slide_name_field').val(name);
	$('#slide_name_field2').val(name);
	
	var current_slide_uid = find_first_slide();
	var table = $('#slide_table');
	
	table.empty();	
	do {
		var name = escapeHtml(room_data.slides[current_slide_uid].name);
				
		if (current_slide_uid == active_slide) {
			table.append("<tr id='" + current_slide_uid + "' style='background-color:#ADD8E6'><td><a id='" + current_slide_uid + "'>" + name + "</a></td></tr>");
		} else {
			table.append("<tr id='" + current_slide_uid + "'><td><a id='" + current_slide_uid + "'>" + name + "</a></td></tr>");
		}
		
		current_slide_uid = find_next_slide(room_data.slides[current_slide_uid].order);
		
	} while (current_slide_uid != 0);
	
	//TODO: Future me, figure out why it resets the scrollbar just AFTER this function ends, I'm too stupid to figure it out
	var scrolltop = $('#slide_container').scrollTop();
	setTimeout(function() {
		$('#slide_container').scrollTop(scrolltop);
	},0);
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
		var key = to_transition[i];
		if (room_data.slides[slide].entities[key].type == "background") {
			new_background_uid = key;
		} else {
			remove(key, true);
			to_add.push(key);
		}
	}

	active_slide = slide;
	update_slide_buttons();
	
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
	}

	//we need to set the background first cause the canvases may need to be resized before we can draw on them
	if (new_background_uid) {	
		set_background(room_data.slides[slide].entities[new_background_uid], function() {
			add_other_entities();
			render_scene();
		});
	} else {
		add_other_entities();
		render_scene();
	}
}

function cancel_drag(abort) {
	clearTimeout(drag_timeout);
	objectContainer.buttonMode = false;	
	
	if (context_before_drag) {
		active_context = context_before_drag;
	}
	context_before_drag = null;
	if (dragged_entity) {
		dragged_entity.mouseup = undefined;
		dragged_entity.touchend = undefined;
		dragged_entity.mouseupoutside = undefined;
		dragged_entity.touchendoutside = undefined;
		dragged_entity.mousemove = undefined;
		dragged_entity.touchmove = undefined;
		if (abort) {
			if (move_selected && selected_entities.length > 0) {
				for (var i in selected_entities) {
					drag_entity(selected_entities[i], selected_entities[i].origin_x, selected_entities[i].origin_y);
				}
			} else {
				drag_entity(dragged_entity.entity, dragged_entity.entity.origin_x, dragged_entity.entity.origin_y);
			}		
		}
		if (dragged_entity == select_box) {
			make_resizable(select_box);
			on_select_over.bind(select_box)();
			on_selectbox_move.bind(select_box)();
		}
	}
	dragged_entity = null;
	move_selected = false;
}

function change_slide(slide) {
	if (active_slide == slide) {
		return;
	}
	if (active_context == "drag_context") {
		cancel_drag(true);
	}
	undo_list = [];
	redo_list = [];
	deselect_all();
	transition(slide);
	//sometimes it seems to be confused which context we were in.
	var context_node = $('#contexts').find(".active");
	var new_context = context_node.attr('id')+"_context";
	if ($(this).attr('data-context')) {
		new_context = context_node.attr('data-context')+"_context";
	}
	active_context = new_context;
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
		var path = map_select.val().trim();
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
	
	var extension = path.split('.').pop(); 
	extension.startsWith();
	
	var new_background = {uid:uid, type:'background', path:path, size_x:size_x, size_y:size_y, custom:custom};
	
	if (is_video(path)) {
		new_background.is_video = true;
	}
		
	set_background(new_background, function(success) {
		if (success) {
			socket.emit('create_entity', room, new_background, active_slide);
			if (background.is_video) {
				handle_pause(0)
				socket.emit('pause_video', room, 0);
			}
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
} 

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

//maybe a little bit of a misnomer, stop_syncing means don't send sync events, but if no sync events were received while playing
//do start syncing. The try stop_syncing is clearInterval(sync_event); im_syncing = false;
function stop_syncing() {
	im_syncing = false;
	clearInterval(sync_event);
	sync_event = setInterval(function() {
		im_syncing = false;
		if (video_paused) {
			clearInterval(sync_event);
			return;
		}
		if (Date.now() - get_local_time(last_video_sync[1]) > 20000) {
			start_syncing();
		}
	}, 10000 +  Math.random() * 5000);
}

function handle_play(frame, timestamp) {
	video_paused = false;
	last_video_sync = [frame, timestamp]
	var time = Date.now();
	var timer = time - get_local_time(timestamp);
	video_media.setCurrentTime(frame);
	if (timer <= 0) {
		video_player.play();
	} else {
		setTimeout(function() {
			video_player.play();
		}, timer)
	}
	
	video_player.play();
	stop_syncing();
	play_video_controls();
}

function handle_pause(frame, timestamp) {
	video_paused = true;
	clearInterval(sync_event);
	im_syncing = false;
	video_media.setCurrentTime(frame);
	video_player.pause();
	pause_video_controls();
}

function sync_video(frame, timestamp) {	
	var time = Date.now();
	var elapsed_time = time - get_local_time(timestamp);
	var estimated_frame = frame + elapsed_time * base_playback_rate / 1000.0;
	var lag = video_progress()-estimated_frame;
	
	console.log('lag: ', lag)
		
	if (Math.abs(lag)/base_playback_rate > 0.1) {
		hard_sync_video(frame, timestamp);
	} else {	
		//should allow it to catch up over the course of VIDEO_SYNC_DELAY ms 
		//Not supported for youtube videos unfortunately
		if (video_media.pluginType != 'youtube') {
			set_playback_rate(base_playback_rate, base_playback_rate+lag/VIDEO_SYNC_DELAY);
		}
	}
}

function video_progress() {
	if (video_paused) {
		return video_media.currentTime;
	} else {
		return progress+ (Date.now() - progress_update) * playback_rate / 1000.0;
	}
}

function enable_dragging() {
	if (!dragging_enabled) {
		for (var i in room_data.slides[active_slide].entities) {
			var entity = room_data.slides[active_slide].entities[i];
			if (entity.container && entity.type != 'background') {
				dragging_enabled = true;
				entity.container.interactive = true;
				entity.container.buttonMode = true;
				entity.container.draggable = true;
				entity.container.mousedown = on_drag_start;
				entity.container.touchstart = on_drag_start;
			}
		}
	}
}

function disable_dragging() {
	if (dragging_enabled) {
		for (var i in room_data.slides[active_slide].entities) {
			var entity = room_data.slides[active_slide].entities[i];
			if (entity.container && entity.type != 'background') {
				dragging_enabled = false;
				entity.container.interactive = false;
				entity.container.buttonMode = false;
				entity.container.draggable = false;
				delete entity.container.mousedown;
				delete entity.container.touchstart;
			}
		}
	}
}

var sync_in_progress = false;
var press_play_delay = 0;
function hard_sync_video(frame, timestamp) {
	if (sync_in_progress) return;
	sync_in_progress = true;
		
	var time = Date.now();
	var elapsed_time = time - get_local_time(timestamp);		
	var estimated_frame = frame + elapsed_time * base_playback_rate / 1000;
	var lag = video_progress()-estimated_frame;
	
	if (lag < 0 || lag > 3) {	
		video_media.setCurrentTime(estimated_frame + 1);
		sync_in_progress = false;
	} else {
		var prog = video_progress();
		video_player.pause();
		setTimeout(function() {
			sync_in_progress = false;
			if (!video_paused) {
				video_player.play();
				var play_start = Date.now();
				var play_delay_listener = function(e) {
					press_play_delay = Date.now() - play_start;
					video_media.removeEventListener('play', play_delay_listener);
				}
				video_media.addEventListener('play', play_delay_listener);
			}
		}, Math.max(0, (lag * 1000)/base_playback_rate - press_play_delay));	
	}
}

function handle_sync(frame, timestamp, user_id) {
	if (video_paused) {
		im_syncing = false;
		return;
	}	
	if (user_id != my_user.id)  {
		stop_syncing(); //if we get a sync from someone else we stop syncing
	}
	
	last_video_sync = [frame, timestamp];
	sync_video(frame, timestamp);		
}

function set_playback_rate(base, rate) {
	base_playback_rate = base;
	playback_rate = rate;

	//update ui
	var speed_string = base.toFixed(2);	
	$('.mejs-speed-button').find('button').html(speed_string+'x');
	$('.mejs-speed-button').find('.mejs-speed-selected').removeClass('mejs-speed-selected');
	$('.mejs-speed-button').find('input[value="'+speed_string+'"]').next().addClass('mejs-speed-selected');
	
	if (video_media.pluginType == 'youtube') {
		video_media.pluginApi.setPlaybackRate(rate);
	} else {
		video_media.playbackRate = rate;
	}
}

function create_hp_bar(scale) {
	if(scale === undefined) scale = 1;
	
	var width = to_x_local_vect(0.125 * scale);
	var height = to_y_local_vect(0.015 * scale);
	
	var _canvas = document.createElement("canvas");
	var _context = _canvas.getContext("2d");
	
	_canvas.width = width;
	_canvas.height = height;
		
	_context.fillStyle = "#FFFFFF";
	_context.fillRect(0, 0, _canvas.width, _canvas.height); 
	
	var texture = PIXI.Texture.fromCanvas(_canvas);
	var green_bar = new PIXI.Sprite(texture);
	green_bar.tint = 65280;
	
	var _canvas2 = document.createElement("canvas");
	var _context2 = _canvas2.getContext("2d");
	
	_canvas2.width = width;
	_canvas2.height = height;

	_context2.strokeStyle="#000000";
	_context2.lineWidth = 1;
	_context2.strokeRect(0, 0, _canvas2.width, _canvas2.height); 

	var texture2 = PIXI.Texture.fromCanvas(_canvas2);
	var outline = new PIXI.Sprite(texture2);	

	var _canvas3 = document.createElement("canvas");
	var _context3 = _canvas3.getContext("2d");
	
	_canvas3.width = width;
	_canvas3.height = height;

	_context3.fillStyle="#FF0000";
	_context3.fillRect(0, 0, _canvas3.width, _canvas3.height); 
	
	var texture3 = PIXI.Texture.fromCanvas(_canvas3);
	var red_bar = new PIXI.Sprite(texture3);	
	
	var container = new PIXI.Container();
	container.addChild(red_bar);
	container.addChild(green_bar);
	container.addChild(outline);
	
	//container.scale.x *= zoom_level;
	//container.scale.y *= zoom_level;
	
	return container
}

var icons = {}

function wot_connect() {
	var top, left, bottom, right, width, height;
	var player_team = 1;
	
	
	websocket = new WebSocket('ws://localhost:6412/');
	connect(websocket);
	
	function clear_icons() {
		for (var i in icons) {
			if (icons[i] && icons[i].container) {
				objectContainer.removeChild(icons[i].container);
			}
		}		
		icons = {}
		render_scene();
	}
	
	function create_live_icon(icon) {
		create_icon(icon);

		//icons seems to always be off by a little bit, correct
		icon.container.x -= x_abs(0.012)
		icon.container.y -= y_abs(0.012)
		var bar = create_hp_bar()
		bar.scale.x *= zoom_level;
		bar.scale.y *= zoom_level;
		bar.x -= bar.width / 2
		bar.y -= icon.container.height + bar.height
		icon.container.addChild(bar);
		
		var name = create_text_sprite(icon.player.substring(0,9), icon.label_color, 8, "Arial", false, true, "bold");
		var ratio = name.width / name.height;
		name.height = x_abs(8 / 530)
		name.width = name.height * ratio;	
	
		
		name.x -= name.width/2
		name.y -= icon.container.height + bar.height + name.height
		icon.container.addChild(name);			

		icon.container.scale.x *= zoom_level;
		icon.container.scale.y *= zoom_level;
	}
	
	function connect(websocket) {
		websocket.onclose = function(evt) { 
			setTimeout(function() { 
				websocket = new WebSocket('ws://localhost:6412/'); 
				connect(websocket);
			}, 10000);
		};
		websocket.onerror = function(evt) { 
			websocket.close(); 
		};
		
		websocket.onopen = function(evt) { 
			clear_icons();
		};
		
		websocket.onmessage = function(evt) { 
			var reader = new window.FileReader();
			reader.readAsText(evt.data);		
			function transform_coords(coords) {
				return [(parseFloat(coords[0])-left)/width, 1-(parseFloat(coords[2])-top)/height];
			}
			
			reader.onloadend = function() {
				if (reader.result == "BATTLE_ENDED") {
					clear_icons();
				} else {
					var entity = JSON.parse(reader.result);
					if ('tank' in entity) {
						var color, hex_color
						if (entity.team == player_team) {
							color = 65280
							hex_color = "#AAFFAA";
						} else {
							color = 16711680
							hex_color = "#FFAAAA";
						}
						
						var icon = {uid:entity.id.toString(), type: 'icon', tank:entity.type, x:-1, y:-1, size:0.02, color:color, alpha:1, label:entity.tank.substring(0,10), label_font_size:8, label_color: hex_color, label_font: "Arial", label_font_modifier: "bold", label_pos:"pos_bottom", label_background:false, label_shadow:true, label_shadow:false, maxHealth:entity.maxHealth, player:entity.name}

						if (entity.position) {
							var coords = transform_coords(entity.position);
							icon.x = coords[0];
							icon.y = coords[1];	
							create_live_icon(icon);
						}
						
						icons[icon.uid] = icon;					
					} else if ('map_dimesions' in entity) {
						left = parseFloat(entity['map_dimesions'][0][0])
						right = parseFloat(entity['map_dimesions'][1][0])
						top = parseFloat(entity['map_dimesions'][0][1])
						bottom = parseFloat(entity['map_dimesions'][1][1])
						width = right - left
						height = bottom - top
					} else if ('player_team' in entity) {
						player_team = entity['player_team']
					} else if ('map_id' in entity) {
						console.log("map id: ", entity['map_id']);
						var map_id = entity['map_id'];
						var node = $('#map_select').find("[data-mapid='" + map_id + "']");
						if (node) {
							try_select_map($('#map_select'), node.val(), false, function() {
								render_scene()
							});
						}
					} else if ('remove' in entity) {
						var id = entity['remove'].toString()
						objectContainer.removeChild(icons[id].container)
						icons[id] = undefined
					} else {
						var ids = new Set();
						for (var i in entity) {
							var id = i.toString();
							if (!icons[id]) continue;
							ids.add(id)
							if (entity[i].length >= 1) {
								var coords = transform_coords(entity[i][0])
								if (!icons[id].container) {
									icons[id].x = coords[0];
									icons[id].y = coords[1];
									create_live_icon(icons[id])
								} else {
									drag_entity(icons[id], coords[0], coords[1]);
									icons[id].container.alpha = 1;
								}
								if (entity[i].length == 2) {
									var hp = entity[i][1];
									if (icons[id].hp != hp) {
										icons[id].hp = hp;
										var portion = entity[i][1] /icons[id].maxHealth;
										var bar = icons[id].container.children[1];
										bar.children[1].width = portion * bar.children[0].width;
									}
								}
							} else {
								if (icons[id] && icons[id].container) {
									icons[id].container.alpha = 0.5;
								}
							}
							//if we don't know the hp make the hp bar yellow
							if (entity[i].length == 2) {
								if (icons[id].container && icons[id].container.children[1].children[1].tint == 16776960) {
									icons[id].container.children[1].children[1].tint = 65280
								}								
							} else {
								if (icons[id].container && icons[id].container.children[1].children[1].tint == 65280) {
									icons[id].container.children[1].children[1].tint = 16776960
								}								
							}
							
						}
						difference = Object.keys(icons).filter(function(a) {return !ids.has(a)});
						
						for (var i in difference) {
							if (icons[i] && icons[i].container) {
								icons[i].container.alpha = 0.5;
							}
						}
						render_scene();
					}
				}
			}
		}
	}
}

//connect socket.io socket
$(document).ready(function() {
	dpi = document.getElementById('dpitest').offsetHeight;
	
	//sorts maps alphabetically, can't presort cause it depends on language
	initialize_map_select($("#map_select"));
	initialize_map_select($("#map_select_wotbase"));

	//start pixi renderer
	var border = 30;
	size = Math.min(window.innerHeight, window.innerWidth) - border;
	size_x = size;
	size_y = size;

	renderer = PIXI.autoDetectRenderer(size, size, {transparent:true});
	renderer.autoResize = true;
	useWebGL = renderer instanceof PIXI.WebGLRenderer;

	$(renderer.view).attr('style', 'position:absolute; z-index: 2; padding:0; margin:0; border:0;');
	$(".edit_window").append(renderer.view);
	
	renderer.view.addEventListener("wheel", function(e) {
		var mouse_location = renderer.plugins.interaction.eventData.data.global;
		zoom(0.1, e.deltaY < 0, [from_x_local(mouse_location.x), from_y_local(mouse_location.y)],e);
		$('#zoom_level').text((1/zoom_level).toFixed(2));
		if (control_camera) {
			emit_pan_zoom();
		}
		e.preventDefault();
	});

	//initialize background
	background_sprite = new PIXI.Sprite();
	
	// create the root of the scene graph
	objectContainer = new PIXI.Container();
	
	
	//initialize grid layer
	if (game == "aw") {
		grid_layer = new PIXI.Sprite.fromImage(image_host + "aw_grid.png");
	} else if (game == "squad") {
		grid_layer = new PIXI.Sprite.fromImage(image_host + "squad_grid.png");
	} else {
		grid_layer = new PIXI.Sprite.fromImage(image_host + "grid.png");
	}
	grid_layer.height = renderer.height;
	grid_layer.width = renderer.width;
	
	objectContainer.addChild(background_sprite);
	objectContainer.addChild(grid_layer);
	
	objectContainer.interactive = true;
	objectContainer.mousedown = on_left_click;
	objectContainer.touchstart = on_left_click;
	
	$(renderer.view).mousedown(function(e) {
		if (e.which === 3 || e.which === 2) {
			last_pan_loc = [renderer.plugins.interaction.eventData.data.global.x, renderer.plugins.interaction.eventData.data.global.y];
			setup_mouse_events(on_pan);
			e.preventDefault();
		}
	});

	renderer.view.addEventListener('contextmenu', function(e) {
		setup_mouse_events(undefined);
		$('#zoom_level').text((1/zoom_level).toFixed(2));
		if (control_camera) {
			emit_pan_zoom();
		}
		e.preventDefault();
	});


	$(renderer.view).mouseup(function(e) {
		if (e.which === 3 || e.which === 2) {
			$('#zoom_level').text((1/zoom_level).toFixed(2));
			setup_mouse_events(undefined);
			if (control_camera) {
				emit_pan_zoom();
			}
			e.preventDefault();
		}
	});

	//pinch-zoom and 2 finger pan support
	var touches = [];
	var touch_distance = 0; 
	var zoom_pan_pending = false;
	var center;
	var zoom_started = false;
	var old_amount;

	
	var touchstart = function(e) {
		var new_touches = e.changedTouches;
		for (var i = 0; i < new_touches.length; i++) {
			var data = new_touches[i];
			var pos = [from_x_local(data.pageX), from_y_local(data.pageY)];		
			touches.push({id: data.identifier, pos: pos});
		}
		
		if (touches.length == 2) {
			e.preventDefault();
			objectContainer.interactive = false;
			touch_distance = Math.sqrt(Math.pow(touches[0].pos[0] - touches[1].pos[0], 2) + Math.pow(touches[0].pos[1] - touches[1].pos[1], 2));
			center = [touches[0].pos[0] + (touches[1].pos[0] - touches[0].pos[0]) / 2, touches[0].pos[1] + (touches[1].pos[1] - touches[0].pos[1]) / 2];			
			zoom_started = false;
			old_amount = null;
		} else {
			objectContainer.interactive = true;
		}
	}
	
	var touchend = function(e) {
		$('#zoom_level').text((1/zoom_level).toFixed(2));
		if (zoom_pan_pending && control_camera) {
			emit_pan_zoom();
			zoom_pan_pending = false;			
		}
		
		var new_touches = e.changedTouches;
		for (var i = 0; i < new_touches.length; i++) {
			var data = new_touches[i];
			var j = touches.map(function(el) {return el.id;}).indexOf(data.identifier);
			touches.splice(j, 1);
		}
		
		if (touches.length == 2) {
			e.preventDefault();
			objectContainer.interactive = false;
			touch_distance = Math.sqrt(Math.pow(touches[0].pos[0] - touches[1].pos[0], 2) + Math.pow(touches[0].pos[1] - touches[1].pos[1], 2));
			center = [touches[0].pos[0] + (touches[1].pos[0] - touches[0].pos[0]) / 2, touches[0].pos[1] + (touches[1].pos[1] - touches[0].pos[1]) / 2];
			zoom_started = false;
			old_amount = null;
		} else {
			objectContainer.interactive = true;
		}
	}
	
	var touchmove_state = {};
	var touchmove = function(e) {
		limit_rate(15, touchmove_state, function() {

			var new_touches = e.changedTouches;
			for (var i = 0; i < new_touches.length; i++) {
				var data = new_touches[i];
				var pos = [from_x_local(data.pageX), from_y_local(data.pageY)];
				for (var j in touches) {
					if (touches[j].id == data.identifier) {
						touches[j].pos = pos;
					}
				}
			}

			if (touches.length == 2) {
				e.preventDefault();
				objectContainer.interactive = false;		
				var new_touch_distance = Math.sqrt(Math.pow(touches[1].pos[0] - touches[0].pos[0], 2) + Math.pow(touches[1].pos[1] - touches[0].pos[1], 2));
				var real_touch_distance = to_y_local_vect(new_touch_distance) / dpi; //in inches
				
				var new_center = [touches[0].pos[0] + (touches[1].pos[0] - touches[0].pos[0]) / 2, touches[0].pos[1] + (touches[1].pos[1] - touches[0].pos[1]) / 2];			

				if (zoom_started || real_touch_distance > 1.5) {
					//zoom
					var new_amount = ((new_touch_distance / touch_distance) - 1) * 0.9;
					var amount;
					if (old_amount) {
						amount = 0.8 * old_amount + 0.2 * new_amount;
					} else {
						amount = new_amount;
					}
					old_amount = amount;	
					zoom(Math.abs(amount), amount > 0, center);
					zoom_pan_pending = true;
					zoom_started = true;
				} else {
					//pan
					zoom_pan_pending = true;
					var diff = [to_x_local(new_center[0]) - to_x_local(center[0]), to_y_local(new_center[1]) - to_y_local(center[1])];
					objectContainer.x += diff[0];
					objectContainer.y += diff[1];
					correct();
				}
				touch_distance = new_touch_distance;
			} else {
				objectContainer.interactive = true;
			}
		});
	}

	renderer.view.addEventListener('touchstart', touchstart);
	renderer.view.addEventListener('touchend', touchend);
	renderer.view.addEventListener('touchendoutside', touchend);
	renderer.view.addEventListener('touchcancel', touchend);
	renderer.view.addEventListener('touchmove', touchmove);
	
	draw_canvas = document.createElement("canvas");
	$(draw_canvas).attr('style', 'padding:0px; margin:0px; border:0; position:absolute; z-index:3; pointer-events:none');
	draw_canvas.width = renderer.view.width;
	draw_canvas.height = renderer.view.height;
	draw_context = draw_canvas.getContext("2d");

	temp_draw_canvas = document.createElement("canvas");
	$(temp_draw_canvas).attr('style', 'padding:0px; margin:0px; border:0; position:absolute; z-index:4; pointer-events:none');
	temp_draw_canvas.width = renderer.view.width;
	temp_draw_canvas.height = renderer.view.height;
	temp_draw_context = temp_draw_canvas.getContext("2d");

	$(renderer.view).parent().append(temp_draw_canvas);
	$(renderer.view).parent().append(draw_canvas);
	$(temp_draw_canvas).hide();
	$(draw_canvas).hide();
		
	//animation loop
	function animate() {
		if (video_ready) {
			progress_timeline();
		}
		update_pings();
		if (scene_dirty) {
			if (select_box_dirty) {
				redraw_select_box();
			}
			renderer.render(objectContainer);
			scene_dirty = false;
		}
		requestAnimationFrame(animate);
	}
	animate();
	

	
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
				var slide = active_slide;
				if (!$('#this_slide_only').get(0).checked) {
					slide = undefined;
				}
				$.post('http://'+target+'/add_to_room', {target: tactic_uid, source:room, session_id:$("#sid").attr("data-sid"), host:parse_domain(location.hostname), stored:"false", slide:slide}).done(function( data ) {
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
			var map = $('#map_url').val().trim();
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
		$('#' + label_position).addClass('active');	

		
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
		initialize_slider("ping_size", "ping_size_text", "ping_size");
		initialize_slider("track_size", "track_size_text", "track_size");
		initialize_slider("draw_end_size", "draw_end_size_text", "draw_end_size");
		initialize_slider("line_end_size", "line_end_size_text", "line_end_size");
		initialize_slider("curve_end_size", "curve_end_size_text", "curve_end_size");
		
		if ($('#delay')) {
			initialize_slider("delay", "delay_text", "delay");
		}
		
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
		$("#slide_name_field").keyup(function(event){
			if(event.keyCode == 13) { //enter
				rename_slide(active_slide, $(this).val());
				socket.emit("rename_slide", room, active_slide, $(this).val());
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
				socket.emit("chat", room, message, chat_color);
				chat(message, chat_color);
				$("#chat_input").val("");
			}
		});

		$('#export').click(function () {
			var new_renderer = new PIXI.CanvasRenderer(size_x, size_y,{backgroundColor : 0xBBBBBB});
			new_renderer.render(objectContainer);			

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
		});
		
		$('#backup').click(function () {
			$.getScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/2.5.0/jszip.min.js", function(){
				var original_slide = active_slide;
				var zip = new JSZip();
				var new_renderer = new PIXI.CanvasRenderer(size_x, size_y, {backgroundColor : 0xBBBBBB});
				var first_slide_uid = find_first_slide();
				var n = 1;
				
				//this code is a synchronous loop with asynchronous calls
				var loop = function(slide_uid) {
					change_slide(slide_uid);
					var it = setInterval(function() {
						if (resources_loading == 0) {
							new_renderer.render(objectContainer);
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
		
		$('#lock_camera').click(function () {
			var node = $(this).find('div');	
			if (node.hasClass('icon-lock_camera')) {
				node.removeClass('icon-lock_camera').addClass('icon-unlock_camera');
				emit_pan_zoom();
				control_camera = true;
			} else {
				node.removeClass('icon-unlock_camera').addClass('icon-lock_camera');
				control_camera = false;
			}
		});
		
		$('#grid').click(function () {
			grid_layer.visible = !grid_layer.visible;
			room_data.slides[active_slide].show_grid = grid_layer.visible;
			if (can_edit()) {
				socket.emit("show_grid", room, active_slide, grid_layer.visible);
			}
			render_scene();
		});
		
		$('#zoom_in').click(function() {
			zoom(0.1, true, [0.5, 0.5]);
			$('#zoom_level').text((1/zoom_level).toFixed(2));
			if (control_camera) {
				emit_pan_zoom();
			}
		});

		$('#zoom_out').click(function() {
			zoom(0.1, false, [0.5, 0.5]);
			$('#zoom_level').text((1/zoom_level).toFixed(2));
			if (control_camera) {
				emit_pan_zoom();
			}			
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
			} else if ( $(this).attr('id') == "clear_all_main") {
				clear();
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
			
			switch(active_context) {
				case "ping_context":
				case "track_context":
				case "icon_context":
				case "note_context":
				case "text_context":
				case "remove_context":
				case "eraser_context":
				case "background_text_context":
				case "select_context":
					enable_dragging();
					break;
				case "draw_context":
				case "ruler_context":
				case "rectangle_context":
				case "cicle_context":
				case "line_context":
				case "curve_context":
				case "polygon_context":
					disable_dragging();
					break;
			}
		});	

		//label position
		$('#label_pos').on('click', 'button', function (e) {
			$('#label_pos').find("button").removeClass('active');
			$(this).addClass('active');	
			label_position = this.id;
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
		$('#nuke_room').click(function() {
			var r = confirm("Warning: all unsaved data will be lost");
			if (r == true) {
				socket.emit('nuke_room', room, game);
			}
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
		
		assets_loaded = true;
		
		socket.on('connect', function() { 
			console.log('Connecting/Reconnecting')
			socket.emit('join_room', room, game);
		});
		
		if (socket.connected) {
			socket.emit('join_room', room, game);
		}
	});
	
	socket.on('room_data', function(new_room_data, my_id, new_tactic_name, locale) {
		cleanup();
		room_data = new_room_data;
		video_paused = new_room_data.video_paused;
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
		
		var on_done = function() {
			if (room_data.pan_zoom) {
				pan_zoom(room_data.pan_zoom[0], room_data.pan_zoom[1], room_data.pan_zoom[2]);
			} else {
				pan_zoom(1, 0, 0);
			}
			if (wot_live) {
				wot_connect();
			}
		}
		
		if (background_entity) {
			//we need to set the background before we add other entities
			set_background(background_entity, function() {
				if (!background.is_video) {
					for (var i in entities) {
						create_entity(entities[i]);
					}
				} else {
					rebuild_timeline();
					if (room_data.playback_rate) {
						set_playback_rate(room_data.playback_rate, room_data.playback_rate);
					}
				}
				on_done();
			});
		} else {
			on_done();
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
		
		if (is_video_replay) {
			sync_start_time = Date.now();
			socket.emit('sync_clock');
			clearInterval(clock_sync_event);
			clock_sync_event = setInterval(function() {
				sync_start_time = Date.now();
				socket.emit('sync_clock');
			}, 20000);
		}
		
		render_scene();
	});

	socket.on('create_entity', function(entity, slide, user_id) {
		if (slide != active_slide) {
			room_data.slides[slide].entities[entity.uid] = entity;
		} else {
			create_entity(entity);
		}
		activity_animation(user_id)
	});
	
	socket.on('drag', function(uid, slide, x, y, scale, rotation, user_id) {
		if (slide != active_slide) {
			if (room_data.slides[slide].entities[uid]) {
				room_data.slides[slide].entities[uid].x = x;
				room_data.slides[slide].entities[uid].y = y;
				if (scale) {
					room_data.slides[slide].entities[uid].scale = scale;
				}
				if (rotation) {
					room_data.slides[slide].entities[uid].rotation = rotation;
				}
			}
		} else {
			if (room_data.slides[slide].entities[uid]) {
				drag_entity(room_data.slides[active_slide].entities[uid], x, y, scale, rotation);
			}
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
	
	socket.on('pan_zoom', function(new_zoom_level, x, y, user_id) {
		activity_animation(new_zoom_level, x, y);
		pan_zoom(new_zoom_level, x, y);
	});
	
	socket.on('force_reconnect', function() {
		location.reload();
	});
	
	socket.on('play_video', function(frame, timestamp, rate, user_id) {
		activity_animation(user_id);
		set_playback_rate(rate, rate);
		handle_play(frame, timestamp)
	});
	
	socket.on('pause_video', function(frame, user_id) {
		handle_pause(frame);
		activity_animation(user_id);
	});
	
	socket.on('sync_video', function(frame, timestamp, user_id) {
		handle_sync(frame, timestamp, user_id);
	});

	socket.on('request_sync', function() {
		if (im_syncing) {
			for (var i = 0; i <= 5; i++) {
				setTimeout(function() {
					var frame = video_progress();
					socket.emit("sync_video", room, frame, get_server_time());
				}, i*2000);
			}
		}
	});
	
	socket.on('sync_clock', function(server_timestamp) {
		var time = Date.now();
		var server_time = server_timestamp + (time - sync_start_time)/2;
		offset = server_time - time;
	});
	
	socket.on('seek_video', function(frame, timestamp, user_id) {
		video_media.setCurrentTime(frame);
		if (video_paused) {
			video_player.pause();
			return;
		}

		handle_sync(frame, timestamp, user_id);
		wait_for_seek(function() {
			rebuild_timeline();
		})
	});
	
	socket.on('change_rate', function(rate) {
		set_playback_rate(rate, rate);
	});
	
});
