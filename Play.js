(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define('Play', factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.Play = factory();
  }

}(this, function () {
// =================================================================

'use strict';

var log = console.log.bind(console);
var error = console.error.bind(console);

function Play(petRepo) {

    this._petRepo = petRepo;
}

Play.prototype.getById1 = function() {

    return this._petRepo.get(1).then(log, error);
};

Play.prototype.getDogs = function() {

    return this._petRepo.all({type: 'dog'}).then(log, error);
};

Play.prototype.getCats = function() {

    return this._petRepo.all({type: 'cats'}).then(function(value) {
    	log('the value is ' + value);
    }, error);
};

return Play;

// =====


// =================================================================
}));

this.log = console.log.bind(console);
this.error = console.error.bind(console);

this.BrowserHttpsRequest.XMLHttpRequest = this.XMLHttpRequest;
this.petRepo = new this.PetRepository(this.BrowserHttpsRequest);
this.play = new this.Play(this.petRepo);
// this.play.tryGet();