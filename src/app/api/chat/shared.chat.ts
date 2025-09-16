import "server-only";
import {
  LoadAPIKeyError,
  UIMessage,
  Tool,
  jsonSchema,
  tool as createTool,
  isToolUIPart,
  UIMessagePart,
  ToolUIPart,
  getToolName,
  UIMessageStreamWriter,
} from "ai";
import {
  ChatMention,
  ChatMetadata,
  ManualToolConfirmTag,
} from "app-types/chat";
import { errorToString, exclude, objectFlow } from "lib/utils";
import logger from "logger";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";

import { ObjectJsonSchema7 } from "app-types/util";
import { safe } from "ts-safe";
import { workflowRepository } from "lib/db/repository";

import {
  VercelAIWorkflowTool,
  VercelAIWorkflowToolStreaming,
  VercelAIWorkflowToolStreamingResultTag,
  VercelAIWorkflowToolTag,
} from "app-types/workflow";
import { createWorkflowExecutor } from "lib/ai/workflow/executor/workflow-executor";
import { NodeKind } from "lib/ai/workflow/workflow.interface";
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit } from "lib/ai/tools";
import {
  checkUserLimits,
  formatLimitError,
} from "@/lib/subscription-limits";

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      inputSchema: value.inputSchema,
      description: value.description,
    });
  });
}

/**
 * Wrap tools with Pro user limit checking
 */
export function wrapToolsWithLimits(
  tools: Record<string, Tool>,
  userId: string,
): Record<string, Tool> {
  return objectFlow(tools).map((tool, toolName) => {
    const originalExecute = tool.execute;

    return createTool({
      inputSchema: tool.inputSchema,
      description: tool.description,
      execute: async (input: any, options: any) => {
        // Check limits based on tool type - using exact tool names from DefaultToolName enum
        let toolType: "image" | "video" | "search" | null = null;

        if (
          toolName === "generateImage" ||
          toolName.toLowerCase().includes("image")
        ) {
          toolType = "image";
        } else if (
          toolName === "generateVideo" ||
          toolName.toLowerCase().includes("video")
        ) {
          toolType = "video";
        } else if (
          toolName === "webSearch" ||
          toolName === "webContent" ||
          toolName.toLowerCase().includes("search") ||
          toolName.toLowerCase().includes("web")
        ) {
          toolType = "search";
        }

        // If it's a tool with limits, check them
        if (toolType && userId) {
          const pendingUsage: any = {};

          if (toolType === "image") {
            pendingUsage.imageGenerations = 1;
          } else if (toolType === "video") {
            pendingUsage.videoGenerations = 1;
          } else if (toolType === "search") {
            pendingUsage.webSearches = 1;
          }

          const limitCheck = await checkUserLimits(userId, pendingUsage);

          if (!limitCheck.canProceed) {
            const errorMessage = formatLimitError(limitCheck);

            // Return properly formatted error that won't be counted in usage tracking
            if (toolType === "video") {
              return {
                success: false,
                prompt: input?.prompt || "Video generation request",
                error: "Usage limit exceeded",
                solution: errorMessage,
                type: "limit_exceeded",
              };
            } else if (toolType === "image") {
              return {
                success: false,
                prompt: input?.prompt || "Image generation request",
                error: "Usage limit exceeded",
                solution: errorMessage,
                type: "limit_exceeded",
              };
            } else if (toolType === "search") {
              return {
                isError: true,
                error: "Usage limit exceeded",
                solution: errorMessage,
                type: "limit_exceeded",
              };
            }

            // Fallback for other tools
            return {
              error: "Usage limit exceeded",
              message: errorMessage,
              type: "limit_exceeded",
            };
          }
        }

        // Execute the original tool with proper parameters
        try {
          // Check if originalExecute exists and handle parameter requirements
          if (!originalExecute) {
            return { error: "Tool execute function not found" };
          }

          // Always pass both input and options parameters
          return await originalExecute(input, options);
        } catch (error) {
          return { error: "Tool execution failed", details: error };
        }
      },
    });
  });
}

export function mergeSystemPrompt(
  ...prompts: (string | undefined | false)[]
): string {
  const filteredPrompts = prompts
    .map((prompt) => (prompt ? prompt.trim() : ""))
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function manualToolExecuteByLastMessage(
  part: ToolUIPart,
  tools: Record<string, VercelAIWorkflowTool | Tool>,
  abortSignal?: AbortSignal,
) {
  const { input } = part;

  const toolName = getToolName(part);

  const tool = tools[toolName];
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
    if (!ManualToolConfirmTag.isMaybe(part.output))
      throw new Error("manual tool confirm not found");
    return part.output;
  })
    .map(({ confirm }) => {
      if (!confirm) return MANUAL_REJECT_RESPONSE_PROMPT;
      if (VercelAIWorkflowToolTag.isMaybe(tool)) {
        return tool.execute!(input, {
          toolCallId: part.toolCallId,
          abortSignal: abortSignal ?? new AbortController().signal,
          messages: [],
        });
      }
      return tool.execute!(input, {
        toolCallId: part.toolCallId,
        abortSignal: abortSignal ?? new AbortController().signal,
        messages: [],
      });
    })
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }
  logger.error(error);
  logger.error(`Route Error: ${error.name}`);
  return errorToString(error.message);
}

export function extractInProgressToolPart(message: UIMessage): ToolUIPart[] {
  if (message.role != "assistant") return [];
  if ((message.metadata as ChatMetadata)?.toolChoice != "manual") return [];
  return message.parts.filter(
    (part) =>
      isToolUIPart(part) &&
      part.state == "output-available" &&
      ManualToolConfirmTag.isMaybe(part.output),
  ) as ToolUIPart[];
}

export const workflowToVercelAITool = ({
  id,
  description,
  schema,
  dataStream,
  name,
}: {
  id: string;
  name: string;
  description?: string;
  schema: ObjectJsonSchema7;
  dataStream: UIMessageStreamWriter;
}): VercelAIWorkflowTool => {
  const toolName = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();

  const tool = createTool({
    description: `${name} ${description?.trim().slice(0, 50)}`,
    inputSchema: jsonSchema(schema),
    execute(query, { toolCallId, abortSignal }) {
      const history: VercelAIWorkflowToolStreaming[] = [];
      const toolResult = VercelAIWorkflowToolStreamingResultTag.create({
        toolCallId,
        workflowName: name,

        startedAt: Date.now(),
        endedAt: Date.now(),
        history,
        result: undefined,
        status: "running",
      });
      return safe(id)
        .map((id) =>
          workflowRepository.selectStructureById(id, {
            ignoreNote: true,
          }),
        )
        .map((workflow) => {
          if (!workflow) throw new Error("Not Found Workflow");
          const executor = createWorkflowExecutor({
            nodes: workflow.nodes,
            edges: workflow.edges,
          });
          toolResult.workflowIcon = workflow.icon;

          abortSignal?.addEventListener("abort", () => executor.exit());
          executor.subscribe((e) => {
            if (
              e.eventType == "WORKFLOW_START" ||
              e.eventType == "WORKFLOW_END"
            )
              return;
            if (e.node.name == "SKIP") return;
            if (e.eventType == "NODE_START") {
              const node = workflow.nodes.find(
                (node) => node.id == e.node.name,
              )!;
              if (!node) return;
              history.push({
                id: e.nodeExecutionId,
                name: node.name,
                status: "running",
                startedAt: e.startedAt,
                kind: node.kind as NodeKind,
              });
            } else if (e.eventType == "NODE_END") {
              const result = history.find((r) => r.id == e.nodeExecutionId);
              if (result) {
                if (e.isOk) {
                  result.status = "success";
                  result.result = {
                    input: e.node.output.getInput(e.node.name),
                    output: e.node.output.getOutput({
                      nodeId: e.node.name,
                      path: [],
                    }),
                  };
                } else {
                  result.status = "fail";
                  result.error = {
                    name: e.error?.name || "ERROR",
                    message: errorToString(e.error),
                  };
                }
                result.endedAt = e.endedAt;
              }
            }

            dataStream.write({
              type: "tool-output-available",
              toolCallId,
              output: toolResult,
            });
          });
          return executor.run(
            {
              query: query ?? ({} as any),
            },
            {
              disableHistory: true,
            },
          );
        })
        .map((result) => {
          toolResult.endedAt = Date.now();
          toolResult.status = result.isOk ? "success" : "fail";
          toolResult.error = result.error
            ? {
                name: result.error.name || "ERROR",
                message: errorToString(result.error) || "Unknown Error",
              }
            : undefined;
          const outputNodeResults = history
            .filter((h) => h.kind == NodeKind.Output)
            .map((v) => v.result?.output)
            .filter(Boolean);
          toolResult.history = history.map((h) => ({
            ...h,
            result: undefined, // save tokens.
          }));
          toolResult.result =
            outputNodeResults.length == 1
              ? outputNodeResults[0]
              : outputNodeResults;
          return toolResult;
        })
        .ifFail((err) => {
          return {
            error: {
              name: err?.name || "ERROR",
              message: errorToString(err),
              history,
            },
          };
        })
        .unwrap();
    },
  }) as VercelAIWorkflowTool;

  tool._workflowId = id;
  tool._originToolName = name;
  tool._toolName = toolName;

  return VercelAIWorkflowToolTag.create(tool);
};

export const workflowToVercelAITools = (
  workflows: {
    id: string;
    name: string;
    description?: string;
    schema: ObjectJsonSchema7;
  }[],
  dataStream: UIMessageStreamWriter,
) => {
  return workflows
    .map((v) =>
      workflowToVercelAITool({
        ...v,
        dataStream,
      }),
    )
    .reduce(
      (prev, cur) => {
        prev[cur._toolName] = cur;
        return prev;
      },
      {} as Record<string, VercelAIWorkflowTool>,
    );
};

export const loadWorkFlowTools = (opt: {
  mentions?: ChatMention[];
  dataStream: UIMessageStreamWriter;
}) =>
  safe(() =>
    opt?.mentions?.length
      ? workflowRepository.selectToolByIds(
          opt?.mentions
            ?.filter((m) => m.type == "workflow")
            .map((v) => v.workflowId),
        )
      : [],
  )
    .map((tools) => workflowToVercelAITools(tools, opt.dataStream))
    .orElse({} as Record<string, VercelAIWorkflowTool>);

export const loadAppDefaultTools = (opt?: {
  mentions?: ChatMention[];
  allowedAppDefaultToolkit?: string[];
  userId?: string;
}) =>
  safe(APP_DEFAULT_TOOL_KIT)
    .map((tools) => {
      if (opt?.mentions?.length) {
        const defaultToolMentions = opt.mentions.filter(
          (m) => m.type == "defaultTool",
        );
        return Array.from(Object.values(tools)).reduce((acc, t) => {
          const allowed = objectFlow(t).filter((_, k) => {
            return defaultToolMentions.some((m) => m.name == k);
          });
          return { ...acc, ...allowed };
        }, {});
      }
      const allowedAppDefaultToolkit =
        opt?.allowedAppDefaultToolkit ?? Object.values(AppDefaultToolkit);

      // Always include ImageGeneration, VideoGeneration, and WebSearch toolkits regardless of user settings
      const toolkitsToInclude = [
        ...allowedAppDefaultToolkit,
        ...(allowedAppDefaultToolkit.includes(AppDefaultToolkit.ImageGeneration)
          ? []
          : [AppDefaultToolkit.ImageGeneration]),
        ...(allowedAppDefaultToolkit.includes(AppDefaultToolkit.VideoGeneration)
          ? []
          : [AppDefaultToolkit.VideoGeneration]),
        ...(allowedAppDefaultToolkit.includes(AppDefaultToolkit.WebSearch)
          ? []
          : [AppDefaultToolkit.WebSearch]),
      ];

      const loadedTools =
        toolkitsToInclude.reduce(
          (acc, key) => {
            return { ...acc, ...tools[key] };
          },
          {} as Record<string, Tool>,
        ) || {};

      // Apply limit checking wrapper if userId is provided
      return opt?.userId
        ? wrapToolsWithLimits(loadedTools, opt.userId)
        : loadedTools;
    })
    .ifFail((e) => {
      console.error(e);
      throw e;
    })
    .orElse({} as Record<string, Tool>);

export const convertToSavePart = <T extends UIMessagePart<any, any>>(
  part: T,
) => {
  return safe(
    exclude(part as any, ["providerMetadata", "callProviderMetadata"]) as T,
  )
    .map((v) => {
      if (isToolUIPart(v) && v.state.startsWith("output")) {
        if (VercelAIWorkflowToolStreamingResultTag.isMaybe(v.output)) {
          return {
            ...v,
            output: {
              ...v.output,
              history: v.output.history.map((h: any) => {
                return {
                  ...h,
                  result: undefined,
                };
              }),
            },
          };
        }
      }
      return v;
    })
    .unwrap();
};
