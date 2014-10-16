/*global $, indexedDB, UUID, Promise */
/*jslint browser: true */
"use strict";

var x;

if (!x) {
    x = {};
}

x.remote = {};
x.remote.base = {
    database_url         : "http://other_apps:5984/fastdox/",
    replication_interval : 10000,
    replication_continue : true,
    ajax_timeout         : 60000,
};


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
//    alert("forgetLocalChanges: " + doc_obj.uuid);
    if (doc_obj.repl_status !== "Conflict") {
        return false;
    }
    this.updateReplStatus(doc_obj, "Forget Local");
    return x.store.storeDoc("dox", doc_obj);
};

x.remote.base.log = function(str) {
    console.log(str);
};

x.remote.base.ajaxError = function (jq_xhr, text_status, error_thrown) {
    this.setOnline(false, jq_xhr.status + ", " + jq_xhr.statusText + ", " + jq_xhr.responseText + ", " + text_status + ", " + error_thrown);
};

x.remote.base.setOnline = function (online, message) {
    x.ui.using.setStatus(online ? "online" : "offline");
    if (!online) {
        this.log("ajax error: " + message);
    }
};



//------------------------------------------------------------------------------ General Replication

x.remote.base.replicate = function () {
    var that = this,
        this_replication = new Date();

    if (!this.replication_continue) {
        return;
    }
    this.log("beginning replicate() at " + this_replication.toString() + ", repl timestamp: " + this_replication.getTime());
    x.ui.using.setStatus("replicating");
    this.getLastReplicationPoint();
    return this.getServerAllDocSummary()
    .then(function (server_props_all) {
        that.setOnline(true);
        that.replicateLocalDocs(server_props_all);
    })
    .then(function () {
        that.setThisReplicationPoint();
    })
    .then(null, /* catch */ function (reason) {
        that.log("replicate() failed because: " + reason);
    })
    .then(function () {
//        that.replicationLoop();
    });
};

x.remote.base.replicationLoop = function () {
    this.log("beginning replicationLoop()");
    setTimeout(this.replicate, this.replication_interval);
};

x.remote.base.replicateLocalDocs = function (server_props_all) {
    var that = this;
    this.log("beginning replicateLocalDocs()");
    x.store.getAllDocs("dox")
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

x.remote.base.replicateDoc = function (doc_obj, server_props) {
    var server_props = server_props_all[doc_obj.uuid];
    this.log("beginning replicateDoc() on: " + doc_obj.uuid + ", repl_status: " + doc_obj.repl_status + ", server_props: " + server_props);
    if (server_props && server_props.etag !== doc_obj.server_etag) {
        this.log("replicateDoc() etag diff, setting repl_status to Server Change");
        this.updateReplStatus(doc_obj, "Server Change");
        x.store.storeDoc("dox", doc_obj);
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

x.remote.base.getLastReplicationPoint = function () {
    this.log("beginning getLastReplicationPoint()");
    if (!x.store.root_doc) {
        throw new Error("no root doc");
    }
    return x.store.root_doc.last_replication_point;
};

x.remote.base.setThisReplicationPoint = function () {
    var that = this,
        doc_obj;
    this.log("beginning setThisReplicationPoint()");
    if (!x.store.root_doc) {
        throw new Error("no root doc");
    }
    x.store.root_doc.last_replication_point = this.this_replication_point;
    return x.store.storeDoc("dox", x.store.root_doc)
    .then(null, /* catch */ function (reason) {
        that.log("setThisReplicationPoint() failed: " + reason);
    });
};


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
                    that.storeDoc(doc_obj);
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
            that.storeDoc(doc_obj);
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


//------------------------------------------------------------------------------ Couch Replication

x.remote.couch = Object.create(x.remote.base);


x.remote.couch.getServerAllDocSummary = function () {
    this.log("beginning getServerAllDocSummary()");
    return this.getServerDocChanges();
};

//use changelog?
x.remote.couch.getServerDocChanges = function () {
    var that = this,
        promise,
        url;
    that.log("beginning getServerDocChanges()");
    url = that.database_url + "_changes";
    if (x.store.root_doc.last_replication_point) {
        url += "?since=" + x.store.root_doc.last_replication_point;
    }
    
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "GET", timeout: that.ajax_timeout, dataType: "json", cache: false,
            beforeSend: function (jq_xhr) {
//              jq_xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.setOnline(true);
                that.log("getServerDocChanges() HTTP status code: " + jq_xhr.status + ", or in text: " + jq_xhr.statusText);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown);
                reject(text_status);
            }
        });
    });
    // server_props_all is a map object keyed on uuid, each value being a map object: uuid, etag, last_mod, length
    promise.then(function (server_props_all) {
        var i,
            server_props_i;
        that.this_replication_point = server_props_all.last_seq;
        delete server_props_all.last_seq;

        for (i = 0; i < server_props_all.results.length; i += 1) {
            server_props_i = server_props_all.results[i];
            server_props_out[server_props_i.id] = { etag: server_props_i.changes[0].rev };
            that.log("doc: " + server_props_i.id + " = " + server_props_i.changes[0].rev);
        }
        delete server_props_all.results;
    });
    return promise;
};

x.remote.couch.replicateLocalDocs = function (server_props_all) {
    var that = this,
        uuid;
    this.log("beginning replicateLocalDocs()");
    for (uuid in server_props_all) {
        if (server_props_all.hasOwnProperty(uuid)) {
            x.store.getDoc("dox", uuid)
            .then(function (doc_obj) {
                that.replicateDoc(doc_obj, server_props_all);
            });
        }
    }
};


x.remote.couch.deleteServer = function (uuid) {
    var that = this;
    this.log("beginning deleteServer(): " + uuid);
};

x.remote.couch.pushToServer = function (doc_obj) {
    var that = this,
        promise;
    this.log("beginning pushToServer(): " + doc_obj.uuid);
    promise = new Promise(function (resolve, reject) {
        $.ajax({ url: that.database_url + doc_obj.uuid, cache: false, type: (doc_obj.repl_status === "Local Only" ? "POST" : "PUT"),
            data: JSON.stringify(doc_obj),
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
                that.ajaxError(jq_xhr, text_status, error_thrown);
                reject(text_status);
            }
        });
    });
    promise.then(function (data) {
        that.updateReplStatus(doc_obj, "Synced");
        that.storeDoc(doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        that.log("failed pushToServer(): " + reason);
    });
    return promise;
};

x.remote.couch.pullFromServer = function (doc_obj) {
    var that = this,
        promise;
    this.log("beginning pullFromServer(): " + doc_obj.uuid);
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
        that.storeDoc(doc_obj);
    });
    promise.then(null, /* catch */ function (reason) {
        that.log("failed pushToServer(): " + reason);
    });
    return promise;
};


x.remote.couch.replicationReset = function () {
    var that = this,
        promise;
    this.log("beginning replicationReset()");
    promise = x.store.getAllDocs("dox");
    promise.then(function (results) {
        var i;
        for (i = 0; i < results.length; i += 1) {
            that.log("replicationReset(): " + i + ", " + results[i].uuid);
            results[i].repl_status = "Local Change";
            if (results[i].uuid === "root") {
                results[i].last_replication_point = null;
            }
            promise.then(
            x.store.storeDoc("dox", results[i])
            );
        }
    })
    .then(null, /* catch */ function (reason) {
        that.log("replicationReset() failed: " + reason);
    });
};


x.remote.using = x.remote.couch;

