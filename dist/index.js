"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = /*#__PURE__*/ _interop_require_default(require("@godspeedsystems/core"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
try {
    if (process.env.OTEL_ENABLED == 'true') {
        require('@godspeedsystems/tracing').initialize();
    }
} catch (error) {
    console.error("OTEL_ENABLED is set, unable to initialize opentelemetry tracing.");
    console.error(error);
    process.exit(1);
}
// create a godspeed
const gsApp = new _core.default();
// initilize the Godspeed App
// this is responsible to load all kind of entities
gsApp.initialize();

//# sourceMappingURL=index.js.map