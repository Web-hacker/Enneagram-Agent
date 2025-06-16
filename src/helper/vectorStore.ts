// import { GSContext, GSStatus, PlainObject } from "@godspeedsystems/core";
import { IndexFlatL2 } from 'faiss-node';
import * as fs from 'fs';
import * as path from 'path';
import  { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
console.log("Loaded @langchain/google-genai");
// import { chunkText } from './utils'; // Ensure you include utils.ts in your Godspeed project
// import crypto from 'crypto';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// const indexPath='../../index/index.faiss';
// const metaPath='../../index/metadata.json';
// const docIdMapPath='../../index/docIdMap.json';

interface Metadata {
  [docId: string]: {
    content: string;
  };
}

export class VectorStore {
  private indexPath: string;
  private metaPath: string;
  private docIdMapPath: string;
  private model: GoogleGenerativeAIEmbeddings;
  private index: IndexFlatL2;
  private metadata: Metadata = {};
  private docIdByVectorIdx: string[] = [];

  constructor(
    indexPath = path.resolve(__dirname, '../../index/index.faiss'),
    metaPath = path.resolve(__dirname, '../../index/metadata.json'),
    docIdMapPath = path.resolve(__dirname, '../../index/docIdMap.json')
  ){
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Missing GOOGLE_API_KEY in .env');

    this.indexPath = indexPath;
    this.metaPath = metaPath;
    this.docIdMapPath = docIdMapPath;
    this.metadata = {};
    this.docIdByVectorIdx = [];

    this.model = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: 'models/embedding-001'
    });

    const dim = 768;
    if (fs.existsSync(this.indexPath)) {
      this.index = IndexFlatL2.read(this.indexPath) as IndexFlatL2;
    } else {
      this.index = new IndexFlatL2(dim);
    }

    if (fs.existsSync(this.metaPath)) {
      this.metadata = JSON.parse(fs.readFileSync(this.metaPath, 'utf-8'));
    }

    if (fs.existsSync(this.docIdMapPath)) {
      this.docIdByVectorIdx = JSON.parse(fs.readFileSync(this.docIdMapPath, 'utf-8'));
    }
  }

  async upsert(docId: string, content: string): Promise<void> {
        // const contentHash = this.getHash(content);
        // if (docId in this.metadata && this.metadata[docId].contentHash === contentHash) {
        //     console.log(`[${docId}] No change detected. Skipping.`);
        //     return;
        // }
        const chunks = this.chunkText(content);
        console.log("Creating chunks...")
        const embeddings = await this.model.embedDocuments(chunks);
        console.log("Creating embeddings...")
        const flatEmbeddings = embeddings.flat();
        this.index.add(flatEmbeddings);
        console.log("Adding embeddings...")
        for (let i = 0; i < embeddings.length; i++) {
            this.docIdByVectorIdx.push(docId);
        }
        console.log("Adding embeddings...")
        this.metadata[docId] = {
            content
        };
        console.log("Adding embeddings...")
        this.save();
        console.log(`[${docId}] Upserted successfully.`);
    }

  async search(query: string, k = 5): Promise<any[]> {
        const queryVec = await this.model.embedQuery(query);
        const queryArray = queryVec;
        const result = this.index.search(queryArray, k);
        console.log(result);
        const hits = [];
        for (let i = 0; i < result.labels.length; i++) {
            const idx = result.labels[i];
            console.log(idx);
            const docId = this.docIdByVectorIdx[idx];
            console.log(docId);
            // console.log(this.metadata[docId].content);
            if (docId && this.metadata[docId]) {
                hits.push({
                    docId:docId,
                    content: this.metadata[docId].content
                });
            }
        }
        return hits;
  }

  private ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
 }

  private save(): void {
  console.log("Entering...");

  try {
    this.ensureDir(this.indexPath);
    this.index.write(this.indexPath);
  } catch (err) {
    console.error("Failed to write index:", err);
  }

  try {
    this.ensureDir(this.metaPath);
    fs.writeFileSync(this.metaPath, JSON.stringify(this.metadata, null, 2));
  } catch (err) {
    console.error("Failed to write metadata:", err);
  }

  try {
    this.ensureDir(this.docIdMapPath);
    fs.writeFileSync(this.docIdMapPath, JSON.stringify(this.docIdByVectorIdx, null, 2));
  } catch (err) {
    console.error("Failed to write docId map:", err);
  }

  console.log("Save complete.");
}



  async removeDocument(docId: string) {
    if (!(docId in this.metadata)) {
        console.log(`[${docId}] Not found in index. Skipping removal.`);
        return;
    }

    // Step 1: Identify vector indices to remove
    const indicesToRemove = [];
    for (let i = 0; i < this.docIdByVectorIdx.length; i++) {
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
    this.docIdByVectorIdx = this.docIdByVectorIdx.filter((_, idx) => !removalSet.has(idx));

    // Step 5: Save all state
    this.save();
    console.log(`[${docId}] Document fully removed and index state updated.`);
 }

  chunkText(text:string, maxTokens = 500, overlap = 100) {
    const words = text.split(/\s+/);
    const chunks = [];
    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + maxTokens, words.length);
        chunks.push(words.slice(start, end).join(' '));
        start += maxTokens - overlap;
    }
    return chunks;
}

}

// let indexPath = path.resolve(__dirname, '../../index/index.faiss');
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
