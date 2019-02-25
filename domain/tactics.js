
var tactics = {}
tactics.pushTacticToDb = (db, user, room, name, uid, remove_old) => {
  //store a link to the tacticn in user data
  var date = Date.now();
  db.collection('users')
    .updateOne({
      _id: user.identity
    }, {
        $push: {
          tactics: {
            name: name,
            date: date,
            game: room_data[room].game,
            uid: uid,
            is_video: (typeof room_data[room].playing != 'undefined')
          }
        }
      }, { upsert: true }, function (err) {
        if (!err && remove_old) {
          try {
            db.collection('users').updateOne({ _id: user.identity }, { $pull: { tactics: { uid: uid, date: { $ne: date } } } }, { upsert: true });
          } catch (e) { } //probably doesn't exist
        }
      });
  //store the tactic in the stored_tactics list
  var data = JSON.parse(JSON.stringify(room_data[room]));
  data.name = name;
  delete data.userlist;
  delete data.lost_users;
  delete data.lost_identities;

  if (!data.creator) {
    data.creator = user.identity;
  }
  if (!data.users) data.users = {}
  data.users[user.identity] = "owner";

  data._id = uid;
  db.collection('stored_tactics').replaceOne({ _id: uid }, data, { upsert: true });

  if (!room_data[room].lost_identities[user.identity]) {
    room_data[room].lost_identities[user.identity] = { role: "owner" };
  }
  room_data[room].lost_identities[user.identity].tactic_name = name;
  room_data[room].lost_identities[user.identity].tactic_uid = uid;
}

tactics.storeTactic = function (user, room, name) {
  if (room_data[room] && user.identity) { //room exists, user is logged in
    if (room_data[room].lost_identities[user.identity]
      && room_data[room].lost_identities[user.identity].tactic_uid
      && room_data[room].lost_identities[user.identity].tactic_name
      && room_data[room].lost_identities[user.identity].tactic_name == name) {
      var uid = room_data[room].lost_identities[user.identity].tactic_uid;
      push_tactic_to_db(user, room, name, uid, true);
    } else {
      var uid = newUid();
      push_tactic_to_db(user, room, name, uid, false);
    }
  }
}

tactics.restoreTactic = function (user, uid, cb) {
  if (user.identity) {
    var query = { _id: user.identity };
    query['tactics.uid'] = uid;
    db.collection('users')
      .findOne(query, { 'tactics.$': 1, _id: 0 },
        function (err, header) {
          if (!err && header) {
            var id = header.tactics[0].uid;
            db.collection('stored_tactics')
              .findOne({ _id: id }, function (err2, result) {
                if (!err2 && result) {
                  var uid = newUid();
                  room_data[uid] = result;
                  room_data[uid].last_join = Date.now();
                  room_data[uid].userlist = {};
                  room_data[uid].lost_users = {};
                  room_data[uid].lost_identities = {};
                  room_data[uid].trackers = {};
                  room_data[uid].lost_users[user.id] = "owner";
                  if (user.identity) {
                    room_data[uid].lost_identities[user.identity] = {
                      role: "owner",
                      tactic_name: header.tactics[0].name,
                      tactic_uid: id
                    };
                  }
                  room_data[uid].locked = true;
                  cb(uid);
                } else {
                  cb(newUid());
                }
              });
          } else {
            cb(newUid());
          }
        });
  } else {
    cb(newUid());
  }
}

tactics.removeTactic = function (db, identity, id) {
  db.collection('users')
    .updateOne({
      _id: identity
    }, {
        $pull: { tactics: { uid: id } }
      });
};

tactics.renameTactic = function (db, user, uid, new_name) {
  db.collection('users')
    .findOne({
      _id: user.identity,
      tactics: {
        $elemMatch: { uid: uid }
      }
    }, { 'tactics.$': 1 },
      function (err, result) {
        if (!err && result && result.tactics) {
          var tactic = result.tactics[0];
          var old_name = tactic.name;
          tactic.name = new_name;
          db.collection('users')
            .updateOne({ _id: user.identity },
              { $push: { tactics: tactic } }, function (err) {
                if (!err) {
                  db.collection('users')
                    .updateOne({ _id: user.identity },
                      {
                        $pull: {
                          tactics: { uid: uid, name: old_name }
                        }
                      });
                }
              });
        }
      });
}

tactics.getTactics = function (db, identity, game, cb) {
  if (identity) {
    db.collection('users')
      .findOne({ _id: identity }, {
        'tactics': 1,
        'rooms': 1
      }, function (err, data) {
        if (!err) {
          if (data) {
            var tactics = [], rooms = [];
            if (data.tactics) {
              tactics = data.tactics;
            }
            if (data.rooms) {
              rooms = data.rooms;
            }
            cb(tactics, rooms);
          } else {
            cb([], []);
          }
        } else {
          cb([], []);
        }
      });
  } else {
    cb([], []);
  }
}