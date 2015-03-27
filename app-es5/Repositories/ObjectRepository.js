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