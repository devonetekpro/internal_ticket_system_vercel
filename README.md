
# HelpFlow: A Comprehensive Help Desk Solution

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

### 3.2. Data Flow & Logic
- **Server Components by Default**: Most pages are rendered on the server to improve performance and reduce the amount of JavaScript sent to the client.
- **Server Actions**: Form submissions (creating tickets, updating profiles, etc.) are handled by Next.js Server Actions. This allows the frontend to call secure, server-side code directly without needing to create separate API endpoints.
- **Client Components**: Interactivity-heavy components (e.g., ticket filters, comment forms, dropdown menus) are explicitly marked as Client Components (`'use client'`).
- **Service Layer**: A dedicated `src/services` directory abstracts away the logic for communicating with external APIs (like the CRM). This keeps the UI components clean and separates concerns.
- **Middleware**: A Next.js middleware file handles route protection, ensuring that only authenticated users can access dashboard pages.

### 3.3. Directory Structure

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

## 4. Database Setup

To set up your database, run the SQL commands located in the migration file:

**`/src/lib/supabase/migration.sql`**

This file contains all the necessary SQL to create tables, functions, and triggers for the application. Simply copy its contents and run it in your Supabase SQL Editor.
