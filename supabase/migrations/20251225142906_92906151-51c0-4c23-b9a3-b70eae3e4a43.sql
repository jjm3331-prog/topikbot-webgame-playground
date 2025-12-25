-- Ensure realtime gets full row data on updates
ALTER TABLE public.chain_reaction_rooms REPLICA IDENTITY FULL;

-- Ensure table is in realtime publication (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chain_reaction_rooms;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;