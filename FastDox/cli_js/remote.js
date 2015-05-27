/*global $, indexedDB, UUID, Promise */
/*jslint browser: true */
"use strict";

var x;

if (!x) {
    x = {};
}

x.remote = {};
x.remote.base = {
    log_level            : 4,
    database_url         : "http://other_apps:5984/fastdox/",
    replication_interval : 1000 * 60,
    replication_continue : false,
    ajax_timeout         : 60000,
};

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

x.remote.base.log = function (str, log_level) {
    if (log_level <= this.log_level) {
        console.log(str);
    }
};

x.remote.base.ajaxError = function (jq_xhr, text_status, error_thrown) {
    this.setOnline(false, jq_xhr.status + ", " + jq_xhr.statusText + ", " + jq_xhr.responseText + ", " + text_status + ", " + error_thrown);
};

x.remote.base.setOnline = function (online, message) {
    x.ui.using.setStatus(online ? "online" : "offline");
    if (!online) {
        this.log("ajax error: " + message, 0);
    }
};

//------------------------------------------------------------------------------ General Replication

x.remote.base.replicate = function () {
    var that = this,
        this_replication = new Date();

    if (!this.replication_continue) {
        return;
    }
    this.log("beginning replicate() at " + this_replication.toString() + ", repl timestamp: " + this_replication.getTime(), 1);
    x.ui.using.setStatus("replicating");
    this.getLastReplicationPoint();
    return this.getServerAllDocSummary()
    .then(function (server_props_all) {
        that.log("replicate() typeof server_props_all: " + typeof server_props_all, 4);
        that.setOnline(true);
        that.replicateLocalDocs(server_props_all);
    })
    .then(null, /* catch */ function (reason) {
        that.log("replicate() failed because: " + reason, 0);
    });
};

x.remote.base.replicationLoop = function () {
    this.log("beginning replicationLoop()", 0);
    setTimeout(function () { x.remote.using.replicate(); }, this.replication_interval);
};

x.remote.base.replicateLocalDocs = function (server_props_all) {
    var that = this;
    this.log("beginning replicateLocalDocs()", 1);
    x.store.getAllDocs("dox")
    .then(function (results) {
        var i;
        for (i = 0; i < results.length; i += 1) {
            that.log("replicateLocalDocs() " + i + ", " + results[i].uuid, 3);
            that.replicateDoc(results[i], server_props_all);
        }
        that.log("Replicated " + i + " local docs", 1);
    })
    .then(function () {
        var uuid;
        that.log("Docs on the server not already local " + Object.keys(server_props_all), 1);
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
        that.log("replicateLocalDocs() failed: " + reason, 0);
    })
    .then(function () {
        that.log("replicate() calling loop", 1);
        that.replicationLoop();
    });
};

x.remote.base.replicateDoc = function (doc_obj, server_props_all) {
    var latest_server_rev = server_props_all[doc_obj.uuid];
    this.log("beginning replicateDoc() on: " + doc_obj.uuid + ", local_change: " + doc_obj.local_change +
            ", latest_server_rev: " + latest_server_rev + ", payload._rev: " + (doc_obj.payload && doc_obj.payload._rev), 2);
    if (doc_obj.conflict || !doc_obj.payload || (latest_server_rev && latest_server_rev !== doc_obj.payload._rev)) {
        this.log("replicateDoc() rev diff, pull from server", 3);
        delete doc_obj.latest_server_rev;
//        doc_obj.latest_server_rev = latest_server_rev;
        if (doc_obj.local_change) {
            this.log("replicateDoc() conflict found", 3);
            doc_obj.conflict_payload = doc_obj.payload;
        }
//        this.updateReplStatus(doc_obj, "Server Change");
//        x.store.storeDoc("dox", doc_obj);
        this.pullFromServer(doc_obj);

    } else if (doc_obj.local_change) {
        this.log("replicateDoc() local_change, push to server", 3);
        this.pushToServer(doc_obj);
        
    }
    delete server_props_all[doc_obj.uuid];
};

/*
x.remote.base.replicateDoc = function (doc_obj, server_props_all) {
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

x.remote.base.getLastReplicationPoint = function () {
    this.log("beginning getLastReplicationPoint()", 2);
    if (!x.store.root_doc) {
        throw new Error("no root doc");
    }
    this.last_replication_point = x.store.root_doc.last_replication_point;
};

x.remote.base.setThisReplicationPoint = function () {
    var that = this,
        doc_obj;
    this.log("beginning setThisReplicationPoint()", 2);
    if (!x.store.root_doc) {
        throw new Error("no root doc");
    }
    x.store.root_doc.last_replication_point = this.this_replication_point;
    return x.store.storeDoc("dox", x.store.root_doc)
    .then(null, /* catch */ function (reason) {
        that.log("setThisReplicationPoint() failed: " + reason, 0);
    });
};

x.remote.base.resetReplicationPoint = function () {
    var that = this,
        doc_obj;
    this.log("beginning resetReplicationPoint()", 2);
    if (!x.store.root_doc) {
        throw new Error("no root doc");
    }
    x.store.root_doc.last_replication_point = null;
    delete x.store.root_doc.repl_status;
    return x.store.storeDoc("dox", x.store.root_doc)
    .then(null, /* catch */ function (reason) {
        that.log("setThisReplicationPoint() failed: " + reason, 0);
    });
};


//------------------------------------------------------------------------------ repl_status approach
//------------------------------------------------------------------------------ Replication Status

//action being one of "Local Change", "Synced", "Server Change"
x.remote.base.updateReplStatus = function (doc_obj, action) {
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

x.remote.base.mustDeleteLocal = function (doc_obj) {
    return (doc_obj.repl_status === "Server Delete");
};

x.remote.base.mustDeleteServer = function (doc_obj) {
    return (doc_obj.repl_status === "Local Delete");
};

x.remote.base.mustPushUpdateToServer = function (doc_obj) {
    return (!doc_obj.repl_status || doc_obj.repl_status === "Local Only" || doc_obj.repl_status === "Local Change");
};

x.remote.base.mustPullUpdateFromServer = function (doc_obj) {
    return (doc_obj.repl_status === "Server Only" || doc_obj.repl_status === "Server Change");
};

x.remote.base.forgetLocalChanges = function (doc_obj) {
    var that = this;
//  alert("forgetLocalChanges: " + doc_obj.uuid);
    if (doc_obj.repl_status !== "Conflict") {
        return false;
    }
    this.updateReplStatus(doc_obj, "Forget Local");
    return x.store.storeDoc("dox", doc_obj);
};


//------------------------------------------------------------------------------ Couch Replication

x.remote.couch = Object.create(x.remote.base);


x.remote.couch.getServerAllDocSummary = function () {
    this.log("beginning getServerAllDocSummary()", 1);
    return this.getServerDocChanges();
};

//use changelog?
x.remote.couch.getServerDocChanges = function () {
    var that = this,
        promise,
        url;
    that.log("beginning getServerDocChanges()", 1);
    url = that.database_url + "_changes";
    if (this.last_replication_point) {
        url += "?since=" + this.last_replication_point;
    }
    that.log("url: " + url, 3);
    
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "GET", timeout: that.ajax_timeout, dataType: "json", cache: false,
            beforeSend: function (jq_xhr) {
//              jq_xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.setOnline(true);
                that.log("getServerDocChanges() HTTP status code: " + jq_xhr.status + ", or in text: " + jq_xhr.statusText, 1);
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
        that.log("this_replication_point: " + that.this_replication_point, 2);
//        delete server_props_all.last_seq;
        that.log("results.length: " + server_props_all.results.length, 2);

        for (i = 0; i < server_props_all.results.length; i += 1) {
            server_props_i = server_props_all.results[i];
            server_props_all[server_props_i.id] = server_props_i.changes[0].rev;
            that.log("doc: " + server_props_i.id + " = " + server_props_i.changes[0].rev, 3);
        }
        delete server_props_all.results;
        delete server_props_all.last_seq;
        return server_props_all;
    });
    return promise;
};
/*
x.remote.couch.replicateLocalDocs = function (server_props_all) {
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
};
*/

x.remote.couch.deleteServer = function (uuid) {
    var that = this;
    this.log("beginning deleteServer(): " + uuid, 1);
};

x.remote.couch.pushToServer = function (doc_obj) {
    var that = this,
        promise,
        url;
    this.log("beginning pushToServer(): " + doc_obj.uuid, 1);
    url = that.database_url + doc_obj.uuid;
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: url, cache: false, type: (doc_obj.payload._rev ? "PUT" : "POST"),
            data: JSON.stringify(doc_obj.payload),
            beforeSend: function (jq_xhr) {
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.setOnline(true);
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
        that.log("pushToServer() okay: new rev: " + data.rev, 1);
//        doc_obj._rev = data.rev;
        delete doc_obj.local_change;
//        that.updateReplStatus(doc_obj, "Synced");
        x.store.storeDoc("dox", doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        that.log("failed pushToServer(): " + reason, 0);
    });
    return promise;
};

x.remote.couch.pullFromServer = function (doc_obj) {
    var that = this,
        promise;
    this.log("beginning pullFromServer(): " + doc_obj.uuid, 1);
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: that.database_url + doc_obj.uuid, cache: false, type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.setOnline(true);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown);
                reject(text_status);
            }
        });
    });
    promise.then(function (data) {
        that.updateReplStatus(doc_obj, "Synced");
        doc_obj.payload = data;
        delete doc_obj.conflict;
        x.store.storeDoc("dox", doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        that.log("failed pushToServer(): " + reason, 0);
    });
    return promise;
};

x.remote.couch.markAsConflict = function (doc_obj) {
    this.log("beginning markAsConflict()", 1);
    doc_obj.conflict = true;
    delete doc_obj.local_change;
    x.store.storeDoc("dox", doc_obj);
};

// This function should be used to reset the replication state of the local data, but NOT to clean up the doc payloads
x.remote.couch.replicationReset = function () {
    var that = this,
        promise;
    this.log("beginning replicationReset()", 1);
    this.last_replication_point = null;
    promise = x.store.getAllDocs("dox");
    promise.then(function (results) {
        var i,
            doc;
        for (i = 0; i < results.length; i += 1) {
            doc = results[i];
            delete doc.repl_status;
            delete doc.local_change;
            delete doc.conflict;
            delete doc._rev;
            delete doc.conflict_payload;
            x.store.storeDoc("dox", doc);
        }
    })
    .then(null, /* catch */ function (reason) {
        that.log("replicationReset() failed: " + reason, 0);
    });
};



x.remote.using = x.remote.couch;



//------------------------------------------------------------------------------ Webdav Replication

x.remote.webdav = Object.create(x.remote.base);


//server_props_all is a map object keyed on uuid, each value being a map object: uuid, etag, last_mod, length
x.remote.webdav.getServerAllDocSummary = function () {
    var that = this;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: that.url, type: "PROPFIND", timeout: that.ajax_timeout,
            data: '<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><allprop/></D:propfind>',
            beforeSend: function (jq_xhr) {
                jq_xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
            },
            success: function (data, text_status, jq_xhr) {
                resolve(that.processCollection(data));
            },
            error: that.ajaxError
        });
    });
};

x.remote.webdav.processCollection = function (xml_doc) {
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

x.remote.webdav.processResponse = function (xml_element) {
    return {
        uuid    : this.getXMLValue(xml_element, "displayname"     ),
        etag    : this.getXMLValue(xml_element, "getetag"         ),
        last_mod: this.getXMLValue(xml_element, "getlastmodified" ),
        length  : this.getXMLValue(xml_element, "getcontentlength")
    };
};

x.remote.webdav.deleteServer = function (uuid) {
    var that = this;
    this.log("deleteServer()");
    $.ajax({ url: this.url + uuid, type: "DELETE", timeout: this.ajax_timeout,
        success: function (data, text_status, jq_xhr) {
            that.setOnline(true);
        },
        error: that.ajaxError
    });
};

x.remote.webdav.pushToServer = function (doc_obj) {
    var that = this;
    this.log("pushToServer()");
    $.ajax({ url: this.url + doc_obj.uuid, type: "PUT", data: doc_obj.content, timeout: this.ajax_timeout,
        beforeSend: function (jq_xhr) {
            jq_xhr.setRequestHeader('If-Modified-Since', '');      // needed for IOS6 and Chrome 24+
        },
        success: function () {
            that.setOnline(true);
            $.ajax({ url: that.url + doc_obj.uuid, type: "HEAD", timeout: that.ajax_timeout,
                success: function (data, text_status, jq_xhr) {
                    var headers = that.getHeaders(jq_xhr);
                    that.setOnline(true);
//                  doc_obj.server_last_repl = this_replication.getTime();
                    that.setDocPropertiesFromHeaders(headers, doc_obj);
                    that.updateReplStatus(doc_obj, "Synced");
                    x.store.storeDoc("dox", doc_obj);
//                    that.log(y.view(y.getHeaders(jq_xhr)));
                    that.log("pushToServer() success  HEAD: data: " + that.view(data) + ", text_status: " + String(text_status) + ", jq_xhr: "  + that.view(jq_xhr));
//                  that.setDavProperties(doc_obj.uuid, { doc_title: doc_obj.title });
                },
                error: function (a, b, c) {
                    that.online = false;
//                  that.log(y.view(y.getHeaders(c)));
                    that.log("pushToServer() error in HEAD: data: " + that.view(data) + ", text_status: " + String(text_status) + ", jq_xhr: "  + that.view(jq_xhr));
                }
            });
        },
        error: that.ajaxError
    });
};

x.remote.webdav.pullFromServer = function (doc_obj, item_callback) {
    var that = this;
    this.log("pullFromServer(): " + doc_obj.uuid);
    $.ajax({ url: this.url + doc_obj.uuid, type: "GET", timeout: this.ajax_timeout, dataType: "text",
        beforeSend: function (jq_xhr) {
            jq_xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
        },
        success: function (data, text_status, jq_xhr) {
            var headers;
            that.setOnline(true);
            that.log("pullFromServer() HTTP status code: " + jq_xhr.status + ", or in text: " + jq_xhr.statusText);
            headers = that.getHeaders(jq_xhr);
            that.log(y.view(headers));
            that.updateReplStatus(doc_obj, "Synced");
            doc_obj.content = data;
//          doc_obj.server_etag          = server_etag;
            that.setDocPropertiesFromHeaders(headers, doc_obj);
            that.log("Setting server_etag: " + doc_obj.server_etag);
            x.store.storeDoc("dox", doc_obj);
            if (typeof item_callback === "function") {
                item_callback(doc_obj);
            }
        },
        error: that.ajaxError
    });
};


//------------------------------------------------------------------------------ HTTP Headers
x.remote.webdav.getHeaders = function (http) {
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
//  that.log(headers);
};

x.remote.webdav.setDocPropertiesFromHeaders = function (headers, doc_obj) {
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
//  that.log("status: " + that.getXMLValue(xml_element, "status"          ));
//  that.log("creatd: " + that.getXMLValue(xml_element, "creationdate"    ));
//  that.log("dispnm: " + that.getXMLValue(xml_element, "displayname"     ));
//  that.log("lstmod: " + that.getXMLValue(xml_element, "getlastmodified" ));
//  that.log("contln: " + that.getXMLValue(xml_element, "getcontentlength"));
//  that.log("etaggg: " + that.getXMLValue(xml_element, "getetag"         ));

x.remote.webdav.getXMLValue = function (xml_parent, tagname) {
    var item;
    item = xml_parent.getElementsByTagName(tagname).item(0);
    if (item) {
        return item.textContent;
    }
};

//This doesn't work for some reason
x.remote.webdav.setDavProperties = function (doc_id, prop_map) {
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
        beforeSend: function (jq_xhr) {
            jq_xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
        },
        success: function (data, text_status, jq_xhr) {
            var headers;
            that.setOnline(true);
            that.log("setDavProperties: " + jq_xhr.status + ", or in text: " + jq_xhr.statusText);
//          that.log(a);
            that.processCollection(data);
            headers = that.getHeaders(jq_xhr);
            that.log(y.view(headers));
        },
        error: that.ajaxError
    });
};
