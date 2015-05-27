/*jslint node: true */
"use strict";

module.exports = require("../page/Page").clone({
    id              : "display",
    entity_id       : "sy.List",
    title           : "List of Values",
    requires_key    : true
})
.sections.addAll([
    { id: "main"    , type: "Display"      , entity_id: "sy.List" }, 
//    { id: "items"   , type: "ListDisplay"  , entity_id: "sy.ListItem" }, 
//    { id: "chg_hist", type: "ChangeHistory", entity: "sy_list" }
])
.links   .addAll([
    { id: "update", page_to: "sy.List.update", page_key: "{page_key}" }, 
    { id: "delete", page_to: "sy.List.deleet", page_key: "{page_key}" }
]);
