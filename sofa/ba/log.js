/*global x, java */
"use strict";

x.log = {

    levels : {
        trace :  0,
        into  :  1,
        debug :  2,
        info  :  4,
        warn  :  6,
        error :  8,
        fatal : 10
    },
    levels_text : [
        "TRACE", "INTO",
        "DEBUG", null,
        "INFO ", null,
        "WARN ", null,
        "ERROR", null,
        "FATAL", null
    ],

    overrides: [],                // for functionStart
    counters: {},

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
        var email;
        
        this.doLog(a, b, this.levels.fatal);
        
        //Send e-mail to RSL support
//        email = x.entities.ac_email.create({
//            to_addr: "rsl.support@rullion.co.uk",
//            subject: "URGENT - Fatal Error on " + x.app.id,
//            body: ((a ? a.toString() + ": " : "") + (b ? b.toString() : ""))
//        });
//        email.send();                        // send email w/o page success
    },

    doLog : function (a, b, level) {
        var str = (a ? a.toString() + ": " : "") + (b ? b.toString(): "");
        if (!this.counters[level]) {
            this.counters[level] = 0;
        }
        this.counters[level] += 1;
        if (this.checkLevel(level, str)) {
            this.printLine(this.levels_text[level] + ": " + str);
        }
    },

    checkLevel: function (level, str) {
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

    report: function (e, log_level) {
        log_level = log_level || this.levels.error;
        this.doLog(e.toString(), null, log_level);
        console.log(JSON.stringify(e));
//        if (e.getScriptStackTrace && e.getScriptStackTrace()) {
//            print(e.getScriptStackTrace());
//        } else if (e.javaException && e.javaException !== e) {
//            x.log.report(e.javaException, log_level);
//        } else if (e.rhinoException && e.rhinoException !== e) {
//            x.log.report(e.rhinoException, log_level);
//        } else if (e.printStackTrace) {
//            e.printStackTrace(x.log.logfile || java.lang.System.err);
//        }
        throw e;
    },
    
    printLine: function (str) {
        if (this.line_prefix === "time") {
            str = (new Date()).format("HH:mm:ss.SSS") + " " + str;
        } else if (this.line_prefix === "datetime") {
            str = (new Date()).format("yyyy-MM-dd HH:mm:ss.SSS") + " " + str;
        }
        console.log(str);
    },

    functionStart: function (funct, obj, args) {
        var str,
            i,
            j = 0;
        str = obj + "." + funct;
        if (this.checkLevel(this.levels.into, str)) {
            this.printLine("INTO : " + str + "(" + this.showArguments(args) + ")");
        }
    },

    showArguments: function (args) {
        var str   = "",
            delim = "",
            i;
        for (i = 0; args && i < args.length; i = i + 1) {
            str += delim + this.showArgument(args[i]);
            delim = ", ";
        }
        return str;
    },

    showArgument: function (arg) {
        if (typeof arg === "function") {
            return arg.name;
        } else if (typeof arg === "object") {
            return this.showObject(arg);
        } else if (typeof arg === "string") {
            return "'" + arg + "'";
        } else if (typeof arg === "number" || arg === "boolean") {
            return arg;
        } else {
            return typeof arg;
        }
    },

    showObject: function showObject(obj) {
        var str = "{ ",
            delim = "",
            i;
        if (!obj || typeof obj.hasOwnProperty !== "function") {
            return obj;
        }
        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                str += delim + i + ": '" + obj[i] + "'";
                delim = ", ";
            }
        }
        return str + " }";
    },

    resetCounters: function resetCounters() {
        this.counters = {};
    },

    printCounters: function printCounters() {
        var str = "",
            delim = "",
            level;
        for (level = 0; level <= 10; level += 2) {
            str += delim + this.levels_text[level] + ": " + (this.counters[level] || 0);
            delim = ", ";
        }
        this.printLine(str);
    }
};

x.log.level = x.log.levels.info;


//To show up in Chrome debugger...
//@ sourceURL=ba/log.js