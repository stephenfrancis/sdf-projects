/*global x, java*/
"use strict";

x.page = {};

x.page.Page = x.base.Base.clone({
    id                      : "Page",
    tabs                    : x.base.OrderedMap.clone({ id: "Page.tabs" }),
    sections                : x.base.OrderedMap.clone({ id: "Page.sections" }),
    links                   : x.base.OrderedMap.clone({ id: "Page.links" }),
    buttons                 : x.base.OrderedMap.clone({ id: "Page.buttons" }),
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
    new_obj.tabs           = this.tabs    .clone({ id: new_obj.id + ".tabs" });
    new_obj.tabs.page      = new_obj;
    new_obj.sections       = this.sections.clone({ id: new_obj.id + ".sections" });
    new_obj.sections.page  = new_obj;
    new_obj.links          = this.links   .clone({ id: new_obj.id + ".links" });
    new_obj.links.page     = new_obj;
    new_obj.buttons        = this.buttons .clone({ id: new_obj.id + ".buttons" });
    new_obj.buttons.page   = new_obj;
    return new_obj;
};


x.page.Page.setup = function () {
    var i;
    x.log.functionStart("setup", this, arguments);
    this.events.trigger("setupStart", this);
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
    this.events.trigger("setupEnd", this);
    this.ui.setURL(this.getSimpleURL());
    this.ui.setTitle(this.full_title);
    this.ui.setDescription(this.description);
    this.ui.setTabs(this.tabs);
    this.ui.setLinks(this.links);
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
    this.events.trigger("updateStart", this, params);
    this.updateFields(params);
    this.updateTabs(params);
    this.events.trigger("updateBeforeSections", this, params);
    this.updateSections(params);
    this.events.trigger("updateAfterSections", this, params);
    if (this.transactional) {
        this.updateTrans(params);
    }
    this.events.trigger("updateEnd", this, params);
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


x.page.Page.addEmail = function (spec) {
    var email;
    x.log.functionStart("addEmail", this, arguments);
    spec.page = this;
    spec.session = this.session;
    email = x.entities.ac_email.create(spec);
    this.emails.push(email);
    return email;
};
x.page.Page.addEmail.doc = {
    purpose: "Create an email from the given spec object, to be sent if/when the page saves successfully",
    args   : "spec: properties object for email - required: to_addr or to_user, text_string or subject and body; page and session added automatically",
    returns: "unsent email object"
};


x.page.Page.sendEmails = function () {
    var i;
    x.log.functionStart("sendEmails", this, arguments);
    for (i = 0; i < this.emails.length; i += 1) {
        this.emails[i].send();
    }
};
x.page.Page.sendEmails.doc = {
    purpose: "Send the emails queued to this page by calls to addEmail()",
    args   : "none",
    returns: "nothing"
};


x.page.Page.instantiateWorkflow = function (record, wf_tmpl, wf_inst_ref_field) {
    var wf_inst;
    x.log.functionStart("instantiateWorkflow", this, arguments);
    wf_inst = x.entities.ac_wf_inst.instantiate(this.getTrans(), wf_tmpl, record.getKey());
    wf_inst.first_node.getField("page" ).set(this.id);        // First node's page is just set to current page
    wf_inst.first_node.getField("title").set(this.title);
    this.addPerformingWorkflowNode(wf_inst.getKey(), wf_inst.first_node.getField("id").get());
    wf_inst.getField("title").set(record.getLabel("workflow_title"));
    if (wf_inst_ref_field) {
        record.getField(wf_inst_ref_field).set(wf_inst.getKey());
    }
    return wf_inst;
};
x.page.Page.instantiateWorkflow.doc = {
    purpose: "Instantiate a new workflow starting with this page",
    args   : "Record object representing the base record, workflow template id",
    returns: "New workflow instance object"
};


x.page.Page.presave = function () {
    var i;
    x.log.functionStart("presave", this, arguments);
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).presave();
    }
    this.events.trigger("presave", this);
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
        this.events.trigger("cancel", this);
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
x.page.Page.render = function (element, render_opts) {
    var page_elem;
    this.render_error = false;
    x.log.functionStart("render", this, arguments);
    if (!this.active) {
        throw new Error("page is not active");
    }
    if (typeof this.override_render_all_sections === "boolean") {
        render_opts.all_sections = this.override_render_all_sections;
    }
    page_elem = element.addChild("div", this.page, "css_page");
    this.events.trigger("renderStart", this, page_elem, render_opts);
    this.renderSections(page_elem, render_opts, this.page_tab ? this.page_tab.id : null);
    if (render_opts.include_buttons !== false) {
        this.renderButtons(page_elem, render_opts);
    }
//        this.renderChallengeToken(page_elem);
    this.events.trigger("renderEnd", this, page_elem, render_opts);
    return page_elem;
};
x.page.Page.render.doc = {
    purpose: "Generate HTML output for this page, given its current state; calls renderSections then renderButtons",
    args   : "xmlstream element object to be the parent of the page-level div element; render_opts is a map of settings: all_sections boolean (defaults false), include_buttons boolean (defaults true)",
    returns: "xmlstream element object for the div.css_page element representing the page, which was added to the argument"
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
    sections_elem = page_elem.addChild("div", null, "css_page_sections");
    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);
        tab     = section.tab && this.tabs.get(section.tab);
        if (section.visible && (!tab || tab.visible) && (render_opts.all_sections || !tab || section.tab === page_tab_id)) {
            row_span += section.tb_span;
            if (!div_elem || row_span > 12) {
                div_elem = sections_elem.addChild("div", null, "row-fluid");
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

x.page.Page.renderChallengeToken = function (page_elem) {
    if (!this.challenge_token) {
        this.challenge_token = x.Test.getRandomString(32,"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    page_elem.addChild("input", "sys_challenge_token")
             .attribute("name", "sys_challenge_token")
             .attribute("type", "hidden")
             .attribute("value", this.challenge_token);
};


x.page.Page.renderButtons = function (page_elem, render_opts) {
    var buttons_elem,
        i;
    x.log.functionStart("renderButtons", this, arguments);
    for (i = 0; i < this.buttons.length(); i += 1) {
        if (this.buttons.get(i).visible && !buttons_elem) {
            buttons_elem = page_elem.addChild("div", null, "css_page_buttons");
        }
        this.buttons.get(i).render(buttons_elem, render_opts);
    }
    return buttons_elem;
};
x.page.Page.renderButtons.doc = {
    purpose: "Call render() on each button in the page",
    args   : "xmlstream page-level div element object; render_opts",
    returns: "xmlstream div element object containing the button divs"
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


x.page.Page.addPerformingWorkflowNode = function (inst_id, node_id) {
    var wf_inst,
        inst_node,
        param;
    x.log.functionStart("addPerformingWorkflowNode", this, arguments);
    if (!this.performing_wf_nodes) {
        this.performing_wf_nodes = [];
    }
    x.log.debug(this, "addPerformingWorkflowNode, inst_id: " + inst_id + ", node_id: " + node_id);
    wf_inst   = x.entities.ac_wf_inst.retrieve(this.getTrans(), inst_id);
    inst_node = wf_inst.getNode(node_id);
    inst_node.page = this;
    this.performing_wf_nodes.push(inst_node);
    this.automatic = this.automatic || inst_node.getField("attributes").isItem("AU");
    if (!inst_node.template_node) {
        x.log.warn(this, "No template node for this instance node: " + inst_id + "." + node_id);
        return;
    }
    // TODO get parameters from instance node instead of template node...?
    for (param in inst_node.template_node.params) {
        if (inst_node.template_node.params.hasOwnProperty(param)) {
            this[param] = inst_node.template_node.params[param];
            x.log.debug(this, "adding param: " + param + ", value: " + this[param]);
        }
    }
    return inst_node;
};

x.page.Page.checkChallengeToken = function (params) {
    // Only check the challenge token if it has been created (through a call to page.render())
    if (!this.challenge_token) {
        return;
    }
    if (!params.sys_challenge_token) {
        throw new Error("no_challenge_token");
    } else if (params.sys_challenge_token !== this.challenge_token) {
        throw new Error("incorrect_challenge_token");
    }
};

//---------------------------------------------------------------------------------------  Tabs
x.page.Page.Tab = x.base.Base.clone({
    id : "Tab",
    visible: true
});

x.page.Page.Tab.doc = {
    location : "x.page.Page",
    file: "$Header: /rsl/rsl_app/core/page/Page.js,v 1.169 2014/08/15 13:22:32 francis Exp $",
    purpose : "Collection of page sections shown at the same time",
    properties : {
        label    : { label: "Text label of tab", type: "boolean", usage: "required in spec" },
        visible  : { label: "Whether or not this tab is shown (defaults to true)", type: "boolean", usage: "optional in spec" }
    }
};

x.page.Page.Tab.render = function (element, render_opts) {
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        return element.addChild("div", this.id, null).addText(this.label);
    }
};
x.page.Page.Tab.render.doc = {
    purpose: "Generate HTML output for this page tab",
    args   : "xmlstream div element object to contain the tabs; render_opts",
    returns: "nothing"
};


x.page.Page.Tab.getJSON = function () {
    var out = {};
    x.log.functionStart("getJSON", this, arguments);
    out.id = this.id;
    out.label = this.label;
    return out;
};
x.page.Page.Tab.getJSON.doc = {
    purpose: "Create a digest object to be returned in JSON form to represent this tab",
    args   : "none",
    returns: "The digest object to represent this tab"
};


x.page.Page.tabs.add = function (spec) {
    var tab;
    x.log.functionStart("add", this, arguments);
    if (!spec.label) {
        throw new Error("Tab label must be specified in spec");
    }
    tab = x.page.Page.Tab.clone(spec);
    x.base.OrderedMap.add.call(this, tab);
    return tab;
};
x.page.Page.tabs.add.doc = {
    purpose: "Create a new tab object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created tab",
    returns: "Newly-created tab object"
};


//---------------------------------------------------------------------------------------  Links
x.page.Page.Link = x.base.Base.clone({
    id : "Link",
    visible: true,
    css_class: "btn"
});

x.page.Page.Link.doc = {
    location : "x.page.Page",
    file: "$Header: /rsl/rsl_app/core/page/Page.js,v 1.169 2014/08/15 13:22:32 francis Exp $",
    purpose : "Link from this page to another",
    properties : {
        page_to  : { label: "String page id for target page", type: "string", usage: "optional in spec (required if label not supplied)" },
        page_key : { label: "String page key (if required), tokens in braces are detokenized, e.g. {page_key}", type: "string", usage: "optional in spec" },
        label    : { label: "Text label of link", type: "string", usage: "optional in spec (required if page_to not supplied)" },
        visible  : { label: "Whether or not this tab is shown (defaults to true)", type: "boolean", usage: "optional in spec" },
        css_class: { label: "CSS class for link, defaults to 'btn'", type: "string", usage: "optional in spec" }
    }
};

x.page.Page.Link.getKey = function (override_key) {
    var key;
    x.log.functionStart("getKey", this, arguments);
    key = this.page_key;
    if (key) {
        key = key.replace("{page_key}", override_key || this.owner.page.page_key);
    }
    return key;
};

x.page.Page.Link.getURL = function (override_key) {
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

x.page.Page.Link.getLabel = function () {
    x.log.functionStart("getLabel", this, arguments);
    if (!this.label && this.page_to) {
        this.label = x.page.Pages[this.page_to].short_title || x.page.Pages[this.page_to].title;
    }
    return this.label;
};

// Used in context pages
x.page.Page.Link.render = function (element, render_opts) {
    var elmt_link,
        css_class;
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        elmt_link = element.addChild("a", this.id);
        css_class = this.css_class;
        if (this.page_to) {
            if (!x.page.Pages[this.page_to]) {
                throw new Error("invalid target page: " + this.page_to);
            }
            elmt_link.attribute("href", this.getURL());
            if (this.owner.page.session.getPageTasks(this.page_to, this.getKey()).length > 0) {
                css_class += " btn_primary";
            }
        }
        elmt_link.attribute("class", css_class);
        elmt_link.addText(this.getLabel());
        return elmt_link;
    }
};
x.page.Page.Link.render.doc = {
    purpose: "Generate HTML output for this page link",
    args   : "xmlstream div element object to contain the links; render_opts",
    returns: "nothing"
};

x.page.Page.Link.renderNavOption = function (ul_elem, render_opts, this_val) {
    var elmt_link;
    x.log.functionStart("renderNavOption", this, arguments);
    if (this.nav_options !== false) {
        elmt_link = ul_elem.addChild("li").addChild("a");
        if (this.open_in_modal || (this.page_to && x.page.Pages[this.page_to].open_in_modal)) {
            elmt_link.attribute("class", "css_open_in_modal");
            elmt_link.attribute("href", this.getURL(this_val));
        } else {
            elmt_link.attribute("href", this.getURL(this_val));
        }
        elmt_link.addText(this.getLabel());
    }
    return elmt_link;
};

x.page.Page.Link.getJSON = function () {
    var out = {};
    x.log.functionStart("getJSON", this, arguments);
    out.id     = this.id;
    out.url    = this.getURL();
    out.label  = this.getLabel();
    out.target = this.target;
    out.task_info = this.owner.page.session.getPageTaskInfo(this.page_to, this.getKey());
    return out;
};
x.page.Page.Link.getJSON.doc = {
    purpose: "Create a digest object to be returned in JSON form to represent this link",
    args   : "none",
    returns: "nothing"
};


x.page.Page.Link.isVisible = function (session, override_key) {
    return this.visible && this.allowed(session, override_key);
};
x.page.Page.Link.isVisible.doc = {
    purpose: "Check whether to show this link (by default, this is when its visible property is true and, if the link is to a page, the user has access to it",
    args   : "session object",
    returns: "true if the link should be shown, false otherwise"
};


x.page.Page.Link.allowed = function (session, override_key) {
    if (!this.page_to) {
        return true;
    }
    return session.allowed(this.page_to, this.getKey(override_key));
};
x.page.Page.Link.allowed.doc = {
    purpose: "Check whether this user is allowed to see and access this link at this time",
    args   : "none",
    returns: "nothing"
};


x.page.Page.links.add = function (spec) {
    var link;
    x.log.functionStart("add", this, arguments);
    if (!spec.page_to && !spec.label) {
        throw new Error("Link page_to or label must be specified in spec");
    }
    link = x.page.Page.Link.clone(spec);
    x.base.OrderedMap.add.call(this, link);
    return link;
};
x.page.Page.links.add.doc = {
    purpose: "Create a new link object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created link",
    returns: "Newly-created link object"
};


//---------------------------------------------------------------------------------------  Sections
x.page.Page.sections.add = function (spec) {
    var section;
    x.log.functionStart("add", this, arguments);
    if (!spec.type) {
        throw new Error("Section type must be specified in spec: " + spec.id);
    }
    if (!x.sections[spec.type]) {
        throw new Error("Section type not available: " + spec.type + " in spec: " + spec.id);
    }
    section = x.sections[spec.type].clone(spec);
    x.base.OrderedMap.add.call(this, section);
    return section;
};
x.page.Page.sections.add.doc = {
    purpose: "Create a new section object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created section",
    returns: "Newly-created section object"
};


//---------------------------------------------------------------------------------------  Buttons
x.page.Page.Button = x.base.Base.clone({
    id : "Button",
    visible: true
});

x.page.Page.Button.doc = {
    location : "x.page.Page",
    file: "$Header: /rsl/rsl_app/core/page/Page.js,v 1.169 2014/08/15 13:22:32 francis Exp $",
    purpose : "Button on this page",
    properties : {
        label    : { label: "Text label of button", type: "boolean", usage: "required in spec" },
        visible  : { label: "Whether or not this tab is shown (defaults to true)", type: "boolean", usage: "optional in spec" }
    }
};

x.page.Page.Button.render = function (element, render_opts) {
    var elmt_button,
        css_class;
    x.log.functionStart("render", this, arguments);
    if (this.visible) {
        css_class = (this.css_class ? this.css_class + " " : "") + "btn css_cmd";
        if (this.main_button) {
            css_class += " btn_primary css_button_main";
        }
        elmt_button = element.addChild("button", this.id, css_class);
        if (this.target) {
            elmt_button.attribute("target", this.target);
        }
        elmt_button.addText(this.label);
        return elmt_button;
    }
};
x.page.Page.Button.render.doc = {
    purpose: "Generate HTML output for this page button",
    args   : "xmlstream div element object to contain the buttons; render_opts",
    returns: "nothing"
};

x.page.Page.Button.click = function () {
    if (this.save) {
        this.owner.page.save(this.id);
    }
};

x.page.Page.buttons.add = function (spec) {
    var button;
    x.log.functionStart("add", this, arguments);
    if (!spec.label) {
        throw new Error("Button label must be specified in spec: " + spec.id);
    }
    button = x.page.Page.Button.clone(spec);
    x.base.OrderedMap.add.call(this, button);
    return button;
};
x.page.Page.buttons.add.doc = {
    purpose: "Create a new button object in the owning page, using the spec properties supplied",
    args   : "Spec object whose properties will be given to the newly-created button",
    returns: "Newly-created button object"
};



x.page.ContextPage = x.page.Page.clone({
    id              : "ContextPage",
    requires_key    : true
});

//To show up in Chrome debugger...
//@ sourceURL=page/Page.js