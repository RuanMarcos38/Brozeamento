# R&R Bronzeamento — implementação integrada, 10/11/2026

## Estado da entrega

Código implementado em `codex/rr-conclusao-integrada`, baseado em `codex/rr-reformulacao` (`25192e1460cda0f0bc985d02a0544f470220ac17`). Não publicado. A branch `main` tem apenas o README e não representa a aplicação completa. Não alterar a origem do deploy para `main` sem integrar o código da aplicação.

Arquitetura preservada: Node.js, PostgreSQL, frontend HTML/CSS/JavaScript, API HTTP, worker, Mercado Pago, agenda interna. A interface de produção confirma uso de agenda interna; nenhuma integração Google foi ativada ou alterada.

## Implementações

- Homepage com composição institucional tipográfica, sem fotografias artificiais apresentadas como pessoas reais. Fontes locais, navegação feminina/masculina, preços gerados pelo catálogo ativo. Arquivos de mídia originais preservados no histórico e assets existentes.
- Rafaela Cristine e Ruan Marcos mantêm recursos independentes, sem atribuir reservas antigas arbitrariamente. CTA seleciona o serviço do profissional correspondente.
- Preparação idempotente do catálogo no painel: avulsa R$229,90; Tradicional 3 R$629,90; Tradicional 5 R$999,90; Express 5 R$1.049,90. Express 3 sessões R$719,90 confirmado pelo titular em 10/11/2026 e incluído no catálogo.
- Preparação copia horários somente se existir exatamente um recurso legado sem profissional chamado `Atendimento R&R`; de outro modo exige configuração. Duração inicial 60 minutos e validade inicial 90 dias seguem o modelo existente e devem ser conferidas no painel.
- Ativação comercial separada e transacional: exige cuidados, horários, criptografia, retenção e confirmação do backup. Salva configuração anterior em `catalog_before_nov2026`. Não altera preços registrados em reservas/pagamentos. Bloqueia retirada de serviços com créditos legados válidos.
- Política comercial nova sem taxa de deslocamento. Checkout mantém valor registrado na reserva, sem cobrança adicional de transporte.
- Anamnese com as 16 perguntas do PDF fornecido, dados pessoais, detalhes condicionais, vestimentas femininas e termo integral. No masculino, vestimenta a definir com o profissional, sem inventar procedimento.
- Assinatura desenhada ou digitada por ação explícita; consentimento separado para saúde, revisão, horário de recebimento e SHA-256. Assinatura eletrônica simples, sem alegação de certificado ICP-Brasil ou verificação independente de identidade.
- Respostas criptografadas com AES-256-GCM e chave privada externa ao banco. PDF gerado somente após autorização. Bearer da reserva é uma credencial de acesso: nunca compartilhar links de clientes.
- Versões preservadas durante a retenção; controle de revisão evita sobrescrever uma atualização concorrente. Worker elimina registros vencidos; backups precisam ter ciclo de eliminação compatível.
- Checkout de serviços novos exige ficha assinada válida. Reservas legadas não recebem essa exigência retroativamente. Prazo de reserva de 10 minutos permanece, inclusive durante o preenchimento.
- Papel `professional`: consulta somente agendas/clientes vinculados e fichas autorizadas; não altera financeiro/configurações. Proprietário gerencia contas existentes e vínculos clínicos; permissões são auditadas e sessões do usuário alterado são encerradas. Criação de contas usa o procedimento privado existente (`scripts/admin.js`), não senha padrão.
- Painel de anamnese com PDF restrito; nenhum dado de saúde é incluído em analytics ou avisos.
- Monitoramento existente mantido, atualização de 30 segundos e janela ativa de 5 minutos. Acrescentados cliques de modalidade e totais de reservas/receita por profissional vindos do banco. Analytics são consentidos e amostrais; não equivalem a contagem perfeita de pessoas, bots ou pagamentos.
- Franquias: faixa de investimento opcional, disponibilidade para conversa, responsável, tarefa com data, histórico, exportação CSV exclusiva do proprietário e neutralização de fórmulas. Página de interesse, sem promessa de retorno ou oferta formal.
- Aviso de novo interesse por e-mail em fila com tentativas, quando o canal do proprietário está habilitado. Dados completos permanecem no painel. Não foi criado disparo WhatsApp novo para candidatos.
- Avisos existentes de reserva incluem nome do profissional quando disponível.

## Verificação

Testes automatizados cobrem criptografia, assinatura, PDF, origem/CSRF, ausência de autenticação, revisão, retenção, isolamento de profissionais, catálogo, preservação de reservas, valores, conflito de agenda, envio simulado de aviso e exportação segura. O PDF preenchido com dados fictícios foi renderizado e revisado em duas páginas. Não foram usados dados de saúde reais.

Suíte local final: consulte o resultado registrado no PR. Usa PGlite quando `TEST_DATABASE_URL` não está configurada. Dois testes de concorrência real exigem PostgreSQL e são ignorados localmente; o workflow GitHub configura PostgreSQL 17 para executá-los. Mocks de pagamento/SMTP não homologam provedores externos.

Não houve teste visual interativo da nova versão em desktop/mobile nem pagamento sandbox real: é necessário disponibilizar a versão em homologação. Responsividade foi implementada, não certificada em aparelhos reais.

## Evidências da produção nesta sessão

- Domínio consultado: https://rrbronzeamento.com.br/ — ainda exibe preços antigos e taxa de deslocamento.
- Painel autenticado em `/admin`: disponível. Foi feita somente leitura e checagem das conexões; não foram editados dados comerciais.
- A verificação da conta Mercado Pago respondeu com sucesso, sem cobrança. Não comprova Pix/cartão/webhook ponta a ponta.
- A verificação conjunta dos avisos retornou `Serviço temporariamente indisponível`. É necessário separar o diagnóstico SMTP/WhatsApp pelos logs privados, sem divulgar credenciais.
- EasyPanel em `http://2.25.155.142:3000/projects/r2rmarketingdigital/app/bronzeamento`: extensão recusou leitura por falta de permissão do host. Não foi usado outro caminho para contornar a restrição.
- Commit/artefato atualmente implantado, banco real e backups de produção não puderam ser verificados. Não houve deploy, merge ou cobrança real.

## Publicação pendente — sequência exata

1. Liberar acesso do navegador conectado ao host EasyPanel e manter a sessão autenticada. Não enviar senhas em mensagens.
2. Identificar fonte/commit do serviço atual e variáveis por nome, sem registrar segredos. Exportar backup do PostgreSQL e configuração/artefato; restaurar em banco isolado para validar integridade.
3. Subir esta branch em homologação com banco separado e credenciais de teste Mercado Pago/SMTP. Nunca copiar fichas reais para testes.
4. Configurar `ANAMNESIS_ENCRYPTION_KEY` com 32 bytes aleatórios representados por 64 caracteres hexadecimais. Guardar a chave em local privado com backup: perder ou trocar a chave torna fichas existentes ilegíveis. Planejar rotação com migração antes de trocar.
5. Definir `ANAMNESIS_RETENTION_DAYS` pelo responsável pelo tratamento, entre 1 e 3650 dias. O valor é exibido antes do aceite; não há prazo comercial presumido.
6. Executar `npm ci`, `npm run migrate`, testes com PostgreSQL e iniciar o serviço. Migrations 012–014 são aditivas e não reatribuem reservas legadas. Elas dependem das migrations anteriores da branch.
7. No painel, preparar catálogo, conferir cuidados/duração/validade e horários de cada profissional. Confirmar capacidade operacional simultânea. Configurar contas e vínculos somente para os profissionais corretos.
8. Testar as duas jornadas, ficha/assinatura/PDF, bloqueio de horário, pacote, checkout sandbox, webhook repetido, cancelamento e notificações. Verificar celulares/desktop e console.
9. Publicar somente após essa homologação e backup. Ativar catálogo no painel; a rotina preserva histórico e configura a política sem deslocamento. Não altera `ALLOW_LIVE_PAYMENTS`: cobrança real depende de autorização e homologação próprias.
10. Conferir domínio, APIs, preços, agendas, formulários e fila de notificações após deploy.

## Rollback

O código anterior está preservado em `25192e1` e no histórico Git. Há bundle local verificado da história anterior, mas isso NÃO substitui backup do banco. Antes do deploy registrar a imagem atual do EasyPanel. Em falha, pausar novas reservas, retornar à imagem anterior compatível e restaurar estados de catálogo/configurações a partir de `catalog_before_nov2026` sob transação e revisão. Não apagar fichas, assinaturas ou reservas novas para reverter a interface. Não restaurar um backup antigo sobre pagamentos novos; reconciliar o delta primeiro. As tabelas adicionadas podem permanecer durante rollback compatível.

## Pendências comerciais e operacionais

- Express de R$719,90 confirmado como 3 sessões; pendência comercial resolvida.
- Retenção das fichas e ciclo de backups; chave privada de criptografia.
- Validação das orientações da ficha/procedimento pela equipe responsável.
- Contas de Rafaela/Ruan e vínculos, disponibilidade individual, capacidade simultânea e vestimenta masculina.
- Homologação de pagamento, SMTP/WhatsApp e interface em ambiente acessível.
- Foto oficial/WhatsApp público: não foram inventados nem reaproveitados contatos privados como contato comercial.
- As novas opções não estão em produção até a publicação e ativação verificadas.
