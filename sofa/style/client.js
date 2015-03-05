/*global  */
"use strict";



var y = {};

y.page = x.page.Page.clone({
    id: "Artificial",
    elements: {
        messages: $(".css_messages"),
        links   : $(".css_page_links"),
        tabs    : $(".css_page_tabs"),
        title   : $("#css_page_header_title"),
        descr   : $("#css_page_header_descr"),
        body    : $("#css_body")
    }
});

y.page.sections.add({ id: "temp", type: "Section", title: "Wibble", text: "Wobble" });

$(document).ready(function () {
    y.page.render();
});



//To show up in Chrome debugger...
//@ sourceURL=style/client.js