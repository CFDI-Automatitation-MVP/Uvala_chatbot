"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, Music, Play, Pause } from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { toast } from "sonner";

// Music generation component props interface
export interface MusicGenerationProps {
  success: boolean;
  audioUrl?: string;
  spectrogramUrl?: string;
  prompt: string;
  negativePrompt?: string;
  modelVersion?: string;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  model?: string;
  predictionId?: string;
  message?: string;
  error?: string;
  solution?: string;
}

export function MusicGeneration(props: MusicGenerationProps) {
  const { success, audioUrl, spectrogramUrl, prompt, negativePrompt, modelVersion, steps, guidanceScale, seed, model, predictionId, message, error, solution } = props;
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const handleDownload = React.useCallback(() => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `generated-music-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Music file downloaded successfully');
  }, [audioUrl]);

  const handleCopyUrl = React.useCallback(async () => {
    if (!audioUrl) return;
    
    try {
      await navigator.clipboard.writeText(audioUrl);
      toast.success('Music URL copied to clipboard');
    } catch (_err) {
      toast.error('Failed to copy URL');
    }
  }, [audioUrl]);

  const togglePlayback = React.useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleAudioEnded = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleAudioError = React.useCallback(() => {
    setIsPlaying(false);
    toast.error('Failed to play audio file');
  }, []);

  if (!success || !audioUrl) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive">
        <CardHeader className="items-center pb-0 flex flex-col gap-2 relative">
          <CardTitle className="flex items-center text-destructive">
            <Music className="w-5 h-5 mr-2" />
            Music Generation Failed
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
          <Music className="w-5 h-5 mr-2" />
          Generated Music
          <div className="absolute right-4 top-4">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        <CardDescription className="text-center">
          &ldquo;{prompt.substring(0, 150)}{prompt.length > 150 ? '...' : ''}&rdquo;
        </CardDescription>
        {model && (
          <div className="text-xs text-muted-foreground text-center">
            Model: {model} ({modelVersion}) • Steps: {steps} • Guidance: {guidanceScale} {seed && `• Seed: ${seed}`}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Audio Player */}
          <div className="w-full max-w-md">
            <audio 
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              className="w-full"
              controls
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
          
          {/* Spectrogram Display */}
          {spectrogramUrl && (
            <div className="w-full max-w-md">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-muted-foreground mb-2">Visual Spectrogram</div>
                <img 
                  src={spectrogramUrl} 
                  alt="Music spectrogram visualization" 
                  className="w-full h-auto rounded-md border"
                />
              </div>
            </div>
          )}
          
          {/* Prompt Display */}
          <div className="w-full max-w-md">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-muted-foreground mb-2">Music Description</div>
              <div className="text-sm leading-relaxed">
                {prompt}
              </div>
              {negativePrompt && negativePrompt !== "low quality, gentle" && (
                <>
                  <div className="text-sm font-medium text-muted-foreground mb-1 mt-3">Avoided</div>
                  <div className="text-xs text-muted-foreground italic">
                    {negativePrompt}
                  </div>
                </>
              )}
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