-- Drop policies that depend on has_role / app_role
DROP POLICY IF EXISTS "persona_operator" ON public.persona;
DROP POLICY IF EXISTS "settings_operator_write" ON public.settings;
DROP POLICY IF EXISTS "settings_read_all" ON public.settings;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Swap enum type
CREATE TYPE public.app_role_new AS ENUM ('admin', 'user');

ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.app_role_new
  USING (CASE WHEN role::text = 'operator' THEN 'admin' ELSE 'user' END)::public.app_role_new;

DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user'::public.app_role;

-- Recreate helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin','operator') THEN 'admin'::public.app_role
      ELSE 'user'::public.app_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Policies
CREATE POLICY "settings_read_all" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "persona_read_all" ON public.persona
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "persona_admin_write" ON public.persona
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));