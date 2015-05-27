/*jslint node: true */
"use strict";

module.exports = require("../data/PersistentEntity").clone({

    id              : "List",
    title           : "List of Values",
    primary_key     : "module,id",
    default_order   : "title",
    label_pattern   : "{title}",
    display_page    : true,
    autocompleter   : true,
    transactional   : true,
    full_text_search: true,
    plural_label    : "Lists of Values",
})
.fields.addAll([
    { id: "module", label: "Module", type: "Text", data_length:   2, mandatory: true, search_criterion: true, list_column: true, config_item: "x.areas" },
    { id: "id"    , label: "Id"    , type: "Text", data_length:  40, mandatory: true, search_criterion: true, list_column: true },
    { id: "title" , label: "Title" , type: "Text", data_length: 160, mandatory: true, search_criterion: true, list_column: true }
])
.indexes = [];
