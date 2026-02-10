-- =====================================================
-- Survey Versioning: preservar respostas ao editar questionário
-- =====================================================

-- Adicionar versão ao questionário
ALTER TABLE pesquisas ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;

-- Adicionar versão às perguntas (para manter perguntas de versões anteriores)
ALTER TABLE perguntas ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;

-- Adicionar versão aos blocos
ALTER TABLE blocos_perguntas ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;

-- Registrar em qual versão do questionário a resposta foi coletada
ALTER TABLE respostas ADD COLUMN IF NOT EXISTS pesquisa_versao INTEGER NOT NULL DEFAULT 1;

-- =====================================================
-- Proteger coletas ao excluir entrevistador:
-- Garantir que respostas.entrevistador_id -> SET NULL (já existe via FK)
-- A edge function delete-user será atualizada para NÃO deletar respostas.
-- =====================================================
