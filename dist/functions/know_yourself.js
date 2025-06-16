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
const CONVO_DIR = _path.default.resolve(__dirname, "../../conversations/Personality");
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
        const { sessionId, userInput } = ctx.inputs.data.body;
        const messages = loadMessages(sessionId);
        messages.push({
            role: "user",
            content: userInput
        });
        try {
            const llmResp = yield _axios.default.post("https://openrouter.ai/api/v1/chat/completions", {
                model: process.env.MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: _system_prompts_archive.personality_questions_prompt
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
                // Ask LLM to issue the final verdict using context
                const verdictResp = yield _axios.default.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: process.env.MODEL_NAME,
                    messages: [
                        {
                            role: "system",
                            content: `${_system_prompts_archive.final_personality_verdict_prompt}\n\nBOOK:\n${context}`
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
                // LLM is not ready yet — ask another question
                responseMessage = llmMessage;
            }
        } catch (e) {
            const prompt = formatGeminiMessages([
                {
                    role: "system",
                    content: _system_prompts_archive.personality_questions_prompt
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
                const verdictprompt = formatGeminiMessages([
                    {
                        role: "system",
                        content: `${_system_prompts_archive.final_personality_verdict_prompt}\n\nBOOK:\n${context}`
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
        // Update memory into ctx.outputs using GSStatus
        saveMessages(sessionId, messages);
        // Return final message (question or verdict)
        return new _core.GSStatus(true, 200, undefined, {
            message: responseMessage
        });
    })();
}

//# sourceMappingURL=know_yourself.js.map