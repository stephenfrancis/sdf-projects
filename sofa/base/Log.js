/*jslint node: true */
/*globals define */
"use strict";

define({

    id: "Log",

    levels : {
        trace :  0,
        debug :  2,
        info  :  4,
        warn  :  6,
        error :  8,
        fatal : 10
    },

    levels_text : [
        "TRACE", null,
        "DEBUG", null,
        "INFO ", null,
        "WARN ", null,
        "ERROR", null,
        "FATAL", null
    ],

    level : 2,          // debug

    overrides : [],

    // moving from arguments (str) to (this, str)...
    trace : function (a, b) {
        this.doLog(a, b, this.levels.trace);
    },

    debug : function (a, b) {
        this.doLog(a, b, this.levels.debug);
    },

    info  : function (a, b) {
        this.doLog(a, b, this.levels.info );
    },

    warn  : function (a, b) {
        this.doLog(a, b, this.levels.warn );
    },

    error : function (a, b) {
        this.doLog(a, b, this.levels.error);
    },

    fatal : function (a, b) {
        this.doLog(a, b, this.levels.fatal);
    },

    doLog : function (a, b, level) {
        var str = a + ": " + b;
        if (this.checkLevel(level, str)) {
            console.log(this.levels_text[level] + ": " + str);
        }
    },

    checkLevel : function (level, str) {
        var print_line,
            i;
        print_line = (level >= this.level);
        for (i = 0; !print_line && str && i < this.overrides.length; i += 1) {
            if (str.match(this.overrides[i].regex)) {
                print_line = (this.overrides[i].level >= this.level);
            }
        }
        return print_line;
    },

    report : function (e, log_level) {
        log_level = log_level || this.levels.error;
        this.doLog(e.toString(), null, log_level);
        console.log(JSON.stringify(e));
        throw e;
    }

});


//To show up in Chrome debugger...
//@ sourceURL=base/Log.js