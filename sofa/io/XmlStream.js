/*global x, java, Packages*/
"use strict";


x.XmlStream = x.Base.clone({
    id                      : "XmlStream",
    level                   : 0,
     left_bracket_subst     : "≤",       // for XML substitution
    right_bracket_subst     : "≥",       // for XML substitution
});
x.XmlStream.doc = {
    location                : "x",
    file                    : "$Header: /rsl/rsl_app/core/xml/XmlStream.js,v 1.19 2014/07/30 16:23:33 greenwom Exp $",
    purpose                 : "To support a streamed out of XML character data",
    properties              : {
        name                : { label: "String XML element name", type: "string", usage: "required in spec" },
        level               : { label: "Depth in the XML tree, starting at 0, computed", type: "number", usage: "read only" },
        curr_child          : { label: "Child XmlStream object which is currently open - will be closed if this element is closed", type: "x.XmlStream", usage: "use methods only" }
    }
};

x.XmlStream. left_bracket_regex = new RegExp(x.XmlStream. left_bracket_subst, "g");
x.XmlStream.right_bracket_regex = new RegExp(x.XmlStream.right_bracket_subst, "g");



x.XmlStream.attribute = function (attr, value, valid_xml_content) {
    x.log.functionStart("attribute", this, arguments);
    if (typeof attr !== "string") {
        throw x.Exception.clone({ id: "attr_must_be_a_string" , xml_stream: this.id });
    }
    if (typeof value !== "string") {
        throw x.Exception.clone({ id: "value_must_be_a_string", xml_stream: this.id, attribute: attr });
    }
    if (!valid_xml_content) {
        value = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    this.jquery_elem.attr(attr, value);
    return this;                // allow cascade
};
x.XmlStream.attribute.doc = {
    purpose   : "To add an attribute into the last added child.",
    args      : "String attribute to add into the last child, String value of the attribute, Boolean valid_xml_content to enable the value escaping",
    returns   : "x.XmlStream object",
    exceptions: "attr_must_be_a_string if the input attribute is not a String, value_must_be_a_string if the input value is not a string, after_child_output if there isn't a child where add the attribute"
};

x.XmlStream.addChild = function (name, id, css_class, text) {
    x.log.functionStart("addChild", this, arguments);
    this.curr_child = this.clone({ id: name, parent: this, name: name, level: this.level + 1});
    this.jquery_elem.append("<" + name + ">");
    this.curr_child.jquery_elem = this.jquery_elem.children().last();
    if (id) {
        this.curr_child.attribute("id", id);
    }
    if (css_class) {
        this.curr_child.attribute("class", css_class);
    }
    if (text) {
        this.curr_child.addText(text);
    }
    return this.curr_child;
};
x.XmlStream.addChild.doc = {
    purpose   : "To add a new child into the xml structure",
    args      : "String name of the child, String id attr of the child, String css_class attr of the child, String text to add as child content",
    returns   : "x.XmlStream latest added child",
    exceptions: "addChild_after_closed if the output stream is closed"
};

x.XmlStream.addText = function (text, valid_xml_content) {
    x.log.functionStart("addText", this, arguments);
    if (typeof text !== "string") {
        throw x.Exception.clone({ id: "invalid_text_argument", xml_stream: this.id });
    }
    text = text.replace(this.left_bracket_regex, "<").replace(this.right_bracket_regex, ">");
    this.jquery_elem.text(text);
    return this;                // allow cascade
};
x.XmlStream.addText.doc = {
    purpose   : "To add text string as content of the latest added child. It cleans the text from potentially dangerous html tags",
    args      : "String name of the child, String id attr of the child, String css_class attr of the child, String text to add as child content",
    returns   : "x.XmlStream child where we are adding the text",
    exceptions: "addChild_after_closed if the output stream is closed, invalid_text_argument if the provided text is not a String"
};

x.XmlStream.addHTML = function (text) {
    var new_elem,
        name;
    x.log.functionStart("addHTML", this, arguments);
    if (typeof text !== "string") {
        throw x.Exception.clone({ id: "invalid_text_argument", xml_stream: this.id });
    }
    text = text.replace(this.left_bracket_regex, "<").replace(this.right_bracket_regex, ">");
    this.jquery_elem.append(text);
    new_elem = this.jquery_elem.children().last();
    if (new_elem.length > 0) {
        name = new_elem[0].tagName.toLowerCase();
        this.curr_child = this.clone({ id: name, parent: this, name: name, level: this.level + 1, jquery_elem: new_elem });
        return this.curr_child;
    }
};

//To show up in Chrome debugger...
//@ sourceURL=io/XmlStream.js