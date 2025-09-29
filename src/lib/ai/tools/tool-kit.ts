import { createPieChartTool } from "./visualization/create-pie-chart";
import { createBarChartTool } from "./visualization/create-bar-chart";
import { createLineChartTool } from "./visualization/create-line-chart";
import { createTableTool } from "./visualization/create-table";
import { exaSearchTool, exaContentsTool } from "./web/web-search";
import { AppDefaultToolkit, DefaultToolName } from ".";
import { Tool } from "ai";
import { generateImageTool } from "./image/generate-image";
import { generateVideoTool } from "./video/generate-video";

export const APP_DEFAULT_TOOL_KIT: Record<
  AppDefaultToolkit,
  Record<string, Tool>
> = {
  [AppDefaultToolkit.Visualization]: {
    [DefaultToolName.CreatePieChart]: createPieChartTool,
    [DefaultToolName.CreateBarChart]: createBarChartTool,
    [DefaultToolName.CreateLineChart]: createLineChartTool,
    [DefaultToolName.CreateTable]: createTableTool,
  },
  [AppDefaultToolkit.WebSearch]: {
    [DefaultToolName.WebSearch]: exaSearchTool,
    [DefaultToolName.WebContent]: exaContentsTool,
  },
  [AppDefaultToolkit.ImageGeneration]: {
    [DefaultToolName.GenerateImage]: generateImageTool,
  },
  [AppDefaultToolkit.VideoGeneration]: {
    [DefaultToolName.GenerateVideo]: generateVideoTool,
  },
  [AppDefaultToolkit.FileSearch]: {
    // FileSearch tools temporarily removed to fix schema validation errors
    // Will be replaced dynamically in shared.chat.ts when userId is available
  },
};
