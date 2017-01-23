db.users.find({}).forEach(function (doc) { 
	function isNormalInteger(str) {
		var n = Math.floor(Number(str));
		return String(n) === str && n >= 0;
	}
	var old_id = doc._id;
	if (doc._id.constructor === String) {
		var splitted = doc._id.split("-");
		var wg_id = splitted[0];
		var identity = "wg-" + wg_id;
		var name = splitted[1];
		doc._id = identity;	
		if (isNormalInteger(wg_id) && splitted.length > 1) {
			var data = db.users.findOne({_id:identity});
			if (data) {
				if (doc.tactics) {
					if (!data.tactics) {
						data.tactics = doc.tactics;
					} else {
						for (var i in doc.tactics) {
							data.tactics.push(doc.tactics[i])
						}
					}
				}
				data._id = identity;
				db.users.update({_id:identity}, data, {upsert:true});
			} else {
				db.users.update({_id:identity}, doc, {upsert:true});
			}
			db.users.remove({_id:old_id});
		}
	}
});

db.tactics.find({}).forEach(function (doc) { 
	function isNormalInteger(str) {
		var n = Math.floor(Number(str));
		return String(n) === str && n >= 0;
	}
	var modified = false;
	for (var i in doc.lost_identities) {
		var splitted = i.split("-");
		var wg_id = splitted[0];
		var identity = "wg-" + splitted[0];
		if (isNormalInteger(wg_id) && splitted.length > 1) {
			doc.lost_identities[identity] = doc.lost_identities[i];
			delete doc.lost_identities[i];
			modified = true;
		}
	}
	if (modified) {
		db.tactics.update({_id:doc._id},doc,{upsert:true});
	}
});

