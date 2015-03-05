/*global x, java */
"use strict";

x.addModule({
    id: "data",
    title: "Data"
});

x.loadFile("data/FieldSet.js");
x.loadFile("data/Entity.js");
x.loadFile("data/LoV.js");

x.loadFile("data/Text.js");
x.loadFile("data/Text_render.js");
x.loadFile("data/Attributes.js");
x.loadFile("data/Boolean.js");
x.loadFile("data/Date.js");
x.loadFile("data/DateTime.js");      // depends on Date
x.loadFile("data/Number.js");
x.loadFile("data/Option.js");
x.loadFile("data/Reference.js");
x.loadFile("data/Textarea.js");

x.finishedModule("data");