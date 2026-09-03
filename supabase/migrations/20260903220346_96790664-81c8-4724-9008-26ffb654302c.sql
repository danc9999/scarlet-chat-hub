CREATE TYPE public.app_role AS ENUM ('operator','creator');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  role public.app_role NOT NULL DEFAULT 'creator',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'creator'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'New subscriber',
  platform text,
  segment text NOT NULL DEFAULT 'lurker',
  sequence_day integer NOT NULL DEFAULT 1,
  total_spent numeric NOT NULL DEFAULT 0,
  last_ppv numeric NOT NULL DEFAULT 0,
  job text,
  location text,
  relationship text,
  interests text,
  preferences text,
  notes text,
  rapport jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscribers TO authenticated;
GRANT ALL ON public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscribers_all_auth" ON public.subscribers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  sent_by text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  imported boolean NOT NULL DEFAULT false
);
CREATE INDEX messages_subscriber_idx ON public.messages(subscriber_id, timestamp);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all_auth" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.persona (
  id integer PRIMARY KEY DEFAULT 1,
  system_prompt text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.persona TO authenticated;
GRANT ALL ON public.persona TO service_role;
ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persona_operator" ON public.persona FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'operator')) WITH CHECK (public.has_role(auth.uid(),'operator'));
INSERT INTO public.persona (id, system_prompt) VALUES (1, '');

CREATE TABLE public.settings (
  id integer PRIMARY KEY DEFAULT 1,
  openrouter_api_key text,
  default_model text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_operator" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'operator')) WITH CHECK (public.has_role(auth.uid(),'operator'));
INSERT INTO public.settings (id, default_model) VALUES (1, 'openai/gpt-5.4-mini');

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.subscribers REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;