/*global  */
"use strict";

x.ui = {
    active: true,
    default_page: "home",
    arrow_entity: "&#10148;"
};

x.ui.setURL = function (url) {
    x.log.debug(this, "ignoring setURL()");
};

x.ui.setTitle = function (title) {
    x.log.debug(this, "ignoring setTitle()");
};

x.ui.setDescription = function (descr) {
    x.log.debug(this, "ignoring setDescription()");
};

x.ui.setTabs = function (tabs) {
    x.log.debug(this, "ignoring setTabs()");
};

x.ui.setLinks = function (links) {
    x.log.debug(this, "ignoring setLinks()");
};

x.ui.setNavLinks = function (search_page, prev_key, next_key) {
    x.log.debug(this, "ignoring setNavLinks()");
};

x.ui.clearMessages = function () {
    $(this.message_selector).empty();
};

x.ui.reportMessage = function (msg) {
    var css_class = "alert";
    if (typeof msg.type !== "string") {
        msg_type = "E";
    }
    if (msg.type === 'E') {
        css_class += " alert-error";
    } else if (msg.type === 'W') {
        css_class += " alert-warning";
    } else if (msg.type === 'I') {
        css_class += " alert-info";
    }
    msg.text = "<div class='" + css_class + "'>" + msg.text + "</div>";
//    $(".css_messages").append(msg_text);
//    $(".css_messages").effect( "pulsate", {}, 500 );
//    y.checkStyle( "/rsl_shared/style/jquery-ui-1.10.2.custom/css/smoothness/jquery-ui-1.10.2.custom.css");
//    y.checkScript("/rsl_shared/style/jquery-ui-1.10.2.custom/js/jquery-ui-1.10.2.custom.min.js");
    $(msg.text).appendTo($(this.message_selector));
//    .effect( "pulsate", { times: 2 }, 500 );
};

x.ui.splitParams = function (str) {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = str,
        out = {};
    e = r.exec(q);
    while (e) {
        out[d(e[1])] = d(e[2]);
        e = r.exec(q);
    }
    return out;
};

x.ui.joinParams = function (obj) {
    var str = "",
        param,
        delim = "";
    for (param in obj) {
        if (obj.hasOwnProperty(param)) {
            str += delim + param + "=" + encodeURIComponent(obj[param]);
            delim = "&";
        }
    }
    return str;
};

x.ui.loadQueryString = function (query_string, opts) {
    var params;
    query_string = query_string.substr(query_string.indexOf("?") + 1);      // remove '?' and anything before it
    params = this.splitParams(query_string);
    params.page_id = params.page_id || this.default_page;
    $(this.target_selector).addClass("css_load_target");
    $(this.target_selector).data("ui", this);
    this.open();
    this.load(params);
};

x.ui.getLocal = function (elem) {
    var target = elem && elem.parents(".css_load_target").first();
    if (target && target.length > 0) {
        return target.data("ui");
    }
    return x.ui.main;
};

x.ui.open = function () {
    x.log.debug(this, "ignoring open()");
};

x.ui.close = function () {
    x.log.debug(this, "ignoring close()");
};

x.ui.load = function (params, render_opts) {
    var that = this;
    if (!this.active) {
        return;
    }
    this.start_load = new Date();
    this.scroll_top = (render_opts && render_opts.scroll_top) || $(this.getScrollElement()).scrollTop();
    this.collectParams(params);
    this.deactivate();
    try {
        if (params.page_id) {
            this.page = x.session.getPage(params.page_id, params.page_key, this);
        }
        if (this.page) {
            x.Entity.whenFinishedWaitingForDocuments(function () {
                that.page.update(params);
                that.render(render_opts);
            });
        } else {
            x.log.debug("x.ui.load params = ", JSON.stringify(params));
            this.activate();
        }
    } catch (e) {
        this.reportMessage({ type: 'E', text: e.toString() });
        throw e;
//        y.logged_in = true;
//        target.empty();
//        target.trigger('activate'  , [target, opts]);
//        target.trigger('initialize', [target, opts]);
//        $(document).trigger("loadError", [target, params, opts]);
    }
};

x.ui.getScrollElement = function () {
    return this.target_selector;
};

x.ui.render = function (render_opts) {
    var xml = x.XmlStream.clone({ jquery_elem: $(this.target_selector), name: "div" });
    $(this.target_selector).empty();
    this.page.render(xml, render_opts || {});
    $(this.getScrollElement()).scrollTop(this.scroll_top);
    this.post_render = new Date();
    this.activate();
};

x.ui.activate = function () {
    $(this.target_selector).removeClass("css_inactive");
    $(this.target_selector).css("cursor", "default");
    $(this.target_selector).find(":input.css_was_enabled").removeAttr("disabled");
    this.active = true;
};

x.ui.deactivate = function () {
    $(this.target_selector).   addClass("css_inactive");
    $(this.target_selector).css("cursor", "progress");
    $(this.target_selector).find(":input:enabled").each(function () {
        $(this).addClass("css_was_enabled");
        $(this).attr("disabled", "disabled");
    });
    this.active = false;
};

x.ui.collectParams = function (params) {
    function addParam(name, value) {
        if (params[name]) {
            value = params[name] + (value ? "|" : "") + value;
        }
        params[name] = value;
    }
//    target.find(":input").trigger("prepost");//Event to convert input value before post request
    $(this.target_selector).find(":input").not(":button").each(function () {
        if (!$(this).attr("id")) {
            return;
        }
        if ($(this).attr("type") === "checkbox" && $(this).attr("checked") !== "checked") {
            return;
        }
        if ($(this).attr("type") === "radio"    && $(this).attr("checked") !== "checked") {
            return;
        }
        addParam($(this).attr("id"), $(this).val());
    });    
    $(this.target_selector).find(".css_richtext.css_edit").each(function () {
        addParam($(this).attr("id"), $(this).children("div").html());
    });
    //If no attributes are ticked - allows reload to function correctly
    $(this.target_selector).find(".css_type_attributes.css_edit").each(function () {
        addParam($(this).attr("id"), "");
    });
};

x.ui.fieldEvent = function (input_elem, event_id) {
    var control = input_elem.attr("id");
    if (this.page && this.page.fields[control]) {
        this.page.fields[control].fieldEvent(event_id, input_elem.val());
    }
};


x.ui.main = x.ui.clone({
    id: "ui.main",
     target_selector: "div#css_body",
    message_selector: ".css_messages"
});

x.ui.main.setURL = function (url) {
    $("a#css_page_print").attr("href", "jsp/main.jsp?mode=renderPrint&" + url);
    $("a#css_page_excel").attr("href", "jsp/main.jsp?mode=renderExcel&" + url);
};

x.ui.main.setTitle = function (title) {
    $("span#css_page_header_title").html(title);
    document.title = title;
};

x.ui.main.setDescription = function (descr) {
    if (descr) {
        $("p#css_page_header_descr").text(descr);
        $("p#css_page_header_descr").removeClass("css_hide");
    } else {
        $("p#css_page_header_descr").addClass("css_hide");
    }
};

x.ui.main.setTabs = function (tabs) {
    var i,
        tab,
        that = this;
    $("ul#css_page_tabs").empty();
    for (i = 0; i < tabs.length; i += 1) {
        tab = tabs[i];
        $("ul#css_page_tabs").append("<li id='" + tab.id + "'" + ( this.page.page_tab === tab.id ? " class='active'" : "" ) + "><a>" + tab.label + "</a></li>");
    }
    if (tab) {        // at least one tab shown...
        $("ul#css_page_tabs").removeClass("css_hide");
        $("div#css_body").addClass("css_body_tabs_above");
    }
    $("ul#css_page_tabs > li").click(function (event) {
        that.page.moveToTab($(event.currentTarget).attr("id"));
//        y.loadLocal($(this), { page_tab: $(event.currentTarget).attr("id") });
    });
};

x.ui.main.setLinks = function (links) {
    var i,
        link,
        addl;
    $(".css_page_links").empty();
    for (i = 0; i < links.length; i += 1) {
        link = links[i];
        addl = "href='" + link.url + "'" + (link.target ? " target='" + link.target + "'" : "");
        if (link.task_info) {
            addl += " title='Task for " + link.task_info.assigned_user_name + (link.task_info.due_date ? " due on " + link.task_info.due_date : "") + "'";
        }
        addl += ">" + link.label + " " + this.arrow_entity + "</a>";
        $("div#css_left_bar .css_page_links").append("<a class='btn-primary btn btn-block' " + addl);
        $("div#css_top_bar  .css_page_links").append("<a class='btn-primary btn'           " + addl);
    }
};

x.ui.main.setNavLinks = function (search_page, prev_key, next_key) {
    if (search_page) {
        $("#css_nav_search").css("visibility", "visible").attr("href", "?page_id=" + search_page);
    } else {
        $("#css_nav_search").css("visibility", "hidden");
    }
    if (prev_key) {
        $("#css_nav_prev").css("visibility", "visible").attr("href", "?page_id=" + this.page.id + "&page_key=" + prev_key);
    } else {
        $("#css_nav_prev").css("visibility", "hidden");
    }
    if (next_key) {
        $("#css_nav_next").css("visibility", "visible").attr("href", "?page_id=" + this.page.id + "&page_key=" + next_key);
    } else {
        $("#css_nav_next").css("visibility", "hidden");
    }
};

x.ui.main.loadQueryString = function (query_string, opts) {
    var params;
    query_string = query_string.substr(query_string.indexOf("?") + 1);      // remove '?' and anything before it
    params = this.splitParams(query_string);
    params.page_id = params.page_id || this.default_page;
//    y.simple_url = "page_id=" + params.page_id;
//    if (params.page_key) {
//        y.simple_url += "&page_key=" + params.page_key;
//    }
    if ((params.page_id  !== y.url_params.page_id && typeof y.url_params.page_id === "string") ||
         params.page_key !== y.url_params.page_key) {
//            y.setPromptBeforeNavAway(false);
        this.expecting_unload = true;
        window.location = y.skin + "?" + query_string;
        return;
    }
    $(this.target_selector).addClass("css_load_target");
    $(this.target_selector).data("ui", this);
    this.load(params);
};

x.ui.main.getScrollElement = function () {
    return window;
};



x.ui.modal = x.ui.clone({
    id: "ui.modal",
     target_selector: "#css_modal",
    message_selector: "#css_modal .modal-messages"
});

x.ui.modal.setTitle = function (title) {
    $("#css_modal .modal-header > h3").html(title);
};

x.ui.modal.setLinks = function (links) {
    var i;
    $("#css_modal .modal-footer").empty();
    for (i = 0; page.links && i < page.links.length; i += 1) {
        $("#css_modal .modal-footer").append("<a class='btn' href='" + page.links[i].url + "'>" + page.links[i].label + "</a>");
    }
};

x.ui.modal.open = function () {
    $("#css_modal .modal-header > h3").html("Loading...");
    $("#css_modal .modal-messages"   ).empty();
    $("#css_modal .modal-body"       ).html("");
    $("#css_modal").modal('show');
};

x.ui.modal.close = function () {
    $("#css_modal").modal('hide');
};


//To show up in Chrome debugger...
//@ sourceURL=io/ui.js