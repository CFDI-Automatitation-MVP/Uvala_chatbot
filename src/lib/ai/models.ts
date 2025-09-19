import "server-only";

import { openai } from "@ai-sdk/openai";
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

// Internal models - not exposed in UI
const internalModels = {
  "uvala-fuji-micro": openai("gpt-5-nano"),
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
