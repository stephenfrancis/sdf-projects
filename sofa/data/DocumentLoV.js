/*jslint node: true */
/*globals define */
"use strict";


define(["./LoV", "./Entity", "../base/Log"], function (LoV, Entity, Log) {

    return LoV.clone({

        id                      : "DocumentLoV",


        clone : function (spec) {
            var new_obj;
            new_obj = LoV.clone.call(this, spec);
            if (spec.entity_id && spec.key) {
                new_obj.startDocumentLoad(spec.entity_id, spec.key);
            }
            return new_obj;
        },

        startDocumentLoad : function (entity_id, key) {
            this.document = Entity.getEntity(entity_id).getDocument(key);
        },

        loadRow : function (row) {
            this.addItem(row.getField(this.id_field).get(), row.getField(this.label_field).get(), true);
        },

        loadDocument : function () {
            var that = this;
        //    if (!this.document || this.document.isWaiting()) {
        //        throw new Error("this.document doesn't exist or is loading");
        //    }
            if (!this.list_sub_entity || !this.document.child_rows[this.list_sub_entity]) {
                throw new Error("this.list_sub_entity not defined or not present");
            }
            this.document.eachChildRow(function (row) {
                that.loadRow(row);
            }, this.list_sub_entity);
        }

    });     // end of clone()

});     // end of define()


//To show up in Chrome debugger...
//@ sourceURL=data/LoV.js