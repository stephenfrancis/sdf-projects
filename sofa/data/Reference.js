/*global x, java */
"use strict";


x.data.addClone(x.data.Text, {
    id              : "Reference",
    css_type        : "reference",
    search_oper_list: "sy.search_oper_list_option",
    auto_search_oper: "EQ",
    url_pattern     : "?page_id={ref_entity}_display&page_key={val}",
    data_length     : null,
//                      Flower Icon: &#x273D;  8-Teardrop Asterisk: &#x274B;  3 Horiz Lines: &#x2630;
//                      Apple Icon:  &#x2318;  4 Black Diamonds:    &#x2756;  Dotted Cross:  &#x205C;
//                      Solid  Right Triangle: &#x25B6;       Solid  Down Triangle: &#x25BC;
//                      Hollow Right Triangle: &#x25B7;       Hollow Down Triangle: &#x25BD;
//    nav_dropdown_icon: "&#x25BD;",
    nav_link_icon    : "&#x25B7;",
    purpose         : "To represent a field that references a record in another entity",
    properties      : {
        ref_entity          : { label: "String id of the entity to which this field relates", type: "string", usage: "required in spec" },
        lov                 : { label: "LoV object acting as a cache of the entity's records", type: "x.data.LoV", usage: "use methods only" },
        autocompleter_filter: { label: "SQL condition string to define a sub-set of the entity's records for the autocompleter only", type: "string", usage: "optional in spec" },
        selection_filter    : { label: "SQL condition string to define a sub-set of the entity's records for use with this field", type: "string", usage: "optional in spec" },
        autocompleter_max_rows  : { label: "Maximum number of autocompleter matches to display (can be set at Entity level if preferred)", type: "number", usage: "optional in spec" },
        autocompleter_min_length: { label: "Minimum number of characters to type before getting autocompleter matches back (can be set at Entity level if preferred)", type: "number", usage: "optional in spec" },
    }
});


x.data.Reference.getKeyPieces = function () {
    x.log.functionStart("getKeyPieces", this, arguments);
    return x.entities[this.ref_entity].getKeyPieces();
};

x.data.Text.getDataLength = function () {
    x.log.functionStart("getDataLength", this, arguments);
    if (typeof this.data_length !== "number") {
        if (!x.entities[this.ref_entity]) {
            throw new Error("unrecognised ref entity: " + this.ref_entity);
        }
        this.data_length = x.entities[this.ref_entity].getKeyLength();
    }
    return this.data_length;
};

x.data.Reference.getRefVal = function () {
    x.log.functionStart("getRefVal", this, arguments);
    return this.val;
};
x.data.Reference.getRefVal.doc = {
    purpose: "To return the reference value of this field, or an empty string if this value does not represent a reference (e.g. Combo field)",
    args   : "none",
    returns: "string reference id, or empty string"
};


x.data.Reference.getLoV = function () {
    var condition;
    x.log.functionStart("getLoV", this, arguments);
    if (!this.lov) {
        if (!this.ref_entity) {
            throw new Error("no ref entity property");
        }
        if (!x.entities[this.ref_entity]) {
            throw new Error("unrecognised ref entity: " + this.ref_entity);
        }
        // this.ref_condition is deprecated in favour of this.selection_filter
        condition = this.selection_filter || this.ref_condition || x.entities[this.ref_entity].selection_filter;
// Some bug is affecting this...
//      this.lov = x.data.LoV.getEntityLoV(this.ref_entity, this.getSession(), condition);
        if (condition) {
            this.lov = x.data.LoV.clone({ id: this.ref_entity, entity: this.ref_entity, condition: condition });
        } else {
            this.lov = x.data.LoV.getEntityLoV(this.ref_entity, this.getSession());
        }
    }
    return this.lov;
};
x.data.Reference.getLoV.doc = {
    purpose: "To return the LoV object this field contains, being the 'lov' property if present; if not, this function \
attempts to create it provided that the 'ref_entity' property is present; a filter condition is applied to the LoV, being \
either (1) this.selection_filter, or else (2) this.ref_condition, or else (3) selection_filter on the entity object \
given by ref_entity, otherwise no filter is applied and a shared, cached LoV object is used",
    args   : "none",
    returns: "LoV object, this.lov"
};


x.data.Reference.getOwnLoV = function (selection_filter) {
    x.log.functionStart("getOwnLoV", this, arguments);
    this.lov = x.data.LoV.clone({ id: this.ref_entity, entity: this.ref_entity });
    this.lov.loadEntity(null, selection_filter);
    return this.lov;
};
x.data.Reference.getOwnLoV.doc = {
    purpose: "Sets this.lov to be a local, non-cached LoV object on the entity given by 'ref_entity' property, and with \
the selection_filter argument applied",
    args   : "selection_filter string to apply to the LoV object",
    returns: "LoV object, this.lov"
};


x.data.Reference.getDocPromise = function () {
    var ref_val;
    x.log.functionStart("getDocPromise", this, arguments);
    ref_val = this.getRefVal();
    if (ref_val) {
        return x.base.Module.getEntity(this.ref_entity).getDocPromise(ref_val);
    }
};



x.data.Reference.renderNavOptions = function (parent_elmt, render_opts, primary_row) {
    var display_page,
        session,
        that = this,
        this_val,
        ul_elmt,
        count = 0,
        display_url,
        context_url;

    x.log.functionStart("renderNavOptions", this, arguments);
    session  = this.getSession();
    this_val = this.getRefVal();
    if (!this_val || !this.ref_entity || !x.entities[this.ref_entity]) {
        return;
    }
    display_page = x.entities[this.ref_entity].getDisplayPage();
    if (!display_page) {
        return;
    }
    if (!primary_row) {
        primary_row = this.getRow(false);
    }
    if (x.pages[this.ref_entity + "_context"] && this.allowed(this.ref_entity + "_context", this_val)) {
        context_url = "context.html&page_id=" + this.ref_entity + "_context&page_key=" + this_val;
    }
    if (this.allowed(display_page.id, this_val)) {
        display_url = display_page.getSimpleURL(this_val);
    }

    function renderDropdown() {
        var add_divider = false;

        ul_elmt = that.renderDropdownDiv(parent_elmt, "Navigation options for this item");
        if (context_url) {
            ul_elmt.makeElement("li").makeAnchor("Preview", context_url, "css_open_in_modal");
            add_divider = true;
        }
        if (display_url) {
            ul_elmt.makeElement("li").makeAnchor("Display", display_url);
            add_divider = true;
        }
        if (add_divider) {
            ul_elmt.makeElement("li", "divider");
        }
    }

    display_page.links.each(function(link) {
        if (link.isVisible(session, this_val, primary_row)) {
            if (!ul_elmt) {
                renderDropdown();
            }
            link.renderNavOption(ul_elmt, render_opts, this_val);
            count += 1;
        }
    });
    
    if (count === 0 && display_url) {
        parent_elmt.makeUniIcon(this.nav_link_icon, display_url);
    }
    return count;
};


x.data.Reference.renderEditable = function (div_elmt, render_opts, inside_table) {
    x.log.functionStart("renderEditable", this, arguments);
    if (this.ref_entity && !x.entities[this.ref_entity]) {
        throw new Error("Field " + this.toString() + " has unrecognised ref_entity: " + this.ref_entity);
    }
    if (typeof this.render_autocompleter === "boolean") {
        if (this.render_autocompleter) {
            this.renderAutocompleter(div_elmt, render_opts);
        } else {
            this.renderDropdown     (div_elmt, render_opts);
        }
    } else {
        if (x.entities[this.ref_entity].autocompleter) {
            this.renderAutocompleter(div_elmt, render_opts);
        } else {
            this.renderDropdown     (div_elmt, render_opts);
        }
    }
    return div_elmt;
};


x.data.Reference.renderAutocompleter = function (div_elmt, render_opts) {
    var input_elmt;
    x.log.functionStart("renderAutocompleter", this, arguments);
    input_elmt = div_elmt.makeInput("text", this.getEditableSizeCSSClass(render_opts),
        this.getControl(), this.getText());
    if (this.placeholder || this.helper_text) {
        input_elmt.attr("placeholder", this.placeholder || this.helper_text);
    }
    return input_elmt;
};


x.data.Reference.renderDropdown = function (div_elmt, render_opts) {
    var select_elmt;
    x.log.functionStart("renderDropdown", this, arguments);
    this.getLoV();
    if (this.lov) {
        if (!this.lov.complete) {
            this.lov.loadEntity();
        }
        select_elmt = this.lov.render(div_elmt, render_opts, this.val, this.getEditableSizeCSSClass(render_opts), this.mandatory);
    }
    return select_elmt;
};


x.data.Reference.autocompleter = function (match, out) {
    x.log.functionStart("autocompleter", this, arguments);
};

x.data.Reference.addColumnToTable = function (query_table, col_spec) {
    var column,
        sort_cols;
    x.log.functionStart("addColumnToTable", this, arguments);
    if (!this.ref_entity || !x.entities[this.ref_entity]) {
        throw new Error("invalid ref entity: " + this.ref_entity);
    }
    column = x.data.Text.addColumnToTable.call(this, query_table, col_spec);
    if (x.entities[this.ref_entity].reference_sort_order) {
        column.order_term = x.entities[this.ref_entity].reference_sort_order;
    } else {
        sort_cols = x.entities[this.ref_entity].default_order.split(/\s*,\s*/);
        column.order_term = sort_cols[0];
    }
    column.order_term = "( SELECT ZR." + column.order_term + " FROM " + this.ref_entity + " ZR WHERE ZR._key=" +
        query_table.alias + (this.sql_function ? "_" : ".") + this.id + " )";
    return column;
};


x.data.Reference.getReferentialIntegrityDDL = function () {
    x.log.functionStart("getReferentialIntegrityDDL", this, arguments);
    return "FOREIGN KEY (" + this.getId() + ") REFERENCES " + this.ref_entity + " (_key)";
};


x.data.Reference.checkDataIntegrity = function () {
    var resultset,
        out,
        count   = {},
        key_map = {},
        key,
        val,
        delim = "";
    
    x.log.functionStart("checkDataIntegrity", this, arguments);
    if (!this.ref_entity || x.entities[this.ref_entity].view_only || this.sql_function || !this.owner) {
        return;
    }
    out = "Broken references for " + this.id + ": ";
//    resultset = x.sql.connection.executeQuery("SELECT _key, " + this.id + " FROM " + x.app.database + "." + this.owner.table +
//        " WHERE " + this.id + " IS NOT NULL AND " + this.id + " NOT IN ( SELECT _key FROM " + this.ref_entity + " )");
// This is often much faster...
    resultset = x.sql.connection.executeQuery("SELECT A._key, A." + this.id + " FROM " + this.owner.table +
            " A LEFT OUTER JOIN " + this.ref_entity + " B ON A." + this.id + " = B._key WHERE A." + this.id + " IS NOT NULL AND B._key IS NULL");
    while (resultset.next()) {
        key = x.sql.getColumnString(resultset, 1);
        val = x.sql.getColumnString(resultset, 2);
        if (!count[val]) {
            count[val] = 0;
        }
        count[val] += 1;
        if (key_map[val]) {
            if (count[val] <= 10) {
                key_map[val] += ", " + key;
            }
        } else {
            key_map[val] = key;
        }
    }
    resultset.close();
    for (val in key_map) {
        if (key_map.hasOwnProperty(val)) {
            out += delim + "[" + val + "] " + key_map[val] + " (" + count[val] + ")";
            delim = ", ";
        }
    }
    if (delim) {
        return out;
    }
};


x.data.Reference.generateTestValue = function (session) {
    var lov,
        i;
    x.log.functionStart("generateTestValue", this, arguments);
    lov = x.data.LoV.getEntityLoV(this.ref_entity, session, this.generate_test_condition);
    if (!lov || lov.length() === 0) {
        return "";
    }
    i = Math.floor(Math.random() * lov.length());
    if (!lov.get(i)) {
        throw new Error("invalid lov item: " + i);
    }
    return lov.get(i).id;
};

//To show up in Chrome debugger...
//@ sourceURL=data/Reference.js