# Homologação antes da abertura

Nenhuma integração externa está declarada homologada. Credenciais, ambiente HTTPS e dados comerciais da JR não foram fornecidos. Os adaptadores e as rotinas estão implementados; a aceitação comercial exige os testes abaixo em ambiente isolado.

| Cenário | Verificação automatizada | Verificação externa pendente |
|---|---|---|
| Reserva livre e bloqueio de 60 minutos | Fluxo SQL/API e prazo do servidor | Revisão operacional |
| Duas clientes no mesmo recurso | Constraint SQL e CI concorrente PostgreSQL | Navegadores simultâneos em homologação |
| Pix / cartão aprovado | Estado aprovado e validações do pagamento simuladas | Contas e meios de teste Mercado Pago |
| Recusa, pendência, checkout e retorno | Estado não confirma pelo navegador | Recusa real de teste |
| Expiração e liberação | Worker reconcilia antes de liberar | Worker contínuo na hospedagem |
| Aprovação elegível antes do prazo com webhook atrasado | Reconciliação recupera confirmação | Entrega real dos webhooks |
| Aprovação fora do prazo / recurso ocupado | Conflito sem dupla reserva | Reagendamento/reembolso pela equipe |
| Pagamentos duplicados e webhook repetido | Idempotência, auditoria, fila única | Duplicação controlada em teste |
| Google Calendar temporariamente indisponível | Retry preserva reserva confirmada | OAuth, freebusy, inserção, edição e exclusão reais |
| Reagendamento | Ocupação move e fila atualiza | Revisão de comunicação com a cliente |
| Cancelamento / reembolso | Estados, liberação e gateway simulado | Reembolso de teste e chargeback |
| Pacotes | Saldo após pagamento, consumo e restauração | Validar regras e validade comerciais |
| Área privada | Login, cookie, CSRF e rotas protegidas | Contas reais da equipe com papéis corretos |
| Persistência | Reinicialização do PostgreSQL local em disco | Backup/restore do banco hospedado |
| Mobile / desktop | Revisão visual e fluxo do navegador local | Dispositivos reais e acessibilidade assistiva |
| E-mail | Fila/idempotência e confirmação após aprovação | SPF/DKIM/DMARC, entrega e link privado |

Preencher e aprovar serviços reais, preços, políticas, cuidados, privacidade, funcionamento e capacidade. O briefing cita bronzeamento a jato e valores sugeridos, enquanto o HTML apresenta outras modalidades; nenhum desses preços/técnicas foi ativado automaticamente.

As integrações autenticadas do chat não são credenciais de backend: não é correto copiar credenciais de conectores nem presumir que uma agenda pessoal seja a agenda oficial da JR.
