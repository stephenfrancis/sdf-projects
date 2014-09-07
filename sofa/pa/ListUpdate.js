/*global x, java */
"use strict";

x.sections.ListUpdate = x.sections.ListBase.clone({
    id                      : "ListUpdate",
       allow_add_rows       : true,
    allow_delete_rows       : true,
       add_row_icon         : "&#x002B;",       // ordinary plus ; "&#x2795;" heavy plus sign
    delete_row_icon         : "&times;"         // ordinary cross; "&#x274C;" heavy cross mark
});

x.sections.ListUpdate.doc = {
    location                : "x.sections",
    file                    : "$Header: /rsl/rsl_app/core/page/ListUpdate.js,v 1.59 2014/07/25 12:37:09 francis Exp $",
    purpose                 : "To represent an updateable grid of records relating to a parent record",
    properties: {
        entity              : { label: "String id of entity to which the grid records belong", type: "string", usage: "required in spec" },
        link_field          : { label: "String id of field in the given entity which defines the relationship to the parent record", type: "string", usage: "optional in spec" },
        add_row_field       : { label: "String id of field to use as 'row adder' drop-down control, which adds a row to the grid whenever a value is picked", type: "string", usage: "optional in spec" },
        add_row_unique      : { label: "If add_row_field is given, this determines whether multiple rows cannot have the same value, if true then the value is removed from the drop-down once used in the grid", type: "boolean", usage: "optional in spec" },
        allow_add_rows      : { label: "Whether or not user can add new records with this grid, defaults true", type: "boolean", usage: "optional in spec" },
        allow_delete_rows   : { label: "Whether or not user can delete existing records with this grid, defaults true", type: "boolean", usage: "optional in spec" },
        entity_obj          : { label: "Entity object representing the entity, obtained on call to setupEntity(), and used statically", type: "x.Entity", usage: "use methods only" },
        rows                : { label: "Array of records in the grid", type: "array", usage: "use methods only" },
        parent_record       : { label: "Entity object representing the parent record to which grid records belong, use getParentRecord()", type: "x.Entity", usage: "do not use" },
        query               : { label: "Query object used to load records into the grid, set by setupLoadQuery()", type: "x.sql.Query", usage: "use methods only" }
    }
};

x.sections.ListUpdate.clone = function (spec) {
    var new_obj;
    x.log.functionStart("clone", this, arguments);
    new_obj = x.sections.ListUpdate.clone.call(this, spec);
    new_obj.rows = [];
    return new_obj;
};


x.sections.ListUpdate.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.sections.ListBase.setup.call(this);
    if (!this.entity || !x.entities[this.entity]) {
        throw x.Exception.clone({ id: "entity_not_found", entity_id: this.entity });
    }
    this.entity_obj = x.entities[this.entity];
//    this.generated_title = this.entity_obj.getPluralLabel();
    this.getParentRecord();
    this.setupColumns();
    if (this.add_row_field) {
        this.setupAddRowField();
    }
    if (this.auto_fill !== false) {
        this.setupLoadQuery();
        this.load();
    }
};
x.sections.ListUpdate.setup.doc = {
    purpose: "To setup this grid, by setting 'entity_obj' to the entity specified by 'entity', then calling \
getParentRecord(), setupColumns(), setupAddRowField() if 'add_row_field' \
is specified, and setupLoadQuery() and load() if 'auto_fill' is not false",
    args   : "none",
    returns: "nothing"
};


x.sections.ListUpdate.setupColumns = function () {
    var col,
        section,
        i,
        field,
        delete_row_icon = this.delete_row_icon;
    x.log.functionStart("setupColumns", this, arguments);
    if (this.allow_delete_rows) {
        section = this;
        col = this.columns.add({ id: "_delete", label: " ", css_class: "css_col_control" });
        col.renderCell = function (row_elem, render_opts, j, row_obj) {
            var cell_elem;
            x.log.functionStart("renderCell", this, arguments);
            if (this.visible) {
                cell_elem = row_elem.addChild("td", null, this.css_class);
                cell_elem.addChild("a", "list_delete_" + section.id + "_" + section.rows.indexOf(row_obj), "css_cmd css_uni_icon_lrg")
                    .attribute("title", "Remove this row")
                    .addText(delete_row_icon, true);
//                    .addChild("img", "list_delete_" + section.id + "_" + section.rows.indexOf(row_obj), "css_cmd")
//                    .attribute("alt", "Remove this row")
//                    .attribute("src", "../rsl_shared/style/Axialis/Png/16x16/Minus.png");
            }
        };
    }
    for (i = 0; i < this.entity_obj.getFieldCount(); i += 1) {
        field = this.entity_obj.getField(i);
        if (field.accessible !== false) {
            col = this.columns.add({ field: field });
            x.log.trace(this, "Adding field as column: " + field.id + " to section " + this.id);
            if (col.id === this.link_field) {
                col.visible = false;
            }
        }
    }
};
x.sections.ListUpdate.setupColumns.doc = {
    purpose: "To create a delete row control column if 'allow_delete_rows', and then to loop through the fields in \
'entity_obj', adding each one as a column by calling this.columns.add() unless the field has 'accessible' set to false",
    args   : "none",
    returns: "nothing"
};


x.sections.ListUpdate.setupAddRowField = function () {
    var orig_add_row_field;
    x.log.functionStart("setupAddRowField", this, arguments);
    this.add_row_field_obj = x.fields.Option.clone({
        id: "add_row_field_" + this.id,
        label: "Add a new row",
        tb_input: "input-medium",
        css_reload: true
    });
    orig_add_row_field = this.entity_obj.getField(this.add_row_field);
    if (orig_add_row_field.list) {
        this.add_row_field_obj.lov = x.LoV.clone({
            id         : orig_add_row_field.list,
            list       : orig_add_row_field.list
        });
        this.add_row_field_obj.lov.loadList();
    } else if (orig_add_row_field.ref_entity) {
        this.add_row_field_obj.lov = x.LoV.clone({
            id: orig_add_row_field.ref_entity,
            entity: orig_add_row_field.ref_entity
        });
        this.add_row_field_obj.lov.loadEntity();
    } else if (orig_add_row_field.config_item) {
        this.add_row_field_obj.lov = x.LoV.clone({
            id         : orig_add_row_field.config_item,
            config_item: orig_add_row_field.config_item,
            label_prop : orig_add_row_field.label_prop,
            active_prop: orig_add_row_field.active_prop
        });
    }
//    this._add_row_field;
    return orig_add_row_field;
};
x.sections.ListUpdate.setupAddRowField.doc = {
    purpose: "To setup this section to use an 'add row field', i.e. a field in entity_obj (usually of Option type) \
that is used to add new rows to the grid",
    args   : "none",
    returns: "the field in entity_obj specified by 'add_row_field'"
};


x.sections.ListUpdate.setupLoadQuery = function () {
    x.log.functionStart("setupLoadQuery", this, arguments);
    if (this.load_entity_id) {
        this.query = x.entities[this.load_entity_id].getQuery(null, true);
    } else {
        this.query = this.entity_obj.getQuery(null, true);        // true = set default sort
    }
// this.link_field is the field in this.parent_record that defines the relationship in each record in this grid
// this.load_link_field (if supplied) is the field in this.load_entity_id (if supplied, otherwise this.entity)
//        which defines the load filter condition
// e.g. this.entity = "vc_sbm_skill", this.parent_entity.id = "vc_sbm" - so this grid is a grid of submission skills related to a submission
//        this.load_entity_id = "vr_rqmt_skill", this.load_link_field = "rqmt", and this.load_parent_link = "rqmt"
//            so 
    if (this.load_link_field && this.load_link_value) {
        this.setLinkField(this.load_link_field, this.load_link_value);
    } else if (this.link_field && this.parent_record) {
        this.setLinkField(this.link_field, this.parent_record.getKey());
    }
};
x.sections.ListUpdate.setupLoadQuery.doc = {
    purpose: "To create a new x.sql.Query object, stored to 'query' to be used to load initial rows into the grid; \
the query based on either the entity specified by 'load_entity_id', or on entity_obj; if 'load_link_field' and \
'load_link_value' are specified then setLinkField() is called with them, otherwise if 'link_field' and 'parent_record' \
are specified, setLinkField() is called with them",
    args   : "none",
    returns: "nothing"
};


x.sections.ListUpdate.getParentRecord = function () {
    x.log.functionStart("getParentRecord", this, arguments);
    if (!this.parent_record && this.entity_obj && this.link_field) {
        if (this.owner.page.page_key_entity && this.entity_obj.getField(this.link_field).ref_entity === this.owner.page.page_key_entity.id) {
            this.parent_record = this.owner.page.page_key_entity.getRow(this.owner.page.page_key);
        } else if (this.entity_obj.getField(this.link_field).ref_entity === this.owner.page.entity.id) {
            this.parent_record = this.owner.page.getPrimaryRow();
        }
    }
    x.log.debug(this, this + " has parent_record " + this.parent_record);
    return this.parent_record;
};
x.sections.ListUpdate.getParentRecord.doc = {
    purpose: "To set 'parent_record' if not already, as follows: if the owning page has 'page_key_entity' and it is the \
ref_entity of the field in this.entity_obj specified by 'link_field' then set 'parent_record' to the 'page_key_entity' row \
given by page_key of the owning page, otherwise if the ref_entity of the field in 'entity_obj' specified by 'link_field' \
is the entity of the owning_page the 'parent_record' is set to the page's primary row",
    args   : "none",
    returns: "this.parent_record"
};


x.sections.ListUpdate.load = function () {
    x.log.functionStart("load", this, arguments);
    while (this.query.next()) {
        this.addExistingRow(this.query.getColumn("A._key").get());
    }
    this.query.reset();
};
x.sections.ListUpdate.load.doc = {
    purpose: "To load initial rows into this grid by looping over this.query, calling addExistingRow() on each row's ley",
    args   : "none",
    returns: "nothing"
};


x.sections.ListUpdate.addExistingRow = function (row_key) {
    var row;
    x.log.functionStart("addExistingRow", this, arguments);
    row = this.owner.page.getTrans().getActiveRow(this.entity, row_key);
    this.addRow(row);
    return row;
};
x.sections.ListUpdate.addExistingRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.addNewRow = function (field_id, field_val) {
    var row;
    x.log.functionStart("addNewRow", this, arguments);
    if (this.add_row_unique && this.add_row_field === field_id) {
        if (!this.add_row_field_obj.lov.getItem(field_val).active) {
            x.log.info(this, "addNewRow() row already exists: " + field_val);
            return;
        }
    }
    row = this.addNewRowInternal(field_id, field_val);
    return row;
};
x.sections.ListUpdate.addNewRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.addNewRowInternal = function (field_id, field_val) {
    var row;
    x.log.functionStart("addNewRowInternal", this, arguments);
    row = this.owner.page.getTrans().createNewRow(this.entity);
    this.getParentRecord();
// superseded by linkToParent()
//    if (this.parent_record && this.link_field && typeof this.parent_record.getKey() === "string") {
//        row.getField(this.link_field).set(this.parent_record.getKey());
//    }
    if (field_id && field_val) {
        row.getField(field_id).set(field_val);
    }
    this.addRow(row);
    return row;
};
x.sections.ListUpdate.addNewRowInternal.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.addRow = function (row) {
    var section = this,
        id,
        item;
    x.log.functionStart("addRow", this, arguments);
    row.each(function (field) {
        field.column = section.columns.get(field.id);
        if (field.column) {
            if (field.column.tb_input) {
                field.tb_input = field.column.tb_input;
            }
            if (typeof field.column.editable  === "boolean") {
                field.editable  = field.column.editable;
            }
            if (typeof field.column.mandatory === "boolean") {
                field.mandatory = field.column.mandatory;
                field.validate();
            }
        }
    });
    if (this.add_row_unique && this.add_row_field) {
        id = row.getField(this.add_row_field).get();
        if (id) {
            item = this.add_row_field_obj.lov.getItem(id);
            if (item) {
                item.active = false;
            }
        }
    }
    row.control_prefix = this.id + "_" + this.rows.length;
    row.linkToParent(this.parent_record, this.link_field);
    this.rows.push(row);
};
x.sections.ListUpdate.addRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.deleteRow = function (row) {
    var id,
        item;
    x.log.functionStart("deleteRow", this, arguments);
    row.setDelete(true);
    if (this.add_row_unique && this.add_row_field) {
        id = row.getField(this.add_row_field).get();
        if (id) {
            item = this.add_row_field_obj.lov.getItem(id);
            if (item) {
                item.active = true;
            }
        }
    }
};
x.sections.ListUpdate.deleteRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.eachRow = function (funct) {
    var i;
    x.log.functionStart("eachRow", this, arguments);
    for (i = 0; i < this.rows.length; i += 1) {
        funct(this.rows[i]);
    }
};
x.sections.ListUpdate.eachRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.isValid = function () {
    var valid = true;
    x.log.functionStart("isValid", this, arguments);
    this.eachRow(function (row) {
        valid = valid && (row.deleting || row.isValid());
    });
    return valid;
};


x.sections.ListUpdate.update = function (param) {
    var match,
        row_nbr;
    x.log.functionStart("update", this, arguments);
    x.sections.ListBase.update.call(this, param);
    if (this.allow_add_rows && param.page_button === "list_add_" + this.id) {
        this.addNewRow();
    } else if (this.allow_add_rows && param.page_button === "add_row_field_" + this.id) {
        this.addNewRow(this.add_row_field, param["add_row_field_" + this.id]);
    } else if (typeof param.page_button === "string") {
        match = param.page_button.match(new RegExp("list_delete_" + this.id + "_([0-9]*)"));
        if (match && match.length > 1 && this.allow_delete_rows) {
            row_nbr = parseInt(match[1], 10);
            if (this.rows.length <= row_nbr || !this.rows[row_nbr]) {
                throw x.Exception.clone({ id: "row_not_found_for_delete", text: "Invalid row for deletion", row_number: row_nbr });
            }
            this.deleteRow(this.rows[row_nbr]);
        }
    }
};
x.sections.ListUpdate.update.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.renderBody = function (render_opts) {
    var i,
        j,
        col;
    x.log.functionStart("renderBody", this, arguments);
    if (this.allow_add_rows) {
        this.getTableElement(render_opts);                // force always table display
    }
//    this.resetAggregations(render_opts);
    for (i = 0; i < this.rows.length; i += 1) {
        if (!this.rows[i].deleting) {
            this.row_count += 1;
            for (j = 0; j < this.columns.length(); j += 1) {
                col = this.columns.get(j);
                x.log.trace(this, "Setting column " + col + " to have field " + this.rows[i].getField(col.id));
                col.field = this.rows[i].getField(col.id);
            }
            this.renderRow(render_opts, this.rows[i]);
        }
    }
//    this.found_rows = this.rows.length;
    this.recordset_last = 1;
//    this.frst_record_in_set = 1;
//    this.last_record_in_set = this.rows.length;
};
x.sections.ListUpdate.renderBody.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.sections.ListUpdate.renderRowAdder = function (foot_elem, render_opts) {
    var ctrl_elem;
    x.log.functionStart("renderRowAdder", this, arguments);
    if (this.allow_add_rows) {
        ctrl_elem = foot_elem.addChild("span", null, "css_list_add");
        if (this.add_row_field) {
            ctrl_elem.addText("Add new row:");
            this.add_row_field_obj.render(ctrl_elem, render_opts);
        } else {
            ctrl_elem.addChild("a", "list_add_" + this.id, "css_cmd css_uni_icon_lrg")
                .attribute("title", "Add another row")
                .addText(this.add_row_icon, true);
//                .addChild("img", "list_add_" + this.id, "css_cmd")
//                .attribute("alt", "Add another row")
//                .attribute("src", "../rsl_shared/style/Axialis/Png/16x16/Plus.png");
        }
//        ctrl_elem.addText(" ");
    }
    return ctrl_elem;
};
x.sections.ListUpdate.renderRowAdder.doc = {
    purpose: "",
    args   : "",
    returns: ""
};

//To show up in Chrome debugger...
//@ sourceURL=pa/ListUpdate.js