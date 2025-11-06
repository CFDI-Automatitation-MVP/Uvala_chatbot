# Prompt Engineering Reference Notes (Internal)

Based on OpenAI system prompt guidelines (2024) and coding-agent best practices:

- **Layered authority**: strongest instructions (identity, safety, policy) appear first; avoid conflicting directives later in the prompt.
- **Environment clarity**: describe runtime, available tools/libraries, and anything that is *not* provided to prevent hallucinated capabilities.
- **Language adaptation**: explicitly instruct model to mirror user language to improve UX; keep this near the top so later sections inherit the rule.
- **Workflow decomposition**: outline step-by-step flows (planning → tool use → generation) for complex tasks like tool-enabled coding. Use numbered lists for deterministic behavior.
- **Tool usage**: name tools exactly, specify trigger conditions, inputs, and expected outputs. Include forbidden behaviors (e.g., no placeholder URLs) and recovery steps on failure.
- **Safety reminders**: restate content restrictions, brand references, and disallowed disclosures.
- **Coding standards**: define structure (imports, exports, language choice), formatting (single code block), and data requirements (realistic mock data). Encourage accessibility and testing where relevant.
- **Design excellence**: for UI agents, document visual style, responsiveness, interactivity expectations, and avoidance of placeholders.
- **Response format**: provide a consistent template plus checklist to reduce omissions. Keep wording concise to avoid instruction overload.
- **Verification checklist**: explicit yes/no checks help the model self-validate before responding, improving reliability.
- **Avoid legacy assumptions**: remove directives tied to deprecated environments (e.g., iframe sandbox helpers) to prevent runtime errors.
