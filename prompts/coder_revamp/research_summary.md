# Coder System Prompt Research Summary (Oct 2025)

This document summarizes best practices for designing system prompts for code-generation AI models, based on documentation from OpenAI, Anthropic (Claude), and Google (Gemini).

### 1. Core Principles

- **Clarity and Specificity**: All providers emphasize the need for clear, direct, and detailed instructions. Vague requests lead to poor results. The prompt should explicitly state the desired outcome, format, style, and any constraints.
- **Instruction Placement**: Instructions should be placed at the beginning of the prompt.
- **Use Delimiters**: Use clear separators like `###` or `"""` to distinguish instructions from user input or context.

### 2. Role-Playing and Persona

- Assigning a role to the assistant (e.g., "You are an expert security-focused developer") helps align its responses with the desired persona and expertise.

### 3. Context is Key

- **Provide Comprehensive Context**: Supply the model with relevant information, such as the technology stack, existing code snippets, project architecture, and specific library versions.
- **Context Files**: Google and Anthropic suggest using dedicated files (`GEMINI.md`, `CLAUDE.md`) to provide persistent context, such as build commands, style guides, and core utility functions.

### 4. Structuring Prompts for Complexity

- **Break Down Tasks**: For complex requests, break the problem into smaller, sequential steps. This is more effective than a single, overloaded prompt.
- **Chain-of-Thought/Step-by-Step Thinking**: Instruct the model to "think step-by-step" before providing the final answer. Anthropic uses `<thinking>` tags for this, which improves reasoning on complex tasks.

### 5. Few-Shot Prompting (Providing Examples)

- Including 2-3 high-quality examples of the desired input/output format (few-shot prompting) is a powerful technique to improve the accuracy and consistency of the model's output.

### 6. Safety, Security, and Trust

- **Explicit Guardrails**: The system prompt should contain explicit instructions to prevent insecure practices, such as generating code with hardcoded secrets, SQL injection vulnerabilities, or other common weaknesses.
- **Review and Verification**: Remind the user that AI-generated code requires human oversight. The prompt should encourage reviewing, testing, and linting all code before execution.
- **Transparency**: The assistant should be transparent about its limitations and refuse to perform unsafe actions.

### 7. Output Formatting and Style

- **Specify Format**: Clearly define the desired output format (e.g., JSON, single file, markdown with specific headers).
- **Language Consistency**: Instruct the model to respond in the same language as the user's query.
- **Conciseness**: For developer-focused tools, responses should be concise and directly address the task, avoiding unnecessary conversational filler.

### References:

- **OpenAI**: [Prompting best practices](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFGz_Q3eQ9fiCFuE-5v9lhvr40p39hexsG2J8zbEY4FxSpoteYkslFXTh5fIFhQ4hnEcwrcoOA-_3dP9rdpKJS5f2lLE6vBQnD_EUwwO6WHipXJPVV8VD3TqgJhIQISu0pK4Xpzbk3gb73tREoUIvyvUuvV356HFZlMso2j0chxFk9eyhkniZdtuzaNQDMpLOamZzwEsQczo0mpe9jrkwI=)
- **Anthropic**: [Claude prompting guide](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGAqr9sridTZQ4gGxLgQpZOSZhCmzcPm5YBQwTfkVthqSbh1cWD956QT7wDPXQFHJjHIbP74xM4CaOfACAglJi4bLvze2J5w40dZvxbsotcP0r8QsHr04NrljkPdLTc6dys7xKQyVO15ixaLuTtUL7gKg3EoLtWFnCS4mqQ-XyuCJD1dQHPnQ9WDF-i7CYEWwO4oB7x_W9O)
- **Google Gemini**: [Prompt design best practices](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGUtbhyENcyspOSVXlMA6k-qS6TysRjOSQL-MtQPKUeFLCzCXK3LNqITxRHg1zF7IXse-EKI74MXwKXe76ngM-04tqV5SQRSD_89ELqIGnDExksM8Q3AQOzQrp_85SbUagnm__8tdEdV6tWzHTpdeP2Re5BwA==)
