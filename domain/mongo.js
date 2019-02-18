var mongo = {};

mongo.createCollections = (db) => {
	db.createCollection('tactics');
	db.createCollection('users');
	db.createCollection('update_stats');
	db.collection('tactics').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 31622400 });
	db.createCollection('clans');
}

mongo.cleanUpRoom = (db, room) => {
  setTimeout(function () {
    if (room_data[room]) {
      if (!io.sockets.adapter.rooms[room]) {
        if (Date.now() - room_data[room].last_join > 50000) {
          saveRoom(db, room, function () {
            delete room_data[room];
          });
        } else {
          cleanUpRoom(db, room); //try again
        }
      }
    }
  }, 60000);
};

var saveRoom = (db, room, cb) => {
  if (room_data[room]) {
    room_data[room]._id = room;
    room_data[room].lastAccessed = Date.now();
    db.collection('tactics').replaceOne({ _id: room }, room_data[room], { upsert: true }, function (err, result) {
      cb();
    });
  }
};

module.exports = mongo;