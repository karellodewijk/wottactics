# wot tactics

Hi, visit the page at www.wottactic.eu for this code in action..

The interesting parts of this project are the server ("app.js") and the clientside javascript that makes the editor tick, ("public/javascripts/planner.js").

To get started quickly on both windows and linux:

- Install mongo
- Open a mongo shell and run:

use wottactics

db.createUser(
   {
     user: "username",
     pwd: "password",
     roles: [ "readWrite", "dbAdmin" ]
   }
)

- install redis
- install nodejs, stable branch
- Install dependencies with npm ("npm install" in project directory)
- Check the secrets.txt file, at the very least you need:
	- cookie secret: any random string
	- valid mongodb info from step 1
	- valid redis server info from step 2
	- socket_io_servers: localhost will do for testing locally. But if you are hosting it, it should contain your public hostname or ip. Or a comma seperated list of hosts/ips for load balancing. e.g.: "socket_io_servers": "server1.wottactic.eu:80,server2.wottactic.eu:80" (IMPORTANT)
- run "node app.js" or "sudo node app.js" (sudo because default port 80 requires elevated privileges)




Login options:

WG login should work out of the box.

If you want facebook/google/twitter/battlesnet/vk/steam login to work, you need to fill in the "secrets.txt" files with secrets/ids generated when you register the app at their respecive services. Also for facebook/google/battlesnet/vk you'll need to whitelist the redirect uri's: http://hostname/auth/facebook/callback, http://hostname/auth/google/callback, http://hostname/auth/vk/callback, http://hostname/auth/battlenet/callback.


Other optional options:

static_host: This is for using a CDN. Upload the contents of the public map to your cdn and fill in a the full url here e.g.: "static_host": "http://some_address/public". Clients will now prefer to load all statics files (icons/js/stylesheets/maps) from that address. 

ga_id: Your google analytics unique id if you want to enable google analytics tracking.


Caveats:

Use the stable/lts node releases (v4), some of the libraries have issues with (v6).

Putting a public address for your host under socket_io_servers in secrets.txt is not optional. The client will try to open a websocket to this address, it won't work if this fails. I also recommends you make it an url and not an ip address as some clients security configurations do not like it when you connect to an ip without a prior dns request.

If you are doing some port redirection wizardry with nginx for example. Make sure it properly handles incoming websockets.

