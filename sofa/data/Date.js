/*jslint node: true */
/*globals define */
"use strict";


define(["./Text", "../base/Log"], function (Text, Log) {

    return Text.clone({

        id              : "Date",
        type            : true,
        search_oper_list: "sy.search_oper_list_scalar",
        auto_search_oper: "EQ",
        search_filter   : "ScalarFilter",
        internal_format : "yyyy-MM-dd",                 // Date format string used to store the date value internally
        update_format   : "dd/MM/yy",                   // Date format string to use when updating the field
        display_format  : "dd/MM/yy",                   // Date format string to use when displaying the field read-only
        input_mask      : "99/99/99",    
        regex_label     : "Not a valid date",
    //    update_length         : 8,
    //    tb_span               : 2,
        tb_input_list   : "input-small",
        week_start_day  : 0,            // 0 = Sun, 1 = Mon, etc
        error_message   : "not a valid date",
        purpose         : "To represent a date field",


        getUpdateText : function () {
            return this.getText();
        },

// Syntactic sugar - equivalent to this.parse(val, this.internal_format, this.display_format)
// A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start', 'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string input format, 3rd arg is optional string out format",
// Converted date string (if conversion could be performed) in usual display format, otherwise returns the input string"
        parseDisplay : function (val) {
            return this.parse(val, this.internal_format, this.display_format);
        },

        getDate : function () {
            if (!this.isBlank() && this.isValid()) {
                return Date.parse(this.get());
            }
        },


        isBefore : function (date) {
            var nThisDay,
                nOtherDay;

            if (!this.get() || !date) {
                return false;
            }
             nThisDay = Math.floor(x.lib.toDate(this.get()      ).getTime() / ( 1000 * 60 * 60 * 24));
            nOtherDay = Math.floor(x.lib.toDate(this.parse(date)).getTime() / ( 1000 * 60 * 60 * 24));
            return (nThisDay < nOtherDay);
        },


        isAfter : function (date) {
            var nThisDay,
                nOtherDay;

            if (!this.get() || !date) {
                return false;
            }
             nThisDay = Math.floor(x.lib.toDate(this.get()      ).getTime() / ( 1000 * 60 * 60 * 24));
            nOtherDay = Math.floor(x.lib.toDate(this.parse(date)).getTime() / ( 1000 * 60 * 60 * 24));
            return (nThisDay > nOtherDay);
        },


        setInitial : function (new_val) {
            Text.setInitial.call(this, new_val);
            this.val = this.parse(this.val);
        },


        set : function (new_val) {        // Convert a valid date in update_format to one valid in internal_format
            x.log.functionStart("set", this, arguments);
            if (typeof new_val === "object" && typeof new_val.getFullYear === "function") {
                new_val = new_val.internal();
            } else if (typeof new_val === "string") {
                new_val = Date.parse(new_val);
                if (!Date.isValid(new_val, this.internal_format) && Date.isValid(new_val, this.update_format)) {
                    new_val = Date.parseString(new_val, this.update_format).format(this.internal_format);
                }
            } else if (!new_val) {
                new_val = "";
            }
            Text.set.call(this, new_val);
        },

        validate : function () {
            var date;
            Text.validate.call(this);
            if (this.val) {                // Only do special validation if non-blank
                date = Date.parse(this.val);
                if (date && date.format(this.internal_format) === this.val) {
                    this.text = date.format(this.display_format);
                    if (this.min && this.val < this.parse(this.min)) {
                        this.setError("earlier than minimum value: " + this.parseDisplay(this.min));
                    }
                    if (this.max && this.val > this.parse(this.max)) {
                        this.setError(  "later than maximum value: " + this.parseDisplay(this.max));
                    }
                } else {            // TODO - what is this all about?
                    this.setError(this.error_message);
                }
            }
        },

        generateTestValue : function (session, min, max) {
            var i;
            min = Date.parse(min || this.min || "2000-01-01");
            max = Date.parse(max || this.max || "2019-12-31");
            i = Math.floor(Math.random() * min.daysBetween(max));
        //    return x.lib.formatDate(x.lib.addDays(min, i));
            return min.add('d', i).format(this.internal_format);
        },

    });     // Text.clone()

});     // define

//To show up in Chrome debugger...
//@ sourceURL=data/Date.js