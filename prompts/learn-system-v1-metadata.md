# Learn Mode System Prompt - V1

**Date:** 2025-10-29
**Model:** OpenAI GPT-OSS-120B (AWS Bedrock)
**Reasoning Effort:** Medium
**Match Threshold:** 0.2 (lowered from 0.3)

## Performance Metrics

### Tool Call Efficiency
- **Before (high thinking, no rules):** 6-8 fileSearch calls per question
- **After (medium thinking + rules):** 1 fileSearch call per question
- **Improvement:** 83% reduction in tool calls

### Cost & Resource Savings
- **Token reduction:** 30% (21,105 → 14,708 tokens)
- **Cost reduction:** 30% ($0.0038 → $0.0028)
- **Latency improvement:** 15% (17s → 14s)
- **Water savings:** 30% (91mL → 63mL)
- **Energy savings:** 30% (21.3Wh → 14.8Wh)

## Key Features

### 1. **Document Search Rules**
- Call fileSearch ONCE with comprehensive query
- Use semantic mode for concepts/topics
- Use exact mode ONLY for specific quotes or section numbers
- NEVER search for single characters ("1.", "2.")
- Stop searching once relevant results found
- NEVER hallucinate document structure

### 2. **Teaching Philosophy**
- Socratic method: guide with questions, not direct answers
- Get to know user's level/goals before diving in
- Build on existing knowledge
- Check understanding and reinforce learning
- Keep responses brief for good back-and-forth

### 3. **Flashcard Generation**
- Full SM-2 spaced repetition implementation
- Interactive HTML-based flashcards
- Keyboard shortcuts support
- Session tracking with confetti celebration

## Changes from Initial Version

1. **Added strict document search rules** (lines 131-138)
   - Prevents excessive tool calling
   - Enforces single comprehensive search
   - Eliminates wasteful single-character searches

2. **Reasoning effort configuration**
   - Set to "medium" in route.ts:624
   - High thinking caused overthinking and confusion
   - Medium provides balance between quality and efficiency

3. **Match threshold lowered**
   - From 0.3 to 0.2 in file-search-tool.ts:70
   - Improved recall for generic queries
   - "table of contents" now matches (0.232 similarity)

## Known Issues

- Model sometimes asks about goals before searching (good UX but adds latency)
- Occasionally provides generic answer before calling fileSearch on first question

## Full Prompt

See `learn-system-v1.txt` for the complete system prompt.
