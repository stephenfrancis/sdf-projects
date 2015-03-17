/*global x, java */
"use strict";


x.ac.addEntity({
    id              : "Session",
    max_inactive_interval: (60 * 30),            // in seconds, 30 mins
    purpose         : "To represent a user interacting with the system",
    properties      : {
        chameleon               : { label: "User id of 'real' user who logged in as Chameleon, if application", type: "string", usage: "read only" },
        list_section            : { label: "Object map of page section objects against their full ids", type: "object", usage: "read only" },
        delegaters              : { label: "Object map of other users who are delegating to this user", type: "object", usage: "read only" },
        password_reminder_period: { label: "Day period to request a password change", type: "number", usage: "read only" },
        force_password_change   : { label: "Boolean that determines whether it is required a password change", type: "boolean", usage: "read, write" },
    }
});

x.ac.Session.clone = function (spec) {
    var session;
    x.log.functionStart("clone", this, arguments);
    session = x.base.Base.clone.call(this, spec);
    session.active = true;
    session.visits = 0;
    session.page_cache = [];
    session.last_non_trans_page_url = session.home_page_url;
    return session;
};


x.ac.Session.getSessionId = function () {
    x.log.functionStart("getSessionId", this, arguments);
    return id;
};

x.ac.Session.isAdmin = function (module) {
    return true;
};

x.ac.Session.isUserInRole = function (role) {
    x.log.functionStart("isUserInRole", this, arguments);
    return true;
};

x.ac.Session.getPage = function (page_id, page_key, elements) {
    var page;
    x.log.functionStart("getPage", this, arguments);
    page = this.getPageFromCacheAndRemove(page_id, page_key);
    if (!page) {
        page = this.getNewPage(page_id, page_key, elements);
    }
    this.page_cache.unshift(page);                // add page to beginning of array
    this.clearPageCache(5);
    return page;
};

x.ac.Session.getPageFromCacheAndRemove = function (page_id, page_key) {
    var page,
        i;

    x.log.functionStart("getPageFromCacheAndRemove", this, arguments);
    for (i = 0; i < this.page_cache.length; i += 1) {
        if (this.page_cache[i].id === page_id) {
            page = this.page_cache[i];
            this.page_cache.splice(i, 1);            // remove page from page_cache
            break;
        }
    }
    i = 0;                                           // cancel other transactional pages and clear from cache
    while (i < this.page_cache.length) {
        if (this.page_cache[i].transactional ) {
            this.page_cache[i].cancel();
            this.page_cache.splice(i, 1);            // remove page from page_cache
        } else {
            i += 1;
        }
    }
    if (page && page.active && page_key && page_key !== page.page_key) {
        page.cancel();        // makes page inactive
    }
    if (page && !page.active) {
        page = null;
    }
    return page;
};

x.ac.Session.getNewPage = function (page_id, page_key, elements) {
    var page,
        exc;

    x.log.functionStart("getNewPage", this, arguments);
    page = x.base.Module.getPage(page_id);
    if (!page) {
        throw new Error("page not found: " + page_id);
    }
//    if (!this.allowed(page_id, page_key)) {
//        throw new Error("access denied: " + page_id);
//    }
    page = page.clone({ id: page.id, page_key: page_key, session: this, instance: true, elements: elements });
    // page_key can be used in setup() since cannot subsequently change
//        this.checkWorkflowPage(page);
    page.setup();                        // without page being cancelled and reloaded
    return page;
};

x.ac.Session.getPageFromCache = function (page_id) {
    var i;
    x.log.functionStart("getPageFromCache", this, arguments);
    for (i = 0; i < this.page_cache.length; i += 1) {
        if (this.page_cache[i].id === page_id) {
            return this.page_cache[i];
        }
    }
};

x.ac.Session.clearPageCache = function (number_to_leave) {
    x.log.functionStart("clearPageCache", this, arguments);
    if (typeof number_to_leave !== "number") {
        number_to_leave = 0;
    }
    while (this.page_cache.length > number_to_leave) {
        this.page_cache.pop().cancel();                    // remove last item from array and cancel it
    }
};

x.ac.Session.clearPageFromCache = function (page_id) {
    var i = 0;
    x.log.functionStart("clearPageFromCache", this, arguments);
    while (i < this.page_cache.length) {
        if (this.page_cache[i].id === page_id) {
            this.page_cache[i].cancel();
            this.page_cache.splice(i, 1);
        } else {
            i += 1;
        }
    }
};



x.ac.Session.allowedURL = function (url, always_check_key) {
    var match;
    x.log.functionStart("allowedURL", this, arguments);
    match = url.match(/\?page_id=(\w+)(&page_key=([\w\.]+))?/);
    x.log.trace(this, "allowedURL() url: " + url + ", match: " + match);
    if (!match) {
        return true;
    }
    return this.allowed(match[1], (match.length > 3 ? match[3] : null), always_check_key);
};


x.ac.Session.allowed = function (page_id, page_key, always_check_key) {
    return true;
};


x.ac.Session.newVisit = function (page_id, page_title, params, trans, page_key) {
};
x.ac.Session.newVisit.doc = {
    purpose: "Identify a new 'visit' event, and write a record to the ac_visit table, including parameters passed in",
    args   : "page object (or null), trans object (or null), params: object map of strings, title, if applicable",
    returns: "visit id number"
};

x.ac.Session.getSessionId = function () {
    return "blah";
};

x.ac.Session.updateVisit = function (start_time) {
};
x.ac.Session.updateVisit.doc = {
    purpose: "Update the ac_visit table for an existing 'visit' event, including messages recorded, when processing is finished",
    args   : "start_time: date/time of start of processing, as a number, if known",
    returns: "nothing"
};

//To show up in Chrome debugger...
//@ sourceURL=ac/Session.js