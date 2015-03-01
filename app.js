var wolfram = require('wolfram').createClient("8U7YVL-3364E95GXU")
var express = require('express');
var fs = require('fs');
var app = express();
var privateKey  = fs.readFileSync('nicam.key', 'utf8');
var certificate = fs.readFileSync('nicam.cert', 'utf8');
var giphy = require( 'giphy' )( 'dc6zaTOxFJmzC' );

var credentials = {key: privateKey, cert: certificate};
var http = require('http').Server(app);
var https = require('https').Server(credentials, app);
var io = require('socket.io')(https);

var giphyResults = 20;

app.set('port', (process.env.PORT || 5000));

app.use("/", express.static(__dirname + '/'));

if (process.env.NODE_ENV === 'local') {
  https.listen(app.get('port'), function() {
    console.log('listening on *:'+ app.get('port'));
  });
} else {
  http.listen(app.get('port'), function() {
    console.log('listening on *:'+ app.get('port'));
  });
}

function askWolfram(query, callback) {
  wolfram.query(query, callback);
}

function parseWolfram(socket) {
  return function (err, result) {
    if (result.length === 0) {
      socket.emit('response', "I couldn't find an answer for that.");
    }
    if (result && result[1] && result[1]['subpods'] && result[1]['subpods'][0]) {
      if (result[1]['subpods'][0].value.trim().length === 0) {
        socket.emit('response', "I couldn't find an answer for that.");
      } else {
        socket.emit('response', responseText(result[1]['subpods'][0].value));
      }
    }
  }
}

function parseGiphy(socket) {
  return function (err, results, res) {
    var idx = Math.floor((Math.random() * results.data.length) + 1);
    socket.emit('gif', results.data[idx].id);
  }
}

var unitReplacements = {
  "km": "(kilometers)",
  "CHF": "(Swiss francs)",
  "m^3": "(cubic meters)",
}

function responseText(text) {
  Object.getOwnPropertyNames(unitReplacements).forEach(function(val, idx, array) {
    if (text.indexOf(val) > -1 && text.indexOf(unitReplacements[val])) {
      text = text.replace(unitReplacements[val], '');
    }
  });
  return text;
}

io.on('connection', function(socket) {
  socket.on('message', function(msg) {
    var giphyCheck = /show me (a |an )?.*/i
    var giphyRep = /show me (a |an )?/i
    if (giphyCheck.test(msg)) {
      giphy.search({q: msg.replace(giphyRep.exec(msg)[0], '').trim(),limit: giphyResults}, parseGiphy(socket));
    } else {
      askWolfram(msg, parseWolfram(socket));
    }
  });
});