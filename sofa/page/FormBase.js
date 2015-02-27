/*global x, java */
"use strict";

x.page.FormBase = x.page.Section.clone({
    id                      : "FormBase",
    columns                 : 1,
    layout                  : "form-horizontal",        // for Create/Update, "fluid" for Display, or "multi-column"
    hide_section_if_empty   : true,
    hide_blank_uneditable_fields: true,
    form_horiz_tb_input     : "input-xlarge"
});
x.page.FormBase.doc = {
    location                : "x.sections",
    file                    : "$Header: /rsl/rsl_app/core/page/FormBase.js,v 1.62 2015/02/04 11:32:35 francis Exp $",
    purpose                 : "To represent a single record or other FieldSet",
    properties              : {
        fieldset            : { label: "FieldSet object supporting this Section, use setFieldSet() and getFieldSet()", type: "x.data.FieldSet", usage: "read only" },
        layout              : { label: "Defines the kind of layout used, options currently: 'form-horizontal' (default) 1 column of fields, and 'fluid' which uses TB fluid layout", type: "string", usage: "optional in spec" },
//        columns           : { label: "Number of columns to arrange fields into (except possibly textareas), defaults 1", type: "number", usage: "Optional in spec" },
        field_group         : { label: "String label of sub-set of fields within the fieldset to show", type: "string", usage: "Optional in spec" },
        separate_textareas  : { label: "Render textareas as a single columns, separately below the other fields, defaults true", type: "boolean", usage: "Optional in spec" },
        hide_blank_uneditable_fields: { label: "Whether or not to hide a field from the form if it is both blank and uneditable", type: "boolean", usage: "Optional in spec" }
    }
};


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
x.page.FormBase.setFieldSet.doc = {
    purpose: "Add the FieldSet argument to this object and call its addFieldsByControl() method to add its fields to the page-level field collection",
    args   : "FieldSet object to apply to this section",
    returns: "nothing"
};


x.page.FormBase.getFieldSet = function () {
    x.log.functionStart("getFieldSet", this, arguments);
    return this.fieldset;
};
x.page.FormBase.getFieldSet.doc = {
    purpose: "Return this section's FieldSet object",
    args   : "none",
    returns: "This section's FieldSet object"
};


x.page.FormBase.isValid = function () {
    x.log.functionStart("isValid", this, arguments);
    return !this.fieldset || this.fieldset.isValid();
};


x.page.FormBase.render = function (element, render_opts) {
    var count = 0;
    x.log.functionStart("render", this, arguments);
    x.page.Section.render.call(this, element, render_opts);
    this.form_elem = null;
    if (!this.fieldset) {
        throw new Error("fieldset property not defined - call setFieldSet()");
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
x.page.FormBase.render.doc = {
    purpose: "Generate HTML output for this section, given its current state; depending on 'layout' property, it calls renderFormHorizontal(), \
renderFormFluid(), or renderFormMultiColumn(), and then renderSeparateTextareas()",
    args   : "XmlStream object for the parent div to add this section HTML to; render_opts",
    returns: "XmlStream object for this section's div element"
};


x.page.FormBase.getFormElement = function (render_opts) {
    x.log.functionStart("getFormElement", this, arguments);
    if (!this.form_elem) {
        this.form_elem = this.getSectionElement(render_opts).addChild("div", null, "css_form_body " + this.layout);
    }
    return this.form_elem;
};
x.page.FormBase.getFormElement.doc = {
    purpose: "To return the form_elem XmlStream object (a div) during render, creating it if it doesn't already exist",
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
x.page.FormBase.renderFormFluid.doc = {
    purpose: "To render the FieldSet as a form with Twitter-Bbootstrap fluid rows, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.page.FormBase.renderFormMultiColumn = function (fieldset, render_opts, section_opts) {
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
x.page.FormBase.renderFormMultiColumn.doc = {
    purpose: "To render the FieldSet as a form with multi-column rows, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


x.page.FormBase.renderSeparateTextareas = function (fieldset, render_opts, section_opts) {
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
x.page.FormBase.renderSeparateTextareas.doc = {
    purpose: "To render the FieldSet's textarea fields below the main form, where (field.visible && this.separate_textareas && field.separate_row_in_form)",
    args   : "FieldSet object of fields to render, render_opts, section_opts (defaults to the Section object itself)",
    returns: "Number of fields rendered"
};


    
x.page.Display = x.page.FormBase.clone({
    id : "Display",
//    columns : 2,
    layout: "fluid",
//    title : "Basic Details",
    separate_textareas: true
});
x.page.Display.doc = {
    location: "x.sections",
    purpose: "To show a record read-only",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
    }
};

x.page.Display.setup = function () {
    var key;
    x.log.functionStart("setup", this, arguments);
    x.page.FormBase.setup.call(this);
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    if (!this.entity || !x.entities[this.entity]) {
        throw new Error("entity not found: " + this.entity);
    }
    key = this.deduceKey();
    if (key) {
        this.setFieldSet(x.entities[this.entity].getRow(key));
    }
};
x.page.Display.setup.doc = {
    purpose: "To prepare the Display section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};

x.page.Display.update = function (param) {
    x.log.functionStart("update", this, arguments);
    x.page.FormBase.update(param);
    this.fieldset.reload();
};


x.page.Create = x.page.FormBase.clone({
    id: "Create"
});
x.page.Create.doc = {
    location: "x.sections",
    purpose: "To represent a newly-created record",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
//        record        : { label: "Entity object of given id - redundant, as same a fieldset", type: "x.Entity", usage: "read only" }
    }
};

x.page.Create.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.page.FormBase.setup.call(this);
    if (!this.entity || !x.entities[this.entity]) {
        throw new Error("entity not found: " + this.entity);
    }
    if (this.link_field) {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity));
        this.fieldset.linkToParent(this.owner.page.getPrimaryRow(), this.link_field);
    } else if (this.entity === this.owner.page.entity.id) {
        this.setFieldSet(this.owner.page.getPrimaryRow());
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


x.page.Update = x.page.FormBase.clone({
    id: "Update"
});
x.page.Update.doc = {
    location: "x.sections",
    purpose: "To represent an existing record in the database being updated",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
    }
};

x.page.Update.setup = function () {
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
};
x.page.Update.setup.doc = {
    purpose: "To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined",
    args   : "none",
    returns: "nothing"
};



x.page.Delete = x.page.FormBase.clone({
    id: "Delete"
});

x.page.Delete.doc = {
    location: "x.sections",
    purpose: "To represeent an existing record in the database being deleted",
    properties: {
        entity        : { label: "String id of entity to display", type: "string", usage: "required in spec" },
    }
};

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



x.page.FormParams = x.page.FormBase.clone({
    id: "FormParams"
});
x.page.FormParams.doc = {
    location: "x.sections",
    purpose: "To represent a set of paramteres being updated, which are not persisted in the database",
    properties: {
        fieldset: { label: "FieldSet to which the parameter fields should be added", type: "x.data.FieldSet", usage: "use methods" }
    }
};

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