/*jslint node: true */
"use strict";

module.exports = require("../page/Page").clone({
    id              : "update",
    entity_id       : "sy.List",
    title           : "Update this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
})
.sections.addAll([
    { id: "main" , type: "Update"    , entity_id: "sy.List" },
    { id: "items", type: "ListUpdate", entity_id: "sy.ListItem" }
]);

