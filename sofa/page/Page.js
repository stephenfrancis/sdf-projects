/*global x, java*/
"use strict";


x.page.addClone(x.base.Base, {
//x.page.Page = x.base.Base.clone({
    id                      : "Page",
    tabs                    : x.base.OrderedMap.clone({ id: "tabs" }),
    sections                : x.base.OrderedMap.clone({ id: "sections" }),
    links                   : x.base.OrderedMap.clone({ id: "links" }),
    buttons                 : x.base.OrderedMap.clone({ id: "buttons" }),
//    events                  : x.EventStack.clone({ id: "Page.events", events: [
//                                  "setupStart", "setupEnd",
//                                  "updateStart", "updateBeforeSections", "updateAfterSections", "updateEnd",
//                                  "presave", "success", "failure", "cancel",
//                                  "renderStart", "renderEnd" ] }),
    prompt_nav_away         : false,
    tab_sequence            : false,
    tab_forward_only        : false,
    allow_no_modifications  : false,
});
x.page.Page.doc = {
    location                : "x",
    file                    : "$Header: /rsl/rsl_app/core/page/Page.js,v 1.169 2014/08/15 13:22:32 francis Exp $",
    purpose                 : "Unit of system interaction, through the User Interface or a Machine Interface",
    properties : {
        title               : { label: "Page's text title", type: "string", usage: "required in spec" },
        short_title         : { label: "Text title for where space is tight", type: "string", usage: "optional in spec" },
        entity              : { label: "Primary entity to which page relates", type: "x.data.Entity", usage: "optional in spec" },
        requires_key        : { label: "Whether or not page needs a page_key", type: "boolean", usage: "optional in spec" },
        tabs                : { label: "OrderedMap of page tabs", type: "x.base.OrderedMap", usage: "use methods only" },
        sections            : { label: "OrderedMap of page sections", type: "x.base.OrderedMap", usage: "use methods only" },
        links               : { label: "OrderedMap of page links", type: "x.base.OrderedMap", usage: "use methods only" },
        buttons             : { label: "OrderedMap of page buttons", type: "x.base.OrderedMap", usage: "use methods only" },
        includes            : { label: "Array of page includes, i.e. client-side resources such as JS files", type: "array", usage: "static only" },
        outcomes            : { label: "Object map of page outcomes", type: "object", usage: "static only" },
        active              : { label: "Whether or not page is active", type: "boolean", usage: "read only" },
        skin                : { label: "The 'skin' (i.e. HTML page) this page should use", type: "string", usage: "optional in spec" },
        prompt_nav_away     : { label: "Whether or not to prompt the user before allowing navigation away from page; defaults true if page is transactional, else false", type: "boolean", usage: "optional in spec" },
        exit_url_save       : { label: "Relative URL (begins '?page_id=') to go to once page is saved successfully", type: "string", usage: "optional in spec" },
        exit_url_cancel     : { label: "Relative URL (begins '?page_id=') to go to if page is cancelled", type: "string", usage: "optional in spec" },
        tab_sequence        : { label: "If true, next and/or previous buttons shown, with save visible only at end (defaults false)", type: "boolean", usage: "optional in spec" },
        tab_forward_only    : { label: "If true AND tab_sequence is true, previous buttons NOT shown (defaults false)", type: "boolean", usage: "optional in spec" },
        allow_no_modifications: { label: "Allow this page is save without having made any changes (defaults false)", type: "boolean", usage: "optional in spec" }
    }
};

x.page.Page.clone = function (spec) {
    var new_obj;
    x.log.functionStart("clone", this, arguments);
    new_obj = x.base.Base.clone.call(this, spec);
    if (new_obj.instance) {
        new_obj.active = true;
        new_obj.fields = {};
        new_obj.emails = [];
        new_obj.messages = [];
//    } else {
//        new_obj.events         = this.events  .clone({ id: new_obj.id + ".events" });
//        new_obj.events.page    = new_obj;
    }
    new_obj.tabs           = this.tabs    .clone({ owner: new_obj, id: "tabs" });
    new_obj.sections       = this.sections.clone({ owner: new_obj, id: "sections" });
    new_obj.links          = this.links   .clone({ owner: new_obj, id: "links" });
    new_obj.buttons        = this.buttons .clone({ owner: new_obj, id: "buttons" });
    return new_obj;
};


x.page.Page.setup = function () {
    var i;
    x.log.functionStart("setup", this, arguments);
//    this.events.trigger("setupStart", this);
    this.exit_url_save   = this.exit_url_save   || this.session.last_non_trans_page_url;
    this.exit_url_cancel = this.exit_url_cancel || this.session.last_non_trans_page_url;
    this.getDocument();
    if (!this.full_title) {
        this.full_title = this.title;
    }
    this.setupButtons();
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).setup();
    }
    if (this.tabs.length() > 0) {
        this.page_tab = this.tabs.get(0);
    }
//    this.events.trigger("setupEnd", this);
};
x.page.Page.setup.doc = {
    purpose: "Initialise a Page instance for use - add buttons, call setup on Sections, etc",
    args   : "none",
    returns: "nothing"
};

x.page.Page.setupButtons = function () {
    var i;
    if (this.outcomes) {
        for (i in this.outcomes) {
            if (this.outcomes.hasOwnProperty(i)) {
                this.outcomes[i].id   = String(i);
                this.outcomes[i].save = true;
                this.buttons.add(this.outcomes[i]);
            }
        }
    }
    if (this.tab_sequence) {
        this.buttons.add({ id: "prev_tab", label: "Previous", main_button: false, css_class: "" });
        this.buttons.add({ id: "next_tab", label: "Next",     main_button: false, css_class: "btn-primary" });
    }
    if (this.transactional) {
        this.prompt_nav_away = true;
        if (!this.outcomes) {    // save is NOT main_button to prevent page submission when enter is pressed
            this.buttons.add({ id: "save", label: "Save", main_button: false, save: true, css_class: "btn-primary" });
        }
        this.buttons.add({ id: "cancel", label: "Cancel" });
    }
};
x.page.Page.setupButtons.doc = {
    purpose: "Initialise the buttons and outcomes of a Page",
    args   : "none",
    returns: "nothing"
};

//---------------------------------------------------------------------------------------  update
x.page.Page.update = function (params) {
    x.log.functionStart("update", this, arguments);
    x.log.debug(this, "update(" + JSON.stringify(params) + ")");
    this.session.newVisit(this.id, this.getPageTitle(), this.record_parameters ? params : null, this.trans, this.page_key);
    if (params.refer_page) {
        this.session.refer_page = this.session.getPageFromCache(params.refer_page);
        x.log.debug(this, "Refer page: " + this.session.refer_page);
        if (this.session.refer_page && params.refer_section) {
            this.session.refer_section = this.session.refer_page.sections.get(params.refer_section);
            x.log.debug(this, "Refer section: " + this.session.refer_section);
        }
    }
//    this.events.trigger("updateStart", this, params);
    this.updateFields(params);
    this.updateTabs(params);
//    this.events.trigger("updateBeforeSections", this, params);
    this.updateSections(params);
//    this.events.trigger("updateAfterSections", this, params);
    if (this.transactional) {
        this.updateTrans(params);
    }
//    this.events.trigger("updateEnd", this, params);
    this.session.updateVisit(parseInt(params.visit_start_time, 10));
};
x.page.Page.update.doc = {
    purpose: "Update page's state using the parameter map supplied",
    args   : "params: object map of strings",
    returns: "nothing"
};

x.page.Page.updateFields = function (params) {
    var that = this;
    x.log.functionStart("updateFields", this, arguments);
    this.fields.forOwn(function (field_id, field) {
        var control = field.getControl();
        if (typeof params[control] === "string") {
            if (field.isEditable()) {
                x.log.trace(that, "updateFields(): updating field " + control + " to value: " + params[control]);
                field.set(params[control]);
            } else {
                x.log.warn(that, "updateFields(): Can't update uneditable field " + control + " to value: " + params[control]);
            }
        } else if (typeof params[control] !== "undefined") {
            throw new Error("param is not a string: " + control + " = " + params[control]);
        } else {
            x.log.trace(that, "updateFields(): field not updated " + control);
            field.prev_val = field.val;
        }
    });
};


x.page.Page.updateTabs = function (params) {
    x.log.functionStart("updateTabs", this, arguments);
    this.prev_tab = this.page_tab;
    this.moveToTab(params.page_tab, params.page_button);
};
x.page.Page.updateTabs.doc = {
    purpose: "Set this.page_tab (reference to tab object) using params.page_tab (string)",
    args   : "params: object map of strings",
    returns: "nothing"
};


x.page.Page.moveToTab = function (tab_ref, page_button) {
    var tabs = this.tabs,
        curr_tab_ix,
        curr_tab_visible = false,
        first_visible_tab_ix,
        last_visible_tab_ix,
        prev_visible_tab_ix,
        next_visible_tab_ix,
        move_to_ix;
    x.log.functionStart("moveToTab", this, arguments);
    if (this.page_tab) {
        curr_tab_ix = tabs.indexOf(this.page_tab.id);
    }
    this.tabs.each(function (tab) {
        if (tab.visible) {
            last_visible_tab_ix = tabs.indexOf(tab);
            if (last_visible_tab_ix === curr_tab_ix) {
                curr_tab_visible = true;
            }
            if (typeof first_visible_tab_ix !== "number") {
                first_visible_tab_ix = last_visible_tab_ix;
            }
            if (last_visible_tab_ix < curr_tab_ix) {
                prev_visible_tab_ix = last_visible_tab_ix;
            }
            if (last_visible_tab_ix > curr_tab_ix && typeof next_visible_tab_ix !== "number") {
                next_visible_tab_ix = last_visible_tab_ix;
            }
        }
    });
    if (typeof tab_ref === "number") {
        move_to_ix = tab_ref;
    } else if (tab_ref && this.tabs.indexOf(tab_ref) > -1) {
        move_to_ix = this.tabs.indexOf(tab_ref);
    } else if (tab_ref && parseInt(tab_ref, 10).toFixed(0) === tab_ref) {
        move_to_ix = parseInt(tab_ref, 10);
    } else if (page_button === "next_tab") {
        move_to_ix = next_visible_tab_ix;
    } else if (page_button === "prev_tab" && !this.tab_forward_only) {
        move_to_ix = prev_visible_tab_ix;
    } else if (!curr_tab_visible) {
        move_to_ix = next_visible_tab_ix || first_visible_tab_ix;
    }
    if (typeof move_to_ix === "number") {
        if (move_to_ix < 0 || move_to_ix >= tabs.length()) {
            this.messages.push({ type: 'E', text: "Invalid tab", tab_index: move_to_ix });
        } else if (!this.tab_sequence || !this.tab_forward_only || move_to_ix === (curr_tab_ix + 1)) {
            if (tabs.get(move_to_ix).visible) {
                this.page_tab = tabs.get(move_to_ix);
                curr_tab_ix = move_to_ix;
            } else {
                this.messages.push({ type: 'E', text: "Invalid tab", tab_index: move_to_ix });
            }
        }
    }
    x.log.trace(this, "updateTabs(): 1st " + first_visible_tab_ix + ", last " + last_visible_tab_ix + ", prev " + prev_visible_tab_ix + ", next " + next_visible_tab_ix + ", curr " + curr_tab_ix);
    if (this.tab_sequence) {
        this.buttons.get("prev_tab").visible = (curr_tab_ix > first_visible_tab_ix) && !this.tab_forward_only;
        this.buttons.get("next_tab").visible = (curr_tab_ix <  last_visible_tab_ix);
        this.buttons.each(function (button) {
            if (button.save) {
                button.visible = (curr_tab_ix === last_visible_tab_ix);
            }
        });
    }
};


x.page.Page.moveToFirstErrorTab = function () {
    var move_to_tab = 999,
        i,
        section;
    x.log.functionStart("moveToFirstErrorTab", this, arguments);
    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);
        x.log.debug(this, "moveToFirstErrorTab() " + section.id + ", " + section.visible + ", " + section.isValid() + ", " + section.tab + ", " + move_to_tab);
        if (section.visible && !section.isValid() && section.tab && this.tabs.indexOf(section.tab) < move_to_tab) {
            move_to_tab = this.tabs.indexOf(section.tab);
        }
    }
    if (move_to_tab < 999) {
        this.moveToTab(move_to_tab);
    }
};

x.page.Page.updateSections = function (params) {
    var i;
    x.log.functionStart("updateSections", this, arguments);
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).update(params);
    }
};
x.page.Page.updateSections.doc = {
    purpose: "Call update(params) on each section in the Page",
    args   : "params: object map of strings",
    returns: "nothing"
};


x.page.Page.updateTrans = function (params) {
    var first_warnings,
        save;
    x.log.functionStart("updateTrans", this, arguments);
    this.outcome_id = params.page_button;
//    this.trans.messages.include_field_messages = false;
//    first_warnings = this.trans.messages.firstWarnings();
    save = this.outcome_id
            && this.buttons.get(this.outcome_id)
            && this.buttons.get(this.outcome_id).save;
    if (this.outcome_id === "cancel") {
        this.cancel();
    } else if (save) {
        if (first_warnings) {        // unreported warnings
//            this.trans.messages.add({ type: 'W', report: false, warned: true, text: "Save aborted due to first-time-shown warnings" });
        } else {
//            this.checkChallengeToken(params);
//            this.trans.messages.include_field_messages = true;
//            this.save();
            if (this.document) {
                this.document.save();
            }
        }
    }
};
x.page.Page.updateTrans.doc = {
    purpose: "Cancel or attempt to Save this page depending on params.page_button",
    args   : "params: object map of strings",
    returns: "nothing"
};


x.page.Page.presave = function () {
    var i;
    x.log.functionStart("presave", this, arguments);
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).presave();
    }
//    this.events.trigger("presave", this);
};
x.page.Page.presave.doc = {
    purpose: "Called at beginning of save(); does nothing here - to be overridden",
    args   : "outcome_id: text id string, 'save' by default",
    returns: "nothing"
};


x.page.Page.save = function () {
    x.log.functionStart("save", this, arguments);
    if (this.document && this.document.isValid()) {
        this.document.save();
    }
};
/*
    if (!this.trans.isValid()) {            // All errors should be reported "locally", if appropriate for user
        x.log.debug(this, "x.page.Page.save() exiting - trans is initially not valid");
//        this.trans.reportErrors();
//        this.session.messages.add({ type: 'E', text: "Not saved" });
        this.moveToFirstErrorTab();
        return;
    }
//    try {
        this.presave();
        if (!this.trans.isValid()) {            // All errors should be reported "locally", if appropriate for user
            x.log.debug(this, "x.page.Page.save() cancelling - trans is not valid after presave()");
            throw { type: 'E', text: "Not saved" };
        }
        if (this.performing_wf_nodes) {
            for (i = 0; i < this.performing_wf_nodes.length; i += 1) {
                this.performing_wf_nodes[i].complete(this.outcome_id);
            }
        }
        if (!this.trans.isValid()) {            // failures in performing_wf_nodes[i].complete() are irreversible
            x.log.debug(this, "x.page.Page.save() cancelling - trans is not valid after performing_wf_nodes[...].complete()");
            throw { type: 'E', text: "Not saved" };
        }
        if (!this.allow_no_modifications && !this.trans.isModified()) {
            throw { type: 'W', text: "No changes made" };
        }
        this.trans.save(this.outcome_id);                    // commit transaction
        if (this.session.online) {
            if (this.trans.next_auto_steps_to_perform.length === 0 && !this.hide_undo_link_on_save) {        // show undo link if online session and no auto steps involved
//                this.session.messages.add({ type: 'I', text: "Saved <a class='css_undo_link' href='" + x.page.Pages.ac_tx_undo.getSimpleURL(this.trans.id) + "&page_button=undo'>undo</a>" });
            } else {
//                this.session.messages.add({ type: 'I', text: "Saved" });
            }
        } else {
//            this.session.messages.add({ type: 'I', text: "Saved transaction: " + this.trans.id });
        }
//        this.events.trigger("success", this);
        this.redirect_url = this.exit_url_save;
        this.sendEmails();
        this.active = false;        // clearPageCache() calls cancel() on ALL pages including this one, so set active false first
//        this.session.clearPageCache();        // db altered
};
x.page.Page.save.doc = {
    purpose: "If page is valid, attempt to commit transaction; if failure occurs during save, page is cancelled",
    args   : "none",
    returns: "nothing"
};
*/

// No effect if page is already not active
x.page.Page.cancel = function () {
    x.log.functionStart("cancel", this, arguments);
    if (this.active) {
//        this.events.trigger("cancel", this);
        this.redirect_url = this.exit_url_cancel;
        if (this.trans && this.trans.active) {
            this.trans.cancel();
        }
        this.active = false;
    }
};
x.page.Page.cancel.doc = {
    purpose: "Cancel this page and redirect to previous one",
    args   : "none",
    returns: "nothing"
};


//---------------------------------------------------------------------------------------  render
x.page.Page.render = function (render_opts) {
    render_opts = render_opts || {};
    if (this.elements && this.elements.title) {
        this.elements.title.text(this.full_title);
    }
    if (this.elements && this.elements.descr) {
        this.elements.title.text(this.description);
    }
    if (this.elements && this.elements.body) {
        this.renderBody(render_opts);
    }
    if (this.elements && this.elements.tabs) {
        this.renderTabs(render_opts);
    }
    if (this.elements && this.elements.links) {
        this.renderLinks(render_opts);
    }
};

x.page.Page.renderBody = function (render_opts) {
    var page_elem;
    x.log.functionStart("render", this, arguments);
    if (!this.elements || !this.elements.body) {
        throw new Error("no container element specified");
    }
    this.elements.body.empty();
    if (typeof this.override_render_all_sections === "boolean") {
        render_opts.all_sections = this.override_render_all_sections;
    }
    page_elem = x.io.browser.addElement(this.elements.body, "div");
    page_elem.addClass("css_page");
//    this.events.trigger("renderStart", this, page_elem, render_opts);
    this.renderSections(page_elem, render_opts, this.page_tab ? this.page_tab.id : null);
    if (render_opts.include_buttons !== false) {
        this.renderButtons(page_elem, render_opts);
    }
//    this.events.trigger("renderEnd", this, page_elem, render_opts);
    return page_elem;
};


x.page.Page.renderSections = function (page_elem, render_opts, page_tab_id) {
    var sections_elem,
        div_elem,
        row_span = 0,
        i,
        section,
        tab;
    x.log.functionStart("renderSections", this, arguments);
    if (page_tab_id) {
        x.log.debug(this, "Rendering tab: " + page_tab_id);
    }
    sections_elem = x.io.browser.addElement(page_elem, "div");
    sections_elem.addClass("css_page_sections");
    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);
        tab     = section.tab && this.tabs.get(section.tab);
        if (section.visible && (!tab || tab.visible) && (render_opts.all_sections || !tab || section.tab === page_tab_id)) {
            row_span += section.tb_span;
            if (!div_elem || row_span > 12) {
                div_elem = x.io.browser.addElement(sections_elem, "div");
                div_elem.addClass("row-fluid");
                row_span = section.tb_span;
            }
            section.render(div_elem, render_opts);
        }
    }
    return sections_elem;
};
x.page.Page.renderSections.doc = {
    purpose: "Call render() on each section that is associated with current tab or has no tab",
    args   : "xmlstream page-level div element object; render_opts",
    returns: "xmlstream div element object containing the section divs"
};

x.page.Page.renderButtons = function (page_elem, render_opts) {
    var buttons_elem,
        i;
    x.log.functionStart("renderButtons", this, arguments);
    for (i = 0; i < this.buttons.length(); i += 1) {
        if (this.buttons.get(i).visible && !buttons_elem) {
            buttons_elem = x.io.browser.addElement(page_elem,"div");
            buttons_elem.addClass("css_page_buttons");
        }
        this.buttons.get(i).render(buttons_elem, render_opts);
    }
    return buttons_elem;
};


x.page.Page.renderTabs = function (render_opts) {
};

x.page.Page.renderLinks = function (render_opts) {
};

x.page.Page.getDocument = function () {
    x.log.functionStart("getDocument", this, arguments);
    if (!this.document && this.entity) {
        if (this.requires_key && !this.page_key) {
            throw new Error("no page_key supplied and page requires one");
        }
        this.document = this.entity.getDocument(this.page_key);
        if (!this.full_title) {
            if (this.document.action !== "C") {
                this.full_title = this.title + ": " + this.document.getLabel("page_title_addl");
            }
        }
    }
    return this.document;
};
x.page.Page.getDocument.doc = {
    purpose: "Returns the primary row of this page, if it has one",
    args   : "none",
    returns: "Descendent of Entity object, modifiable if the page is transactional"
};


x.page.Page.getSimpleURL = function (override_key) {
    var page_key;
    x.log.functionStart("getSimpleURL", this, arguments);
    page_key = override_key || this.page_key;
    return this.skin + "?page_id=" + this.id + (page_key ? "&page_key=" + page_key : "");
};
x.page.Page.getSimpleURL.doc = {
    purpose: "Returns the minimal query string referencing this page, including its page_key if it has one",
    args   : "none",
    returns: "Relative URL, i.e. '{skin}?page_id={page id}[&page_key={page key}]'"
};


x.page.Page.getPageTitle = function () {
    x.log.functionStart("getPageTitle", this, arguments);
    return this.full_title;
};
x.page.Page.getPageTitle.doc = {
    purpose: "Returns the page title text string",
    args   : "none",
    returns: "Page title text string"
};


x.page.Page.addField = function (field) {
    var control = field.getControl();
    x.log.functionStart("addField", arguments);
    x.log.trace(this, "Adding field " + field + " to page.fields with control: " + control);
    if (this.fields[control]) {
        throw new Error("field with this control already exists: " + control);
    }
    this.fields[control] = field;
};

x.page.Page.removeField = function (field) {
    x.log.functionStart("removeField", arguments);
    delete this.fields[field.getControl()];
};



//To show up in Chrome debugger...
//@ sourceURL=page/Page.js