!function t(e, r, s) {
    function o(i, u) {
        if (!r[i]) {
            if (!e[i]) {
                var a = "function" == typeof require && require;
                if (!u && a) return a(i, !0);
                if (n) return n(i, !0);
                var h = new Error("Cannot find module '" + i + "'");
                throw h.code = "MODULE_NOT_FOUND", h;
            }
            var p = r[i] = {
                exports: {}
            };
            e[i][0].call(p.exports, function(t) {
                var r = e[i][1][t];
                return o(r ? r : t);
            }, p, p.exports, t, e, r, s);
        }
        return r[i].exports;
    }
    for (var n = "function" == typeof require && require, i = 0; i < s.length; i++) o(s[i]);
    return o;
}({
    1: [ function(t) {
        (function(e) {
            "use strict";
            var r = function(t) {
                return t && t.__esModule ? t["default"] : t;
            }, s = r(t("../Services/HttpsRequest/BrowserHttpsRequest")), o = r(t("../Repositories/ObjectRepository")), n = e.console, i = e.sessionStorage, u = e.XMLHttpRequest;
            s.XMLHttpRequest = u;
            var a = new o(s), h = i.user, p = i.password;
            if (!h && !p) throw "no sessionStorage.user and sessionStorage.password";
            a.user = h, a.password = p, e.log = n.log.bind(n), e.table = n.table.bind(n), e.error = n.error.bind(n), 
            e.repo = a;
        }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
    }, {
        "../Repositories/ObjectRepository": 2,
        "../Services/HttpsRequest/BrowserHttpsRequest": 3
    } ],
    2: [ function(t, e) {
        (function(t) {
            "use strict";
            function r(e) {
                var r = {};
                "object" == typeof sessionStorage && (r = sessionStorage), "object" == typeof t && t.env && (r = t.env), 
                this._HttpsRequest = e, this.topLevelDirectory = "WCAS_SOA_POC", this.hostname = "nusoa.northwestern.edu", 
                this.version = "v1", this.descriptor = null, this.user = r.user || null, this.password = r.password || null, 
                this.timeout = 1e4, this.headers = {
                    Accept: "application/json"
                };
            }
            function s(t) {
                var e = "", r = encodeURIComponent;
                return t = Object.keys(t).map(function(e) {
                    return r(e) + "=" + r(t[e]);
                }), t.length && (e = "?" + t.join("&")), e;
            }
            function o(t) {
                return t.sort(function(t, e) {
                    return t.id - e.id;
                });
            }
            r.prototype.visible = function() {
                return this._HttpsRequest.make({
                    method: "GET",
                    hostname: this.hostname,
                    path: this.basePath,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers
                }).send();
            }, r.prototype.setAccess = function(t) {
                var e = [ "public-read", "private" ];
                if (e.indexOf(t) < 0) return Promise.reject(new Error("not valid access type"));
                var r = {
                    access_control: t
                };
                return this._HttpsRequest.make({
                    method: "POST",
                    hostname: this.hostname,
                    path: this.basePath,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers,
                    dataString: JSON.stringify(r)
                }).send();
            }, r.prototype.setPermissions = function(t) {
                var e = {
                    ldap_accounts: t
                };
                return this._HttpsRequest.make({
                    method: "POST",
                    hostname: this.hostname,
                    path: this.path,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers,
                    dataString: JSON.stringify(e)
                }).send();
            }, r.prototype.dropEntireObjectType = function() {
                return this._HttpsRequest.make({
                    method: "DELETE",
                    hostname: this.hostname,
                    path: this.path,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers
                }).send();
            }, r.prototype.all = function(t) {
                t = t || {};
                var e = s(t), r = this.descriptor, n = function(t) {
                    return t = t[r], Object.keys(t).map(function(e) {
                        return t[e];
                    });
                }, i = function(t) {
                    return "not_found" === t.message ? null : Promise.reject(t);
                };
                return this._HttpsRequest.make({
                    method: "GET",
                    hostname: this.hostname,
                    path: this.path + e,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers
                }).send().then(n).then(o, i);
            }, r.prototype.get = function(t) {
                if ("number" != typeof t) return Promise.reject("id must be a number");
                var e = this.descriptor, r = function(t) {
                    var r = t[e], s = Object.keys(r)[0];
                    return r[s];
                };
                return this._HttpsRequest.make({
                    method: "GET",
                    hostname: this.hostname,
                    path: this.path + "/" + t,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers
                }).send().then(r);
            }, r.prototype.remove = function(t) {
                var e = this;
                if (t.length) {
                    var r = Promise.resolve();
                    t.forEach(function(t) {
                        r = r.then(e.remove.bind(e, t));
                    });
                    var s = function() {
                        return {
                            message: "ok"
                        };
                    };
                    return r.then(s);
                }
                return this._HttpsRequest.make({
                    method: "DELETE",
                    hostname: this.hostname,
                    path: this.path + "/" + t,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers
                }).send();
            }, r.prototype.create = function(t) {
                function e(t) {
                    return t[r];
                }
                var r = this.descriptor, s = {};
                return s[r] = t, this._HttpsRequest.make({
                    method: "POST",
                    hostname: this.hostname,
                    path: this.path,
                    user: this.user,
                    password: this.password,
                    timeout: this.timeout,
                    headers: this.headers,
                    dataString: JSON.stringify(s)
                }).send().then(e);
            }, r.prototype.first = function(t) {
                function e(t) {
                    return t && t.length ? t[0] : null;
                }
                return this.all(t).then(e);
            }, r.prototype.last = function(t) {
                function e(t) {
                    if (t && t.length) {
                        var e = t.length - 1;
                        return t[e];
                    }
                    return null;
                }
                return this.all(t).then(e);
            }, r.prototype.edit = function(t, e) {
                var r;
                if ("object" != typeof e) return Promise.reject(new Error("2nd parameter must be an object"));
                if (e.hasOwnProperty("id")) return Promise.reject(new Error("you cannot change the id property"));
                var s = this.get.bind(this, t), o = function(t) {
                    return r = t.id, Object.keys(e).forEach(function(r) {
                        t[r] = e[r];
                    }), t;
                }, n = this.create.bind(this);
                return s().then(o).then(n);
            }, Object.defineProperties(r.prototype, {
                basePath: {
                    get: function() {
                        return "/" + this.topLevelDirectory + "/" + this.version + "/";
                    }
                },
                path: {
                    get: function() {
                        if (!this.descriptor) throw "set this.descriptor";
                        return this.basePath + this.descriptor;
                    }
                }
            }), r.prototype.find = r.prototype.first, r.name || (r.name = "ObjectRepository"), 
            e.exports = r;
        }).call(this, t("_process"));
    }, {
        _process: 4
    } ],
    3: [ function(t, e) {
        (function(t) {
            "use strict";
            function r(e) {
                this._XMLHttpRequest = e || t.XMLHttpRequest;
            }
            r.prototype.send = function() {
                var t = this, e = new this._XMLHttpRequest(), r = new Promise(function(r, s) {
                    var o = t.dataString || null, n = "https://" + t.hostname + t.path;
                    e.open(t.method, n, !0, t.user, t.password), e.timeout = t.timeout || 0, e.onerror = function() {
                        s(Error("network"));
                    }, e.ontimeout = function() {
                        s(Error("timeout"));
                    }, e.onabort = function() {
                        s(Error("aborted"));
                    }, e.onload = function() {
                        switch (e.status) {
                          case 200:
                            r(JSON.parse(e.responseText));
                            break;

                          case 401:
                            s(Error("unauthorized"));
                            break;

                          case 403:
                            s(Error("forbidden"));
                            break;

                          case 404:
                            s(Error("not_found"));
                            break;

                          default:
                            s(Error("unknown_error_onload"));
                        }
                    };
                    var i = t.headers || {};
                    Object.keys(i).forEach(function(t) {
                        e.setRequestHeader(t, i[t]);
                    }), e.send(o);
                });
                return r.abort = e.abort.bind(e), r;
            }, r.XMLHttpRequest = null, r.make = function(t) {
                var e = new this(this.XMLHttpRequest);
                return Object.keys(t).forEach(function(r) {
                    e[r] = t[r];
                }), e;
            }, e.exports = r;
        }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
    }, {} ],
    4: [ function(t, e) {
        function r() {
            if (!i) {
                i = !0;
                for (var t, e = n.length; e; ) {
                    t = n, n = [];
                    for (var r = -1; ++r < e; ) t[r]();
                    e = n.length;
                }
                i = !1;
            }
        }
        function s() {}
        var o = e.exports = {}, n = [], i = !1;
        o.nextTick = function(t) {
            n.push(t), i || setTimeout(r, 0);
        }, o.title = "browser", o.browser = !0, o.env = {}, o.argv = [], o.version = "", 
        o.versions = {}, o.on = s, o.addListener = s, o.once = s, o.off = s, o.removeListener = s, 
        o.removeAllListeners = s, o.emit = s, o.binding = function() {
            throw new Error("process.binding is not supported");
        }, o.cwd = function() {
            return "/";
        }, o.chdir = function() {
            throw new Error("process.chdir is not supported");
        }, o.umask = function() {
            return 0;
        };
    }, {} ]
}, {}, [ 1 ]);