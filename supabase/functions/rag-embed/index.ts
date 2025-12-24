import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Semantic chunking with overlap - split by meaning boundaries
function semanticChunk(text: string, maxTokens: number = 1024, overlapTokens: number = 120): string[] {
  const chunks: string[] = [];
  
  // Split by paragraphs first (double newlines)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  let currentChunk = '';
  let currentTokens = 0;
  let previousChunkEnd = ''; // Store end of previous chunk for overlap
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4); // Rough token estimate
    
    if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Calculate overlap: get last ~overlapTokens worth of content
      const overlapChars = overlapTokens * 4;
      previousChunkEnd = currentChunk.slice(-overlapChars);
      
      // Start new chunk with overlap from previous
      currentChunk = previousChunkEnd + '\n\n';
      currentTokens = overlapTokens;
    }
    
    // If single paragraph is too large, split by sentences
    if (paragraphTokens > maxTokens) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        const sentenceTokens = Math.ceil(sentence.length / 4);
        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
          chunks.push(currentChunk.trim());
          
          // Apply overlap
          const overlapChars = overlapTokens * 4;
          previousChunkEnd = currentChunk.slice(-overlapChars);
          currentChunk = previousChunkEnd + ' ';
          currentTokens = overlapTokens;
        }
        currentChunk += sentence + ' ';
        currentTokens += sentenceTokens;
      }
    } else {
      currentChunk += paragraph + '\n\n';
      currentTokens += paragraphTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Generate embeddings using OpenAI text-embedding-3-large (1536 dimensions)
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1536, // Reduced from 3072 for compatibility
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI embedding error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, content, source_url, file_type, metadata } = await req.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Title and content are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing document: ${title}`);

    // Check for duplicate document by title
    const { data: existingDoc } = await supabase
      .from('knowledge_documents')
      .select('id, title')
      .eq('title', title)
      .maybeSingle();

    if (existingDoc) {
      console.log(`Duplicate document found: ${title} (ID: ${existingDoc.id})`);
      return new Response(JSON.stringify({ 
        error: 'Duplicate document',
        message: `Document with title "${title}" already exists`,
        existing_document_id: existingDoc.id
      }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Insert document
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        title,
        content,
        source_url: source_url || null,
        file_type: file_type || 'text',
        metadata: metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      throw new Error(`Failed to insert document: ${docError.message}`);
    }

    console.log(`Document created: ${document.id}`);

    // 2. Semantic chunking
    const chunks = semanticChunk(content);
    console.log(`Created ${chunks.length} chunks`);

    // 3. Generate embeddings and insert chunks
    const chunkInserts = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);
      
      const embedding = await generateEmbedding(chunk, openAIApiKey);
      const tokenCount = Math.ceil(chunk.length / 4);

      chunkInserts.push({
        document_id: document.id,
        chunk_index: i,
        content: chunk,
        embedding: `[${embedding.join(',')}]`,
        token_count: tokenCount,
        metadata: { chunk_index: i, total_chunks: chunks.length },
      });
    }

    const { error: chunkError } = await supabase
      .from('knowledge_chunks')
      .insert(chunkInserts);

    if (chunkError) {
      console.error('Chunk insert error:', chunkError);
      // Rollback document
      await supabase.from('knowledge_documents').delete().eq('id', document.id);
      throw new Error(`Failed to insert chunks: ${chunkError.message}`);
    }

    console.log(`Successfully embedded ${chunks.length} chunks for document: ${title}`);

    return new Response(JSON.stringify({
      success: true,
      document_id: document.id,
      chunks_created: chunks.length,
      title,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('RAG embed error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
