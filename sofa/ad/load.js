/*global x, java */
"use strict";

x.addModule({
    id: "ad",
    title: "Admin"
});

x.loadFile("ad/ad_company.js");
x.loadFile("ad/ad_region.js");

x.finishedModule("ad");
