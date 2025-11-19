import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { type LanguageModel } from "ai";

/**
 * Centralized model picker function for all presentation generation routes
 * Uses GPT-OSS-120B via Amazon Bedrock for consistent, high-quality generation
 */
export function modelPicker(): LanguageModel {
  const bedrock = createAmazonBedrock({
    region: process.env.AWS_REGION ?? "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  });

  // Use GPT-OSS 120B - same model as main chat API (uvala-sensei)
  return bedrock("openai.gpt-oss-120b-1:0");
}
