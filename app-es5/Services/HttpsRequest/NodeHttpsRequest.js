"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var log = console.log.bind(console);
// const privates = new WeakMap();
// const _ = privates.get.bind(privates);

var NodeHttpsRequest = (function () {
    function NodeHttpsRequest(https) {
        _classCallCheck(this, NodeHttpsRequest);

        this.https = https;

        // privates.set(this, {
        //     https: https || require('https')
        // });
    }

    _createClass(NodeHttpsRequest, {
        send: {
            value: function send() {

                var ins = this;
                var abort = function () {};
                // var https = _(ins).https;
                var https = ins.https;
                var user = ins.user;
                var password = ins.password;
                var timeout = ins.timeout;

                if (user && password) ins.auth = "" + user + ":" + password;

                var promise = new Promise(function (resolve, reject) {

                    var request = https.request(ins);

                    request.on("error", function () {
                        return reject(Error("network"));
                    });
                    request.on("response", function (message) {

                        var responseText = "";
                        var statusCode = message.statusCode;

                        message.setEncoding("utf8");
                        message.on("data", function (chunk) {
                            return responseText += chunk;
                        });
                        message.on("end", function () {

                            switch (statusCode) {
                                case 200:
                                    resolve(JSON.parse(responseText));break;
                                case 401:
                                    reject(Error("unauthorized"));break;
                                case 403:
                                    reject(Error("forbidden"));break;
                                case 404:
                                    reject(Error("not_found"));break;
                                default:
                                    reject(Error("unknown_error_onload"));
                            }
                        });
                    });
                    request.end();

                    if (timeout) {
                        request.setTimeout(timeout, function () {
                            request.abort();
                            reject(Error("timeout"));
                        });
                    }

                    abort = function () {
                        request.abort();
                        reject(Error("aborted"));
                    };
                });
                promise.abort = abort;
                return promise;
            }
        }
    });

    return NodeHttpsRequest;
})();

NodeHttpsRequest.make = function (options) {

    var req = new this(this.https);
    Object.keys(options).forEach(function (key) {
        return req[key] = options[key];
    });
    return req;
};

module.exports = NodeHttpsRequest;