/*global x, java */
"use strict";

x.entities = {};

x.Entity = x.FieldSet.clone({
    id                      : "Entity",
    database_url            : "http://localhost:5984/stevief/"
//    events                  : x.EventStack.clone({ id: "Record.events", events: [
//                                  "initCreate", "initUpdate", "load", "reload", "update", "afterTransChange", "presave" ] }),
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
        } else if (!this.parent_entity) {
            throw new Error("configuration error: entity must have primary_key or parent_entity");
        }
        if (this.children) {
            new_obj.children = {};
            this.children.forOwn(function (entity_id) {
                new_obj.children[entity_id] = [];
            });
        }
//        new_obj.status = 'C';
    } else {
        if (new_obj.parent_entity) {            // parent_entity MUST be loaded first
            x.log.trace("Linking " + new_obj.id + " to its parent " + new_obj.parent_entity );
            if (!x.entities[new_obj.parent_entity]) {
                throw x.Exception.clone({ id: "invalid_parent_entity", entity: new_obj.id, parent_entity: new_obj.parent_entity });
            }
            if (!x.entities[new_obj.parent_entity].children) {
                x.entities[new_obj.parent_entity].children = {};
            }
            x.entities[new_obj.parent_entity].children[new_obj.id] = new_obj;
        }
    }
    return new_obj;
};



x.Entity.getDocument = function (key) {
    var doc,
        doc_id_prefix = (key && !this.primary_key.auto_generate ? this.id + ":" : "");
    x.log.functionStart("getDocument", this, arguments);
    key = key || "";
    doc = this.clone({
        id: key || this.id,
        doc_id: doc_id_prefix + key,
        instance: true,
        modifiable: true
    });
    if (key) {
        doc.load();
    } else {
        doc.status = 'N';    // New
    }
    return doc;
};

x.Entity.addChild = function (entity_id) {
    if (!this.children || !this.children[entity_id]) {
        throw new Error("Not a child of this entity: " + entity_id);
    }
    new_row = this.parent.children[entity_id].clone({
        id: this.id + "/" + entity_id + "[" + this.children[entity_id].length + "]",
        instance: true, modifiable: true, owner: this
    });
    this.children[entity_id].push(new_row);
    return new_row;
};

x.Entity.eachChildRow = function (funct) {
    if (this.children) {
        this.children.forOwn(function (entity_id, row_array) {
            row_array.forOwn(function (i, row) {
                funct(row);
            });
        });
    }
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
    x.http({ url: this.database_url + this.doc_id, cache: false, async: false, type: "GET",
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
        },
        error: function (code, msg) {
            x.log.debug(that, "calling load.error()");
            that.status = 'E';
            that.error  = "[" + code + "] " + msg;
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
        throw new Error("document is not valid: " + this.getError());
    }
    if (!this.doc_id) {
        if (!this.primary_key.auto_generate) {
            if (this.primary_key.isBlank()) {
                throw new Error("primary key not populated");
            }
            this.doc_id = this.id + ":" + this.primary_key.get();
        }
    }
    url = this.database_url + this.doc_id;
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
        },
        error: function (code, msg) {
            x.log.debug(that, "calling save.error()");
            that.status = 'E';
            that.error  = "[" + code + "] " + msg;
        }
    });
};

x.Entity.populate = function (data_back) {
    x.log.functionStart("populate", this, arguments);
    print(JSON.stringify(data_back));
    this.each(function (field) {
        if (typeof data_back[field.id] === "string") {
            field.setInitial(data_back[field.id]);
        }
    });
    if (this.children && data_back.children) {
        data_back.children.forOwn(function (entity_id, row_array) {
            row_array.forOwn(function (i, row) {
                this.addChild(entity_id).populate(row);
            });
        });
    }
};

x.Entity.getData = function () {
    var out = {};
    x.log.functionStart("getData", this, arguments);
    this.each(function (field) {
        field.getData(out);
    });
    this.eachChildRow(function (row) {
        if (!out.children) {
            out.children = {};
        }
        if (!out.children[row.parent.id]) {
            out.children[row.parent.id] = [];
        }
        out.children[row.parent.id].push(row.getData());
    });
    return out;
};

x.Entity.getLabel = function (pattern_type) {
    var pattern = this["label_pattern_" + pattern_type] || this.label_pattern || "{" + this.title_field + "}";
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
        valid = valid && row.isValid();
    });
    return valid;
};


x.Entity.setDelete = function (bool) {
    var that = this;
    x.log.functionStart("setDelete", this, arguments);
    x.FieldSet.setDelete.call(this, bool);
/* - nice idea, but needs testing                        TODO
    if (this.action === "C" || this.action === "I") {
        this.action = bool ? "I" : "C";        // 'I' = ignore (create & delete); 'C' = create
    } else if (this.action === "U" || this.action === "D") {
        this.action = bool ? "D" : "U";        // 'D' = delete; 'U' = update
    }
*/
    if (this.deleting && this.db_record_exists && !this.db_record_locked) {
//        this.lock();      trans.getRow() and trans.getActiveRow() now lock the obtained row
        this.eachChildRow(function(row, query) {
            if (!row) {
                row = query.getRow(that.trans);
            }
            row.setDelete(bool);
        });
    }
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
    x.log.trace("afterFieldChange: " + field.getId() + ", " + old_val + "->" + field.get());
    x.FieldSet.afterFieldChange.call(this, field, old_val);
    if (!this.owner) {
        this.status = "M";
    }
};


x.Entity.update  = function () {
    var label = this.getLabel();
    if (this.messages && this.messages.prefix) {            // Only update prefix if it not blank
        this.messages.prefix = this.title;
        if (label) {
            this.messages.prefix += " " + label;
        }
        if (this.duplicate_key) {
            this.messages.add({ type: 'E', text: "Duplicate key" });
        }
    }
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