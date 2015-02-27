/*global x, java */
"use strict";

x.entities.ad_region = x.data.Entity.clone({
    id              : "ad_region",
    title           : "Region",
    area            : "ad",
    display_page    : true,
    transactional   : true,
    label_pattern   : "{title}",
    default_order   : "title",
    primary_key     : "id",
    selection_filter: "status = 'A'",
    pack_level      : 7,
});

x.entities.ad_region.addFields([
    { id: "id"      , label: "Id"       , type: "Text"     , mandatory: true, list_column: true, data_length: 2 },
    { id: "title"   , label: "Title"    , type: "Text"     , mandatory: true, list_column: true, search_criterion: true, data_length: 80 },
    { id: "status"  , label: "Status"   , type: "Option"   , mandatory: true, list_column: true, list: "sy.active", default_val: "A" }
]);

x.entities.ad_region.indexes = [];

// End of Entity ad_region


x.pages.ad_region_context = x.ContextPage.clone({
    id              : "ad_region_context",
    entity          : x.entities.ad_region,
    title           : "Region",
    requires_key    : true
});
x.pages.ad_region_context.sections.addAll([
    { id: "display", type: "Display", entity: "ad_region" }
]);
x.pages.ad_region_context.links.addAll([
    { id: "update", page_to: "ad_region_update", page_key: "{page_key}" },
    { id: "delete", page_to: "ad_region_delete", page_key: "{page_key}" }
]);
// End of Page ad_region_context


x.pages.ad_region_create = x.Page.clone({
    id              : "ad_region_create",
    entity          : x.entities.ad_region,
    title           : "Create a Region",
    transactional   : true,
    short_title     : "Create"
});
x.pages.ad_region_create.sections.addAll([
    { id: "main"  , type: "Create"    , entity: "ad_region" }
]);
// End of Page ad_region_create


x.pages.ad_region_delete = x.Page.clone({
    id              : "ad_region_delete",
    entity          : x.entities.ad_region,
    title           : "Delete this Region",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.pages.ad_region_delete.sections.addAll([
    { id: "main", type: "Delete", entity: "ad_region" }
]);
// End of Page ad_region_delete


x.pages.ad_region_display = x.Page.clone({
    id              : "ad_region_display",
    entity          : x.entities.ad_region,
    title           : "Region",
    requires_key    : true
});
x.pages.ad_region_display.sections.addAll([
    { id: "display" , type: "Display"  , entity: "ad_region" },
//    { id: "chg_hist", type: "ChangeHistory", entity: "ad_region" },
]);
x.pages.ad_region_display.links.addAll([
    { id: "update", page_to: "ad_region_update", page_key: "{page_key}" },
    { id: "delete", page_to: "ad_region_delete", page_key: "{page_key}" }
]);
// End of Page ad_region_display


x.pages.ad_region_search = x.Page.clone({
    id              : "ad_region_search",
    entity          : x.entities.ad_region,
    title           : "Regions",
});
x.pages.ad_region_search.sections.addAll([
//    { id: "search", type: "ListQuery", entity: "ad_region" }
]);
x.pages.ad_region_search.links.addAll([
    { id: "create", page_to: "ad_region_create" }
]);
// End of Page ad_region_search


x.pages.ad_region_update = x.Page.clone({
    id              : "ad_region_update",
    entity          : x.entities.ad_region,
    title           : "Update this Region",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.pages.ad_region_update.sections.addAll([
    { id: "main"  , type: "Update"    , entity: "ad_region" }
]);
// End of Page ad_region_update


//To show up in Chrome debugger...
//@ sourceURL=ad/ad_region.js