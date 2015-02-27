/*global x, java */
"use strict";

x.entities.sy_list = x.data.Entity.clone({
    id              : "sy_list",
    title           : "List of Values",
    module_id       : "sy",
    display_page    : true,
    autocompleter   : true,
    transactional   : true,
    full_text_search: true,
    label_pattern   : "{title}",
    default_order   : "area,title",
    primary_key     : "id",
//    icon            : "style/Axialis/Png/24x24/Table.png",
    plural_label    : "Lists of Values",
//    pack_level      : 0,
//    pack_condition  : "area='{module}'"
});
x.entities.sy_list.addFields([
//    { id: "area" , label: "Area" , type: "Text", data_length:   2, mandatory: true, search_criterion: true, list_column: true, config_item: "x.areas" }, 
    { id: "id"   , label: "Id"   , type: "Text", data_length:  40, mandatory: true, search_criterion: true, list_column: true }, 
    { id: "title", label: "Title", type: "Text", data_length: 160, mandatory: true, search_criterion: true, list_column: true }
]);
x.entities.sy_list.indexes = [];
// End of Entity sy_list


x.pages.sy_list_context = x.ContextPage.clone({
    id              : "sy_list_context",
    entity          : x.entities.sy_list,
    title           : "List of Values",
    requires_key    : true
});
x.pages.sy_list_context.sections.addAll([
    { id: "main"    , type: "Display", entity_id: "sy_list" }
]);
x.pages.sy_list_context.links.addAll([
    { id: "update", page_to: "sy_list_update", page_key: "{page_key}" }, 
    { id: "delete", page_to: "sy_list_delete", page_key: "{page_key}" }
]);
// End of Page sy_list_context


x.pages.sy_list_create = x.Page.clone({
    id              : "sy_list_create",
    entity          : x.entities.sy_list,
    title           : "Create a List of Values",
    transactional   : true,
    short_title     : "Create"
});
x.pages.sy_list_create.sections.addAll([
    { id: "main" , type: "Create"    , entity_id: "sy_list" },
    { id: "items", type: "ListUpdate", entity_id: "sy_list_item" }
]);
// End of Page sy_list_create


x.pages.sy_list_delete = x.Page.clone({
    id              : "sy_list_delete",
    entity          : x.entities.sy_list,
    title           : "Delete this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.pages.sy_list_delete.sections.addAll([
    { id: "main", type: "Delete", entity_id: "sy_list" }
]);
// End of Page sy_list_delete


x.pages.sy_list_display = x.Page.clone({
    id              : "sy_list_display",
    entity          : x.entities.sy_list,
    title           : "List of Values",
    requires_key    : true
});
x.pages.sy_list_display.sections.addAll([
    { id: "main"    , type: "Display"      , entity_id: "sy_list" }, 
    { id: "items"   , type: "ListDisplay"  , entity_id: "sy_list_item" }, 
//    { id: "chg_hist", type: "ChangeHistory", entity: "sy_list" }
]);
x.pages.sy_list_display.links.addAll([
    { id: "update", page_to: "sy_list_update", page_key: "{page_key}" }, 
    { id: "delete", page_to: "sy_list_delete", page_key: "{page_key}" }
]);
// End of Page sy_list_display


x.pages.sy_list_search = x.Page.clone({
    id              : "sy_list_search",
    entity          : x.entities.sy_list,
    title           : "Search for Lists of Values",
    short_title     : "Lists of Values"
});
x.pages.sy_list_search.sections.addAll([
//    { id: "main", type: "Search", entity: "sy_list" }
]);
x.pages.sy_list_search.links.addAll([
    { id: "create", page_to: "sy_list_create" }
]);
// End of Page sy_list_search


x.pages.sy_list_update = x.Page.clone({
    id              : "sy_list_update",
    entity          : x.entities.sy_list,
    title           : "Update this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.pages.sy_list_update.sections.addAll([
    { id: "main" , type: "Update"    , entity_id: "sy_list" },
    { id: "items", type: "ListUpdate", entity_id: "sy_list_item" }
]);
// End of Page sy_list_update


