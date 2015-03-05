/*global x, java */
"use strict";

x.ad.addEntity({
    id              : "Company",
    title           : "Company",
    display_page    : true,
    transactional   : true,
    label_pattern   : "{title}",
    default_order   : "title",
    primary_key     : "id",
    icon            : "style/Axialis/Png/24x24/Home2.png",
    selection_filter: "status = 'A'",
    plural_label    : "Companies",
    pack_level      : 7
});
x.ad.Company.addFields([
    { id: "id"    , label: "Id"    , type: "Number"   , editable: false, list_column: true, search_criterion: true, auto_generate: true },
    { id: "title" , label: "Title" , type: "Text"     , data_length: 80, mandatory: true, list_column: true, search_criterion: true },
    { id: "status", label: "Status", type: "Option"   , mandatory: true, list_column: true, list: "sy.active", default_val: "A" },
    { id: "notes" , label: "Notes" , type: "Textarea" }
]);
x.ad.Company.indexes = [];
// End of Entity ad_company


x.ad.Company.addPage({
    id              : "context",
    type            : x.page.ContextPage,
    title           : "Company"
});
x.ad.Company.pages.context.sections.addAll([
    { id: "main", type: "Display", entity_id: "ad.Company", title: null, columns: 1 }
]);
x.ad.Company.pages.context.links.addAll([
    { id: "update", page_to: "ad.Company.update", page_key: "{page_key}" },
    { id: "delete", page_to: "ad.Company.delete", page_key: "{page_key}" }
]);
//End of Page ad_company_context


x.ad.Company.addPage({
    id              : "create",
    title           : "Create a Company",
    transactional   : true,
    short_title     : "Create"
});
x.ad.Company.pages.create.sections.addAll([
    { id: "main", type: "Create", entity_id: "ad.Company", title: "Create a new Company record...", text: "Some info to help you do this right..." }
]);
// End of Page ad_company_create


x.ad.Company.addPage({
    id              : "deleet",
    title           : "Delete this Company",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.ad.Company.pages.deleet.sections.addAll([
    { id: "main", type: "Delete", entity_id: "ad.Company" }
]);
//End of Page ad_company_delete


x.ad.Company.addPage({
    id              : "display",
    title           : "Company",
    requires_key    : true
});
x.ad.Company.pages.display.tabs.addAll([
    { id: "details", label: "Main Details" },
]);
x.ad.Company.pages.display.sections.addAll([
    { id: "main"    , type: "Display"      , tab: "details", entity_id: "ad.Company" },
//    { id: "locns"   , type: "ListQuery"    , tab: "details", entity: "ad_locn", link_field: "company" },
//    { id: "depts"   , type: "ListQuery"    , tab: "details", entity: "ad_dept", link_field: "company" },
//    { id: "chg_hist", type: "ChangeHistory", tab: "details", entity: "ad_company" }
]);
x.ad.Company.pages.display.links.addAll([
    { id: "update", page_to: "ad.Company.update", page_key: "{page_key}" },
    { id: "deleet", page_to: "ad.Company.delete", page_key: "{page_key}" }
]);
//End of Page ad_company_display


x.ad.Company.addPage({
    id              : "search",
    title           : "Search for Companies",
    short_title     : "Companies"
});
x.ad.Company.pages.search.sections.addAll([
//    { id: "main", type: "Search", entity : "ad_company" }
]);
x.ad.Company.pages.search.links.addAll([
    { id: "create", page_to: "ad.Company.create" }
]);
//End of Page ad_company_search


x.ad.Company.addPage({
    id              : "update",
    title           : "Update this Company",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.ad.Company.pages.update.sections.addAll([
    { id: "main", type: "Update", entity_id: "ad.Company" }
]);
//End of Page ad_company_update

// To show up in Chrome debugger...
//@ sourceURL=ad/ad_company.js