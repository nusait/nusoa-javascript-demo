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