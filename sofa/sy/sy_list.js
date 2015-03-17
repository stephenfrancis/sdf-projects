/*global x, java */
"use strict";

x.sy.addEntity({
    id              : "List",
    title           : "List of Values",
    display_page    : true,
    autocompleter   : true,
    transactional   : true,
    full_text_search: true,
    label_pattern   : "{title}",
    default_order   : "area,title",
    primary_key     : "id",
//    icon            : "style/Axialis/Png/24x24/Table.png",
    plural_label    : "Lists of Values",
    url_prefix      : "sy_list:"
//    pack_level      : 0,
//    pack_condition  : "area='{module}'"
});
x.sy.List.addFields([
//    { id: "area" , label: "Area" , type: "Text", data_length:   2, mandatory: true, search_criterion: true, list_column: true, config_item: "x.areas" }, 
    { id: "id"   , label: "Id"   , type: "Text", data_length:  40, mandatory: true, search_criterion: true, list_column: true }, 
    { id: "title", label: "Title", type: "Text", data_length: 160, mandatory: true, search_criterion: true, list_column: true }
]);
x.sy.List.indexes = [];
// End of Entity sy_list


x.sy.List.addPage({
    id              : "context",
    type            : x.page.ContextPage,
    title           : "List of Values",
    requires_key    : true
});
x.sy.List.pages.context.sections.addAll([
    { id: "main"    , type: "Display" }
]);
x.sy.List.pages.context.links.addAll([
    { id: "update", page_to: "x.sy.List.update", page_key: "{page_key}" }, 
    { id: "delete", page_to: "x.sy.List.delete", page_key: "{page_key}" }
]);
// End of Page sy_list_context


x.sy.List.addPage({
    id              : "create",
    title           : "Create a List of Values",
    transactional   : true,
    short_title     : "Create"
});
x.sy.List.pages.create.sections.addAll([
    { id: "main" , type: "Create"    , entity_id: "x.sy.List" },
    { id: "items", type: "ListUpdate", entity_id: "x.sy.ListItem" }
]);
// End of Page sy_list_create


x.sy.List.addPage({
    id              : "deleet",
    title           : "Delete this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.sy.List.pages.deleet.sections.addAll([
    { id: "main", type: "Delete", entity_id: "x.sy.List" }
]);
// End of Page sy_list_delete


x.sy.List.addPage({
    id              : "display",
    title           : "List of Values",
    requires_key    : true
});
x.sy.List.pages.display.sections.addAll([
    { id: "main"    , type: "Display"      , entity_id: "x.sy.List" }, 
//    { id: "items"   , type: "ListDisplay"  , entity_id: "x.sy.ListItem" }, 
//    { id: "chg_hist", type: "ChangeHistory", entity: "sy_list" }
]);
x.sy.List.pages.display.links.addAll([
    { id: "update", page_to: "x.sy.List.update", page_key: "{page_key}" }, 
    { id: "delete", page_to: "x.sy.List.deleet", page_key: "{page_key}" }
]);
// End of Page sy_list_display


x.sy.List.addPage({
    id              : "search",
    title           : "Search for Lists of Values",
    short_title     : "Lists of Values"
});
x.sy.List.pages.search.sections.addAll([
//    { id: "main", type: "Search", entity: "sy_list" }
]);
x.sy.List.pages.search.links.addAll([
    { id: "create", page_to: "x.sy.List.create" }
]);
// End of Page sy_list_search


x.sy.List.addPage({
    id              : "update",
    title           : "Update this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.sy.List.pages.update.sections.addAll([
    { id: "main" , type: "Update"    , entity_id: "x.sy.List" },
//    { id: "items", type: "ListUpdate", entity_id: "x.sy.ListItem" }
]);
// End of Page sy_list_update


