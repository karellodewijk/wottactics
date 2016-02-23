var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync('secrets.txt', 'utf8'));

room_data = {} //room -> room_data map to be shared with clients

//generates unique id
function newUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
    function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
}

function isEmpty(obj) {
  for(var i in obj) { return false; }
  return true;
}

var bs = require('binarysearch');
var compress = require('compression');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var logger = require('morgan');
var passport = require('passport');

var app = express();
app.use(compress());
app.use(bodyParser.json({limit: '50mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// creating new socket.io app
var io = require('socket.io')();

//configure localization support
var i18n = require('i18n');
i18n.configure({
	locales: ['en', 'sr', 'rs', 'de', 'es', 'pl', 'cs'],
	directory: __dirname + "/locales",
	updateFiles: true
});
app.locals.l = i18n.__;
app.locals.ln = i18n.__n;

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// not pretty but oh so handy to not crash the server
process.on('uncaughtException', function (err) {
 	console.error(err);
 	console.trace();
});

//load mongo
connection_string = '127.0.0.1:27017/wottactics';
MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://'+connection_string, function(err, db) {
	if(err) throw err;	
	
	db.createCollection('tactics');
	db.createCollection('clans');
	db.collection('tactics').createIndex( { "createdAt": 1 }, { expireAfterSeconds: 31622400 } );

	function clean_up_room(room) {
		setTimeout( function() {
			if (room_data[room]) {
				if (!io.sockets.adapter.rooms[room]) {
					if (Date.now() - room_data[room].last_join > 50000) {
						save_room(room);
						delete room_data[room];
					} else {
						clean_up_room(room); //try again
					}
				}
			}
		}, 60000);
	}
	
	function save_room(room) {
		var data = room_data[room];
		data._id = room;
		db.collection('tactics').update({_id:room}, data, {upsert: true});
	}
	
	function get_tactics(identity, game, cb) {
		if (identity) {
			db.collection('users').findOne({_id:identity},{'tactics':1}, function(err, data) {
				if (!err) {
					if (data && data.tactics) {
						cb(data.tactics);
					} else {
						cb([]);
					}
				} else {
					cb([]);
				}
			});
		} else {
			cb([]);
		}
	}	
	
	
	function push_tactic_to_db(user, room, name, uid) {
		//store a link to the tacticn in user data
		db.collection('users').update({_id:user.identity}, {$push:{tactics:{name:name, date:Date.now(), game:room_data[room].game, uid:uid}}}, {upsert: true});		
		//store the tactic in the stored_tactics list
		var data = JSON.parse(JSON.stringify(room_data[room]));
		delete data.userlist;
		delete data.lost_users;
		delete data.lost_identities;
		data._id = uid;
		db.collection('stored_tactics').update({_id:uid}, data, {upsert: true});

		if (!room_data[room].lost_identities[user.identity]) {
			room_data[room].lost_identities[user.identity] = {};
		}
		room_data[room].lost_identities[user.identity].tactic_name = name;
		room_data[room].lost_identities[user.identity].tactic_uid = uid;
	}
	
	function store_tactic(user, room, name) {
		if (room_data[room] && user.identity) { //room exists, user is logged in
			if (room_data[room].lost_identities[user.identity]
				&& room_data[room].lost_identities[user.identity].tactic_uid
				&& room_data[room].lost_identities[user.identity].tactic_name 
				&& room_data[room].lost_identities[user.identity].tactic_name == name) {
					var uid = room_data[room].lost_identities[user.identity].tactic_uid;
					db.collection('users').findOne({_id:user.identity, tactics:{$elemMatch:{uid:uid}}}, {'tactics.$':1}, function(err, result) { 					
						if (!err && result && result.tactics) {
							db.collection('users').update({_id:user.identity}, {$pull: {tactics:{uid:uid}}}, {upsert: true});
						} else {
							uid = newUid();
						}
						push_tactic_to_db(user, room, name, uid);
					});
			} else {
				var uid = newUid();
				push_tactic_to_db(user, room, name, uid);
			}
		}
	}
	
	function restore_tactic(user, uid, cb) {
		if (user.identity) {
			var query = {_id:user.identity};
			query['tactics.uid'] = uid;
			db.collection('users').findOne(query, {'tactics.$':1, _id:0}, function(err, header) {
				if (!err && header) {
					var id = header.tactics[0].uid;
					db.collection('stored_tactics').findOne({_id:id}, function(err2, result) {
						if (!err2 && result) {							
							var uid = newUid();
							room_data[uid] = result;
							room_data[uid].last_join = Date.now();
							room_data[uid].userlist = {};
							room_data[uid].lost_users = {};
							room_data[uid].lost_identities = {};
							room_data[uid].lost_users[user.id] = "owner";
							if (user.identity) {
								room_data[uid].lost_identities[user.identity] = {role: "owner", tactic_name:header.tactics[0].name, tactic_uid:id};
							}
							room_data[uid].locked = true;
							clean_up_room(uid); //just in case nobody joins it, start the cleanup procedure
							cb(uid);
						}
					});
				}
			});
		}
	}
	
	function remove_tactic(identity, id) {
		db.collection('users').update({_id:identity}, {$pull: {tactics:{uid:id}}});
		db.collection('stored_tactics').remove({_id:id});
	}
	
	function rename_tactic(user, uid, new_name) {
		db.collection('users').findOne({_id:user.identity, tactics:{$elemMatch:{uid:uid}}},{'tactics.$':1}, function(err, result) {
			if (!err && result && result.tactics) {
				var tactic = result.tactics[0];
				db.collection('users').update({_id:user.identity}, {$pull: {tactics:{uid:uid}}});
				tactic.name = new_name;
				db.collection('users').update({_id:user.identity}, {$push: {tactics:tactic}});
			}			
		});
	}
	
	function create_anonymous_user(req) {
		req.session.passport.user = {};
		req.session.passport.user.id = newUid();
		req.session.passport.user.name = "Anonymous";		
	}
	
	// initializing session middleware
	var Session = require('express-session');
	var RedisStore = require('connect-redis')(Session);
	var session = Session({ secret: 'mumnbojudqs', resave:true, saveUninitialized:false, cookie: { expires: new Date(Date.now() + 30 * 86400 * 1000) }, store: new RedisStore()});
	app.use(session); // session support
	
	// Configuring Passport
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(function(req, res, next) { //create a default user
		if (!req.session.passport.user) {
			create_anonymous_user(req);		
		}
		if (req.query.lang) {
			req.session.locale = req.query.lang;
		} else if (!req.session.locale) {
			req.session.locale = "en";
		}
		next();
	});
	
	OpenIDStrategy = require('passport-openid').Strategy;
	passport.use(new OpenIDStrategy({
			returnURL: function(req) { return "http://" + req.hostname + "/auth/openid/callback"; },
			passReqToCallback: true
		},
		function(req, identifier, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();		
			}
			user.server = identifier.split('://')[1].split(".wargaming")[0];
			user.identity = identifier.split('/id/')[1].split("/")[0];
			user.wg_account_id = user.identity.split('-')[0];
			user.name = user.identity.split('-')[1];
			done(null, user);
		}
	));
	
	StrategyGoogle = require('passport-google-openidconnect').Strategy;
	passport.use(new StrategyGoogle({
		clientID: secrets.google.client_id,
		clientSecret: secrets.google.secret,
		callbackURL: '/auth/google/callback',
		passReqToCallback:true
	  },
	  function(req, iss, sub, profile, accessToken, refreshToken, done) {
		var user = {};
		if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
			user.id = req.session.passport.user.id;
		} else {
			user.id = newUid();
		}
		user.identity = profile.id;
		user.name = profile.displayName;
		done(null, user);
	  }
	));	

	FacebookStrategy = require('passport-facebook').Strategy;
	passport.use(new FacebookStrategy({
		clientID: secrets.facebook.client_id,
		clientSecret: secrets.facebook.secret,
		callbackURL: "/auth/facebook/callback",
		passReqToCallback: true
	  },
	  function(req, accessToken, refreshToken, profile, done) {
		var user = {};
		if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
			user.id = req.session.passport.user.id;
		} else {
			user.id = newUid();
		}
		user.identity = profile.id;
		user.name = profile.displayName;
		done(null, user);
	  }
	));

	TwitterStrategy = require('passport-twitter').Strategy;
	passport.use(new TwitterStrategy({
		consumerKey: secrets.twitter.client_id,
		consumerSecret: secrets.twitter.secret,
		callbackURL: "/auth/twitter/callback",
		passReqToCallback: true
	  },
	  function(req, token, tokenSecret, profile, done) {
		var user = {};
		if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
			user.id = req.session.passport.user.id;
		} else {
			user.id = newUid();
		}
		user.identity = profile.id;
		user.name = profile.displayName;
		done(null, user);
	  }
	));	

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	// session support for socket.io
	io.use(function(socket, next) {
	  session(socket.handshake, {}, next);
	});
	
	// setup routes
	var router = express.Router();

	router.get('/', function(req, res, next) {
		if (req.hostname) {
			if (req.hostname.indexOf('awtactic') != -1) {
				req.session.game = "aw";
			} else if (req.hostname.indexOf('wowstactic') != -1) {
				req.session.game = "wows";
			} else {
				req.session.game = "wot";
			}
		} else {
			req.session.game = "wot";
		}
		res.redirect('/'+req.session.game+'.html');
	});
	
	router.get('/wot.html', function(req, res, next) {
	  req.session.game = 'wot';
	  res.render('index', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale });
	});
	router.get('/aw.html', function(req, res, next) {
	  req.session.game = 'aw';
	  res.render('index', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale });
	});
	router.get('/wows.html', function(req, res, next) {
	  req.session.game = 'wows';
	  res.render('index', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale });
	});
	router.get('/blitz.html', function(req, res, next) {
	  req.session.game = 'blitz';
	  res.render('index', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale });
	});
	function planner_redirect(req, res, game) {
	  if (req.query.restore) {
		var uid = newUid();
		restore_tactic(req.session.passport.user, req.query.restore, function (uid) {
			res.redirect(game+'planner.html?room='+uid);
		});
	  } else if (!req.query.room) {
		  res.redirect(game+'planner.html?room='+newUid());
	  }	else {
		  req.session.game = game;
		  res.render('planner', { game: req.session.game, 
								  user: req.session.passport.user,
								  locale: req.session.locale });
	  }
	}
	router.get('/wotplanner.html', function(req, res, next) {
	  planner_redirect(req, res, 'wot');
	});
	router.get('/awplanner.html', function(req, res, next) {
	  planner_redirect(req, res, 'aw');
	});
	router.get('/wowsplanner.html', function(req, res, next) {
	  planner_redirect(req, res, 'wows');
	});
	router.get('/blitzplanner.html', function(req, res, next) {
	  planner_redirect(req, res, 'blitz');
	});
	router.get('/about.html', function(req, res, next) {
	  if (!req.session.game) {
		  req.session.game = 'wot';
	  }
	  res.render('about', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale });
	});
	router.get('/getting_started.html', function(req, res, next) {
	  if (!req.session.game) {
		req.session.game = 'wot';
	  }
	  res.render('getting_started', { game: req.session.game, 
									  user: req.session.passport.user,
									  locale: req.session.locale });
	});

	router.get('/privacypolicy.html', function(req, res, next) {
	  if (!req.session.game) {
		req.session.game = 'wot';
	  }
	  res.render('privacypolicy', { game: req.session.game, 
									  user: req.session.passport.user,
									  locale: req.session.locale });
	});
	
	router.get('/stored_tactics.html', function(req, res, next) {
	  if (!req.session.game) {
		req.session.game = 'wot';
	  }
	  if (req.session.passport.user.identity) {
		get_tactics(req.session.passport.user.identity, req.session.game, function(tactics) {
		  res.render('stored_tactics', { game: req.session.game, 
										 user: req.session.passport.user,
										 locale: req.session.locale,
										 tactics: tactics } );
		});
	  } else {
		  res.redirect('/');
	  }
	});
	router.post('/remove_tactic', function(req, res, next) {
		if (req.session.passport.user.identity) {
			remove_tactic(req.session.passport.user.identity, req.body.id);
		}
		return;
	});
	router.post('/rename_tactic', function(req, res, next) {
		if (req.session.passport.user.identity) {
			rename_tactic(req.session.passport.user, req.body.uid, req.body.new_name);
		}
		return;
	});
	
	function save_return(req, res, next) {
		req.session.return_to = req.headers.referer;
		next();
	}
	function redirect_return(req, res, next) {
		res.redirect(req.session.return_to);
		delete req.session.return_to;
		return;
	}
	
	//openid
	router.post('/auth/openid', save_return, passport.authenticate('openid'));
	router.get('/auth/openid/callback', passport.authenticate('openid'), redirect_return);
	router.get('/auth/openid/callback', passport.authenticate('openid'), redirect_return);

	//google
	router.post('/auth/google', save_return, passport.authenticate('google-openidconnect'));
	router.get('/auth/google/callback', passport.authenticate('google-openidconnect'), redirect_return);

	//facebook
	router.post('/auth/facebook', save_return, passport.authenticate('facebook'));
	router.get('/auth/facebook/callback', passport.authenticate('facebook'), redirect_return);

	//twitter
	router.post('/auth/twitter', save_return, passport.authenticate('twitter'));
	router.get('/auth/twitter/callback', passport.authenticate('twitter'), redirect_return);

	//force saves all rooms to DB, run before a restart/shutdown
	router.get('/save.html', function(req, res, next) {
		for (var room in room_data) {
			save_room(room);
		}
		res.send('Success');
	});

	//some basic logging data
	router.get('/log.html', function(req, res, next) {
		res.send("Active rooms: " + Object.keys(room_data).length);
	});
	
	//reloads templates, so I don't have to restart the server to add basic content
	router.get('/refresh.html', function(req, res, next) {
		var ejs = require('ejs')
		ejs.clearCache();
		res.send("Refreshed")
	});
	
	//////////////
	//clanportal//
	//////////////

	//this is a really dirty way to put something in another file, someone should shoot me
	//anyway probabtly gonna abandon the whole clanportal thing anyway or make it a new app.
	eval(fs.readFileSync('clanportal.js')+'');

	//////////////////
	//end clanportal//
	//////////////////
	
	//add router to app
	app.use('/', router); 
	
	// catch 404 and forward to error handler
	app.use(function(req, res, next) {
		var err = new Error('Not Found: "' + req.path + '"');
		err.status = 404;
		return;
	});

	function join_room(socket, room) {
		room_data[room].last_join = Date.now();
		if (!socket.handshake.session.passport.user) {
			create_anonymous_user(socket.handshake);
		}
		var user = socket.handshake.session.passport.user;

		if (user) {
			if (room_data[room].userlist[user.id]) {
				//a user is already connected to this room in probably another tab, just increase a counter
				room_data[room].userlist[user.id].count++;
			} else {
				room_data[room].userlist[user.id] = {name:user.name, id:user.id, role:user.role, logged_in:(user.identity) ? true : false};
				room_data[room].userlist[user.id].count = 1;
				if (room_data[room].lost_users[user.id]) {
					//if a user was previously connected to this room and had a role, restore that role
					room_data[room].userlist[user.id].role = room_data[room].lost_users[user.id];
				} else if (user.identity && room_data[room].lost_identities[user.identity] && room_data[room].lost_identities[user.identity].role) {
					//if a user with given identity had a role, restore that role
					room_data[room].userlist[user.id].role = room_data[room].lost_identities[user.identity].role;
				}
				socket.broadcast.to(room).emit('add_user', room_data[room].userlist[user.id]);			
			}			
			socket.join(room);
			var tactic_name;
			if (room_data[room].lost_identities[user.identity] && room_data[room].lost_identities[user.identity].tactic_name) {
				tactic_name = room_data[room].lost_identities[user.identity].tactic_name;
			} else {
				tactic_name = "";
			}
			
			socket.emit('room_data', room_data[room], user.id, tactic_name);
		}
	}
	
	//socket.io callbacks
	io.sockets.on('connection', function(socket) { 
		if (!socket.handshake.session.passport) {
			socket.handshake.session.passport = {};
		}
			
		socket.on('join_room', function(room, game) {			
			if (!(room in room_data)) {
				db.collection('tactics').findOne({_id:room}, function(err, result) {
					if (!err && result) { 
						room_data[room] = result;
						room_data[room].last_join = Date.now();	
						room_data[room].userlist = {};
					} else {
						room_data[room] = {};	
						room_data[room].slides = [{}];
						var background_uid = newUid();
						room_data[room].slides[0][background_uid] = {uid:background_uid, type:'background', path:""};
						room_data[room].active_slide = 0;
						room_data[room].slide_names = [''];
						room_data[room].userlist = {};
						room_data[room].lost_users = {};
						room_data[room].lost_identities = {};
						var user = socket.handshake.session.passport.user;
						room_data[room].lost_users[user.id] = "owner";
						if (user.identity) {
							room_data[room].lost_identities[user.identity] = {role: "owner"};
						}
						room_data[room].game = game;
						room_data[room].locked = true;
					}
					join_room(socket, room);
					return;
				});
			} else {
				join_room(socket, room);
				return;
			}
		});

		socket.onclose = function(reason) {
			//hijack the onclose event because otherwise we lose socket.rooms data
			var user = socket.handshake.session.passport.user;
			for (var i = 1; i < socket.rooms.length; i++) { //first room is clients own little private room so we start at 1
				var room = socket.rooms[i];
				if (room_data[room] && room_data[room].userlist[user.id]) {
					if (room_data[room].userlist[user.id].count == 1) {
						socket.broadcast.to(room).emit('remove_user', user.id);
						delete room_data[room].userlist[user.id];
					} else {
						room_data[room].userlist[user.id].count--;
					}
				}				
				if (Object.keys(io.sockets.adapter.rooms[room]).length <= 1) {	//we're the last one in the room and we're leaving
					clean_up_room(room);
				}
			}	
			Object.getPrototypeOf(this).onclose.call(this,reason); //call original onclose
		}
		
		//socket.on('error', function(e){
		//	console.log("error: ", e);
		//	console.trace();
		//});
		
		socket.on('create_entity', function(room, entity, slide) {
			if (room_data[room] && entity) {
				if (room_data[room].slides[slide]) {
					room_data[room].slides[slide][entity.uid] = entity;
				} else {
					console.log("room: ",room_data[room]);
					console.log("slide:", slide);
					console.log("entity:", entity);
				}
				socket.broadcast.to(room).emit('create_entity', entity, slide);
			}
		});
		
		socket.on('drag', function(room, uid, slide, x, y) {
			if (room_data[room] && room_data[room].slides[slide] && room_data[room].slides[slide][uid]) {
				room_data[room].slides[slide][uid].x = x;
				room_data[room].slides[slide][uid].y = y;
				socket.broadcast.to(room).emit('drag', uid, slide, x, y);
			}
		});

		socket.on('ping', function(room, x, y, color) {
			socket.broadcast.to(room).emit('ping', x, y, color);
		});

		socket.on('track', function(room, tracker) {
			socket.broadcast.to(room).emit('track', tracker);
		});
		
		socket.on('track_move', function(room, uid, delta_x, delta_y) {
			socket.broadcast.to(room).emit('track_move', uid, delta_x, delta_y);
		});
		
		socket.on('stop_track', function(room, uid) {
			socket.broadcast.to(room).emit('stop_track', uid);
		});
		
		socket.on('remove', function(room, uid, slide) {
			if (room_data[room] && room_data[room].slides[slide] && room_data[room].slides[slide][uid]) {
				delete room_data[room].slides[slide][uid];
				socket.broadcast.to(room).emit('remove', uid, slide);
			}
		});

		socket.on('chat', function(room, message) {
			socket.broadcast.to(room).emit('chat', message);
		});
		
		socket.on('update_user', function(room, user) {
			if (room_data[room] && room_data[room].userlist) {
				room_data[room].userlist[user.id] = user;
				if (room_data[room].lost_users) {
					if (user.role) {
						room_data[room].lost_users[user.id] = user.role;
						if (user.identity) {
							if (!room_data[room].lost_identities[user.identity]) {
								room_data[room].lost_identities[user.identity] = {};
							}
							room_data[room].lost_identities[user.identity][role] = user.role;
						}
					} else {
						if (room_data[room].lost_users[user.id]) {
							delete room_data[room].lost_users[user.id];
						}
						if (room_data[room].lost_identities[user.identity]) {
							room_data[room].lost_identities[user.identity].role = user.role;
						}
					}
				}		
				socket.broadcast.to(room).emit('add_user', user);
			}
		});
		
		socket.on('change_slide', function(room, slide) {
			room_data[room].active_slide = slide;
			socket.broadcast.to(room).emit('change_slide', slide);
		});
		
		socket.on('new_slide', function(room, slide) {
			room_data[room].slides.splice(slide+1, 0, JSON.parse(JSON.stringify(room_data[room].slides[slide])));
			room_data[room].slide_names.splice(slide+1, 0, "");
			room_data[room].active_slide = slide+1;
			socket.broadcast.to(room).emit('new_slide', slide);
		});

		socket.on('remove_slide', function(room, slide) {
			if (room_data[room].slides.length > slide) {
				room_data[room].slides.splice(slide, 1);
				room_data[room].slide_names.splice(slide, 1);
				room_data[room].active_slide = Math.max(slide-1, 0);
				socket.broadcast.to(room).emit('remove_slide', slide);
			}
		});
		
		socket.on('rename_slide', function(room, slide, name) {
			room_data[room].slide_names[slide] = name;
			socket.broadcast.to(room).emit('rename_slide', slide, name);
		});	

		socket.on('lock_room', function(room, is_locked) {
			if (room_data[room]) {
				room_data[room].locked = is_locked;
				socket.broadcast.to(room).emit('lock_room', is_locked);
			}
		});

		socket.on('store', function(room, name) {
			var user = socket.handshake.session.passport.user;			
			//room_data[room].lost_identities[user.identity] = {role: room_data[room][user.id].role, tactic_name:name};
			store_tactic(user, room, name);
		});
	});
	
	//create server
	var http = require('http');
	var server = http.createServer(app);
	io.attach(server);
	server.listen(80);	
});

