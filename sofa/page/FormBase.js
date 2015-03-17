/*global x, java */
"use strict";


x.page.addClone(x.page.Section, {
    id                      : "FormBase",
    columns                 : 1,
    layout                  : "form-horizontal",        // for Create/Update, "fluid" for Display, or "multi-column"
    hide_section_if_empty   : true,
    hide_blank_uneditable_fields: true,
    form_horiz_tb_input     : "input-xlarge",
    purpose                 : "To represent a single record or other FieldSet",
    properties              : {
        fieldset            : { label: "FieldSet object supporting this Section, use setFieldSet() and getFieldSet()", type: "x.data.FieldSet", usage: "read only" },
        layout              : { label: "Defines the kind of layout used, options currently: 'form-horizontal' (default) 1 column of fields, and 'fluid' which uses TB fluid layout", type: "string", usage: "optional in spec" },
//        columns           : { label: "Number of columns to arrange fields into (except possibly textareas), defaults 1", type: "number", usage: "Optional in spec" },
        field_group         : { label: "String label of sub-set of fields within the fieldset to show", type: "string", usage: "Optional in spec" },
        separate_textareas  : { label: "Render textareas as a single columns, separately below the other fields, defaults true", type: "boolean", usage: "Optional in spec" },
        hide_blank_uneditable_fields: { label: "Whether or not to hide a field from the form if it is both blank and uneditable", type: "boolean", usage: "Optional in spec" }
    }
});

/**
 * Add the FieldSet argument to this object and call its addFieldsByControl() method to add its fields to the page-level field collection
 * @param FieldSet object to apply to this section
 */
x.page.FormBase.setFieldSet = function (fieldset) {
    x.log.functionStart("setFieldSet", this, arguments);
    this.fieldset = fieldset;
    this.fieldset.id_prefix = this.id;
    this.fieldset.addToPage(this.owner.page, this.field_group);
    if (this.layout === "form-horizontal") {
        this.fieldset.tb_input = this.form_horiz_tb_input;
    } else if (this.layout === "multi-column") {
        this.fieldset.tb_input = this.multi_col_tb_input;
    }
};

/**
 * Return this section's FieldSet object
 */
x.page.FormBase.getFieldSet = function () {
    x.log.functionStart("getFieldSet", this, arguments);
    return this.fieldset;
};


x.page.FormBase.isValid = function () {
    x.log.functionStart("isValid", this, arguments);
    return !this.fieldset || this.fieldset.isValid();
};


x.page.FormBase.initDoc = function () {
    var that = this,
        entity,
        key;
    x.log.functionStart("initDoc", this, arguments);
    entity = x.base.Module.getEntity(this.entity_id);
    if (!entity) {
        throw new Error("entity not found: " + this.entity_id);
    }
    key = this.deduceKey();
    if (key) {
        this.doc_promise = entity.getDocPromise(key);
        this.doc_promise.then(function (doc) {
            that.onDocLoad(doc);
        });
    } else {
        throw new Error("no key supplied or deduced");
    }
};

x.page.FormBase.onDocLoad = function (doc) {};

x.page.FormBase.render = function (parent_elmt, render_opts) {
    var that = this;
    x.log.functionStart("render", this, arguments);
    x.page.Section.render.call(this, parent_elmt, render_opts);
    this.form_elmt = null;
    if (this.fieldset) {
        this.rerender(render_opts);
    } else {
        this.initDoc();
        this.doc_promise.then(function (doc) {
            that.setFieldSet(doc);
            that.rerender(render_opts);
        });
    }
};


x.page.FormBase.rerender = function (render_opts) {
    var count = 0;
    if (this.form_elmt) {
        this.form_elmt.empty();
    }
    if (this.layout === "form-horizontal") {
        count += this.renderFormHorizontal(this.fieldset, render_opts);
    } else if (this.layout === "fluid") {
        count += this.renderFormFluid(this.fieldset, render_opts);
    } else if (this.layout === "fluid2") {
        count += this.renderFormFluid(this.fieldset, render_opts);
    } else if (this.layout === "multi-column") {
        count += this.renderFormMultiColumn(this.fieldset, render_opts);
    }
    count += this.renderSeparateTextareas(this.fieldset, render_opts);
    if (count === 0 && this.section_elmt) {        // this.sctn_elmt will be set if hide_section_if_empty = false
        this.section_elmt.makeElement("div", "css_form_footer")
            .text("no items");
    }
};
x.page.FormBase.render.doc = {
    purpose: "Generate HTML output for this section, given its current state; depending on 'layout' property, it calls renderFormHorizontal(), \
renderFormFluid(), or renderFormMultiColumn(), and then renderSeparateTextareas()",
    args   : "XmlStream object for the parent div to add this section HTML to; render_opts",
    returns: "XmlStream object for this section's div element"
};


x.page.FormBase.getFormElement = function (render_opts) {
    x.log.functionStart("getFormElement", this, arguments);
    if (!this.form_elmt) {
        this.form_elmt = this.getSectionElement(render_opts).makeElement("div", "css_form_body " + this.layout);
    }
    return this.form_elmt;
};
x.page.FormBase.getFormElement.doc = {
    purpose: "To return the form_elmt XmlStream object (a div) during render, creating it if it doesn't already exist",
    args   : "render_opts",
    returns: "XmlStream object for this section's form div element"
};



x.page.FormBase.isFieldVisible = function (field, section_opts) {
    var visible = field.isVisible(section_opts.field_group, section_opts.hide_blank_uneditable_fields);
    if (section_opts.separate_textareas && field.separate_row_in_form) {
        visible = false;
    }
    return visible;
};
x.page.FormBase.isFieldVisible.doc = {
    purpose: "To determine whether the given field is visible in this Form context",
    args   : "field, section_opts",
    returns: "true if the field should be visible, otherwise false"
};


x.page.FormBase.renderFormHorizontal = function (fieldset, render_opts, section_opts) {
    var i,
        field,
        count = 0;
    x.log.functionStart("renderFormHorizontal", this, arguments);
    if (!section_opts) {
        section_opts = this;
    }
    for (i = 0; i < fieldset.getFieldCount(); i += 1) {
        field = fieldset.getField(i);
        if (this.isFieldVisible(field, section_opts)) {
            field.renderControlGroup(this.getFormElement(render_opts), render_opts);
            count += 1;
        }
    }
    return count;
};
x.page.FormBase.renderFormHorizontal.doc = {
    purpose: "To render the FieldSet as a form with 1 column, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.page.FormBase.renderFormFluid = function (fieldset, render_opts, section_opts) {
    var i,
        row_span = 0,
        field,
        div_elmt,
        count = 0;
    x.log.functionStart("renderFormFluid", this, arguments);
    if (!section_opts) {
        section_opts = this;
    }
    for (i = 0; i < fieldset.getFieldCount(); i += 1) {
        field = fieldset.getField(i);
        if (this.isFieldVisible(field, section_opts)) {
            row_span += field.tb_span;
            if (!div_elmt || row_span > 12) {
                div_elmt = this.getFormElement(render_opts).makeElement("div", "row-fluid");
                row_span = field.tb_span;
            }
            field.renderFormFluid(div_elmt, render_opts);
    //        field.renderFormFluid2(div_elmt, render_opts);
            count += 1;
        }
    }
    return count;
};
x.page.FormBase.renderFormFluid.doc = {
    purpose: "To render the FieldSet as a form with Twitter-Bbootstrap fluid rows, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.page.FormBase.renderFormMultiColumn = function (fieldset, render_opts, section_opts) {
    var i,
        curr_col = 1,
        field,
        table_elmt,
           tr_elmt,
        count = 0;
    x.log.functionStart("renderFormMultiColumn", this, arguments);
    if (!section_opts) {
        section_opts = this;
    }
    for (i = 0; i < fieldset.getFieldCount(); i += 1) {
        field = fieldset.getField(i);
        if (this.isFieldVisible(field, section_opts)) {
            if (!table_elmt) {
                table_elmt = this.getFormElement(render_opts).makeElement("table", "multi-column");
            }
            curr_col += 1;
            if (!tr_elmt || curr_col > this.columns) {
                tr_elmt = table_elmt.makeElement("tr");
                curr_col = 1;
            }
            field.renderLabel(tr_elmt.makeElement("td"), render_opts);
            field.render     (tr_elmt.makeElement("td"), render_opts);
            count += 1;
        }
    }
    return count;
};
x.page.FormBase.renderFormMultiColumn.doc = {
    purpose: "To render the FieldSet as a form with multi-column rows, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.page.FormBase.renderSeparateTextareas = function (fieldset, render_opts, section_opts) {
    var i,
        field,
        div_elmt,
        count = 0;
    x.log.functionStart("renderSeparateTextareas", this, arguments);
    if (!section_opts) {
        section_opts = this;
    }
    for (i = 0; i < fieldset.getFieldCount(); i += 1) {
        field = fieldset.getField(i);
        if (!field.isVisible(section_opts.field_group, section_opts.hide_blank_uneditable_fields)) {
            continue;
        }
        if (!section_opts.separate_textareas || !field.separate_row_in_form) {
            continue;
        }
        div_elmt = this.getFormElement(render_opts).makeElement("div", "row-fluid");
        field.renderFormFluid(div_elmt, render_opts);
        count += 1;
    }
    return count;
};
x.page.FormBase.renderSeparateTextareas.doc = {
    purpose: "To render the FieldSet's textarea fields below the main form, where (field.visible && this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


    
x.page.addClone(x.page.FormBase, {
    id : "Display",
//    columns : 2,
    layout: "fluid",
//    title : "Basic Details",
    separate_textareas: true,
    purpose: "To show a record read-only",
    properties: {
        entity_id     : { label: "String id of entity to display", type: "string", usage: "required in spec" },
    }
});

x.page.Display.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.page.FormBase.setup.call(this);
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    if (!this.entity_id) {
        throw new Error("entity_id not supplied: " + this.entity_id);
    }
};
x.page.Display.setup.doc = {
    purpose: "To prepare the Display section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};

x.page.Display.onDocLoad = function (doc) {
    doc.modifiable = false;
};




x.page.addClone(x.page.FormBase, {
    id: "Create",
    purpose: "To represent a newly-created record",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
//        record        : { label: "Entity object of given id - redundant, as same a fieldset", type: "x.Entity", usage: "read only" }
    }
});

x.page.Create.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.page.FormBase.setup.call(this);
    if (!this.entity || !x.entities[this.entity]) {
        throw new Error("entity not found: " + this.entity);
    }
    if (this.link_field) {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity));
        this.fieldset.linkToParent(this.owner.page.getDocument(), this.link_field);
    } else if (this.entity === this.owner.page.entity.id) {
        this.setFieldSet(this.owner.page.getDocument());
    } else {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity));
    }
};
x.page.Create.setup.doc = {
    purpose: "To prepare the Create section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};

x.page.Create.presave = function () {
    x.log.functionStart("presave", this, arguments);
    x.page.FormBase.presave.call(this);
    if (this.fieldset.isDescendantOf(x.data.Entity) && this.fieldset.isKeyComplete() && this.fieldset.getDisplayPage()) {
        this.owner.page.exit_url_save = this.fieldset.getDisplayURL();
    }
};


x.page.addClone(x.page.FormBase, {
    id: "Update",
    purpose: "To represent an existing record in the database being updated",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
    }
});

x.page.Update.setup = function () {
    var key;
    x.log.functionStart("setup", this, arguments);
    x.page.Section.setup.call(this);
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    if (!this.entity_id) {
        throw new Error("entity_id not supplied: " + this.entity_id);
    }
};
x.page.Update.setup.doc = {
    purpose: "To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};



x.page.addClone(x.page.FormBase, {
    id: "Delete",
    purpose: "To represeent an existing record in the database being deleted",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
    }
});

x.page.Delete.setup = function () {
    var key;
    x.log.functionStart("setup", this, arguments);
    x.page.Section.setup.call(this);
    if (!this.entity || !x.entities[this.entity]) {
        throw new Error("entity not found: " + this.entity);
    }
    key = this.deduceKey();
    if (key) {
        this.setFieldSet(this.owner.page.getTrans().getActiveRow(this.entity, key));
    }
    if (this.entity === this.owner.page.entity.id) {
        this.owner.page.exit_url_save = this.owner.page.session.home_page_url;
    }
    this.fieldset.each(function(field) {
        field.editable = false;
    });
    this.fieldset.setDelete(true);
};
x.page.Delete.setup.doc = {
    purpose: "To prepare the Delete section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};

//x.page.Delete.render = x.page.Display.render;



x.page.addClone(x.page.FormBase, {
    id: "FormParams",
    purpose: "To represent a set of paramteres being updated, which are not persisted in the database",
    properties: {
        fieldset: { label: "FieldSet to which the parameter fields should be added", type: "x.data.FieldSet", usage: "use methods" }
    }
});

x.page.FormParams.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.page.Section.setup.call(this);
    if (this.base_fieldset) {
        this.setFieldSet(this.base_fieldset.clone({ id: "params", modifiable: true, page: this.owner.page }));
    } else {
        this.setFieldSet(x.data.FieldSet.clone({ id: "params", modifiable: true, page: this.owner.page }));
    }
    this.fieldset.setDefaultVals();
};
x.page.FormParams.setup.doc = {
    purpose: "To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};


//To show up in Chrome debugger...
//@ sourceURL=page/FormBase.js