"use client";

import { memo } from "react";
import { FileIcon, Download, ExternalLink } from "lucide-react";
import { Button } from "ui/button";
import { cn } from "lib/utils";
import { UIMessage } from "@ai-sdk/react";
import Image from "next/image";

type MessagePart = UIMessage["parts"][number];

interface MessagePartRendererProps {
  part: MessagePart;
  className?: string;
}

export const MessagePartRenderer = memo(function MessagePartRenderer({
  part,
  className,
}: MessagePartRendererProps) {
  // Handle text parts
  if (part.type === "text") {
    return (
      <div className={cn("whitespace-pre-wrap text-sm break-words", className)}>
        {part.text}
      </div>
    );
  }

  // Handle image parts through type assertion (custom extension)
  if ((part as any).type === "image") {
    const imagePart = part as any; // Type assertion for image parts
    const imageUrl = imagePart.url || imagePart.image; // Support both formats
    const alt = imagePart.alt || "Uploaded image";
    
    return (
      <div className={cn("max-w-md", className)}>
        <Image
          src={imageUrl}
          alt={alt}
          width={400}
          height={400}
          className="w-full h-auto rounded-lg border shadow-sm object-contain"
          style={{ maxHeight: "400px" }}
          unoptimized
        />
        {alt && alt !== "Uploaded image" && (
          <div className="text-xs text-muted-foreground mt-2 text-center">{alt}</div>
        )}
      </div>
    );
  }

  // Handle file parts through type assertion (custom extension)
  if ((part as any).type === "file") {
    const filePart = part as any; // Type assertion for file parts
    const fileUrl = filePart.url || filePart.data; // Support both formats
    const mediaType = filePart.mediaType || filePart.mimeType || "application/octet-stream";
    const fileName = filePart.name || filePart.alt || "Attached File";

    const handleDownload = () => {
      if (fileUrl) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    const handleOpen = () => {
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      }
    };

    return (
      <div className={cn("flex items-center gap-3 p-3 bg-card border rounded-lg max-w-sm", className)}>
        <div className="flex-shrink-0 p-2 bg-secondary/50 rounded">
          <FileIcon className="size-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <div className="text-xs text-muted-foreground">{mediaType}</div>
        </div>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpen}
            className="size-8"
            title="Open file"
          >
            <ExternalLink className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="size-8"
            title="Download file"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Handle tool calls and other part types (existing behavior)
  if (part.type.startsWith("tool-")) {
    // Tool parts should be handled by existing ToolMessagePart component
    return null;
  }

  // Unknown part type
  return (
    <div className={cn("p-2 bg-muted rounded text-sm text-muted-foreground", className)}>
      Unknown message part type: {part.type}
    </div>
  );
});

MessagePartRenderer.displayName = "MessagePartRenderer";