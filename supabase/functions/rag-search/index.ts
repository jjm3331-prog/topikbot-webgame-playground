import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate query embedding using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
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

// Rerank results using Cohere
async function rerankResults(
  query: string, 
  documents: { id: string; content: string; similarity: number; document_title: string }[],
  apiKey: string,
  topN: number = 5
): Promise<typeof documents> {
  if (documents.length === 0) return [];

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'rerank-v3.5',
      query,
      documents: documents.map(d => d.content),
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Cohere rerank error:', error);
    // Fallback to original order if reranking fails
    return documents.slice(0, topN);
  }

  const data = await response.json();
  
  // Reorder documents based on rerank results
  const rerankedDocs = data.results.map((result: { index: number; relevance_score: number }) => ({
    ...documents[result.index],
    rerank_score: result.relevance_score,
  }));

  return rerankedDocs;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const cohereApiKey = Deno.env.get('COHERE_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      query, 
      match_threshold = 0.3, 
      match_count = 20,
      rerank = true,
      top_n = 5 
    } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Searching for: ${query}`);

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query, openAIApiKey);
    console.log('Query embedding generated');

    // 2. Vector similarity search
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_knowledge',
      {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold,
        match_count,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error(`Search failed: ${searchError.message}`);
    }

    console.log(`Found ${searchResults?.length || 0} initial results`);

    if (!searchResults || searchResults.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        results: [],
        query,
        message: 'No matching documents found',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Rerank with Cohere (if enabled and API key available)
    let finalResults = searchResults;
    
    if (rerank && cohereApiKey) {
      console.log('Reranking with Cohere...');
      finalResults = await rerankResults(query, searchResults, cohereApiKey, top_n);
      console.log(`Reranked to top ${finalResults.length} results`);
    } else {
      finalResults = searchResults.slice(0, top_n);
      if (!cohereApiKey) {
        console.log('Cohere API key not available, using vector similarity only');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results: finalResults,
      query,
      total_found: searchResults.length,
      reranked: rerank && !!cohereApiKey,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('RAG search error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
