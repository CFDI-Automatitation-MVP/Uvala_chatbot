"use client";

import { useState } from "react";
import { Button } from "ui/button";
import { FileAttachmentInput, AttachmentFile } from "./file-attachment";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";

export function FileAttachmentTest() {
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const handleFilesSelected = (files: AttachmentFile[]) => {
    setAttachments(prev => [...prev, ...files]);
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  const testWithDifferentProviders = () => {
    console.log("Testing with attachments:", attachments);
    
    // Simulate what AI SDK experimental_attachments would receive
    const experimentalAttachments = attachments.map(file => ({
      name: file.name,
      mediaType: file.mediaType,
      url: file.url
    }));

    console.log("experimental_attachments format:", experimentalAttachments);
    
    // This would be passed to sendMessage like:
    // sendMessage(message, { experimental_attachments: experimentalAttachments })
  };

  return (
    <Card className="max-w-2xl mx-auto m-4">
      <CardHeader>
        <CardTitle>File Attachment Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <FileAttachmentInput
            onFilesSelected={handleFilesSelected}
            maxFiles={5}
          />
          <Button onClick={clearAttachments} variant="outline">
            Clear All
          </Button>
          <Button onClick={testWithDifferentProviders}>
            Test Format
          </Button>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Current Attachments ({attachments.length}):</h3>
          {attachments.length === 0 ? (
            <p className="text-muted-foreground">No files selected</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div key={`${attachment.name}-${index}`} className="p-2 border rounded bg-muted/50">
                  <div className="font-medium">{attachment.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: {attachment.mediaType}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    URL: {attachment.url.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How it works with AI SDK 5.0:
          </h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
            <li>Files are converted to data URLs automatically</li>
            <li>Passed to sendMessage via experimental_attachments</li>
            <li>AI SDK converts to proper message parts</li>
            <li>Works with OpenAI, Claude, Gemini automatically</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}