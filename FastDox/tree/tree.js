
var x = x || {};

x.ui = x.ui || {};

x.ui.tree = x.ui.tree || {};

// x.ui.tree.createNode(parent_node, id, label, branch, draggable)
// x.ui.tree.removeNode(node)
// x.ui.tree.moveNode(node, new_parent_node)

x.ui.tree.createNode = function (parent_node, id, label, branch, moveable, deletable) {
    var node;
    if ($(".tree #" + id).length > 0) {
        throw new Error("createTreeNode(): id already exists: " + id);
    }
    node = this.addNode(parent_node, this.makeNewNode(id, label, branch, moveable, deletable));
    node.trigger('tree.create', [id, label, branch, moveable, deletable]);
    return node;
};

x.ui.tree.makeNewNode = function (id, label, branch, moveable, deletable) {
    var out = "<li id='" + id + "' class=";
    if (branch === true) {
        out += "'tree_empt tree_branch'";
    } else {
        out += "'tree_leaf'";
    }
    if (moveable !== false) {
        out += " draggable='true'";
    }
    out += "><a class='tree_icon' /><a class='tree_label'>" + label + "</a>";
    if (deletable !== false) {
        out += " <a class='tree_remove'>&times;</a>";
    }
    if (branch === true) {
        out += "<ul><li class='tree_dropzone' /></ul>";
    }
    out += "</li>";
    return out;
};

x.ui.tree.addNode = function (parent_node, content, position) {
    if (typeof parent_node === "string") {
        parent_node = $(".tree #" + parent_node);
    }
    if (parent_node.length !== 1 || parent_node[0].tagName !== "LI" || !parent_node.hasClass("tree_branch")) {
        throw new Error("addTreeNode(): parent_node must be single li element with class tree_branch");
    }
    parent_node.   addClass("tree_exp");
    parent_node.removeClass("tree_empt");
    parent_node = parent_node.children("ul").first();           // should only be one
    if (position) {
        position.after("<li class='tree_dropzone' />");
        position.after(content);
    } else {
        parent_node.append(content);
        parent_node.append("<li class='tree_dropzone' />");
    }
    return parent_node.children("li").not(".tree_dropzone").last();
};

x.ui.tree.removeNode = function (node) {
    node = this.removeNodeInternal(node);
    $(document).trigger('tree.remove', [ node.attr("id") ]);
    return node;
};

x.ui.tree.removeNodeInternal = function (node) {
    var ul;
    if (typeof node === "string") {
        node = $(".tree #" + node);
    }
//    console.log("removeTreeNode(): nodes matched: " + node.length);
    if (node.length !== 1 || node[0].tagName !== "LI") {
        throw new Error("invalid tree node");
    }
    ul = node.parent();
    node.next("li.tree_dropzone").remove();
    node.remove();
    if (ul.children("li").not(".tree_dropzone").length === 0) {
        ul.parent().removeClass("tree_exp");
        ul.parent().removeClass("tree_ctr");
        ul.parent().   addClass("tree_empt");
//        ul.remove();
    }
    return node;
};

x.ui.tree.moveNode = function (node, new_parent_node, position) {
    node = this.addNode(new_parent_node, this.removeNodeInternal(node), position);
    $(document).trigger('tree.move', [node.attr("id"), new_parent_node.attr("id"), position.prevAll("li.tree_dropzone").length]);
    return node;
};


$(document).on("tree.create", function (event, id, label, branch, draggable) {
    console.log("event tree.create: " + event.type + ", " + id + ", " + label + ", " + branch + ", " + draggable);
});

$(document).on("tree.remove", function (event, id) {
    console.log("event tree.remove: " + event.type + ", " + id);
});

$(document).on("tree.move", function (event, id, new_parent_id, position_index) {
    console.log("event tree.move: " + event.type + ", " + id + ", " + new_parent_id + ", " + position_index);
});


$(document).on("click", ".tree ul > li > a.tree_icon", function () {
    var parent_li = $(this).parent();
    if (parent_li.hasClass("tree_exp")) {
        parent_li.removeClass("tree_exp");
        parent_li.   addClass("tree_ctr");
    } else if (parent_li.hasClass("tree_ctr")) {
        parent_li.   addClass("tree_exp");
        parent_li.removeClass("tree_ctr");
    }
});

$(document).on("click", ".tree ul > li > a.tree_label", function () {
    var node = $(this).parent();
//    x.ui.using.log("opening doc: " + node.attr("id"));
//    x.ui.using.renderUpdate(node.attr("id"));
});

$(document).on("click", ".tree ul > li > a.tree_remove", function () {
    x.ui.tree.removeNode($(this).parent());
});

$(document).on("dragstart", ".tree li", function (e) {
    $(document).data("dragging_node", $(event.target));
});

$(document).on("dragenter", ".tree li.tree_dropzone", function (event) {
	event.originalEvent.dataTransfer.dropEffect = 'move';
	$(this).addClass("active_dropzone");
	return false;
});

$(document).on("dragover" , ".tree li.tree_dropzone", function (event) {
	if (event.preventDefault) {
		event.preventDefault();
	}
	event.originalEvent.dataTransfer.dropEffect = 'move';
	return false;
});

$(document).on("dragleave", ".tree li.tree_dropzone", function (event) {
	$(this).removeClass("active_dropzone");
	return false;
});

$(document).on("dragend"  , ".tree li"              , function (event) {
    $(document).data("dragging_node", null);
	return false;
});

$(document).on("drop"     , ".tree li.tree_dropzone", function (event) {
	var node  = $(document).data("dragging_node"),
		new_parent = $(this).parent().parent(),
		position   = $(this);

//	alert("moving node " + node.attr("id") + " (" + node.children("a.tree_label").text() + ") to " + new_parent.children("a.tree_label").text() + " position " + new_posn);
	x.ui.tree.moveNode(node, new_parent, position);

	if (event.preventDefault) {
		event.preventDefault();
	}
	if (event.stopPropagation) {
		event.stopPropagation();
	}
	$(this).removeClass("active_dropzone");
//	x.ui.using.moveTreeNode(new_parent, node);
//	x.store.setDocParent(node.attr("id"), new_parent.attr("id"));
	$(document).data("dragging_node", null);
	return false;
});

