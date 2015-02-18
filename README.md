# JavaScript examples


Take note that we are dealing in the realm of asyncronous calls. That is, the application's single thread doesn't stop while your process is _pending_.


browser: (you would likely not store these credentials in such a way a production app, but this in fine for testing purposes)

```javascript
sessionStorage.user = 'my-username'; sessionStorage.password = 'my-password';
```

You can retrieve the actual test credentals at the [demo LDAP service account wiki page](https://slate.weinberg.northwestern.edu/display/SOAPOC/Demo+LDAP+service+account).

Lets alias some helpful logging functions that we'll use:

```javascript
log = console.log.bind(console); error = console.error.bind(console);
```

Hitting the Nusoa using a modern Browser's [XMLHttpRequest class](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest). This is how you would create a new entry inside the object store:

```javascript
var storageName = 'things';

var url = 'https://nusoa.northwestern.edu/WCAS_SOA_POC/v1/' + storageName;

var data = {};
data[storageName] = {type: 'solid', name: 'brick'};
data = JSON.stringify(data);

var xhr = new XMLHttpRequest();

xhr.open('POST', url, true, sessionStorage.user, sessionStorage.password);
xhr.setRequestHeader('Accept', 'application/json');
xhr.timeout = 10000;

xhr.onerror   = function() {error('network');};
xhr.ontimeout = function() {error('timeout');};
xhr.onabort   = function() {error('aborted');};
xhr.onload    = function() {

    switch(xhr.status) {
        case 200: log( JSON.parse(xhr.responseText)); break;
        case 401: error('unauthorized');  break;
        case 403: error('forbidden');     break;
        case 404: error('not_found');     break;
        default:  error('unknown_error_onload');
    }
 };

xhr.send(data);  // thread does not pause, immediately continue below

log('xhr has been sent!'); 
```

Hitting the other routes follow much of the same above pattern, with slight variances in the URL string, http method, and whether or not you are sending some payload data in the `xhr.send()` method.  Examples from the curl, python, and php example pages on the wiki provide more telling detail on hitting individual routes. The API documentation itself is helpful in this respect, also.

Creating browser XMLHttpRequests in the above fashion can be tedious and not very readable.  Secondly, it would be nice that a request returns a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), giving us a more modern and conventional way of dealing with asyncronous operations.  jQuery's AJAX capabilities could help us with these two concerns, but to really take fuller control of how our abstraction is working, let's roll our own.

Let's say we want our own API for an HttpsRequest service factory to act something like this:

```javascript
// assuming our HttpsRequest module is loaded,
// we set a static property to the XMLHttpRequest class dependency

BrowserHttpsRequest.XMLHttpRequest = window.XMLHttpRequest;

BrowserHttpsRequest.make({

    method:   'POST',
    hostname: 'nusoa.northwestern.edu',
	path:     '/WCAS_SOA_POC/v1/things',
	user:     sessionStorage.user,
	password: sessionStorage.password,
	timeout:  10000,
	headers:  {Accept: 'application/json'},
	dataString: JSON.stringify({things: {type: 'solid', name: 'brick'}}),
	
}).send().then(log, error);

```

So here is the code to implement the above interface in a browser context:

```javascript
(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define('BrowserHttpsRequest', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.BrowserHttpsRequest = factory();
  }

}(this, function () {
// =================================================================

'use strict';

function BrowserHttpsRequest(XMLHttpRequest) {

    this._XMLHttpRequest = XMLHttpRequest;
};

BrowserHttpsRequest.prototype.send = function() {

    var ins = this;
    var xhr = new this._XMLHttpRequest();

    var promise = new Promise( function(resolve, reject) {

        var data = ins.dataString || null;

        var url = 'https://' + ins.hostname + ins.path;
        xhr.open(ins.method, url, true, ins.user, ins.password);

        xhr.timeout = ins.timeout || 0;

        xhr.onerror   = function() {reject( Error('network') );};
        xhr.ontimeout = function() {reject( Error('timeout') );};
        xhr.onabort   = function() {reject( Error('aborted') );};
        xhr.onload    = function() {

            switch(xhr.status) {
                case 200: resolve( JSON.parse(xhr.responseText)); break;
                case 401: reject( Error('unauthorized'));         break;
                case 403: reject( Error('forbidden'));            break;
                case 404: reject( Error('not_found'));            break;
                default:  reject( Error('unknown_error_onload'));
            }
        };

        var headers = ins.headers || {};
        Object.keys(headers).forEach( function(key) {
            xhr.setRequestHeader(key, headers[key]);
        });

        xhr.send(data);
    });

    promise.abort = xhr.abort.bind(xhr);
    return promise;
};

// dependency needs to be set by programmer
// by setting to value, e.g. window.XMLHttpRequest
BrowserHttpsRequest.XMLHttpRequest = null;

BrowserHttpsRequest.make = function(options) {

    if ( ! this.XMLHttpRequest ) {
        throw new Error(
            'BrowserHttpsRequest.XMLHttpRequest ' +
            'depedency not met'
        );
    }

    var req = new this(this.XMLHttpRequest);
    Object.keys(options).forEach( function(key) {
        req[key] = options[key];
    });
    return req;
};

return BrowserHttpsRequest;

// =================================================================
}));
```

Obviously, it would be nicer to have a repository class that simplifies all the http requests for us, giving a nicer client API to work with as we experiment with the routes.