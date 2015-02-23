//var App = require('./App');
//
//var app = new App();
//app.run();

//httpsRequest.hostname = 'go.dosa.northwestern.edu';
//httpsRequest.path = '/nuhelpapi/api/bluelights';

if ( ! console.table) require('console.table');

var envStore = {};
if (typeof sessionStorage === 'object')         envStore = sessionStorage;
if (typeof process === 'object' && process.env) envStore = process.env;

// var user       = envStore.user     || null;
// var password   = envStore.password || null;

var HttpsRequest     = this.BrowserHttpsRequest || require('./Services/HttpsRequest/IojsHttpsRequest');
var ObjectRepository = this.ObjectRepository    || require('./Repositories/ObjectRepository.js');

// ok =========================================================================

var repo = new ObjectRepository(HttpsRequest);
repo.descriptor = 'things';

var gettingRequest = repo.all();

// setTimeout( function() {
//    gettingRequest.abort();
// }, 150);

gettingRequest
    // .then(console.log.bind(console, 'started'))
    .then(table)
    .catch(log)
    .then( function() {
        clearTimeout(waitingAround);
    });

// process.exit();

var secondsToWaitAround = 2;
var waitingAround = setTimeout( function() {
    log('this is taking too long, let us cancel the request');
    gettingRequest.cancel();
    // if no more timers, script will exit;
}, secondsToWaitAround * 1000);

// ok =========================================================================
// helpers

function log(value) {
    console.log(value);
    return value;
}

function dir(value) {
    console.dir(value);
    return value;
}

function error(value) {
    console.error(value);
    // don't fulfill the promise,
    // keep passing to failure handlers
    return Promise.reject(value);
}

function table(value) {
  
  var tableFn = console.table.bind(console);
  
  // var table = console.table ? 
  // 	console.table.bind(console) || 
  // 		(require('console.table') && console.table.bind(console));

  if (Array.isArray(value)) tableFn(value);

  else {
    // if not array, let's put the object into an array
    // to output it as one row in a table view:
    tableFn( Array(value) );
  }
  return value;
}

// to get access to a fulfilled promise's value, you
// can set the value on a window property:

function assign(value) {
  window.result = value;
  return value;
}