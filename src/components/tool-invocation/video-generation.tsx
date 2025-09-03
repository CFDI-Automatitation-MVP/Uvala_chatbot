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
import { Download, Copy, Video, Play, Pause } from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { toast } from "sonner";

// Video generation component props interface
export interface VideoGenerationProps {
  success: boolean;
  videoUrl?: string;
  inputImage?: string;
  prompt: string;
  negativePrompt?: string;
  resolution?: string;
  aspectRatio?: string;
  numFrames?: number;
  frameRate?: number;
  duration?: string;
  sampleShift?: number;
  seed?: number;
  model?: string;
  predictionId?: string;
  message?: string;
  error?: string;
  solution?: string;
}

export function VideoGeneration(props: VideoGenerationProps) {
  const { success, videoUrl, inputImage, prompt, negativePrompt, resolution, aspectRatio, numFrames, frameRate, duration, sampleShift, seed, model, predictionId, message, error, solution } = props;
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleDownload = React.useCallback(() => {
    if (!videoUrl) return;
    
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `generated-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Video downloaded successfully');
  }, [videoUrl]);

  const handleCopyUrl = React.useCallback(async () => {
    if (!videoUrl) return;
    
    try {
      await navigator.clipboard.writeText(videoUrl);
      toast.success('Video URL copied to clipboard');
    } catch (_err) {
      toast.error('Failed to copy URL');
    }
  }, [videoUrl]);

  const togglePlayback = React.useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleVideoPlay = React.useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleVideoPause = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVideoEnded = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVideoError = React.useCallback(() => {
    setIsPlaying(false);
    toast.error('Failed to play video file');
  }, []);

  if (!success || !videoUrl) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive">
        <CardHeader className="items-center pb-0 flex flex-col gap-2 relative">
          <CardTitle className="flex items-center text-destructive">
            <Video className="w-5 h-5 mr-2" />
            Video Generation Failed
            <div className="absolute right-4 top-4">
              <JsonViewPopup data={props} />
            </div>
          </CardTitle>
          <CardDescription className="text-center">
            Prompt: &ldquo;{prompt.substring(0, 100)}{prompt.length > 100 ? '...' : ''}&rdquo;
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
          <Video className="w-5 h-5 mr-2" />
          Generated Video
          <div className="absolute right-4 top-4">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        <CardDescription className="text-center">
          &ldquo;{prompt.substring(0, 150)}{prompt.length > 150 ? '...' : ''}&rdquo;
        </CardDescription>
        {model && (
          <div className="text-xs text-muted-foreground text-center">
            Model: {model} • {resolution} {aspectRatio} • {numFrames} frames @ {frameRate}fps • Duration: {duration} {seed && `• Seed: ${seed}`}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Video Player */}
          <div className="w-full max-w-2xl">
            <video 
              ref={videoRef}
              src={videoUrl}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              className="w-full h-auto rounded-lg border shadow-sm"
              controls
              playsInline
              preload="metadata"
            />
          </div>
          
          {/* Play/Pause Button */}
          <Button
            variant="default"
            size="lg"
            onClick={togglePlayback}
            className="flex items-center gap-2 min-w-[120px]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Play
              </>
            )}
          </Button>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
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
          
          {/* Input Image Display (if provided) */}
          {inputImage && (
            <div className="w-full max-w-md">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-muted-foreground mb-2">Input Image</div>
                <Image
                  src={inputImage}
                  alt="Input image used for video generation"
                  width={300}
                  height={200}
                  className="w-full h-auto rounded-md border object-contain max-h-48"
                  unoptimized
                />
              </div>
            </div>
          )}
          
          {/* Prompt Display */}
          <div className="w-full max-w-md">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-muted-foreground mb-2">Video Description</div>
              <div className="text-sm leading-relaxed">
                {prompt}
              </div>
              {negativePrompt && (
                <>
                  <div className="text-sm font-medium text-muted-foreground mb-1 mt-3">Avoided</div>
                  <div className="text-xs text-muted-foreground italic">
                    {negativePrompt}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Technical Details */}
          <div className="w-full max-w-md">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-medium text-muted-foreground mb-2 text-center">Technical Details</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="font-medium">Resolution:</span> {resolution}</div>
                <div><span className="font-medium">Aspect Ratio:</span> {aspectRatio}</div>
                <div><span className="font-medium">Frames:</span> {numFrames}</div>
                <div><span className="font-medium">Frame Rate:</span> {frameRate}fps</div>
                <div><span className="font-medium">Duration:</span> {duration}</div>
                <div><span className="font-medium">Sample Shift:</span> {sampleShift}</div>
              </div>
            </div>
          </div>
        </div>
        
        {message && (
          <div className="text-sm text-muted-foreground mt-4 text-center">
            {message}
          </div>
        )}
        
        {predictionId && (
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Prediction ID: {predictionId}
          </div>
        )}
      </CardContent>
    </Card>
  );
}