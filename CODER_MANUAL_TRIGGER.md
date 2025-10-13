# Coder Manual Preview Trigger - Added

## What I Added

### 1. **Apple-Styled Manual Preview Button** in the Coder Header

Located in `/src/components/coder-popup.tsx`:

- **macOS-style traffic light buttons** (red, yellow, green dots) on the left
- **Manual "Preview" button** that appears when a component is generated
  - Blue accent color matching Apple's design language
  - Eye icon with "Preview" label
  - Only shows when `activeArtifactId` exists (code has been generated)
  - Dispatches a custom event to trigger the preview

### 2. **Event Listener** in SimpleChatCoder

Added listener for the manual preview trigger event:
- Listens for `coderShowPreview` custom event
- Forces `setShowPreview(true)` when triggered
- Includes debug logging

### 3. **Enhanced Debug Logging**

Added more comprehensive logging in the code extraction flow:
- Full messages array
- Complete last message object
- Parts count
- This will help us see exactly what's happening

## How to Test

### Step 1: Open Coder Mode

1. Look at the **left sidebar**
2. Click the **"Coder"** button (with `</>` icon)
3. A drawer will slide in from the right

### Step 2: Check the Header

You should now see at the top of the Coder drawer:
- **macOS traffic lights** (red, yellow, green dots) on the left
- **Reset button** (circular arrow)
- **Close button** (X)

### Step 3: Generate Code

Ask the AI:
```
Create a simple counter button component in React
```

### Step 4: Watch the Console

Open browser DevTools (F12) and look for:
```
[CODER DEBUG] Messages changed, count: X
[CODER DEBUG] Full messages array: [...]
[CODER DEBUG] Last message: {...}
[CODE EXTRACTION] Finding renderable code...
[ARTIFACT STORE] Artifact added
[CODER STATE] activeArtifactId: artifact-xxx
```

### Step 5: Manual Trigger

If the preview doesn't show automatically:
1. A **blue "Preview" button** should appear in the header (next to traffic lights)
2. **Click it** to manually trigger the preview
3. Console should show:
   ```
   [CODER POPUP] Manual preview trigger clicked
   [CODER DEBUG] Manual preview trigger received
   [CODER DEBUG] Setting showPreview to true (manual trigger)
   [CODER DEBUG] Expanding preview panel
   ```

## Debugging Steps

### If the Preview Button Doesn't Appear

**Check console for:**
```
[CODER STATE] activeArtifactId: null
```

This means no artifact was created. Look earlier in the logs for:
- `[CODE EXTRACTION] Renderable blocks found: 0` → Code wasn't detected as renderable
- `[CODER DEBUG] No renderable code found in message` → No code blocks in response

### If Messages Aren't Being Processed

**Check console for:**
```
[CODER DEBUG] Messages changed, count: 0
```

This means messages aren't arriving. Possible causes:
- Wrong API endpoint
- API not returning messages in expected format
- Streaming not completing

### If Code is Found But No Artifact Created

**Check console for:**
```
[CODE EXTRACTION] Renderable blocks found: 1
[CODER DEBUG] Renderable code found: true
```

But NO:
```
[ARTIFACT STORE] Artifact added
```

This means there's an error in the `addArtifact` call.

## What the Logs Will Tell Us

The enhanced logging will show:

1. **Message Structure** - What format messages are arriving in
2. **Parts Array** - Whether `parts` exists and what it contains
3. **Code Extraction** - Whether code blocks are being found
4. **Artifact Creation** - Whether artifacts are being created
5. **State Changes** - Whether `activeArtifactId` and `showPreview` are updating

## Apple-Style Design Features

The header now has:

**Traffic Light Buttons:**
```tsx
<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30">
  <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500" />
  <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500" />
  <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500" />
</div>
```

**Manual Preview Button:**
```tsx
<Button
  className="rounded-full h-8 px-3 gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20"
>
  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Preview</span>
</Button>
```

## Next Steps

After you test and share the console logs, I can:
1. Fix the message parsing if the structure is different
2. Adjust the code extraction regex if needed
3. Fix the artifact creation if there's an error
4. Adjust the panel expansion logic if needed

The manual button gives you a fallback way to trigger the preview even if auto-detection isn't working yet!
