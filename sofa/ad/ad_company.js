/*global x, java */
"use strict";

x.entities.ad_company = x.Entity.clone({
    id              : "ad_company",
    title           : "Company",
    area            : "ad",
    display_page    : true,
    transactional   : true,
    title_field     : "title",
    default_order   : "title",
    primary_key     : "id",
    icon            : "style/Axialis/Png/24x24/Home2.png",
    selection_filter: "status = 'A'",
    plural_label    : "Companies",
    pack_level      : 7
});
x.entities.ad_company.addFields([
    { id: "id"    , label: "Id"    , type: "Number"   , editable: false, list_column: true, search_criterion: true, auto_generate: true },
    { id: "title" , label: "Title" , type: "Text"     , data_length: 80, mandatory: true, list_column: true, search_criterion: true },
    { id: "status", label: "Status", type: "Option"   , mandatory: true, list_column: true, list: "sy.active", default_val: "A" },
    { id: "notes" , label: "Notes" , type: "Textarea" }
]);
x.entities.ad_company.indexes = [];
// End of Entity ad_company


x.pages.ad_company_context = x.ContextPage.clone({
    id              : "ad_company_context",
    entity          : x.entities.ad_company,
    title           : "Company",
});
x.pages.ad_company_context.sections.addAll([
    { id: "main", type: "Display", entity: "ad_company", title: null, columns: 1 }
]);
x.pages.ad_company_context.links.addAll([
    { id: "update", page_to: "ad_company_update", page_key: "{page_key}" },
    { id: "delete", page_to: "ad_company_delete", page_key: "{page_key}" }
]);
//End of Page ad_company_context


x.pages.ad_company_create = x.Page.clone({
    id              : "ad_company_create",
    entity          : x.entities.ad_company,
    title           : "Create a Company",
    transactional   : true,
    short_title     : "Create"
});
x.pages.ad_company_create.sections.addAll([
    { id: "main", type: "Create", entity: "ad_company", title: "Create a new Company record...", text: "Some info to help you do this right..." }
]);
// End of Page ad_company_create


x.pages.ad_company_delete = x.Page.clone({
    id              : "ad_company_delete",
    entity          : x.entities.ad_company,
    title           : "Delete this Company",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.pages.ad_company_delete.sections.addAll([
    { id: "main", type: "Delete", entity: "ad_company" }
]);
//End of Page ad_company_delete


x.pages.ad_company_display = x.Page.clone({
    id              : "ad_company_display",
    entity          : x.entities.ad_company,
    title           : "Company",
    requires_key    : true
});
x.pages.ad_company_display.tabs.addAll([
    { id: "details", label: "Main Details" },
]);
x.pages.ad_company_display.sections.addAll([
    { id: "main"    , type: "Display"      , tab: "details", entity: "ad_company" },
//    { id: "locns"   , type: "ListQuery"    , tab: "details", entity: "ad_locn", link_field: "company" },
//    { id: "depts"   , type: "ListQuery"    , tab: "details", entity: "ad_dept", link_field: "company" },
//    { id: "chg_hist", type: "ChangeHistory", tab: "details", entity: "ad_company" }
]);
x.pages.ad_company_display.links.addAll([
    { id: "update", page_to: "ad_company_update", page_key: "{page_key}" },
    { id: "delet" , page_to: "ad_company_delete", page_key: "{page_key}" }
]);
//End of Page ad_company_display


x.pages.ad_company_search = x.Page.clone({
    id              : "ad_company_search",
    entity          : x.entities.ad_company,
    title           : "Search for Companies",
    short_title     : "Companies"
});
x.pages.ad_company_search.sections.addAll([
//    { id: "main", type: "Search", entity : "ad_company" }
]);
x.pages.ad_company_search.links.addAll([
    { id: "create", page_to: "ad_company_create" }
]);
//End of Page ad_company_search


x.pages.ad_company_update = x.Page.clone({
    id              : "ad_company_update",
    entity          : x.entities.ad_company,
    title           : "Update this Company",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.pages.ad_company_update.sections.addAll([
    { id: "main", type: "Update", entity: "ad_company" }
]);
//End of Page ad_company_update

// To show up in Chrome debugger...
//@ sourceURL=ad/ad_company.js