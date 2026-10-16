# Acciones para aparecer en Google y en respuestas de IA

Lista de trabajo, ordenada por prioridad. "Confirmado" quiere decir que lo dice la documentación de Google, Microsoft, Apple, OpenAI o Cloudflare. "Sin confirmar" quiere decir que viene de estudios de terceros o de blogs de SEO.

## Esta semana

| # | Acción | Quién | Estado |
|---|---|---|---|
| 1 | Cloudflare: apagar "Block AI training bots". Revisar también Bot Fight Mode, reglas WAF y el robots.txt administrado por Cloudflare (se antepone al nuestro). Confirmar en AI Crawl Control que entran OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Applebot y Bingbot. Confirmado | René | Hecho 15-oct-2026: entrenamiento en Allow, Bot Preference Sync apagado; los 10 rastreadores probados responden 200. Crawler Hints encendido el 15-oct-2026 |
| 2 | Google Search Console: verificar el dominio y enviar sitemap.xml. Las respuestas de IA de Google usan el mismo índice que la búsqueda normal. Confirmado | René | Hecho 15-oct-2026: propiedad de dominio verificada, sitemap enviado (10 páginas) |
| 3 | Bing Webmaster Tools: verificar, enviar sitemap, activar IndexNow (Cloudflare Crawler Hints lo manda solo). Bing alimenta a Copilot y a la búsqueda de ChatGPT; tiene un reporte de citas en respuestas de IA. Confirmado | René | Hecho 15-oct-2026: importado desde Search Console, sitemap enviado. Falta IndexNow |
| 4 | Perfil de Google de Sabana: pasar la administración a carolina@ y rene@vetrehab.cr (hoy la tiene un Gmail que empieza con "ca"). Crear el de Heredia y verificarlo por video. Confirmado | Carolina, René | Sabana: rene@vetrehab.cr con acceso el 15-oct-2026; cargados descripción, categorías (Physical therapy clinic, Physical rehabilitation center), sitio web, enlace de cita por WhatsApp, 12 servicios, "se requiere cita"; en revisión de Google. Faltan fotos y crear Heredia |
| 5 | Apple Business Connect: registrar las dos sedes (Apple Maps y Siri). Confirmado | René, Carolina para verificar | Pendiente |
| 6 | Bing Places: registrar las dos sedes. Confirmado | René | Pendiente |

## Próximas semanas

| # | Acción | Quién |
|---|---|---|
| 7 | Reseñas: enlace de reseña por WhatsApp al terminar cada tratamiento, en las dos sedes. Lo reciente pesa más que el total (sin confirmar) | Recepción |
| 8 | Mismo nombre, dirección y teléfono en Facebook, Instagram, WhatsApp Business, Waze, Páginas Amarillas y directorios de mascotas | René, Carolina |
| 9 | Ficha de autora con credenciales de la Dra. Carolina (y de las demás doctoras) visible en las páginas de condiciones, con schema Person. Google lo pide para contenido médico | René, Carolina para el CV |
| 10 | llms.txt: ya está. No invertir más; ningún buscador grande confirmó que lo use | Nada |

## Constante

| # | Acción | Quién |
|---|---|---|
| 11 | Responder preguntas en grupos de Facebook de dueños de mascotas en Costa Rica; buscar una nota en medios sobre la hidrocaminadora | Carolina, René |
| 12 | Videos cortos de sesiones de hidrocaminadora en YouTube | Personal de la clínica, René publica |
| 13 | Medición semanal: rutina automática de los lunes (`seo/visibilidad.md`), reporte de IA de Bing, AI Crawl Control de Cloudflare, visitas con utm_source=chatgpt.com si se instala analítica | René |
| 14 | No activar pay-per-crawl ni Content Signals de Cloudflare: la clínica necesita que la lean | Nada |
