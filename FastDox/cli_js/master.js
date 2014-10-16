/*global $, indexedDB, UUID, Promise */
/*jslint browser: true */
"use strict";


var y = { ui: {} },
    Aloha;

y.ui.base = {
    database_url         : "http://other_apps:5984/fastdox/",
    replication_interval : 10000,
    replication_continue : true,
    ajax_timeout         : 60000,
    max_docs_to_display_in_folder: 100
};



//mode is currently one of: view, edit
y.ui.base.setRightArea = function () {
    $("div#folder_area").addClass("css_hide");
    $("div#doc_area"   ).addClass("css_hide");
    if (this.current_doc) {
        $("div#" + this.current_doc.type + "_area").removeClass("css_hide");
        $("div#" + this.current_doc.type + "_area #doc_title").val(this.current_doc.title);
        $("div#" + this.current_doc.type + "_area #doc_info" ).html("type: " + this.current_doc.type + ", uuid: " + this.current_doc.uuid);
    }
};


y.ui.base.renderCreate = function (type) {
    $("#doc_content").empty();
    this.current_doc = { uuid: UUID.generate(), type: type, creating: true, title: "" };
    this.setRightArea();
};

y.ui.base.renderUpdate = function (uuid) {
    var that = this;
    this.message("opening doc: " + uuid);
    this.current_doc = null;
    this.getDoc("dox", uuid)
    .then(function (doc_obj) {
        that.current_doc = doc_obj;
        that.message("editing " + doc_obj.type + " \"" + doc_obj.title + "\"");
        that.setRightArea();
        that["renderUpdate_" + doc_obj.type]();
    })
    .then(null, /* catch */ function (reason) {
        that.message("renderUpdate() failed for reason: " + reason);
    });
};

y.ui.base.renderUpdate_doc = function () {
    $("#doc_content").html(y.ui.using.current_doc.content);
};

y.ui.base.renderUpdate_folder = function () {
    var doc_view_area = $("#folder_area #doc_view");
    doc_view_area.empty();
    this.displayFolderContent(doc_view_area, this.current_doc.uuid, "", {}, 0, 0)
    .then(function () {
        that.log("renderUpdate_folder() done");
    })
    .then(null, /* catch */ function (reason) {
        that.message("renderUpdate() failed for reason: " + reason);
    });
};

y.ui.base.displayFolderContent = function (doc_view_area, uuid, concat_label, nodes_done, level_depth, number_output) {
    var that = this;
    if (nodes_done[uuid]) {         // prevent infinite loop on circular references
        return;
    }
    if (number_output > this.max_docs_to_display_in_folder) {      // limit the size of the output
        return;
    }
    nodes_done[uuid] = true;
    return this.getDoc("dox", uuid)
    .then(function (doc_obj) {
        var i;
        if (level_depth > 0) {
            concat_label += (concat_label ? " / " : "") + doc_obj.title;
        }
        if (doc_obj.content) {
            doc_view_area.append("<h3>" + concat_label + "</h3>");
            doc_view_area.append(doc_obj.content);
            number_output += 1;
        }
        for (i = 0; doc_obj.children && i < doc_obj.children.length; i += 1) {
            that.log("displayFolderContent() found child: " + doc_obj.children[i] + " at depth " + level_depth);
            that.displayFolderContent(doc_view_area, doc_obj.children[i], concat_label, nodes_done, level_depth + 1, number_output);
        }
    })
    .then(null, /* catch */ function (reason) {
        that.log("displayFolderContent() failed for reason: " + reason);
    });
};

y.ui.base.saveDoc = function () {
    var that = this,
        create = false;
    if (!this.current_doc) {
        throw new Error("no current_doc to save");
    }
    this.current_doc.title   = $("#" + this.current_doc.type + "_area #doc_title"  ).val();
    this.current_doc.content = $("#" + this.current_doc.type + "_area #doc_content").html();
    this.current_doc.last_local_save = (new Date());
    if (this.current_doc.creating) {
        create = true;
//        that.createTreeNode($("#doc_tree #root"), this.current_doc.uuid, this.current_doc.title, true, (this.current_doc.type === "folder"));
        delete this.current_doc.creating;
    }
    this.updateReplStatus(this.current_doc, "Local Change");

    this.storeDoc("dox", this.current_doc)
    .then(function (doc_obj) {
        if (create) {
            that.addNodeToParent(that.current_doc.uuid, "root");
            that.createTreeNode($("#doc_tree #root"), that.current_doc.uuid, that.current_doc.title, true, (that.current_doc.type === "folder"));
        }
    })
    .then(function (doc_obj) {
        that.message("saved");
    })
    .then(null, /* catch */ function (reason) {
        that.message("save failed for reason: " + reason);
    });
};


y.ui.base.createTreeNode = function (parent_node, id, label, draggable, force_folder) {
    var node;
//    this.log("createTreeNode(): " + parent_node.length + ", " + id + ", " + label);
    if (parent_node.length !== 1) {
        throw new Error("createTreeNode(): parent_node must be single-valued");
    }
    if (parent_node[0].tagName === "LI" /*&& parent_node.children("a.tree_icon").length === 0*/) {
        parent_node.addClass("tree_exp");
        parent_node.addClass("tree_branch");
        parent_node.removeClass("tree_leaf");
    }
    if (parent_node.children("ul").length === 0) {
        parent_node.append("<ul/>");
    }
    parent_node = parent_node.children("ul").first();
    parent_node.append("<li id='" + id + "' class='tree_leaf'><a class='tree_icon' /><a class='tree_label'>" + label + "</a></li>");
    node = parent_node.children("li#" + id);
    if (draggable === true) {
        node.attr("draggable", "true");
    }
    if (force_folder === true) {
        node.addClass("tree_exp");
        node.addClass("tree_branch");
        node.removeClass("tree_leaf");
    }
    return node;
};

y.ui.base.removeTreeNode = function (node_id) {
    var node = $("#doc_tree #" + node_id);
    this.log("removeTreeNode(): " + node_id + ", nodes matched: " + node.length);
    if (node.length !== 1 || node[0].tagName !== "LI") {
        throw new Error("invalid tree node");
    }
    node.remove();
    if (node.parent().children("li").length === 0) {
        node.parent().parent().removeClass("tree_branch");
        node.parent().parent().removeClass("tree_exp");
        node.parent().parent().removeClass("tree_ctr");
        node.parent().parent().   addClass("tree_leaf");
        node.parent().remove();
    }
};


y.ui.base.moveTreeNode = function (node_elem, new_parent_elem) {
};


y.ui.base.drawWholeTree = function () {
    var that = this,
        root_node,
        all_docs    = {};

    root_node = $("#doc_tree");
    this.log("beginning drawWholeTree()");

    function drawNode(parent_node, node_id) {
        var doc = all_docs[node_id],
            node,
            i;
        
        if (doc) {
            delete all_docs[node_id];           // prevent infinite loop on circular reference
            node = that.createTreeNode(parent_node, doc.uuid, doc.title, true, (doc.type === "folder"));
            for (i = 0; doc.children && i < doc.children.length; i += 1) {
                drawNode(node, doc.children[i]);
            }
        } else {
            that.log("drawWholeTree(): unrecognized / duplicated node: " + node_id);
        }
    }

    this.getAllDocs("dox")
    .then(function (results) {
        var i;
        for (i = 0; i < results.length; i += 1) {
            all_docs[results[i].uuid] = results[i];
        }
    })
    .then(function () {
        drawNode(root_node, "root");
    })
    .then(null, /* catch */ function (reason) {
        that.log("drawWholeTree() failed: " + reason);
    });
};

/*
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


y.ui.base.createFolder = function (label, parent_id) {
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

y.ui.base.ajaxError = function (jq_xhr, text_status, error_thrown) {
    this.setOnline(false, jq_xhr.status + ", " + jq_xhr.statusText + ", " + jq_xhr.responseText + ", " + text_status + ", " + error_thrown);
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




//each tree node is an object with keys: id (str), label (str) and child_arr (array of the child nodes), child_obj
y.ui.base.populateNewTree = function () {
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
        .then(null, /* catch */ function (reason) {
            that.log("populateNewTree() failed: " + reason);
        });
    
};

