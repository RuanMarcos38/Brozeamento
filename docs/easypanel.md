# Implantação no Easypanel — bronzeamento

Destino solicitado: projeto r2rmarketingdigital, App bronzeamento. O painel não pôde ser inspecionado nesta sessão por falha das ferramentas de controle do navegador. Nenhuma configuração da VPS foi alterada.

## Configuração preparada

Source GitHub: RuanMarcos38/Brozeamento, branch contendo esta versão, Build Path /. Builder Dockerfile, caminho Dockerfile.easypanel. A porta interna é 3000. Este Dockerfile exclui o modo demo e os bancos locais do ambiente portátil. src/easypanel.js inicia a API, frontend e worker no mesmo serviço contínuo.

Criar ou confirmar PostgreSQL exclusivo desta aplicação, com armazenamento persistente e backup. Não usar bancos de outros serviços. Guardar snapshot da configuração e backup do banco antes de alterar o serviço existente.

Definir no ambiente privado: NODE_ENV=production, PORT=3000, APP_URL com domínio HTTPS real sem barra final, DATABASE_URL do banco exclusivo. RUN_MIGRATIONS=true aplica as migrations transacionais ao iniciar (primeiro deploy autorizado); depois pode ser desativado. Se houver worker separado, escolher somente uma estratégia operacional e revisar as réplicas.

Definir MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, MP_COLLECTOR_ID e PAYMENT_MODE conforme o ambiente comercial homologado. ALLOW_LIVE_PAYMENTS somente após a aprovação de ativação. Definir as credenciais OAuth Google e calendário oficial, EMAIL_FROM, EMAIL_API_KEY e EMAIL_LOOKUP_SECRET. Nunca colocar segredos no GitHub ou no HTML.

Criar o administrador pelo script scripts/admin.js com credenciais privadas temporárias; remover ADMIN_PASSWORD do ambiente depois. Cadastrar somente serviços, preços, duração, horários, capacidade, políticas e contato de privacidade reais e aprovados.

Antes de publicar: validar build, migração, conexão do banco, login, rota pública, agendamento concorrente, worker, integração de pagamento de teste, webhook autenticado, calendário e e-mail. Não inserir agendamentos fictícios no calendário real e não fazer cobranças reais apenas para testar.

Ainda necessários: acesso operacional ao painel, confirmação do domínio e banco, dados comerciais definitivos, credenciais externas autorizadas e homologação dos fluxos. Este arquivo é preparação de implantação, não prova de deploy realizado.
