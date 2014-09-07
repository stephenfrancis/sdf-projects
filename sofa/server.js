/*global  */
"use strict";

var x = { server_side: true },
    console = { log: print };

x.Base = {};

x.addMessage = function (str) {
	console.log(str);
};

x.loaded = {};

x.loadFile = function (src) {
    load(src);
};

x.loadModule = function (src) {
	x.loadFile(src + "/load.js");
};


x.loadModule("ba");
x.loadModule("da");
x.loadModule("pa");
x.loadModule("io");
x.loadModule("ac");
x.loadModule("sy");
x.loadModule("ad");

var session = x.Session.clone({ user_id: "francis" });

