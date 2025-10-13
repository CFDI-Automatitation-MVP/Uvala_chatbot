# Debugging Coder Preview System

## Problem
The coder mode's live preview panel is not appearing when JSX/React code is generated, despite the code being correctly generated with proper markdown code fences.

## What I've Done

### 1. Added Comprehensive Debug Logging

I've added detailed console logging throughout the code extraction and artifact creation flow:

#### In `simple-chat-coder.tsx`:
- Logs when messages change
- Logs message role and parts structure
- Logs text content extraction
- Logs whether renderable code was found
- Logs artifact creation
- Logs state changes (`showPreview`, `activeArtifactId`)

#### In `code-extraction.ts`:
- Logs content being analyzed
- Logs all code blocks found
- Logs renderable blocks filtering
- Logs final result

#### In `artifact-store.ts`:
- Logs when artifacts are added
- Logs artifact metadata
- Logs active artifact ID changes

### 2. Verified Code Extraction Logic

Created and ran `test-code-extraction.js` which confirms:
- ✅ Code blocks with `jsx` language tag are correctly extracted
- ✅ React patterns (imports, useState, JSX) are correctly detected
- ✅ Code is correctly classified as type "react"
- ✅ Renderable code filtering works

### 3. Verified Message Structure

Checked codebase to confirm:
- ✅ Messages have a `parts` array property
- ✅ Text parts have `type === "text"` and a `text` property
- ✅ Filtering logic matches existing patterns in the codebase

## How to Debug

### Step 1: Start the Dev Server

```bash
pnpm run dev
```

This will start on port 3000 (as configured).

### Step 2: Open Browser Console

1. Navigate to `http://localhost:3000`
2. Open Coder mode
3. Open browser DevTools (F12 or Cmd+Option+I)
4. Go to the Console tab

### Step 3: Generate React Code

Type a prompt like:
```
Create a simple counter button component
```

or

```
Make a todo list with React hooks
```

### Step 4: Watch the Console

You should see logs like this:

```
[CODER DEBUG] Messages changed, count: 2
[CODER DEBUG] Last message role: assistant
[CODER DEBUG] Last message parts: [{type: "text", text: "..."}]
[CODER DEBUG] Text content length: 450
[CODER DEBUG] Text content preview: Here's a counter...
[CODE EXTRACTION] Finding renderable code in content
[CODE EXTRACTION] Content length: 450
[CODE EXTRACTION] Total code blocks found: 1
[CODE EXTRACTION] Code blocks: [{lang: "jsx", type: "react", len: 350}]
[CODE EXTRACTION] Renderable blocks found: 1
[CODE EXTRACTION] Returning: react code (350 chars)
[CODER DEBUG] Renderable code found: true
[CODER DEBUG] Code type: react
[CODER DEBUG] Creating artifact with ID: artifact-msg-123
[ARTIFACT STORE] addArtifact called with: {id: "artifact-msg-123", ...}
[ARTIFACT STORE] Artifact added, total artifacts: 1
[ARTIFACT STORE] Setting activeArtifactId to: artifact-msg-123
[CODER DEBUG] Artifact added, showing preview
[CODER STATE] showPreview: true
[CODER STATE] activeArtifactId: artifact-msg-123
```

## Potential Issues and Solutions

### Issue 1: No Code Blocks Found

**Console shows:** `[CODE EXTRACTION] Total code blocks found: 0`

**Cause:** AI is not generating code with proper markdown fences

**Solution:**
- Check the system prompt in `/src/app/api/chat/coder/route.ts`
- Ensure the AI is instructed to use ```jsx or ```react markers
- Test with a more explicit prompt: "Create a React component with ```jsx code fence"

### Issue 2: Code Blocks Found But Not Renderable

**Console shows:** `[CODE EXTRACTION] Renderable blocks found: 0`

**Cause:** Code blocks exist but aren't classified as react/html/vue

**Solution:**
- Check what language marker the AI used: Look for `[CODE EXTRACTION] Code blocks: [...]`
- If using `javascript` or `js` marker, the code needs React patterns (JSX, hooks, imports)
- Update system prompt to enforce `jsx` or `react` language markers

### Issue 3: No Messages or Wrong Role

**Console shows:** `[CODER DEBUG] Last message is not from assistant`

**Cause:** The effect is triggering on user messages or during streaming

**Solution:**
- This is normal behavior - the extraction only runs after assistant messages complete
- If assistant messages aren't being created, check the API route `/src/app/api/chat/coder/route.ts`

### Issue 4: Message Parts Structure Issue

**Console shows:** Error about `parts` being undefined or empty

**Cause:** Message structure doesn't match expected format

**Solution:**
- Check `[CODER DEBUG] Last message parts:` output
- Verify the AI SDK version matches expected structure
- May need to adjust the parts extraction logic

### Issue 5: Artifact Added But Preview Not Showing

**Console shows:**
```
[ARTIFACT STORE] Artifact added
[CODER STATE] activeArtifactId: artifact-msg-123
```
But `[CODER STATE] showPreview: false` or preview panel not visible

**Cause:** State update or rendering issue

**Solution:**
- Check if `ResizablePanel` for preview is rendering
- Check if `activeArtifactId` is being read correctly by the button conditional
- Try manually setting `showPreview` to always true temporarily

## Testing the Fix

Once you see the correct console logs, the preview panel should:

1. **Automatically appear** when code is detected
2. **Show a toggle button** (Eye/EyeOff icon) above the input
3. **Display the live preview** of the React component in the right panel
4. **Be resizable** by dragging the handle between panels

## Next Steps After Debugging

Based on what the console logs show, we can:

1. **Adjust the AI System Prompt** - If code isn't being generated correctly
2. **Fix Message Parsing** - If the parts structure is different than expected
3. **Debug State Management** - If artifacts are created but UI isn't updating
4. **Check Component Rendering** - If everything logs correctly but preview doesn't show

## Quick Test Command

Run the test extraction script to verify the regex works:

```bash
node test-code-extraction.js
```

Expected output:
```
Extracted blocks: 1
Block 1:
  Language: jsx
  Inferred Type: react
  Is React?: true
✅ Would create artifact with type: react
✅ Code length: 415
```

## Files Modified

- ✅ `/src/components/coder/simple-chat-coder.tsx` - Added debug logs
- ✅ `/src/lib/code-extraction.ts` - Added debug logs
- ✅ `/src/stores/artifact-store.ts` - Added debug logs
- ✅ `/test-code-extraction.js` - Created test script

## Remove Debug Logs Later

Once the issue is identified and fixed, you can remove all the `console.log` statements by searching for:
- `[CODER DEBUG]`
- `[CODE EXTRACTION]`
- `[ARTIFACT STORE]`
- `[CODER STATE]`

Or keep them for future debugging! They don't hurt performance significantly.
