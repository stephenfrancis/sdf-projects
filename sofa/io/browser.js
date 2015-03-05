/*global  */
"use strict";


x.io.browser = {};

x.io.browser.addElement = function (parent, tag) {
    parent.append("<" + tag + "/>");
    return parent.children(tag).last();
};


//To show up in Chrome debugger...
//@ sourceURL=io/browser.js