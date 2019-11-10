var redis = require('redis');
const fs = require('fs');
var secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
module.exports = {
  buildClient: (errorCallBackFunction) => {
    var secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
    var redisClient = redis.createClient(secrets.redis_options);
    return redisClient;
  },
  authenticateRedis: (redisClient, errorFunction) => {
    redisClient.auth(secrets.redis_options.pass, (e) => {
      if (e) {
        console.error(e);
        return;
      }
    });
  }
};