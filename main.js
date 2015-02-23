//var App = require('./App');
//
//var app = new App();
//app.run();

//httpsRequest.hostname = 'go.dosa.northwestern.edu';
//httpsRequest.path = '/nuhelpapi/api/bluelights';

var envStore = {};
if (typeof sessionStorage === 'object')         envStore = sessionStorage;
if (typeof process === 'object' && process.env) envStore = process.env;

var user       = envStore.user     || null;
var password   = envStore.password || null;

var HttpsRequest = this.BrowserHttpsRequest || require('./Services/HttpsRequest/IojsHttpsRequest');

// ok =========================================================================

var httpsRequest = HttpsRequest.make({
    method:   'GET',
    hostname: 'nusoa.northwestern.edu',
    path:     '/WCAS_SOA_POC/v1/pets/2',
    user:     user,
    password: password,
    timeout:  3000,
    headers:  {Accept: 'application/json'},
});

var gettingRequest = httpsRequest.send();

// setTimeout( function() {
//    gettingRequest.abort();
// }, 150);

gettingRequest
    // .then(console.log.bind(console, 'started'))
    .then(log)
    .catch(log)
    .then( function() {
        clearTimeout(waitingAround);
    });


var secondsToWaitAround = 2;
var waitingAround = setTimeout( function() {
    log('this is taking too long, let us cancel the request');
    gettingRequest.cancel();
    // if no more timers, script will exit;
}, secondsToWaitAround * 1000);

// ok =========================================================================
// helpers

var log = function(value) {
    console.log(value);
    return value;
};

var dir = function(value) {
    console.dir(value);
    return value;
};

var error = function(value) {
    console.error(value);
    // don't fulfill the promise,
    // keep passing to failure handlers
    return Promise.reject(value);
};

var table = function(value) {
  if (Array.isArray(value)) {
    console.table(value); 
  }
  else {
    // if not array, let's put the object into an array
    // to output it as one row in a table view:
    console.table( Array(value) );
  }
  return value;
};

// to get access to a fulfilled promise's value, you
// can set the value on a window property:

var assign = function(value) {
  window.result = value;
  return value;
};