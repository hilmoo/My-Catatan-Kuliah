You are a senior frontend engineer building a production-ready Notion-like web application.

---

## ⚙️ Tech Stack (ALREADY IMPLEMENTED — DO NOT RECREATE)

* React
* TanStack Router
* TanStack Query
* shadcn/ui
* Yoopta editor (**already fully implemented and configured**)
* API client generated via Orval from `openapi.yaml`

---

## 🚨 Critical Rule: Yoopta Editor

A fully functional Yoopta editor component already exists in the codebase.

You MUST:

* **Use the existing Yoopta component as-is**
* **Read its props, types, and usage from the codebase**
* **Pass data into it and handle output from it**

You MUST NOT:

* Reimplement editor logic
* Rebuild plugins (image upload, formatting, etc.)
* Duplicate editor functionality
* Replace it with another editor

Assume:

* Image uploads
* Rich text features
* File handling inside editor

are already handled internally by Yoopta.

Your job is ONLY:

* Load content into the editor
* Save content changes via API

---

## 🎯 Goal

Build a fully functional React app that integrates:

* Workspace system
* Page hierarchy (Notion-like)
* File uploads (via `/files` endpoint where needed)
* Editor integration (via existing Yoopta component)

---

## 📦 Core API Domains

### `/workspace`

* Workspace selection
* Layout (sidebar + content)

---

### `/pages` (CORE SYSTEM)

#### Page Types

```ts
export type PageAllProperties =
  | PagePropertiesCourse
  | PagePropertiesAssignment
  | PagePropertiesFolder
  | PagePropertiesNote;
```

You MUST:

* Narrow types correctly
* Render UI conditionally per type

---

### 🌳 Hierarchy Rules (STRICT)

* Folders → inside folders
* Courses → inside folders ONLY
* Assignments → inside courses ONLY (**NOT top-level**)
* Notes → inside folders, courses, or notes

You MUST:

* Enforce rules in UI
* Prevent invalid creation/moves

---

### 📐 Pages Features

* Sidebar tree (recursive)
* Page CRUD
* Page detail view
* Breadcrumbs
* Parent-child handling

---

## ✍️ Editor Integration (IMPORTANT)

When working with pages that contain content (e.g. Notes):

* Import and use the **existing Yoopta component**
* Inspect how it is used elsewhere in the project
* Pass:

  * Initial value (from API)
  * onChange handler (to persist changes)

DO NOT:

* Add custom upload logic
* Modify editor internals
* Recreate toolbar/features

---

## 📁 `/files`

* Implement file upload UI ONLY if needed outside Yoopta
* If inside editor → DO NOTHING (Yoopta handles it)

---

## 🧭 Routing

Use TanStack Router:

* `/workspace/:workspaceId`
* `/workspace/:workspaceId/page/:pageId`

Use route loaders + TanStack Query integration.

---

## 🔄 Data Layer

* Use Orval-generated hooks ONLY
* Use mutations + invalidation
* Handle loading/error states

---

## 🧱 UI (shadcn)

* Sidebar
* Dialogs
* Forms
* Buttons
* Layout

Notion-like UX:

* Left sidebar tree
* Main editor/content area
* Top breadcrumb

---

## 🚫 Constraints

* ❌ Do NOT reimplement Yoopta
* ❌ Do NOT write manual API calls
* ❌ Do NOT violate page hierarchy rules
* ❌ Do NOT duplicate existing components

---

## ✅ Output

* Modular React components
* Strong TypeScript
* Clean architecture
* Reuse existing components wherever possible

---

## 🧠 Behavior Expectations

If unsure about:

* Yoopta usage → **read existing component**
* API → infer from generated types/hooks
* UI → follow shadcn patterns