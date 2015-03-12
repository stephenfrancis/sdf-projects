/*global x, java */
"use strict";

x.page.addClone(x.page.Section, {
    id                  : "ListBase",
    columns             : x.base.OrderedMap.clone({ id: "ListBase.columns" }),
    recordset_size      : 10,
    recordset_size_long_lists: 1000,
    recordset           : 1,
    recordset_last      : 1,
    allow_choose_cols   : true,
    show_header         : true,
    show_footer         : true,
    right_align_numbers : true,
    hide_table_if_empty : true,
    repeat_form         : false,
    horiz_scroll        : false,
    text_no_rows        : "no data",
    text_one_row        : "1 row",
    text_multi_rows     : "rows",
//    text_total_row: "Total"
    sort_arrow_asc_icon : "&#x25B2;",
    sort_arrow_desc_icon: "&#x25BC;",
    column_chooser_icon : "&#x2630;",        //"&#8251;",
    frst_recordset_icon : "&#x25C1;&#x25C1;",
    prev_recordset_icon : "&#x25C1;",
    next_recordset_icon : "&#x25B7;",
    last_recordset_icon : "&#x25B7;&#x25B7;",
    prev_columnset_icon : "&#x25C1;",
    next_columnset_icon : "&#x25B7;"
});

x.page.ListBase.doc = {
    location: "x.sections",
    file    : "$Header: /rsl/rsl_app/core/page/ListBase.js,v 1.88 2014/08/15 13:22:32 francis Exp $",
    purpose : "The root Archetype of a list or grid section",
    properties : {
        columns             : { label: "OrderedMap of list columns", type: "x.base.OrderedMap", usage: "use methods only" },
        recordset_size      : { label: "Number of records in a recordset", type: "number", usage: "can edit" },
        recordset           : { label: "Current recordset", type: "number", usage: "can edit" },
        recordset_last      : { label: "Highest available recordset", type: "number", usage: "can edit" },
        open_ended_recordset: { label: "True if can't determine how many records there are altogether (at least until the last one is reached)", type: "boolean", usage: "can edit" },
        subsequent_recordset: { label: "True if there is at least one more recordset of data after the current one", type: "boolean", usage: "read only" },
        allow_choose_cols   : { label: "Allow user to choose which columns to display", type: "boolean", usage: "can edit" },
        show_choose_cols    : { label: "Whether or not the column-chooser is visible", type: "boolean", usage: "can edit" },
        show_header         : { label: "Whether or not the table header is visible, defaults true", type: "boolean", usage: "can edit" },
        show_footer         : { label: "Whether or not the table footer is visible", type: "boolean", usage: "can edit" },
        right_align_numbers : { label: "Whether or not numbers in columns should be right-aligned, defaults true", type: "boolean", usage: "can edit" },
        hide_table_if_empty : { label: "Hide the table if there are no rows (defaults to true)", type: "boolean", usage: "can edit" },
        repeat_form         : { label: "Whether to render each row as a separate Form element (true) instead of the usual list (false), defaults false", type: "boolean", usage: "can edit" },
        keys                : { label: "Array of strings of record keys", type: "array", usage: "do not use" },
        row_count           : { label: "Number of records found", type: "number", usage: "read only" },
        horiz_scroll        : { label: "Allow horizontal scrolling of this section (defaults to true)", type: "boolean", usage: "can edit"},
        max_visible_columns : { label: "Maximum number of columns to display at one time (alternative horizontal layout approach), used in conjunction with 'sticky' columns; undefined or null switches the mechanism off", type: "number", usage: "optional in spec" },
        total_column_pages  : { label: "Number of 'column pages' required for this list, calculated in initializeColumnPaging(), based on max_visible_columns and which columns are 'sticky'", type: "number", usage: "read only" },
        current_column_page : { label: "Sequence number (starting at zero) of the current 'column page', initialized by initializeColumnPaging(), maximum value is total_column_pages - 1", type: "number", usage: "can edit" },
        non_sticky_cols_per_page: { label: "Total number of 'non-sticky' columns to display at one time", type: "number", usage: "read only" },
        cols_filter         : { label: "String with which the Column Chooser is currently filtered", type: "string", usage: "can edit" },
    }
};

x.page.ListBase.clone = function (spec) {
    var new_obj;
    x.log.functionStart("clone", this, arguments);
    new_obj = x.page.Section.clone.call(this, spec);
    new_obj.columns = this.columns.clone({ id: "columns", owner: new_obj });
    new_obj.row_count = 0;
    new_obj.keys = [];
    return new_obj;
};


x.page.ListBase.setup = function () {
    x.log.functionStart("setup", this, arguments);
    x.page.Section.setup.call(this);
    this.list_advanced_mode = (this.owner.page.session.list_advanced_mode === true);
    if (this.row_select) {
        this.row_select_col = this.columns.add({ id: "_row_select", label: "", dynamic_only: true, sortable: false, sticky: true });
    }
};
x.page.ListBase.setup.doc = {
    purpose: "Set 'list_advanced_mode' property from session property, and 'row_select_col' if 'row_select' is given",
    args   : "none",
    returns: "nothing"
};


x.page.ListBase.update = function (params) {
    var i,
        col;
    x.log.functionStart("update", this, arguments);
    this.show_choose_cols = false;
    if (this.list_advanced_mode && this.allow_choose_cols && params.page_button) {
        for (i = 0; i < this.columns.length(); i += 1) {
            col = this.columns.get(i);
            if (col.visible && params.page_button === "list_" + this.id + "_col_" + col.id + "_hide") {
                col.visible = false;
                this.show_choose_cols = true;
            } else if (!col.visible && params.page_button === "list_" + this.id + "_col_" + col.id + "_show") {
                col.visible = true;
                this.show_choose_cols = true;
            }
        }
        this.cols_filter = (params["cols_filter_" + this.id] && params.page_button && params.page_button.indexOf("list_" + this.id + "_col_") !== -1) ? params["cols_filter_" + this.id] : "";
    }
    if (this.max_visible_columns) {
               if (params.page_button === "column_page_frst_" + this.id) {
            this.current_column_page  = 0;
        } else if (params.page_button === "column_page_prev_" + this.id && this.current_column_page > 0) {
            this.current_column_page -= 1;
        } else if (params.page_button === "column_page_next_" + this.id && this.current_column_page < (this.total_column_pages - 1)) {
            this.current_column_page += 1;
        } else if (params.page_button === "column_page_last_" + this.id && this.current_column_page < (this.total_column_pages - 1)) {
            this.current_column_page  = this.total_column_pages - 1;
        }
    }
};
x.page.ListBase.update.doc = {
    purpose: "Update section's state using the parameter map supplied",
    args   : "params: object map of strings",
    returns: "nothing"
};


x.page.ListBase.setLinkField = function (link_field, value) {
    x.log.functionStart("setLinkField", this, arguments);
    if (this.key_condition) {
        this.key_condition.remove();
    }
    if (value) {
        this.key_condition = this.query.addCondition({ column: "A." + link_field, operator: "=", value: value });
    } else {
        this.key_condition = this.query.addCondition({ full_condition: "false" });        // prevent load if no value supplied
    }
    if (this.columns.get(link_field)) {
        this.columns.get(link_field).visible = false;
    }
};
x.page.ListBase.setLinkField.doc = {
    purpose: "Set up link field relationship (requires this.query to be present)",
    args   : "link_field: string column id, value: string value to use in filter condition, condition is false if not supplied",
    returns: "nothing"
};


x.page.ListBase.render = function (parent_elmt, render_opts) {
    x.log.functionStart("render", this, arguments);
    x.page.Section.render.call(this, parent_elmt, render_opts);
    if (this.repeat_form) {
        this.renderInitialize(render_opts);
        return this.renderBody(render_opts);
    }
    this.renderList(render_opts);
};
x.page.ListBase.render.doc = {
    purpose: "Generate HTML output for this section, given its current state; calls renderBody() if 'repeat_form' else renderList()",
    args   : "xmlstream element object to be the parent of the section-level div element, render_opts",
    returns: "xmlstream div element object for the section"
};


x.page.ListBase.renderInitialize = function (render_opts) {
    x.log.functionStart("renderInitialize", this, arguments);
    this.row_count = 0;
    this.resetAggregations(render_opts);
    this.initializeColumnPaging(render_opts);
};
x.page.ListBase.renderInitialize.doc = {
    purpose: "To reset row_count property and call resetAggregations(), initializeColumnPaging(), etc",
    args   : "none",
    returns: "nothing"
};


x.page.ListBase.initializeColumnPaging = function (render_opts) {
    var     sticky_cols = 0,
        non_sticky_cols = 0;
    if (this.max_visible_columns) {
        this.columns.each(function(col) {
            if (col.isVisibleDisregardingColumnPaging(render_opts)) {
                if (col.sticky) {
                    sticky_cols += 1;
                } else {
                    col.non_sticky_col_seq = non_sticky_cols;
                    non_sticky_cols += 1;
                }
            }
        });
        this.non_sticky_cols_per_page = this.max_visible_columns - sticky_cols;
        this.total_column_pages = Math.max(1, Math.ceil(non_sticky_cols / this.non_sticky_cols_per_page));
        if (typeof this.current_column_page !== "number") {
            this.current_column_page = 0;
        }
    }
};
x.page.ListBase.initializeColumnPaging.doc = {
    purpose: "To set-up column paging if specified",
    args   : "render_opts",
    returns: "nothing"
};


x.page.ListBase.renderList = function (render_opts) {
    x.log.functionStart("renderList", this, arguments);
    this.renderInitialize(render_opts);
    this.table_elmt = null;
    if (!this.hide_table_if_empty) {
        this.getTableElement(render_opts);
    }
    this.renderBody(render_opts);
    if (this.sctn_elmt) {
        if (!this.table_elmt && this.row_count === 0) {
            this.sctn_elmt.text(this.text_no_rows);
        } else if (this.table_elmt && this.show_footer) {
            this.renderFooter(this.table_elmt, render_opts);
        }
    }
};
x.page.ListBase.renderList.doc = {
    purpose: "Generate HTML table output, reset counters, call renderHeader, renderBody, and then renderFooter",
    args   : "xmlstream element object to be the parent of the table element, render_opts",
    returns: "xmlstream table element object"
};


x.page.ListBase.getTableElement = function (render_opts) {
    var css_class,
        parent_elmt;
    x.log.functionStart("getTableElement", this, arguments);
    if (!this.table_elmt) {
        parent_elmt = this.getSectionElement();
        css_class = "css_list table table-bordered table-condensed table-hover";
        if (this.right_align_numbers) {
            css_class += " css_right_align_numbers";
        }
        if (this.horiz_scroll) {
            parent_elmt = parent_elmt.makeElement("div", "css_scroll");        
        }
        this.table_elmt = parent_elmt.makeElement("table", css_class, this.id);
        
        if (this.show_header) {
            this.renderHeader(this.table_elmt, render_opts);
        }
    }
    return this.table_elmt;
};
x.page.ListBase.getTableElement.doc = {
    purpose: "To return the 'table_elmt' XmlStream object for the HTML table, creating it if it doesn't already exist",
    args   : "render_opts",
    returns: "table_elmt XmlStream object for the HTML table"
};


x.page.ListBase.getActualColumns = function () {
    return (this.total_visible_columns || 0) + (this.level_break_depth || 0);
};
x.page.ListBase.getActualColumns.doc = {
    purpose: "To return the number of actual shown HTML columns, being 'total_visible_columns' + 'level_break_depth', ONLY available after renderHeader() is called",
    args   : "none",
    returns: "number of actual shown HTML columns"
};


x.page.ListBase.renderHeader = function (table_elmt, render_opts) {
    var row_elmt,
        total_visible_columns = 0,
        i;
    x.log.functionStart("renderHeader", this, arguments);
    thead_elmt = table_elmt.makeElement("thead");
      row_elmt = thead_elmt.makeElement("tr");
    for (i = 0; i < this.level_break_depth; i += 1) {
        row_elmt.makeElement("th", "css_level_break_header");
    }
    this.columns.each(function(col) {
        if (col.isVisibleColumn(render_opts)) {
            col.renderHeader(row_elmt, render_opts);
            total_visible_columns += 1;
        }
    });
    this.total_visible_columns = total_visible_columns;
    return row_elmt;
};
x.page.ListBase.renderHeader.doc = {
    purpose: "To generate the HTML thead element and its content, calling renderHeader() on each visible column",
    args   : "xmlstream table element object, render_opts",
    returns: "row_elmt xmlstream object representing the th row"
};


x.page.ListBase.renderBody = function (render_opts) {
    x.log.functionStart("renderBody", this, arguments);
};
x.page.ListBase.renderBody.doc = {
    purpose: "To generate a repeating-block view of the data (not implemented yet)",
    args   : "render opts",
    returns: "unknwon"
};


x.page.ListBase.renderRow = function (render_opts, row_obj) {
    var table_elmt;
    x.log.functionStart("renderRow", this, arguments);
    table_elmt = this.getTableElement(render_opts);
    if (this.repeat_form) {
        return this.renderRepeatForm(table_elmt, render_opts, row_obj);    // element is div
    }
    return this.renderListRow(table_elmt, render_opts, row_obj);        // element is table
};
x.page.ListBase.renderRow.doc = {
    purpose: "To render an object (usually a fieldset) as a row in the table by calling renderListRow(), or as a form by \
calling renderRepeatForm() if 'repeat_form' is set",
    args   : "render_opts, row_obj object (usually a fieldset) used by renderListRow() or renderRepeatForm()",
    returns: "nothing"
};


x.page.ListBase.renderListRow = function (table_elmt, render_opts, row_obj) {
    var row_elmt,
        css_class,
        i;
    x.log.functionStart("renderListRow", this, arguments);
    css_class = this.getRowCSSClass();
//    this.updateAggregations();
    this.row_count += 1;
    row_elmt = table_elmt.makeElement("tr", css_class);
    this.rowURL(row_elmt, row_obj);
    this.addRowToKeyArray(row_obj);
    for (i = 0; i < this.level_break_depth; i += 1) {
        row_elmt.makeElement("td");
    }
    for (i = 0; i < this.columns.length(); i += 1) {
        if (this.columns.get(i).isVisibleColumn(render_opts)) {
            this.columns.get(i).renderCell(row_elmt, render_opts, i, row_obj);
        }
    }
    for (i = 0; i < this.columns.length(); i += 1) {
        this.columns.get(i).renderAdditionalRow(table_elmt, render_opts, i, row_obj, css_class);
    }
    return row_elmt;
};
x.page.ListBase.renderListRow.doc = {
    purpose: "To render an object (usually a fieldset) as an HTML tr element, calling getRowCSSClass(), rowURL(), \
addRowToKeyArray(), and renderCell() or renderAdditionalRow() on each visible column",
    args   : "table_elmt (xmlstream), render_opts, row_obj",
    returns: "row_elmt (xmlstream)"
};


x.page.ListBase.renderRepeatForm = function (parent_elmt, render_opts, row_obj) {
    x.log.functionStart("renderRepeatForm", this, arguments);
    this.fieldset = row_obj;
    return x.page.FormBase.render.call(this, parent_elmt, render_opts);
};
x.page.ListBase.renderRepeatForm.doc = {
    purpose: "To render an object (usually a fieldset) as a form block, using FormBase.render() (not implemented)",
    args   : "element (xmlstream), render_opts, row_obj",
    returns: "the return value of FormBase.render()"
};


x.page.ListBase.getRepeatFormText = function (row_obj) {
    return null;
};
x.page.ListBase.getRepeatFormText.doc = {
    purpose: "tbd",
    args   : "row_obj",
    returns: "nothing"
};


x.page.ListBase.getRowCSSClass = function (row_obj) {
    x.log.functionStart("getRowCSSClass", this, arguments);
    return (this.row_count % 2 === 0) ? "css_row_even" : "css_row_odd";
};
x.page.ListBase.getRowCSSClass.doc = {
    purpose: "To return the CSS class string for the tr object - 'css_row_even' or 'css_row_odd' for row striping",
    args   : "row_obj",
    returns: "CSS class string"
};


x.page.ListBase.rowURL = function (row_elmt, row_obj) {};
x.page.ListBase.rowURL.doc = {
    purpose: "To return a string URL for the row, if appropriate",
    args   : "row_elmt (xmlstream), row_obj (usually a fieldset)",
    returns: "string URL or null or undefined"
};


x.page.ListBase.addRowToKeyArray = function (row_obj) {};
x.page.ListBase.addRowToKeyArray.doc = {
    purpose: "To add a key string to the internal array of shown row keys",
    args   : "row_obj (usually a fieldset)",
    returns: "nothing"
};


x.page.ListBase.renderFooter = function (table_elmt, render_opts) {
    var foot_elmt,
        ctrl_elmt;
    x.log.functionStart("renderFooter", this, arguments);
    foot_elmt = table_elmt.makeElement("tfoot").makeElement("tr").makeElement("td");
    foot_elmt.attr("colspan", String(this.getActualColumns()));
    if (render_opts.dynamic_page !== false) {
        this.renderRowAdder(foot_elmt, render_opts);
        this.renderListPager(foot_elmt, render_opts);
        this.renderColumnPager(foot_elmt, render_opts);
        if (this.list_advanced_mode && this.allow_choose_cols) {
            ctrl_elmt = foot_elmt.makeElement("span", "css_list_col_chooser");
            ctrl_elmt.attr("onclick", "y.listColumnChooser(this)");
            ctrl_elmt.makeElement("a", "css_uni_icon_lrg", "list_choose_cols_" + this.id)
                .attr("title", "Choose Columns to View")
                .html(this.column_chooser_icon);
            this.renderColumnChooser(foot_elmt, render_opts);
        }
    } else {
        this.renderRowCount(foot_elmt, render_opts);
    }
    return foot_elmt;
};
x.page.ListBase.renderFooter.doc = {
    purpose: "To render the table footer, as a containing div, calling renderRowAdder(), render the column-chooser icon, \
calling renderListPager() and renderColumnChooser(), or if not a dynamic output, calling renderRowCount()",
    args   : "sctn_elmt (xmlstream), render_opts",
    returns: "foot_elmt (xmlstream) if dynamic"
};


x.page.ListBase.renderRowAdder = function (foot_elmt, render_opts) {
    x.log.functionStart("renderRowAdder", this, arguments);
};
x.page.ListBase.renderRowAdder.doc = {
    purpose: "To render the control for adding rows (either a 'plus' type button or a drop-down of keys) if appropriate",
    args   : "foot_elmt (xmlstream), render_opts",
    returns: "nothing"
};


x.page.ListBase.renderListPager = function (foot_elmt, render_opts) {
    var pagr_elmt,
        ctrl_elmt;
    x.log.functionStart("renderListPager", this, arguments);
    pagr_elmt = foot_elmt.makeElement("span", "css_row_pager");
    ctrl_elmt = pagr_elmt.makeElement("span", "css_list_control");
    if (this.recordset > 1) {
        ctrl_elmt.makeElement("a", "css_cmd css_uni_icon", "list_set_frst_" + this.id)
            .attr("title", "first recordset")
            .html(this.frst_recordset_icon);
        ctrl_elmt.makeElement("a", "css_cmd css_uni_icon", "list_set_prev_" + this.id)
            .attr("title", "previous recordset")
            .html(this.prev_recordset_icon);
    }
    this.renderRowCount(pagr_elmt, render_opts);
    ctrl_elmt = pagr_elmt.makeElement("span", "css_list_control");

//    if (this.open_ended_recordset || (this.recordset_last > 1 && this.recordset < this.recordset_last)) {
    if (this.subsequent_recordset) {
        ctrl_elmt.makeElement("a", "css_cmd css_uni_icon", "list_set_next_" + this.id)
            .attr("title", "next recordset")
            .html(this.next_recordset_icon);
    }
    if (this.subsequent_recordset && !this.open_ended_recordset) {
        ctrl_elmt.makeElement("a", "css_cmd css_uni_icon", "list_set_last_" + this.id)
            .attr("title", "last recordset")
            .html(this.last_recordset_icon);
    }
};
x.page.ListBase.renderListPager.doc = {
    purpose: "To render the player-style control for pages back and forth through recordsets of data, if appropriate",
    args   : "foot_elmt (xmlstream), render_opts",
    returns: "nothing"
};


x.page.ListBase.renderColumnPager = function (foot_elmt, render_opts) {
    var pagr_elmt,
        ctrl_elmt;
    x.log.functionStart("renderColumnPager", this, arguments);
    if (!this.max_visible_columns) {
        return;
    }
    pagr_elmt = foot_elmt.makeElement("span", "css_column_pager");
    ctrl_elmt = pagr_elmt.makeElement("span", "css_list_control");
    if (this.current_column_page > 0) {
        ctrl_elmt.makeElement("a", "css_cmd css_uni_icon", "column_page_prev_" + this.id)
            .attr("title", "previous column page")
            .html(this.prev_columnset_icon);
    }
    pagr_elmt.makeElement("span", "css_list_rowcount")
        .text("column page " + (this.current_column_page + 1) + " of " + this.total_column_pages);

    if ((this.current_column_page + 1) < this.total_column_pages) {
        ctrl_elmt = pagr_elmt.makeElement("span", "css_list_control");
        ctrl_elmt.makeElement("a", "css_cmd css_uni_icon", "column_page_next_" + this.id)
            .attr("title", "next column page")
            .html(this.next_columnset_icon);
    }
};
x.page.ListBase.renderColumnPager.doc = {
    purpose: "To render the player-style control for column pages back and forth through groups of non-sticky visible columns, if appropriate",
    args   : "foot_elmt (xmlstream), render_opts",
    returns: "nothing"
};


x.page.ListBase.renderRowCount = function (foot_elmt, render_opts) {
    var text;
    x.log.functionStart("renderRowCount", this, arguments);
    if (this.recordset === 1 && !this.subsequent_recordset) {
        if (this.row_count === 0) {
            text = this.text_no_rows;
        } else if (this.row_count === 1) {
            text = this.text_one_row;
        } else {
            text = this.row_count + " " + this.text_multi_rows;
        }
    } else {
        if (this.frst_record_in_set && this.last_record_in_set) {
            text = "rows " + this.frst_record_in_set + " - " + this.last_record_in_set;
            if (!this.open_ended_recordset && this.found_rows && this.recordset_size < this.found_rows) {
                text += " of " + this.found_rows;
            }
        } else {
            text = this.row_count + " rows";
        }
    }
    return foot_elmt.makeElement("span", "css_list_rowcount").text(text);
};
x.page.ListBase.renderRowCount.doc = {
    purpose: "To render a simple span showing the number of rows, and the sub-set shown, if appropriate",
    args   : "foot_elmt (xmlstream), render_opts",
    returns: "nothing"
};


x.page.ListBase.renderColumnChooser = function (foot_elmt, render_opts) {
    var   ctrl_elmt,
        filter_elmt,
        i,
        col;
    x.log.functionStart("renderColumnChooser", this, arguments);
    if (this.allow_choose_cols) {
          ctrl_elmt = foot_elmt.makeElement("div", "css_list_choose_cols" + (this.show_choose_cols ? "" : " css_hide"));
        filter_elmt = ctrl_elmt.makeElement("span", "css_list_cols_filter");
        filter_elmt.makeInput("text", "input-medium", null, this.cols_filter)
            .attr("placeholder", "Filter Columns")
            .attr("name", "cols_filter_" + this.id);

        for (i = 0; i < this.columns.length(); i += 1) {
            col = this.columns.get(i);
            if (!col.label.trim()) {
                continue;
            }
            ctrl_elmt.makeElement("button", "btn btn-mini css_cmd " + (col.visible ? "active" : ""),
                    "list_" + this.id + "_col_" + col.id + (col.visible ? "_hide" : "_show"))
//                .attr("type", "button")
                .attr("data-toggle", "button")
                .text(col.label);
        }
    }
};
x.page.ListBase.renderColumnChooser.doc = {
    purpose: "To render a column-chooser control (a set of push-state buttons represents all available columns, with the \
currently-shown columns pushed in), allowing the user to choose which columns to see",
    args   : "foot_elmt (xmlstream), render_opts",
    returns: "nothing"
};


x.page.ListBase.outputNavLinks = function (page_key, obj) {
    var index;
    x.log.functionStart("outputNavLinks", this, arguments);
    x.log.trace(this, "outputNavLinks() with page_key: " + page_key + " keys: " + this.keys + ", " + this.keys.length);
    if (this.keys && this.keys.length > 0) {
        x.log.debug(this, "outputNavLinks() with page_key: " + page_key + " gives index: " + index);
        if (this.prev_recordset_last_key === page_key && this.recordset > 1) {
            this.moveToRecordset(this.recordset - 1);            // prev recordset
        } else if (this.next_recordset_frst_key === page_key && this.subsequent_recordset) {
            this.moveToRecordset(this.recordset + 1);            // next recordset
        }
        index = this.keys.indexOf(page_key);
        if (index > 0) {
            obj.nav_prev_key = this.keys[index - 1];
        } else if (index === 0) {
            obj.nav_prev_key = this.prev_recordset_last_key;            
        }
        if (index < this.keys.length - 1) {
            obj.nav_next_key = this.keys[index + 1];
        } else if (index === this.keys.length - 1) {
            obj.nav_next_key = this.next_recordset_frst_key;
        }
    }
};
x.page.ListBase.outputNavLinks.doc = {
    purpose: "",
    args   : "",
    returns: ""
};


x.page.ListBase.moveToRecordset = function (new_recordset) {
    x.log.functionStart("moveToRecordset", this, arguments);
};
x.page.ListBase.moveToRecordset.doc = {
    purpose: "Move to the nth recordset",
    args   : "Index of recordset to move to",
    returns: "Nothing"
};


x.page.ListBase.resetAggregations = function (render_opts) {
    var text_total_row = "",
        delim = "";

    x.log.functionStart("resetAggregations", this, arguments);
    function updateTextTotalRow(col_aggregation, aggr_id, aggr_label) {
        if (col_aggregation === aggr_id && text_total_row.indexOf(aggr_label) === -1) {
            text_total_row += delim + aggr_label;
            delim = " / ";
        }
    }
    this.columns.each(function(col) {
        col.total = [0];
        if (col.aggregation && col.aggregation !== "N") {
            updateTextTotalRow(col.aggregation, "S", "totals");
            updateTextTotalRow(col.aggregation, "A", "averages");
            updateTextTotalRow(col.aggregation, "C", "counts");
        }
    });
    if (!this.text_total_row) {
        this.text_total_row = text_total_row;
    }
};
x.page.ListBase.resetAggregations.doc = {
    purpose: "Reset column aggregation counters",
    args   : "none",
    returns: "nothing"
};


x.page.ListBase.updateAggregations = function () {
    x.log.functionStart("updateAggregations", this, arguments);
    this.columns.each(function(col) {
        var i;
        if (col.field) {
            for (i = 0; i < col.total.length; i += 1) {
                col.total[i] += col.field.getNumber(0);
            }
        }
    });
};
x.page.ListBase.updateAggregations.doc = {
    purpose: "Update column aggregation counters with this record's values",
    args   : "Record obj representing current row",
    returns: "nothing"
};


x.page.ListBase.renderAggregations = function (render_opts) {
    var first_aggr_col = -1,
        pre_aggr_colspan = 0,
        row_elmt,
        i,
        col;

    x.log.functionStart("renderAggregations", this, arguments);
    for (i = 0; i < this.columns.length(); i += 1) {
        col = this.columns.get(i);
        if (col.isVisibleColumn(render_opts)) {
            if (col.aggregation && col.aggregation !== "N") {
                first_aggr_col = i;
                break;
            }
            pre_aggr_colspan += 1;
        }
    }
    if (first_aggr_col === -1) {        // no aggregation
        return;
    }
    row_elmt = this.getTableElement(render_opts).makeElement("tr", "css_row_total");
    if (pre_aggr_colspan > 0) {
        row_elmt.makeElement("td")
            .attr("colspan", pre_aggr_colspan.toFixed(0))
            .text(this.text_total_row);
    }
    for (i = first_aggr_col; i < this.columns.length(); i += 1) {
        this.columns.get(i).renderAggregation(row_elmt, render_opts, 0, this.row_count);
    }
};
x.page.ListBase.renderAggregations.doc = {
    purpose: "Show a total row at bottom of table if any visible column is set to aggregate",
    args   : "xmlstream element object for the table, render_opts",
    returns: "nothing"
};


x.page.ListBase.renderRepeat = function (parent_elmt, render_opts) {
    x.log.functionStart("renderRepeat", this, arguments);
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        this.renderRow(parent_elmt, render_opts, this.record);
    }
    this.query.reset();
};
x.page.ListBase.renderRepeat.doc = {
    purpose: "",
    args   : "",
    returns: ""
};



x.page.ListBase.columns.add = function (col_spec) {
    var column;
    x.log.functionStart("add", this, arguments);
    if (col_spec.field) {
        if (col_spec.field.accessible === false) {
            return;
        }
        col_spec.id             = col_spec.id             || col_spec.field.id;
        col_spec.label          = col_spec.label          || col_spec.field.label;
        col_spec.css_class      = col_spec.css_class      || "";
        col_spec.width          = col_spec.width          || col_spec.field.col_width;
        col_spec.min_width      = col_spec.min_width      || col_spec.field.min_col_width;
        col_spec.max_width      = col_spec.max_width      || col_spec.field.max_col_width;
        col_spec.description    = col_spec.description    || col_spec.field.description;
        col_spec.aggregation    = col_spec.aggregation    || col_spec.field.aggregation;
        col_spec.separate_row   = col_spec.separate_row   || col_spec.field.separate_row;
        col_spec.decimal_digits = col_spec.decimal_digits || col_spec.field.decimal_digits || 0;
        col_spec.sortable       = col_spec.sortable       || col_spec.field.sortable;
        col_spec.tb_input       = col_spec.tb_input       || col_spec.field.tb_input_list;

        if (typeof col_spec.visible !== "boolean") {
            col_spec.visible = col_spec.field.list_column;
        }
    }
    if (typeof col_spec.label !== "string") {
        throw x.Exception.clone({ id: "label_not_specified", column: col_spec.id });
    }
    column = x.page.ListBase.Column.clone(col_spec);
    x.base.OrderedMap.add.call(this, column);
    return column;
};
x.page.ListBase.columns.add.doc = {
    purpose: "Create a new column object, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created column",
    returns: "Newly-created column object"
};


x.page.ListBase.Column = x.base.Base.clone({
    id: "sections.ListBase.Column",
    visible : true,
    hover_text_icon : "&#x24D8;"
});

x.page.ListBase.Column.doc = {
    location : "x.ListBase",
    purpose : "To represent a column in a table",
    properties : {
        visible         : { label: "Whether or not this column is displayed", type: "boolean", usage: "use (defaults to true)" },
        label           : { label: "Column heading text", type: "string", usage: "required in spec" },
        separate_row    : { label: "Whether or not this column should be rendered as a separate row", type: "boolean", usage: "use (defaults to false)" },
        field           : { label: "Field object corresponding to this column (provides defaults for the other properties)", type: "x.data.Text", usage: "optional in spec" },
        text            : { label: "Text to place in cell on call to renderCell()", type: "string", usage: "optional" },
        css_class       : { label: "CSS class of th and td elements", type: "string", usage: "optional" },
    }
};

x.page.ListBase.Column.isVisibleColumn = function (render_opts) {
    var column_paging = true;
    x.log.functionStart("isVisibleColumn", this, arguments);
    if (typeof render_opts !== "object") {
        throw x.Exception.clone({ id: "invalid_argument", text: "render_opts not supplied" });
    }
    if (this.owner.section.max_visible_columns && !this.sticky) {
        column_paging = this.non_sticky_col_seq >= (this.owner.section.current_column_page      * this.owner.section.non_sticky_cols_per_page) &&
                        this.non_sticky_col_seq < ((this.owner.section.current_column_page + 1) * this.owner.section.non_sticky_cols_per_page);
    }
    return column_paging && this.isVisibleDisregardingColumnPaging(render_opts);
};
x.page.ListBase.Column.isVisibleColumn.doc = {
    purpose: "To indicate whether or not this column is visible (as a column, i.e. not a separate row), evaluated as: \
this.visible && !this.separate_row && !(this.dynamic_only && render_opts.dynamic_page === false)",
    args   : "render_opts",
    returns: "true if this column is a visible column, otherwise false"
};


x.page.ListBase.Column.isVisibleDisregardingColumnPaging = function (render_opts) {
    return this.visible && !this.separate_row && !(this.dynamic_only && render_opts.dynamic_page === false)
            && (typeof this.level_break !== "number");
};


x.page.ListBase.Column.updateAggregations = function (level_broken) {
    var i;
    x.log.functionStart("updateAggregations", this, arguments);
    for (i = 0; i < this.total.length; i += 1) {
        if (i >= level_broken) {
            this.total[i] = 0;
        }
        if (this.field) {
            this.total[i] += this.field.getNumber(0);
        } else {
            this.total[i] += parseFloat(this.text, 10);
        }
    }
};
x.page.ListBase.Column.updateAggregations.doc = {
    purpose: "To update running totals for this column, resetting totals if level is broken",
    args   : "level broken (integer), 1 being the highest",
    returns: "nothing"
};


x.page.ListBase.Column.renderHeader = function (row_elmt, render_opts) {
    var     th_elmt,
        anchor_elmt,
        css_class = this.css_class;
    x.log.functionStart("renderHeader", this, arguments);
    if (this.field) {
        css_class += " " + this.field.getCellCSSClass();
    }
    if (this.freeze) {
        css_class += " css_col_freeze";
    }
    th_elmt = row_elmt.makeElement("th", css_class);
    if (this.width) {
        th_elmt.attr("style", "width: " + this.width);
    }
    if (this.min_width) {
        th_elmt.attr("style", "min-width: " + this.min_width);
    }
    if (this.max_width) {
        th_elmt.attr("style", "max-width: " + this.max_width);
    }
    if (this.description) {
        anchor_elmt = th_elmt.makeElement("a", "css_uni_icon");
        anchor_elmt.attr("rel"  , "tooltip");
        anchor_elmt.attr("title", this.description);
        anchor_elmt.html(this.hover_text_icon);
    }
    if (this.owner.section.list_advanced_mode && this.owner.section.sortable && this.sortable !== false
            && render_opts.dynamic_page !== false && this.query_column) {
        elmt = this.renderSortLink(th_elmt);
    }
    th_elmt.text(this.label);
};
x.page.ListBase.Column.renderHeader.doc = {
    purpose: "Generate HTML output for this column's heading, as a th element",
    args   : "parent xmlstream element object, expected to be a tr, render_opts",
    returns: "nothing"
};


x.page.ListBase.Column.renderSortLink = function (parent_elmt) {
    var sort_seq_asc  = 0,
        sort_seq_desc = 0,
        anchor_elmt,
          span_elmt,
        description;
    x.log.functionStart("renderSortLink", this, arguments);
    if (typeof this.query_column.sort_seq === "number" && this.query_column.sort_seq < 3) {
        if (this.query_column.sort_desc) {
            sort_seq_desc = this.query_column.sort_seq + 1;
        } else {
            sort_seq_asc  = this.query_column.sort_seq + 1;
        }
    }
    anchor_elmt = parent_elmt.makeElement("a", "css_cmd css_list_sort");
    if (sort_seq_asc === 1 || sort_seq_desc > 1) {
        description = "Sort descending at top level";
        anchor_elmt.attr("id"   , "list_sort_desc_" + this.owner.section.id + "_" + this.id);
    } else {
        description = "Sort ascending at top level";
        anchor_elmt.attr("id"   , "list_sort_asc_"  + this.owner.section.id + "_" + this.id);
    }
    anchor_elmt.attr("title", description);
    if (sort_seq_asc > 0) {
        span_elmt = anchor_elmt.makeElement("span", "css_uni_icon");
        span_elmt.attr("style", "opacity: " + (0.3 * (4 - sort_seq_asc )).toFixed(1));
        span_elmt.html(this.owner.section.sort_arrow_asc_icon);
    }
    if (sort_seq_desc > 0) {
        span_elmt = anchor_elmt.makeElement("span", "css_uni_icon");
        span_elmt.attr("style", "opacity: " + (0.3 * (4 - sort_seq_desc)).toFixed(1));
        span_elmt.html(this.owner.section.sort_arrow_desc_icon);
    }
    return anchor_elmt;
};
x.page.ListBase.Column.renderSortLink.doc = {
    purpose: "To render the heading content of a sortable column as an anchor with label text, which when clicked brings \
the column to the top of the sort order, or if already there reverses the sort direction; and represents the column's \
current position in the sort order as an arrow to the left of a corresponding opacity",
    args   : "th element (xmlstream) to put content into, label text string",
    returns: "anchor element (xmlstream)"
};


x.page.ListBase.Column.renderSortIcons = function (parent_elmt) {
    var sort_seq_asc,
        sort_seq_desc;
    x.log.functionStart("renderSortIcons", this, arguments);
    sort_seq_asc  = 0;
    sort_seq_desc = 0;
    if (typeof this.query_column.sort_seq === "number" && this.query_column.sort_seq < 3) {
        if (this.query_column.sort_desc) {
            sort_seq_desc = this.query_column.sort_seq + 1;
        } else {
            sort_seq_asc  = this.query_column.sort_seq + 1;
        }
    }
    parent_elmt.makeElement("a", "list_sort_asc_"  + this.owner.section.id + "_" + this.id, "css_cmd")
        .attr("title", "Sort Ascending")
        .makeElement("img")
            .attr("alt", "Sort Ascending")
            .attr("src", "../rsl_shared/style/icons/ico_sort_" + sort_seq_asc  + "_asc.png");
    parent_elmt.makeElement("a", "list_sort_desc_" + this.owner.section.id + "_" + this.id, "css_cmd")
        .attr("title", "Sort Descending")
        .makeElement("img")
            .attr("alt", "Sort Descending")
            .attr("src", "../rsl_shared/style/icons/ico_sort_" + sort_seq_desc + "_desc.png");
};
x.page.ListBase.Column.renderSortIcons.doc = {
    purpose: "To render the sort controls of a sortable column as two arrows, one up and one down, which when clicked \
bring the column to the top of the sort order, and whose icon represents the position in the sort order",
    args   : "th element (xmlstream) to put content into",
    returns: "nothing"
};


x.page.ListBase.Column.renderCell = function (row_elmt, render_opts, i, row_obj) {
    var cell_elmt;
    x.log.functionStart("renderCell", this, arguments);
    if (this.field) {
        cell_elmt = this.field.renderCell(row_elmt, render_opts);
    } else {
        cell_elmt = row_elmt.makeElement("td", this.css_class);
        if (this.text) {
            cell_elmt.text(this.text);
        }
    }
    return cell_elmt;
};
x.page.ListBase.Column.renderCell.doc = {
    purpose: "Generate HTML output for this column's cell in a table body row",
    args   : "parent xmlstream element object for the row, render_opts, column index number, generic object representing the row (e.g. a x.sql.Query or x.data.Entity object)",
    returns: "xmlstream element object for the cell, a td"
};


x.page.ListBase.Column.renderAdditionalRow = function (table_elmt, render_opts, i, row_obj, css_class) {
    var row_elmt,
        cell_elmt,
        css_type;
    x.log.functionStart("renderAdditionalRow", this, arguments);
    if (this.visible && this.separate_row && ((this.field && (this.field.getText() || this.field.isEditable())) || (!this.field && this.text))) {
        row_elmt = table_elmt.makeElement("tr", css_class);
        this.owner.section.rowURL(row_elmt);
        if (this.owner.section.allow_delete_rows) {
            row_elmt.makeElement("td", "css_col_control");            
        }
        row_elmt.makeElement("td");
        row_elmt.makeElement("td", "css_list_additional_row_label").text(this.label + ":");
        css_type  = (this.css_type || (this.field && this.field.css_type));
        cell_elmt = row_elmt.makeElement("td");
        if (css_type) {
            cell_elmt.addClass("css_type_" + css_type);
        }
        cell_elmt.attr("colspan", (this.owner.section.total_visible_columns - 2).toFixed(0));
//        cell_elmt.text(this.label + ":");
        if (this.field) {
            this.field.render(cell_elmt, render_opts);
        } else if (this.text) {
            cell_elmt.text(this.text);
        }
    }
    return cell_elmt;
};
x.page.ListBase.Column.renderAdditionalRow.doc = {
    purpose: "Generate HTML output for this column's cell in a table body row",
    args   : "table_elmt: parent xmlstream element object, render_opts, i: column index number, row_obj: row object",
    returns: "xmlstream element object for the cell, a td"
};


x.page.ListBase.Column.renderAggregation = function (row_elmt, render_opts, level, rows) {
    var cell_elmt,
        css_class = this.css_class,
        number_val;
    x.log.functionStart("renderAggregation", this, arguments);
    if (this.visible && !this.separate_row) {
        if (this.field) {
            css_class += " " + this.field.getCellCSSClass();
        }
        if (this.freeze) {
            css_class += " css_col_freeze";
        }
        cell_elmt = row_elmt.makeElement("td", css_class, this.id);
        number_val = null;
        if (this.aggregation === "C") {
            number_val = rows;
        } else if (this.aggregation === "S") {
            number_val = this.total[level];
        } else if (this.aggregation === 'A') {
            number_val = (this.total[level] / rows);
        }
        if (typeof number_val === "number") {
            if (isNaN(number_val)) {
                cell_elmt.text("n/a");
            } else if (this.field && typeof this.field.format === "function") {
                cell_elmt.text(this.field.format(number_val));
            } else {
                cell_elmt.text(number_val.toFixed(this.decimal_digits || 0));
            }
        }
    }
    return cell_elmt;
};
x.page.ListBase.Column.renderAggregation.doc = {
    purpose: "Generate HTML output for this column's cell in a total row",
    args   : "parent xmlstream element object for the row, render_opts",
    returns: "xmlstream element object for the cell, a td"
};


//To show up in Chrome debugger...
//@ sourceURL=page/ListBase.js