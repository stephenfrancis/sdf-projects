/*global x, java */
"use strict";

x.Exception = x.Base.clone({ id: "Exception" });
x.Exception.doc = {
    location : "x",
    file: "$Header: /rsl/rsl_app/core/base/Exception.js,v 1.10 2014/07/16 15:48:08 francis Exp $",
    purpose : "The root Archetype of a thrown Exception, containing stack trace and other useful information",
    properties : {
        stack_trace         : { label: "String stack trace block (JavaScript lines only, Java lines filtered out), with lines separated by newline characters", type: "string", usage: "read only" },
    }
};
x.Exception.clone = function (props) {
    var obj;
    x.log.functionStart("clone", this, arguments);
    obj = x.Base.clone.call(this, props);
    obj.props_str = props.view();
    obj.stack_trace = "";
    return obj;
};
x.Exception.clone.doc = {
    purpose: "To create a new Exception object; preferred usage: 'throw x.Exception.clone({ id: xxx, y: z, etc })' - note NO 'new' keyword",
    args   : "Spec object, containing 'id' parameter, and any other properties useful to know for the situation - these are output to log",
    returns: "new Exception object"
};

x.Exception.toString = function () {
//    return "[" + this.id + "] " + this.text;
    return this.props_str;
};

//To show up in Chrome debugger...
//@ sourceURL=base/Exception.js