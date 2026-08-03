# Datos de las sedes — Vet Rehab Costa Rica

Verificación de direcciones, teléfonos y horarios. Consultado el 2 de agosto de 2026.

Niveles de confianza:

- **confirmado** — dos o más fuentes independientes coinciden, o la fuente es un canal propio de la clínica.
- **probable** — una sola fuente, o inferencia geométrica consistente pero sin confirmación directa.
- **sin verificar** — dato que circula sin respaldo, o que ninguna fuente pública sostiene.

---

## 1. Sede Sabana

### Dirección

| Campo | Valor | Confianza |
|---|---|---|
| Dirección tica | Sabana Norte, Mata Redonda. 200 metros oeste del ICE de Sabana. Primer piso del condominio Torres del Parque | **confirmado** |
| Número de local | Local #05 | **sin verificar** |
| Distrito / cantón | Mata Redonda, San José | **confirmado** |
| Dirección tipo Google | Av. 3 56, San José, Sabana Nte | **probable** |

Respaldo:

1. Ficha de Google Business consultada el 2 de agosto: dirección "Av. 3 56, San José, Sabana Nte", 5.0 con 21 reseñas, URL `https://www.google.com/maps/place/Vet+Rehab/@9.9384969,-84.1048177,17z`.
2. Waze registra el lugar como **"Vet Rehab - Torres del Parque", Sabana, Mata Redonda, San José**. Ese nombre de lugar ata el negocio al condominio de forma independiente de Google.
3. Linktree oficial (`linktr.ee/vetrehabcr`) tiene un único botón "Encontranos 📍" y apunta exactamente a ese lugar de Waze. Es la propia clínica confirmando la ubicación.
4. Las fichas inmobiliarias de Torres del Parque describen dos torres de 17 pisos con **los primeros tres niveles dedicados a comercio y oficinas**, y listan entre los locales comerciales del condominio **una clínica veterinaria**, junto con AM/PM, salón de belleza, gimnasio y tienda deportiva. Encaja con "primer piso, local comercial".

Lo que no está respaldado: **el número de local (#05)**. Ninguna fuente pública lo menciona. En directorios aparecen otros números de local de Torres del Parque (por ejemplo "local #6, 104" y "APTO 12" para otros negocios), lo que confirma que el condominio numera sus locales, pero no dice cuál es el nuestro.

### Coordenadas

| Campo | Valor | Confianza |
|---|---|---|
| Latitud, longitud | 9.9384969, −84.1048177 | **probable** |
| Plus Code (completo) | 66XQWVQW+93V | **probable** |
| Plus Code (corto) | WVQW+93V, San José | **probable** |

Origen: centro del mapa de la ficha de Google de Vet Rehab. Es la coordenada que Google asocia al negocio, pero conviene medirla en sitio antes de meterla al JSON-LD, porque el centro del mapa y el pin exacto pueden diferir algunos metros.

Comprobación de consistencia: el punto está unos 200 metros al oeste del extremo noreste del Parque La Sabana, donde se ubica el edificio del ICE. La aritmética calza con "200 metros oeste del ICE", pero las coordenadas del ICE no se verificaron contra una fuente propia.

### Teléfono

| Número | Rol | Confianza |
|---|---|---|
| 8632-1129 | Línea principal y WhatsApp Business | **confirmado** |

Aparece en Google Business, Waze (86321129), el bio de Instagram, el botón de WhatsApp del Linktree y el perfil de WhatsApp Business. Cinco canales, uno de ellos propio.

**No existe línea fija.** Ninguna fuente pública muestra un número 2xxx-xxxx para Vet Rehab.

### Horario

| Día | Horario | Confianza |
|---|---|---|
| Lunes a viernes | 9:00 a 18:00 | **confirmado** |
| Sábado | 8:00 a 13:00 | **probable** |
| Domingo | Cerrado | **confirmado** |

- Bio de Instagram `@vetrehabcr`, leído textualmente el 2 de agosto: *"VET REHAB I TERAPIA FÍSICA Y ACUPUNTURA VETERINARIA 📍Sabana Norte y Heredia, CR 🗓️L-V: 9am-6pm / Sáb: 8am-1pm"*.
- Facebook `vetrehabcr` reporta lo mismo: L-V 9am-6pm, sábado 8am-1pm.
- **Waze contradice el sábado:** registra S 9:00-13:00. Waze es contenido editado por usuarios, así que pesa menos que los dos canales propios.
- La ficha de Google solo publica "Abre 9:00 lunes", sin sábado.

El sábado a las 8:00 es lo que sostienen los dos canales que la clínica controla. Queda como probable y no confirmado únicamente porque hay una fuente pública que dice lo contrario y porque el dato hay que corregirlo también en Waze y en Google.

---

## 2. Sede Heredia

### Dirección — las dos versiones son el mismo punto

Las dos direcciones que circulaban no son alternativas: describen la misma ubicación. La versión correcta del distrito es **San Francisco de Heredia**, no San Pablo.

| Campo | Valor | Confianza |
|---|---|---|
| Dirección tica | Plaza Luvi, 175 metros oeste y 100 metros sur del Centro Comercial Oxígeno. Contiguo a Gattos Centro Veterinario | **probable** |
| Distrito / cantón | San Francisco, cantón Heredia | **probable** |
| "San Pablo de Heredia" | Incorrecto | **confirmado como error** |

Cómo se cerró:

1. La ficha de Google de **Gattos Centro Veterinario**, el vecino inmediato de nuestra sede, tiene Plus Code **XVR8+CV9**. Decodificado (código completo `66XQXVR8+CV9`) da **9.99104, −84.13277**.
2. El Centro Comercial Oxígeno está en **9.9939252, −84.1313427** (URL de Google Maps del centro comercial).
3. La diferencia entre ambos puntos es de **≈156 metros al oeste y ≈321 metros al sur** del pin central de Oxígeno. Oxígeno es un complejo grande y las direcciones ticas se miden desde la esquina o la entrada, no desde el centroide. Fuentes independientes ubican Plaza Luvi *"desde la entrada sur de Oxígeno, por Ekono, 200 metros sur y 150 metros oeste"* y *"a unos 500 metros de Oxígeno"*. Es el mismo lugar que describe la dirección publicada en Mascoticas.
4. La página de Facebook de Gattos se titula **"Gattos Centro Veterinario. | San Francisco"**. Facebook rotula la ciudad del negocio: San Francisco, no San Pablo.
5. Una fuente secundaria ubica explícitamente a Gattos *"en San Francisco con código de ubicación XVR8+CV9"*, corroborando el Plus Code de forma independiente de la lectura de Google.

Por qué "San Pablo de Heredia" no puede ser: San Pablo de Heredia está en **9.99878, −84.09102** (Wikipedia). Eso queda **a unos 4.7 kilómetros al este** del punto de Gattos. Son cantones distintos. El dato de "San Pablo" viene del registro de microchips RedChip247 y del brief interno; es la versión que hay que descartar o, si Carolina insiste en ella, la que obliga a revisar si Gattos tiene o tuvo dos locales.

### Coordenadas

| Campo | Valor | Confianza |
|---|---|---|
| Latitud, longitud | 9.99104, −84.13277 | **probable** |
| Plus Code (completo) | 66XQXVR8+CV9 | **probable** |
| Plus Code (corto) | XVR8+CV9, Heredia | **confirmado** (es el de Gattos) |

Son las coordenadas de **Gattos**, no de Vet Rehab. Sirven como referencia porque los locales son contiguos, pero para el JSON-LD hay que medir el punto propio en sitio.

### Teléfono

| Número | Rol | Confianza |
|---|---|---|
| 8784-5220 | Probable línea de la sede Heredia | **sin verificar** |
| 8632-1129 | Línea principal, atiende ambas sedes | **probable** |

El 8784-5220 aparece en la ficha de Vet Rehab en **Mascoticas.cr** (`mascoticas.cr/listing/vet-rehab/`), que es precisamente la ficha de Heredia: nombre "Vet Rehab", provincia Heredia, dirección "Plaza Luvi en Heredia. 175 oeste y 100 sur del Centro Comercial Oxígeno", teléfono 8784-5220, correo vetrehabcr@gmail.com. La asociación número-sede es circunstancial, no declarada.

Nota: en la revisión anterior el bio de Instagram mostraba 8632-1129 **y** 8784-5220. El bio leído hoy ya solo trae la ubicación y el horario, sin teléfonos. Es decir, hoy el 8784-5220 solo sobrevive en Mascoticas.

**Ojo con no confundir teléfonos:** 4030-0491 y 7007-5572 son de **Gattos**, no de Vet Rehab, aunque compartan edificio.

### Horario

| Día | Horario | Confianza |
|---|---|---|
| Lunes a viernes | 9:00 a 18:00 | **sin verificar para esta sede** |
| Sábado | 8:00 a 13:00 | **sin verificar para esta sede** |

El bio de Instagram publica un solo horario para "Sabana Norte y Heredia", lo que sugiere que las dos sedes comparten horario, pero no lo dice. No existe ninguna ficha propia de la sede Heredia en Google, Waze ni en directorios locales que publique un horario independiente.

### Presencia digital de la sede Heredia: cero

- Google Maps: buscar "Vet Rehab Heredia" devuelve únicamente la ficha de Sabana. No hay ficha de Vet Rehab en la dirección de Gattos.
- Waze: no existe lugar "Vet Rehab" en Heredia. El único es el de Torres del Parque.
- Linktree oficial: el botón "Encontranos" lleva solo a Sabana. No hay enlace a Heredia.
- Facebook e Instagram: mencionan Heredia en el texto, sin dirección ni mapa.

La única mención pública con dirección es la de Mascoticas.cr.

---

## 3. Otros datos de contacto

| Campo | Valor | Fuente | Confianza |
|---|---|---|---|
| Correo del negocio | vetrehabcr@gmail.com | Mascoticas, sitio propio | **confirmado** |
| Correo de Carolina | cafournier25@gmail.com | Registro CCRP de NC State | **confirmado** |
| Celular de Carolina | 8899-2705 | Registro CCRP de NC State | **probable** |
| Instagram | @vetrehabcr | — | **confirmado** |
| Facebook | facebook.com/vetrehabcr | — | **confirmado** |
| Linktree | linktr.ee/vetrehabcr | — | **confirmado** |

El 8899-2705 está publicado como número de contacto profesional de Carolina en el directorio CCRP, junto con su correo personal. Que sea "personal" y no de la clínica es lo que hay que confirmar, porque hoy está publicado como si fuera el de la práctica.

---

## 4. Cambios que esto obliga en el sitio

1. **`site/sede-heredia.html`** — el `<h1>`, el `<title>`, la meta description, el bloque `<address>`, el nodo `address` del JSON-LD y los enlaces a Google Maps y Waze dicen todos **San Pablo de Heredia**. Si se acepta la evidencia de arriba, hay que cambiarlos a San Francisco de Heredia y usar la dirección de Plaza Luvi como texto principal, dejando "contiguo a Gattos Centro Veterinario" como referencia de apoyo.
2. Los enlaces de mapa de esa página apuntan a `Gattos Centro Veterinario, San Pablo de Heredia`. Como Gattos no está en San Pablo, esa búsqueda puede mandar a la gente al lugar equivocado. Cambiar la consulta al Plus Code `XVR8+CV9 Heredia` o a `Gattos Centro Veterinario, San Francisco de Heredia`.
3. **`site/sede-sabana.html`** — el número de local `#05` no tiene respaldo. Dejarlo solo si Carolina lo confirma.
4. Los dos nodos `geo` siguen pendientes de medición en sitio, como ya marcan los TODO del JSON-LD.

---

## 5. Lo que sigue necesitando la palabra de Carolina

Cinco puntos. Todo lo demás quedó resuelto con fuentes.

1. **Distrito de la sede Heredia.** La evidencia dice San Francisco de Heredia, en Plaza Luvi. El brief interno decía San Pablo. Que confirme cuál es, y si alguna vez hubo un local en San Pablo.
2. **Número de local de la sede Sabana.** Si es el #05 del primer piso de Torres del Parque, o cuál.
3. **Rol del teléfono 8784-5220.** Si es la línea de Heredia, un número viejo, o el celular de otra doctora. Y si el 8899-2705 debe seguir publicado en el directorio CCRP como número de la práctica.
4. **Horario del sábado, y si las dos sedes lo comparten.** Los canales propios dicen 8:00 a 13:00, Waze dice 9:00. Hace falta el dato firme para corregir Google y Waze de una vez.
5. **Coordenadas exactas de cada sede.** Hay que pararse en la puerta de cada local y tomar el punto, para cerrar los dos nodos `geo` del JSON-LD y para el video de verificación de Google Business.

---

## Fuentes consultadas

- Instagram [@vetrehabcr](https://www.instagram.com/vetrehabcr/) — bio leído textualmente
- [linktr.ee/vetrehabcr](https://linktr.ee/vetrehabcr) — enlaces oficiales
- [Facebook Vet Rehab](https://www.facebook.com/vetrehabcr/) — horario vía snippet
- [Waze — Vet Rehab, Torres del Parque](https://www.waze.com/live-map/directions/vet-rehab-torres-del-parque-sabana,-mata-redonda,-san-jose?to=place.w.180813923.1808139234.26158508)
- [Waze — Condominio Torres del Parque](https://www.waze.com/live-map/directions/condominio-torres-del-parque-sabana-norte-sabana,-mata-redonda,-san-jose?to=place.w.180813923.1808139234.488863)
- [Mascoticas.cr — ficha Vet Rehab](https://mascoticas.cr/listing/vet-rehab/)
- [Facebook Gattos Centro Veterinario](https://www.facebook.com/GattosCentroVeterinario/)
- [Instagram @gattoscr_veterinaria](https://www.instagram.com/gattoscr_veterinaria/)
- [RedChip247 — Heredia](https://red.chip247.com/donde_chipear_mi_mascota.php?pais=227&provincia=1440)
- [Google Maps — Centro Comercial Oxígeno](https://www.google.com/maps/place/Centro+Comercial+Ox%C3%ADgeno,+111,+Heredia/@9.9959606,-84.154065,15z/data=!4m5!3m4!1s0x8fa0fae4d6f2f3c9:0xca979eb2e17fba1d!8m2!3d9.9939252!4d-84.1313427)
- [Wikipedia — San Pablo District, San Pablo, Heredia](https://en.wikipedia.org/wiki/San_Pablo_District,_San_Pablo,_Heredia)
- [Point2Homes — Torres del Parque Sabana Norte](https://www.point2homes.com/CR/Condo-For-Rent/San-Jose/Sabana-Norte/TORRES-DEL-PARQUE-SABANA-NORTE-/154299928.html)
- [NCSU VetCE — CCRP Costa Rica](https://www.ncsuvetce.com/canine-rehab-ccrp/ccrp-costa-rica/)
