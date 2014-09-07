/*global x, java */
"use strict";

x.FieldSet = x.OrderedMap.clone({
    id                      : "FieldSet",
    modifiable              : false,
    modified                : false,                       // private - modified since original value, or not?
    deleting                : false                        // whether or not we are deleting this record
});
x.FieldSet.doc = {
    location                : "x",
    file                    : "$Header: /rsl/rsl_app/core/trans/FieldSet.js,v 1.35 2014/06/27 13:50:46 francis Exp $",
    purpose                 : "An OrderedMap of fields, whose ids are unique within this object",
    properties              : {
        modifiable          : { label: "Whether or not these fields can be modified (overrides their own 'editable' property, defaults false", type: "boolean", usage: "optional in spec" },
        modified            : { label: "Whether or not any of the fields have been modified, use isModified()", type: "boolean", usage: "do not use" },
        deleting            : { label: "Whether or not this FieldSet is currently set to be deleted (only applies to records)", type: "boolean", usage: "read only" },
        trans               : { label: "Transaction object, required if fields to be read from / written to database", type: "x.Transaction", usage: "required in spec (if necessary)" },
    }
};


x.FieldSet.addFields = function (spec_array) {
    var i;
    x.log.functionStart("addFields", this, arguments);
    for (i = 0; i < spec_array.length; i += 1) {
        this.addField(spec_array[i]);
    }
};
x.FieldSet.addFields.doc = {
    purpose: "",
    args   : "none",
    returns: "nothing"
};


x.FieldSet.addField = function (field_spec) {
    var field;
    x.log.functionStart("addField", this, arguments);
    if (!field_spec.id || typeof field_spec.id !== "string") {
        throw x.Exception.clone({ id: "id_must_be_nonblank_string", fieldset: this, field_spec: x.Base.view.call(field_spec) });
    }
    if (!field_spec.type) {
        throw x.Exception.clone({ id: "field_type_must_be_specified", fieldset: this, field_spec: x.Base.view.call(field_spec) });
    }
    if (!field_spec.type || !x.fields[field_spec.type]) {
        throw x.Exception.clone({ id: "field_type_does_not_exist", field_type: field_spec.type, fieldset: this, field_spec: x.Base.view.call(field_spec) });
    }
    field = x.fields[field_spec.type].clone(field_spec);
    this.add(field);
    return field;
};

x.FieldSet.cloneField = function (field, spec) {
    var new_field;
    x.log.functionStart("cloneField", this, arguments);
    new_field = field.clone(spec);
    this.add(new_field);
    return new_field;
};

x.FieldSet.getField = function (id) {
    x.log.functionStart("getField", this, arguments);
    return this.get(id);
};

x.FieldSet.getFieldCount = function () {
    x.log.functionStart("getFieldCount", this, arguments);
    return this.length();
};


x.FieldSet.remove = function (id) {
    var field;
    x.log.functionStart("remove", this, arguments);
    field = this.get(id);
    x.OrderedMap.remove.call(this, id);
};


x.FieldSet.beforeFieldChange = function (field, new_val) {
    x.log.functionStart("beforeFieldChange", this, arguments);
    if (!this.modifiable) {
        throw x.Exception.clone({ id: "fieldset_not_modifiable", fieldset: this, field: field, new_val: new_val });
    }
};


x.FieldSet.afterFieldChange = function (field, old_val) {
    x.log.functionStart("afterFieldChange", this, arguments);
    this.updateComputed();
    if (field.isModified()) {
        this.touch();
    }
};

x.FieldSet.touch = function () {
    x.log.functionStart("touch", this, arguments);
    this.modified = true;
    if (this.trans) {
        this.trans.setModified();
    }
};


x.FieldSet.setDefaultVals = function () {
    x.log.functionStart("setDefaultVals", this, arguments);
    this.each(function(field) {
        if (field.default_val) {
            field.setInitial(field.default_val);
            field.modified = true;
        }
        field.validate();           // this was commented-out, presumably because it broke something, but it is necessary
    });
    this.updateComputed();
};


x.FieldSet.addValuesToObject = function (spec, options) {
    x.log.functionStart("addValuesToObject", this, arguments);
    this.each(function(field) {
        //CL - id comes out as "undefined" + field.id without this fix
        spec[(options && options.prefix ? options.prefix : "") + field.id] = (options && options.text_values ? field.getText() : field.get());
    });
};
x.FieldSet.addValuesToObject.doc = {
    purpose: "Add a property to the given spec object for each field in this FieldSet, with its string value",
    args   : "spec: object to which the properties are added; options.text_values: set property value to field.getText() instead of field.get()",
    returns: "nothing"
};



x.FieldSet.detokenize = function (str) {
    var regex = /\{\w+(:\w+)?\}/g,
        that = this;
    x.log.functionStart("detokenize", this, arguments);
    if (typeof str !== "string") {
        throw x.Exception.clone({ id: "invalid_argument", text: "'str' must be a string", str: str });
    }
    str = str.replace(regex, function (token) {
        return that.getTokenValue(token);
    });
    return str;
};
x.FieldSet.detokenize.doc = {
    purpose: "Return string argument with tokens (delimited by braces) replaced by field text values",
    args   : "str: string argument, possibly including tokens surrounded by braces",
    returns: "String argument, with tokens replaced by field text values"
};

x.FieldSet.getTokenValue = function (token) {
    var regex = /\{(\w+)(:(\w+))?\}/,
        token_parts,
        out,
        field;
    x.log.functionStart("getTokenValue", this, arguments);

    token_parts = regex.exec(token);
    if (token_parts && token_parts.length > 1) {
        field = this.getField(token_parts[1]);
        if (field) {
            out = field.getTokenValue(token_parts);
        } else if (token_parts[1] === "key" && typeof this.getKey === "function") {
            out = this.getKey();
        } else {
            out = "[unknown field: " + token_parts[1] + "]";
        }
    } else {
        out = "[invalid token: " + token_parts + "]";
    }
    return out;
};

x.FieldSet.setDelete = function (bool) {
    x.log.functionStart("setDelete", this, arguments);
    if (!this.isModifiable()) {
        throw x.Exception.clone({ id: "fieldset_not_modifiable", fieldset: this });
    }
    if (this.deleting !== bool) {
        x.log.trace("Changing deleting, set modified");
        this.modified = true;
        if (this.trans) {
            this.trans.setModified();
        }
    }
    this.deleting = bool;
};


x.FieldSet.isModified = function () {
    x.log.functionStart("isModified", this, arguments);
    return this.modified;
};


x.FieldSet.isModifiable = function () {
    x.log.functionStart("isModifiable", this, arguments);
    return this.modifiable;
};


x.FieldSet.isValid = function () {
    x.log.functionStart("isValid", this, arguments);
    var valid = true;
    if (this.deleting) {
        return true;
    }
    this.each(function(field) {
        valid = valid && field.isValid();        
    });
    return valid;
};


x.FieldSet.update = function (params) {
    x.log.functionStart("update", this, arguments);
    if (this.modifiable) {
        this.each(function(field) {
            field.update(params);
        });
    }
};


x.FieldSet.render = function (xmlstream, render_opts) {
    x.log.functionStart("render", this, arguments);
    this.each(function(obj) {
        obj.render(xmlstream, render_opts);
    });
};


x.FieldSet.updateComputed = function () {
    this.each(function(field) {
        if (typeof field.getComputed === "function") {
            field.setInitial(field.getComputed());
        }
    });
};

//To show up in Chrome debugger...
//@ sourceURL=da/FieldSet.js