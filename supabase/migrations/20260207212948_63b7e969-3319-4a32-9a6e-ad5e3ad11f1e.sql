-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'entrevistador');

-- 2. Create user_roles table (security best practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create surveys (pesquisas) table
CREATE TABLE public.pesquisas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    ativa BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create questions (perguntas) table
CREATE TABLE public.perguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pesquisa_id UUID REFERENCES public.pesquisas(id) ON DELETE CASCADE NOT NULL,
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('text', 'radio', 'checkbox', 'select')),
    opcoes TEXT[], -- Array of options for radio/checkbox/select
    obrigatoria BOOLEAN NOT NULL DEFAULT false,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create survey responses (respostas) table
CREATE TABLE public.respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pesquisa_id UUID REFERENCES public.pesquisas(id) ON DELETE CASCADE NOT NULL,
    entrevistador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    respostas JSONB NOT NULL DEFAULT '{}',
    audio_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    synced BOOLEAN NOT NULL DEFAULT true,
    client_id TEXT, -- For offline sync deduplication
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create daily stats table for performance tracking
CREATE TABLE public.metas_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrevistador_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    meta INTEGER NOT NULL DEFAULT 10,
    concluidas INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (entrevistador_id, data)
);

-- 8. Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_diarias ENABLE ROW LEVEL SECURITY;

-- 9. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 10. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 11. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 13. RLS Policies for pesquisas
CREATE POLICY "Anyone can view active surveys"
ON public.pesquisas FOR SELECT
TO authenticated
USING (ativa = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage surveys"
ON public.pesquisas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 14. RLS Policies for perguntas
CREATE POLICY "Anyone can view questions of active surveys"
ON public.perguntas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pesquisas
    WHERE pesquisas.id = perguntas.pesquisa_id
    AND (pesquisas.ativa = true OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Admins can manage questions"
ON public.perguntas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 15. RLS Policies for respostas
CREATE POLICY "Entrevistadores can view their own responses"
ON public.respostas FOR SELECT
TO authenticated
USING (auth.uid() = entrevistador_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Entrevistadores can insert their responses"
ON public.respostas FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = entrevistador_id);

CREATE POLICY "Admins can view all responses"
ON public.respostas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 16. RLS Policies for metas_diarias
CREATE POLICY "Users can view their own goals"
ON public.metas_diarias FOR SELECT
TO authenticated
USING (auth.uid() = entrevistador_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own goals"
ON public.metas_diarias FOR ALL
TO authenticated
USING (auth.uid() = entrevistador_id)
WITH CHECK (auth.uid() = entrevistador_id);

CREATE POLICY "Admins can manage all goals"
ON public.metas_diarias FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 17. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 18. Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pesquisas_updated_at
    BEFORE UPDATE ON public.pesquisas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 19. Create function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, nome)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
    
    -- Default role is entrevistador
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'entrevistador');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 20. Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 21. Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', false);

-- 22. Storage policies for audio recordings
CREATE POLICY "Users can upload their own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'audio-recordings' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.has_role(auth.uid(), 'admin')
    )
);

CREATE POLICY "Admins can view all audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'audio-recordings' 
    AND public.has_role(auth.uid(), 'admin')
);

-- 23. Create index for better query performance
CREATE INDEX idx_respostas_pesquisa_id ON public.respostas(pesquisa_id);
CREATE INDEX idx_respostas_entrevistador_id ON public.respostas(entrevistador_id);
CREATE INDEX idx_respostas_created_at ON public.respostas(created_at DESC);
CREATE INDEX idx_perguntas_pesquisa_id ON public.perguntas(pesquisa_id);
CREATE INDEX idx_metas_diarias_data ON public.metas_diarias(data);