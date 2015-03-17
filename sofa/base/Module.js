/*global x, java */
"use strict";


x.base.Module = x.base.Base.clone({ id: "Module" });


x.addModule = function (spec) {
    var module;
    module = x.base.Module.clone(spec);
    module.owner = x;
    x[spec.id] = module;
    return module;
};

x.base.Module.addEntity = function (spec) {
    var entity = this.addClone(spec.type || x.data.Entity, spec);
    entity.module = entity.owner;
    return entity;
//    var entity;
//    spec.module = this;
//    entity = (spec.type || x.data.Entity).clone(spec);
//    this[spec.id] = entity;
//    return entity;
};

x.base.Module.getEntity = function (str) {
    return x.base.Base.walkPath.call(x, str.replace(/^x\./, ""));
};

x.base.Module.getPage = function (str) {
    var split = str.split("."),
        obj;
    x.log.functionStart("getPage", this, arguments);
    if (split.length !== 4) {
        throw new Error("page_id must be of the form 'x.{module}.{Entity}.{page}': " + str);
    }
    obj = x[split[1]];
    if (!obj) {
        throw new Error("invalid module: " + split[1]);
    }
    obj = obj[split[2]];
    if (!obj) {
        throw new Error("invalid entity: " + split[2] + " in module " + split[1]);
    }
    obj = obj.pages[split[3]];
    if (!obj) {
        throw new Error("invalid page: " + split[3] + " in entity " + split[1] + "." + split[2]);
    }
    return obj;
};

//@ sourceURL=base/Module.js