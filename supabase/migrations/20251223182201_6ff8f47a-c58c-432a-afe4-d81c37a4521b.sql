-- Allow admins to insert notifications
CREATE POLICY "Admins can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete notifications
CREATE POLICY "Admins can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update notifications
CREATE POLICY "Admins can update notifications" 
ON public.notifications 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));