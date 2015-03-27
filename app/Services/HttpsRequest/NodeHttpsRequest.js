'use strict';

const log = console.log.bind(console);
// const privates = new WeakMap();
// const _ = privates.get.bind(privates);

class NodeHttpsRequest {

    constructor(https) {

        this.https = https;

        // privates.set(this, {
        //     https: https || require('https')
        // });
    }

    send() {

        var ins   = this;
        var abort = () => {};
        // var https = _(ins).https;
        var {https, user, password, timeout} = ins;

        if (user && password) ins.auth = `${user}:${password}`;

        var promise = new Promise((resolve, reject) => {

            var request = https.request(ins); 

            request.on('error', () => reject( Error('network') ));
            request.on('response', message => {

                var responseText = '';
                var statusCode   = message.statusCode;

                message.setEncoding('utf8');
                message.on('data', chunk => responseText += chunk);
                message.on('end', () => {

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

            if (timeout) {
                request.setTimeout(timeout, () => {
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

NodeHttpsRequest.make = function(options) {

    var req = new this(this.https);
    Object.keys(options).forEach(key => req[key] = options[key]);
    return req;
};

export default NodeHttpsRequest;