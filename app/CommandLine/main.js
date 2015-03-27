import es6Promise from 'es6-promise';
es6Promise.polyfill();

import repl from 'repl';
import {promisify} from 'repl-promised';

import https from 'https';
import NodeHttpsRequest from '../Services/HttpsRequest/NodeHttpsRequest';
import ObjectRepository from '../Repositories/ObjectRepository';

import consoleTable from 'console.table';

var {env} = process;
var {console} = global;

global.log   = console.log.bind(console);
global.error = console.error.bind(console);
global.table = console.table.bind(console);

NodeHttpsRequest.https = https;
    
var repo = new ObjectRepository(NodeHttpsRequest);
repo.user     = env.user;
repo.password = env.password;

global.repo = repo;

promisify(repl.start({useGlobal: true}));

// export default repo;