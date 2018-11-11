var fs = require('fs');
var _datadir = null;
var secrets = JSON.parse(fs.readFileSync('secrets.txt', 'utf8'));
var http = require('http');
var escaper = require('mongo-key-escape');
var sizeof = require('object-sizeof');
var request = require('request');

var redis = require('redis')
var redis_client = redis.createClient(secrets.redis_options);

redis_client.on("error", function (e) {
    console.error("Error " + e);
});

redis_client.auth(secrets.redis_options.pass, (e) => {
	
if (e) {
	console.error(e);
	return;
}

var cookieParser = require('cookie-parser')
var Session = require('express-session');
var RedisStore = require('connect-redis')(Session);

room_data = {} //room -> room_data map to be shared with clients

//generate unique id
var valid_chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function newUid() {
	var text = "";
	for(var i=0; i < 14; i++ ) {
		text += valid_chars.charAt(Math.floor(Math.random() * valid_chars.length));
	}
	return text;
}

var compress = require('compression');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var logger = require('morgan');
var passport = require('passport');
var locales = ['en', 'sr', 'de', 'es', 'fr', 'pl', 'cs', 'fi', 'ru', 'nl', 'el', 'pt', 'hu', 'it', 'cn'];

var app = express();
app.use(compress());

app.use(bodyParser.json({limit: '50mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser())
  
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// creating new socket.io app
var io = require('socket.io')();

//configure localization support
var i18n = require('i18n');
i18n.configure({
	locales: locales,
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

app.use(function (req, res, next) {
	var host = req.hostname;
	if (host && host.endsWith('wottactic.tk')) {
		var subdomain = host.substr(0, host.indexOf('wottactic.tk'));
		return res.redirect(301, 'http://' + subdomain + 'wottactic.com' + req.originalUrl);
	}
	return next();
});

// not pretty but oh so handy to not crash the server
process.on('uncaughtException', function (err) {
 	console.log(err);
	console.log(err.stack);	
});

//load mongo
connection_string =  secrets.mongodb_string;

console.log("Connecting to mongodb")

MongoClient = require('mongodb').MongoClient;
MongoClient.connect(connection_string, {reconnectTries:99999999}, function(err, db) {
	if(err) throw err;	

	db.createCollection('tactics');
	db.createCollection('users');
	db.createCollection('update_stats');
	db.collection('tactics').createIndex( { "createdAt": 1 }, { expireAfterSeconds: 31622400 } );

	db.createCollection('clans');
	
	function clean_up_room(room) {
		setTimeout( function() {
			if (room_data[room]) {
				if (!io.sockets.adapter.rooms[room]) {
					if (Date.now() - room_data[room].last_join > 50000) {
						save_room(room, function() {
							delete room_data[room];
						});
					} else {
						clean_up_room(room); //try again
					}
				}
			}
		}, 60000);
	}
	
	function save_room(room, cb) {
		if (room_data[room]) {
			room_data[room]._id = room;
			db.collection('tactics').replaceOne({_id:room}, room_data[room], {upsert: true}, function (err, result) {
			  cb();
			});
		}
	}
	
	function get_tactics(identity, game, cb) {
		if (identity) {
			db.collection('users').findOne({_id:identity},{'tactics':1, 'rooms':1}, function(err, data) {
				if (!err) {
					if (data) {
						var tactics = [], rooms = [];
						if (data.tactics) {
							tactics = data.tactics;
						}
						if (data.rooms) {
							rooms = data.rooms;
						}
						cb(tactics, rooms);
					} else {
						cb([],[]);
					}
				} else {
					cb([],[]);
				}
			});
		} else {
			cb([],[]);
		}
	}	
	
	function set_game(req, res, game) {
		req.session.game = game;
		res.cookie('game', game, {maxAge: 30 * 3600 * 1000, domain: get_host(req)}); 	
	}
	
	function set_locale(req, res, locale) {
		req.session.locale = locale;
		res.cookie('locale', locale, {maxAge: 30 * 3600 * 1000, domain: get_host(req)}); 	
	}
	
	function push_tactic_to_db(user, room, name, uid, remove_old) {
		//store a link to the tacticn in user data
		var date = Date.now();
		db.collection('users').updateOne({_id:user.identity}, {$push:{tactics:{name:name, date:date, game:room_data[room].game, uid:uid, is_video:(typeof room_data[room].playing != 'undefined')}}}, {upsert: true} , function(err) {
			if (!err && remove_old) {
				try {
					db.collection('users').updateOne({_id:user.identity}, {$pull: {tactics:{uid:uid, date:{$ne:date}}}}, {upsert: true});
				} catch(e) {} //probably doesn't exist
			}
		});		
		//store the tactic in the stored_tactics list
		var data = JSON.parse(JSON.stringify(room_data[room]));
		data.name = name;
		delete data.userlist;
		delete data.lost_users;
		delete data.lost_identities;

		if (!data.creator) {
			data.creator = user.identity;
		}
		if (!data.users) data.users = {}
		data.users[user.identity] = "owner";
		
		data._id = uid;
		db.collection('stored_tactics').replaceOne({_id:uid}, data, {upsert: true});

		if (!room_data[room].lost_identities[user.identity]) {
			room_data[room].lost_identities[user.identity] = {role: "owner"};
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
					push_tactic_to_db(user, room, name, uid, true);
			} else {
				var uid = newUid();
				push_tactic_to_db(user, room, name, uid, false);
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
							room_data[uid].trackers = {};
							room_data[uid].lost_users[user.id] = "owner";
							if (user.identity) {
								room_data[uid].lost_identities[user.identity] = {role: "owner", tactic_name:header.tactics[0].name, tactic_uid:id};
							}
							room_data[uid].locked = true;
							cb(uid);
						} else {
							cb(newUid());
						}
					});
				} else {
					cb(newUid());
				}
			});
		} else {
			cb(newUid());
		}
	}
	
	function remove_tactic(identity, id) {
		db.collection('users').updateOne({_id:identity}, {$pull: {tactics:{uid:id}}});
	}
	
	function rename_tactic(user, uid, new_name) {
		db.collection('users').findOne({_id:user.identity, tactics:{$elemMatch:{uid:uid}}},{'tactics.$':1}, function(err, result) {
			if (!err && result && result.tactics) {
				var tactic = result.tactics[0];
				var old_name = tactic.name;
				tactic.name = new_name;
				db.collection('users').updateOne({_id:user.identity}, {$push: {tactics:tactic}}, function(err) {
					if (!err) {
						db.collection('users').updateOne({_id:user.identity}, {$pull: {tactics:{uid:uid, name:old_name}}});
					}
				});
			}			
		});
	}
	
	function create_anonymous_user(req) {
		if (!req.session.passport) {
			req.session.passport = {};
		}
		req.session.passport.user = {};
		req.session.passport.user.id = newUid();
		req.session.passport.user.name = "Anonymous";		
	}
	
	//returns host without subdomain
	function get_host(req) {
		var host = req.hostname.split('.');
		if (host.length >= 2) {
			host = host[host.length-2] + '.' + host[host.length-1];
		} else {
			host = host[0];
		}
		return host;		
	}
	
	// initializing session middleware
	var mwCache = Object.create(null);
	function virtualHostSession(req, res, next) {
		if (req.hostname) {
			var host = get_host(req);
			var hostSession = mwCache[host];
			if (!hostSession) {
				console.log("creating redis store for: " + host)
				var redis_store = new RedisStore({client:redis_client});
				hostSession = mwCache[host] = Session({secret: secrets.cookie, resave:true, saveUninitialized:false, cookie: {domain:host, maxAge: 30 * 86400 * 1000, httpOnly:true}, rolling: true, store: redis_store});
				mwCache[host].store = redis_store;
			}
      if (res) {
        hostSession(req, res, next);
      }
		}
	}
  
	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
		next();
	});
	
	app.use(virtualHostSession);
	
	// Configuring Passport
	app.use(passport.initialize());
	app.use(passport.session());
	
	//fix cookie, can be removed in 2 months from (07/17)
	app.use(function(req, res, next) {
		if (req.cookies["connect.sid"]) {
			res.cookie(
				'connect.sid', 
				req.cookies["connect.sid"], 
				{
					maxAge: req.session.cookie.maxAge,
					domain: get_host(req),
					path: '/', 
					httpOnly: true
				}
			);
		}
		next();
	})
	
	//create a default user + detect language
	app.use(function(req, res, next) {
		var domain = req.headers.host;
		var subDomain = domain.split('.');	
		if (subDomain[0] == 'www') {
			res.redirect(301, 'http://' + subDomain.slice(1).join('.') + req.originalUrl);
			return;
		}
		if (!req.session.passport || !req.session.passport.user) {
			create_anonymous_user(req);		
		}
		if (locales.indexOf(subDomain[0]) != -1) {
			set_locale(req, res, subDomain[0]);
			subDomain = subDomain.slice(1);
		} else {
			if (req.query.lang) {
				set_locale(req, res, req.query.lang);
			} else {
				if (req.session.locale) {
					set_locale(req, res, req.session.locale);
				} else {
					set_locale(req, res, "en");
				}
			}
		}
		if (req.query.game) {
			set_game(req, res, req.query.game)
		}	
		req.fullUrl = subDomain.join('.') + req.originalUrl;		
		req.session.last_login = Date();
		req.session.touch();
		next();
	});
	
	passport.serializeUser(function(user, done) {
		if (user.wg_account_id) {
			db.collection('users').updateOne({_id:user.identity}, {$set: { _id:user.identity, name:user.name, identity_provider:user.identity_provider, server:user.server, wg_id:user.wg_account_id}}, {upsert:true});
		} else {
			db.collection('users').updateOne({_id:user.identity}, {$set: { _id:user.identity, name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
		}
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	// session support for socket.io	
	function session_from_sessionid_host(sessionId, host, cb) {
		if (!mwCache[host]) {
			var redis_store = new RedisStore({client:redis_client});
			mwCache[host] = Session({secret: secrets.cookie, resave:true, saveUninitialized:false, cookie: {domain:host, expires: new Date(Date.now() + 30 * 86400 * 1000), httpOnly: false}, rolling: true, store: redis_store});
			mwCache[host].store = redis_store;
		}
		if (sessionId) {
			mwCache[host].store.get(sessionId, function(err, data) {
				if (!err) {
					cb(data);
				} else {
					cb();
				}
			});
		} else {
			cb();
		}
		
	}
	
	io.use(function(socket, next) {
		// pretend we have the cookie
		var sessionId = socket.request._query.connect_sid;
		var host = socket.request._query.host;
		
		function done() {
			if (!socket.request.session.passport || !socket.request.session.passport.user) {
				create_anonymous_user(socket.request);
			}
			next();
		}	
		session_from_sessionid_host(sessionId, host, function(session) {
			if (session) {
				socket.request.session = session;
				done();
			} else {
				socket.request.hostname = socket.handshake.headers.host;
				virtualHostSession(socket.request, socket.request.res, done);					
			}
		});
	});
	
	// setup routes
	var router = express.Router();

	router.get('/', function(req, res, next) {
		var game;
		if (req.hostname) {
			if (req.hostname.indexOf('awtactic') != -1) {
				game = "aw";
			} else if (req.hostname.indexOf('wowstactic') != -1) {
				game = "wows";
			} else {
				game = "wot";
			}
		} else {
			game = "wot";
		}
		set_game(req, res, game);
		res.render('index', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale,
							url: req.fullUrl,
                            static_host: secrets.static_host,
							secrets:secrets});
	});
	router.get(['/health_check', '/health_check.html'], function(req, res, next) {
	  res.sendStatus(200);
	});	
	
	//reload the secrets file
	router.get('/reload_secrets', function(req, res, next) {
		if (req.query.pw == secrets.admin_password) {
			secrets = JSON.parse(fs.readFileSync('secrets.txt', 'utf8'));
			res.status(200).send("Secrets loaded")
		} else {
			res.status(500).send("Wrong password")
		}
	});
	
	function planner_redirect(req, res, game, template) {
	  if (req.query.restore) {
      var uid = newUid();
      restore_tactic(req.session.passport.user, req.query.restore, function (uid) {           
        save_room(uid, function() {
          delete room_data[uid];
          res.redirect(game+'2?room='+uid);
        });
      });
	  } else if (!req.query.room) {
		  res.redirect(game+'2?room='+newUid());
	  }	else {
		  set_game(req, res, game);
		  res.render(template, { game: req.session.game, 
								 user: req.session.passport.user,
								 locale: req.session.locale,
								 url: req.fullUrl,
								 sid: req.sessionID,
								 static_host: secrets.static_host,
								 secrets:secrets});
								  
		  if (req.session.passport.user.identity) {
			  setImmediate(function() {
				  var link = "http://" + req.fullUrl;
				  db.collection('users').updateOne(
				  	  { _id:req.session.passport.user.identity },
					  { "$pull": { "rooms": link } }
				  )
				  db.collection('users').updateOne(
				  	  { _id:req.session.passport.user.identity },
					  { "$push": { "rooms": { "$each": [link], "$slice": -10 } } }
				  )
			  });
		  }					  
	  }
	}
  	
	var games = ['wot', 'aw', 'wows', 'blitz', 'lol', 'hots', 'sc2', 'csgo', 'warface', 'squad', 'R6', 'MWO', 'EC', 'propilkki2', 'pr', 'clans', 'foxhole', 'steelocean', 'pubg'];	
	games.forEach(function(game) {
		router.get(['/' + game + '.html', '/' + game], function(req, res, next) {
		  set_game(req, res, game);
		  res.render('index', { game: req.session.game, 
								user: req.session.passport.user,
								locale: req.session.locale,
								url: req.fullUrl,
								static_host: secrets.static_host,
								secrets:secrets});
		});
		router.get(['/'+game+'1', '/'+game+'planner.html'], function(req, res, next) {
		  planner_redirect(req, res, game, 'planner');
		});	
		router.get(['/'+game+'2', '/'+game+'planner2.html'], function(req, res, next) {
		  planner_redirect(req, res, game, 'planner2');
		});
		router.get(['/'+game+'3', '/'+game+'planner3.html'], function(req, res, next) {
		  planner_redirect(req, res, game, 'planner3');
		});			
	});
		
	var count = 0;
	//form {pw: pw, data: {field: field, users: [{_id:user, ...}]}}
	router.post('/submit_summaries', function(req, res, next) {
		if (req.query.pw == secrets.admin_password) {
			var data = req.body;
			for (var i in data) {
				var field = i;
				var users = data[i]				
				for (var j in users) {
					var user = users[j];
					db.collection('ws_' + field + '_summary').replaceOne({_id:user._id}, user, {upsert:true});
				}
			}
			res.status(200).send('Received')
		} else {
			res.status(500).send('Incorrect password')
		}
	});
	
	router.get(['/about.html', '/about'], function(req, res, next) {
	  if (!req.session.game) {
		  set_game(req, res,'wot');
	  }
	  res.render('about', { game: req.session.game, 
							user: req.session.passport.user,
							locale: req.session.locale,
							url: req.fullUrl,
							static_host: secrets.static_host,
						    secrets:secrets});
	});
	router.get(['/getting_started.html','/getting_started'], function(req, res, next) {
	  if (!req.session.game) {
		set_game(req, res,'wot');
	  }
	  res.render('getting_started', { game: req.session.game, 
									  user: req.session.passport.user,
									  locale: req.session.locale,
									  url: req.fullUrl,
									  static_host: secrets.static_host,
									  secrets:secrets});
	});
	router.get(['/privacypolicy.html', '/privacypolicy'], function(req, res, next) {
	  if (!req.session.game) {
		set_game(req, res,'wot');
	  }
	  res.render('privacypolicy', { game: req.session.game, 
								    user: req.session.passport.user,
									locale: req.session.locale,
									url: req.fullUrl,
									static_host: secrets.static_host,
									secrets:secrets});
	});
	
	router.get(['/older_news.html','/older_news'], function(req, res, next) {
	  if (!req.session.game) {
		set_game(req, res,'wot');
	  }
	  res.render('older_news', { game: req.session.game, 
								 user: req.session.passport.user,
								 locale: req.session.locale,
								 url: req.fullUrl,
								 static_host: secrets.static_host,
								 secrets:secrets});
	});
	
	router.get(['/stored_tactics.html','/stored_tactics'], function(req, res, next) {
	  if (!req.session.game) {
		set_game(req, res,'wot');
	  }
	  if (req.session.passport.user.identity) {
		get_tactics(req.session.passport.user.identity, req.session.game, function(tactics, last_rooms) {
		  res.render('stored_tactics', { game: req.session.game, 
										 user: req.session.passport.user,
										 locale: req.session.locale,
										 tactics: tactics,
										 rooms: last_rooms,
										 url: req.fullUrl,
										 sid: req.sessionID,
										 static_host: secrets.static_host,
										 socket_io_servers: secrets.socket_io_servers,
										 secrets:secrets});
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
	router.get(['/share_tactic.html','/share_tactic'], function(req, res, next) {
		if (req.session.passport.user.identity) {
			var uid = escaper.escape(decodeURIComponent(req.query.uid));
			var name = escaper.escape(decodeURIComponent(req.query.name));
			var game = escaper.escape(decodeURIComponent(req.query.game));
			
			db.collection('users').findOne({_id:req.session.passport.user.identity, tactics:{$elemMatch:{name:name}}}, {'tactics.$':1}, function(err, result) { 					
				if (!err && result && result.tactics) {
					res.send("Error: A tactic with name: " + name + " already exists.");
					return;
				} else {
					db.collection('users').updateOne({_id:req.session.passport.user.identity}, {$push:{tactics:{name:name, date:Date.now(), game:game, uid:uid}}}, {upsert: true}, function() {
						res.redirect("/stored_tactics");
					});
				}
			});
		} else {
			res.send("First log in and try again");
			return;
		}
		return;
	});	
	app.get('/logout', function(req, res) {
	  var return_to = req.headers.referer;
	  req.logout();
	  res.cookie('logged_in', 'no', {maxAge: 30 * 3600 * 1000, domain: get_host(req)}); 
	  res.redirect(return_to);
	});

	function get_server(id) {
        if(id >= 2000000000){return "asia";}
        if(id >= 1000000000){return "com";}
        if(id >= 500000000){return "eu";}
        return "ru";
    }
	
	function get_wg_data(page, fields, player, cb) {
		var server = get_server(player);
		var link = "https://api.worldoftanks." + server + "/wot" + page;
		link += "application_id=" + secrets.wg_api_key;
		link += "&account_id=" + player;
		if (fields && fields.length > 0) {
			link += "&fields=";
			for (var i in fields) {
				var field = fields[i];
				link += field + ",";
			}
			link = link.slice(0,-1);
		}
		request(link, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var data = JSON.parse(body);
				if (data.status == "error") {
					console.error("Error fetching link: " + link);
					console.error(data);
					cb();
				} else {
					cb(data.data[player]);
				}
			} else {
				console.error(response.statusCode + ": "+ error);
				cb();
			}
		});
	}

	function decorate_session(user, done) {
		db.collection('users').findOne({_id:user.identity}, {no_ads:true}, function(err, result) {
			if (result && result.no_ads) {
				user.no_ads = true;
			}
			if (done) done();
		});
	}
	
	OpenIDStrategy = require('passport-openid').Strategy;
	passport.use('openid', new OpenIDStrategy({
			returnURL: "/auth/openid/callback",
			passReqToCallback: true,
			stateless: true
		},
		function(req, identifier, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();		
			}
			user.server = identifier.split('://')[1].split(".wargaming")[0];
			user.identity_provider = "wargaming";
			var id_string = identifier.split('/id/')[1].split("/")[0];
			user.wg_account_id = id_string.split('-')[0];
			user.identity = "wg-" + user.wg_account_id;			
			user.name = id_string.split('-')[1];			
			var promises = [];
			promises.push(new Promise(function(resolve){ 
				decorate_session(user, function() { resolve(); });
			}))
			promises.push(new Promise(function(resolve){ 
				get_wg_data("/account/info/?", ["clan_id"], user.wg_account_id, function(data) {				
					if (data) {
						user.clan_id = String(data.clan_id);
						db.collection('update_clans').replaceOne({_id:user.clan_id}, {_id:user.clan_id}, {upsert: true});
					}
					resolve();
				});
			}))		
			Promise.all(promises).then(function() {
				db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider, server:user.server, wg_id:user.wg_account_id, clan_id:user.clan_id}}, {upsert:true});
				done(null, user);
			})
		}
	));
	
	//openid
	router.post('/auth/openid', save_return, function(req,res,next) { passport.authenticate('openid', { returnURL: 'http://'+req.fullUrl.split("/")[0]+'/auth/openid/callback' })(req, res, next); } );
	router.get('/auth/openid/callback', passport.authenticate('openid'), redirect_return);
	
	if (secrets.google.client_id != "") {
		StrategyGoogle = require('passport-google-oauth2').Strategy;
		passport.use('google', new StrategyGoogle({
			clientID: secrets.google.client_id,
			clientSecret: secrets.google.secret,
			callbackURL: '/auth/google/callback',
			scope: 'https://www.googleapis.com/auth/userinfo.profile',
			passReqToCallback:true,
			stateless: true
		  },
		  function(req, accessToken, refreshToken, profile, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();
			}
			user.identity = profile.id;
			user.identity_provider = "google";
			user.name = profile.displayName;
			
			db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
			decorate_session(user, function() {
				done(null, user);
			});
		  }
		));
		
		//google
		router.post('/auth/google', save_return, function(req,res,next) { passport.authenticate('google', { callbackURL: 'http://'+req.fullUrl.split("/")[0]+'/auth/google/callback' })(req, res, next); } );
		router.get('/auth/google/callback', passport.authenticate('google'), redirect_return);
	}
	
	if (secrets.vk.client_id != "") {
		var VKontakteStrategy = require('passport-vkontakte').Strategy;
		passport.use('vk', new VKontakteStrategy({
			clientID: secrets.vk.client_id, // VK.com docs call it 'API ID'
			clientSecret: secrets.vk.secret,
			callbackURL: '/auth/vk/callback',
			passReqToCallback:true,
			stateless: true
		  },
		  function(req, accessToken, refreshToken, profile, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();
			}
			user.identity = "vk-" + profile.id;
			user.identity_provider = "vk";
			user.name = profile.displayName;
			
			db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
			decorate_session(user, function() {
				done(null, user);
			});			
		  }
		));
		
		//vk
		router.post('/auth/vk', save_return, function(req,res,next) { passport.authenticate('vk', { callbackURL: 'http://'+req.fullUrl.split("/")[0]+'/auth/vk/callback' })(req, res, next); } );
		router.get('/auth/vk/callback', passport.authenticate('vk'), redirect_return);
	}
	
	if (secrets.battlenet.client_id != "") {
		StrategyBnet = require('passport-bnet').Strategy;
		passport.use('battlenet', new StrategyBnet({
			clientID: secrets.battlenet.client_id,
			clientSecret: secrets.battlenet.secret,
			callbackURL:"https://karellodewijk.github.io/battlenet_redirect.html",
			passReqToCallback:true,
			stateless: true
		  },
		  function(req, accessToken, refreshToken, profile, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();
			}
			user.identity = 'bnet-'+profile.id;
			user.identity_provider = "bnet";
			user.name = profile.battletag;
			
			db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
			decorate_session(user, function() {
				done(null, user);
			});		
		  }
		));	
		
		StrategyBnet.prototype.authorizationParams = function(options) {
		  return { state: options.redirectUrl };
		};
		
		//battle.net
		router.post('/auth/battlenet', save_return, function(req,res,next) { passport.authenticate('battlenet', { callbackURL: 'https://karellodewijk.github.io/battlenet_redirect.html', redirectUrl:'http://' + req.fullUrl.split("/")[0] + '/auth/battlenet/callback' })(req, res, next); } );
		router.get('/auth/battlenet/callback', passport.authenticate('battlenet'), redirect_return);
	}

	if (secrets.facebook.client_id != "") {
		FacebookStrategy = require('passport-facebook').Strategy;
		passport.use('facebook', new FacebookStrategy({
			clientID: secrets.facebook.client_id,
			clientSecret: secrets.facebook.secret,
			callbackURL: "/auth/facebook/callback",
			passReqToCallback: true,
			stateless: true
		  },
		  function(req, accessToken, refreshToken, profile, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();
			}
			user.identity = profile.id;
			user.identity_provider = "facebook";
			user.name = profile.displayName;
			
			db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
			decorate_session(user, function() {
				done(null, user);
			});			
		  }
		));
		
		//facebook
		router.post('/auth/facebook', save_return, function(req,res,next) { passport.authenticate('facebook', { callbackURL: 'http://'+req.fullUrl.split("/")[0]+'/auth/facebook/callback' })(req, res, next); } );
		router.get('/auth/facebook/callback', passport.authenticate('facebook'), redirect_return);
	}

	if (secrets.twitter.client_id != "") {
		TwitterStrategy = require('passport-twitter').Strategy;
		passport.use('twitter', new TwitterStrategy({
			consumerKey: secrets.twitter.client_id,
			consumerSecret: secrets.twitter.secret,
			callbackURL: "/auth/twitter/callback",
			passReqToCallback: true,
			stateless: true
		  },
		  function(req, token, tokenSecret, profile, done) {
			var user = {};
			if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
				user.id = req.session.passport.user.id;
			} else {
				user.id = newUid();
			}
			user.identity = profile.id;
			user.identity_provider = "twitter";
			user.name = profile.displayName;
			
			db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
			decorate_session(user, function() {
				done(null, user);
			});		
		  }
		));	
		
		//twitter
		router.post('/auth/twitter', save_return, function(req,res,next) { passport.authenticate('twitter', { callbackURL: 'http://wottactic.tk/twitter_redirect.html?dest=' + 'http://' + req.fullUrl.split("/")[0] + '/auth/twitter/callback' })(req, res, next); } );
		router.get('/auth/twitter/callback', passport.authenticate('twitter'), redirect_return);
	}

	if (secrets.steam.api_key != "") {		
		var SteamWebAPI = require('steam-web');
		var steam = new SteamWebAPI({ apiKey: secrets.steam.api_key, format: 'json' });
		passport.use('steam', new OpenIDStrategy({
				returnURL: "http://wottactic.com/steam_redirect.html",
				realm: "http://wottactic.com",
				provider: 'steam',
				name:'steam',
				profile:false,
				providerURL: 'http://steamcommunity.com/openid/id/',
				passReqToCallback: true,
				stateless: true
			},
			function(req, identifier, done) {
				var user = {};
				if (req.session.passport && req.session.passport.user && req.session.passport.user.id) {
					user.id = req.session.passport.user.id;
				} else {
					user.id = newUid();		
				}
				steam.getPlayerSummaries({
					steamids: [ identifier ],
					callback: function(err, result) {
						if (!err) {
							user.identity = result.response.players[0].steamid;
							user.identity_provider = "steam";
							user.name = result.response.players[0].personaname;
						}
						
						db.collection('users').updateOne({_id:user.identity}, {$set: {name:user.name, identity_provider:user.identity_provider}}, {upsert:true});
						decorate_session(user, function() {
							done(null, user);
						});
						
					}
				});			
			}
		));

		//steam
		router.post('/auth/steam', save_return, function(req,res,next) { passport.authenticate('steam', { returnURL: "http://wottactic.com/steam_redirect.html?dest=" + "http://" + req.hostname + "/auth/steam/callback/" })(req, res, next); } );
		router.get('/auth/steam/callback', passport.authenticate('steam'), redirect_return);
	}
	
	
	function copy_slides(source, target, res, slide) {
		if (source.slides) {
			if (Object.keys(source.slides).length > 100) {
				res.send("Error: too many slides");
				return;
			}
			if (Object.keys(room_data[target].slides).length > 100) {
				res.send("Error: too many slides");
				return;
			}
			var largest_slide_order = -1;
			for (var key in room_data[target].slides) {
				if (room_data[target].slides.hasOwnProperty(key)) {
					if (room_data[target].slides[key].order > largest_slide_order) {
						largest_slide_order = room_data[target].slides[key].order;
					}
				}
			}
			largest_slide_order += 4294967296;
			var slide_list = source.slides;
			if (slide) {
				slide_list = {}
				slide_list[slide] = source.slides[slide];
			}
			for (var key in slide_list) {
				if (source.slides.hasOwnProperty(key)) {
					var uid = newUid();
					var new_slide = JSON.parse(JSON.stringify(source.slides[key]));
					new_slide.order += largest_slide_order;
					new_slide.uid = uid;
					room_data[target].slides[uid] = new_slide;
					io.to(target).emit('new_slide', new_slide);
				}
			}
			res.send("Success");
		}
	}
	
	router.post('/add_to_room', function(req, res, next) {
		var sessionId = req.body.session_id;
		var host = req.body.host;
		var slide = req.body.slide;
		
		session_from_sessionid_host(sessionId, host, function(session) {			
			var target = req.body.target;
			var user = session.passport.user;
						
			if (!room_data[target]) {
				res.send("Error: room is not active or does not exist.");
				return;
			} else if (room_data[target].locked
					  && (!room_data[target].userlist[user.id] || !room_data[target].userlist[user.id].role) 
					  && (!room_data[target].lost_identities[user.identity] || !room_data[target].lost_identities[user.identity].role)) {
				res.send("Error: You don't have permission for that room.");
				return;
			}
			
			var source = req.body.source;
			if (req.body.stored == "true") {
				db.collection('stored_tactics').findOne({_id:source}, function(err, result) {
					if (!err && result) { 
						copy_slides(result, target, res, slide);
					} else {
						res.send("Error: tactic not found");
					}
				});
			} else {
				db.collection('tactics').findOne({_id:source}, function(err, result) {
					if (!err && result) {
						try {
							if (!result.locked
							  || result.lost_users[user.id] == "owner"
							  || result.lost_identities[user.id].role == "owner") {
								copy_slides(result, target, res, slide);
							}
						} catch(e) {
							console.log(e);
							res.send("Error: no permission");
						}
					} else {
						res.send("Error: tactic not found");
					}
				});				
			}
		});
	});	
	function save_return(req, res, next) {
		req.session.return_to = req.headers.referer;
		next();
	}
	function redirect_return(req, res, next) {
		if (req.session.passport.user.identity) {
			res.cookie('logged_in', req.session.passport.user.identity, {maxAge: 30 * 3600 * 1000, domain: get_host(req)}); 
		} else {
			res.cookie('logged_in', "no", {maxAge: 30 * 3600 * 1000, domain: get_host(req)}); 
		}
		if (!req.session.return_to || req.session.return_to.match("^undefined")) {
			console.error("Invalid return path:", req.session.return_to)
			res.redirect("/");
		} else {
			res.redirect(req.session.return_to);
		}
		delete req.session.return_to;
		return;
	}

	//force saves all rooms to DB, run before a restart/shutdown
	router.get('/save', function(req, res, next) {
		if (req.query.pw == secrets.admin_password) {
			var unsaved_rooms = 0;
			for (var room in room_data) {
				unsaved_rooms++;
				save_room(room, function(){
					unsaved_rooms--;
				});
			}
			var timer = setInterval(function() {
				if (unsaved_rooms == 0) {
					clearInterval(timer);
					res.send('Success');
				}
			}, 500);			
		} else {
			res.send('Invalid password')
		}
	});

	app.get('/disconnect', function(req, res) {
		if (req.query.pw == secrets.admin_password) {
			for (var room in room_data) {
				save_room(room, function(){
					io.to(room).emit('force_reconnect');
				});
			}
			res.send('Success');
		} else {
			res.send('Invalid password')
		}
	});
 
	// /**
	 // * Starts profiling and schedules its end
	 // */
	// function startProfiling(time, cb) {
		// var stamp = Date.now();
		// var id = 'profile-' + stamp;

		// // Use stdout directly to bypass eventloop
		// fs.writeSync(1, 'Start profiler with Id [' + id + ']\n');

		// // Start profiling
		// profiler.startProfiling(id);


		// // Schedule stop of profiling in x seconds
		// setTimeout(function () {
			// stopProfiling(id, cb)
		// }, time);
	// }

	// /**
	 // * Stops the profiler and writes the data to a file
	 // * @param id the id of the profiler process to stop
	 // */
	// function stopProfiling(id, cb) {
		// var profile = profiler.stopProfiling(id);
		// var profile_data = JSON.stringify(profile);
		// fs.writeFile('./' + id + '.cpuprofile', JSON.stringify(profile), function () {
			// console.log('Profiler data written to:', id + '.cpuprofile');
			// cb(profile_data);
		// });
	// }
	
	router.get('/profile', function(req, res, next) {
		if (req.query.pw == secrets.admin_password) {
			var time;
			if (req.query.time) {
				var time = parseFloat(req.query.times);
			} else {
				var time = 5000;
			}
			startProfiling(5000, function(profile_data) {
				res.send(profile_data);
			});
		}
	});

	//some basic logging data
	router.get('/log', function(req, res, next) {
		var log_data = "Active rooms: " + Object.keys(room_data).length + "<br />\n";
		log_data += "#clients: " + io.engine.clientsCount + "<br />\n";	
		res.send(log_data);
	});
	
	//reloads templates, so I don't have to restart the server to add basic content
	var lastmod = (new Date()).toISOString().substr(0,10);
	router.get('/refresh', function(req, res, next) {
		if (req.query.pw == secrets.admin_password) {
			var ejs = require('ejs')
			ejs.clearCache();
			lastmod = (new Date()).toISOString().substr(0,10);
			i18n.configure({
				locales: locales,
				directory: __dirname + "/locales",
				updateFiles: true
			});
			res.send('Success');
		} else {
			res.send('Invalid password')
		}
	});
	
	//////////////
	//clanportal//
	//////////////

	var cp = require(__dirname + "/clanportal.js");
	cp.load(router, secrets, db, request, escaper);

	//////////////////
	//end clanportal//
	//////////////////
	
	var robots_base = "User-agent: *\n";
	robots_base += "Disallow: /auth/twitter\n";
	robots_base += "Disallow: /auth/facebook\n";
	robots_base += "Disallow: /auth/google\n";
	robots_base += "Disallow: /auth/vk\n";
	robots_base += "Disallow: /auth/openid\n";
	robots_base += "Disallow: /auth/steam\n";
	robots_base += "Disallow: /auth/battlenet\n";
	
	
	router.get('/robots.txt', function(req, res, next) {
		res.header('Content-Type', 'text/plain');
		res.send(robots_base);
	});
	
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
		var user = socket.request.session.passport.user;

		if (user) {
			if (room_data[room].userlist[user.id]) {
				//a user is already connected to this room in probably another tab, just increase a counter
				room_data[room].userlist[user.id].count++;
			} else {
				room_data[room].userlist[user.id] = {name:user.name, id:user.id, role:user.role, identity:user.identity, logged_in:(user.identity) ? true : false};
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
			} else if (room_data[room].name) {
				tactic_name = room_data[room].name;
			} else {
				tactic_name = "";
			}
			
			socket.emit('room_data', room_data[room], user.id, tactic_name, socket.request.session.locale);
		}
	}
	
	function create_empty_room(user, game) {
		var room = {};
		var slide0_uid = newUid();
		room.slides = {};
		room.slides[slide0_uid] = {name:'1', order:0, entities:{}, uid:slide0_uid, z_top:0}
		var background_uid = newUid();
    switch(game) {
      case 'lol':
        room.slides[slide0_uid].entities[background_uid] = {uid:background_uid, type:'background', path:"/maps/lol/rift.jpg", z_index:0, size_x: 15000, size_y: 15000};
        room.locked = false;
        break;
      case 'pubg':
        room.slides[slide0_uid].entities[background_uid] = {uid:background_uid, type:'background', path:"/maps/pubg/realistic_overlay.jpg", z_index:0, size_x: 8000, size_y: 8000};
        room.locked = true;
        break;
      default:
        room.slides[slide0_uid].entities[background_uid] = {uid:background_uid, type:'background', path:"", z_index:0};
        room.locked = true;
		}
		room.active_slide = slide0_uid;
		room.trackers = {};
		room.userlist = {};
		room.lost_users = {};
		room.lost_identities = {};
		room.lost_users[user.id] = "owner";
		if (user.identity) {
			room.lost_identities[user.identity] = {role: "owner"};
		}
		room.game = game;
		return room;
	}

	//socket.io callbacks
	io.sockets.on('connection', function(socket) {		
		socket.on('sync_clock', function() {
			socket.emit('sync_clock', Date.now());
		});
		
		socket.on('join_room', function(room, game) {			
			if (!(room in room_data)) {
				db.collection('tactics').findOne({_id:room}, function(err, result) {
					if (!err && result) {
						if (!(room in room_data)) { //it may have been created already
							room_data[room] = result;
							room_data[room].last_join = Date.now();	
							room_data[room].userlist = {};
							room_data[room].trackers = {};
						}
					} else {
						if (!(room in room_data)) { //it may have been created already
							var user = socket.request.session.passport.user;
							room_data[room] = create_empty_room(user, game);
						}
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
			if (socket.request.session.passport) { //users, even anonymouse ones should always have a passport, but sometimes they don't
				var user = socket.request.session.passport.user;
				for (var room in socket.rooms) {
					if (room_data[room] && room_data[room].userlist[user.id]) {
						if (room_data[room].userlist[user.id].count == 1) {
							socket.broadcast.to(room).emit('remove_user', user.id);
							delete room_data[room].userlist[user.id];
							for (var key in room_data[room].trackers) {
								if (room_data[room].trackers[key].owner == user.id) {
									delete room_data[room].trackers[key];
									break;
								}
							}
						} else {
							room_data[room].userlist[user.id].count--;
						}
					}	
				}
			}
			for (var room in socket.rooms) {
				if (io.sockets.adapter.rooms[room].length <= 1) {	//we're the last one in the room and we're leaving
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
					if (room_data[room].slides[slide].z_top !== 'undefined') {
						room_data[room].slides[slide].z_top++;
						entity.z_index = room_data[room].slides[slide].z_top;
					}
					room_data[room].slides[slide].entities[entity.uid] = entity;
					socket.broadcast.to(room).emit('create_entity', entity, slide, socket.request.session.passport.user.id);
				}
			}
		});
		
		socket.on('drag', function(room, uid, slide, x, y, scale, rotation) {
			if (room_data[room] && room_data[room].slides[slide] && room_data[room].slides[slide].entities[uid]) {
				room_data[room].slides[slide].entities[uid].x = x;
				room_data[room].slides[slide].entities[uid].y = y;
				if (scale) {
					room_data[room].slides[slide].entities[uid].scale = scale;
				}
				if (typeof rotation !== 'undefined' && rotation != null) {
					room_data[room].slides[slide].entities[uid].rotation = rotation;
				}
				if (room_data[room].slides[slide].z_top !== 'undefined') {
					room_data[room].slides[slide].z_top++;
					room_data[room].slides[slide].entities[uid].z_index = room_data[room].slides[slide].z_top;
				}
				io.to(room).emit('drag', uid, slide, x, y, scale, rotation, socket.request.session.passport.user.id);
			}
		});

		socket.on('ping_marker', function(room, x, y, color, size) {
			socket.broadcast.to(room).emit('ping_marker', x, y, color, size, socket.request.session.passport.user.id);
		});

		socket.on('show_grid', function(room, slide, show_gid) {
			if (room_data[room] && room_data[room].slides[slide]) {
				room_data[room].slides[slide].show_grid = show_gid;
				socket.broadcast.to(room).emit('show_grid', slide, show_gid, socket.request.session.passport.user.id);
			}
		});
		
		socket.on('track', function(room, tracker) {
			if (room_data[room]) {
				room_data[room].trackers[tracker.uid] = tracker;
				socket.broadcast.to(room).emit('track', tracker, socket.request.session.passport.user.id);
			}
		});
		
		socket.on('track_move', function(room, uid, delta_x, delta_y) {
			if (room_data[room] && room_data[room].trackers[uid]) {
				room_data[room].trackers[uid].x += delta_x;
				room_data[room].trackers[uid].x += delta_y;
				socket.broadcast.to(room).emit('track_move', uid, delta_x, delta_y);
			}
		});
		
		socket.on('stop_track', function(room, uid) {
			if (room_data[room]) {
				delete room_data[room].trackers[uid];
				socket.broadcast.to(room).emit('stop_track', uid);
			}
		});
		
		socket.on('remove', function(room, uid, slide) {
			if (room_data[room] && room_data[room].slides[slide] && room_data[room].slides[slide].entities[uid]) {
				delete room_data[room].slides[slide].entities[uid];
				socket.broadcast.to(room).emit('remove', uid, slide, socket.request.session.passport.user.id);
			}
		});

		socket.on('chat', function(room, message, color) {
			socket.broadcast.to(room).emit('chat', message, color);
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
							room_data[room].lost_identities[user.identity].role = user.role;
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
				socket.broadcast.to(room).emit('add_user', user, socket.request.session.passport.user.id);
			}
		});


		//slide stuff, and why I don't store them in an array
		socket.on('change_slide', function(room, uid) {
			if (room_data[room]) {
				if (room_data[room].slides[uid]) {
					if (room_data[room].pan_zoom) {
						room_data[room].pan_zoom = [1, 0, 0];
					}
					room_data[room].active_slide = uid;
					io.to(room).emit('change_slide', uid); 
				} else {
					io.to(room).emit('change_slide', room_data[room].active_slide, socket.request.session.passport.user.id); 
				}
			}
		});
		
		function find_previous_slide(room, upper_bound) {
			var largest = -9007199254740990;
			var uid = 0;
			for (var key in room_data[room].slides) {
				var order = room_data[room].slides[key].order
				if ( order < upper_bound && order > largest) {
					largest = order;
					uid = key;
				}
			}
			return uid;
		}

		function find_next_slide(room, lower_bound) {
			var smallest = 9007199254740991;
			var uid = 0;
			for (var key in room_data[room].slides) {
				var order = room_data[room].slides[key].order
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
		
		//if 2 players add a slide at the same position (same .order) concurrently 
		//then we look at a hash of their uid, if the hash of the new slide is lower
		//we assign it a lower order (put if before the slide we know about). If it is 
		//higher we assign it a higher order. 
		//Clients basically resolve this the same way. The result will be that the revised
		//order numbers will be the same regardless of the order in which slide data arrived
		function resolve_order_conflicts(room, slide, max_recursions) {
			if (max_recursions == 0) return; //we give up, let this tactic burn, save the server
			for (var key in room_data[room].slides) {
				if (room_data[room].slides[key].order == slide.order) {
					var new_order;
					if (hash(slide.uid) < hash(key)) {
						var prev_slide = find_previous_slide(room, slide.order);
						var last_order = 0;
						if (prev_slide != 0) {
							last_order = room_data[room].slides[prev_slide].order;
						}
						slide.order = Math.floor((slide.order - last_order) / 2);
					} else {
						var next_slide = find_next_slide(room, slide.order);
						var next_order = slide.order + 4294967296;
						if (next_slide != 0) {
							next_order = room_data[room].slides[next_slide].order;
						}					
						slide.order = Math.floor((next_order - slide.order) / 2);						
					}
					
					resolve_order_conflicts(room, slide, max_recursions-1); //we do this again because it might still not be unique
					return;
				}
			}
		}
		
		socket.on('new_slide', function(room, slide) {
			if (room_data[room]) {
				resolve_order_conflicts(room, slide, 5);
				room_data[room].slides[slide.uid] = slide;
				room_data[room].active_slide = slide.uid;
				socket.broadcast.to(room).emit('new_slide', slide);
				io.to(room).emit('change_slide', slide.uid, socket.request.session.passport.user.id);
			}
		});

		socket.on('remove_slide', function(room, uid) {			
			if (room_data[room]) {
				if (Object.keys(room_data[room].slides).length > 1) {
					if (uid == room_data[room].active_slide) {
						var order = room_data[room].slides[uid].order;
						var new_slide = find_previous_slide(room, order);
						if (new_slide == 0) {
							new_slide = find_next_slide(room, order);
						}
						room_data[room].active_slide = new_slide;
					}
					delete room_data[room].slides[uid];
					socket.broadcast.to(room).emit('remove_slide', uid, socket.request.session.passport.user.id);
					
					io.to(room).emit('change_slide', room_data[room].active_slide);
				}
			}
		});
		
		socket.on('rename_slide', function(room, uid, name) {
			if (room_data[room] && room_data[room].slides[uid]) {
				room_data[room].slides[uid].name = name;
				socket.broadcast.to(room).emit('rename_slide', uid, name, socket.request.session.passport.user.id);
			}
		});	
		
		socket.on('change_slide_order', function(room, uid, order) {
			if (room_data[room] && room_data[room].slides[uid]) {
				room_data[room].slides[uid].order = order;
				socket.broadcast.to(room).emit('change_slide_order', uid, order, socket.request.session.passport.user.id);
			}
		});

		socket.on('lock_room', function(room, is_locked) {
			if (room_data[room]) {
				room_data[room].locked = is_locked;
				socket.broadcast.to(room).emit('lock_room', is_locked, socket.request.session.passport.user.id);
			}
		});
		
		socket.on('presentation_mode', function(room, presentation_mode, active_slide) {
			if (room_data[room]) {
				room_data[room].presentation_mode = presentation_mode;
				room_data[room].active_slide = active_slide;
				socket.broadcast.to(room).emit('presentation_mode', presentation_mode, room_data[room].active_slide, socket.request.session.passport.user.id);
			}
		});

		socket.on('store', function(room, name) {
			var user = socket.request.session.passport.user;
			if (!room_data[room].locked || room_data[room].userlist[user.id].role == "owner") {
				store_tactic(user, room, name);
			}
		});

		socket.on('save_room', function(room, name) {
			save_room(room, function(){});
		});		
		
		socket.on('nuke_room', function(room, name) {
			var user = socket.request.session.passport.user;
			if (room_data[room].userlist[user.id] && room_data[room].userlist[user.id].role == 'owner') {
				var tactic_name = "";
				if (room_data[room].name) {
					room_data[room].name;
				}
				room_data[room] = create_empty_room(user, room_data[room].game);
				io.to(room).emit('room_data', room_data[room], user.id, tactic_name, socket.request.session.locale);
			}
		});
		
		socket.on('play_video', function(room, frame, rate) {
			if (room_data[room]) {
				room_data[room].playing = true;
				io.to(room).emit('play_video', frame, Date.now()+500, rate, socket.request.session.passport.user.id);
			}
		});
		
		socket.on('pause_video', function(room, frame) {
			if (room_data[room]) {
				room_data[room].last_sync = [frame, Date.now()];
				room_data[room].playing = false;
				socket.broadcast.to(room).emit('pause_video', frame, socket.request.session.passport.user.id);
			}
		});

		socket.on('sync_video', function(room, frame, timestamp) {
			if (room_data[room]) {
				room_data[room].last_sync = [frame, timestamp];
				io.to(room).emit('sync_video', frame, timestamp, socket.request.session.passport.user.id);
			}
		});

		socket.on('seek_video', function(room, frame, timestamp) {
			if (room_data[room]) {
				room_data[room].last_sync = [frame, timestamp];
				socket.broadcast.to(room).emit('seek_video', frame, timestamp, socket.request.session.passport.user.id);
			}
		});
		
		socket.on('request_sync', function(room) {
			socket.broadcast.to(room).emit('request_sync');
		});

		socket.on('change_rate', function(room, rate) {
			if (room_data[room]) {
				room_data[room].playback_rate = rate;
				socket.broadcast.to(room).emit('change_rate', rate);
			}
		});
		
		socket.on('pan_zoom', function(room, slide, zoom_level, x, y) {
			if (room_data[room] && room_data[room].slides[slide]) {
				room_data[room].slides[slide].pan_zoom = [zoom_level, x, y];
				socket.broadcast.to(room).emit('pan_zoom', slide, zoom_level, x, y, socket.request.session.passport.user.id);
			}
		});
		
	});
	
	//create server
	var server = http.createServer(app);	
	io.attach(server)
  
  var port = secrets.port;
  if (process.env.PORT) {
    port = process.env.PORT
  }
  
  console.log("starting server on port:", port);
	server.listen(port);	
	
});

}); //end redis AUTH
