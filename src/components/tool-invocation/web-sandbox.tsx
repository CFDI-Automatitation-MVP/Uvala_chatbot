"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Copy, 
  Check, 
  ChevronLeft,
  ChevronRight,
  Maximize,
  FileText,
  Presentation as PresentationIcon
} from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { useCopy } from "@/hooks/use-copy";
import { toast } from "sonner";

export interface PresentationProps {
  slides?: string[];
  title?: string;
  success?: boolean;
  error?: string;
  markdown?: string;
}

export function Presentation(props: PresentationProps) {
  const { slides = [], title = "Presentation", success = true, error, markdown = "" } = props;
  const { copy, copied } = useCopy();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const presentationRef = React.useRef<HTMLDivElement>(null);
  
  // Memoize parsed slides to prevent infinite re-renders
  const parsedSlides = React.useMemo(() => {
    if (markdown && markdown.trim()) {
      // Split markdown by slide separators (---)
      const slideContent = markdown.split(/^---\s*$/m).map(slide => slide.trim()).filter(slide => slide.length > 0);
      return slideContent.length > 0 ? slideContent : [markdown];
    } else if (slides && slides.length > 0) {
      return slides;
    } else {
      return ['# Welcome to Your Presentation\n\nClick the navigation buttons to view slides.'];
    }
  }, [slides, markdown]);
  
  // Reset current slide when slides change
  React.useEffect(() => {
    setCurrentSlide(0);
  }, [parsedSlides.length]);

  // Fullscreen functionality
  const toggleFullscreen = React.useCallback(() => {
    if (!presentationRef.current) return;
    
    if (!document.fullscreenElement) {
      presentationRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);
  
  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Navigation functions
  const nextSlide = React.useCallback(() => {
    setCurrentSlide(prev => {
      const maxSlide = parsedSlides.length - 1;
      return prev < maxSlide ? prev + 1 : prev;
    });
  }, [parsedSlides.length]);
  
  const prevSlide = React.useCallback(() => {
    setCurrentSlide(prev => prev > 0 ? prev - 1 : prev);
  }, []);
  
  const goToSlide = React.useCallback((index: number) => {
    if (index >= 0 && index < parsedSlides.length) {
      setCurrentSlide(index);
    }
  }, [parsedSlides.length]);

  const handleCopySlides = React.useCallback(async () => {
    const allSlides = parsedSlides.join('\n\n---\n\n');
    try {
      await copy(allSlides);
      toast.success('Presentation content copied to clipboard');
    } catch (_err) {
      toast.error('Failed to copy presentation');
    }
  }, [parsedSlides, copy]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case ' ': // Spacebar
          event.preventDefault();
          setCurrentSlide(prev => {
            const maxSlide = parsedSlides.length - 1;
            return prev < maxSlide ? prev + 1 : prev;
          });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentSlide(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen?.();
          }
          break;
        case 'f':
        case 'F11':
          event.preventDefault();
          if (!document.fullscreenElement && presentationRef.current) {
            presentationRef.current.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsedSlides.length]);
  
  // Exit presentation and return to chat
  const exitPresentation = () => {
    window.dispatchEvent(new CustomEvent('exitPresentation'));
  };
  
  // Convert markdown to HTML (basic implementation)
  const markdownToHtml = (markdown: string) => {
    return markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/^<p><\/p>$/gm, '')
      .replace(/(<p><\/p>\s*)+/g, '');
  };

  if (!success) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive relative">
        <div className="absolute right-2 top-2 z-10">
          <JsonViewPopup data={props} />
        </div>
        <CardHeader className="items-center pb-0 flex flex-col gap-2">
          <CardTitle className="flex items-center text-destructive">
            Presentation Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-6">
          <div className="text-sm text-destructive">
            <strong>Error:</strong> {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (parsedSlides.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <FileText className="w-5 h-5" />
              No Presentation Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">No slides were found in the presentation.</p>
            <Button onClick={exitPresentation} className="w-full">
              Return to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline Presentation UI for chat
  return (
    <Card className="w-full max-w-4xl mx-auto" ref={presentationRef}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PresentationIcon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Slide counter */}
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} of {parsedSlides.length}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySlides}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Slide content */}
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-muted/20 rounded-lg">
          <div 
            className="prose prose-lg max-w-none text-center"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(parsedSlides[currentSlide] || 'No content')
            }}
          />
        </div>
        
        {/* Navigation controls */}
        <div className="p-4 border-t bg-card/50">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            {/* Slide indicators */}
            {parsedSlides.length > 1 && (
              <div className="flex gap-1">
                {parsedSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide 
                        ? 'bg-primary' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              disabled={currentSlide === parsedSlides.length - 1}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      
      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="flex-1 flex items-center justify-center p-8">
            <div 
              className="prose prose-invert prose-2xl max-w-none text-center"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(parsedSlides[currentSlide] || 'No content')
              }}
            />
          </div>
          
          {/* Fullscreen controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/80 px-6 py-3 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <span className="text-white text-sm font-medium">
              {currentSlide + 1} / {parsedSlides.length}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={nextSlide}
              disabled={currentSlide === parsedSlides.length - 1}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// Export with original name for backward compatibility
export { Presentation as WebSandbox };