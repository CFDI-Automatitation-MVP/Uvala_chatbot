import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePresentationState } from "@/states/presentation-state";
import { Layout } from "lucide-react";

export function PresentationControls({
  shouldShowLabel = true,
}: {
  shouldShowLabel?: boolean;
}) {
  const {
    numSlides,
    setNumSlides,
    language,
    setLanguage,
    pageStyle,
    setPageStyle,
  } = usePresentationState();

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Number of Slides */}
      <div>
        {shouldShowLabel && (
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Number of slides
          </label>
        )}
        <Select
          value={String(numSlides)}
          onValueChange={(v) => setNumSlides(Number(v))}
        >
          <SelectTrigger className="h-12 text-base border-border/40 rounded-lg">
            <SelectValue placeholder="Slides" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((num) => (
              <SelectItem key={num} value={String(num)}>
                {num} {num === 1 ? "slide" : "slides"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div>
        {shouldShowLabel && (
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Language
          </label>
        )}
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-12 text-base border-border/40 rounded-lg">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-US">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Page Style */}
      <div>
        {shouldShowLabel && (
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Page style
          </label>
        )}
        <Select value={pageStyle} onValueChange={setPageStyle}>
          <SelectTrigger className="h-12 text-base border-border/40 rounded-lg">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <SelectValue placeholder="Style" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="traditional">Traditional</SelectItem>
            <SelectItem value="tall">Tall</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
