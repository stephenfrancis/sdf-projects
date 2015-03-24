/*jslint node: true */
/*globals define */
"use strict";


define(["../base/OrderedMap", "../base/Log", "./Text"], function (OrderedMap, Log, Text) {

    return OrderedMap.clone({

        id              : "FieldSet",
        modifiable      : false,                // Whether or not these fields can be modified (overrides their own 'editable' property
        modified        : false,                // Whether or not any of the fields have been modified, use isModified()
        deleting        : false,                // Whether or not this FieldSet is currently set to be deleted (only applies to records)
        purpose         : "An OrderedMap of fields, whose ids are unique within this object",


        addFields : function (spec_array) {
            var i;
            for (i = 0; i < spec_array.length; i += 1) {
                this.addField(spec_array[i]);
            }
        },


        addField : function (spec) {
            var base_field;
            if (!spec.type || typeof spec.type !== "string") {
                throw new Error("type must be a non-blank string");
            }
            base_field = Text.types[spec.type];
            if (!base_field) {
                throw new Error("type is not recognized: " + spec.type);
            }
            return this.cloneField(base_field, spec);
        },

        cloneField : function (field, spec) {
            var new_field;
            if (!spec.id || typeof spec.id !== "string") {
                throw new Error("id must be a non-blank string");
            }
            new_field = field.clone(spec);
            this.add(new_field);
            if (this.page) {
                this.page.addField(new_field);
            }
            if (this.instance) {
                new_field.instantiate();
            }
            return new_field;
        },


        getField : function (id) {
            return this.get(id);
        },

        getFieldCount : function () {
            return this.length();
        },


        remove : function (id) {
            var field;
            field = this.get(id);
            OrderedMap.remove.call(this, id);
            if (this.page) {
                this.page.removeField(field);
            }
        },


        beforeFieldChange : function (field, new_val) {
            if (!this.modifiable) {
                throw new Error("fieldset not modifiable");
            }
        },


        afterFieldChange : function (field, old_val) {
            if (field.isModified()) {
                this.touch();
            }
        },


        touch : function () {
            this.modified = true;
            if (this.trans) {
                this.trans.setModified();
            }
        },


        setDefaultVals : function () {
            this.each(function(field) {
                if (field.default_val) {
                    field.setInitial(field.default_val);
                }
            });
        },


        addValuesToObject : function (spec, options) {
            options = options || {};
            this.each(function(field) {
                spec[(options.prefix || "") + field.id] = (options.text_values ? field.getText() : field.get());
            });
        },


        detokenize : function (str) {
            var regex = /\{\w+(:\w+)?\}/g,
                that = this;

            if (typeof str !== "string") {
                throw new Error("argument must be a string: " + str);
            }
            str = str.replace(regex, function (token) {
                return that.getTokenValue(token);
            });
            return str;
        },


        getTokenValue : function (token) {
            var regex = /\{(\w+)(:(\w+))?\}/,
                token_parts,
                out,
                field;

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
        },


        setDelete : function (bool) {
            if (!this.isModifiable()) {
                throw new Error("fieldset not modifiable: " + this);
            }
            if (this.deleting !== bool) {
                this.modified = true;
                if (this.trans) {
                    this.trans.setModified();
                }
            }
            this.deleting = bool;
        },


        isModified : function () {
            return this.modified;
        },


        setModifiable : function (bool) {
            if (!bool && this.isModified()) {
                throw new Error("fieldset already modified: " + this);
            }
            this.modifiable = bool;
        },


        isModifiable : function () {
            return this.modifiable;
        },


        isValid : function () {
            var valid = true;
            this.each(function (field) {
                valid = valid && field.isValid();        
            });
            return valid;
        },


        update : function (params) {
            if (this.modifiable) {
                this.each(function(field) {
                    field.update(params);
                });
            }
        },


        render : function (xmlstream, render_opts) {
            this.each(function(obj) {
                obj.render(xmlstream, render_opts);
            });
        },


        addToPage : function (page, field_group) {
            this.page = page;
            this.each(function(field) {
                if (!field_group || field_group === field.field_group) {
                    page.addField(field);
                }
            });
        },


        removeFromPage : function (field_group) {
            var page = this.page;
            this.each(function(field) {
                if (!field_group || field_group === field.field_group) {
                    page.removeField(field);
                }
            });
        }

    });     // clone()

});     // define()

//To show up in Chrome debugger...
//@ sourceURL=data/FieldSet.js