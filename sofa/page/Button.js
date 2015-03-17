/*global x, java*/
"use strict";


x.page.addClone(x.base.Base, {
    id : "Button",
    visible: true,
    purpose : "Button on this page",
    properties : {
        label    : { label: "Text label of button", type: "boolean", usage: "required in spec" },
        visible  : { label: "Whether or not this tab is shown (defaults to true)", type: "boolean", usage: "optional in spec" }
    }
});

x.page.Button.render = function (parent_elmt, render_opts) {
    var button_elmt,
        css_class;
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        css_class = (this.css_class ? this.css_class + " " : "") + "btn css_cmd";
        if (this.main_button) {
            css_class += " btn_primary css_button_main";
        }
        button_elmt = parent_elmt.makeElement("button", css_class, this.id);
        button_elmt.data("bind_object", this);
        if (this.target) {
            button_elmt.attr("target", this.target);
        }
        button_elmt.text(this.label);
        return button_elmt;
    }
};
x.page.Button.render.doc = {
    purpose: "Generate HTML output for this page button",
    args   : "xmlstream div element object to contain the buttons; render_opts",
    returns: "nothing"
};

x.page.Button.click = function (event) {
    console.log(this + " clicked - save? " + this.save);
    if (this.save) {
        this.owner.page.save(this.id);
    }
};

x.page.Page.buttons.add = function (spec) {
    var button;
    x.log.functionStart("add", this, arguments);
    if (!spec.label) {
        throw new Error("Button label must be specified in spec: " + spec.id);
    }
    button = x.page.Button.clone(spec);
    x.base.OrderedMap.add.call(this, button);
    return button;
};
x.page.Page.buttons.add.doc = {
    purpose: "Create a new button object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created button",
    returns: "Newly-created button object"
};


x.page.Page.renderButtons = function (page_elmt, render_opts) {
    var buttons_elmt,
        i;
    x.log.functionStart("renderButtons", this, arguments);
    for (i = 0; i < this.buttons.length(); i += 1) {
        if (this.buttons.get(i).visible && !buttons_elmt) {
            buttons_elmt = page_elmt.makeElement("div", "css_page_buttons");
        }
        this.buttons.get(i).render(buttons_elmt, render_opts);
    }
    return buttons_elmt;
};



//To show up in Chrome debugger...
//@ sourceURL=page/Button.js