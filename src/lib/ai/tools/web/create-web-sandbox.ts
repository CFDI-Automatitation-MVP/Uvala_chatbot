import { tool as createTool } from "ai";
import { z } from "zod";

export const createWebSandboxTool = createTool({
  description: `Create professional, interactive web applications and pages that run live in a sandbox. 

DESIGN PHILOSOPHY:
- Create modern, responsive designs with clean aesthetics
- Use semantic HTML5 elements (header, nav, main, section, article, aside, footer)
- Implement mobile-first responsive design with CSS Grid/Flexbox
- Apply modern CSS techniques: custom properties, transitions, animations
- Follow accessibility best practices (ARIA labels, semantic structure, proper contrast)
- Use contemporary color schemes and typography

TECHNICAL GUIDELINES:
- Write clean, semantic HTML with proper structure
- Use modern CSS features: Grid, Flexbox, custom properties (--variables)
- Implement smooth animations and micro-interactions
- Add responsive breakpoints for mobile, tablet, desktop
- Include proper meta tags and viewport settings
- Use JavaScript for meaningful interactivity, not just basic functionality

RECOMMENDED PATTERNS:
- Landing pages: Hero sections, feature cards, testimonials, CTAs
- Web apps: Interactive dashboards, forms with validation, data visualization  
- UI Components: Modals, dropdowns, sliders, tabs, accordions
- Interactive demos: Games, calculators, tools, animations
- Portfolio/showcase: Image galleries, project showcases, timelines

STYLING APPROACH:
- Use modern color palettes (consider gradients, shadows, glassmorphism)
- Implement consistent spacing using CSS custom properties
- Add subtle animations and hover effects
- Use web fonts (Google Fonts via CDN) for better typography
- Create cohesive visual hierarchy with proper sizing and spacing
- Add loading states, success/error feedback for interactions

Always create complete, polished experiences that demonstrate modern web development practices.`,

  inputSchema: z.object({
    html: z.string().describe("Complete HTML structure using semantic HTML5 elements, proper meta tags, and accessible markup. Include all content and structure needed for a complete page."),
    css: z.string().default("").describe("Modern CSS with responsive design, custom properties, animations, and contemporary styling. Use CSS Grid/Flexbox for layout, smooth transitions, and mobile-first approach."),
    javascript: z.string().default("").describe("Interactive JavaScript for user engagement - form validation, dynamic content, animations, event handling, data manipulation, or interactive features that enhance the user experience."),
    title: z.string().default("Web Application").describe("Descriptive title that reflects the purpose/content of the web application or page being created."),
  }),
  execute: async ({ html, css = "", javascript = "", title = "Web Sandbox" }) => {
    try {
      // Basic validation
      if (!html.trim()) {
        return {
          success: false,
          error: "HTML content is required to create a web sandbox",
          html,
          css,
          javascript,
          title
        };
      }

      // Return the sandbox data - the UI component will handle rendering
      return {
        success: true,
        html: html.trim(),
        css: css.trim(),
        javascript: javascript.trim(),
        title,
        message: `Successfully created web sandbox: "${title}"`
      };

    } catch (error: any) {
      console.error('Web sandbox creation error:', error);
      
      return {
        success: false,
        error: error.message,
        html,
        css,
        javascript,
        title,
        solution: "Try checking your HTML, CSS, and JavaScript for syntax errors. Make sure the HTML is valid and properly formatted."
      };
    }
  },
});