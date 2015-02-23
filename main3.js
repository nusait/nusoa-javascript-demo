var http = require("http");
var url  = require("url");

function start(route) {

  function onRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    console.log("Request for " + pathname + " received.");

    // route(pathname);

    if (request.url === '/favicon.ico') {
        response.writeHead(200, {'Content-Type': 'image/x-icon'} );
        response.end();
        console.log('favicon requested');
        return;
    }

    // http://www.shutterstock.com/

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello World");
    response.end();
  }

  var server = http.createServer();
  server.on('request', onRequest);
  server.listen(8888);
  
  console.log("Server has started.");
}

start();