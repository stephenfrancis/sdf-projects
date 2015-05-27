/*global $, indexedDB, UUID, Promise, console */
/*jslint browser: true */
"use strict";


var x;

if (!x) {
    x = {};
}

x.store = {
    log_level: 1
};




x.store.start = function () {
    var that = this;
    return this.startApp()
    .then(function () {
        return that.getDoc("dox", "root");
    })
    .then(function (doc_obj) {
        that.root_doc = doc_obj;
        that.log("x.store.start() done", 1);
    })
    .then(null, /* catch */ function (reason) {
        that.log("x.store.start() failed: " + reason, 0);
        that.root_doc = { uuid: "root", payload: { title: "Everything", type: "folder" } };
        that.log("x.store.start() creating new root doc...", 1);
        return that.storeDoc("dox", that.root_doc);
    });
};


x.store.startApp = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        var request = indexedDB.open("FastDox", 14);

        request.onupgradeneeded = function (event) {
          // The database did not previously exist, so create object stores and indexes.
            var db = request.result,
                store;
    
            try {
                db.deleteObjectStore("dox");
            } catch (e) {
                console.log("error trying to delete object store 'dox': " + e.toString());
            }
            store = db.createObjectStore("dox", { keyPath: "uuid" });
            store.createIndex("by_title", "payload.title", { unique: true });
            store.createIndex("by_parent", [ "payload.parent_id", "payload.sequence_nbr" ], { unique: false });
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


x.store.getDoc = function (store_id, uuid) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(store_id, "readonly"),
            store = tx.objectStore(store_id),
            request = store.get(uuid);

        that.log("creating getDoc() promise", 4);
        request.onsuccess = function () {
            var doc_obj = request.result;
            if (doc_obj === undefined) {
                that.log("calling getDoc() reject with: doc not found: " + uuid, 1);
                reject("doc not found: " + uuid);
            } else {
                that.log("calling getDoc() resolve with: " + uuid, 4);
                resolve(doc_obj);
            }
        };
        request.onerror = function () {
            that.log("calling getDoc() reject with: " + tx.error, 0);
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


/*
x.store.getChildDocIds = function (store_id, uuid) {
    var that = this,
        results = [];

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(store_id, "readonly"),
            store = tx.objectStore(store_id),
//            request = store.openCursor();
            range = IDBKeyRange.bound([ uuid, 0 ], [ uuid, 99999 ]),
            request = store.index("by_parent").openCursor(range);

        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                that.log("result: " + cursor.key + ", " + cursor.value.uuid, 0);
                // Called for each matching record.
//                if (cursor.value && cursor.value.payload.parent_id === uuid) {
                results.push(cursor.value);
//                }
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
*/


x.store.deleteDoc = function (store_id, doc_obj) {
//    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = this.db.transaction(store_id, "readwrite"),
            store = tx.objectStore(store_id);
/*
        store["delete"](doc_obj.uuid);
        request.onsuccess = function () {
            resolve(doc_obj);
        };
        request.onerror = function () {
            reject(tx.error);
        };
*/
    });
};


x.store.setDocParent = function (node_id, parent_id, position) {
    var that = this,
        old_parent_id;

    that.log("setDocParent(): setting node: " + node_id + " parent to: " + parent_id, 2);
// ARE using children!
    that.getDoc("dox", node_id)
        .then(function (doc_obj) {
            that.log("setDocParent().then(1): update doc", 4);
            old_parent_id = doc_obj.payload.parent_id;
            doc_obj.payload.parent_id    = parent_id;
    //        doc_obj.payload.sequence_nbr = sequence_nbr;
            return that.storeDoc("dox", doc_obj);
        })
        .then(function () {
            that.log("setDocParent().then(2): get new parent document: " + parent_id, 4);
            if (!parent_id) {
                throw new Error("no new parent_id");
            }
            return that.getDoc("dox", parent_id);
        })
        .then(function (doc_obj) {
            that.log("setDocParent().then(3): update new parent doc: " + doc_obj.uuid, 4);
            if (!doc_obj.payload.children) {
                doc_obj.payload.children = [];
            }
            if (doc_obj.payload.children.indexOf(node_id) > -1) {
                doc_obj.payload.children.splice(doc_obj.payload.children.indexOf(node_id), 1);
            }
            if (typeof position !== "number" || position < 0 || position > doc_obj.payload.children.length) {
                position = doc_obj.payload.children.length;
            }
        //     if (typeof position !== "number" || position < 0) {
        //         position = 0;
        //     }

            that.log("setDocParent(): about to splice, to position: " + position + ", array initial length: " + doc_obj.payload.children.length + ", node_id: " + node_id, 4);
            doc_obj.payload.children.splice(position, 0, node_id);
            return that.storeDoc("dox", doc_obj);
        })
        .then(null, /* catch */ function (reason) {
            that.log("setDocParent().then(4): catch reason: " + reason, 1);
        })
        .then(function () {
            that.log("setDocParent().then(5): get old parent doc", 4);
            if (!old_parent_id || old_parent_id === parent_id) {
                throw new Error("no old_parent_id");
            }
            return that.getDoc("dox", old_parent_id);
        })
        .then(function (doc_obj) {
            that.log("setDocParent().then(6): update old parent doc: " + doc_obj.uuid, 4);
            if (doc_obj.payload.children.indexOf(node_id) > -1) {
                doc_obj.payload.children.splice(doc_obj.payload.children.indexOf(node_id), 1);
            }
            return that.storeDoc("dox", doc_obj);
        })
        .then(function () {
            that.log("setDocParent().then(7): all done!", 3); 
        })
        .then(null, /* catch */ function (reason) {
            that.log("setDocParent().then(8) failed: " + reason, 1);
        });
};


x.store.log = function (str, log_level) {
    if (log_level <= this.log_level) {
        console.log(str);
    }
};


x.store.parentReset = function () {
    var that = this;
    this.log("beginning parentReset()", 1);
    return that.getAllDocs("dox")
        .then(function (results) {
            var i,
                docs = {},
                doc,
                parent;

            for (i = 0; i < results.length; i += 1) {
                doc = results[i];
                docs[doc.uuid] = doc;
            }
            for (i = 0; i < results.length; i += 1) {
                doc = results[i];
                if (doc.payload.parent_id) {
                    parent = docs[doc.payload.parent_id];
                    if (!parent.payload.children) {
                        parent.payload.children = [];
                    }
                    parent.payload.children.push(doc.uuid);
                }
                if (doc.payload.type === "document") {
                    if (!doc.payload.parent_id) {
                        console.log("ERROR: doc has no parent: " + doc.uuid);
                    }
                } else {        // folder
                    delete doc.payload.content;
                }
                delete doc.payload.sequence_nbr;
                delete doc["repl status"];

            }
            for (i = 0; i < results.length; i += 1) {
                doc = results[i];
                console.log("saving: " + doc.uuid + ", children: " + doc.payload.children);
                that.storeDoc("dox", doc);
            }
        })
        .then(null, /* catch */ function (reason) {
            that.log("childrenReset() failed: " + reason, 0);
        });
};

x.store.rootReset = function () {
    var that = this;
    this.log("beginning rootReset()", 1);
    return that.getDoc("dox", "root")
        .then(function (doc_obj) {
            delete doc_obj.payload.parent_id;
            doc_obj.payload.children.splice(1, 1);
            that.storeDoc("dox", doc_obj);
        })
        .then(null, /* catch */ function (reason) {
            that.log("rootReset() failed: " + reason, 0);
        });
};
