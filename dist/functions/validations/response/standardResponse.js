"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, /**
 * Here you can customize the response when a request 
 * or response validation error happens. Error is in AJV error format.
 * @param ctx  
 */ "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
function _default(ctx) {
    // logger.error(ctx.inputs.data.validation_error);
    const { validation_error, event, message } = ctx.inputs.data;
    return {
        success: false,
        data: {
            validation_error,
            event,
            message
        },
        code: 500
    };
}

//# sourceMappingURL=standardResponse.js.map