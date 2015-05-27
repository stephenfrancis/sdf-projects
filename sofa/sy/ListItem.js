/*jslint node: true */
"use strict";

module.exports = require("../data/PersistentEntity").clone({

    id              : "ListItem",
    title           : "List Item",
    parent_entity_id: "sy.List",
    link_field_id   : "list",
    primary_key     : "list,id",    // Specified like this to avoid issues with multi-part keys from changing sequence
    default_order	: "list,seq_number",
    label_pattern   : "{text}",
    transactional   : true
})
.fields.addAll([
    { id: "seq_number"  , label: "Seq"       , type: "Number"   , mandatory: true, search_criterion: true, list_column: true, decimal_digits: 0 },
    { id: "list"        , label: "List"      , type: "Reference", mandatory: true, search_criterion: true, list_column: true, ref_entity: "sy.List" },
    { id: "id"          , label: "Id"        , type: "Text"     , mandatory: true, list_column: true, data_length: 10 },
    { id: "text"        , label: "Text"      , type: "Text"     , mandatory: true, list_column: true, data_length: 80 },
    { id: "active"      , label: "Active for Selection?", type: "Option", mandatory: true, list_column: true, list: "sy.active", default_val: "A" }
]);
