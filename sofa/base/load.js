/*global x, java */
"use strict";

x.base = { owner: x };

x.loadFile("base/lang.js");
x.loadFile("base/date_format.js");
x.loadFile("base/date_library.js");
x.loadFile("base/Base.js");
x.loadFile("base/Module.js");
x.loadFile("base/OrderedMap.js");
//x.loadFile("ba/EventStack.js");
//x.loadFile("ba/Exception.js");

x.finishedModule("base");