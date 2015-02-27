/*global x, java */
"use strict";

x.EventStack = x.OrderedMap.clone({
    id              : "EventStack",
    events          : []
});
x.EventStack.doc = {
    location        : "x",
    file            : "$Header: /rsl/rsl_app/core/base/EventStack.js,v 1.9 2014/07/18 15:23:58 francis Exp $",
    purpose         : "To manage event-triggered scripts associated with a specific object",
    properties      : {
        events              : { label: "Array of used event ids for validation", type: "array", usage: "required in spec" },
    }
};


x.EventStack.add = function (id, event, script) {
    var script_obj;
    // These Exceptions will be thrown during load if thrown at all, so no point using x.Exception.clone()...
    if (typeof event !== "string") {
        throw new Error("event argument must be nonblank string: " + event);
    }
    if (typeof script !== "function") {
        throw new Error("script not defined");
    }
    if (this.events.indexOf(event) === -1) {
        throw new Error("Unrecognised Event: " + event + " with id: " + id);
    }
    script_obj = x.Script.clone({ id: id, event: event, script: script });
    return x.OrderedMap.add.call(this, script_obj);
};
x.EventStack.add.doc = {
    purpose: "Adds a new x.Script object to this EventStack, created from the given arguments",
    args   : "id (string), event (string) should be triggered by the owning object, script (function)",
    returns: "new x.Script object created"
};

x.EventStack.trigger = function (event_id, target_obj, arg1, arg2, onException) {
/*
    this.each(function (script_obj) {
        if (script_obj.event === event_id) {
            if (script_obj.active) {
                try {
                    script_obj.script.call(target_obj, arg1, arg2);                
                } catch (e) {
                    if (typeof onException === "function") {
                        onException(event_id, target_obj, arg1, arg2, e);
                    } else {
                        throw e;
                    }
                }
//            } else {
//                x.log.debug(this, "trigger::" + event_id + " [" + script_obj.id + "] DEACTIVATED on " + target_obj);
            }
        }
    });
*/
};
x.EventStack.trigger.doc = {
    purpose: "Calls the x.Script objects contained in this EventStack which have the given event id",
    args   : "event id (string) to trigger, target object (object) to pass into the x.Script functions being called",
    returns: "nothing"
};


x.Script = x.Base.clone({
    id: "Script",
    active: true
});

//x.Script.clone = function () {
//    return this;
//};

//To show up in Chrome debugger...
//@ sourceURL=base/EventStack.js