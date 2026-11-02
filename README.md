# JR Bronzeamento

Plataforma de agendamento em Node.js 24 e PostgreSQL 17, construída a partir do HTML fornecido. O original está preservado integralmente em `backups/JR_Bronzeamento_original.html`. A homepage mantém as imagens WebP incorporadas, cores, tipografia, composição, conteúdo e navegação; o formulário foi adicionado à seção de agendamento. Não há dados comerciais inventados nem serviços ativos por padrão.

**Estado:** implementação para revisão e homologação. Não publicada e sem cobranças reais. Mercado Pago, Google Calendar e e-mail precisam de credenciais próprias e testes externos. Testes locais usam um gateway simulado exclusivamente nas fixtures de teste; o servidor normal nunca simula aprovação.

## Recursos

- Horários de início de hora em hora, fuso America/Sao_Paulo, duração e intervalo por serviço, recursos independentes e bloqueios.
- Reserva temporária de 60 minutos, impedimento de sobreposição no PostgreSQL, confirmação somente pela API do gateway, reconciliação e expiração no worker.
- Checkout Pro hospedado (Pix/cartão conforme habilitação da conta); QR Code e copia e cola aparecem no Mercado Pago. Não há coleta de cartão no site.
- Webhook autenticado com HMAC, comparação em tempo constante, janela contra replay, idempotência e validação de valor, moeda, recebedor, referência e ambiente.
- Pagamentos atrasados, duplicados, cancelamentos, reembolsos integrais e chargebacks; conflitos ficam no painel para revisão.
- Google Calendar via OAuth com refresh token: free/busy, eventos somente após confirmação, IDs determinísticos, retries, reagendamento e cancelamento. Compromissos externos não são sobrescritos.
- Pacotes com quantidade/validade configuráveis, compra vinculada ao primeiro atendimento, saldo e consumo transacional; cancelamento restaura crédito uma vez. Cliente usa seu link privado para reservar com os créditos.
- Painel `/admin`: dashboard, agenda com períodos diário/semanal/mensal, clientes e histórico, serviços/pacotes, recursos/profissionais, financeiro/CSV, atendimento e pagamento presencial, configurações e auditoria.
- Sessões privadas com senha scrypt, cookies HttpOnly/SameSite, CSRF, permissões owner/manager/viewer e rate limiting persistido no banco.
- E-mail transacional via Resend, filas persistidas, confirmação e lembrete opcional; link privado sem dados pessoais na URL. WhatsApp automático não foi ativado.

## Instalação local

1. Instale Node.js 24 e PostgreSQL 17, ou Docker com Compose. Use banco exclusivo deste projeto.
2. Copie `.env.example` para `.env`. Ajuste `DATABASE_URL` e `APP_URL` (origem exata, sem barra final). Nunca versione segredos.
3. Execute `npm ci --ignore-scripts`, depois `npm run migrate`.
4. Defina temporariamente `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mínimo 14 caracteres) e opcionalmente `ADMIN_ROLE=owner`; execute `npm run admin:create`. Remova essas variáveis após criar a conta. Não há senha padrão.
5. Execute `npm start` e, em outro processo, `npm run worker`.
6. Abra `http://localhost:3000`. Entre em `/admin` para cadastrar recursos, dias/horários reais, serviços, preços, duração, cuidados e políticas. Os valores comerciais do briefing não são publicados automaticamente.

Com Docker: configure `POSTGRES_PASSWORD` e `DATABASE_URL=postgresql://jr:SENHA@db:5432/jr` em `.env`, rode `docker compose up -d db`, `docker compose run --rm web node scripts/migrate.js`, crie o administrador com o script e depois `docker compose up -d web worker`. A porta web é ligada somente ao loopback. Coloque um proxy HTTPS na frente para homologação externa e produção. Não exponha PostgreSQL publicamente.

## Integrações

### Mercado Pago (teste primeiro)

- Crie/configure a aplicação comercial em Suas Integrações. Configure o tópico `payment` e a URL HTTPS `APP_URL/api/webhooks/mercadopago`.
- Preencha `PAYMENT_MODE=test`, `MP_ACCESS_TOKEN`, `MP_COLLECTOR_ID` e `MP_WEBHOOK_SECRET` usando o mesmo ambiente/recebedor. Os nomes de prefixos dos tokens não são usados como prova do ambiente; cada pagamento consultado tem `live_mode` validado.
- Configure domínio HTTPS em `APP_URL`, use contas/compradores e meios de teste indicados pelo Mercado Pago. Valide Pix e cartão, assinatura real do webhook, reprovação, reembolso, atraso e expiração.
- O navegador recebe apenas a URL do checkout. Retornar à página de reserva nunca confirma pagamento. O worker consulta a API antes de liberar reservas vencidas; falha de rede mantém o bloqueio até a conciliação.
- `PAYMENT_MODE=disabled` é o padrão. Produção exige também `ALLOW_LIVE_PAYMENTS=true`, que **não deve ser ativado sem aprovação expressa da JR após homologação**. Ambientes de teste e produção precisam de bancos e segredos separados.

### Google Calendar

- Habilite Calendar API no projeto Google da empresa. Configure OAuth 2.0 com consentimento válido e acesso offline. A obtenção do refresh token é feita pelo fluxo oficial autorizado do Google, fora do HTML público.
- Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`. Use o escopo mínimo que permita consultar disponibilidade e gerenciar eventos nesse calendário (por exemplo calendar.events e calendar.events.freebusy, conforme autorização da conta).
- `CALENDAR_REQUIRED=true` fecha a disponibilidade se a integração estiver ausente ou falhar. `false` permite operar só com a agenda interna e deve ser uma decisão explícita do estabelecimento.
- Confirme horários reais, título/nome, reagendamento, cancelamento, retries e conflitos externos. O banco é a fonte principal. Em caso de credencial revogada, autorize novamente, substitua o refresh token privado e reinicie web/worker; a fila retoma automaticamente. O painel mostra pendências e erros de sincronização.

### E-mail

- Conecte um domínio autorizado ao Resend, configure SPF/DKIM/DMARC e um remetente real. Defina `EMAIL_API_KEY` e `EMAIL_FROM`.
- Gere `EMAIL_LOOKUP_SECRET` aleatório com pelo menos 32 caracteres; não o altere sem planejar a rotação dos links privados.
- Envio depende de reserva confirmada. A chave de idempotência é estável por notificação; a fila repete falhas com backoff. Como o provedor tem janela própria de idempotência, retries fora dessa janela podem reenviar e-mails e devem ser acompanhados operacionalmente.
- Lembretes são opcionais por cliente e por configuração administrativa. Não há marketing ou envio automático por WhatsApp. Configure alertas de entrega/bounce no provedor e revise as pendências da fila.

## Operação e proteção de dados

Defina antes da abertura: serviços e técnicas oferecidos, preços aprovados, políticas de cancelamento/reembolso, endereço e contato real de privacidade, cuidados aprovados, dias/horários, capacidade por profissional/equipamento e período de retenção. A reserva pública exige política e contato preenchidos. A página de privacidade deve ser revisada pela empresa conforme seus processos reais.

Um recurso equivale a uma unidade de capacidade: cadastre unidades distintas para equipamentos/profissionais que possam atender simultaneamente. O mesmo calendário Google é consultado como restrição complementar; múltiplos recursos compartilham essa restrição, de forma conservadora. A sincronização externa é eventual, pois não existe transação atômica entre PostgreSQL e Google; colisões externas geram pendência e revisão, sem desfazer pagamento automaticamente.

Guarde links privados como credenciais de consulta. O servidor guarda hashes e só fornece a reserva autorizada pelo token. Não indexe `/admin`, `/api` e `/reserva`. Não há endereço/cidade inventados para SEO local; configure domínio/cidade/endereço antes de gerar sitemap e dados locais definitivos.

Veja [Deploy e rollback](docs/operacao.md), [Homologação](docs/homologacao.md) e o [briefing](docs/requisitos.md).

## Testes

`npm test` executa testes de integração SQL com PostgreSQL local via PGlite, testes da API, segurança e persistência em disco. Para testar concorrência com conexões reais defina `TEST_DATABASE_URL` apontando para um PostgreSQL **exclusivo de teste**. A suíte cria schemas temporários e os remove após os testes. O workflow de CI usa PostgreSQL 17 para executar esses cenários.

Testes simulados não validam conta comercial, autorização Google, Pix real de teste, entregabilidade de e-mail, regras da hospedagem ou aprovação de políticas. Não use dados de clientes reais nas fixtures.

## Documentação oficial consultada

- [Mercado Pago: preferências](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post)
- [Mercado Pago: webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications)
- [Google Calendar: freebusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)
- [Google Calendar: events.insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)


## Testar sem credenciais externas

Execute `npm ci --ignore-scripts` e `npm run demo`, depois abra http://127.0.0.1:3180/teste/inicio. O ambiente usa PGlite persistente em `dados-teste/`, um usuário de demonstração com senha aleatória e um simulador local de pagamentos. As instruções e o acesso ao painel aparecem na página inicial de teste. Apenas conexões de loopback são aceitas. Nenhuma cobrança, mensagem ou sincronização externa é realizada. O servidor normal em `npm start` não usa esses simuladores. Não publicar o modo demo.

O pacote portátil para Windows inclui runtime e dependências; extraia tudo e execute `INICIAR_TESTE.cmd`. Ele abre a página de instruções automaticamente. Não compartilhe a pasta `dados-teste`, que contém a senha e os registros do seu teste.

## Agenda interna escolhida pela JR

Na produção da JR, `CALENDAR_MODE=internal` mantém a disponibilidade, os bloqueios, as reservas e o acompanhamento exclusivamente no PostgreSQL e no painel. Nenhum OAuth Google é necessário e nenhuma chamada ao Google Calendar é feita nesse modo, mesmo que existam credenciais antigas. Reservas temporárias de 60 minutos, fuso America/Sao_Paulo, duração e intervalo por serviço e proteção contra sobreposição continuam valendo. Filas antigas de sincronização são encerradas sem editar eventos externos. A regra de confirmação do pagamento permanece independente da agenda.
