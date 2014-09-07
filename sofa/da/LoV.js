/*global x, java */
"use strict";


x.LoV = x.OrderedMap.clone({
    id                      : "LoV",
    blank_label             : "[blank]",
    choose_label            : "[choose]",
    complete                : false,        // loaded all rows in entity?
});
x.LoV.doc = {
    location                : "x",
    file                    : "$Header: /rsl/rsl_app/core/trans/LoV.js,v 1.55 2014/07/22 07:50:56 francis Exp $",
    purpose                 : "To support a list of available options for drop-downs, radio buttons, etc",
    properties              : {
        complete            : { label: "Whether or this LoV is completely loaded (only relevant for 'entity' or 'list' LoVs", type: "boolean", usage: "read only" },
        entity              : { label: "String id of entity for 'entity' LoV only", type: "string", usage: "required in spec (if 'entity' LoV)" },
        list                : { label: "String id of list for 'list' LoV only (e.g. 'sy.yesno')", type: "string", usage: "required in spec (if 'list' LoV)" }
    }
};


x.LoV.getBasicLoV = function () {
    var lov;
    x.log.functionStart("getBasicLoV", this, arguments);
    lov = x.LoV.clone({ id: "dummy" });
    return lov;
};

x.LoV.getListLoV = function (list_id, session) {
    var lov;
    x.log.functionStart("getListLoV", this, arguments);
    lov = x.LoV.clone({ id: list_id, list: list_id });
    lov.loadList();
    return lov;
};

x.LoV.resetCachedListLoV = function (session, list_id) {
    var lov;
    x.log.functionStart("resetCachedListLoV", this, arguments);
};

x.LoV.getEntityLoV = function (entity_id, session, condition) {
    var lov;
    x.log.functionStart("getEntityLoV", this, arguments);
    lov = x.LoV.clone({ id: entity_id, entity: entity_id, condition: condition });
    return lov;
};

x.LoV.resetCachedEntityLoV = function (session, entity_id, key) {
    var cache_code,
        lov;
    x.log.functionStart("resetCachedEntityLoV", this, arguments);
};

x.LoV.addItem = function (id, label, active) {
    x.log.functionStart("addItem", this, arguments);
    if (!label) {
        throw x.Exception.clone({ id: "label_must_be_nonblank", lov: this, item: this.id + ":" + id });
    }
    if (typeof active !== "boolean") {
        throw x.Exception.clone({ id: "active_property_must_be_boolean", lov: this, item: this.id + ":" + id });
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

x.LoV.clear = function () {
    x.log.functionStart("clear", this, arguments);
    x.OrderedMap.clear.call(this);
    this.complete = false;
};

x.LoV.reload = function () {
    x.log.functionStart("reload", this, arguments);
    if (this.list) {
        this.loadList();
    } else if (this.entity) {
        this.loadEntity();
    } else if (this.config_item && this.label_prop) {
        this.loadObject(x.Base.getObject(this.config_item), this.label_prop, this.active_prop);
    }
};

x.LoV.loadList = function () {
    var sql,
        lastItem = null,
        resultset;

    x.log.functionStart("loadList", this, arguments);
    if (!this.list || typeof this.list !== "string" || !this.list.match(/^[a-z]{2}\.[a-z_]+$/)) {
        throw x.Exception.clone({ id: "invalid_list_id", lov: this, list: this.list });
    }
    this.clear();
    sql = "SELECT SQL_CACHE id, text, active FROM sy_list_item WHERE list=" + x.sql.escape(this.list) + " ORDER BY seq_number";
    try {
        resultset = x.sql.connection.executeQuery(sql);
        while (resultset.next()) {
            lastItem = this.addItem(String(resultset.getString(1)), String(resultset.getString(2)), (String(resultset.getString(3)) === "A"));
        }
    } catch (e) {
        x.log.report(e);
    } finally {
        x.sql.connection.finishedWithResultSet(resultset);
    }
    resultset.close();
    this.complete = true;
    return lastItem;
};

x.LoV.loadEntity = function (key, condition) {
    var rcd,
        query,
        lastItem = null;

    x.log.functionStart("loadEntity", this, arguments);
    condition = condition || this.condition;
    if (!this.entity) {
        throw x.Exception.clone({ id: "entity_not_specified", lov: this });
    }
    if (!x.entities[this.entity]) {
        throw x.Exception.clone({ id: "unknown_entity", entity: this.entity, lov: this });
    }
    rcd = x.entities[this.entity].clone({ id: this.entity, connection: this.connection || x.sql.connection });
    if (key) {
        rcd.checkKey(key);            // throws Exception is key is invalid
        if (this.get(key)) {
            this.remove(key);
        }
    }
    query = rcd.getQuery();
    query.use_query_cache = true;
    if (key) {
        query.addCondition({ column: "A._key", operator: "=", value: key });
    } else {
        rcd.setDefaultSort(query);            // only sort if getting lots of records
        if (condition) {
            query.addCondition({ full_condition: condition });
        }
        this.clear();
    }
    while (query.next()) {
        rcd.populate(query.resultset);
        lastItem = this.addItem(rcd.getKey(), rcd.getLabel("dropdown"), true);
    }
    query.reset();
    if (!key) {
        this.complete = true;
    }
    return lastItem;
};

x.LoV.loadObject = function (obj, label_prop, active_prop) {
    var i,
        active = true,
        lastItem = null;
    x.log.functionStart("loadObject", this, arguments);
    this.clear();
    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (active_prop) {
                active = obj[i][active_prop];
            }
            lastItem = this.addItem(i, obj[i][label_prop], active);
        }
    }
    if (!lastItem) {
        throw x.Exception.clone({ id: "no_config_items_found", lov: this });
    }
    this.complete = true;
    return lastItem;
};

x.LoV.loadArray = function (array, id_prop, label_prop, active_prop) {
    var i,
        active = true,
        lastItem = null;
    x.log.functionStart("loadArray", this, arguments);
    this.clear();
    for (i = 0; i < array.length; i += 1) {
        if (active_prop) {
            active = array[i][active_prop];
        }
        lastItem = this.addItem(array[i][id_prop], array[i][label_prop], active);
    }
    if (!lastItem) {
        throw x.Exception.clone({ id: "no_config_items_found", lov: this });
    }
    this.complete = true;
    return lastItem;
};

x.LoV.render = function (div, render_opts, val, control, css_class, mandatory) {
    var i,
        item,
        select,
        option;
    x.log.functionStart("render", this, arguments);
    if (!this.complete) {
        this.reload();
    }
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
    if (!this.complete) {
        this.reload();
    }
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
    if (!this.complete) {
        this.reload();
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

x.LoV.addCountsFromSQL = function (sql) {
    var resultset,
        item;
    x.log.functionStart("addCountsFromSQL", this, arguments);
    try {
        resultset = x.sql.connection.executeQuery(sql);
        while (resultset.next()) {
            item = this.getItem(x.sql.getColumnString(resultset, 1));
            if (item) {
                item.count = resultset.getInt(2);
            }
        }
    } catch (e) {
        x.log.report(e);
    } finally {
        x.sql.connection.finishedWithResultSet(resultset);
    }
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

//To show up in Chrome debugger...
//@ sourceURL=da/LoV.js