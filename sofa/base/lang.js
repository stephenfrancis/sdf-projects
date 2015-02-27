/*global  */
"use strict";



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

/*
Object.viewProp = function (prop_val, depth, incl_inherits) {
    return Object.isAnyObject(prop_val) ? prop_val.view(depth - 1, incl_inherits) : typeof prop_val;
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
*/

//To show up in Chrome debugger...
//@ sourceURL=base/lang.js