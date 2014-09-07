/*global x, java */
"use strict";

//---------------------------------------------------------------------------- Date
x.fields.Date = x.fields.Text.clone({
    id                      : "Date",
    css_type                : "date",
    search_oper_list        : "sy.search_oper_list_scalar",
    auto_search_oper        : "EQ",
    search_filter           : "ScalarFilter",
    internal_format         : "yyyy-MM-dd",
    update_format           : "dd/MM/yy",
    display_format          : "dd/MM/yy",
    input_mask              : "99/99/99",    
    regex_label             : "Not a valid date",
    data_length             : 10,
//    update_length         : 8,
//    tb_span               : 2,
    tb_input_list           : "input-small",
    week_start_day          : 0,            // 0 = Sun, 1 = Mon, etc
    error_message           : "not a valid date"
});
x.fields.Date.doc = {
    location                : "x.fields",
    file                    : "$Header: /rsl/rsl_app/core/fields/Date.js,v 1.27 2014/06/27 13:50:47 francis Exp $",
    purpose                 : "To represent a date field",
    properties: {
        display_format      : { label: "Date format string to use when displaying the field read-only", type: "string", usage: "optional in spec" },
        update_format       : { label: "Date format string to use when updating the field", type: "string", usage: "optional in spec" },
        internal_format     : { label: "Date format string used to store the date value internally", type: "string", usage: "do not use" }
    }
};


x.fields.Date.getUpdateText = function () {
    x.log.functionStart("getUpdateText", this, arguments);
    return this.getText();
};

x.fields.Date.parse = function (val, in_format, out_format) {
    var parts,
        date,
        i;
    x.log.functionStart("parse", this, arguments);
    if (typeof val !== "string") {
        return val;
    }
    date = new Date();
    parts = val.split("+");
     in_format =  in_format || this.internal_format;
    out_format = out_format || this.internal_format;
    for (i = 0; i < parts.length && date; i += 1) {        // exit loop if date is ever null
        if (parts[i] === "today") {
            continue;
        } else if (parts[i] === "now") {
            continue;
        } else if (parts[i] === "day-start") {
            date.clearTime();
        } else if (parts[i] === "day-end") {
            date.setHours(23); 
            date.setMinutes(59);
            date.setSeconds(59); 
            date.setMilliseconds(999);
        } else if (parts[i] === "week-start") {
            date.add('d',   - ((date.getDay() + this.week_start_day) % 7));            // getDay() returns 0 for Sun to 6 for Sat
        } else if (parts[i] === "week-end") {
            date.add('d', 6 - ((date.getDay() + this.week_start_day) % 7));
        } else if (parts[i] === "month-start") {
            date.setDate(1);
        } else if (parts[i] === "month-end") {
            date.add('M', 1);
            date.setDate(1);
            date.add('d', -1);
        } else if (parts[i].indexOf("minutes") > -1) {
            date.add('m', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("hours") > -1) {
            date.add('h', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("days") > -1) {
            date.add('d', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("weeks") > -1) {
            date.add('d', parseInt(parts[i], 10) * 7);
        } else if (parts[i].indexOf("months") > -1) {
            date.add('M', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("years") > -1) {
            date.add('y', parseInt(parts[i], 10));
        } else if (parseInt(parts[i], 10).toFixed(0) === parts[i]) {
            date.add('d', parseInt(parts[i], 10));
        } else {
            date = Date.parseString(parts[i], in_format);
        }
    }
    return (date ? date.format(out_format) : val);
};
x.fields.Date.parse.doc = {
    purpose: "To attempt to parse a given date (or date/time) string, using given in/out formats if supplied, and applying any 'adjusters'",
    args   : "A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start', 'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string input format, 3rd arg is optional string out format",
    returns: "Converted date string (if conversion could be performed), otherwise returns the input string"
};

x.fields.Date.parseDisplay = function (val) {
    x.log.functionStart("parseDisplay", this, arguments);
    return this.parse(val, this.internal_format, this.display_format);
};
x.fields.Date.parseDisplay.doc = {
    purpose: "Syntactic sugar - equivalent to this.parse(val, this.internal_format, this.display_format)",
    args   : "A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start', 'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string input format, 3rd arg is optional string out format",
    returns: "Converted date string (if conversion could be performed) in usual display format, otherwise returns the input string"
};

x.fields.Date.getDate = function () {
    x.log.functionStart("getDate", this, arguments);
    if (!this.isBlank() && this.isValid()) {
        return Date.parse(this.get());
    }
};
x.fields.Date.getDate.doc = {
    purpose: "To obtain a JavaScript date object representing the value of this field",
    args   : "none",
    returns: "A JavaScript date object corresponding to this field's value - note that changes to it do NOT update the value of the field"
};


x.fields.Date.isBefore = function (date) {
    var nThisDay,
        nOtherDay;
    x.log.functionStart("isBefore", this, arguments);
    if (!this.get() || !date) {
        return false;
    }
     nThisDay = Math.floor(x.lib.toDate(this.get()      ).getTime() / ( 1000 * 60 * 60 * 24));
    nOtherDay = Math.floor(x.lib.toDate(this.parse(date)).getTime() / ( 1000 * 60 * 60 * 24));
    return (nThisDay < nOtherDay);
};
x.fields.Date.isBefore.doc = {
    purpose: "To indicate whether or not the date (or date/time) argument is before this field's value",
    args   : "Date string",
    returns: "True if this field's value represents a point in time before the date argument"
};


x.fields.Date.isAfter = function (date) {
    var nThisDay,
        nOtherDay;
    x.log.functionStart("isAfter", this, arguments);
    if (!this.get() || !date) {
        return false;
    }
     nThisDay = Math.floor(x.lib.toDate(this.get()      ).getTime() / ( 1000 * 60 * 60 * 24));
    nOtherDay = Math.floor(x.lib.toDate(this.parse(date)).getTime() / ( 1000 * 60 * 60 * 24));
    return (nThisDay > nOtherDay);
};
x.fields.Date.isAfter.doc = {
    purpose: "To indicate whether or not the date (or date/time) argument is after this field's value",
    args   : "Date string",
    returns: "True if this field's value represents a point in time after the date argument"
};


x.fields.Date.setInitial = function (new_val) {
    x.log.functionStart("setInitial", this, arguments);
    x.fields.Text.setInitial.call(this, new_val);
    this.val = this.parse(this.val);
};

x.fields.Date.set = function (new_val) {        // Convert a valid date in update_format to one valid in internal_format
    x.log.functionStart("set", this, arguments);
    if (typeof new_val === "object" && typeof new_val.getFullYear === "function") {
        new_val = new_val.internal();
    } else if (typeof new_val === "string") {
        new_val = this.parse(new_val);
        if (!Date.isValid(new_val, this.internal_format) && Date.isValid(new_val, this.update_format)) {
            new_val = Date.parseString(new_val, this.update_format).format(this.internal_format);
        }
    } else if (!new_val) {
        new_val = "";
    }
    x.fields.Text.set.call(this, new_val);
};

x.fields.Date.validate = function () {
    var date;
    x.log.functionStart("validate", this, arguments);
    x.fields.Text.validate.call(this);
    if (this.val) {                // Only do special validation if non-blank
        date = Date.parse(this.val);
        if (date && date.format(this.internal_format) === this.val) {
            this.text = date.format(this.display_format);
            if (this.min && this.val < this.parse(this.min)) {
                this.messages.push({ type: 'E', text: "earlier than minimum value: " + this.parseDisplay(this.min) });
            }
            if (this.max && this.val > this.parse(this.max)) {
                this.messages.push({ type: 'E', text:   "later than maximum value: " + this.parseDisplay(this.max) });
            }
        } else {            // TODO - what is this all about?
            this.messages.push({ type: 'E', text: this.error_message });
        }
    }
};

x.fields.Date.generateTestValue = function (session, min, max) {
    var i;
    x.log.functionStart("generateTestValue", this, arguments);
    min = Date.parse(min || this.min || "2000-01-01");
    max = Date.parse(max || this.max || "2019-12-31");
    i = Math.floor(Math.random() * min.daysBetween(max));
//    return x.lib.formatDate(x.lib.addDays(min, i));
    return min.add('d', i).format(this.internal_format);
};

//To show up in Chrome debugger...
//@ sourceURL=da/Date.js