# JavaScript examples


Take note that we are dealing in the realm of asyncronous calls. That is, the application's single thread doesn't stop while your process is _pending_.

To be able to hit the Nusoa bus, you need to connected to NU's internal NU network. While the specifics are the firewall are somewhat unclear at this stage (e.g. is just being on the NU wireless enough?), a VPN connection to the university does seem to allow access.

Open up this URL in a modern web browser (lets restrict ourselves to **Chrome** or **Firefox** -- at least while we delve into the developer tools console):

```
https://nusoa.northwestern.edu/
```

You may see something like this appear in the browser window:

```
HTTP Status 404 - Resource Not Found

URI / does not map to any message flow in broker CHIIBPBRK01
IBM Integration Bus 9001
```

We're not really concerned about this website itself, ony that the browser now acknowleges that we are surfing inside a the domain where we can make AJAX calls within this page's JavaScript console without recourse to any kind of [CORS management](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS). (We're just tooling around in this exercise, obviously much more thought and evaluation would need to be done if you _actually_ wanted to connect a browser application directly to the SOA Bus in a production context).

While on this page, open your browser developer tools (`cmd-shift-I`, or `F12`, etc) and lets try to connecting with the SOA bus straight away.  We'll be using the WCAS SOA POC service, which you can learn more about [here](https://slate.weinberg.northwestern.edu/display/SOAPOC/WCAS_SOA_POC+Functionality+and+API).


browser: (you would likely not store these credentials in such a way a production app, but this in fine for testing purposes)

```javascript
sessionStorage.user     = 'my-username'; 
sessionStorage.password = 'my-password';
```

You can retrieve the actual test credentals at the [demo LDAP service account wiki page](https://slate.weinberg.northwestern.edu/display/SOAPOC/Demo+LDAP+service+account).

Let's create some quickly accessible functions to help us with logging to the console:

```javascript
log   = console.log  .bind(console); 
error = console.error.bind(console);
dir   = console.dir  .bind(console);
table = console.table.bind(console);
```

Let us hit the Nusoa bus using a modern Browser's [XMLHttpRequest class](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest). This is how you would create a new entry inside the object store:

```javascript
var storageName = 'things';

var url = 'https://nusoa.northwestern.edu/WCAS_SOA_POC/v1/' + storageName;

var data = {};
data[storageName] = {type: 'solid', name: 'brick', date:Date() };
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

Hitting the other other WCAS-SOC-POC API routes follow much of the same above pattern, with slight variances in the URL string, http method, and whether or not you are sending some payload data in the `xhr.send()` method.  Examples from the curl, python, and php example pages on the wiki provide more telling detail on hitting individual routes. The API documentation itself is very helpful in this respect, also.

Clearly, creating browser XMLHttpRequests in the above fashion is tedious and not very readable.  It would also be nice that a request return a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), giving us a modern and conventional way of dealing with asyncronous operations.  jQuery's AJAX capabilities could help us with these two concerns, but to really take fuller control of how our abstraction, I'd rather roll my own.

So [click here to find the code](Services/HttpsRequest/BrowserHttpsRequest.js) whichs implement my "HttpsRequest" interface in a browser context. **Copy and paste that entire `BrowserHttpsRequest.js`file into your console, hit return, and then also copy and paste the below code snippet.**  Does it work?


```javascript
// Assuming our HttpsRequest module is loaded,
// we assign the XMLHttpRequest class dependency as below.
// (note that you only need to do this once)

BrowserHttpsRequest.XMLHttpRequest = window.XMLHttpRequest;

var sendingRequest = BrowserHttpsRequest.make({
    method:   'POST',
    hostname: 'nusoa.northwestern.edu',
	path:     '/WCAS_SOA_POC/v1/things',
	user:     sessionStorage.user,
	password: sessionStorage.password,
	timeout:  10000,
	headers:  {Accept: 'application/json'},
	dataString: JSON.stringify({things: {type: 'solid', name: 'brick', date:Date() }}),
}).send();

sendingRequest.then(log, error);
```




This is better than the browser's internal way of performing AJAX requests, but it would be even nicer to have a repository class that simplifies all the http requests for us, giving a nicer client API to work with as we experiment with the routes.  But we still want to be dealing in the world of JavaScript promises. Using our HttpsRequest class as a dependency, imageine if we could have another abstraction do something like this:

```javascript
// let's create the repo, and make it work on the 'things' data store:
// (notice we are injecting our BrowserHttpRequest into the constructor)

BrowserHttpsRequest.XMLHttpRequest = window.XMLHttpRequest;
var repo = new ObjectRepository(BrowserHttpsRequest); 
repo.descriptor = 'things';

repo.create({type: 'solid', name: 'brick', date:Date() }).then(log, error);
```

So we see above how to create things with repo. Let's take a look at some of the other methods.

```javascript
// let's use that `table` function we made -- which calls `console.table()`

repo.all().then(table, error);
```
<p align=center><img width=585 height=118 src=docs/images/table-view.png?raw=true /></p>

```javascript=
repo.all({type: 'clay'}).then(table, error);
```
```javascript
// The repo class allows us to fetch item by ID.
// We will insert the resultant object into the 
// Array constructor to make it look
// nicer using console's table method

repo.get(15).then(Array).then(table, error);
```

```javascript=
repo.edit(15, {name: 'chair'}).then(Array).then(table, error);
```

```javascript=
repo.remove(15).then(log, error);
```

If we change the object descriptor on the repo class, we can change the object store we referring to.

```javascript
repo.descriptor = 'pets';
repo.all().then(table, error);
```


ok.
