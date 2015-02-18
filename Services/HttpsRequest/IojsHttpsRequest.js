

// THIS IMPLEMENTATION IS NOT COMPLETE, STILL A WORK IN PROGRESS!

'use strict';

const https = require('https');
const log   = console.log.bind(console);

class IojsHttpsRequest {

    send() {

        var cancel, ins = this;

        if (ins.user && ins.password) {
            this.auth = `${ins.user}:${ins.password}`;
        }

        var promise = new Promise((resolve, reject) => {

            var onResponse = message => {

                var responseText = '';
                var statusCode = message.statusCode;

                message.setEncoding('utf8')
                    .on('data', chunk => responseText += chunk)
                    .on('end', () => {

                        switch (statusCode) {

                            case 200:
                                resolve(responseText);
                                break;

                            case 401:
                                reject(Error('unauthorized'));
                                break;

                            case 404:
                                reject(Error('not_found'));
                                break;

                            default:
                                reject(Error(`${statusCode}: ${responseText}`));
                        }
                    });
            };

            var request = https.request(ins, onResponse);
            request.on('error', reject);
            request.end();

            if (ins.timeout) {
                request.setTimeout(ins.timeout, () => {
                    request.abort();
                    reject( Error('timeout') );
                });
            }

            cancel = () => {
                request.abort();
                reject( Error('aborted') );
            };
        });

        promise.cancel = () => {
            if (cancel) cancel();
        };

        return promise;
    }
}

module.exports = IojsHttpsRequest;
