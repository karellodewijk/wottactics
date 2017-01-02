var clan = window.location.pathname.split('/');
clan = clan[clan.length - 1]

if (!clan) {
	server = "eu";
	var user = JSON.parse($("meta[name='user']").attr('content'));
	if (user && user.clan) {
		player = user.clan;
		server = user.server;
	}
} else {
	function get_server(id) {
		if(id > 3000000000){return "kr";}
		if(id > 2000000000){return "asia";}
		if(id > 1000000000){return "com";}
		if(id > 500000000){return "eu";}
		return "ru";
	}
	var server = get_server(player);	
}

var getQueryString = function ( field, url ) {
	var href = url ? url : window.location.href;
	var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
	var string = reg.exec(href);
	return string ? string[1] : null;
};

var src = getQueryString("src");
if (!src) {
	src = "all";
}

function get_wg_data(page, fields, cb) {
	var link = "https://api.worldoftanks." + server + "/wot" + page;
	link += "application_id=0dbf88d72730ed7b843ab5934d8b3794";
	link += "&account_id=" + player;
	if (fields && fields.length > 0) {
		link += "&fields=";
		for (var i in fields) {
			var field = fields[i];
			link += field + ",";
		}
		link = link.slice(0,-1);
	}
	$.get(link, {}, function(data) {
		cb(data.data[player]);
	});
}

function reset_ui() {
	$('#tank_list_body').empty();
	$('#total_table_body').children().each(function() {
		$(this).children().slice(1).remove();
	})
}

function populate() {					
	if (src != "all") {
		$("#last_100").text($("#last_100").text().replace("100 ", "10 "));
		$("#last_1000").text($("#last_1000").text().replace("1,000 ", "100 "));
		$("#last_5000").text($("#last_5000").text().replace("5,000 ", "500 "));
	} else {
		$("#last_100").text($("#last_100").text().replace("10 ", "100 "));
		$("#last_1000").text($("#last_1000").text().replace("100 ", "1,000 "));
		$("#last_5000").text($("#last_5000").text().replace("500 ", "5,000 "));			
	}
	
	$.when(
		$.Deferred(function() {
			var self = this;
			var link = "https://api.worldoftanks." + server + "/wot/encyclopedia/tanks/?application_id=0dbf88d72730ed7b843ab5934d8b3794&fields=tank_id,image_small,name_i18n,level,nation,type"
			$.get(link, {}, function(data) {
				tank_data = data.data;
				self.resolve();
			});
		}),
		$.Deferred(function() {
			var self = this;
			var link = "/stats/player/" + player + "?field=" + src;
			$.get(link, {}, function(data) {
				summary = JSON.parse(data);
				self.resolve();
			});
		}),
		$.Deferred(function() {
			var self = this;
			var fields = ["tank_id", src];
			wn9_src = src;
			if (src == "all") {
				fields.push("random");
				wn9_src = "random";
			}
			get_wg_data("/tanks/stats/?extra=random&", fields, function(data) {
				stats_data = data;
				stats_data = stats_data.map(function(x) { x[src].id = x.tank_id; return x; });
				
				if (src == "all") {
					for (var i in stats_data) {
						stats_data[i][wn9_src].id = stats_data[i].tank_id;
					}
				}
				self.resolve();
			});
		}),
		$.Deferred(function() {
			var self = this;
			get_wg_data("/account/info/?", ["nickname", "clan_id"], function(data) {
				$('#srch-term').attr('placeholder', data.nickname);
				$('#player_name').text(data.nickname);
				$('#player_name').show();
				self.resolve();
			});
		}),
		$.Deferred(function() {
			var self = this;
			$.get("http://karellodewijk.github.io/other/expected_wn8.json", {}, function(data) {
				tank_expected = data;
				self.resolve();
			});
		}),
		$.Deferred(function() {
			var self = this;
			$.get("http://karellodewijk.github.io/other/expected_wn9.json", {}, function(data) {
				tank_expected_wn9 = data;
				self.resolve();
			});
		})
	).then(function() {
		function calculate_stats() {
			function calculate_wn8(tank, exp) {
				var rDAMAGE = tank.damage_dealt / exp.expDamage;
				var rSPOT   = tank.spotted / exp.expSpot;
				var rFRAG   = tank.frags / exp.expFrag;
				var rDEF    = tank.dropped_capture_points / exp.expDef;
				var rWIN    = (100*tank.wins) / exp.expWinRate;

				var rWINc    = Math.max(0,                     (rWIN    - 0.71) / (1 - 0.71) )
				var rDAMAGEc = Math.max(0,                     (rDAMAGE - 0.22) / (1 - 0.22) )
				var rFRAGc   = Math.max(0, Math.min(rDAMAGEc + 0.2, (rFRAG   - 0.12) / (1 - 0.12)))
				var rSPOTc   = Math.max(0, Math.min(rDAMAGEc + 0.1, (rSPOT   - 0.38) / (1 - 0.38)))
				var rDEFc    = Math.max(0, Math.min(rDAMAGEc + 0.1, (rDEF    - 0.10) / (1 - 0.10)))		
				
				return (980*rDAMAGEc + 210*rDAMAGEc*rFRAGc + 155*rFRAGc*rSPOTc + 75*rDEFc*rFRAGc + 145*Math.min(1.8,rWINc));
			}	

			var tierAvg = [	// from 150816 EU avgs exc scout/arty
				{ win:0.477, dmg:88.9, frag:0.68, spot:0.90, def:0.53, cap:1.0, weight:0.40 },
				{ win:0.490, dmg:118.2, frag:0.66, spot:0.85, def:0.65, cap:1.0, weight:0.41 },
				{ win:0.495, dmg:145.1, frag:0.59, spot:1.05, def:0.51, cap:1.0, weight:0.44 },
				{ win:0.492, dmg:214.0, frag:0.60, spot:0.81, def:0.55, cap:1.0, weight:0.44 },
				{ win:0.495, dmg:388.3, frag:0.75, spot:0.93, def:0.63, cap:1.0, weight:0.60 },
				{ win:0.497, dmg:578.7, frag:0.74, spot:0.93, def:0.52, cap:1.0, weight:0.70 },
				{ win:0.498, dmg:791.1, frag:0.76, spot:0.87, def:0.58, cap:1.0, weight:0.82 },
				{ win:0.497, dmg:1098.7, frag:0.79, spot:0.87, def:0.58, cap:1.0, weight:1.00 },
				{ win:0.498, dmg:1443.2, frag:0.86, spot:0.94, def:0.56, cap:1.0, weight:1.23 },
				{ win:0.498, dmg:1963.8, frag:1.04, spot:1.08, def:0.61, cap:1.0, weight:1.60 }];
			
			function CalcWN9Tank(tank, expvals, maxhist) {
				var exp = expvals[tank.tank_id];
				if (!exp) { console.log("Tank ID not found: " + tank.tank_id); return -1; }

				var rtank = tank.random;
				var avg = tierAvg[exp.mmrange >= 3 ? exp.tier : exp.tier-1];
				var rdmg = rtank.damage_dealt / (rtank.battles * avg.dmg);
				var rfrag = rtank.frags / (rtank.battles * avg.frag);
				var rspot = rtank.spotted / (rtank.battles * avg.spot);
				var rdef = rtank.dropped_capture_points / (rtank.battles * avg.def);

				// Calculate raw winrate-correlated wn9base
				// Use different formula for low battle counts
				var wn9base = 0.7*rdmg;
				if (rtank.battles < 5) wn9base += 0.14*rfrag + 0.13*Math.sqrt(rspot) + 0.03*Math.sqrt(rdef);
				else wn9base += 0.25*Math.sqrt(rfrag*rspot) + 0.05*Math.sqrt(rfrag*Math.sqrt(rdef));
				// Adjust expected value if generating maximum historical value
				var wn9exp = maxhist ? exp.wn9exp * (1+exp.wn9nerf) : exp.wn9exp;
				// Calculate final WN9 based on tank expected value & skill scaling 
				var wn9 = 666 * Math.max(0, 1 + (wn9base / wn9exp - 1) / exp.wn9scale );
				return wn9;
			}
			
			function CalcWN9Account(tanks, expvals)	{
				// compile list of valid tanks with battles & WN9 
				var tanklist = [];
				var totbat = 0;
				for (var i=0; i<tanks.length; i++)
				{
					var exp = expvals[tanks[i].tank_id];
					if (!exp || exp.type == "SPG") continue;	// don't use SPGs & missing tanks
					var wn9 = CalcWN9Tank(tanks[i], expvals, false);
					var tankentry = { wn9:wn9, bat:tanks[i].random.battles, exp:exp };
					tanklist.push(tankentry);
					totbat += tankentry.bat;
				}
				if (!totbat) return -1;		// handle case with no valid tanks

				// cap tank weight according to tier, total battles & nerf status
				var totweight = 0;
				for (var i=0; i<tanklist.length; i++)
				{
					var exp = tanklist[i].exp;
					var batcap = exp.tier*(40.0 + exp.tier*totbat/2000.0);
					tanklist[i].weight = Math.min(batcap, tanklist[i].bat);
					if (exp.wn9nerf) tanklist[i].weight /= 2;
					totweight += tanklist[i].weight;
				}

				// sort tanks by WN9 decreasing
				function compareTanks(a, b) { return b.wn9 - a.wn9 };
				tanklist.sort(compareTanks);

				// add up account WN9 over top 65% of capped battles
				totweight *= 0.65;
				var wn9tot = 0, usedweight = 0, i = 0;
				for (; usedweight+tanklist[i].weight <= totweight; i++)
				{
					wn9tot += tanklist[i].wn9 * tanklist[i].weight;
					usedweight += tanklist[i].weight;
				}
				// last tank before cutoff uses remaining weight, not its battle count
				wn9tot += tanklist[i].wn9 * (totweight - usedweight);
				return wn9tot / totweight;
			}
			
			function calcWN9A(tanks, expvals) {				
				var wn9_src = src;
				if (src == 'all') {
					wn9_src = 'random';
				}	
				var transformed = [];
				for (var i in tanks) {
					if (tanks[i][src].battles > 0) {
						var tank = {tank_id:tanks[i].tank_id}
						tank.random = tanks[i][wn9_src];
						transformed.push(tank)
					}
				}
				return CalcWN9Account(transformed, expvals)
			}
			
			function calcWN9T(tank, expvals, maxhist) {
				var wn9_src = src;
				if (src == 'all') {
					wn9_src = 'random';
				}
				var transformed = {tank_id:tank.tank_id}
				transformed.random = tank[wn9_src];
				return CalcWN9Tank(transformed, expvals, maxhist)
			}
		
		
			var expected_totals = {expDamage:0, expSpot:0, expFrag:0, expDef:0, expWinRate:0}
			var achieved_totals = {damage_dealt:0, spotted:0, frags:0, dropped_capture_points:0, wins:0, battles:0,
								   xp:0, survived_battles: 0, capture_points:0, draws:0, shots:0, hits:0, pens:0, tier:0, tanks:{}}
			var wn8_totals = {damage_dealt:0, spotted:0, frags:0, dropped_capture_points:0, wins:0, battles:0}
			var average = {tanks:{}}
			
			for (var i in stats_data) {
				var tank = stats_data[i];
				if (tank_expected_wn9[tank.tank_id]) {
					var wn9 = calcWN9T(tank, tank_expected_wn9, true); 
					if (!isNaN(wn9)) {
						if (!achieved_totals.tanks[tank.id]) achieved_totals.tanks[tank.tank_id] = {};
						achieved_totals.tanks[tank.tank_id].wn9 = wn9;
					}
					
				}
			}
						
			for (var i in stats_data) {
				var tank = stats_data[i][src];					
				var expected = tank_expected[tank.id];

				if (expected) {
					expected.expDamage *= tank.battles;
					expected.expSpot *= tank.battles;
					expected.expFrag *= tank.battles;
					expected.expDef *= tank.battles;
					expected.expWinRate *= tank.battles;
					
					wn8_totals.damage_dealt += tank.damage_dealt;
					wn8_totals.spotted += tank.spotted;
					wn8_totals.frags += tank.frags;
					wn8_totals.dropped_capture_points += tank.dropped_capture_points;
					wn8_totals.wins += tank.wins;
					wn8_totals.battles += tank.battles;
					
					var wn8 = calculate_wn8(tank, expected);
					
					expected_totals.expDamage += expected.expDamage;
					expected_totals.expSpot += expected.expSpot;
					expected_totals.expFrag += expected.expFrag;
					expected_totals.expDef += expected.expDef;
					expected_totals.expWinRate += expected.expWinRate;

					if (!achieved_totals.tanks[tank.id]) achieved_totals.tanks[tank.id] = tank;
					achieved_totals.tanks[tank.id].expected = expected;
					achieved_totals.tanks[tank.id].wn8 = wn8;
				}
				
				achieved_totals.damage_dealt += tank.damage_dealt;
				achieved_totals.spotted += tank.spotted;
				achieved_totals.frags += tank.frags;
				achieved_totals.dropped_capture_points += tank.dropped_capture_points;
				achieved_totals.wins += tank.wins;
				achieved_totals.battles += tank.battles;
			}
						
			for (var i in stats_data) {	
				var tank = stats_data[i][src];
				if (!achieved_totals.tanks[tank.id]) achieved_totals.tanks[tank.id] = tank;
				if (!average.tanks[tank.id]) average.tanks[tank.id] = JSON.parse(JSON.stringify(tank));
				
				if (tank && tank.battles > 0) {
					average.tanks[tank.id].damage_dealt = tank.damage_dealt / tank.battles;
					average.tanks[tank.id].frags = tank.frags / tank.battles;
					average.tanks[tank.id].spotted = tank.spotted / tank.battles;
					average.tanks[tank.id].dropped_capture_points = tank.dropped_capture_points / tank.battles;
					average.tanks[tank.id].capture_points = tank.capture_points / tank.battles;
					average.tanks[tank.id].xp =  tank.battle_avg_xp;
					average.tanks[tank.id].survived_battles =  tank.survived_battles / tank.battles;
					
					achieved_totals.tanks[tank.id].wins =  tank.wins;
					achieved_totals.tanks[tank.id].battles = tank.battles;
					
					achieved_totals.xp += tank.battle_avg_xp * tank.battles;
					achieved_totals.survived_battles += tank.survived_battles;						
					achieved_totals.capture_points += tank.capture_points;
					
					if (tank_data[tank.id]) {
						achieved_totals.tanks[tank.id].name = tank_data[tank.id].name_i18n;
						achieved_totals.tanks[tank.id].tier = tank_data[tank.id].level;
						achieved_totals.tanks[tank.id].nation = tank_data[tank.id].nation;
						achieved_totals.tanks[tank.id].type = tank_data[tank.id].type;
						achieved_totals.tanks[tank.id].icon = tank_data[tank.id].image_small;
						achieved_totals.tier += tank.battles * tank_data[tank.id].level;
					}				
				}
			}
			
			achieved_totals.wn8 = calculate_wn8(wn8_totals, expected_totals);
			achieved_totals.wn9 = calcWN9A(stats_data, tank_expected_wn9)
						
			average.damage_dealt = achieved_totals.damage_dealt / achieved_totals.battles;
			average.frags = achieved_totals.frags / achieved_totals.battles;
			average.spotted = achieved_totals.spotted / achieved_totals.battles;
			average.dropped_capture_points = achieved_totals.dropped_capture_points / achieved_totals.battles;
			average.capture_points = achieved_totals.capture_points / achieved_totals.battles;
			average.xp = achieved_totals.xp / achieved_totals.battles;
			average.survived_battles = achieved_totals.survived_battles / achieved_totals.battles;			
			average.tier = achieved_totals.tier / achieved_totals.battles;
			average.wins = achieved_totals.wins / achieved_totals.battles;
												
			return [achieved_totals, average];
		}
		
		$( document ).ready(function() {
			$("#tank_list").tablesorter({sortList: [[5,1], [0,0],[1,0],[2,0],[3,0],[4,0],[6,0],[7,0]]}); 
			
			function round(num, decimals) {
				var rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
				return rounded.toFixed(decimals);
			}

			function wn8_color(wn8) {
				if (wn8 < 300) {
					return("#930d0d"); //deep red
				} else if (wn8 < 450) {
					return("#cd3333"); //red
				} else if (wn8 < 650) {
					return("#cc7a00"); //orange
				} else if (wn8 < 900) {
					return("#ccb800"); //yellow
				} else if (wn8 < 1200) {
					return("#849b24"); //light green
				} else if (wn8 < 1600) {
					return("#4d7326"); //green
				} else if (wn8 < 2000) {
					return("#4099bf"); //light blue
				} else if (wn8 < 2450) {
					return("#3972c6"); //blue	
				} else if (wn8 < 2900) {
					return("#793db6"); //light purple	
				} else {
					return("#401070"); //purple	
				}
			}

			function wn9_color(wn9) {
				if (wn9 < 200) {
					return("#930d0d"); //deep red
				} else if (wn9 <= 300) {
					return("#cd3333"); //red
				} else if (wn9 < 400) {
					return("#cc7a00"); //orange
				} else if (wn9 < 500) {
					return("#ccb800"); //yellow
				} else if (wn9 < 600) {
					return("#849b24"); //light green
				} else if (wn9 < 700) {
					return("#4d7326"); //green
				} else if (wn9 < 800) {
					return("#4099bf"); //light blue
				} else if (wn9 < 900) {
					return("#3972c6"); //blue	
				} else if (wn9 < 1000) {
					return("#793db6"); //light purple	
				} else {
					return("#401070"); //purple	
				}
			}
			
			function wr_color(wr) {
				if (wr < 0.46) {
					return("#930d0d"); //deep red
				} else if (wr < 0.47) {
					return("#cd3333"); //red
				} else if (wr < 0.48) {
					return("#cc7a00"); //orange
				} else if (wr < 0.5) {
					return("#ccb800"); //yellow
				} else if (wr < 0.52) {
					return("#849b24"); //light green
				} else if (wr < 0.54) {
					return("#4d7326"); //green
				} else if (wr < 0.56) {
					return("#4099bf"); //light blue
				} else if (wr < 0.6) {
					return("#3972c6"); //blue	
				} else if (wr < 0.65) {
					return("#793db6"); //light purple	
				} else {
					return("#401070"); //purple	
				}
			}
			
			
			var results, averages;
			[results, averages] = calculate_stats();
											
			for (var i in results.tanks) {
				var totals = results.tanks[i];
				var average = averages.tanks[i];
				
				if (totals.name) {
					var node = "<tr>";
					
					var kd = average.frags / (1 - average.survived_battles)
					
					node += "<td><img src='" + totals.icon + "'></td>";
					node += "<td>"+totals.name+"</td>";
					node += "<td>"+totals.nation+"</td>";
					node += "<td>"+totals.tier+"</td>";
					node += "<td style='color:#ffffff; background-color:" + wr_color(totals.wins/totals.battles) + "'>"+round(100*totals.wins/totals.battles, 1)+"%</td>";
					node += "<td>"+totals.battles+"</td>";
					node += "<td>"+round(average.damage_dealt,0)+"</td>";
					node += "<td>"+round(average.frags, 2)+"</td>";
					node += "<td>"+round(kd,1)+"</td>";
					node += "<td>"+round(100*average.survived_battles,2)+"%</td>";
					node += "<td>"+average.xp+"</td>";
					node += "<td data-toggle='tooltip' title='" + round(totals.wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(totals.wn8) + "'>" + round(totals.wn8, 0) + "</td>";
					node += "<td data-toggle='tooltip' title='" + round(totals.wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(totals.wn9) + "'>" + round(totals.wn9, 0) + "</td>";
					node += "</tr>";
					
					$("#tank_list_body").append(node);
				}
			}
			
			$("#tank_list").trigger("update"); 

			var kd = averages.frags / (1 - averages.survived_battles)
									
			$("#wr_col").append("<td data-toggle='tooltip' title='" + round(100*results.wins/results.battles, 4) + "' style='color:#ffffff; background-color:" + wr_color(results.wins/results.battles) + "'>" + round(100*results.wins/results.battles, 2) + "%</td>");
			$("#wn8_col").append("<td data-toggle='tooltip' title='" + round(results.wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(results.wn8) + "'>" + round(results.wn8, 0) + "</td>");
			$("#wn9_col").append("<td data-toggle='tooltip' title='" + round(results.wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(results.wn9) + "'>" + round(results.wn9, 0) + "</td>");
			$("#battles_col").append("<td>" + results.battles + "</td>");
			$("#dam_col").append("<td data-toggle='tooltip' title='" + round(averages.damage_dealt, 2) + "'>" + round(averages.damage_dealt, 0) + "</td>");
			$("#kills_col").append("<td data-toggle='tooltip' title='" + round(averages.frags, 4) + "'>" + round(averages.frags, 2) + "</td>");
			$("#surv_col").append("<td data-toggle='tooltip' title='" + round(100*averages.survived_battles, 4) + "'>" + round(100*averages.survived_battles, 2) + "%</td>");
			$("#kd_col").append("<td data-toggle='tooltip' title='" + round(kd, 4) + "'>" + round(kd, 2) + "</td>");
			$("#def_col").append("<td data-toggle='tooltip' title='" + round(averages.dropped_capture_points, 4) + "'>" + round(averages.dropped_capture_points, 2) + "</td>");
			$("#cap_col").append("<td data-toggle='tooltip' title='" + round(averages.capture_points, 4) + "'>" + round(averages.capture_points, 2) + "</td>");
			$("#xp_col").append("<td data-toggle='tooltip' title='" + round(averages.xp, 2) + "'>" + round(averages.xp, 0) + "</td>");
			$("#tier_col").append("<td data-toggle='tooltip' title='" + round(averages.tier, 2) + "'>" + round(averages.tier, 1) + "</td>");
	
			function add_msg_column(str) {
				$("#wr_col").append("<td>" + str + "</rd>");
				$("#wn8_col").append("<td></rd>");
				$("#wn9_col").append("<td></rd>");
				$("#battles_col").append("<td></rd>");
				$("#dam_col").append("<td></rd>");
				$("#kills_col").append("<td></rd>");
				$("#surv_col").append("<td></rd>");
				$("#kd_col").append("<td></rd>");
				$("#def_col").append("<td></rd>");
				$("#cap_col").append("<td></rd>");
				$("#xp_col").append("<td></rd>");
				$("#tier_col").append("<td></rd>");				
			}
	
			function add_column(now, then, current_average) {
				var results = {}
				if (!then || Object.keys(then).length == 0) {
					add_msg_column("Coming soon");
					return;					
				}
				
				results.battles = now.battles - then.battles;
				
				console.log(now.wn9, then.wn9)
				console.log((now.damage_dealt - then.damage_dealt) / 44)
				
				if (results.battles == 0) {
					add_msg_column("No recent battles");
					return;
				}

				results.wins = now.wins - then.wins;
				results.survived_battles = now.survived_battles - then.survived_battles;
									
				results.damage_dealt = now.damage_dealt - then.damage_dealt;
				results.spotted = now.spotted - then.spotted;
				results.frags = now.frags - then.frags;
				results.dropped_capture_points = now.dropped_capture_points - then.dropped_capture_points;
				results.capture_points = now.capture_points - then.capture_points;
				results.xp = now.xp - then.xp;
									
				results.tier = now.tier - then.tier;
				results.wn8 = (now.battles * now.wn8 - then.battles * then.wn8) / results.battles;
				results.wn9 = (now.battles * now.wn9 - then.battles * then.wn9) / results.battles;
				
				var average = {}
				average.damage_dealt = results.damage_dealt / results.battles;
				average.spotted = results.spotted / results.battles;
				average.frags = results.frags / results.battles;
				average.dropped_capture_points = results.dropped_capture_points / results.battles;
				average.capture_points = results.capture_points / results.battles;
				average.xp = results.xp / results.battles;
				average.tier = results.tier / results.battles;
				average.survived_battles = results.survived_battles / results.battles;
				average.wins = results.wins / results.battles;
				
				var average_diff = {}
				average_diff.damage_dealt = average.damage_dealt - current_average.damage_dealt;
				average_diff.spotted = average.spotted - current_average.spotted;
				average_diff.frags = average.frags - current_average.frags;
				average_diff.dropped_capture_points = average.dropped_capture_points - current_average.dropped_capture_points;
				average_diff.capture_points = average.capture_points - current_average.capture_points;
				average_diff.xp = average.xp - current_average.xp;
				average_diff.tier= average.tier - current_average.tier;
				average_diff.survived_battles = average.survived_battles - current_average.survived_battles;
				average_diff.wins = average.wins - current_average.wins;
				average_diff.wn8 = results.wn8 - now.wn8;
				average_diff.wn9 = results.wn9 - now.wn9;
				
				var old_kd = current_average.frags / (1 - current_average.survived_battles)
				var kd = average.frags / (1 - average.survived_battles)
				var kd_diff = kd - old_kd;
				
				function sign(val) {
					return val >= 0 ? "+" : ""; 
				}
				function sign_col(val) {
					return val >= 0 ? "#00bb00" : "#bb0000"; 
				}
				
				$("#wr_col").append("<td data-toggle='tooltip' title='" + round(100*average.wins, 4) + "' style='color:#ffffff; background-color:" + wr_color(average.wins) + "'>" + round(100*average.wins, 2) + "% (<span style='color: " + sign_col(average_diff.wins) + "'>" + sign(average_diff.wins) + round(100*average_diff.wins,2) + "%</span>)</td>");
				$("#wn8_col").append("<td data-toggle='tooltip' title='" + round(results.wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(results.wn8) + "'>" + round(results.wn8, 0) + " (<span style='color: " + sign_col(average_diff.wn8) + "'>" + sign(average_diff.wn8) + round(average_diff.wn8,0) + "</span>)</td>");
				$("#wn9_col").append("<td data-toggle='tooltip' title='" + round(results.wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(results.wn9) + "'>" + round(results.wn9, 0) + " (<span style='color: " + sign_col(average_diff.wn9) + "'>" + sign(average_diff.wn9) + round(average_diff.wn9,0) + "</span>)</td>");
				$("#battles_col").append("<td>" + results.battles + "</td>");
				$("#dam_col").append("<td data-toggle='tooltip' title='" + round(average.damage_dealt, 2) + "'>" + round(average.damage_dealt, 0) + " (<span style='color: " + sign_col(average_diff.damage_dealt) + "'>" + sign(average_diff.damage_dealt) + round(average_diff.damage_dealt,0) + "</span>)</td>");
				$("#kills_col").append("<td data-toggle='tooltip' title='" + round(average.frags, 4) + "'>" + round(average.frags, 2) + " (<span style='color: " + sign_col(average_diff.frags) + "'>" + sign(average_diff.frags) + round(average_diff.frags,2) + "</span>)</td>");
				$("#surv_col").append("<td data-toggle='tooltip' title='" + round(100*average.survived_battles, 4) + "'>" + round(100*average.survived_battles, 2) + "% (<span style='color: " + sign_col(average_diff.survived_battles) + "'>" + sign(average_diff.survived_battles) + round(100*average_diff.survived_battles,0) + "%</span>)</td>");
				$("#kd_col").append("<td data-toggle='tooltip' title='" + round(kd, 4) + "'>" + round(kd, 2) + " (<span style='color: " + sign_col(kd_diff) + "'>" + sign(kd_diff) + round(kd_diff,2) + "</span>)</td>");
				$("#def_col").append("<td data-toggle='tooltip' title='" + round(average.dropped_capture_points, 4) + "'>" + round(average.dropped_capture_points, 2) + " (<span style='color: " + sign_col(average_diff.dropped_capture_points) + "'>" + sign(average_diff.dropped_capture_points) + round(average_diff.dropped_capture_points,2) + "</span>)</td>");
				$("#cap_col").append("<td data-toggle='tooltip' title='" + round(average.capture_points, 4) + "'>" + round(average.capture_points, 2) + " (<span style='color: " + sign_col(average_diff.capture_points) + "'>" + sign(average_diff.capture_points) + round(average_diff.capture_points,2) + "</span>)</td>");
				$("#xp_col").append("<td data-toggle='tooltip' title='" + round(average.xp, 2) + "'>" + round(average.xp, 0) + " (<span style='color: " + sign_col(average_diff.xp) + "'>" + sign(average_diff.xp) + round(average_diff.xp,2) + "</span>)</td>");
				$("#tier_col").append("<td data-toggle='tooltip' title='" + round(average.tier, 2) + "'>" + round(average.tier, 1) + " (<span style='color: " + sign_col(average_diff.tier) + "'>" + sign(average_diff.tier) + round(average_diff.tier,2) + "</span>)</td>");
			} 

			if (summary) {
				add_column(results, summary["recent"], averages);
				var interesting_points;
				if (src == "random" || src == "all") {
					interesting_points = ["100", "1000", "5000"];
				} else {
					interesting_points = ["10", "100", "500"];
				}
				for (var i in interesting_points) {
					add_column(results, summary[interesting_points[i]], averages);
				}
			} else {
				add_msg_column("Coming soon");
				add_msg_column("Coming soon");
				add_msg_column("Coming soon");
				add_msg_column("Coming soon");
			}
		});
	});
	
	//do this last, if browser don't support it, well we crag here :)
	if (src == "all") {
		window.history.replaceState({}, document.title, "/player/" + player);
	} else {
		window.history.replaceState({}, document.title, "/player/" + player + "?src=" + src);
	}
}

$(document).ready(function() {	
	$("#"+server).addClass("active");
	$('.server_select').click(function(e){
		e.preventDefault();
		server = $(this).parent().attr('id');
		$(".server_li").each(function() {
			$(this).removeClass("active");
		});
		$(this).parent().addClass("active");
	});
	$('#search_button').click(function(e){
		e.preventDefault();
		var link = 'https://api.worldoftanks.' + server + '/wot/account/list/?limit=20&application_id=0dbf88d72730ed7b843ab5934d8b3794&search=' + $('#srch-term').val();
		$.get(link, {}, function(data) {
			if (data.data[0].nickname == $('#srch-term').val()) {
				player = data.data[0].account_id
				reset_ui();
				populate();
			} else {
				var alternatives = "";
				for (var i = 0; i < Math.min(20, data.data.length); i++) {
					alternatives += "<a href='/player/"+ data.data[i].account_id + "'>" + data.data[i].nickname + "</a>, "
				}
				alternatives = alternatives.substring(0, alternatives.length - 2);
				$('#alt_lists').html(alternatives);
				$("#did_you_mean").show();
			}
		});
	});
	$('.tab_link').click(function(e) {
		e.preventDefault();
		$('.tab_li').removeClass("active");
		$(this).parent().addClass("active");
		src = $(this).attr('data-src');
		reset_ui();
		populate();
	});
});

var wn9_src = "random";

if (player && server) {
	$(document).ready(function() {
		switch(src) {
			case 'all':
				$("#all_tab").addClass("active");
				break;
			case 'globalmap':
				$("#cw_tab").addClass("active");
				break;
			case 'stronghold_skirmish':
				$("#sk_tab").addClass("active");
				break;
			case 'stronghold_defense':
				$("#sh_tab").addClass("active");
				break;
			case 'team':
				$("#team_tab").addClass("active");
				break;				
		}
	});
	
	populate();

}
