import { GSContext, GSStatus, PlainObject } from "@godspeedsystems/core";
import axios from "axios";
import { VectorStore } from "../helper/vectorStore";
import fs from "fs";
import path from "path";
import { relationship_advice_system_prompt } from "../system_prompts/system_prompts_archive";

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY!;
const CONVO_DIR = path.resolve(__dirname, "../../conversations/Relationships");

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
    const sessionId = ctx.inputs?.data?.body?.session_id || '';
    const user_enegram_type = ctx.inputs?.data?.body?.user_enegram_type || '';
    const partner_enegram_type = ctx.inputs?.data?.body?.partner_enegram_type || '';
    const relationship_type = ctx.inputs?.data?.body?.relationship_type || '';
    const add_relationship_comment = ctx.inputs?.data?.body?.add_relationship_comment || '';

    const user_query = ctx.inputs?.data?.body?.user_query || '';

    const messages = loadMessages(sessionId);

    if(user_query.length === 0){

        const vs = new VectorStore()

        const context_query = `Eneagram Types: ${user_enegram_type},${partner_enegram_type}`

        const docs = await vs.search(context_query)
        const unique_docs = Array.from(new Set(docs.map((doc) => `${doc.content}`)));
        const eneagram_context = unique_docs.join('\n');

        const userInput = `Here are the details given by user about his eneagram type and other person's eneagram types.
       He/She has also given their relationship type and additional insights in their dynamics.
     - User's Eneagram Type:${user_enegram_type}
     - Other Person's Eneagram Type:${partner_enegram_type}
     - Relationship Type:${relationship_type}
     - Additional Insightes in Their Dynamics:${add_relationship_comment}`


        messages.push({ role: "user", content: userInput });
        messages.push({role:"tool",content:eneagram_context})
        saveMessages(sessionId, messages);

        return new GSStatus(true, 200, undefined, {message:" Users info has been secured correctly."});
    } else {

      messages.push({ role: "user", content: user_query });
      try {
           const llmResp = await axios.post(
               "https://openrouter.ai/api/v1/chat/completions",
            {
               model: process.env.MODEL_NAME!,
               messages: [
            {
                 role: "system",
                 content: relationship_advice_system_prompt
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

          messages.push({ role: "tool", content: context});

          // Ask LLM to issue the final verdict using context
          const verdictResp = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
              {
                 model: process.env.MODEL_NAME!,
                 messages: [
                      {
                          role: "system",
                          content: relationship_advice_system_prompt
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
           responseMessage = llmMessage;
        }
    } catch {

        const prompt = formatGeminiMessages([
        {
           role: "system",
           content: relationship_advice_system_prompt
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
           messages.push({ role: "tool", content: context});

           const verdictprompt = formatGeminiMessages([
             {
                   role: "system",
                   content: relationship_advice_system_prompt
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

    saveMessages(sessionId, messages);
    return new GSStatus(true, 200, undefined, {message : responseMessage});
  }
}