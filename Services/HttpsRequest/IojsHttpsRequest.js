'use strict';

const log = console.log.bind(console);
const privates = new WeakMap();
const _ = privates.get.bind(privates);

class IojsHttpsRequest {

    constructor(https) {

        privates.set(this, {
            https: https || require('https')
        });
    }

    send() {

        var ins   = this;
        var abort = () => {};
        var https = _(ins).https;

        if (ins.user && ins.password) ins.auth = `${ins.user}:${ins.password}`;

        var promise = new Promise((resolve, reject) => {

            var request = https.request(ins);

            request.on('error', () => reject( Error('network') ));
            request.on('response', message => {

                var responseText = '';
                var statusCode   = message.statusCode;

                message.setEncoding('utf8')
                    .on('data', chunk => responseText += chunk)
                    .on('end', () => {

                        switch (statusCode) {
                            case 200: resolve(JSON.parse(responseText)); break;
                            case 401: reject(Error('unauthorized')); break;
                            case 403: reject(Error('forbidden')); break;
                            case 404: reject(Error('not_found')); break;
                            default:  reject(Error('unknown_error_onload'));
                        }
                    });
            });
            request.end();

            if (ins.timeout) {
                request.setTimeout(ins.timeout, () => {
                    request.abort();
                    reject( Error('timeout') );
                });
            }

            abort = () => {
                request.abort();
                reject( Error('aborted') );
            };
        });
        promise.abort = abort;
        return promise;
    }
}

IojsHttpsRequest.make = options => {

    var req = new this(this.https);
    Object.keys(options).forEach(key => req[key] = options[key]);
    return req;
};

module.exports = IojsHttpsRequest;