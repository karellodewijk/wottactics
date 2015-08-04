room_data = {} //room -> room_data map to be shared with clients
id_session_map = {} //user_id -> session_id map

//generates unique id
function newUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
    function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
}

(function() {
	// initializing express-session middleware
	var Session = require('express-session'),
    SessionStore = require('session-file-store')(Session);
	var session = Session({ secret: 'pass', resave: true, saveUninitialized: true });

	// creating new express app
	var express = require('express');
	var app = express();
	app.use(session); // session support
	app.use(express.static('.'));
	
	// attaching express app to HTTP server
	var http = require('http');
	var server = http.createServer(app);
	//server.listen(process.env.OPENSHIFT_NODEJS_PORT || 2000, process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
	server.listen(process.env.OPENSHIFT_NODEJS_PORT || 2000);
	
	// creating new socket.io app
	var ios = require('socket.io-express-session');	
	io = require('socket.io').listen(server);
	io.use(ios(session)); // session support

	var openid = require('openid');
	var url = require('url');
	var querystring = require('querystring');
	var relyingParty = new openid.RelyingParty(
		'', // Verification URL (yours)
		null, // Realm (optional, specifies realm for OpenID authentication)
		false, // Use stateless verification
		false, // Strict mode
		[]); // List of extensions to enable and include
	
	
	io.sockets.on('connection', function(socket) { 
		if (!socket.handshake.sessionStore[socket.handshake.sessionID]) {
			socket.handshake.sessionStore[socket.handshake.sessionID] = {};
		}
		
		if (!socket.handshake.sessionStore[socket.handshake.sessionID].user) {
			socket.handshake.sessionStore[socket.handshake.sessionID].user = {};
			socket.handshake.sessionStore[socket.handshake.sessionID].user.id = newUid();
			socket.handshake.sessionStore[socket.handshake.sessionID].user.name = "Anonymous";
			socket.handshake.sessionStore[socket.handshake.sessionID].user.rooms = {};
			id_session_map[socket.handshake.sessionStore[socket.handshake.sessionID].user.id] = socket.handshake.sessionID;
		}
		
		socket.emit("identify", socket.handshake.sessionStore[socket.handshake.sessionID].user);
		
		socket.on('request_room', function() {
			var room_uid = newUid();
			var link = "cwplanner.html?room="+room_uid;
			socket.emit("approve_room", link);
		});

		socket.on('login', function(identifier, url) {
			// Resolve identifier, associate, and build authentication URL
			//console.log("user trying to log in");
			//console.log(identifier);
			relyingParty.returnUrl = url;
			relyingParty.authenticate(identifier, false, function(error, authUrl) {
				socket.emit("openid_login", authUrl);
			});
		});

		socket.on('login_complete', function(url) {
			// Resolve identifier, associate, and build authentication URL
			//console.log("user trying to complete log in");
            relyingParty.verifyAssertion(url, function(error, result) {
				if (!error && result.authenticated) {
					//console.log("login succeeded");
					socket.handshake.sessionStore[socket.handshake.sessionID].user.identity = result.claimedIdentifier.split('/id/')[1].split("/")[0];
					socket.handshake.sessionStore[socket.handshake.sessionID].user.name = socket.handshake.sessionStore[socket.handshake.sessionID].user.identity.split('-')[1];
					if (socket.rooms.length > 1) {
						io.to(socket.rooms[1]).emit('add_user', socket.handshake.sessionStore[socket.handshake.sessionID].user);
					}
					socket.emit("identify", socket.handshake.sessionStore[socket.handshake.sessionID].user);
				}
            });
		});
		
		socket.on('join_room', function(room) {
			var new_room = false;
			if (!(room in room_data)) { 
				room_data[room] = {};
				room_data[room].history = {};
				room_data[room].userlist = {};
				new_room = true;
			}
			
			if (room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id]) {
				//a user is already connected to this room in probably another tab, just increase a counter
				room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id].count++;
 			} else {
				room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id] = socket.handshake.sessionStore[socket.handshake.sessionID].user;
				room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id].count = 1;
				if (new_room) {
					//we should make the first client the owner
					room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id].role = "owner";
					socket.handshake.sessionStore[socket.handshake.sessionID].user.rooms[room] = "owner";
				} else if (socket.handshake.sessionStore[socket.handshake.sessionID].user.rooms[room]) {
					//if a user was previously connected to this room and had a role, restore that role
					room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id].role = socket.handshake.sessionStore[socket.handshake.sessionID].user.rooms[room];
				}
				socket.broadcast.to(room).emit('add_user', socket.handshake.sessionStore[socket.handshake.sessionID].user);			
			}
			

			socket.join(room);

			//console.log('client joined room: ' + room);
			socket.emit('room_data', room_data[room]);
		});

		socket.onclose = function(reason){
			//hijack the onclose event because otherwise we lose socket.rooms data
			for (i = 1; i < socket.rooms.length; i++) { //first room is clients own little private room so we start at 1
				var room = socket.rooms[i];

				if (room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id].count == 1) {
					socket.broadcast.to(room).emit('remove_user', socket.handshake.sessionStore[socket.handshake.sessionID].user.id);
					delete room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id];
				} else {
					room_data[room].userlist[socket.handshake.sessionStore[socket.handshake.sessionID].user.id].count--;
				}

				if (Object.keys(io.sockets.adapter.rooms[room]).length == 1) {	//we're the last one in the room and we're leaving
					setTimeout( function() { //we keep the room around for another minute so it's not lost on a refresh
						if (!io.sockets.adapter.rooms[room]) {	
							delete room_data[room];
						}
					}, 60000);
				}
			}
			
			delete id_session_map[socket.handshake.sessionID];
			Object.getPrototypeOf(this).onclose.call(this,reason); //call original onclose
		}
		
		socket.on('create_entity', function(room, entity) {
			room_data[room].history[entity.uid] = entity;
			socket.broadcast.to(room).emit('create_entity', entity);
		});
		
		socket.on('drag', function(room, uid, x, y) {
			room_data[room].history[uid].x = x;
			room_data[room].history[uid].y = y;
			//console.log("receiving drag");
			socket.broadcast.to(room).emit('drag', uid, x, y);
		});

		socket.on('ping', function(room, x, y, color) {
			socket.broadcast.to(room).emit('ping', x, y, color);
		});

		socket.on('remove', function(room, uid) {
			delete room_data[room].history[uid];
			socket.broadcast.to(room).emit('remove', uid);
		});

		socket.on('update_user', function(room, user) {
			room_data[room].userlist[user.id] = user;
			if (user.role) {
				socket.handshake.sessionStore[id_session_map[user.id]].user.rooms[room] = user.role;
			} else if (socket.handshake.sessionStore[id_session_map[user.id]].user.rooms[room]) {
				delete socket.handshake.sessionStore[id_session_map[user.id]].user.rooms[room];
			}
			socket.broadcast.to(room).emit('add_user', user);
		});
		
	});
  
}).call(this);

