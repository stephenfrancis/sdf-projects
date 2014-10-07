/*global x, java */
"use strict";

x.sections.FormBase = x.sections.Section.clone({
    id                      : "FormBase",
    columns                 : 1,
    layout                  : "form-horizontal",        // for Create/Update, "fluid" for Display, or "multi-column"
    hide_section_if_empty   : true,
    hide_blank_uneditable_fields: true,
    form_horiz_tb_input		: "input-xlarge"
});
x.sections.FormBase.doc = {
    location                : "x.sections",
    file                    : "$Header: /rsl/rsl_app/core/page/FormBase.js,v 1.60 2014/07/22 07:50:58 francis Exp $",
    purpose                 : "To represent a single record or other FieldSet",
    properties              : {
        fieldset            : { label: "FieldSet object supporting this Section, use setFieldSet() and getFieldSet()", type: "x.FieldSet", usage: "read only" },
        layout              : { label: "Defines the kind of layout used, options currently: 'form-horizontal' (default) 1 column of fields, and 'fluid' which uses TB fluid layout", type: "string", usage: "optional in spec" },
//        columns           : { label: "Number of columns to arrange fields into (except possibly textareas), defaults 1", type: "number", usage: "Optional in spec" },
        field_group         : { label: "String label of sub-set of fields within the fieldset to show", type: "string", usage: "Optional in spec" },
        separate_textareas  : { label: "Render textareas as a single columns, separately below the other fields, defaults true", type: "boolean", usage: "Optional in spec" },
        hide_blank_uneditable_fields: { label: "Whether or not to hide a field from the form if it is both blank and uneditable", type: "boolean", usage: "Optional in spec" }
    }
};


x.sections.FormBase.setFieldSet = function (fieldset) {
    x.log.functionStart("setFieldSet", this, arguments);
    this.fieldset = fieldset;
    this.fieldset.control_prefix = this.id;
    this.fieldset.addToPage(this.owner.page);
    if (this.layout === "form-horizontal") {
        this.fieldset.tb_input = this.form_horiz_tb_input;
    } else if (this.layout === "multi-column") {
        this.fieldset.tb_input = this.multi_col_tb_input;
    }
};
x.sections.FormBase.setFieldSet.doc = {
    purpose: "Add the FieldSet argument to this object and call its addToPage() method to add its fields to the page-level field collection",
    args   : "FieldSet object to apply to this section",
    returns: "nothing"
};


x.sections.FormBase.getFieldSet = function () {
    x.log.functionStart("getFieldSet", this, arguments);
    return this.fieldset;
};
x.sections.FormBase.getFieldSet.doc = {
    purpose: "Return this section's FieldSet object",
    args   : "none",
    returns: "This section's FieldSet object"
};


x.sections.FormBase.isValid = function () {
    x.log.functionStart("isValid", this, arguments);
    return !this.fieldset || this.fieldset.isValid();
};


x.sections.FormBase.render = function (element, render_opts) {
    var count = 0;
    x.log.functionStart("render", this, arguments);
    x.sections.Section.render.call(this, element, render_opts);
    this.form_elem = null;
    if (!this.fieldset) {
        throw x.Exception.clone({ id: "formbase_no_fieldset", section: this });
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
    if (count === 0 && this.sctn_elem) {        // this.sctn_elem will be set if hide_section_if_empty = false
        this.sctn_elem.addChild("div", null, "css_form_footer").addText("no items");
    }
};
x.sections.FormBase.render.doc = {
    purpose: "Generate HTML output for this section, given its current state; depending on 'layout' property, it calls renderFormHorizontal(), \
renderFormFluid(), or renderFormMultiColumn(), and then renderSeparateTextareas()",
    args   : "XmlStream object for the parent div to add this section HTML to; render_opts",
    returns: "XmlStream object for this section's div element"
};


x.sections.FormBase.getFormElement = function (render_opts) {
    x.log.functionStart("getFormElement", this, arguments);
    if (!this.form_elem) {
        this.form_elem = this.getSectionElement(render_opts).addChild("div", null, "css_form_body " + this.layout);
    }
    return this.form_elem;
};
x.sections.FormBase.getFormElement.doc = {
    purpose: "To return the form_elem XmlStream object (a div) during render, creating it if it doesn't already exist",
    args   : "render_opts",
    returns: "XmlStream object for this section's form div element"
};



x.sections.FormBase.isFieldVisible = function (field, section_opts) {
    var visible = field.isVisible(section_opts.field_group, section_opts.hide_blank_uneditable_fields);
    if (section_opts.separate_textareas && field.separate_row_in_form) {
        visible = false;
    }
    return visible;
};
x.sections.FormBase.isFieldVisible.doc = {
    purpose: "To determine whether the given field is visible in this Form context",
    args   : "field, section_opts",
    returns: "true if the field should be visible, otherwise false"
};


x.sections.FormBase.renderFormHorizontal = function (fieldset, render_opts, section_opts) {
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
x.sections.FormBase.renderFormHorizontal.doc = {
    purpose: "To render the FieldSet as a form with 1 column, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.sections.FormBase.renderFormFluid = function (fieldset, render_opts, section_opts) {
    var i,
        row_span = 0,
        field,
        div_elem,
        count = 0;
    x.log.functionStart("renderFormFluid", this, arguments);
    if (!section_opts) {
        section_opts = this;
    }
    for (i = 0; i < fieldset.getFieldCount(); i += 1) {
        field = fieldset.getField(i);
        if (this.isFieldVisible(field, section_opts)) {
            row_span += field.tb_span;
            if (!div_elem || row_span > 12) {
                div_elem = this.getFormElement(render_opts).addChild("div", null, "row-fluid");
                row_span = field.tb_span;
            }
            field.renderFormFluid(div_elem, render_opts);
    //        field.renderFormFluid2(div_elem, render_opts);
            count += 1;
        }
    }
    return count;
};
x.sections.FormBase.renderFormFluid.doc = {
    purpose: "To render the FieldSet as a form with Twitter-Bbootstrap fluid rows, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.sections.FormBase.renderFormMultiColumn = function (fieldset, render_opts, section_opts) {
    var i,
        curr_col = 1,
        field,
        table_elem,
        tr_elem,
        count = 0;
    x.log.functionStart("renderFormMultiColumn", this, arguments);
    if (!section_opts) {
        section_opts = this;
    }
    for (i = 0; i < fieldset.getFieldCount(); i += 1) {
        field = fieldset.getField(i);
        if (this.isFieldVisible(field, section_opts)) {
            if (!table_elem) {
                table_elem = this.getFormElement(render_opts).addChild("table", null, "multi-column");
            }
            curr_col += 1;
            if (!tr_elem || curr_col > this.columns) {
                tr_elem = table_elem.addChild("tr");
                curr_col = 1;
            }
            field.renderLabel(tr_elem.addChild("td"), render_opts);
            field.render     (tr_elem.addChild("td"), render_opts);
            count += 1;
        }
    }
    return count;
};
x.sections.FormBase.renderFormMultiColumn.doc = {
    purpose: "To render the FieldSet as a form with multi-column rows, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.sections.FormBase.renderSeparateTextareas = function (fieldset, render_opts, section_opts) {
    var i,
        field,
        div_elem,
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
        div_elem = this.getFormElement(render_opts).addChild("div", null, "row-fluid");
        field.renderFormFluid(div_elem, render_opts);
        count += 1;
    }
    return count;
};
x.sections.FormBase.renderSeparateTextareas.doc = {
    purpose: "To render the FieldSet's textarea fields below the main form, where (field.visible && this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


    
x.sections.Display = x.sections.FormBase.clone({
    id : "Display",
//    columns : 2,
    layout: "fluid",
//    title : "Basic Details",
    separate_textareas: true
});
x.sections.Display.doc = {
    location: "x.sections",
    purpose: "To show a record read-only",
    properties: {
        entity_id   : { label: "String id of entity to display", type: "string", usage: "required in spec" },
//        record        : { label: "Entity object of given id - redundant, as same a fieldset", type: "x.Entity", usage: "read only" }
    }
};

x.sections.Display.setup = function () {
    var link_key,
        entity_obj;
    x.log.functionStart("setup", this, arguments);
    x.sections.FormBase.setup.call(this);
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    if (!this.entity_id || !x.entities[this.entity_id]) {
        throw x.Exception.clone({ id: "entity_not_found", entity: this.entity_id, section: this });
    }

    if (this.key) {
        this.setFieldSet(x.entities[this.entity_id].getDocument(this.key));
    } else if (this.link_field) {
        if (!this.owner.page.getDocument().getField(this.link_field)) {
            throw x.Exception.clone({ id: "link_field_invalid"    , entity: this.entity_id, section: this, link_field: this.link_field });
        }
        link_key = this.owner.page.getDocument().getField(this.link_field).get();
        if (!link_key) {
            throw x.Exception.clone({ id: "link_key_not_specified", entity: this.entity_id, section: this, link_field: this.link_field });
        }
        this.setFieldSet(x.entities[this.entity_id].getRow(link_key));
    } else if (this.owner.page.page_key_entity) {
        if (this.entity_id === this.owner.page.page_key_entity.id && this.owner.page.page_key) {
            this.setFieldSet(this.owner.page.page_key_entity.getRow(this.owner.page.page_key));
        }
    } else if (this.entity_id === this.owner.page.entity.id && this.owner.page.page_key) {
        this.setFieldSet(this.owner.page.getDocument());
    }
    this.fieldset.setModifiable(false);
};
x.sections.Display.setup.doc = {
    purpose: "To prepare the Display section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};


x.sections.Create = x.sections.FormBase.clone({
    id: "Create"
});
x.sections.Create.doc = {
    location: "x.sections",
    purpose: "To represent a newly-created record",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
//        record        : { label: "Entity object of given id - redundant, as same a fieldset", type: "x.Entity", usage: "read only" }
    }
};

x.sections.Create.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.sections.FormBase.setup.call(this);
    if (!this.entity_id || !x.entities[this.entity_id]) {
        throw x.Exception.clone({ id: "entity_not_found", entity: this.entity_id, section: this });
    }
    if (this.link_field) {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity_id));
        this.fieldset.linkToParent(this.owner.page.getDocument(), this.link_field);
    } else if (this.entity_id === this.owner.page.entity.id) {
        this.setFieldSet(this.owner.page.getDocument());
    } else {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity_id));
    }
};
x.sections.Create.setup.doc = {
    purpose: "To prepare the Create section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};



x.sections.Update = x.sections.FormBase.clone({
    id: "Update"
});
x.sections.Update.doc = {
    location: "x.sections",
    purpose: "To represent an existing record in the database being updated",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
//        record        : { label: "Entity object of given id - redundant, as same a fieldset", type: "x.Entity", usage: "read only" }
    }
};

x.sections.Update.setup = function () {
    var parent_record,
        link_row;
    x.log.functionStart("setup", this, arguments);
    x.sections.Section.setup.call(this);
    if (!this.entity_id || !x.entities[this.entity_id]) {
        throw x.Exception.clone({ id: "entity_not_found", entity: this.entity_id, section: this });
    }
    if (this.key) {
        this.setFieldSet(this.owner.page.getTrans().getActiveRow(this.entity_id, this.key));
    } else if (this.link_field) {
        parent_record = this.owner.page.getDocument();
        if (!parent_record.getField(this.link_field)) {
            throw x.Exception.clone({ id: "link_field_invalid", entity: this.entity_id, section: this, link_field: this.link_field });
        }
        link_row = parent_record.getField(this.link_field).getRow();
        if (!link_row) {
            throw x.Exception.clone({ id: "link_key_not_specified", entity: this.entity_id, section: this, link_field: this.link_field });
        }
        this.setFieldSet(link_row);
        link_row.linkToParent(parent_record, this.link_field);
    } else if (this.entity_id === this.owner.page.entity.id) {
        this.setFieldSet(this.owner.page.getDocument());
    }
//    if (this.fieldset.lock) {
//        this.fieldset.lock();            // take a lock now
//    }
//    this.generated_title = "Updating " + this.fieldset.getRowTitle();
};
x.sections.Update.setup.doc = {
    purpose: "To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};



x.sections.Delete = x.sections.FormBase.clone({
    id: "Delete"
});

x.sections.Delete.doc = {
    location: "x.sections",
    purpose: "To represeent an existing record in the database being deleted",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
//        record        : { label: "Entity object of given id - redundant, as same a fieldset", type: "x.Entity", usage: "read only" }
    }
};

x.sections.Delete.setup = function () {
    var parent_record,
        link_row;
    x.log.functionStart("setup", this, arguments);
    x.sections.Section.setup.call(this);
    if (!this.entity_id || !x.entities[this.entity_id]) {
        throw x.Exception.clone({ id: "entity_not_found", entity: this.entity_id, section: this });
    }
    if (this.key) {
        this.setFieldSet(this.owner.page.getTrans().getActiveRow(this.entity_id, this.key));
    } else if (this.link_field) {
        parent_record = this.owner.page.getDocument();
        if (!parent_record.getField(this.link_field)) {
            throw x.Exception.clone({ id: "link_field_invalid", entity: this.entity_id, section: this, link_field: this.link_field });
        }
        link_row = this.owner.page.getDocument().getField(this.link_field).getRow();
        if (!link_row) {
            throw x.Exception.clone({ id: "link_key_not_specified", entity: this.entity_id, section: this, link_field: this.link_field });
        }
        this.setFieldSet(link_row);
        link_row.linkToParent(parent_record, this.link_field);
    } else if (this.entity_id === this.owner.page.entity.id) {
        this.setFieldSet(this.owner.page.getDocument());
        this.owner.page.exit_url_save = this.owner.page.session.home_page_url;
    }
    this.fieldset.each(function(field) {
        field.editable = false;
    });
    this.fieldset.setDelete(true);
//    if (this.fieldset.lock) {
//        this.fieldset.lock();            // take a lock now
//    }
//    this.generated_title = "Deleting " + this.fieldset.getRowTitle();
};
x.sections.Delete.setup.doc = {
    purpose: "To prepare the Delete section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};

//x.sections.Delete.render = x.sections.Display.render;



x.sections.FormParams = x.sections.FormBase.clone({
    id: "FormParams"
});
x.sections.FormParams.doc = {
    location: "x.sections",
    purpose: "To represent a set of paramteres being updated, which are not persisted in the database",
    properties: {
        fieldset: { label: "FieldSet to which the parameter fields should be added", type: "x.FieldSet", usage: "use methods" }
    }
};

x.sections.FormParams.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.sections.Section.setup.call(this);
    if (this.base_fieldset) {
        this.setFieldSet(this.base_fieldset.clone({ id: "params", modifiable: true, page: this.owner.page }));
    } else {
        this.setFieldSet(x.FieldSet.clone({ id: "params", modifiable: true, page: this.owner.page }));
    }
    this.fieldset.setDefaultVals();
};
x.sections.FormParams.setup.doc = {
    purpose: "To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};

//To show up in Chrome debugger...
//@ sourceURL=pa/FormBase.js