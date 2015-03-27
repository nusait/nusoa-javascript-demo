
function BrowserHttpsRequest(XMLHttpRequest) {

    this._XMLHttpRequest = XMLHttpRequest || global.XMLHttpRequest;
};

BrowserHttpsRequest.prototype.send = function() {

    var ins = this;
    var xhr = new this._XMLHttpRequest();

    var promise = new Promise( function(resolve, reject) {

        var data = ins.dataString || null;

        var url = 'https://' + ins.hostname + ins.path;
        xhr.open(ins.method, url, true, ins.user, ins.password);

        xhr.timeout = ins.timeout || 0;

        xhr.onerror   = function() {reject( Error('network') );};
        xhr.ontimeout = function() {reject( Error('timeout') );};
        xhr.onabort   = function() {reject( Error('aborted') );};
        xhr.onload    = function() {

            switch(xhr.status) {
                case 200: resolve( JSON.parse(xhr.responseText)); break;
                case 401: reject( Error('unauthorized'));         break;
                case 403: reject( Error('forbidden'));            break;
                case 404: reject( Error('not_found'));            break;
                default:  reject( Error('unknown_error_onload'));
            }
        };

        var headers = ins.headers || {};
        Object.keys(headers).forEach( function(key) {
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

BrowserHttpsRequest.make = function(options) {

    var req = new this(this.XMLHttpRequest);
    Object.keys(options).forEach( function(key) {
        req[key] = options[key];
    });
    return req;
};

export default BrowserHttpsRequest;
