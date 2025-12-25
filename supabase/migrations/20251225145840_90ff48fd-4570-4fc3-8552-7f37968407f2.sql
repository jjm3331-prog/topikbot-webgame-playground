-- Enable FULL replica identity for realtime to work properly
ALTER TABLE public.chain_reaction_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chain_reaction_moves REPLICA IDENTITY FULL;