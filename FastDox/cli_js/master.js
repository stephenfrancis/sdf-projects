/*global $, indexedDB, UUID */
/*jslint browser: true */
"use strict";


var y = {},
    Aloha;


y.url = "https://localhost:8443/FastDox/webdav/main/";
y.replication_interval = 10000;
y.replication_continue = true;
y.ajax_timeout         = 60000;

y.view = function (obj, to_depth) {
    var out = "{",
        key,
        delim = "";

    if (typeof to_depth !== "number") {
        to_depth = 1;
    }
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            out += delim + " " + key + ": ";
            delim = ",";
            if (typeof obj[key] === "function") {
                out += "[function]";
            } else if (typeof obj[key] === "object") {
                if (to_depth > 0) {
                    out += y.view(obj[key], to_depth - 1);
                } else {
                    out += "[object]";
                }
            } else if (typeof obj[key] === "undefined") {
                out += "[undefined]";
            } else if (typeof obj[key] === "null") {
                out += "[null]";
            } else {
                out += obj[key].toString();
            }
        }
    }
    if (delim) {
        out += " ";
    }
    return out + "}";
};

y.startApp = function (onSuccess) {
    var request = indexedDB.open("FastDox", 2);         // Version 2

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
//      var authorIndex = store.createIndex("by_author", "author");
    };

    request.onsuccess = function() {
        y.db = request.result;
        y.message("started");
        if (typeof onSuccess === "function") {
            onSuccess();
        }
    };

};

y.start = function () {
    y.renderIndex();
    y.replicate();
};


y.mergeContent = function (title, body) {
    return "<h1>" + title + "</h1>" + body;
};

y.splitContent = function (content) {
    var out = content.match(/<h1>(.*)<\/h1>(.*)/);
    if (out) {
        out.shift();        // remove 0th element so out has 2 elements, title and body
    } else {
        out = [ "", content ];
    }
    return out;
};

y.contentDigest = function (str) {
    if (typeof str !== "string") {
        str = "";
    }
    str = str.replace(/<.*?>/g, " ");
    if (str.length > 200) {
        str = str.substr(0, 200) + "...";
    }
    return str;
};

y.renderView = function (doc_key) {
    y.setMode("view");
    y.viewDoc(doc_key);
};

y.renderEdit = function (doc_key) {
    if (!y.current_doc) {
        y.message("No doc to edit!");
        y.log("y.current_doc not set");
        return;
    }
    y.setMode("edit");
    y.editDoc(doc_key);
};

y.renderCreate = function () {
    y.current_doc = null;
    $("#edit_area #doc_content").empty();
    y.setMode("edit");
};

y.renderIndex = function () {
    y.current_doc = null;
    y.setMode("index");
    y.retrieveIndex();
};

// mode is currently one of: view, edit, index
y.setMode = function (mode) {
    if (mode === y.mode) {
        return;
    }
    $("div#view_area" ).addClass("css_hide");
    $("div#edit_area" ).addClass("css_hide");
    $("div#index_area").addClass("css_hide");
    $("div#" + mode + "_area").removeClass("css_hide");
    
    if (mode === "edit") {
        $("#edit_area #doc_title"  ).val("");
        $("#edit_area #doc_content").empty();
    }
    
    $("#fastdox-navbar-collapse > ul > li").addClass("disabled");
    if (mode === "index") {
        $("#menu_create").removeClass("disabled");
    } else {
        $("#menu_index" ).removeClass("disabled");
    }
    y.mode = mode;
};

y.saveDoc = function () {
    var doc_obj = y.current_doc;
    if (!doc_obj) {
        doc_obj = {};
        y.current_doc = doc_obj;
    }
    doc_obj.content = y.mergeContent(
        $("#edit_area #doc_title"  ).val(),
        $("#edit_area #doc_content").html()
    );
    doc_obj.last_local_save = new Date();
    $("#view_area #doc_content").html(doc_obj.content);
    y.updateReplStatus(doc_obj, "Local Change");
    y.storeDoc(doc_obj, function () {
        y.message("saved");
        y.setMode("view");
    });
};

// do we want to open the connection again each time, or just keep it? keep for now
y.storeDoc = function (doc_obj, onSuccess) {
    var tx = y.db.transaction("dox", "readwrite"),
        store = tx.objectStore("dox");

    if (!doc_obj.uuid) {           // id is optional - undefined means creating a new doc
        doc_obj.uuid = UUID.generate();
    }
    store.put(doc_obj);

    tx.oncomplete = function () {
        if (typeof onSuccess === "function") {
            onSuccess();
        }
        // All requests have succeeded and the transaction has committed.
    };
    tx.onerror = function () {
        y.log("save failed: " + tx.error);
    };
};

y.updateDoc = function (uuid, callback) {
    var tx = y.db.transaction("dox", "readwrite"),
        store = tx.objectStore("dox"),
        request = store.get(uuid);

    request.onsuccess = function () {
        var doc_obj = request.result;
        if (doc_obj !== undefined) {
            // A match was found.
            callback(doc_obj);
            store.put(doc_obj);

            tx.oncomplete = function () {
            };
            tx.onerror = function () {
                y.log("save failed: " + tx.error);
            };
        } else {
            y.message("Doc not found: " + uuid);
        }
    };
};

y.deleteDoc = function (uuid) {
    alert("Delete: " + uuid);
    y.updateDoc(uuid, function (doc_obj) {
        y.updateReplStatus(doc_obj, "Local Delete");
    });
};

y.forgetLocalChanges = function (doc_obj) {
    alert("forgetLocalChanges: " + doc_obj.uuid);
    if (doc_obj.repl_status !== "Conflict") {
        return false;
    }
    y.updateDoc(doc_obj.uuid, function (doc_obj) {
        y.updateReplStatus(doc_obj, "Forget Local");
    });
    return true;
};

/*
y.getKey = function (doc_key) {
    if (typeof doc_key === "string") {
        doc_key = parseInt(doc_key, 10);        // needs to be a number
    } else if (typeof doc_key !== "number") {
        doc_key = y.current_doc.uuid;
    }
    if (typeof doc_key === "number") {
        return doc_key;
    }
    throw "No doc key supplied";
};
*/

y.viewDoc = function (uuid) {
    var div = $("#view_area");
    y.message("opening: " + uuid);
    div.find("#doc_content").html("");

    function show(doc_obj) {
        if (y.mustPullUpdateFromServer(doc_obj)) {
            y.pullFromServer(doc_obj, show);
        } else {
            y.current_doc = doc_obj;
            div.find("#doc_content").html(doc_obj.content);
            y.message("viewing");
        }
    }

    if (y.current_doc && (!uuid || y.current_doc.uuid === uuid)) {
        show(y.current_doc);
    } else {
        y.getDoc(uuid, show);
    }
};

y.editDoc = function (uuid) {
    var div = $("#edit_area");
    y.message("opening");

    function show(doc_obj) {
        var parts = y.splitContent(doc_obj.content);
        y.current_doc = doc_obj;
        
        div.find("#doc_title"  ).val( parts[0]);
        div.find("#doc_content").html(parts[1]);
        y.message("editing");
    }

    if (y.current_doc && (!uuid || y.current_doc.uuid === uuid)) {
        show(y.current_doc);
    } else {
        y.getDoc(uuid, show);
    }
};

y.getDoc = function (uuid, item_callback) {
    var tx = y.db.transaction("dox", "readonly"),
        store = tx.objectStore("dox"),
        request = store.get(uuid);

    request.onsuccess = function() {
        var doc_obj = request.result;
        if (doc_obj !== undefined) {
            // A match was found.
            item_callback(doc_obj);
        } else {
            // No match was found.
            y.message("Doc not found: " + uuid);
        }
    };
};

//------------------------------------------------------------------------------ Index Page
y.retrieveIndex = function () {
    var tbody = $("#index_area > table > tbody");
    tbody.empty();
    
    function addRow(doc_obj) {
        y.drawRow(tbody, doc_obj);
    }
    
    y.getAllDocs(addRow);
};

y.drawRow = function(tbody, doc_obj) {
    var parts = y.splitContent(doc_obj.content);
    tbody.append("<tr docKey='" + doc_obj.uuid + "'><td class='sel'><span class='glyphicon glyphicon-ok'></span></td>" +
        "<td><b>" + parts[0] + "</b><br/>" + y.contentDigest(parts[1]) + "</td><td>" + doc_obj.repl_status + "</td>" +
        "<td class='doc_info'>" +
        "UUID: "                 + doc_obj.uuid + "<br/>" +
        "Last Local Save: "      + doc_obj.last_local_save + "<br/>" +
        "Server Etag: "          + doc_obj.server_etag + "<br/>" +
        "Server Last Modified: " + doc_obj.server_last_modified + "<br/>" +
        "Server Length: "        + doc_obj.server_length + "</td>" +
        "</tr>");
};

y.getAllDocs = function (item_callback) {
    var tx = y.db.transaction("dox", "readonly"),
        store = tx.objectStore("dox"),
        request = store.openCursor(),
        count = 0;

    request.onsuccess = function() {
        var cursor = request.result;
        if (cursor) {
            // Called for each matching record.
            item_callback(cursor.value);
            count += 1;
            cursor["continue"]();
        } else {
            y.message(count + " docs");
        }
    };

    tx.onerror = function () {
        y.message("getAllDocs() failed: " + tx.error);
    };

};

//------------------------------------------------------------------------------ Logging and Messaging
y.message = function (str) {
    console.log(str);
    $("#css_message").text(str);
//    $("div#css_message").fadeOut(30);
};

y.log = function(str) {
    console.log(str);
};


//------------------------------------------------------------------------------ Server Comms
y.setStatus = function (str) {
    if (str !== "online" && str !== "offline" && str !== "replicating") {
        throw "Invalid status: " + str;
    }
    if (str !== "replicating") {
        y.online = (str === "online");
    } 
    $("a#status").removeClass("replicating");
    $("a#status").removeClass( "online");
    $("a#status").removeClass("offline");
    $("a#status").   addClass(str);
    $("a#status").attr("title", str);
}

y.setOnline = function (online, a, b, c) {
    y.setStatus(online ? "online" : "offline");
    if (!online) {
        y.log("ajax error: a: " + y.view(a) + ", b: " + String(b) + ", c: "  + y.view(c));
    }
};


//------------------------------------------------------------------------------ Control Keys
document.onkeyup = function(event) {
    var code = event.keyCode;
    if (code === 27) {
        if (y.mode === "edit" && y.current_doc) {
            y.renderView();
        } else {
            y.renderIndex();
        }
    } else if (code === 46) {
        alert("Delete key pressed");
        $("tr.info").each(function () {
            y.deleteDoc($(this).attr("docKey"));
        });
    }
    // escape is 27, 
    // arrow-up is 38, right is 39, down 40, left 37
};




//------------------------------------------------------------------------------ Replication Status

// action being one of "Local Change", "Synced", "Server Change"
y.updateReplStatus = function (doc_obj, action) {
    if (action === "Local Change") {
        if (!doc_obj.repl_status) {
            doc_obj.repl_status = "Local Only";
        } else if (doc_obj.repl_status === "Up-to-date") {
            doc_obj.repl_status = "Local Change";
        } else if (doc_obj.repl_status === "Local Change") {
            // leave it as-is
        } else {
            doc_obj.repl_status = "Conflict";
        }
    } else if (action === "Synced") {
        doc_obj.repl_status = "Up-to-date";
    } else if (action === "Server Change") {
        if (doc_obj.repl_status === "Up-to-date") {
            doc_obj.repl_status = "Server Change";
        } else if (doc_obj.repl_status === "Server Only" || doc_obj.repl_status === "Server Change") {
            // leave it as-is
        } else {
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

y.mustDeleteLocal = function (doc_obj) {
    return (doc_obj.repl_status === "Server Delete");
};

y.mustDeleteServer = function (doc_obj) {
    return (doc_obj.repl_status === "Local Delete");
};

y.mustPushUpdateToServer = function (doc_obj) {
    return (!doc_obj.repl_status || doc_obj.repl_status === "Local Only" || doc_obj.repl_status === "Local Change");
};

y.mustPullUpdateFromServer = function (doc_obj) {
    return (doc_obj.repl_status === "Server Only" || doc_obj.repl_status === "Server Change");
};

//------------------------------------------------------------------------------ Replication

y.replicate = function () {
    var this_replication = new Date();
    if (!y.replication_continue) {
        return;
    }
    y.log("Starting replication at " + this_replication.toString() + ", repl timestamp: " + this_replication.getTime());
    y.setStatus("replicating");
    y.getCollectionProperties();
};

y.getCollectionProperties = function () {
  $.ajax({ url: y.url, type: "PROPFIND", timeout: y.ajax_timeout,
      data: '<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><allprop/></D:propfind>',
      beforeSend: function (xhr) {
          xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
      },
      success: function (a, b, c) {
          var server_props_all = y.processCollection(a);
          y.setOnline(true, a, b, c);
          y.replicateLocalDocs(server_props_all);
      },
      error: function (a, b, c) {
          y.setOnline(false, a, b, c);
          y.replicationLoop();
      }
  });
};

y.processCollection = function (xml_doc) {
    var responses,
        i,
        server_props_all = {},
        item;
    responses = xml_doc.getElementsByTagName("response");
    for (i = 0; i < responses.length; i += 1) {
        item = y.processResponse(responses[i]);
        if (item.uuid) {
            server_props_all[item.uuid] = item;
        }
    }
    return server_props_all;
};

y.processResponse = function (xml_element) {
    return {
        uuid    : y.getXMLValue(xml_element, "displayname"     ),
        etag    : y.getXMLValue(xml_element, "getetag"         ),
        last_mod: y.getXMLValue(xml_element, "getlastmodified" ),
        length  : y.getXMLValue(xml_element, "getcontentlength")
    };
};

y.replicateLocalDocs = function (server_props_all) {
    var tx = y.db.transaction("dox", "readonly"),
        store = tx.objectStore("dox"),
        request = store.openCursor(),           // filter on local-side changes?
        count = 0;

    request.onsuccess = function () {
        var cursor = request.result;
        if (cursor) {
            y.replicateDoc(cursor.value, server_props_all);
            count += 1;
            cursor["continue"]();
        } else {
            y.log("Replicated " + count + " docs");
        }
    };

    tx.oncomplete = function () {
        var uuid;
        for (uuid in server_props_all) {
            if (server_props_all.hasOwnProperty(uuid)) {
//                y.pullFromServer(server_props_all[uuid]);
            }
        }
        y.replicationLoop();
    };

    tx.onerror = function () {
        y.log("replicateLocalDocs() failed: " + tx.error);
        y.replicationLoop();
    };

};

y.replicationLoop = function () {
    y.setStatus(y.online ? "online" : "offline");
    setTimeout(y.replicate, y.replication_interval);
};

y.replicateDoc = function (doc_obj, server_props_all) {
    var server_props = server_props_all[doc_obj.uuid];
    y.log("replicateDoc() on: " + doc_obj.uuid + ", repl_status: " + doc_obj.repl_status + ", server_props: " + y.view(server_props));
    if (server_props && server_props.etag !== doc_obj.server_etag) {
        y.log("replicateDoc() etag diff, setting repl_status to Server Change");
        y.updateReplStatus(doc_obj, "Server Change");
        y.storeDoc(doc_obj);
    }
    delete server_props_all[doc_obj.uuid];

    if (y.mustDeleteLocal(doc_obj)) {
        y.log("replicateDoc() must delete local");
        y.deleteLocal(doc_obj);

    } else if (y.mustDeleteServer(doc_obj)) {
        y.log("replicateDoc() must delete server");
        y.deleteServer(doc_obj.uuid);

    } else if (y.mustPushUpdateToServer(doc_obj)) {
        y.log("replicateDoc() push to server - Local Only OR Local Change");
        y.pushToServer(doc_obj);

    } else if (y.mustPullUpdateFromServer(doc_obj)) {
        y.log("replicateDoc() pull from server - Server Only OR Server Change");
        y.pullFromServer(doc_obj);

    } else {
        y.log("replicateDoc() no action");
    }
};

y.deleteLocal = function (doc_obj) {
    var tx = y.db.transaction("dox", "readwrite"),
        store = tx.objectStore("dox");
    
    store["delete"](doc_obj.uuid);
    tx.onerror = function () {
        y.log("delete failed: " + tx.error);
    };
};

y.deleteServer = function (uuid) {
    y.log("deleteServer()");
    $.ajax({ url: y.url + uuid, type: "DELETE", timeout: y.ajax_timeout,
        success: function () {
            y.setOnline(true);
        },
        error: function (a, b, c) {
            y.setOnline(false, a, b, c);
        }
    });
};

y.pushToServer = function (doc_obj) {
    y.log("pushToServer()");
    $.ajax({ url: y.url + doc_obj.uuid, type: "PUT", data: doc_obj.content, timeout: y.ajax_timeout,
        beforeSend: function(xhr) {
            xhr.setRequestHeader('If-Modified-Since', '');      // needed for IOS6 and Chrome 24+
        },
        success: function () {
            y.setOnline(true);
            $.ajax({ url: y.url + doc_obj.uuid, type: "HEAD", timeout: y.ajax_timeout,
                success: function(a, b, c) {
                    var headers = y.getHeaders(c);
                    y.setOnline(true);
//                    doc_obj.server_last_repl = this_replication.getTime();
                    y.setDocPropertiesFromHeaders(headers, doc_obj);
                    y.updateReplStatus(doc_obj, "Synced");
                    y.storeDoc(doc_obj);
                    y.log(y.view(y.getHeaders(c)));
                    y.log("pushToServer() success  HEAD: a: " + y.view(a) + ", b: " + String(b) + ", c: "  + y.view(c));
//                    y.setDavProperties(doc_obj.uuid, { doc_title: doc_obj.title });
                },
                error: function (a, b, c) {
                    y.online = false;
//                    y.log(y.view(y.getHeaders(c)));
                    y.log("pushToServer() error in HEAD: a: " + y.view(a) + ", b: " + String(b) + ", c: "  + y.view(c));
                }
            });
        },
        error: function (a, b, c) {
            y.setOnline(false, a, b, c);
        }
    });
};

y.pullFromServer = function (doc_obj, item_callback) {
    y.log("pullFromServer(): " + doc_obj.uuid);
    $.ajax({ url: y.url + doc_obj.uuid, type: "GET", timeout: y.ajax_timeout, dataType: "text",
        beforeSend: function (xhr) {
            xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
        },
        success: function (a, b, c) {
            var headers;
            y.setOnline(true);
            y.log("HTTP status code: " + c.status + ", or in text: " + c.statusText);
            headers = y.getHeaders(c);
            y.log(y.view(headers));
            y.updateReplStatus(doc_obj, "Synced");
            doc_obj.content = a;
//            doc_obj.server_etag          = server_etag;
            y.setDocPropertiesFromHeaders(headers, doc_obj);
            y.log("Setting server_etag: " + doc_obj.server_etag);
            y.storeDoc(doc_obj);
            if (typeof item_callback === "function") {
                item_callback(doc_obj);
            }
        },
        error: function (a, b, c) {
            y.setOnline(false, a, b, c);
        }
    });
};


//------------------------------------------------------------------------------ HTTP Headers
y.getHeaders = function (http) {
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
//    y.log(headers);
};

y.setDocPropertiesFromHeaders = function (headers, doc_obj) {
    doc_obj.server_last_modified = headers["Last-Modified"];
    doc_obj.server_length        = headers["Content-Length"];
    doc_obj.server_etag          = headers["ETag"] || headers["Etag"];      // HEAD returns diff header from PROPFIND?
    y.log("Setting server_etag to: " + doc_obj.server_etag);
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
//    y.log("status: " + y.getXMLValue(xml_element, "status"          ));
//    y.log("creatd: " + y.getXMLValue(xml_element, "creationdate"    ));
//    y.log("dispnm: " + y.getXMLValue(xml_element, "displayname"     ));
//    y.log("lstmod: " + y.getXMLValue(xml_element, "getlastmodified" ));
//    y.log("contln: " + y.getXMLValue(xml_element, "getcontentlength"));
//    y.log("etaggg: " + y.getXMLValue(xml_element, "getetag"         ));

y.getXMLValue = function (xml_parent, tagname) {
    var item;
    item = xml_parent.getElementsByTagName(tagname).item(0);
    if (item) {
        return item.textContent;
    }
};

// This doesn't work for some reason
y.setDavProperties = function (doc_id, prop_map) {
    var data_str = '<?xml version="1.0" encoding="utf-8" ?><D:propertyupdate xmlns:D="DAV:"><D:set>',
        prop;
    y.log("setDavProperties()");
    for (prop in prop_map) {
        if (prop_map.hasOwnProperty(prop)) {
            data_str += "<D:prop><" + prop + ">" + prop_map[prop] + "</" + prop + ">";
        }
    }
    data_str += "</D:set></D:propertyupdate>";
    y.log(data_str);
    $.ajax({ url: y.url + doc_id, type: "PROPPATCH", timeout: y.ajax_timeout, data: data_str,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("If-Modified-Since", "");      // needed for IOS6 and Chrome 24+
        },
        success: function (a, b, c) {
            var headers;
            y.setOnline(true);
            y.log("setDavProperties: " + c.status + ", or in text: " + c.statusText);
//            y.log(a);
            y.processCollection(a);
            headers = y.getHeaders(c);
            y.log(y.view(headers));
        },
        error: function (a, b, c) {
            y.setOnline(false, a, b, c);
        }
    });
};
