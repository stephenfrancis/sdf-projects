/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Textarea
x.data.Textarea = x.data.Text.clone({
    id              : "Textarea",
    css_type        : "textarea",
    detokenize      : false,
    separate_row_in_form: true,
    rows            : 5,
    tb_span         : 12,
    tb_input_list   : "input-xlarge",
//    update_length         : 80,
    data_length     : -1,        // Ignore in Text.validate()
    db_type         : 'B',
    image_root_path : "olht/",
    video_root_path : "olht/",
      doc_root_path : "olht/",
    video_width     : 848,
    video_height    : 551,
});
x.data.Textarea.doc = {
    purpose                 : "To represent a multi-line text block field",
    properties              : {
        rows                : { label: "Initial number of rows to render, defaults to 5 (may be a growfield, however)", type: "number", usage: "optional in spec" },
        detokenize          : { label: "Identify tokens wrapped in braces ('{' and '}') and attempt to replace them with dynamic values or mark-up, defaults to false", type: "boolean", usage: "optional in spec" },
        separate_row_in_form: { label: "Whether or not this field should be rendered separately, below other fields, in a form, defaults to true", type: "boolean", usage: "optional in spec" },
    }
};


x.data.Textarea.set = function (new_val) {
    x.log.functionStart("set", this, arguments);
    if (this.css_richtext) {
        new_val = new_val.replace(/<br class="aloha-cleanme">/g, "");
    }
    new_val = new_val.replace(x.XmlStream.left_bracket_regex, "").replace(x.XmlStream.right_bracket_regex, "");
    return x.data.Text.set.call(this, new_val);
};


x.data.Textarea.renderEditable = function (div, render_opts, inside_table) {
    var str;
    x.log.functionStart("renderEditable", this, arguments);
    if (this.css_richtext && render_opts.enable_aloha !== false) {
//        div.attribute("id", this.getControl());
        div.addChild("div").addText(this.val, true);        // true = don't escape markup
    } else {
        str = "<textarea class='" + this.getEditableSizeCSSClass(render_opts) +
            "' rows='" + this.rows.toFixed(0) + "' id='" + this.getControl() + " '>" + this.val + "</textarea>";
        div.addHTML(str);
    }
};

x.data.Textarea.renderUneditable = function (elem, render_opts, inside_table) {
    var style;
    x.log.functionStart("renderUneditable", this, arguments);
    style = this.getUneditableCSSStyle();
    if (style) {
        elem.attribute("style", style);
    }
    if (this.getText()) {
        elem.addText(this.getText(), this.css_richtext);        // don't escape markup if richtext
//        delete this.allow_video;
    }
};


x.data.Textarea.getTextFromVal = function () {
    x.log.functionStart("getTextFromVal", this, arguments);
    if (this.detokenize) {
        return this.detokenizeSpecial(this.val);
    }
    return this.val;
};


x.data.Textarea.detokenizeSpecial = function (str) {
    var out = "",
        i,
        j,
        k,
        orig_token,
        split_token;

    x.log.functionStart("detokenizeSpecial", this, arguments);
    if (!str) {
        return str;
    }
    k = 0;
    i = str.indexOf("{");
    while (i > -1 && str.substr(i - 1, 1) !== "\\") {           // escape '}' with '\'
        out += str.substring(k, i);
        j    = str.indexOf("}", i);
        if (j === -1) {
            out += "{unmatched}";
            j = i+1;
        } else {
            orig_token  = str.substring(i+1, j);
            split_token = orig_token.replace(/<.*>/g, "").split("|");
            out += this.detokenizeSpecialOne(orig_token, split_token);
        }
        i = str.indexOf("{", j);
        k = j+1;
    }
    out += str.substring(k);
    return out;
};


x.data.Textarea.detokenizeSpecialOne = function (orig_token, split_token) {
    var out,
        row,
        page;

    x.log.functionStart("detokenizeSpecialOne", this, arguments);
        if (split_token.length > 1) {
            if (typeof this["detokenize_" + split_token[0]] === "function") {
                out  = this["detokenize_" + split_token[0]](orig_token, split_token);
            } else if (split_token[0] && split_token[1]) {
                row  = x.entities[split_token[0]].getRow(split_token[1]);
                page = row.getDisplayPage();
            }
            if (row && page) {
                out  = x.XmlStream.left_bracket_subst + "a href='" +
                    page.getSimpleURL(row.getKey()) + "'" + x.XmlStream.right_bracket_subst + row.getLabel("article_link") + 
                    x.XmlStream.left_bracket_subst + "/a" + x.XmlStream.right_bracket_subst;
            }
        }
    if (!out) {
        out = "{" + orig_token + "}";
    }
    return out;
};


x.data.Textarea.detokenize_image = function (orig_token, split_token) {
    x.log.functionStart("detokenize_image", this, arguments);
    return x.XmlStream.left_bracket_subst + "img src='" + this.image_root_path + split_token[1] + "' /" + x.XmlStream.right_bracket_subst;
};
x.data.Textarea.detokenize_video = function (orig_token, split_token) {
    x.log.functionStart("detokenize_video", this, arguments);
//    this.allow_video = true;
    return x.XmlStream.left_bracket_subst + "object width='" + this.video_width + "' height='" + this.video_height + "'" +
        x.XmlStream.left_bracket_subst + "codebase='https://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,28;'" + x.XmlStream.right_bracket_subst +
        x.XmlStream.left_bracket_subst + "param name='movie' value='" + this.video_root_path + split_token[1] + "'" + x.XmlStream.right_bracket_subst +
        x.XmlStream.left_bracket_subst + "param name='quality' value='high'"    + x.XmlStream.right_bracket_subst +
        x.XmlStream.left_bracket_subst + "param name='bgcolor' value='#FFFFFF'" + x.XmlStream.right_bracket_subst +
        x.XmlStream.left_bracket_subst + "embed src='" + this.video_root_path + split_token[1] + "' quality='high' bgcolor='#FFFFFF' " +
            "width='" + this.video_width + "' height='" + this.video_height + "' type='application/x-shockwave-flash' " +
            "pluginspage='https://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash'" + x.XmlStream.right_bracket_subst +
        x.XmlStream.left_bracket_subst + "/embed"  + x.XmlStream.right_bracket_subst +
        x.XmlStream.left_bracket_subst + "/object" + x.XmlStream.right_bracket_subst;
};


x.data.Textarea.generateTestValue = function (session) {
    var val;
    x.log.functionStart("generateTestValue", this, arguments);
    val = x.Test.lorem.substr(0, 1500);
    return val;
};

//To show up in Chrome debugger...
//@ sourceURL=data/Textarea.js