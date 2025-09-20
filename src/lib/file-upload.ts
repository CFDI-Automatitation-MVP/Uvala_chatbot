import { nanoid } from "nanoid";

export interface FileUploadResult {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string; // For display/download
  data?: string; // Base64 data for images
}

export interface FileValidation {
  maxSize: number; // in bytes
  allowedTypes: readonly string[];
  allowedExtensions: readonly string[];
}

export const FILE_VALIDATIONS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "application/json",
    ],
    allowedExtensions: [
      ".pdf",
      ".txt",
      ".md",
      ".doc",
      ".docx",
      ".csv",
      ".json",
    ],
  },
} as const;

export function validateFile(
  file: File,
  validation: FileValidation,
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > validation.maxSize) {
    const isImage = FILE_VALIDATIONS.image.allowedTypes.includes(
      file.type as any,
    );
    const fileTypeDescription = isImage ? "images" : "documents";
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size for ${fileTypeDescription} (${formatFileSize(validation.maxSize)}). Please choose a smaller file.`,
    };
  }

  // Check file type
  if (!validation.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not supported. Allowed types: ${validation.allowedTypes.join(", ")}`,
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (!validation.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" is not supported. Allowed extensions: ${validation.allowedExtensions.join(", ")}`,
    };
  }

  return { valid: true };
}

export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function isImageFile(file: File): boolean {
  return FILE_VALIDATIONS.image.allowedTypes.includes(
    file.type as
      | "image/jpeg"
      | "image/jpg"
      | "image/png"
      | "image/gif"
      | "image/webp",
  );
}

export function isDocumentFile(file: File): boolean {
  return FILE_VALIDATIONS.document.allowedTypes.includes(
    file.type as
      | "application/pdf"
      | "text/plain"
      | "text/markdown"
      | "application/msword"
      | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      | "text/csv"
      | "application/json",
  );
}

export function getFileValidation(file: File): FileValidation {
  if (isImageFile(file)) {
    return FILE_VALIDATIONS.image;
  }
  if (isDocumentFile(file)) {
    return FILE_VALIDATIONS.document;
  }

  // Default to document validation
  return FILE_VALIDATIONS.document;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64 data
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export async function processFile(file: File): Promise<FileUploadResult> {
  const validation = getFileValidation(file);
  const validationResult = validateFile(file, validation);

  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }

  const id = nanoid();

  // For images, convert to base64 for direct use
  if (isImageFile(file)) {
    const data = await fileToBase64(file);
    return {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      data,
    };
  }

  // For documents, we'll need to upload to storage and get URL
  // This will be implemented in the API endpoint
  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}
