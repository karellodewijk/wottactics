var fs = require('fs');
var secrets = JSON.parse(fs.readFileSync('secrets.txt', 'utf8'));

MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://'+secrets.mongodb_string, function(err, db) {
	if(err) throw err;	
	db.authenticate(secrets.mongodb_username, secrets.mongodb_password, function(err, result) {	
		if(err) throw err;	
		
		db.createCollection('verhicles');
		request("http://www.wnefficiency.net/exp/expected_tank_values_28.json", function(error, response, body) {
			console.log(body.data);
		});
	});
});
