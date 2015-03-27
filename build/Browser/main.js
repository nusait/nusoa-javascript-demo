(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var BrowserHttpsRequest = _interopRequire(require("../Services/HttpsRequest/BrowserHttpsRequest"));

var ObjectRepository = _interopRequire(require("../Repositories/ObjectRepository"));

// get some objects from the global, which is 'window' for this browser example:
var console = global.console;
var sessionStorage = global.sessionStorage;
var XMLHttpRequest = global.XMLHttpRequest;

// set up dependencies and instantiate the repo class:
BrowserHttpsRequest.XMLHttpRequest = XMLHttpRequest;
var repo = new ObjectRepository(BrowserHttpsRequest);

// get SOA credentials from session storage
var user = sessionStorage.user;
var password = sessionStorage.password;

if (!user && !password) throw "no sessionStorage.user and sessionStorage.password";

repo.user = user;
repo.password = password;

// assign some helpers and the repo on the global object:
global.log = console.log.bind(console);
global.table = console.table.bind(console);
global.error = console.error.bind(console);
global.repo = repo;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../Repositories/ObjectRepository":2,"../Services/HttpsRequest/BrowserHttpsRequest":3}],2:[function(require,module,exports){
(function (process){
"use strict";

function ObjectRepository(HttpsRequest) {

	var envStore = {};
	if (typeof sessionStorage === "object") envStore = sessionStorage;
	if (typeof process === "object" && process.env) envStore = process.env;

	this._HttpsRequest = HttpsRequest;

	this.topLevelDirectory = "WCAS_SOA_POC";
	this.hostname = "nusoa.northwestern.edu";
	this.version = "v1"; // can be overridden by user
	this.descriptor = null; // this needs be set by user
	this.user = envStore.user || null;
	this.password = envStore.password || null;
	this.timeout = 10000;
	this.headers = { Accept: "application/json" };
};

ObjectRepository.prototype.visible = function () {

	return this._HttpsRequest.make({
		method: "GET",
		hostname: this.hostname,
		path: this.basePath,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers }).send();
};

ObjectRepository.prototype.setAccess = function (access) {

	var validTypes = ["public-read", "private"];

	if (validTypes.indexOf(access) < 0) {
		return Promise.reject(new Error("not valid access type"));
	}

	var dataObj = { access_control: access };

	return this._HttpsRequest.make({
		method: "POST",
		hostname: this.hostname,
		path: this.basePath,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers,
		dataString: JSON.stringify(dataObj) }).send();
};

ObjectRepository.prototype.setPermissions = function (permissions) {

	var dataObj = { ldap_accounts: permissions };

	return this._HttpsRequest.make({
		method: "POST",
		hostname: this.hostname,
		path: this.path,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers,
		dataString: JSON.stringify(dataObj) }).send();
};

ObjectRepository.prototype.dropEntireObjectType = function () {

	return this._HttpsRequest.make({
		method: "DELETE",
		hostname: this.hostname,
		path: this.path,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers }).send();
};

ObjectRepository.prototype.all = function (filters) {

	filters = filters || {};
	var queryString = objectToQueryString(filters);

	var descriptor = this.descriptor;

	var makeIntoArray = function makeIntoArray(data) {

		data = data[descriptor];
		return Object.keys(data).map(function (key) {
			return data[key];
		});
	};

	var convert404toNull = function convert404toNull(error) {
		if (error.message === "not_found") {
			return null;
		}return Promise.reject(error);
	};

	return this._HttpsRequest.make({

		method: "GET",
		hostname: this.hostname,
		path: this.path + queryString,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers }).send().then(makeIntoArray).then(orderById, convert404toNull);
};

ObjectRepository.prototype.get = function (id) {

	if (typeof id !== "number") return Promise.reject("id must be a number");

	var descriptor = this.descriptor;
	var getNestedObject = function getNestedObject(data) {
		var objects = data[descriptor];
		var index = Object.keys(objects)[0];
		return objects[index];
	};

	return this._HttpsRequest.make({
		method: "GET",
		hostname: this.hostname,
		path: this.path + "/" + id,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers }).send().then(getNestedObject);
};

ObjectRepository.prototype.remove = function (idArg) {

	var ins = this;
	// if id is array of ids, remove them all, sequentially:
	if (idArg.length) {

		var prevPromise = Promise.resolve();
		idArg.forEach(function (id) {
			prevPromise = prevPromise.then(ins.remove.bind(ins, id));
		});

		var doneResponse = function doneResponse() {
			return { message: "ok" };
		};
		return prevPromise.then(doneResponse);
	} else {
		// else just remove the one id:
		return this._HttpsRequest.make({
			method: "DELETE",
			hostname: this.hostname,
			path: this.path + "/" + idArg,
			user: this.user,
			password: this.password,
			timeout: this.timeout,
			headers: this.headers }).send();
	}
};

ObjectRepository.prototype.create = function (params) {

	var descriptor = this.descriptor;
	var dataObj = {};
	dataObj[descriptor] = params;

	function getFromDescriptor(object) {

		return object[descriptor];
	}

	return this._HttpsRequest.make({

		method: "POST",
		hostname: this.hostname,
		path: this.path,
		user: this.user,
		password: this.password,
		timeout: this.timeout,
		headers: this.headers,
		dataString: JSON.stringify(dataObj) }).send().then(getFromDescriptor);
};

ObjectRepository.prototype.first = function (filters) {

	function getFirst(array) {
		if (array && array.length) {
			return array[0];
		}return null;
	}

	return this.all(filters).then(getFirst);
};

ObjectRepository.prototype.last = function (filters) {

	function getLast(array) {
		if (array && array.length) {
			var lastIndex = array.length - 1;
			return array[lastIndex];
		}
		return null;
	}

	return this.all(filters).then(getLast);
};

ObjectRepository.prototype.edit = function (id, newProps) {

	var ins = this;
	var modifiedId;

	if (typeof newProps !== "object") {
		return Promise.reject(new Error("2nd parameter must be an object"));
	}
	if (newProps.hasOwnProperty("id")) {
		return Promise.reject(new Error("you cannot change the id property"));
	}

	var getObjectFromRepo = this.get.bind(this, id);

	var addNewPropertiesToObject = function addNewPropertiesToObject(object) {

		modifiedId = object.id;
		Object.keys(newProps).forEach(function (key) {
			object[key] = newProps[key];
		});
		return object;
	};

	var saveObjectReplacingOld = this.create.bind(this);

	var getModifiedObjectByID = function getModifiedObjectByID() {

		return ins.get(modifiedId);
	};

	return getObjectFromRepo().then(addNewPropertiesToObject).then(saveObjectReplacingOld);
	// response ID not consistent, get it again:
	// .then(getModifiedObjectByID);
};

Object.defineProperties(ObjectRepository.prototype, {

	basePath: {
		get: function get() {
			return "/" + this.topLevelDirectory + "/" + this.version + "/";
		}
	},
	path: {
		get: function get() {
			if (!this.descriptor) throw "set this.descriptor";
			return this.basePath + this.descriptor;
		}
	} });

ObjectRepository.prototype.find = ObjectRepository.prototype.first;

if (!ObjectRepository.name) ObjectRepository.name = "ObjectRepository";

// helpers
function objectToQueryString(filters) {

	var queryString = "";
	var encode = encodeURIComponent;

	filters = Object.keys(filters).map(function (key) {
		return encode(key) + "=" + encode(filters[key]);
	});

	if (filters.length) queryString = "?" + filters.join("&");

	return queryString;
}

function orderById(array) {

	return array.sort(function (a, b) {
		return a.id - b.id;
	});
}

module.exports = ObjectRepository;
}).call(this,require('_process'))

},{"_process":4}],3:[function(require,module,exports){
(function (global){
"use strict";

function BrowserHttpsRequest(XMLHttpRequest) {

    this._XMLHttpRequest = XMLHttpRequest || global.XMLHttpRequest;
};

BrowserHttpsRequest.prototype.send = function () {

    var ins = this;
    var xhr = new this._XMLHttpRequest();

    var promise = new Promise(function (resolve, reject) {

        var data = ins.dataString || null;

        var url = "https://" + ins.hostname + ins.path;
        xhr.open(ins.method, url, true, ins.user, ins.password);

        xhr.timeout = ins.timeout || 0;

        xhr.onerror = function () {
            reject(Error("network"));
        };
        xhr.ontimeout = function () {
            reject(Error("timeout"));
        };
        xhr.onabort = function () {
            reject(Error("aborted"));
        };
        xhr.onload = function () {

            switch (xhr.status) {
                case 200:
                    resolve(JSON.parse(xhr.responseText));break;
                case 401:
                    reject(Error("unauthorized"));break;
                case 403:
                    reject(Error("forbidden"));break;
                case 404:
                    reject(Error("not_found"));break;
                default:
                    reject(Error("unknown_error_onload"));
            }
        };

        var headers = ins.headers || {};
        Object.keys(headers).forEach(function (key) {
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

BrowserHttpsRequest.make = function (options) {

    var req = new this(this.XMLHttpRequest);
    Object.keys(options).forEach(function (key) {
        req[key] = options[key];
    });
    return req;
};

module.exports = BrowserHttpsRequest;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAtZXM1L0Jyb3dzZXIvbWFpbi5qcyIsImFwcC1lczUvUmVwb3NpdG9yaWVzL09iamVjdFJlcG9zaXRvcnkuanMiLCJhcHAtZXM1L1NlcnZpY2VzL0h0dHBzUmVxdWVzdC9Ccm93c2VySHR0cHNSZXF1ZXN0LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmUgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmpbXCJkZWZhdWx0XCJdIDogb2JqOyB9O1xuXG52YXIgQnJvd3Nlckh0dHBzUmVxdWVzdCA9IF9pbnRlcm9wUmVxdWlyZShyZXF1aXJlKFwiLi4vU2VydmljZXMvSHR0cHNSZXF1ZXN0L0Jyb3dzZXJIdHRwc1JlcXVlc3RcIikpO1xuXG52YXIgT2JqZWN0UmVwb3NpdG9yeSA9IF9pbnRlcm9wUmVxdWlyZShyZXF1aXJlKFwiLi4vUmVwb3NpdG9yaWVzL09iamVjdFJlcG9zaXRvcnlcIikpO1xuXG4vLyBnZXQgc29tZSBvYmplY3RzIGZyb20gdGhlIGdsb2JhbCwgd2hpY2ggaXMgJ3dpbmRvdycgZm9yIHRoaXMgYnJvd3NlciBleGFtcGxlOlxudmFyIGNvbnNvbGUgPSBnbG9iYWwuY29uc29sZTtcbnZhciBzZXNzaW9uU3RvcmFnZSA9IGdsb2JhbC5zZXNzaW9uU3RvcmFnZTtcbnZhciBYTUxIdHRwUmVxdWVzdCA9IGdsb2JhbC5YTUxIdHRwUmVxdWVzdDtcblxuLy8gc2V0IHVwIGRlcGVuZGVuY2llcyBhbmQgaW5zdGFudGlhdGUgdGhlIHJlcG8gY2xhc3M6XG5Ccm93c2VySHR0cHNSZXF1ZXN0LlhNTEh0dHBSZXF1ZXN0ID0gWE1MSHR0cFJlcXVlc3Q7XG52YXIgcmVwbyA9IG5ldyBPYmplY3RSZXBvc2l0b3J5KEJyb3dzZXJIdHRwc1JlcXVlc3QpO1xuXG4vLyBnZXQgU09BIGNyZWRlbnRpYWxzIGZyb20gc2Vzc2lvbiBzdG9yYWdlXG52YXIgdXNlciA9IHNlc3Npb25TdG9yYWdlLnVzZXI7XG52YXIgcGFzc3dvcmQgPSBzZXNzaW9uU3RvcmFnZS5wYXNzd29yZDtcblxuaWYgKCF1c2VyICYmICFwYXNzd29yZCkgdGhyb3cgXCJubyBzZXNzaW9uU3RvcmFnZS51c2VyIGFuZCBzZXNzaW9uU3RvcmFnZS5wYXNzd29yZFwiO1xuXG5yZXBvLnVzZXIgPSB1c2VyO1xucmVwby5wYXNzd29yZCA9IHBhc3N3b3JkO1xuXG4vLyBhc3NpZ24gc29tZSBoZWxwZXJzIGFuZCB0aGUgcmVwbyBvbiB0aGUgZ2xvYmFsIG9iamVjdDpcbmdsb2JhbC5sb2cgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuZ2xvYmFsLnRhYmxlID0gY29uc29sZS50YWJsZS5iaW5kKGNvbnNvbGUpO1xuZ2xvYmFsLmVycm9yID0gY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpO1xuZ2xvYmFsLnJlcG8gPSByZXBvOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBPYmplY3RSZXBvc2l0b3J5KEh0dHBzUmVxdWVzdCkge1xuXG5cdHZhciBlbnZTdG9yZSA9IHt9O1xuXHRpZiAodHlwZW9mIHNlc3Npb25TdG9yYWdlID09PSBcIm9iamVjdFwiKSBlbnZTdG9yZSA9IHNlc3Npb25TdG9yYWdlO1xuXHRpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgcHJvY2Vzcy5lbnYpIGVudlN0b3JlID0gcHJvY2Vzcy5lbnY7XG5cblx0dGhpcy5fSHR0cHNSZXF1ZXN0ID0gSHR0cHNSZXF1ZXN0O1xuXG5cdHRoaXMudG9wTGV2ZWxEaXJlY3RvcnkgPSBcIldDQVNfU09BX1BPQ1wiO1xuXHR0aGlzLmhvc3RuYW1lID0gXCJudXNvYS5ub3J0aHdlc3Rlcm4uZWR1XCI7XG5cdHRoaXMudmVyc2lvbiA9IFwidjFcIjsgLy8gY2FuIGJlIG92ZXJyaWRkZW4gYnkgdXNlclxuXHR0aGlzLmRlc2NyaXB0b3IgPSBudWxsOyAvLyB0aGlzIG5lZWRzIGJlIHNldCBieSB1c2VyXG5cdHRoaXMudXNlciA9IGVudlN0b3JlLnVzZXIgfHwgbnVsbDtcblx0dGhpcy5wYXNzd29yZCA9IGVudlN0b3JlLnBhc3N3b3JkIHx8IG51bGw7XG5cdHRoaXMudGltZW91dCA9IDEwMDAwO1xuXHR0aGlzLmhlYWRlcnMgPSB7IEFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIgfTtcbn07XG5cbk9iamVjdFJlcG9zaXRvcnkucHJvdG90eXBlLnZpc2libGUgPSBmdW5jdGlvbiAoKSB7XG5cblx0cmV0dXJuIHRoaXMuX0h0dHBzUmVxdWVzdC5tYWtlKHtcblx0XHRtZXRob2Q6IFwiR0VUXCIsXG5cdFx0aG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG5cdFx0cGF0aDogdGhpcy5iYXNlUGF0aCxcblx0XHR1c2VyOiB0aGlzLnVzZXIsXG5cdFx0cGFzc3dvcmQ6IHRoaXMucGFzc3dvcmQsXG5cdFx0dGltZW91dDogdGhpcy50aW1lb3V0LFxuXHRcdGhlYWRlcnM6IHRoaXMuaGVhZGVycyB9KS5zZW5kKCk7XG59O1xuXG5PYmplY3RSZXBvc2l0b3J5LnByb3RvdHlwZS5zZXRBY2Nlc3MgPSBmdW5jdGlvbiAoYWNjZXNzKSB7XG5cblx0dmFyIHZhbGlkVHlwZXMgPSBbXCJwdWJsaWMtcmVhZFwiLCBcInByaXZhdGVcIl07XG5cblx0aWYgKHZhbGlkVHlwZXMuaW5kZXhPZihhY2Nlc3MpIDwgMCkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJub3QgdmFsaWQgYWNjZXNzIHR5cGVcIikpO1xuXHR9XG5cblx0dmFyIGRhdGFPYmogPSB7IGFjY2Vzc19jb250cm9sOiBhY2Nlc3MgfTtcblxuXHRyZXR1cm4gdGhpcy5fSHR0cHNSZXF1ZXN0Lm1ha2Uoe1xuXHRcdG1ldGhvZDogXCJQT1NUXCIsXG5cdFx0aG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG5cdFx0cGF0aDogdGhpcy5iYXNlUGF0aCxcblx0XHR1c2VyOiB0aGlzLnVzZXIsXG5cdFx0cGFzc3dvcmQ6IHRoaXMucGFzc3dvcmQsXG5cdFx0dGltZW91dDogdGhpcy50aW1lb3V0LFxuXHRcdGhlYWRlcnM6IHRoaXMuaGVhZGVycyxcblx0XHRkYXRhU3RyaW5nOiBKU09OLnN0cmluZ2lmeShkYXRhT2JqKSB9KS5zZW5kKCk7XG59O1xuXG5PYmplY3RSZXBvc2l0b3J5LnByb3RvdHlwZS5zZXRQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChwZXJtaXNzaW9ucykge1xuXG5cdHZhciBkYXRhT2JqID0geyBsZGFwX2FjY291bnRzOiBwZXJtaXNzaW9ucyB9O1xuXG5cdHJldHVybiB0aGlzLl9IdHRwc1JlcXVlc3QubWFrZSh7XG5cdFx0bWV0aG9kOiBcIlBPU1RcIixcblx0XHRob3N0bmFtZTogdGhpcy5ob3N0bmFtZSxcblx0XHRwYXRoOiB0aGlzLnBhdGgsXG5cdFx0dXNlcjogdGhpcy51c2VyLFxuXHRcdHBhc3N3b3JkOiB0aGlzLnBhc3N3b3JkLFxuXHRcdHRpbWVvdXQ6IHRoaXMudGltZW91dCxcblx0XHRoZWFkZXJzOiB0aGlzLmhlYWRlcnMsXG5cdFx0ZGF0YVN0cmluZzogSlNPTi5zdHJpbmdpZnkoZGF0YU9iaikgfSkuc2VuZCgpO1xufTtcblxuT2JqZWN0UmVwb3NpdG9yeS5wcm90b3R5cGUuZHJvcEVudGlyZU9iamVjdFR5cGUgPSBmdW5jdGlvbiAoKSB7XG5cblx0cmV0dXJuIHRoaXMuX0h0dHBzUmVxdWVzdC5tYWtlKHtcblx0XHRtZXRob2Q6IFwiREVMRVRFXCIsXG5cdFx0aG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG5cdFx0cGF0aDogdGhpcy5wYXRoLFxuXHRcdHVzZXI6IHRoaXMudXNlcixcblx0XHRwYXNzd29yZDogdGhpcy5wYXNzd29yZCxcblx0XHR0aW1lb3V0OiB0aGlzLnRpbWVvdXQsXG5cdFx0aGVhZGVyczogdGhpcy5oZWFkZXJzIH0pLnNlbmQoKTtcbn07XG5cbk9iamVjdFJlcG9zaXRvcnkucHJvdG90eXBlLmFsbCA9IGZ1bmN0aW9uIChmaWx0ZXJzKSB7XG5cblx0ZmlsdGVycyA9IGZpbHRlcnMgfHwge307XG5cdHZhciBxdWVyeVN0cmluZyA9IG9iamVjdFRvUXVlcnlTdHJpbmcoZmlsdGVycyk7XG5cblx0dmFyIGRlc2NyaXB0b3IgPSB0aGlzLmRlc2NyaXB0b3I7XG5cblx0dmFyIG1ha2VJbnRvQXJyYXkgPSBmdW5jdGlvbiBtYWtlSW50b0FycmF5KGRhdGEpIHtcblxuXHRcdGRhdGEgPSBkYXRhW2Rlc2NyaXB0b3JdO1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0cmV0dXJuIGRhdGFba2V5XTtcblx0XHR9KTtcblx0fTtcblxuXHR2YXIgY29udmVydDQwNHRvTnVsbCA9IGZ1bmN0aW9uIGNvbnZlcnQ0MDR0b051bGwoZXJyb3IpIHtcblx0XHRpZiAoZXJyb3IubWVzc2FnZSA9PT0gXCJub3RfZm91bmRcIikge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fXJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XG5cdH07XG5cblx0cmV0dXJuIHRoaXMuX0h0dHBzUmVxdWVzdC5tYWtlKHtcblxuXHRcdG1ldGhvZDogXCJHRVRcIixcblx0XHRob3N0bmFtZTogdGhpcy5ob3N0bmFtZSxcblx0XHRwYXRoOiB0aGlzLnBhdGggKyBxdWVyeVN0cmluZyxcblx0XHR1c2VyOiB0aGlzLnVzZXIsXG5cdFx0cGFzc3dvcmQ6IHRoaXMucGFzc3dvcmQsXG5cdFx0dGltZW91dDogdGhpcy50aW1lb3V0LFxuXHRcdGhlYWRlcnM6IHRoaXMuaGVhZGVycyB9KS5zZW5kKCkudGhlbihtYWtlSW50b0FycmF5KS50aGVuKG9yZGVyQnlJZCwgY29udmVydDQwNHRvTnVsbCk7XG59O1xuXG5PYmplY3RSZXBvc2l0b3J5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoaWQpIHtcblxuXHRpZiAodHlwZW9mIGlkICE9PSBcIm51bWJlclwiKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJpZCBtdXN0IGJlIGEgbnVtYmVyXCIpO1xuXG5cdHZhciBkZXNjcmlwdG9yID0gdGhpcy5kZXNjcmlwdG9yO1xuXHR2YXIgZ2V0TmVzdGVkT2JqZWN0ID0gZnVuY3Rpb24gZ2V0TmVzdGVkT2JqZWN0KGRhdGEpIHtcblx0XHR2YXIgb2JqZWN0cyA9IGRhdGFbZGVzY3JpcHRvcl07XG5cdFx0dmFyIGluZGV4ID0gT2JqZWN0LmtleXMob2JqZWN0cylbMF07XG5cdFx0cmV0dXJuIG9iamVjdHNbaW5kZXhdO1xuXHR9O1xuXG5cdHJldHVybiB0aGlzLl9IdHRwc1JlcXVlc3QubWFrZSh7XG5cdFx0bWV0aG9kOiBcIkdFVFwiLFxuXHRcdGhvc3RuYW1lOiB0aGlzLmhvc3RuYW1lLFxuXHRcdHBhdGg6IHRoaXMucGF0aCArIFwiL1wiICsgaWQsXG5cdFx0dXNlcjogdGhpcy51c2VyLFxuXHRcdHBhc3N3b3JkOiB0aGlzLnBhc3N3b3JkLFxuXHRcdHRpbWVvdXQ6IHRoaXMudGltZW91dCxcblx0XHRoZWFkZXJzOiB0aGlzLmhlYWRlcnMgfSkuc2VuZCgpLnRoZW4oZ2V0TmVzdGVkT2JqZWN0KTtcbn07XG5cbk9iamVjdFJlcG9zaXRvcnkucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChpZEFyZykge1xuXG5cdHZhciBpbnMgPSB0aGlzO1xuXHQvLyBpZiBpZCBpcyBhcnJheSBvZiBpZHMsIHJlbW92ZSB0aGVtIGFsbCwgc2VxdWVudGlhbGx5OlxuXHRpZiAoaWRBcmcubGVuZ3RoKSB7XG5cblx0XHR2YXIgcHJldlByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcblx0XHRpZEFyZy5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuXHRcdFx0cHJldlByb21pc2UgPSBwcmV2UHJvbWlzZS50aGVuKGlucy5yZW1vdmUuYmluZChpbnMsIGlkKSk7XG5cdFx0fSk7XG5cblx0XHR2YXIgZG9uZVJlc3BvbnNlID0gZnVuY3Rpb24gZG9uZVJlc3BvbnNlKCkge1xuXHRcdFx0cmV0dXJuIHsgbWVzc2FnZTogXCJva1wiIH07XG5cdFx0fTtcblx0XHRyZXR1cm4gcHJldlByb21pc2UudGhlbihkb25lUmVzcG9uc2UpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGVsc2UganVzdCByZW1vdmUgdGhlIG9uZSBpZDpcblx0XHRyZXR1cm4gdGhpcy5fSHR0cHNSZXF1ZXN0Lm1ha2Uoe1xuXHRcdFx0bWV0aG9kOiBcIkRFTEVURVwiLFxuXHRcdFx0aG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG5cdFx0XHRwYXRoOiB0aGlzLnBhdGggKyBcIi9cIiArIGlkQXJnLFxuXHRcdFx0dXNlcjogdGhpcy51c2VyLFxuXHRcdFx0cGFzc3dvcmQ6IHRoaXMucGFzc3dvcmQsXG5cdFx0XHR0aW1lb3V0OiB0aGlzLnRpbWVvdXQsXG5cdFx0XHRoZWFkZXJzOiB0aGlzLmhlYWRlcnMgfSkuc2VuZCgpO1xuXHR9XG59O1xuXG5PYmplY3RSZXBvc2l0b3J5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG5cblx0dmFyIGRlc2NyaXB0b3IgPSB0aGlzLmRlc2NyaXB0b3I7XG5cdHZhciBkYXRhT2JqID0ge307XG5cdGRhdGFPYmpbZGVzY3JpcHRvcl0gPSBwYXJhbXM7XG5cblx0ZnVuY3Rpb24gZ2V0RnJvbURlc2NyaXB0b3Iob2JqZWN0KSB7XG5cblx0XHRyZXR1cm4gb2JqZWN0W2Rlc2NyaXB0b3JdO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX0h0dHBzUmVxdWVzdC5tYWtlKHtcblxuXHRcdG1ldGhvZDogXCJQT1NUXCIsXG5cdFx0aG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG5cdFx0cGF0aDogdGhpcy5wYXRoLFxuXHRcdHVzZXI6IHRoaXMudXNlcixcblx0XHRwYXNzd29yZDogdGhpcy5wYXNzd29yZCxcblx0XHR0aW1lb3V0OiB0aGlzLnRpbWVvdXQsXG5cdFx0aGVhZGVyczogdGhpcy5oZWFkZXJzLFxuXHRcdGRhdGFTdHJpbmc6IEpTT04uc3RyaW5naWZ5KGRhdGFPYmopIH0pLnNlbmQoKS50aGVuKGdldEZyb21EZXNjcmlwdG9yKTtcbn07XG5cbk9iamVjdFJlcG9zaXRvcnkucHJvdG90eXBlLmZpcnN0ID0gZnVuY3Rpb24gKGZpbHRlcnMpIHtcblxuXHRmdW5jdGlvbiBnZXRGaXJzdChhcnJheSkge1xuXHRcdGlmIChhcnJheSAmJiBhcnJheS5sZW5ndGgpIHtcblx0XHRcdHJldHVybiBhcnJheVswXTtcblx0XHR9cmV0dXJuIG51bGw7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5hbGwoZmlsdGVycykudGhlbihnZXRGaXJzdCk7XG59O1xuXG5PYmplY3RSZXBvc2l0b3J5LnByb3RvdHlwZS5sYXN0ID0gZnVuY3Rpb24gKGZpbHRlcnMpIHtcblxuXHRmdW5jdGlvbiBnZXRMYXN0KGFycmF5KSB7XG5cdFx0aWYgKGFycmF5ICYmIGFycmF5Lmxlbmd0aCkge1xuXHRcdFx0dmFyIGxhc3RJbmRleCA9IGFycmF5Lmxlbmd0aCAtIDE7XG5cdFx0XHRyZXR1cm4gYXJyYXlbbGFzdEluZGV4XTtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5hbGwoZmlsdGVycykudGhlbihnZXRMYXN0KTtcbn07XG5cbk9iamVjdFJlcG9zaXRvcnkucHJvdG90eXBlLmVkaXQgPSBmdW5jdGlvbiAoaWQsIG5ld1Byb3BzKSB7XG5cblx0dmFyIGlucyA9IHRoaXM7XG5cdHZhciBtb2RpZmllZElkO1xuXG5cdGlmICh0eXBlb2YgbmV3UHJvcHMgIT09IFwib2JqZWN0XCIpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiMm5kIHBhcmFtZXRlciBtdXN0IGJlIGFuIG9iamVjdFwiKSk7XG5cdH1cblx0aWYgKG5ld1Byb3BzLmhhc093blByb3BlcnR5KFwiaWRcIikpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwieW91IGNhbm5vdCBjaGFuZ2UgdGhlIGlkIHByb3BlcnR5XCIpKTtcblx0fVxuXG5cdHZhciBnZXRPYmplY3RGcm9tUmVwbyA9IHRoaXMuZ2V0LmJpbmQodGhpcywgaWQpO1xuXG5cdHZhciBhZGROZXdQcm9wZXJ0aWVzVG9PYmplY3QgPSBmdW5jdGlvbiBhZGROZXdQcm9wZXJ0aWVzVG9PYmplY3Qob2JqZWN0KSB7XG5cblx0XHRtb2RpZmllZElkID0gb2JqZWN0LmlkO1xuXHRcdE9iamVjdC5rZXlzKG5ld1Byb3BzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdG9iamVjdFtrZXldID0gbmV3UHJvcHNba2V5XTtcblx0XHR9KTtcblx0XHRyZXR1cm4gb2JqZWN0O1xuXHR9O1xuXG5cdHZhciBzYXZlT2JqZWN0UmVwbGFjaW5nT2xkID0gdGhpcy5jcmVhdGUuYmluZCh0aGlzKTtcblxuXHR2YXIgZ2V0TW9kaWZpZWRPYmplY3RCeUlEID0gZnVuY3Rpb24gZ2V0TW9kaWZpZWRPYmplY3RCeUlEKCkge1xuXG5cdFx0cmV0dXJuIGlucy5nZXQobW9kaWZpZWRJZCk7XG5cdH07XG5cblx0cmV0dXJuIGdldE9iamVjdEZyb21SZXBvKCkudGhlbihhZGROZXdQcm9wZXJ0aWVzVG9PYmplY3QpLnRoZW4oc2F2ZU9iamVjdFJlcGxhY2luZ09sZCk7XG5cdC8vIHJlc3BvbnNlIElEIG5vdCBjb25zaXN0ZW50LCBnZXQgaXQgYWdhaW46XG5cdC8vIC50aGVuKGdldE1vZGlmaWVkT2JqZWN0QnlJRCk7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhPYmplY3RSZXBvc2l0b3J5LnByb3RvdHlwZSwge1xuXG5cdGJhc2VQYXRoOiB7XG5cdFx0Z2V0OiBmdW5jdGlvbiBnZXQoKSB7XG5cdFx0XHRyZXR1cm4gXCIvXCIgKyB0aGlzLnRvcExldmVsRGlyZWN0b3J5ICsgXCIvXCIgKyB0aGlzLnZlcnNpb24gKyBcIi9cIjtcblx0XHR9XG5cdH0sXG5cdHBhdGg6IHtcblx0XHRnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcblx0XHRcdGlmICghdGhpcy5kZXNjcmlwdG9yKSB0aHJvdyBcInNldCB0aGlzLmRlc2NyaXB0b3JcIjtcblx0XHRcdHJldHVybiB0aGlzLmJhc2VQYXRoICsgdGhpcy5kZXNjcmlwdG9yO1xuXHRcdH1cblx0fSB9KTtcblxuT2JqZWN0UmVwb3NpdG9yeS5wcm90b3R5cGUuZmluZCA9IE9iamVjdFJlcG9zaXRvcnkucHJvdG90eXBlLmZpcnN0O1xuXG5pZiAoIU9iamVjdFJlcG9zaXRvcnkubmFtZSkgT2JqZWN0UmVwb3NpdG9yeS5uYW1lID0gXCJPYmplY3RSZXBvc2l0b3J5XCI7XG5cbi8vIGhlbHBlcnNcbmZ1bmN0aW9uIG9iamVjdFRvUXVlcnlTdHJpbmcoZmlsdGVycykge1xuXG5cdHZhciBxdWVyeVN0cmluZyA9IFwiXCI7XG5cdHZhciBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQ7XG5cblx0ZmlsdGVycyA9IE9iamVjdC5rZXlzKGZpbHRlcnMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0cmV0dXJuIGVuY29kZShrZXkpICsgXCI9XCIgKyBlbmNvZGUoZmlsdGVyc1trZXldKTtcblx0fSk7XG5cblx0aWYgKGZpbHRlcnMubGVuZ3RoKSBxdWVyeVN0cmluZyA9IFwiP1wiICsgZmlsdGVycy5qb2luKFwiJlwiKTtcblxuXHRyZXR1cm4gcXVlcnlTdHJpbmc7XG59XG5cbmZ1bmN0aW9uIG9yZGVyQnlJZChhcnJheSkge1xuXG5cdHJldHVybiBhcnJheS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cdFx0cmV0dXJuIGEuaWQgLSBiLmlkO1xuXHR9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RSZXBvc2l0b3J5OyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBCcm93c2VySHR0cHNSZXF1ZXN0KFhNTEh0dHBSZXF1ZXN0KSB7XG5cbiAgICB0aGlzLl9YTUxIdHRwUmVxdWVzdCA9IFhNTEh0dHBSZXF1ZXN0IHx8IGdsb2JhbC5YTUxIdHRwUmVxdWVzdDtcbn07XG5cbkJyb3dzZXJIdHRwc1JlcXVlc3QucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgaW5zID0gdGhpcztcbiAgICB2YXIgeGhyID0gbmV3IHRoaXMuX1hNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICB2YXIgZGF0YSA9IGlucy5kYXRhU3RyaW5nIHx8IG51bGw7XG5cbiAgICAgICAgdmFyIHVybCA9IFwiaHR0cHM6Ly9cIiArIGlucy5ob3N0bmFtZSArIGlucy5wYXRoO1xuICAgICAgICB4aHIub3BlbihpbnMubWV0aG9kLCB1cmwsIHRydWUsIGlucy51c2VyLCBpbnMucGFzc3dvcmQpO1xuXG4gICAgICAgIHhoci50aW1lb3V0ID0gaW5zLnRpbWVvdXQgfHwgMDtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcihcIm5ldHdvcmtcIikpO1xuICAgICAgICB9O1xuICAgICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKFwidGltZW91dFwiKSk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKFwiYWJvcnRlZFwiKSk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoeGhyLnN0YXR1cykge1xuICAgICAgICAgICAgICAgIGNhc2UgMjAwOlxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO2JyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDAxOlxuICAgICAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoXCJ1bmF1dGhvcml6ZWRcIikpO2JyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDAzOlxuICAgICAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoXCJmb3JiaWRkZW5cIikpO2JyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDA0OlxuICAgICAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoXCJub3RfZm91bmRcIikpO2JyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChFcnJvcihcInVua25vd25fZXJyb3Jfb25sb2FkXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaGVhZGVycyA9IGlucy5oZWFkZXJzIHx8IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgaGVhZGVyc1trZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfSk7XG5cbiAgICBwcm9taXNlLmFib3J0ID0geGhyLmFib3J0LmJpbmQoeGhyKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8vIGRlcGVuZGVuY3kgbmVlZHMgdG8gYmUgc2V0IGJ5IHByb2dyYW1tZXJcbi8vIGJ5IHNldHRpbmcgdG8gdmFsdWUsIGUuZy4gd2luZG93LlhNTEh0dHBSZXF1ZXN0XG5Ccm93c2VySHR0cHNSZXF1ZXN0LlhNTEh0dHBSZXF1ZXN0ID0gbnVsbDtcblxuQnJvd3Nlckh0dHBzUmVxdWVzdC5tYWtlID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuICAgIHZhciByZXEgPSBuZXcgdGhpcyh0aGlzLlhNTEh0dHBSZXF1ZXN0KTtcbiAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmVxW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnJvd3Nlckh0dHBzUmVxdWVzdDsiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
