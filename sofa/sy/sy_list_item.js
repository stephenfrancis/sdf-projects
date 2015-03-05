/*global x, java */
"use strict";

x.sy.addEntity({
    id              : "ListItem",
    title           : "List Item",
//    primary_key     : "list,id",    // Specified like this to avoid issues with multi-part keys from changing sequence
//    parent_entity   : "sy_list",
//    link_field      : "list",
    default_order   : "list,seq_number",
//    icon            : "style/Axialis/Png/24x24/User.png",
    label_pattern   : "{text}",
//    transactional   : true,
//    pack_level      : 0,
//    pack_condition  : "list in ( select distinct _key from sy_list where area='{module}' )",
});

x.sy.ListItem.addFields([
//    { id: "seq_number"  , label: "Seq"       , type: "Number"   , mandatory: true, search_criterion: true, list_column: true, decimal_digits: 0, sort_seq: 1 },
//    { id: "list"        , label: "List"      , type: "Reference", mandatory: true, search_criterion: true, list_column: true, ref_entity: "sy_list" },
    { id: "id"          , label: "Id"        , type: "Text"     , mandatory: true, list_column: true, data_length: 10 },
    { id: "text"        , label: "Text"      , type: "Text"     , mandatory: true, list_column: true, data_length: 80 },
    { id: "active"      , label: "Active for Selection?", type: "Option", mandatory: true, list_column: true, list : "sy.active", default_val: "A" },
    { id: "from_value"  , label: "From Value", type: "Number"   , list_column: true, decimal_digits: 0 },
    { id: "to_value"    , label: "To Value"  , type: "Number"   , list_column: true, decimal_digits: 0 }
]);
