# Lanzamiento del sitio y presencia en Google

**Vet Rehab Costa Rica · setiembre 2026 · uso interno**

Este documento lista, en orden, lo que falta para que vetrehab.cr genere citas: abrir el sitio a los buscadores, tomar control del perfil de Google de Sabana, crear el de Heredia, y conectar las cuentas que miden el resultado. Cada paso dice quién lo hace y qué texto se pega.

Datos únicos para todos los canales (nombre, dirección y teléfono deben ser idénticos en cada sitio):

| Campo | Sabana Norte | Heredia |
|---|---|---|
| Nombre | Vet Rehab Costa Rica | Vet Rehab Costa Rica - Heredia |
| Dirección | Sabana Norte, Mata Redonda, 200 metros oeste del ICE de Sabana. Primer piso del condominio Torres del Parque, local #05. San José | Plaza Luvi, 175 metros oeste y 100 metros sur del Centro Comercial Oxígeno, contiguo a Gattos Centro Veterinario. San Francisco de Heredia |
| Teléfono | +506 8632 1129 | +506 8784 5220 |
| Horario | Lunes a viernes 9:00 a 18:00, sábado 8:00 a 13:00, domingo cerrado | Igual |
| Sitio | https://vetrehab.cr/sede-sabana.html | https://vetrehab.cr/sede-heredia.html |
| Correo | info@vetrehab.cr | info@vetrehab.cr |

## 1. Abrir el sitio

Quien lo hace: René, desde la carpeta del sitio.

```
python3 tools/launch.py launch
npx wrangler deploy
git commit -am "Sitio abierto" && git push
```

Eso quita la contraseña, quita el noindex de cada página, publica un robots.txt que admite a todos los rastreadores, incluidos los de IA, y apunta al sitemap. Para volver a cerrar: `python3 tools/launch.py preview` y el mismo deploy.

En Cloudflare, en la zona vetrehab.cr, panel principal, apagar "Block AI training bots" si está encendido. Está encendido por defecto y bloquea justo a los rastreadores que queremos que lean el sitio.

## 2. Perfil de Google de Sabana: tomar la propiedad

La ficha existe (5,0 con 21 reseñas) y está reclamada por una cuenta que no es de Carolina ni de René. Lo más probable es que sea la agencia de pauta. Dos caminos, en este orden:

1. Preguntarle a la agencia (Lúdica) si ellos la administran. Si es así, pedir que agreguen a `carolina@vetrehab.cr` como propietaria principal y a `rene@vetrehab.cr` como administrador, y que luego se quiten o queden como administradores. Es un cambio de un minuto desde su panel: Perfil de Negocio, Usuarios, Agregar.
2. Si nadie responde en dos días, pedir el acceso a Google. Con la sesión de `carolina@vetrehab.cr` abierta, ir a https://business.google.com/, buscar "Vet Rehab" en Sabana, elegir la ficha y seguir "Solicitar acceso". Google le escribe al propietario actual; si no contesta en tres días, Google permite verificar la ficha directamente, por video o por código. La verificación por video la hace Carolina en la sede con el celular: rótulo, entrada, interior y equipo.

Cuando la ficha sea nuestra, completar todo lo que hoy está vacío. Texto listo para pegar:

- Nombre: Vet Rehab Costa Rica
- Categoría principal: Veterinario. Secundarias: Clínica de fisioterapia, Centro de rehabilitación, Acupuntor.
- Descripción (máximo 750 caracteres): Rehabilitación veterinaria en especies menores. Terapia física, acupuntura e hidroterapia para perros y gatos, a cargo de médicas veterinarias especializadas en rehabilitación. Atendemos post quirúrgicos de ortopedia o neurología, hernias de disco, displasia de cadera, artrosis en perros mayores y dolor crónico. La hidrocaminadora HydroPhysio está en esta sede. La primera cita es una valoración de movilidad de una hora y el paciente sale con su plan por escrito. También atendemos a domicilio en el Área Metropolitana. Dirigida por la Dra. Carolina Fournier, certificada CCRP por la Universidad de Tennessee. Segunda sede en San Francisco de Heredia.
- Servicios: Valoración de movilidad · Terapia física veterinaria · Acupuntura veterinaria · Hidroterapia en hidrocaminadora · Láser terapéutico · Electroestimulación · Rehabilitación post operatoria · Rehabilitación de hernia discal · Manejo de displasia de cadera · Manejo de artrosis · Fisioterapia para gatos · Terapia a domicilio.
- Atributos: Se requiere cita · Atiende en español e inglés · Baño accesible (confirmar) · Estacionamiento (confirmar).
- Horario: el de la tabla. Marcar el sábado.
- Sitio web: https://vetrehab.cr/sede-sabana.html
- Botón de cita: enlace de WhatsApp https://wa.me/50686321129
- Fotos: subir las de `site/assets/img/` que corresponden a Sabana (hidrocaminadora, terapeutas, pacientes) y la foto de Carolina. Nombrar el archivo antes de subir con el nombre de la clínica.
- Preguntas y respuestas: publicar nosotros mismos las cinco del sitio (precio, sesiones, gatos, referencia, suturas) con sus respuestas.

## 3. Perfil de Google de Heredia: crearlo

Quien lo hace: Carolina con `carolina@vetrehab.cr`, desde https://business.google.com/create. Datos de la tabla. Categoría y servicios iguales a Sabana, sin hidroterapia en la lista de servicios. Descripción:

Rehabilitación veterinaria en especies menores en Heredia. Terapia física, acupuntura y láser para perros y gatos, a cargo de médicas veterinarias especializadas en rehabilitación. Atendemos post quirúrgicos de ortopedia o neurología, hernias de disco, displasia de cadera, artrosis en perros mayores y dolor crónico. La primera cita es una valoración de movilidad de una hora y el paciente sale con su plan por escrito. Estamos en Plaza Luvi, contiguo a Gattos Centro Veterinario. Las sesiones de hidrocaminadora se coordinan en nuestra sede de Sabana Norte.

La verificación de una ficha nueva suele ser por video en el local. Pedir que Google la trate como segunda sede de la misma empresa (mismo grupo de fichas), para que las reseñas y la cuenta queden juntas.

## 4. Reseñas: la rutina que mueve el ranking local

Fisiovet CR, el competidor comparable, tiene 160 reseñas. Vet Rehab tiene 21 en Sabana y 0 en Heredia. La rutina:

- Al cerrar cada tratamiento, recepción manda por WhatsApp el enlace corto de reseña de la sede (se obtiene en el perfil: Pedir reseñas). Mensaje: "Gracias por confiar en nosotras con [nombre de la mascota]. Si nos querés dejar una reseña en Google, nos ayuda mucho: [enlace]."
- Meta: cinco reseñas nuevas por mes por sede. Responder cada reseña en menos de una semana, con el nombre de la mascota.
- No pedir reseñas a todos el mismo día ni ofrecer descuentos a cambio. Google penaliza las dos cosas.

## 5. Cuentas de medición

Quien lo hace: René, con `rene@vetrehab.cr`.

- Google Search Console: https://search.google.com/search-console, agregar propiedad de dominio `vetrehab.cr`, verificar con el registro TXT que ya existe en Cloudflare (Google ya verificó el dominio para Workspace, así que suele reconocerlo de inmediato). Enviar el sitemap https://vetrehab.cr/sitemap.xml.
- Bing Webmaster Tools: https://www.bing.com/webmasters, importar desde Search Console. Bing alimenta a Copilot y a parte de las respuestas de ChatGPT.
- Google Analytics no es necesario ahora. La conversión es el WhatsApp, y eso se mide en el registro de clientes nuevos con el campo de origen.

## 6. Coherencia en los demás canales

- Instagram y Facebook: poner https://vetrehab.cr en la biografía y en el botón de sitio web. Cambiar "San Pablo" por "San Francisco de Heredia" donde aparezca.
- WhatsApp Business de cada sede: campo de sitio web con la página de la sede, dirección igual a la tabla.
- Waze: corregir el sábado (dice 9:00, es 8:00) y agregar el lugar de Heredia.
- Mascoticas.cr y cualquier directorio: misma dirección y teléfono de la tabla.
- Registro CCRP: pedir a Northeast Seminars (info@neseminars.com) que la entrada de Carolina diga Vet Rehab Costa Rica, con las dos sedes, el sitio vetrehab.cr y el correo info@vetrehab.cr. El correo listo está en `ACCIONES_FUNDACION_DIGITAL.md`; sustituir San Pablo por San Francisco de Heredia y el correo por info@vetrehab.cr antes de enviarlo.

## 7. Qué medir el primer mes

- Search Console: impresiones y clics por página, y las consultas con las que aparece el sitio. Las páginas de hernia discal e hidroterapia deberían aparecer primero.
- Perfil de Google: llamadas, clics al sitio y solicitudes de indicaciones por sede.
- Registro de clientes nuevos: cuántos dicen "Google" o "sitio web" en el campo de origen.
