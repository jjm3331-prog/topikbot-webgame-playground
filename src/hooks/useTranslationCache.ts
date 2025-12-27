import { useState, useCallback } from "react";

interface CachedTranslation {
  title: string;
  content: string;
  targetLanguage: string;
}

// In-memory cache: postId -> { targetLanguage -> translation }
const translationCache = new Map<string, Map<string, CachedTranslation>>();

export function useTranslationCache(postId: string) {
  const [cache, setCache] = useState<Map<string, CachedTranslation>>(
    () => translationCache.get(postId) || new Map()
  );

  const getCached = useCallback(
    (targetLanguage: string): CachedTranslation | null => {
      const postCache = translationCache.get(postId);
      return postCache?.get(targetLanguage) || null;
    },
    [postId]
  );

  const setCached = useCallback(
    (targetLanguage: string, title: string, content: string) => {
      let postCache = translationCache.get(postId);
      if (!postCache) {
        postCache = new Map();
        translationCache.set(postId, postCache);
      }
      const entry: CachedTranslation = { title, content, targetLanguage };
      postCache.set(targetLanguage, entry);
      setCache(new Map(postCache));
    },
    [postId]
  );

  const hasCached = useCallback(
    (targetLanguage: string): boolean => {
      return translationCache.get(postId)?.has(targetLanguage) || false;
    },
    [postId]
  );

  return { getCached, setCached, hasCached };
}
