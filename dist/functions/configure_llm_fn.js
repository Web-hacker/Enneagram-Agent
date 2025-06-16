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
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
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
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _default(ctx) {
    return _async_to_generator(function*() {
        const { apiKey, model } = ctx.inputs.data.body;
        const envPath = _path.default.resolve(process.cwd(), ".env");
        let envContent = _fs.default.readFileSync(envPath, "utf-8");
        envContent = envContent.replace(/OPENROUTER_API_KEY=.*/g, `OPENROUTER_API_KEY=${apiKey}`).replace(/MODEL_NAME=.*/g, `MODEL_NAME=${model}`);
        if (!envContent.includes("OPENROUTER_API_KEY=")) {
            envContent += `\nOPENROUTER_API_KEY=${apiKey}`;
        }
        if (!envContent.includes("MODEL_NAME=")) {
            envContent += `\nMODEL_NAME=${model}`;
        }
        _fs.default.writeFileSync(envPath, envContent);
        return new _core.GSStatus(true, 200, undefined, "LLM configuration updated");
    })();
}

//# sourceMappingURL=configure_llm_fn.js.map