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

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser')
var logger = require('morgan');
var passport = require('passport');
var app = express();
var heapdump = require('heapdump');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(express.static(path.join(__dirname, 'public')));

// creating new socket.io app
var io = require('socket.io')();

//configure localization support
var i18n = require('i18n');
i18n.configure({
	locales: ['en', 'nl'],
	directory: "./locales",
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

function clean_up_room(room) {
	setTimeout( function() { //just in case nobody joins
		if (room_data[room]) {
			if (!io.sockets.adapter.rooms[room]) {
				if (Date.now() - room_data[room].last_join > 50000) {
					delete room_data[room];
				} else {
					clean_up_room(room); //try again
				}
			}
		}
	}, 60000);
}

setTimeout( function() { //just in case nobody joins
	 heapdump.writeSnapshot();
}, 3000000);

//load mongo
connection_string = '127.0.0.1:27017/wottactics';
MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://'+connection_string, function(err, db) {
	if(err) throw err;	
	
	function get_tactics(identity, game, cb) {
		if (identity) {
			collection = db.collection(identity);
			name_list = [];
			tactics = collection.find({game:game}, {"sort" : [['date', 'desc']], name:1, date:1});
			tactics.each(function (err, tactic) {			
				if (tactic) {
					game = 'wot';
					if (tactic.game) {
						game = tactic.game;
					}
					name_list.push([tactic.name, tactic.date, game]);
				} else {
					cb(name_list);
				}
			})
		}
	}

	function restore_tactic(identity, game, name, cb) {
		if (identity) {
			collection = db.collection(identity);
			tactics = collection.findOne({game:game, name:name}, function(err, result) {
				if (!err && result) { 
					uid = newUid();
					room_data[uid] = {};
					room_data[uid].history = result.history;
					room_data[uid].userlist = {};
					room_data[uid].lost_users = {};
					room_data[uid].locked = true;
					room_data[uid].name = name;
					room_data[uid].game = game;
					room_data[uid].last_join = Date.now();
					clean_up_room(uid);
					cb(uid);
				}
			});
		}
	}
	
	function remove_tactic(identity, game, name) {
		collection = db.collection(identity);
		tactics = collection.remove({name:name, game:game});		
	}
	
	function create_anonymous_user(req) {
		req.session.passport.user = {};
		req.session.passport.user.id = newUid();
		req.session.passport.user.name = "Anonymous";		
	}
	
	// initializing session middleware
	Session = require('express-session');
	RedisStore = require('connect-redis')(Session);
	session = Session({ secret: 'mumnbojudqs', resave:true, saveUninitialized:false, cookie: { expires: new Date(Date.now() + 1 * 86400 * 1000) }, store: new RedisStore()});
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
		//console.log("setting language to:", req.session.locale)
		//res.locale = req.session.locale;
		next();
	});
	
	OpenIDStrategy = require('passport-openid').Strategy;
	passport.use(new OpenIDStrategy({
			returnURL: function(req) { return "http://" + req.hostname + "/auth/openid/callback"; },
			passReqToCallback: true
		},
		function(req, identifier, done) {
			user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();		
			}
			user.identity = identifier.split('/id/')[1].split("/")[0];
			user.name = user.identity.split('-')[1];
			done(null, user);
		}
	));
	
	StrategyGoogle = require('passport-google-openidconnect').Strategy;
	passport.use(new StrategyGoogle({
		clientID:'544895630420-h9bbrnn1ndmf005on55qapanrqdidt5e.apps.googleusercontent.com',
		clientSecret: '8jTj6l34XcZ8y_pU2cqwANjw',
		callbackURL: '/auth/google/callback',
		passReqToCallback:true
	  },
	  function(req, iss, sub, profile, accessToken, refreshToken, done) {
		user = {};
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
		clientID: '580177672120479',
		clientSecret: 'eba898e021a070a00f60e0343450695e',
		callbackURL: "/auth/facebook/callback",
		passReqToCallback: true
	  },
	  function(req, accessToken, refreshToken, profile, done) {
		user = {};
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
		consumerKey: 'kyuE5HUWJipJpz1JraWrGKu0Z',
		consumerSecret: 'qruzs2fwJG8nVMzPeFSvxWZ2ua6WzkJNpBhI5yPCSS525ivTSI',
		callbackURL: "/auth/twitter/callback",
		passReqToCallback: true
	  },
	  function(req, token, tokenSecret, profile, done) {
		user = {};
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
	router = express.Router();

	router.get('/', function(req, res, next) {
		if (req.hostname.indexOf('awtactic') != -1) {
			req.session.game = "aw";
		} else if (req.hostname.indexOf('wowstactic') != -1) {
			req.session.game = "wows";
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
		uid = newUid();
		restore_tactic(req.session.passport.user.identity, req.session.game, req.query.restore, function (uid) {
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
	router.get('/stored_tactics.html', function(req, res, next) {
	  if (!req.session.game) {
		req.session.game = 'wot';
	  }
	  if (req.session.passport.user.identity) {
		get_tactics(req.session.passport.user.identity, req.session.game, function(tactics) {
		  res.render('stored_tactics', { game: req.session.game, 
										 user: req.session.passport.user,
										 locale: req.session.locale,
										 tactics: tactics });
		});
	  } else {
		  res.redirect('/');
	  }
	});
	router.post('/remove_tactic', function(req, res, next) {
		if (req.session.passport.user.identity) {
			remove_tactic(req.session.passport.user.identity, req.session.game, req.body.name);
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

	//google
	router.post('/auth/google', save_return, passport.authenticate('google-openidconnect'));
	router.get('/auth/google/callback', passport.authenticate('google-openidconnect'), redirect_return);

	//facebook
	router.post('/auth/facebook', save_return, passport.authenticate('facebook'));
	router.get('/auth/facebook/callback', passport.authenticate('facebook'), redirect_return);

	//twitter
	router.post('/auth/twitter', save_return, passport.authenticate('twitter'));
	router.get('/auth/twitter/callback', passport.authenticate('twitter'), redirect_return);
	
	//add router to app
	app.use('/', router); 
	
	// catch 404 and forward to error handler
	app.use(function(req, res, next) {
		err = new Error('Not Found: "' + req.path + '"');
		err.status = 404;
		next(err);
	});
	
	//socket.io callbacks
	io.sockets.on('connection', function(socket) { 
		if (!socket.handshake.session.passport) {
			socket.handshake.session.passport = {};
		}
		
		socket.on('error', function (err) {
			console.error(err);
			console.trace();
		});
		
		socket.on('join_room', function(room, game) {
			new_room = false;
			if (!(room in room_data)) { 
				room_data[room] = {};
				room_data[room].history = {};
				room_data[room].userlist = {};
				room_data[room].lost_users = {};
				room_data[room].game = game;
				room_data[room].locked = true;
			}

			room_data[room].last_join = Date.now();
			if (!socket.handshake.session.passport.user) {
				create_anonymous_user(socket.handshake);
			}
			user = JSON.parse(JSON.stringify(socket.handshake.session.passport.user));

			if (room_data[room].userlist[user.id]) {
				//a user is already connected to this room in probably another tab, just increase a counter
				room_data[room].userlist[user.id].count++;
			} else {
				room_data[room].userlist[user.id] = user;
				room_data[room].userlist[user.id].count = 1;
				if (!io.sockets.adapter.rooms[room] || Object.keys(io.sockets.adapter.rooms[room]).length == 0) { //no users
					//we should make the first client the owner
					room_data[room].userlist[user.id].role = "owner";
				} else if (room_data[room].lost_users[user.id]) {
					//if a user was previously connected to this room and had a role, restore that role
					room_data[room].userlist[user.id].role = room_data[room].lost_users[user.id];
				}
				socket.broadcast.to(room).emit('add_user', room_data[room].userlist[user.id]);			
			}			
			socket.join(room);
			socket.emit('room_data', room_data[room], user.id);
		});

		socket.onclose = function(reason) {
			//hijack the onclose event because otherwise we lose socket.rooms data
			user = socket.handshake.session.passport.user;
			for (i = 1; i < socket.rooms.length; i++) { //first room is clients own little private room so we start at 1
				room = socket.rooms[i];
				if (room_data[room] && room_data[room].userlist[user.id]) {
					if (room_data[room].userlist[user.id].count == 1) {
						socket.broadcast.to(room).emit('remove_user', user.id);
						if (room_data[room].userlist[user.id].role) {
							room_data[room].lost_users[user.id] = room_data[room].userlist[user.id].role;
						}
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
		
		socket.on('create_entity', function(room, entity) {
			if (room_data[room] && entity) {
				room_data[room].history[entity.uid] = entity;
				socket.broadcast.to(room).emit('create_entity', entity);
			}
		});
		
		socket.on('drag', function(room, uid, x, y) {
			if (room_data[room] && room_data[room].history[uid]) {
				room_data[room].history[uid].x = x;
				room_data[room].history[uid].y = y;
				socket.broadcast.to(room).emit('drag', uid, x, y);
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
		
		socket.on('remove', function(room, uid) {
			if (room_data[room] && room_data[room].history[uid]) {
				delete room_data[room].history[uid];
				socket.broadcast.to(room).emit('remove', uid);
			}
		});

		socket.on('chat', function(room, message) {
			socket.broadcast.to(room).emit('chat', message);
		});
		
		socket.on('update_user', function(room, user) {
			if (room_data[room] && room_data[room].userlist) {
				room_data[room].userlist[user.id] = user;
				socket.broadcast.to(room).emit('add_user', user);
			}
		});

		socket.on('lock_room', function(room, is_locked) {
			if (room_data[room]) {
				room_data[room].locked = is_locked;
				socket.broadcast.to(room).emit('lock_room', is_locked);
			}
		});

		socket.on('store', function(room, name) {
			user = socket.handshake.session.passport.user;
			if (room_data[room] && user.identity) { //room exists, user is logged in
				collection = db.collection(user.identity);
				room_data[room].name = name;
				collection.update({name:name}, {name:name, history:room_data[room].history, date:Date.now(), game:room_data[room].game}, {upsert: true});
			}
		});
	});
	
	//create server
	http = require('http');
	server = http.createServer(app);
	io.attach(server);
	server.listen(80);	
});

