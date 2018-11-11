var player = window.location.pathname.split('/');

player = player[player.length - 1]

if (!player) {
	var user = JSON.parse($("meta[name='user']").attr('content'));
	if (user && user.wg_account_id) {
		player = user.wg_account_id;
	}
}

var server = get_server(player);
var charts = [];

function get_server(id) {
	if(id >= 2000000000){return "asia";}
	if(id >= 1000000000){return "com";}
	if(id >= 500000000){return "eu";}
	return "ru";
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
	$.get(link).done(function(data) {
		cb(data.data[player]);
	});
}

function get_wg_clan_data(page, fields, clan, cb) {
	var link = "https://api.worldoftanks." + server + "/wgn" + page;
	link += "application_id=0dbf88d72730ed7b843ab5934d8b3794";
	link += "&clan_id=" + clan;
	if (fields && fields.length > 0) {
		link += "&fields=";
		for (var i in fields) {
			var field = fields[i];
			link += field + ",";
		}
		link = link.slice(0,-1);
	}
	$.get(link, {}, function(data) {
		cb(data.data[clan]);
	});
}

function reset_ui() {
	$('#tank_list_body').empty();
	$('#total_table_body').children().each(function() {
		$(this).children().slice(1).remove();
	})
	for (var i in charts) {
		charts[i].destroy();
	}
	charts = [];
}

function populate() {	
	server = get_server(player);
	$('#no_results').hide();
	$("#did_you_mean").hide();
	$("#login_or_search").hide();
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
			$.get(link).done(function(data) {
				summary = JSON.parse(data);
				self.resolve();
			}).fail(function() {
				summary = null;
				self.resolve();
			});
		}),
		//this is to fix a bug with reset account, where wg still reports old stats for tanks
		$.Deferred(function() {
			var self = this;
			get_wg_data("/account/tanks/?", ["tank_id"], function(data) {
				valid_tanks = data.map(function(x) {return parseInt(x.tank_id)});
				valid_tanks.sort(function(a,b) {return a-b});
				self.resolve();
			});
		}),
		$.Deferred(function() {
			var self = this;
			var fields = ["tank_id"];
			if (src == "globalmap6" || src == "globalmap8" || src == "globalmap10") {
				wg_src = "globalmap";
			} else if (src == "stronghold_skirmish6" || src == "stronghold_skirmish8" || src == "stronghold_skirmish10") {
				wg_src = "stronghold_skirmish";
			} else {
				wg_src = src;
			}
			fields.push(wg_src);
			wn9_src = src;
			if (src == "all") {
				fields.push("random");
				wn9_src = "random";
			}
			get_wg_data("/tanks/stats/?extra=random&", fields, function(data) {
				stats_data = data;
				if (stats_data) {
					stats_data = stats_data.map(function(x) { x[wg_src].id = x.tank_id; return x; });
					if (src == "all") {
						for (var i in stats_data) {
							stats_data[i][wn9_src].id = stats_data[i].tank_id;
						}
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
				clan_id = data.clan_id
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
		if (clan_id) {
			get_wg_clan_data("/clans/info/?", ["tag"], clan_id, function(data) {
				$('#clan_tag').html('[<a href="/clan/' + clan_id + '">' + data.tag + '</a>]')
				$('#clan_tag').show();
			});
		} else {
			$('#clan_tag').hide();
		}
		
		if (!stats_data) {
			$('#no_battles').show();
			return;
		} else {
			$('#no_battles').hide();
		}

		//borrowed from http://stackoverflow.com/questions/22697936/binary-search-in-javascript
		function binarySearch(ar, el, compare_fn) {
			var m = 0;
			var n = ar.length - 1;
			while (m <= n) {
				var k = (n + m) >> 1;
				var cmp = compare_fn(el, ar[k]);
				if (cmp > 0) {
					m = k + 1;
				} else if(cmp < 0) {
					n = k - 1;
				} else {
					return k;
				}
			}
			return -m - 1;
		}
		
		//this is to fix a bug with reset account, where wg still reports old stats for tanks
		stats_data = stats_data.filter(function(x) {
			var tank_id = x.tank_id;
			var pos = binarySearch(valid_tanks, tank_id, function(a,b) {return a-b});
			return (pos >= 0)
		})
		
				
		$( document ).ready(function() {
			$("#tank_list").tablesorter({sortList: [[5,1], [0,0],[1,0],[2,0],[3,0],[4,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0]], sortStable:true, sortAppend: [[5,1]]}); 		
			
			function filter_tank_data(tier) {
				for (var i in stats_data) {
					var tank_id = stats_data[i].tank_id;
					if (!tank_data[tank_id] || tank_data[tank_id].level != tier) {
						delete stats_data[i];
					}
				}
			}
			
			if (src == "globalmap6" || src == "stronghold_skirmish6") {
				filter_tank_data(6);
			} else if (src == "globalmap8" || src == "stronghold_skirmish8") {
				filter_tank_data(8);
			} else if (src == "globalmap10" || src == "stronghold_skirmish10") {
				filter_tank_data(10);
			}
			
			var results = calculate_stats(tank_expected, tank_expected_wn9, stats_data, wg_src, wn9_src);
						
			for (var i in results.tanks) {
				var totals = results.tanks[i];
				
				if (totals.name) {
					var node = "<tr>";				
					var kd = totals.frags / (totals.battles - totals.survived_battles)
					var average_damage = totals.damage_dealt / totals.battles;
					var average_frags = totals.frags / totals.battles;
					var average_survived = totals.survived_battles / totals.battles;
					var average_xp = totals.xp / totals.battles;
					var average_spotted = totals.spotted / totals.battles;
					
					node += "<td><img src='" + totals.icon + "'></td>";
					node += "<td>"+totals.name+"</td>";
					node += "<td>"+totals.nation+"</td>";
					node += "<td>"+totals.tier+"</td>";
					node += "<td style='color:#ffffff; background-color:" + wr_color(totals.wins/totals.battles) + "'>"+round(100*totals.wins/totals.battles, 1)+"%</td>";
					node += "<td>"+totals.battles+"</td>";
					node += "<td>"+round(average_damage,0)+"</td>";
					node += "<td>"+round(average_frags, 2)+"</td>";
					node += "<td>"+round(kd,1)+"</td>";
					node += "<td>"+round(100*average_survived,2)+"%</td>";
					node += "<td>"+round(average_spotted, 2)+"</td>";
					node += "<td>"+round(average_xp, 0)+"</td>";				
					node += "<td data-toggle='tooltip' title='" + round(totals.wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(totals.wn8) + "'>" + round(totals.wn8, 0) + "</td>";
					node += "<td data-toggle='tooltip' title='" + round(totals.wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(totals.wn9) + "'>" + round(totals.wn9, 0) + "</td>";
					node += "</tr>";
					
					$("#tank_list_body").append(node);
				}
			}
			
			$("#tank_list").trigger("update"); 

			var kd = results.frags / (results.battles - results.survived_battles);
			var average = calculate_average(results);
					
			$("#wr_col").append("<td data-toggle='tooltip' title='" + round(100*results.wins/results.battles, 4) + "' style='color:#ffffff; background-color:" + wr_color(results.wins/results.battles) + "'>" + round(100*results.wins/results.battles, 2) + "%</td>");
			$("#wn8_col").append("<td data-toggle='tooltip' title='" + round(results.wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(results.wn8) + "'>" + round(results.wn8, 0) + "</td>");
			$("#wn9_col").append("<td data-toggle='tooltip' title='" + round(results.wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(results.wn9) + "'>" + round(results.wn9, 0) + "</td>");
			$("#battles_col").append("<td>" + results.battles + "</td>");
			$("#dam_col").append("<td data-toggle='tooltip' title='" + round(average.damage_dealt, 2) + "'>" + round(average.damage_dealt, 0) + "</td>");
			$("#kills_col").append("<td data-toggle='tooltip' title='" + round(average.frags, 4) + "'>" + round(average.frags, 2) + "</td>");
			$("#surv_col").append("<td data-toggle='tooltip' title='" + round(100*average.survived_battles, 4) + "'>" + round(100*average.survived_battles, 2) + "%</td>");
			$("#kd_col").append("<td data-toggle='tooltip' title='" + round(kd, 4) + "'>" + round(kd, 2) + "</td>");
			$("#def_col").append("<td data-toggle='tooltip' title='" + round(average.dropped_capture_points, 4) + "'>" + round(average.dropped_capture_points, 2) + "</td>");
			$("#cap_col").append("<td data-toggle='tooltip' title='" + round(average.capture_points, 4) + "'>" + round(average.capture_points, 2) + "</td>");
			$("#xp_col").append("<td data-toggle='tooltip' title='" + round(average.xp, 2) + "'>" + round(average.xp, 0) + "</td>");
			$("#tier_col").append("<td data-toggle='tooltip' title='" + round(average.tier, 2) + "'>" + round(average.tier, 1) + "</td>");
			$("#spotted_col").append("<td data-toggle='tooltip' title='" + round(average.spotted, 2) + "'>" + round(average.spotted, 2) + "</td>");
	
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
				$("#spotted_col").append("<td></rd>");
			}
	
			function add_column(now, then) {				
				var results = {}
				if (!then || Object.keys(then).length == 0) {
					add_msg_column("Coming soon");
					return;					
				}
				
				results.battles = now.battles - then.battles;

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
				
				var average = calculate_average(results);
				var current_average = calculate_average(now);

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
				$("#spotted_col").append("<td data-toggle='tooltip' title='" + round(average.spotted, 4) + "'>" + round(average.spotted, 2) + " (<span style='color: " + sign_col(average_diff.spotted) + "'>" + sign(average_diff.spotted) + round(average_diff.spotted,2) + "</span>)</td>");
			} 

			if (summary) {
				add_column(results, summary["recent"]);
				var interesting_points;
				if (src == "random" || src == "all") {
					interesting_points = ["100", "1000", "5000"];
				} else {
					interesting_points = ["10", "100", "500"];
				}
				for (var i in interesting_points) {
					add_column(results, summary[interesting_points[i]]);
				}
			} else {
				add_msg_column("Coming soon");
				add_msg_column("Coming soon");
				add_msg_column("Coming soon");
				add_msg_column("Coming soon");
			}

			var tierBattleData = [];
			var tierWN8Data = [];
			var tierWN9Data = [];
			var tierWinsData = [];	
			
			for (var i = 1; i <= 10; i++) {
				var total_battles = 0;
				var total_wn8 = 0;
				var total_wn8_battles = 0;
				var total_wn9 = 0;
				var total_wn9_battles = 0;
				var total_wins = 0;
				for (var j in results.tanks) {
					var tank = results.tanks[j];
					if (tank.tier == i) {
						total_battles += tank.battles;
						total_wins += tank.wins;
						if (tank.wn8) {
							total_wn8_battles += tank.battles;
							total_wn8 += tank.wn8 * tank.battles;
						}
						if (tank.wn9) {
							total_wn9_battles += tank.battles;
							total_wn9 += tank.wn9 * tank.battles;
						}
					}
				}
				tierBattleData.push(total_battles);
				tierWN8Data.push(total_wn8 / total_wn8_battles);
				tierWN9Data.push(total_wn9 / total_wn9_battles);
				tierWinsData.push(total_wins / total_battles);
			}
			
			var typeBattleData = [];
			var typeWN8Data = [];
			var typeWN9Data = [];	
			var typeWinsData = [];			
			var types = ["lightTank", "mediumTank", "heavyTank", "AT-SPG", "SPG"]
			for (var i in types) {
				var type = types[i];
				var total_battles = 0;
				var total_wn8 = 0;
				var total_wn8_battles = 0;
				var total_wn9 = 0;
				var total_wn9_battles = 0;
				var total_wins = 0;
				for (var j in results.tanks) {
					var tank = results.tanks[j];
					if (tank.type == type) {
						total_battles += tank.battles;
						total_wins += tank.wins;
						if (tank.wn8) {
							total_wn8_battles += tank.battles;
							total_wn8 += tank.wn8 * tank.battles;
						}
						if (tank.wn9) {
							total_wn9_battles += tank.battles;
							total_wn9 += tank.wn9 * tank.battles;
						}
					}
				}
				typeBattleData.push(total_battles);
				typeWN8Data.push(total_wn8 / total_wn8_battles);
				typeWN9Data.push(total_wn9 / total_wn9_battles);
				typeWinsData.push(total_wins / total_battles);
			}
			
			typeWinsData = typeWinsData.map(function(x) { return round(x * 100, 2); })
			tierWinsData = tierWinsData.map(function(x) { return round(x * 100, 2); })
						
			var tiers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
			var tierBattleDesc = {
				type: "bar",
				labels: tiers,
				datasets: [
					{
						label: 'Battles by tier',
						borderWidth: 1,
						data: tierBattleData,
						backgroundColor: "rgba(255,0,0,1)",
						yAxisID: "battles"
					}
				]
			};	
			
			var tierWinsDesc = {
				type: "bar",
				labels: tiers,
				datasets: [
					{
						label: 'Winrate by tier',
						borderWidth: 1,
						data: tierWinsData,
						backgroundColor: "rgba(255,255,0,1)",
						yAxisID: "wins"
					}
				]
			};	
			
			var tierWN8Desc = {
				type: "bar",
				labels: tiers,
				datasets: [
					{
						label: 'WN8 by tier',
						borderWidth: 1,
						data: tierWN8Data,
						backgroundColor: "rgba(0, 255, 0,1)",
						yAxisID: "wn8"
					}
				]
			};
			
			var tierWN9Desc = {
				type: "bar",
				labels: tiers,
				datasets: [
					{
						label: 'WN9 by tier',
						borderWidth: 1,
						data: tierWN9Data,
						backgroundColor: "rgba(0, 0, 255,1)",
						yAxisID: "wn9"
					}
				]
			};				
	
			var ctx = document.getElementById("tier_battles").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: tierBattleDesc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'Battles',
						position: "left",
						"id": "battles"
					  }]
					}
				}
			}));

			var ctx = document.getElementById("tier_wins").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: tierWinsDesc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'Wins',
						position: "left",
						"id": "wins",
						ticks: {
							callback: function(label, index, labels) {
								return label+'%';
							}
						}
					  }]
					}
				}
			}));
			
			var ctx = document.getElementById("tier_wn8").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: tierWN8Desc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'WN8',
						position: "left",
						"id": "wn8"
					  }]
					}
				}
			}));

			var ctx = document.getElementById("tier_wn9").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: tierWN9Desc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'WN9',
						position: "left",
						"id": "wn9"
					  }]
					}
				}
			}));

			var types = ["Light", "Medium", "Heavy", "TD", "SPG"];
			var wn9_types = ["Light", "Medium", "Heavy", "TD"];
			var typeBattleDesc = {
				type: "bar",
				labels: types,
				datasets: [
					{
						label: 'Battles by type',
						borderWidth: 1,
						data: typeBattleData,
						backgroundColor: "rgba(255,0,0,1)",
						yAxisID: "battles"
					}
				]
			};
			
			var typeWinsDesc = {
				type: "bar",
				labels: types,
				datasets: [
					{
						label: 'Winrate by type',
						borderWidth: 1,
						data: typeWinsData,
						backgroundColor: "rgba(255, 255, 0,1)",
						yAxisID: "wins"
					}
				]
			};

			var typeWN8Desc = {
				type: "bar",
				labels: types,
				datasets: [
					{
						label: 'WN8 by type',
						borderWidth: 1,
						data: typeWN8Data,
						backgroundColor: "rgba(0, 255, 0,1)",
						yAxisID: "wn8"
					}
				]
			};
			
			typeWN9Data.pop();
			var typeWN9Desc = {
				type: "bar",
				labels: wn9_types,
				datasets: [
					{
						label: 'WN9 by type',
						borderWidth: 1,
						data: typeWN9Data,
						backgroundColor: "rgba(0, 0, 255,1)",
						yAxisID: "wn9"
					}
				]
			};				
	
			var ctx = document.getElementById("type_battles").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: typeBattleDesc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'Battles',
						position: "left",
						"id": "battles"
					  }]
					}
				}
			}));

			var ctx = document.getElementById("type_wins").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: typeWinsDesc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'Winrate',
						position: "left",
						"id": "wins",
						ticks: {
							callback: function(label, index, labels) {
								return label+'%';
							}
						}
					  }]
					}
				}
			}));			
			
			var ctx = document.getElementById("type_wn8").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: typeWN8Desc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'WN8',
						position: "left",
						"id": "wn8"
					  }]
					}
				}
			}));

			var ctx = document.getElementById("type_wn9").getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'bar',
				data: typeWN9Desc,
				options: {
					scales: {
					  yAxes: [{
						labelString: 'WN9',
						position: "left",
						"id": "wn9"
					  }]
					}
				}
			}));
			
		});

		if (summary && summary.battles) {
			$('#line_chart').show();
			var wn8_dataset = []
			var wn9_dataset = []
			for (var i in summary.wn8) {
				wn8_dataset.push({x:summary.battles[i], y:summary.wn8[i]});
				wn9_dataset.push({x:summary.battles[i], y:summary.wn9[i]});
			}
			
			var min_x = summary.battles[0];
			var max_x = summary.battles[summary.battles.length-1];
					
			var ctx = document.getElementById('wn8_progress').getContext('2d');
			charts.push(new Chart(ctx, {
				type: 'line',
				data: {
					labels: summary.battles,
					datasets: [{
						label: 'wn8',
						fill: false,
						borderColor: "#5DA5DA",
						backgroundColor: "#5DA5DA",
						data: wn8_dataset,
						yAxisID: "wn8"
					}, {
						label: 'wn9',
						fill: false,
						borderColor: "#F15854",
						backgroundColor: "#F15854",
						data: wn9_dataset,
						yAxisID: "wn9"
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
					  yAxes: [{
						labelString: 'WN8',
						position: "left",
						"id": "wn8",
						scaleLabel: {
							display: true,
							labelString: 'WN8'
						}
					  },
					  {
						labelString: 'WN9',
						position: "right",
						"id": "wn9",
						scaleLabel: {
							display: true,
							labelString: 'WN9'
						}
					  }],
					  xAxes: [{
						  labelString: 'Battles',
						  type: 'linear',
						  position: 'bottom',
						  scaleLabel: {
							display: true,
							labelString: 'Battles'
						  },
						  ticks: {
							  suggestedMin: min_x,
							  suggestedMax: max_x,
							  stepSize: Math.floor((max_x - min_x) / 15)
						  }
					  }]
					}
				}
			}))
		} else {
			$('#line_chart').hide();
		}
	});

	//do this last, if browser don't support it, well we crag here :)
	if (src == "all") {
		window.history.replaceState({}, document.title, "/player/" + player);
	} else {
		window.history.replaceState({}, document.title, "/player/" + player + "?src=" + src);
	}
}

$(document).ready(function() {
	function search() {
		var link = 'https://api.worldoftanks.' + server + '/wot/account/list/?limit=20&application_id=0dbf88d72730ed7b843ab5934d8b3794&search=' + $('#srch-term').val();
		$.get(link, {}, function(data) {
      console.log(data)
			if (data.data.length == 0) {
				$('#no_results').show();
				$('#no_battles').hide();
				return;
			} else {
				$('#no_results').hide();
				if (data.data[0].nickname.toUpperCase() == $('#srch-term').val().toUpperCase() || data.data.length == 1) {
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
			}
		});		
	}
	$("#"+server).addClass("active");
	$('.server_select').click(function(e){
		e.preventDefault();
		server = $(this).parent().attr('id');
		$(".server_li").each(function() {
			$(this).removeClass("active");
		});
		$(this).parent().addClass("active");
	});	
	$(".collapsable").click(function(e) {
		e.preventDefault();
		var caret = $(this).find(".glyphicon");
		if (caret.hasClass("glyphicon-triangle-right")) {
			$(this).find(".glyphicon").removeClass("glyphicon-triangle-right");
			$(this).find(".glyphicon").addClass("glyphicon-triangle-bottom");
		} else {
			$(this).find(".glyphicon").removeClass("glyphicon-triangle-bottom");
			$(this).find(".glyphicon").addClass("glyphicon-triangle-right");			
		}
		$(this).next("div").toggle();
	})
	$('#search_button').click(function(e){
		e.preventDefault();
		search();
	});
	$("#srch-term").on('keyup', function (e) {
		if (e.keyCode == 13) {
			search();
		}
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
		$("#" + src + "_tab").addClass("active");
	});
	populate();
} else {
	$("#login_or_search").show();
}
