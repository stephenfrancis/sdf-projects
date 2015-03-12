/*global x, java */
"use strict";


x.data.addClone(x.base.OrderedMap, {
    id                      : "LoV",
    blank_label             : "[blank]",
    choose_label            : "[choose]",
});

x.data.LoV.addItem = function (id, label, active) {
    x.log.functionStart("addItem", this, arguments);
    if (!label) {
        throw new Error("label must be nonblank: " + this + "." + id);
    }
    if (typeof active !== "boolean") {
        throw new Error("active property must be boolean: " + this + "." + id);
    }
    x.log.trace("Adding item { id:" + this.id + ":" + id + ", label:" + label + ", active:" + active + "}");
    return this.add(x.base.Base.clone({ id: id, label: label, active: active }));
};
    
x.data.LoV.getItem = function (id) {
    var item = null;
    x.log.functionStart("getItem", this, arguments);
    item = this.get(id);
    if (!item && this.entity) {
        item = this.loadEntity(id);
    }
    return item;
};

x.data.LoV.render = function (parent_elmt, render_opts, val, control, css_class, mandatory) {
    var i,
        item,
        select_elmt;

    x.log.functionStart("render", this, arguments);
    select_elmt = parent_elmt.makeElement("select", css_class, control);
    if (!mandatory) {
        select_elmt.makeOption("", this. blank_label, !val);
    } else if (!val || !this.getItem(val) || !this.getItem(val).active) {
        select_elmt.makeOption("", this.choose_label, true);
    }
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            select_elmt.makeOption(item.id, item.label, (item.id === val));
        }
    }
    return select_elmt;
};

x.data.LoV.renderRadio = function (parent_elmt, render_opts, val, control, css_class, mandatory) {
    var span_elmt,
        i,
        item;

    x.log.functionStart("renderRadio", this, arguments);
    span_elmt = parent_elmt.makeElement("span", css_class, control);
    if (!mandatory) {
        span_elmt.makeRadioLabelSpan(control, "__", this.blank_label || "[blank]", !val);
    }
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            span_elmt.makeRadioLabelSpan(control, item.id, item.label, (item.id === val));
        }
    }
};

x.data.LoV.renderMulti = function (parent_elmt, render_opts, control, pieces, css_class) {
    var   span_elmt,
        hidden_elmt,
        i,
        item;

    x.log.functionStart("renderMulti", this, arguments);
    if (!this.loaded) {
        this.loadDocument();
    }
      span_elmt = parent_elmt.makeElement("span", css_class, control);
    hidden_elmt = span_elmt.makeInput("hidden");
    hidden_elmt.attr("name" , control);
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            span_elmt.makeCheckboxLabelSpan(control, item.id, item.label, (pieces.indexOf(item.id) > -1));
        }
    }
};

x.data.LoV.queryMerge = function (query, lov_column, callback) {
    var count,
        col_val;
    x.log.functionStart("queryMerge", this, arguments);
    count = {};
    this.each(function (item) {
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

x.data.LoV.getCountString = function (include_zeros) {
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



x.ObjectLoV = x.data.LoV.clone({
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


x.DocumentLoV = x.data.LoV.clone({
    id                      : "DocumentLoV",
});

x.DocumentLoV.clone = function (spec) {
    var new_obj;
    new_obj = x.data.LoV.clone.call(this, spec);
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
//@ sourceURL=data/LoV.js