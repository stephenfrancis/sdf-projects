/*jslint node: true */
/*globals define */
"use strict";


define(["./Date", "../base/Log"], function (Date, Log) {

    return Date.clone({

        id              : "DateTime",
        type            : true,
        internal_format : "yyyy-MM-dd HH:mm:ss",
        update_format   : "dd/MM/yy HH:mm",
        display_format  : "dd/MM/yy HH:mm:ss",
        data_length     : 20,
        input_mask      : null, //input_mask1 and input_mask2 replace the one from x.data.Date
        input_mask1     : "99/99/99",
        input_mask2     : "99:99",
        regex_label1    : "Not a valid date",                                // client side
        regex_label2    : "Invalid time, please use the 24 hour clock.",     // client side
        regex_pattern1  : "[0-3]?[0-9]/[0-1]?[0-9]/[0-9]{2}",                // client side
        regex_pattern2  : "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",                // client side
        error_message   : "not a valid date/time",
        purpose         : "To represent a date/time field",


        isBefore : function (date) {
            var nThisSecond,
                nOtherSecond;

             nThisSecond = Math.floor(x.lib.toDate(this.get()      ).getTime() / 1000);
            nOtherSecond = Math.floor(x.lib.toDate(this.parse(date)).getTime() / 1000);
            return (nThisSecond < nOtherSecond);
        },

        isAfter : function (date) {
            var nThisSecond,
                nOtherSecond;

             nThisSecond = Math.floor(x.lib.toDate(this.get()      ).getTime() / 1000);
            nOtherSecond = Math.floor(x.lib.toDate(this.parse(date)).getTime() / 1000);
            return (nThisSecond > nOtherSecond);
        },

        set : function (new_val) {        // Convert a valid date in update_format to one valid in internal_format
            Log.debug(this, "set() new_val: " + new_val);
            if (new_val === "|") {
                new_val = "";            // this is blank value
            } else {
                new_val = new_val.replace("|", " ");
            }
            return Date.set.call(this, new_val);
        },

        renderEditable : function (parent_elmt, render_opts, inside_table) {
            var val_split = [],
                input1_elmt,
                input2_elmt;

            if (!this.isBlank()) {
                val_split = this.parse(this.get(), this.internal_format, this.update_format).split(" ");
            }
            input1_elmt = parent_elmt.makeInput("text", "input-small", this.getControl() + "_dt", (val_split.length > 0 ? val_split[0] : ""));
            input1_elmt.attr("placeholder", "DD/MM/YY" );
            input2_elmt = parent_elmt.makeInput("text", "input-small", this.getControl() + "_tm", (val_split.length > 1 ? val_split[1] : ""));
            input2_elmt.attr("placeholder", "HH:MM" );    
            return input1_elmt;
        }

    });     // end of clone()

});     // end of define()

//To show up in Chrome debugger...
//@ sourceURL=data/DateTime.js