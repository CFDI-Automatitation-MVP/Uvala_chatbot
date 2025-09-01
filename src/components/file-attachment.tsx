"use client";

import { useRef, useState } from "react";
import { Button } from "ui/button";
import { PlusIcon, Loader, FileIcon, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { validateFile, getFileValidation } from "@/lib/file-upload";
import { cn } from "lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

export interface AttachmentFile {
  type: 'file';
  name: string;
  mediaType: string;
  url: string; // Data URL for AI SDK experimental_attachments
}

interface FileAttachmentInputProps {
  onFilesSelected: (files: AttachmentFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

export function FileAttachmentInput({ 
  onFilesSelected, 
  disabled, 
  maxFiles = 5,
  className 
}: FileAttachmentInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Convert file to data URL for AI SDK experimental_attachments
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;

    const fileArray = Array.from(files);
    
    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsProcessing(true);
    const attachments: AttachmentFile[] = [];

    try {
      for (const file of fileArray) {
        // Validate file
        const validation = getFileValidation(file);
        const validationResult = validateFile(file, validation);
        
        if (!validationResult.valid) {
          toast.error(`${file.name}: ${validationResult.error}`);
          continue;
        }

        try {
          // Convert to data URL - AI SDK experimental_attachments expects this format
          const url = await fileToDataURL(file);
          
          attachments.push({
            type: 'file',
            name: file.name,
            mediaType: file.type,
            url // Data URL format: "data:image/jpeg;base64,..."
          });
        } catch (_error) {
          toast.error(`Failed to process file: ${file.name}`);
        }
      }

      if (attachments.length > 0) {
        onFilesSelected(attachments);
        toast.success(`${attachments.length} file(s) ready to send`);
      }
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/json"
        onChange={(e) => {
          if (e.target.files) {
            processFiles(e.target.files);
          }
        }}
        className="hidden"
      />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || isProcessing}
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "rounded-full hover:bg-input! p-2!",
              dragActive && "bg-input ring-2 ring-primary",
              className
            )}
          >
            {isProcessing ? (
              <Loader className="animate-spin" />
            ) : (
              <PlusIcon />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">Upload Files</div>
            <div className="text-muted-foreground mt-1">
              Images: JPG, PNG, GIF, WebP (10MB max)<br/>
              Documents: PDF, TXT, MD, DOC, CSV, JSON (50MB max)
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </>
  );
}

interface AttachmentPreviewProps {
  attachment: AttachmentFile;
  onRemove: () => void;
  className?: string;
}

export function AttachmentPreview({ attachment, onRemove, className }: AttachmentPreviewProps) {
  const isImage = attachment.mediaType.startsWith('image/');
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-input/60 rounded-lg border",
      className
    )}>
      <div className="flex-shrink-0">
        {isImage ? (
          <ImageIcon className="size-4 text-blue-500" />
        ) : (
          <FileIcon className="size-4 text-gray-500" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.name}</div>
        <div className="text-xs text-muted-foreground">{attachment.mediaType}</div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="size-6 rounded-full hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}