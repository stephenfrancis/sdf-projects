/*jslint node: true */
/*globals define */
"use strict";


define(["./Text", "../base/Log"], function (Text, Log) {

    return Text.clone({

        id              : "Boolean",
        type            : true,
        search_oper_list: "sy.search_oper_list_boolean",
        auto_search_oper: "",
        val             : "N",
        purpose         : "To represent a yes/no field",

        set : function (new_val) {
            if (typeof new_val !== "string") {
                throw new Error("argument is not a string");
            }
            if (new_val.length > 1) {
                new_val = new_val.substr(0, 1);
            }
            if (new_val === "") {
                new_val = "N";
            }
            return Text.set.call(this, new_val);
        },

        /**
        * @return {boolean} True if this field's value is 'Y', false if it is 'N'
        */
        is : function () {
            return (this.get() === "Y");
        },


        validate : function () {
            var val;
            val = this.get();
            Text.validate.call(this);
            if (val === "Y") {
                this.text = "yes";
            } else if (val === "N") {
                this.text = "no";
            } else {
                this.setError("must be yes or no");
            }
        },

        renderEditable : function (parent_elmt, render_opts, inside_table) {
            var input_elmt;
            input_elmt = parent_elmt.makeCheckbox(this.getControl(), (this.get() === "Y"));
            return input_elmt;
        },

        generateTestValue : function (session) {
            return (Math.floor(Math.random() * 2) > 1 ? "Y" : "N");
        }

    });     // Text.clone()

});     // define


//To show up in Chrome debugger...
//@ sourceURL=data/Boolean.js