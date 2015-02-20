# Nusoa JavaScript examples

To be able to hit the Nusoa bus, you need to connected to NU's internal network (The WCAS wiki has more details).  If you're off campus, or on campus using the wireless, your best best is to use VPN to gain access.

So once you've taken care of this issue, open up this URL below in a modern web browser (lets restrict ourselves to **Chrome** or **Firefox** -- at least while we delve into the developer tools console):

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

For convenience, let's add our demo LDAP service account in our browser's sessionStorage object. (You would likely not store credentials in this way for a production app, but this approach in fine for testing purposes)

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

## Using the Browser's `XMLHttpRequest` Class

Let us hit the Nusoa bus using a modern Browser's [XMLHttpRequest class](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest). This is how you would create a new entry inside the object store:

**Note: where ever you see the word "`things`" below for an object store name, go ahead and pick another one of your own choice**

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

## A Custom `HttpsRequest` returning *Promises*

Clearly, creating browser XMLHttpRequests in the above fashion is tedious and not very readable.  It would also be nice that a request return a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), giving us a modern and conventional way of dealing with asyncronous operations.  jQuery's AJAX capabilities could help us with these two concerns, but to really take fuller control of how our abstraction, I'd rather roll my own.

So [click here to find the code](Services/HttpsRequest/BrowserHttpsRequest.js) whichs implement a fashioned "HttpsRequest" interface in a browser context. **Copy and paste that entire `BrowserHttpsRequest.js` file into your console, hit return, and then also copy and paste the below code snippet.**  Does it work?


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
This is better than the browser's internal way of performing AJAX requests, but it would be even nicer to have a repository class simplifying all the http requests with semantic and terse method names.  Take mind that we still want to be dealing in the world of JavaScript promises.

## An `ObjectRepository` Class

**[Click here to find the `ObjectRepository` code](Repositories/ObjectRepository.js)** which implements a class building on top of the `HttpsRequest` service object from above. **Copy and paste that entire `ObjectRepository.js` file into your console, hit return, and then also copy and paste the below code snippet.**

```javascript
// let's create the repo, 
// and make it work on the 'things' data store

BrowserHttpsRequest.XMLHttpRequest = window.XMLHttpRequest;
var repo = new ObjectRepository(BrowserHttpsRequest); 
repo.descriptor = 'things';
```

Our repo instance should be ready to use!

### `repo.create()`

try this:

```javascript
repo.create({type: 'solid', name: 'brick', date:Date() }).then(log, error);
```

We see above how to create new objects with repo. Let's take a look at how some of the other methods:

### `repo.all()`

```javascript
repo.all().then(table, error);
```

By leveraging the `console.table()` functionality, we get a nice view of our data set!

<p align=center><img width=585 height=118 src=docs/images/table-view.png?raw=true /></p>

We also can filter using key / value pairs.  The filter operation is done by the backend API service.

```javascript
repo.all({type: 'clay'}).then(table, error);
```

if a query returns no result, the promise will be fulfilled with a value of `null`.

### `repo.get()`

You can retrieve an entry by its id number.  In the below example, we are wrapping the resultant object in an array so that we can view it nicely in the console's table form.

```javascript 
repo.get(15).then(Array).then(table, error);
```

### `repo.edit()`

You can edit an entry passing in an id and also updated key / value pairs:

```javascript
repo.edit(15, {name: 'chair'}).then(Array).then(table, error);
```

Behind the scenes, this method is just over writing a current object using the `repo.create()` method, as the backend API does not expose an edit route.

The promise will be fulfilled with the modified object as you would see if you were to do a subsequent `repo.get()`.

### `repo.remove()`

You can remove a signal entry using an id number:

```javascript
repo.remove(15).then(log, error);
```

Or you can also remove a series of entries by passing an array of id numbers.

```javascript
repo.remove([6,8,10).then(log, error);
```

In the above case, the `ObjectRepository` instance is just deleting the records, one-by-one, using chained promises to queue up the operations until they are all done.

### `repo.dropEntireObjectType()`

Careful with this one, does it exactly as it indicates for a particular object type.

```javascript
repo.dropEntireObjectType().then(log, error);
```

```json
{
   "message":{
      "0":"Deleted object type things.",
      "1":"All objects of object type things gone.  Removing access_control and ldap_accounts for object type."
   }
}
```

### `repo.visible()`

When this method's promise is fulfilled, the value will be a list visible object types for current LDAP service user (the [WCAS_SOA_POC documentation](https://slate.weinberg.northwestern.edu/display/SOAPOC/WCAS_SOA_POC+Functionality+and+API) has further clarification).

```javascript
repo.visible().then(log);
```

```json
{
   "valid_object_types":{
      "0":"items",
      "4":"pets",
      "5":"fake_bike_racks",
      "7":"critters",
      "8":"things"
   },
   "url_format":"/VERSION/OBJECTTYPE"
}
```

### `repo.setAccess()`

Sets the object type access control. Acceptable values are 'public-read' and 'private'.

```javascript
repo.setAccess('private').then(log, error);
```

### `repo.setPermissions()`

Changes list of LDAP service accounts with access to object type. Acceptable values for each group are either "write" or "read".

```javascript
repo.setPermissions({
  'wcas-soa-basic-demo': 'write',
  'some-other-group'   : 'read',
}).then(log, error);
```

### `repo.first()` *and* `repo.last()`

These methods will also be fulfilled with a single object indicated by its position in collection returned by `repo.all`.  Don't put too much credence in whether these methods return a record based on ID or creation time, I was just toying around, maybe it was a mistake to include these methods. The backend API doesn't state that the order the records come back is significant. 

Actually, we could order these by ID on the client side, and then spit back the first or last record.  This can be put on my "to do" list. :P

### Changing the repo's destination on the fly

Instead of creating separate instances of say, a `petRepo` and a `thingRepo` (which you can certainly do), you could just change the `descriptor` property of a repo and it will now reference a different object store:

```javascript
repo.descriptor = 'pets';
repo.all().then(table, error);
```

That's it for now, please email Chris Walker at Student Affairs IT if any questions!

## Additional Notes

You may want to insert some of the console's functionality in the middle of a promise chain.  You should remember to pass through the original value from your logging functions via the `return` keyword.  These set of helpers may be of service:

```javascript
log = function(value) {
    console.log(value);
    return value;
};

dir = function(value) {
    console.dir(value);
    return value;
};

error = function(value) {
    console.error(value);
    // don't fulfill the promise,
    // keep passing to failure handlers
    return Promise.reject(value);
};

table = function(value) {
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

assign = function(value) {
  window.result = value;
  return value;
};
```
