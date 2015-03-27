"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var es6Promise = _interopRequire(require("es6-promise"));

es6Promise.polyfill();

var repl = _interopRequire(require("repl"));

var promisify = require("repl-promised").promisify;

var https = _interopRequire(require("https"));

var NodeHttpsRequest = _interopRequire(require("../Services/HttpsRequest/NodeHttpsRequest"));

var ObjectRepository = _interopRequire(require("../Repositories/ObjectRepository"));

var consoleTable = _interopRequire(require("console.table"));

var env = process.env;
var console = global.console;

global.log = console.log.bind(console);
global.error = console.error.bind(console);
global.table = console.table.bind(console);

NodeHttpsRequest.https = https;

var repo = new ObjectRepository(NodeHttpsRequest);
repo.user = env.user;
repo.password = env.password;

global.repo = repo;

promisify(repl.start({ useGlobal: true }));

// export default repo;