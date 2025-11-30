import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Themes, themes } from "@/lib/presentation/themes";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { ImageSourceSelector } from "./ImageSourceSelector";

const PRESENTATION_STYLES = [
  { value: "professional", label: "Professional" },
  { value: "creative", label: "Creative" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "elegant", label: "Elegant" },
];

export function ThemeSettings() {
  const t = useTranslations("Presentation");
  const {
    theme,
    setTheme,
    imageModel,
    setImageModel,
    imageSource,
    setImageSource,
    stockImageProvider,
    setStockImageProvider,
  } = usePresentationState();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-semibold">{t("chooseTheme")}</Label>

        {/* Circular Theme Selector */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-4">
          {Object.entries(themes).map(([key, themeOption]) => {
            const modeColors = isDark
              ? themeOption.colors.dark
              : themeOption.colors.light;

            return (
              <button
                key={key}
                onClick={() => setTheme(key as Themes)}
                className={cn(
                  "group relative flex flex-col items-center gap-3 transition-all",
                )}
              >
                {/* Circular color preview */}
                <div className="relative">
                  <div
                    className={cn(
                      "relative h-20 w-20 rounded-full p-1 transition-all",
                      theme === key
                        ? "ring-4 ring-primary ring-offset-4 ring-offset-background scale-110"
                        : "ring-2 ring-border hover:ring-primary/50 hover:scale-105",
                    )}
                  >
                    <div className="h-full w-full rounded-full overflow-hidden grid grid-cols-3">
                      {[
                        modeColors.primary,
                        modeColors.secondary,
                        modeColors.accent,
                      ].map((color, i) => (
                        <div
                          key={i}
                          style={{ backgroundColor: color }}
                          className="h-full"
                        />
                      ))}
                    </div>
                  </div>
                  {theme === key && (
                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <svg
                        className="h-4 w-4 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Theme name */}
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">
                    {themeOption.name}
                  </div>
                  <div className="text-xs text-muted-foreground max-w-[100px] line-clamp-1">
                    {themeOption.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ImageSourceSelector
        imageSource={imageSource}
        imageModel={imageModel}
        stockImageProvider={stockImageProvider}
        onImageSourceChange={setImageSource}
        onImageModelChange={setImageModel}
        onStockImageProviderChange={setStockImageProvider}
        className="space-y-4"
        showLabel={true}
      />

      <div className="space-y-4">
        <Label className="text-sm font-medium">Presentation Style</Label>
        <Select defaultValue="professional">
          <SelectTrigger>
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {PRESENTATION_STYLES.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
