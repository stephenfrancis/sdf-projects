/*jslint node: true */
/*globals define, Promise */
"use strict";


define(["./FieldSet", "../base/Log"], function (FieldSet, Log) {

    return FieldSet.clone({

        id                      : "Entity",
        database_url            : "http://other_apps:5984/stevief/",
        promise_cache           : null,             // map created per Entity

//    events                  : x.data.EventStack.clone({ id: "Record.events", events: [
//                                  "initCreate", "initUpdate", "load", "reload", "update", "afterTransChange", "presave" ] })

// status: 'N'ew, 'B'efore Load, 'L'oading, 'U'nmodified, 'M'odified, 'S'aving;    N > S > U,   B > L > U,   U > M > S > U,   S > E,   L > E

        clone : function (spec) {
            var new_obj;
            if (this.instance) {
                throw new Error("cannot clone an instance object");
            }
            new_obj = FieldSet.clone.call(this, spec);
            if (new_obj.instance) {
                if (this.primary_key) {
                    new_obj.primary_key_field = new_obj.getField(this.primary_key);
                    if (!new_obj.primary_key_field) {
                        throw new Error("configuration error: invalid primary_key: " + new_obj.id);
                    }
                }
                new_obj.child_rows = {};
        //    } else {
        //        new_obj.events         = this.events  .clone({ id: new_obj.id + ".events" });
        //        new_obj.events.record  = new_obj;
            } else {
                new_obj.promise_cache = {};
            }
            return new_obj;
        },

/*
        addPage : function (spec) {
            var page;
        //    spec.entity = this;
            if (!this.pages) {
                this.pages = { id: "pages", owner: this };
            }
            if (this.pages[spec.id]) {
                throw new Error("page already exists: " + spec.id);
            }
            page = (spec.type || x.page.Page).clone(spec);
            page.owner = this;
            this.pages[spec.id] = page;
            return page;
        },
*/

        // if the document is loaded from the server then
        //      doc_id is either a uuid (if primary_key.auto_generate), or else {module}.{entity}:{primary key}
        // otherwise, it is null
        getDocId : function (key) {
            var doc_id = "";
            if (this.primary_key_field.auto_generate) {
                if (this.primary_key_field.isBlank()) {
                    this.primary_key_field.autoGenerate();
                }
            } else {
                doc_id = this.url_prefix || (this.path() + ":");
            }
            doc_id += (key || this.primary_key_field.get());
            return doc_id;
        },

        getDocPromise : function (key) {
            var doc,
                promise;
  
            key = key || "";
            if (key) {
                promise = this.promise_cache[this.path() + ":" + key];
                if (promise) {
                    return promise;
                }
            }
        //    doc_id = key && ((!this.primary_key.auto_generate ? this.id + ":" : "") + key);
            doc = this.clone({
                id: key || this.id,
                status: key ? 'B' : 'N',            // 'B'efore Load or 'N'ew
                instance: true,
                modifiable: true
            });
            if (key) {
                promise = new Promise(function (resolve, reject) {
                    doc.load(resolve, reject);
                });
                this.promise_cache[this.path() + ":" + key] = promise;
            } else {
                promise = new Promise(doc);
            }
            return promise;
        },

        isWaiting : function () {
            return (this.status === 'L' || this.status === 'S');
        },


        addChild : function (entity_id) {
            var new_row;
        //    if (!this.parent.children || !this.parent.children[entity_id]) {
        //        throw new Error("Not a child of this entity: " + entity_id);
        //    }
        //    new_row = this.parent.children[entity_id].clone({
            if (!this.child_rows[entity_id]) {
                this.child_rows[entity_id] = [];
            }
            new_row = this.getEntity(entity_id).clone({
                id: this.id + "/" + entity_id + "[" + this.child_rows[entity_id].length + "]",
                instance: true, modifiable: true, owner: this
            });
            this.child_rows[entity_id].push(new_row);
            return new_row;
        },

        eachChildRow : function (funct, specific_entity_id) {
            this.child_rows.forOwn(function (entity_id, row_array) {
                if (!specific_entity_id || specific_entity_id === entity_id) {
                    row_array.forOwn(function (i, row) {
                        funct(row);
                    });
                }
            });
        },

        getLoadURL : function (key) {
            return this.database_url + encodeURIComponent(this.getDocId(key));
        },

        load : function (resolve, reject) {
            var that = this;
            if (this.status !== 'B') {
                reject("invalid document status: " + this.status);
            }
            Log.debug(this, "load() doc_id: " + this.getDocId());
            this.status = 'L';    // Loading
            Http.exchange({ url: this.getLoadURL(this.id), cache: false, async: false, type: "GET",
                success: function (data_back) {
                    that.loadSuccess(resolve, reject, data_back);
                },
                error: function (code, msg) {
                    that.loadError(resolve, reject, code, msg);
                }
            });
        },

        loadSuccess : function (resolve, reject, data_back) {
            if (this.status !== 'L') {
                reject("invalid document status - " + this.status);
            }
            this.populate(data_back);
        //            this.primary_key.setInitial(this.doc_id);
            this.primary_key_field.fixed_key = true;
            this.rev    = data_back._rev;
            this.status = 'U';
            resolve(this);
        },

        loadError : function (resolve, reject, code, msg) {
            this.status = 'E';
            this.error = code.status;
            reject(this.error);
        },

        getSaveURL : function () {
            var url = this.database_url + encodeURIComponent(this.doc_id);
            if (this.rev) {
                url += "?rev=" + this.rev;
            }
            return url;
        },

        save : function (resolve, reject) {
            var that = this;
            if (this.status !== 'N' && this.status !== 'M') {
                reject("invalid document status - " + this.status);
            }
            if (!this.isValid()) {
                reject("document is not valid");
            }
            Log.debug(this, "save() doc_id: " + this.doc_id + ", rev: " + this.rev);
            this.status = 'S';    // Saving
            Http.exchange({ url: this.getSaveURL(), cache: false, async: false, type: (this.doc_id ? "PUT" : "POST"), data: JSON.stringify(this.getData()),
                success: function (data_back) {
                    that.saveSuccess(resolve, reject, data_back);
                },
                error: function (code, msg) {
                    that.saveError(resolve, reject, code, msg);
                }
            });
        },

        saveSuccess : function (resolve, reject, data_back) {
            if (this.status !== 'S') {
                reject("invalid document status: " + this.status);
            }
            if (data_back.ok) {
                this.status = 'U';
                this.doc_id = data_back.id;
                this.rev    = data_back.rev;
                // trigger loaded
                resolve(this);
            } else {
                this.status = 'E';
                this.error  = "unknown: " + data_back.ok;
                reject(this.error);
            }
        },

        saveError : function (resolve, reject, code, msg) {
            this.status = 'E';
            this.error  = "[" + code + "] " + msg;
            reject(this.error);
        },

        populate : function (data_back) {
            var that = this;
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
        },

        getData : function () {
            var out = {};
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
        },

        getLabel : function (pattern_type) {
            var pattern = this["label_pattern_" + pattern_type] || this.label_pattern;
            return this.detokenize(pattern);
        },

        getPluralLabel : function () {
            return this.plural_label || this.title + "s";
        },

        getSearchPage : function () {
            var page_id = this.id + "_search";
            if (typeof this.search_page === "string") {
                page_id = this.search_page;
            }
            return this.pages[page_id];
        },

        getDisplayPage : function () {
            var page_id = this.id + "_display";
            if (typeof this.display_page === "string") {        // ignores this.display_page if boolean
                page_id = this.display_page;
            }
            return this.pages[page_id];
        },

        getDisplayURL : function (key) {
            if (typeof key !== "string") {
                key = this.getKey();
            }
            this.checkKey(key);            // throws exception if key is invalid
            return this.getDisplayPage().getSimpleURL(key);
        },


        isValid : function () {
            var valid;
            valid = (FieldSet.isValid.call(this) && this.status !== 'E');
            this.eachChildRow(function (row) {
                valid = valid && (row.deleting || row.isValid());
            });
            return valid;
        },


        beforeFieldChange : function (field, new_val) {
            FieldSet.beforeFieldChange.call(this, field, new_val);
            if (!this.owner && this.status !== 'N' && this.status !== 'U' && this.status !== 'M') {
                throw new Error("invalid document status - " + this.status);
            }
        },

        afterFieldChange : function (field, old_val) {
            FieldSet.afterFieldChange.call(this, field, old_val);
            this.setModified();
        },

        setModified : function () {
            this.status = "M";
        },



        // This function is NOT defined in an entity unless it actually does something
        // - so the existence of this function indicates whether or not record security is applicable for the entity.
        //addSecurityCondition : function (query, session) {
        //},


        renderLineItem : function (parent_elmt, render_opts) {
            var display_page,
                anchor_elmt;

            display_page = this.getDisplayPage();
            anchor_elmt  = parent_elmt.makeElement("a");
            if (display_page) {
                anchor_elmt.attr("href", display_page.getSimpleURL(this.getKey()));
        //        anchor.addChild("img")
        //            .attr("alt", display_page.title)
        //            .attr("src", "/rsl_shared/" + this.icon.replace(/\/24x24\//g, "/16x16/"));
        //        sctn_elmt.text(" ");
            }
            anchor_elmt.text(this.getLabel("list_item"));
        //    this.getField(this.line_item_field || this.title_field).render(parent_elmt, render_opts);
            return anchor_elmt;
        },

        renderTile : function (parent_elmt, render_opts) {
            var anchor_elmt;
            anchor_elmt = parent_elmt.makeElement("a", "btn css_tile", this.id + "_" + this.getKey());
            this.addTileURL(anchor_elmt, render_opts);
            this.addTileContent(anchor_elmt, render_opts);
            return anchor_elmt;
        },

        addTileURL : function (anchor_elmt, render_opts) {
            var display_page;
            display_page = this.getDisplayPage();
            if (display_page) {
                anchor_elmt.attr("href", display_page.getSimpleURL(this.getKey()));
            }
        },

        addTileContent : function (anchor_elmt, render_opts) {
            if (this.icon) {
                anchor_elmt.makeElement("img")
                    .attr("alt", this.title)
                    .attr("src", "/rsl_shared/" + this.icon);
            }
            anchor_elmt.text(this.getLabel("tile"));
        },


        obfuscate : function () {
            this.each(function (field) { 
                field.obfuscate();
            });
        },

    });     // end of clone()

});     // end of define()

//To show up in Chrome debugger...
//@ sourceURL=data/Entity.js