-- Allow authenticated users to insert notifications for themselves
CREATE POLICY "Users can create notifications for themselves"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = target_user_id AND is_global = false);