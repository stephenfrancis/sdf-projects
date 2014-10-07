/*global $, indexedDB, UUID, Promise */
/*jslint browser: true */
"use strict";


var y = { ui: {} },
    Aloha;

y.ui.base = {
    database_url         : "https://other_apps:5984/fastdox/",
    replication_interval : 10000,
    replication_continue : true,
    ajax_timeout         : 60000
};



y.ui.base.startApp = function (onSuccess) {
    var that = this,
        request = indexedDB.open("FastDox", 3);         // Version 3 - additional store

    request.onupgradeneeded = function (event) {
      // The database did not previously exist, so create object stores and indexes.
        var db = request.result,
            store;

        if (event.oldVersion < 2 && event.oldVersion > 0) {
            db.deleteObjectStore("dox");
        }

        if (event.oldVersion < 2) {
            store = db.createObjectStore("dox", { keyPath: "uuid" });
            store.createIndex("by_title", "title", { unique: true });
        }

        if (event.oldVersion < 3) {
            db.createObjectStore("control", { keyPath: "id" });
        }

//      var authorIndex = store.createIndex("by_author", "author");
    };

    request.onsuccess = function() {
        that.db = request.result;
//        that.renderIndex();
        that.drawWholeTree();
        that.replicate();
        that.message("started");
    };

};


y.ui.base.renderView = function (path) {
    var doc_view_area = $("#view_area #doc_view");
    doc_view_area.empty();
    this.getAllDocs()
        .then(function (results) {
            var i;
            for (i = 0; i < results.length; i += 1) {
                if (results[i].path.indexOf(path) === 0) {
                    doc_view_area.append("<h3>" + results[i].title + "</h3>");
                    doc_view_area.append(results[i].content);
                }
            }
        })
        .then(null, /* catch */ function (reason) {
            that.log("renderView() failed: " + reason);
        });
    $("#view_area > h2").text("View: " + path);
    this.setMode("view");
};

y.ui.base.renderUpdate = function (doc_key) {
    this.editDoc(doc_key);
    this.setMode("edit");
};

y.ui.base.renderCreate = function () {
    this.current_doc = null;
    $("#edit_area > h2").text("Create");
    $("#edit_area #doc_title"  ).val("");
    $("#edit_area #doc_content").empty();
    this.setMode("edit");
};

// mode is currently one of: view, edit
y.ui.base.setMode = function (mode) {
    if (mode === this.mode) {
        return;
    }
    $("div#view_area" ).addClass("css_hide");
    $("div#edit_area" ).addClass("css_hide");
    $("div#" + mode + "_area").removeClass("css_hide");
    this.mode = mode;
};



y.ui.base.createTreeNode = function (parent_node, id, label, draggable) {
//    this.log("createTreeNode(): " + parent_node.length + ", " + id + ", " + label);
    if (parent_node.length !== 1) {
        throw new Error("createTreeNode(): parent_node must be single-valued");
    }
    if (parent_node[0].tagName === "LI" /*&& parent_node.children("a.tree_icon").length === 0*/) {
        parent_node.addClass("tree_exp");
        parent_node.addClass("tree_branch");
        parent_node.removeClass("tree_leaf");
//        parent_node.prepend("<a class='tree_icon' />");
    }
    if (parent_node.children("ul").length === 0) {
        parent_node.append("<ul/>");
    }
    parent_node = parent_node.children("ul").first();
    parent_node.append("<li id='" + id + "' class='tree_leaf' " + (draggable === true ? "draggable='true'" : "") + "><a class='tree_icon' /><a class='tree_label'>" + label + "</a></li>");
    return parent_node.children("li#" + id);
};

y.ui.base.removeTreeNode = function (node) {
    this.log("removeTreeNode(): " + node.length + ", " + $(node).attr("id"));
    if (node[0].tagName !== "LI") {
        throw new Error("invalid tree node");
    }
    if (node.parent().children("li").length === 0) {
        node.parent().parent().removeClass("tree_branch");
        node.parent().parent().removeClass("tree_exp");
        node.parent().parent().removeClass("tree_ctr");
        node.parent().parent().   addClass("tree_leaf");
        node.parent().remove();
    }
    node.remove();
    
};

y.ui.base.drawWholeTree = function () {
    var that = this,
        root_node;

    root_node = $("#doc_tree");
    this.log("beginning drawWholeTree()");
    this.getAllDocs()
        .then(function (results) {
            var i;
            for (i = 0; i < results.length; i += 1) {
                that.drawDocTreeNode(results[i], root_node);
            }
        })
        .then(null, /* catch */ function (reason) {
            that.log("drawWholeTree() failed: " + reason);
        });
};

y.ui.base.drawDocTreeNode = function (doc_obj, root_node) {
    var dir_node;
    dir_node = this.getOrAddPathNode((doc_obj.path ? doc_obj.path.split("/") : []), root_node);
    this.log("drawDocTreeNode(): " + dir_node.length + ", " + doc_obj.uuid + ", " + doc_obj.title);
    this.createTreeNode(dir_node, doc_obj.uuid, doc_obj.title, true);
};

y.ui.base.getOrAddPathNode = function (path_array, node) {
    var first_path,
        found_node;
    
    do {            // eliminate blanks
        first_path = path_array.shift();
//        this.log("getOrAddPathNode(): " + path_array.length + ", " + first_path);
    } while (!first_path && path_array.length > 0);
    if (!first_path) {
        return node;
    }
    found_node = node.children("ul").children("li#" + first_path).first();
    if (found_node.length > 0) {
//        this.log("getOrAddPathNode() using found node: " + found_node.attr("id"));
        return this.getOrAddPathNode(path_array, found_node);
    }
//    this.log("getOrAddPathNode() creating node: " + first_path);
    return this.getOrAddPathNode(path_array, this.createTreeNode(node, first_path, first_path, true));
};

y.ui.base.saveDoc = function () {
    var that = this,
        doc_obj = this.current_doc;
    if (!doc_obj) {
        doc_obj = {};
        this.current_doc = doc_obj;
    }
    if (!doc_obj.uuid) {           // id is optional - undefined means creating a new doc
        doc_obj.uuid = UUID.generate();
    }
    doc_obj.title   = $("#edit_area #doc_title"  ).val();
    doc_obj.path    = $("#edit_area #doc_path"   ).val();
    doc_obj.content = $("#edit_area #doc_content").html();
    doc_obj.last_local_save = new Date();
    $("#view_area #doc_content").html(doc_obj.content);
    this.updateReplStatus(doc_obj, "Local Change");

    this.storeDoc("dox", doc_obj)
        .then(function (doc_obj2) {
            that.message("saved");
            that.setMode("view");
        })
        .then(null, /* catch */ function (reason) {
            that.message("save failed for reason: " + reason);
        });
};


y.ui.base.getDoc = function (store_id, key) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(store_id, "readonly"),
            store = tx.objectStore(store_id),
            request = store.get(key);

        that.log("creating getDoc() promise");
        request.onsuccess = function () {
            var doc_obj = request.result;
            if (doc_obj === undefined) {
                that.log("calling getDoc() reject with: doc not found: " + key);
                reject("doc not found: " + key);
            } else {
                that.log("calling getDoc() resolve with: " + key);
                resolve(doc_obj);
            }
        };
        request.onerror = function () {
            that.log("calling getDoc() reject with: " + tx.error);
            reject(tx.error);
        };
    });
};


y.ui.base.getCurrentDoc = function (uuid) {
    var that = this;

    if (this.current_doc && (!uuid || this.current_doc.uuid === uuid)) {
        that.log("creating getCurrentDoc() immediate promise");
        return new Promise(function (resolve, reject) {
            that.log("calling getCurrentDoc() immediate resolve");
            resolve(that.current_doc);
        });
    }
    return this.getDoc("dox", uuid)
        .then(function (doc_obj) {
            that.log("called getCurrentDoc() then() with: " + doc_obj.uuid);
            that.current_doc = doc_obj;
            return doc_obj;
        })
        .then(null, /* catch */ function (reason) {
            that.log("called getCurrentDoc() catch() with: " + reason);
            that.message("error getting document " + uuid + " because " + reason);
        });
};

/*
 * this NO LONGER does this...
    if (!doc_obj.uuid) {           // id is optional - undefined means creating a new doc
        doc_obj.uuid = UUID.generate();
    }
 */
// do we want to open the connection again each time, or just keep it? keep for now
y.ui.base.storeDoc = function (store_id, doc_obj) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(store_id, "readwrite"),
            store = tx.objectStore(store_id);
        
        store.put(doc_obj);
        tx.oncomplete = function () {
            resolve(doc_obj);
        };
        tx.onerror = function () {
            reject(tx.error);
        };
    });
};


y.ui.base.deleteLocal = function (doc_obj) {
    var that = this,
        tx = this.db.transaction("dox", "readwrite"),
        store = tx.objectStore("dox");

    store["delete"](doc_obj.uuid);
    tx.onerror = function () {
        that.log("delete failed: " + tx.error);
    };
};

// each tree node is an object with keys: id (str), label (str) and child_arr (array of the child nodes), child_obj
y.ui.base.populateNewTree = function () {
    var that = this;
    y.ui.using.path_struct = { id: UUID.generate(), label: "Root", child_arr: [], child_obj: {} };

    this.getAllDocs()
        .then(function (results) {
            var i,
                path_array,
                path_obj,
                path_elem,
                new_node;

            console.log("outside main loop: " + results.length);

            for (i = 0; i < results.length; i += 1) {
                path_array = results[i].path.split("/");
                path_obj   = y.ui.using.path_struct;
                while (path_array.length > 0) {
                    path_elem = path_array.shift();
                    that.log("inside loops: " + i + ", " + path_array + ", " + path_elem);
                    if (path_elem) {
                        that.log("path elem non blank: " + path_elem + ", " + path_obj.child_obj[path_elem]);
                        if (!path_obj.child_obj[path_elem]) {
                            new_node = {
                                id       : UUID.generate(),
                                label    : path_elem,
                                child_arr: [],
                                child_obj: {}
                            };
                            path_obj.child_obj[path_elem] = new_node;
                            path_obj.child_arr.push(new_node);
                        }
                        path_obj = path_obj.child_obj[path_elem];
                    }
                }
            }
        })
        .then(null, /* catch */ function (reason) {
            that.log("populateNewTree() failed: " + reason);
        });
    
};



y.ui.base.deleteDoc = function (uuid) {
    var that = this;
//    alert("Delete: " + uuid);
    this.updateDoc(uuid, function (doc_obj) {
        that.updateReplStatus(doc_obj, "Local Delete");
    });
};

y.ui.base.forgetLocalChanges = function (doc_obj) {
    var that = this;
//    alert("forgetLocalChanges: " + doc_obj.uuid);
    if (doc_obj.repl_status !== "Conflict") {
        return false;
    }
    this.updateDoc(doc_obj.uuid, function (doc_obj2) {
        that.updateReplStatus(doc_obj2, "Forget Local");
    });
    return true;
};

y.ui.base.viewDoc = function (uuid) {
    var that = this,
        div = $("#view_area"),
        promise;

    this.message("opening: " + uuid);
    div.find("#doc_content").html("");

    promise = this.getCurrentDoc(uuid);
    promise.then(function (doc_obj) {
        that.log("called viewDoc() then() 1 with: " + doc_obj.uuid);
        if (that.mustPullUpdateFromServer(doc_obj)) {
            promise.then(that.pullFromServer);
        }
        return promise;
    });
    promise.then(function (doc_obj) {
        that.log("called viewDoc() then() 2 with: " + doc_obj.uuid);
        that.current_doc = doc_obj;
        div.find("#doc_content").html(doc_obj.content);
        that.message("viewing");
        return promise;
    });
    return promise;
};

y.ui.base.editDoc = function (uuid) {
    var that = this,
        div = $("#edit_area");

    this.message("opening");

    return this.getCurrentDoc(uuid)
        .then(function (doc_obj) {
            div.find("#doc_title"  ).val( doc_obj.title);
            div.find("#doc_path"   ).val( doc_obj.path);
            div.find("#doc_content").html(doc_obj.content);
            $("#edit_area > h2").text("Update: " + doc_obj.title);
            that.message("editing");
        });
};

y.ui.base.getAllDocs = function () {
    var that = this,
        results = [];

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction("dox", "readonly"),
            store = tx.objectStore("dox"),
            request = store.openCursor();

        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                // Called for each matching record.
                results.push(cursor.value);
                cursor["continue"]();
            } else {
                resolve(results);
            }
        };
        request.onerror = function () {
            reject(tx.error);
        };
    });
};

//------------------------------------------------------------------------------ Logging and Messaging
y.ui.base.message = function (str) {
    console.log(str);
    $("#css_message").text(str);
//    $("div#css_message").fadeOut(30);
};

y.ui.base.log = function(str) {
    console.log(str);
};


//------------------------------------------------------------------------------ Server Comms
y.ui.base.setStatus = function (str) {
    if (str !== "online" && str !== "offline" && str !== "replicating") {
        throw "Invalid status: " + str;
    }
    if (str !== "replicating") {
        this.online = (str === "online");
    } 
    $("a#status").removeClass("replicating");
    $("a#status").removeClass( "online");
    $("a#status").removeClass("offline");
    $("a#status").   addClass(str);
    $("a#status").attr("title", str);
};

y.ui.base.setOnline = function (online, message) {
    this.setStatus(online ? "online" : "offline");
    if (!online) {
        this.log("ajax error: " + message);
    }
};



//------------------------------------------------------------------------------ Replication Status

// action being one of "Local Change", "Synced", "Server Change"
y.ui.base.updateReplStatus = function (doc_obj, action) {
    if (action === "Local Change") {
        if (!doc_obj.repl_status) {
            doc_obj.repl_status = "Local Only";
        } else if (doc_obj.repl_status === "Up-to-date") {
            doc_obj.repl_status = "Local Change";
        } else if (doc_obj.repl_status !== "Local Change") {     // leave Local Change it as-is
            doc_obj.repl_status = "Conflict";
        }
    } else if (action === "Synced") {
        doc_obj.repl_status = "Up-to-date";
    } else if (action === "Server Change") {
        if (doc_obj.repl_status === "Up-to-date") {
            doc_obj.repl_status = "Server Change";
        } else if (doc_obj.repl_status !== "Server Only" && doc_obj.repl_status !== "Server Change") {
            // leave Server Only and Server Change as-is
            doc_obj.repl_status = "Conflict";
        }
    } else if (action === "Local Delete") {
        doc_obj.repl_status = "Local Delete";
    } else if (action === "Forget Local") {
        if (doc_obj.repl_status === "Conflict") {
            doc_obj.repl_status = "Server Change";
        }
    } else {
        throw "invalid action: " + action;
    }
};

y.ui.base.mustDeleteLocal = function (doc_obj) {
    return (doc_obj.repl_status === "Server Delete");
};

y.ui.base.mustDeleteServer = function (doc_obj) {
    return (doc_obj.repl_status === "Local Delete");
};

y.ui.base.mustPushUpdateToServer = function (doc_obj) {
    return (!doc_obj.repl_status || doc_obj.repl_status === "Local Only" || doc_obj.repl_status === "Local Change");
};

y.ui.base.mustPullUpdateFromServer = function (doc_obj) {
    return (doc_obj.repl_status === "Server Only" || doc_obj.repl_status === "Server Change");
};



//------------------------------------------------------------------------------ General Replication

y.ui.base.replicate = function () {
    var that = this,
        this_replication = new Date();
    if (!this.replication_continue) {
        return;
    }
    this.log("beginning replicate() at " + this_replication.toString() + ", repl timestamp: " + this_replication.getTime());
    this.setStatus("replicating");
    this.getLastReplicationPoint()
        .then(function () {
            that.getServerAllDocSummary();
        })
        .then(function (server_props_all) {
            that.setOnline(true);
            that.replicateLocalDocs(server_props_all);
        })
        .then(function () {
            that.setThisReplicationPoint();
        })
        .then(null, /* catch */ function (reason) {
            that.setOnline(false, reason);
        })
        .then(function () {
            that.replicationLoop();
        });
};

y.ui.base.replicationLoop = function () {
    this.log("beginning replicationLoop()");
    this.setStatus(this.online ? "online" : "offline");
    setTimeout(this.replicate, this.replication_interval);
};

y.ui.base.replicateLocalDocs = function (server_props_all) {
    var that = this;
    this.log("beginning replicateLocalDocs()");
    this.getAllDocs()
        .then(function (results) {
            var i;
            for (i = 0; i < results.length; i += 1) {
                that.replicateDoc(results[i], server_props_all);
            }
            that.log("Replicated " + i + " docs");
        })
        .then(null, /* catch */ function (reason) {
            that.log("replicateLocalDocs() failed: " + reason);
        });
};

y.ui.base.replicateDoc = function (doc_obj, server_props_all) {
    var server_props = server_props_all[doc_obj.uuid];
    this.log("beginning replicateDoc() on: " + doc_obj.uuid + ", repl_status: " + doc_obj.repl_status + ", server_props: " + this.view(server_props));
    if (server_props && server_props.etag !== doc_obj.server_etag) {
        this.log("replicateDoc() etag diff, setting repl_status to Server Change");
        this.updateReplStatus(doc_obj, "Server Change");
        this.storeDoc("dox", doc_obj);
    }
    delete server_props_all[doc_obj.uuid];

    if (this.mustDeleteLocal(doc_obj)) {
        this.log("replicateDoc() must delete local");
        this.deleteLocal(doc_obj);

    } else if (this.mustDeleteServer(doc_obj)) {
        this.log("replicateDoc() must delete server");
        this.deleteServer(doc_obj.uuid);

    } else if (this.mustPushUpdateToServer(doc_obj)) {
        this.log("replicateDoc() push to server - Local Only OR Local Change");
        this.pushToServer(doc_obj);

    } else if (this.mustPullUpdateFromServer(doc_obj)) {
        this.log("replicateDoc() pull from server - Server Only OR Server Change");
        this.pullFromServer(doc_obj);

    } else {
        this.log("replicateDoc() no action");
    }
};

y.ui.base.getLastReplicationPoint = function () {
    var that = this;
    this.log("beginning getLastReplicationPoint()");
    return this.getDoc("control", "singleton")
        .then(function (doc_obj) {
            // A match was found.
            that.log("got singleton doc: " + doc_obj.id);
            that.last_replication_point = doc_obj.last_replication_point;
        })
        .then(null, /* catch */ function (reason) {
            that.log("clearing last_replication_point in singleton doc");
            that.last_replication_point = null;
        });
};

y.ui.base.setThisReplicationPoint = function () {
    var that = this,
        doc_obj;
    this.log("beginning setThisReplicationPoint()");
    return this.getDoc("control", "singleton")
        .then(function (existing_doc_obj) {
            that.log("got singleton doc: " + existing_doc_obj.id);
            doc_obj = existing_doc_obj;
        })
        .then(null, /* catch */ function (reason) {
            that.log("making new singleton doc");
            doc_obj = { id: "singleton" };
        })
        .then(function () {
            that.log("setting last_replication_point in singleton doc: " + that.last_replication_point);
            doc_obj.last_replication_point = that.last_replication_point;
            that.storeDoc(doc_obj);
        })
        .then(null, /* catch */ function (reason) {
            that.log("failed setting the replication point: " + reason);
        });
};


//------------------------------------------------------------------------------ Webdav Replication

y.ui.webdav = Object.create(y.ui.base);


// server_props_all is a map object keyed on uuid, each value being a map object: uuid, etag, last_mod, length
y.ui.webdav.getServerAllDocSummary = function () {
    var that = this;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: that.url, type: "PROPFIND", timeout: that.ajax_timeout,
            data: '<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><allprop/></D:propfind>',
            beforeSend: function (xhr) {
                xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
            },
            success: function (a, b, c) {
                resolve(that.processCollection(a));
            },
            error: function (a, b, c) {
                reject(a + b + c);
            }
        });
    });
};

y.ui.webdav.processCollection = function (xml_doc) {
    var responses,
        i,
        server_props_all = {},
        item;
    responses = xml_doc.getElementsByTagName("response");
    for (i = 0; i < responses.length; i += 1) {
        item = this.processResponse(responses[i]);
        if (item.uuid) {
            server_props_all[item.uuid] = item;
        }
    }
    return server_props_all;
};

y.ui.webdav.processResponse = function (xml_element) {
    return {
        uuid    : this.getXMLValue(xml_element, "displayname"     ),
        etag    : this.getXMLValue(xml_element, "getetag"         ),
        last_mod: this.getXMLValue(xml_element, "getlastmodified" ),
        length  : this.getXMLValue(xml_element, "getcontentlength")
    };
};

y.ui.webdav.deleteServer = function (uuid) {
    var that = this;
    this.log("deleteServer()");
    $.ajax({ url: this.url + uuid, type: "DELETE", timeout: this.ajax_timeout,
        success: function () {
            that.setOnline(true);
        },
        error: function (a, b, c) {
            that.setOnline(false, a, b, c);
        }
    });
};

y.ui.webdav.pushToServer = function (doc_obj) {
    var that = this;
    this.log("pushToServer()");
    $.ajax({ url: this.url + doc_obj.uuid, type: "PUT", data: doc_obj.content, timeout: this.ajax_timeout,
        beforeSend: function(xhr) {
            xhr.setRequestHeader('If-Modified-Since', '');      // needed for IOS6 and Chrome 24+
        },
        success: function () {
            that.setOnline(true);
            $.ajax({ url: that.url + doc_obj.uuid, type: "HEAD", timeout: that.ajax_timeout,
                success: function(a, b, c) {
                    var headers = that.getHeaders(c);
                    that.setOnline(true);
//                    doc_obj.server_last_repl = this_replication.getTime();
                    that.setDocPropertiesFromHeaders(headers, doc_obj);
                    that.updateReplStatus(doc_obj, "Synced");
                    that.storeDoc(doc_obj);
                    that.log(y.view(y.getHeaders(c)));
                    that.log("pushToServer() success  HEAD: a: " + that.view(a) + ", b: " + String(b) + ", c: "  + that.view(c));
//                    that.setDavProperties(doc_obj.uuid, { doc_title: doc_obj.title });
                },
                error: function (a, b, c) {
                    that.online = false;
//                    that.log(y.view(y.getHeaders(c)));
                    that.log("pushToServer() error in HEAD: a: " + that.view(a) + ", b: " + String(b) + ", c: "  + that.view(c));
                }
            });
        },
        error: function (a, b, c) {
            that.setOnline(false, a, b, c);
        }
    });
};

y.ui.webdav.pullFromServer = function (doc_obj, item_callback) {
    var that = this;
    this.log("pullFromServer(): " + doc_obj.uuid);
    $.ajax({ url: this.url + doc_obj.uuid, type: "GET", timeout: this.ajax_timeout, dataType: "text",
        beforeSend: function (xhr) {
            xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
        },
        success: function (a, b, c) {
            var headers;
            that.setOnline(true);
            that.log("HTTP status code: " + c.status + ", or in text: " + c.statusText);
            headers = that.getHeaders(c);
            that.log(y.view(headers));
            that.updateReplStatus(doc_obj, "Synced");
            doc_obj.content = a;
//            doc_obj.server_etag          = server_etag;
            that.setDocPropertiesFromHeaders(headers, doc_obj);
            that.log("Setting server_etag: " + doc_obj.server_etag);
            that.storeDoc(doc_obj);
            if (typeof item_callback === "function") {
                item_callback(doc_obj);
            }
        },
        error: function (a, b, c) {
            that.setOnline(false, a, b, c);
        }
    });
};


//------------------------------------------------------------------------------ HTTP Headers
y.ui.webdav.getHeaders = function (http) {
    var headers = http.getAllResponseHeaders().split("\r\n"),
        i,
        obj = {},
        header;
    for (i = 0; i < headers.length; i += 1) {
        header = headers[i].split(": ");
        if (header[0]) {
            obj[header[0]] = header[1];
        }
    }
    return obj;
//    that.log(headers);
};

y.ui.webdav.setDocPropertiesFromHeaders = function (headers, doc_obj) {
    doc_obj.server_last_modified = headers["Last-Modified"];
    doc_obj.server_length        = headers["Content-Length"];
    doc_obj.server_etag          = headers.ETag || headers.Etag;      // HEAD returns diff header from PROPFIND?
    this.log("Setting server_etag to: " + doc_obj.server_etag);
};

/*
need to call HTTP PROPFIND
<?xml version="1.0" encoding="utf-8" ?>
  <D:propfind xmlns:D="DAV:"><allprop/></D:propfind>

OR
<?xml version="1.0" encoding="utf-8" ?>
  <D:propfind xmlns:D="DAV:">
     <D:prop>
       <D:displayname/>
       <D:getcontentlength/>
       <D:getetag/>
       <D:getlastmodified/>
       <D:resourcetype/>
     </D:prop>
  </D:propfind>
*/
//    that.log("status: " + that.getXMLValue(xml_element, "status"          ));
//    that.log("creatd: " + that.getXMLValue(xml_element, "creationdate"    ));
//    that.log("dispnm: " + that.getXMLValue(xml_element, "displayname"     ));
//    that.log("lstmod: " + that.getXMLValue(xml_element, "getlastmodified" ));
//    that.log("contln: " + that.getXMLValue(xml_element, "getcontentlength"));
//    that.log("etaggg: " + that.getXMLValue(xml_element, "getetag"         ));

y.ui.webdav.getXMLValue = function (xml_parent, tagname) {
    var item;
    item = xml_parent.getElementsByTagName(tagname).item(0);
    if (item) {
        return item.textContent;
    }
};

// This doesn't work for some reason
y.ui.webdav.setDavProperties = function (doc_id, prop_map) {
    var that = this,
        data_str = '<?xml version="1.0" encoding="utf-8" ?><D:propertyupdate xmlns:D="DAV:"><D:set>',
        prop;

    this.log("setDavProperties()");
    for (prop in prop_map) {
        if (prop_map.hasOwnProperty(prop)) {
            data_str += "<D:prop><" + prop + ">" + prop_map[prop] + "</" + prop + ">";
        }
    }
    data_str += "</D:set></D:propertyupdate>";
    this.log(data_str);
    $.ajax({ url: this.url + doc_id, type: "PROPPATCH", timeout: this.ajax_timeout, data: data_str,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
        },
        success: function (a, b, c) {
            var headers;
            that.setOnline(true);
            that.log("setDavProperties: " + c.status + ", or in text: " + c.statusText);
//            that.log(a);
            that.processCollection(a);
            headers = that.getHeaders(c);
            that.log(y.view(headers));
        },
        error: function (a, b, c) {
            that.setOnline(false, a + b + c);
        }
    });
};


//------------------------------------------------------------------------------ Couch Replication

y.ui.couch = Object.create(y.ui.base);


y.ui.couch.getServerAllDocSummary = function () {
    this.log("beginning getServerAllDocSummary()");
    return this.getServerDocChanges();
};

// use changelog?
y.ui.couch.getServerDocChanges = function () {
    var that = this,
        promise;
    that.log("beginning getServerDocChanges()");
    
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: that.database_url + "_changes", type: "GET", timeout: that.ajax_timeout, dataType: "json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
            },
            success: function (a, b, c) {
                that.setOnline(true);
                that.log("HTTP status code: " + c.status + ", or in text: " + c.statusText);
                resolve(a);
            },
            error: function (a, b, c) {
                that.setOnline(false, a + b + c);
                reject(a + b + c);
            }
        });
    });
    // server_props_all is a map object keyed on uuid, each value being a map object: uuid, etag, last_mod, length
    promise.then(function (server_props_all) {
        var i = 0;
        while (i < server_props_all.results.length) {
            server_props_all.results[i].etag = server_props_all.results[i].changes[0].rev;
            that.log("getServerDocChanges(): " + i + ", " + server_props_all.results[i].uuid);
            if (server_props_all.results[i].deleted) {
                server_props_all.results.splice(i, 1);
            } else {
                i += 1;
            }
        }
    });
    return promise;
};



y.ui.couch.deleteServer = function (uuid) {
    var that = this;
    this.log("beginning deleteServer(): " + uuid);
};

y.ui.couch.pushToServer = function (doc_obj) {
    var that = this,
        promise;
    this.log("beginning pushToServer(): " + doc_obj.uuid);
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: that.database_url + doc_obj.uuid, cache: false, type: (doc_obj.repl_status === "Local Only" ? "POST" : "PUT"),
            data: JSON.stringify(doc_obj),
            success: function (a) {
                that.setOnline(true);
                if (a.ok) {
                    resolve(a);
                } else {
                    reject("unknown");
                }
            },
            error: function (a, b, c) {
                that.setOnline(false, a + b + c);
                reject(a + b + c);
            }
        });
    });
    promise.then(function (a) {
        that.updateReplStatus(doc_obj, "Synced");
        that.storeDoc(doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        that.log("failed pushToServer(): " + reason);
    });
    return promise;
};

y.ui.couch.pullFromServer = function (doc_obj) {
    var that = this,
        promise;
    this.log("beginning pullFromServer(): " + doc_obj.uuid);
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: that.database_url + doc_obj.uuid, cache: false, type: "GET",
            success: function (a) {
                that.setOnline(true);
                resolve(a);
            },
            error: function (a, b, c) {
                that.setOnline(false, a + b + c);
                reject(a + b + c);
            }
        });
    });
    promise.then(function (a) {
        that.updateReplStatus(doc_obj, "Synced");
        that.storeDoc(doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        that.log("failed pushToServer(): " + reason);
    });
    return promise;
};






/*
y.ui.base.mergeContent = function (title, body) {
    return "<h1>" + title + "</h1>" + body;
};

y.ui.base.splitContent = function (content) {
    var out = content.match(/<h1>(.*)<\/h1>(.*)/);
    if (out) {
        out.shift();        // remove 0th element so out has 2 elements, title and body
    } else {
        out = [ "", content ];
    }
    return out;
};

y.ui.base.contentDigest = function (str) {
    if (typeof str !== "string") {
        str = "";
    }
    str = str.replace(/<.*?>/g, " ");
    if (str.length > 200) {
        str = str.substr(0, 200) + "...";
    }
    return str;
};

y.ui.base.renderIndex = function () {
    this.current_doc = null;
    this.setMode("index");
    this.retrieveIndex();
};

//------------------------------------------------------------------------------ Index Page
y.ui.base.retrieveIndex = function () {
    var that = this,
        tbody = $("#index_area > table > tbody");

    tbody.empty();

    this.getAllDocs()
        .then(function (results) {
            var i;
            for (i = 0; i < results.length; i += 1) {
                that.drawRow(tbody, results[i]);
            }
        })
        .then(null, function (reason) {
            that.message("error getting documents because " + reason);
        });
};

y.ui.base.drawRow = function (tbody, doc_obj) {
    var parts = this.splitContent(doc_obj.content);
    tbody.append("<tr docKey='" + doc_obj.uuid + "'><td class='sel'><span class='glyphicon glyphicon-ok'></span></td>" +
        "<td><b>" + parts[0] + "</b><br/>" + this.contentDigest(parts[1]) + "</td><td>" + doc_obj.repl_status + "</td>" +
        "<td class='doc_info'>" +
        "UUID: "                 + doc_obj.uuid + "<br/>" +
        "Last Local Save: "      + doc_obj.last_local_save + "<br/>" +
        "Server Etag: "          + doc_obj.server_etag + "<br/>" +
        "Server Last Modified: " + doc_obj.server_last_modified + "<br/>" +
        "Server Length: "        + doc_obj.server_length + "</td>" +
        "</tr>");
};


*/
