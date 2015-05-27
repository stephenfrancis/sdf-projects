/*jslint node: true */
"use strict";

module.exports = require("../page/Page").clone({
    id              : "search",
    entity_id       : "sy.List",
    title           : "Search for Lists of Values",
    short_title     : "Lists of Values"
})
.sections.addAll([
    { id: "main", type: "Search", entity_id: "sy.List" }
])
.links   .addAll([
    { id: "create", page_to: "sy.List.create" }
]);
