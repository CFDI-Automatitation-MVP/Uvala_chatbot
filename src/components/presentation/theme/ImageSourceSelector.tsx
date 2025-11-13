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
import { Image } from "lucide-react";

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
  // Always set to stock/unsplash
  if (imageSource !== "stock") {
    onImageSourceChange("stock");
    onStockImageProviderChange("unsplash");
  }

  return (
    <div className={className}>
      {showLabel && (
        <Label className="text-sm font-medium mb-2 block">Image Source</Label>
      )}
      <Select
        value="stock-unsplash"
        onValueChange={(value) => {
          const provider = value.replace("stock-", "") as "unsplash";
          onImageSourceChange("stock");
          onStockImageProviderChange(provider);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Unsplash Stock Images" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-primary/80 flex items-center gap-1">
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
