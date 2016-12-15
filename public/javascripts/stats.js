$.get("http://karellodewijk.github.io/other/expected_wn8.json", {}, function(expected) {
	$(document).ready(function() {
		var user = JSON.parse($("meta[name='user']").attr('content'));
		if (user.wg_account_id) {			
			function get_wg_data(page, fields, cb) {
				var link = "https://api.worldoftanks." + user.server + "/wot" + page;
				link += "application_id=0dbf88d72730ed7b843ab5934d8b3794";
				link += "&account_id=" + user.wg_account_id;
				if (fields && fields.length > 0) {
					link += "&fields=";
					for (var i in fields) {
						var field = fields[i];
						link += field + ",";
					}
					link = link.slice(0,-1);
				}
				console.log(link)
				$.get(link, {}, function(data) {
					console.log(data)
					cb(data.data[user.wg_account_id]);
				});
			}
			
			var tank_data, stats_data;
			$.when(
				$.Deferred(function() {
					var self = this;
					var link = "https://api.worldoftanks.eu/wot/encyclopedia/tanks/?application_id=0dbf88d72730ed7b843ab5934d8b3794&fields=tank_id,image_small,name,level,nation,type"
					$.get(link, {}, function(data) {
						tank_data = data;
						self.resolve();
					});
				}),
				$.Deferred(function() {
					var self = this;
					get_wg_data("/tanks/stats/?extra=random&", ["tank_id","random.battles","random.capture_points","random.damage_dealt","random.dropped_capture_points","random.wins","random.spotted","random.frags","random.survived_battles","random.xp"], function(data) {
						stats_data = data;
						self.resolve();
					});
				})
			).then(function() {
				var global_wn8 = 0;
				var total_battles = 0;
				for (var i in stats_data) {
					var tank = stats_data[i].random;
					tank.id = stats_data[i].tank_id;
					
					var rDAMAGE = tank.damage_dealt / tank.battles / expected[tank.id].expDamage;
					var rSPOT   = tank.spotted / tank.battles / expected[tank.id].expSpot;
					var rFRAG   = tank.frags / tank.battles / expected[tank.id].expFrag;
					var rDEF    = tank.dropped_capture_points / tank.battles / expected[tank.id].expDef;
					var rWIN    = (100 * (tank.wins)) / tank.battles / expected[tank.id].expWinRate;
										
					var rWINc    = Math.max(0,                     (rWIN    - 0.71) / (1 - 0.71) )
					var rDAMAGEc = Math.max(0,                     (rDAMAGE - 0.22) / (1 - 0.22) )
					var rFRAGc   = Math.max(0, Math.min(rDAMAGEc + 0.2, (rFRAG   - 0.12) / (1 - 0.12)))
					var rSPOTc   = Math.max(0, Math.min(rDAMAGEc + 0.1, (rSPOT   - 0.38) / (1 - 0.38)))
					var rDEFc    = Math.max(0, Math.min(rDAMAGEc + 0.1, (rDEF    - 0.10) / (1 - 0.10)))
					
					var WN8 = 980*rDAMAGEc + 210*rDAMAGEc*rFRAGc + 155*rFRAGc*rSPOTc + 75*rDEFc*rFRAGc + 145*Math.min(1.8,rWINc);
					
					if (!isNaN(WN8)) {
						global_wn8 += WN8 * tank.battles;
						total_battles += tank.battles;
					} else {
						console.log("Error unable to calculate wn8: ", tank);
					}

				}
				console.log("wn8: ", global_wn8/total_battles)
			});
		}
	});
});