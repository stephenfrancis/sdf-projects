/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Number
x.fields.Number = x.fields.Text.clone({
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
    min                     : 0            // prevent negatives by default
//    update_length         : 10
});
x.fields.Number.doc = {
    location                : "x.fields",
    file                    : "$Header: /rsl/rsl_app/core/fields/Number.js,v 1.34 2014/06/27 13:50:47 francis Exp $",
    purpose                 : "To represent a decimal number field",
    properties              : {
        decimal_digits      : { label: "Number of decimal places to store", type: "number", usage: "optional in spec" },
        min                 : { label: "Minimum value in validations", type: "number", usage: "optional in spec" },
        max                 : { label: "Maximum value in validations", type: "number", usage: "optional in spec" }
    }
};

x.fields.Number.obfuscateNumber = function () {
    return "FLOOR(RAND() * " + ((this.max || 100000) * Math.pow(10, this.decimal_digits)) + ")";
};

x.fields.Number.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (typeof new_val === "number") {
        new_val = String(new_val);
    }
    return x.fields.Text.set.call(this, new_val);
};

x.fields.Number.setRounded = function (new_val) {
    x.log.functionStart("setRounded", this, arguments);
    return this.set(this.round(new_val));
};

x.fields.Number.validate = function () {
    var number_val,
        decimals = 0;
    x.log.functionStart("validate", this, arguments);
    x.fields.Text.validate.call(this);
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


x.fields.Number.format = function (number_val) {
    x.log.functionStart("format", this, arguments);
    if (this.display_format) {
        return String((new java.text.DecimalFormat(this.display_format)).format(number_val));
    }
    return number_val.toFixed(this.decimal_digits);
};


x.fields.Number.round = function (number) {
    x.log.functionStart("round", this, arguments);
    if (typeof number !== "number") {
        number = this.getNumber(0);
    }
    return parseFloat(number.toFixed(this.decimal_digits), 10);
};


x.fields.Number.getConditionValue = function () {
    var val_text = this.val;
    x.log.functionStart("getConditionValue", this, arguments);
    if (this.val && !isNaN(this.val)) {
        val_text = (this.getNumber() * Math.pow(10, this.decimal_digits)).toFixed(0);
    }
    return val_text;
};

x.fields.Number.getSQL = function () {
    x.log.functionStart("getSQL", this, arguments);
    return x.sql.escape(this.getConditionValue(), this.getDataLength());
};

x.fields.Number.setFromResultSet = function (resultset) {
    var value;
    x.log.functionStart("setFromResultSet", this, arguments);
    if (!this.query_column) {
        return;
    }
    try {
        value = String(resultset.getString(this.query_column || this.getId()));        
    } catch (e) {
        throw x.Exception.clone({ id: "sql_get_failed", exception: e, column: (this.query_column || this.getId()), field: this });
    }
    if (value === "null") {
        value = "";
    } else if (!isNaN(value)) {
        value = String(parseInt(value, 10) / Math.pow(10, this.decimal_digits));
    }
    x.log.trace(this, "setFromResultSet[" + this.query_column + "] setting to " + value);
    this.setInitial(value);
};

x.fields.Number.generateTestValue = function (session, max, min) {
    var temp;
    x.log.functionStart("generateTestValue", this, arguments);
    if (typeof min !== "number") {
        min = this.min || 0;
    }
    if (typeof max !== "number") {
        max = this.max || 999999;
    }
    if (max < min) {
        throw x.Exception.clone({ id: "max_less_than_min", min: min, max: max });
    }
    temp = Math.random() * (max - min) * Math.pow(10, this.decimal_digits);
    temp = Math.floor(temp) / Math.pow(10, this.decimal_digits) + min;
    return parseFloat(temp.toFixed(this.decimal_digits), 10);
};

//To show up in Chrome debugger...
//@ sourceURL=da/Number.js