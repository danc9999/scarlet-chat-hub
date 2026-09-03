DROP POLICY IF EXISTS "settings_operator" ON public.settings;

-- Operators can read and write settings
CREATE POLICY "settings_operator_write" ON public.settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'operator'));

-- All authenticated users can READ settings (needed for AI generation)
CREATE POLICY "settings_read_all" ON public.settings
  FOR SELECT TO authenticated
  USING (true);

-- Restore execute permission on has_role for authenticated users only
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;