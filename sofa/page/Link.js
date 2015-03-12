/*global x, java*/
"use strict";


x.page.addClone(x.base.Base, {
    id : "Link",
    visible: true,
    css_class: "btn",
    purpose : "Link from this page to another",
    properties : {
        page_to  : { label: "String page id for target page", type: "string", usage: "optional in spec (required if label not supplied)" },
        page_key : { label: "String page key (if required), tokens in braces are detokenized, e.g. {page_key}", type: "string", usage: "optional in spec" },
        label    : { label: "Text label of link", type: "string", usage: "optional in spec (required if page_to not supplied)" },
        visible  : { label: "Whether or not this tab is shown (defaults to true)", type: "boolean", usage: "optional in spec" },
        css_class: { label: "CSS class for link, defaults to 'btn'", type: "string", usage: "optional in spec" }
    }
});

x.page.Link.getKey = function (override_key) {
    var key;
    x.log.functionStart("getKey", this, arguments);
    key = this.page_key;
    if (key) {
        key = key.replace("{page_key}", override_key || this.owner.page.page_key);
    }
    return key;
};

x.page.Link.getURL = function (override_key) {
    var url = "",
        key;
    x.log.functionStart("getURL", this, arguments);
    if (this.url) {
        url = this.url.replace("{page_key}", override_key || this.owner.page.page_key);
    } else {
        if (this.page_to && x.page.Pages[this.page_to]) {
            url = x.page.Pages[this.page_to].skin;
        }
        url += "?page_id=" + this.page_to;
        key  = this.getKey(override_key);
        if (key) {
            url += "&page_key=" + key;
        }
    }
    return url;
};

x.page.Link.getLabel = function () {
    x.log.functionStart("getLabel", this, arguments);
    if (!this.label && this.page_to) {
        this.label = x.page.Pages[this.page_to].short_title || x.page.Pages[this.page_to].title;
    }
    return this.label;
};

// Used in context pages
x.page.Link.render = function (parent_elmt, render_opts) {
    var link_elmt;
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        link_elmt = parent_elmt.makeElement("a", this.css_class, this.id);
        if (this.page_to) {
            if (!x.page.Pages[this.page_to]) {
                throw new Error("invalid target page: " + this.page_to);
            }
            link_elmt.attr("href", this.getURL());
            if (this.owner.page.session.getPageTasks(this.page_to, this.getKey()).length > 0) {
                link_elmt.addClass("btn_primary");
            }
        }
        link_elmt.text(this.getLabel());
        return link_elmt;
    }
};
x.page.Link.render.doc = {
    purpose: "Generate HTML output for this page link",
    args   : "xmlstream div element object to contain the links; render_opts",
    returns: "nothing"
};

x.page.Link.renderNavOption = function (ul_elmt, render_opts, this_val) {
    var anchor_elmt;
    x.log.functionStart("renderNavOption", this, arguments);
    if (this.nav_options !== false) {
        anchor_elmt = ul_elmt.makeElement("li").makeAnchor(this.getLabel(), this.getURL(this_val));
        if (this.open_in_modal || (this.page_to && x.page.Pages[this.page_to].open_in_modal)) {
            anchor_elmt.attr("class", "css_open_in_modal");
        }
    }
    return anchor_elmt;
};

x.page.Link.getJSON = function () {
    var out = {};
    x.log.functionStart("getJSON", this, arguments);
    out.id     = this.id;
    out.url    = this.getURL();
    out.label  = this.getLabel();
    out.target = this.target;
    out.task_info = this.owner.page.session.getPageTaskInfo(this.page_to, this.getKey());
    return out;
};
x.page.Link.getJSON.doc = {
    purpose: "Create a digest object to be returned in JSON form to represent this link",
    args   : "none",
    returns: "nothing"
};


x.page.Link.isVisible = function (session, override_key) {
    return this.visible && this.allowed(session, override_key);
};
x.page.Link.isVisible.doc = {
    purpose: "Check whether to show this link (by default, this is when its visible property is true and, if the link is to a page, the user has access to it",
    args   : "session object",
    returns: "true if the link should be shown, false otherwise"
};


x.page.Link.allowed = function (session, override_key) {
    if (!this.page_to) {
        return true;
    }
    return session.allowed(this.page_to, this.getKey(override_key));
};
x.page.Link.allowed.doc = {
    purpose: "Check whether this user is allowed to see and access this link at this time",
    args   : "none",
    returns: "nothing"
};


x.page.Page.links.add = function (spec) {
    var link;
    x.log.functionStart("add", this, arguments);
    if (!spec.page_to && !spec.label) {
        throw new Error("Link page_to or label must be specified in spec: " + this + ", " + spec.id);
    }
    link = x.page.Link.clone(spec);
    x.base.OrderedMap.add.call(this, link);
    return link;
};
x.page.Page.links.add.doc = {
    purpose: "Create a new link object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created link",
    returns: "Newly-created link object"
};


//To show up in Chrome debugger...
//@ sourceURL=page/Link.js