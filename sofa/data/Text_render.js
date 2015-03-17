/*global x, java */
"use strict";



x.data.Text.change = function (control_id, val) {
    console.log(this + " change: " + control_id + ", " + val);
    this.set(val);
};

x.data.Text.render = function (parent_elmt, render_opts) {
    var div_elmt;
    x.log.functionStart("render", this, arguments);
    div_elmt = parent_elmt.makeElement("div", this.getCSSClass());
    div_elmt.data("bind_object", this);
    if (!this.validated) {
        this.validate();
    }
    this.renderInner(div_elmt, render_opts);
    return div_elmt;
};


x.data.Text.renderControlGroup = function (parent_elmt, render_opts) {
    var   div_elmt,
        inner_elmt;
    x.log.functionStart("renderControlGroup", this, arguments);
    div_elmt = parent_elmt.makeElement("div", "control-group" + (this.isValid() ? "" : " error"));
    this.renderLabel(div_elmt, render_opts);
    if (!this.validated) {
        this.validate();
    }
    inner_elmt = div_elmt.makeElement("div", "controls " + this.getCSSClass());
    inner_elmt.data("bind_object", this);
    this.renderInner(inner_elmt, render_opts);
    return div_elmt;
};


x.data.Text.renderFormFluid = function (parent_elmt, render_opts) {
    var   div_elmt,
        label_elmt;
    x.log.functionStart("renderFormFluid", this, arguments);
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
    if (!this.validated) {
        this.validate();
    }
//    this.renderUneditable(div, render_opts);
    div_elmt = div_elmt.makeElement("div", "css_disp");
    this.renderInner(div_elmt, render_opts);
    return div_elmt;
};


x.data.Text.renderCell = function (row_elmt, render_opts) {
    var cell_elmt,
        div_elmt;
    x.log.functionStart("renderCell", this, arguments);
    cell_elmt =  row_elmt.makeElement("td" , this.getCellCSSClass());
     div_elmt = cell_elmt.makeElement("div", this.getCSSClass());
    if (!this.validated) {
        this.validate();
    }
    this.renderInner(div_elmt, render_opts);
    return cell_elmt;
};


x.data.Text.renderLabel = function (div_elmt, render_opts) {
    var label_elmt;
    x.log.functionStart("renderLabel", this, arguments);
    label_elmt = div_elmt.makeElement("label", "control-label");
    label_elmt.text(this.label);
    if (this.description) {
        label_elmt.makeUniIcon(this.hover_text_icon)
            .attr("rel"  , "tooltip")
            .attr("title", this.description);
    }
    return label_elmt;
};


x.data.Text.renderInner = function (div_elmt, render_opts) {
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
};


x.data.Text.renderEditable = function (div_elmt, render_opts, inside_table) {
    var input_elmt;
    x.log.functionStart("renderEditable", this, arguments);
    input_elmt = div_elmt.makeInput(this.input_type, this.getEditableSizeCSSClass(render_opts),
        this.getControl(), this.getUpdateText());
    if (this.placeholder || this.helper_text) {
        input_elmt.attr("placeholder", (this.placeholder || this.helper_text));
    }
    return input_elmt;
};


x.data.Text.getEditableSizeCSSClass = function (render_opts) {
    return render_opts.tb_input || this.tb_input || (this.owner && this.owner.tb_input);
};

/**
 * Possibilities to support:
 * - simple text
 * - text + single link (internal, external, email address)
 * - text + multiple links as drop-down
 * - text with decoration icon (with or without link)
 * - decoration icon instead of text (with or without link)
 */

x.data.Text.renderUneditable = function (elmt, render_opts, inside_table) {
    var url,
        style,
        text,
        nav_options = 0;

    x.log.functionStart("renderUneditable", this, arguments);
    if (!this.validated) {
        this.validate();
    }
    if (this.getText() !== this.val) {
        elmt.attr("val", this.val);
    }
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
};


x.data.Text.renderNavOptions = function (parent_elmt, render_opts, inside_table) {
    x.log.functionStart("renderNavOptions", this, arguments);
};


x.data.Text.renderErrors = function (parent_elmt, render_opts, inside_table) {
    var span_elmt,
        text = "",
        delim = "";
    x.log.functionStart("renderErrors", this, arguments);
    span_elmt = parent_elmt.makeElement("span", "help-inline");
    this.messages.forOwn(function (i, msg) {
        text += delim + msg.text;
        delim = ", ";
    });
    x.log.debug(this, "Error text for field " + this.toString() + " = " + text);
    span_elmt.text(text);
    return text;
};


x.data.Text.getCSSClass = function () {
    var css_class;
    x.log.functionStart("getCSSClass", this, arguments);
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
};


x.data.Text.getCellCSSClass = function () {
    var css_class;
    x.log.functionStart("getCellCSSClass", this, arguments);
    css_class = "control-group css_type_" + this.css_type;
    if (this.css_align) {
        css_class += " css_align_" + this.css_align;
    }
    return css_class;
};


x.data.Text.getUneditableCSSStyle = function () {
    return null;
};



// Used in Reference and File
x.data.Text.renderDropdownDiv = function (parent_elmt, tooltip) {
    var div_elmt,
         ul_elmt;
    x.log.functionStart("renderDropdownDiv", this, arguments);
    div_elmt = parent_elmt.makeElement("div", "dropdown");
    div_elmt.makeDropdownIcon(this.nav_dropdown_icon, tooltip);
    ul_elmt = div_elmt.makeDropdownUL(this.getControl());
    return ul_elmt;
};

//To show up in Chrome debugger...
//@ sourceURL=data/Text_render.js