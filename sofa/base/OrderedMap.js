/*global x, java */
"use strict";


x.base.OrderedMap = x.base.Base.clone({ id: "OrderedMap" });


x.base.OrderedMap.clone = function (spec) {
    var obj,
        n,
        e;
    obj = x.base.Base.clone.call(this, spec);
    obj.map = {};
    obj.arr = [];
    for (n = 0; this.arr && n < this.arr.length; n += 1) {
        e = this.arr[n].clone({ owner: obj });
        obj.arr[n] = e;
        obj.map[e.id] = e;
    }
    return obj;
};


x.base.OrderedMap.add = function (obj) {
    if (!obj.id || typeof obj.id !== "string") {
        throw new Error("id must be non-blank string");
    }
    if (this.map[obj.id]) {
        throw new Error("id already exists: " + obj.id);
    }
    obj.owner = this;
    this.map[obj.id] = obj;
    this.arr.push(obj);
    return obj;
};


x.base.OrderedMap.addAll = function (arr) {
    var i;
    if (!arr || typeof arr.length !== "number") {
        throw new Error("argument must be an array");
    }
    for (i = 0; i < arr.length; i += 1) {
        this.add(arr[i]);
    }
};


x.base.OrderedMap.get = function (id) {
    if (typeof id === "string") {
        return this.map[id];
    } else if (typeof id === "number") {
        return this.arr[id];
    } else {
        throw new Error("argument must be a string or a number: " + id);
    }
};


x.base.OrderedMap.indexOf = function (id) {
    if (typeof id === "string") {
        return this.arr.indexOf(this.map[id]);
    } else if (typeof id === "object") {
        return this.arr.indexOf(id);
    }
    throw new Error("argument must be a string or a number: " + id);
};


x.base.OrderedMap.remove = function (id) {
    var obj;
    if (typeof id === "string") {
        obj = this.map[id];
        if (!obj) {
            throw new Error("not found: " + id);
        }
        this.arr.splice(this.arr.indexOf(obj), 1);
        delete this.map[id];
    } else if (typeof id === "number") {
        if (id < 0 || id >= this.arr.length) {
            throw new Error("index out of range: " + id);
        }
        obj = this.arr[id];
        this.arr.splice(id, 1);
        delete this.map[obj.id];
    } else {
        throw new Error("argument must be a string or a number: " + id);
    }
};


x.base.OrderedMap.length = function () {
    return this.arr.length;
};


x.base.OrderedMap.moveTo = function (id, position) {
    if (typeof position !== "number" || position < 0 || position > this.arr.length) {
        throw new Error("invalid position: " + position);
    }
    if (typeof id === "string") {
        id = this.arr.indexOf(this.map[id]);
        if (id === -1) {
            throw new Error("not found: " + id);
        }
    } else if (typeof id !== "number") {
        throw new Error("argument must be a string or a number: " + id);
    }
    this.arr.splice(position, 0, this.arr.splice(id, 1)[0]);
};


x.base.OrderedMap.clear = function () {
    this.map = {};
    this.arr = [];
};


x.base.OrderedMap.each = function (funct) {
    var i;
    for (i = 0; i < this.arr.length; i += 1) {
        funct(this.arr[i]);
    }
};

//To show up in Chrome debugger...
//@ sourceURL=base/OrderedMap.js