/*global  */
"use strict";

x.base.Base = { id: "Base", owner: x.base };

x.base.Base.clone = function (spec) {
	var out = {};
//	if (!spec.id) {
//	    throw new Error("new object must have its own id");
//	}
    out = Object.create(this);
    out.parent = this;
    if (spec) {
        out.addPropertiesFrom(spec);
    }
	return out;
};

x.base.Base.addPropertiesFrom = function (spec) {
    var that = this;
    this.forOwn.call(spec, function (key, val) {
        that[key] = val;
    });
};

x.base.Base.add = function (object) {
    if (!object.id) {
        throw new Error("object must have an id");
    }
    object.owner = this;
    this[object.id] = object;
    return object;
};

x.base.Base.addClone = function (parent, spec) {
    return this.add(parent.clone(spec));
};

x.base.Base.walkPath = function (str, create_missing_objects) {
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
};

x.base.Base.detokenize = function (str) {
    if (typeof str !== "string") {
        throw new Error("argument must be string");
    }
    this.forAll(function (prop_id, prop_val) {
        if (typeof prop_val === "string") {
            str = str.replace(new RegExp("{" + prop_id + "}", "g"), prop_val);
        }
    });
    return str;
};


// sanity check method - ensures key doesn't already exist anywhere in prototype chain 
x.base.Base.defineProperty = function (key, value) {
    if (typeof this[key] !== "undefined") {
        throw new Error("key already exists in prototype chain: " + key);
    }
    this[key] = value;
};

// sanity check method - ensures key doesn't already exist in this object
x.base.Base.overrideProperty = function (key, value) {
    if (this.hasOwnProperty(key)) {
        throw new Error("key already exists in object: " + key);
    }
    if (typeof this[key] === "undefined") {
        throw new Error("key does not exist in prototype chain: " + key);
    }
    this[key] = value;
};

// sanity check method - reassign key if it already exist in this object
x.base.Base.reassignProperty = function (key, value) {
    if (!this.hasOwnProperty(key)) {
        throw new Error("key does not exist in object: " + key);
    }
    this[key] = value;
};

x.base.Base.path = function () {
    var out = "",
        level = this;
    do {
        out = "." + (level.id || "") + out;
    } while (level = level.owner);
    return out.substr(1);           // cut off initial "."
};

x.base.Base.descent = function () {
    var out = "",
        level = this;
    while (level.parent) {
        out = "/" + (level.id || "") + out;
        level = level.parent;
    }
    return out || "/";
};

x.base.Base.toString = function () {
    return this.path();
};

x.base.Base.isDescendantOf = function (obj) {
    return !!this.parent && (this.parent === obj || this.parent.isDescendantOf(obj));    
};


//To show up in Chrome debugger...
//@ sourceURL=base/Base.js