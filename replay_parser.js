var FileReader = require('filereader')

var reader = new FileReader();
reader.onload = function(e) {
  var text = reader.result;
  console.log("yay")
}

reader.readAsArrayBuffer("replay.wotreplay");
