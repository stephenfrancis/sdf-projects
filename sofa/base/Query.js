/*global x, java */
"use strict";

x.lib.depends("Base");
x.lib.depends("log");
x.lib.depends("sql");

x.sql.inner_join = 'I';
x.sql.outer_join = 'O';
x.sql.where_cond = 'W';
x.sql.having_cond = 'H';
x.sql.oper_map = {
    AN: function(cond) {
        var pieces = cond.value.split("|"),
            str = "",
            delim = "",
            i;
        for (i = 0; i < pieces.length; i += 1) {
            if (pieces[i]) {
                str += delim + "(" + cond.column + " LIKE " + x.sql.escape("%|" + pieces[i] + "|%") + ")";
                delim = " OR ";
            }
        }
        return str;
    },
    AL: function(cond) {
            var pieces = cond.value.split("|"),
            str = "",
            delim = "",
            i;
        for (i = 0; i < pieces.length; i += 1) {
            if (pieces[i]) {
                str += delim + "(" + cond.column + " LIKE " + x.sql.escape("%|" + pieces[i] + "|%") + ")";
                delim = " AND ";
            }
        }
        return str;
    },
    NU: function(cond) { return cond.column + " IS NULL"; },
    NN: function(cond) { return cond.column + " IS NOT NULL"; },
    BE: function(cond) { return "  UPPER(CONVERT(" + cond.column + " USING UTF8))     LIKE UPPER(" + x.sql.escape(      cond.value + "%") + ")"; },
//    BI: function(cond) { return "UPPER( " + cond.column + " LIKE UPPER( " + x.sql.escape(      cond.value + "%") + ")"; },
    BN: function(cond) { return "( UPPER(CONVERT(" + cond.column + " USING UTF8)) NOT LIKE UPPER(" + x.sql.escape(      cond.value + "%") + ") OR " + cond.column + " IS NULL )"; },
    BT: function(cond) { return cond.column + " BETWEEN " + x.sql.escape(cond.value) + " AND " + x.sql.escape(cond.value2); },
    CO: function(cond) { return "  UPPER(CONVERT(" + cond.column + " USING UTF8))     LIKE UPPER(" + x.sql.escape("%" + cond.value + "%") + ")"; },
//    CI: function(cond) { return "UPPER( " + cond.column + " ) LIKE UPPER( " + x.sql.escape("%" + cond.value + "%") + " )"; },
    DC: function(cond) { return "( UPPER(CONVERT(" + cond.column + " USING UTF8)) NOT LIKE UPPER(" + x.sql.escape("%" + cond.value + "%") + ") OR " + cond.column + " IS NULL )"; },
    EQ: function(cond) { return "IFNULL(" + cond.column + ", '') ="  + x.sql.escape(cond.value); },
    NE: function(cond) { return "IFNULL(" + cond.column + ", '') <>" + x.sql.escape(cond.value); },
    GT: function(cond) { return "IFNULL(" + cond.column + ", 0 ) >"  + x.sql.escape(cond.value); },
    GE: function(cond) { return "IFNULL(" + cond.column + ", 0 ) >=" + x.sql.escape(cond.value); },
    LT: function(cond) { return "IFNULL(" + cond.column + ", 0 ) <"  + x.sql.escape(cond.value); },
    LE: function(cond) { return "IFNULL(" + cond.column + ", 0 ) <=" + x.sql.escape(cond.value); },
    HA: function(cond) { return cond.column.replace("{val}", x.sql.escape(cond.value)); },
    DH: function(cond) { return "NOT " + cond.column.replace("{val}", x.sql.escape(cond.value)); },
    KW: function(cond) {
        var pieces,
            i,
            str = "",
            delim = "";
        if (!cond.value) {
            return "TRUE";
        }
        pieces = cond.value.split(/[,; ]/);
        for (i = 0; i < pieces.length; i += 1) {
            str += delim + "UPPER( CONVERT( " + cond.column + " USING UTF8 ) ) LIKE UPPER( " + x.sql.escape("%" + pieces[i] + "%") + " )";
            delim = " AND ";
        }
        return str;
    }
//    XX: function(cond) { return cond.column + ""   + x.sql.escape(cond.value) }
};

x.sql.Query = x.Base.clone({
    id                      : "Query",
    rows                    : 0,
    max_sort_seq            : 3,
});
x.sql.Query.doc = {
    location                : "x.sql",
    file                    : "$Header: /rsl/rsl_app/core/sql/Query.js,v 1.51 2015/02/10 13:08:13 kurolaj Exp $",
    purpose                 : "To represent a SQL SELECT query, supporting multiple columns, table joins and conditions",
    properties              : {
        connection          : { label: "SQL connection object to use", type: "x.sql.Connection", usage: "required in spec" },
        table               : { label: "String id of the main driving table/entity of this query", type: "string", usage: "required in spec" },
        main                : { label: "Object representing the main driving table", type: "x.sql.Table", usage: "use methods only" },
        tables              : { label: "Array of tables joined in this query, including main", type: "array", usage: "use methods only" },
        conditions          : { label: "Array of SQL conditions in this query", type: "array", usage: "use methods only" },
        columns             : { label: "Object of columns defined in this query", type: "Object", usage: "use methods only" },
        rows                : { label: "Number of rows returned by this query, when last executed", type: "number", usage: "read only" },
        started             : { label: "Whether or not the Query has read the first row", type: "boolean", usage: "read only" },
        ended               : { label: "Whether or not the Query has read the last row", type: "boolean", usage: "read only" },
        max_sort_seq        : { label: "Maximum number of different fields by which this query can be sorted, defaults to 3", type: "number", usage: "optional in spec" },
        get_found_rows      : { label: "Whether or not to retrieve the total number of rows selected, if this is a paged query", type: "boolean", usage: "optional in spec" },
    }
};

x.sql.Query.init = function () {
    x.log.functionStart("init", this, arguments);
    if (!this.connection) {
        throw x.Exception.clone({ id: "no_connection" });
    }
    this.tables = [];            // index 0 = alias A, etc
    this.conditions = [];
    this.columns = {};
    this.main = this.addTable({ table: this.table, type: 'M' /*, active: true, index: this.tables.length*/ });
    this.started = false;
    this.ended   = false;
};
x.sql.Query.init.doc = {
    purpose   : "Initializes the main properties used by this object and it checks if the connection property is initialized.",
    args      : "none",
    returns   : "nothing",
    exceptions: "Throws an (Exception) exception whenever the connection property is not initialized"
};

x.sql.Query.reset = function () {
    x.log.functionStart("reset", this, arguments);
    this.ended = true;
    if (this.statement) {
        this.statement.close();
        this.statement = null;
    }
    if (this.resultset) {
        this.resultset.close();
        this.resultset = null;
    }
//    if (this.connection.conn) {
        this.connection.finishedWithConnection();
//    }
};
x.sql.Query.reset.doc = {
    purpose   : "Releases the statement and resultset resources (if open) and calls the finishedWithConnection on the connection property.",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Query.open = function () {
    var sql,
        resultset2;
    x.log.functionStart("open", this, arguments);
    this.reset();
    this.rows    = 0;
    this.started = false;
    this.ended   = false;
    sql = this.getSQLStatement();
//    this.java_conn = this.connection.getConnection();
//    this.connection.conn = this.connection.getConnection();         // get private retained connection
    this.resultset = this.connection.executeQuery(sql);
    if (!this.get_found_rows) {
        return;
    }
    resultset2 = this.connection.executeQuery(this.getFoundRowsSQL());
    if (resultset2.next()) {
        this.found_rows = resultset2.getInt(1);
    } else {
        this.found_rows = 0;
    }
    resultset2.getStatement().close();
};
x.sql.Query.open.doc = {
    purpose   : "Runs an sql query built by the getSQLStatement function and it stores the results in the resultset property.\
If the get_found_rows property is true it sets the found_rows property to the relative number of found rows",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};
x.sql.Query.next = function () {
    var resultset;
    x.log.functionStart("next", this, arguments);
    if (!this.resultset) {
        this.open();
    }
    resultset = this.resultset;        // used to doColumns arg, so need to pass as closure
    if (!this.ended) {
        this.ended = !resultset.next();
        this.started = true;
    }
    if (!this.ended) {
        this.rows += 1;
        this.doColumns(function (column) {
            if (column.active && (!column.table || column.table.active)) {
                column.value = x.sql.getColumnString(resultset, column.name);
            }
        });
    }
    return !this.ended;
};
x.sql.Query.next.doc = {
    purpose   : "Moves the resultset to the next result and checks if there are no other results.",
    args      : "none",
    returns   : "boolean true, if there are others results in the resultset",
    exceptions: ""
};

x.sql.Query.getRowCount = function () {
    x.log.functionStart("getRowCount", this, arguments);
    return this.rows;
};
x.sql.Query.getRowCount.doc = {
    purpose   : "Get the processed row count relative to the last query. This field is incremented on each call to the next function.",
    args      : "none",
    returns   : "number processed row count",
    exceptions: ""
};

x.sql.Query.getFoundRows = function () {
    x.log.functionStart("getFoundRows", this, arguments);
    return this.found_rows;
};
x.sql.Query.getFoundRows.doc = {
    purpose   : "Returns the total number of rows selected",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Query.hideSQLFunctions = function () {
    x.log.functionStart("hideSQLFunctions", this, arguments);
    this.doColumns(function (column) {
        if (column.sql_function) {
            column.active = false;
        }
    });
};
x.sql.Query.hideSQLFunctions.doc = {
    purpose   : "Hides the function columns, by setting their active flag to false",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};


x.sql.Query.getRow = function (trans) {
    x.log.functionStart("getRow", this, arguments);
    return trans.getActiveRow(this.main_entity_id, this.getColumn("A._key").get());
};
x.sql.Query.getRow.doc = {
    purpose   : "Returns the active row",
    args      : "Transaction Object",
    returns   : "Entity row",
    exceptions: ""
};

//---------------------------------------------------------------------------- Tables
x.sql.Query.getTable = function (index) {
    x.log.functionStart("getTable", this, arguments);
    if (typeof index === "number") {
        return this.tables[index];
    }
    return this.tables[index.charCodeAt(0) - 65];
};
x.sql.Query.getTable.doc = {
    purpose   : "It lookup the array of joined tables in this query using an index",
    args      : "Number or char Index",
    returns   : "The obtained table",
    exceptions: ""
};

x.sql.Query.addTable = function (table_spec) {
    var table;
    x.log.functionStart("addTable", this, arguments);
    if (!table_spec.id) {
        table_spec.id = table_spec.table;
    }
    table_spec.index = this.tables.length;
    table_spec.query = this;
    table = x.sql.Table.clone(table_spec);
    this.tables.push(table);
    return table;
};
x.sql.Query.addTable.doc = {
    purpose   : "Adds a new table to the tables array created using the table_spec arg",
    args      : "Table specification",
    returns   : "The new table",
    exceptions: ""
};

x.sql.Query.getTableCount = function () {
    x.log.functionStart("getTableCount", this, arguments);
    return this.tables.length;
};
x.sql.Query.getTableCount.doc = {
    purpose   : "Returns the total number of tables",
    args      : "none",
    returns   : "Number tot tables",
    exceptions: ""
};

x.sql.Table = x.Base.clone({
    id : "Table",
    active: true,
    type: x.sql.outer_join
});
x.sql.Table.doc = {
    location: "x.sql",
    purpose : "To represent a SQL TABLE structure",
    file    : "$Header: /rsl/rsl_app/core/sql/Query.js,v 1.51 2015/02/10 13:08:13 kurolaj Exp $",
};
x.sql.Table.clone = function (spec) {
    var obj;
    x.log.functionStart("clone", this, arguments);
    obj = x.Base.clone.call(this, spec);
    obj.alias = String.fromCharCode(65 + obj.index);
    if (obj.join_cond) {
        obj.join_cond = x.sql.detokenizeAlias(obj.join_cond, obj.alias);        // matches '?' NOT preceded by '\'
    }
    return obj;
};

x.sql.Table.addColumn = function (col_spec) {
    x.log.functionStart("addColumn", this, arguments);
    if (typeof col_spec.name !== "string") {
        throw "Property 'name' must be supplied";
    }
    col_spec.table = this;
    if (col_spec.sql_function) {
        col_spec.name = this.alias + "_" + col_spec.name;
    } else {
        col_spec.name = this.alias + "." + col_spec.name;
    }
    return this.query.addColumn(col_spec);
};
x.sql.Table.addColumn.doc = {
	purpose   : "Adds a new column to this table",
    args      : "Column specification object",
	returns   : "New column object",
    exceptions: ""
};

x.sql.Table.getSQL = function () {
    var out = "";
    x.log.functionStart("getSQL", this, arguments);
    if (this.type === x.sql.inner_join) {
        out += " INNER JOIN ";
    } else if (this.type === x.sql.outer_join) {
        out += " LEFT OUTER JOIN ";
    }
    out += this.table + " AS " + this.alias;
    if (this.join_cond) {
        out += " ON " + this.join_cond;
    }
    return out;
};
x.sql.Table.getSQL.doc = {
	purpose   : "Outputs the SQL statement relative to this object",
	args      : "none",
	returns   : "String generated sql statement from this object",
	exceptions: ""
};

//---------------------------------------------------------------------------- Conditions
x.sql.Query.getCondition = function (index) {
    x.log.functionStart("getCondition", this, arguments);
    return this.conditions[index];
};
x.sql.Query.getCondition.doc = {
    purpose   : "It lookup the array of conditions in this query using an index",
    args      : "Number or char Index",
    returns   : "The obtained condition",
    exceptions: ""
};

x.sql.Query.addCondition = function (cond_spec) {
    var condition;
    x.log.functionStart("addCondition", this, arguments);
    cond_spec.id = "cond_" + this.conditions.length;
    cond_spec.query = this;
    if (!cond_spec.type) {
        cond_spec.type = x.sql.where_cond;
    }
    condition = x.sql.Condition.clone(cond_spec);
    this.conditions.push(condition);
    return condition;
};
x.sql.Query.addCondition.doc = {
    purpose   : "Adds a new condition to this query",
    args      : "Condition specification object",
    returns   : "New condition object",
    exceptions: ""
};

x.sql.Query.getConditionCount = function () {
    x.log.functionStart("getConditionCount", this, arguments);
    return this.conditions.length;
};
x.sql.Query.getConditionCount.doc = {
    purpose   : "Returns the total number of conditions",
    args      : "none",
    returns   : "Number tot conditions",
    exceptions: ""
};

x.sql.Query.clearConditions = function () {
    var i = 0;
    x.log.functionStart("clearConditions", this, arguments);
    while (i < this.conditions.length) {
        if (this.conditions[i].fixed) {
            i += 1;
        } else {
            this.conditions.splice(i, 1);
        }
    }
};
x.sql.Query.clearConditions.doc = {
    purpose   : "Clears the condition array preserving the conditions with the fixed flag",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Condition = x.Base.clone({
    id : "Condition",
    active: true
});
x.sql.Condition.doc = {
    location: "x.sql",
    purpose : "To represent a SQL condition",
    file    : "$Header: /rsl/rsl_app/core/sql/Query.js,v 1.51 2015/02/10 13:08:13 kurolaj Exp $",
};

x.sql.Condition.clone = function (spec) {
    var obj;
    x.log.functionStart("spec", this, arguments);
    obj = x.Base.clone.call(this, spec);
    if (!obj.full_condition && (!obj.column || !obj.operator || typeof obj.value !== "string")) {
        throw "Properties 'column' and 'operator' and 'value' or 'full_condition' must be supplied";
    }
    return obj;
};

x.sql.Condition.getSQL = function () {
    x.log.functionStart("getSQL", this, arguments);
    if (this.full_condition) {
        return this.full_condition;
    } else if (this.operator && x.sql.oper_map[this.operator]) {
        return x.sql.oper_map[this.operator](this);
    }
    return this.column + this.operator + x.sql.escape(this.value);
};
x.sql.Condition.getSQL.doc = {
	purpose   : "Outputs the SQL statement relative to this object",
	args      : "none",
	returns   : "String generated sql statement from this object",
	exceptions: ""
};

x.sql.Condition.remove = function () {
    x.log.functionStart("remove", this, arguments);
    this.query.conditions.splice(this.query.conditions.indexOf(this), 1);
};

//---------------------------------------------------------------------------- Columns
x.sql.Query.getColumn = function (name) {
    x.log.functionStart("getColumn", this, arguments);
    return this.columns[name];
};
x.sql.Query.getColumn.doc = {
    purpose   : "Returns the query column use the name arg as index",
    args      : "Index name",
    returns   : "The obtained column",
    exceptions: ""
};

x.sql.Query.addColumn = function (col_spec) {
    var column;
    x.log.functionStart("addColumn", this, arguments);
    if (!col_spec.table && !col_spec.sql_function) {
        throw "Column must specify table or sql_function";
    }
    col_spec.id = col_spec.name;
    col_spec.query = this;
    column = x.sql.Column.clone(col_spec);
    this.columns[col_spec.name] = column;
    return column;
};
x.sql.Query.addColumn.doc = {
    purpose   : "Adds a new column to this query",
    args      : "Column specification object",
    returns   : "New column object",
    exceptions: ""
};
//    that.getColumnCount = function () {
//        return columns.length;
//    };

x.sql.Query.doColumns = function (funct) {
    var name;
    x.log.functionStart("doColumns", this, arguments);
    for (name in this.columns) {
        if (this.columns.hasOwnProperty(name)) {
            funct(this.columns[name]);
        }
    }
};
x.sql.Query.doColumns.doc = {
	purpose   : "Loops over each column passing it as arg for the input function",
    args      : "Function to apply to each column",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column = x.Base.clone({
    id : "Column",
    active: true
});
x.sql.Column.doc = {
    location: "x.sql",
    purpose : "To represent a SQL column stucture",
    file    : "$Header: /rsl/rsl_app/core/sql/Query.js,v 1.51 2015/02/10 13:08:13 kurolaj Exp $",
};

x.sql.Column.get = function () {
    x.log.functionStart("get", this, arguments);
    return this.value;
};
x.sql.Column.get.doc = {
    purpose   : "To get the Object representing the column",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column.getNumber = function (def_val) {
    var number_val;
    x.log.functionStart("getNumber", this, arguments);
    number_val = parseFloat(this.get());
    if (isNaN(number_val) && typeof def_val !== "undefined" ) {
        number_val = def_val;
    }
    return number_val;
};
x.sql.Column.getNumber.doc = {
    purpose   : "To get a number value from one field of the column, defaulted to def_val arg if blank",
    args      : "def_val to use as default value if blank",
    returns   : "Number value",
    exceptions: ""
};

x.sql.Column.getDate = function (def_val) {
    var date;
    x.log.functionStart("getDate", this, arguments);
    date = Date.parse(this.get());
    if (!this.get()) {
        date = def_val || null;
    }
    return date;
};
x.sql.Column.getDate.doc = {
    purpose   : "To get a date object from one field of the column, defaulted to def_val arg if blank",
    args      : "def_val to use as default value if blank",
    returns   : "Date object",
    exceptions: ""
};

x.sql.Column.sortTop = function () {
    var max_sort_seq,
        this_column;
    x.log.functionStart("sortTop", this, arguments);
    if (this.sort_seq === 0) {
        return;
    }
    this.sort_seq = 0;
    max_sort_seq = this.query.max_sort_seq;
    this_column = this;
    this.query.doColumns(function (column) {
        if (column !== this_column && typeof column.sort_seq === "number") {
            column.sort_seq += 1;
            if (column.sort_seq > max_sort_seq) {
                delete column.sort_seq;
            }
        }
    });
};
x.sql.Column.sortTop.doc = {
    purpose   : "To select the current column to sort up the table",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column.sortBottom = function () {
    var max_curr_sort_seq = -1;
    x.log.functionStart("sortBottom", this, arguments);
    this.query.doColumns(function (column) {
        if (typeof column.sort_seq === "number" && column.sort_seq > max_curr_sort_seq) {
            max_curr_sort_seq = column.sort_seq;
        }
    });
    if (max_curr_sort_seq < this.query.max_sort_seq) {
        this.sort_seq = max_curr_sort_seq + 1;
    }
};
x.sql.Column.sortBottom.doc = {
    purpose   : "To select the current column to sort bottom the table",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column.sortAsc = function () {
    x.log.functionStart("sortAsc", this, arguments);
    this.sort_desc = false;
};
x.sql.Column.sortAsc.doc = {
    purpose   : "To set the column ordering as ascending",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column.sortDesc = function () {
    x.log.functionStart("sortDesc", this, arguments);
    this.sort_desc = true;
};
x.sql.Column.sortDesc.doc = {
    purpose   : "To set the column ordering as descending",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column.sortRemove = function () {
    x.log.functionStart("sortRemove", this, arguments);
    this.query.doColumns(function (column) {
        if (typeof column.sort_seq === "number" && column.sort_seq > this.sort_seq) {
            column.sort_seq -= 1;
        }
    });
    delete this.sort_seq;
    delete this.sort_desc;
};
x.sql.Column.sortRemove.doc = {
    purpose   : "To remove the column ordering",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Column.getOrderTerm = function () {
    x.log.functionStart("getOrderTerm", this, arguments);
    return (this.order_term || this.name) + (this.sort_desc ? " DESC" : "");
};
x.sql.Column.getOrderTerm.doc = {
    purpose   : "To get the corresponding sort sql term to make the sql statement.",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Query.sortClear = function () {
    x.log.functionStart("sortClear", this, arguments);
    this.doColumns(function (column) {
        column.sortRemove();
    });
};
x.sql.Query.sortClear.doc = {
	purpose   : "Remove the sorting logic related to each column",
    args      : "none",
    returns   : "nothing",
    exceptions: ""
};

x.sql.Query.getSQLStatement = function () {
    var out;
    x.log.functionStart("getSQLStatement", this, arguments);
    out = this.getSelectClause()
        + this.getFromClause()
        + this.getWhereClause()
        + this.getGroupClause()
        + this.getHavingClause()
        + this.getOrderClause();
    if (this.limit_row_count > 0) {
        out = out + " LIMIT " + (this.limit_offset || 0) + ", " + this.limit_row_count;
    }
    return out;
};
x.sql.Query.getSQLStatement.doc = {
	purpose   : "Outputs the SQL statement relative to this object",
    args      : "none",
    returns   : "String generated sql statement from this object",
    exceptions: ""
};

x.sql.Query.getFoundRowsSQL = function () {
    var out = "SELECT COUNT(*) FROM ( "
            + this.getSelectCountClause()
            + this.getFromClause()
            + this.getWhereClause()
            + this.getGroupClause()
            + this.getHavingClause() + ") as C";
   
    return out;
};

x.sql.Query.getSelectCountClause = function () {
    var out = "SELECT 1";
    x.log.functionStart("getSelectCountClause", this, arguments);
    
    this.doColumns(function (column) {
        if (column.active && (!column.table || column.table.active)) {
            if (column.sql_function && column.group_col) {
                out += ", ( " + x.sql.detokenizeAlias(column.sql_function, (column.table ? column.table.alias : "A")) + " ) AS " + column.name;
            }
        }
    });
    return out;
};
x.sql.Query.getSelectCountClause.doc = {
    purpose   : "Generates the SELECT clause part of the SQL statement when is used to count",
    args      : "none",
    returns   : "String SELECT clause part of the SQL statement",
    exceptions: ""
};

x.sql.Query.getSelectClause = function () {
    var out = "SELECT",
        delim = " ";
    x.log.functionStart("getSelectClause", this, arguments);
    
    if (this.use_query_cache === true) {
        out += " SQL_CACHE";
    } else if (this.use_query_cache === false) {
        out += " SQL_NO_CACHE";
    }
    
//    if (this.get_found_rows) {
//        out += " SQL_CALC_FOUND_ROWS";
//    }
    this.doColumns(function (column) {
        if (column.active && (!column.table || column.table.active)) {
            if (column.sql_function) {
                out += delim + " ( " + x.sql.detokenizeAlias(column.sql_function, (column.table ? column.table.alias : "A")) + " ) AS " + column.name;
            } else {
                out += delim + column.name;
            }
            delim = ", ";
        }
    });
    if (delim === " ") {
        throw "No active columns defined";
    }
    return out;
};
x.sql.Query.getSelectClause.doc = {
	purpose   : "Generates the SELECT clause part of the SQL statement",
    args      : "none",
    returns   : "String SELECT clause part of the SQL statement",
    exceptions: ""
};

x.sql.Query.getFromClause = function () {
    var out = " FROM ",
        i;
    x.log.functionStart("getFromClause", this, arguments);
    for (i = 0; i < this.tables.length; i += 1) {
        if (this.tables[i].active) {
            out += this.tables[i].getSQL();
        }
    }
    return out;
};
x.sql.Query.getFromClause.doc = {
	purpose   : "Generates the FROM clause part of the SQL statement",
    args      : "none",
    returns   : "String FROM clause part of the SQL statement",
    exceptions: ""
};

x.sql.Query.getWhereClause = function () {
    var out = "",
        i,
        delim = " WHERE ";
    x.log.functionStart("getWhereClause", this, arguments);
    for (i = 0; i < this.conditions.length; i = i + 1) {
        if (this.conditions[i].active && this.conditions[i].type === x.sql.where_cond) {
            out = out + delim + "( " + this.conditions[i].getSQL() + " )";
            delim = " AND ";
        }
    }
    return out;
};

x.sql.Query.getWhereClause.doc = {
	purpose   : "Generates the WHERE clause part of the SQL statement",
    args      : "none",
    returns   : "String WHERE clause part of the SQL statement",
    exceptions: ""
};

x.sql.Query.getGroupClause = function () {
    var out = "",
        delim = " GROUP BY ";
    x.log.functionStart("getGroupClause", this, arguments);
    this.doColumns(function (column) {
        if (column.group_col) {
            out = out + delim + column.name;
            delim = ", ";
        }
    });
    return out;
};
x.sql.Query.getGroupClause.doc = {
	purpose   : "Generates the GROUP BY clause part of the SQL statement",
    args      : "none",
    returns   : "String GROUP BY clause part of the SQL statement",
    exceptions: ""
};

x.sql.Query.getHavingClause = function () {
    var out = "",
        i,
        delim = " HAVING ";
    x.log.functionStart("getHavingClause", this, arguments);
    for (i = 0; i < this.conditions.length; i = i + 1) {
        if (this.conditions[i].active && this.conditions[i].type === x.sql.having_cond) {
            out = out + delim + "( " + this.conditions[i].getSQL() + " )";
            delim = " AND ";
        }
    }
    return out;
};
x.sql.Query.getHavingClause.doc = {
	purpose   : "Generates the HAVING clause part of the SQL statement",
    args      : "none",
    returns   : "String HAVING clause part of the SQL statement",
    exceptions: ""
};

x.sql.Query.getOrderClause = function () {
    var temp = [],
        out = "",
        i,
        delim = " ORDER BY ";
    x.log.functionStart("getOrderClause", this, arguments);
    this.doColumns(function (column) {
        if (typeof column.sort_seq === "number") {
            temp[column.sort_seq] = column.getOrderTerm();
        }
    });
    for (i = 0; i < temp.length; i = i + 1) {
        if (temp[i]) {
            out = out + delim + temp[i];
            delim = ", ";
        }
    }
    return out;
};
x.sql.Query.getOrderClause.doc = {
	purpose   : "Generates the ORDER BY clause part of the SQL statement",
    args      : "none",
    returns   : "String ORDER BY clause part of the SQL statement",
    exceptions: ""
};
