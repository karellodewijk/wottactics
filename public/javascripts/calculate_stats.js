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

function calculate_stats(tank_expected_wn8, tank_expected_wn8_wn9, stats_data, src, wn9_src) {
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
			if (tanks[i].random.battles > 0) { // <-- code was modified here
				var exp = expvals[tanks[i].tank_id];
				if (!exp || exp.type == "SPG") continue;	// don't use SPGs & missing tanks
				var wn9 = CalcWN9Tank(tanks[i], expvals, false);
				var tankentry = { wn9:wn9, bat:tanks[i].random.battles, exp:exp };
				tanklist.push(tankentry);
				totbat += tankentry.bat;
			}
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
	
	for (var i in stats_data) {
		var tank = stats_data[i];
		if (tank_expected_wn8_wn9[tank.tank_id]) {
			var wn9 = calcWN9T(tank, tank_expected_wn8_wn9, true); 
			if (!isNaN(wn9)) {
				if (!achieved_totals.tanks[tank.id]) achieved_totals.tanks[tank.tank_id] = tank[src];
				achieved_totals.tanks[tank.tank_id].wn9 = wn9;
			}
			
		}
	}
				
	for (var i in stats_data) {
		var tank = stats_data[i][src];					

		if (tank_expected_wn8[tank.id]) {
			var expected = JSON.parse(JSON.stringify(tank_expected_wn8[tank.id]));
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
		
		if (tank && tank.battles > 0) {			
			achieved_totals.xp += tank.battle_avg_xp * tank.battles;
			achieved_totals.survived_battles += tank.survived_battles;						
			achieved_totals.capture_points += tank.capture_points;
			
			if (tank_data[tank.id]) {
				if (!achieved_totals.tanks[tank.id]) achieved_totals.tanks[tank.id] = tank;
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
	achieved_totals.wn9 = calcWN9A(stats_data, tank_expected_wn8_wn9)
										
	return achieved_totals;
}

function calculate_average(data) {
	var average = {}
	average.damage_dealt = data.damage_dealt / data.battles;
	average.spotted = data.spotted / data.battles;
	average.frags = data.frags / data.battles;
	average.dropped_capture_points = data.dropped_capture_points / data.battles;
	average.capture_points = data.capture_points / data.battles;
	average.xp = data.xp / data.battles;
	average.tier = data.tier / data.battles;
	average.survived_battles = data.survived_battles / data.battles;
	average.wins = data.wins / data.battles;
	average.draws = data.draws / data.battles;
	average.shots = data.shots / data.battles;
	average.hits = data.hits / data.battles;
	average.pens = data.pens / data.battles;
	average.battles = data.battles;
	return average;
}
