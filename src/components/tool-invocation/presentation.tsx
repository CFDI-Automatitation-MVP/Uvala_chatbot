"use client";

import * as React from "react";
import DOMPurify from "dompurify";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize,
  Copy,
  Check,
} from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { useCopy } from "@/hooks/use-copy";

export interface PresentationProps {
  success: boolean;
  slides?: string[];
  markdown: string;
  title: string;
  message?: string;
  error?: string;
  solution?: string;
}

export function Presentation(props: PresentationProps) {
  const { success, slides, markdown, title, error, solution } = props;
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [showDetails, setShowDetails] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const { copied, copy } = useCopy();

  // Parse slides from markdown
  const parsedSlides = React.useMemo(() => {
    console.log("Presentation Debug:", { slides, markdown, success });

    if (slides && slides.length > 0) {
      console.log("Using slides array:", slides);
      return slides;
    }

    const splitSlides = markdown
      .split(/^---\s*$/m)
      .filter((slide) => slide.trim());
    console.log("Split slides:", splitSlides);
    return splitSlides;
  }, [slides, markdown]);

  // Convert markdown to HTML (enhanced for presentations with design elements) with XSS protection
  const markdownToHtml = (markdown: string) => {
    const rawHtml = markdown
      .replace(
        /^# (.+)$/gm,
        '<h1 style="font-size: 3rem; font-weight: 800; text-align: center; margin-bottom: 3rem; color: inherit; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-shadow: 0 4px 6px rgba(0,0,0,0.1);">$1</h1>',
      )
      .replace(
        /^## (.+)$/gm,
        '<h2 style="font-size: 2.25rem; font-weight: 700; margin-bottom: 2rem; color: inherit; padding-left: 1rem; border-left: 4px solid #667eea; background: linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, transparent 100%); padding: 1rem;">$1</h2>',
      )
      .replace(
        /^### (.+)$/gm,
        '<h3 style="font-size: 1.75rem; font-weight: 600; margin-bottom: 1.5rem; color: inherit; position: relative; padding-bottom: 0.5rem;"><span style="position: absolute; bottom: 0; left: 0; width: 50px; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px;"></span>$1</h3>',
      )
      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong style="font-weight: bold; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">$1</strong>',
      )
      .replace(
        /\*(.+?)\*/g,
        '<em style="font-style: italic; color: #667eea;">$1</em>',
      )
      .replace(
        /`(.+?)`/g,
        "<code style=\"background: linear-gradient(135deg, #667eea20, #764ba220); padding: 0.3rem 0.6rem; border-radius: 0.5rem; font-family: 'JetBrains Mono', 'Fira Code', monospace; border: 1px solid #667eea40; font-size: 0.9em;\">$1</code>",
      )
      .replace(
        /^- (.+)$/gm,
        '<li style="margin-bottom: 0.75rem; padding-left: 0.5rem; position: relative; list-style: none;"><span style="position: absolute; left: -1rem; top: 0.5rem; width: 8px; height: 8px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);"></span>$1</li>',
      )
      .replace(
        /^(\d+)\. (.+)$/gm,
        '<li style="margin-bottom: 0.75rem; padding-left: 1rem; position: relative; list-style: none; counter-increment: custom-counter;"><span style="position: absolute; left: -1.5rem; top: 0; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; font-weight: bold;">$1</span>$2</li>',
      )
      .replace(
        /\n\n/g,
        '</p><p style="margin-bottom: 1.5rem; line-height: 1.8; color: inherit; font-size: 1.1rem;">',
      )
      .replace(
        /^(?!<[h|l|c])/gm,
        '<p style="margin-bottom: 1.5rem; line-height: 1.8; color: inherit; font-size: 1.1rem;">',
      );

    // SECURITY: Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "strong",
        "em",
        "code",
        "li",
        "ul",
        "ol",
        "span",
        "div",
      ],
      ALLOWED_ATTR: ["style", "class"],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ["script", "object", "embed", "link", "meta"],
      FORBID_ATTR: [
        "onclick",
        "onload",
        "onerror",
        "onmouseover",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
      ],
    });
  };

  // Filter props for JSON view
  const filteredProps = React.useMemo(() => {
    const { markdown: _, ...filtered } = props;
    return filtered;
  }, [props]);

  const nextSlide = () => {
    if (currentSlide < parsedSlides.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => prev + 1);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => prev - 1);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  };

  const goToSlide = (index: number) => {
    if (index !== currentSlide) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(index);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCopySlides = () => {
    copy(markdown);
  };

  // Safe HTML component to replace dangerouslySetInnerHTML
  const SafeHtmlContent = ({
    content,
    className,
    style,
  }: {
    content: string;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    const safeHtml = markdownToHtml(content);
    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  };

  if (!success) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive relative">
        <div className="absolute right-2 top-2 z-10">
          <JsonViewPopup data={filteredProps} />
        </div>
        <CardHeader className="items-center pb-0 flex flex-col gap-2">
          <CardTitle className="flex items-center text-destructive">
            Presentation Creation Failed
          </CardTitle>
          <CardDescription className="text-center">
            Title: &ldquo;{title}&rdquo;
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

  if (parsedSlides.length === 0) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive relative">
        <div className="absolute right-2 top-2 z-10">
          <JsonViewPopup data={filteredProps} />
        </div>
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-destructive">No Slides Found</CardTitle>
          <CardDescription>
            Unable to parse presentation slides from the provided content.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col items-center justify-center">
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center p-12 w-full">
          <SafeHtmlContent
            content={parsedSlides[currentSlide] || "No content"}
            className={`prose prose-invert prose-2xl max-w-none text-center w-full transition-all duration-500 ${
              isTransitioning
                ? "opacity-0 transform translate-y-8 scale-95"
                : "opacity-100 transform translate-y-0 scale-100"
            }`}
            style={{
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}
          />
        </div>

        {/* Fullscreen controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-black/70 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20 shadow-2xl">
          <Button
            variant="ghost"
            size="lg"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 disabled:opacity-50"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Fullscreen slide indicators */}
          <div className="flex gap-2">
            {parsedSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentSlide
                    ? "bg-white scale-150"
                    : "bg-white/40 hover:bg-white/70 hover:scale-125"
                }`}
              />
            ))}
          </div>

          <span className="text-white font-medium px-3 py-1 bg-white/10 rounded-full text-sm">
            {currentSlide + 1} / {parsedSlides.length}
          </span>

          <Button
            variant="ghost"
            size="lg"
            onClick={nextSlide}
            disabled={currentSlide === parsedSlides.length - 1}
            className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 disabled:opacity-50"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="w-px h-6 bg-white/30 mx-2"></div>

          <Button
            variant="ghost"
            size="lg"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-200"
          >
            Exit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border-2 border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
      <div className="absolute right-2 top-2 z-10">
        <JsonViewPopup data={filteredProps} />
      </div>

      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📊</span>
            </div>
            {title}
          </CardTitle>

          <div className="flex items-center gap-3">
            {/* Enhanced slide counter */}
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm px-3 py-2 rounded-full border border-blue-200 dark:border-blue-800 text-sm font-medium">
              <span className="text-blue-600 dark:text-blue-400">
                {currentSlide + 1}
              </span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-gray-600 dark:text-gray-400">
                {parsedSlides.length}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs h-auto p-2 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all duration-200"
            >
              Details
              {showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySlides}
              className="bg-white/80 dark:bg-black/80 backdrop-blur-sm border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="bg-white/80 dark:bg-black/80 backdrop-blur-sm border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 hover:scale-105"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Enhanced progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>
              {Math.round(((currentSlide + 1) / parsedSlides.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 shadow-sm"
              style={{
                width: `${((currentSlide + 1) / parsedSlides.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {showDetails && (
          <CardDescription className="text-center text-sm mt-3 p-3 bg-white/50 dark:bg-black/50 rounded-lg border border-blue-200 dark:border-blue-800">
            ✨ Interactive presentation with {parsedSlides.length} slides. Click
            fullscreen for presentation mode.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Slide content */}
        <div className="relative min-h-[500px] overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 border-2 border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-700 rounded-full blur-xl"></div>
            <div className="absolute top-40 right-20 w-32 h-32 bg-purple-200 dark:bg-purple-700 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-indigo-200 dark:bg-indigo-700 rounded-full blur-xl"></div>
            <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
          </div>

          {/* Slide Content */}
          <div className="relative z-10 flex items-center justify-center min-h-[500px] p-12">
            <SafeHtmlContent
              content={parsedSlides[currentSlide] || "No content"}
              className={`prose prose-lg max-w-none text-center w-full transition-all duration-300 ${
                isTransitioning
                  ? "opacity-0 transform translate-y-4 scale-95"
                  : "opacity-100 transform translate-y-0 scale-100"
              }`}
              style={{
                textShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
          </div>

          {/* Slide Number Indicator */}
          <div className="absolute top-4 right-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {currentSlide + 1} / {parsedSlides.length}
          </div>
        </div>

        {/* Navigation controls */}
        <div className="p-6 border-t bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="gap-2 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </Button>

            {/* Slide indicators */}
            {parsedSlides.length > 1 && (
              <div className="flex gap-2 bg-white/80 dark:bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800">
                {parsedSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentSlide
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 scale-125 shadow-lg"
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-500 hover:scale-110"
                    }`}
                  />
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={nextSlide}
              disabled={currentSlide === parsedSlides.length - 1}
              className="gap-2 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
