"use client";

import * as React from "react";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { toast } from "sonner";

// Image generation component props interface
export interface ImageGenerationProps {
  success: boolean;
  imageUrl?: string;
  prompt: string;
  aspectRatio?: string;
  outputFormat?: string;
  safetyFilterLevel?: string;
  model?: string;
  predictionId?: string;
  message?: string;
  error?: string;
  solution?: string;
}

export function ImageGeneration(props: ImageGenerationProps) {
  const {
    success,
    imageUrl,
    prompt,
    aspectRatio,
    outputFormat,
    safetyFilterLevel,
    predictionId,
    error,
    solution,
  } = props;
  const [showPrompt, setShowPrompt] = React.useState(false);

  // Filter out imageUrl from JSON data to avoid displaying large URLs
  const filteredProps = React.useMemo(() => {
    const { imageUrl: _, ...filtered } = props;
    return filtered;
  }, [props]);

  const handleDownload = React.useCallback(async () => {
    if (!imageUrl) return;

    try {
      // For remote URLs, we need to fetch and create a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-image-${Date.now()}.${outputFormat || "jpg"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image");
    }
  }, [imageUrl, outputFormat]);

  if (!success || !imageUrl) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive relative">
        <div className="absolute right-2 top-2 z-10">
          <JsonViewPopup data={filteredProps} />
        </div>
        <CardHeader className="items-center pb-0 flex flex-col gap-2">
          <CardTitle className="flex items-center text-destructive">
            Image Generation Failed
          </CardTitle>
          <CardDescription className="text-center">
            Prompt: &ldquo;{prompt}&rdquo;
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-6">
          <div className="text-sm text-destructive mb-4">
            <strong>Error:</strong> {error}
          </div>
          {solution && (
            <div className="text-sm text-muted-foreground">
              <strong>Solution:</strong> {solution}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col bg-card relative">
      <div className="absolute right-2 top-2 z-10">
        <JsonViewPopup data={filteredProps} />
      </div>
      <CardHeader className="items-center pb-0 flex flex-col gap-2">
        <CardTitle className="flex items-center">Generated Image</CardTitle>
        <div className="w-full max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-2 h-auto"
          >
            See more
            {showPrompt ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>
          {showPrompt && (
            <CardDescription className="text-center text-sm mt-2 px-4">
              &ldquo;{prompt}&rdquo;
            </CardDescription>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>
            Aspect Ratio: {aspectRatio} • Format: {outputFormat?.toUpperCase()}
          </div>
          {safetyFilterLevel && (
            <div>Safety Filter: {safetyFilterLevel.replace("_", " ")}</div>
          )}
          {predictionId && <div>Prediction ID: {predictionId}</div>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        <div className="relative max-w-full mx-auto">
          <Image
            src={imageUrl}
            alt={prompt}
            width={600}
            height={600}
            className="w-full h-auto rounded-lg border shadow-sm object-contain max-h-[600px]"
            unoptimized
          />
          <div className="flex gap-2 mt-4 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
