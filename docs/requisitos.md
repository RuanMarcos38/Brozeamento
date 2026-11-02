# PROMPT MASTER — JR BRONZEAMENTO
## Transformação do site institucional em plataforma inteligente de agendamento e pagamento

### 1. PAPEL DA EQUIPE

Atue como uma equipe sênior de alta performance, composta por:

- Arquiteto de software SaaS.
- Desenvolvedor Full Stack sênior.
- Especialista em WordPress e Elementor.
- Designer UX/UI especializado em sites premium.
- Especialista em integração Google Calendar.
- Especialista em gateways de pagamento e Pix.
- Engenheiro de banco de dados PostgreSQL.
- Especialista em segurança, LGPD, SEO técnico e testes de software.

**OBJETIVO:** transformar o site atual JR Bronzeamento em uma plataforma comercial completa, mantendo sua aparência de site institucional elegante, mas incorporando funcionalidades reais de agendamento, pagamento automático, gestão de clientes e administração.

Utilize obrigatoriamente o arquivo HTML anexado como referência e base do projeto.

### 2. REGRA ABSOLUTA — PRESERVAR O PROJETO ORIGINAL

Não recriar o site desnecessariamente.

É obrigatório:

- Manter a identidade visual JR Bronzeamento.
- Preservar cores, tipografia, fotografias, composição, espaçamentos e responsividade aprovados.
- Preservar a copywriting e a estrutura de SEO, aprimorando somente quando necessário.
- Manter as imagens existentes funcionando.
- Não alterar outros sites, projetos, bancos de dados ou credenciais.
- Realizar backup antes de qualquer alteração.
- Não substituir conteúdos reais por dados fictícios.
- Integrar o sistema de agendamento à experiência atual, sem criar uma interface visualmente poluída.

O cliente deverá perceber que está navegando em um site profissional de bronzeamento, e não em um sistema administrativo.

### 3. ARQUITETURA DA SOLUÇÃO

Desenvolver a solução com as seguintes camadas:

**Frontend público**

Site JR Bronzeamento, responsivo, com calendário, serviços, horários, cadastro simples e checkout.

**Backend**

API segura responsável por disponibilidade, reservas, pagamentos, autenticação, cancelamentos e integrações.

**Banco de dados**

PostgreSQL, preferencialmente com Supabase, se disponível e autorizado.

**Administração**

Painel privado com login e senha, acessível somente a usuários autorizados.

**Integrações**

- Google Calendar API.
- Mercado Pago para Pix e cartão.
- E-mail transacional.
- WhatsApp oficial, se houver conexão e autorização.

A arquitetura deverá ser compatível com a hospedagem disponível, verificando previamente se o ambiente suporta backend, jobs agendados, HTTPS e webhooks.

Se o site permanecer no WordPress, implementar os recursos como plugin próprio ou integração desacoplada, evitando modificar arquivos do núcleo do WordPress ou depender de código inseguro no Elementor.

### 4. SISTEMA DE AGENDAMENTO ONLINE

Criar uma seção intitulada:

**Agende seu bronzeamento**

Texto de apoio:

"Escolha o melhor dia e horário para viver sua experiência JR Bronzeamento. Agende online, com praticidade e segurança."

O cliente deverá seguir estas etapas:

1. Selecionar o serviço desejado.
2. Visualizar o valor do atendimento.
3. Selecionar uma data no calendário.
4. Visualizar os horários efetivamente disponíveis.
5. Selecionar um horário.
6. Informar nome, WhatsApp e e-mail.
7. Revisar os dados da reserva.
8. Iniciar o pagamento.
9. Receber confirmação após aprovação do pagamento.

Exibir informações claras sobre duração, preço, políticas de agendamento e cuidados do serviço.

Não exigir criação de senha para realizar um agendamento.

### 5. CALENDÁRIO COM HORÁRIOS DE UMA EM UMA HORA

A agenda deverá apresentar horários em intervalos de 60 minutos.

Exemplo ilustrativo:

- 08:00
- 09:00
- 10:00
- 11:00
- 12:00
- 13:00
- 14:00
- 15:00
- 16:00
- 17:00
- 18:00

Os dias e horários reais de atendimento serão configuráveis no painel administrativo.

Regras obrigatórias:

- Respeitar o fuso horário America/Sao_Paulo.
- Impedir agendamento em datas passadas.
- Permitir bloqueios de feriados, férias e intervalos.
- Configurar duração de cada serviço.
- Permitir intervalos entre atendimentos.
- Impedir reservas simultâneas no mesmo recurso.
- Exibir apenas horários realmente disponíveis.
- Atualizar a disponibilidade quando houver novas reservas ou cancelamentos.
- Respeitar a capacidade de atendimento por profissional ou equipamento.

O exemplo acima não deverá ser tratado como horário comercial definitivo da JR.

### 6. RESERVA TEMPORÁRIA DE 60 MINUTOS

**Esta é uma regra obrigatória e crítica do projeto.**

Quando a cliente selecionar o horário e iniciar o checkout, o sistema deverá criar uma reserva temporária com validade de 60 minutos.

Estados mínimos da reserva:

- Disponível.
- Aguardando pagamento.
- Confirmado.
- Expirado.
- Cancelado.
- Reembolsado, quando aplicável.
- Em análise ou conflito de pagamento, quando necessário.

Durante os 60 minutos, o horário deverá permanecer indisponível para outras clientes.

Exibir no checkout um contador regressivo com o prazo restante.

Após o vencimento:

1. Consultar o estado do pagamento no gateway.
2. Reconciliar pagamentos confirmados dentro do prazo que ainda não tenham sido processados localmente.
3. Se não existir pagamento elegível confirmado, expirar a reserva.
4. Liberar automaticamente o horário.
5. Atualizar a disponibilidade para todos os usuários.

A expiração deverá acontecer no servidor por job confiável, e nunca depender de a cliente manter o navegador aberto.

A interface poderá mostrar o contador, mas a hora oficial de vencimento deverá ser registrada e validada no backend.

**Condição de segurança:** se o pagamento for aprovado após a reserva expirar e o horário tiver sido ocupado por outra cliente, não confirmar duas reservas. Registrar o conflito e iniciar um fluxo administrativo de reagendamento ou reembolso.

### 7. PAGAMENTO ONLINE INTEGRADO

Implementar integração com Mercado Pago utilizando documentação oficial atualizada.

Formas de pagamento:

- Pix.
- Cartão de crédito.
- Outras modalidades, somente se habilitadas pela conta comercial.

O checkout deverá mostrar:

- Nome do serviço.
- Data e horário selecionados.
- Valor total.
- Identificação da reserva.
- Prazo para pagamento.
- Instruções de pagamento.

Para Pix, apresentar QR Code e código copia e cola, quando disponibilizados pela integração.

**Regra obrigatória:** nunca confirmar pagamento apenas porque a cliente voltou à página de sucesso.

A aprovação deve ser validada no servidor por meio da API do gateway, utilizando notificações webhook autenticadas.

Implementar:

- Verificação da origem dos webhooks.
- Idempotência de notificações.
- Controle de pagamentos duplicados.
- Tratamento de pagamentos recusados.
- Tratamento de pagamentos pendentes.
- Registro de reembolsos e estornos.
- Reconciliação automática.
- Separação entre credenciais de teste e produção.

Nunca armazenar dados brutos de cartões nem expor tokens secretos no HTML ou JavaScript público.

### 8. INTEGRAÇÃO COM GOOGLE CALENDAR

Integrar a agenda da JR Bronzeamento ao Google Calendar oficial do estabelecimento.

Utilizar OAuth 2.0 ou outro método oficialmente suportado e apropriado, com autorização válida.

**Regra fundamental:** criar o evento definitivo no Google Calendar somente após o pagamento ser confirmado.

O evento deverá conter:

- Identificação do agendamento.
- Serviço contratado.
- Nome da cliente.
- Horário de início.
- Horário de término.
- Status da reserva.
- Observações administrativas pertinentes.

Não incluir dados pessoais desnecessários na descrição do evento.

O sistema deverá:

- Consultar eventos ocupados antes de oferecer horários.
- Sincronizar novas reservas pagas.
- Atualizar eventos quando houver reagendamento.
- Cancelar ou ajustar eventos quando necessário.
- Evitar eventos duplicados.
- Armazenar o identificador do evento no banco de dados.
- Repetir sincronizações que falharem temporariamente.
- Registrar erros de conexão e permitir reconectar a conta.

O banco de dados será a fonte principal das reservas e a integração com Google Calendar deverá funcionar como sincronização complementar de disponibilidade.

Conflitos entre compromissos externos e reservas internas deverão ser tratados sem sobrescrever ou cancelar indevidamente agendamentos pagos.

### 9. PAINEL ADMINISTRATIVO JR BRONZEAMENTO

Desenvolver uma área privada com aparência profissional, organizada e responsiva.

Menu lateral:

**Dashboard**
- Agendamentos do dia.
- Agendamentos da semana.
- Faturamento confirmado.
- Pagamentos pendentes.
- Reservas expiradas.

**Agenda**
- Visualização diária, semanal e mensal.
- Horários livres e ocupados.
- Bloqueio manual de horários.
- Reagendamento administrativo.
- Cadastro de atendimento presencial.

**Clientes**
- Nome, e-mail e telefone.
- Histórico de agendamentos.
- Histórico financeiro.
- Status de atendimento.

**Serviços**
- Cadastrar e editar serviços.
- Definir preços.
- Definir duração.
- Ativar e desativar serviços.
- Criar pacotes e promoções.

**Financeiro**
- Pagamentos confirmados.
- Pagamentos pendentes.
- Reembolsos.
- Valor bruto.
- Taxas registradas.
- Receita líquida estimada.
- Exportação CSV.

**Configurações**
- Dias e horários de funcionamento.
- Feriados e bloqueios.
- Duração da reserva temporária.
- Credenciais de pagamento.
- Google Calendar.
- E-mails de notificação.
- Configurações de segurança.

Não expor informações financeiras ou pessoais na área pública.

### 10. SERVIÇOS E PREÇOS

Deixar os preços configuráveis no painel.

Utilizar inicialmente como referência comercial, sujeitos à aprovação:

- Bronzeamento a jato — R$ 159,90.
- Primeira sessão promocional — R$ 129,90.
- Pacote de 3 sessões — R$ 429,00.
- Pacote de 5 sessões — R$ 699,00.

Não publicar serviços ou técnicas que a JR não oferece.

Para os pacotes, criar controle de créditos, validade configurável e consumo de uma sessão por atendimento, evitando cobranças duplicadas.

### 11. EXPERIÊNCIA VISUAL

Manter a identidade premium existente.

A nova seção de agendamento deverá ter:

- Fundo creme ou branco.
- Detalhes em bronze e marrom.
- Tipografia elegante.
- Calendário visualmente limpo.
- Botões grandes e legíveis.
- Destaque discreto para datas e horários disponíveis.
- Feedback claro de erros e confirmações.
- Excelente usabilidade em dispositivos móveis.

Não criar dashboards, indicadores financeiros ou menus administrativos na homepage.

Utilizar modais somente quando realmente necessários.

Evitar excesso de ícones, animações, gradientes e efeitos artificiais.

### 12. COMUNICAÇÕES AUTOMÁTICAS

Após pagamento aprovado:

- Enviar confirmação por e-mail.
- Informar serviço, data e horário.
- Enviar identificação da reserva.
- Incluir orientações pré-atendimento aprovadas pela empresa.
- Oferecer opção segura de consultar o agendamento.

Criar lembretes automáticos opcionais 24 horas antes da sessão.

Para WhatsApp, utilizar apenas integração oficial e comunicação permitida, respeitando consentimento e modelos exigidos pela plataforma.

Nunca enviar confirmação de pagamento antes da aprovação efetiva.

### 13. SEGURANÇA E LGPD

Implementar:

- HTTPS obrigatório em produção.
- Autenticação segura dos administradores.
- Controle de permissões.
- Validação de entradas.
- Proteção contra SQL Injection e XSS.
- Proteção contra CSRF quando aplicável.
- Rate limiting.
- Logs de auditoria.
- Credenciais em variáveis de ambiente.
- Backups.
- Política de privacidade.
- Coleta mínima de informações pessoais.
- Tratamento adequado de exclusões e retenção de dados.

Garantir que uma cliente não consiga acessar reservas de outra pessoa.

### 14. SEO E PERFORMANCE

Preservar a estrutura SEO existente e aprimorar:

- Meta title e description.
- Hierarquia H1, H2 e H3.
- URLs amigáveis.
- Dados estruturados coerentes com os serviços reais.
- SEO local após confirmação da cidade e endereço.
- Sitemap e robots.txt.
- Open Graph.
- Imagens otimizadas em WebP ou AVIF.
- Lazy loading quando apropriado.
- Core Web Vitals.
- Acessibilidade e contraste.

As páginas privadas, checkouts individualizados e dados pessoais não devem ser indexados pelos buscadores.

### 15. MODELO DE BANCO DE DADOS

Criar migrations para entidades equivalentes a:

- users
- admin_roles
- customers
- services
- staff
- resources
- business_hours
- calendar_blocks
- bookings
- booking_holds
- payments
- payment_events
- packages
- customer_credits
- calendar_integrations
- notifications
- audit_logs

Implementar constraints, índices e transações atômicas para impedir reservas concorrentes.

A prevenção de conflitos deverá ser realizada no banco de dados e no backend, não apenas na interface.

### 16. TESTES OBRIGATÓRIOS

Executar testes automatizados e funcionais para:

1. Cliente reservar um horário livre.
2. Horário ficar bloqueado durante o checkout.
3. Segunda cliente tentar reservar o mesmo horário.
4. Pagamento Pix aprovado.
5. Pagamento recusado.
6. Reserva expirar após 60 minutos sem pagamento.
7. Horário ser liberado corretamente.
8. Pagamento atrasado após expiração.
9. Duas clientes tentarem pagar simultaneamente.
10. Webhook duplicado.
11. Falha temporária na integração Google Calendar.
12. Reagendamento administrativo.
13. Cancelamento e reembolso.
14. Agendamento por dispositivos móveis.
15. Proteção de áreas privadas.
16. Persistência dos dados após reinicialização do servidor.

Realizar os testes de pagamento inicialmente em ambiente sandbox, sem cobranças reais.

### 17. ENTREGA E PUBLICAÇÃO

Entregar:

- Site JR Bronzeamento com a identidade preservada.
- Calendário público funcional.
- Backend completo.
- Banco de dados com migrations.
- Integração de pagamentos.
- Integração com Google Calendar.
- Painel administrativo.
- Rotina de expiração de reservas.
- Notificações.
- Testes.
- Documentação de instalação.
- Variáveis de ambiente documentadas.
- Instruções de deploy e rollback.

Caso exista acesso autorizado ao ambiente, executar instalação, configuração e testes sem alterar outros projetos.

**Não publicar em produção nem ativar cobranças reais sem aprovação expressa.**

Nunca declarar uma integração funcional se não houver credenciais conectadas, testes executados e confirmação de funcionamento.

Se algum serviço externo depender de autenticação ou aprovação, registrar a dependência exata e deixar o restante implementado e testável.

### 18. RESULTADO FINAL ESPERADO

A JR Bronzeamento deverá possuir um site institucional premium com operação digital integrada.

A cliente acessa o site, escolhe o serviço, seleciona data e horário, realiza o pagamento e recebe confirmação.

O administrador controla horários, serviços, clientes, pagamentos e bloqueios em um painel privado.

A disponibilidade é atualizada automaticamente, o Google Calendar recebe os compromissos confirmados e reservas não pagas são liberadas após o prazo de 60 minutos.

**PRIORIDADE ABSOLUTA: entregar um sistema verdadeiramente funcional, seguro, responsivo e comercialmente utilizável, preservando integralmente a identidade visual aprovada da JR Bronzeamento.**
