/*global x, java */
"use strict";

var x = {};


x.loaded = {};

x.loadFile = function (src) {
    if (!x.loaded[src]) {
        if (typeof load === "function") {
            try {
                load(src);
            } catch (e) {
                print(e);
                print(e.stack);
            }
            x.loaded[src] = true;
        } else {
            $.ajax({ url: src, dataType: "script", cache: true, async: false, type: "GET",
                success: function () {
                    x.loaded[src] = true;
                },
                error: function (XHR, descr, exception) {
                    x.loadFile.exception = exception;
                    throw new Error(exception + " trying to get " + src);
                }
            });
        }
    }
};

x.loadModule = function (src) {
    x.loadFile(src + "/load.js");
};


x.finishedModule = function (module_id) {
    Object.freeze(x[module_id]);
};

x.finishedModuleLoad = function () {
    Object.preventExtensions(x);
};

//To show up in Chrome debugger...
//@ sourceURL=base/x.js