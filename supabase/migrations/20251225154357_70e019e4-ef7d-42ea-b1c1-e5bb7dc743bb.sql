-- Enable realtime payloads for Chain Reaction multiplayer tables

-- Ensure full row data is available for UPDATE events
ALTER TABLE public.chain_reaction_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chain_reaction_moves REPLICA IDENTITY FULL;

-- Add tables to realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'chain_reaction_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chain_reaction_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'chain_reaction_moves'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chain_reaction_moves;
  END IF;
END $$;
