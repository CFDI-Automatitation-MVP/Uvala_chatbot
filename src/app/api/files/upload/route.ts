import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  processDocument,
  generateDocumentEmbeddings,
} from "@/lib/embedding/document-processor";
import { storeFileWithEmbeddings } from "@/lib/embedding/vector-search";
import { getFileValidation, validateFile } from "@/lib/file-upload";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get authorization header
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 },
      );
    }

    // Create client for user authentication with the provided token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Set the auth token from the header
    const token = authorization.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Create service client for file operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const threadId = formData.get("threadId") as string | null;

    // Debug logging
    console.log(`Processing file: ${file.name} (${file.type})`);
    console.log(`Thread ID: ${threadId || "NOT PROVIDED"}`);
    console.log(`User ID: ${userId}`);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validation = getFileValidation(file);
    const validationResult = validateFile(file, validation);

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 },
      );
    }

    // Generate unique filename, storage path, and checksum
    const fileExtension = file.name.split(".").pop() || "";
    const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
    const storagePath = `${userId}/${uniqueFilename}`; // Define early for chunk copying
    const buffer = await file.arrayBuffer();
    const baseChecksum = crypto
      .createHash("sha256")
      .update(new Uint8Array(buffer))
      .digest("hex");
    // Make checksum unique per thread to allow same file in multiple threads
    const checksum = threadId ? `${baseChecksum}_${threadId}` : baseChecksum;

    // Check for duplicate files - first check current thread, then all threads
    // Step 1: Check if file exists in THIS thread (using the thread-specific checksum)
    const { data: threadFile } = await supabase
      .from("files")
      .select("id, original_filename, thread_id, file_chunks(count)")
      .eq("user_id", userId)
      .eq("checksum", checksum) // This already includes threadId if present
      .eq("thread_id", threadId || "")
      .maybeSingle();

    if (threadFile) {
      const chunkCount = threadFile.file_chunks?.[0]?.count || 0;
      if (chunkCount > 0) {
        console.log(
          `File already exists in current thread with ${chunkCount} chunks - skipping`,
        );
        return NextResponse.json({
          success: true,
          message: `File "${threadFile.original_filename}" already exists in this conversation`,
          fileId: threadFile.id,
          isDuplicate: true,
          chunkCount,
        });
      }
    }

    // Step 2: Check if file exists in ANY thread (to reuse chunks) - use LIKE to match baseChecksum
    const { data: existingFile } = await supabase
      .from("files")
      .select("id, original_filename, thread_id, file_chunks(count)")
      .eq("user_id", userId)
      .like("checksum", `${baseChecksum}%`) // Match baseChecksum regardless of thread suffix
      .limit(1)
      .maybeSingle();

    if (existingFile) {
      const chunkCount = existingFile.file_chunks?.[0]?.count || 0;

      if (chunkCount > 0 && threadId) {
        // File exists in another thread with chunks - create new file record and copy chunk references
        console.log(
          `File exists in thread ${existingFile.thread_id} with ${chunkCount} chunks - copying for thread ${threadId}`,
        );

        // Get the existing chunks (only select columns that exist in schema)
        const { data: existingChunks, error: fetchChunksError } = await supabase
          .from("file_chunks")
          .select(
            "chunk_index, content, embedding, start_char, end_char, token_count",
          )
          .eq("file_id", existingFile.id)
          .order("chunk_index");

        if (fetchChunksError) {
          console.error("Error fetching chunks:", fetchChunksError);
          // Fall through to normal processing
        } else if (!existingChunks || existingChunks.length === 0) {
          console.error("No chunks found for existing file");
          // Fall through to normal processing
        } else {
          // Create new file record for this thread with unique checksum
          const { data: newFileData, error: newFileError } = await supabase
            .from("files")
            .insert({
              filename: uniqueFilename,
              original_filename: file.name,
              content_type: file.type,
              file_size: file.size,
              storage_path: storagePath,
              checksum: checksum, // Already includes threadId from line 84
              user_id: userId,
              thread_id: threadId,
              extracted_text: "", // Will be populated if needed
              processing_status: "completed",
              metadata: {
                sourceFileId: existingFile.id,
                copiedChunks: true,
                totalChunks: existingChunks.length,
              },
            })
            .select()
            .single();

          if (newFileError) {
            console.error("Failed to create file record:", newFileError);
            // Fall through to normal processing
          } else {
            // Copy chunk references for the new file (without metadata field)
            const newChunks = existingChunks.map((chunk) => ({
              file_id: newFileData.id, // Point to new file
              chunk_index: chunk.chunk_index,
              content: chunk.content,
              embedding: chunk.embedding,
              start_char: chunk.start_char,
              end_char: chunk.end_char,
              token_count: chunk.token_count,
            }));

            console.log(
              `📝 Attempting to insert ${newChunks.length} chunks...`,
            );
            console.log(
              `   Sample chunk:`,
              JSON.stringify(newChunks[0], null, 2),
            );

            const { error: chunksError, data: insertedChunks } = await supabase
              .from("file_chunks")
              .insert(newChunks)
              .select();

            if (chunksError) {
              console.error("❌ Failed to copy chunks:", chunksError);
              console.error(
                "   Error details:",
                JSON.stringify(chunksError, null, 2),
              );
              // Clean up the file record
              await supabase.from("files").delete().eq("id", newFileData.id);
              // Fall through to normal processing
            } else {
              console.log(
                `✅ Copied ${insertedChunks?.length || newChunks.length} chunks for file ${newFileData.id} in thread ${threadId}`,
              );
              return NextResponse.json({
                success: true,
                message:
                  "File processed successfully (reused existing analysis)",
                fileId: newFileData.id,
                fileName: file.name,
                fileSize: file.size,
                totalChunks: insertedChunks?.length || newChunks.length,
                chunkIds: (insertedChunks || newChunks).map(
                  (c: any) => c.id || "copied",
                ),
              });
            }
          }
        }
      } else if (chunkCount > 0) {
        // File exists but no threadId - just return the existing file
        console.log(`File already exists with ${chunkCount} chunks - reusing`);
        return NextResponse.json({
          success: true,
          message: `File "${existingFile.original_filename}" already processed`,
          fileId: existingFile.id,
          isDuplicate: true,
          chunkCount,
        });
      } else {
        // File exists but has no chunks - delete it and reprocess
        console.log(
          `File exists but has no chunks - deleting and reprocessing`,
        );
        await supabase.from("files").delete().eq("id", existingFile.id);
      }
    }

    // Upload file to Supabase Storage (storagePath already defined above)
    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(storagePath, buffer, {
        contentType: file.type,
        duplex: "half",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Process document (extract text and chunk) - all server-side
    console.log("📄 Processing document server-side...");
    const processedDoc = await processDocument(file, file.type);
    console.log(
      `✅ Document processed: ${processedDoc.totalChunks} chunks, ${processedDoc.totalTokens} tokens`,
    );

    // Generate embeddings for all chunks
    console.log(
      `🔮 Generating embeddings for ${processedDoc.totalChunks} chunks...`,
    );
    const embeddings = await generateDocumentEmbeddings(processedDoc.chunks);
    console.log(`✅ Embeddings generated successfully`);

    // Prepare chunks with embeddings
    const chunksWithEmbeddings = embeddings.map(({ chunk, embedding }) => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      embedding,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      tokenCount: chunk.tokenCount,
    }));

    // Store file and chunks in database
    console.log(
      `💾 Storing file with ${chunksWithEmbeddings.length} chunks in database...`,
    );
    const { fileId, chunkIds } = await storeFileWithEmbeddings(
      {
        filename: uniqueFilename,
        originalFilename: file.name,
        contentType: file.type,
        fileSize: file.size,
        storagePath,
        checksum,
        userId,
        threadId: threadId || undefined,
        extractedText: processedDoc.extractedText,
        metadata: {
          totalChunks: processedDoc.totalChunks,
          totalTokens: processedDoc.totalTokens,
          processingTimestamp: new Date().toISOString(),
        },
      },
      chunksWithEmbeddings,
      supabase, // Pass the service role client
    );

    console.log(
      `✅ File stored successfully: ${fileId} with ${chunkIds.length} chunks`,
    );

    return NextResponse.json({
      success: true,
      message: "File uploaded and processed successfully",
      fileId,
      fileName: file.name,
      fileSize: file.size,
      totalChunks: processedDoc.totalChunks,
      totalTokens: processedDoc.totalTokens,
      chunkIds,
    });
  } catch (error) {
    console.error("File upload error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Provide helpful error messages for common issues
    if (errorMessage.includes("PDF processing not yet implemented")) {
      return NextResponse.json(
        {
          error:
            "PDF files are not yet supported. Please convert your PDF to a text file (.txt) or markdown (.md) format.",
        },
        { status: 400 },
      );
    }

    if (errorMessage.includes("Word document processing not yet implemented")) {
      return NextResponse.json(
        {
          error:
            "Word documents are not yet supported. Please convert your document to a text file (.txt) or markdown (.md) format.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: `File upload failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get authorization header
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 },
      );
    }

    // Create client for user authentication with the provided token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Set the auth token from the header
    const token = authorization.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Create service client for file operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's files
    let query = supabase
      .from("files")
      .select(`
        id,
        original_filename,
        content_type,
        file_size,
        processing_status,
        created_at,
        metadata,
        file_chunks(count)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (threadId) {
      query = query.eq("thread_id", threadId);
    }

    const {
      data: files,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get files: ${error.message}`);
    }

    const formattedFiles = (files || []).map((file: any) => ({
      id: file.id,
      name: file.original_filename,
      contentType: file.content_type,
      size: file.file_size,
      status: file.processing_status,
      createdAt: file.created_at,
      totalChunks: file.file_chunks?.[0]?.count || 0,
      metadata: file.metadata,
    }));

    return NextResponse.json({
      files: formattedFiles,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Get files error:", error);
    return NextResponse.json(
      {
        error: `Failed to get files: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
