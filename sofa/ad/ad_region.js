/*global x, java */
"use strict";

x.ad.addEntity({
    id              : "Region",
    title           : "Region",
    display_page    : true,
    transactional   : true,
    label_pattern   : "{title}",
    default_order   : "title",
    primary_key     : "id",
    selection_filter: "status = 'A'",
    pack_level      : 7,
});

x.ad.Region.addFields([
    { id: "id"      , label: "Id"       , type: "Text"     , mandatory: true, list_column: true, data_length: 2 },
    { id: "title"   , label: "Title"    , type: "Text"     , mandatory: true, list_column: true, search_criterion: true, data_length: 80 },
    { id: "status"  , label: "Status"   , type: "Option"   , mandatory: true, list_column: true, list: "sy.active", default_val: "A" }
]);

x.ad.Region.indexes = [];

// End of Entity ad_region


x.ad.Region.addPage({
    id              : "context",
    type            : x.page.ContextPage,
    title           : "Region",
    requires_key    : true
});
x.ad.Region.pages.context.sections.addAll([
    { id: "display", type: "Display", entity_id: "ad.Region" }
]);
x.ad.Region.pages.context.links.addAll([
    { id: "update", page_to: "ad.Region.update" },
    { id: "deleet", page_to: "ad.Region.deleet" }
]);
// End of Page ad_region_context


x.ad.Region.addPage({
    id              : "create",
    title           : "Create a Region",
    transactional   : true,
    short_title     : "Create"
});
x.ad.Region.pages.create.sections.addAll([
    { id: "main"  , type: "Create", entity_id: "ad.Region" }
]);
// End of Page ad_region_create


x.ad.Region.addPage({
    id              : "deleet",
    title           : "Delete this Region",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.ad.Region.pages.deleet.sections.addAll([
    { id: "main", type: "Delete", entity_id: "ad.Region" }
]);
// End of Page ad_region_delete


x.ad.Region.addPage({
    id              : "display",
    title           : "Region",
    requires_key    : true
});
x.ad.Region.pages.display.sections.addAll([
    { id: "display" , type: "Display", entity_id: "ad.Region" },
//    { id: "chg_hist", type: "ChangeHistory", entity: "ad_region" },
]);
x.ad.Region.pages.display.links.addAll([
    { id: "update", page_to: "ad.Region.update" },
    { id: "deleet", page_to: "ad.Region.deleet" }
]);
// End of Page ad_region_display


x.ad.Region.addPage({
    id              : "search",
    title           : "Regions",
});
x.ad.Region.pages.search.sections.addAll([
//    { id: "search", type: "ListQuery", entity_id: "ad.Region" }
]);
x.ad.Region.pages.search.links.addAll([
    { id: "create", page_to: "ad.Region.create" }
]);
// End of Page ad_region_search


x.ad.Region.addPage({
    id              : "update",
    title           : "Update this Region",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.ad.Region.pages.update.sections.addAll([
    { id: "main"  , type: "Update", entity_id: "ad.Region" }
]);
// End of Page ad_region_update


//To show up in Chrome debugger...
//@ sourceURL=ad/ad_region.js