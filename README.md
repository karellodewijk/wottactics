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
- Rename secrets.txt.template to secrets.txt and open it, at the very least you need to fill in:
	- cookie secret: some random string
	- valid mongodb info from step 1
	- valid redis server info from step 2
- run "node app.js" or "sudo node app.js" (sudo because default port 80 requires elevated privileges)



Login options:

For wg login you need to fill in a valid WG api key, doesn't matter which region

If you want facebook/google/twitter/battlesnet/vk/steam login to work, you need to fill in the "secrets.txt" files with secrets/ids generated when you register the app at their respecive services.

Also for facebook/google/battlesnet/vk you'll need to whitelist the redirect uri's: http://hostname/auth/facebook/callback, http://hostname/auth/google/callback, http://hostname/auth/vk/callback, http://hostname/auth/battlenet/callback.


Other optional options:

static_host: This is for using a CDN. Upload the contents of the public map to your cdn and fill in a the full url here e.g.: "static_host": "http://server/public". Clients will now prefer to load all statics files (icons/js/stylesheets/maps) from that address. 

ga_id: Your google analytics unique id if you want to enable google analytics tracking.

socket_io_servers: If you run more than 1 instance of the node app it should contain a comma seperated list of public ips/hostnames that should be identical for each instance. When connecting to a tactic it will select a server to connect to based on the a hash of the room id. e.g.: "server1.myhost.com, server2.myhost.com" or even "myhost.com:3000, myhost.com:3001" when running multiple instances on the same host.

Caveats:

Use the stable/lts node releases (v6) of node.

If you are doing some reverse proxy/port redirection wizardry with nginx for example, make sure it properly handles websockets.

