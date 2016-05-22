# wot tactics

Hi, visit the page at www.wottactic.tk for more info.

If you want to run this yourself, make sure node.js, redis and mongodb are installed. 

1. Start a mongodb database with default settings ("mongod --dbpath some_path")
2. Start redis with default options ("redis-server dir some_path").
3. Install dependencies with npm ("npm install" in project directory)
4. Check the secrets.txt file, at the very least you need:
	- cookie secret: any random string
	- valid mongodb info
	- valid redis server info
	- socket_io_servers: localhost will do for testing locally. But if you are hosting it, it should contain your public hostname or ip. Or a comma seperated list of hosts/ips for load balancing.
5. run "node app.js" or "sudo node app.js" (sudo because default port 80 requires elevated privileges)

If you want facebook/google/twitter/wg login to work, you need to fill in the "secrets.txt" files with secrets/ids generated when you register the app at their respecive services. And you need to whitelist callback urls to http://hostname/auth/facebook/callback, http://hostname/auth/google/callback for fb and google login. secrets.txt also has option to run on different ports/connect to remote db and probably more.

The interesting parts of this project are the server ("app.js") and the clientside javascript that makes the editor tick, ("public/javascripts/planner.js").
