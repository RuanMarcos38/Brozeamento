# JR Bronzeamento — estado da produção

Site: https://r2rmarketingdigital-bronzeamento.ke4n49.easypanel.host/
Painel: https://r2rmarketingdigital-bronzeamento.ke4n49.easypanel.host/admin

Concluído em 1 de novembro de 2026:
- Frontend, API e worker publicados no App bronzeamento.
- PostgreSQL 17 dedicado bronzeamento-db, sem reutilização de bancos de outros serviços.
- HTTPS e encaminhamento para porta interna 3000.
- Migrations aplicadas; backend respondeu status ok.
- Primeiro administrador criado pelo titular e login verificado.
- Preços cadastrados: sessão R$360; três sessões R$972; cinco R$1530.
- Atendimento das 08h às 21h nos sete dias da semana, conforme informado pelo usuário.
- Backup diário local habilitado, retenção de sete cópias; primeira execução concluída com sucesso. A restauração não foi testada no banco real.
- CI da versão de primeiro acesso aprovado.

Pendências que impedem declarar a operação comercial completa:
- Aplicação exclusiva JR Bronzeamento criada no Mercado Pago pelo titular. URLs de webhook de teste e produção salvas para o backend da JR. Credenciais de teste e assinatura foram acessadas pela interface oficial, sem versionar valores. A ativação das credenciais produtivas aguarda o aceite e o CAPTCHA do titular. Nenhuma cobrança foi feita.
- Credenciais e calendário oficial da JR no Google Calendar ainda não configurados no backend. O conector do chat não fornece credenciais reutilizáveis pelo servidor.
- E-mail transacional ainda não configurado.
- Conferência final da duração/validade, políticas comerciais, cuidados e contato público de privacidade.
- Ativação do catálogo e homologação externa dos pagamentos, webhooks e sincronizações.

PAYMENT_MODE permanece disabled e CALENDAR_REQUIRED true. Não foi publicada a versão de simulação local. Não há senha de administrador, chave de API ou token privado neste relatório.

O portal sinaliza descontinuação futura da API de Preferences. A integração atual usa essa API ainda disponível; planejar a migração para Orders conforme o cronograma oficial.
