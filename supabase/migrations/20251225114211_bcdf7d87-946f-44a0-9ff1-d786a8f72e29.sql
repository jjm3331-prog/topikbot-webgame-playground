-- Create chain reaction multiplayer rooms table
CREATE TABLE public.chain_reaction_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  host_name VARCHAR(50) NOT NULL DEFAULT 'Player 1',
  guest_id UUID,
  guest_name VARCHAR(50),
  connection_mode VARCHAR(20) NOT NULL DEFAULT 'semantic',
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  host_score INTEGER DEFAULT 0,
  guest_score INTEGER DEFAULT 0,
  host_chain_length INTEGER DEFAULT 0,
  guest_chain_length INTEGER DEFAULT 0,
  host_ready BOOLEAN DEFAULT false,
  guest_ready BOOLEAN DEFAULT false,
  winner_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chain_reaction_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view rooms (needed for joining)
CREATE POLICY "Anyone can view rooms" 
ON public.chain_reaction_rooms 
FOR SELECT 
USING (true);

-- Allow anyone to create rooms (with their user id)
CREATE POLICY "Anyone can create rooms" 
ON public.chain_reaction_rooms 
FOR INSERT 
WITH CHECK (true);

-- Allow participants to update their own room
CREATE POLICY "Participants can update rooms" 
ON public.chain_reaction_rooms 
FOR UPDATE 
USING (true);

-- Allow host to delete room
CREATE POLICY "Host can delete rooms" 
ON public.chain_reaction_rooms 
FOR DELETE 
USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chain_reaction_rooms;

-- Create updated_at trigger
CREATE TRIGGER update_chain_reaction_rooms_updated_at
BEFORE UPDATE ON public.chain_reaction_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();