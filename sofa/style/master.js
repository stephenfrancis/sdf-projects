/*global  */
"use strict";



x.session = x.ac.Session.clone({ user_id: "francis" });

x.log.level = x.log.levels.debug;

var y = {};

y.logged_in = false;
y.debug = false;
y.loaded = {};
y.guest_logins = 0;
y.expecting_unload = false;             // set true when deliberately navigating away from current page
y.leaving_trans_page = false;           // set true when deliberately navigating away from a transactional page


/*
 * Outstanding design questions / improvements:
 * - refactor y.login(), loadSuccess
 * - use of y.simple_url in y.render()
 */

/* Custom Event Inventory
 * deactivate  - prevent user from using any controls, visually indicate that the page is non-operational for the moment
 * activate    - return controls and page to operational state again
 * initialize  - initialize newly-added dynamic page content
 * loadSuccess - main.jsp?mode=post returns successfully
 * loadError   - main.jsp?mode=post returns with a failure
 */ 


/*-----------------------------------------------Initiation Routine-------------------------------------------------------------*/
$(document).ready(function() {
    y.url_params = y.queryParams();
    y.url_params.page_id = y.url_params.page_id || y.default_page;
    x.ui.main.loadQueryString(location.search);
});

/*----------------------------------------------------------Page Loads----------------------------------------------------------*/


y.queryParams = function () {
    return x.ui.splitParams(window.location.search.substring(1));
};


/*--------------------------------------------------------Parameters------------------------------------------------------------*/

/*------------------------------------------------------------URL---------------------------------------------------------------*/
y.simpleURL = function (arg, default_page) {
    var page_id;
    if (!arg) {
        arg = y.queryParams();
    }
    page_id = arg.page_id;
    if (!page_id && default_page) {
        page_id = default_page;
    }
    return "page_id=" + page_id + (arg.page_key ? "&page_key=" + arg.page_key : "");
};

y.getAjaxURL = function (path, query_string) {
    var out = path;
    if (y.jsessionid) {
        out += ";jsessionid=" + y.jsessionid;
    }
    if (query_string) {
        out += "?" + query_string;
    }
    return out;
};

y.getRedirectURL = function (data_back, query_string) {
    var skin = (data_back && data_back.page && data_back.page.skin) || y.skin;
    if (data_back && data_back.page && data_back.page.redirect_url) {
        query_string = data_back.page.redirect_url;
    }
    if (typeof query_string !== "string") {
        query_string = "";
    }
    if (query_string.indexOf(".html") > -1) {
        return query_string;
    }
    if (query_string && query_string.indexOf("?") !== 0) {
        query_string = "?" + query_string;
    }
    return skin + query_string;
};

// needed? why not just window.location = url?
y.handleURL = function (url) {
    var i,
        skin,
        query_str;
    i = url.indexOf("?");
    if (i > -1) {
        skin = url.substr(0, i);
        query_str = url.substr(i + 1);
    } else {
        skin = url;
    }
    if (skin === y.skin) {
        y.loadQueryString($("div#css_body"), query_str, { load_mode: "main" });
    } else {
        window.location = url;
    }
};

/*---------------------------------------------------------Unload---------------------------------------------------------------*/
//y.setPromptBeforeNavAway = function (on) {
//    window.onbeforeunload = (on) ? function(e) { return "Do you really want to navigate away from this page?"; } : null;
//};
// TODO - next and previous browser buttons...
//CL - No way to detect clicks on the forward or back buttons or the URL the user will be taken to upon clicking them
$(window).bind("beforeunload", function () {
//    if (!y.expecting_unload) {          // should only be due to closing the browser window
//        return "Closing the browser window will log you out of the application";
    if (!y.expecting_unload && y.page && y.page.prompt_nav_away) { //This message covers refresh closing window/tab, back/forward & refresh
        return "Do you really want to navigate away from this page?";
    } else if (y.page && y.page.prompt_nav_away && !y.leaving_trans_page) {
        return "Navigating away from this page will mean losing any data changes you've entered";
    }
});


y.newBox = function (container, data, event) {
    $(container).popover({
        content: data, html: true, placement: "bottom"
    }).popover("show");
};



/*----------------------------------------------------URL Click Handler---------------------------------------------------------*/
//Click handlers for elements with url attribute
$(document).on("click", "[url]", function (event) {
    // Avoid redirecting if clicked an anchor or button...
    if ($(event.target).is("a")    || $(event.target).parents("a")   .length > 0) {
        return;
    }
    if ($(event.target).is(".btn") || $(event.target).parents(".btn").length > 0) {
        return;
    }

    y.expecting_unload = true;
    window.location = $(this).attr("url");
//    y.handleURL($(this).attr("url"));
});

$(document).on("click", "a[href]", function () {
    y.expecting_unload = true;
});

$(document).on("click", ".css_cmd", function (event) {
    if (!this.onclick || ( $(this).is("a") && this.href )) {         // imgs don't have hrefs
        x.ui.getLocal($(this)).load({ page_button: $(this).attr("id") });
//      y.loadLocal($(this), { page_button: $(this).attr("id") });
  }
});

/*-------------------------------------------------Main Button Click Handler----------------------------------------------------*/

/*---------------------submit on enter key if .css_button_main specified - deactivated for the moment---------------------------*/
$(document).on("keyup", function (event) {
    var node = event.target || event.srcElement,
        button;
    y.last_key_pressed = event.keyCode;
    if ((event.keyCode === 13) && node && ($(node).attr("type") === "text" || $(node).attr("type") === "password"))  {
        button = $(this).parents("form").find(".css_button_main");
        if (button.length === 0) {
            button = $(".css_button_main");
        }
        if (button.length > 0) {
            button.click();
        }
    }
    return false;
});

/*------------------------------------------------Universal Search Box----------------------------------------------------------*/
y.unisrch = function (selector) {
    var query_string;
    $(selector).typeahead({
        minLength: 2,        // min chars typed to trigger typeahead
        source: function (query, process) {
            $.get(y.getAjaxURL("jsp/main.jsp", "mode=unisrch&q=" + query), function (data) {
                var inp = data.split("\n"),
                    out = [],
                    res,
                    str,
                    i;
                query_string = {};
                for (i = 0; i < inp.length; i += 1) {
                    if (inp[i]) {
                        res = inp[i].split("|");
                        if (res.length > 3) {
                            str = res[3] + " [" + res[0] + "] " + res[1];
                            query_string[str] = "?page_id=" + res[2] + "&page_key=" + res[0];
                            out.push(str);
                        }
                    }
                }
                process(out);
            });
        },
        updater: function (item) {
            if (query_string[item]) {
                y.loadQueryString($("div#css_body"), query_string[item], { load_mode: "main" });
            }
        }
    });
};

/*------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------Fields---------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------------------------------*/

/*--------------------------------------------------------Field Event Handler---------------------------------------------------*/
//Target Input Focus
//$(document).on("focus", ":input", function (event) {
//    y.fieldFocus(this, event);
//});

//Target Input Blur
$(document).on("blur", ":input", function (event) {
    x.ui.getLocal($(this)).fieldEvent($(this), "blur");
});

//Target Input Keydown to blur on escape key press
$(document).on("keydown", ":input", function (event) {
    if (event.which === 27) {
        $(this).blur();
    }
});

//Prevent enter to submit behaviour in IE
$(document).on("keydown", "div.css_edit > input", function (e) {
    if (e.which === 13) {
        e.preventDefault();
    }
});


/*-----------------------------------------------------Modal--------------------------------------------------------------------*/
//Click handlers to load a modal
$(document).on("click", "a[data-toggle='modal']", function (event) {
    var url = $(this).attr("href");
    x.ui.loadQueryString(url);
    return false;
});
$(document).on("click", "a.css_open_in_modal", function (event) {
    var url = $(this).attr("href");
    x.ui.loadQueryString(url);
    return false;
});


/*------------------------------------------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------Field Types------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------------------------------*/

/*-------------------------------------------------------Date Field-------------------------------------------------------------*/

$(document).on("initialize", function (event, target, opts) {
    target.find("div.css_edit.css_type_date").each(function () {
        y.checkStyle( "/rsl_shared/style/jquery-ui-1.10.2.custom/css/smoothness/jquery-ui-1.10.2.custom.css");
        y.checkScript("/rsl_shared/style/jquery-ui-1.10.2.custom/js/jquery-ui-1.10.2.custom.min.js");
        $(this).find(":input").datepicker({
    //      showOn: "button",
    //      buttonImage: "/rsl_shared/style/Axialis/Png/16x16/Calendar.png",
    //      buttonImageOnly: true,
            dateFormat: "dd/mm/y",          // 2-digit year
            shortYearCutoff: +50
        });

        var json_obj = y.getRenderData($(this));
        if (json_obj.input_mask) {
            y.checkScript("/rsl_shared/style/jquery.maskedinput/jquery.maskedinput.min.js");
            $(this).find(":input").mask(json_obj.input_mask);
        }
    });
});

/*----------------------------------------------------Date/Time-----------------------------------------------------------------*/

$(document).on("initialize", function (event, target, opts) {
    target.find("div.css_edit.css_type_datetime").each(function () {
        var field = $(this),
            json_obj = y.getRenderData(field),
            input1 = field.find(":input:eq(0)"),
            input2 = field.find(":input:eq(1)");

        y.checkStyle( "/rsl_shared/style/jquery-ui-1.10.2.custom/css/smoothness/jquery-ui-1.10.2.custom.css");
        y.checkScript("/rsl_shared/style/jquery-ui-1.10.2.custom/js/jquery-ui-1.10.2.custom.min.js");
        input1.datepicker({
        //  showOn: "button",
        //  buttonImage: "/rsl_shared/style/Axialis/Png/16x16/Calendar.png",
        //  buttonImageOnly: true,
            dateFormat: "dd/mm/y",          // 2-digit year
            shortYearCutoff: +50
        });
        // An array would be better
        if (json_obj.input_mask1) {
            y.checkScript("/rsl_shared/style/jquery.maskedinput/jquery.maskedinput.min.js");
            input1.mask(json_obj.input_mask1);
        }
        if (json_obj.input_mask2) {
            y.checkScript("/rsl_shared/style/jquery.maskedinput/jquery.maskedinput.min.js");
            input2.mask(json_obj.input_mask2);
        }
    });
});

/*--------------------------------------------------------Dotgraph--------------------------------------------------------------*/

$(document).on("initialize", function (event, target, opts) {
    target.find("div.css_edit.css_type_dotgraph").each(function () {
        var field = $(this);
        y.checkScript("/rsl_shared/style/viz/viz.js");
        function drawGraph() {
            var text = field.children("textarea").val();
            if (text) {
                console.log("drawGraph: " + text);
                /*jslint newcap: true */
                field.children("div.css_diagram").html(Viz(text, "svg"));
            }
        }
        drawGraph();
        field.children("textarea").blur(function () {
            drawGraph();
        });
    });
});

$(document).on("initialize", function (event, target, opts) {
    target.find(".css_type_dotgraph").each(function () {
        var element,
            text;
        y.checkScript("/rsl_shared/style/viz/viz.js");
        element = $(this).children("div.css_disp");
        text = element.text();
        /*jslint newcap: true */
        element.html(Viz(text, "svg"));
    });
});

/*----------------------------------------------Reference/Combo (Autocompleter)-------------------------------------------------*/

$(document).on("initialize", function (event, target, opts) {
    target.find("div.css_edit.css_type_reference").each(function () {
        if ($(this).children("input").length === 0) {
            return;
        }

        var id,
            map = {},
            field        = $(this),
            field_value  = field.children("input[type='hidden']"),
            input_cntrl  = field.children("input[type='text']"),
            input_value  = input_cntrl.val(),
            combo        = field.hasClass("css_combo"),
            max_rows,
            min_length,
            modified = false;

        id         = input_cntrl.attr( "id" );
        max_rows   = field.data("render_data").autocompleter_max_rows   || 10;
        min_length = field.data("render_data").autocompleter_min_length || 2;

        function setValue(val) {
        //    console.log("setValue(): " + val);
            if (input_value === val) {
                return;
            }
            modified = true;
            if (map[val]) {         // picked a value from the list
                field_value.val((combo ? "R" : "") + map[val]);
                input_value = val;

            } else {                // free-text
                if (combo && val) {
                    field_value.val("F" + val);
                    input_cntrl.val(val);
                    input_value = val;
                } else {
                    field_value.val("");
                    input_cntrl.val("");
                    input_value = "";
                }
            }

        }

        function afterBlur() {
//            var button = $(".css_button_main");
        //    console.log("afterBlur(), modified: " + modified);
            if (modified) {
                modified = false;
                // Click main button if present - TODO SDF 11/06/14 - why??? all we've done is change a field value!
//                if (button.length > 0) {
//                    button.click();
//                } else 
                if (field.hasClass("css_reload")) {
                    y.loadLocal(field, { page_button: field_value.attr("name") });
                }
            }
        }

        input_cntrl.typeahead({
            minLength: min_length,       // min chars typed to trigger typeahead
            items : max_rows,
            source: function (query, process) {
                $.ajax({
                    dataType    : "json",
                    url         : y.getAjaxURL("jsp/main.jsp"),
                    data        : {
                                    "mode"  : "autocompleter",
                                    "q"     : query,
                                    "field" : id
                                  },
                    beforeSend: function (xhr) {        // IOS6 fix
                        xhr.setRequestHeader('If-Modified-Since', '');
                    },
                    success: function (data, status_text) {
                        var out  = [];
                        //create typeahead dataset
                        $.each(data.results, function (i, obj) {
                            out.push(obj.value);
                            /*jslint nomen: true */
                            map[obj.value] = obj._key;
                        });
                        process(out);
                        //add extra row in case of more results
                        if (data.results.length < data.meta.found_rows) {
                            field.children('ul.typeahead').append(
                                '<li style="text-align:center;">[' + data.results.length + ' of ' + data.meta.found_rows + ']</li>');
                        }
                    }
                });
            },
            updater: function (item) {
        //        console.log("updater: " + item);
                setValue(item);
                return item;
            }
        });
        input_cntrl.focus(function (event2) {
            input_value = input_cntrl.val();
        });
        // If the item is chosen with the mouse, blur event fires BEFORE updater, but with keyboard it is opposite way around
        // Worse, when choosing with mouse, it seems we cannot tell at blur that an updater call is coming afterwards
        // Hack solution uses setTimeout() to execute after updater
        input_cntrl.blur(function (event2) {
        //    console.log("blur: " + input_cntrl.val());
            setValue(input_cntrl.val());
            setTimeout(afterBlur, 500);
        });
    });
});

/*-----------------------------------------------------File Upload Field-------------------------------------------------------*/
$(document).on("initialize", function (event, target, opts) {
    target.find("div.css_edit.css_type_file").each(function () {
        var field = $(this),
            oInput,
            control        = field.children(":input"   ).attr("id"),
            existing_id    = field.children("span.val" ).text(),
            existing_title = field.children("span.text").text();

        y.checkStyle( "/rsl_shared/style/jquery.fileuploader/fileuploader.css");
        y.checkScript("/rsl_shared/style/jquery.fileuploader/fileuploader.js");
        //y.checkStyle("/rsl_shared/style/jquery.fineuploader-3.3.0/fineuploader-3.3.0.css");
        //y.checkScript("/rsl_shared/style/jquery.fineuploader-3.3.0/jquery.fineuploader-3.3.0.js");
        /*
        * Future upgrade:
        $(this).fineUploader({
            request: {
                endpoint: "jsp/main.jsp?mode=fileup&"
            }
        }).on("complete", function(event, id, name, responseJSON) {
            oInput.val(responseJSON.file_id);
            y.fieldBlur(oInput);        // put the inline-help message back
        });
        */
        function addFileRemover() {
            //Add an 'X' button to remove file id val - put me in a function
            field.children("div.qq-uploader").children('ul.qq-upload-list').children("li.qq-upload-success").each(function() {
                var x_span = $('<span style="color: red; font-weight: bold; font-size: 18px; cursor:pointer;">&times;</span>');
                x_span.click(function () {
                    oInput.val("");
                    $(this).parent().remove();
                    y.fieldBlur(oInput);
                });
                $(this).append(x_span);
            });
        }

        new qq.FileUploader({
            element: field[0],
            action: y.getAjaxURL("jsp/main.jsp", "mode=fileup"),
            allowedExtensions: field.children("span.allowed_extensions").text().split(","),
            onSubmit: function (id, file_name) {
                field.find("ul.qq-upload-list").empty();
                oInput.val("");                 // allow user to clear the field
                //5174 - Deactivate page during file upload
                $("div#css_body").trigger('deactivate', [$("div#css_body"), { load_mode: "main" }]);
            },
            onCancel : function (id, file_name) {
                //5174 - Reactivate page after upload cancellation
                $("div#css_body").trigger(  'activate', [$("div#css_body"), { load_mode: "main" }]);
            },
            onComplete: function (id, sFileName, responseJSON) {
                var file_id = responseJSON.file_id;
                oInput.val(file_id);
                y.fieldBlur(oInput);        // put the inline-help message back
        //          oSpan.find( "$(this).qq-upload-button > span" ).text( "Upload a replacement file" );
        //          var fileURL = "jsp/main.jsp?mode=filedown&id=" + responseJSON.file_id;
        //          oSpan.find( "span.qq-upload-file > a").attr("href", fileURL );
                addFileRemover();

                //5174 - Reactivate page after upload
                $("div#css_body").trigger('activate',[$("div#css_body"), { load_mode: "main" }]);
            }
        });

        field.append("<input type='hidden' name='" + control + "' value='" + existing_id + "' />");
        oInput = field.children(":input[type='hidden']");
        if (existing_title) {
            field.find("ul.qq-upload-list").append(
                "<li class='qq-upload-success'><span class='qq-upload-file'>" +
                "<a target='_blank' href='" + y.getAjaxURL("file/" + existing_title, "mode=filedown&id=" +
                existing_id) + "'>" + existing_title + "</a></span></li>");
        //      "<a href='javascript:y.remoteModal(\"jsp/main.jsp?mode=context&page_id=ac_file_context&page_key=" +
        //      existing_id + "\")'>" + existing_title + "</a></span></li>");
            addFileRemover();
        }
        y.fieldBlur(oInput);        // put the inline-help message back
    });
});

/*-----------------------------------------------Richtext (aloha) fields--------------------------------------------------------*/
$(document).on("initialize", function (event, target, opts) {
    target.find("div.css_edit.css_richtext").each(function () {
        var textarea;

        textarea = $(this).children("div")[0];
        if (!y.aloha_activated) {
            Aloha = window.Aloha || {};
            Aloha.settings = Aloha.settings || {};
            Aloha.settings.locale = 'en';
            Aloha.settings.sidebar = { disabled: true };
            // Restore the global $ and jQuery variables of your project's jQuery
//            Aloha.settings.jQuery = window.jQuery;
    //        Aloha.settings.jQuery = window.jQuery.noConflict(true);
            Aloha.settings.plugins = {
                load: "common/ui, common/format, common/list, common/link, common/paste, common/table, common/contenthandler, common/image"
            };
            Aloha.settings.contentHandler = {
                insertHtml: [ 'word', 'generic', 'oembed', 'sanitize' ],
                initEditable: [ 'sanitize' ],
                getContents: [ 'blockelement', 'sanitize', 'basic' ],
                sanitize: 'relaxed' // relaxed, restricted, basic,
            };
    //        Aloha.settings.plugins.image = {
    //            config: [ 'img' ], // enable the plugin
    //            config: { ui: { reset: true, resize: false, crop: false, resizeable: false } }
    //        };
            y.checkStyle( "/rsl_shared/style/alohaeditor-0.25.2/aloha/css/aloha.css");
    //      y.checkScript("/rsl_shared/style/alohaeditor-0.25.2/aloha/lib/vendor/jquery-1.7.2.js");
            y.checkScript("/rsl_shared/style/alohaeditor-0.25.2/aloha/lib/require.js");
            y.checkScript("/rsl_shared/style/alohaeditor-0.25.2/aloha/lib/aloha-full.min.js");
            y.aloha_activated = true;
        }
        Aloha.ready(function() {
//          $ = Aloha.jQuery;
//          $(textarea).aloha();
          Aloha.jQuery(textarea).aloha();
      });

        $(textarea).blur(function () {
            y.fieldBlur(textarea);
        });
        //Append Mandatory span tags to parent - Move to Server side??
    //  $(this).children('span.help-inline').each(function() {
    //      $(this).parent().parent().append( $('<div class="css_edit error" style="margin-left: 180px;"> </div>').append($(this)) );
    //  });
    });
});

/*---------------------------------------------------------Search Filters-------------------------------------------------------*/
$(document).on("initialize", function (event, target, opts) {
    target.find("table.css_search_filters").each(function() {
        var tr = $(this).find("tbody > tr");
        function adjustOperator(input) {
            var oper_field,
                json_obj;
            tr = $(input).parent().parent().parent();
            oper_field = tr.find("td:eq(2) > div > :input");
            if ($(input).val()) {
                if (oper_field.val() === "") {
                    json_obj = tr.find("td:eq(3) > div").data("render_data");
                    if (json_obj && json_obj.auto_search_oper) {
                        oper_field.val(json_obj.auto_search_oper);
                    }
                }
            } else {
                oper_field.val("");
            }
        }
        function adjustBetween(input) {
            tr = $(input).parent().parent().parent();
            if ($(input).val() === "BT") {
                tr.find("td:eq(4)").removeClass("css_hide");
            } else {
                tr.find("td:eq(4)").addClass("css_hide");
            }
        }
        tr.find("td:eq(3) > div > :input").keyup(  function() { adjustOperator(this); });
        tr.find("td:eq(3) > div > :input").change( function() { adjustOperator(this); });
        tr.find("td:eq(2) > div > :input").change( function() { adjustBetween(this); });
        tr.find("td:eq(2) > div > :input").each(   function() { adjustBetween(this); });
    });
});

/*------------------------------------------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------Sections Types-------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------Hierarchy----------------------------------------------------------*/
$(document).on("initialize", function (event, target, opts) {
    target.find(".css_section_Hierarchy").each(function() {
        $(this).find("li").not(":has(ul)").children("a.css_hier_ctrl").remove();
    });
});
$(document).on("click", "div.css_section_Hierarchy ul > li > a.css_hier_ctrl", function () {
    var parent_li = $(this).parent();
    if (parent_li.hasClass("css_expanded")) {
        parent_li.removeClass("css_expanded");
        parent_li.   addClass("css_contracted");
    } else {
        parent_li.   addClass("css_expanded");
        parent_li.removeClass("css_contracted");
    }
});

////the following is from: http://stackoverflow.com/questions/447789/jquery-expanding-collapsing-lists
$(document).on("initialize", function (event, target, opts) {
    target.find(".css_tree_table_layout").each(function () {
        $(this).find("tr").each(function () {
            var inset = 0,
                td_elem = null;
            $(this).find("td").each(function () {
                var text_content = $(this).text();
                if (!td_elem) {
                    if (text_content) {
                        td_elem = this;
                    } else {
                        inset += 1;
                    }
                }
            });
            $(this).data("inset", inset);
        });
    });
});
$(document).on("click", "table.css_tree_table_layout a.css_hier_ctrl", function (event) {
    var tr_elem = $(this).parent().parent(),
        keep_going = true,
        inset = tr_elem.data("inset"),
        expand = tr_elem.hasClass("css_contracted");

    if (expand) {
        tr_elem.   addClass("css_expanded");
        tr_elem.removeClass("css_contracted");
    } else {
        tr_elem.removeClass("css_expanded");
        tr_elem.   addClass("css_contracted");
    }
    tr_elem.nextAll().each(function() {
        if (!keep_going) {
            return;
        }
        if ($(this).data("inset") > inset) {
            $(this).css("display", expand ? "table-row" : "none");
        } else {
            keep_going = false;
        }
    });
});

/*------------------------------------------------------------Chart-------------------------------------------------------------*/
$(document).on("initialize", function (event, target, opts) {
    target.find(".css_section_Chart").each(function() {
        var json,
            obj,
            new_obj;

        json = $(this).find("span.css_hide").text();
        obj  = $.parseJSON(json);
        if (obj.library === "flot") {
            y.checkScript("/rsl_shared/style/jquery.flot/jquery.flot.min.js");
            y.checkScript("/rsl_shared/style/jquery.flot/jquery.flot.stack.min.js");
            $(this).find("div.css_chart").css("width" , obj.options.width  || "900px");
            $(this).find("div.css_chart").css("height", obj.options.height || "400px");
            $.plot($(this).find("div.css_chart"), obj.series, obj.options);
        } else if (obj.library === "highcharts") {
            y.checkScript("/rsl_shared/style/highcharts-3.0.0/highcharts.js");
            y.checkScript("/rsl_shared/style/highcharts-3.0.0/highcharts-more.js");
            y.checkScript("/rsl_shared/style/highcharts-3.0.0/exporting.js");
            y.checkScript("style/highcharts_defaults.js");
            new_obj = obj.options;
            new_obj.series = obj.series;
            new_obj.chart.renderTo = "css_chart_" + $(this).attr("id");
            new Highcharts.Chart(new_obj);
        //} else if (obj.library === "google") {
            // TODO
        }
    });
});


/*-----------------------------------------------------Column Chooser-----------------------------------------------------------*/

y.listColumnChooser = function (span) {
    var col_chooser = $(span).parent().children("div.css_list_choose_cols");
    col_chooser.toggle('fast');
};


y.filterColumnButtons = function (button_container, filter_text) {
    var pattern = new RegExp(filter_text, "i");
    button_container.children("button").each(function () {
        if (pattern.test($(this).text())) {
            $(this).removeClass("css_hide");
        } else {
            $(this).   addClass("css_hide");
        }
    });
};

$(document).on("keyup", ".css_list_cols_filter > :input", function () {
    y.filterColumnButtons($(this).parent().parent(), $(this).val());
});

$(document).on("initialize", function (event) {
    $(".css_list_choose_cols").each(function () {
        y.filterColumnButtons($(this), $(this).find(".css_list_cols_filter > :input").val());
    });
});
/*----------------------------------------------------------Misc----------------------------------------------------------------*/

y.toggle = function (selector) {
    $(selector).toggle('fast');
};

y.updateDate = function () {
    y.checkScript("/rsl_shared/style/mattkruse.com/date.js");
    var sDate = formatDate(new Date(), "E d NNN yyyy HH:mm:ss");
    $("div#css_footer_datetime").text(sDate);
    setTimeout(y.updateDate, 1000);
};
