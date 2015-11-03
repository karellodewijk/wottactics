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
	locales: ['en', 'rs', 'de', 'es'],
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

//load mongo
connection_string = '127.0.0.1:27017/wottactics';
MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://'+connection_string, function(err, db) {
	if(err) throw err;	
	
	db.createCollection('tactics');
	db.createCollection('clans');
	db.collection('tactics').createIndex( { "createdAt": 1 }, { expireAfterSeconds: 2592000 } );

	function clean_up_room(room) {
		setTimeout( function() {
			if (room_data[room]) {
				if (!io.sockets.adapter.rooms[room]) {
					if (Date.now() - room_data[room].last_join > 50000) {
						if (!isEmpty(room_data[room].history)) {
							db.collection('tactics').update({_id:room}, {name:room_data[room].name, history:room_data[room].history, createdAt:new Date(), game:room_data[room].game, locked:room_data[room].locked, lost_identities:room_data[room].lost_identities, lost_users:room_data[room].lost_users}, {upsert: true});
						}
						delete room_data[room];
					} else {
						clean_up_room(room); //try again
					}
				}
			}
		}, 60000);
	}
	
	function get_tactics(identity, game, cb) {
		if (identity) {
			var collection = db.collection(identity);
			var name_list = [];
			var tactics = collection.find({game:game}, {"sort" : [['date', 'desc']], name:1, date:1});
			tactics.each(function (err, tactic) {			
				if (tactic) {
					var game = 'wot';
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
			var collection = db.collection(identity);
			var tactics = collection.findOne({game:game, name:name}, function(err, result) {
				if (!err && result) { 
					var uid = newUid();
					room_data[uid] = {};
					room_data[uid].history = result.history;
					room_data[uid].userlist = {};
					room_data[uid].lost_users = {};
					room_data[uid].lost_identities = {};
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
		var collection = db.collection(identity);
		var tactics = collection.remove({name:name, game:game});		
	}
	
	function create_anonymous_user(req) {
		req.session.passport.user = {};
		req.session.passport.user.id = newUid();
		req.session.passport.user.name = "Anonymous";		
	}
	
	// initializing session middleware
	var Session = require('express-session');
	var RedisStore = require('connect-redis')(Session);
	var session = Session({ secret: 'mumnbojudqs', resave:true, saveUninitialized:false, cookie: { expires: new Date(Date.now() + 14 * 86400 * 1000) }, store: new RedisStore()});
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
			user.identity = identifier.split('/id/')[1].split("/")[0];
			user.wg_account_id = user.identity.split('-')[0];
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
		clientID: '580177672120479',
		clientSecret: 'eba898e021a070a00f60e0343450695e',
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
		consumerKey: 'kyuE5HUWJipJpz1JraWrGKu0Z',
		consumerSecret: 'qruzs2fwJG8nVMzPeFSvxWZ2ua6WzkJNpBhI5yPCSS525ivTSI',
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
		var uid = newUid();
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

	//clanportal
	function refresh_clan(req, clan_id, cb) {
	  http.get("http://api.worldoftanks.eu/wgn/clans/info/?application_id=13913bc2f96c6d6f52e5c20ddb6ba623&fields=clan_id,tag,name,members&clan_id="+clan_id, function(res) {
		var buffer = '';
		res.on('data', function (data) {
		  buffer += data;
		}).on('end', function (data) {
		  var result = JSON.parse(buffer).data[clan_id];
		  result.members.sort(function(a, b) {
		    return a.account_id > b.account_id ? 1 : -1;
		  });
		  db.collection('clans').findOne({_id:clan_id}, function(err, clan) {
		    if (!clan) {
			  clan = {members:{}};
		    }
		    for (var i in result.members) {
			  var account_id = result.members[i].account_id;
			  if (!clan.members[account_id]) {
			    clan.members[account_id] = {CW:[0, 0], CWR:[0, 0], SH:[0, 0], SHR:[0, 0], SK:[0, 0], SKR:[0, 0], A:[0, 0], TCW:[0, 0], TCWR:[0, 0], TSH:[0, 0], TSHR:[0, 0], TSK:[0, 0], TSKR:[0, 0], TA:[0, 0], FCCW: [0, 0], FCSH: [0, 0], FCSK: [0, 0], TFCCW: [0, 0], TFCSH: [0, 0], TFCSK: [0, 0]};
			  }
			  clan.members[account_id].role = result.members[i].role;
			  clan.members[account_id].role_i18n = result.members[i].role;
			  clan.members[account_id].joined_at = result.members[i].joined_at;
			  clan.members[account_id].account_id = result.members[i].account_id;
			  clan.members[account_id].account_name = result.members[i].account_name;			  
		    }	
			for (var i in clan.members) { //remove players who left
			  var index = bs(result.members, clan.members[i].account_id, function(find, value) {
				if(value < find.account_id) return 1;
				else if(value > find.account_id) return -1;
				return 0;
			  });
			  if (index == -1) {
				delete clan.members[i];
			  }
			}
			clan.name = result.name;
			clan.tag = result.tag;
			clan._id = clan_id;
			if (!clan.multipliers) {
				clan.multipliers = {CW:1, CWW:1, CWL:0.5, CWR:0.5, CWFC:1.1,
								    SH:0.5, SHW:1, SHL:0.5, SHR:0.5, SHFC:1.1,
								    SK:0.1, SKW:1, SKL:0.5, SKR:0.5, SKFC:1.1};
			}
			if (!clan.treasury) {
				clan.treasury = 0;
			}
		    db.collection('clans').update({_id:clan_id}, clan, {upsert:true}, function() {
			  cb(clan);	 			
	        });
		  });
		}).on('error', function(e) {
		  cb();
		});
	  });		
	}
	
	function set_clan_role(req, members) {
	  if (members[req.session.passport.user.wg_account_id]) {
	    req.session.passport.user.clan_role = members[req.session.passport.user.wg_account_id].role;
	  }
	}
	
	function load_clan(req, clan_id, cb) {
	  db.collection('clans').findOne({_id:clan_id}, function(err, result) {
		if (!err && result) { 
		  set_clan_role(req, result.members);
		  cb(result);
		} else {
		  refresh_clan(req, clan_id, cb);
		}
	  });
	}
	
	function verify_clan(req, cb) {
	  if (!req.session.passport.user.clan_id) {
		if (req.session.passport.user.wg_account_id) {
		  http.get("http://api.worldoftanks.eu/wot/account/info/?application_id=13913bc2f96c6d6f52e5c20ddb6ba623&fields=clan_id&account_id="+req.session.passport.user.wg_account_id, function(res) {
			var buffer = '';
			res.on('data', function (data) {
			  buffer += data;
			}).on('end', function (data) {
			  var result = JSON.parse(buffer);
			  req.session.passport.user.clan_id = result.data[req.session.passport.user.wg_account_id].clan_id;
			  load_clan(req, req.session.passport.user.clan_id, cb);
		    }).on('error', function(e) {
			  cb(); //we won't be loading clan data
		    });
		  });
		} else {
		  cb(); //we won't be loading clan data
		}
	  } else {
		load_clan(req, req.session.passport.user.clan_id, cb);
	  }
	}
	
	router.get('/clanportal.html', function(req, res, next) {
	  verify_clan(req, function(clan) {
		res.render('clanportal', { game: req.session.game, 
								   user: req.session.passport.user,
								   locale: req.session.locale,
								   clan: clan});
	  });
	});

	router.get('/members.html', function(req, res, next) {
	  verify_clan(req, function(clan) {
		res.render('clanportal_members', { game: req.session.game, 
								           user: req.session.passport.user,
								           locale: req.session.locale,
								           clan: clan});
	  });
	});

	router.get('/battles.html', function(req, res, next) {
	  verify_clan(req, function(clan) {
		get_battles(clan._id, function(battles) {
		  clan.battles = battles;
		  res.render('clanportal_battles', { game: req.session.game, 
								             user: req.session.passport.user,
								             locale: req.session.locale,
								             clan: clan});
		});
	  });
	});

	router.get('/payout.html', function(req, res, next) {
	  verify_clan(req, function(clan) {
		get_battles(clan._id, function(battles) {
		  clan.battles = battles;
		  res.render('clanportal_payout',  { game: req.session.game, 
								           user: req.session.passport.user,
								           locale: req.session.locale,
								           clan: clan});
		});
	  });
	});

	router.post('/add_battles.html', function(req, res, next) {
      refresh_clan(req, req.session.passport.user.clan_id, function(clan) {
		get_battles(clan._id, function(old_battles) {
		  if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {
			return;
		  }  
		  var battles = req.body.battles;
		  for (var i in battles) {
		    if (!old_battles[i]) {
			  var w = battles[i].win; 
		      for (var j in battles[i].players) {
		        if (clan.members[battles[i].players[j][0]]) {
			      if (battles[i].battle_type == "Clanwar") {
			        clan.members[battles[i].players[j][0]].CW[w] += 1;
				    clan.members[battles[i].players[j][0]].TCW[w] += 1;
				    if (battles[i].players[j][0] == battles[i].commander[0]) {
					    clan.members[battles[i].players[j][0]].FCCW[w] += 1;
					    clan.members[battles[i].players[j][0]].TFCCW[w] += 1;
				    }
			      }
			      if (battles[i].battle_type == "Skirmish") {
			        clan.members[battles[i].players[j][0]].SK[w] += 1;
				    clan.members[battles[i].players[j][0]].TSK[w] += 1;
				    if (battles[i].players[j][0] == battles[i].commander[0]) {
					    clan.members[battles[i].players[j][0]].FCSK[w] += 1;
					    clan.members[battles[i].players[j][0]].TFCSK[w] += 1;
				    }
			      }
			      if (battles[i].battle_type == "Stronghold") {
			        clan.members[battles[i].players[j][0]].SH[w] += 1;
				    clan.members[battles[i].players[j][0]].TSH[w] += 1;
				    if (battles[i].players[j][0] == battles[i].commander[0]) {
					    clan.members[battles[i].players[j][0]].FCSH[w] += 1;
					    clan.members[battles[i].players[j][0]].TFCSH[w] += 1;
				    }
			      }
		        } 
		      }
		      for (var j in battles[i].reserves) {
		        if (clan.members[battles[i].reserves[j][0]]) {
			      if (battles[i].battle_type == "Clanwar") {
			        clan.members[battles[i].reserves[j][0]].CWR[w] += 1;
				    clan.members[battles[i].reserves[j][0]].TCWR[w] += 1;
			      }
			      if (battles[i].battle_type == "Skirmish") {
			        clan.members[battles[i].reserves[j][0]].SKR[w] += 1;
				    clan.members[battles[i].reserves[j][0]].TSKR[w] += 1;
			      }
			      if (battles[i].battle_type == "Stronghold") {
			        clan.members[battles[i].reserves[j][0]].SHR[w] += 1;
				    clan.members[battles[i].reserves[j][0]].TSHR[w] += 1;
			      }
		        } 
		      }
           }	
		    old_battles[i] = req.body.battles[i];
		  }
		  db.collection('battles').update({_id:clan._id}, {_id: clan._id, battles:old_battles}, {upsert: true}, function() {
		    db.collection('clans').update({_id:clan._id}, clan, {upsert: true}, function() {
			  res.send('Success');			
		    });			
		  });
	    });
	  });
	});	

	router.post('/recalculate.html', function(req, res, next) {
		verify_clan(req, function(clan) {
			if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {
				return;
			}  
			clan.treasury = req.body.treasury;
			clan.multipliers = req.body.multipliers;
			db.collection('clans').update({_id:clan._id}, clan, {upsert: true}, function() {
				res.send('Success');			
			});
			return;
		});
	});
	
	router.post('/reset.html', function(req, res, next) {
	  verify_clan(req, function(clan) {
		get_battles(clan._id, function(battles) {
		  if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {			
			return;
		  } 
		  db.collection('old_battles').update({_id:clan._id}, {_id:clan._id, battles:battles}, {upsert: true}, function() {
			for (var i in clan.members) {
			  clan.members[i].CW = [0, 0];
			  clan.members[i].CWR = [0, 0];
		      clan.members[i].SH = [0, 0];
			  clan.members[i].SHR = [0, 0];
			  clan.members[i].SK = [0, 0];
			  clan.members[i].SKR = [0, 0];
			  clan.members[i].FCCW = [0, 0];
			  clan.members[i].FCSH = [0, 0];
			  clan.members[i].FCSK = [0, 0];
			}
			clan.treasury = 0;
			db.collection('clans').update({_id:clan._id}, clan, {upsert: true}, function() {
			  db.collection('battles').update({_id:clan._id}, {}, {upsert: true}, function() {
			    res.send('Success');			
			  });	
			});
		  });
		});
	  });
	});
	
	function get_battles(clan_id, cb) {
	  db.collection('battles').findOne({_id:clan_id}, function(err, result) {
		if (result && result.battles) {
		  cb(result.battles);
		} else {
		  cb({});
		}
	  });		
	}
	
	router.post('/remove_battle.html', function(req, res, next) {
	  verify_clan(req, function(clan) {
		get_battles(clan._id, function(battles) {
		  if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {
			return;
		  }
		  if (battles[req.body.uid]) {
			var battle = battles[req.body.uid];
			var w = battle.win; 
			for (var j in battle.players) {
			  if (clan.members[battle.players[j][0]]) {
				if (battle.battle_type == "Clanwar") {
				  clan.members[battle.players[j][0]].CW[w] -= 1;
				  clan.members[battle.players[j][0]].TCW[w] -= 1;
				  if (battle.players[j][0] == battle.commander[0]) {
					clan.members[battle.players[j][0]].FCCW[w] -= 1;
					clan.members[battle.players[j][0]].TFCCW[w] -= 1;
				  }
				}
				if (battle.battle_type == "Skirmish") {
				  clan.members[battle.players[j][0]].SK[w] -= 1;
				  clan.members[battle.players[j][0]].TSK[w] -= 1;
				  if (battle.players[j][0] == battle.commander[0]) {
				    clan.members[battle.players[j][0]].FCSK[w] -= 1;
					clan.members[battle.players[j][0]].TFCSK[w] -= 1;
				  }
				}
				if (battle.battle_type == "Stronghold") {
				  clan.members[battle.players[j][0]].SH[w] -= 1;
				  clan.members[battle.players[j][0]].TSH[w] -= 1;
				  if (battle.players[j][0] == battle.commander[0]) {
				    clan.members[battle.players[j][0]].FCSH[w] -= 1;
				    clan.members[battle.players[j][0]].TFCSH[w] -= 1;
				  }
				}
			  } 
			}
			for (var j in battle.reserves) {
			  if (clan.members[battle.reserves[j][0]]) {
			    if (battle.battle_type == "Clanwar") {
				  clan.members[battle.reserves[j][0]].CWR[w] -= 1;
				  clan.members[battle.reserves[j][0]].TCWR[w] -= 1;
				}
				if (battle.battle_type == "Skirmish") {
				  clan.members[battle.reserves[j][0]].SKR[w] -= 1;
				  clan.members[battle.reserves[j][0]].TSKR[w] -= 1;
				}
				if (battle.battle_type == "Stronghold") {
				  clan.members[battle.reserves[j][0]].SHR[w] -= 1;
				  clan.members[battle.reserves[j][0]].TSHR[w] -= 1;
				}
			  } 
			}
			delete battles[req.body.uid];
			db.collection('clans').update({_id:clan._id}, clan, {upsert: true}, function() {
			  db.collection('battles').update({_id:clan._id}, {_id:clan._id, battles:battles}, {upsert: true}, function() {
			    res.send('Success');			
			  });		
			});
		  }
		});
	  });
	});
	
	//add router to app
	app.use('/', router); 
	
	// catch 404 and forward to error handler
	app.use(function(req, res, next) {
		var err = new Error('Not Found: "' + req.path + '"');
		err.status = 404;
		return;
	});

	function join_room(socket, room, new_room) {
		room_data[room].last_join = Date.now();
		if (!socket.handshake.session.passport.user) {
			create_anonymous_user(socket.handshake);
		}
		var user = JSON.parse(JSON.stringify(socket.handshake.session.passport.user));

		if (user) {
			if (room_data[room].userlist[user.id]) {
				//a user is already connected to this room in probably another tab, just increase a counter
				room_data[room].userlist[user.id].count++;
			} else {
				room_data[room].userlist[user.id] = user;
				room_data[room].userlist[user.id].count = 1;
				if (new_room && (!io.sockets.adapter.rooms[room] || Object.keys(io.sockets.adapter.rooms[room]).length == 0)) { //no users
					//we should make the first client the owner
					room_data[room].userlist[user.id].role = "owner";
					room_data[room].lost_users[user.id] = "owner";
					if (user.identity) {
						room_data[room].lost_identities[user.identity] = "owner";
					}
				} else if (room_data[room].lost_users[user.id]) {
					//if a user was previously connected to this room and had a role, restore that role
					room_data[room].userlist[user.id].role = room_data[room].lost_users[user.id];
				} else if (user.identity && room_data[room].lost_identities[user.identity]) {
					//if a user with given identity had a role, restore that role
					room_data[room].userlist[user.id].role = room_data[room].lost_identities[user.identity];
				}
				socket.broadcast.to(room).emit('add_user', room_data[room].userlist[user.id]);			
			}			
			socket.join(room);
			socket.emit('room_data', room_data[room], user.id);
		}
	}
	
	//socket.io callbacks
	io.sockets.on('connection', function(socket) { 
		if (!socket.handshake.session.passport) {
			socket.handshake.session.passport = {};
		}
			
		socket.on('join_room', function(room, game) {
			var new_room = true;
			
			if (!(room in room_data)) {
				db.collection('tactics').findOne({_id:room}, function(err, result) {
					if (!err && result) { 
						room_data[room] = {};
						room_data[room].history = result.history;
						room_data[room].userlist = {};
						room_data[room].lost_users = result.lost_users;
						room_data[room].lost_identities = result.lost_identities;
						room_data[room].locked = result.locked;
						room_data[room].name = result.name;
						room_data[room].game = result.game;
						room_data[room].last_join = Date.now();	
						new_room = false;
					} else {
						room_data[room] = {};
						room_data[room].history = {};
						room_data[room].userlist = {};
						room_data[room].lost_users = {};
						room_data[room].lost_identities = {};
						room_data[room].game = game;
						room_data[room].locked = true;						
					}
					join_room(socket, room, new_room);
					return;
				});
			} else {
				join_room(socket, room, new_room);
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
				if (room_data[room].lost_users) {
					if (user.role) {
						room_data[room].lost_users[user.id] = user.role;
						if (user.identity) {
							room_data[room].lost_identities[user.id] = user.role;
						}
					} else {
						if (room_data[room].lost_users[user.id]) {
							delete room_data[room].lost_users[user.id];
						}
						if (room_data[room].lost_identities[user.identity]) {
							delete room_data[room].lost_identities[user.identity];
						}
					}
				}		
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
			var user = socket.handshake.session.passport.user;
			if (room_data[room] && user.identity) { //room exists, user is logged in
				var collection = db.collection(user.identity);
				room_data[room].name = name;
				collection.update({name:name}, {name:name, history:room_data[room].history, date:Date.now(), game:room_data[room].game}, {upsert: true});
			}
		});
	});
	
	//create server
	var http = require('http');
	var server = http.createServer(app);
	io.attach(server);
	server.listen(80);	
});

