var user = JSON.parse($("meta[name='user']").attr('content'));
var clan = JSON.parse($("meta[name='clan']").attr('content'));

function get_server(id) {
	if(id > 3000000000){return "kr";}
	if(id > 2000000000){return "asia";}
	if(id > 1000000000){return "com";}
	if(id > 500000000){return "eu";}
	return "ru";
}

var server = get_server(clan);

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
	link += "&clan_id=" + clan._id;
	if (fields && fields.length > 0) {
		link += "&fields=";
		for (var i in fields) {
			var field = fields[i];
			link += field + ",";
		}
		link = link.slice(0,-1);
	}
	$.get(link, {}, function(data) {
		console.log(data)
		cb(data.data[clan._id]);
	});
}

function reset_ui() {
	$('#member_list_body').empty();
	$('#total_table_body').children().each(function() {
		$(this).children().slice(1).remove();
	})
}

function populate() {
	clan_id = clan._id;
	server = get_server(clan_id);
	
	download_clan_info();
	
	function download_clan_info() {
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
			})
		).then(function() {
			$( document ).ready(function() {
				$("#member_list").tablesorter({emptyTo: 'bottom', sortList: [[1,0],[0,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0]]}); 
				var metrics = ["battles", "damage_dealt", "spotted", "frags", "dropped_capture_points", "wins", "xp", "survived_battles", "capture_points", "tier"]
				
				var missing_members = [];
				for (var i in clan_data.members) {
					var member_id = clan_data.members[i].account_id;
					if (!clan.members[member_id]) {
						missing_members.push(member_id);
					}
				}
				
				function getQueryString(field, url) {				
					var href = url ? url : window.location.href;
					var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
					var string = reg.exec(href);
					return string ? string[1] : null;
				};

				var refresh = getQueryString("refresh");
								
				if (!refresh && missing_members.length > 0) {
					window.location = 'https://' + window.location.hostname + window.location.pathname + "?refresh=true";
					return;
				}
				
				$('#member_amount').text(clan_data.members.length);

				
				
				/*
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
				*/
				
			})	
		})
	}
}

$(document).ready(function() {
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
	populate();
});

