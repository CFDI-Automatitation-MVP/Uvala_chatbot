import { tavily } from "@tavily/core";
import { tool } from "ai";
import z from "zod";

let tavilyService: any;

function getTavilyService() {
  if (!tavilyService) {
    tavilyService = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });
  }
  return tavilyService;
}

export const search_tool = tool({
  description:
    "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events like news, weather, stock price etc. Input should be a search query.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    try {
      const tavilyService = getTavilyService();
      const response = await tavilyService.search(query, { max_results: 5 });
      return response;
    } catch (error) {
      console.error("Search error:", error);
      throw new Error("Search failed");
    }
  },
});
