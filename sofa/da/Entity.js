/*global x, java */
"use strict";

x.entities = {};

x.documents = [];

x.Entity = x.FieldSet.clone({
    id                      : "Entity",
    database_url            : "http://other_apps:5984/stevief/",
    events                  : x.EventStack.clone({ id: "Record.events", events: [
                                  "initCreate", "initUpdate", "load", "reload", "update", "afterTransChange", "presave" ] })
});

// status: 'N'ew, 'L'oading, 'U'nmodified, 'M'odified, 'S'aving;    N > S > U,   L > U,   U > M > S > U,   S > E,   L > E

x.Entity.clone = function (spec) {
    var new_obj;
    x.log.functionStart("clone", this, arguments);
    if (this.instance) {
        throw x.Exception.clone({ id: "cannot_clone_instance" });
    }
    new_obj = x.FieldSet.clone.call(this, spec);
    if (new_obj.instance) {
        if (this.primary_key) {
            new_obj.primary_key = new_obj.getField(this.primary_key);
            if (!new_obj.primary_key) {
                throw new Error("configuration error: invalid primary_key: " + new_obj.id);
            }
        }
        this.child_rows = {};
    } else {
        new_obj.events         = this.events  .clone({ id: new_obj.id + ".events" });
        new_obj.events.record  = new_obj;
    }
    return new_obj;
};



x.Entity.getDocument = function (key) {
    var doc,
        doc_id;
    x.log.functionStart("getDocument", this, arguments);
    key = key || "";
    doc_id = key && ((!this.primary_key.auto_generate ? this.id + ":" : "") + key);
    doc = this.clone({
        id: key || this.id,
        doc_id: doc_id,
        instance: true,
        modifiable: true
    });
    if (key) {
        doc.load();
    } else {
        doc.status = 'N';    // New
    }
    x.documents.push(doc);
    return doc;
};

x.Entity.isWaiting = function () {
    return (this.status === 'L' || this.status === 'S');
};

x.Entity.whenFinishedWaitingForDocuments = function (callback) {
    x.documents_waiting_callback = callback;
    x.Entity.runCallbackIfNoLongerWaiting();
};

x.Entity.waitingForDocuments = function (callback) {
    var waiting = false,
        i;
    for (i = 0; i < x.documents.length && !waiting; i += 1) {
        waiting = x.documents[i].isWaiting();
    }
    return waiting;
};

x.Entity.runCallbackIfNoLongerWaiting = function () {
    if (typeof x.documents_waiting_callback === "function" && !x.Entity.waitingForDocuments()) {
        x.documents_waiting_callback();
        x.documents_waiting_callback = null;
    }
};


x.Entity.addChild = function (entity_id) {
    var new_row;
    x.log.functionStart("addChild", this, arguments);
//    if (!this.parent.children || !this.parent.children[entity_id]) {
//        throw new Error("Not a child of this entity: " + entity_id);
//    }
//    new_row = this.parent.children[entity_id].clone({
    if (!this.child_rows[entity_id]) {
        this.child_rows[entity_id] = [];
    }
    new_row = x.entities[entity_id].clone({
        id: this.id + "/" + entity_id + "[" + this.child_rows[entity_id].length + "]",
        instance: true, modifiable: true, owner: this
    });
    this.child_rows[entity_id].push(new_row);
    return new_row;
};

x.Entity.eachChildRow = function (funct, specific_entity_id) {
    x.log.functionStart("eachChildRow", this, arguments);
    this.child_rows.forOwn(function (entity_id, row_array) {
        if (!specific_entity_id || specific_entity_id === entity_id) {
            row_array.forOwn(function (i, row) {
                funct(row);
            });
        }
    });
};

x.Entity.load = function () {
    var that = this;
    x.log.functionStart("load", this, arguments);
    if (this.status) {
        throw new Error("invalid document status: " + this.status);
    }
    if (this.owner) {
        throw new Error("invalid call on child row: " + this);
    }
    x.log.debug(this, "load() doc_id: " + this.doc_id);
    this.status = 'L';    // Loading
    x.http({ url: this.database_url + encodeURIComponent(this.doc_id), cache: false, async: false, type: "GET",
        success: function (data_back) {
            x.log.debug(that, "calling load.success()");
            if (that.status !== 'L') {
                throw new Error("invalid document status - " + that.status);
            }
            that.populate(data_back);
//            that.primary_key.setInitial(that.doc_id);
            that.primary_key.fixed_key = true;
            that.rev    = data_back._rev;
            that.status = 'U';
            // trigger loaded
            x.Entity.runCallbackIfNoLongerWaiting();
        },
        error: function (code, msg) {
            x.log.debug(that, "calling load.error()");
            that.status = 'E';
            that.error  = "[" + code + "] " + msg;
            x.Entity.runCallbackIfNoLongerWaiting();
        }
    });
};

x.Entity.save = function () {
    var that = this,
        url;
    x.log.functionStart("save", this, arguments);
    if (this.status !== 'N' && this.status !== 'M') {
        throw new Error("invalid document status - " + this.status);
    }
    if (this.owner) {
        throw new Error("invalid call on child row: " + this);
    }
    if (!this.isValid()) {
        throw new Error("document is not valid");
    }
    if (!this.doc_id) {
        if (!this.primary_key.auto_generate) {
            if (this.primary_key.isBlank()) {
                throw new Error("primary key not populated");
            }
            this.doc_id = this.id + ":" + this.primary_key.get();
        }
    }
    url = this.database_url + encodeURIComponent(this.doc_id);
    if (this.rev) {
        url += "?rev=" + this.rev;
    }
    x.log.debug(this, "save() doc_id: " + this.doc_id + ", rev: " + this.rev);
    this.status = 'S';    // Saving
    x.http({ url: url, cache: false, async: false, type: (this.doc_id ? "PUT" : "POST"), data: JSON.stringify(this.getData()),
        success: function (data_back) {
            x.log.debug(that, "calling save.success()");
            if (that.status !== 'S') {
                throw new Error("invalid document status: " + that.status);
            }
            if (data_back.ok) {
                that.status = 'U';
                that.doc_id = data_back.id;
                that.rev    = data_back.rev;
                // trigger loaded
            } else {
                that.status = 'E';
                that.error  = "unknown: " + data_back.ok;
            }
            x.Entity.runCallbackIfNoLongerWaiting();
        },
        error: function (code, msg) {
            x.log.debug(that, "calling save.error()");
            that.status = 'E';
            that.error  = "[" + code + "] " + msg;
            x.Entity.runCallbackIfNoLongerWaiting();
        }
    });
};

x.Entity.populate = function (data_back) {
    var that = this;
    x.log.functionStart("populate", this, arguments);
    this.each(function (field) {
        if (typeof data_back[field.id] === "string") {
            field.setInitial(data_back[field.id]);
        }
    });
    if (data_back.child_rows) {
        data_back.child_rows.forOwn(function (entity_id, row_array) {
            row_array.forOwn(function (i, row) {
                that.addChild(entity_id).populate(row);
            });
        });
    }
};

x.Entity.getData = function () {
    var out = {};
    x.log.functionStart("getData", this, arguments);
    if (!this.owner) {
        out.entity_id = this.parent.id;
    }
    this.each(function (field) {
        field.getData(out);
    });
    this.eachChildRow(function (row) {
        if (!out.child_rows) {
            out.child_rows = {};
        }
        if (!out.child_rows[row.parent.id]) {
            out.child_rows[row.parent.id] = [];
        }
        if (!row.deleting) {
            out.child_rows[row.parent.id].push(row.getData());
        }
    });
    return out;
};

x.Entity.getLabel = function (pattern_type) {
    var pattern = this["label_pattern_" + pattern_type] || this.label_pattern;
    x.log.functionStart("getLabel", this, arguments);
    return this.detokenize(pattern);
};

x.Entity.getPluralLabel = function () {
    x.log.functionStart("getPluralLabel", this, arguments);
    return this.plural_label || this.title + "s";
};

x.Entity.getSearchPage = function () {
    var page_id = this.id + "_search";
    x.log.functionStart("getSearchPage", this, arguments);
    if (typeof this.search_page === "string") {
        page_id = this.search_page;
    }
    return x.pages[page_id];
};

x.Entity.getDisplayPage = function () {
    var page_id = this.id + "_display";
    x.log.functionStart("getDisplayPage", this, arguments);
    if (typeof this.display_page === "string") {        // ignores this.display_page if boolean
        page_id = this.display_page;
    }
    return x.pages[page_id];
};

x.Entity.getDisplayURL = function (key) {
    x.log.functionStart("getDisplayURL", this, arguments);
    if (typeof key !== "string") {
        key = this.getKey();
    }
    this.checkKey(key);            // throws exception if key is invalid
    return this.getDisplayPage().getSimpleURL(key);
};


x.Entity.isValid = function () {
    var valid;
    x.log.functionStart("isValid", this, arguments);
    valid = (x.FieldSet.isValid.call(this) && this.status !== 'E');
    this.eachChildRow(function (row) {
        valid = valid && (row.deleting || row.isValid());
    });
    return valid;
};

x.Entity.getMessages = function (collector, delim) {
    x.log.functionStart("getMessages", this, arguments);
    if (!collector) {
        collector = "";
    }
    if (this.error) {
        collector = this.addMessageArray(collector, delim, [{ type: 'E', text: this.error }]);
    }
    collector = x.FieldSet.getMessages.call(this, collector, delim);
    this.eachChildRow(function (row) {
        collector = row.getMessages(collector, delim);
    });
    return collector;
};


x.Entity.beforeFieldChange = function (field, new_val) {
    x.log.functionStart("beforeFieldChange", this, arguments);
    x.FieldSet.beforeFieldChange.call(this, field, new_val);
    if (!this.owner && this.status !== 'N' && this.status !== 'U' && this.status !== 'M') {
        throw new Error("invalid document status - " + this.status);
    }
};

x.Entity.afterFieldChange = function (field, old_val) {
    x.log.functionStart("afterFieldChange", this, arguments);
    x.FieldSet.afterFieldChange.call(this, field, old_val);
    this.setModified();
};

x.Entity.setModified = function () {
    if (this.owner) {
        this.owner.setModified();
    } else {
        this.status = "M";
    }
};


x.Entity.update  = function () {
    var label = this.getLabel();
    this.events.trigger("update", this);
};

x.Entity.presave = function (outcome_id) {
    this.presave_called = true;
    this.events.trigger("presave", this, outcome_id);
};


// This function is NOT defined in an entity unless it actually does something
// - so the existence of this function indicates whether or not record security is applicable for the entity.
//x.Entity.addSecurityCondition = function (query, session) {
//};


x.Entity.renderLineItem = function (element, render_opts) {
    var display_page,
        anchor;
    x.log.functionStart("renderLineItem", this, arguments);
    display_page = this.getDisplayPage();
    anchor = element.addChild("a");
    if (display_page) {
        anchor.attribute("href", display_page.getSimpleURL(this.getKey()));
//        anchor.addChild("img")
//            .attribute("alt", display_page.title)
//            .attribute("src", "/rsl_shared/" + this.icon.replace(/\/24x24\//g, "/16x16/"));
//        sctn_elem.addText(" ");
    }
    anchor.addText(this.getLabel("list_item"));
//    this.getField(this.line_item_field || this.title_field).render(element, render_opts);
    return anchor;
};

x.Entity.renderTile = function (parent_elem, render_opts) {
    var anchor_elem;
    x.log.functionStart("renderTile", this, arguments);
    anchor_elem = parent_elem.addChild("a", this.id + "_" + this.getKey(), "btn css_tile");
    this.addTileURL(anchor_elem, render_opts);
    this.addTileContent(anchor_elem, render_opts);
};

x.Entity.addTileURL = function (anchor_elem, render_opts) {
    var display_page;
    x.log.functionStart("addTileURL", this, arguments);
    display_page = this.getDisplayPage();
    if (display_page) {
        anchor_elem.attribute("href", display_page.getSimpleURL(this.getKey()));
    }
};

x.Entity.addTileContent = function (anchor_elem, render_opts) {
    x.log.functionStart("addTileContent", this, arguments);
    if (this.icon) {
        anchor_elem.addChild("img")
            .attribute("alt", this.title)
            .attribute("src", "/rsl_shared/" + this.icon);
    }
    anchor_elem.addText(this.getLabel("tile"));
};


x.Entity.obfuscate = function () {
    this.each(function (field) { 
        field.obfuscate();
    });
};


//To show up in Chrome debugger...
//@ sourceURL=da/Entity.js