var clan = window.location.pathname.split('/');
clan = clan[clan.length - 1]

var user = JSON.parse($("meta[name='user']").attr('content'));
if (!clan) {
	if (user && user.clan_id) {
		clan = user.clan_id;
	}
}

var player;
if (user && user.wg_account_id && user.clan_id == clan) {
	player = user.wg_account_id;
}

var server = get_server(clan);

function get_server(id) {
	if(id > 3000000000){return "kr";}
	if(id > 2000000000){return "asia";}
	if(id > 1000000000){return "com";}
	if(id > 500000000){return "eu";}
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

function get_wg_data(page, fields, player, cb) {
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

function get_wg_clan_data(page, fields, cb) {
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
	$('#member_list_body').empty();
	$('#total_table_body').children().each(function() {
		$(this).children().slice(1).remove();
	})
}

function populate() {	
	server = get_server(clan);
	$('#no_results').hide();	
	$("#did_you_mean").hide();
	$("#login_or_search").hide();
	if (src != "all") {
		$(".last_100").each(function() { $(this).text($(this).text().replace("100 ", "10 ")); });		
		$(".last_100").each(function() { $(this).attr("title", $(this).attr("title").replace("100 ", "10 ")); });		
		$(".last_1000").each(function() { $(this).text($(this).text().replace("1,000 ", "100 ")); });		
		$(".last_1000").each(function() { $(this).attr("title", $(this).attr("title").replace("1,000 ", "100 ")); });		
		$(".last_5000").each(function() { $(this).text($(this).text().replace("5,000 ", "500 ")); });		
		$(".last_5000").each(function() { $(this).attr("title", $(this).attr("title").replace("5,000 ", "500 ")); });		
	} else {
		$(".last_100").each(function() { $(this).text($(this).text().replace("10 ", "100 ")); });		
		$(".last_100").each(function() { $(this).attr("title", $(this).attr("title").replace("10 ", "100 ")); });		
		$(".last_1000").each(function() { $(this).text($("#last_1000").text().replace("100 ", "1,000 ")); });		
		$(".last_1000").each(function() { $(this).attr("title", $(this).attr("title").replace("100 ", "1,000 ")); });		
		$(".last_5000").each(function() { $(this).text($("#last_5000").text().replace("500 ", "5,000 ")); });		
		$(".last_5000").each(function() { $(this).attr("title", $(this).attr("title").replace("500 ", "5,000 "));	});			
	}
	
	download_clan_stats();
	
	function download_clan_stats() {
		$.when(
			$.Deferred(function() {
				var self = this;
				get_wg_clan_data("/clans/info/?", ["members.account_id","members.account_name","members.role_i18n","members.role","name","tag","emblems.x64"], function(data) {
					clan_data = data;
					$('#srch-term').attr('placeholder', clan_data.tag);
					$('#clan_name').text("[" + clan_data.tag + "] " + clan_data.name);					
					$('#clan_logo').attr("src", clan_data.emblems.x64.wot)
					$('#clan_name').show();					
					self.resolve();
				});
			}),
			$.Deferred(function() {
				var self = this;
				var link = "/stats/clan/" + clan + "?field=" + src;
				$.get(link).done(function(data) {
					clan_stats = JSON.parse(data);
					self.resolve();
				}).fail(function() {
					clan_stats = {members:{}};
					self.resolve();
				})
			})
		).then(function() {
			$( document ).ready(function() {
				$("#member_list").tablesorter({emptyTo: 'bottom', sortList: [[1,0],[0,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0]]}); 
				var metrics = ["battles", "damage_dealt", "spotted", "frags", "dropped_capture_points", "wins", "xp", "survived_battles", "capture_points", "tier"]
				
				var missing_members = [];
				for (var i in clan_data.members) {
					var member_id = clan_data.members[i].account_id;
					var member_stats = clan_stats.members[member_id];
					if (!member_stats) {
						missing_members.push(member_id);
					}
				}
				
				//try to pull the member data from /stats/player/wids
				var still_missing_members = [];
				var deferreds = []
				for (var i in missing_members) {
					deferreds.push(
						$.Deferred(function() {
							var missing_member = missing_members[i];			
							var self = this;
							var link = "/stats/player/" + missing_member + "?field=" + src;
							$.get(link).done(function(data) {								
								data = JSON.parse(data);
								clan_stats.members[data._id] = data;
								self.resolve();
							}).fail(function() {
								still_missing_members.push(missing_member);
								self.resolve();
							});	
						})
					)
				}
				
				
				$.when.apply($,deferreds).then(function() {				
					//try to pull the member data from wg api
					var deferreds2 = []
					if (still_missing_members.length > 0) {
						stats_data = {};
						deferreds2.push($.Deferred(function() {
							var self = this;
							$.get("http://karellodewijk.github.io/other/expected_wn8_2.json", {}, function(data) {
								tank_expected = data;
								self.resolve();
							});
						}))
						deferreds2.push($.Deferred(function() {
							var self = this;
							$.get("http://karellodewijk.github.io/other/expected_wn9.json", {}, function(data) {
								tank_expected_wn9 = data;
								self.resolve();
							});
						}))
						deferreds2.push($.Deferred(function() {
							var self = this;
							var link = "https://api.worldoftanks." + server + "/wot/encyclopedia/tanks/?application_id=0dbf88d72730ed7b843ab5934d8b3794&fields=tank_id,image_small,name_i18n,level,nation,type"
							$.get(link, {}, function(data) {
								tank_data = data.data;
								self.resolve();
							});
						}))
						for (var i in still_missing_members) {
							deferreds2.push($.Deferred(function() {
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
								var player = still_missing_members[i];
								get_wg_data("/tanks/stats/?extra=random&", fields, player, function(data) {
									stats_data[player] = data;
									if (stats_data[player]) {
										stats_data[player] = stats_data[player].map(function(x) { x[wg_src].id = x.tank_id; return x; });
										if (src == "all") {
											for (var i in stats_data[player]) {
												stats_data[player][i][wn9_src].id = stats_data[player][i].tank_id;
											}
										}
									}								
									self.resolve();
								});
							}))		
						}
					}
					
					$.when.apply($,deferreds2).then(function() {
						if (still_missing_members.length > 0) {
							for (var i in still_missing_members) {
								var player = still_missing_members[i];
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
								var results = calculate_stats(tank_expected, tank_expected_wn9, stats_data[player], wg_src, wn9_src);
								var summary = {}
								summary["recent"] = results;
								clan_stats.members[player] = summary;
							}					
						}
						
						$('#member_amount').text(""+clan_data.members.length)
						
						var interesting_points, summary_points;
						if (src == "random" || src == "all") {
							interesting_points = ["100", "1000", "5000"];
							summary_points = ["recent", "100", "1000", "5000"];
						} else {
							interesting_points = ["10", "100", "500"];
							summary_points = ["recent", "10", "100", "500"];
						}
						
						var role_dict = {"commander":"a", "executive_officer":"b", "quartermaster":"c", "personnel_officer":"d", "combat_officer":"e", "intelligence_officer":"f", "recruitment_officer":"g", 'junior_officer':"h", "private":"i", "recruit":"j", "reservist":"k"};
							
						var global_average = {};
												
						for (var i in summary_points) {
							var point = summary_points[i];		
							global_average[point] = {nr_of_players:0, wn8:0, wn9:0, wn8_delta:0, wn9_delta:0, nr_of_wn8:0, nr_of_wn9:0, battle_diff:0}
													 
							for (var k in metrics) {
								global_average[point][metrics[k]] = 0;
								global_average[point][metrics[k]+"_delta"] = 0;
							}
													 
							for (var j in clan_data.members) {
								var member_id = clan_data.members[j].account_id;
								var member_stats = clan_stats.members[member_id];
								if (member_stats && member_stats[point] && Object.keys(member_stats[point]).length > 1 && member_stats[point].battles > 0) {									
									var recent_average = calculate_average(member_stats[point]);
									for (var k in metrics) {
										global_average[point][metrics[k]] += recent_average[metrics[k]];
									}									
									global_average[point].wn8 += member_stats[point].wn8;
									global_average[point].wn9 += member_stats[point].wn9;
									global_average[point].nr_of_players += 1;
									
									if (point != "recent") {
										global_average[point].battle_diff += member_stats["recent"].battles - member_stats[point].battles;
										for (var k in metrics) {
											global_average[point][metrics[k]+"_delta"] += (member_stats["recent"][metrics[k]] - member_stats[point][metrics[k]]) / (member_stats["recent"].battles - member_stats[point].battles);
										}
										if (member_stats[point].wn8) {
											global_average[point].wn8_delta += (member_stats["recent"].battles * member_stats["recent"].wn8 - member_stats[point].battles * member_stats[point].wn8) / (member_stats["recent"].battles - member_stats[point].battles);
											global_average[point].nr_of_wn8 += 1;
										}
										if (member_stats[point].wn9) {
											global_average[point].wn9_delta += (member_stats["recent"].battles * member_stats["recent"].wn9 - member_stats[point].battles * member_stats[point].wn9) / (member_stats["recent"].battles -   member_stats[point].battles);
											global_average[point].nr_of_wn9 += 1;
										}
									}
								}
							}

							for (var k in metrics) {
								global_average[point][metrics[k]] /= global_average[point].nr_of_players;
							}
							
							global_average[point].battle_diff /= global_average[point].nr_of_players;
							global_average[point].wn8 /= global_average[point].nr_of_players;
							global_average[point].wn9 /= global_average[point].nr_of_players;
							
							if (point != "recent") {
								for (var k in metrics) {
									global_average[point][metrics[k]+"_delta"] /= global_average[point].nr_of_players;
								}
								global_average[point].wn8_delta /= global_average[point].nr_of_wn8;
								global_average[point].wn9_delta /= global_average[point].nr_of_wn9;
							}
							
						}
							
						for (var i in clan_data.members) {
							var member = clan_data.members[i];
							var member_stats = clan_stats.members[member.account_id];
							
							var role_rank = "z";
							if (role_dict.hasOwnProperty(member.role)) {
								var role_rank = role_dict[member.role];
							}

							var node = "<tr>";
							node += "<td style='text-align:left; padding-left:5px'><a href='/player/" + member.account_id + "'>" + member.account_name + "</a></td>";
							node += "<td><span hidden>" + role_rank + "</span>" + member.role + "</td>";
							//node += "<td><span hidden>" + role_rank + "</span>" + member.role_i18n + "</td>";

							if (member_stats && member_stats['recent']) {
								var wr = member_stats['recent'].wins/member_stats['recent'].battles;

								node += "<td>" + round(member_stats['recent'].battles, 0) + "</td>";
								node += "<td style='color:#ffffff; background-color:" + wr_color(wr) + "'>" + round(100*wr, 1) + "%</td>";
								node += "<td data-toggle='tooltip' title='" + round(member_stats['recent'].wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(member_stats['recent'].wn8) + "'>" + round(member_stats['recent'].wn8, 0) + "</td>";
								node += "<td data-toggle='tooltip' title='" + round(member_stats['recent'].wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(member_stats['recent'].wn9) + "'>" + round(member_stats['recent'].wn9, 0) + "</td>";
																
								if (member_stats[interesting_points[1]] && Object.keys(member_stats[interesting_points[1]]).length > 0) {
									var point = interesting_points[1];
									var old_wr = member_stats[interesting_points[1]].wins/member_stats[interesting_points[1]].battles;									
									var wr_interval = (member_stats["recent"].battles * wr - member_stats[point].battles * old_wr) / (member_stats["recent"].battles - member_stats[point].battles);
									var point = interesting_points[1];
									var wn8 = (member_stats["recent"].battles * member_stats["recent"].wn8 - member_stats[point].battles * member_stats[point].wn8) / (member_stats["recent"].battles - member_stats[point].battles);
									var wn9 = (member_stats["recent"].battles * member_stats["recent"].wn9 - member_stats[point].battles * member_stats[point].wn9) / (member_stats["recent"].battles - member_stats[point].battles);									
									node += "<td style='color:#ffffff; background-color:" + wr_color(wr_interval) + "'>" + round(100*wr_interval, 1) + "%</td>";
									node += "<td data-toggle='tooltip' title='" + round(wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(wn8) + "'>" + round(wn8, 0) + "</td>";
									node += "<td data-toggle='tooltip' title='" + round(wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(wn9) + "'>" + round(wn9, 0) + "</td>";	
								} else {
									node += "<td></td><td></td><td></td>"
								}
							} else {
								node += "<td></td><td></td><td></td><td></td><td></td><td></td>"
							}
							
							node += "</tr>";
							$("#member_list_body").append(node);
							
						}				
						$("#member_list").trigger("update"); 
							
						var average = global_average["recent"];
						var kd = average.frags / (1 - average.survived_battles);
						
						$("#wr_col").append("<td data-toggle='tooltip' title='" + round(100*average.wins, 4) + "' style='color:#ffffff; background-color:" + wr_color(average.wins) + "'>" + round(100*average.wins, 2) + "%</td>");
						$("#wn8_col").append("<td data-toggle='tooltip' title='" + round(average.wn8, 2) + "' style='color:#ffffff; background-color:" + wn8_color(average.wn8) + "'>" + round(average.wn8, 0) + "</td>");
						$("#wn9_col").append("<td data-toggle='tooltip' title='" + round(average.wn9, 2) + "' style='color:#ffffff; background-color:" + wn9_color(average.wn9) + "'>" + round(average.wn9, 0) + "</td>");
						$("#battles_col").append("<td>" + round(average.battles, 0) + "</td>");
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
							if (now.nr_of_players == 0) {
								add_msg_column("Coming soon")
								return;
							}
							
							var results = {}
							results.battles = now.battles - then.battles;
							
							for (var k in metrics) {
								results[metrics[k]] = now[metrics[k]+"_delta"];
							}
							
							var average_diff = {}
							average_diff.damage_dealt = results.damage_dealt - then.damage_dealt;
							average_diff.spotted = results.spotted - then.spotted;
							average_diff.frags = results.frags - then.frags;
							average_diff.dropped_capture_points = results.dropped_capture_points - then.dropped_capture_points;
							average_diff.capture_points = results.capture_points - then.capture_points;
							average_diff.xp = results.xp - then.xp;
							average_diff.tier = results.tier - then.tier;
							average_diff.survived_battles = results.survived_battles - then.survived_battles;
							average_diff.wins = results.wins - then.wins;	
							average_diff.wn8 = now.wn8_delta - then.wn8;
							average_diff.wn9 = now.wn9_delta - then.wn9;	
							
							var old_kd = then.frags / (1 - then.survived_battles)
							var kd = results.frags / (1 - results.survived_battles)
							var kd_diff = kd - old_kd;
							
							function sign(val) {
								return val >= 0 ? "+" : ""; 
							}
							function sign_col(val) {
								return val >= 0 ? "#00bb00" : "#bb0000"; 
							}
							
							$("#wr_col").append("<td data-toggle='tooltip' title='" + round(100*results.wins, 4) + "' style='color:#ffffff; background-color:" + wr_color(results.wins) + "'>" + round(100*results.wins, 2) + "% (<span style='color: " + sign_col(average_diff.wins) + "'>" + sign(average_diff.wins) + round(100*average_diff.wins,2) + "%</span>)</td>");
							$("#wn8_col").append("<td data-toggle='tooltip' title='" + round(now.wn8_delta, 2) + "' style='color:#ffffff; background-color:" + wn8_color(now.wn8_delta) + "'>" + round(now.wn8_delta, 0) + " (<span style='color: " + sign_col(average_diff.wn8) + "'>" + sign(average_diff.wn8) + round(average_diff.wn8,0) + "</span>)</td>");
							$("#wn9_col").append("<td data-toggle='tooltip' title='" + round(now.wn9_delta, 2) + "' style='color:#ffffff; background-color:" + wn9_color(now.wn9_delta) + "'>" + round(now.wn9_delta, 0) + " (<span style='color: " + sign_col(average_diff.wn9) + "'>" + sign(average_diff.wn9) + round(average_diff.wn9,0) + "</span>)</td>");
							$("#battles_col").append("<td>" + round(now.battle_diff, 0) + "</td>");
							$("#dam_col").append("<td data-toggle='tooltip' title='" + round(results.damage_dealt, 2) + "'>" + round(results.damage_dealt, 0) + " (<span style='color: " + sign_col(average_diff.damage_dealt) + "'>" + sign(average_diff.damage_dealt) + round(average_diff.damage_dealt,0) + "</span>)</td>");
							$("#kills_col").append("<td data-toggle='tooltip' title='" + round(results.frags, 4) + "'>" + round(results.frags, 2) + " (<span style='color: " + sign_col(average_diff.frags) + "'>" + sign(average_diff.frags) + round(average_diff.frags,2) + "</span>)</td>");
							$("#surv_col").append("<td data-toggle='tooltip' title='" + round(100*results.survived_battles, 4) + "'>" + round(100*results.survived_battles, 2) + "% (<span style='color: " + sign_col(average_diff.survived_battles) + "'>" + sign(average_diff.survived_battles) + round(100*average_diff.survived_battles,0) + "%</span>)</td>");
							$("#kd_col").append("<td data-toggle='tooltip' title='" + round(kd, 4) + "'>" + round(kd, 2) + " (<span style='color: " + sign_col(kd_diff) + "'>" + sign(kd_diff) + round(kd_diff,2) + "</span>)</td>");
							$("#def_col").append("<td data-toggle='tooltip' title='" + round(results.dropped_capture_points, 4) + "'>" + round(results.dropped_capture_points, 2) + " (<span style='color: " + sign_col(average_diff.dropped_capture_points) + "'>" + sign(average_diff.dropped_capture_points) + round(average_diff.dropped_capture_points,2) + "</span>)</td>");
							$("#cap_col").append("<td data-toggle='tooltip' title='" + round(results.capture_points, 4) + "'>" + round(results.capture_points, 2) + " (<span style='color: " + sign_col(average_diff.capture_points) + "'>" + sign(average_diff.capture_points) + round(average_diff.capture_points,2) + "</span>)</td>");
							$("#xp_col").append("<td data-toggle='tooltip' title='" + round(results.xp, 2) + "'>" + round(results.xp, 0) + " (<span style='color: " + sign_col(average_diff.xp) + "'>" + sign(average_diff.xp) + round(average_diff.xp,2) + "</span>)</td>");
							$("#tier_col").append("<td data-toggle='tooltip' title='" + round(results.tier, 2) + "'>" + round(results.tier, 1) + " (<span style='color: " + sign_col(average_diff.tier) + "'>" + sign(average_diff.tier) + round(average_diff.tier,2) + "</span>)</td>");
							$("#spotted_col").append("<td data-toggle='tooltip' title='" + round(results.spotted, 2) + "'>" + round(results.spotted, 2) + " (<span style='color: " + sign_col(average_diff.spotted) + "'>" + sign(average_diff.spotted) + round(average_diff.spotted,2) + "</span>)</td>");
						}

						for (var i in interesting_points) {
							var point = interesting_points[i];
							add_column(global_average[point], global_average["recent"]);
						}
					})
					
				})
				
				return;
			});
		});
		
		//do this last, if browser don't support it, well we crag here :)
		if (src == "all") {
			window.history.replaceState({}, document.title, "/clan/" + clan);
		} else {
			window.history.replaceState({}, document.title, "/clan/" + clan + "?src=" + src);
		}					
	}
}

$(document).ready(function() {
	function search() {
		var link = 'https://api.worldoftanks.' + server + '/wgn/clans/list/?limit=20&application_id=0dbf88d72730ed7b843ab5934d8b3794&fields=clan_id,name,tag&game=wot&search=' + $('#srch-term').val();
		$.get(link, {}, function(data) {
			if (data.data.length == 0) {
				$('#no_results').show();
				$('#no_battles').hide();
				return;
			} else {
				$('#no_results').hide();
				if (data.data[0].name.toUpperCase() == $('#srch-term').val().toUpperCase() || data.data[0].tag.toUpperCase() == $('#srch-term').val().toUpperCase() || data.data.length == 1) {
					clan = data.data[0].clan_id
					reset_ui();
					populate();
				} else {
					var alternatives = "";
					for (var i = 0; i < Math.min(20, data.data.length); i++) {
						alternatives += "<a href='/clan/"+ data.data[i].clan_id + "'>" + data.data[i].tag + "</a>, "
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

if (clan && server) {
	$(document).ready(function() {
		$("#" + src + "_tab").addClass("active");
	});
	populate();
} else {
	$("#login_or_search").show();
}
