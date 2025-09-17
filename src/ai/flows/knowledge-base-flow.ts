
'use server';
/**
 * @fileOverview A knowledge base AI agent that answers questions based on uploaded documents.
 * This file defines a flow that uses a vector database to find relevant documents and generate an answer.
 */

import {z} from 'zod';
import {ai} from '@/ai/genkit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { googleAI } from '@genkit-ai/googleai';

// Define the input schema for our flow
const KnowledgeBaseInputSchema = z.object({
  query: z.string().describe("The user's question"),
});
export type KnowledgeBaseInput = z.infer<typeof KnowledgeBaseInputSchema>;

const promptTemplate = `You are "Flow", a friendly and professional AI assistant for the HelpFlow platform. Your role is to provide helpful, creative, and synthesized answers based on the user's question, using the provided knowledge base documents as your primary source of truth.

**Your Persona:**
- Be friendly, helpful, and conversational.
- Think, synthesize, and explain concepts. Don't just extract text.
- Your goal is to be a helpful partner, not just a search engine.
- Use markdown (like bullet points or bold text) to format your answers for clarity when appropriate.

**Your Core Instructions:**
1.  **Analyze the User's Question:** Understand the user's intent, even if the question isn't perfectly phrased.
2.  **Consult the Context:** Carefully review the provided document chunks. This is your knowledge base.
3.  **Synthesize and Answer Creatively:** Formulate a comprehensive answer by combining information from multiple chunks if necessary. Explain the information in a clear and easy-to-understand way. If the context gives you pieces of a puzzle, put them together to form a complete picture for the user.
4.  **Handle "I Don't Know" Scenarios Gracefully:** If the provided context truly does not contain the information needed to answer the question, do not make things up. Instead, respond in a friendly, conversational way. For example, say "That's a great question, but I couldn't find the information in my knowledge base. Could you try rephrasing it, or is there something else I can help with?" Avoid using the sterile phrase "IDK".

**Example Interaction:**

*User Question:* "How do our support tiers work?"

*Context Provided:*
- Chunk 1: "The Diamond Tier plan is our premium support package! It includes 24/7 phone support and a dedicated account manager."
- Chunk 2: "Our Gold Tier offers email support during business hours."
- Chunk 3: "Pricing for Gold is $499/month. Diamond is $999/month."

*Your (Correct) Creative Answer:*
"We have a couple of great support tiers to fit your needs!

*   **Gold Tier ($499/month):** This is a great option that provides email support during standard business hours.
*   **Diamond Tier ($999/month):** For the highest level of service, our premium Diamond Tier includes a dedicated account manager and 24/7 phone support.

Let me know if you'd like a more detailed comparison!"`;


/**
 * The main exported function that wraps our Genkit flow.
 * It now returns a stream directly from the flow.
 * @param supabase The Supabase client instance.
 *
 * @param input The user's query.
 * @returns A readable stream of the AI's answer.
 */
export async function askKnowledgeBase(
    supabase: SupabaseClient<Database>,
    input: KnowledgeBaseInput
): Promise<ReadableStream<string>> {
  const { query } = input;
  let context = "";
  
  try {
    // 1. Generate an embedding for the user's query using the *same model* as the documents.
    const embeddingResponse = await ai.embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: query,
    });

    const queryEmbedding = embeddingResponse;

    // 2. Query Supabase for similar documents
    const { data: documents, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_count: 5,
        min_similarity: 0.7,
      }
    );

    if (error) {
      throw new Error(`Failed to retrieve relevant documents: ${error.message}`);
    }

    if (documents) {
      context = documents.map((d: any) => d.content).join("\n\n");
    }

  } catch (error) {
    // If any part of the document retrieval fails, log the error and proceed with empty context.
    console.error("Error retrieving documents for RAG:", error);
    context = ""; // Ensure context is empty on failure
  }


  // 3. Generate the response using a powerful language model (Gemini) with the retrieved docs.
  const fullPrompt = `${promptTemplate}
---
Context from documents:
---
${context}
---

User's Question:
"${query}"`;

  const { stream } = await ai.generateStream({
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: fullPrompt,
  });

  return stream.text;
}
