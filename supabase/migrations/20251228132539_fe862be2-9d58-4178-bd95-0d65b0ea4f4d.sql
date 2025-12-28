-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated 
USING (id = auth.uid());

-- Admins can view all profiles (for user management page)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));