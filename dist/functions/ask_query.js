"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _core = require("@godspeedsystems/core");
const _ragPipeline = require("../helper/ragPipeline");
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _default(ctx) {
    return _async_to_generator(function*() {
        const query = ctx.inputs.data.body.query;
        const rag = new _ragPipeline.CompleteRAGPipeline();
        const result = yield rag.run(query);
        return new _core.GSStatus(true, 200, undefined, {
            answer: result.answer,
            sources: result.source_files
        });
    })();
}

//# sourceMappingURL=ask_query.js.map