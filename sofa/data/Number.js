/*global x, java */
"use strict";


x.data.addClone(x.data.Text, {
    id                      : "Number",
    css_type                : "number",
    css_align               : "right",
    search_oper_list        : "sy.search_oper_list_scalar",
    auto_search_oper        : "EQ",
    search_filter           : "ScalarFilter",
    decimal_digits          : 0,
    data_length             : 20,        // Has to be to pass Text.validate(), which must be called to set validated to true
//    tb_span               : 2,
    tb_input_list           : "input-mini",
    db_type                 : 'I',
    min                     : 0,            // prevent negatives by default
//    update_length         : 10
    purpose                 : "To represent a decimal number field",
    properties              : {
        decimal_digits      : { label: "Number of decimal places to store", type: "number", usage: "optional in spec" },
        min                 : { label: "Minimum value in validations", type: "number", usage: "optional in spec" },
        max                 : { label: "Maximum value in validations", type: "number", usage: "optional in spec" }
    }
});

x.data.Number.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (typeof new_val === "number") {
        new_val = String(new_val);
    }
    return x.data.Text.set.call(this, new_val);
};

x.data.Number.setRounded = function (new_val) {
    x.log.functionStart("setRounded", this, arguments);
    return this.set(this.round(new_val));
};

x.data.Number.validate = function () {
    var number_val,
        decimals = 0;
    x.log.functionStart("validate", this, arguments);
    x.data.Text.validate.call(this);
    if (this.val) {
        if (!this.val.match(/^-?[0-9]*$|^-?[0-9]*\.[0-9]*$/)) {
            this.messages.add({ type: 'E', text: this.val + " is not a number" });
        } else {
            this.val = this.val.replace(/^0+/, "");                 // remove leading zeros
            if (this.val.indexOf(".") > -1) {
                this.val = this.val.replace(/\.?0+$/, "");          // remove trailing zeros AFTER decimal point
            }
            if (this.val.indexOf(".") === -1 && this.decimal_digits > 0) {
                this.val += ".";
            }
            if (this.val === "" || this.val.indexOf(".") === 0) {
                this.val  = "0" + this.val;
            }
            number_val = parseFloat(this.val, 10);
            decimals = (this.val.indexOf(".") === -1) ? 0 : this.val.length - this.val.indexOf(".") - 1; 
            if (decimals > this.decimal_digits) {
                this.messages.add({ type: 'E', text: this.val + " is more decimal places than the " + this.decimal_digits + " allowed for this field" });
            } else {
                this.val = this.val + "0".repeat(this.decimal_digits - decimals);
            }
        }
        x.log.trace(this, "Validating " + this.toString() + ", val: " + this.val + ", decimal_digits: " + this.decimal_digits +
            ", number_val: " + number_val);
        if (this.isValid()) {
            this.text = this.format(number_val);
            if (typeof this.min === "number" && !isNaN(this.min) && number_val < this.min) {
                this.messages.add({ type: 'E', text: this.val + " is lower than minimum value: " + this.min });
            }
            if (typeof this.max === "number" && !isNaN(this.max) && number_val > this.max) {
                this.messages.add({ type: 'E', text: this.val + " is higher than maximum value: " + this.max });
            }
        }
    }
};


x.data.Number.format = function (number_val) {
    x.log.functionStart("format", this, arguments);
    if (this.display_format) {
        return String((new java.text.DecimalFormat(this.display_format)).format(number_val));
    }
    return number_val.toFixed(this.decimal_digits);
};


x.data.Text.renderEditable = function (div, render_opts, inside_table) {
    var str;
    x.log.functionStart("renderEditable", this, arguments);
    str = "<input type='" + this.input_type + "' class='" + this.getEditableSizeCSSClass(render_opts) +
        "' value='" + this.getUpdateText() + "' id='" + this.getControl();
    if (this.placeholder || this.helper_text) {
        str += "' placeholder='" + (this.placeholder || this.helper_text);
    }
    if (typeof this.max === "number") {
        str += "' max='" + this.max;
    }
    if (typeof this.min === "number") {
        str += "' min='" + this.min;
    }
    if (typeof this.decimal_digits === "number") {
        str += "' step='" + String(1 / Math.pow(10, parseInt(this.decimal_digits, 10)));
    }
    str += "' />";
    div.addHTML(str);
};


x.data.Number.generateTestValue = function (session, max, min) {
    var temp;
    x.log.functionStart("generateTestValue", this, arguments);
    if (typeof min !== "number") {
        min = this.min || 0;
    }
    if (typeof max !== "number") {
        max = this.max || 999999;
    }
    if (max < min) {
        throw new Error("max: " + max + " less than min: " + min);
    }
    temp = Math.random() * (max - min) * Math.pow(10, this.decimal_digits);
    temp = Math.floor(temp) / Math.pow(10, this.decimal_digits) + min;
    return parseFloat(temp.toFixed(this.decimal_digits), 10);
};

x.data.Number.obfuscateNumber = function () {
    return "FLOOR(RAND() * " + ((this.max || 100000) * Math.pow(10, this.decimal_digits)) + ")";
};

//To show up in Chrome debugger...
//@ sourceURL=data/Number.js