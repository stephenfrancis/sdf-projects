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
    return this.addClone(spec.type || x.data.Entity, spec);
//    var entity;
//    spec.module = this;
//    entity = (spec.type || x.data.Entity).clone(spec);
//    this[spec.id] = entity;
//    return entity;
};


//@ sourceURL=base/Module.js