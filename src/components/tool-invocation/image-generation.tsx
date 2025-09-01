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
import { Download, Copy } from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { toast } from "sonner";

// Image generation component props interface
export interface ImageGenerationProps {
  success: boolean;
  imageUrl?: string;
  prompt: string;
  aspectRatio?: string;
  steps?: number;
  model?: string;
  message?: string;
  error?: string;
  solution?: string;
}

export function ImageGeneration(props: ImageGenerationProps) {
  const { success, imageUrl, prompt, aspectRatio, steps, model, message, error, solution } = props;

  const handleDownload = React.useCallback(() => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded successfully');
  }, [imageUrl]);

  const handleCopyUrl = React.useCallback(async () => {
    if (!imageUrl) return;
    
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast.success('Image URL copied to clipboard');
    } catch (_err) {
      toast.error('Failed to copy URL');
    }
  }, [imageUrl]);

  if (!success || !imageUrl) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive">
        <CardHeader className="items-center pb-0 flex flex-col gap-2 relative">
          <CardTitle className="flex items-center text-destructive">
            Image Generation Failed
            <div className="absolute right-4 top-4">
              <JsonViewPopup data={props} />
            </div>
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
    <Card className="flex flex-col bg-card">
      <CardHeader className="items-center pb-0 flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Generated Image
          <div className="absolute right-4 top-4">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        <CardDescription className="text-center">
          &ldquo;{prompt}&rdquo;
        </CardDescription>
        {model && (
          <div className="text-xs text-muted-foreground">
            Model: {model} • Aspect Ratio: {aspectRatio} • Steps: {steps}
          </div>
        )}
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy URL
            </Button>
          </div>
        </div>
        {message && (
          <div className="text-sm text-muted-foreground mt-4 text-center">
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}