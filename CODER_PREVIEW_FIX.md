# Coder Preview Panel Fix

## Problem Identified

The preview panel wasn't showing even though the code extraction and artifact creation were working correctly. The issue was with how `ResizablePanel` components were being conditionally rendered.

## Root Cause

**Conditional rendering of ResizablePanel doesn't work well with react-resizable-panels**

The original code was:
```tsx
{showPreview && (
  <ResizablePanel defaultSize={50} minSize={30}>
    <PreviewPanel />
  </ResizablePanel>
)}
```

This approach causes problems because:
1. `ResizablePanelGroup` calculates layout on mount
2. When a new panel is added dynamically, the group doesn't properly recalculate
3. The panel might render but with 0 width/height

## Solution Applied

**Use collapsible panels with imperative control**

Instead of conditionally rendering, we now:

1. **Always render both panels** in the `ResizablePanelGroup`
2. **Use the `collapsible` prop** on the preview panel
3. **Control collapse/expand programmatically** using a ref and the panel's imperative API

### Changes Made

#### 1. Added ImperativePanelHandle import
```tsx
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "ui/resizable";
```

#### 2. Created ref for preview panel
```tsx
const previewPanelRef = useRef<ImperativePanelHandle>(null);
```

#### 3. Added effect to control panel programmatically
```tsx
useEffect(() => {
  if (previewPanelRef.current) {
    if (showPreview) {
      console.log("[CODER DEBUG] Expanding preview panel");
      previewPanelRef.current.expand();
    } else {
      console.log("[CODER DEBUG] Collapsing preview panel");
      previewPanelRef.current.collapse();
    }
  }
}, [showPreview]);
```

#### 4. Updated panel structure
```tsx
<ResizablePanelGroup direction="horizontal" className="h-full">
  {/* Chat Panel - Always 100% when preview collapsed */}
  <ResizablePanel defaultSize={100} minSize={30}>
    {/* Chat content */}
  </ResizablePanel>

  {/* Handle - Always rendered */}
  <ResizableHandle withHandle />

  {/* Preview Panel - Starts collapsed (size 0) */}
  <ResizablePanel
    ref={previewPanelRef}
    defaultSize={0}
    minSize={30}
    maxSize={70}
    collapsible={true}
  >
    <PreviewPanel />
  </ResizablePanel>
</ResizablePanelGroup>
```

## How It Works Now

1. **On initial load**: Preview panel is collapsed (size 0), chat panel takes 100%
2. **When code is detected**:
   - `setShowPreview(true)` is called
   - `useEffect` triggers
   - `previewPanelRef.current.expand()` is called
   - Preview panel animates to its natural size (split 50/50 with chat)
3. **When user clicks Hide button**:
   - `setShowPreview(false)` is called
   - `useEffect` triggers
   - `previewPanelRef.current.collapse()` is called
   - Preview panel animates back to size 0, chat panel takes 100%

## Benefits

✅ Smooth animated transitions when showing/hiding preview
✅ No layout recalculation issues
✅ Proper resizable behavior
✅ Both panels always exist in the DOM
✅ Clean, predictable state management

## Testing

After this fix, the preview should:
1. ✅ Appear automatically when JSX code is generated
2. ✅ Animate smoothly into view
3. ✅ Be resizable by dragging the handle
4. ✅ Toggle on/off with the Eye/EyeOff button
5. ✅ Maintain its size when toggling (remembered by the panel group)

## Console Logs to Watch

When generating code, you should now see:
```
[CODER DEBUG] Renderable code found: true
[ARTIFACT STORE] Artifact added
[CODER STATE] showPreview: true
[CODER DEBUG] Expanding preview panel
```

The last log confirms the imperative expand() is being called.

## Files Modified

- `/src/components/coder/simple-chat-coder.tsx` - Main fix applied here

## Next Steps

Test the implementation:
1. Start dev server: `pnpm run dev`
2. Open Coder mode
3. Generate a React component
4. Verify preview panel appears smoothly
5. Test toggle button
6. Test resizing

If it still doesn't work, check the console for the "Expanding preview panel" log. If that appears but nothing shows, the issue may be with `react-resizable-panels` not supporting the imperative API as expected.
