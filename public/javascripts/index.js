var game = $('meta[name=game]').attr("content");

var general_quotes = [
	'“If you know the enemy and know yourself, you need not fear the result of a hundred battles.” ― Sun Tzu, The Art of War',
	'“Invincibility lies in the defence; the possibility of victory in the attack.” ― Sun Tzu, The Art of War"',
	'“Always forgive your enemies; nothing annoys them so much.” ― Oscar Wilde',
	'“Never interrupt your enemy when he is making a mistake.” ― Napoléon Bonaparte ',
	'“Never open the door to a lesser evil, for other and greater ones invariably slink in after it.” ― Baltasar Gracián, The Art of Worldly Wisdom ',
	'“If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.” ― Sun Tzu, The Art of War ',
	'“Study the past if you would define the future.” ― Confucius',
	'“Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt.” ― Sun Tzu, The Art of War ',
	'“Victorious warriors win first and then go to war, while defeated warriors go to war first and then seek to win” ― Sun Tzu, The Art of War ',
	'“A wise man gets more use from his enemies than a fool from his friends.” ― Baltasar Gracián, The Art of Worldly Wisdom ',
	'“All warfare is based on deception. Hence, when we are able to attack, we must seem unable; when using our forces, we must appear inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near.” ― Sun Tzu, The Art of War ',
	'“If your enemy is secure at all points, be prepared for him. If he is in superior strength, evade him. If your opponent is temperamental, seek to irritate him. Pretend to be weak, that he may grow arrogant. If he is taking his ease, give him no rest. If his forces are united, separate them. If sovereign and subject are in accord, put division between them. Attack him where he is unprepared, appear where you are not expected .” ― Sun Tzu, The Art of War ',
	'“In the midst of chaos, there is also opportunity” ― Sun Tzu, The Art of War',
	'“Take time to deliberate, but when the time for action comes, stop thinking and go in.” ― Napoléon Bonaparte ',
	'“In preparing for battle I have always found that plans are useless, but planning is indispensable.” ― Dwight D. Eisenhower ',
	'“When you surround an army, leave an outlet free. Do not press a desperate foe too hard.” ― Sun Tzu, The Art of War ',
	'“Don\'t hit at all if it is honorably possible to avoid hitting; but never hit soft!” ― Theodore Roosevelt ',
	'“To win one hundred victories in one hundred battles is not the acme of skill. To subdue the enemy without fighting is the acme of skill” ― Sun Tzu, The Art of War ',
	'“who wishes to fight must first count the cost” ― Sun Tzu, The Art of War ',
	'“Rouse him, and learn the principle of his activity or inactivity. Force him to reveal himself, so as to find out his vulnerable spots.” ― Sun Tzu, The Art of War ',
	'“There are roads which must not be followed, armies which must not be attacked, towns which must not be besieged, positions which must not be contested, commands which must not be obeyed.” ― Sun Tzu, The Art of War ',
	'“If your opponent is of choleric temper,  seek to irritate him.  Pretend to be weak, that he may grow arrogant.” ― Sun Tzu, The Art of War ',
	'“The whole secret lies in confusing the enemy, so that he cannot fathom our real intent.” ― Sun Tzu, The Art of War ',
	'HINT: You can use the scrollwheel to zoom in on maps and the right or middle mouse button to pan around.',
	'HINT: You can hold shift to draw multi-part lines',
	'HINT: You can hold the left mouse button to ping repeatedly',
	'HINT: You can use keyboard shortcuts to cut(ctr+x), copy(ctr+c), paste(ctr+v), delete(del), undo(ctrl-z), redo (ctr-y) while in any mode'
];

var tank_quotes = ['“Time for some suprise butt sex, best kind of butt sex” ― The Mighty Jingles'];

var ship_quotes = ['“There is no such thing as a friendly torpedo” ― The Mighty Jingles'];

$(document).ready(function() {
	var quotes;
	if (game == "wows") {
		quotes = general_quotes.concat(ship_quotes);
	} else {
		quotes = general_quotes.concat(tank_quotes);
	}

	$("#quote").text(quotes[Math.floor(Math.random() * quotes.length)]);
});