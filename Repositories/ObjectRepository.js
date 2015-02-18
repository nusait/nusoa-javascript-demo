(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define('ObjectRepository', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.ObjectRepository = factory();
  }
}(this, function () {
// =================================================================
'use strict';

function ObjectRepository(HttpsRequest) {

	var envStore = {};
	if (typeof sessionStorage === 'object')         envStore = sessionStorage;
	if (typeof process === 'object' && process.env) envStore = process.env;

	this._HttpsRequest = HttpsRequest;

	this.hostname = 'nusoa.northwestern.edu';
	this.topLevelDirectory = 'WCAS_SOA_POC'
	this.version  = 'v1'; // can be overridden by user
	this.descriptor = null; // this needs be set by user
	this.user     = envStore.user || null;
	this.password = envStore.password || null;
	this.timeout  = {Accept: 'application/json'};
};

ObjectRepository.prototype.visible = function() {

	return this._HttpsRequest.make({
	    method:   'GET',
	    hostname: this.hostname,
	    path:     this.basePath,
	    user:     this.user,
	    password: this.password,
	    timeout:  this.timeout,
	    headers:  this.headers,
	}).send();
};

ObjectRepository.prototype.all = function(filters) {

	filters = filters || {};
	var queryString = objectToQueryString(filters);

	var descriptor = this.descriptor;
	var makeIntoArray = function(data) {
		data = data[descriptor];
		return Object.keys(data).map( function(key) {
			return data[key];
		});
	};

	var convert404toNull = function(error) {
		if (error.message === 'not_found') return null;
		return Promise.reject(error);
	}

	return this._HttpsRequest.make({

	    method:   'GET',
	    hostname: this.hostname,
	    path:     this.path + queryString,
	    user:     this.user,
	    password: this.password,
	    timeout:  this.timeout,
	    headers:  this.headers,

	}).send().then(makeIntoArray, convert404toNull);
};

ObjectRepository.prototype.get = function(id) {

	if (typeof id !== 'number') return Promise.reject('id must be a number');

	var descriptor = this.descriptor;
	var getNestedObject = function(data) {
		 var objects  = data[descriptor];
		 var index = Object.keys(objects)[0];
		 return objects[index];
	}

	return this._HttpsRequest.make({
	    method:   'GET',
	    hostname: this.hostname,
	    path:     this.path + '/' + id,
	    user:     this.user,
	    password: this.password,
	    timeout:  this.timeout,
	    headers:  this.headers,
	}).send().then(getNestedObject);
};

ObjectRepository.prototype.remove = function(id) {

	return this._HttpsRequest.make({
	    method:   'DELETE',
	    hostname: this.hostname,
	    path:     this.path + '/' + id,
	    user:     this.user,
	    password: this.password,
	    timeout:  this.timeout,
	    headers:  this.headers,
	}).send();
};

ObjectRepository.prototype.create = function(params) {

	var descriptor = this.descriptor;
	var dataObj = {};
	dataObj[descriptor] = params;

	var getNested = function(data) {

		return data[descriptor];
	}

	return this._HttpsRequest.make({
	    method:   'POST',
	    hostname: this.hostname,
	    path:     this.path,
	    user:     this.user,
	    password: this.password,
	    timeout:  this.timeout,
	    headers:  this.headers,
	    dataString: JSON.stringify(dataObj),
	}).send().then(getNested);
};

ObjectRepository.prototype.edit = function(id, newProps) {

	if (typeof newProps !== 'object') {
		return Promise.reject(new Error('2nd parameter must be an object'));
	}
	if (newProps.hasOwnProperty('id')) {
		return Promise.reject(new Error('you cannot change the id property'));
	}

	var getObjectFromRepo = this.get.bind(this, id);

	var addNewPropertiesToObject = function(object) {

		Object.keys(newProps).forEach( function(key) {
			object[key] = newProps[key];
		});
		return object;
	};

	var saveObjectReplacingOld = this.create.bind(this);

	return getObjectFromRepo()
		.then(addNewPropertiesToObject)
		.then(saveObjectReplacingOld);
};

Object.defineProperties(ObjectRepository.prototype, {

	basePath: {
		get: function() {
			return '/' + this.topLevelDirectory + '/' + this.version + '/';	
		}
	},
	path: {
		get: function() {
			if ( ! this.descriptor) throw('set this.descriptor');
			return this.basePath + this.descriptor;	
		}
	},
});

if ( ! ObjectRepository.name ) ObjectRepository.name = 'ObjectRepository';

// helpers
function objectToQueryString(filters) {

	var queryString = '';
	var encode = encodeURIComponent;

	filters = Object.keys(filters).map( function(key) {
		return ( encode(key) + '=' + encode(filters[key]) );
	});

	if (filters.length) queryString = '?' + filters.join('&');

	return queryString;	
}

return ObjectRepository;

// =================================================================
}));