/*global x, java */
"use strict";


x.data.addClone(x.data.Text, {
    id                      : "Option",
    css_type                : "option",
    search_oper_list        : "sy.search_oper_list_option",
    auto_search_oper        : "EQ",
    unknown_label           : "[unknown]: ",
//    tb_span               : 2,
    tb_input_list           : "input-medium",
    data_length             : 10,
    purpose                 : "To represent a single-valued option field, supported by an LoV",
    properties              : {
        list                : { label: "String id of the LoV supporting this field", type: "string", usage: "required in spec" },
        lov                 : { label: "LoV object supporting this field", type: "x.data.LoV", usage: "use methods" }
    }
});


x.data.Option.instantiate = function () {
    x.log.functionStart("instantiate", this, arguments);
    x.data.Text.instantiate.call(this);
    try {
        this.getLoV();
    } catch (e) {
        this.messages.push({ type: 'E', text: "error with lov" });
        return;
    }
};


x.data.Option.getLoV = function () {
    var sess;
    x.log.functionStart("getLoV", this, arguments);
    if (!this.lov) {
        if (this.list) {
            this.lov = x.data.LoV.getListLoV(this.list);
        } else {
            this.lov = x.data.LoV.getBasicLoV();
            if (this.config_item && this.label_prop) {        // Object-based LoVs not cached (yet...)
                this.lov.loadObject(x.base.Base.getObject(this.config_item), this.label_prop, this.active_prop);
            }
        }
    }
    return this.lov;
};


x.data.Option.getOwnLoV = function () {
    x.log.functionStart("getOwnLoV", this, arguments);
    this.lov = x.data.LoV.clone({ id: this.list, list: this.list });
    this.lov.loadList();
    return this.lov;
};


x.data.Option.validate = function () {
    var item,
        val;
    x.log.functionStart("validate", this, arguments);
    val = this.get();
    x.data.Text.validate.call(this);
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


x.data.Option.renderEditable = function (div_elmt, render_opts, inside_table) {
    var out_elmt,
        css_class;
    x.log.functionStart("renderEditable", this, arguments);
    css_class = this.getEditableSizeCSSClass(render_opts);
    try {
        this.getLoV();
    } catch (e) {
        return;
    }
    if (this.lov) {
        if (this.render_radio) {
            out_elmt = this.lov.renderRadio(div_elmt, render_opts, this.val, css_class, this.mandatory);
        } else {
            out_elmt = this.lov.render     (div_elmt, render_opts, this.val, css_class, this.mandatory);
        }
    }
    return out_elmt;
};


x.data.Option.addColumnToTable = function (query_table, col_spec) {
    var column;
    x.log.functionStart("addColumnToTable", this, arguments);
    column = x.data.Text.addColumnToTable.call(this, query_table, col_spec);
    if (this.list) {
        column.order_term = "( select ZI.seq_number from sy_list_item ZI where ZI.list='" + this.list + "' and ZI.id=" +
        query_table.alias + (this.sql_function ? "_" : ".") + this.id + " )";
    }
    return column;
};


x.data.Option.generateTestValue = function (session) {
    var lov,
        i;
    x.log.functionStart("generateTestValue", this, arguments);
    lov = x.data.LoV.getListLoV(this.list, session);
    if (!lov || lov.length() === 0) {
        return "";
    }
    i = Math.floor(Math.random() * lov.length());
    if (!lov.get(i)) {
        throw new Error("Invalid LoV item: " + i + " for field " + this);
    }
    return lov.get(i).id;
};

//To show up in Chrome debugger...
//@ sourceURL=data/Option.js