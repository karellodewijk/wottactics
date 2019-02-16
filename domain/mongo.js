

function BuildMongoClient(){
  var db = connectToDatabase();
  createDatabase(db);
  cleanUpRoom();
}

function connectToDatabase() {
  const fs = require('fs');
  const secrets = JSON.parse(fs.readFileSync('secrets.txt', 'utf8'));
  var MongoClient = require('mongodb').MongoClient;
  const connection_string = secrets.mongodb_string;
  MongoClient.connect(connection_string, { reconnectTries: 99999999 }, (err, db) => {
    if (err) {
      throw err;
    }
    return db;
  });
}

function createDatabase(db) {
  db.createCollection('tactics');
  db.createCollection('users');
  db.createCollection('update_stats');
  db.collection('tactics').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 31622400 });
  db.createCollection('clans');
}

function cleanUpRoom(room) {
  setTimeout(function () {
    if (room_data[room]) {
      if (!io.sockets.adapter.rooms[room]) {
        if (Date.now() - room_data[room].last_join > 50000) {
          saveRoom(room, function () {
            delete room_data[room];
          });
        } else {
          cleanUpRoom(room); //try again
        }
      }
    }
  }, 60000);
}

function saveRoom(room, cb) {
  if (room_data[room]) {
    room_data[room]._id = room;
    room_data[room].lastAccessed = Date.now();
    db.collection('tactics').replaceOne({ _id: room }, room_data[room], { upsert: true }, function (err, result) {
      cb();
    });
  }
}