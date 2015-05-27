(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jslint node: true */
"use strict";

//module.exports = new requir("events").EventEmitter();     // even commented-out 'requir' confuses requir-1k!
module.exports = {};

module.exports.id = "Base";

/**
* create a new object as a descendant of this one
* @param {spec} properties to add to the new object overriding those of this
* @return {object} new object, whose 'parent' property is set to this
*/
module.exports.clone = function (spec) {
    var out = {};
    if (!spec || typeof spec.id !== "string" || !spec.id) {
        throw new Error("spec.id must be a non-blank string");
    }
    out = Object.create(this);
    out.parent = this;
//    out._events = {};           // inherit EventEmitter hack!
    if (spec) {
        out.addPropertiesFrom(spec, true);      // include functions
    }
    if (out.init && typeof out.init === "function") {           // conform to R6
        out.init();
    }
    return out;
};

module.exports.addPropertiesFrom = function (spec, include_functions) {
    var that = this;
    this.forOwn.call(spec, function (key, val) {
        that[key] = val;
    }, include_functions);
};

module.exports.add = function (object) {
    if (!object.id) {
        throw new Error("object must have an id");
    }
    object.owner = this;
    this[object.id] = object;
    return object;
};

module.exports.addClone = function (parent, spec) {
    return this.add(parent.clone(spec));
};

module.exports.remove = function () {
    if (!this.owner) {
        throw new Error("no owner property");
    }
    this.owner.remove(this.id);
};

module.exports.forAll = function (funct, include_functions) {
    var prop;
    for (prop in this) {
        if (include_functions || typeof this[prop] !== "function") {
            funct(prop, this[prop]);
        }
    }
};

module.exports.forOwn = function (funct, include_functions) {
    var prop;
    for (prop in this) {
        if (this.hasOwnProperty(prop) && (include_functions || typeof this[prop] !== "function")) {
            funct(prop, this[prop]);
        }
    }
};

module.exports.walkPath = function (str, create_missing_objects) {
    var i = str.indexOf("."),
        obj;
    if (i > -1) {
        obj = this[str.substr(0, i)];
        if (typeof obj !== "object") {
            if (create_missing_objects) {
                obj = {};
                this[str.substr(0, i)] = obj;
            } else {
                throw new Error("property value for non-terminal path element is not another object: " + str);
            }
        }
        return obj.walkPath(str.substr(i + 1), create_missing_objects);
    }
    if (typeof this[str] !== "object" && create_missing_objects) {
        this[str] = {};
    }
    return this[str];
};

module.exports.detokenize = function (str, replaceToken) {
    var regex = /\{([a-zA-Z0-9_\.\/|]+)?\}/g,
        that = this;

    if (typeof str !== "string") {
        throw new Error("argument must be string");
    }
    // this.forAll(function (prop_id, prop_val) {
    //     if (typeof prop_val === "string") {
    //         str = str.replace(new RegExp("{" + prop_id + "}", "g"), prop_val);
    //     }
    // });
    if (typeof replaceToken !== "function") {
        replaceToken = this.replaceToken;
    }
    return str.replace(regex, function (token) {
        return replaceToken.call(that, token);
    });
};

module.exports.replaceToken = function (token) {
    return this[token];
};

    // sanity check method - ensures key doesn't already exist anywhere in prototype chain 
module.exports.define = function (key, value) {
    if (this[key] !== undefined) {
        throw new Error("key already exists in prototype chain: " + key);
    }
    this[key] = value;
};

    // sanity check method - ensures key doesn't already exist in this object
module.exports.override = function (key, value) {
    if (this.hasOwnProperty(key)) {
        throw new Error("key already exists in object: " + key);
    }
    if (this[key] === undefined) {
        throw new Error("key does not exist in prototype chain: " + key);
    }
    this[key] = value;
};

    // sanity check method - reassign key if it already exist in this object
module.exports.reassign = function (key, value) {
    if (!this.hasOwnProperty(key)) {
        throw new Error("key does not exist in object: " + key);
    }
    this[key] = value;
};

module.exports.path = function () {
    var out = "",
        level = this;

    while (level) {
        out = "." + (level.id || "") + out;
        level = level.owner;
    }
    return out.substr(1);           // cut off initial "."
};

module.exports.descent = function () {
    var out = "",
        level = this;
    while (level.parent) {
        out = "/" + (level.id || "") + out;
        level = level.parent;
    }
    return out || "/";
};

module.exports.toString = function () {
    return this.descent();              // conform to R6 output
};

module.exports.isDescendantOf = function (obj) {
    return !!this.parent && (this.parent === obj || this.parent.isDescendantOf(obj));
};




// module.exports.trigger = function (event, arg1, arg2, arg3) {
//     if (this.parent) {
//         this.parent.trigger.call(this);
//     }
// };

//To show up in Chrome debugger...
//@ sourceURL=base/Base.js
},{}],2:[function(require,module,exports){
/*jslint node: true */
"use strict";

var Base = require("./Base");

module.exports = Base.clone({
    id: "Log",
    levels : {
        trace :  0,
        debug :  2,
        info  :  4,
        warn  :  6,
        error :  8,
        fatal : 10
    },
    levels_text : [
        "TRACE", null,
        "DEBUG", null,
        "INFO ", null,
        "WARN ", null,
        "ERROR", null,
        "FATAL", null
    ],
    counters: {},
    level : 4
});


module.exports.define("log", function (str, object, level) {
    if (!this.counters[level]) {
        this.counters[level] = 0;
    }
    this.counters[level] += 1;
    if (this.checkLevel(level, str)) {
        this.printLine(this.levels_text[level] + ": " + str);
    }
});

module.exports.define("trace", function (str, object) {
    this.log(str, object, this.levels.trace);
});

module.exports.define("debug", function (str, object) {
    this.log(str, object, this.levels.debug);
});

module.exports.define("info" , function (str, object) {
    this.log(str, object, this.levels.info);
});

module.exports.define("warn" , function (str, object) {
    this.log(str, object, this.levels.warn);
});

module.exports.define("error", function (str, object) {
    this.log(str, object, this.levels.error);
});

module.exports.define("fatal", function (str, object) {
    this.log(str, object, this.levels.fatal);
});

module.exports.define("checkLevel", function (level, str) {
    return (level >= this.level);
});

module.exports.define("printLine", function (str) {
    if (console && typeof console.log === "function") {
        console.log(str);
    } else if (typeof print === "function") {
        print(str);
    } else {
        throw new Error("can't write log");
    }
});


},{"./Base":1}],3:[function(require,module,exports){
/*global Promise, $ */
/*jslint node: true */
"use strict";

var Replicator = require("./Replicator"),
    Log        = require("../base/Log");
//    Promise    = require("q");

/*
 * 
 * doc_obj.local_change = true              I have a local change to PUT, server believed to be in sync
 * doc_obj.conflict = true                  I have a local change to PUT, server found to be out of sync
 * doc_obj.conflict_payload = {...}         I have got latest from server to resolve conflict
 *
 * doc_obj.payload._rev						Server database revision code
 */

module.exports = Replicator.clone({
    id: "CouchReplicator"
});




module.exports.define("getServerAllDocSummary", function () {
    Log.debug("beginning getServerAllDocSummary()");
    return this.getServerDocChanges();
});

//use changelog?
module.exports.define("getServerDocChanges", function () {
    var that = this,
        promise,
        url;

    Log.debug("beginning getServerDocChanges()");
    url = that.database_url + "_changes";
    if (this.last_replication_point) {
        url += "?since=" + this.last_replication_point;
    }
    Log.debug("url: " + url);
    
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "GET", timeout: that.ajax_timeout, dataType: "json", cache: false,
            beforeSend: function (jq_xhr) {
//              jq_xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                Log.debug("getServerDocChanges() HTTP status code: " + jq_xhr.status + ", or in text: " + jq_xhr.statusText);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown);
                reject(text_status);
            }
        });
    });
    // server_props_all is a map object keyed on uuid, each value being rev string
    promise.then(function (server_props_all) {
        var i,
            server_props_i;
        that.this_replication_point = server_props_all.last_seq;
        Log.info("this_replication_point: " + that.this_replication_point);
//        delete server_props_all.last_seq;
        Log.info("results.length: " + server_props_all.results.length);

        for (i = 0; i < server_props_all.results.length; i += 1) {
            server_props_i = server_props_all.results[i];
            server_props_all[server_props_i.id] = server_props_i.changes[0].rev;
            Log.debug("doc: " + server_props_i.id + " = " + server_props_i.changes[0].rev);
        }
        delete server_props_all.results;
        delete server_props_all.last_seq;
        return server_props_all;
    });
    return promise;
});
/*
module.exports.define("replicateLocalDocs", function (server_props_all) {
    var that = this,
        uuid;
    this.log("beginning replicateLocalDocs()");
    for (uuid in server_props_all) {
        if (server_props_all.hasOwnProperty(uuid)) {
            that.log("replicateLocalDocs() doc: " + uuid);
            x.store.getDoc("dox", uuid)
            .then(function (doc_obj) {
                that.replicateDoc(doc_obj, server_props_all);
            });
        }
    }
});
*/

module.exports.define("deleteFromServer", function (doc_obj) {
    var that = this,
        promise,
        url;

    Log.info("beginning deleteFromServer(): " + doc_obj.uuid);
    url = that.database_url + doc_obj.uuid;
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: url, cache: false, type: "DELETE",
            beforeSend: function (jq_xhr) {
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
            	Log.info("delete response: " + jq_xhr.status);
                // that.setOnline(true);
                if (data.ok) {
                    resolve(data);
                } else {
                    reject("unknown");
                }
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown);
                reject(text_status);
            }
        });
    });
    promise.then(function (data) {
        Log.debug("deleteFromServer() okay");
        that.store.delete(doc_obj.uuid);
    });
    promise.then(null, /* catch */ function (reason) {
        Log.error("failed deleteFromServer(): " + reason);
    });
    return promise;
});

module.exports.define("pushToServer", function (doc_obj) {
    var that = this,
        promise,
        url;

    Log.info("beginning pushToServer(): " + doc_obj.uuid);
    url = that.database_url + doc_obj.uuid;
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: url, cache: false, type: "PUT", data: JSON.stringify(doc_obj.payload),
            beforeSend: function (jq_xhr) {
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                // that.setOnline(true);
                if (data.ok) {
                    resolve(data);
                } else {
                    reject("unknown");
                }
            },
            error: function (jq_xhr, text_status, error_thrown) {
                // error_thrown = "Conflict"
                if (jq_xhr.status === 409) {            // conflict
                    that.markAsConflict(doc_obj);
                } else {
                    that.ajaxError(jq_xhr, text_status, error_thrown);
                    reject(text_status);
                }
            }
        });
    });
    promise.then(function (data) {
//{"ok":true,"id":"cf454fa3-daad-41c1-bed3-2df58a70eec5","rev":"3-6fe8a81ac68a0f5f87644f1ed2898554"}
        Log.debug("pushToServer() okay: new rev: " + data.rev);
//        doc_obj._rev = data.rev;
        delete doc_obj.local_change;
        that.store.save(doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        Log.error("failed pushToServer(): " + reason);
    });
    return promise;
});

module.exports.define("pullFromServer", function (doc_obj) {
    var that = this,
        promise;

    Log.info("beginning pullFromServer(): " + doc_obj.uuid);
    if (!doc_obj.uuid) {
    	return;
    }
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: that.database_url + doc_obj.uuid, cache: false, type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
//                that.setOnline(true);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown);
                reject(text_status);
            }
        });
    });
    promise.then(function (data) {
  //      that.updateReplStatus(doc_obj, "Synced");
        doc_obj.payload = data;
        delete doc_obj.conflict;
        that.store.save(doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        Log.info("failed pushToServer(): " + reason);
    });
    return promise;
});

module.exports.define("markAsConflict", function (doc_obj) {
    Log.info("beginning markAsConflict()");
    doc_obj.conflict = true;
    delete doc_obj.local_change;
    this.store.save(doc_obj);
});

// This function should be used to reset the replication state of the local data, but NOT to clean up the doc payloads
module.exports.define("replicationReset", function () {
    /*jslint nomen: true*/
    var that = this;
    Log.info("beginning replicationReset()");
    this.last_replication_point = null;
    this.store.getAllDocs()
	    .then(function (results) {
	        var i,
	            doc;
	        for (i = 0; i < results.length; i += 1) {
	            doc = results[i];
	            delete doc.repl_status;
	            delete doc.local_change;
	            delete doc.conflict;
	            delete doc._rev;
	            delete doc.conflict_payload;
	            that.store.save(doc);
	        }
	    })
	    .then(null, /* catch */ function (reason) {
	        Log.error("replicationReset() failed: " + reason);
	    });
});


},{"../base/Log":2,"./Replicator":4}],4:[function(require,module,exports){
/*global Promise */
/*jslint node: true */
"use strict";

var Base = require("../base/Base"),
    Log  = require("../base/Log");
//    Promise = require("q");

/*
 * General Design:
 * 1. Get a structure representing changes on the server - getServerAllDocSummary() returning server_props_all
 * 2. replicateLocalDocs() loops over all local documents,
 * 3. calling replicateDoc() on each, which:
 * 4. decides whether a local change needs to be pushed to the server, vice versa, or no action required
 * 
 * doc_obj.local_change = true              I have a local change to PUT, server believed to be in sync
 * doc_obj.conflict = true                  I have a local change to PUT, server found to be out of sync
 * doc_obj.conflict_payload = {...}         I have got latest from server to resolve conflict
 */

module.exports = Base.clone({
    id: "Replicator",
    store               : null,             // local Store object
    database_url        : null,
    replication_interval: 1000 * 60,
    replication_continue: true,
    ajax_timeout        : 60000
});


module.exports.define("ajaxError", function (jq_xhr, text_status, error_thrown) {
    Log.error(jq_xhr.status + ", " + jq_xhr.statusText + ", " + jq_xhr.responseText + ", " + text_status + ", " + error_thrown);
    this.setStatus("network error", jq_xhr.status + ", " + jq_xhr.statusText + ", " + jq_xhr.responseText + ", " + text_status + ", " + error_thrown);
});

module.exports.define("setStatus", function (status_str, message) {
    Log.info(this.id + " === " + status_str + " === " + (message || ""));
});


//------------------------------------------------------------------------------ General Replication

module.exports.define("start", function () {
    var that = this,
        this_replication = new Date();

    if (!this.store) {
        throw new Error("no Store defined");
    }
    if (!this.database_url) {
        throw new Error("property database_url not defined");
    }
    if (!this.replication_continue) {
        Log.info("Replicator terminating");
        return;
    }
    Log.info("beginning start() at " + this_replication.toString() + ", repl timestamp: " + this_replication.getTime());
    this.setStatus("replicating", "getting info from server");
    this.getLastReplicationPoint();
    return this.getServerAllDocSummary()
        .then(function (server_props_all) {
            Log.debug("start() typeof server_props_all: " + typeof server_props_all);
            that.setStatus("replicating", "cycling through local docs");
            that.replicateLocalDocs(server_props_all);
        })
        .then(null, /* catch */ function (reason) {
            Log.error("start() failed because: " + reason);
            that.setStatus("terminating");
            this.replication_continue = false;
        });
});

module.exports.define("replicationLoop", function () {
    var that = this;
    Log.info("beginning replicationLoop()");
    setTimeout(function () {
        that.start();
    }, this.replication_interval);
});

module.exports.define("replicateLocalDocs", function (server_props_all) {
    var that = this;
    Log.debug("beginning replicateLocalDocs()");
    this.store.getAll()
        .then(function (results) {
            var i;
            for (i = 0; i < results.length; i += 1) {
                Log.debug("replicateLocalDocs() " + i + ", " + results[i].uuid);
                that.replicateDoc(results[i], server_props_all[results[i].uuid]);
                delete server_props_all[results[i].uuid];
            }
            Log.info("Replicated " + i + " local docs");
        })
        .then(function () {
            var uuid;
            Log.info("Docs on the server not already local " + Object.keys(server_props_all));
            for (uuid in server_props_all) {
                if (server_props_all.hasOwnProperty(uuid)) {
                    that.pullFromServer({ uuid: uuid });
                }
            }
        })
        .then(function () {
            that.setThisReplicationPoint();
        })
        .then(null, /* catch */ function (reason) {
            Log.error("replicateLocalDocs() failed: " + reason);
        })
        .then(function () {
            Log.info("replicate() calling loop");
            that.setStatus("paused");
            that.replicationLoop();
        });
});

module.exports.define("replicateDoc", function (doc_obj, latest_server_rev) {
    Log.info("beginning replicateDoc() on: " + doc_obj.uuid +
        ", local_change: " + doc_obj.local_change +
        ", latest_server_rev: " + latest_server_rev +
        ", payload._rev: " + (doc_obj.payload && doc_obj.payload._rev));

    if (doc_obj.local_delete) {
        Log.debug("replicateDoc() marked for deletion, delete from server");
        this.deleteFromServer(doc_obj);
    } else if (doc_obj.conflict || !doc_obj.payload || (latest_server_rev && latest_server_rev !== doc_obj.payload._rev)) {
        Log.debug("replicateDoc() rev diff, pull from server");
        delete doc_obj.latest_server_rev;
//        doc_obj.latest_server_rev = latest_server_rev;
        if (doc_obj.local_change) {
            Log.error("replicateDoc() conflict found");
            doc_obj.conflict_payload = doc_obj.payload;
        }
        this.store.save(doc_obj);
//        this.updateReplStatus(doc_obj, "Server Change");
        this.pullFromServer(doc_obj);

    } else if (doc_obj.local_change) {
        Log.debug("replicateDoc() local_change, push to server");
        this.pushToServer(doc_obj);
        
    }
});

module.exports.define("getReplicationStatus", function (doc_obj) {
    var   out = "",
        delim = "";

    function addPiece(str) {
        out += delim + str;
        delim = ", ";
    }
    if (doc_obj.local_delete) {
        addPiece("local delete"); 
    }
    if (doc_obj.local_change) {
        addPiece("local change"); 
    }
    if (doc_obj.conflict) {
        addPiece("** conflict **"); 
    }
    if (!out) {
        out = "up-to-date";
    }
    return out;
});

module.exports.define("getLastReplicationPoint", function () {
    Log.debug("beginning getLastReplicationPoint()");
    if (this.store.root_doc) {
        this.last_replication_point = this.store.root_doc.last_replication_point;
    } else {
        Log.warn("getLastReplicationPoint(): no root doc");
        this.store.root_doc = { uuid: "root" };
        this.store.save(this.store.root_doc);
    }
});

module.exports.define("setThisReplicationPoint", function () {
    // var that = this,
    //     doc_obj;
    Log.info("beginning setThisReplicationPoint()");
    if (!this.store.root_doc) {
        throw new Error("no root doc");
    }
    this.store.root_doc.last_replication_point = this.this_replication_point;
    return this.store.save(this.store.root_doc)
        .then(null, /* catch */ function (reason) {
            Log.error("setThisReplicationPoint() failed: " + reason);
        });
});

module.exports.define("resetReplicationPoint", function () {
    // var that = this,
    //     doc_obj;
    Log.info("beginning resetReplicationPoint()");
    if (!this.store.root_doc) {
        throw new Error("no root doc");
    }
    this.store.root_doc.last_replication_point = null;
    delete this.store.root_doc.repl_status;
    return this.store.save(this.store.root_doc)
        .then(null, /* catch */ function (reason) {
            Log.error("setThisReplicationPoint() failed: " + reason);
        });
});


//------------------------------------------------------------------------------ repl_status approach
//------------------------------------------------------------------------------ Replication Status
/*
//action being one of "Local Change", "Synced", "Server Change"
module.exports.define("updateReplStatus", function (doc_obj, action) {
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
        throw new Error("invalid action: " + action);
    }
});

module.exports.define("mustDeleteLocal", function (doc_obj) {
    return (doc_obj.repl_status === "Server Delete");
});

module.exports.define("mustDeleteServer", function (doc_obj) {
    return (doc_obj.repl_status === "Local Delete");
});

module.exports.define("mustPushUpdateToServer", function (doc_obj) {
    return (!doc_obj.repl_status || doc_obj.repl_status === "Local Only" || doc_obj.repl_status === "Local Change");
});

module.exports.define("mustPullUpdateFromServer", function (doc_obj) {
    return (doc_obj.repl_status === "Server Only" || doc_obj.repl_status === "Server Change");
});

module.exports.define("forgetLocalChanges", function (doc_obj) {
    // var that = this;
//  alert("forgetLocalChanges: " + doc_obj.uuid);
    if (doc_obj.repl_status !== "Conflict") {
        return false;
    }
    this.updateReplStatus(doc_obj, "Forget Local");
    return this.store.save(doc_obj);
});

*/



/*
module.exports.define("replicateDoc = function (doc_obj, server_props_all) {
    var server_props = server_props_all[doc_obj.uuid];
    this.log("beginning replicateDoc() on: " + doc_obj.uuid + ", repl_status: " + doc_obj.repl_status + ", server_props: " + server_props, 2);
    if (server_props !== doc_obj.payload.rev) {
        this.log("replicateDoc() rev diff, setting repl_status to Server Change", 3);
        this.updateReplStatus(doc_obj, "Server Change");
        x.store.storeDoc("dox", doc_obj);
    }
    delete server_props_all[doc_obj.uuid];

    if (this.mustDeleteLocal(doc_obj)) {
        this.log("replicateDoc() must delete local", 3);
        this.deleteLocal(doc_obj);

    } else if (this.mustDeleteServer(doc_obj)) {
        this.log("replicateDoc() must delete server", 3);
        this.deleteServer(doc_obj.uuid);

    } else if (this.mustPushUpdateToServer(doc_obj)) {
        this.log("replicateDoc() push to server - Local Only OR Local Change", 3);
        this.pushToServer(doc_obj);

    } else if (this.mustPullUpdateFromServer(doc_obj)) {
        this.log("replicateDoc() pull from server - Server Only OR Server Change", 3);
        this.pullFromServer(doc_obj);

    } else {
        this.log("replicateDoc() no action", 3);
    }
};
*/


},{"../base/Base":1,"../base/Log":2}],5:[function(require,module,exports){
/*global indexedDB, Promise */
/*jslint node: true */
"use strict";

var Base = require("../base/Base"),
	Log  = require("../base/Log");

module.exports = Base.clone({
    id: "Store",
    db: null,							// IndexedDB database object - set in start()
    db_id: null,						// string database name
    store_id: null,						// string store name
    version: null,						// integer version sequence
    create_properties: null,			// object including key path, etc
    indexes: null						// array declaring indexes
});

module.exports.define("deleteObjectStore", function (db) {
    try {
        db.deleteObjectStore(this.store_id);
        Log.debug("deleted store");
    } catch (e) {
    	Log.warn("error trying to delete object store: " + e.toString());
    }
});

module.exports.define("createObjectStore", function (db) {
    var store,
    	i;
    try {
        store = db.createObjectStore(this.store_id, this.create_properties);
        Log.debug("created store");
        for (i = 0; this.indexes && i < this.indexes.length; i += 1) {
        	store.createIndex(this.indexes[i].id, this.indexes[i].key_path, this.indexes[i].additional);
        	Log.debug("created index");
        }
    } catch (e) {
    	Log.warn("error trying to create object store: " + e.toString());
    }
});

module.exports.define("start", function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        var request = indexedDB.open(that.db_id, that.version);

        request.onupgradeneeded = function (event) {
          // The database did not previously exist, so create object stores and indexes.
            var db = request.result;
			that.deleteObjectStore(db);
			that.createObjectStore(db);
        };
    
        request.onsuccess = function () {
            that.db = request.result;
            resolve();
        };
        
        request.onerror = function (error) {
        	Log.error("Store.start() error: " + error);
            reject(error);
        };
    });
});


module.exports.define("save", function (doc_obj) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readwrite"),
            store = tx.objectStore(that.store_id);

        store.put(doc_obj);
        tx.oncomplete = function () {
            resolve(doc_obj);
        };
        tx.onerror = function () {
        	Log.error("Store.save() error: " + tx.error);
            reject(tx.error);
        };
    });
});


module.exports.define("get", function (key) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readonly"),
            store = tx.objectStore(that.store_id),
            request = store.get(key);

        request.onsuccess = function () {
            var doc_obj = request.result;
            if (doc_obj === undefined) {
            	Log.debug("doc not found: " + key);
                reject("doc not found: " + key);
            } else {
            	Log.trace("doc found: " + key);
                resolve(doc_obj);
            }
        };
        request.onerror = function () {
            Log.debug("Store.get() error: " + tx.error);
            reject(tx.error);
        };
    });
});


module.exports.define("delete", function (key) {
    var that = this;

    return new Promise(function (resolve, reject) {
        var tx = this.db.transaction(that.store_id, "readwrite"),
            store = tx.objectStore(that.store_id),
        	request = store["delete"](key);

        request.onsuccess = function () {
            Log.trace("Store.delete() succeeded");
            resolve(key);
        };
        request.onerror = function () {
            Log.debug("error in Store.delete(): " + tx.error);
            reject(tx.error);
        };
    });
});


module.exports.define("getAll", function () {
    var that = this,
        results = [];

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readonly"),
            store = tx.objectStore(that.store_id),
            request = store.openCursor();

        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                // Called for each matching record.
                results.push(cursor.value);
                cursor["continue"]();
            } else {
            	Log.trace("getAll() results: " + results.length);
                resolve(results);
            }
        };
        request.onerror = function () {
            Log.debug("Store.getAll() error: " + tx.error);
            reject(tx.error);
        };
    });
});


},{"../base/Base":1,"../base/Log":2}],6:[function(require,module,exports){
/*global $ */
/*jslint node: true */
"use strict";

var Base = require("../base/Base");

module.exports = Base.clone({
	id: "UI",
	notification_selector: "#notification",
	     healthy_selector: "#healthy"
});


module.exports.define("notify", function (msg, healthy) {
	$(this.notification_selector).text(msg);
	if (typeof healthy === "boolean") {
		$(this.healthy_selector).css("color", healthy ? "green" : "red");
	}
});

},{"../base/Base":1}],7:[function(require,module,exports){
(function (global){

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":7}],9:[function(require,module,exports){
/*global $, document, confirm */
/*jslint node: true */
"use strict";

var UI   = require("./UI"),
	Log  = require("../base/Log"),
	UUID = require("uuid");

Log.info("UINotes loading...");

module.exports = UI.clone({
	id: "UINotes",
	list_pane_selector: "#list_pane",
	 doc_pane_selector:  "#doc_pane",
    current_row: 1
});

module.exports.store = require("./Store").clone({
    id: "NotesStore",
    db_id: "Notes",
    store_id: "dox",
    root_doc_id: "root",
    root_doc_title: "Everything",
    version: 1,
    create_properties: { keyPath: "uuid" }
});

module.exports.repl  = require("./CouchReplicator").clone({
	id: "CouchReplicator",
	store: module.exports.store,
    database_url: "http://other_apps:5984/fastdox/"
});


$(document).ready(function() {
	// x.ui.using = x.ui;
	// x.ui.using.start();
//    var textarea = $("#edit_area #doc_content");
    // Aloha.ready(function() {
    //     Aloha.jQuery(textarea).aloha();
    // });
	module.exports.store.start()
		.then(function () {
			module.exports.drawList();
		});

	module.exports.repl .start();
});

$(document).on("click", "#menu_create_folder", function(event) {
	module.exports.renderCreate("folder");
});

$(document).on("click", "#menu_create_doc"   , function(event) {
	module.exports.renderCreate("doc");
});

$(document).on("click", "#doc_save"   , function(event) {
	module.exports.saveDoc();
});

$(document).on("click", "#doc_cancel" , function(event) {
	module.exports.closeDocPane();
});

$(document).on("click", "#doc_delete" , function(event) {
	module.exports.deleteDoc();
});

$(document).on("click", "#list_pane tbody > tr", function () {
    var uuid = $(this).attr("uuid");
    Log.debug("opening doc: " + uuid);
    module.exports.renderUpdate(uuid);
});

$(document).on("keyup" , "#doc_pane", function (event) {
	module.exports.docFieldsKeyUp();
});

$(document).on("keyup" , null, function (event) {
	       if (event.which === 27) {
	    module.exports.escapeKeyPressed();
	} else if (event.which === 38) {
        module.exports.upArrowPressed();
    } else if (event.which === 40) {
        module.exports.downArrowPressed();
    } else if (event.which === 13) {
        module.exports.enterKeyPressed();
    }
});

module.exports.define("drawList", function () {
	var that = this;
	this.notify("opening");
	this.closeDocPane();
	this.store.getAll()
		.then(function (results) {
            that.current_row = 1;
			that.renderList(results);
            that.markCurrentRow();
			that.notify("ready", true);
		})
		.then(null, /* catch */ function (reason) {
		    Log.error("UINotes.drawList() getting all docs: " + reason);
			that.notify("error", false);
		});
});

module.exports.define("renderList", function (results) {
    var tbody_elem,
    	i;
    tbody_elem = $(this.list_pane_selector).find("table > tbody");
    tbody_elem.empty();
    for (i = 0; i < results.length; i += 1) {
    	if (!results[i].local_delete) {
    		this.renderListRow(tbody_elem, results[i]);
    	}
    }
    $(this.list_pane_selector).find("#list_footer").text(results.length + " record" + (results.length !== 1 ? "s" : ""));
});

module.exports.define("renderListRow", function (tbody_elem, doc_obj) {
    tbody_elem.append("<tr uuid='" + doc_obj.uuid + "'>" +
    	"<td>" + (doc_obj.payload ? doc_obj.payload.title : "[no payload]") + "</td>" +
    	// "<td>" + (doc_obj.last_local_save || "unknown") + "</td>" +
    	// "<td>" + this.getInfoBlock(doc_obj) + "</td>" +
        "</tr>");
});

module.exports.define("openDocPane", function () {
    if (!this.current_doc) {
    	this.notify("no current_doc", false);
    	return;
    }
	$(this.list_pane_selector).   addClass("hidden");
	$(this. doc_pane_selector).removeClass("hidden");
	$("#change_buttons").addClass("hidden");
	$("#doc_delete"    ).addClass("hidden");

    $(this. doc_pane_selector + " #doc_title").val(this.current_doc.payload.title);
    $(this. doc_pane_selector + " #doc_info" ).html(this.getInfoBlock(this.current_doc));
    $(this. doc_pane_selector + " #doc_content").empty();
    $(this. doc_pane_selector + " #doc_content").html(this.current_doc.payload.content);
    $(this. doc_pane_selector + " #doc_view"   ).empty();
    $(this. doc_pane_selector + " #doc_conflict").html(this.current_doc.conflict || "");
});

module.exports.define("closeDocPane", function () {
	if (this.dontLoseChanges()) {
		return;
	}
	this.current_doc = null;
	$(this.list_pane_selector).removeClass("hidden");
	$(this. doc_pane_selector).   addClass("hidden");
});

module.exports.define("renderCreate", function () {
	if (this.dontLoseChanges()) {
		return;
	}
    this.current_doc  = { uuid: UUID.v4(), creating: true, payload: { title: "", type: "doc" } };
	this.openDocPane();
});

module.exports.define("renderUpdate", function (uuid) {
	var that = this;
	if (this.dontLoseChanges()) {
		return;
	}
    this.notify("opening doc: " + uuid);
    this.current_doc = null;
    this.store.get(uuid)
	    .then(function (doc_obj) {
	        that.current_doc  = doc_obj;
	        that.notify("editing " + doc_obj.payload.title, true);
			that.openDocPane();
			$("#doc_delete"    ).removeClass("hidden");
	    })
	    .then(null, /* catch */ function (reason) {
	        that.notify("error: " + reason, false);
	    });
});

module.exports.define("saveDoc", function () {
    var that = this,
        create = false;
    if (!this.current_doc) {
	    this.notify("no current doc to save", false);
        return;
    }
    this.current_doc.payload = this.current_doc.payload || {};
    this.current_doc.payload.title   = $(this. doc_pane_selector + " #doc_title"  ).val();
    this.current_doc.payload.content = $(this. doc_pane_selector + " #doc_content").html();
//    this.current_doc.payload.sequence_nbr = this.current_doc.payload.sequence_nbr || 0;
    if (this.current_doc.creating) {
        create = true;
        delete this.current_doc.creating;
    }
    this.current_doc.local_change = true;
    this.current_doc.last_local_save = (new Date()).toUTCString();

    this.store.save(this.current_doc)
        .then(function (doc_obj) {
            that.drawList();
            that.notify("saved", true);
        })
        .then(null, /* catch */ function (reason) {
	        that.notify("error: " + reason, false);
        });
});

module.exports.define("deleteDoc", function () {
    var that = this;
    if (!this.current_doc) {
	    this.notify("no current doc to delete", false);
        return;
    }
    this.current_doc.local_delete = true;
    this.store.save(this.current_doc)
        .then(function (doc_obj) {
			that.current_doc = null;
            that.drawList();
            that.notify("deleted", true);
        })
        .then(null, /* catch */ function (reason) {
	        that.notify("error: " + reason, false);
        });
});

module.exports.define("isCurrentDocModified", function () {
    var diff = false;
    if (!this.current_doc) {
        throw new Error("no current_doc to save");
    }
    diff = ($(this. doc_pane_selector + " #doc_title").val() !== this.current_doc.payload.title);
//    if (this.current_doc.payload.type === "document") {
        diff = diff || ($(this. doc_pane_selector + " #doc_content").html() !== this.current_doc.payload.content);
//    }
    return diff;
});

module.exports.define("docFieldsKeyUp", function () {
	if (this.isCurrentDocModified()) {
		$("#doc_save").removeClass("hidden");
	} else {
		$("#doc_save").   addClass("hidden");
	}
});

module.exports.define("escapeKeyPressed", function () {
	if (this.current_doc) {
		if (this.isCurrentDocModified()) {
			if (confirm("Save changes?")) {
				this.saveDoc();
				return;
			}
			this.current_doc = null;
		}
		this.closeDocPane();
	}
});

module.exports.define("upArrowPressed", function () {
    if (!this.current_doc && this.current_row > 1) {
        this.current_row -= 1;
        this.markCurrentRow();
    }
});

module.exports.define("downArrowPressed", function () {
    if (!this.current_doc && this.current_row < $(this.list_pane_selector + " tr").length) {
        this.current_row += 1;
        this.markCurrentRow();
    }
});

module.exports.define("enterKeyPressed", function () {
    if (!this.current_doc) {
        this.current_row += 1;
        this.renderUpdate($(this.list_pane_selector + " tr:eq(" + this.current_row + ")").attr("uuid"));
    }
});

module.exports.define("dontLoseChanges", function () {
    if (this.current_doc && this.isCurrentDocModified()) {
        return !confirm("Lose unsaved changes?");
    }
});

module.exports.define("getInfoBlock", function (doc_obj) {
    /*jslint nomen: true*/
	return "<span class='info_block'>uuid: " + doc_obj.uuid +
		"<br/>rev : " + (doc_obj.payload ? doc_obj.payload._rev : "[no payload]") +
		"<br/>repl: " + this.repl.getReplicationStatus(doc_obj) + "</span>";
});

module.exports.define("markCurrentRow", function () {
    $(this.list_pane_selector + " tr").removeClass("info");
    $(this.list_pane_selector + " tr:eq(" + this.current_row + ")").addClass("info");
});


},{"../base/Log":2,"./CouchReplicator":3,"./Store":5,"./UI":6,"uuid":8}]},{},[9]);
