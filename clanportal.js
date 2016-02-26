//this code is run within the wottactic app
//it's pretty much for an entirely different app

function refresh_clan(req, clan_id, cb) {
  http.get("http://api.worldoftanks."+ req.session.passport.user.server +"/wgn/clans/info/?application_id=" + secrets.wargaming[req.session.passport.user.server] + "&fields=clan_id,tag,name,members&clan_id="+clan_id, function(res) {
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
								SK:0.1, SKW:1, SKL:0.5, SKR:0.5, SKFC:1.1,
								A:0.5};
		}
		if (!clan.treasury) {
			clan.treasury = 0;
		}
		set_clan_role(req, clan);
		db.collection('clans').update({_id:clan_id}, clan, {upsert:true}, function() {
		  cb(clan);	 			
		});
	  });
	}).on('error', function(e) {
	  cb();
	});
  });		
}

function set_clan_role(req, clan) {
  if (clan.members[req.session.passport.user.wg_account_id]) {
	req.session.passport.user.clan_role = clan.members[req.session.passport.user.wg_account_id].role;
  }
}

function load_clan(req, clan_id, cb) {
  if (req.load_members || !req.session.passport.user.clan_role) {
	db.collection('clans').findOne({_id:clan_id}, function(err, result) {
	  if (!err && result) {
		if (!result.members[req.session.passport.user.wg_account_id]) {
		  refresh_clan(req, clan_id, cb);
		} else {
		  set_clan_role(req, result);
		  cb(result);
		}
	  } else {
		refresh_clan(req, clan_id, cb);
	  }	
	});
  } else {
	db.collection('clans').findOne({_id:clan_id}, {members:0}, function(err, result) {
	  if (!err && result) { 
		cb(result);
	  } else {
		refresh_clan(req, clan_id, cb);
	  }	
	});
  }
}

function verify_clan(req, cb) {
  if (!req.session.passport.user.clan_id) {
	if (req.session.passport.user.wg_account_id) {
	  http.get("http://api.worldoftanks."+ req.session.passport.user.server +"/wot/account/info/?application_id=" + secrets.wargaming[req.session.passport.user.server] + "&fields=clan_id&account_id=" + req.session.passport.user.wg_account_id, function(res) {
		var buffer = '';
		res.on('data', function (data) {
		  buffer += data;
		}).on('end', function (data) {
		  var result = JSON.parse(buffer);
		  if (result.data[req.session.passport.user.wg_account_id]) {
			req.session.passport.user.clan_id = result.data[req.session.passport.user.wg_account_id].clan_id;
			load_clan(req, req.session.passport.user.clan_id, cb);
		  } else {
			cb();
		  }
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
  req.load_members = false;
  verify_clan(req, function(clan) {
	res.render('clanportal', { game: req.session.game, 
							   user: req.session.passport.user,
							   locale: req.session.locale,
							   clan: clan,
							   url: req.fullUrl});
  });
});

router.get('/members.html', function(req, res, next) {
  req.load_members = true;
  verify_clan(req, function(clan) {
	res.render('clanportal_members', { game: req.session.game, 
									   user: req.session.passport.user,
									   locale: req.session.locale,
									   clan: clan,
									   url: req.fullUrl});
  });
});

router.get('/battles.html', function(req, res, next) {
  req.load_members = true;
  verify_clan(req, function(clan) {
	if (clan) {
	  get_battles(clan._id, function(battles) {
		clan.battles = battles;
		res.render('clanportal_battles', { game: req.session.game, 
										 user: req.session.passport.user,
										 locale: req.session.locale,
										 clan: clan,
										 url: req.fullUrl});
	  });
	} else {
	  res.render('clanportal_battles', { game: req.session.game, 
										 user: req.session.passport.user,
										 locale: req.session.locale,
										 clan: clan,
										 url: req.fullUrl});			
	}
  });
});

router.get('/payout.html', function(req, res, next) {
  req.load_members = true;
  verify_clan(req, function(clan) {
	if (clan) {
	  get_battles(clan._id, function(battles) {
		clan.battles = battles;
		res.render('clanportal_payout',  { game: req.session.game, 
										   user: req.session.passport.user,
										   locale: req.session.locale,
										   clan: clan,
										   url: req.fullUrl});
	  });
	} else {
	  res.render('clanportal_battles', { game: req.session.game, 
										 user: req.session.passport.user,
										 locale: req.session.locale,
										 clan: clan,
										 url: req.fullUrl});			
	}
  });
});

router.post('/add_battles.html', function(req, res, next) {
  req.load_members = true;
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
	  if (req.body.extra_data) {
		var col = db.collection('clan-' + clan._id + '-battles');
		for (var i in req.body.extra_data) {
		  col.update({_id:i}, {_id:i, battle:req.body.extra_data[i]}, {upsert: true});
		}
	  }
	});
  });
});	

router.post('/recalculate.html', function(req, res, next) {
	req.load_members = false;
	verify_clan(req, function(clan) {
		if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {
			return;
		}  
		clan.treasury = req.body.treasury;
		clan.multipliers = req.body.multipliers;
		db.collection('clans').update({_id:clan._id}, {$set: {multipliers:clan.multipliers, treasury:clan.treasury}}, {upsert: true}, function() {
			res.send('Success');			
		});
		return;
	});
});

router.post('/reset.html', function(req, res, next) {
  req.load_members = true;
  verify_clan(req, function(clan) {
	get_battles(clan._id, function(battles) {
	  if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {			
		return;
	  } 
	  for (var i in clan.members) {
		clan.members[i].A[0] = 0;
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
  req.load_members = true;
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

router.post('/create_attendance_link.html', function(req, res, next) {
  req.load_members = false;
  verify_clan(req, function(clan) {
	if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {
	  return;
	}
	var valid_until = new Date();
	valid_until.setHours(valid_until.getHours() + 12);
	clan.attendance_link = {id:newUid(), valid_until:valid_until, players:{}};
	db.collection('clans').update({_id:clan._id}, {$set:{attendance_link:clan.attendance_link}}, {upsert: true}, function() {
	  res.send("http://" + req.hostname + "/attend?id=" + clan.attendance_link.id);
	});
  });
});

router.get('/attend', function(req, res, next) {
  req.load_members = false;
  verify_clan(req, function(clan) {
	var reason = "";
	if (!req.query.id) { 
	  reason = "No id in link";
	} else if (!clan) {
	  reason = "Not logged in";
	} else if (req.query.id != clan.attendance_link.id) {
	  reason = "This link is no longer valid";
	} else if (clan.attendance_link.valid_until - (new Date()) < 0) {
	  reason = "This link has expired";
	} else if (clan.attendance_link.players[req.session.passport.user.wg_account_id]) {
	} else {
	  clan.attendance_link.players[req.session.passport.user.wg_account_id] = req.session.passport.user.name;
	  var members = {}; 
	  members['members.' + req.session.passport.user.wg_account_id + '.A.0'] = 1;
	  members['members.' + req.session.passport.user.wg_account_id + '.TA.0'] = 1;
	  db.collection('clans').update({_id:clan._id}, {$set:{attendance_link:clan.attendance_link}, $inc:members}, {upsert: true}, function() {
		res.render('clanportal_attend', { game: req.session.game, 
										  user: req.session.passport.user,
										  locale: req.session.locale,
										  clan: clan,
										  reason: reason,
										  url: req.fullUrl});
	  });
	  return;
	}
	res.render('clanportal_attend', { game: req.session.game, 
									  user: req.session.passport.user,
									  locale: req.session.locale,
									  clan: clan,
									  reason: reason,
									  url: req.fullUrl});
  });
});

router.post('/remove_attend', function(req, res, next) {
  req.load_members = false;
  verify_clan(req, function(clan) {
	if (!req.session.passport.user.clan_role || req.session.passport.user.clan_role == 'recruit' || req.session.passport.user.clan_role == 'private') {
	  return;
	}
	delete clan.attendance_link.players[req.body.player];
	var members = {}; 
	members['members.' + req.body.player + '.A.0'] = -1;
	members['members.' + req.body.player + '.TA.0'] = -1;
	db.collection('clans').update({_id:clan._id}, {$set:{attendance_link:clan.attendance_link}, $inc:members}, {upsert: true}, function() {
	   res.send("success");
	});
  });
});