var my_user;

function update_my_user() {
	if (my_user.identity) {
		$("#login_dropdown").removeClass("btn-warning");
		$("#login_dropdown").addClass("btn-success");
		$("#sign_in_text").text("Hi " + my_user.name);
	}
}

quotes = [
	'"If you know the enemy and know yourself, you need not fear the result of a hundred battles." ― Sun Tzu, The Art of War',
	'"Invincibility lies in the defence; the possibility of victory in the attack. ― Sun Tzu, The Art of War"'
];

$(document).ready(function() {
	$("#quote").text(quotes[Math.floor(Math.random() * quotes.length)]);
});

function add_tactic(name, timestamp) {
	date = new Date(timestamp);	
	var node = '<li class="list-group-item row" id="' + name + '"><h5 class="col-sm-7">'+ name +'</h5><h5 class="col-sm-3">'+ date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() +'</h5><span class="col-md-1"><a class="btn btn-danger select_tactic_button" href="javascript:void(0);" id="' + name + '" role="button"><img src="http://karellodewijk.github.io/icons/bin.png" /></a></span><a class="btn btn-primary select_tactic_button col-md-1" href="javascript:void(0);" id="' + name + '" role="button" style="">Launch&raquo;</a></li>';
	$('#tactic_list').append(node);
}

$.getScript("http://"+location.hostname+":8000/socket.io/socket.io.js", function() {
	var socket = io.connect('http://'+location.hostname+':8000');
	
	$('#new_room').click(function(){ 
		socket.emit('request_room');
		return false;
	});
	
	$('#tactic_list').on('click', 'a', function () {
		if ($(this).hasClass('btn-danger')) {
			$('.list-group-item[id="'+$(this).attr('id')+'"]').remove();
			socket.emit('delete_tactic', $(this).attr('id'));
		} else {
			socket.emit('request_room', $(this).attr('id'));
		}
	});

	socket.on('identify', function(user) {
		my_user = user;
		update_my_user();
		socket.emit('request_tactics');
	});
	
	socket.on('list_tactics', function(tactics) {
		for (i in tactics) {
			add_tactic(tactics[i][0], tactics[i][1]);
		}
	});
	
	socket.on('approve_room', function(uid) {	
		console
		if (location.pathname.indexOf("wows") != -1) {
			console.log("going to")
			location.href = "wowsplanner.html?room="+uid;	
		} else {
			location.href = "cwplanner.html?room="+uid;	
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
		window.history.replaceState("", "", location.origin+location.pathname); //rewrite url to make pretty
	}
	
});