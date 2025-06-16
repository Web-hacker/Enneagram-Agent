import { GSContext, GSStatus, PlainObject } from "@godspeedsystems/core";
import axios from "axios";
import { VectorStore } from "../helper/vectorStore";
import fs from "fs";
import path from "path";
import { personality_questions_prompt,final_personality_verdict_prompt } from "../system_prompts/system_prompts_archive";


const GEMINI_API_KEY = process.env.GOOGLE_API_KEY!;
const CONVO_DIR = path.resolve(__dirname, "../../conversations/Personality");

if (!fs.existsSync(CONVO_DIR)) {
  fs.mkdirSync(CONVO_DIR);
}

function getSessionFile(sessionId: string) {
  return path.join(CONVO_DIR, `${sessionId}.json`);
}

function loadMessages(sessionId: string): any[] {
  const file = getSessionFile(sessionId);
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  }
  return [];
}

function saveMessages(sessionId: string, messages: any[]) {
  const file = getSessionFile(sessionId);
  fs.writeFileSync(file, JSON.stringify(messages, null, 2));
}

function formatGeminiMessages(messages: { role: string; content: string }[]) {
  return {
    contents: [
      {
        parts: messages.map(m => ({
          text: `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
        }))
      }
    ]
  };
}

export default async function (ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  const { sessionId, userInput } = ctx.inputs.data.body;

  const messages = loadMessages(sessionId);

  messages.push({ role: "user", content: userInput });

  try{
   const llmResp = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.MODEL_NAME!,
      messages: [
        {
          role: "system",
          content: personality_questions_prompt
        },
        ...messages
      ]
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const llmMessage = llmResp.data.choices[0].message.content.trim();
  messages.push({ role: "assistant", content: llmMessage });

  const isRetrieval = llmMessage.includes("RETRIEVE");
  var responseMessage: string;

  if (isRetrieval) {
    const query = llmMessage.split("RETRIEVE")[1]?.trim() || "";
    
    const vs = new VectorStore()
    // Vector search using the constructed query
    const docs = await vs.search(query);
    const unique_docs = Array.from(new Set(docs.map((doc) => `${doc.content}`)));
    const context = unique_docs.join('\n');

    // Ask LLM to issue the final verdict using context
    const verdictResp = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: process.env.MODEL_NAME!,
        messages: [
          {
            role: "system",
            content: `${final_personality_verdict_prompt}\n\nBOOK:\n${context}`
          },
          ...messages
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    responseMessage = verdictResp.data.choices[0].message.content.trim();
    messages.push({ role: "assistant", content: responseMessage });
  } else {
    // LLM is not ready yet — ask another question
    responseMessage = llmMessage;
  }
}
catch {

    const prompt = formatGeminiMessages([
    {
      role: "system",
      content: personality_questions_prompt
    },
    ...messages
  ]);

   const geminiResp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`,
      prompt,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const geminireply = geminiResp.data.candidates[0].content.parts[0].text.trim();
    messages.push({ role: "assistant", content: geminireply });

    const isRetrieval = geminireply.includes("RETRIEVE");
    var responseMessage: string;

  if (isRetrieval) {
    const query = geminireply.split("RETRIEVE")[1]?.trim() || "";
    
    const vs = new VectorStore()
    // Vector search using the constructed query
    const docs = await vs.search(query);
    const unique_docs = Array.from(new Set(docs.map((doc) => `${doc.content}`)));
    const context = unique_docs.join('\n');

    const verdictprompt = formatGeminiMessages([
    {
      role: "system",
      content: `${final_personality_verdict_prompt}\n\nBOOK:\n${context}`
    },
    ...messages
  ]);

    const verdictResp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`,
      verdictprompt,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    responseMessage = verdictResp.data.candidates[0].content.parts[0].text.trim();
    messages.push({ role: "assistant", content: responseMessage });
  } else {
    // LLM is not ready yet — ask another question
    responseMessage = geminireply;
  }

  }

  // Update memory into ctx.outputs using GSStatus
  saveMessages(sessionId, messages);

  // Return final message (question or verdict)
  return new GSStatus(true, 200, undefined, {message : responseMessage});
}
