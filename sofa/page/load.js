/*global x, java */
"use strict";

x.addModule({
    id: "page",
    title: "Page"
});

x.loadFile("page/Page.js");
x.loadFile("page/Section.js");
x.loadFile("page/Tab.js");
x.loadFile("page/Link.js");
x.loadFile("page/Button.js");
x.loadFile("page/FormBase.js");
x.loadFile("page/ListBase.js");
x.loadFile("page/ListUpdate.js");
x.loadFile("page/ListDisplay.js");

x.finishedModule("page");