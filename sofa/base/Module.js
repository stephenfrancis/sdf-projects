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
    var split = str.split(".");
    x.log.functionStart("getPage", this, arguments);
    if (split.length !== 4) {
        throw new Error("page_id must be of the form 'x.{module}.{Entity}.{page}': " + str);
    }
    page = x[split[1]][split[2]].pages[split[3]];
    return x.base.Base.walkPath.call(x, str.replace(/^x\./, ""));
};

//@ sourceURL=base/Module.js