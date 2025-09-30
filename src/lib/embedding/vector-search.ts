import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./openai-embeddings";

// Get Supabase client (default - can be overridden)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const defaultSupabase = createClient(supabaseUrl, supabaseKey);

export interface SearchResult {
  chunkId: string;
  fileId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
  fileName: string;
  fileType: string;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

export interface FileSearchResult {
  fileId: string;
  fileName: string;
  fileType: string;
  bestChunkContent: string;
  similarity: number;
  totalChunks: number;
  processingStatus: string;
  createdAt: string;
}

export interface SearchOptions {
  userId: string;
  threadId?: string;
  matchThreshold?: number;
  matchCount?: number;
}

/**
 * Search for exact text matches across user's files
 */
export async function searchFilesExact(
  query: string,
  options: SearchOptions,
  supabaseClient = defaultSupabase,
): Promise<SearchResult[]> {
  const { userId, threadId, matchCount = 10 } = options;

  try {
    // Build query for exact text search using Supabase client
    let query_builder = supabaseClient
      .from("file_chunks")
      .select(`
        id,
        file_id,
        content,
        chunk_index,
        start_char,
        end_char,
        token_count,
        files!inner(
          user_id,
          thread_id,
          original_filename,
          content_type
        )
      `)
      .ilike("content", `%${query}%`)
      .eq("files.user_id", userId)
      .order("chunk_index")
      .limit(matchCount);

    if (threadId) {
      query_builder = query_builder.eq("files.thread_id", threadId);
    }

    const { data, error } = await query_builder;

    if (error) {
      console.error("Exact text search error:", error);
      throw new Error(`Exact text search failed: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      chunkId: result.id,
      fileId: result.file_id,
      content: result.content,
      chunkIndex: result.chunk_index,
      similarity: 1.0, // Exact match
      fileName: result.files.original_filename,
      fileType: result.files.content_type,
      startChar: result.start_char,
      endChar: result.end_char,
      tokenCount: result.token_count,
    }));
  } catch (error) {
    console.error("Error in searchFilesExact:", error);
    throw error;
  }
}

/**
 * Search for similar content across user's files
 */
export async function searchFiles(
  query: string,
  options: SearchOptions,
  supabaseClient = defaultSupabase,
): Promise<SearchResult[]> {
  const { userId, threadId, matchThreshold = 0.7, matchCount = 10 } = options;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Call the Supabase RPC function to search
    const { data, error } = await supabaseClient.rpc("search_file_chunks", {
      query_embedding: queryEmbedding.embedding,
      user_id_param: userId,
      thread_id_param: threadId || null,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error("Vector search error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      chunkId: result.chunk_id,
      fileId: result.file_id,
      content: result.content,
      chunkIndex: result.chunk_index,
      similarity: result.similarity,
      fileName: result.file_name,
      fileType: result.file_type,
      startChar: result.start_char,
      endChar: result.end_char,
      tokenCount: result.token_count,
    }));
  } catch (error) {
    console.error("Error in searchFiles:", error);
    throw error;
  }
}

/**
 * Search for files (not individual chunks) by content similarity
 */
export async function searchFilesByContent(
  query: string,
  options: SearchOptions,
  supabaseClient = defaultSupabase,
): Promise<FileSearchResult[]> {
  const { userId, threadId, matchThreshold = 0.7, matchCount = 5 } = options;

  try {
    // Call the Supabase RPC function to search files
    const { data, error } = await supabaseClient.rpc(
      "search_files_by_content",
      {
        query_text: query,
        user_id_param: userId,
        thread_id_param: threadId || null,
        match_threshold: matchThreshold,
        match_count: matchCount,
      },
    );

    if (error) {
      console.error("File search error:", error);
      throw new Error(`File search failed: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      fileId: result.file_id,
      fileName: result.file_name,
      fileType: result.file_type,
      bestChunkContent: result.best_chunk_content,
      similarity: result.similarity,
      totalChunks: result.total_chunks,
      processingStatus: result.processing_status,
      createdAt: result.created_at,
    }));
  } catch (error) {
    console.error("Error in searchFilesByContent:", error);
    throw error;
  }
}

/**
 * Get a specific range of chunks from a file (position-aware access)
 */
export async function getFileChunkRange(
  fileId: string,
  userId: string,
  options: {
    start?: number; // Starting chunk index (inclusive)
    end?: number; // Ending chunk index (inclusive)
    fromEnd?: number; // Get last N chunks
    limit?: number; // Maximum chunks to return
  } = {},
  supabaseClient = defaultSupabase,
): Promise<
  Array<{
    chunkId: string;
    content: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
    tokenCount: number;
    hasEmbedding: boolean;
  }>
> {
  try {
    const { start, end, fromEnd, limit = 10 } = options;

    let query = supabaseClient
      .from("file_chunks")
      .select(`
        id,
        content,
        chunk_index,
        start_char,
        end_char,
        token_count,
        embedding
      `)
      .eq("file_id", fileId)
      .order("chunk_index");

    // Handle different range types
    if (fromEnd) {
      // Get last N chunks - need to get total count first
      const { count } = await supabaseClient
        .from("file_chunks")
        .select("*", { count: "exact", head: true })
        .eq("file_id", fileId);

      if (count && count > 0) {
        const startIndex = Math.max(0, count - fromEnd);
        query = query.gte("chunk_index", startIndex);
      }
    } else if (start !== undefined || end !== undefined) {
      // Handle start/end range
      if (start !== undefined) {
        query = query.gte("chunk_index", start);
      }
      if (end !== undefined) {
        query = query.lte("chunk_index", end);
      }
    }

    // Apply limit
    query = query.limit(limit);

    // Verify user access
    const { data: fileCheck } = await supabaseClient
      .from("files")
      .select("user_id")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (!fileCheck) {
      throw new Error("File not found or access denied");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get chunk range error:", error);
      throw new Error(`Failed to get chunk range: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      chunkId: result.id,
      content: result.content,
      chunkIndex: result.chunk_index,
      startChar: result.start_char,
      endChar: result.end_char,
      tokenCount: result.token_count,
      hasEmbedding: !!result.embedding,
    }));
  } catch (error) {
    console.error("Error in getFileChunkRange:", error);
    throw error;
  }
}

/**
 * Get all chunks for a specific file
 */
export async function getFileChunks(
  fileId: string,
  userId: string,
  supabaseClient = defaultSupabase,
): Promise<
  Array<{
    chunkId: string;
    content: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
    tokenCount: number;
    hasEmbedding: boolean;
  }>
> {
  try {
    const { data, error } = await supabaseClient.rpc("get_file_chunks", {
      file_id_param: fileId,
      user_id_param: userId,
    });

    if (error) {
      console.error("Get file chunks error:", error);
      throw new Error(`Failed to get file chunks: ${error.message}`);
    }

    return (data || []).map((result: any) => ({
      chunkId: result.chunk_id,
      content: result.content,
      chunkIndex: result.chunk_index,
      startChar: result.start_char,
      endChar: result.end_char,
      tokenCount: result.token_count,
      hasEmbedding: result.has_embedding,
    }));
  } catch (error) {
    console.error("Error in getFileChunks:", error);
    throw error;
  }
}

/**
 * Store a file and its chunks with embeddings
 */
export async function storeFileWithEmbeddings(
  fileData: {
    filename: string;
    originalFilename: string;
    contentType: string;
    fileSize: number;
    storagePath: string;
    checksum: string;
    userId: string;
    threadId?: string;
    extractedText: string;
    metadata?: Record<string, any>;
  },
  chunks: Array<{
    content: string;
    chunkIndex: number;
    embedding: number[];
    startChar: number;
    endChar: number;
    tokenCount: number;
  }>,
  supabaseClient: any,
): Promise<{ fileId: string; chunkIds: string[] }> {
  try {
    // Start a transaction
    const { data: fileData_result, error: fileError } = await supabaseClient
      .from("files")
      .insert({
        filename: fileData.filename,
        original_filename: fileData.originalFilename,
        content_type: fileData.contentType,
        file_size: fileData.fileSize,
        storage_path: fileData.storagePath,
        checksum: fileData.checksum,
        user_id: fileData.userId,
        thread_id: fileData.threadId || null,
        processing_status: "completed",
        extracted_text: fileData.extractedText,
        metadata: fileData.metadata || {},
      })
      .select("id")
      .single();

    if (fileError) {
      throw new Error(`Failed to store file: ${fileError.message}`);
    }

    const fileId = fileData_result.id;

    // Insert chunks with embeddings
    const chunkInsertData = chunks.map((chunk) => ({
      file_id: fileId,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      embedding: chunk.embedding,
      start_char: chunk.startChar,
      end_char: chunk.endChar,
      token_count: chunk.tokenCount,
    }));

    const { data: chunksData, error: chunksError } = await supabaseClient
      .from("file_chunks")
      .insert(chunkInsertData)
      .select("id");

    if (chunksError) {
      // Rollback: delete the file if chunks failed
      await supabaseClient.from("files").delete().eq("id", fileId);
      throw new Error(`Failed to store chunks: ${chunksError.message}`);
    }

    const chunkIds = (chunksData || []).map((chunk) => chunk.id);

    return { fileId, chunkIds };
  } catch (error) {
    console.error("Error in storeFileWithEmbeddings:", error);
    throw error;
  }
}

/**
 * Get user's files with pagination
 */
export async function getUserFiles(
  userId: string,
  options: {
    threadId?: string;
    limit?: number;
    offset?: number;
    processingStatus?: string;
  } = {},
  supabaseClient = defaultSupabase,
): Promise<{
  files: Array<{
    id: string;
    originalFilename: string;
    contentType: string;
    fileSize: number;
    processingStatus: string;
    createdAt: string;
    totalChunks: number;
  }>;
  total: number;
}> {
  try {
    let query = supabaseClient
      .from("files")
      .select(`
        id,
        original_filename,
        content_type,
        file_size,
        processing_status,
        created_at,
        file_chunks(count)
      `)
      .eq("user_id", userId);

    if (options.threadId) {
      query = query.eq("thread_id", options.threadId);
    }

    if (options.processingStatus) {
      query = query.eq("processing_status", options.processingStatus);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get user files: ${error.message}`);
    }

    const files = (data || []).map((file: any) => ({
      id: file.id,
      originalFilename: file.original_filename,
      contentType: file.content_type,
      fileSize: file.file_size,
      processingStatus: file.processing_status,
      createdAt: file.created_at,
      totalChunks: file.file_chunks?.[0]?.count || 0,
    }));

    return { files, total: count || 0 };
  } catch (error) {
    console.error("Error in getUserFiles:", error);
    throw error;
  }
}
