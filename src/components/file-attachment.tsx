"use client";

import { useRef, useState } from "react";
import { Button } from "ui/button";
import Image from "next/image";
import { PlusIcon, Loader, FileIcon, X } from "lucide-react";
import { toast } from "sonner";
import {
  validateFile,
  getFileValidation,
  isDocumentFile,
} from "@/lib/file-upload";
import { cn } from "lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { createClient } from "@/lib/supabase/client";

export interface AttachmentFile {
  type: "file";
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
  className,
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

  // Upload document to RAG system for processing and embedding generation
  const uploadToRAGSystem = async (file: File): Promise<void> => {
    console.log(
      `🔄 RAG Upload: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`,
    );

    try {
      // Get Supabase client to access user session
      const supabase = createClient();

      // Get current session for authentication - use getUser() instead of getSession()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ RAG Auth Error:", userError?.message || "No user");
        throw new Error("User not authenticated");
      }

      // Get the session to access the token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error(
          "❌ RAG Session Error:",
          sessionError?.message || "No access token",
        );
        throw new Error("No valid session token");
      }

      console.log("✅ RAG Auth: User authenticated");

      // Create form data - server will handle all text extraction
      const formData = new FormData();
      formData.append("file", file);

      console.log("📤 RAG Upload: Sending to API (server-side processing)...");

      // Upload to RAG system
      const response = await fetch("/api/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      console.log(`📊 RAG Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ RAG Failed:", errorText.substring(0, 200) + "...");
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText}`,
          );
        }
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      console.log("✅ RAG Success:", {
        fileId: result?.fileId,
        status: result?.status,
      });
      toast.success(
        `Document "${file.name}" uploaded and processed for search!`,
      );
    } catch (error) {
      console.error(
        "❌ RAG Error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      toast.error(
        `Failed to process document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
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
            type: "file",
            name: file.name,
            mediaType: file.type,
            url, // Data URL format: "data:image/jpeg;base64,..."
          });

          // For documents, also upload to RAG system for processing and search
          if (isDocumentFile(file)) {
            console.log(
              `Uploading document to RAG system: ${file.name} (${file.type})`,
            );
            await uploadToRAGSystem(file);
          } else {
            console.log(
              `Skipping RAG upload for non-document: ${file.name} (${file.type})`,
            );
          }
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
        fileInputRef.current.value = "";
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
              className,
            )}
          >
            {isProcessing ? <Loader className="animate-spin" /> : <PlusIcon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">Upload Files</div>
            <div className="text-muted-foreground mt-1">
              Images: JPG, PNG, GIF, WebP (10MB max)
              <br />
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

export function AttachmentPreview({
  attachment,
  onRemove,
  className,
}: AttachmentPreviewProps) {
  const isImage = attachment.mediaType.startsWith("image/");

  if (isImage) {
    // Simple image preview - just thumbnail with remove button
    return (
      <div className={cn("relative flex-shrink-0", className)}>
        <Image
          src={attachment.url}
          alt="Preview"
          width={64}
          height={64}
          className="object-cover rounded-lg border"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground hover:text-destructive-foreground shadow-md"
        >
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  // Non-image files keep the original layout with filename
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 bg-input/60 rounded-lg border",
        className,
      )}
    >
      <div className="flex-shrink-0">
        <FileIcon className="size-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.name}</div>
        <div className="text-xs text-muted-foreground">
          {attachment.mediaType}
        </div>
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
