/*global x, java */
"use strict";

x.pages.home = x.Page.clone({
    id              : "home",
    title           : "Home",
    icon            : "style/Axialis/Png/24x24/Home.png",
    security        : { all: true },
});
x.pages.home.events.add("setupEnd", "setupEnd", function () {
    this.full_title = "Welcome, " + this.session.nice_name;
});


x.pages.guest_home = x.Page.clone({
    id              : "guest_home",
    title           : "Guest Home",
    icon            : "style/Axialis/Png/24x24/Home.png",
    security        : { all: false, guest: true },
    skin            : "guest.html"
});

x.pages.guest_home.sections.addAll([
    { id: "main"  , type: "Section", title: "Welcome!", text: "Welcome to myRecruiter" }
]);

x.sections.HomePageSection = x.sections.Section.clone({
    id: "HomePageSection",
    tb_span: 3,
    hide_section_if_empty: true,
    max_tasks_to_show_per_dropdown: 10
});

x.sections.HomePageSection.getSectionElement = function (render_opts) {
    var temp_title,
        anchor_elmt;
    x.log.functionStart("getSectionElement", this, arguments);
    if (!this.sctn_elmt) {
        this.sctn_elmt = this.parent_elmt.makeElement("div", this.getCSSClass(), this.id);
        temp_title = this.title || this.generated_title;
        if (temp_title) {
            anchor_elmt = this.sctn_elmt.makeElement("h2", "css_section_title").makeElement("a");
            if (this.section_heading_url) {
                anchor_elmt.attr("href", this.section_heading_url);
            }
            anchor_elmt.text(temp_title);
        }
        if (this.text) {
            this.sctn_elmt.makeElement("div", "css_section_text").html(this.text);    // Valid XML content
        }
    }
    return this.sctn_elmt;
};

x.sections.HomePageSection.getCSSClass = function (render_opts) {
    x.log.functionStart("getCSSClass", this, arguments);
    return x.sections.Section.getCSSClass.call(this) + " well";
};

x.sections.HomePageSection.renderLinkOrText = function (parent_elmt, url, text, css_class, no_link_text) {
    x.log.functionStart("renderLinkOrText", this, arguments);
    if (this.owner.page.session.allowedURL(url)) {
        parent_elmt.makeElement("a", css_class)
            .attr("href", url)
            .html(text);
    } else if (no_link_text) {
        parent_elmt.html(no_link_text);
    }
};

x.sections.HomePageSection.addAssignedWorkflowTasks = function (user_id, wf_type_id) {
    var query;
    x.log.functionStart("addAssignedWorkflowTasks", this, arguments);
    query = x.entities.ac_wf_inst_node.getQuery();
    query.addCondition({ column: "A.assigned_user", operator: "=", value: user_id });
    query.addCondition({ column: "B.wf_type"      , operator: "=", value: wf_type_id });
    return this.addWorkflowTasks(query, "Tasks Assigned to You");
};

x.sections.HomePageSection.addDelegatedWorkflowTasks = function (sql_condition, wf_type_id) {
    var query;
    x.log.functionStart("addDelegatedWorkflowTasks", this, arguments);
    if (!sql_condition) {
        return 0;
    }
    query = x.entities.ac_wf_inst_node.getQuery();
    query.addCondition({ full_condition: "A.assigned_user in (" + sql_condition + ") and (instr(ifnull(A.attributes, ''), 'PD') = 0)" });
    query.addCondition({ column: "B.wf_type", operator: "=", value: wf_type_id });
    return this.addWorkflowTasks(query, "Tasks Delegated to You");
};

x.sections.HomePageSection.addWorkflowTasks = function (query, sctn_title) {
    var today,
        task_obj,
        curr_title,
        prev_title,
        due_date,
        task_array,
        count = 0;
    x.log.functionStart("addWorkflowTasks", this, arguments);
    today = Date.parse("today");
    query.addTable({ table: "ac_wf_inst", join_cond: "?._key=A.wf_inst" }).addColumn({ name: "title" });
    query.getColumn("A.title").sortTop();
    query.addCondition({ column: "A.status"    , operator: "=" , value: "A" });        // active nodes
    query.addCondition({ column: "A.attributes", operator: "CO", value: "ST" });    // show in taskbar
    while (query.next()) {
        curr_title = query.getColumn("A.title").get();
        if (this.tasks_title !== sctn_title) {
            this.getSectionElement();                // sets this.sctn_elmt
            this.sctn_elmt.makeElement("br");
            this.sctn_elmt.makeElement("h5").text(sctn_title);
            this.tasks_title = sctn_title;
            this.tasks_ul_elmt = null;
        }
        if (!this.tasks_ul_elmt) {
            this.tasks_ul_elmt = this.sctn_elmt.makeElement("ul", "nav nav-pills css_task_group");
        }
        if (curr_title !== prev_title) {
            if (task_array) {
                this.addTasksFromArray(this.tasks_ul_elmt, prev_title, task_array);                
            }
            prev_title = curr_title;
            task_array = [];
        }
        task_obj = {
            id   : query.getColumn("A._key"      ).get(),
            title: query.getColumn("B.title"     ).get(),
//            url  : query.getColumn("A.simple_url").get()
            url  : "index.html?page_id=" + query.getColumn("A.page"    ).get()
        };
        if (query.getColumn("A.page_key").get()) {
            task_obj.url += "&page_key=" + query.getColumn("A.page_key").get();
        }
        task_array.push(task_obj);
        due_date = query.getColumn("A.due_date").get();
        task_obj.overdue = (due_date && due_date < today);
        count += 1;
    }
    query.reset();
    if (task_array) {
        this.addTasksFromArray(this.tasks_ul_elmt, curr_title, task_array);                
    }
    return count;
};

x.sections.HomePageSection.addTasksFromArray = function (outer_ul_elmt, curr_title, task_array) {
    var outer_li_elmt,
        outer_a_elmt,
        badge_elmt,
        inner_ul_elmt,
        inner_li_elmt,
        inner_a_elmt,
        count_underdue = 0,
        count_overdue = 0,
        i;
    x.log.functionStart("addTasksFromArray", this, arguments);
    for (i = 0; i < task_array.length; i += 1) {
        if (task_array[i].overdue) {
            count_overdue += 1;
        }
    }
    outer_li_elmt = outer_ul_elmt.makeElement("li", "dropdown task-dropdown");
    outer_a_elmt  = outer_li_elmt.makeElement("a", "dropdown-toggle");
    outer_a_elmt.attr("data-toggle", "dropdown");
    outer_a_elmt.attr("href"       , "#");
    count_underdue = task_array.length - count_overdue;
    badge_elmt = outer_a_elmt.makeElement("div", "css_task_badge");
    if (count_underdue > 0) {
        badge_elmt.makeElement("div", "badge badge-info"     ).text(count_underdue.toFixed(0));
    }
    if (count_overdue  > 0) {
        badge_elmt.makeElement("div", "badge badge-important").text(count_overdue .toFixed(0));
    }
    outer_a_elmt.makeElement("span", "task-menu").text(curr_title);
    outer_a_elmt.makeElement("b", "caret task-caret");

    inner_ul_elmt = outer_li_elmt.makeElement("ul", "dropdown-menu");
    for (i = 0; i < task_array.length && i < this.max_tasks_to_show_per_dropdown; i += 1) {
        inner_li_elmt = inner_ul_elmt.makeElement("li");
        inner_a_elmt  = inner_li_elmt.makeElement("a", null, task_array[i].id);
        inner_a_elmt.attr("href", task_array[i].url);
        if (task_array[i].overdue) {
            inner_a_elmt.makeElement("span", "label label-important").text("Overdue ");
        }
        inner_a_elmt.text(task_array[i].title);
    }
    if (task_array.length >= this.max_tasks_to_show_per_dropdown) {
        inner_li_elmt = inner_ul_elmt.makeElement("li");
        inner_a_elmt  = inner_li_elmt.makeElement("a");
        inner_a_elmt.attr("href", "index.html?page_id=ac_wf_tasks");
        inner_a_elmt.text("More...");
    }
};

x.sections.HomePageSection.replaceLastCommaWithAnd = function (str) {
    var index;
    x.log.functionStart("replaceLastCommaWithAnd", this, arguments);
    index = str.lastIndexOf(",");
    if (index > -1) {
        str = str.substr(0, index) + " and " + str.substr(index + 1);
    }
    return str;
};

//To show up in Chrome debugger...
//@ sourceURL=sy/home.js