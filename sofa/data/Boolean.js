/*global x, java */
"use strict";


x.data.addClone(x.data.Text, {
    id                      : "Boolean",
    css_type                : "boolean",
    search_oper_list        : "sy.search_oper_list_boolean",
    auto_search_oper        : "",
    data_length             : 1,
    val                     : "N",
    purpose                 : "To represent a yes/no field",
    properties              : {
    }
});

x.data.Boolean.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (typeof new_val !== "string") {
        throw new Error("argument is not a string");
    }
    if (new_val.length > 1) {
        new_val = new_val.substr(0, 1);
    }
    if (new_val === "") {
        new_val = "N";
    }
    return x.data.Text.set.call(this, new_val);
};

x.data.Boolean.is = function () {
    x.log.functionStart("is", this, arguments);
    return (this.get() === "Y");
};
x.data.Boolean.is.doc = {
    purpose: "To indicate whether or not this field's value is set 'Y'",
    args   : "none",
    returns: "True if this field's value is 'Y', false if it is 'N'"
};


x.data.Boolean.validate = function () {
    var val;
    x.log.functionStart("validate", this, arguments);
    val = this.get();
    x.data.Text.validate.call(this);
    if (val === "Y") {
        this.text = "yes";
    } else if (val === "N") {
        this.text = "no";
    } else {
        this.messages.push({ type: 'E', text: "must be Y or N" });
    }
};

x.data.Boolean.renderEditable = function (div, render_opts, inside_table) {
    var input,
        input2;
    x.log.functionStart("renderEditable", this, arguments);
    input = div.addChild("input");
    input.attribute("type" , "checkbox");
    input.attribute("value", "Y");            // for Number, Date and Datetime
    if (this.get() === "Y") {
        input.attribute("checked", "checked");
    }
    input2 = div.addChild("input");
    input2.attribute("type", "hidden");
    return input;
};

x.data.Boolean.generateTestValue = function (session) {
    x.log.functionStart("generateTestValue", this, arguments);
    return (Math.floor(Math.random() * 2) > 1 ? "Y" : "N");
};

//To show up in Chrome debugger...
//@ sourceURL=data/Boolean.js