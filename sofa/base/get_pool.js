/*jslint node: true */
"use strict";

/**
	To be stored in local environment definition, rather than library package
*/
module.exports = require('mysql').createPool({
	host		: "localhost",
	user		: "root",
	password	: "x"
});

