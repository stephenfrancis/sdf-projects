/*jslint node: true */
"use strict";


module.exports = function (RULES) {
    var count_per_item = {},
        total_per_item = {};

    function getRule(item) {
        var rule = RULES[item];
        if (!rule || !Array.isArray(rule)) {
            throw new Error("unrecognized item: " + item);
        }
        return rule;
    }

/*
    function getBestUnitPrice(rule, count) {
        var i;
        for (i = rule.length - 1; i >= 0; i -= 1) {
            if (rule[i][0] <= count) {
                return rule[i];
            }
        }
        throw new Error("no price for count: " + count);
    }
*/
    function getCompositeCost(rule, count) {
        var cost = 0,
            multiple,
            i;
        for (i = rule.length - 1; i >= 0 && count > 0; i -= 1) {
            if (rule[i][0] <= count) {
                multiple = Math.floor(count / rule[i][0]);
                cost  += rule[i][1] * multiple;
                count -= rule[i][0] * multiple;
            }
        }
        return cost;
    }

    function getNetPrice(item) {
        var rule = getRule(item),
            count,
            old_amount,
            new_amount;

        count      = (count_per_item[item] || 0) + 1;
        old_amount =  total_per_item[item] || 0;
        new_amount =  getCompositeCost(rule, count);
        count_per_item[item] = count;
        total_per_item[item] = new_amount;
        return new_amount - old_amount;
    }

    return {
        total: 0,
        scan : function (item) {
            var net_price = getNetPrice(item);
            this.total += net_price;
            return net_price;
        }
    };
};

