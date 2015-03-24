/*jslint node: true */
/*globals define */
"use strict";


define(["./Text", "../base/Log"], function (Text, Log) {

    return Text.clone({

        id              : "Number",
        type            : true,
        css_align       : "right",
        search_oper_list: "sy.search_oper_list_scalar",
        auto_search_oper: "EQ",
        search_filter   : "ScalarFilter",
        decimal_digits  : 0,                // Number of decimal places to store
    //    tb_span               : 2,
        tb_input_list   : "input-mini",
        min             : 0,                // Minimum value in validations - prevent negatives by default
        max             : null,             // Maximum value in validations
    //    update_length         : 10
        purpose         : "To represent a decimal number field",


        set : function (new_val) {
            if (typeof new_val === "number") {
                new_val = String(new_val);
            }
            return Text.set.call(this, new_val);
        },

        setRounded : function (new_val) {
            return this.set(this.round(new_val));
        },

        validate : function () {
            var number_val,
                decimals = 0;

            Text.validate.call(this);
            if (this.val) {
                if (!this.val.match(/^-?[0-9]*$|^-?[0-9]*\.[0-9]*$/)) {
                    this.setError(this.val + " is not a number");
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
                        this.setError(this.val + " is more decimal places than the " + this.decimal_digits + " allowed for this field");
                    } else {
                        this.val = this.val + "0".repeat(this.decimal_digits - decimals);
                    }
                }
                Log.trace(this, "Validating " + this.toString() + ", val: " + this.val + ", decimal_digits: " + this.decimal_digits +
                    ", number_val: " + number_val);
                if (this.isValid()) {
                    this.text = this.format(number_val);
                    if (typeof this.min === "number" && !isNaN(this.min) && number_val < this.min) {
                        this.setError(this.val + " is lower than minimum value: " + this.min);
                    }
                    if (typeof this.max === "number" && !isNaN(this.max) && number_val > this.max) {
                        this.setError(this.val + " is higher than maximum value: " + this.max);
                    }
                }
            }
        },


        format : function (number_val) {
            if (this.display_format) {
                return String((new java.text.DecimalFormat(this.display_format)).format(number_val));
            }
            return number_val.toFixed(this.decimal_digits);
        },


        renderEditable : function (parent_elmt, render_opts, inside_table) {
            var input_elmt;
            input_elmt = parent_elmt.makeInput(this.input_type, this.getEditableSizeCSSClass(render_opts),
                this.getControl(), this.getUpdateText());
            if (this.placeholder || this.helper_text) {
                input_elmt.attr("placeholder", this.placeholder || this.helper_text);
            }
            if (typeof this.max === "number") {
                input_elmt.attr("max", this.max);
            }
            if (typeof this.min === "number") {
                input_elmt.attr("min", this.min);
            }
            if (typeof this.decimal_digits === "number") {
                input_elmt.attr("step". String(1 / Math.pow(10, parseInt(this.decimal_digits, 10))));
            }
            return input_elmt;
        },


        generateTestValue : function (session, max, min) {
            var temp;
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
        },

        obfuscateNumber : function () {
            return "FLOOR(RAND() * " + ((this.max || 100000) * Math.pow(10, this.decimal_digits)) + ")";
        }

    });     // end of clone()

});     // end of define()

//To show up in Chrome debugger...
//@ sourceURL=data/Number.js