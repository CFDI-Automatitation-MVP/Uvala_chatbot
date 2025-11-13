# Integration Guide: Add AI Presentation Feature to Uvala.AI

## Project Overview
**Task**: Integrate the standalone AI Presentation Generator into Uvala.AI chatbot as a new feature accessible via a button/route.

**Source Project**: `/Users/santiagocairesanchez/presentations_ai/presentation-ai/`
**Target Project**: `/Users/santiagocairesanchez/uvala.ai/`

**Key Integration Points**:
- Same Next.js 15 app (route-based integration)
- Shared Supabase database and Google Auth
- Keep presentation UI mostly intact, rebrand to match Uvala.AI
- Add as `/presentations` route in uvala.ai

---

## Phase 1: Install Dependencies

### 1.1 Add Presentation-Specific Packages
Run from `/Users/santiagocairesanchez/uvala.ai/`:

```bash
pnpm add platejs @platejs/ai @platejs/autoformat @platejs/basic-nodes @platejs/basic-styles @platejs/callout @platejs/caption @platejs/code-block @platejs/combobox @platejs/comment @platejs/date @platejs/dnd @platejs/emoji @platejs/excalidraw @platejs/floating @platejs/indent @platejs/juice @platejs/layout @platejs/link @platejs/list @platejs/markdown @platejs/math @platejs/media @platejs/mention @platejs/resizable @platejs/selection @platejs/slash-command @platejs/slate @platejs/suggestion @platejs/table @platejs/toc @platejs/toggle

pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add @emoji-mart/data
pnpm add @fortawesome/fontawesome-svg-core @fortawesome/free-brands-svg-icons @fortawesome/free-regular-svg-icons @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
pnpm add html2canvas-pro lowlight pdf-lib pptxgenjs prismjs
pnpm add prosemirror-commands prosemirror-history prosemirror-keymap prosemirror-markdown prosemirror-model prosemirror-schema-basic prosemirror-schema-list prosemirror-state prosemirror-view
pnpm add re-resizable react-colorful react-dnd react-dnd-html5-backend react-fontpicker-ts react-icons-picker react-lite-youtube-embed react-player
pnpm add @tavily/core

pnpm add -D @types/prismjs
```

**Note**: Some packages (like `react-resizable-panels`, `lucide-react`, `recharts`, etc.) are already in uvala.ai so won't be re-added.

### 1.2 Environment Variables
Add to `/Users/santiagocairesanchez/uvala.ai/.env`:

```env
# Unsplash API Key (for presentation stock images)
UNSPLASH_ACCESS_KEY="your-unsplash-access-key-here"

# Tavily API Key (optional - for web search in presentations)
TAVILY_API_KEY="your-tavily-api-key-optional"

# UploadThing (optional - for image uploads)
UPLOADTHING_TOKEN="your-uploadthing-token-optional"
```

**You already have**: `OPENAI_API_KEY` - this will be reused for presentation generation.

---

## Phase 2: Database Schema Migration

### 2.1 Understanding Current Uvala.AI Schema
Your current schema (`/Users/santiagocairesanchez/uvala.ai/src/lib/db/pg/schema.pg.ts`) uses:
- **Drizzle ORM** (not Prisma)
- **PostgreSQL** via Supabase
- **User table**: `UserSchema` with fields: `id`, `name`, `email`, `image`, `preferences`

### 2.2 Add Presentation Tables to Drizzle Schema

**File to Edit**: `/Users/santiagocairesanchez/uvala.ai/src/lib/db/pg/schema.pg.ts`

Add these new tables at the end of the file:

```typescript
// Document Types Enum
export const documentTypeEnum = ["NOTE", "DOCUMENT", "PRESENTATION", "DRAWING"] as const;

// Base Document Schema
export const BaseDocumentSchema = pgTable("base_document", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  type: varchar("type", { enum: documentTypeEnum }).notNull(),
  documentType: text("document_type").notNull(), // Redundant but kept for compatibility
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  thumbnailUrl: text("thumbnail_url"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Presentation Schema
export const PresentationSchema = pgTable("presentation", {
  id: uuid("id").primaryKey().notNull()
    .references(() => BaseDocumentSchema.id, { onDelete: "cascade" }),
  content: json("content").notNull(), // Presentation slides and content
  theme: text("theme").default("default").notNull(),
  imageSource: text("image_source").default("stock").notNull(), // "stock" for Unsplash
  prompt: text("prompt"), // AI generation prompt
  presentationStyle: text("presentation_style"),
  language: text("language").default("en-US"),
  outline: json("outline").array().$type<string[]>(), // Presentation outline
  searchResults: json("search_results"), // Search results from Tavily
  templateId: text("template_id"),
  customThemeId: uuid("custom_theme_id"), // Foreign key added below
});

// Custom Theme Schema
export const CustomThemeSchema = pgTable("custom_theme", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),
  isPublic: boolean("is_public").default(false).notNull(),
  themeData: json("theme_data").notNull(), // Complete theme configuration
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("custom_theme_user_id_idx").on(table.userId),
]);

// Favorite Documents Schema
export const FavoriteDocumentSchema = pgTable("favorite_document", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => BaseDocumentSchema.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  unique().on(table.userId, table.documentId),
]);

// Generated Images Schema (for AI image generation history)
export const GeneratedImageSchema = pgTable("generated_image", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  url: text("url").notNull(),
  prompt: text("prompt").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

### 2.3 Run Database Migration

```bash
cd /Users/santiagocairesanchez/uvala.ai
pnpm db:generate  # Generate migration files
pnpm db:push      # Push to Supabase
```

---

## Phase 3: Copy Source Files

### 3.1 Directory Structure to Create

Create these new directories in uvala.ai:

```
/Users/santiagocairesanchez/uvala.ai/
├── src/
│   ├── app/
│   │   ├── (chat)/
│   │   │   └── presentations/          # NEW - Presentations route
│   │   │       ├── page.tsx
│   │   │       ├── [id]/
│   │   │       │   └── page.tsx
│   │   │       └── generate/
│   │   │           └── [id]/
│   │   │               └── page.tsx
│   │   │
│   │   └── api/
│   │       └── presentation/          # NEW - API routes
│   │           ├── generate/
│   │           ├── outline/
│   │           └── outline-with-search/
│   │
│   ├── components/
│   │   └── presentation/              # NEW - All presentation components
│   │
│   ├── hooks/
│   │   └── presentation/              # NEW - Presentation hooks
│   │
│   └── lib/
│       ├── presentation/              # NEW - Presentation utilities
│       └── db/
│           └── repositories/
│               └── presentation-repository.ts  # NEW - Database operations
```

### 3.2 Files to Copy

**Source**: `/Users/santiagocairesanchez/presentations_ai/presentation-ai/`

#### Step 1: Copy Component Directories

```bash
# From presentations_ai directory
cp -r presentation-ai/src/components/presentation /Users/santiagocairesanchez/uvala.ai/src/components/

# If hooks exist
cp -r presentation-ai/src/hooks/presentation /Users/santiagocairesanchez/uvala.ai/src/hooks/ 2>/dev/null || true
```

#### Step 2: Copy App Routes

**Important**: Uvala.ai uses route groups like `(chat)`. Place presentations inside the chat group.

```bash
# Copy presentation pages
mkdir -p /Users/santiagocairesanchez/uvala.ai/src/app/\(chat\)/presentations
cp -r presentation-ai/src/app/presentation/* /Users/santiagocairesanchez/uvala.ai/src/app/\(chat\)/presentations/

# Copy API routes
cp -r presentation-ai/src/app/api/presentation /Users/santiagocairesanchez/uvala.ai/src/app/api/
```

#### Step 3: Copy Server Actions

```bash
mkdir -p /Users/santiagocairesanchez/uvala.ai/src/app/_actions
cp -r presentation-ai/src/app/_actions/presentation /Users/santiagocairesanchez/uvala.ai/src/app/_actions/
cp -r presentation-ai/src/app/_actions/image /Users/santiagocairesanchez/uvala.ai/src/app/_actions/
```

---

## Phase 4: Code Adaptations

### 4.1 Authentication Integration

**The presentation project uses**: NextAuth with `auth()` function
**Uvala.ai uses**: Supabase Auth with `getSession()` and `getUser()` functions

#### Files to Modify:

All server actions and API routes that call `auth()` need to be updated.

**Find all occurrences**:
```bash
cd /Users/santiagocairesanchez/uvala.ai
grep -r "import { auth }" src/app/_actions/presentation src/app/_actions/image src/app/api/presentation
```

**Replace pattern**:

```typescript
// OLD (from presentation project):
import { auth } from "@/server/auth";

const session = await auth();
if (!session?.user) {
  throw new Error("Unauthorized");
}
const userId = session.user.id;

// NEW (for uvala.ai):
import { getUser } from "@/lib/auth/supabase-auth";

const user = await getUser();
if (!user) {
  throw new Error("Unauthorized");
}
const userId = user.id;
```

#### Files That Need This Change:
- `src/app/_actions/presentation/presentationActions.ts`
- `src/app/_actions/presentation/sharedPresentationActions.ts`
- `src/app/_actions/presentation/theme-actions.ts`
- `src/app/_actions/presentation/fetchPresentations.ts`
- `src/app/_actions/presentation/exportPresentationActions.ts`
- `src/app/_actions/image/generate.ts`
- `src/app/_actions/image/unsplash.ts`

**Example for `presentationActions.ts`**:

```typescript
// At the top of the file
import { getUser } from "@/lib/auth/supabase-auth";

// In each function, replace:
export async function createPresentation({...}) {
  const user = await getUser(); // Changed from: const session = await auth();
  if (!user) { // Changed from: if (!session?.user)
    throw new Error("Unauthorized");
  }
  const userId = user.id; // Changed from: session.user.id

  // ... rest of the function
}
```

### 4.2 Database Integration

**The presentation project uses**: Prisma ORM with `db` client
**Uvala.ai uses**: Drizzle ORM

You need to create repository functions for presentations similar to your existing patterns.

#### Create: `src/lib/db/repositories/presentation-repository.ts`

```typescript
import { db } from "@/lib/db";
import {
  BaseDocumentSchema,
  PresentationSchema,
  CustomThemeSchema,
  FavoriteDocumentSchema
} from "@/lib/db/pg/schema.pg";
import { eq, and, desc } from "drizzle-orm";

export const presentationRepository = {
  // Create presentation
  async createPresentation(data: {
    title: string;
    userId: string;
    content: any;
    theme?: string;
    imageSource?: string;
    outline?: string[];
    presentationStyle?: string;
    language?: string;
  }) {
    return await db.transaction(async (tx) => {
      // Create base document
      const [baseDoc] = await tx
        .insert(BaseDocumentSchema)
        .values({
          title: data.title,
          type: "PRESENTATION",
          documentType: "presentation",
          userId: data.userId,
        })
        .returning();

      // Create presentation
      const [presentation] = await tx
        .insert(PresentationSchema)
        .values({
          id: baseDoc.id,
          content: data.content,
          theme: data.theme || "default",
          imageSource: data.imageSource || "stock",
          outline: data.outline,
          presentationStyle: data.presentationStyle,
          language: data.language || "en-US",
        })
        .returning();

      return { baseDoc, presentation };
    });
  },

  // Get presentation by ID
  async getPresentation(id: string, userId: string) {
    const result = await db
      .select()
      .from(BaseDocumentSchema)
      .leftJoin(PresentationSchema, eq(BaseDocumentSchema.id, PresentationSchema.id))
      .where(
        and(
          eq(BaseDocumentSchema.id, id),
          eq(BaseDocumentSchema.userId, userId)
        )
      )
      .limit(1);

    return result[0] || null;
  },

  // Get all presentations for user
  async getUserPresentations(userId: string) {
    return await db
      .select()
      .from(BaseDocumentSchema)
      .leftJoin(PresentationSchema, eq(BaseDocumentSchema.id, PresentationSchema.id))
      .where(eq(BaseDocumentSchema.userId, userId))
      .orderBy(desc(BaseDocumentSchema.createdAt));
  },

  // Update presentation
  async updatePresentation(id: string, userId: string, data: {
    title?: string;
    content?: any;
    theme?: string;
    thumbnailUrl?: string;
    outline?: string[];
    prompt?: string;
    searchResults?: any;
  }) {
    return await db.transaction(async (tx) => {
      // Update base document
      if (data.title || data.thumbnailUrl) {
        await tx
          .update(BaseDocumentSchema)
          .set({
            ...(data.title && { title: data.title }),
            ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(BaseDocumentSchema.id, id),
              eq(BaseDocumentSchema.userId, userId)
            )
          );
      }

      // Update presentation
      const presentationData: any = {};
      if (data.content) presentationData.content = data.content;
      if (data.theme) presentationData.theme = data.theme;
      if (data.outline) presentationData.outline = data.outline;
      if (data.prompt) presentationData.prompt = data.prompt;
      if (data.searchResults) presentationData.searchResults = data.searchResults;

      if (Object.keys(presentationData).length > 0) {
        await tx
          .update(PresentationSchema)
          .set(presentationData)
          .where(eq(PresentationSchema.id, id));
      }

      return { success: true };
    });
  },

  // Delete presentation
  async deletePresentation(id: string, userId: string) {
    // Base document cascade delete will handle presentation
    const result = await db
      .delete(BaseDocumentSchema)
      .where(
        and(
          eq(BaseDocumentSchema.id, id),
          eq(BaseDocumentSchema.userId, userId)
        )
      )
      .returning();

    return result.length > 0;
  },

  // Delete multiple presentations
  async deletePresentations(ids: string[], userId: string) {
    const result = await db
      .delete(BaseDocumentSchema)
      .where(
        and(
          eq(BaseDocumentSchema.userId, userId),
          // SQL IN clause for multiple IDs
          sql`${BaseDocumentSchema.id} = ANY(${ids})`
        )
      )
      .returning();

    return result.length;
  },
};
```

#### Update Server Actions to Use Repository

In all `src/app/_actions/presentation/*.ts` files, replace Prisma calls with repository calls:

```typescript
// OLD (Prisma):
import { db } from "@/server/db";

const presentation = await db.baseDocument.create({
  data: { ... },
  include: { presentation: true }
});

// NEW (Drizzle repository):
import { presentationRepository } from "@/lib/db/repositories/presentation-repository";

const presentation = await presentationRepository.createPresentation({
  title: "...",
  userId: userId,
  content: content,
  // ... other fields
});
```

### 4.3 Middleware Update

**File**: `/Users/santiagocairesanchez/uvala.ai/src/middleware.ts`

Your current middleware already handles authentication. Just ensure the `/presentations` route is accessible to authenticated users.

Add this to your middleware (if needed):

```typescript
// Allow authenticated users to access presentations
if (request.nextUrl.pathname.startsWith('/presentations')) {
  // Already handled by your existing auth middleware
  return NextResponse.next();
}
```

---

## Phase 5: UI Integration & Branding

### 5.1 Add Navigation Button

**File to Edit**: Find your main navigation/sidebar component (likely in `src/components/`)

Add a link to presentations:

```tsx
import { FilePresentation } from "lucide-react"; // Or use your icon library

// In your navigation:
<Link href="/presentations" className="...">
  <FilePresentation className="w-5 h-5" />
  <span>Presentations</span>
</Link>
```

### 5.2 Tailwind Configuration

**File**: `/Users/santiagocairesanchez/uvala.ai/tailwind.config.ts`

Ensure you have these plugins (check and add if missing):

```typescript
import type { Config } from "tailwindcss";

export default {
  // ... your existing config
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
    require("tailwind-scrollbar"),
    require("tailwind-scrollbar-hide"),
  ],
} satisfies Config;
```

Install missing plugins:
```bash
pnpm add -D @tailwindcss/typography @tailwindcss/container-queries tailwind-scrollbar tailwind-scrollbar-hide tailwindcss-animate
```

### 5.3 Rebranding

Update these strings in all copied presentation files:

1. **App Name**: Search and replace "Presentation AI" → "Uvala AI Presentations"
2. **Metadata**: Update page titles in `page.tsx` files
3. **Logo**: Replace any logo references with Uvala.AI logo

**Files to update**:
- `src/app/(chat)/presentations/page.tsx` - Update metadata
- `src/app/(chat)/presentations/[id]/page.tsx` - Update metadata
- `src/app/(chat)/presentations/generate/[id]/page.tsx` - Update metadata

Example:
```tsx
export const metadata: Metadata = {
  title: "Uvala AI - Presentations",
  description: "Create AI-powered presentations with Uvala AI",
};
```

---

## Phase 6: Image Source Configuration

The presentation feature supports both AI-generated images and stock photos from Unsplash.

**Already configured to use Unsplash only** - no changes needed unless you want AI image generation.

### Unsplash Setup

1. Go to https://unsplash.com/developers
2. Create an application
3. Get your Access Key
4. Add to `.env`:
   ```
   UNSPLASH_ACCESS_KEY="your-access-key"
   ```

**File**: `src/components/presentation/theme/ImageSourceSelector.tsx` is already locked to Unsplash only.

---

## Phase 7: Testing Checklist

### 7.1 Local Testing

```bash
cd /Users/santiagocairesanchez/uvala.ai
pnpm dev
```

Test these flows:

- [ ] Navigate to `http://localhost:3000/presentations`
- [ ] Click "Create Presentation" button
- [ ] Generate presentation with AI using a prompt
- [ ] Edit slides manually
- [ ] Add images from Unsplash
- [ ] Change themes
- [ ] Export to PDF
- [ ] Export to PPTX
- [ ] Delete presentation
- [ ] Verify presentations appear in dashboard
- [ ] Check that presentations are tied to logged-in user

### 7.2 Authentication Testing

- [ ] Logged-out users cannot access `/presentations` (should redirect to sign-in)
- [ ] User can only see their own presentations
- [ ] Creating presentation saves to correct user ID

### 7.3 Database Testing

Check your Supabase dashboard:
- [ ] `base_document` table populated
- [ ] `presentation` table populated with correct foreign key
- [ ] `user_id` matches logged-in user

---

## Phase 8: Deployment

### 8.1 Environment Variables in Vercel

Add to your Vercel project:

```
OPENAI_API_KEY=sk-... (already exists)
UNSPLASH_ACCESS_KEY=...
TAVILY_API_KEY=... (optional)
UPLOADTHING_TOKEN=... (optional)
```

### 8.2 Deploy

```bash
cd /Users/santiagocairesanchez/uvala.ai
git add .
git commit -m "Add AI presentation feature"
git push
```

Vercel will auto-deploy.

---

## Key Differences from Generic Integration

### What's Different for Uvala.AI:

1. **ORM**: You use Drizzle, not Prisma
   - Created custom repository pattern to match your existing code
   - All database operations go through `presentationRepository`

2. **Authentication**: You use Supabase Auth, not NextAuth
   - Replaced `auth()` with `getUser()` from your existing auth module
   - Session structure matches your existing pattern

3. **Route Structure**: You use route groups `(chat)`
   - Presentations placed inside `(chat)` group to match your layout
   - Maintains consistency with your existing chat routes

4. **Database Schema**: UUID instead of cuid
   - Adapted schema to use `uuid().defaultRandom()` like your existing tables
   - Matches your existing patterns (e.g., `createdAt`, `updatedAt`)

5. **File Structure**: Matches your conventions
   - Repositories in `src/lib/db/repositories/`
   - Server actions in `src/app/_actions/`
   - Similar patterns to your chat/agent features

---

## Troubleshooting

### Common Issues:

1. **Import errors for `db` or `auth`**
   - Check paths: `@/lib/db` and `@/lib/auth/supabase-auth`
   - Ensure you updated all auth imports in server actions

2. **Database errors**
   - Run `pnpm db:push` to sync schema
   - Check Supabase for new tables

3. **"Cannot find module" errors**
   - Run `pnpm install` after adding dependencies
   - Check all file paths match uvala.ai structure

4. **Type errors with Drizzle**
   - Ensure schema exports match repository imports
   - Check JSON types are properly defined

5. **Unsplash images not loading**
   - Verify `UNSPLASH_ACCESS_KEY` is set
   - Check API rate limits (50 requests/hour on free tier)

---

## File Structure Summary

### New Files Created:
```
uvala.ai/
├── src/
│   ├── app/
│   │   ├── (chat)/
│   │   │   └── presentations/          ← NEW
│   │   └── api/
│   │       └── presentation/          ← NEW
│   ├── components/
│   │   └── presentation/              ← NEW (copied from source)
│   ├── hooks/
│   │   └── presentation/              ← NEW (copied from source)
│   └── lib/
│       └── db/
│           └── repositories/
│               └── presentation-repository.ts  ← NEW (created)
```

### Modified Files:
```
uvala.ai/
├── src/
│   ├── lib/
│   │   └── db/
│   │       └── pg/
│   │           └── schema.pg.ts       ← MODIFIED (added presentation tables)
│   └── middleware.ts                  ← CHECK (may need updates)
├── .env                               ← MODIFIED (added new keys)
├── package.json                       ← MODIFIED (added dependencies)
└── tailwind.config.ts                 ← CHECK (may need plugin additions)
```

---

## Success Criteria

✅ Integration complete when:
1. User sees "Presentations" in navigation
2. Clicking it goes to `/presentations` route
3. Can create presentations using AI with OpenAI
4. Presentations save to Supabase
5. User authentication works seamlessly
6. Images from Unsplash load correctly
7. Export to PDF/PPTX works
8. UI matches Uvala.AI branding
9. Deployed to Vercel alongside chatbot

---

## Next Steps After Integration

Once basic integration works, consider:

1. **Deep UI Integration**
   - Match Uvala.AI's exact color scheme
   - Use Uvala.AI's button/card styles
   - Integrate with your existing theme system

2. **AI Model Selection**
   - Let users choose which AI model to use for generation (you have many providers)
   - Use your existing AI provider selection UI

3. **Multi-language Support**
   - Integrate with your `next-intl` setup
   - Translate presentation UI

4. **Analytics**
   - Track presentation creation/usage
   - Add to your existing analytics

5. **Subscription Integration**
   - Limit presentations based on user tier
   - Use your existing `subscription-limits.ts` logic

---

## Support

If you encounter issues:
- Check source project: `/Users/santiagocairesanchez/presentations_ai/presentation-ai/`
- Review working implementation
- Compare with uvala.ai patterns in chat/agent features

---

## Quick Reference

**Source Project**: `/Users/santiagocairesanchez/presentations_ai/presentation-ai/`
**Target Project**: `/Users/santiagocairesanchez/uvala.ai/`
**Database**: Supabase PostgreSQL via Drizzle ORM
**Auth**: Supabase Auth (Google OAuth)
**Framework**: Next.js 15 with App Router
**Key Route**: `(chat)/presentations`

---

Good luck with the integration! This should give you a complete, working AI presentation feature integrated seamlessly into Uvala.AI. 🚀
