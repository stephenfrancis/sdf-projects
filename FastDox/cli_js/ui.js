/*global $, indexedDB, UUID, Promise */
/*jslint browser: true */
"use strict";

var x,
    Aloha;

if (!x) {
    x = {};
}

x.ui = {
    log_level: 1,
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
        $("div#doc_area").removeClass("css_hide");
        $("div#doc_area #doc_title").val(this.current_doc.payload.title);
        $("div#doc_area #doc_info" ).html(
            "type: " + this.current_doc.payload.type + ", uuid: " + this.current_doc.uuid +
            ", last local save: " + this.current_doc.last_local_save + ", local_change: " + this.current_doc.local_change);
        $("#doc_area #doc_content").empty();
        $("#doc_area #doc_view"   ).empty();
        if (this.current_doc.payload.type === "folder") {
            $("#doc_area #doc_content").   addClass("css_hide");
            $("#doc_area #doc_view"   ).removeClass("css_hide");
        } else {
            $("#doc_area #doc_content").removeClass("css_hide");
            $("#doc_area #doc_view"   ).   addClass("css_hide");
        }
        $("div#doc_area #doc_conflict").html(this.current_doc.conflict || "");
    } else {
        $("div#doc_area").   addClass("css_hide");
    }
};


x.ui.renderCreate = function (type) {
    if (this.current_doc && this.isCurrentDocModified()) {
        if (!confirm("Lose unsaved changes?")) {
            return;
        }
    }
    this.current_doc  = { uuid: UUID.generate(), creating: true, payload: { type: type, title: "", parent_id: "root", sequence_nbr: 0 } };
    this.orig_title   = "";
    this.orig_content = null;
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
        that.orig_title   = doc_obj.payload.title;
        that.orig_content = doc_obj.payload.content;
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

x.ui.displayFolderContent = function (parent_elem, uuid, concat_label, nodes_done, level_depth, number_output) {
    var that = this;
    if (nodes_done[uuid]) {         // prevent infinite loop on circular references
        return;
    }
    if (number_output > this.max_docs_to_display_in_folder) {      // limit the size of the output
        return;
    }
    nodes_done[uuid] = true;

    return x.store.getChildDocs("dox", uuid)
    .then(function (results) {
        var i,
            heading_level = (level_depth < 3 ? level_depth + 2 : 4),
            child_elem;
        for (i = 0; i < results.length; i += 1) {
            parent_elem.append("<div/>");
             child_elem = parent_elem.children("div").last();
             child_elem.append("<h" + heading_level + ">" + concat_label + (i + 1) + " " + results[i].payload.title + "</h" + heading_level + ">");
            if (results[i].payload.content) {
                child_elem.append(results[i].payload.content);
                number_output += 1;
            }
            that.displayFolderContent(child_elem, results[i].uuid, concat_label + (i + 1) + ".", nodes_done, level_depth + 1, number_output);
        }
    })
/*
    return x.store.getDoc("dox", uuid)
    .then(function (doc_obj) {
        var i,
            heading_level = (level_depth < 3 ? level_depth + 2 : 4);
//        if (level_depth > 0) {
//            concat_label += (concat_label ? " / " : "") + doc_obj.title;
//        }
        if (level_depth > 0) {
            doc_view_area.append("<h" + heading_level + ">" + concat_label + " " + doc_obj.title + "</h" + heading_level + ">");
        }
        if (doc_obj.content) {
            doc_view_area.append(doc_obj.content);
            number_output += 1;
        }
        for (i = 0; doc_obj.children && i < doc_obj.children.length; i += 1) {
            that.log("displayFolderContent() found child: " + doc_obj.children[i] + " at depth " + level_depth);
            that.displayFolderContent(doc_view_area, doc_obj.children[i], concat_label + (i + 1) + ".", nodes_done, level_depth + 1, number_output);
        }
    })
*/
    .then(null, /* catch */ function (reason) {
        that.log("displayFolderContent() failed for reason: " + reason, 0);
    });
};

x.ui.isCurrentDocModified = function () {
    var title,
        content;
    if (!this.current_doc) {
        throw new Error("no current_doc to save");
    }
    title   = $("#doc_area #doc_title"  ).val();
    content = $("#doc_area #doc_content").html();
    return (title !== this.orig_title || content != this.orig_content);
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
    this.current_doc.payload.sequence_nbr = this.current_doc.payload.sequence_nbr || 0;
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
        that.orig_title   = doc_obj.payload.title;
        that.orig_content = doc_obj.payload.content;
        if (create) {
            that.tree.createNode("root", that.current_doc.uuid, that.current_doc.payload.title, (that.current_doc.payload.type === "folder"));
        } else {
            $("#doc_tree #" + that.current_doc.uuid + "> a.tree_label").text(that.current_doc.payload.title);
        }
    })
    .then(function (doc_obj) {
        that.message("saved");
    })
    .then(null, /* catch */ function (reason) {
        that.message("saveDoc() failed for reason: " + reason);
    });
};



x.ui.drawTreeNode = function (node_id, parent_node) {
    var that = this,
        node_elem;
    this.log("beginning drawTreeNode()", 2);
    return x.store.getDoc("dox", node_id)
    .then(function (doc_obj) {
//        parent_node.css("border", "1px solid green");
//        console.log(parent_node.length + ", " + /*parent_node[0].tagName + ", " +*/ parent_node.hasClass("tree_branch"));
        if (doc_obj.payload) {
            node_elem = that.tree.createNode(parent_node, doc_obj.uuid, doc_obj.payload.title, (doc_obj.payload.type === "folder"));
        } else {
            that.log("Error, doc_obj has no payload: " + doc_obj, 0);
        }
//        return x.store.setDocParent(node_id, doc_obj.parent_id);
    })
    .then(function () {
        return x.store.getChildDocs("dox", node_id);
    })
    .then(function (results) {
        var sequence = Promise.resolve();
        results.forEach(function (child_doc) {
            sequence = sequence.then(function () {
                return that.drawTreeNode(child_doc.uuid, node_elem);
            });
        });
        return sequence;
    })
    .then(null, /* catch */ function (reason) {
        that.message("drawTreeNode() failed for reason: " + reason);
    });
};


x.ui.drawWholeTree = function () {
    var that = this,
        root_node,
        orphan_parent,
        all_docs    = {};

    root_node = $("#doc_tree");
    this.log("beginning drawWholeTree()", 1);

    function drawNode(parent_node, node_id) {
        var doc = all_docs[node_id],
            node,
            i;
        
        if (doc) {
//            that.log("drawWholeTree(): node: " + node_id + " has " + (doc.children ? doc.children.length : 0) + " children");
            delete all_docs[node_id];           // prevent infinite loop on circular reference
            node = that.tree.createTreeNode(parent_node, doc.uuid, doc.payload.title, (doc.payload.type === "folder"));
            for (i = 0; doc.payload && doc.payload.children && i < doc.payload.children.length; i += 1) {
                drawNode(node, doc.payload.children[i]);
            }
        } else {
            that.log("drawWholeTree(): unrecognized / duplicated node: " + node_id, 0);
        }
    }

    x.store.getAllDocs("dox")
    .then(function (results) {
        var i;
        for (i = 0; i < results.length; i += 1) {
            all_docs[results[i].uuid] = results[i];
        }
    })
    .then(function () {
        var id;
        drawNode(root_node, "root");
        for (id in all_docs) {
            if (all_docs.hasOwnProperty(id)) {
                if (!orphan_parent) {
                    orphan_parent = that.tree.createNode(root_node, "orphan_parent", "Orphaned Nodes", true);
                }
                that.tree.createNode(orphan_parent, id, all_docs[id].payload.title, (all_docs[id].payload.type === "folder"));
            }
        }
    })
    .then(null, /* catch */ function (reason) {
        that.log("drawWholeTree() failed: " + reason, 0);
    });
};



x.ui.deleteLocalDoc = function () {
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



/*
x.ui.viewDoc = function (uuid) {
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

x.ui.drawDocTreeNode = function (doc_obj, root_node) {
    var dir_node;
    dir_node = this.getOrAddPathNode((doc_obj.path ? doc_obj.path.split("/") : []), root_node);
    this.log("drawDocTreeNode(): " + dir_node.length + ", " + doc_obj.uuid + ", " + doc_obj.title);
    this.createTreeNode(dir_node, doc_obj.uuid, doc_obj.title, true);
};

x.ui.getOrAddPathNode = function (path_array, node) {
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


x.ui.createFolder = function (label, parent_id) {
    var that = this,
        folder_id = UUID.generate();

    parent_id = parent_id || "root";
    that.log("createFolder(): adding " + folder_id + " to " + parent_id); 
    this.storeDoc("control", {
        id: folder_id,
        label: label,
        children: []
    })
    .then(function () {
        that.log("createFolder(): getting control doc for " + parent_id); 
        return that.getDoc("control", parent_id);
    })
    .then(function (doc_obj) {
        that.log("createFolder(): got control doc for  " + parent_id); 
        if (!doc_obj.children) {
            doc_obj.children = [];
        }
        doc_obj.children.push(folder_id);
        return that.storeDoc("control", doc_obj);
    })
    .then(null, /* catch  function (reason) {
        that.log("createFolder() root doc not found: " + reason);
        that.createTreeNode($("#doc_tree"), "root", "Root");
        return that.storeDoc("control", { id: "root", label: "Root", children: [ folder_id ] });
    })
    .then(function () {
        that.createTreeNode($("#doc_tree #" + parent_id), folder_id, label);
        that.log("createFolder(): all done!"); 
    })
    .then(null, /* catch  function (reason) {
        that.log("createFolder() failed: " + reason);
    });
};
*/


/*
x.ui.mergeContent = function (title, body) {
    return "<h1>" + title + "</h1>" + body;
};

x.ui.splitContent = function (content) {
    var out = content.match(/<h1>(.*)<\/h1>(.*)/);
    if (out) {
        out.shift();        // remove 0th element so out has 2 elements, title and body
    } else {
        out = [ "", content ];
    }
    return out;
};

x.ui.contentDigest = function (str) {
    if (typeof str !== "string") {
        str = "";
    }
    str = str.replace(/<.*?>/g, " ");
    if (str.length > 200) {
        str = str.substr(0, 200) + "...";
    }
    return str;
};

x.ui.renderIndex = function () {
    this.current_doc = null;
    this.setMode("index");
    this.retrieveIndex();
};

//------------------------------------------------------------------------------ Index Page
x.ui.retrieveIndex = function () {
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

x.ui.drawRow = function (tbody, doc_obj) {
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




//each tree node is an object with keys: id (str), label (str) and child_arr (array of the child nodes), child_obj
/*
x.ui.populateNewTree = function () {
    var that = this,
        all_nodes = {};
    y.ui.using.path_struct = { id: "root", label: "Root", child_arr: [], child_obj: {} };
    all_nodes.root = y.ui.using.path_struct;

    this.getAllDocs("dox")
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
                            path_obj.child_arr.push(new_node.id);
                            all_nodes[new_node.id] = new_node;
                        }
                        path_obj = path_obj.child_obj[path_elem];
                    }
                }
                path_obj.child_arr.push(results[i].id);
            }
        })
        .then(function (results) {
            var id;
            for (id in all_nodes) {
                that.log("storing: " + id + ", with " + all_nodes[id].child_arr.length + " children");
                that.storeDoc("control", {
                    id: id,
                    label: all_nodes[id].label,
                    children: all_nodes[id].child_arr
                });
            }
        })
        .then(function (results) {
            that.log("done!");
        })
        .then(null, /* catch  function (reason) {
            that.log("populateNewTree() failed: " + reason);
        });
    
};

*/