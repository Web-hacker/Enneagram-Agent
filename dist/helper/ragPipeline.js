"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CompleteRAGPipeline", {
    enumerable: true,
    get: function() {
        return CompleteRAGPipeline;
    }
});
const _vectorStore = require("./vectorStore");
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
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
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
class CompleteRAGPipeline {
    formatGeminiMessages(messages) {
        return _async_to_generator(function*() {
            return {
                contents: [
                    {
                        parts: messages.map((m)=>({
                                text: `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
                            }))
                    }
                ]
            };
        })();
    }
    run(query, k = 5) {
        return _async_to_generator(function*() {
            console.log('Querying docs...');
            const docs = yield this.vs.search(query, k);
            console.log('Creating context...');
            const unique_docs = Array.from(new Set(docs.map((doc)=>`${doc.content}`)));
            const context = unique_docs.join('\n');
            console.log('Creating messages...');
            const sourceFiles = Array.from(new Set(docs.map((doc)=>doc.docId)));
            // const sourceFiles = unique_sourceFiles
            console.log(sourceFiles);
            console.log('Asking LLM...');
            const apiKey = process.env.OPENROUTER_API_KEY;
            const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
            if (!apiKey) console.log("API_KEY is not loaded");
            console.log(apiKey);
            console.log("Initialise Openrouter model...");
            try {
                var _response_data_choices__message_content, _response_data_choices__message, _response_data_choices_, _response_data_choices;
                // var response = await openai.chat.completions.create({
                var response = yield _axios.default.post("https://openrouter.ai/api/v1/chat/completions", {
                    model: process.env.MODEL_NAME,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an AI assistant whose Purpose is to: 
1.elevate and deepen understanding   
2.minimise potential conflicts       
3.Navigate long term pattern dynamics for resolution     

using the given context and query.  

First thing to do is to identify the two enneagram types:  
Type A:Find out the type of the person in question.            
Type B:Relationship dynamics for every combination of each enneagram type 

The context is given from a book called Enneagram cards. The book is called Enneagram Cards because these reveal the survival wiring of each type which runs in each of us and creates the lens we view the world. Revealing this to the User is your goal.

Add the information regarding the movements of planters could be a good idea  
So you are directed to move through the darker elements and bring them into the awareness.   
In short you can access the enneagram types and reveal the relationship dynamics. So with all the esoteric nature of the satchitaband, sacred geometry, the power of the enneagram and its sacred algorithm will elevate relationships to anyone who uses it with sincerity and the ability to self reflect.  

You have 3 areas to explore:  

1.Work   
2.Family  
3.Lover relationships  

Now answer user query based on the given context`.trim()
                        },
                        {
                            role: 'user',
                            content: `Context:\n${context}\n\nQuestion: ${query}\nAnswer:`
                        }
                    ]
                }, {
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                });
                console.log("Got response...");
                var answer = ((_response_data_choices = response.data.choices) === null || _response_data_choices === void 0 ? void 0 : (_response_data_choices_ = _response_data_choices[0]) === null || _response_data_choices_ === void 0 ? void 0 : (_response_data_choices__message = _response_data_choices_.message) === null || _response_data_choices__message === void 0 ? void 0 : (_response_data_choices__message_content = _response_data_choices__message.content) === null || _response_data_choices__message_content === void 0 ? void 0 : _response_data_choices__message_content.trim()) || 'No response.';
            } catch (e) {
                const prompt = yield this.formatGeminiMessages([
                    {
                        role: "system",
                        content: `You are an AI assistant whose Purpose is to: 
1.elevate and deepen understanding   
2.minimise potential conflicts       
3.Navigate long term pattern dynamics for resolution     

using the given context and query.  

First thing to do is to identify the two enneagram types:  
Type A:Find out the type of the person in question.            
Type B:Relationship dynamics for every combination of each enneagram type 

The context is given from a book called Enneagram cards. The book is called Enneagram Cards because these reveal the survival wiring of each type which runs in each of us and creates the lens we view the world. Revealing this to the User is your goal.

Add the information regarding the movements of planters could be a good idea  
So you are directed to move through the darker elements and bring them into the awareness.   
In short you can access the enneagram types and reveal the relationship dynamics. So with all the esoteric nature of the satchitaband, sacred geometry, the power of the enneagram and its sacred algorithm will elevate relationships to anyone who uses it with sincerity and the ability to self reflect.  

You have 3 areas to explore:  

1.Work   
2.Family  
3.Lover relationships  

Now answer user query based on the given context`.trim()
                    }
                ]);
                var geminiResp = yield _axios.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`, prompt, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                console.log("Got response...");
                var answer = geminiResp.data.candidates[0].content.parts[0].text.trim();
            }
            return {
                answer: answer,
                source_files: sourceFiles
            };
        }).call(this);
    }
    constructor(){
        _define_property(this, "vs", void 0);
        console.log('Initializing OpenRouterAI model...');
        console.log(`Initialized ${process.env.MODEL_NAME} model.`);
        console.log('Loading vector store...');
        this.vs = new _vectorStore.VectorStore();
        // this.vs.loadOrInitializeIndex();
        console.log('Vector store loaded...');
    }
}

//# sourceMappingURL=ragPipeline.js.map