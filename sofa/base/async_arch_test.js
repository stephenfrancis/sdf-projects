/*jslint node: true */
"use strict";

// test async architecture patterns...

var Base = require("./Base"),
    Q    = require("q");

module.exports = Base.clone({ id: "obj" });

// must call a number of async functions, then call end()
module.exports.start = function () {
    var deferred = Q.defer();
    console.log("in  to start");
    this.promise = deferred.promise;
    this.addFirst();
    this.promise.then(this.end);
    deferred.resolve(1);
    console.log("out of start");
};

module.exports.addPromise = function (funct) {
    console.log("in  to addPromise");
	this.promise = this.promise.then(funct);
    console.log("out of addPromise");
};

module.exports.addFirst = function () {
	var that = this;
    console.log("in  to addFirst");
//    this.addPromise(function (val) { console.log(String(val)); return (val + 1); });
	setTimeout(function () {
		that.addPromise(that.addSecond);
	}, 2000);
    console.log("out of addFirst");
};

module.exports.addSecond = function (val) {
    console.log("in  to addSecond");
    console.log(String(val));
    console.log("out of addSecond");
    return (val + 1);
};

module.exports.end = function () {
    console.log("in  to end");
    console.log("out of end");
};
