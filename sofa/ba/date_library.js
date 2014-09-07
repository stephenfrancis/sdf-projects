/*global x, java */
"use strict";

Date.preferAmericanFormat = false;

/*
 From date_format.js ...
 
getFullYear()
parseString(val, format)    static
isValid(val,format)         static
isBefore(date2)
isAfter(date2)
equals(date2)
equalsIgnoreTime(date2)
format(format)
getDayName()
getDayAbbreviation()            // 3-letter abbrev
getMonthName()
getMonthAbbreviation()          // 3-letter abbrev
clearTime()
add(interval, number)           // interval is one of: 'y'ear, 'M'onth, 'd'ay, 'w'eekday, 'h'our, 'm'inute, 's'econd


*/

Date.prototype.daysBetween = function(date2) {
// include 2-hour summer time buffer zone
    return Math.floor((date2.getTime() - this.getTime() + (1000 * 60 * 60 * 2)) / (1000 * 60 * 60 * 24));
};

Date.prototype.workingDaysBetween = function(date2) {
    var mantissa,
        full_weeks;
    mantissa = date2.getDay() - this.getDay();
    if (mantissa < 0) {
        mantissa += 5;                                          // include 2-hour summer time buffer zone
    }
    if (this.getDay() === 6 && this.isBefore(date2)) {          // Saturday
        mantissa += 1;
    }
    if (this.getDay() === 0 && this.isAfter(date2)) {           // Sunday
        mantissa -= 1;
    }
    full_weeks = Math.floor((date2.getTime() - this.getTime() + (1000 * 60 * 60 * 2)) / (1000 * 60 * 60 * 24 * 7));
    return full_weeks * 5 + mantissa;
};

function testWorkingDaysBetween() {
    var i,
        j,
        date,
        date2 = new Date();
    for (i = 0; i < 500; i += 1) {
        date = Date.parseString("2011-01-01").add('d', i);
        for (j = -50; j < 50; j += 1) {
            date2.setTime(date.getTime());
            date2.add('w', j);
            if (date.workingDaysBetween(date2) !== j) {
                print(date + ", " + j + " -> " + date2 + ", workingDaysBetween(): " + date.workingDaysBetween(date2));
//                return;
              }
        }
    }
}

Date.prototype.copy = function() {
    var date = new Date();
    date.setTime(this.getTime());
    return date;
};

Date.prototype.display = function() {
    return this.format("dd/MM/yy");
};

Date.prototype.internal = function() {
    return this.format("yyyy-MM-dd");
};

Date.parseDateTime = function(str) {
    var date,
        parts = str.split(" ");
    if (parts.length > 0) {
        date = Date.parseString(parts[0]);
    }
    if (date && parts.length > 1) {
        date.parseTime(parts[1]);
    }
    return date;
};

Date.prototype.parseTime = function(str) {
    var parts = str.match(/([0-9]+):([0-9]+):([0-9]+)/);
    if (!parts) {
        return;
    }
    if (parts.length > 1) {
        this.setHours(  parseInt(parts[1], 10));
    }
    if (parts.length > 2) {
        this.setMinutes(parseInt(parts[2], 10));
    }
    if (parts.length > 3) {
        this.setSeconds(parseInt(parts[3], 10));
    }
};

Date.prototype.parse = function(str) {
    var parts,
        i,
        datetime;
    if (typeof str !== "string") {
        return str;
    }
    parts = str.split("+");
    for (i = 0; i < parts.length; i += 1) {
        if (parts[i] === "today") {
            this.setTime((new Date()).getTime());
        } else if (parts[i] === "now") {
            this.setTime((new Date()).getTime());
        } else if (parts[i] === "day-start") {
            this.clearTime();
        } else if (parts[i] === "day-end") {
            this.setHours(23); 
            this.setMinutes(59);
            this.setSeconds(59); 
            this.setMilliseconds(999);
        } else if (parts[i] === "week-start") {
            this.add('d',   - (this.getDay() % 7));            // getDay() returns 0 for Sun to 6 for Sat
        } else if (parts[i] === "week-end") {
            this.add('d', 6 - (this.getDay() % 7));
        } else if (parts[i] === "month-start") {
            this.setDate(1);
        } else if (parts[i] === "month-end") {
            this.add('M', 1);
            this.setDate(1);
            this.add('d', -1);
        } else if (parts[i].indexOf("minutes") > -1) {
            this.add('m', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("hours") > -1) {
            this.add('h', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("days") > -1) {
            this.add('d', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("weeks") > -1) {
            this.add('d', parseInt(parts[i], 10) * 7);
        } else if (parts[i].indexOf("months") > -1) {
            this.add('M', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("years") > -1) {
            this.add('y', parseInt(parts[i], 10));
        } else if (parseInt(parts[i], 10).toFixed(0) === parts[i]) {
            this.add('d', parseInt(parts[i], 10));
        } else if (parts[i].length > 0) {
            datetime = Date.parseDateTime(parts[i]);
            if (datetime) {
                this.setTime(datetime.getTime());
            }
        }
    }
};

Date.parse = function(str) {
    var date = new Date();
    date.parse(str);
    return date;
};

Date.prototype.periodBetween = function (date, form, inclusivity) {
    var obj = null,
        str;
    if (date) {
        if (inclusivity === "inclusive") {
            this.add('d', -1);
        } else if (inclusivity === "exclusive") {
            this.add('d',  1);
        }
        if (this.daysBetween(date) === 0) {
            obj = { period: "days", number: 0 };
        } else if (date.getDate() === this.getDate() && date.getMonth() === this.getMonth()) {
            obj = { period: "years" , number: date.getFullYear() - this.getFullYear() };
        } else if (date.getDate() === this.getDate()) {
            obj = { period: "months", number: (date.getFullYear() - this.getFullYear()) * 12 + date.getMonth() - this.getMonth() };
        } else if (this.daysBetween(date) % 7 === 0) {
            obj = { period: "weeks" , number: this.daysBetween(date) / 7 };
        } else {
            obj = { period: "days", number: this.daysBetween(date) };
        }
    }
    if (inclusivity === "inclusive") {              // ensure this remains unchanged at end
        this.add('d',  1);
    } else if (inclusivity === "exclusive") {
        this.add('d', -1);
    }
    if (form === "string") {
        return (obj ? obj.number + "|" + obj.period : "");
    } else if (form === "display") {
        str  = (obj ? obj.number + " " + obj.period : "");
        if (str && obj.number === 1) {
            str = str.replace(/s$/, "");
        }
        return str;
    }
    return obj;
};

Date.prototype.secondsBetween = function (date2) {
// include 2-hour summer time buffer zone
    return x.lib.round((date2.getTime() - this.getTime()) / 1000, 0);
};

//To show up in Chrome debugger...
//@ sourceURL=ba/date_library.js