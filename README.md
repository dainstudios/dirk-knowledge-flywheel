# 🧠 DAIN Studios Knowledge Flywheel

**Transform scattered insights into actionable intelligence.**

A knowledge management platform that captures, curates, and distributes content using AI-powered processing and semantic search.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Edge Functions](#edge-functions)
- [User Roles](#user-roles)
- [Application Routes](#application-routes)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)
- [Workflow](#workflow)

---

## Overview

The Knowledge Flywheel is an internal tool for DAIN Studios that enables:

1. **Rapid Capture** - Quickly save URLs, PDFs, and YouTube videos with minimal friction
2. **AI-Powered Processing** - Automatic extraction of summaries, key insights, and metadata
3. **Intelligent Curation** - Triage and organize content in a review pool
4. **Semantic Search** - Find relevant content using natural language queries
5. **Content Distribution** - Share to Slack, queue for LinkedIn/newsletters, generate infographics

---

## Features

### 📥 iCapture
- Quick capture of URLs, PDFs, and YouTube videos
- Browser extension support (capture_source tracking)
- Automatic content extraction and processing
- Fast-track option for urgent items

### 📋 iCurate (Pool)
- Triage pending items with swipe-style actions
- Editable titles, tags, and DAIN context inline
- Quote and finding highlighting (star icons)
- Add personal notes and context
- Queue for team sharing, LinkedIn, or newsletter
- Generate AI-powered infographics
- Batch processing support
- Visual sharing status indicators (colored left borders)

### 📚 Knowledge Base
- Full-text search with semantic understanding
- Filter by industry, technology, service line, content type
- Rich detail view with metadata display
- AI-extracted key insights and quotables
- Consistent card styling with Pool view
- Re-share to Team, LinkedIn, or Newsletter from cards

### 🤖 AI Features
| Feature | Description |
|---------|-------------|
| **Ask AI** | RAG-based Q&A on your entire knowledge base |
| **Find Quote** | Semantic search for relevant quotables |
| **Find Image** | Search extracted images by description |
| **Hybrid Search** | Combined full-text and vector search |

### 🎨 Infographic Generation
- **Quick Style**: Fast generation from key insights
- **Detailed Style**: Deep analysis for comprehensive visuals
- DAIN Studios branding with "powered by" footer
- Landscape orientation (16:9 aspect ratio)

### 📢 Team Sharing
- One-click Slack notifications with rich summaries
- Customizable post formats (summary, detailed summary, with/without infographic)
- Source attribution and metadata included

### 📬 Publishing Queues
- LinkedIn queue for social content
- Newsletter queue for email campaigns
- Status tracking and timestamps

### 📰 Newsletter Queue
- Queue items for newsletter inclusion from the Pool
- Click article titles to view full context in slide-out panel
- View methodology, key findings, quotes, and DAIN context while curating
- Add curator notes explaining "why this matters" for each item
- Select multiple items for current edition
- AI-powered draft generation synthesizes selected items into cohesive newsletter
- Markdown and plain text output formats
- Copy-to-clipboard for easy pasting to newsletter tool

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| React Router | Routing |
| TanStack Query | Data fetching |
| Lucide React | Icons |

### Backend (Supabase)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Database with pgvector extension |
| Row Level Security | Data access control |
| Edge Functions | Serverless API endpoints |
| Storage | File storage for images |
| Auth | User authentication |

### AI Integrations
| Provider | Use Case |
|----------|----------|
| Google Gemini | Content extraction, embeddings |
| Anthropic Claude | Ask AI (RAG Q&A), Newsletter generation |
| OpenRouter (GPT-4o) | Infographic generation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Capture  │  │   Pool   │  │Knowledge │  │    Dashboard     │ │
│  │  Page    │  │   Page   │  │   Page   │  │                  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │             │             │                 │           │
│  ┌────┴─────────────┴─────────────┴─────────────────┴─────────┐ │
│  │                      Newsletter Page                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────┼─────────────┼─────────────┼─────────────────┼───────────┘
        │             │             │                 │
        ▼             ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Edge Functions                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │  process-   │ │  process-   │ │  generate-  │ │   ask-    │  │
│  │  content    │ │   action    │ │ infographic │ │ knowledge │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬─────┘  │
│         │              │               │               │         │
│  ┌──────┴──────┐ ┌─────┴─────┐  ┌──────┴──────┐ ┌─────┴─────┐   │
│  │ find-quote  │ │find-image │  │ post-to-    │ │  generate │   │
│  │             │ │           │  │   slack     │ │ newsletter│   │
│  └─────────────┘ └───────────┘  └─────────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │ knowledge_  │ │   images    │ │   quotes    │ │ profiles  │  │
│  │   items     │ │             │ │             │ │           │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
│  ┌─────────────┐                                                 │
│  │ user_roles  │     + pgvector for semantic search              │
│  └─────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Gemini   │  │  Claude  │  │OpenRouter│  │      Slack       │ │
│  │   API    │  │   API    │  │   API    │  │     Webhook      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `knowledge_items`
The core content repository storing all captured knowledge.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner reference |
| `title` | text | Content title |
| `url` | text | Source URL |
| `content` | text | Full extracted content |
| `summary` | text | AI-generated summary |
| `context` | text | Research context/methodology |
| `key_findings` | text[] | Extracted key findings |
| `key_insights` | text[] | Extracted key insights |
| `quotables` | text[] | Notable quotes |
| `dain_context` | text | DAIN-specific relevance (editable) |
| `curator_notes` | text | Newsletter curator's motivation/notes |
| `content_type` | text | Article, Video, Report, etc. |
| `author` | text | Content author |
| `author_organization` | text | Author's organization |
| `industries` | text[] | Relevant industries |
| `technologies` | text[] | Mentioned technologies |
| `service_lines` | text[] | DAIN service lines |
| `business_functions` | text[] | Business functions |
| `status` | text | pending, pool, knowledge, trash |
| `embedding` | vector(768) | Semantic search vector |
| `fast_track` | boolean | Priority processing flag |
| `capture_source` | text | web_ui, extension, api |
| `highlighted_findings` | int[] | Indices of starred findings |
| `highlighted_quotes` | int[] | Indices of starred quotes |
| `shared_to_team` | boolean | Shared to Slack flag |
| `queued_for_linkedin` | boolean | LinkedIn queue flag |
| `queued_for_newsletter` | boolean | Newsletter queue flag |

**Status Flow:**
```
pending → pool → knowledge
              ↘ trash
              ↘ post2team
              ↘ post2linkedin
              ↘ post2newsletter
```

### `images`
Extracted and uploaded images with semantic search capabilities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `knowledge_item_id` | uuid | Parent knowledge item |
| `title` | text | Image title |
| `description` | text | AI-generated description |
| `chart_type` | text | bar, line, pie, etc. |
| `topic_tags` | text[] | Relevant topics |
| `use_cases` | text[] | Suggested use cases |
| `storage_url` | text | Supabase storage URL |
| `embedding` | vector(768) | Semantic search vector |
| `status` | text | pending, processed, error |

### `quotes`
Quotable content extracted from knowledge items.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `knowledge_item_id` | uuid | Source knowledge item |
| `quote_text` | text | The quote content |
| `source_author` | text | Attribution |
| `source_title` | text | Source document title |
| `topic_tags` | text[] | Relevant topics |
| `tone` | text | inspirational, analytical, etc. |
| `embedding` | vector(768) | Semantic search vector |

### `profiles`
User profile information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | User ID (from auth.users) |
| `email` | text | User email |
| `display_name` | text | Display name |
| `avatar_url` | text | Profile image URL |

### `user_roles`
Role-based access control (separate table for security).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | User reference |
| `role` | app_role | admin, creator, contributor, viewer |
| `assigned_by` | uuid | Admin who assigned role |

---

## Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `process-content` | After capture | Extracts summary, insights, metadata using Gemini AI |
| `process-action` | User action | Handles team posting, status updates, Slack notifications |
| `generate-infographic` | User request | Creates Quick/Detailed infographics via OpenRouter |
| `ask-knowledge` | User query | RAG-based Q&A using Claude + vector search |
| `find-quote` | User search | Semantic search for quotables |
| `find-image` | User search | Semantic image search by description |
| `generate-search-embedding` | Search query | Creates embeddings for hybrid search |
| `generate-newsletter` | User request | Synthesizes queue items into newsletter draft using Claude |
| `post-to-slack` | ⚠️ DEPRECATED | Use `process-action` instead |

### Function Details

#### `process-content`
```typescript
// Input
{ item_id: string }

// Process
1. Fetch pending knowledge_item
2. Extract content with Gemini AI
3. Generate embedding vector
4. Update item with extracted data
5. Set status to 'pool'
```

#### `process-action`
```typescript
// Input
{
  item_id: string,
  actions: {
    team?: boolean,        // Post to Slack
    linkedin?: boolean,    // Queue for LinkedIn
    newsletter?: boolean,  // Queue for newsletter
    knowledge?: boolean,   // Move to knowledge base
    trash?: boolean        // Move to trash
  },
  post_option?: 'summary' | 'summary_detailed' | 'infographic_quick' | 'infographic_detailed'
}
```

#### `generate-infographic`
```typescript
// Input
{
  item_id: string,
  type: 'quick' | 'detailed'
}

// Output
{
  success: boolean,
  infographic_url: string
}
```

#### `generate-newsletter`
```typescript
// Input
{ item_ids: string[] }

// Process
1. Fetch knowledge items by IDs
2. Build context with summary, key_findings, quotables, curator_notes
3. Call Claude to identify themes and synthesize content
4. Generate thematic intro, per-item sections, and closing hook
5. Output markdown and plain text formats

// Output
{
  success: boolean,
  draft: {
    intro: string,
    items: [{
      id: string,
      title: string,
      context: string,
      key_findings: string[],
      dain_take: string
    }],
    closing: string,
    markdown: string,
    plain_text: string
  }
}
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access, user management, role assignment |
| `creator` | Create, edit, delete own content |
| `contributor` | Create, edit own content |
| `viewer` | Read-only access |

### Role Hierarchy
```
admin > creator > contributor > viewer
```

### Security Functions
- `has_role(user_id, role)` - Check if user has specific role
- `has_role_or_higher(user_id, role)` - Check if user has role or higher
- `get_user_role(user_id)` - Get user's current role

---

## Application Routes

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| `/` | Index | Public | Landing/redirect |
| `/auth` | Login | Public | Authentication |
| `/dashboard` | Dashboard | Protected | Stats overview |
| `/capture` | Capture | Protected | Quick content capture |
| `/pool` | Pool | Protected | Curate pending items |
| `/knowledge` | Knowledge | Protected | Browse knowledge base |
| `/knowledge/:id` | Detail | Protected | View item details |
| `/newsletter` | Newsletter | Protected | Curate newsletter queue |
| `/admin/users` | Admin | Admin only | User management |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account (or use connected project)

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Supabase Setup

The project is connected to Supabase project ID: `wcdtdjztzrlvwkmlwpgw`

Edge functions are automatically deployed when pushing to the repository.

---

## Environment Variables

### Edge Function Secrets (Supabase Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | ✅ | Gemini AI for content extraction & embeddings |
| `ANTHROPIC_API_KEY` | ✅ | Claude AI for Ask Knowledge & Newsletter generation |
| `OPENROUTER_API_KEY` | ✅ | GPT-4o for infographic generation |
| `SLACK_WEBHOOK_URL` | ✅ | Slack incoming webhook for team posts |
| `SUPABASE_URL` | Auto | Supabase project URL |
| `SUPABASE_ANON_KEY` | Auto | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Supabase service role key |

### Setting Secrets

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/wcdtdjztzrlvwkmlwpgw/settings/functions)
2. Navigate to Project Settings → Edge Functions
3. Add each secret with its value

---

## Design System

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#FFA92E` | Primary orange accent |
| `--primary-foreground` | `#1A1A1A` | Text on primary |
| `--background` | `#FAFAFA` | Light background |
| `--foreground` | `#1A1A1A` | Primary text |
| `--muted` | `#6B7280` | Muted elements |
| `--destructive` | `#EF4444` | Error/delete actions |
| `--success` | `#10B981` | Success states |

### Typography
- **Headings**: `font-semibold tracking-tight`
- **Body**: `font-normal text-muted-foreground`
- **Minimal decoration**: Clean, professional aesthetic

### Responsive Breakpoints
| Breakpoint | Width | Use Case |
|------------|-------|----------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |

### UI Patterns
- **Header navigation**: Logo and "Knowledge Flywheel" text link to Dashboard
- **Card consistency**: Pool, Knowledge Base, and Newsletter use identical card layouts
- **Visual status indicators**: Colored left borders indicate sharing status
- **Quote highlighting**: Star icons positioned on the left of quotes/findings

---

## Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CAPTURE   │────▶│   PROCESS   │────▶│    POOL     │
│             │     │  (AI/Auto)  │     │  (Curate)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
           │  KNOWLEDGE  │            │    TEAM     │            │   QUEUES    │
           │    BASE     │            │   (Slack)   │            │ (LI/News)   │
           └─────────────┘            └─────────────┘            └──────┬──────┘
                                                                        │
                                                                        ▼
                                                                ┌─────────────┐
                                                                │ NEWSLETTER  │
                                                                │   DRAFT     │
                                                                │   (AI)      │
                                                                └─────────────┘
```

### Status Lifecycle

1. **Pending** - Just captured, awaiting AI processing
2. **Pool** - Processed, ready for human curation
3. **Knowledge** - Curated and added to knowledge base
4. **Post2Team** - Shared to team via Slack
5. **Post2LinkedIn** - Queued for LinkedIn publishing
6. **Post2Newsletter** - Queued for newsletter inclusion
7. **Trash** - Discarded

### Newsletter Workflow

1. **Queue** - Item added to newsletter queue from Pool (via "Queue for Newsletter" action)
2. **Curate** - Click title to view full article details in side panel
3. **Annotate** - Add curator notes explaining "Why It Matters"
4. **Select** - Check items to include in current edition
5. **Generate** - AI synthesizes selected items into cohesive draft
6. **Export** - Copy markdown or plain text to newsletter tool

---

## Contributing

1. Create a feature branch from `main`
2. Make your changes in Lovable or locally
3. Push to GitHub (auto-syncs with Lovable)
4. Create a Pull Request for review

---

## License

Internal DAIN Studios project. All rights reserved.

---

## Support

For questions or issues, contact the DAIN Studios development team.
