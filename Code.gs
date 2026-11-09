/**
 * Monitor de Disponibilidad de Sitios Web (Google Apps Script)
 * Revisa periódicamente una lista de URLs, registra el tiempo de respuesta
 * y envía alertas por email cuando un sitio cae o se recupera.
 */
const HOJA_SITIOS = 'Sitios';
const HOJA_LOG = 'Historial';
const LIMITE_LENTO_MS = 3000;

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛰️ Monitor')
    .addItem('1. Configurar hojas', 'configurar')
    .addItem('2. Revisar ahora', 'revisarSitios')
    .addItem('3. Activar revisión cada 10 min', 'activarAutomatico')
    .addItem('4. Desactivar revisión automática', 'desactivarAutomatico')
    .addItem('5. Actualizar dashboard', 'actualizarDashboard')
    .addToUi();
}

function configurar() {
  const ss = SpreadsheetApp.getActive();
  const s = ss.getSheetByName(HOJA_SITIOS) || ss.insertSheet(HOJA_SITIOS);
  s.clear();
  s.appendRow(['Nombre','URL','Estado','Código HTTP','Tiempo (ms)','Última revisión','Email alerta']);
  [['Google','https://www.google.com'],['GitHub','https://github.com'],['Sitio caído (prueba)','https://esto-no-existe-12345.com']]
    .forEach(f => s.appendRow([f[0], f[1], '', '', '', '', Session.getActiveUser().getEmail()]));
  s.getRange('A1:G1').setFontWeight('bold').setBackground('#0f766e').setFontColor('white');
  s.setFrozenRows(1);

  const l = ss.getSheetByName(HOJA_LOG) || ss.insertSheet(HOJA_LOG);
  l.clear();
  l.appendRow(['Fecha','Nombre','URL','Estado','Código HTTP','Tiempo (ms)']);
  l.getRange('A1:F1').setFontWeight('bold');
}

/** Hace la petición HTTP y mide el tiempo */
function verificar_(url) {
  const inicio = Date.now();
  try {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, validateHttpsCertificates: true });
    const ms = Date.now() - inicio, codigo = r.getResponseCode();
    let estado = codigo < 400 ? 'ARRIBA' : 'ERROR';
    if (estado === 'ARRIBA' && ms > LIMITE_LENTO_MS) estado = 'LENTO';
    return { estado, codigo, ms };
  } catch (e) {
    return { estado: 'CAÍDO', codigo: '—', ms: Date.now() - inicio };
  }
}

function revisarSitios() {
  const ss = SpreadsheetApp.getActive();
  const s = ss.getSheetByName(HOJA_SITIOS), log = ss.getSheetByName(HOJA_LOG);
  const datos = s.getDataRange().getValues();
  const ahora = new Date();
  const colores = { ARRIBA:'#bbf7d0', LENTO:'#fef08a', ERROR:'#fecaca', 'CAÍDO':'#fca5a5' };

  for (let i = 1; i < datos.length; i++) {
    const [nombre, url, estadoAnterior, , , , email] = datos[i];
    if (!url) continue;
    const r = verificar_(url);

    s.getRange(i+1, 3, 1, 4).setValues([[r.estado, r.codigo, r.ms, ahora]]);
    s.getRange(i+1, 3).setBackground(colores[r.estado]);
    log.appendRow([ahora, nombre, url, r.estado, r.codigo, r.ms]);

    // Alertar solo cuando el estado CAMBIA (evita spam de correos)
    const estabaBien = ['ARRIBA','LENTO',''].includes(estadoAnterior);
    const estaBien = ['ARRIBA','LENTO'].includes(r.estado);
    if (email && estabaBien && !estaBien) alertar_(email, `🔴 ${nombre} está ${r.estado}`, url, r);
    if (email && !estabaBien && estaBien)  alertar_(email, `🟢 ${nombre} se recuperó`, url, r);
  }
}

function alertar_(email, asunto, url, r) {
  MailApp.sendEmail(email, asunto,
    `URL: ${url}\nEstado: ${r.estado}\nCódigo HTTP: ${r.codigo}\nTiempo: ${r.ms} ms\nFecha: ${new Date()}`);
}

/** Crea un activador (trigger) que ejecuta la revisión cada 10 minutos */
function activarAutomatico() {
  desactivarAutomatico();
  ScriptApp.newTrigger('revisarSitios').timeBased().everyMinutes(10).create();
  SpreadsheetApp.getActive().toast('Revisión automática activada', '🛰️ Monitor');
}
function desactivarAutomatico() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'revisarSitios')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

/** Dashboard con % de disponibilidad (uptime) y tiempo promedio por sitio */
function actualizarDashboard() {
  const ss = SpreadsheetApp.getActive();
  const d = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard');
  d.clear(); d.getCharts().forEach(c => d.removeChart(c));
  d.getRange('A1:D1').setValues([['Sitio','Uptime %','Tiempo promedio (ms)','Revisiones']]).setFontWeight('bold');
  const sitios = ss.getSheetByName(HOJA_SITIOS).getRange('A2:A').getValues().flat().filter(String);
  sitios.forEach((n, i) => {
    const f = i + 2;
    d.getRange(f, 1, 1, 4).setFormulas([[
      `="${n}"`,
      `=IFERROR(ROUND(100*(COUNTIFS(Historial!B:B,A${f},Historial!D:D,"ARRIBA")+COUNTIFS(Historial!B:B,A${f},Historial!D:D,"LENTO"))/COUNTIF(Historial!B:B,A${f}),1),0)`,
      `=IFERROR(ROUND(AVERAGEIF(Historial!B:B,A${f},Historial!F:F)),0)`,
      `=COUNTIF(Historial!B:B,A${f})`
    ]]);
  });
  d.insertChart(d.newChart().setChartType(Charts.ChartType.BAR)
    .addRange(d.getRange(1, 1, sitios.length + 1, 2)).setPosition(2, 6, 0, 0)
    .setOption('title', 'Disponibilidad por sitio (%)').build());
}
