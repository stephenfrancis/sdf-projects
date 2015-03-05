/*global x, java */
"use strict";

x.addModule({
    id: "io",
    title: "Input/Output"
});

x.loadFile("io/http.js");
//x.loadFile("io/ui.js");
//x.loadFile("io/XmlStream.js");
x.loadFile("io/browser.js");

x.finishedModule("io");