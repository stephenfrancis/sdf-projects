/*global $, indexedDB, UUID, Promise */
/*jslint browser: true */
"use strict";


var x;

if (!x) {
    x = {};
}

x.store = {};




x.store.start = function () {
    var that = this;
    return this.startApp()
    .then(function () {
        return that.getDoc("dox", "root");
    })
    .then(function (doc_obj) {
        that.root_doc = doc_obj;
        that.log("x.store.start() done");
    })
    .then(null, /* catch */ function (reason) {
        that.log("x.store.start() failed: " + reason);
        that.root_doc = { uuid: "root", title: "Everything", type: "folder", children: [] };
        that.log("x.store.start() creating new root doc...");
        return that.storeDoc("dox", that.root_doc);
    });
};


x.store.startApp = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        var request = indexedDB.open("FastDox", 11);

        request.onupgradeneeded = function (event) {
          // The database did not previously exist, so create object stores and indexes.
            var db = request.result,
                store;
    
            db.deleteObjectStore("dox");
            store = db.createObjectStore("dox", { keyPath: "uuid" });
            store.createIndex("by_title", "title", { unique: true });
            store.createIndex("by_parent", [ "parent_id", "sequence_nbr" ], { unique: false });
        };
    
        request.onsuccess = function () {
            that.db = request.result;
            resolve();
        };
        
        request.onerror = function (error) {
            reject(error);
        };
    });
};


x.store.storeDoc = function (store_id, doc_obj) {
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


x.store.getDoc = function (store_id, key) {
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


x.store.getAllDocs = function (store_id) {
    var that = this,
        results = [];

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(store_id, "readonly"),
            store = tx.objectStore(store_id),
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


x.store.getChildDocs = function (store_id, uuid) {
    var that = this,
        results = [];

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(store_id, "readonly"),
            store = tx.objectStore(store_id),
            request = store.openCursor();
//            request = store.index("by_parent").openKeyCursor([ uuid ]);

        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                // Called for each matching record.
                if (cursor.value && cursor.value.parent_id === uuid) {
                    results.push(cursor.value);
                }
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


x.store.deleteDoc = function (store_id, doc_obj) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = this.db.transaction(store_id, "readwrite"),
            store = tx.objectStore(store_id);

        store["delete"](doc_obj.uuid);
        request.onsuccess = function () {
            resolve(doc_obj);
        };
        request.onerror = function () {
            reject(tx.error);
        };
    });
};


x.store.setDocParent = function (node_id, parent_id, old_parent_id, position) {
    var that = this;
    that.log("setDocParent(): setting node: " + node_id + " parent to: " + parent_id);
    return new Promise(function (resolve, reject) {
        resolve();
    })
    .then(function () {
        that.log("setDocParent().then(1): is parent_id non-blank?");
        if (!parent_id) {
            throw new Error("no new parent_id");             // TODO - allow update to old_parent_id if not also blank
        }
    })
    .then(function () {
        that.log("setDocParent().then(2): get parent document: " + parent_id);
        return that.getDoc("dox", parent_id);
    })
    .then(function (doc_obj) {
        that.log("setDocParent().then(3): update parent doc: " + doc_obj.uuid);
//        doc_obj.parent_id = parent_id;
        if (!doc_obj.children) {
            doc_obj.children = [];
        }
        if (doc_obj.children.indexOf(node_id) > -1) {
            doc_obj.children.splice(doc_obj.children.indexOf(node_id), 1);
        }
        if (typeof position !== "number") {
            position = doc_obj.children.length;
        }
        that.log("setDocParent(): about to splice, to position: " + position + ", array initial length: " + doc_obj.children.length + ", node_id: " + node_id);
        doc_obj.children[position] = node_id;
        return that.storeDoc("dox", doc_obj);
    })
    .then(null, /* catch */ function (reason) {
        that.log("setDocParent().then(4): catch reason: " + reason);
    })
    .then(function () {
        that.log("setDocParent().then(5): is old_parent_id non-blank and <> parent_id?");
        if (!old_parent_id || parent_id === old_parent_id) {
            throw new Error("no old_parent_id or === parent_id");             // TODO - allow update to old_parent_id if not also blank
        }
    })
    .then(function () {
        that.log("setDocParent().then(6): get old parent document");
        return this.getDoc("dox", old_parent_id);
    })
    .then(function (doc_obj) {
        that.log("setDocParent().then(7): update old parent doc: " + doc_obj.uuid);
        if (doc_obj.children.indexOf(node_id) > -1) {
            doc_obj.children.splice(doc_obj.children.indexOf(node_id), 1);
        }
        return that.storeDoc("dox", doc_obj);
    })
    .then(function () {
        that.log("setDocParent().then(7): all done!"); 
    })
    .then(null, /* catch */ function (reason) {
        that.log("setDocParent().then(8) failed: " + reason);
    });
};

/*
x.store.removeNodeFromParent = function (node_id, parent_id) {
    var that = this,
        parent_id = $("#doc_tree #" + node_id).parent().parent().attr("id");

    that.log("removeNodeFromParent(): " + node_id + " from " + parent_id); 
    this.getDoc("dox", parent_id)
    .then(function (doc_obj) {
        that.log("removeNodeFromParent(): got parent folder doc: " + parent_id); 
        doc_obj.children.splice(doc_obj.children.indexOf(node_id), 1);
        return that.storeDoc("dox", doc_obj);
    })
    .then(function () {
        that.log("removeNodeFromParent(): all done!"); 
    })
    .then(null, /* catch function (reason) {
        that.log("removeNodeFromParent() failed: " + reason);
    });
};
*/

x.store.log = function (str) {
    console.log(str);
};


/*

x.store.getCurrentDoc = function (uuid) {
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
        .then(null, /* catch  function (reason) {
            that.log("called getCurrentDoc() catch() with: " + reason);
            that.message("error getting document " + uuid + " because " + reason);
        });
};
 * this NO LONGER does this...
    if (!doc_obj.uuid) {           // id is optional - undefined means creating a new doc
        doc_obj.uuid = UUID.generate();
    }
 */
// do we want to open the connection again each time, or just keep it? keep for now

