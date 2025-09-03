import { tool as createTool } from "ai";
import { z } from "zod";

export const createPresentationTool = createTool({
  description: `Create professional presentations with slides that can be navigated and presented in fullscreen mode.

PRESENTATION STRUCTURE:
- Each slide should be written in markdown format
- Separate slides using "---" (three dashes on a new line)
- Use headers (#, ##, ###) for slide titles
- Support for markdown formatting: bold, italic, code, lists, etc.

SLIDE CONTENT GUIDELINES:
- Keep slides concise and focused on one main idea
- Use clear, readable headers for each slide
- Include bullet points for key information
- Add emphasis with **bold** and *italic* text
- Use code blocks for technical content

PRESENTATION STRUCTURE EXAMPLES:
- Business presentations: Executive summary, problem statement, solution, market analysis, financial projections
- Educational content: Learning objectives, key concepts, examples, practice exercises, summary
- Technical presentations: Architecture overview, implementation details, code examples, results
- Project updates: Current status, achievements, challenges, next steps, timeline

The presentation will be displayed in an interactive viewer with navigation controls and fullscreen presentation mode.`,

  inputSchema: z.object({
    slides: z.array(z.string()).optional().describe("Array of individual slide content in markdown format. Each array item represents one slide."),
    markdown: z.string().describe("Complete presentation content in markdown format with slides separated by '---' (three dashes). This is the preferred method for creating presentations."),
    title: z.string().default("Presentation").describe("Title of the presentation that will be displayed in the header."),
  }),

  execute: async ({ slides = [], markdown = "", title = "Presentation" }) => {
    try {
      // Validate that we have content
      if (!markdown.trim() && slides.length === 0) {
        return {
          success: false,
          error: "Presentation content is required. Provide either markdown with slides separated by '---' or an array of slides.",
          slides,
          markdown,
          title
        };
      }

      // If only slides array is provided, convert to markdown
      let finalMarkdown = markdown;
      if (!markdown.trim() && slides.length > 0) {
        finalMarkdown = slides.join('\n\n---\n\n');
      }

      // Basic validation - ensure we have content
      if (!finalMarkdown.trim()) {
        return {
          success: false,
          error: "No presentation content found",
          slides,
          markdown: finalMarkdown,
          title
        };
      }

      // Count slides for validation
      const slideCount = finalMarkdown.split(/^---\s*$/m).length;
      
      return {
        success: true,
        slides: slides.length > 0 ? slides : [],
        markdown: finalMarkdown.trim(),
        title,
        message: `Successfully created presentation "${title}" with ${slideCount} slide${slideCount > 1 ? 's' : ''}`
      };

    } catch (error: any) {
      console.error('Presentation creation error:', error);
      
      return {
        success: false,
        error: error.message,
        slides,
        markdown,
        title,
        solution: "Try checking your markdown content for proper formatting. Make sure slides are separated by '---' on new lines."
      };
    }
  },
});