// import { GSContext, GSStatus, PlainObject } from "@godspeedsystems/core";
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VectorStore", {
    enumerable: true,
    get: function() {
        return VectorStore;
    }
});
const _faissnode = require("faiss-node");
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _googlegenai = require("@langchain/google-genai");
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
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
console.log("Loaded @langchain/google-genai");
class VectorStore {
    upsert(docId, content) {
        return _async_to_generator(function*() {
            // const contentHash = this.getHash(content);
            // if (docId in this.metadata && this.metadata[docId].contentHash === contentHash) {
            //     console.log(`[${docId}] No change detected. Skipping.`);
            //     return;
            // }
            const chunks = this.chunkText(content);
            console.log("Creating chunks...");
            const embeddings = yield this.model.embedDocuments(chunks);
            console.log("Creating embeddings...");
            const flatEmbeddings = embeddings.flat();
            this.index.add(flatEmbeddings);
            console.log("Adding embeddings...");
            for(let i = 0; i < embeddings.length; i++){
                this.docIdByVectorIdx.push(docId);
            }
            console.log("Adding embeddings...");
            this.metadata[docId] = {
                content
            };
            console.log("Adding embeddings...");
            this.save();
            console.log(`[${docId}] Upserted successfully.`);
        }).call(this);
    }
    search(query, k = 5) {
        return _async_to_generator(function*() {
            const queryVec = yield this.model.embedQuery(query);
            const queryArray = queryVec;
            const result = this.index.search(queryArray, k);
            console.log(result);
            const hits = [];
            for(let i = 0; i < result.labels.length; i++){
                const idx = result.labels[i];
                console.log(idx);
                const docId = this.docIdByVectorIdx[idx];
                console.log(docId);
                // console.log(this.metadata[docId].content);
                if (docId && this.metadata[docId]) {
                    hits.push({
                        docId: docId,
                        content: this.metadata[docId].content
                    });
                }
            }
            return hits;
        }).call(this);
    }
    ensureDir(filePath) {
        const dir = _path.dirname(filePath);
        if (!_fs.existsSync(dir)) {
            _fs.mkdirSync(dir, {
                recursive: true
            });
        }
    }
    save() {
        console.log("Entering...");
        try {
            this.ensureDir(this.indexPath);
            this.index.write(this.indexPath);
        } catch (err) {
            console.error("Failed to write index:", err);
        }
        try {
            this.ensureDir(this.metaPath);
            _fs.writeFileSync(this.metaPath, JSON.stringify(this.metadata, null, 2));
        } catch (err) {
            console.error("Failed to write metadata:", err);
        }
        try {
            this.ensureDir(this.docIdMapPath);
            _fs.writeFileSync(this.docIdMapPath, JSON.stringify(this.docIdByVectorIdx, null, 2));
        } catch (err) {
            console.error("Failed to write docId map:", err);
        }
        console.log("Save complete.");
    }
    removeDocument(docId) {
        return _async_to_generator(function*() {
            if (!(docId in this.metadata)) {
                console.log(`[${docId}] Not found in index. Skipping removal.`);
                return;
            }
            // Step 1: Identify vector indices to remove
            const indicesToRemove = [];
            for(let i = 0; i < this.docIdByVectorIdx.length; i++){
                if (this.docIdByVectorIdx[i] === docId) {
                    indicesToRemove.push(i);
                }
            }
            if (indicesToRemove.length === 0) {
                console.log(`[${docId}] No associated vectors found. Only metadata removed.`);
                delete this.metadata[docId];
                this.save();
                return;
            }
            // Step 2: Remove vectors from FAISS index
            const removedCount = this.index.removeIds(indicesToRemove);
            console.log(`[${docId}] Removed ${removedCount} vectors from FAISS index.`);
            // Step 3: Remove metadata
            delete this.metadata[docId];
            // Step 4: Rebuild docIdByVectorIdx (preserving correct order after FAISS shift)
            const removalSet = new Set(indicesToRemove);
            this.docIdByVectorIdx = this.docIdByVectorIdx.filter((_, idx)=>!removalSet.has(idx));
            // Step 5: Save all state
            this.save();
            console.log(`[${docId}] Document fully removed and index state updated.`);
        }).call(this);
    }
    chunkText(text, maxTokens = 500, overlap = 100) {
        const words = text.split(/\s+/);
        const chunks = [];
        let start = 0;
        while(start < words.length){
            const end = Math.min(start + maxTokens, words.length);
            chunks.push(words.slice(start, end).join(' '));
            start += maxTokens - overlap;
        }
        return chunks;
    }
    constructor(indexPath = _path.resolve(__dirname, '../../index/index.faiss'), metaPath = _path.resolve(__dirname, '../../index/metadata.json'), docIdMapPath = _path.resolve(__dirname, '../../index/docIdMap.json')){
        _define_property(this, "indexPath", void 0);
        _define_property(this, "metaPath", void 0);
        _define_property(this, "docIdMapPath", void 0);
        _define_property(this, "model", void 0);
        _define_property(this, "index", void 0);
        _define_property(this, "metadata", {});
        _define_property(this, "docIdByVectorIdx", []);
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('Missing GOOGLE_API_KEY in .env');
        this.indexPath = indexPath;
        this.metaPath = metaPath;
        this.docIdMapPath = docIdMapPath;
        this.metadata = {};
        this.docIdByVectorIdx = [];
        this.model = new _googlegenai.GoogleGenerativeAIEmbeddings({
            apiKey: apiKey,
            modelName: 'models/embedding-001'
        });
        const dim = 768;
        if (_fs.existsSync(this.indexPath)) {
            this.index = _faissnode.IndexFlatL2.read(this.indexPath);
        } else {
            this.index = new _faissnode.IndexFlatL2(dim);
        }
        if (_fs.existsSync(this.metaPath)) {
            this.metadata = JSON.parse(_fs.readFileSync(this.metaPath, 'utf-8'));
        }
        if (_fs.existsSync(this.docIdMapPath)) {
            this.docIdByVectorIdx = JSON.parse(_fs.readFileSync(this.docIdMapPath, 'utf-8'));
        }
    }
} // let indexPath = path.resolve(__dirname, '../../index/index.faiss');
 // let metaPath = path.resolve(__dirname, '../../index/metadata.json');
 // let docIdMapPath = path.resolve(__dirname, '../../index/docIdMap.json');
 // function chunkText(text:string, maxTokens = 500, overlap = 100) {
 //     const words = text.split(/\s+/);
 //     const chunks = [];
 //     let start = 0;
 //     while (start < words.length) {
 //         const end = Math.min(start + maxTokens, words.length);
 //         chunks.push(words.slice(start, end).join(' '));
 //         start += maxTokens - overlap;
 //     }
 //     return chunks;
 // }
 // const dim = 768;
 // let index = fs.existsSync(indexPath)
 //   ? IndexFlatL2.read(indexPath)
 //   : new IndexFlatL2(dim);
 // let metadata = fs.existsSync(metaPath)
 //   ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
 //   : {};
 // let docIdByVectorIdx: string[] = fs.existsSync(docIdMapPath)
 //   ? JSON.parse(fs.readFileSync(docIdMapPath, 'utf-8'))
 //   : [];
 // const model = new GoogleGenerativeAIEmbeddings({
 //   apiKey: "AIzaSyA19pwj8bBo95b8ibf0yjnSErRn_CXRFz4",
 //   model: 'models/embedding-001'
 // });
 // function save() {
 //   index.write(indexPath);
 //   fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
 //   fs.writeFileSync(docIdMapPath, JSON.stringify(docIdByVectorIdx, null, 2));
 // }
 // export default async function (ctx: GSContext, args: PlainObject): Promise<GSStatus> {
 //   try {
 //     const { docId, content, query, mode = 'upsert', k = 5 } = args;
 //     if (mode === 'upsert') {
 //     //   const contentHash = getHash(content);
 //     //   if (docId in metadata && metadata[docId].contentHash === contentHash) {
 //     //     ctx.childLogger.info(`[${docId}] No change detected. Skipping.`);
 //     //     return new GSStatus(true, 200, undefined, { message: 'No update needed.' });
 //     //   }
 //       const chunks = chunkText(content);
 //       const embeddings = await model.embedDocuments(chunks);
 //       const flatEmbeddings = embeddings.flat();
 //       index.add(flatEmbeddings);
 //       for (let i = 0; i < embeddings.length; i++) {
 //         docIdByVectorIdx.push(docId);
 //       }
 //       metadata[docId] = { content };
 //       save();
 //       return new GSStatus(true, 200, undefined, { message: 'Upserted successfully.', docId });
 //     }
 //     if (mode === 'search') {
 //       const queryVec = await model.embedQuery(query);
 //       const result = index.search(queryVec, k);
 //       console.log(result);
 //       const hits = [];
 //       for (let i = 0; i < result.labels.length; i++) {
 //             const idx = result.labels[i];
 //             console.log(idx);
 //             const docId = docIdByVectorIdx[idx];
 //             console.log(docId);
 //             // console.log(this.metadata[docId].content);
 //             if (docId && metadata[docId]) {
 //                 hits.push({
 //                     docId:docId,
 //                     content: metadata[docId].content
 //                 });
 //             }
 //       }
 //       // const hits = result.labels.map((idx: number) => {
 //       //   const id = docIdByVectorIdx[idx];
 //       //   return {
 //       //     docId: id,
 //       //     content: metadata[id]?.content,
 //       //     chunks: metadata[id]?.chunks
 //       //   };
 //       // });
 //       return new GSStatus(true, 200, undefined, hits);
 //     }
 //     if (mode === 'remove') {
 //       if (!(docId in metadata)) {
 //         return new GSStatus(true, 404, 'Document not found.');
 //       }
 //       // Step 1: Identify vector indices to remove
 //       const indicesToRemove = [];
 //       for (let i = 0; i < docIdByVectorIdx.length; i++) {
 //         if (docIdByVectorIdx[i] === docId) {
 //             indicesToRemove.push(i);
 //         }
 //       }
 //       if (indicesToRemove.length === 0) {
 //         console.log(`[${docId}] No associated vectors found. Only metadata removed.`);
 //         delete metadata[docId];
 //         save();
 //         return new GSStatus(true, 200, undefined, { message: 'No associated vectors found. Only metadata removed.', docId });;
 //       }
 //       // Step 2: Remove vectors from FAISS index
 //       const removedCount = index.removeIds(indicesToRemove);
 //       console.log(`[${docId}] Removed ${removedCount} vectors from FAISS index.`);
 //       delete metadata[docId];
 //       const removalSet = new Set(indicesToRemove);
 //       docIdByVectorIdx = docIdByVectorIdx.filter((_, idx) => !removalSet.has(idx));
 //       save();
 //       return new GSStatus(true, 200, undefined, { message: 'Marked for removal. Rebuild index required.', docId });
 //     }
 //     return new GSStatus(false, 400, 'Invalid mode specified.');
 //   } catch (err: any) {
 //     ctx.logger.error('VectorStore operation failed %o', err);
 //     return new GSStatus(false, 500, 'Internal Error', { message: err.message });
 //   }
 // }

//# sourceMappingURL=vectorStore.js.map