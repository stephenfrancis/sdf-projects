/*jslint node: true */
"use strict";

var pool = require("./get_pool"),
    Q    = require("q");


module.exports.getConnectionPromise = function () {
    var deferred = Q.defer();
    pool.getConnection(function (error, connection) {
        if (error) {
            console.error("error in sql.getConnectionPromise(): " + error);
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(connection);
        }
    });
    return deferred.promise;
};


module.exports.getQueryPromise = function (sql) {
    var deferred = Q.defer();
    this.getConnectionPromise().then(function (connection) {
        connection.query(sql, function (error, result) {
            if (error) {
                console.error("error in sql.getQueryPromise(): " + error);
                deferred.reject(new Error(error));
            } else {
                deferred.resolve(result);
            }
            connection.release();
        });
    });
    return deferred.promise;
};


module.exports.detokenizeAlias = function (sql_function, alias) {
    return sql_function.replace(/(\?)(?=[_\.]{1})/g, alias);
};

/*
module.exports.query = function (sql) {
    var deferred = Q.defer();
    pool.getConnection(function (error, connection) {
        if (error) {
            deferred.reject(new Error(error));
        } else {
            connection.query(sql, function (error2, result) {
                if (error2) {
                    deferred.reject(new Error(error2));
                } else {
                    deferred.resolve(result);
                }
                connection.release();
            });
        }
    });
    return deferred.promise;
};
*/

module.exports.queryTest = function (sql) {
    sql = sql || "SELECT 1 UNION SELECT 2";
    return this.getQueryPromise(sql)
    .then(function (result) {
        var prop;
        for (prop in result) {
            if (result.hasOwnProperty(prop)) {
                console.log(prop + " = " + result[prop]);
            }
        }
        return result;
    })
    .then(null, function (error) {
        console.log("error: " + error);
    });
};

