# 🛰️ Monitor de Disponibilidad de Sitios Web

Herramienta de **monitoreo** construida con **Google Sheets + Google Apps Script** que revisa automáticamente si tus sitios web están en línea, mide su tiempo de respuesta y **envía alertas por email** cuando algo falla.

## Funcionalidades
- ✅ Revisión de múltiples URLs (código HTTP + tiempo de respuesta)
- 🎨 Semáforo de estados: **ARRIBA**, **LENTO** (>3 s), **ERROR** (4xx/5xx), **CAÍDO** (sin respuesta)
- ⏱️ Revisión automática cada 10 minutos (activadores de Apps Script)
- 📧 Alertas por email **solo cuando cambia el estado** (caída y recuperación), sin spam
- 📊 Dashboard con % de disponibilidad (uptime), tiempo promedio y gráfico

## Arquitectura
```
Activador (cada 10 min) ──► revisarSitios()
                                │ UrlFetchApp (HTTP)
                                ▼
                        Sitios web monitoreados
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   Hoja "Sitios"         Hoja "Historial"      MailApp (alertas)
   (estado actual)       (log de revisiones)          │
                                │                     ▼
                                ▼               Email del responsable
                       Hoja "Dashboard" (uptime % + gráfico)
```

## Instalación
1. Crea una hoja en Google Sheets → **Extensiones → Apps Script**.
2. Pega `src/Code.gs`, guarda y recarga la hoja.
3. Menú **🛰️ Monitor** → *Configurar hojas* → *Revisar ahora*.
4. Agrega tus URLs en la hoja **Sitios** y activa la revisión automática.

## Decisiones técnicas
- **Detección por cambio de estado:** se compara el estado anterior con el nuevo para alertar una sola vez por incidente.
- **Historial separado del estado actual:** permite calcular métricas (uptime) con fórmulas nativas.
- **Manejo de excepciones:** un dominio inexistente o timeout no detiene el resto de revisiones.
- **Costo cero:** corre en la infraestructura de Google, sin servidores.

## Mejoras futuras
Alertas por Telegram o Slack, verificar que la página contenga un texto específico y monitorear la expiración de certificados SSL.
