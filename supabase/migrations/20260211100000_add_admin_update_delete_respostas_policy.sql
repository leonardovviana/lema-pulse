-- Add missing UPDATE and DELETE policies for respostas so admins can merge/unify answers
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can update all responses" ON public.respostas;
    DROP POLICY IF EXISTS "Admins can delete all responses" ON public.respostas;
END $$;

CREATE POLICY "Admins can update all responses"
ON public.respostas FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all responses"
ON public.respostas FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
