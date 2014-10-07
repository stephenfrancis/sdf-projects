/*global x, java */
"use strict";


x.LoV = x.OrderedMap.clone({
    id                      : "LoV",
    blank_label             : "[blank]",
    choose_label            : "[choose]",
});

x.LoV.addItem = function (id, label, active) {
    x.log.functionStart("addItem", this, arguments);
    if (!label) {
        throw new Error("label must be nonblank: " + this + "." + id);
    }
    if (typeof active !== "boolean") {
        throw new Error("active property must be boolean: " + this + "." + id);
    }
    x.log.trace("Adding item { id:" + this.id + ":" + id + ", label:" + label + ", active:" + active + "}");
    return this.add(x.Base.clone({ id: id, label: label, active: active }));
};
    
x.LoV.getItem = function (id) {
    var item = null;
    x.log.functionStart("getItem", this, arguments);
    item = this.get(id);
    if (!item && this.entity) {
        item = this.loadEntity(id);
    }
    return item;
};

x.LoV.render = function (div, render_opts, val, control, css_class, mandatory) {
    var i,
        item,
        select,
        option;
    x.log.functionStart("render", this, arguments);
    select = div.addChild("select", control, css_class);
    select.attribute("name", control);
    if (!mandatory) {
        option = select.addChild("option");
        option.attribute("value", "");
        if (!val) {
            option.attribute("selected", "selected");
        }
        option.addText(this.blank_label);
    } else if (!val || !this.getItem(val) || !this.getItem(val).active) {
        option = select.addChild("option");
        option.attribute("value", "");
        option.attribute("selected", "selected");
        option.addText(this.choose_label);
    }
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            option = select.addChild("option");
            option.attribute("value", item.id);
            if (item.id === val) {
                option.attribute("selected", "selected");
            }
            option.addText(item.label);
        }
    }
    return select;
};

x.LoV.renderRadio = function (div, render_opts, val, control, css_class, mandatory) {
    var inner,
        span,
        i,
        item,
        radio,
        label;
    x.log.functionStart("renderRadio", this, arguments);
    inner = div.addChild("span", control, css_class);
//    div.attribute("id", control, css_class);
    if (!mandatory) {
        span = inner.addChild("span", null, "css_attr_item");
        radio = span.addChild("input", control + "__");
        radio.attribute("name" , control);
        radio.attribute("type" , "radio");
        radio.attribute("value", "");
        if (!val) {
            radio.attribute("selected", "selected");
        }
        label = span.addChild("label");
        label.attribute("for", control + "__");
        label.addText(this.blank_label || "[blank]");
    }
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            span = inner.addChild("span", null, "css_attr_item");
            radio = span.addChild("input", control + "_" + item.id);
            radio.attribute("name" , control);
            radio.attribute("type" , "radio");
            radio.attribute("value", item.id);
            if (item.id === val) {
                radio.attribute("checked", "checked");
            }
            label = span.addChild("label");
            label.attribute("for", control + "_" + item.id);
            label.addText(item.label);
        }
    }
};

x.LoV.renderMulti = function (div, render_opts, control, pieces, css_class) {
    var inner,
        i,
        item,
        span,
        checkbox,
        label;
    x.log.functionStart("renderMulti", this, arguments);
    if (!this.loaded) {
        this.loadDocument();
    }
    inner = div.addChild("span", control, css_class);
    checkbox = inner.addChild("input");
    checkbox.attribute("name" , control);
    checkbox.attribute("type" , "hidden");
//    div.attribute("id", control, css_class);
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            span = inner.addChild("span", null, "css_attr_item");
            checkbox = span.addChild("input", control + "." + item.id);
            checkbox.attribute("name" , control);
            checkbox.attribute("type" , "checkbox");
            checkbox.attribute("value", item.id);
            if (pieces.indexOf(item.id) > -1) {
                checkbox.attribute("checked", "checked");
            }
            label = span.addChild("label");
            label.attribute("for", control + "." + item.id);
            label.addText(item.label);
        }
    }
};

x.LoV.queryMerge = function (query, lov_column, callback) {
    var count,
        col_val;
    x.log.functionStart("queryMerge", this, arguments);
    count = {};
    this.each(function(item) {
        count[item.id] = 0;
    });
    while (query.next()) {
        col_val = query.getColumn(lov_column).get();
        count[col_val] += 1;
    }
    query.reset();
    this.each(function(item) {
        callback(item, count[item.id]);
    });
};

x.LoV.getCountString = function (include_zeros) {
    var str = "",
        delim = "",
        index;
    x.log.functionStart("getCountString", this, arguments);
    this.each(function (item) {
        if (item.count > 0 || include_zeros) {
            str += delim + "<b>" + item.count + "</b> <i>" + item.label + "</i>";
            delim = ", ";
        }
    });
    index = str.lastIndexOf(",");
    if (index > -1) {
        str = str.substr(0, index) + " and " + str.substr(index + 1);
    }
    if (!delim) {
        str = "no";
    }
    return str;
};



x.ObjectLoV = x.LoV.clone({
    id                      : "ObjectLoV",
});

x.ObjectLoV.loadObject = function (obj) {
    var that = this;
    x.log.functionStart("loadObject", this, arguments);
    if (!this.label_property) {
        throw new Error("no label property defined: " + this);
    }
    obj.forOwn(function (prop_id, prop_val) {
        that.addItem(prop_id, prop_val[that.label_property], that.active_property ? prop_val[that.active_property] : true);
    });
};

x.ObjectLoV.loadArray = function (array) {
    var i;
    x.log.functionStart("loadArray", this, arguments);
    for (i = 0; i < array.length; i += 1) {
        this.addItem(array[i][this.id_property], array[i][this.label_property], this.active_property ? prop_val[this.active_property] : true);
    }
    if (!lastItem) {
        throw new Error("no config items found: " + this);
    }
};


x.DocumentLoV = x.LoV.clone({
    id                      : "DocumentLoV",
});

x.DocumentLoV.clone = function (spec) {
    var new_obj;
    new_obj = x.LoV.clone.call(this, spec);
    if (spec.entity_id && spec.key) {
        new_obj.startDocumentLoad(spec.entity_id, spec.key);
    }
    return new_obj;
};

x.DocumentLoV.startDocumentLoad = function (entity_id, key) {
    this.document = x.entities[entity_id].getDocument(key);
};

x.DocumentLoV.loadRow = function (row) {
    this.addItem(row.getField(this.id_field).get(), row.getField(this.label_field).get(), true);
};

x.DocumentLoV.loadDocument = function () {
    var that = this;
//    if (!this.document || this.document.isWaiting()) {
//        throw new Error("this.document doesn't exist or is loading");
//    }
    if (!this.list_sub_entity || !this.document.child_rows[this.list_sub_entity]) {
        throw new Error("this.list_sub_entity not defined or not present");
    }
    this.document.eachChildRow(function (row) {
        that.loadRow(row);
    }, this.list_sub_entity);
};


//To show up in Chrome debugger...
//@ sourceURL=da/LoV.js