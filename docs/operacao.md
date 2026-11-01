# Instalação, deploy e rollback

A hospedagem atual não foi informada nem acessada. Não existe deploy de produção nesta entrega. São necessários Node.js 24, PostgreSQL 17 com volume persistente, dois processos contínuos (web e worker), HTTPS, entrada pública do webhook e saída HTTPS para Google/Mercado Pago/Resend. Hospedagem estática ou Elementor sozinho não executa o backend. Em WordPress, mantenha o sistema desacoplado em subdomínio/origem própria com links para o agendamento; não altere o núcleo do WordPress. A implantação WordPress não foi presumida.

## Pré-deploy

1. Criar ambiente isolado de homologação, banco e credenciais de teste. Configurar backups criptografados e restaurar um backup em banco separado para verificar recuperação.
2. Revisar migrations. Elas são aplicadas em transação e registradas em schema_migrations; nunca rode em banco de outro projeto. Backups devem incluir o banco, artefatos da versão e configuração privada guardada no gerenciador de segredos.
3. Executar testes automatizados e a matriz de homologação. Configurar origem exata APP_URL e HTTPS, proxy reverso e logs sem corpo de requisições ou tokens. O rate limit usa endereço da conexão; não confia arbitrariamente em X-Forwarded-For. Atrás de proxy compartilhado, acrescente rate limit por IP no proxy e dimensione o limite agregado do servidor.
4. Configurar processos com restart e término gracioso. O worker deve rodar continuamente mesmo quando o site não recebe visitas. Não implantar em uma hospedagem que suspenda jobs sem alternativa confiável equivalente.
5. Configurar alertas para worker parado, reservas pendentes vencidas, conflitos, falhas recorrentes e fila sem progresso; o painel apresenta estado das filas, mas não é um serviço externo de monitoramento.
6. Manter PUBLICAÇÃO e ALLOW_LIVE_PAYMENTS desativados até aprovação expressa. Testar o webhook real em homologação HTTPS. Nenhum segredo precisa ser enviado no chat ou ao GitHub.

## Deploy autorizado futuro

Salvar pg_dump e versão anterior. Construir a imagem com lockfile, aplicar migrations uma vez, iniciar web e worker, verificar /api/health, login e uma reserva de teste completa. Publicar somente após aprovação expressa e homologação. Limitar o usuário do banco ao schema deste aplicativo; não conceder acesso a outros sistemas. Restringir o banco em rede privada, usar TLS verificado quando remoto e rotacionar credenciais conforme a política da empresa.

## Rollback

Parar web/worker da versão nova, preservar logs e snapshot do banco e voltar à imagem anterior compatível com o schema. As migrations iniciais são aditivas; não apagar tabelas automaticamente. Se for necessária restauração do banco, reconciliar todos os pagamentos ocorridos desde o backup antes de reabrir agendamentos. Nunca restaurar e abrir a agenda sem essa reconciliação, pois ela poderia perder reservas já pagas. Não excluir o volume jr_data com docker compose down -v.

## Retenção e pedidos de titulares

Definir prazo aprovado pela empresa e suas obrigações aplicáveis antes da abertura. Solicitações de acesso, correção e exclusão exigem verificação da identidade por canal autorizado. Excluir/anônimizar dados no banco e nas cópias Google/provedor de e-mail quando cabível, preservando somente registros que precisem permanecer. Esta entrega não escolhe prazo jurídico nem executa exclusões automáticas sem a política aprovada. Backups têm ciclo de retenção próprio e acesso restrito.

## Limites de operação

Reembolsos pelo painel são integrais; valores parciais precisam de operação e conciliação administrativa. Cancelar reserva não devolve dinheiro automaticamente. Pagamento duplicado tem reembolso específico na área Financeiro. O registro de devolução presencial só deve ser usado após a devolução efetiva fora do sistema. Falhas no pagamento/calendário não são escondidas: reprocessamento e revisão ficam na fila/auditoria.

