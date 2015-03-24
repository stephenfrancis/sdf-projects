/*jslint node: true */
/*globals define */
"use strict";


define(["../base/Base", "../base/Log"], function (Base, Log) {

    var obj = Base.clone({

        id              : "Text",
        type            : "Text",               // {string} What type of field to create
        label           : null,                 // {string} The text label for fields in forms and headings of columns
        description     : null,                 // {string} Tooltop text

        val             : "",                   // {string} Internal value of field, use get()
        orig_val        : "",
        prev_val        : "",
        default_val     : null,                 // Initial value of field when a new record is created (used by Entity.setDefaultVals()

        visible         : true,                 // Whether or not this field should be visible in a Section
        editable        : true,                 // Whether or not this field should be editable in a Section (provided fixed_key is false and the FieldSet it belongs to is modifiable)
        mandatory       : false,                // Whether or not this field is required in a record

        search_oper_list: "sy.search_oper_list_text",       // LoV to use for filter criterion operators in the Search section
        dflt_search_oper: null,                 // Filter criterion operator applied immediately and whenever 'Reset' is clicked
        auto_search_oper: "CO",                 // Filter criterion operator that activates automatically when a value is selected
        search_filter   : "Filter",

        input_type      : "text",               // {string} value of 'type' attribute of input element
          url_pattern   : null,                 // {string} Tokenized string for rendering a link if field is uneditable
         text_pattern   : "{val}",              // {string} Tokenized string for creating the text representation of a value
        regex_pattern   : null,                 // {string} Regex pattern for validation
        regex_message   : null,                 // {string} Error message to use if regex validation fails

        tb_input_list   : "input-medium",       // Twitter-Bootstrap CSS class controlling editable input size in lists
        tb_span         : 3,                    // Twitter-Bootstrap CSS class (with 'span' prefix added) controlling uneditable space given in forms
        icon            : null,                 // {string} Path to image file to render an icon if field is uneditable
        unicode_icon    : "&#x25B7;",
        unicode_icon_class: "css_uni_icon",
        button_class    : null,                 // Allows a URL field link to appear as a button based on bootstrap classes. (Icon takes precedent over this property)
        nav_dropdown_icon: "<b class='caret'></b>",
        hover_text_icon : "&#x24D8;",
        css_reload      : false,                // CSS reload marker class string (set to 'page' to add 'css_reload' as a CSS class to the field)

        text            : null,                 // Internal cache of display text representation of field value, use getText()
        url             : null,
        valid           : true,                 // private - currently valid value, or not?
        error_msg       : null,                 // private - error message text
        modified        : false,                // private - modified since original value, or not?
        fixed_key       : false,                // Indicates that this is a populated key field which corresponds to a database record, hence cannot be changed, set by x.data.Entity.populate()
        types           : {},                   // private - register of descendants of this object

        purpose         : "To represent a basic unit of textual information, how it is captured, validated, stored in the database, and represented on screen",


        // add direct descendants to register
        clone : function (spec) {
            var new_obj = Base.clone.call(this, spec);
            if (typeof spec.type === "boolean") {
                if (this.types[spec.id]) {
                    throw new Error("type already registered: " + spec.id);
                }
                this.types[spec.id] = new_obj;
            }
            return new_obj;
        },

        // called when cloned on a FieldSet that has instance = true
        instantiate : function () {
            return undefined;
        },

/**
* @return {string} this field's val property - should always be used instead of accessing val directly
*/
        get : function () {
            return this.val;
        },

/**
* To get a numerical representation of this field's value
* @param {number} Default value to use if this field's value is not a number
* @return {number} Number value of field (if the value can be interpreted as numeric), or the default value argument (if numeric) or undefined
*/
        getNumber : function (def_val) {
            var number_val;
            number_val = parseFloat(this.get());
            if (isNaN(number_val) && typeof def_val === "number" ) {
                number_val = def_val;
            }
            return number_val;
        },

/*
* To indicate whether or not this field's value is blank
* @return {boolean} True if this field's value is blank (i.e. empty string) otherwise false
*/
        isBlank : function (val) {
            if (typeof val !== "string") {
                val = this.get();
            }
            return !val;
        },

/*
* To set the initial value of this field - called by Entity.setInitial()
* @param {string} Initial string value to set
*/ 
        setInitial : function (new_val) {
            if (typeof new_val !== "string") {
                throw new Error("argument is not a string: " + new_val);
            }
            this.val       = new_val;
            this.text      = null;
            this.orig_val  = new_val;
            this.prev_val  = new_val;
            this.valid     = true;
            this.error_msg = null;
        },

/**
* To set this field's value to the string argument specified, returning false if no change, otherwise calling owner.beforeFieldChange() and this.beforeChange() before making the change, then owner.afterFieldChange() and this.afterChange() then returning true
* @param {string} new value to set this field to
* @return {boolean} True if this field's value is changed, and false otherwise
*/
        set : function (new_val) {
            var old_val = this.val,
            changed = this.setInternal(new_val);
            if (changed) {
                Log.trace(this, "setting " + this.getId() + " from '" + old_val + "' to '" + new_val + "'");
            }
            return changed;
        },


        setInternal : function (new_val) {
            var old_val;
            old_val       = this.val;
            this.prev_val = this.val;            // to support isChangedSincePreviousUpdate()
            if (typeof new_val !== "string") {
                throw new Error("argument is not a string: " + new_val);
            }
            if (this.fixed_key) {
                throw new Error("trying to change a fixed key");
            }
            if (new_val === this.val) {
                return false;
            }
            if (this.owner && this.owner.beforeFieldChange) {
                this.owner.beforeFieldChange(this, new_val);            // May throw an error
            }
            this.beforeChange(new_val);
            if (this.owner && this.owner.trans && this.beforeTransChange) {
                this.beforeTransChange(this, new_val);            // May throw an error
            }
            this.val  = new_val;
            this.text = null;
            this.modified  = true;
        //    this.valid     = true;
            this.validate();
            if (this.owner && this.owner.afterFieldChange) {
                this.owner.afterFieldChange(this, old_val);
            }
            this.afterChange(old_val);
            if (this.owner && this.owner.trans && this.afterTransChange) {
                this.afterTransChange(this, old_val);            // May throw an error
            }
            return true;
        },


        beforeChange : function (new_val) {
            return undefined;
        },


        beforeTransChange : function (new_val) {
            return undefined;
        },


        afterChange : function (old_val) {
            return undefined;
        },


        afterTransChange : function (old_val) {
            return undefined;
        },


        setProperty : function (name, val) {
            if (name === "id") {
                throw new Error ("can't change id property");
            }
            if (name === "type") {
                throw new Error("can't change type property");
            }
            this[name] = val;
            this.validate();
        },


        getKeyPieces : function () {
            return 1;
        },


        isKey : function () {
            if (this.owner && this.owner.isKey) {
                return this.owner.isKey(this.getId());
            }
            return false;
        },


        validate : function () {                    // validate() also responsible for setting text
            this.text = this.getTextFromVal();
            this.url  = this. getURLFromVal();
            this.valid     = true;
            this.error_msg = null;
            if (this.mandatory && !this.val) {
                this.setError("mandatory");
            }
            if (this.val && this.regex_pattern && !(this.val.match(new RegExp(this.regex_pattern)))) {
                this.setError(this.regex_message || "match pattern");
            }
            if (this.val && this.enforce_unique) {
                if (this.checkUnique(this.val)) {
                    this.setError("Another record has this value");
                }
            }
        },


        setError : function (message) {
            this.valid = false;
            this.error_msg = message;
        },


        isValid : function () {
            return this.valid;
        },


        isModified : function () {
            return this.modified;
        },


        getTextFromVal : function () {
            var out = this.val;
            return out;
        },


        getText : function () {
            return this.text;
        },


        getURLFromVal : function () {
            return "";
        },        


        getURL : function () {
            return this.url;
        },


        getUpdateText : function () {
            return this.val;
        },


        isEditable : function () {
            return this.editable && !this.fixed_key && (!this.owner || this.owner.modifiable);
        },


        isVisible : function (field_group, hide_blank_uneditable) {
            return this.visible && (this.accessible !== false) &&
                    (!field_group || !this.field_group || field_group === this.field_group) &&
                    (!this.hide_if_no_link || this.getURL()) &&
                    ((this.editable && this.owner && this.owner.modifiable) || !this.isBlank() || !hide_blank_uneditable);
        },


        setVisEdMand : function (visible_editable, mandatory) {
            if (visible_editable && !this.visible && this.isBlank() && this.default_val) {
                this.set(this.default_val);
            }
            this.visible   = visible_editable;
            this.editable  = visible_editable;
            this.mandatory = visible_editable && mandatory;
            if (!visible_editable) {
                this.set("");
            }
            this.validate();
        },


        getData : function (obj) {
            if (!this.isBlank()) {
                obj[this.id] = this.get();
            }
        },


        getTokenValue : function (token_parts) {
            var out;
            if (token_parts.length > 3 && token_parts[3]) {
                if (token_parts[3] === "val") {
                    out = this.get();
                } else if (token_parts[3] === "text") {
                    out = this.getText();
                } else if (parseInt(token_parts[3], 10) > 0) {
                    out = this.getText().substr(0, parseInt(token_parts[3], 10)) + "...";
                } else {
                    out = "[invalid token modifier: " + token_parts[3] + "]";
                }
            } else {
                out = this.getText();
            }
            return out;
        },


        fieldEvent : function (event_id, new_val) {
            this.set(new_val);
            this.renderInner();
        },


        change : function (control_id, val) {
            this.set(val);
        },

        render : function (parent_elmt, render_opts) {
            var div_elmt;
            div_elmt = parent_elmt.makeElement("div", this.getCSSClass());
            div_elmt.data("bind_object", this);
            this.renderInner(div_elmt, render_opts);
            return div_elmt;
        },


        renderControlGroup : function (parent_elmt, render_opts) {
            var   div_elmt,
                inner_elmt;

            div_elmt = parent_elmt.makeElement("div", "control-group" + (this.isValid() ? "" : " error"));
            this.renderLabel(div_elmt, render_opts);
            inner_elmt = div_elmt.makeElement("div", "controls " + this.getCSSClass());
            inner_elmt.data("bind_object", this);
            this.renderInner(inner_elmt, render_opts);
            return div_elmt;
        },


        renderFormFluid : function (parent_elmt, render_opts) {
            var   div_elmt,
                label_elmt;
            div_elmt = parent_elmt.makeElement("div", "span" + this.tb_span + " " + this.getCSSClass());
            if (this.description) {
                label_elmt = div_elmt.makeElement("a", "css_label");
                label_elmt.attr("rel", "tooltip");
                label_elmt.attr("title", this.description);
                label_elmt.text(this.label);
            } else {
                div_elmt.makeElement("span", "css_label")
                    .text(this.label);
            }
        //    this.renderUneditable(div, render_opts);
            div_elmt = div_elmt.makeElement("div", "css_disp");
            this.renderInner(div_elmt, render_opts);
            return div_elmt;
        },


        renderCell : function (row_elmt, render_opts) {
            var cell_elmt,
                div_elmt;
            cell_elmt =  row_elmt.makeElement("td" , this.getCellCSSClass());
             div_elmt = cell_elmt.makeElement("div", this.getCSSClass());
            this.renderInner(div_elmt, render_opts);
            return cell_elmt;
        },


        renderLabel : function (div_elmt, render_opts) {
            var label_elmt;
            label_elmt = div_elmt.makeElement("label", "control-label");
            label_elmt.text(this.label);
            if (this.description) {
                label_elmt.makeUniIcon(this.hover_text_icon)
                    .attr("rel"  , "tooltip")
                    .attr("title", this.description);
            }
            return label_elmt;
        },


        renderInner : function (div_elmt, render_opts) {
            if (div_elmt) {
                this.inner_div_elmt = div_elmt;
            }
            if (!this.inner_div_elmt) {
                throw new Error("no inner_div");
            }
            if (!render_opts) {
                render_opts = {};
            }
            this.inner_div_elmt.empty();
            if (this.isEditable() && !render_opts.uneditable) {
                this.renderEditable(this.inner_div_elmt, render_opts);
                if (!this.isValid()) {
                    this.renderErrors(this.inner_div_elmt, render_opts);
                }
            } else {
                this.renderUneditable(this.inner_div_elmt, render_opts);
            }
        },


        renderEditable : function (div_elmt, render_opts, inside_table) {
            var input_elmt;
            input_elmt = div_elmt.makeInput(this.input_type, this.getEditableSizeCSSClass(render_opts),
                this.getControl(), this.getUpdateText());
            if (this.placeholder || this.helper_text) {
                input_elmt.attr("placeholder", (this.placeholder || this.helper_text));
            }
            return input_elmt;
        },


        getEditableSizeCSSClass : function (render_opts) {
            return render_opts.tb_input || this.tb_input || (this.owner && this.owner.tb_input);
        },

        /**
         * Possibilities to support:
         * - simple text
         * - text + single link (internal, external, email address)
         * - text + multiple links as drop-down
         * - text with decoration icon (with or without link)
         * - decoration icon instead of text (with or without link)
         */

        renderUneditable : function (elmt, render_opts, inside_table) {
            var url,
                style,
                text,
                nav_options = 0;

            style = this.getUneditableCSSStyle();
            if (style) {
                elmt.attr("style", style);
            }
            url  = this.getURL();
            text = this.getText();
            if (render_opts.dynamic_page !== false) {
                nav_options = this.renderNavOptions(elmt, render_opts);
            }
            if (url && !nav_options && render_opts.show_links !== false) {
                elmt = elmt.makeElement("a");
                elmt.attr("href", url);
                if (this.url_target) {
                    elmt.attr("target", this.url_target);
                }
                if (this.unicode_icon) {
                    elmt.makeUniIcon(this.unicode_icon);
                } else if (this.button_class) {            // Render URL Field as button
                    elmt.addClass(this.button_class);
                }
                if (this.url_link_text && !this.isBlank()) {
                    text = this.url_link_text;
                }
            }
            if (text) {
                if (this.decoration_icon) {
                    elmt.html(this.decoration_icon);
                }
                elmt.text(text);
            }
        },


        renderNavOptions : function (parent_elmt, render_opts, inside_table) {
            return undefined;
        },


        renderErrors : function (parent_elmt, render_opts, inside_table) {
            var span_elmt;
            span_elmt = parent_elmt.makeElement("span", "help-inline");
            span_elmt.text(this.error_msg);
        },


        getCSSClass : function () {
            var css_class;
            css_class = "css_type_" + this.css_type;
            if (!this.isValid()) {
                css_class += " error";
            }
            if (this.isEditable()) {
                css_class += " css_edit";
                if (this.mandatory) {
                    css_class += " css_mand";
                }
            }
            if (!this.visible) {
                css_class += " css_hidden";
            }
            if (this.css_reload) {
                css_class += " css_reload";
            }
            if (this.css_richtext) {
                css_class += " css_richtext";
            }
            return css_class;
        },


        getCellCSSClass : function () {
            var css_class;
            css_class = "control-group css_type_" + this.css_type;
            if (this.css_align) {
                css_class += " css_align_" + this.css_align;
            }
            return css_class;
        },


        getUneditableCSSStyle : function () {
            return null;
        },


        // Used in Reference and File
        renderDropdownDiv : function (parent_elmt, tooltip) {
            var div_elmt,
                 ul_elmt;

            div_elmt = parent_elmt.makeElement("div", "dropdown");
            div_elmt.makeDropdownIcon(this.nav_dropdown_icon, tooltip);
            ul_elmt = div_elmt.makeDropdownUL(this.getControl());
            return ul_elmt;
        }


    });     // end of clone()

    // self-register as a type
    obj.types.Text = obj;

    return obj;
});     // end of define()

//To show up in Chrome debugger...
//@ sourceURL=data/Text.js