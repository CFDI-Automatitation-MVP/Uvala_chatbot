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

    // Generate unique filename and checksum
    const fileExtension = file.name.split(".").pop() || "";
    const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
    const buffer = await file.arrayBuffer();
    const checksum = crypto
      .createHash("sha256")
      .update(new Uint8Array(buffer))
      .digest("hex");

    // Check for duplicate files
    const { data: existingFile } = await supabase
      .from("files")
      .select("id, original_filename")
      .eq("user_id", userId)
      .eq("checksum", checksum)
      .single();

    if (existingFile) {
      return NextResponse.json({
        success: true,
        message: `File "${existingFile.original_filename}" already exists`,
        fileId: existingFile.id,
        isDuplicate: true,
      });
    }

    // Upload file to Supabase Storage
    const storagePath = `${userId}/${uniqueFilename}`;
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
    console.log("Processing document server-side...");
    const processedDoc = await processDocument(file, file.type);

    // Generate embeddings for all chunks
    const embeddings = await generateDocumentEmbeddings(processedDoc.chunks);

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
