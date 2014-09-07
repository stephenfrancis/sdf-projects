/*global x, java */
"use strict";

x.fields = {};

//---------------------------------------------------------------------------- Text
x.fields.Text = x.Base.clone({
    id              : "Text",
    css_type        : "text",
    val             : "",
    prev_val        : "",
    data_length     : 255,
    visible         : true,
    editable        : true,
    search_oper_list: "sy.search_oper_list_text",
    auto_search_oper: "CO",
    search_filter   : "Filter",
    table_alias     : "A",
//    tb_input        : "input-large",
    input_type      : "text",
    tb_input_list   : "input-medium",
    tb_span         : 3,
//    list_update_length    : 40,
//    icon            : "/rsl_shared/style/Axialis/Png/16x16/Globe.png",
    unicode_icon    : "&#x25B7;",
    unicode_icon_class: "css_uni_icon",
    nav_dropdown_icon: "<b class='caret'></b>",
    hover_text_icon : "&#x24D8;",
    text_pattern    : "{val}",
    valid           : true,                     // private - currently valid value, or not?
    validated       : false,                    // private - validated since last significant change?
    modified        : false,                    // private - modified since original value, or not?
    skip_insert     : false,
});


x.fields.Text.doc = {
    location        : "x.fields",
    file            : "$Header: /rsl/rsl_app/core/fields/Text.js,v 1.88 2014/07/25 12:37:09 francis Exp $",
    purpose         : "To represent a basic unit of textual information, how it is captured, validated, stored in the database, and represented on screen",
    properties      : {
        type                : { label: "What type of field to create - which object in x.fields", type: "string", usage: "required in spec" },
        label               : { label: "The text label for fields in forms and headings of columns", type: "string", usage: "required in spec" },
        visible             : { label: "Whether or not this field should be visible in a Section, defaults true", type: "boolean", usage: "optional in spec" },
        editable            : { label: "Whether or not this field should be editable in a Section (provided fixed_key is false and the FieldSet it belongs to is modifiable), defaults true", type: "boolean", usage: "optional in spec" },
        mandatory           : { label: "Whether or not this field is required in a record, defaults false", type: "boolean", usage: "optional in spec" },
        description         : { label: "Tooltop text", type: "string", usage: "optional in spec" },
        data_length         : { label: "Number of characters that can be stored in the database column, defaults to 255", type: "number", usage: "optional in spec" },
        default_val         : { label: "Initial value of field when a new record is created (used by Entity.setDefaultVals(), which is called by Transaction.createNewRow() and Transaction.getRow() (when it is a new row))", type: "string", usage: "optional in spec" },
        session             : { label: "Some functions (e.g. allowed() and allowedURL()) require a session object, which is usually obtained from 'owner.page.session', where 'owner' is the fieldset to which this field belongs (see x.Base); if not part of a fieldset, 'session' can be provided directly", type: "x.Session", usage: "optional in spec" },
        search_oper_list    : { label: "LoV to use for filter criterion operators in the Search section, defaults from field type", type: "string", usage: "optional in spec" },
        dflt_search_oper    : { label: "Filter criterion operator applied immediately and whenever 'Reset' is clicked", type: "string", usage: "optional in spec" },
        auto_search_oper    : { label: "Filter criterion operator that activates automatically when a value is selected", type: "string", usage: "optional in spec" },
        tb_input_list       : { label: "Twitter-Bootstrap CSS class controlling editable input size in lists", type: "string", usage: "optional in spec" },
        tb_span             : { label: "Twitter-Bootstrap CSS class (with 'span' prefix added) controlling uneditable space given in forms", type: "number", usage: "optional in spec" },
        regex_pattern       : { label: "Regex pattern for validation", type: "string", usage: "optional in spec" },
        regex_label         : { label: "Error label to use if regex validation fails", type: "string", usage: "optional in spec" },
        url_pattern         : { label: "Tokenized string for rendering a link if field is uneditable", type: "string", usage: "optional in spec" },
        text_pattern        : { label: "Tokenized string for creating the text representation of a value", type: "string", usage: "optional in spec" },
        icon                : { label: "Path to image file to render an icon if field is uneditable", type: "string", usage: "optional in spec" },
        button_class        : { label: "Allows a URL field link to appear as a button based on bootstrap classes. (Icon takes precedent over this property)", type: "string", usage: "optional in spec" },
        css_type            : { label: "CSS formatting class string (prefixed with 'css_type_', defaults from field type", type: "string", usage: "optional in spec" },
        css_reload          : { label: "CSS reload marker class string (set to 'page' to add 'css_reload' as a CSS class to the field)", type: "string", usage: "optional in spec" },
        skip_insert         : { label: "Excludes a field from any entity generated insert statements", type: "boolean", usage: "optional in spec" },
        val                 : { label: "Internal value of field, use get()", type: "string", usage: "do not use" },
        text                : { label: "Internal cache of display text representation of field value, use getText()", type: "string", usage: "do not use" },
        control             : { label: "Field id to be unique at page-level, used to identify the field in HTML form and parameter sets", type: "string", usage: "use with care" },
        fixed_key           : { label: "Indicates that this is a populated key field which corresponds to a database record, hence cannot be changed, set by x.Entity.populate()", type: "boolean", usage: "read only" },
        validated           : { label: "Whether or not this field has been validated since it was last changed", type: "boolean", usage: "do not use" },
        modified            : { label: "Whether or not this field has been modified since being created / loaded from the database, use isModified()", type: "boolean", usage: "do not use" },
    }
};


x.fields.Text.getControl = function () {
    x.log.functionStart("getControl", this, arguments);
    if (this.owner && this.owner.control_prefix) {
        return this.owner.control_prefix + "_" + this.id;
    }
    return this.id;
};


x.fields.Text.get = function () {
    x.log.functionStart("get", this, arguments);
    return this.val;
};
x.fields.Text.get.doc = {
    purpose: "Returns this field's val property - should always be used instead of accessing val directly",
    args   : "none",
    returns: "Value of this field's val property - should be string"
};


x.fields.Text.getNumber = function (def_val) {
    var number_val;
    x.log.functionStart("getNumber", this, arguments);
    number_val = parseFloat(this.get());
    if (isNaN(number_val) && typeof def_val === "number" ) {
        number_val = def_val;
    }
    return number_val;
};
x.fields.Text.getNumber.doc = {
    purpose: "To get a numerical representation of this field's value",
    args   : "Default value to use if this field's value is not a number",
    returns: "Number value of field (if the value can be interpreted as numeric), or the default value argument (if numeric) or undefined"
};


x.fields.Text.isBlank = function (val) {
    x.log.functionStart("isBlank", this, arguments);
    if (typeof val !== "string") {
        val = this.get();
    }
    return !val;
};
x.fields.Text.isBlank.doc = {
    purpose: "To indicate whether or not this field's value is blank",
    args   : "none",
    returns: "True if this field's value is blank (i.e. empty string) otherwise false"
};


x.fields.Text.setInitial = function (new_val) {
    x.log.functionStart("setInitial", this, arguments);
    if (typeof new_val !== "string") {
        throw x.Exception.clone({ id: "invalid_argument", text: "setInitial() requires a string", field_id: this.id });
    }
    this.val       = new_val;
    this.text      = null;
    this.orig_val  = new_val;
    this.prev_val  = new_val;
    this.validated = false;
};
x.fields.Text.setInitial.doc = {
    purpose: "To set the initial value of this field - called by Entity.setInitial()",
    args   : "Initial string value to set",
    returns: "nothing"
};


x.fields.Text.set = function (new_val) {
    var old_val = this.val,
    changed = this.setInternal(new_val);
    if (changed) {
        x.log.trace(this, "setting " + this.getId() + " from '" + old_val + "' to '" + new_val + "'");
    }
    return changed;
};
x.fields.Text.set.doc = {
    purpose: "To set this field's value to the string argument specified, returning false if no change, otherwise calling owner.beforeFieldChange() and this.beforeChange() before making the change, then owner.afterFieldChange() and this.afterChange() then returning true",
    args   : "String new value to set this field to",
    returns: "True if this field's value is changed, and false otherwise"
};

x.fields.Text.setInternal = function (new_val) {
    var old_val;
    x.log.functionStart("set", this, arguments);
    old_val       = this.val;
    this.prev_val = this.val;            // to support isChangedSincePreviousUpdate()
    if (typeof new_val !== "string") {
        throw x.Exception.clone({ id: "argument_not_string", field: this.id, arg: new_val });
    }
    if (this.fixed_key) {
        throw x.Exception.clone({ id: "fixed_key", field: this.id });
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
    this.validated = false;
    if (this.owner && this.owner.afterFieldChange) {
        this.owner.afterFieldChange(this, old_val);
    }
    this.afterChange(old_val);
    if (this.owner && this.owner.trans && this.afterTransChange) {
        this.afterTransChange(this, old_val);            // May throw an error
    }
    return true;
};
//TODO
x.fields.Text.setInternal.doc = {};


x.fields.Text.beforeChange = function (new_val) {
    x.log.functionStart("beforeChange", this, arguments);
};
x.fields.Text.beforeChange.doc = {
    purpose: "Activity to take place before field's value is changed - for overriding, nothing done here",
    args   : "Field's new value, to be set afterwards",
    returns: "nothing"
};


x.fields.Text.beforeTransChange = function (new_val) {
    x.log.functionStart("beforeTransChange", this, arguments);
};
x.fields.Text.beforeTransChange.doc = {
    purpose: "Activity to take place before field's value is changed - for overriding, nothing done here",
    args   : "Field's new value, to be set afterwards",
    returns: "nothing"
};


x.fields.Text.afterChange = function (old_val) {
    x.log.functionStart("afterChange", this, arguments);
};
x.fields.Text.afterChange.doc = {
    purpose: "Activity to take place before field's value is changed - for overriding, nothing done here",
    args   : "Field's old value",
    returns: "nothing"
};


x.fields.Text.afterTransChange = function (old_val) {
    x.log.functionStart("afterTransChange", this, arguments);
};
x.fields.Text.afterTransChange.doc = {
    purpose: "Activity to take place before field's value is changed - for overriding, nothing done here",
    args   : "Field's old value",
    returns: "nothing"
};


x.fields.Text.isChangedSincePreviousUpdate = function () {
    x.log.functionStart("isChangedSincePreviousUpdate", this, arguments);
    return (this.prev_val !== this.get());
};
x.fields.Text.isChangedSincePreviousUpdate.doc = {
    purpose: "To indicate if this field's value has been changed in the last call to set() - based on property prev_val, which is set in set()",
    args   : "none",
    returns: "True if this field's value was changed in the last call to set()"
};


x.fields.Text.getId = function () {
    x.log.functionStart("getId", this, arguments);
    return this.id;
};
x.fields.Text.getId.doc = {
    purpose: "Returns the value of this field's id property",
    args   : "none",
    returns: "This field's id property as a string"
};


x.fields.Text.setProperty = function (name, val) {
    x.log.functionStart("setProperty", this, arguments);
    if (name === "id") {
        throw "can't change property 'id'";
    }
    if (name === "type") {
        throw "can't change property 'type'";
    }
    this[name] = val;
    this.text  = null;
//    this.valid     = true;
    this.validated = false;                            // property change might affect validation
};
x.fields.Text.setProperty.doc = {
    purpose: "To set a given property, and unset the validated property, prompting another call to validate() when next required",
    args   : "String property name, and property value",
    returns: "nothing"
};


x.fields.Text.getDataLength = function () {
    x.log.functionStart("getDataLength", this, arguments);
    return (typeof this.data_length === "number") ? this.data_length : 255;
};
x.fields.Text.getDataLength.doc = {
    purpose: "To obtain the field's data length, in most cases the character length of the database field",
    args   : "none",
    returns: "The data length of this field, as an integer number of characters"
};


x.fields.Text.getKeyPieces = function () {
    x.log.functionStart("getKeyPieces", this, arguments);
    return 1;
};
x.fields.Text.getKeyPieces.doc = {
    purpose: "To obtain the number of pieces the value of this field represents as a key string",
    args   : "none",
    returns: "The number 1"
};


x.fields.Text.isKey = function () {
    x.log.functionStart("isKey", this, arguments);
    if (this.owner && this.owner.isKey) {
        return this.owner.isKey(this.getId());
    }
    return false;
};
x.fields.Text.isKey.doc = {
    purpose: "To report whether or not this field is a key of the entity to which it belongs",
    args   : "none",
    returns: "True if this field is a key, otherwise false"
};


x.fields.Text.validate = function () {                    // validate() also responsible for setting text
    x.log.functionStart("validate", this, arguments);
    this.messages = [];
    this.text = this.getTextFromVal();
    this.url  = this. getURLFromVal();
    if (this.mandatory && !this.val) {
        this.messages.push({ type: 'E', text: "mandatory" });
    }
    if (this.val && this.val.length > this.getDataLength() && this.getDataLength() > -1) {
        this.messages.push({ type: 'E', text: "longer than " + this.getDataLength() + " characters" });
    }
    if (this.val && this.regex_pattern && !(this.val.match(new RegExp(this.regex_pattern)))) {
        this.messages.push({ type: 'E', text: this.regex_label || "match pattern" });
    }
    if (this.val && this.enforce_unique) {
        if (this.checkUnique(this.val)) {
            this.messages.push({ id: "non_unique_field", type: 'E', text: "Another record has this value" });
        }
    }
    this.validated = true;
};
x.fields.Text.validate.doc = {
    purpose: "To validate the value this field is currently set to; this function (or its descendents) can report errors \
by calling raiseError(), these errors are by subsequent calls to getErrors(), and the overall error state by isError(). \
This function is also responsible for setting the field's 'text' property, which is returned by getText(). \
This function is re-called by various functions if 'validated' is set false, e.g. by calls to set() or setProperty().",
    args   : "none",
    returns: "nothing"
};


x.fields.Text.isValid = function () {
    var out = true;
    x.log.functionStart("isValid", this, arguments);
    if (!this.validated) {
        this.validate();
    }
    this.messages.forOwn(function (i, msg) {
        if (msg.type === 'E') {
            out = false;
        }
    })
    return out;
};
x.fields.Text.isValid.doc = {
    purpose: "To report whether or not this field is valid, based on the last call to validate() (validate() is called again \
if 'validated' is false, e.g. because set() or setProperty() have been called since the last call to validate())",
    args   : "none",
    returns: "true if this field is valid, false otherwise"
};


x.fields.Text.isModified = function () {
    x.log.functionStart("isModified", this, arguments);
    return this.modified;
};
x.fields.Text.isModified.doc = {
    purpose: "To report whether or not this field has been modified (by a call to set()), since it was originally created and set \
(by a call to setInitial())",
    args   : "none",
    returns: "true if this field has been modified, otherwise false"
};



x.fields.Text.getTextFromVal = function () {
    var out = this.val;
    x.log.functionStart("getTextFromVal", this, arguments);
//    out = this.detokenize(this.text_pattern);
    if (this.config_item && !this.isBlank(this.val)) {
        out = "[" + this.val + "] " + this.getConfigItemText(this.val);
    }
    return out;
};
x.fields.Text.getTextFromVal.doc = {
    purpose: "To convert the properties of this field (especially this.val) into the display text string for this field - \
to be called only within validate() - to be overridden in descendent fields, rather than called from elsewhere",
    args   : "none",
    returns: "display text string appropriate to this field and its properties"
};


x.fields.Text.getText = function () {
    x.log.functionStart("getText", this, arguments);
    if (typeof this.text !== "string") {
        this.validate();
    }
    return this.text;
};
x.fields.Text.getText.doc = {
    purpose: "To obtain the display text string for this field, which is set by the last call to validate() \
(validate() is called again if 'validated' is false, e.g. because set() or setProperty() have been called since the \
last call to validate())",
    args   : "none",
    returns: "the value of this field's 'text' property - always a string"
};


x.fields.Text.getURLFromVal = function () {
    x.log.functionStart("getURLFromVal", this, arguments);
    return "";
};        
x.fields.Text.getURLFromVal.doc = {
    purpose: "To get a URL corresponding to the value of this field, if there is one; by default this \
is produced by detokenizing the 'url_pattern' property, if given; its access is then tested with this.allowedURL()",
    args   : "none",
    returns: "url string if produced"
};


x.fields.Text.getURL = function () {
    x.log.functionStart("getURL", this, arguments);
    if (typeof this.url !== "string") {
        this.validate();
    }
    return this.url;
};
x.fields.Text.getURL.doc = {
    purpose: "To obtain the url string for this field, which is set by the last call to validate() \
(validate() is called again if 'validated' is false, e.g. because set() or setProperty() have been called since the \
last call to validate())",
    args   : "none",
    returns: "the value of this field's 'url' property - always a string"
};


x.fields.Text.getConfigItemText = function (val) {
    var obj,
        label_prop = this.label_prop || "title";
    x.log.functionStart("getConfigItemText", this, arguments);
    obj = x.Base.getObject(this.config_item);
    if (typeof val !== "string") {
        val = this.get();
    }
    if (typeof obj[val] !== "object") {
        return "[unknown]";
//        throw x.Exception.clone({ id: "unrecognised_config_item", config_item: this.config_item, field: this, value: val });
    }
    if (typeof obj[val][label_prop] !== "string") {
        return "[unknown]";
//        throw x.Exception.clone({ id: "config_item_has_no_title", config_item: this.config_item, field: this, value: val });
    }
    return obj[val][label_prop];
};
x.fields.Text.getConfigItemText.doc = {
    purpose: "To obtain the text title of the config item which the value of this field represents - if this field has a \
'config_item' property which is a string beginning with 'x.' and referencing a collection of objects then the value of this \
field is interpreted as a property of the collection, whose value is another object with a 'title' property, whose value is \
a string, returned by this function",
    args   : "none",
    returns: "[config_item][this.get()].title as a string, otherwise '[unknown]'"
};


x.fields.Text.getUpdateText = function () {
    x.log.functionStart("getUpdateText", this, arguments);
    return this.val;
};
x.fields.Text.getUpdateText.doc = {
    purpose: "To obtain the string representation of the value of this field for use in an update control (i.e. input box)",
    args   : "none",
    returns: "the value of the 'val' property of this field"
};


x.fields.Text.isEditable = function () {
    return this.editable && !this.fixed_key && (!this.owner || this.owner.modifiable);
};
x.fields.Text.isEditable.doc = {
    purpose: "To indicate whether or not this field is editable, i.e. its 'editable' property is true, its 'fixed_key' \
property is false, and either it has no 'owner' or 'owner.modifiable' is true",
    args   : "none",
    returns: "true if this field is editable, otherwise false"
};


x.fields.Text.isVisible = function (field_group, hide_blank_uneditable) {
    return this.visible && (this.accessible !== false) &&
            (!field_group || !this.field_group || field_group === this.field_group) &&
            (!this.hide_if_no_link || this.getURL()) &&
            ((this.editable && this.owner && this.owner.modifiable) || !this.isBlank() || !hide_blank_uneditable);
};
x.fields.Text.isVisible.doc = {
    purpose: "To indicate whether or not this field is visible, i.e. its 'visible' property is true, its 'accessible' \
property is not false",
    args   : "none",
    returns: "true if this field is visible, otherwise false"
};


x.fields.Text.setVisEdMand = function (visible_editable, mandatory) {
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
};
x.fields.Text.setVisEdMand.doc = {
    purpose: "To set the visible and editable attributes combined, and mandatory as a separate arg, set the field blank is not visible, and validate",
    args   : "whether visible/editable, whether mandatory (only if visible/editable)",
    returns: "nothing"
};


x.fields.Text.allowed = function (page_id, key) {
    x.log.functionStart("allowed", this, arguments);
    return x.session.allowed(page_id, key);
};
x.fields.Text.allowed.doc = {
    purpose: "To test user's access to the page_id and key string supplied",
    args   : "page_id (string), and key (string)",
    returns: "true if there is a session object to use AND access is allowed, otherwise false"
};


x.fields.Text.allowedURL = function (url) {
    x.log.functionStart("allowedURL", this, arguments);
    return x.session.allowedURL(url);
};
x.fields.Text.allowedURL.doc = {
    purpose: "To test user's access to the url string supplied",
    args   : "url (string)",
    returns: "true if there is a session object to use AND access is allowed, otherwise false"
};


x.fields.Text.getData = function (obj) {
    if (!this.isBlank()) {
        obj[this.id] = this.get();
    }
};


x.fields.Text.getTokenValue = function (token_parts) {
    var out;
    x.log.functionStart("getTokenValue", this, arguments);
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
};

//To show up in Chrome debugger...
//@ sourceURL=da/Text.js