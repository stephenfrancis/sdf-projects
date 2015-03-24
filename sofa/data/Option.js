/*jslint node: true */
/*globals define */
"use strict";


define(["./Text", "./LoV", "../base/Log"], function (Text, LoV, Log) {

    return Text.clone({

        id              : "Option",
        type            : true,
        search_oper_list: "sy.search_oper_list_option",
        auto_search_oper: "EQ",
        unknown_label   : "[unknown]: ",
    //    tb_span               : 2,
        tb_input_list   : "input-medium",
        list            : null,             // String id of the LoV supporting this field
        lov             : null,             // LoV object supporting this field
        purpose         : "To represent a single-valued option field, supported by an LoV",


        instantiate : function () {
            Text.instantiate.call(this);
            try {
                this.getLoV();
            } catch (e) {
                this.setError("error with lov");
            }
        },


        getLoV : function () {
            if (!this.lov) {
                if (this.list) {
                    this.lov = LoV.getListLoV(this.list);
                } else {
                    this.lov = LoV.getBasicLoV();
                }
            }
            return this.lov;
        },


        getOwnLoV : function () {
            this.lov = LoV.clone({ id: this.list, list: this.list });
            this.lov.loadList();
            return this.lov;
        },


        validate : function () {
            var item,
                val;

            val = this.get();
            Text.validate.call(this);
            if (!this.lov) {
                this.setError("no lov found");
            } else if (val) {                // Only do special validation is non-blank
                item = this.lov.getItem(val);
                if (item) {
                    this.text = item.label;
                } else {
                    this.text = this.unknown_label + val;
                    this.setError("invalid option: " + val);
                    Log.debug(this, "invalid option: " + val + " for field " + this);
                }
            }
        },


        renderEditable : function (div_elmt, render_opts, inside_table) {
            var out_elmt,
                css_class;

            css_class = this.getEditableSizeCSSClass(render_opts);
            try {
                this.getLoV();
            } catch (e) {
                return;
            }
            if (this.lov) {
                if (this.render_radio) {
                    out_elmt = this.lov.renderRadio(div_elmt, render_opts, this.val, css_class, this.mandatory);
                } else {
                    out_elmt = this.lov.render     (div_elmt, render_opts, this.val, css_class, this.mandatory);
                }
            }
            return out_elmt;
        },


        addColumnToTable : function (query_table, col_spec) {
            var column;

            column = Text.addColumnToTable.call(this, query_table, col_spec);
            if (this.list) {
                column.order_term = "( select ZI.seq_number from sy_list_item ZI where ZI.list='" + this.list + "' and ZI.id=" +
                query_table.alias + (this.sql_function ? "_" : ".") + this.id + " )";
            }
            return column;
        },


        generateTestValue : function (session) {
            var lov,
                i;

            lov = LoV.getListLoV(this.list, session);
            if (!lov || lov.length() === 0) {
                return "";
            }
            i = Math.floor(Math.random() * lov.length());
            if (!lov.get(i)) {
                throw new Error("Invalid LoV item: " + i + " for field " + this);
            }
            return lov.get(i).id;
        }

    });     // end of clone()

});     // end of define()


//To show up in Chrome debugger...
//@ sourceURL=data/Option.js