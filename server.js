// server.js
var express = require('express');
var bodyParser = require('body-parser');

var request = require('request');
var cheerio = require('cheerio');

var app = express();

app.use(express.static('public'));
app.use(bodyParser.json());

// Use this helper method to send the datapoint back to Akrasia once you've got it
var AKRASIA_BASE_URL = 'https://akr.asia'
var akrasiaCallback = function(session, result) {
  request.post({
    url: AKRASIA_BASE_URL + '/integrations/callback',
    body: {
      'session': session,
      'result': result // valid keys: value, timestamp, daystamp, comment, requestid
    },
    json: true
  })
};

app.post("/fetch", function(req, res) {
  console.log('Fetch called.');
  // Get the session and user options from Akrasia's request
  var callbackSession = req.body.session;
  var userOptions = req.body.user_options;
  
  res.send({'result': 'started'});
  
  // Get the user's forum name (set and stored through Akrasia) from the passed options
  var leetUsername = userOptions.leetcode_username;
  
  // Request the user info from Leetcode,
  //  parse out the number of solved problems (using jQuery-like selectors with Cheerio),
  //  and submit the datapoint to Akrasia
  request('https://leetcode.com/' + leetUsername + '/', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body);
      var panel = $('div.row > div.col-sm-5.col-md-4 > div.panel').eq(2);
      var item = $(panel).children('ul.list-group').children('.list-group-item').eq(0);
      var text = $(item).children('span').eq(0).text();
      var solvedProblemsCount = parseInt(text.split(' / ')[0]);
      
      // Create the datapoint with value (and optional comment)
      var result = {
        value: solvedProblemsCount,
        comment: 'via Akrasia integration: Leetcode Problems Solved'
      };

      // Send the datapoint to Akrasia
      akrasiaCallback(callbackSession, result);

      // Not necessary, but helps you debug in Glitch!
      console.log(result);
    }
  });
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
