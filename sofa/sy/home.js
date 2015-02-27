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
        anchor;
    x.log.functionStart("getSectionElement", this, arguments);
    if (!this.sctn_elem) {
        this.sctn_elem = this.parent_elem.addChild("div", this.id, this.getCSSClass());
        temp_title = this.title || this.generated_title;
        if (temp_title) {
            anchor = this.sctn_elem.addChild("h2", null, "css_section_title").addChild("a");
            if (this.section_heading_url) {
                anchor.attribute("href", this.section_heading_url);
            }
            anchor.addText(temp_title);
        }
        if (this.text) {
            this.sctn_elem.addChild("div", null, "css_section_text").addText(this.text, true);    // Valid XML content
        }
    }
    return this.sctn_elem;
};

x.sections.HomePageSection.getCSSClass = function (render_opts) {
    x.log.functionStart("getCSSClass", this, arguments);
    return x.sections.Section.getCSSClass.call(this) + " well";
};

x.sections.HomePageSection.renderLinkOrText = function (element, url, text, css_class, no_link_text) {
    x.log.functionStart("renderLinkOrText", this, arguments);
    if (this.owner.page.session.allowedURL(url)) {
        element = element.addChild("a", null, css_class);
        element.attribute("href", url);
        element.addText(text, true);
    } else if (no_link_text) {
        element.addText(no_link_text, true);
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
            this.getSectionElement();                // sets this.sctn_elem
            this.sctn_elem.addChild("br");
            this.sctn_elem.addChild("h5", null, null, sctn_title);
            this.tasks_title = sctn_title;
            this.tasks_ul_elem = null;
        }
        if (!this.tasks_ul_elem) {
            this.tasks_ul_elem = this.sctn_elem.addChild("ul", null, "nav nav-pills css_task_group");
        }
        if (curr_title !== prev_title) {
            if (task_array) {
                this.addTasksFromArray(this.tasks_ul_elem, prev_title, task_array);                
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
        this.addTasksFromArray(this.tasks_ul_elem, curr_title, task_array);                
    }
    return count;
};

x.sections.HomePageSection.addTasksFromArray = function (outer_ul_elem, curr_title, task_array) {
    var outer_li_elem,
        outer_a_elem,
        badge_elem,
        inner_ul_elem,
        inner_li_elem,
        inner_a_elem,
        count_underdue = 0,
        count_overdue = 0,
        i;
    x.log.functionStart("addTasksFromArray", this, arguments);
    for (i = 0; i < task_array.length; i += 1) {
        if (task_array[i].overdue) {
            count_overdue += 1;
        }
    }
    outer_li_elem = outer_ul_elem.addChild("li", null, "dropdown task-dropdown");
    outer_a_elem  = outer_li_elem.addChild("a" , null, "dropdown-toggle");
    outer_a_elem.attribute("data-toggle", "dropdown");
    outer_a_elem.attribute("href"       , "#");
    count_underdue = task_array.length - count_overdue;
    badge_elem = outer_a_elem.addChild("div", null, "css_task_badge");
    if (count_underdue > 0) {
        badge_elem.addChild("div", null, "badge badge-info"     , count_underdue.toFixed(0));
    }
    if (count_overdue  > 0) {
        badge_elem.addChild("div", null, "badge badge-important", count_overdue .toFixed(0));
    }
    outer_a_elem.addChild("span", null, "task-menu", curr_title);
    outer_a_elem.addChild("b", null, "caret task-caret");
//    outer_li_elem.addChild("b", null, null, curr_title);
    inner_ul_elem = outer_li_elem.addChild("ul", null, "dropdown-menu");
    for (i = 0; i < task_array.length && i < this.max_tasks_to_show_per_dropdown; i += 1) {
        inner_li_elem = inner_ul_elem.addChild("li");
        inner_a_elem = inner_li_elem.addChild("a", task_array[i].id);
        inner_a_elem.attribute("href", task_array[i].url);
        if (task_array[i].overdue) {
            inner_a_elem.addChild("span", null, "label label-important", "Overdue");
            inner_a_elem.addText(" ");
        }
        inner_a_elem.addText(task_array[i].title);
    }
    if (task_array.length >= this.max_tasks_to_show_per_dropdown) {
        inner_li_elem = inner_ul_elem.addChild("li");
        inner_a_elem = inner_li_elem.addChild("a");
        inner_a_elem.attribute("href", "index.html?page_id=ac_wf_tasks");
        inner_a_elem.addText("More...");
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