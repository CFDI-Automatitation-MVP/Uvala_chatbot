import "server-only";

import { openai } from "@ai-sdk/openai";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

const staticModels = {
  "Fast & Direct": {
    "uvala-fuji": openai("gpt-5-mini-2025-08-07"),
  },
  "Reasoning Model": {
    "uvala-everest": openai("gpt-5-mini-2025-08-07"),
  },
};

// Amazon Bedrock provider for specialized models
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION ?? "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
});

// Internal models - not exposed in UI
const internalModels = {
  "uvala-prompter": openai("gpt-5-nano"),
  "uvala-coder": bedrock("qwen.qwen3-coder-30b-a3b-v1:0"), // Qwen3 Coder 30B - specialized coding model
  "uvala-sensei": bedrock("openai.gpt-oss-120b-1:0"), // OpenAI GPT-OSS 120B for Learn Mode - reasoning_effort set via additionalModelRequestFields in route
  "uvala-components": bedrock("qwen.qwen3-coder-30b-a3b-v1:0"), // Qwen3 Coder 30B - specialized coding model for Components Mode
};

const staticUnsupportedModels = new Set([
  // Uvala-Fuji supports tool calling
]);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };
const allModelsWithInternal = { ...allModels };

// Add internal models to a flat structure for getModel lookup
Object.entries(internalModels).forEach(([name, model]) => {
  if (!allModelsWithInternal["Internal"]) {
    allModelsWithInternal["Internal"] = {};
  }
  allModelsWithInternal["Internal"][name] = model;
});

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const fallbackModel = staticModels["Fast & Direct"]["uvala-fuji"];

export const customModelProvider = {
  // Only expose public models in UI
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
    })),
  })),
  // But allow access to internal models via getModel
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    return (
      allModelsWithInternal[model.provider]?.[model.model] || fallbackModel
    );
  },
};
