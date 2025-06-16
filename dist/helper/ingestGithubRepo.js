// import { GSContext, GSStatus, PlainObject } from "@godspeedsystems/core";
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get ingestChangedFiles () {
        return ingestChangedFiles;
    },
    get ingestUploadedFile () {
        return ingestUploadedFile;
    },
    get loadRepoUrl () {
        return loadRepoUrl;
    }
});
const _nodefetch = /*#__PURE__*/ _interop_require_default(require("node-fetch"));
const _promises = /*#__PURE__*/ _interop_require_wildcard(require("fs/promises"));
const _vectorStore = require("./vectorStore");
const _pdfparse = /*#__PURE__*/ _interop_require_default(require("pdf-parse"));
const _tesseract = require("tesseract.js");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _mammoth = /*#__PURE__*/ _interop_require_default(require("mammoth"));
const _nodehtmlparser = require("node-html-parser");
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
// const COMMIT_FILE = '../../data/last_commit.json';
// const REPO_URL_FILE = '../../data/repo_url.json';
const COMMIT_FILE = _path.resolve(__dirname, '../../data/last_commit.json');
const REPO_URL_FILE = _path.resolve(__dirname, '../../data/repo_url.json');
function saveLastCommit(repo, commitSha) {
    return _async_to_generator(function*() {
        yield _promises.writeFile(COMMIT_FILE, JSON.stringify({
            repo,
            commit: commitSha
        }), 'utf-8');
    })();
}
function loadLastCommit() {
    return _async_to_generator(function*() {
        try {
            const data = yield _promises.readFile(COMMIT_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    })();
}
function loadRepoUrl() {
    return _async_to_generator(function*() {
        try {
            const data = yield _promises.readFile(REPO_URL_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    })();
}
function getLatestCommitSha(owner, repo, branch) {
    return _async_to_generator(function*() {
        const url = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
        const res = yield (0, _nodefetch.default)(url);
        if (!res.ok) throw new Error(`Failed to fetch latest commit SHA: ${res.statusText}`);
        const json = yield res.json();
        return json.sha;
    })();
}
function getChangedFiles(owner, repo, baseSha, headSha) {
    return _async_to_generator(function*() {
        const url = `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`;
        const res = yield (0, _nodefetch.default)(url);
        if (!res.ok) throw new Error(`Failed to fetch changed files: ${res.statusText}`);
        const json = yield res.json();
        const changed = [];
        const deleted = [];
        for (const file of json.files || []){
            if (file.status === 'modified' || file.status === 'added') changed.push(file.filename);
            else if (file.status === 'removed') deleted.push(file.filename);
        }
        return {
            changed,
            deleted
        };
    })();
}
function extractTextFromPdf(buffer) {
    return _async_to_generator(function*() {
        try {
            const data = yield (0, _pdfparse.default)(buffer);
            if (data.text && data.text.trim().length > 30) {
                return data.text;
            } else {
                const worker = yield (0, _tesseract.createWorker)();
                const w = yield worker;
                yield w.load();
                yield w.loadLanguage('eng');
                yield w.initialize('eng');
                const { data: { text } } = yield w.recognize(buffer);
                yield w.terminate();
                return text;
            }
        } catch (e) {
            return '';
        }
    })();
}
function ingestChangedFiles(repoUrl, branch = 'main') {
    return _async_to_generator(function*() {
        // const { repoUrl, branch = 'main' } = args;
        console.log("Entering...");
        const parts = repoUrl.replace(/\/$/, '').split('/');
        const owner = parts[parts.length - 2];
        const repo = parts[parts.length - 1];
        const latestSha = yield getLatestCommitSha(owner, repo, branch);
        console.log("Got latest sha..");
        const state = yield loadLastCommit();
        console.log("Got last commit...");
        if (state.repo === repo && state.commit === latestSha) {
            console.log('No new commit. Skipping ingestion.');
            return;
        }
        const vs = new _vectorStore.VectorStore();
        console.log("Created vectorstore..");
        let changedFiles = [];
        let deletedFiles = [];
        if (state.repo === repo && state.commit) {
            console.log("Getting changed files");
            const changes = yield getChangedFiles(owner, repo, state.commit, latestSha);
            changedFiles = changes.changed;
            deletedFiles = changes.deleted;
        } else {
            // First time: get all files from HEAD
            const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
            const treeRes = yield (0, _nodefetch.default)(treeUrl);
            console.log("Got tree....");
            if (!treeRes.ok) throw new Error(`Failed to fetch repo tree: ${treeRes.statusText}`);
            const treeJson = yield treeRes.json();
            changedFiles = treeJson.tree.filter((f)=>f.type === 'blob').map((f)=>f.path);
            console.log("Got changed files...");
            deletedFiles = [];
        }
        for (const filePath of deletedFiles){
            console.log(`Removing deleted file from vector DB: ${filePath}`);
            yield vs.removeDocument(filePath);
        }
        const allowedExts = new Set([
            '.md',
            '.txt',
            '.pdf',
            '.mdx'
        ]);
        for (const filePath of changedFiles){
            try {
                const ext = _path.extname(filePath).toLowerCase();
                if (!allowedExts.has(ext)) continue;
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
                const contentRes = yield (0, _nodefetch.default)(rawUrl);
                console.log("Got content...");
                if (!contentRes.ok) {
                    console.log(`Failed to fetch content for: ${filePath} (status ${contentRes.status})`);
                    continue;
                }
                let content;
                if (ext === '.pdf') {
                    const buffer = yield contentRes.buffer();
                    content = yield extractTextFromPdf(buffer);
                } else {
                    content = yield contentRes.text();
                }
                if (content.length > 0) {
                    console.log(`Re-ingesting file: ${filePath}`);
                    yield vs.removeDocument(filePath);
                    console.log("Done removal...");
                    yield vs.upsert(filePath, content);
                }
            } catch (e) {
                console.error(`Error processing file ${filePath}:`, e);
            }
        }
        yield saveLastCommit(repo, latestSha);
        console.log('Ingestion complete.');
    })();
}
function ingestUploadedFile(file, filename) {
    return _async_to_generator(function*() {
        const ext = _path.extname(filename).toLowerCase();
        const buffer = Buffer.from(file, "base64");
        let content = "";
        switch(ext){
            case ".pdf":
                const pdf = yield extractTextFromPdf(buffer);
                content = pdf;
                break;
            case ".docx":
                const result = yield _mammoth.default.extractRawText({
                    buffer
                });
                content = result.value;
                break;
            case ".txt":
            case ".md":
                content = buffer.toString("utf-8");
                break;
            case ".html":
                const root = (0, _nodehtmlparser.parse)(buffer.toString("utf-8"));
                content = root.text;
                break;
            default:
                return `Unsupported file type: ${ext}`;
        }
        const vs = new _vectorStore.VectorStore();
        const docId = _path.basename(filename, _path.extname(filename));
        console.log(`[${docId}] Starting ingestion.`);
        // Step 1: Split by pages or sections
        const pages = content.split(/\n{2,}/).filter((p)=>p.trim().length > 0);
        console.log(`[${docId}] ${pages.length} logical pages found.`);
        // Step 2: Process each page
        for(let i = 0; i < pages.length; i++){
            const pageContent = pages[i];
            const pageId = `${docId}_page_${i + 1}`;
            vs.upsert(pageId, pageContent);
        }
        return `Document '${filename}' ingested successfully.`;
    })();
}
 //     const repoUrl=ctx.config.repoUrl;
 //     const branch= 'main';
 //     if (!repoUrl) {
 //         return new GSStatus(false, 400, 'Missing repoUrl in args');
 //     }
 //     try {
 //         ctx.logger.info(`Starting ingestion from ${repoUrl}`);
 //         const parts = repoUrl.replace(/\/$/, '').split('/');
 //         const owner = parts[parts.length - 2];
 //         const repo = parts[parts.length - 1];
 //         const latestSha = await getLatestCommitSha(owner, repo, branch);
 //         const state = await loadLastCommit();
 //         if (state.repo === repo && state.commit === latestSha) {
 //             ctx.logger.info('No new commit. Skipping ingestion.');
 //             return new GSStatus(true, 200, undefined, { message: 'No update needed.' });
 //         }
 //         const vs = ctx.functions.vector_store;
 //         let changedFiles: string[] = [];
 //         let deletedFiles: string[] = [];
 //         if (state.repo === repo && state.commit) {
 //             const changes = await getChangedFiles(owner, repo, state.commit, latestSha);
 //             changedFiles = changes.changed;
 //             deletedFiles = changes.deleted;
 //         } else {
 //             const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
 //             const treeRes = await fetch(treeUrl);
 //             if (!treeRes.ok) throw new Error(`Failed to fetch repo tree: ${treeRes.statusText}`);
 //             const treeJson = await treeRes.json() as GitTreeResponse;
 //             changedFiles = treeJson.tree.filter((f: any) => f.type === 'blob').map((f: any) => f.path);
 //         }
 //         for (const filePath of deletedFiles) {
 //             ctx.childLogger.info(`Removing deleted file: ${filePath}`);
 //             await vs.removeDocument(filePath);
 //         }
 //         const allowedExts = new Set(['.md', '.txt', '.pdf', '.mdx']);
 //         for (const filePath of changedFiles) {
 //             try {
 //                 const ext = path.extname(filePath).toLowerCase();
 //                 if (!allowedExts.has(ext)) continue;
 //                 const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
 //                 const contentRes = await fetch(rawUrl);
 //                 if (!contentRes.ok) continue;
 //                 let content: string;
 //                 // if (ext === '.pdf') {
 //                 //     const buffer = await contentRes.buffer();
 //                 //     content = await extractTextFromPdf(buffer);
 //                 // } else {
 //                     content = await contentRes.text();
 //                 // }
 //                 // ctx.logger.info(content)
 //                 if (content.length > 0) {
 //                     ctx.logger.info('reached ')
 //                     // await vs.removeDocument(filePath);
 //                     // await vs.upsert(filePath, content);
 //                     await vs(ctx, { docId: filePath, mode: 'remove' });
 //                     await vs(ctx, { docId: filePath, content, mode: 'upsert' });
 //                     ctx.childLogger.info(`Upserted ${filePath}`);
 //                 }
 //             } catch (err) {
 //                 ctx.childLogger.error(`Error processing ${filePath}: %o`, err);
 //             }
 //         }
 //         await saveLastCommit(repo, latestSha);
 //         return new GSStatus(true, 200, undefined, { message: 'Ingestion complete.', changedFiles });
 //     } catch (err: any) {
 //         ctx.logger.error(`Ingestion failed: %o`, err);
 //         return new GSStatus(false, 500, 'GitHub ingestion error', { error: err.message });
 //     }
 // }

//# sourceMappingURL=ingestGithubRepo.js.map