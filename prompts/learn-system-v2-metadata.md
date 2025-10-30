# Learn Mode System Prompt - V2

**Date:** 2025-10-29
**Model:** OpenAI GPT-OSS-120B (AWS Bedrock)
**Reasoning Effort:** Low
**Match Threshold:** 0.2

## Changes from V1

### New Features

1. **Search Planning Checklist**
   - "Begin with a concise checklist (3-7 bullets) outlining your planned search approach"
   - Encourages metacognitive planning before tool execution
   - Helps model organize thoughts and search strategy

2. **Result Validation**
   - "After the fileSearch call, validate the relevance of the results in 1-2 lines"
   - Adds self-checking mechanism
   - "Decide whether to proceed or self-correct if the results do not sufficiently answer the question"

3. **Improved Tone**
   - Changed from "CRITICAL - FOLLOW STRICTLY" to "DOCUMENT SEARCH RULES:"
   - More professional and less aggressive
   - Maintains strictness through clear, actionable guidelines

### Maintained from V1

- Single fileSearch call per user question
- Semantic vs exact mode guidance
- No single-character searches ("1.", "2.")
- No hallucination of document structure
- Full flashcard generation system

## Configuration

**Reasoning Effort:** Low (route.ts:624)
- Changed from medium to low for faster responses
- Testing if lower reasoning reduces overthinking
- Maintains strict rules in prompt to compensate

**Match Threshold:** 0.2 (file-search-tool.ts:70)
- Unchanged from V1
- Good balance for semantic search recall

## Expected Improvements

1. **Better search planning** - Checklist forces model to think before calling tool
2. **Self-correction** - Validation step allows model to recognize poor results
3. **Transparency** - User sees the model's search strategy
4. **Reduced errors** - Planning reduces impulsive tool calls

## Potential Concerns

- Checklist might add latency to first response
- Low reasoning effort may reduce planning quality
- Need to test if validation step adds unnecessary verbosity

## Testing Goals

1. Verify single fileSearch call maintained
2. Check if planning checklist improves search quality
3. Monitor if validation step helps self-correction
4. Compare latency vs V1

## Full Prompt

See `learn-system-v2.txt` for the complete system prompt.
