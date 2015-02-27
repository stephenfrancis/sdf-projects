/*global x, java */
"use strict";

x.page.ListUpdate = x.page.ListBase.clone({
    id                      : "ListUpdate",
       allow_add_rows       : true,
    allow_delete_rows       : true,
       add_row_icon         : "+",       // &#x002B ordinary plus ; "&#x2795;" heavy plus sign
    delete_row_icon         : "×"        // &times; ordinary cross; "&#x274C;" heavy cross mark
});

x.page.ListUpdate.doc = {
    location                : "x.sections",
    file                    : "$Header: /rsl/rsl_app/core/page/ListUpdate.js,v 1.59 2014/07/25 12:37:09 francis Exp $",
    purpose                 : "To represent an updateable grid of records relating to a parent record",
    properties: {
        entity_id           : { label: "String id of entity to which the grid records belong", type: "string", usage: "required in spec" },
        add_row_field       : { label: "String id of field to use as 'row adder' drop-down control, which adds a row to the grid whenever a value is picked", type: "string", usage: "optional in spec" },
        add_row_unique      : { label: "If add_row_field is given, this determines whether multiple rows cannot have the same value, if true then the value is removed from the drop-down once used in the grid", type: "boolean", usage: "optional in spec" },
        allow_add_rows      : { label: "Whether or not user can add new records with this grid, defaults true", type: "boolean", usage: "optional in spec" },
        allow_delete_rows   : { label: "Whether or not user can delete existing records with this grid, defaults true", type: "boolean", usage: "optional in spec" },
        entity              : { label: "Entity object representing the entity, obtained on call to setupEntity(), and used statically", type: "x.data.Entity", usage: "use methods only" },
//        rows                : { label: "Array of records in the grid", type: "array", usage: "use methods only" },
        parent_record       : { label: "Entity object representing the parent record to which grid records belong, use getParentRecord()", type: "x.data.Entity", usage: "do not use" },
    }
};

x.page.ListUpdate.clone = function (spec) {
    var new_obj;
    x.log.functionStart("clone", this, arguments);
    new_obj = x.page.ListBase.clone.call(this, spec);
//    new_obj.row_count = 0;
    new_obj.rows_ever = 0;
//    new_obj.rows = [];
    return new_obj;
};


x.page.ListUpdate.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.page.ListBase.setup.call(this);
    if (!this.entity_id) {          // set manually
        return;
    }
    if (!x.entities[this.entity_id]) {
        throw new Error("entity not found: " + this.entity_id);
    }
    this.setEntity(this.entity_id, this.owner.page.getDocument());
};

x.page.ListUpdate.setEntity = function (entity_id, parent_record) {
    x.log.functionStart("setEntity", this, arguments);
    this.entity = x.entities[entity_id];
    this.parent_record = parent_record;
    this.setupColumns();
    if (this.add_row_field) {
        this.setupAddRowField();
    }
    this.existingRows();
};
x.page.ListUpdate.setup.doc = {
    purpose: "To setup this grid, by setting 'entity' to the entity specified by 'entity', then calling \
getParentRecord(), setupColumns(), setupAddRowField() if 'add_row_field' \
is specified, and setupLoadQuery() and load() if 'auto_fill' is not false",
    args   : "none",
    returns: "nothing"
};


x.page.ListUpdate.setupColumns = function () {
    var i;
    x.log.functionStart("setupColumns", this, arguments);
    if (this.allow_delete_rows) {
        this.addDeleteColumn();
    }
    for (i = 0; i < this.entity.getFieldCount(); i += 1) {
        this.addFieldColumn(this.entity.getField(i));
    }
};
x.page.ListUpdate.setupColumns.doc = {
    purpose: "To create a delete row control column if 'allow_delete_rows', and then to loop through the fields in \
'entity', adding each one as a column by calling this.columns.add() unless the field has 'accessible' set to false",
    args   : "none",
    returns: "nothing"
};


x.page.ListUpdate.addDeleteColumn = function () {
    var that = this,
        col;

    x.log.functionStart("addDeleteColumn", this, arguments);
    col = this.columns.add({ id: "_delete", label: " ", css_class: "css_col_control" });
    col.renderCell = function (row_elem, render_opts, i, row) {
        var cell_elem;
        x.log.functionStart("renderCell", this, arguments);
        if (this.visible) {
            cell_elem = row_elem.addChild("td", null, this.css_class);
            cell_elem.addChild("a", "list_delete_" + row.control_prefix, "css_cmd css_uni_icon_lrg")
                .attribute("title", "Remove this row")
                .addText(that.delete_row_icon, true);
//                .addChild("img", "list_delete_" + section.id + "_" + section.rows.indexOf(row_obj), "css_cmd")
//                .attribute("alt", "Remove this row")
//                .attribute("src", "../rsl_shared/style/Axialis/Png/16x16/Minus.png");
        }
    };
};

x.page.ListUpdate.addFieldColumn = function (field) {
    x.log.functionStart("addFieldColumn", this, arguments);
    if (field.accessible !== false) {
        x.log.trace(this, "Adding field as column: " + field.id + " to section " + this.id);
        this.columns.add({ field: field });
    }
};

x.page.ListUpdate.setupAddRowField = function () {
    var orig_add_row_field;
    x.log.functionStart("setupAddRowField", this, arguments);
    this.add_row_field_obj = x.data.Option.clone({
        id: "add_row_field_" + this.id,
        label: "Add a new row",
        tb_input: "input-medium",
        css_reload: true
    });
    orig_add_row_field = this.entity.getField(this.add_row_field);
    if (orig_add_row_field.list) {
        this.add_row_field_obj.lov = x.data.LoV.clone({
            id         : orig_add_row_field.list,
            list       : orig_add_row_field.list
        });
        this.add_row_field_obj.lov.loadList();
    } else if (orig_add_row_field.ref_entity) {
        this.add_row_field_obj.lov = x.data.LoV.clone({
            id: orig_add_row_field.ref_entity,
            entity: orig_add_row_field.ref_entity
        });
        this.add_row_field_obj.lov.loadEntity();
    } else if (orig_add_row_field.config_item) {
        this.add_row_field_obj.lov = x.data.LoV.clone({
            id         : orig_add_row_field.config_item,
            config_item: orig_add_row_field.config_item,
            label_prop : orig_add_row_field.label_prop,
            active_prop: orig_add_row_field.active_prop
        });
    }
//    this._add_row_field;
    return orig_add_row_field;
};
x.page.ListUpdate.setupAddRowField.doc = {
    purpose: "To setup this section to use an 'add row field', i.e. a field in entity (usually of Option type) \
that is used to add new rows to the grid",
    args   : "none",
    returns: "the field in entity specified by 'add_row_field'"
};


x.page.ListUpdate.existingRows = function () {
    var that = this;
    x.log.functionStart("existingRows", this, arguments);
    this.eachRow(function (row) {
        that.addRow(row);
    });
};


x.page.ListUpdate.addNewRow = function (field_id, field_val) {
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
x.page.ListUpdate.addNewRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.addNewRowInternal = function (field_id, field_val) {
    var row;
    x.log.functionStart("addNewRowInternal", this, arguments);
    row = this.parent_record.addChild(this.entity_id);
    if (field_id && field_val) {
        row.getField(field_id).set(field_val);
    }
    this.addRow(row);
    return row;
};
x.page.ListUpdate.addNewRowInternal.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.addRow = function (row) {
    var that = this,
        id,
        item;
    x.log.functionStart("addRow", this, arguments);
//    this.row_count += 1;
    this.rows_ever += 1;

    row.each(function (field) {
        field.column = that.columns.get(field.id);
        if (field.column) {
            if (field.column.tb_input) {
                field.tb_input  = field.column.tb_input;
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
    row.control_prefix = this.id + "_" + this.rows_ever;
    row.addToPage(this.owner.page);
//    row.linkToParent(this.parent_record, this.link_field);
//    this.rows.push(row);
};
x.page.ListUpdate.addRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.deleteRow = function (row) {
    var id,
        item;
    x.log.functionStart("deleteRow", this, arguments);
    row.setDelete(true);
    row.removeFromPage(this.owner.page);
//    this.row_count -= 1;

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
x.page.ListUpdate.deleteRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.eachRow = function (funct) {
    x.log.functionStart("eachRow", this, arguments);
    this.parent_record.eachChildRow(funct, this.entity_id);
};
x.page.ListUpdate.eachRow.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.isValid = function () {
    var valid = true;
    x.log.functionStart("isValid", this, arguments);
    this.eachRow(function (row) {
        valid = valid && (row.deleting || row.isValid());
    });
    return valid;
};


x.page.ListUpdate.update = function (params) {
    var that = this;
    x.log.functionStart("update", this, arguments);
    x.page.ListBase.update.call(this, params);

    if (this.allow_add_rows && params.page_button === "list_add_" + this.id) {
        this.addNewRow();

    } else if (this.allow_add_rows && params.page_button === "add_row_field_" + this.id) {
        this.addNewRow(this.add_row_field, params["add_row_field_" + this.id]);

    } else if (this.allow_delete_rows && typeof params.page_button === "string" && params.page_button.indexOf("list_delete_" + this.id) === 0) {
        this.eachRow(function (row) {
            if (params.page_button === "list_delete_" + row.control_prefix) {
                that.deleteRow(row);
            }
        });
    }
};
x.page.ListUpdate.update.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.renderBody = function (render_opts) {
    var that = this;
    x.log.functionStart("renderBody", this, arguments);
    if (this.allow_add_rows) {
        this.getTableElement(render_opts);                // force always table display
    }
//    this.resetAggregations(render_opts);
    this.eachRow(function (row) {
        if (!row.deleting) {
            that.columns.each(function (col) {
                x.log.trace(that, "Setting column " + col + " to have field " + row.getField(col.id));
                col.field = row.getField(col.id);
            });
            that.renderRow(render_opts, row);
        }
    });
//    this.found_rows = this.rows.length;
    this.recordset_last = 1;
//    this.frst_record_in_set = 1;
//    this.last_record_in_set = this.rows.length;
};
x.page.ListUpdate.renderBody.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListUpdate.renderRowAdder = function (foot_elem, render_opts) {
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
x.page.ListUpdate.renderRowAdder.doc = {
    purpose: "",
    args   : "",
    returns: ""
};

//To show up in Chrome debugger...
//@ sourceURL=page/ListUpdate.js