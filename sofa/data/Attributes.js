/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Attributes
x.data.Attributes = x.data.Text.clone({
    id                      : "Attributes",
    css_type                : "attributes",
    search_oper_list        : "sy.search_oper_list_attr",
    auto_search_oper        : "AN",
});
x.data.Attributes.doc = {
    purpose: "To represent a multi-valued field with options from an LoV",
    properties: {
        list                : { label: "String id of the LoV supporting this field", type: "string", usage: "required in spec" },
        lov                 : { label: "LoV object supporting this field", type: "x.data.LoV", usage: "use methods" }
    }
};


x.data.Attributes.getLoV = function () {
    x.log.functionStart("getLoV", this, arguments);
    if (!this.lov) {
        if (!this.list) {
            throw new Error("no list property defined");
        }
        this.lov = x.data.LoV.getListLoV(this.list, this.owner && this.owner.trans && this.owner.trans.session);
    }
    return this.lov;
};
x.data.Attributes.getLoV.doc = {
    purpose: "To return this field's lov object, initialising it if not already present, using x.data.LoV.getListLoV() and the 'list' property",
    args   : "none",
    returns: "An LoV object, being this.lov if already exists, and otherwise creating it first using x.data.LoV.getListLoV() if this.list present"
};

x.data.Attributes.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (new_val && new_val.substr(0, 1) !== "|") {        // if being updated from a form control,
        new_val = "|" + new_val;                          // the value is in the form 'x|y|z'
    }
    if (new_val && new_val.substr(new_val.length - 1) !== "|") {        // it needs to be wrapped in |s at beginning and end
        new_val += "|";
    }
    return this.setInternal(new_val);
};

x.data.Attributes.isItem = function (item_id) {
    x.log.functionStart("isItem", this, arguments);
    return (("|" + this.val + "|").indexOf("|" + item_id + "|") > -1);
};
x.data.Attributes.isItem.doc = {
    purpose: "To indicate whether or not a given item is set in this multi-value attributes field",
    args   : "item_id (string) which should be an id of one of the records in the LoV for this field",
    returns: "true if the given LoV item is selected, or false otherwise"
};


x.data.Attributes.setItem = function (item_id, bool) {
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
x.data.Attributes.setItem.doc = {
    purpose: "To set/change the given item in this multi-value attributes field",
    args   : "item_id (string) of the item to be changed, and the value (boolean) to set it to",
    returns: "true if the item's value is changed, and false if it remains the same"
};


x.data.Attributes.validate = function () {
    var item,
        val,
        pieces,
        i,
        delim = "";
    x.log.functionStart("validate", this, arguments);
    val = this.get();
    x.data.Text.validate.call(this);
    this.getLoV();
    if (!this.lov) {
        this.messages.push({ type: 'E', text: "no lov found" });
    } else if (val) {                // Only do special validation is non-blank
        pieces = val.split(/\|/);
        this.text = "";
        for (i in pieces) {
            if (pieces.hasOwnProperty(i) && pieces[i]) {
                item = this.lov.getItem(pieces[i]);
                x.log.trace(this, "validate .. " + i + ", " + pieces[i] + ", " + item);
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

x.data.Attributes.renderEditable = function (div, render_opts, inside_table) {
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

x.data.Attributes.generateTestValue = function (session) {
    var out = "|",
        lov,
        i;
    x.log.functionStart("generateTestValue", this, arguments);
    lov = x.LoV.getListLoV(this.list, session);
    if (!lov) {
        throw new Error("unknown lov: " + this.list);
    }
    for (i = 0; i < lov.length(); i += 1) {
        if (Math.random() > 0.5) {
            out += lov.get(i).id + "|";
        }
    }
    return out;
};


//To show up in Chrome debugger...
//@ sourceURL=data/Attributes.js