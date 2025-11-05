# Pexels Stock Images Tool - Implementation Plan

## Overview
Create an isolated tool exclusively for Components mode that allows the AI to search for stock images from Pexels API. This enables the model to find relevant images to include in generated React components displayed in Sandpack.

## Purpose
- Enable Components mode to search for and include professional stock images in generated UI components
- Provide the model with access to free, high-quality images for dashboards, landing pages, and other UI components
- Isolated tool (not available to other modes like Learn, Coder, etc.)
- Enhance visual quality of generated components in Sandpack preview

---

## 1. Pexels API Requirements

### API Endpoint
- **URL**: `https://api.pexels.com/v1/search`
- **Method**: GET
- **Documentation**: https://www.pexels.com/api/documentation/

### Authentication
- **Method**: Authorization header
- **Format**: `Authorization: YOUR_API_KEY`
- **API Key Source**: https://www.pexels.com/api/ (free account required)
- **Environment Variable**: `PEXELS_API_KEY`

### Rate Limits
- **200 requests per hour**
- **20,000 requests per month**
- Important: Track usage to stay within limits

### Query Parameters
- **query** (required): Search term (e.g., "mountains", "business people", "abstract")
- **page** (optional): Page number (default: 1)
- **per_page** (optional): Results per page (default: 15, max: 80)
- **orientation** (optional): "landscape", "portrait", or "square"
- **size** (optional): "large" (24MP), "medium" (12MP), or "small" (4MP)
- **color** (optional): Color filter (e.g., "red", "blue", "#ffffff")
- **locale** (optional): Language/locale code

### Response Format
```typescript
interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  liked: boolean;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsSearchResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
  prev_page?: string;
}
```

---

## 2. Tool Structure (Following Existing Pattern)

### File Location
`src/lib/ai/tools/image/pexels-search.ts`

### Tool Implementation
```typescript
import { tool as createTool } from "ai";
import { z } from "zod";
import { safe } from "ts-safe";
import globalLogger from "logger";

const logger = globalLogger.withTag("pexels-search");

// Type definitions matching Pexels API
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  liked: boolean;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
  prev_page?: string;
}

// Pexels Stock Image Search Tool
export const pexelsSearchTool = createTool({
  description: "Search Pexels for free stock images to use in UI components. Returns high-quality image URLs in various sizes that can be directly used in React components.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(100)
      .describe("Search query for images (e.g., 'mountain landscape', 'business meeting', 'abstract pattern')"),
    orientation: z
      .enum(["landscape", "portrait", "square"])
      .optional()
      .describe("Preferred image orientation for the component layout"),
    per_page: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("Number of images to return (1-10, default: 5)"),
  }),
  execute: async ({ query, orientation, per_page = 5 }) => {
    logger.info(`🖼️ Pexels search initiated: "${query}"`);

    return safe(async () => {
      if (!process.env.PEXELS_API_KEY) {
        throw new Error("PEXELS_API_KEY is not configured");
      }

      // Build query parameters
      const params = new URLSearchParams({
        query,
        per_page: per_page.toString(),
      });

      if (orientation) {
        params.append("orientation", orientation);
      }

      const url = `https://api.pexels.com/v1/search?${params}`;

      logger.info(`📡 Calling Pexels API with query: "${query}"`);

      const response = await fetch(url, {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Pexels API error: ${response.status} ${response.statusText}`
        );
      }

      const data: PexelsSearchResponse = await response.json();

      logger.info(`✅ Pexels API returned ${data.photos.length} images`);

      // Format response for the AI model with all necessary information
      const formattedResponse = {
        total_results: data.total_results,
        count: data.photos.length,
        images: data.photos.map((photo) => ({
          id: photo.id,
          alt: photo.alt || query,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          avg_color: photo.avg_color,
          // Provide multiple size options for different use cases
          urls: {
            tiny: photo.src.tiny,           // Very small thumbnail
            small: photo.src.small,         // Small size (~280px)
            medium: photo.src.medium,       // Medium size (~350px)
            large: photo.src.large,         // Large size (~940px)
            large2x: photo.src.large2x,     // Extra large (2x)
            original: photo.src.original,   // Original full resolution
            landscape: photo.src.landscape, // Landscape crop
            portrait: photo.src.portrait,   // Portrait crop
          },
          dimensions: {
            width: photo.width,
            height: photo.height,
          },
        })),
      };

      logger.info(
        `🎯 Returning ${formattedResponse.images.length} formatted images`
      );

      return formattedResponse;
    })
      .ifFail((e) => {
        logger.error(`❌ Pexels search error: ${e.message}`);
        return {
          isError: true,
          error: e.message || "Image search failed",
          solution:
            "Unable to search for images at this time. You can use placeholder image URLs (e.g., via.placeholder.com) or ask the user to provide image URLs.",
          images: [],
        };
      })
      .unwrap();
  },
});
```

---

## 3. Integration with Components Mode

### Step 1: Add Tool to Components API Route

**File**: `src/app/api/chat/components/route.ts`

Add the import at the top:
```typescript
import { pexelsSearchTool } from "@/lib/ai/tools/image/pexels-search";
```

Modify the `streamText` call to include the tool:
```typescript
const result = streamText({
  model,
  system: COMPONENTS_SYSTEM,
  messages: convertToModelMessages(messages),
  maxOutputTokens: 16000,
  tools: {
    searchStockImages: pexelsSearchTool, // Only this tool available
  },
});
```

### Step 2: Update Components System Prompt

**File**: `src/lib/ai/mode-prompts.ts`

Add to `COMPONENTS_SYSTEM` before the "BE CONCISE" line:

```typescript
STOCK IMAGES (searchStockImages tool):
You have access to the searchStockImages tool to find free, high-quality stock photos from Pexels.
When to use:
• User explicitly requests images or photos
• Creating hero sections, landing pages, or marketing components
• Building dashboards with visual elements
• Gallery or portfolio layouts
• When images would significantly enhance the component

How to use:
• Call searchStockImages with a descriptive query
• Use orientation parameter when layout requires specific aspect ratio
• Tool returns multiple images with various size URLs
• Use 'medium' size for most components, 'large' for hero sections
• Always use the alt text from the response
• Include photographer attribution

Example implementation:
\`\`\`jsx
// After calling searchStockImages tool with query "office workspace"
const heroImage = "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=600";

<div className="relative">
  <img
    src={heroImage}
    alt="Modern office workspace"
    className="w-full h-96 object-cover rounded-lg"
  />
  <p className="text-xs text-gray-500 mt-1">
    Photo by <a href="photographerUrl" target="_blank" rel="noopener" className="underline">
      Photographer Name
    </a> on Pexels
  </p>
</div>
\`\`\`

Important:
• Don't overuse images - only when beneficial
• Always include photographer attribution
• Choose appropriate image sizes for performance
• Provide fallback styling if images fail to load
```

---

## 4. Environment Setup

### Add Environment Variable

**File**: `.env.local`
```bash
# Pexels API Key for stock image search
PEXELS_API_KEY=your_api_key_here
```

### Getting API Key
1. Visit https://www.pexels.com/api/
2. Click "Get Started" or "Sign Up"
3. Create free account
4. Navigate to API section in dashboard
5. Generate API key
6. Copy and add to `.env.local`

---

## 5. Example Tool Usage

### Tool Call Example
```json
{
  "name": "searchStockImages",
  "arguments": {
    "query": "modern office workspace",
    "orientation": "landscape",
    "per_page": 3
  }
}
```

### Tool Response Example
```json
{
  "total_results": 1547,
  "count": 3,
  "images": [
    {
      "id": 380769,
      "alt": "Person Using Macbook Pro on Table",
      "photographer": "PhotoMIX Company",
      "photographer_url": "https://www.pexels.com/@wdnet",
      "avg_color": "#A9A6A4",
      "urls": {
        "tiny": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280",
        "small": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&h=130",
        "medium": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=600",
        "large": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "large2x": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1200",
        "original": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg",
        "landscape": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=630",
        "portrait": "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=1200"
      },
      "dimensions": {
        "width": 5760,
        "height": 3840
      }
    }
    // ... 2 more images
  ]
}
```

---

## 6. Generated Component Example

The model will be able to generate components like:

```jsx
import React from 'react';

export default function App() {
  // Stock images from Pexels
  const images = {
    hero: "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1200",
    team: "https://images.pexels.com/photos/1181534/pexels-photo-1181534.jpeg?auto=compress&cs=tinysrgb&w=600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Stock Image */}
      <div className="relative h-96 mb-8">
        <img
          src={images.hero}
          alt="Modern office workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <h1 className="text-5xl font-bold text-white">
            Welcome to Our Platform
          </h1>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          Photo by{' '}
          <a
            href="https://www.pexels.com/@wdnet"
            className="underline hover:text-gray-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            PhotoMIX Company
          </a>
          {' '}on Pexels
        </p>
      </div>

      {/* Content with Team Image */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <img
            src={images.team}
            alt="Business team collaboration"
            className="w-full h-64 object-cover"
          />
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Our Team</h2>
            <p className="text-gray-600">
              We're a dedicated team working to deliver the best experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Implementation Checklist

### Phase 1: Setup ✓
- [ ] Obtain Pexels API key from https://www.pexels.com/api/
- [ ] Add `PEXELS_API_KEY` to `.env.local`
- [ ] Test API key with curl request

### Phase 2: Tool Creation
- [ ] Create directory `src/lib/ai/tools/image/` if not exists
- [ ] Create `src/lib/ai/tools/image/pexels-search.ts`
- [ ] Implement pexelsSearchTool with proper TypeScript types
- [ ] Add error handling with safe() wrapper
- [ ] Add detailed logging
- [ ] Test tool execution independently

### Phase 3: Integration
- [ ] Import pexelsSearchTool in `src/app/api/chat/components/route.ts`
- [ ] Add tool to streamText configuration
- [ ] Update COMPONENTS_SYSTEM prompt in `src/lib/ai/mode-prompts.ts`
- [ ] Add stock images guidance to system prompt

### Phase 4: Testing
- [ ] Test with simple query ("nature")
- [ ] Test with specific query ("business people in office")
- [ ] Test orientation filters (landscape, portrait, square)
- [ ] Test error handling (invalid API key simulation)
- [ ] Test rate limit handling
- [ ] Verify images load in Sandpack preview
- [ ] Test photographer attribution rendering
- [ ] Test multiple image sizes in components

### Phase 5: Documentation & Commit
- [ ] Save this implementation plan
- [ ] Save Components system prompt updates
- [ ] Commit tool implementation
- [ ] Commit Components API changes
- [ ] Commit system prompt updates
- [ ] Push to GitHub

---

## 8. Important Notes

### Pexels Attribution Requirements
- Attribution is appreciated but NOT required
- When used, credit photographer with name and link
- Link to photographer's Pexels profile
- Example: "Photo by [Photographer](URL) on Pexels"

### Rate Limiting Strategy
- 200 requests/hour = ~3.3 requests/minute
- 20,000 requests/month = ~650 requests/day
- Log all API calls with timestamps
- Monitor usage in logs
- Consider implementing client-side caching if needed

### Image Licensing (Pexels License)
- ✅ Free for commercial and non-commercial use
- ✅ No attribution required
- ✅ Modify and adapt images
- ❌ Cannot sell images as-is without modification
- ❌ Cannot create competing image service
- Full license: https://www.pexels.com/license/

### Best Practices for Components
- Use descriptive, specific search queries
- Request 3-5 images to give model choices
- Use 'medium' size (600px) for most components
- Use 'large' size (1200px) for hero sections
- Always provide meaningful alt text
- Include photographer attribution in subtle way
- Use object-cover for consistent layouts
- Add loading states/fallbacks

---

## 9. Testing Scenarios

### Test Cases

**Test 1: Basic Search**
- Query: "nature"
- Expected: 5 nature images with all metadata
- Verify: Images render in Sandpack

**Test 2: Orientation Filter**
- Query: "mountain", orientation: "landscape"
- Expected: 5 landscape mountain images
- Verify: Aspect ratios match

**Test 3: Specific Use Case**
- Query: "business dashboard analytics"
- Expected: Relevant business/tech images
- Verify: Appropriate for dashboard component

**Test 4: Error Handling**
- Scenario: Invalid API key
- Expected: Graceful error with solution suggestion
- Verify: Component still generates (without images)

**Test 5: Attribution**
- Generate component with images
- Verify: Photographer credit displays
- Verify: Link to photographer profile works

---

## 10. Security & Performance

### API Key Security
- ✅ Store in environment variables only
- ✅ Never expose in client-side code
- ✅ Never commit to version control
- ✅ Use .env.local (gitignored)
- ⚠️ Rotate key if compromised

### Request Validation
- Sanitize search queries (no injection attacks)
- Limit per_page to max 10 (vs API max of 80)
- Validate orientation enum values
- Log suspicious patterns

### Performance Optimization
- Use appropriate image sizes
- Medium (600px) for standard components
- Large (1200px) only for hero sections
- Avoid original (full resolution) unless necessary
- Leverage Pexels CDN (auto-compress in URLs)

---

## 11. Future Enhancements

### Potential Improvements
1. **Caching Layer**
   - Cache popular searches (in-memory or Redis)
   - Reduce API calls
   - Faster response times

2. **Additional Parameters**
   - Color filter for brand matching
   - Size filter for quality control
   - Locale for internationalization

3. **Video Support**
   - Pexels offers video API
   - Could enhance components with background videos

4. **Collections**
   - Support curated Pexels collections
   - Theme-based image sets

5. **Usage Analytics**
   - Track popular search terms
   - Monitor API usage vs limits
   - Measure tool success rate

### Monitoring Metrics
- Total API calls per day/hour
- Average response time
- Error rate
- Most common search queries
- Images actually used in components

---

## 12. Troubleshooting

### Common Issues

**Issue: "PEXELS_API_KEY is not configured"**
- Solution: Add API key to `.env.local`
- Restart dev server after adding

**Issue: 401 Unauthorized**
- Solution: Verify API key is correct
- Check authorization header format

**Issue: 429 Rate Limit**
- Solution: Wait for rate limit reset (hourly)
- Reduce requests per component generation
- Implement caching

**Issue: Images not loading in Sandpack**
- Solution: Check CORS (Pexels allows cross-origin)
- Verify image URLs are valid
- Check network tab for errors

**Issue: Poor search results**
- Solution: Use more specific queries
- Add orientation filter
- Try different keywords

---

## Conclusion

This implementation provides Components mode with an isolated, powerful tool to search for and integrate professional stock images from Pexels. The tool follows existing patterns, includes comprehensive error handling, and enhances the visual quality of generated React components while respecting rate limits and attribution guidelines.

**Key Benefits:**
- ✅ Isolated to Components mode only
- ✅ Free, high-quality stock images
- ✅ No attribution required (but included)
- ✅ Multiple image sizes for optimization
- ✅ Proper error handling and logging
- ✅ TypeScript type safety
- ✅ Follows existing tool patterns
