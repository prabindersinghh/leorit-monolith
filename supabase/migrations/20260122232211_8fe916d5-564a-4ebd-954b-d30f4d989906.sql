-- Create system_logs table for comprehensive platform event logging
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('buyer', 'manufacturer', 'admin', 'system')),
  actor_id UUID,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'payment', 'qc', 'user', 'dispute', 'auth', 'system')),
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX idx_system_logs_event_type ON public.system_logs (event_type);
CREATE INDEX idx_system_logs_entity_id ON public.system_logs (entity_id);
CREATE INDEX idx_system_logs_actor_id ON public.system_logs (actor_id);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all system logs"
ON public.system_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert logs (system needs to log events)
CREATE POLICY "System can insert logs"
ON public.system_logs
FOR INSERT
WITH CHECK (true);

-- Add onboarding_completed flag to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_type TEXT CHECK (onboarding_type IN ('buyer', 'manufacturer'));

-- Enable realtime for system_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;