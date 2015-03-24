/*jslint node: true */
/*globals define */
"use strict";


define(["./Text", "./LoV", "./Entity", "../base/Log"], function (Text, LoV, Entity, Log) {

    return Text.clone({

        id              : "Reference",
        type            : true,
        ref_entity_id   : null,             // String id of the entity to which this field relates
        lov             : null,             // LoV object acting as a cache of the entity's records
        search_oper_list: "sy.search_oper_list_option",
        auto_search_oper: "EQ",
        url_pattern     : "?page_id={ref_entity}_display&page_key={val}",
//                      Flower Icon: &#x273D;  8-Teardrop Asterisk: &#x274B;  3 Horiz Lines: &#x2630;
//                      Apple Icon:  &#x2318;  4 Black Diamonds:    &#x2756;  Dotted Cross:  &#x205C;
//                      Solid  Right Triangle: &#x25B6;       Solid  Down Triangle: &#x25BC;
//                      Hollow Right Triangle: &#x25B7;       Hollow Down Triangle: &#x25BD;
//    nav_dropdown_icon: "&#x25BD;",
        nav_link_icon   : "&#x25B7;",
        purpose         : "To represent a field that references a record in another entity",

        autocompleter_filter    : null,     // SQL condition string to define a sub-set of the entity's records for the autocompleter only
        selection_filter        : null,     // SQL condition string to define a sub-set of the entity's records for use with this field", type: "string", usage: "optional in spec" },
        autocompleter_max_rows  : null,     // Maximum number of autocompleter matches to display (can be set at Entity level if preferred)", type: "number", usage: "optional in spec" },
        autocompleter_min_length: null,     // Minimum number of characters to type before getting autocompleter matches back (can be set at Entity level if preferred)", type: "number", usage: "optional in spec" },



        getRefVal : function () {
            return this.val;
        },


        getLoV : function () {
            var condition;
            if (!this.lov) {
                if (!this.ref_entity) {
                    throw new Error("no ref entity property");
                }
                // this.ref_condition is deprecated in favour of this.selection_filter
                condition = this.selection_filter || this.ref_condition || Entity.getEntity(this.ref_entity_id).selection_filter;
                this.lov = LoV.getEntityLoV(this.ref_entity, condition);
            }
            return this.lov;
        },


        getOwnLoV : function (selection_filter) {
            this.lov = LoV.clone({ id: this.ref_entity, entity: this.ref_entity });
            this.lov.loadEntity(null, selection_filter);
            return this.lov;
        },


        getDocPromise : function () {
            var ref_val;
            ref_val = this.getRefVal();
            if (ref_val) {
                return Entity.getEntity(this.ref_entity_id).getDocPromise(ref_val);
            }
        },


        renderNavOptions : function (parent_elmt, render_opts, primary_row) {
            var display_page,
                session,
                that = this,
                this_val,
                ul_elmt,
                count = 0,
                display_url,
                context_url;

            session  = this.getSession();
            this_val = this.getRefVal();
            if (!this_val || !this.ref_entity_id || !Entity.getEntity(this.ref_entity_id)) {
                return;
            }
            display_page = Entity.getEntity(this.ref_entity_id).getDisplayPage();
            if (!display_page) {
                return;
            }
            if (!primary_row) {
                primary_row = this.getRow(false);
            }
            if (x.pages[this.ref_entity + "_context"] && this.allowed(this.ref_entity + "_context", this_val)) {
                context_url = "context.html&page_id=" + this.ref_entity + "_context&page_key=" + this_val;
            }
            if (this.allowed(display_page.id, this_val)) {
                display_url = display_page.getSimpleURL(this_val);
            }

            function renderDropdown() {
                var add_divider = false;

                ul_elmt = that.renderDropdownDiv(parent_elmt, "Navigation options for this item");
                if (context_url) {
                    ul_elmt.makeElement("li").makeAnchor("Preview", context_url, "css_open_in_modal");
                    add_divider = true;
                }
                if (display_url) {
                    ul_elmt.makeElement("li").makeAnchor("Display", display_url);
                    add_divider = true;
                }
                if (add_divider) {
                    ul_elmt.makeElement("li", "divider");
                }
            }

            display_page.links.each(function(link) {
                if (link.isVisible(session, this_val, primary_row)) {
                    if (!ul_elmt) {
                        renderDropdown();
                    }
                    link.renderNavOption(ul_elmt, render_opts, this_val);
                    count += 1;
                }
            });
            
            if (count === 0 && display_url) {
                parent_elmt.makeUniIcon(this.nav_link_icon, display_url);
            }
            return count;
        },


        renderEditable : function (div_elmt, render_opts, inside_table) {
            if (this.ref_entity_id && !Entity.getEntity(this.ref_entity_id)) {
                throw new Error("Field " + this.toString() + " has unrecognised ref_entity: " + this.ref_entity);
            }
            if (typeof this.render_autocompleter === "boolean") {
                if (this.render_autocompleter) {
                    this.renderAutocompleter(div_elmt, render_opts);
                } else {
                    this.renderDropdown     (div_elmt, render_opts);
                }
            } else {
                if (Entity.getEntity(this.ref_entity_id).autocompleter) {
                    this.renderAutocompleter(div_elmt, render_opts);
                } else {
                    this.renderDropdown     (div_elmt, render_opts);
                }
            }
            return div_elmt;
        },


        renderAutocompleter : function (div_elmt, render_opts) {
            var input_elmt;
            input_elmt = div_elmt.makeInput("text", this.getEditableSizeCSSClass(render_opts),
                this.getControl(), this.getText());
            if (this.placeholder || this.helper_text) {
                input_elmt.attr("placeholder", this.placeholder || this.helper_text);
            }
            return input_elmt;
        },


        renderDropdown : function (div_elmt, render_opts) {
            var select_elmt;
            this.getLoV();
            if (this.lov) {
                if (!this.lov.complete) {
                    this.lov.loadEntity();
                }
                select_elmt = this.lov.render(div_elmt, render_opts, this.val, this.getEditableSizeCSSClass(render_opts), this.mandatory);
            }
            return select_elmt;
        },


        autocompleter : function (match, out) {
        },

        addColumnToTable : function (query_table, col_spec) {
            var column,
                sort_cols;

            if (!this.ref_entity_id || !Entity.getEntity(this.ref_entity_id)) {
                throw new Error("invalid ref entity: " + this.ref_entity_id);
            }
            column = Text.addColumnToTable.call(this, query_table, col_spec);
            if (Entity.getEntity(this.ref_entity_id).reference_sort_order) {
                column.order_term = Entity.getEntity(this.ref_entity_id).reference_sort_order;
            } else {
                sort_cols = Entity.getEntity(this.ref_entity_id).default_order.split(/\s*,\s*/);
                column.order_term = sort_cols[0];
            }
            column.order_term = "( SELECT ZR." + column.order_term + " FROM " + this.ref_entity_id + " ZR WHERE ZR._key=" +
                query_table.alias + (this.sql_function ? "_" : ".") + this.id + " )";
            return column;
        },


        getReferentialIntegrityDDL : function () {
            return "FOREIGN KEY (" + this.getId() + ") REFERENCES " + this.ref_entity_id + " (_key)";
        },


        checkDataIntegrity : function () {
            var resultset,
                out,
                count   = {},
                key_map = {},
                key,
                val,
                delim = "";
            
            if (!this.ref_entity || Entity.getEntity(this.ref_entity_id).view_only || this.sql_function || !this.owner) {
                return;
            }
            out = "Broken references for " + this.id + ": ";
        //    resultset = x.sql.connection.executeQuery("SELECT _key, " + this.id + " FROM " + x.app.database + "." + this.owner.table +
        //        " WHERE " + this.id + " IS NOT NULL AND " + this.id + " NOT IN ( SELECT _key FROM " + this.ref_entity + " )");
        // This is often much faster...
            resultset = x.sql.connection.executeQuery("SELECT A._key, A." + this.id + " FROM " + this.owner.table +
                    " A LEFT OUTER JOIN " + this.ref_entity_id + " B ON A." + this.id + " = B._key WHERE A." + this.id + " IS NOT NULL AND B._key IS NULL");
            while (resultset.next()) {
                key = x.sql.getColumnString(resultset, 1);
                val = x.sql.getColumnString(resultset, 2);
                if (!count[val]) {
                    count[val] = 0;
                }
                count[val] += 1;
                if (key_map[val]) {
                    if (count[val] <= 10) {
                        key_map[val] += ", " + key;
                    }
                } else {
                    key_map[val] = key;
                }
            }
            resultset.close();
            for (val in key_map) {
                if (key_map.hasOwnProperty(val)) {
                    out += delim + "[" + val + "] " + key_map[val] + " (" + count[val] + ")";
                    delim = ", ";
                }
            }
            if (delim) {
                return out;
            }
        },


        generateTestValue : function (session) {
            var lov,
                i;
            lov = LoV.getEntityLoV(this.ref_entity_id, session, this.generate_test_condition);
            if (!lov || lov.length() === 0) {
                return "";
            }
            i = Math.floor(Math.random() * lov.length());
            if (!lov.get(i)) {
                throw new Error("invalid lov item: " + i);
            }
            return lov.get(i).id;
        }

    });     // end of clone()

});     // end of define()


//To show up in Chrome debugger...
//@ sourceURL=data/Reference.js