# Coder Mode - Live Sandbox Preview System

## Overview

This implementation adds a **live sandbox preview system** to your Coder mode, similar to Claude's Artifacts feature. When the AI generates React components, HTML, or other UI code, it automatically renders them in a split-pane preview panel alongside the conversation.

## Features Implemented

### 1. **Secure Sandbox Iframe Component** (`src/components/coder/code-sandbox.tsx`)
- Sandboxed iframe with `allow-scripts`, `allow-same-origin`, etc.
- Supports React, HTML, and Vue code rendering
- Automatic library injection (React, Recharts, Lucide icons, Tailwind CSS)
- Error handling and loading states
- Runtime error capture and display

### 2. **Split-Pane Layout** (`src/components/coder/simple-chat-coder.tsx`)
- Resizable panels using `react-resizable-panels`
- Chat on left (50% default)
- Live preview on right (50% default)
- Minimum panel size constraints (30%)

### 3. **Code Extraction System** (`src/lib/code-extraction.ts`)
- Automatic detection of code blocks in markdown responses
- Smart inference of code type (React, HTML, Vue, JavaScript)
- React pattern detection (JSX, hooks, imports)
- Code cleaning (removes imports/exports for sandbox)

### 4. **Artifact Management** (`src/stores/artifact-store.ts`)
- Zustand store for managing generated components
- Track multiple artifacts per conversation
- Active artifact selection
- CRUD operations for artifacts

### 5. **Preview Controls** (`src/components/coder/preview-controls.tsx`)
- macOS-style window controls (traffic lights)
- Copy code to clipboard
- Refresh preview
- Toggle between code view and preview
- Display artifact title

### 6. **Preview Panel** (`src/components/coder/preview-panel.tsx`)
- Empty state with helpful prompts
- Automatic artifact rendering
- Code view toggle
- Responsive layout

### 7. **Enhanced AI System Prompt** (`src/app/api/chat/coder/route.ts`)
- Updated to encourage creating interactive React components
- Specifies available libraries (React, Recharts, Lucide, Tailwind)
- Instructions for using proper code block formats

## How It Works

### Automatic Code Detection Flow

1. **User sends prompt**: "Create a todo list component"
2. **AI responds** with JSX/React code in markdown code block:
   \`\`\`jsx
   function TodoList() {
     const [todos, setTodos] = useState([]);
     // ... component code
   }
   \`\`\`
3. **Code extraction** (`useEffect` in simple-chat-coder.tsx):
   - Monitors new assistant messages
   - Extracts code blocks using `findRenderableCode()`
   - Detects React patterns (JSX, hooks, imports)
4. **Artifact creation**:
   - Creates artifact with unique ID
   - Stores code, type, and metadata
   - Sets as active artifact
5. **Preview rendering**:
   - PreviewPanel displays active artifact
   - CodeSandbox component creates secure iframe
   - Injects React libraries and transpiles code with Babel
   - Renders component in isolated environment

## Available Libraries in Sandbox

The sandbox automatically provides:

- **React 18** - Full React library
- **React Hooks** - useState, useEffect, useCallback, useMemo, useRef
- **Tailwind CSS** - Full utility classes
- **Lucide Icons** - Icon library (accessible via `lucide` global)
- **Recharts** - Charting library for data visualization
  - BarChart, LineChart, AreaChart, PieChart
  - Bar, Line, Area, Pie, XAxis, YAxis, CartesianGrid
  - Tooltip, Legend, ResponsiveContainer, Cell

## Usage Examples

### Example 1: Simple Component

User: "Create a counter button"

AI Response:
\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8 flex flex-col items-center gap-4">
      <h2 className="text-2xl font-bold">Count: {count}</h2>
      <button
        onClick={() => setCount(count + 1)}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Increment
      </button>
    </div>
  );
}
\`\`\`

Result: Live interactive counter appears in preview panel

### Example 2: Dashboard with Charts

User: "Create a sales dashboard with a bar chart"

AI Response:
\`\`\`jsx
function SalesDashboard() {
  const data = [
    { month: 'Jan', sales: 4000 },
    { month: 'Feb', sales: 3000 },
    { month: 'Mar', sales: 5000 },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
\`\`\`

Result: Interactive dashboard with chart appears in preview panel

## File Structure

\`\`\`
src/
├── components/
│   └── coder/
│       ├── code-sandbox.tsx        # Iframe sandbox renderer
│       ├── preview-controls.tsx    # Toolbar controls
│       ├── preview-panel.tsx       # Preview container
│       └── simple-chat-coder.tsx   # Main coder component (updated)
├── lib/
│   └── code-extraction.ts          # Code parsing utilities
├── stores/
│   └── artifact-store.ts           # Artifact state management
└── app/
    └── api/
        └── chat/
            └── coder/
                └── route.ts        # Coder API (updated)
\`\`\`

## Configuration

### Sandbox Security

The iframe sandbox has these permissions enabled:
- \`allow-scripts\` - Required to run React
- \`allow-same-origin\` - Required for React DOM manipulation
- \`allow-forms\` - For form inputs
- \`allow-modals\` - For alerts/confirms

### Panel Sizes

Default split: 50/50 (chat/preview)
- Minimum panel size: 30%
- User can resize by dragging the handle

## Testing the Implementation

1. **Start dev server** (already running on port 3001)
2. **Navigate to Coder mode** in your app
3. **Test with prompts**:
   - "Create a button that says 'Click me'"
   - "Make a todo list component"
   - "Build a dashboard with a pie chart"
   - "Create a pricing table with 3 tiers"

## Troubleshooting

### Preview not showing
- Check browser console for errors
- Verify code block has proper language tag (\`\`\`jsx or \`\`\`react)
- Ensure component is a valid React function

### Component not rendering
- Check for syntax errors in generated code
- Verify all required hooks are imported (they're auto-provided)
- Look for runtime errors in preview panel

### Sandbox errors
- Check for unsupported libraries (only listed ones are available)
- Verify code doesn't use Node.js modules
- Ensure no external fetch/API calls without CORS

## Future Enhancements

Potential improvements:
1. **Fullscreen mode** for preview panel
2. **Version history** for artifacts
3. **Export to CodeSandbox** or StackBlitz
4. **Multiple artifact tabs** (carousel)
5. **Dark mode** for preview
6. **More libraries** (D3.js, Framer Motion, etc.)
7. **TypeScript support** with type checking
8. **Hot reload** on code edit
9. **Mobile responsive** preview modes
10. **Screenshot** and sharing features

## Notes

- The sandbox runs entirely in the browser - no server-side execution
- Code is transpiled using Babel Standalone in the iframe
- React components are mounted to a root div in the iframe
- Artifacts persist during the session but are cleared on reset

## Development Server

Server is running at: **http://localhost:3001**

You can now test the coder mode with live preview!
