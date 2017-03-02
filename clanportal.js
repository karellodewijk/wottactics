// this is the stat/clanportal part of wottactic. I put it in a seperate file so you can easily cut it from the app as it's pretty much something else entirely only applicable to WOT.

var bs = require('binarysearch');

module.exports.load = function(router, secrets, db, request, escaper) {
	//function copy pasted from main app, should probably export them
	function get_server(id) {
        if(id > 3000000000){return "kr";}
        if(id > 2000000000){return "asia";}
        if(id > 1000000000){return "com";}
        if(id > 500000000){return "eu";}
        return "ru";
    }
	function set_game(req, res, game) {
		req.session.game = game;
		res.cookie('game', game, {maxAge: 30 * 3600 * 1000, domain: get_host(req)}); 	
	}
	function get_host(req) {
		var host = req.hostname.split('.');
		if (host.length >= 2) {
			host = '.' + host[host.length-2] + '.' + host[host.length-1];
		} else {
			host = '.' + host[0];
		}
		return host;		
	}
	//end
	
	router.get('/player/:wid?', function(req, res, next) {
		var wid = req.params.wid;
		if (!wid) {
			var user = req.session.passport.user;
			if (user.wg_account_id) {
				wid = user.wg_account_id;
			}			
		}
		if (!req.session.game) {
			set_game(req, res,'wot');
		}
		res.render('stats', { game: req.session.game, 
							  user: req.session.passport.user,
							  locale: req.session.locale,
							  url: req.fullUrl,
							  static_host: secrets.static_host,
							  secrets:secrets});
	});
	
	router.get('/clan/:cid?', function(req, res, next) {
		var cid = req.params.cid;
		if (!cid) {
			var user = req.session.passport.user;
			if (user.clan_id) {
				cid = user.wg_account_id;
			}			
		}
		if (!req.session.game) {
			set_game(req, res,'wot');
		}
		res.render('clan_stats', { game: req.session.game, 
							  user: req.session.passport.user,
							  locale: req.session.locale,
							  url: req.fullUrl,
							  static_host: secrets.static_host,
							  secrets:secrets});
	});

	function refresh_clan(clan, cb) {
		var server = get_server(clan._id);
		var link = "http://api.worldoftanks."+ server +"/wgn/clans/info/?application_id=" + secrets.wg_api_key + "&fields=clan_id,tag,name,members&clan_id=" + clan._id;
		request(link, function (error, response, result) {
			result = JSON.parse(result).data[clan._id];
			if (!clan.members) clan.members = {};
			for (var i in result.members) {
			  var account_id = result.members[i].account_id;
			  if (!clan.members[account_id]) {
				clan.members[account_id] = {CW:[[0,0], [0,0], [0,0]], SH:[[0,0], [0,0], [0,0]], SK:[[0,0], [0,0], [0,0]], A:0};
			  }
			  clan.members[account_id].role = result.members[i].role;
			  clan.members[account_id].joined_at = result.members[i].joined_at;
			  clan.members[account_id].account_id = result.members[i].account_id;
			  clan.members[account_id].account_name = result.members[i].account_name;			  
			}			
			clan.name = result.name;
			clan.tag = result.tag;
			if (!clan.multipliers) {
				clan.multipliers = {CW:[1,1,1], CWW:1, CWL:0.5,
									SH:[0.5,0.5,0.5], SHW:1, SHL:0.5,
									SK:[0.1,0.1,0.1], SKW:1, SKL:0.5,
									A:0.5};
			}
			if (!clan.treasury) {
				clan.treasury = 0;
			}
			db.collection('clans').update({_id:clan._id}, clan, {upsert:true}, function() {
			  cb(clan);	 			
			});
		});
	}
	
	function load_clan(clan_id, refresh, cb) {
	  db.collection('clans').findOne({_id:clan_id}, function(err, result) {
		if (!err && result) {
		  if (!refresh) {
		    cb(result);
		  } else {
			refresh_clan(result, cb)
		  }
		} else {
		  refresh_clan({_id:clan_id}, cb);
		}	
	  });
	}
	
	router.get('/clan_activity', function(req, res, next) {
		if (!req.session.game) {
			set_game(req, res,'wot');
		}
		var user = req.session.passport.user;
		var refresh = req.query.refresh;		
		function render(clan) {
			res.render('clan_activity', { game: req.session.game, 
								  user: req.session.passport.user,
								  locale: req.session.locale,
								  clan: clan,
								  url: req.fullUrl,
								  static_host: secrets.static_host,
								  secrets:secrets});			
		}		
		if (user.clan_id) {
			load_clan(user.clan_id, refresh, function(clan) {
				render(clan);
			});
		} else {
			render(null)
		}
	});
	
	router.get('/clan_config', function(req, res, next) {
		if (!req.session.game) {
			set_game(req, res,'wot');
		}
		var user = req.session.passport.user;
		var refresh = req.query.refresh;		
		function render(clan) {
			res.render('clan_config', { game: req.session.game, 
								  user: req.session.passport.user,
								  locale: req.session.locale,
								  clan: clan,
								  url: req.fullUrl,
								  static_host: secrets.static_host,
								  secrets:secrets});			
		}		
		if (user.clan_id) {
			load_clan(user.clan_id, refresh, function(clan) {
				render(clan);
			});
		} else {
			render(null)
		}	
	});
	
	router.get('/stats_info', function(req, res, next) {
		if (!req.session.game) {
			set_game(req, res,'wot');
		}
		res.render('stats_info', { game: req.session.game, 
							  user: req.session.passport.user,
							  locale: req.session.locale,
							  url: req.fullUrl,
							  static_host: secrets.static_host,
							  secrets:secrets});
	});
	
	router.get('/stats/player/:wid', function(req, res, next) {
		var wid = req.params.wid;
		var field = req.query.field;
		if (!field) {
			field = "all";
		}
		db.collection('ws_' + field + '_summary').findOne({_id:wid}, function(err, result) {
			if (!err && result) {
				res.status(200).send(JSON.stringify(result));
			} else {
				res.status(404).send("");
			}
			db.collection('tracked_players').replaceOne({_id:wid}, {_id:wid}, {upsert: true});
		});	
	});
	
	router.get('/stats/clan/:wid', function(req, res, next) {
		var wid = req.params.wid;
		var field = req.query.field;
		if (!field) {
			field = "all";
		}
		db.collection('ws_clan_' + field + '_summary').findOne({_id:wid}, function(err, result) {
			if (!err && result) {
				res.status(200).send(JSON.stringify(result));
			} else {
				res.status(404).send("");
			}
			db.collection('tracked_clans').replaceOne({_id:wid}, {_id:wid}, {upsert: true});
		});	
	});
	
	function get_clan_role(clan, wg_id) {
	  if (clan.members[req.session.passport.user.wg_account_id]) {
		req.session.passport.user.clan_role = clan.members[wg_id].role;
	  }
	}
	
	var roles = {"commander":0, "executive_officer":1, "quartermaster":2, "personnel_officer":3, "combat_officer":4, "intelligence_officer":5, "recruitment_officer":6, 'junior_officer':7, "private":8, "recruit":9, "reservist":10};

	function is_member(clan, wg_id) {
		if (!clan.members[wg_id]) return false;
		return true;
	}
	
	function is_admin(clan, wg_id) {
		if (!clan.members[wg_id]) return false;
		var role = clan.members[wg_id].role;
		var role_rank = roles[role];
		return (role_rank < 3 || wg_id == "505943778"); //clan personnel officer or above or me
	}
	
	router.post('/recalculate', function(req, res, next) {
		var user = req.session.passport.user;
		load_clan(user.clan_id, false, function(clan) {
			if (!is_admin(clan, user.wg_account_id)) {
				return;
			}
			
			console.log(req.body.multipliers)
			
			clan.treasury = req.body.treasury;
			clan.multipliers = req.body.multipliers;
			db.collection('clans').update({_id:clan._id}, {$set: {multipliers:clan.multipliers, treasury:clan.treasury}}, {upsert: true}, function() {
				res.send('Success');			
			});
		});
	});
	

	router.post('/reset', function(req, res, next) {
	  var user = req.session.passport.user;
	  load_clan(user.clan_id, false, function(clan) {
		  for (var i in clan.members) {
			clan.members[i] = {CW:[[0,0], [0,0], [0,0]], SH:[[0,0], [0,0], [0,0]], SK:[[0,0], [0,0], [0,0]], A:0};
		  }
		  clan.treasury = 0;
		  db.collection('clans').update({_id:clan._id}, clan, {upsert: true}, function() {
			db.collection('battles').update({_id:clan._id}, {}, {upsert: true}, function() {
			  res.send('Success');			
			});	
		  });
		});
	});
}
	

