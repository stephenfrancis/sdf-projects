/*global  */
"use strict";

// jQuery extension...

jQuery.fn.extend({
    
    makeElement: function (tag, css_class, id) {
        var elmt;
        this.append("<" + tag + "/>");
        elmt = this.children(tag).last();
        if (css_class) {
            elmt.attr("class", css_class);
        }
        if (id) {
            elmt.attr("id"   , id);
        }
        return elmt;
    },

    makeAnchor: function (label, href, css_class, id, target) {
        var anchor_elmt = this.makeElement("a", css_class, id);
        if (href) {
            anchor_elmt.attr("href"  , href);
        }
        if (target) {
            anchor_elmt.attr("target", target);
        }
        anchor_elmt.text(label);
        return anchor_elmt;
    },

    makeUniIcon: function (icon, href, id) {
        var anchor_elmt = this.makeElement("a", "css_uni_icon", id);
        if (href) {
            anchor_elmt.attr("href", href);
        }
        anchor_elmt.html(icon);
        return anchor_elmt;
    },

    makeDropdownUL: function (control) {
        var ul_elmt = this.makeElement("ul", "dropdown-menu")
            .attr("role", "menu")
            .attr("aria-labelledby", control);
        return ul_elmt;
    },

    makeDropdownIcon: function (icon, tooltip) {
        var anchor_elmt = this.makeUniIcon(icon);
        anchor_elmt.addClass("dropdown-toggle");
        anchor_elmt.attr("role", "button");
        anchor_elmt.attr("data-toggle", "dropdown");
        anchor_elmt.attr("data-target", "#");
        if (tooltip) {
            anchor_elmt.attr("title", tooltip);
        }
        return anchor_elmt;
    },

    makeInput: function (type, css_class, id, value) {
        var input_elmt;
        this.append("<input type='" + type + "'/>");
        input_elmt = this.children(":input").last();
        if (css_class) {
            input_elmt.attr("class", css_class);
        }
        if (id) {
            input_elmt.attr("id"   , id);
        }
        if (value) {
            input_elmt.val(value);
        }
        return input_elmt;
    },

    makeOption: function (id, label, selected) {
        var elmt = this.makeElement("option");
        elmt.attr("value", id);
        elmt.text(label);
        if (selected) {
            elmt.attr("selected", "selected");
        }
        return elmt;
    },

    makeRadio: function (name, selected) {
        var input_elmt = this.makeElement("input");
        input_elmt.attr("name", name);
        input_elmt.attr("type", "radio");
        if (selected) {
            input_elmt.attr("selected", "selected");
        }
        return input_elmt;
    },

    makeRadioLabelSpan : function (name, id, label, selected) {
        var  span_elmt = this.makeElement("span", "css_attr_item", name),
            label_elmt;
        
        span_elmt.makeRadio(name + "_" + id, selected);
        label_elmt = span_elmt.makeElement("label");
        label_elmt.attr("for", name + "_" + id);
        label_elmt.text(label);
        return span_elmt;
    },

    makeCheckbox: function (name, checked) {
        var input_elmt = this.makeElement("input");
        input_elmt.attr("name", name);
        input_elmt.attr("type", "checkbox");
        if (checked) {
            input_elmt.attr("checked", "checked");
        }
        return input_elmt;
    },

    makeCheckboxLabelSpan : function (name, id, label, checked) {
        var  span_elmt = this.makeElement("span", "css_attr_item", name),
            label_elmt;
        
        span_elmt.makeCheckbox(name + "_" + id, checked);
        label_elmt = span_elmt.makeElement("label");
        label_elmt.attr("for", name + "_" + id);
        label_elmt.text(label);
        return span_elmt;
    },


});



var y = {};

y.session = x.ac.Session.clone({ user_id: "francis" });

/*
y.page = x.page.Page.clone({
    id: "Artificial",
    
});

y.page.sections.add({ id: "temp", type: "Section", title: "Wibble", text: "Wobble" });
*/

$(document).ready(function () {

    y.elements = {
        messages: $(".css_messages"),
        links   : $(".css_page_links"),
        tabs    : $(".css_page_tabs"),
        title   : $("#css_page_header_title"),
        descr   : $("#css_page_header_descr"),
        body    : $("#css_body")
    };

    y.page = y.session.getPage("sy.List.display", "pqrs", y.elements);
    y.page.render();
});



//To show up in Chrome debugger...
//@ sourceURL=style/client.js