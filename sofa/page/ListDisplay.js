/*global x, java */
"use strict";

x.page.ListDisplay = x.page.ListUpdate.clone({
    id                      : "ListDisplay",
       allow_add_rows       : false,
    allow_delete_rows       : false
});


x.page.ListDisplay.addRow = function (row) {
    var that = this,
        id,
        item;
    x.log.functionStart("addRow", this, arguments);
    x.page.ListUpdate.addRow.call(this, row);
    row.setModifiable(false);
};


//To show up in Chrome debugger...
//@ sourceURL=page/ListDisplay.js