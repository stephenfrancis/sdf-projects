/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Attributes
x.fields.Attributes = x.fields.Text.clone({
    id                      : "Attributes",
    css_type                : "attributes",
    search_oper_list        : "sy.search_oper_list_attr",
    auto_search_oper        : "AN",
});
x.fields.Attributes.doc = {
    location: "x.fields",
    file: "$Header: /rsl/rsl_app/core/fields/Attributes.js,v 1.22 2014/06/27 13:50:47 francis Exp $",
    purpose: "To represent a multi-valued field with options from an LoV",
    properties: {
        list                : { label: "String id of the LoV supporting this field", type: "string", usage: "required in spec" },
        lov                 : { label: "LoV object supporting this field", type: "x.LoV", usage: "use methods" }
    }
};


x.fields.Attributes.getLoV = function () {
    x.log.functionStart("getLoV", this, arguments);
    if (!this.lov) {
        if (!this.list) {
            throw "x.field.Attributes.getLoV() no list property defined";
        }
        this.lov = x.LoV.getListLoV(this.list, this.owner && this.owner.trans && this.owner.trans.session);
    }
    return this.lov;
};
x.fields.Attributes.getLoV.doc = {
    purpose: "To return this field's lov object, initialising it if not already present, using x.LoV.getListLoV() and the 'list' property",
    args   : "none",
    returns: "An LoV object, being this.lov if already exists, and otherwise creating it first using x.LoV.getListLoV() if this.list present"
};

x.fields.Attributes.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (new_val && new_val.substr(0, 1) !== "|") {        // if being updated from a form control,
        new_val = "|" + new_val;                          // the value is in the form 'x|y|z'
    }
    if (new_val && new_val.substr(new_val.length - 1) !== "|") {        // it needs to be wrapped in |s at beginning and end
        new_val += "|";
    }
    return this.setInternal(new_val);
};

x.fields.Attributes.isItem = function (item_id) {
    x.log.functionStart("isItem", this, arguments);
    return (("|" + this.val + "|").indexOf("|" + item_id + "|") > -1);
};
x.fields.Attributes.isItem.doc = {
    purpose: "To indicate whether or not a given item is set in this multi-value attributes field",
    args   : "item_id (string) which should be an id of one of the records in the LoV for this field",
    returns: "true if the given LoV item is selected, or false otherwise"
};


x.fields.Attributes.setItem = function (item_id, bool) {
    var val,
        present;
    x.log.functionStart("setItem", this, arguments);
    val = this.get();
    present = (val.indexOf("|" + item_id + "|") > -1);
    if (!bool && !present) {
        return false;
    } else if (bool && present) {
        return false;
    } else if (bool) {    // !present
        val = val ? (val + item_id + "|") : "|" + item_id + "|";
    } else {            // !bool && present
        val = val.replace(new RegExp("\\|" + item_id + "\\|"), "|");
    }
    if (val === "|") {
        val = "";
    }
    this.setInternal(val);
    return true;
};
x.fields.Attributes.setItem.doc = {
    purpose: "To set/change the given item in this multi-value attributes field",
    args   : "item_id (string) of the item to be changed, and the value (boolean) to set it to",
    returns: "true if the item's value is changed, and false if it remains the same"
};


x.fields.Attributes.validate = function () {
    var item,
        val,
        pieces,
        i,
        delim = "";
    x.log.functionStart("validate", this, arguments);
    val = this.get();
    x.fields.Text.validate.call(this);
    this.getLoV();
    if (!this.lov) {
        this.messages.push({ type: 'E', text: "no lov found" });
    } else if (val) {                // Only do special validation is non-blank
        pieces = val.split(/\|/);
        this.text = "";
        for (i in pieces) {
            if (pieces.hasOwnProperty(i) && pieces[i]) {
                item = this.lov.getItem(pieces[i]);
                x.log.trace(this, "x.field.Attributes.validate .. " + i + ", " + pieces[i] + ", " + item);
                if (item) {
                    this.text += delim + item.label;
                    if (!item.active) {
                        this.messages.push({ type: 'E', text: "option is inactive: " + item.label });
                    }
                } else {
                    this.text += delim + "[unknown: " + pieces[i] + "]";
                    this.messages.push({ type: 'E', text: "invalid option: " + pieces[i] });
                    x.log.debug(this, "invalid option: " + pieces[i] + " for field " + this);
                }
                delim = ", ";
            }
        }
    }
};

x.fields.Attributes.renderEditable = function (div, render_opts, inside_table) {
    var pieces;
    x.log.functionStart("renderEditable", this, arguments);
    this.getLoV();
    if (!this.lov) {
        x.Exception.clone({ id: "no_lov_found" });
    } else {
        pieces = this.get().split(/\|/);
        this.lov.renderMulti(div, render_opts, pieces);
    }
};

x.fields.Attributes.generateTestValue = function (session) {
    var out = "|",
        lov,
        i;
    x.log.functionStart("generateTestValue", this, arguments);
    lov = x.LoV.getListLoV(this.list, session);
    if (!lov) {
        throw x.Exception.cone({ id: "unknown_lov", field: this });
    }
    for (i = 0; i < lov.length(); i += 1) {
        if (Math.random() > 0.5) {
            out += lov.get(i).id + "|";
        }
    }
    return out;
};


//To show up in Chrome debugger...
//@ sourceURL=da/Attributes.js