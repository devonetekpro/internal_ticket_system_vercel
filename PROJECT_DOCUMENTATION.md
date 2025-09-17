

# HelpFlow: Project Documentation & Architecture Overview

## 1. Introduction

HelpFlow is a comprehensive help desk solution designed to streamline support processes by integrating both an internal ticketing system and a client-facing CRM desk. Built with a modern tech stack, it provides role-based access control, detailed analytics, and powerful administrative tools to manage a multi-departmental support environment efficiently.

The primary goal of HelpFlow is to create a unified platform where support agents, managers, and administrators can collaborate effectively, track issues from creation to resolution, and gain insights into support performance.

---

## 2. Core Features

### 2.1. Authentication
- **Secure Sign-up & Login**: Users can create an account with email/password or sign in using OAuth providers (e.g., Microsoft).
- **Profile Management**: After logging in, users can manage their profile information, including their full name, username, and avatar.
- **Session Management**: Uses Supabase's secure session management with server-side validation.

### 2.2. Dashboard & Navigation
- **Centralized Dashboard**: A landing page offering a high-level overview of key metrics like total tickets, open tickets, and resolution rates.
- **Role-Based Navigation**: The sidebar navigation is dynamically rendered based on the user's assigned role, ensuring users only see links to features they are permitted to access.
- **Notifications**: A real-time notification system alerts users to important events like ticket assignments, mentions, and new collaborations.

### 2.3. Internal Help Desk
- **Ticket Creation**: Users can create tickets using a comprehensive form or from pre-configured templates for common issues.
- **Ticket Management**: A centralized view to see all tickets, with tabs to filter by "My Tickets", "Department Tickets", and "Collaborations".
- **Detailed Ticket View**: A dedicated page for each ticket showing its description, attachments, status, properties, involved personnel (creator, assignee, collaborators), and a full activity/comment thread.
- **Commenting & Collaboration**: Users can post comments, reply to others, and mention colleagues (which triggers a notification).
- **Ticket Assignment**: Authorized users can assign or re-assign tickets to other users within the appropriate departments.

### 2.4. CRM Desk (Client-Facing Support)
- **CRM Integration**: Fetches ticket data from an external CRM API, providing a unified view of client issues within HelpFlow.
- **Synced View**: Displays a list of CRM tickets with filtering capabilities by status and a free-text search for ticket ID, client ID, or title.
- **Conversation History**: Shows the full back-and-forth conversation between the client and the support manager.
- **Direct Interaction**: Allows authorized agents to post replies directly to the client via the CRM API.
- **Ticket Escalation**: Provides a seamless workflow to **escalate** a CRM ticket into a new internal ticket, pre-filling the creation form with relevant data from the client's issue.

### 2.5. Administration & Management
- **User Management**: A dedicated panel for administrators to view all users, and edit their role and department affiliation.
- **Role & Permission Management**: A granular permissions table where system admins can define what each user role is allowed to do within the application (e.g., view analytics, delete tickets, manage users).
- **Admin Panel**:
  - **Department Manager**: Create, rename, and delete departments.
  - **Template Manager**: Create and manage ticket templates to speed up ticket creation for common requests.

### 2.6. Analytics
- **Visual Dashboards**: A dedicated analytics page with charts visualizing key support metrics, including:
  - Tickets by Status (Pie Chart)
  - Tickets by Priority (Pie Chart)
  - Tickets by Category (Bar Chart)

### 2.7. AI Assistant & Live Chat
- **AI-Powered Chat Widget**: A public-facing chat widget provides instant, automated support to users.
- **Knowledge Base Integration**: The AI assistant answers questions based on a knowledge base of uploaded documents.
- **Seamless Agent Escalation**: If the AI cannot answer a question, it intelligently offers to connect the user with a live human agent.
- **Live Chat Dashboard**: A dedicated view for support agents to see waiting users, take over conversations, and chat in real-time.

---

## 3. Application Architecture

HelpFlow is built on a modern, server-centric framework that leverages the power of Next.js and Supabase.

### 3.1. Technology Stack
- **Framework**: **Next.js** (with App Router)
- **Language**: **TypeScript**
- **Styling**: **Tailwind CSS** with **ShadCN UI** for pre-built, accessible components.
- **Backend-as-a-Service (BaaS)**: **Supabase**
  - **Database**: PostgreSQL with the `pgvector` extension for AI embeddings.
  - **Authentication**: Manages user sign-up, login, and session handling.
  - **Storage**: Used for storing file attachments for tickets and user avatars.
  - **Realtime**: Powers the live notifications and live chat systems.
- **AI & Generative Features**: **Genkit** with **Google AI** for embeddings and text generation.
- **External Services**: Integrates with a mock CRM API for the client-facing help desk module.


### 3.2. AI Assistant & Live Chat: Architecture Overview

Our AI-powered chat widget provides instant, automated support to users by leveraging a sophisticated Retrieval-Augmented Generation (RAG) architecture. When the AI cannot find an answer, it seamlessly escalates the conversation to a live agent.

**Core Features:**

1.  **Knowledge Base Integration**:
    *   Administrators can upload text-based documents (`.txt`, `.pdf`) directly to the HelpFlow knowledge base.

2.  **Automated Document Processing & Vectorization**:
    *   **Text Extraction**: Upon upload, the system automatically extracts the raw text content from the document.
    *   **Chunking**: The extracted text is intelligently split into smaller, semantically meaningful chunks. This is crucial for providing targeted context to the AI.
    *   **Embedding**: Each text chunk is converted into a vector embedding using Google AI's `text-embedding-004` model.
    *   **Vector Storage**: The chunks and their corresponding embeddings are stored in a dedicated `document_chunks` table within our Supabase database, which is powered by `pgvector` for efficient similarity searches.

3.  **Context-Aware Question Answering (RAG Pipeline)**:
    *   When a user asks a question, the system first generates an embedding for the question itself.
    *   It then performs a high-speed vector similarity search in the `document_chunks` table to find the most relevant text chunks that are semantically related to the user's query.
    *   These top-matching chunks are compiled into a context block, which is passed to the `gemini-1.5-flash-latest` model along with the original question.
    *   The AI is strictly instructed to formulate an answer *only* from the provided context, ensuring responses are accurate and grounded in the uploaded documents.

4.  **Graceful Escalation to Human Agents**:
    *   If the AI determines that the provided document chunks do not contain a relevant answer, it is programmed to respond with a special `IDK` (I Don't Know) signal.
    *   The chat widget intercepts this signal and, instead of displaying "IDK," it presents a user-friendly message offering to connect the user with a live agent.
    *   This provides a seamless and intelligent escalation path from automated support to human support.

5.  **Live Agent Dashboard**:
    *   Chats escalated to human agents appear in the "Live Chat" dashboard, where available agents can take over the conversation, view the chat history, and provide assistance in real-time.


### 3.3. Data Flow & Logic
- **Server Components by Default**: Most pages are rendered on the server to improve performance and reduce the amount of JavaScript sent to the client.
- **Server Actions**: Form submissions (creating tickets, updating profiles, etc.) are handled by Next.js Server Actions. This allows the frontend to call secure, server-side code directly without needing to create separate API endpoints.
- **Client Components**: Interactivity-heavy components (e.g., ticket filters, comment forms, dropdown menus) are explicitly marked as Client Components (`'use client'`).
- **Service Layer**: A dedicated `src/services` directory abstracts away the logic for communicating with external APIs (like the CRM). This keeps the UI components clean and separates concerns.
- **Middleware**: A Next.js middleware file handles route protection, ensuring that only authenticated users can access dashboard pages.

### 3.4. Directory Structure

The project follows a standard Next.js App Router structure with some key organizational choices:

- **`src/app/`**: Contains all routes and core layouts for the application.
  - **`src/app/(auth)/`**: Route group for authentication pages (Login, Signup).
  - **`src/app/dashboard/`**: Route group for all protected application pages. Each sub-folder represents a feature (e.g., `tickets`, `crm-tickets`, `admin-panel`).
    - **`_actions/`**: Suffix for folders containing Server Actions related to a specific route.
    - **`_components/`**: Suffix for folders containing React components used only within that specific route.
- **`src/components/`**: Home for reusable React components used across multiple pages.
  - **`src/components/ui/`**: Contains the pre-built UI components from ShadCN (Button, Card, etc.).
- **`src/lib/`**: General-purpose utilities and configuration files.
  - **`src/lib/supabase/`**: Contains the client and server-side Supabase helper functions (`createClient`).
  - **`src/lib/database.types.ts`**: The auto-generated (and manually augmented) TypeScript definitions for the Supabase database schema.
- **`src/services/`**: A dedicated layer for abstracting communication with third-party APIs (e.g., `crm-service.ts`). This isolates external logic from the UI.
- **`src/hooks/`**: Custom React hooks (e.g., `use-mobile` for responsive logic).

---

## 5. Database Setup & Migrations

To set up your database, run the SQL commands located in the migration file:

**`/src/lib/supabase/migration.sql`**

This file contains all the necessary SQL to create tables, functions, and triggers for the application. Simply copy its contents and run it in your Supabase SQL Editor.


### 5.1. Create and Deploy the `embed-document` Edge Function

For the AI knowledge base to function, you must create and deploy a Supabase Edge Function.

**1. Create the file:**
Using the Supabase CLI or the Supabase Dashboard, create a new Edge Function named `embed-document`. The file path should be `supabase/functions/embed-document/index.ts`.

**2. Add the code:**
Paste the following TypeScript code into `supabase/functions/embed-document/index.ts`.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.14.1';

// Simple text splitter
async function splitTextIntoChunks(text: string, maxLength = 1000): Promise<string[]> {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.substring(i, i + maxLength));
  }
  return chunks;
}


Deno.serve(async (req) => {
  const { documentId, content } = await req.json();

  if (!documentId || !content) {
    return new Response(JSON.stringify({ error: 'Missing documentId or content' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !geminiApiKey) {
        throw new Error('Missing required environment variables (Supabase URL/Key or Gemini Key).');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004"});


    // 1. Split the document content into chunks
    const chunks = await splitTextIntoChunks(content);
    if (chunks.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'Document has no content to process.' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 2. Generate embeddings for all chunks
    const result = await model.batchEmbedContents({
      requests: chunks.map(chunk => ({ content: chunk, taskType: "RETRIEVAL_DOCUMENT" })),
    });

    const embeddings = result.embeddings;

    if (!embeddings || embeddings.length !== chunks.length) {
      throw new Error('Mismatch between number of chunks and returned embeddings.');
    }
    
    // 3. Prepare data for insertion
    const chunksToInsert = chunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk,
      embedding: embeddings[index].values,
    }));

    // 4. Insert chunks and embeddings into the database
    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunksToInsert);

    if (insertError) {
      throw new Error(`Failed to insert document chunks: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: `Processed ${chunks.length} chunks.` }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**3. Set Environment Variables:**
In your Supabase project settings (or in a `.env` file if you are developing locally with the Supabase CLI), you must set the following environment variables for your Edge Function:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

**4. Deploy the Function:**
Deploy your function using the Supabase CLI: `supabase functions deploy embed-document --no-verify-jwt`. The `--no-verify-jwt` flag is important because our function will be called by a database trigger using the service role key for authentication.

---

## 6. Key Workflows

- **Ticket Creation & Assignment**: A user creates a ticket from the UI -> A Server Action calls `createTicket` -> The ticket is inserted into the `internal_tickets` table -> If "auto-assign" is chosen, the system finds the department head; otherwise, it uses the specified assignee -> The `on_ticket_assignment` trigger fires, creating a notification for the assigned user.
- **CRM Ticket Escalation**: A user clicks "Escalate" on a CRM ticket -> A modal opens with a pre-filled `TicketForm` component -> The user submits the form -> The `createTicket` action is called with `is_external: true` and a `crm_ticket_id` -> A new row is created in both `internal_tickets` and `ticket_links` to connect the two systems.

---

## 7. Future Feature Roadmap

This section outlines potential features that can be built upon the existing foundation to further enhance HelpFlow's capabilities, focusing on automation, collaboration, and enterprise-readiness.

### 7.1. User Experience & Productivity
- **AI-Powered Ticket Classification**: Use an LLM (Genkit) to automatically assign priority, department, or even suggest answers based on ticket content.
- **Bulk Actions**: Allow managers to select multiple tickets in a list view and perform batch updates (e.g., change status, assign to a user).
- **Offline Support**: Implement service workers to allow agents to draft replies and comments while offline, syncing them automatically when a connection is restored.
- **Dark Mode / Theme Support**: Enhance accessibility and user comfort with a fully implemented dark mode and potentially other themes.

### 7.2. Collaboration & Communication
- **Live Chat Integration**: Add a real-time chat widget for clients, allowing them to connect directly with available agents.
- **Voice Notes & Screenshots**: Enable agents and users to drop audio recordings or paste screenshots directly into ticket comment threads for faster communication.
- **Shared Views & Dashboards**: Allow managers to create custom filtered views (e.g., "All Critical IT Tickets") and share them with their team.

### 7.3. Automation & Workflow
- **SLA & Escalation Rules**: Create a rules engine where admins can define Service Level Agreements (e.g., resolve critical tickets in 4 hours). The system could automatically escalate tickets that breach an SLA.
- **Canned Responses**: Build on the template system to allow agents to insert predefined replies into comments with a single click.
- **Advanced Workflow Engine**: Implement a visual "if-this-then-that" builder for admins (e.g., "If a ticket has 'urgent' priority and is unassigned for > 1 hour, notify the department head").
- **CRM Sync Enhancements**: Move towards a bi-directional sync, where updating a linked internal ticket can also update the status or add a private note in the external CRM.

### 7.4. Analytics & Insights
- **Customizable Dashboards**: Allow each role (agent, manager, admin) to build and save their own dashboard widgets to track the metrics most important to them.
- **Agent Performance KPIs**: Create a dedicated analytics section for tracking key performance indicators like average response time, resolution time, and workload balance per agent.
- **Client Satisfaction (CSAT/NPS)**: Implement post-resolution surveys that can be automatically sent to clients to measure satisfaction.
- **Trend Analysis**: Use analytics to identify recurring issues by category, department, or keyword, helping to pinpoint systemic problems.

### 7.5. Scalability & Architecture
- **Caching Layer**: For high-traffic queries (like fetching all departments or users), implement a caching strategy using Redis or Supabase Edge Functions.
- **Background Workers**: Offload long-running tasks like sending email notifications, performing CRM syncs, and aggregating analytics data to background jobs.
- **Multi-Tenancy**: Evolve the architecture to securely support multiple companies using the same HelpFlow instance, with strict data isolation.
- **Audit Logs**: Create a comprehensive audit trail that tracks every significant action (e.g., who changed a ticket's status, when a user's role was updated) for compliance and security.

### 7.6. Security & Compliance
- **Fine-Grained RLS**: Fully implement Row Level Security on all critical Supabase tables to enforce that users can only see and edit data they are authorized to access.
- **2FA / SSO**: Integrate two-factor authentication and Single Sign-On (SSO) options for enterprise clients.
- **Data Retention Policies**: Build a system for automatically archiving or deleting old tickets based on configurable rules.

### 7.7. Integrations
- **Slack / Microsoft Teams Integration**: Push important ticket updates (new tickets, critical escalations, mentions) into relevant team channels.
- **Email-to-Ticket Pipeline**: Set up a system where emails sent to a specific support address (e.g., `support@yourcompany.com`) are automatically converted into new tickets.
- **Calendar & Reminders**: Allow agents to sync follow-up dates or deadlines with their Google Calendar or Outlook.

### 7.8. Future Differentiators
- **AI Co-pilot for Agents**: Create a sophisticated AI assistant that suggests responses by drawing context from the internal knowledge base and historical CRM conversations.
- **Sentiment Analysis**: Use an LLM to analyze the sentiment of client comments, automatically detecting frustration and alerting managers to potentially volatile situations.
- **Gamification**: Introduce a points and badges system for agents based on performance metrics (e.g., tickets resolved, positive feedback) to boost motivation.
- **Multilingual Support**: Implement auto-translation for tickets, allowing clients and agents to communicate seamlessly in their native languages.







    
