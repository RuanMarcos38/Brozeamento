# R&R Bronzeamento — auditoria de preservação e plano de implantação
Data: 2026-11-07
Branch de trabalho: `feat/rr-masculino-anamnese-franquias-monitoramento`
Base: `codex/jr-agendamento-plataforma` (`628c9c8656925f0389c1cc4ad504c3d52dbc7ae2`)

## Evidências verificadas
- `main` contém apenas `.gitignore` e `README.md`. NÃO é a fonte completa do site publicado.
- O PR #1 está aberto como rascunho; a branch associada possui implementação Node.js, PostgreSQL, API HTTP, worker, migrations, frontend, painel administrativo e testes.
- O site público exibe sessão avulsa de R$ 360, pacote de 3 por R$ 972 e de 5 por R$ 1.530, checkout Mercado Pago, reserva temporária de 10 minutos, início de horários a cada 2 horas e agenda que ainda não permite selecionar profissionais separados. NÃO alterar esses dados ou prazos sem homologação.
- `docs/implantacao-real.md` registra aplicação no EasyPanel e PostgreSQL dedicado `bronzeamento-db`, agenda exclusivamente interna, backups diários com retenção de 7 cópias e restauração não testada. Essas declarações são da documentação anterior, NÃO foram verificadas na infraestrutura nesta auditoria.
- A branch de código ainda documenta a marca anterior como JR em diversos locais. Tratar normalização de nome com cautela; não substituir nomes por busca e troca cega.
- Leitura dos painéis privados de EasyPanel e Hostinger no navegador conectado não foi autorizada pela extensão (permissão do host indisponível). Portanto o hash/deploy em produção, esquema real e integridade de backups permanecem NÃO verificados.

## Bloqueios mandatórios antes de merge/deploy
1. Obter inventário somente leitura do serviço de produção: imagem/commit, variáveis (apenas nomes, sem valores), versão de aplicação, rotas, worker, migrations e banco de dados; comparar com a branch.
2. Fazer snapshot de arquivos, banco e configurações; testar restauração em ambiente separado; nunca reutilizar banco de outro negócio.
3. Inspecionar agendamentos reais e IDs de profissionais; mapear compatibilidade de `staff`, `resources`, `services`, `business_hours`, `bookings` e `occupied_minutes`.
4. Confirmar catálogo, estado dos pagamentos e política de reserva, com atenção à discrepância entre os 10 minutos observados no site e os 60 minutos documentados no repositório.
5. Executar testes unitários, API, concorrência, permissões, LGPD, pagamentos de sandbox, responsividade e rollback em homologação.

## Estratégia sem duplicação
### Atendimento masculino e feminino
Reutilizar `staff` e `resources`. Vincular cada serviço/recurso a seu profissional; migrar dados existentes sem trocar IDs. Criar Ruan Marcos com agenda domiciliar masculina de 60 minutos como configuração inicial, sem inserir disponibilidades comerciais presumidas. Proteger concorrência via `occupied_minutes` e transações. Só ajustar a interface de reserva depois de mapear as APIs existentes.

### Monitoramento em tempo real
Manter o dashboard de reservas de `src/analytics.js`. Adicionar eventos mínimos e agregados por sessão pseudônima, com consentimento para analytics não essenciais, expiração automática, retenção parametrizável e SSE/polling conforme infraestrutura. Nunca coletar campos da anamnese, segredos ou dados de cartão.

### Anamnese
Adicionar armazenamento segregado de dados sensíveis com criptografia, permissões explícitas e log de acesso; vincular ao booking/profissional existentes. Exigir revisão humana; consentimento de dados de saúde separado de marketing; PDF e versionamento dos termos; retenção documentada. Revisão por profissional qualificado antes de disponibilizar ao público.

### Franquias
Criar leads/etapas/histórico/tarefas com acesso comercial restrito. Formulário de interesse sem alegar oferta formal de franquia; validação jurídica da Lei 13.966/2019 antes de oferta comercial.

### Segurança e compatibilidade
Não versionar segredos ou dados pessoais reais. Migrations idempotentes e aditivas, com plano de reversão documentado. API com autorização por recurso e por papel, CSRF/rate-limit, proteção de exportação, backups e auditoria. Nenhuma publicação automática antes dos gates acima.

## Estado efetivo deste trabalho
- Auditoria de repositório e leitura do site público: **realizadas parcialmente**.
- Branch isolada para implementação: **criada**.
- Comparação com infraestrutura, backup/restauração: **pendentes**, sem acesso confirmado.
- Funcionalidades novas, testes de implementação e publicação: **não executados**.
- Produção: **não alterada**.
