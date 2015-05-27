/*global $, indexedDB, UUID, Promise, confirm, console */
/*jslint browser: true */
"use strict";

var x,
    Aloha;

if (!x) {
    x = {};
}

x.ui = {
    log_level: 4,
    max_docs_to_display_in_folder: 100
};


x.ui.start = function () {
    var that = this;

    return x.store.start()
    .then(function () {
        that.drawTreeNode("root", $("#doc_tree"));
//        that.drawWholeTree();
    })
    .then(function () {
        if (x.remote) {
            return x.remote.using.replicate();
        }
    })
    .then(function () {
        that.message("x.ui.start() done");
    })
    .then(null, /* catch */ function (reason) {
        that.log("x.ui.start() failed: " + reason, 0);
        that.message("*** start failed ***");
    });
};


//mode is currently one of: view, edit
x.ui.setRightArea = function (show) {
    if (show) {
        if (!this.current_doc) {
            throw new Error("no current_doc");
        }
        $("#change_buttons").addClass("hidden");
        $("div#doc_area").removeClass("hidden");
        $("div#doc_area #doc_title").val(this.current_doc.payload.title);
        $("div#doc_area #doc_info" ).html(
            "type: " + this.current_doc.payload.type + ", uuid: " + this.current_doc.uuid +
            ", last local save: " + this.current_doc.last_local_save + ", local_change: " + this.current_doc.local_change);
        $("#doc_area #doc_content").empty();
        $("#doc_area #doc_view"   ).empty();
        if (this.current_doc.payload.type === "folder") {
            $("#doc_area #doc_content").   addClass("hidden");
            $("#doc_area #doc_view"   ).removeClass("hidden");
        } else {
            $("#doc_area #doc_content").removeClass("hidden");
            $("#doc_area #doc_view"   ).   addClass("hidden");
        }
        $("div#doc_area #doc_conflict").html(this.current_doc.conflict || "");
    } else {
        $("div#doc_area").   addClass("hidden");
    }
};


x.ui.renderCreate = function (type) {
    if (this.current_doc && this.isCurrentDocModified()) {
        if (!confirm("Lose unsaved changes?")) {
            return;
        }
    }
    this.current_doc  = { uuid: UUID.generate(), creating: true,
        payload: { type: type, title: "", parent_id: "root" }
    };
    this.setRightArea(true);
};

x.ui.renderUpdate = function (uuid) {
    var that = this;
    if (this.current_doc && this.isCurrentDocModified()) {
        if (!confirm("Lose unsaved changes?")) {
            return;
        }
    }
    this.message("opening doc: " + uuid);
    this.current_doc = null;
    x.store.getDoc("dox", uuid)
    .then(function (doc_obj) {
        that.current_doc  = doc_obj;
        that.message("editing " + doc_obj.payload.type + " \"" + doc_obj.payload.title + "\"");
        that.setRightArea(true);
        that["renderUpdate_" + doc_obj.payload.type]();
    })
    .then(null, /* catch */ function (reason) {
        that.message("renderUpdate() failed for reason: " + reason);
    });
};

x.ui.renderUpdate_doc = function () {
    $("#doc_content").html(this.current_doc.payload.content);
};

x.ui.renderUpdate_folder = function () {
    var that = this,
        doc_view_area = $("#doc_area #doc_view");

    doc_view_area.empty();
    this.displayFolderContent(doc_view_area, this.current_doc.uuid, "", {}, 0, 0)
        .then(function () {
            that.log("renderUpdate_folder() done", 3);
        })
        .then(null, /* catch */ function (reason) {
            that.message("renderUpdate() failed for reason: " + reason, 0);
        });
};

x.ui.displayFolderContent = function (parent_elem, doc_obj, concat_label, nodes_done, level_depth, number_output) {
    var that = this,
        i,
        heading_level = (level_depth < 3 ? level_depth + 2 : 4),
        child_elem;

    if (nodes_done[doc_obj.uuid]) {         // prevent infinite loop on circular references
        return;
    }
    if (number_output > this.max_docs_to_display_in_folder) {      // limit the size of the output
        return;
    }
    nodes_done[doc_obj.uuid] = true;

    parent_elem.append("<div/>");
     child_elem = parent_elem.children("div").last();
     child_elem.append("<h" + heading_level + ">" + concat_label + (i + 1) + " " + doc_obj.payload.title + "</h" + heading_level + ">");
    if (doc_obj.payload.content) {
        child_elem.append(doc_obj.payload.content);
        number_output += 1;
    }

    function doChild(child_doc_obj) {
        that.displayFolderContent(child_elem, child_doc_obj, concat_label + (i + 1) + ".", nodes_done, level_depth + 1, number_output);
    }

    for (i = 0; doc_obj.payload.children && i < doc_obj.payload.children.length; i += 1) {
        x.store.getDoc("dox", doc_obj.payload.children[i]).then(doChild);
    }
};

x.ui.isCurrentDocModified = function () {
    var diff = false;
    if (!this.current_doc) {
        throw new Error("no current_doc to save");
    }
    diff = ($("#doc_area #doc_title").val() !== this.current_doc.payload.title);
    if (this.current_doc.payload.type === "document") {
        diff = diff || ($("#doc_area #doc_content").html() !== this.current_doc.payload.content);
    }
    return diff;
};

x.ui.saveDoc = function () {
    var that = this,
        create = false;
    if (!this.current_doc) {
        throw new Error("no current_doc to save");
    }
    this.current_doc.payload = this.current_doc.payload || {};
    this.current_doc.payload.title   = $("#doc_area #doc_title"  ).val();
    this.current_doc.payload.content = $("#doc_area #doc_content").html();
//    this.current_doc.payload.sequence_nbr = this.current_doc.payload.sequence_nbr || 0;
    if (this.current_doc.creating) {
        create = true;
//        that.createTreeNode($("#doc_tree #root"), this.current_doc.uuid, this.current_doc.title, true, (this.current_doc.type === "folder"));
        delete this.current_doc.creating;
    }
    this.current_doc.local_change = true;
    this.current_doc.last_local_save = (new Date()).toUTCString();
//    if (x.remote) {
//        x.remote.using.updateReplStatus(this.current_doc, "Local Change");
//    }

    x.store.storeDoc("dox", this.current_doc)
        .then(function (doc_obj) {
            if (create) {
                that.tree.createNode("root", that.current_doc.uuid, that.current_doc.payload.title, (that.current_doc.payload.type === "folder"));
            } else {
                $("#doc_tree #" + that.current_doc.uuid + "> a.tree_label").text(that.current_doc.payload.title);
            }
        })
        .then(function (doc_obj) {
            $("#change_buttons").addClass("hidden");
            that.message("saved");
        })
        .then(null, /* catch */ function (reason) {
            that.message("saveDoc() failed for reason: " + reason);
        });
};



x.ui.drawTreeNode = function (uuid, parent_elem) {
    var that = this,
        node_elem;
    this.log("beginning drawTreeNode() for: " + uuid, 2);
    x.store.getDoc("dox", uuid)
        .then(function (doc_obj) {
            var i;
            if (doc_obj.payload) {
                node_elem = that.tree.createNode(parent_elem, doc_obj.uuid, doc_obj.payload.title,
                    (doc_obj.payload.type === "folder"));
                for (i = 0; doc_obj.payload.children && i < doc_obj.payload.children.length; i += 1) {
                    that.drawTreeNode(doc_obj.payload.children[i], node_elem);
                }
            } else {
                that.log("Error, doc_obj has no payload: " + doc_obj, 0);
            }
        })
        .then(null, /* catch */ function (reason) {
            that.message("drawTreeNode() failed for reason: " + reason);
        });
};



x.ui.drawList = function (tbody_elem) {
    var that = this;
    return x.store.getAllDocs("dox")
        .then(function (results) {
            var i;
            for (i = 0; i < results.length; i += 1) {
                tbody_elem.append("<tr uuid='" + results[i].uuid + "'><td>" + results[i].uuid + "</td><td>" + results[i].payload.title + "</td><td>" + results[i].last_local_save + "</td></tr>");
            }
        })
        .then(null, /* catch */ function (reason) {
            that.log("drawList() failed for reason: " + reason, 0);
        });
};


x.ui.deleteLocalDoc = function () {
    var that = this;
    if (!this.current_doc) {
        throw new Error("no current_doc");
    }
//    if (x.remote) {
//        x.remote.using.updateReplStatus(this.current_doc, "Local Delete");
//    } else {
        x.store.deleteDoc("dox", this.current_doc)
        .then(null, /* catch */ function (reason) {
            that.log("deleteLocalDoc() failed: " + reason, 0);
        });
//    }
    this.tree.removeNode(this.current_doc.uuid);
};


//------------------------------------------------------------------------------ Logging and Messaging
x.ui.message = function (str) {
    console.log(str);
    $("#css_message").text(str);
//    $("div#css_message").fadeOut(30);
};

x.ui.log = function (str, log_level) {
    if (log_level <= this.log_level) {
        console.log(str);
    }
};


x.ui.view = function (obj, depth, incl_inherits) {
    var out   = "{",
        delim = " ",
        prop_id;

    depth = depth || 0;
    if (depth > -1) {
        for (prop_id in obj) {
            if (obj.hasOwnProperty(prop_id)) {
                out += delim + prop_id + ": " + this.viewProp(obj[prop_id], depth, incl_inherits);
                delim = ", ";
            }
        }
        return out + delim.substr(1) + "}";
    }
    return "{...}";
};

x.ui.viewProp = function (prop_val, depth, incl_inherits) {
    var out,
        count;
    if (Array.isArray(prop_val)) {
        out = "[ ";
        if (depth > -1) {
            for (count = 0; count < this.length; count += 1) {
                out += (count === 0 ? "" : ", ") + this.viewProp(prop_val[count], depth - 1, incl_inherits);
            }
            out += " ]";
        }
        out += "[...]";

    } else if (typeof prop_val === "object") {
        out = this.view(prop_val, depth - 1, incl_inherits);

    } else if (typeof prop_val === "string") {
        out = "\"" + prop_val.toString() + "\"";
    
    } else {
        out = prop_val.toString();

    }
    return out;
};


//------------------------------------------------------------------------------ Server Comms
x.ui.setStatus = function (str) {
    if (str !== "online" && str !== "offline" && str !== "replicating") {
        throw "Invalid status: " + str;
    }
    if (str !== "replicating" && x.remote) {
        this.online = (str === "online");
    } 
    $("a#status").removeClass("replicating");
    $("a#status").removeClass( "online");
    $("a#status").removeClass("offline");
    $("a#status").   addClass(str);
    $("a#status").attr("title", str);
};


