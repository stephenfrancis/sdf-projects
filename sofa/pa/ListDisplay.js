/*global x, java */
"use strict";

x.sections.ListDisplay = x.sections.ListUpdate.clone({
    id                      : "ListDisplay",
       allow_add_rows       : false,
    allow_delete_rows       : false
});


x.sections.ListDisplay.addRow = function (row) {
    var that = this,
        id,
        item;
    x.log.functionStart("addRow", this, arguments);
    x.sections.ListUpdate.addRow.call(this, row);
    row.setModifiable(false);
};


//To show up in Chrome debugger...
//@ sourceURL=pa/ListDisplay.js