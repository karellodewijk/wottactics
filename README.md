# wot tactics

Hi, visit the page at www.wottactic.tk for more info.

If you want to run this yourself, install node.js, redis and mongodb. 

1. Start a mongodb database with default settings ("mongod --dbpath some_path")
2. Start redis.
3. install dependencies with npm ("npm install" in project directory)
4. run "node start" or "sudo node start" (sudo because default port 80 requires elevated privileges)

If you want facebook/google/twitter/wg login to work, you need to fill in the secret.txt files with secrets/ids generated when you register the app at their respecive services.

The interesting parts of this project are the server ("app.js") and the clientside javascript that makes the editor tick, ("public/javascripts/planner.js").
