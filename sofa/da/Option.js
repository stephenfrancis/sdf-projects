/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Option
x.fields.Option = x.fields.Text.clone({
    id                      : "Option",
    css_type                : "option",
    search_oper_list        : "sy.search_oper_list_option",
    auto_search_oper        : "EQ",
    unknown_label           : "[unknown]: ",
//    tb_span               : 2,
    tb_input_list           : "input-medium",
    data_length             : 10
});
x.fields.Option.doc = {
    location                : "x.fields",
    file                    : "$Header: /rsl/rsl_app/core/fields/Option.js,v 1.25 2014/05/28 16:17:58 francis Exp $",
    purpose                 : "To represent a single-valued option field, supported by an LoV",
    properties              : {
        list                : { label: "String id of the LoV supporting this field", type: "string", usage: "required in spec" },
        lov                 : { label: "LoV object supporting this field", type: "x.LoV", usage: "use methods" }
    }
};


x.fields.Option.getLoV = function () {
    var sess;
    x.log.functionStart("getLoV", this, arguments);
    if (!this.lov) {
        if (this.list) {
            sess = (this.owner && this.owner.page && this.owner.page.session) ? this.owner.page.session : null;
            if (!sess) {
                sess = (this.owner && this.owner.trans && this.owner.trans.session) ? this.owner.trans.session : null;
            }
            this.lov = x.LoV.getListLoV(this.list, sess);
        } else {
            this.lov = x.LoV.getBasicLoV();
            if (this.config_item && this.label_prop) {        // Object-based LoVs not cached (yet...)
                this.lov.loadObject(x.Base.getObject(this.config_item), this.label_prop, this.active_prop);
            }
        }
    }
    return this.lov;
};


x.fields.Option.getOwnLoV = function () {
    x.log.functionStart("getOwnLoV", this, arguments);
    this.lov = x.LoV.clone({ id: this.list, list: this.list });
    this.lov.loadList();
    return this.lov;
};


x.fields.Option.validate = function () {
    var item,
        val;
    x.log.functionStart("validate", this, arguments);
    val = this.get();
    x.fields.Text.validate.call(this);
    try {
        this.getLoV();
    } catch (e) {
        this.messages.push({ type: 'E', text: "error with lov" });
        return;
    }
    if (!this.lov) {
        this.messages.push({ type: 'E', text: "no lov found" });
    } else if (val) {                // Only do special validation is non-blank
        item = this.lov.getItem(val);
        if (item) {
            this.text = item.label;
        } else {
            this.text = this.unknown_label + val;
            this.messages.push({ type: 'E', text: "invalid option: " + val });
            x.log.debug(this, "invalid option: " + val + " for field " + this);
        }
    }
};


x.fields.Option.renderEditable = function (div, render_opts, inside_table) {
    var elem,
        tb_input;
    x.log.functionStart("renderEditable", this, arguments);
    tb_input = this.getEditableSizeCSSClass(render_opts);
    try {
        this.getLoV();
    } catch (e) {
        return;
    }
    if (this.lov) {
        if (this.render_radio) {
            elem = this.lov.renderRadio(div, render_opts, this.val, tb_input, this.mandatory);
        } else {
            elem = this.lov.render     (div, render_opts, this.val, tb_input, this.mandatory);
        }
    }
    return elem;
};


x.fields.Option.addColumnToTable = function (query_table, col_spec) {
    var column;
    x.log.functionStart("addColumnToTable", this, arguments);
    column = x.fields.Text.addColumnToTable.call(this, query_table, col_spec);
    if (this.list) {
        column.order_term = "( select ZI.seq_number from sy_list_item ZI where ZI.list='" + this.list + "' and ZI.id=" +
        query_table.alias + (this.sql_function ? "_" : ".") + this.id + " )";
    }
    return column;
};


x.fields.Option.generateTestValue = function (session) {
    var lov,
        i;
    x.log.functionStart("generateTestValue", this, arguments);
    lov = x.LoV.getListLoV(this.list, session);
    if (!lov || lov.length() === 0) {
        return "";
    }
    i = Math.floor(Math.random() * lov.length());
    if (!lov.get(i)) {
        throw "Invalid LoV item: " + i + " for field " + this;
    }
    return lov.get(i).id;
};

//To show up in Chrome debugger...
//@ sourceURL=da/Option.js