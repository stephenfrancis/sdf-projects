/*jslint node: true */
/*globals define */
"use strict";

define({

    id: "Base",

/**
* create a new object as a descendant of this one
* @param {spec} properties to add to the new object overriding those of this
* @return {object} new object, whose 'parent' property is set to this
*/
    clone : function (spec) {
        var out = {};
    //  if (!spec.id) {
    //      throw new Error("new object must have its own id");
    //  }
        out = Object.create(this);
        out.parent = this;
        if (spec) {
            out.addPropertiesFrom(spec);
        }
        return out;
    },

    addPropertiesFrom : function (spec) {
        var that = this;
        this.forOwn.call(spec, function (key, val) {
            that[key] = val;
        });
    },

    add : function (object) {
        if (!object.id) {
            throw new Error("object must have an id");
        }
        object.owner = this;
        this[object.id] = object;
        return object;
    },

    addClone : function (parent, spec) {
        return this.add(parent.clone(spec));
    },

    walkPath : function (str, create_missing_objects) {
        var i = str.indexOf("."),
            obj;
        if (i > -1) {
            obj = this[str.substr(0, i)];
            if (typeof obj !== "object") {
                if (create_missing_objects) {
                    obj = {};
                    this[str.substr(0, i)] = obj;
                } else {
                    throw new Error("property value for non-terminal path element is not another object: " + str);
                }
            }
            return obj.walkPath(str.substr(i + 1), create_missing_objects);
        }
        if (typeof this[str] !== "object" && create_missing_objects) {
            this[str] = {};
        }
        return this[str];
    },

    detokenize : function (str) {
        if (typeof str !== "string") {
            throw new Error("argument must be string");
        }
        this.forAll(function (prop_id, prop_val) {
            if (typeof prop_val === "string") {
                str = str.replace(new RegExp("{" + prop_id + "}", "g"), prop_val);
            }
        });
        return str;
    },


    // sanity check method - ensures key doesn't already exist anywhere in prototype chain 
    defineProperty : function (key, value) {
        if (this[key] !== undefined) {
            throw new Error("key already exists in prototype chain: " + key);
        }
        this[key] = value;
    },

    // sanity check method - ensures key doesn't already exist in this object
    overrideProperty : function (key, value) {
        if (this.hasOwnProperty(key)) {
            throw new Error("key already exists in object: " + key);
        }
        if (this[key] === undefined) {
            throw new Error("key does not exist in prototype chain: " + key);
        }
        this[key] = value;
    },

    // sanity check method - reassign key if it already exist in this object
    reassignProperty : function (key, value) {
        if (!this.hasOwnProperty(key)) {
            throw new Error("key does not exist in object: " + key);
        }
        this[key] = value;
    },

    path : function () {
        var out = "",
            level = this;

        while (level) {
            out = "." + (level.id || "") + out;
            level = level.owner;
        }
        return out.substr(1);           // cut off initial "."
    },

    descent : function () {
        var out = "",
            level = this;
        while (level.parent) {
            out = "/" + (level.id || "") + out;
            level = level.parent;
        }
        return out || "/";
    },

    toString : function () {
        return this.path();
    },

    isDescendantOf : function (obj) {
        return !!this.parent && (this.parent === obj || this.parent.isDescendantOf(obj));    
    }

});



//To show up in Chrome debugger...
//@ sourceURL=base/Base.js