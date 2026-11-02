# Avisos internos e horários

Reservas aguardam pagamento por dez minutos. Novos inícios são oferecidos a cada 120 minutos a partir da abertura do expediente; a duração da sessão continua cadastrada no serviço. Após o prazo, reservas sem aprovação reconhecida são liberadas, inclusive quando a consulta ao gateway falha. Uma aprovação posterior continua sendo reconciliada; colisões ou pagamentos fora do prazo exigem análise no painel.

Configure destinatários e habilite cada canal em Configurações no painel. Os destinatários ficam no banco privado e não são expostos pela API pública. As filas guardam o destinatário escolhido no momento da confirmação. Pacotes geram um resumo com todas as datas e apenas um aviso por canal.

Remetente SMTP: variáveis privadas SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD e EMAIL_FROM. WhatsApp Evolution: WHATSAPP_API_URL, WHATSAPP_INSTANCE e WHATSAPP_API_KEY. Use chave da instância autorizada. Não versionar credenciais ou destinatários reais.

No painel, Verificar conexões valida o estado do WhatsApp e autenticação SMTP sem enviar mensagem. Os botões de teste enviam uma mensagem claramente identificada como teste, sem criar agendamento ou cobrança. Após corrigir credenciais, Repetir avisos com falha recoloca esses avisos na fila. Aceito pelo provedor não significa leitura ou entrega final ao destinatário. Falhas de autenticação são interrompidas, erros transitórios têm tentativas limitadas com espera progressiva. SMTP e Evolution não garantem idempotência no provedor; um tempo limite depois da aceitação pode causar repetição na tentativa seguinte.

E-mails para clientes permanecem desativados, salvo CUSTOMER_EMAIL_ENABLED=true. Os avisos internos à equipe são independentes dessa opção.
