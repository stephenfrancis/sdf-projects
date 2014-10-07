/*global x, java */
"use strict";


x.fields.Text.render = function (element, render_opts) {
    var div;
    x.log.functionStart("render", this, arguments);
    div = element.addChild("div", null, this.getCSSClass());
    if (!this.validated) {
        this.validate();
    }
    this.renderInner(div, render_opts);
    return div;
};
x.fields.Text.render.doc = {
    purpose: "To add the necessary HTML to the element XmlStream to render this field according to its properties - if it is \
editable, it calls renderEditable(), addClientSideProperties() and (if !isError()) renderErrors(), otherwise it calls \
renderUneditable()",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'div' element created by this function"
};


x.fields.Text.renderControlGroup = function (element, render_opts) {
    var div,
        inner;
    x.log.functionStart("renderControlGroup", this, arguments);
    div = element.addChild("div", null, "control-group" + (this.isValid() ? "" : " error"));
    this.renderLabel(div, render_opts);
    if (!this.validated) {
        this.validate();
    }
    inner = div.addChild("div", null, "controls " + this.getCSSClass());
    this.renderInner(inner, render_opts);
    return div;
};
x.fields.Text.renderControlGroup.doc = {
    purpose: "To render this field as a Twitter-Bootstrap Control Group",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'div' element created by this function"
};


x.fields.Text.renderFormFluid = function (element, render_opts) {
    var div,
        label_elem;
    x.log.functionStart("renderFormFluid", this, arguments);
    div = element.addChild("div", null, "span" + this.tb_span + " " + this.getCSSClass());
    if (this.description) {
        label_elem = div.addChild("a", null, "css_label");
        label_elem.attribute("rel", "tooltip");
        label_elem.attribute("title", this.description);
        label_elem.addText(this.label);
    } else {
        div.addChild("span", null, "css_label", this.label);
    }
    if (!this.validated) {
        this.validate();
    }
//    this.renderUneditable(div, render_opts);
    div = div.addChild("div", null, "css_disp");
    this.renderInner(div, render_opts);
    return div;
};
x.fields.Text.renderFormFluid.doc = {
    purpose: "To render this field in a form",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'div' element created by this function"
};


x.fields.Text.renderCell = function (row_elem, render_opts) {
    var cell_elem,
        div;
    x.log.functionStart("renderCell", this, arguments);
    cell_elem = row_elem.addChild("td", null, this.getCellCSSClass());
    div = cell_elem.addChild("div", null, this.getCSSClass());
    if (!this.validated) {
        this.validate();
    }
    this.renderInner(div, render_opts);
    return cell_elem;
};
x.fields.Text.renderCell.doc = {
    purpose: "To render a <td> element and its content, by calling render(), to be a list cell",
    args   : "the XmlStream object representing the parent tr element to which this td should be rendered, and render_opts",
    returns: "the XmlStream object representing the td element"
};


x.fields.Text.renderLabel = function (div, render_opts) {
    var elmt,
        elmt_a;
    x.log.functionStart("renderLabel", this, arguments);
    elmt = div.addChild("label", null, "control-label");
//    elmt.attribute("for", this.getControl());
    if (this.description) {
        elmt_a = elmt.addChild("a");
        elmt_a.attribute("rel"  , "tooltip");
        elmt_a.attribute("title", this.description);
        elmt_a.attribute("class", "css_uni_icon");
        elmt_a.addText(this.hover_text_icon, true);
    }
    elmt.addText(this.label);
    return elmt;
};
x.fields.Text.renderLabel.doc = {
    purpose: "To render the label of this field, with a 'for' attribute to the control, and a tooltip if 'description' is given",
    args   : "the XmlStream object representing the parent element to which this field should be rendered, and render_opts",
    returns: "the XmlStream object representing the 'label' element created by this function"
};



x.fields.Text.renderInner = function (div, render_opts) {
    if (div) {
        this.inner_div = div;
    }
    if (!this.inner_div) {
        throw new Error("no inner_div");
    }
    if (!render_opts) {
        render_opts = {};
    }
    this.inner_div.empty();
    if (this.isEditable() && !render_opts.uneditable) {
        this.renderEditable(this.inner_div, render_opts);
        if (!this.isValid()) {
            this.renderErrors(this.inner_div, render_opts);
        }
    } else {
        this.renderUneditable(this.inner_div, render_opts);
    }
};


x.fields.Text.renderEditable = function (div, render_opts, inside_table) {
    var str;
    x.log.functionStart("renderEditable", this, arguments);
    str = "<input type='" + this.input_type + "' class='" + this.getEditableSizeCSSClass(render_opts) +
        "' value='" + this.getUpdateText() + "' id='" + this.getControl();
    if (this.placeholder || this.helper_text) {
        str += "' placeholder='" + (this.placeholder || this.helper_text);
    }
    str += "' />";
    div.addHTML(str);
};
x.fields.Text.renderEditable.doc = {
    purpose: "To render an editable control for this field",
    args   : "the XmlStream object representing the parent div element to which this control should be rendered, and render_opts",
    returns: "the XmlStream object representing the control (e.g. input)"
};


x.fields.Text.getEditableSizeCSSClass = function (render_opts) {
    return render_opts.tb_input || this.tb_input || (this.owner && this.owner.tb_input);
};
x.fields.Text.getEditableSizeCSSClass.doc = {
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

x.fields.Text.renderUneditable = function (elem, render_opts, inside_table) {
    var url,
        style,
        text,
        nav_options = 0;

    x.log.functionStart("renderUneditable", this, arguments);
    if (!this.validated) {
        this.validate();
    }
    if (this.getText() !== this.val) {
        elem.attribute("val", this.val);
    }
    style = this.getUneditableCSSStyle();
    if (style) {
        elem.attribute("style", style);
    }
    url  = this.getURL();
    text = this.getText();
    if (render_opts.dynamic_page !== false) {
        nav_options = this.renderNavOptions(elem, render_opts);
    }
    if (url && !nav_options && render_opts.show_links !== false) {
        elem = elem.addChild("a");
        elem.attribute("href", url);
        if (this.url_target) {
            elem.attribute("target", this.url_target);
        }
        if (this.unicode_icon) {
            elem.addChild("span", null, this.unicode_icon_class).addText(this.unicode_icon, true);
        } else if (this.button_class) {            // Render URL Field as button
            elem.attribute("class", this.button_class);
        }
        if (this.url_link_text && !this.isBlank()) {
            text = this.url_link_text;
        }
    }
    if (text) {
        if (this.decoration_icon) {
            elem.addText(this.decoration_icon, true);
        }
//        if (this.icon) {
//            elem.addChild("img")
//                .attribute("alt", this.icon_alt_text || text)
//                .attribute("src", this.icon);
//        }
        elem.addText(text);
    }
};
x.fields.Text.renderUneditable.doc = {
    purpose: "To render an uneditable representation of this field into a parent div element, setting val and style attributes first, optionally an anchor link, and text",
    args   : "the XmlStream object representing the parent div element to which this control should be rendered, and render_opts",
    returns: "nothing"
};


x.fields.Text.renderNavOptions = function (parent_elem, render_opts, inside_table) {
    x.log.functionStart("renderNavOptions", this, arguments);
};
x.fields.Text.renderNavOptions.doc = {
    purpose: "Does nothing for most fields; for a Reference field, renders a drop-down set of context menu options",
    args   : "the XmlStream object representing the parent div element to which this control should be rendered, and render_opts",
    returns: "nothing"
};


x.fields.Text.renderErrors = function (span, render_opts, inside_table) {
    var elem,
        text = "",
        delim = "";
    x.log.functionStart("renderErrors", this, arguments);
    elem = span.addChild("span", null, "help-inline");
    this.messages.forOwn(function (i, msg) {
        text += delim + msg.text;
        delim = ", ";
    });
    x.log.debug(this, "Error text for field " + this.toString() + " = " + text);
    elem.addText(text);
    return text;
};
x.fields.Text.renderErrors.doc = {
    purpose: "To render message text as a span element with a 'help-inline' CSS class",
    args   : "the XmlStream object representing the parent element to which this span should be rendered, and render_opts",
    returns: "text"
};


x.fields.Text.getCSSClass = function () {
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
x.fields.Text.getCSSClass.doc = {
    purpose: "To get the string of CSS classes to use in HTML class attribute for the field",
    args   : "none",
    returns: "css class string"
};


x.fields.Text.getCellCSSClass = function () {
    var css_class;
    x.log.functionStart("getCellCSSClass", this, arguments);
    css_class = "control-group css_type_" + this.css_type;
    if (this.css_align) {
        css_class += " css_align_" + this.css_align;
    }
    return css_class;
};
x.fields.Text.getCSSClass.doc = {
    purpose: "To get the string of CSS classes to use in HTML class attribute for the table cell",
    args   : "none",
    returns: "css class string"
};


x.fields.Text.getUneditableCSSStyle = function () {
    return null;
};
x.fields.Text.getUneditableCSSStyle.doc = {
    purpose: "To get the string of a CSS style attribute for this field when uneditable",
    args   : "none",
    returns: "string CSS style, or null"
};



// Used in Reference and File
x.fields.Text.renderDropdownDiv = function (parent_elem, tooltip) {
    var div_elem,
        a_elem,
        ul_elem;
    x.log.functionStart("renderDropdownDiv", this, arguments);
    div_elem = parent_elem.addChild("div", null, "dropdown");
    a_elem = div_elem.addChild("a", null, "dropdown-toggle css_uni_icon");
    a_elem.attribute("role", "button");
    a_elem.attribute("data-toggle", "dropdown");
    a_elem.attribute("data-target", "#");
    if (tooltip) {
        a_elem.attribute("title", tooltip);
    }
    a_elem.addText(this.nav_dropdown_icon, true);
    ul_elem = div_elem.addChild("ul", null, "dropdown-menu")
        .attribute("role", "menu")
        .attribute("aria-labelledby", control);
    return ul_elem;
};

//To show up in Chrome debugger...
//@ sourceURL=da/Text_render.js