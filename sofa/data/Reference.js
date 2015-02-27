/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Reference
x.data.Reference = x.data.Text.clone({
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
    addl_cli_side_props: [ "autocompleter_max_rows", "autocompleter_min_length" ]
});
x.data.Reference.doc = {
    purpose         : "To represent a field that references a record in another entity",
    properties      : {
        ref_entity          : { label: "String id of the entity to which this field relates", type: "string", usage: "required in spec" },
        lov                 : { label: "LoV object acting as a cache of the entity's records", type: "x.data.LoV", usage: "use methods only" },
        autocompleter_filter: { label: "SQL condition string to define a sub-set of the entity's records for the autocompleter only", type: "string", usage: "optional in spec" },
        selection_filter    : { label: "SQL condition string to define a sub-set of the entity's records for use with this field", type: "string", usage: "optional in spec" },
        autocompleter_max_rows  : { label: "Maximum number of autocompleter matches to display (can be set at Entity level if preferred)", type: "number", usage: "optional in spec" },
        autocompleter_min_length: { label: "Minimum number of characters to type before getting autocompleter matches back (can be set at Entity level if preferred)", type: "number", usage: "optional in spec" },
    }
};


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


x.data.Reference.getRow = function (require_trans) {
    var ref_val;
    x.log.functionStart("getRow", this, arguments);
    ref_val = this.getRefVal();
    if (ref_val) {
        if (this.owner.trans && (this.owner.trans.isInCache(this.ref_entity, ref_val) || require_trans !== false)) {
            return this.owner.trans.getActiveRow(this.ref_entity, ref_val);
        }
        return x.entities[this.ref_entity].getRow(ref_val);
    }
};
x.data.Reference.getRow.doc = {
    purpose: "To obtain a row object corresponding to the record in ref_entity with a key being the value of this field, \
if it is non-blank, or undefined otherwise; the row object belongs to the transaction linked to the owning fieldset of \
this field, if it has one, or is otherwise an unmodifiable fieldset",
    args   : "none",
    returns: "row object with a key of this field's value, or undefined"
};


x.data.Reference.validate = function () {
    var item,
        val;
    x.log.functionStart("validate", this, arguments);
    if (!this.ref_entity) {
        this.messages.add({ type: 'E', text: "no ref_entity property found" });
        return;
    }
    if (!x.entities[this.ref_entity]) {
        this.messages.add({ type: 'E', text: "ref_entity property value invalid: " + this.ref_entity });
        return;
    }
    x.data.Text.validate.call(this);
//    if (val && this.lov) {                // Only do special validation if non-blank
    this.getLoV();                        // Trial alternative, low memory approach of only validating against an LoV if it is already present
                                        // Entities (e.g. rm_rsrc) that specified a selection_filter caused separate loV object for each instance
    val = this.getRefVal();
    if (!this.lov) {
        this.messages.add({ type: 'E', text: "no lov found" });
    } else if (val) {                // Only do special validation if non-blank
        item = this.lov.getItem(val);
        if (item) {
            this.text = item.label;
        } else if (this.owner && this.owner.trans && this.owner.trans.isActive() && this.owner.trans.isInCache(this.ref_entity, val)) {
            this.text = this.owner.trans.getRow(this.ref_entity, val).getLabel("reference");
        } else {
            this.text = "[unknown: " + val + "]";
            this.messages.add({ type: 'E', text: "invalid reference: " + val });
            x.log.debug(this, "invalid reference: " + val + " for field " + this);
        }
    }
};

// in case label has changed since previous retrieval...
/*
x.data.Reference.getText = function () {
    var item;
    x.log.functionStart("getText", this, arguments);
    x.data.Text.getText.call(this);
    if (!this.isBlank()) {
        if (this.owner && this.owner.trans && this.owner.trans.isInCache(this.ref_entity, this.get())) {
            this.text = this.owner.trans.getRow(this.ref_entity, this.get()).getLabel("dropdown");
        } else if (this.lov) {
            item = this.lov.getItem(this.get());
            if (item) {
                this.text = item.label;
            }
        }
    }
    return this.text;
};
*/

// Support Linked Pairs
// link_one_way = true means that the child field is disabled until the parent is chosen (to limit drop-down size)
x.data.Reference.linkToParent = function (parent_field, link_field, link_one_way) {
    x.log.functionStart("linkToParent", this, arguments);
    this.linked_parent = parent_field;
    this.link_field    = link_field;
    this.link_one_way  = link_one_way;
    if (this.link_one_way && this.editable) {
        this.editable = false;
        this.editable_once_parent_set = true;
    }
    parent_field.linked_child = this;
    parent_field.css_reload = true;
    if (!parent_field.isBlank()) {
        this.parentChanged(parent_field.get());
    }
};
x.data.Reference.linkToParent.doc = {
    purpose: "To link this field to a parent field",
    args   : "parent field object, link field string, boolean to force the link to be one-way (i.e. pick parent first, then child)",
    returns: "nothing"
};


x.data.Reference.afterChange = function (oldVal) {
    x.log.functionStart("afterChange", this, arguments);
    if (this.linked_child) {
        this.linked_child.parentChanged();
    } else if (this.linked_parent) {
        this.linked_parent.childChanged();
    }
};


// Called on the CHILD
x.data.Reference.parentChanged = function () {
    var new_ref_condition,
        ref_row,
        implied_parent_val;
    x.log.functionStart("parentChanged", this, arguments);
    if (!this.link_field) {
        throw new Error("child field in linked pair is missing link_field property");
    }
    if (this.link_one_way) {
        this.editable = this.editable_once_parent_set && !this.linked_parent.isBlank();
    }
    new_ref_condition = this.linked_parent.isBlank() ? null : "A." + this.link_field + "=" + x.sql.escape(this.linked_parent.get());
    if (new_ref_condition !== this.ref_condition) {
        this.lov = null;
        this.ref_condition = new_ref_condition;
        if (!this.linked_parent.isBlank() && !this.isBlank()) {        // This may be called as a result of childChanged(), so the parent may
            ref_row = this.getRow();                // already be set to the value corresponding to this field's new value
            implied_parent_val = ref_row.getField(this.link_field).get();
            x.log.debug(this, "curr parent field val: " + this.linked_parent.get() + ", parent val implied by this (child) field val: " + implied_parent_val);
            if (implied_parent_val !== this.linked_parent.get()) {
                this.set("");
            }
        }
        this.getLoV();
        this.validate();
    }
};
x.data.Reference.parentChanged.doc = {
    purpose: "Called on the child field when the linked parent's value is changed",
    args   : "none",
    returns: "nothing"
};


// Called on the PARENT
x.data.Reference.childChanged = function () {
    var ref_row,
        implied_parent_val;
    x.log.functionStart("childChanged", this, arguments);
    if (!this.linked_child) {
        throw new Error("parent field in linked pair is missing linked_child property");
    }
    if (!this.linked_child.link_field) {
        throw new Error("child field in linked pair is missing link_field property");
    }
    if (!this.linked_child.isBlank() && this.isBlank()) {
        ref_row = this.linked_child.getRow();
        implied_parent_val = ref_row.getField(this.linked_child.link_field).get();
        x.log.debug(this, "child field val: " + this.linked_child.get() + ", parent val implied by child field val: " + implied_parent_val);
        if (implied_parent_val !== this.get()) {
            this.set(implied_parent_val);
        }
    }
};
x.data.Reference.childChanged.doc = {
    purpose: "Called on the parent field when the linked child's value is changed",
    args   : "none",
    returns: "nothing"
};


x.data.Reference.renderNavOptions = function (parent_elem, render_opts, primary_row) {
    var display_page,
        session,
        that = this,
        this_val,
        ul_elem,
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

        ul_elem = that.renderDropdownDiv(parent_elem, "Navigation options for this item");
        if (context_url) {
            ul_elem.addChild("li").addChild("a")
//                .attribute("data-toggle", "modal")
//                .attribute("data-target", "#css_modal")
                .attribute("class", "css_open_in_modal")
                .attribute("href" , context_url)
                .addText("Preview");
            add_divider = true;
        }
        if (display_url) {
            ul_elem.addChild("li").addChild("a")
                .attribute("href", display_url)
                .addText("Display");
            add_divider = true;
        }
        if (add_divider) {
            ul_elem.addChild("li", null, "divider");
        }
    }

    display_page.links.each(function(link) {
        if (link.isVisible(session, this_val, primary_row)) {
            if (!ul_elem) {
                renderDropdown();
            }
            link.renderNavOption(ul_elem, render_opts, this_val);
            count += 1;
        }
    });
    
    if (count === 0 && display_url) {
        parent_elem.addChild("a", null, "css_uni_icon")
            .attribute("href", display_url)
            .addText(this.nav_link_icon, true);
    }
/* SF - this extra div is causing some issues - needs further testing in a dev branch...
    if(parent_elem.parent.parent.name == "td"){
        //CL - This dummy div allows absolute positioning on div.dropdown but keeps the icon to remain in place 
        div_elem = parent_elem.addChild( "div", null, "css_ref_dummy" );
        div_elem.addChild("img")
                .attribute("src", "/rsl_shared/style/Axialis/Png/16x16/Link.png");
    }
*/
    return count;
};


x.data.Reference.renderEditable = function (div, render_opts, inside_table) {
    x.log.functionStart("renderEditable", this, arguments);
    if (this.ref_entity && !x.entities[this.ref_entity]) {
        throw new Error("Field " + this.toString() + " has unrecognised ref_entity: " + this.ref_entity);
    }
    if (typeof this.render_autocompleter === "boolean") {
        if (this.render_autocompleter) {
            this.renderAutocompleter(div, render_opts);
        } else {
            this.renderDropdown     (div, render_opts);
        }
    } else {
        if (x.entities[this.ref_entity].autocompleter) {
            this.renderAutocompleter(div, render_opts);
        } else {
            this.renderDropdown     (div, render_opts);
        }
    }
};


x.data.Reference.renderAutocompleter = function (div, render_opts) {
    var input,
        input2;
    x.log.functionStart("renderAutocompleter", this, arguments);
    input = div.addChild("input", null, this.getEditableSizeCSSClass(render_opts));
    input.attribute("value", this.getText());
    input.attribute("type" , "text");
//    input.attribute("size", Math.min(this.max_update_length, this.update_length).toFixed(0));
    if (this.placeholder || this.helper_text) {
        input.attribute("placeholder", this.placeholder || this.helper_text);
    }
    input2 = div.addChild("input", null, "css_hide");
    input2.attribute("value", this.get());
    input2.attribute("type" , "hidden");
    return input;
};


x.data.Reference.renderDropdown = function (div, render_opts) {
    var select;
    x.log.functionStart("renderDropdown", this, arguments);
    this.getLoV();
    if (this.lov) {
        if (!this.lov.complete) {
            this.lov.loadEntity();
        }
        select = this.lov.render(div, render_opts, this.val, this.getEditableSizeCSSClass(render_opts), this.mandatory);
    }
    return select;
};

x.data.Reference.addClientSideProperties = function (span, render_opts) {
    x.log.functionStart("addClientSideProperties", this, arguments);
    if (!this.autocompleter_max_rows) {
        this.autocompleter_max_rows   = x.entities[this.ref_entity].autocompleter_max_rows   || 10;
    }
    if (!this.autocompleter_min_length) {
        this.autocompleter_min_length = x.entities[this.ref_entity].autocompleter_min_length || 2;
    }
    x.data.Text.addClientSideProperties.call(this, span, render_opts);
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