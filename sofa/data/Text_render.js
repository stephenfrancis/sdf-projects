/*global x, java */
"use strict";


x.data.Text.render = function (parent_elmt, render_opts) {
    var div_elmt;
    x.log.functionStart("render", this, arguments);
    div_elmt = parent_elmt.makeElement("div", this.getCSSClass());
    if (!this.validated) {
        this.validate();
    }
    this.renderInner(div_elmt, render_opts);
    return div_elmt;
};
x.data.Text.render.doc = {
    purpose: "To add the necessary HTML to the element XmlStream to render this field according to its properties - if it is \
editable, it calls renderEditable(), addClientSideProperties() and (if !isError()) renderErrors(), otherwise it calls \
renderUneditable()",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'div' element created by this function"
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
    this.renderInner(inner_elmt, render_opts);
    return div_elmt;
};
x.data.Text.renderControlGroup.doc = {
    purpose: "To render this field as a Twitter-Bootstrap Control Group",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'div' element created by this function"
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
x.data.Text.renderFormFluid.doc = {
    purpose: "To render this field in a form",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'div' element created by this function"
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
x.data.Text.renderCell.doc = {
    purpose: "To render a <td> element and its content, by calling render(), to be a list cell",
    args   : "the XmlStream object representing the parent tr element to which this td should be rendered, and render_opts",
    returns: "the XmlStream object representing the td element"
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
x.data.Text.renderLabel.doc = {
    purpose: "To render the label of this field, with a 'for' attribute to the control, and a tooltip if 'description' is given",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'label' element created by this function"
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
x.data.Text.renderEditable.doc = {
    purpose: "To render an editable control for this field",
    args   : "the XmlStream object representing the parent div element to which this control should be rendered, and render_opts",
    returns: "the XmlStream object representing the control (e.g. input)"
};


x.data.Text.getEditableSizeCSSClass = function (render_opts) {
    return render_opts.tb_input || this.tb_input || (this.owner && this.owner.tb_input);
};
x.data.Text.getEditableSizeCSSClass.doc = {
    purpose: "To return the string CSS class for the editable input control for this field",
    args   : "render_opts",
    returns: "string, being tb_input property in render_opts, or else tb_input property of this field, or else tb_input property of owner"
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
x.data.Text.renderUneditable.doc = {
    purpose: "To render an uneditable representation of this field into a parent div element, setting val and style attributes first, optionally an anchor link, and text",
    args   : "the XmlStream object representing the parent div element to which this control should be rendered, and render_opts",
    returns: "nothing"
};


x.data.Text.renderNavOptions = function (parent_elmt, render_opts, inside_table) {
    x.log.functionStart("renderNavOptions", this, arguments);
};
x.data.Text.renderNavOptions.doc = {
    purpose: "Does nothing for most fields; for a Reference field, renders a drop-down set of context menu options",
    args   : "the XmlStream object representing the parent div element to which this control should be rendered, and render_opts",
    returns: "nothing"
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
x.data.Text.renderErrors.doc = {
    purpose: "To render message text as a span element with a 'help-inline' CSS class",
    args   : "the XmlStream object representing the parent element to which this span should be rendered, and render_opts",
    returns: "text"
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
x.data.Text.getCSSClass.doc = {
    purpose: "To get the string of CSS classes to use in HTML class attribute for the field",
    args   : "none",
    returns: "css class string"
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
x.data.Text.getCSSClass.doc = {
    purpose: "To get the string of CSS classes to use in HTML class attribute for the table cell",
    args   : "none",
    returns: "css class string"
};


x.data.Text.getUneditableCSSStyle = function () {
    return null;
};
x.data.Text.getUneditableCSSStyle.doc = {
    purpose: "To get the string of a CSS style attribute for this field when uneditable",
    args   : "none",
    returns: "string CSS style, or null"
};



// Used in Reference and File
x.data.Text.renderDropdownDiv = function (parent_elmt, tooltip) {
    var div_elmt,
         ul_elmt;
    x.log.functionStart("renderDropdownDiv", this, arguments);
    div_elmt = parent_elmt.makeElement("div", "dropdown");
    div_elmt.makeDropdownIcon(this.nav_dropdown_icon, tooltip);
    ul_elmt = div_elmt.makeDropdownUL(control);
    return ul_elmt;
};

//To show up in Chrome debugger...
//@ sourceURL=data/Text_render.js