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
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
const _vectorStore = require("../helper/vectorStore");
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _system_prompts_archive = require("../system_prompts/system_prompts_archive");
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
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const CONVO_DIR = _path.default.resolve(__dirname, "../../conversations/Relationships");
if (!_fs.default.existsSync(CONVO_DIR)) {
    _fs.default.mkdirSync(CONVO_DIR);
}
function getSessionFile(sessionId) {
    return _path.default.join(CONVO_DIR, `${sessionId}.json`);
}
function loadMessages(sessionId) {
    const file = getSessionFile(sessionId);
    if (_fs.default.existsSync(file)) {
        const raw = _fs.default.readFileSync(file, "utf-8");
        return JSON.parse(raw);
    }
    return [];
}
function saveMessages(sessionId, messages) {
    const file = getSessionFile(sessionId);
    _fs.default.writeFileSync(file, JSON.stringify(messages, null, 2));
}
function formatGeminiMessages(messages) {
    return {
        contents: [
            {
                parts: messages.map((m)=>({
                        text: `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
                    }))
            }
        ]
    };
}
function _default(ctx, args) {
    return _async_to_generator(function*() {
        var _ctx_inputs_data_body, _ctx_inputs_data, _ctx_inputs, _ctx_inputs_data_body1, _ctx_inputs_data1, _ctx_inputs1, _ctx_inputs_data_body2, _ctx_inputs_data2, _ctx_inputs2, _ctx_inputs_data_body3, _ctx_inputs_data3, _ctx_inputs3, _ctx_inputs_data_body4, _ctx_inputs_data4, _ctx_inputs4, _ctx_inputs_data_body5, _ctx_inputs_data5, _ctx_inputs5;
        const sessionId = ((_ctx_inputs = ctx.inputs) === null || _ctx_inputs === void 0 ? void 0 : (_ctx_inputs_data = _ctx_inputs.data) === null || _ctx_inputs_data === void 0 ? void 0 : (_ctx_inputs_data_body = _ctx_inputs_data.body) === null || _ctx_inputs_data_body === void 0 ? void 0 : _ctx_inputs_data_body.session_id) || '';
        const user_enegram_type = ((_ctx_inputs1 = ctx.inputs) === null || _ctx_inputs1 === void 0 ? void 0 : (_ctx_inputs_data1 = _ctx_inputs1.data) === null || _ctx_inputs_data1 === void 0 ? void 0 : (_ctx_inputs_data_body1 = _ctx_inputs_data1.body) === null || _ctx_inputs_data_body1 === void 0 ? void 0 : _ctx_inputs_data_body1.user_enegram_type) || '';
        const partner_enegram_type = ((_ctx_inputs2 = ctx.inputs) === null || _ctx_inputs2 === void 0 ? void 0 : (_ctx_inputs_data2 = _ctx_inputs2.data) === null || _ctx_inputs_data2 === void 0 ? void 0 : (_ctx_inputs_data_body2 = _ctx_inputs_data2.body) === null || _ctx_inputs_data_body2 === void 0 ? void 0 : _ctx_inputs_data_body2.partner_enegram_type) || '';
        const relationship_type = ((_ctx_inputs3 = ctx.inputs) === null || _ctx_inputs3 === void 0 ? void 0 : (_ctx_inputs_data3 = _ctx_inputs3.data) === null || _ctx_inputs_data3 === void 0 ? void 0 : (_ctx_inputs_data_body3 = _ctx_inputs_data3.body) === null || _ctx_inputs_data_body3 === void 0 ? void 0 : _ctx_inputs_data_body3.relationship_type) || '';
        const add_relationship_comment = ((_ctx_inputs4 = ctx.inputs) === null || _ctx_inputs4 === void 0 ? void 0 : (_ctx_inputs_data4 = _ctx_inputs4.data) === null || _ctx_inputs_data4 === void 0 ? void 0 : (_ctx_inputs_data_body4 = _ctx_inputs_data4.body) === null || _ctx_inputs_data_body4 === void 0 ? void 0 : _ctx_inputs_data_body4.add_relationship_comment) || '';
        const user_query = ((_ctx_inputs5 = ctx.inputs) === null || _ctx_inputs5 === void 0 ? void 0 : (_ctx_inputs_data5 = _ctx_inputs5.data) === null || _ctx_inputs_data5 === void 0 ? void 0 : (_ctx_inputs_data_body5 = _ctx_inputs_data5.body) === null || _ctx_inputs_data_body5 === void 0 ? void 0 : _ctx_inputs_data_body5.user_query) || '';
        const messages = loadMessages(sessionId);
        if (user_query.length === 0) {
            const vs = new _vectorStore.VectorStore();
            const context_query = `Eneagram Types: ${user_enegram_type},${partner_enegram_type}`;
            const docs = yield vs.search(context_query);
            const unique_docs = Array.from(new Set(docs.map((doc)=>`${doc.content}`)));
            const eneagram_context = unique_docs.join('\n');
            const userInput = `Here are the details given by user about his eneagram type and other person's eneagram types.
       He/She has also given their relationship type and additional insights in their dynamics.
     - User's Eneagram Type:${user_enegram_type}
     - Other Person's Eneagram Type:${partner_enegram_type}
     - Relationship Type:${relationship_type}
     - Additional Insightes in Their Dynamics:${add_relationship_comment}`;
            messages.push({
                role: "user",
                content: userInput
            });
            messages.push({
                role: "tool",
                content: eneagram_context
            });
            saveMessages(sessionId, messages);
            return new _core.GSStatus(true, 200, undefined, {
                message: " Users info has been secured correctly."
            });
        } else {
            messages.push({
                role: "user",
                content: user_query
            });
            try {
                const llmResp = yield _axios.default.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: process.env.MODEL_NAME,
                    messages: [
                        {
                            role: "system",
                            content: _system_prompts_archive.relationship_advice_system_prompt
                        },
                        ...messages
                    ]
                }, {
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                });
                const llmMessage = llmResp.data.choices[0].message.content.trim();
                messages.push({
                    role: "assistant",
                    content: llmMessage
                });
                const isRetrieval = llmMessage.includes("RETRIEVE");
                var responseMessage;
                if (isRetrieval) {
                    var _llmMessage_split_;
                    const query = ((_llmMessage_split_ = llmMessage.split("RETRIEVE")[1]) === null || _llmMessage_split_ === void 0 ? void 0 : _llmMessage_split_.trim()) || "";
                    const vs = new _vectorStore.VectorStore();
                    // Vector search using the constructed query
                    const docs = yield vs.search(query);
                    const unique_docs = Array.from(new Set(docs.map((doc)=>`${doc.content}`)));
                    const context = unique_docs.join('\n');
                    messages.push({
                        role: "tool",
                        content: context
                    });
                    // Ask LLM to issue the final verdict using context
                    const verdictResp = yield _axios.default.post("https://openrouter.ai/api/v1/chat/completions", {
                        model: process.env.MODEL_NAME,
                        messages: [
                            {
                                role: "system",
                                content: _system_prompts_archive.relationship_advice_system_prompt
                            },
                            ...messages
                        ]
                    }, {
                        headers: {
                            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            "Content-Type": "application/json"
                        }
                    });
                    responseMessage = verdictResp.data.choices[0].message.content.trim();
                    messages.push({
                        role: "assistant",
                        content: responseMessage
                    });
                } else {
                    responseMessage = llmMessage;
                }
            } catch (e) {
                const prompt = formatGeminiMessages([
                    {
                        role: "system",
                        content: _system_prompts_archive.relationship_advice_system_prompt
                    },
                    ...messages
                ]);
                const geminiResp = yield _axios.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`, prompt, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                const geminireply = geminiResp.data.candidates[0].content.parts[0].text.trim();
                messages.push({
                    role: "assistant",
                    content: geminireply
                });
                const isRetrieval = geminireply.includes("RETRIEVE");
                var responseMessage;
                if (isRetrieval) {
                    var _geminireply_split_;
                    const query = ((_geminireply_split_ = geminireply.split("RETRIEVE")[1]) === null || _geminireply_split_ === void 0 ? void 0 : _geminireply_split_.trim()) || "";
                    const vs = new _vectorStore.VectorStore();
                    // Vector search using the constructed query
                    const docs = yield vs.search(query);
                    const unique_docs = Array.from(new Set(docs.map((doc)=>`${doc.content}`)));
                    const context = unique_docs.join('\n');
                    messages.push({
                        role: "tool",
                        content: context
                    });
                    const verdictprompt = formatGeminiMessages([
                        {
                            role: "system",
                            content: _system_prompts_archive.relationship_advice_system_prompt
                        },
                        ...messages
                    ]);
                    const verdictResp = yield _axios.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`, verdictprompt, {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
                    responseMessage = verdictResp.data.candidates[0].content.parts[0].text.trim();
                    messages.push({
                        role: "assistant",
                        content: responseMessage
                    });
                } else {
                    // LLM is not ready yet — ask another question
                    responseMessage = geminireply;
                }
            }
            saveMessages(sessionId, messages);
            return new _core.GSStatus(true, 200, undefined, {
                message: responseMessage
            });
        }
    })();
}

//# sourceMappingURL=relationship_advice.js.map