/*global  */
"use strict";

x.base.Base = {};

x.base.Base.clone = function (spec) {
	var out = {};
    out = Object.create(this);
    out.parent = this;
    if (spec) {
        out.addFrom(spec);
    }
	return out;
};

x.base.Base.addFrom = function (spec) {
    var that = this;
    this.forOwn.call(spec, function (key, val) {
        that[key] = val;
    });
};

x.base.Base.forAll = function (funct) {
    var prop;
    for (prop in this) {
        if (typeof this[prop] !== "function") {
            funct(prop, this[prop]);
        }
    }
};

x.base.Base.forOwn = function (funct) {
	var prop;
	for (prop in this) {
		if (this.hasOwnProperty(prop) && typeof this[prop] !== "function") {
			funct(prop, this[prop]);
		}
	}
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

x.base.Base.view = function (depth, incl_inherits) {
    var out   = "{",
        delim = " ";

    depth = depth || 0;
    if (depth > -1) {
        this[incl_inherits ? "forAll" : "forOwn"](function (prop_id, prop_val) {
            out += delim + prop_id + ": " + Object.viewProp(prop_val, depth, incl_inherits);
            delim = ", ";
        });
        return out + delim.substr(1) + "}";
    }
    return "{...}";
};


//To show up in Chrome debugger...
//@ sourceURL=base/Base.js