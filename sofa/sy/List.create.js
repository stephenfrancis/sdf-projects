/*jslint node: true */
"use strict";

module.exports = require("../page/Page").clone({
    id              : "create",
    entity_id       : "sy.List",
    title           : "Create a List of Values",
    transactional   : true,
    short_title     : "Create"
})
.sections.addAll([
    { id: "main" , type: "Create"    , entity_id: "sy.List" },
    { id: "items", type: "ListUpdate", entity_id: "sy.ListItem" }
]);


module.exports.addPage(Page.clone({
    id              : "deleet",
    title           : "Delete this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
}))
.sections.addAll([
    { id: "main", type: "Delete", entity_id: "sy.List" }
]);


module.exports.addPage(Page.clone({
    id              : "display",
    title           : "List of Values",
    requires_key    : true
}))
.sections.addAll([
    { id: "main"    , type: "Display"      , entity_id: "sy.List" }, 
//    { id: "items"   , type: "ListDisplay"  , entity_id: "sy.ListItem" }, 
//    { id: "chg_hist", type: "ChangeHistory", entity: "sy_list" }
])
.links   .addAll([
    { id: "update", page_to: "sy.List.update", page_key: "{page_key}" }, 
    { id: "delete", page_to: "sy.List.deleet", page_key: "{page_key}" }
]);


module.exports.addPage(Page.clone({
    id              : "search",
    title           : "Search for Lists of Values",
    short_title     : "Lists of Values"
}))
.sections.addAll([
//    { id: "main", type: "Search", entity: "sy_list" }
])
.links   .addAll([
    { id: "create", page_to: "sy.List.create" }
]);


module.exports.addPage(Page.clone({
    id              : "update",
    title           : "Update this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
}))
.sections.addAll([
    { id: "main" , type: "Update"    , entity_id: "sy.List" }
//    { id: "items", type: "ListUpdate", entity_id: "x.sy.ListItem" }
]);

