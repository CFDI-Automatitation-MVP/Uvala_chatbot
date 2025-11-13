import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

export const utapi = new UTApi();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } }).onUploadComplete(
    async ({ file }) => {
      console.log("Upload complete for file:", file.url);
      return { url: file.url };
    }
  ),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
