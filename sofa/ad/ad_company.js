/*global x, java */
"use strict";

x.ad.Company = x.data.Entity.clone({
    id              : "Company",
    title           : "Company",
    area            : "ad",
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


x.ad.Company.context = x.ContextPage.clone({
    id              : "ad_company_context",
    entity          : x.ad.Company,
    title           : "Company",
});
x.ad.Company.context.sections.addAll([
    { id: "main", type: "Display", entity: "ad_company", title: null, columns: 1 }
]);
x.ad.Company.context.links.addAll([
    { id: "update", page_to: "ad_company_update", page_key: "{page_key}" },
    { id: "delete", page_to: "ad_company_delete", page_key: "{page_key}" }
]);
//End of Page ad_company_context


x.ad.Company.PageCreate = x.page.Page.clone({
    id              : "ad_company_create",
    entity          : x.ad.Company,
    title           : "Create a Company",
    transactional   : true,
    short_title     : "Create"
});
x.ad.Company.create.sections.addAll([
    { id: "main", type: "Create", entity: "ad_company", title: "Create a new Company record...", text: "Some info to help you do this right..." }
]);
// End of Page ad_company_create


x.ad.Company.PageDelete = x.page.Page.clone({
    id              : "ad_company_delete",
    entity          : x.ad.Company,
    title           : "Delete this Company",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});
x.ad.Company.delete.sections.addAll([
    { id: "main", type: "Delete", entity: "ad_company" }
]);
//End of Page ad_company_delete


x.ad.Company.display = x.page.Page.clone({
    id              : "ad_company_display",
    entity          : x.ad.Company,
    title           : "Company",
    requires_key    : true
});
x.ad.Company.display.tabs.addAll([
    { id: "details", label: "Main Details" },
]);
x.ad.Company.display.sections.addAll([
    { id: "main"    , type: "Display"      , tab: "details", entity: "ad_company" },
//    { id: "locns"   , type: "ListQuery"    , tab: "details", entity: "ad_locn", link_field: "company" },
//    { id: "depts"   , type: "ListQuery"    , tab: "details", entity: "ad_dept", link_field: "company" },
//    { id: "chg_hist", type: "ChangeHistory", tab: "details", entity: "ad_company" }
]);
x.ad.Company.display.links.addAll([
    { id: "update", page_to: "ad_company_update", page_key: "{page_key}" },
    { id: "delet" , page_to: "ad_company_delete", page_key: "{page_key}" }
]);
//End of Page ad_company_display


x.ad.Company.search = x.page.Page.clone({
    id              : "ad_company_search",
    entity          : x.ad.Company,
    title           : "Search for Companies",
    short_title     : "Companies"
});
x.ad.Company.search.sections.addAll([
//    { id: "main", type: "Search", entity : "ad_company" }
]);
x.ad.Company.search.links.addAll([
    { id: "create", page_to: "ad_company_create" }
]);
//End of Page ad_company_search


x.ad.Company.update = x.page.Page.clone({
    id              : "ad_company_update",
    entity          : x.ad.Company,
    title           : "Update this Company",
    transactional   : true,
    requires_key    : true,
    short_title     : "Update"
});
x.ad.Company.update.sections.addAll([
    { id: "main", type: "Update", entity: "ad_company" }
]);
//End of Page ad_company_update

// To show up in Chrome debugger...
//@ sourceURL=ad/ad_company.js