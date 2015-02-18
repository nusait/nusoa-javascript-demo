//var App = require('./App');
//
//var app = new App();
//app.run();

//httpsRequest.hostname = 'go.dosa.northwestern.edu';
//httpsRequest.path = '/nuhelpapi/api/bluelights';

var HttpsRequest = this.BrowserHttpsRequest || require('./Services/HttpsRequest/IojsHttpsRequest.js');

var log = console.log.bind(console);

// var httpsRequest = new HttpsRequest();
// httpsRequest.user = 'wcas-soa-basic-demo';
// httpsRequest.password = 'h9onGB2+mQ5pXldv';
// httpsRequest.hostname = 'nusoa.northwestern.edu';
// httpsRequest.path = '/WCAS_SOA_POC/v1/pets/1';
// httpsRequest.method = 'GET';
// httpsRequest.timeout = 3000;
// httpsRequest.headers = {
//     Accept: 'application/json',
// };

var httpsRequest = HttpsRequest.make({
    method:   'GET',
    hostname: 'nusoa.northwestern.edu',
    path:     '/WCAS_SOA_POC/v1/pets/1',
    user:     '',
    password: '',
    timeout:  3000,
    headers:  {Accept: 'application/json'},
});

var gettingRequest = httpsRequest.send();

// setTimeout( function() {
//    gettingRequest.abort();
// }, 100);

gettingRequest
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
