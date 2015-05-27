/*jslint node: true */
"use strict";

var RULES = {
        "A" : [ [ 1, 50 ], [ 3, 130 ] ],
        "B" : [ [ 1, 30 ], [ 2,  45 ] ],
        "C" : [ [ 1, 20 ] ],
        "D" : [ [ 1, 15 ] ]
};



module.exports.test_totals = function (test) {
	test.expect(13);

    function price(goods) {
        var co = require("../CheckOut")(RULES),
            i;
        for (i = 0; i < goods.length; i += 1) {
            co.scan(goods.charAt(i));
        }
        return co.total;
    }

    test.equal(  0, price(""));
    test.equal( 50, price("A"));
    test.equal( 80, price("AB"));
    test.equal(115, price("CDBA"));

    test.equal(100, price("AA"));
    test.equal(130, price("AAA"));
    test.equal(180, price("AAAA"));
    test.equal(230, price("AAAAA"));
    test.equal(260, price("AAAAAA"));

    test.equal(160, price("AAAB"));
    test.equal(175, price("AAABB"));
    test.equal(190, price("AAABBD"));
    test.equal(190, price("DABABA"));

    test.done();
};

module.exports.test_incremental = function (test) {
    var co;

    test.expect(6);

    co = require("../CheckOut")(RULES);
    test.equal(  0, co.total);
    co.scan("A");  test.equal( 50, co.total);
    co.scan("B");  test.equal( 80, co.total);
    co.scan("A");  test.equal(130, co.total);
    co.scan("A");  test.equal(160, co.total);
    co.scan("B");  test.equal(175, co.total);

	test.done();
};

