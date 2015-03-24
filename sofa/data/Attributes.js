/*jslint node: true */
/*globals define */
"use strict";


define(["./Text", "./LoV", "../base/Log"], function (Text, LoV, Log) {

    return Text.clone({

        id              : "Attributes",
        type            : true,
        list            : null,                 // String id of the LoV supporting this field
        lov             : null,                 // LoV object supporting this field
        search_oper_list: "sy.search_oper_list_attr",
        auto_search_oper: "AN",
        purpose         : "To represent a multi-valued field with options from an LoV",


        getLoV : function () {
            if (!this.lov) {
                if (!this.list) {
                    throw new Error("no list property defined");
                }
                this.lov = LoV.getListLoV(this.list, this.owner && this.owner.trans && this.owner.trans.session);
            }
            return this.lov;
        },


        set : function (new_val) {
            if (new_val && new_val.substr(0, 1) !== "|") {        // if being updated from a form control,
                new_val = "|" + new_val;                          // the value is in the form 'x|y|z'
            }
            if (new_val && new_val.substr(new_val.length - 1) !== "|") {        // it needs to be wrapped in |s at beginning and end
                new_val += "|";
            }
            return this.setInternal(new_val);
        },

        isItem : function (item_id) {
            return (("|" + this.val + "|").indexOf("|" + item_id + "|") > -1);
        },


        setItem : function (item_id, bool) {
            var val,
                present;

            val = this.get();
            present = (val.indexOf("|" + item_id + "|") > -1);
            if (!bool && !present) {
                return false;
            }
            if (bool && present) {
                return false;
            }
            if (bool) {    // !present
                val = val ? (val + item_id + "|") : "|" + item_id + "|";
            } else {            // !bool && present
                val = val.replace(new RegExp("\\|" + item_id + "\\|"), "|");
            }
            if (val === "|") {
                val = "";
            }
            this.setInternal(val);
            return true;
        },


        validate : function () {
            var item,
                val,
                pieces,
                i,
                delim = "";

            val = this.get();
            Text.validate.call(this);
            this.getLoV();
            if (!this.lov) {
                this.setError("no lov found");
            } else if (val) {                // Only do special validation is non-blank
                pieces = val.split(/\|/);
                this.text = "";
                for (i in pieces) {
                    if (pieces.hasOwnProperty(i) && pieces[i]) {
                        item = this.lov.getItem(pieces[i]);
                        Log.trace(this, "validate .. " + i + ", " + pieces[i] + ", " + item);
                        if (item) {
                            this.text += delim + item.label;
                            if (!item.active) {
                                this.setError("option is inactive: " + item.label);
                            }
                        } else {
                            this.text += delim + "[unknown: " + pieces[i] + "]";
                            this.setError("invalid option: " + pieces[i]);
                            Log.debug(this, "invalid option: " + pieces[i] + " for field " + this);
                        }
                        delim = ", ";
                    }
                }
            }
        },

        renderEditable : function (div_elmt, render_opts, inside_table) {
            var pieces;

            this.getLoV();
            if (!this.lov) {
                throw new Error("no lov: " + this);
            }
            pieces = this.get().split(/\|/);
            this.lov.renderMulti(div_elmt, render_opts, pieces);
        },


        generateTestValue : function (session) {
            var out = "|",
                lov,
                i;

            lov = LoV.getListLoV(this.list, session);
            if (!lov) {
                throw new Error("unknown lov: " + this.list);
            }
            for (i = 0; i < lov.length(); i += 1) {
                if (Math.random() > 0.5) {
                    out += lov.get(i).id + "|";
                }
            }
            return out;
        }

    });     // Text.clone()

});     // define

//To show up in Chrome debugger...
//@ sourceURL=data/Attributes.js