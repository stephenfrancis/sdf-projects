/*jslint node: true */
"use strict";

module.exports = require("../page/Page").clone({
    id              : "delete",
    entity_id       : "sy.List",
    title           : "Delete this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
})
.sections.addAll([
    { id: "main", type: "Delete", entity_id: "sy.List" }
]);
