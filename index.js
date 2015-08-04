var my_user;

function update_my_user() {
	if (my_user.identity) {
		$("#login_dropdown").removeClass("btn-warning");
		$("#login_dropdown").addClass("btn-success");
		$("#sign_in_text").text("Hi " + my_user.name);
	}
}

$.getScript("http://"+location.hostname+":2000/socket.io/socket.io.js", function() {
	var socket = io.connect('http://'+location.hostname+':2000');

	$('#new_room').click(function(){ 
		socket.emit('request_room');
		return false;
	});

	socket.on('identify', function(user) {
		my_user = user;
		update_my_user();
	});
	
	socket.on('approve_room', function(link) {	
		location.href = link;	
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