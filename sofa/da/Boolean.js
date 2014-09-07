/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Boolean
x.fields.Boolean = x.fields.Text.clone({
    id                      : "Boolean",
    css_type                : "boolean",
    search_oper_list        : "sy.search_oper_list_boolean",
    auto_search_oper        : "",
    data_length             : 1,
    val                     : "N"
});
x.fields.Boolean.doc = {
    location                : "x.fields",
    file                    : "$Header: /rsl/rsl_app/core/fields/Boolean.js,v 1.16 2014/06/27 13:50:47 francis Exp $",
    purpose                 : "To represent a yes/no field",
    properties              : {
    }
};

x.fields.Boolean.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (typeof new_val !== "string") {
        throw x.Exception.clone({ id: "argument_not_string", field: this.id, arg: new_val });
    }
    if (new_val.length > 1) {
        new_val = new_val.substr(0, 1);
    }
    if (new_val === "") {
        new_val = "N";
    }
    return x.fields.Text.set.call(this, new_val);
};

x.fields.Boolean.is = function () {
    x.log.functionStart("is", this, arguments);
    return (this.get() === "Y");
};
x.fields.Boolean.is.doc = {
    purpose: "To indicate whether or not this field's value is set 'Y'",
    args   : "none",
    returns: "True if this field's value is 'Y', false if it is 'N'"
};


x.fields.Boolean.validate = function () {
    var val;
    x.log.functionStart("validate", this, arguments);
    val = this.get();
    x.fields.Text.validate.call(this);
    if (val === "Y") {
        this.text = "yes";
    } else if (val === "N") {
        this.text = "no";
    } else {
        this.messages.push({ type: 'E', text: "must be Y or N" });
    }
};

x.fields.Boolean.renderEditable = function (div, render_opts, inside_table) {
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

x.fields.Boolean.generateTestValue = function (session) {
    x.log.functionStart("generateTestValue", this, arguments);
    return (Math.floor(Math.random() * 2) > 1 ? "Y" : "N");
};

//To show up in Chrome debugger...
//@ sourceURL=da/Boolean.js