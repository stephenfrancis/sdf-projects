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

x.page.Button.render = function (element, render_opts) {
    var elmt_button,
        css_class;
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        css_class = (this.css_class ? this.css_class + " " : "") + "btn css_cmd";
        if (this.main_button) {
            css_class += " btn_primary css_button_main";
        }
        elmt_button = element.addChild("button", this.id, css_class);
        if (this.target) {
            elmt_button.attribute("target", this.target);
        }
        elmt_button.addText(this.label);
        return elmt_button;
    }
};
x.page.Button.render.doc = {
    purpose: "Generate HTML output for this page button",
    args   : "xmlstream div element object to contain the buttons; render_opts",
    returns: "nothing"
};

x.page.Button.click = function () {
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


//To show up in Chrome debugger...
//@ sourceURL=page/Button.js