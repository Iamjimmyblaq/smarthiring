ALTER TABLE public.interview_sessions
ADD COLUMN IF NOT EXISTS proctoring jsonb;