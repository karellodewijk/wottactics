var my_user;

function update_my_user() {
	if (my_user.identity) {
		$("#login_dropdown").removeClass("btn-warning");
		$("#login_dropdown").addClass("btn-success");
		$("#sign_in_text").text("Hi " + my_user.name);
	}
}

quotes = [
	'“If you know the enemy and know yourself, you need not fear the result of a hundred battles.” ― Sun Tzu, The Art of War',
	'“Invincibility lies in the defence; the possibility of victory in the attack.” ― Sun Tzu, The Art of War"',
	'“Always forgive your enemies; nothing annoys them so much.” ― Oscar Wilde',
	'“Never interrupt your enemy when he is making a mistake.” ― Napoléon Bonaparte ',
	'“Never open the door to a lesser evil, for other and greater ones invariably slink in after it.” ― Baltasar Gracián, The Art of Worldly Wisdom ',
	'“If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.” ― Sun Tzu, The Art of War ',
	'“Study the past if you would define the future.” ― Confucius',
	'“Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt.” ― Sun Tzu, The Art of War ',
	'“Victorious warriors win first and then go to war, while defeated warriors go to war first and then seek to win” ― Sun Tzu, The Art of War ',
	'“A wise man gets more use from his enemies than a fool from his friends.” ― Baltasar Gracián, The Art of Worldly Wisdom ',
	'“All warfare is based on deception. Hence, when we are able to attack, we must seem unable; when using our forces, we must appear inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near.” ― Sun Tzu, The Art of War ',
	'“If your enemy is secure at all points, be prepared for him. If he is in superior strength, evade him. If your opponent is temperamental, seek to irritate him. Pretend to be weak, that he may grow arrogant. If he is taking his ease, give him no rest. If his forces are united, separate them. If sovereign and subject are in accord, put division between them. Attack him where he is unprepared, appear where you are not expected .” ― Sun Tzu, The Art of War ',
	'“In the midst of chaos, there is also opportunity” ― Sun Tzu, The Art of War',
	'“Take time to deliberate, but when the time for action comes, stop thinking and go in.” ― Napoléon Bonaparte ',
	'“In preparing for battle I have always found that plans are useless, but planning is indispensable.” ― Dwight D. Eisenhower ',
	'“When you surround an army, leave an outlet free. Do not press a desperate foe too hard.” ― Sun Tzu, The Art of War ',
	'“Don\'t hit at all if it is honorably possible to avoid hitting; but never hit soft!” ― Theodore Roosevelt ',
	'“To win one hundred victories in one hundred battles is not the acme of skill. To subdue the enemy without fighting is the acme of skill” ― Sun Tzu, The Art of War ',
	'“who wishes to fight must first count the cost” ― Sun Tzu, The Art of War ',
	'“Rouse him, and learn the principle of his activity or inactivity. Force him to reveal himself, so as to find out his vulnerable spots.” ― Sun Tzu, The Art of War ',
	'“There are roads which must not be followed, armies which must not be attacked, towns which must not be besieged, positions which must not be contested, commands which must not be obeyed.” ― Sun Tzu, The Art of War ',
	'“If your opponent is of choleric temper,  seek to irritate him.  Pretend to be weak, that he may grow arrogant.” ― Sun Tzu, The Art of War ',
	'“The whole secret lies in confusing the enemy, so that he cannot fathom our real intent.” ― Sun Tzu, The Art of War '
];

function add_tactic(name, timestamp) {
	date = new Date(timestamp);	
	var node = '<li class="list-group-item row" id="' + name + '"><h5 class="col-sm-7">'+ name +'</h5><h5 class="col-sm-3">'+ date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() +'</h5><span class="col-md-1"><a class="btn btn-danger select_tactic_button" href="javascript:void(0);" id="' + name + '" role="button"><img src="http://karellodewijk.github.io/icons/bin.png" /></a></span><a class="btn btn-primary select_tactic_button col-md-1" href="javascript:void(0);" id="' + name + '" role="button" style="">Launch&raquo;</a></li>';
	$('#tactic_list').append(node);
}

$(document).ready(function() {
	$("#quote").text(quotes[Math.floor(Math.random() * quotes.length)]);
	
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
		if ($("title").text() == "WOWS Tactics") {
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