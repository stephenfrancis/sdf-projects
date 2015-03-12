/*global x, java*/
"use strict";


x.page.addClone(x.base.Base, {
    id : "Tab",
    visible: true,
    purpose : "Collection of page sections shown at the same time",
    properties : {
        label    : { label: "Text label of tab", type: "boolean", usage: "required in spec" },
        visible  : { label: "Whether or not this tab is shown (defaults to true)", type: "boolean", usage: "optional in spec" }
    }
});

x.page.Tab.render = function (parent_elmt, render_opts) {
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        return parent_elmt.makeElement("li", (this.id === this.owner.page.page_tab ? "active" : ""), this.id)
            .makeElement("a")
            .text(this.label);
    }
};
x.page.Tab.render.doc = {
    purpose: "Generate HTML output for this page tab",
    args   : "xmlstream div element object to contain the tabs; render_opts",
    returns: "nothing"
};


x.page.Tab.getJSON = function () {
    var out = {};
    x.log.functionStart("getJSON", this, arguments);
    out.id = this.id;
    out.label = this.label;
    return out;
};
x.page.Tab.getJSON.doc = {
    purpose: "Create a digest object to be returned in JSON form to represent this tab",
    args   : "none",
    returns: "The digest object to represent this tab"
};


x.page.Page.tabs.add = function (spec) {
    var tab;
    x.log.functionStart("add", this, arguments);
    if (!spec.label) {
        throw new Error("Tab label must be specified in spec");
    }
    tab = x.page.Tab.clone(spec);
    x.base.OrderedMap.add.call(this, tab);
    return tab;
};
x.page.Page.tabs.add.doc = {
    purpose: "Create a new tab object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created tab",
    returns: "Newly-created tab object"
};


//To show up in Chrome debugger...
//@ sourceURL=page/Tab.js