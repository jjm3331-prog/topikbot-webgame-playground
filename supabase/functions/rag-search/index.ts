import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 🚀 최고 품질 RAG 시스템 설정
// ============================================
const RAG_CONFIG = {
  // 벡터 검색 설정 - 넓은 후보 풀 확보
  MATCH_THRESHOLD: 0.25,      // 낮은 임계값으로 더 많은 후보 확보
  MATCH_COUNT: 30,            // 충분한 후보 풀 (rerank 전)
  
  // Cohere Rerank 설정 - 의미 기반 재정렬
  RERANK_MODEL: 'rerank-v3.5', // 최신 Cohere rerank 모델
  TOP_N: 8,                    // 최종 반환 문서 수
  
  // OpenAI 임베딩 설정
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

// Generate query embedding using OpenAI text-embedding-3-large
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.EMBEDDING_MODEL,
      input: text,
      dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
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

// 🔥 Cohere Rerank - 의미 기반 고품질 재정렬
async function rerankResults(
  query: string, 
  documents: { id: string; content: string; similarity: number; document_title: string; document_id: string; metadata: any }[],
  apiKey: string,
  topN: number
): Promise<typeof documents> {
  if (documents.length === 0) return [];

  console.log(`🔄 Cohere Reranking: ${documents.length} docs → top ${topN}`);

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.RERANK_MODEL,
      query,
      documents: documents.map(d => d.content),
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Cohere rerank error:', error);
    // Fallback: 벡터 유사도 기반 정렬
    console.log('⚠️ Fallback to vector similarity order');
    return documents.slice(0, topN);
  }

  const data = await response.json();
  
  // Rerank 점수 기반 재정렬
  const rerankedDocs = data.results.map((result: { index: number; relevance_score: number }) => ({
    ...documents[result.index],
    rerank_score: result.relevance_score,
  }));

  console.log(`✅ Reranked: Top scores [${rerankedDocs.slice(0, 3).map((d: any) => d.rerank_score.toFixed(3)).join(', ')}]`);

  return rerankedDocs;
}

// 문서 중복 제거 (같은 문서의 다른 청크는 최고 점수만 유지)
function deduplicateByDocument(
  documents: { document_id: string; rerank_score?: number; similarity: number }[]
): typeof documents {
  const docMap = new Map<string, typeof documents[0]>();
  
  for (const doc of documents) {
    const score = doc.rerank_score ?? doc.similarity;
    const existing = docMap.get(doc.document_id);
    
    if (!existing || score > (existing.rerank_score ?? existing.similarity)) {
      docMap.set(doc.document_id, doc);
    }
  }
  
  return Array.from(docMap.values());
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

    if (!cohereApiKey) {
      console.warn('⚠️ COHERE_API_KEY not configured - reranking disabled');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      query, 
      match_threshold = RAG_CONFIG.MATCH_THRESHOLD, 
      match_count = RAG_CONFIG.MATCH_COUNT,
      rerank = true,  // 🔥 기본값: rerank 활성화
      top_n = RAG_CONFIG.TOP_N,
      deduplicate = true  // 문서 중복 제거
    } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`\n🔍 RAG Search: "${query}"`);
    console.log(`📊 Config: threshold=${match_threshold}, count=${match_count}, rerank=${rerank}, top_n=${top_n}`);

    // 1. Generate query embedding
    const startEmbed = Date.now();
    const queryEmbedding = await generateEmbedding(query, openAIApiKey);
    console.log(`⚡ Embedding: ${Date.now() - startEmbed}ms`);

    // 2. Vector similarity search (넓은 후보 풀)
    const startSearch = Date.now();
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_knowledge',
      {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold,
        match_count,
      }
    );

    if (searchError) {
      console.error('❌ Search error:', searchError);
      throw new Error(`Search failed: ${searchError.message}`);
    }

    console.log(`⚡ Vector search: ${Date.now() - startSearch}ms, found ${searchResults?.length || 0} candidates`);

    if (!searchResults || searchResults.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        results: [],
        query,
        message: 'No matching documents found',
        config: RAG_CONFIG,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. 🔥 Cohere Rerank (핵심 품질 향상)
    let finalResults = searchResults;
    let wasReranked = false;
    
    if (rerank && cohereApiKey) {
      const startRerank = Date.now();
      finalResults = await rerankResults(query, searchResults, cohereApiKey, top_n);
      wasReranked = true;
      console.log(`⚡ Rerank: ${Date.now() - startRerank}ms`);
    } else {
      finalResults = searchResults.slice(0, top_n);
      console.log(`📋 Using vector similarity order (no rerank)`);
    }

    // 4. 문서 중복 제거 (선택적)
    if (deduplicate) {
      const beforeDedup = finalResults.length;
      finalResults = deduplicateByDocument(finalResults);
      if (beforeDedup !== finalResults.length) {
        console.log(`🧹 Deduplicated: ${beforeDedup} → ${finalResults.length} unique docs`);
      }
    }

    console.log(`✅ Final results: ${finalResults.length} documents\n`);

    return new Response(JSON.stringify({
      success: true,
      results: finalResults,
      query,
      total_candidates: searchResults.length,
      reranked: wasReranked,
      config: {
        model: RAG_CONFIG.RERANK_MODEL,
        embedding: RAG_CONFIG.EMBEDDING_MODEL,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ RAG search error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
