import { createPieChartTool } from "./visualization/create-pie-chart";
import { createBarChartTool } from "./visualization/create-bar-chart";
import { createLineChartTool } from "./visualization/create-line-chart";
import { createTableTool } from "./visualization/create-table";
import { exaSearchTool, exaContentsTool } from "./web/web-search";
import { AppDefaultToolkit, DefaultToolName } from ".";
import { Tool } from "ai";
import { httpFetchTool } from "./http/fetch";
import { jsExecutionTool } from "./code/js-run-tool";
import { pythonExecutionTool } from "./code/python-run-tool";
import { generateImageTool } from "./image/generate-image";
import { generateMusicTool } from "./music/generate-music";
import { createWebSandboxTool } from "./web/create-web-sandbox";
import { createPresentationTool } from "./presentation/create-presentation";
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
  [AppDefaultToolkit.Http]: {
    [DefaultToolName.Http]: httpFetchTool,
  },
  [AppDefaultToolkit.Code]: {
    [DefaultToolName.JavascriptExecution]: jsExecutionTool,
    [DefaultToolName.PythonExecution]: pythonExecutionTool,
  },
  [AppDefaultToolkit.WebSandbox]: {
    [DefaultToolName.CreateWebSandbox]: createWebSandboxTool,
  },
  [AppDefaultToolkit.ImageGeneration]: {
    [DefaultToolName.GenerateImage]: generateImageTool,
  },
  [AppDefaultToolkit.MusicGeneration]: {
    [DefaultToolName.GenerateMusic]: generateMusicTool,
  },
  [AppDefaultToolkit.Presentation]: {
    [DefaultToolName.CreatePresentation]: createPresentationTool,
  },
  [AppDefaultToolkit.VideoGeneration]: {
    [DefaultToolName.GenerateVideo]: generateVideoTool,
  },
};
