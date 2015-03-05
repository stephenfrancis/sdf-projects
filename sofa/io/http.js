/*global x, java, Packages, JavaAdapter */
"use strict";



x.io.http = function (options) {
    var out,
        headers = {};
    x.log.debug(this, "http() [" + options.type + "] " + options.url);
    headers["Content-type"] = options.content_type || "application/json";
    headers.Accept = options.accept || headers["Content-type"];
    
    if (x.server_side) {
        out = x.io.httpJava(options.type, options.url, headers, options.data);
        x.log.debug(this, "http() [" + out.code + "] " + out.msg);
        if (out.code >= 200 && out.code < 300) {
            if (typeof options.success === "function") {
                x.log.debug(this, "http() calling success()");
                options.success(JSON.parse(out.body));
            }
        } else {
            if (typeof options.error === "function") {
                x.log.debug(this, "http() calling error()");
                options.error(out.code, out.msg);
            }
        }
    } else {
        options.beforeSend = function (xhr) {
            headers.forOwn(function (header_id, header_val) {
                x.log.debug(this, "http() request header: " + header_id + "=" + header_val);
                xhr.setRequestHeader(header_id, header_val);
            });
//            xhr.setRequestHeader("If-Modified-Since", "");
        };
        $.ajax(options);
    }
    return out;
};


x.io.httpJava = function (method, url, headers, body) {
    var out = { body: "" },
        connection,
        print_stream,
        input_reader,
        line,
        delim = "";
    try {
        connection = (new java.net.URL(url)).openConnection();
        connection.setDoOutput(true);
        connection.setRequestMethod(method);
        
        if (headers) {
            headers.forOwn(function (header_id, header_val) {
                x.log.debug(this, "httpJava() request header: " + header_id + "=" + header_val);
                connection.setRequestProperty(header_id, header_val);
            });
        }
        if (body) {
            x.log.debug(this, "httpJava() request body: " + body);
            print_stream = new java.io.PrintStream(connection.getOutputStream());
            print_stream.println(body);
            print_stream.close();
        }
//        out.headers = this.collectResponseHeaders(connection);
//        out.body    = this.collectResponseBody(connection);
        input_reader = new java.io.BufferedReader(new java.io.InputStreamReader(connection.getInputStream()));
        while (line = input_reader.readLine()) {
            out.body += delim + line;
            delim = "\n";
        }
    } catch (e) {
        out.msg     = e.toString();
    }
    if (connection) {
        out.code    = Number(connection.getResponseCode());
        out.msg     = String(connection.getResponseMessage());
    }
    return out;
};



//To show up in Chrome debugger...
//@ sourceURL=io/http.js