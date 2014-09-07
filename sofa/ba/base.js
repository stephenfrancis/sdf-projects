/*global  */
"use strict";


Object.prototype.clone = function (spec) {
	var out = {};
    out = Object.create(this);
    out.parent = this;
    if (spec) {
        out.addFrom(spec);
    }
	return out;
};

Object.prototype.addFrom = function (spec) {
    var that = this;
    spec.forOwn(function (key, val) {
        that[key] = val;
    });
};

Object.prototype.forAll = function (funct) {
    var prop;
    for (prop in this) {
        if (typeof this[prop] !== "function") {
            funct(prop, this[prop]);
        }
    }
};

Object.prototype.forOwn = function (funct) {
	var prop;
	for (prop in this) {
		if (this.hasOwnProperty(prop) && typeof this[prop] !== "function") {
			funct(prop, this[prop]);
		}
	}
};

// used by something else? conflict
//Object.prototype.detokenize = function (str) {
//    if (typeof str !== "string") {
//        throw new Error("argument must be string");
//    }
//    this.forAll(function (prop_id, prop_val) {
//        if (typeof prop_val === "string") {
//            str = str.replace(new RegExp("{" + prop_id + "}", "g"), prop_val);
//        }
//    });
//    return str;
//};



String.prototype.repeat = function (num) {
    return new Array(num + 1).join(this);
};

String.prototype.trim = function () {
    return this.replace(/(^\s*)|(\s*$)/g, "");
};

String.prototype.leftJustify = function (total_width) {
    total_width = total_width || 10;
    return this.toString() + (" ").repeat(Math.max(total_width - this.length, 0));
};

String.prototype.rightJustify = function (total_width) {
    total_width = total_width || 10;
    return (" ").repeat(Math.max(total_width - this.length, 0)) + this.toString();
};



Number.prototype.round = function (decimal_digits) {
    decimal_digits = decimal_digits || 0;
    return parseFloat(this.toFixed(decimal_digits), 10);
};

Number.prototype.leftJustify = function (total_width, decimal_digits) {
    var str;
    if (typeof decimal_digits === "number") {
        str = this.toFixed(decimal_digits);
    } else {
        str = String(this);
    }
    return str.leftJustify(total_width);
};

Number.prototype.rightJustify = function (total_width, decimal_digits) {
    var str;
    if (typeof decimal_digits === "number") {
        str = this.toFixed(decimal_digits);
    } else {
        str = String(this);
    }
    return str.rightJustify(total_width);
};

Number.isStrictNumber = function (str) {
    return str.match(/^-?[0-9]*$|^-?[0-9]*\.[0-9]*$/);
};



Array.prototype.copy = function () {
    var new_arr = [],
        i;
    for (i = 0; i < this.length; i += 1) {
        new_arr[i] = this[i];
    }
    return new_arr;
};



// sanity check method - ensures key doesn't already exist anywhere in prototype chain 
Object.prototype.add = function (key, value) {
    if (typeof this[key] !== "undefined") {
        throw new Error("key already exists in prototype chain: " + key);
    }
    this[key] = value;
};

// sanity check method - ensures key doesn't already exist in this object
Object.prototype.override = function (key, value) {
    if (this.hasOwnProperty(key)) {
        throw new Error("key already exists in object: " + key);
    }
    this[key] = value;
};

Object.prototype.toString = function () {
    var out = "",
        level = this;
    while (level.parent) {
        out = "/" + (level.id || "") + out;
        level = level.parent;
    }
    return out;
};

Object.prototype.view = function (depth, incl_inherits) {
    var out   = "{ ",
        delim = "";

    depth = depth || 0;
    if (depth > -1) {
        this[incl_inherits ? "forAll" : "forOwn"](function (prop_id, prop_val) {
            out += delim + prop_id + ": " + Object.viewProp(prop_val, depth, incl_inherits);
            delim = ", ";
        });
        return out + " }";
    }
    return "{...}";
};

Object.viewProp = function (prop_val, depth, incl_inherits) {
    return (typeof prop_val === "undefined" ? "undefined" : (typeof prop_val === "null" ? "null" : prop_val.view(depth - 1, incl_inherits)));
};

Array.prototype.view = function (depth, incl_inherits) {
    var out = "[ ",
        count = 0;

    depth = depth || 0;
    if (depth > -1) {
        for (count = 0; count < this.length; count += 1) {
            out += (count === 0 ? "" : ", ") + Object.viewProp(this[count], depth, incl_inherits);
        }
        return out + " ]";
    }
    return "[...]";
};

Boolean.prototype.view = function (depth) {
    return this.toString();
};

Number.prototype.view = function (depth) {
    return this.toString();
};

String.prototype.view = function (depth) {
    return "\"" + this.toString() + "\"";
};

//To show up in Chrome debugger...
//@ sourceURL=ba/base.js