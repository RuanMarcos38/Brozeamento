function startBookingAlerts() {
 if (bookingAlertSession) return;
 const section = document.getElementById('booking-alerts');
 const sound = document.getElementById('booking-alert-sound');
 const clear = document.getElementById('booking-alert-clear');
 const status = document.getElementById('booking-alert-status');
 const list = document.getElementById('booking-alert-list');
 const format = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
 });
 const session = {timer: null, context: null};
 bookingAlertSession = session;
 let cursor;
 let soundEnabled = false;
 let alertCount = 0;
 section.hidden = false;
 status.textContent = 'Ative o som para ouvir os avisos enquanto o painel estiver aberto.';
 function chime(delay = 0) {
  const context = session.context;
  const start = context.currentTime + delay;
  for (const [index, frequency] of [660, 880].entries()) {
   const tone = context.createOscillator();
   const gain = context.createGain();
   const time = start + index * 0.13;
   tone.frequency.value = frequency;
   gain.gain.setValueAtTime(0.12, time);
   gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
   tone.connect(gain).connect(context.destination);
   tone.start(time);
   tone.stop(time + 0.19);
  }
 }
 sound.onclick = async () => {
  try {
   if (!soundEnabled) {
    session.context ||= new AudioContext();
    await session.context.resume();
    chime();
   }
   soundEnabled = !soundEnabled;
   sound.textContent = soundEnabled ? 'Silenciar agendamentos' : 'Ativar som de agendamentos';
   status.textContent = soundEnabled ? 'Som de agendamentos ativado.' : 'Som de agendamentos silenciado.';
  } catch {
   status.textContent = 'O navegador bloqueou o som. Tente ativá-lo novamente.';
  }
 };
 clear.onclick = () => {
  list.replaceChildren();
  list.hidden = clear.hidden = true;
  alertCount = 0;
  status.textContent = 'Avisos limpos.';
 };
 async function check() {
  const query = new URLSearchParams();
  if (cursor) query.set('after', cursor.created_at);
  if (cursor?.id) query.set('id', cursor.id);
  try {
   const data = await api('booking-alerts?' + query);
   if (bookingAlertSession !== session) return;
   cursor = data.cursor;
   for (const [index, booking] of data.alerts.entries()) {
    const item = document.createElement('li');
    const state = booking.state === 'pending' ? ' · Aguardando pagamento' : '';
    item.textContent = booking.agenda + ' · ' + booking.service_name + ' · ' + format.format(new Date(booking.starts_at)) + state;
    list.prepend(item);
    if (list.children.length > 50) list.lastElementChild.remove();
    if (soundEnabled && session.context.state === 'running') chime(index * 0.38);
   }
   if (data.alerts.length) {
    alertCount += data.alerts.length;
    list.hidden = clear.hidden = false;
    status.textContent = alertCount === 1 ? '1 novo agendamento' : alertCount + ' novos agendamentos';
   }
  } catch {
   // Keep the cursor across connection errors so the next request can recover missed alerts.
  } finally {
   if (bookingAlertSession === session) session.timer = setTimeout(check, 5000);
  }
 }
 check();
}
let bookingAlertSession;
function stopBookingAlerts() {
 if (!bookingAlertSession) return;
 clearTimeout(bookingAlertSession.timer);
 bookingAlertSession.context?.close().catch(() => {});
 bookingAlertSession = null;
 document.getElementById('booking-alerts').hidden = true;
 document.getElementById('booking-alert-list').replaceChildren();
 document.getElementById('booking-alert-list').hidden = true;
 document.getElementById('booking-alert-clear').hidden = true;
 document.getElementById('booking-alert-sound').textContent = 'Ativar som de agendamentos';
}
