var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync('secrets.txt', 'utf8'));
var request = require("request");

MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://'+secrets.mongodb_string, function(err, db) {
	if(err) throw err;	
	db.authenticate(secrets.mongodb_username, secrets.mongodb_password, function(err, result) {	
		if(err) throw err;		
		db.createCollection('expected_wn8');		
		request("http://www.wnefficiency.net/exp/expected_tank_values_28.json", function(error, response, body) {
			var data = JSON.parse(body).data;		
			var new_data = {};
			for (var i in data) {
				var tank = data[i];
				new_data[tank.IDNum] = tank;
				tank._id = tank.IDNum;
				delete tank.IDNum;
				db.collection('expected_wn8').update({_id:tank._id}, tank, {upsert: true});
				new_data[tank._id] = tank;
				delete new_data[tank._id]._id;
			}
			console.log(JSON.stringify(new_data))
			fs.writeFile('views/expected_wn8.json', JSON.stringify(new_data));
			db.close();
		});
	});
});
