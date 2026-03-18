CREATE TABLE public.coaching_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('profile_review', 'growth_sprint')),
  preferred_times TEXT,
  focus_areas TEXT,
  assessment_summary JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coaching requests" ON public.coaching_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coaching requests" ON public.coaching_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
