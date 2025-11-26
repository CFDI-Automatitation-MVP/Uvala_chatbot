"use client";

import { type ImageModelList } from "@/app/_actions/image/generate";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Image } from "lucide-react";

interface ImageSourceSelectorProps {
  imageSource: "ai" | "stock";
  imageModel: ImageModelList;
  stockImageProvider: "unsplash";
  onImageSourceChange: (source: "ai" | "stock") => void;
  onImageModelChange: (model: ImageModelList) => void;
  onStockImageProviderChange: (provider: "unsplash") => void;
  className?: string;
  showLabel?: boolean;
}

export function ImageSourceSelector({
  imageSource,
  imageModel,
  stockImageProvider,
  onImageSourceChange,
  onImageModelChange,
  onStockImageProviderChange,
  className,
  showLabel = true,
}: ImageSourceSelectorProps) {
  // Determine the current value based on imageSource
  const currentValue =
    imageSource === "stock"
      ? `stock-${stockImageProvider}`
      : `ai-${imageModel}`;

  const handleValueChange = (value: string) => {
    if (value.startsWith("stock-")) {
      const provider = value.replace("stock-", "") as "unsplash";
      onImageSourceChange("stock");
      onStockImageProviderChange(provider);
    } else if (value.startsWith("ai-")) {
      const model = value.replace("ai-", "") as ImageModelList;
      onImageSourceChange("ai");
      onImageModelChange(model);
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <Label className="mb-2 block text-sm font-medium">Image Source</Label>
      )}
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select image source" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="flex items-center gap-1 text-primary/80">
              <Bot size={10} />
              AI Generated
            </SelectLabel>
            <SelectItem value="ai-google/imagen-4-fast">
              Imagen 4 Fast
            </SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="flex items-center gap-1 text-primary/80">
              <Image size={10} />
              Stock Images
            </SelectLabel>
            <SelectItem value="stock-unsplash">Unsplash</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
