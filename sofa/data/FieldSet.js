/*global x, java */
"use strict";


x.data.addClone(x.base.OrderedMap, {
    id                      : "FieldSet",
    modifiable              : false,
    modified                : false,                       // private - modified since original value, or not?
    deleting                : false,                       // whether or not we are deleting this record
    doc                     : {
        purpose             : "An OrderedMap of fields, whose ids are unique within this object",
        properties          : {
            modifiable      : { label: "Whether or not these fields can be modified (overrides their own 'editable' property, defaults false", type: "boolean", usage: "optional in spec" },
            modified        : { label: "Whether or not any of the fields have been modified, use isModified()", type: "boolean", usage: "do not use" },
            deleting        : { label: "Whether or not this FieldSet is currently set to be deleted (only applies to records)", type: "boolean", usage: "read only" },
            trans           : { label: "Transaction object, required if fields to be read from / written to database", type: "x.Transaction", usage: "required in spec (if necessary)" }
        }
    }
});


x.data.FieldSet.addFields = function (spec_array) {
    var i;
    x.log.functionStart("addFields", this, arguments);
    for (i = 0; i < spec_array.length; i += 1) {
        this.addField(spec_array[i]);
    }
};
x.data.FieldSet.addFields.doc = {
    purpose: "",
    args   : "none",
    returns: "nothing"
};


x.data.FieldSet.addField = function (field_spec) {
    x.log.functionStart("addField", this, arguments);
    if (!field_spec.id || typeof field_spec.id !== "string") {
        throw new Error("id must be a non-blank string");
    }
    if (!field_spec.type) {
        throw new Error("field type must be specified");
    }
    if (!field_spec.type || !x.data[field_spec.type]) {
        throw new Error("field type does not exist: " + field_spec.type);
    }
    return this.cloneField(x.data[field_spec.type], field_spec);
};

x.data.FieldSet.cloneField = function (field, spec) {
    var new_field;
    x.log.functionStart("cloneField", this, arguments);
    new_field = field.clone(spec);
    this.add(new_field);
    if (this.page) {
        this.page.addField(new_field);
    }
    if (this.instance) {
        new_field.instantiate();
    }
    return new_field;
};

x.data.FieldSet.getField = function (id) {
    x.log.functionStart("getField", this, arguments);
    return this.get(id);
};

x.data.FieldSet.getFieldCount = function () {
    x.log.functionStart("getFieldCount", this, arguments);
    return this.length();
};


x.data.FieldSet.remove = function (id) {
    var field;
    x.log.functionStart("remove", this, arguments);
    field = this.get(id);
    x.base.OrderedMap.remove.call(this, id);
    if (this.page) {
        this.page.removeField(field);
    }
};


x.data.FieldSet.beforeFieldChange = function (field, new_val) {
    x.log.functionStart("beforeFieldChange", this, arguments);
    if (!this.modifiable) {
        throw new Error("fieldset not modifiable");
    }
};


x.data.FieldSet.afterFieldChange = function (field, old_val) {
    x.log.functionStart("afterFieldChange", this, arguments);
    this.updateComputed();
    if (field.isModified()) {
        this.touch();
    }
};

x.data.FieldSet.touch = function () {
    x.log.functionStart("touch", this, arguments);
    this.modified = true;
    if (this.trans) {
        this.trans.setModified();
    }
};


x.data.FieldSet.setDefaultVals = function () {
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


x.data.FieldSet.addValuesToObject = function (spec, options) {
    x.log.functionStart("addValuesToObject", this, arguments);
    options = options || {};
    this.each(function(field) {
        spec[(options.prefix || "") + field.id] = (options.text_values ? field.getText() : field.get());
    });
};
x.data.FieldSet.addValuesToObject.doc = {
    purpose: "Add a property to the given spec object for each field in this FieldSet, with its string value",
    args   : "spec: object to which the properties are added; options.text_values: set property value to field.getText() instead of field.get()",
    returns: "nothing"
};



x.data.FieldSet.detokenize = function (str) {
    var regex = /\{\w+(:\w+)?\}/g,
        that = this;
    x.log.functionStart("detokenize", this, arguments);
    if (typeof str !== "string") {
        throw new Error("argument must be a string: " + str);
    }
    str = str.replace(regex, function (token) {
        return that.getTokenValue(token);
    });
    return str;
};
x.data.FieldSet.detokenize.doc = {
    purpose: "Return string argument with tokens (delimited by braces) replaced by field text values",
    args   : "str: string argument, possibly including tokens surrounded by braces",
    returns: "String argument, with tokens replaced by field text values"
};

x.data.FieldSet.getTokenValue = function (token) {
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

x.data.FieldSet.setDelete = function (bool) {
    x.log.functionStart("setDelete", this, arguments);
    if (!this.isModifiable()) {
        throw new Error("fieldset not modifiable: " + this);
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


x.data.FieldSet.isModified = function () {
    x.log.functionStart("isModified", this, arguments);
    return this.modified;
};


x.data.FieldSet.setModifiable = function (bool) {
    x.log.functionStart("setModifiable", this, arguments);
    if (!bool && this.isModified()) {
        throw new Error("fieldset already modified: " + this);
    }
    this.modifiable = bool;
};


x.data.FieldSet.isModifiable = function () {
    x.log.functionStart("isModifiable", this, arguments);
    return this.modifiable;
};


x.data.FieldSet.isValid = function () {
    x.log.functionStart("isValid", this, arguments);
    var valid = true;
    this.each(function (field) {
        valid = valid && field.isValid();        
    });
    return valid;
};


x.data.FieldSet.update = function (params) {
    x.log.functionStart("update", this, arguments);
    if (this.modifiable) {
        this.each(function(field) {
            field.update(params);
        });
    }
};


x.data.FieldSet.render = function (xmlstream, render_opts) {
    x.log.functionStart("render", this, arguments);
    this.each(function(obj) {
        obj.render(xmlstream, render_opts);
    });
};

x.data.FieldSet.addToPage = function (page, field_group) {
    x.log.functionStart("addToPage", this, arguments);
    this.page = page;
    this.each(function(field) {
        if (!field_group || field_group === field.field_group) {
            page.addField(field);
        }
    });
};

x.data.FieldSet.removeFromPage = function (field_group) {
    var page = this.page;
    x.log.functionStart("removeFromPage", this, arguments);
    this.each(function(field) {
        if (!field_group || field_group === field.field_group) {
            page.removeField(field);
        }
    });
};

x.data.FieldSet.updateComputed = function () {
    this.each(function(field) {
        if (typeof field.getComputed === "function") {
            field.setInitial(field.getComputed());
        }
    });
};

//To show up in Chrome debugger...
//@ sourceURL=data/FieldSet.js