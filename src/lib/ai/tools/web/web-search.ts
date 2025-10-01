import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { safe } from "ts-safe";

// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults: number;
  contents: {
    text:
      | {
          maxCharacters?: number;
        }
      | boolean;
    livecrawl?: "always" | "fallback" | "preferred";
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
}

export interface ExaContentsRequest {
  ids: string[];
  contents: {
    text:
      | {
          maxCharacters?: number;
        }
      | boolean;
    livecrawl?: "always" | "fallback" | "preferred";
  };
}

export const exaSearchSchema: JSONSchema7 = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query",
    },
    numResults: {
      type: "number",
      description: "Number of search results to return",
      default: 2, // Reduced from 4 for cost optimization
      minimum: 1,
      maximum: 2, // Reduced from 4 for cost optimization
    },
    type: {
      type: "string",
      enum: ["keyword"],
      description:
        "Search type - keyword search for exact matches and cost optimization",
      default: "keyword",
    },
    category: {
      type: "string",
      enum: [
        "company",
        "research paper",
        "news",
        "linkedin profile",
        "github",
        "tweet",
        "movie",
        "song",
        "personal site",
        "pdf",
      ],
      description: "Category to focus the search on",
    },
    includeDomains: {
      type: "array",
      items: { type: "string" },
      description: "List of domains to specifically include in search results",
      default: [],
    },
    excludeDomains: {
      type: "array",
      items: { type: "string" },
      description:
        "List of domains to specifically exclude from search results",
      default: [],
    },
    startPublishedDate: {
      type: "string",
      description: "Start date for published content (YYYY-MM-DD format)",
    },
    endPublishedDate: {
      type: "string",
      description: "End date for published content (YYYY-MM-DD format)",
    },
    maxCharacters: {
      type: "number",
      description: "Maximum characters to extract from each result",
      default: 1500, // Reduced from 3000 for cost optimization
      minimum: 100,
      maximum: 2000, // Reduced from 10000 for cost optimization
    },
  },
  required: ["query"],
};

export const exaContentsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    urls: {
      type: "array",
      items: { type: "string" },
      description: "List of URLs to extract content from",
    },
    maxCharacters: {
      type: "number",
      description: "Maximum characters to extract from each URL",
      default: 3000,
      minimum: 100,
      maximum: 10000,
    },
    livecrawl: {
      type: "string",
      enum: ["always", "fallback", "preferred"],
      description:
        "Live crawling preference - always forces live crawl, fallback uses cache first, preferred tries live first",
      default: "preferred",
    },
  },
  required: ["urls"],
};

const API_KEY = process.env.EXA_API_KEY;
const BASE_URL = "https://api.exa.ai";

const fetchExa = async (endpoint: string, body: any): Promise<any> => {
  if (!API_KEY) {
    throw new Error("EXA_API_KEY is not configured");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new Error("Invalid EXA API key");
  }
  if (response.status === 429) {
    throw new Error("Exa API usage limit exceeded");
  }

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

export const exaSearchTool = createTool({
  description: `Search the web for real-time information using Exa's AI-powered search engine.

Use this tool when users need:
- Current information, news, or recent developments
- Product prices, availability, or shopping information (flights, hotels, products)
- Research on specific topics, companies, or people
- Latest documentation or technical resources

How to use effectively:
- Use natural language queries (e.g., "cheapest flights from Mexico to Tokyo in November")
- For price/product searches: be specific about what, where, and when
- Use 'includeDomains' to search specific sites (e.g., ["amazon.com"] for products)
- Use 'category' when searching for specific content types (news, research papers, etc.)
- Default numResults is 2 (max 2) - use 2 for comprehensive results, 1 for quick answers`,
  inputSchema: jsonSchemaToZod(exaSearchSchema),
  execute: (params) => {
    return safe(async () => {
      const searchRequest: ExaSearchRequest = {
        query: params.query,
        type: params.type || "keyword",
        numResults: params.numResults || 2,
        contents: {
          text: {
            maxCharacters: params.maxCharacters || 1500,
          },
          livecrawl: "preferred",
        },
      };

      // Add optional parameters if provided
      if (params.category) searchRequest.category = params.category;
      if (params.includeDomains?.length)
        searchRequest.includeDomains = params.includeDomains;
      if (params.excludeDomains?.length)
        searchRequest.excludeDomains = params.excludeDomains;
      if (params.startPublishedDate)
        searchRequest.startPublishedDate = params.startPublishedDate;
      if (params.endPublishedDate)
        searchRequest.endPublishedDate = params.endPublishedDate;

      const result = await fetchExa("/search", searchRequest);

      return {
        ...result,
        guide: `Use the search results to answer the user's question. Summarize the content and ask if they have any additional questions about the topic.`,
      };
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "A web search error occurred. First, explain to the user what caused this specific error and how they can resolve it. Then provide helpful information based on your existing knowledge to answer their question.",
        };
      })
      .unwrap();
  },
});

export const exaContentsTool = createTool({
  description: `Extract and read the full text content from specific web pages.

Use this tool when you need to:
- Read the full content of a specific webpage or article
- Extract detailed information from URLs the user provides
- Get more details from search results (after using web search)
- Scrape content from multiple pages

How to use:
- Provide one or more URLs in the 'urls' parameter
- Set maxCharacters based on need (default 3000, max 10000)
- Use 'livecrawl' to force fresh content: "always" = always live, "fallback" = try cache first, "preferred" = try live first (default)`,
  inputSchema: jsonSchemaToZod(exaContentsSchema),
  execute: async (params) => {
    return safe(async () => {
      const contentsRequest: ExaContentsRequest = {
        ids: params.urls,
        contents: {
          text: {
            maxCharacters: params.maxCharacters || 1500,
          },
          livecrawl: params.livecrawl || "preferred",
        },
      };

      return await fetchExa("/contents", contentsRequest);
    })
      .ifFail((e) => {
        return {
          isError: true,
          error: e.message,
          solution:
            "A web content extraction error occurred. First, explain to the user what caused this specific error and how they can resolve it. Then provide helpful information based on your existing knowledge to answer their question.",
        };
      })
      .unwrap();
  },
});
