# Vet Rehab — mapa de reemplazo de copy

Fuente de voz: `VOICE_CORPUS.md` (captions 12 y 13 como material principal).
Este documento **no** edita el sitio. Cada entrada da el texto actual textual (sirve como ancla exacta para Edit) y el texto nuevo.

Convenciones: `<em>` marca la palabra que va en itálica dentro del H1 o del H2 (el CSS ya la usa). Voseo CR. Sin emojis, sin hashtags, máximo una exclamación por sección.

---

## 1. Hero de portada — 5 opciones

**Opción A**
H1: `El dolor no se queja, <em>se nota en el silencio</em>`
Apoyo: `Cuando deja de saltar al sillón, corre menos en el parque o ya no te busca tanto para jugar, muchas veces no es la edad, es una molestia que se puede tratar. Somos expertos en devolverles la movilidad y las ganas de explorar el mundo: perros y gatos que salen de una cirugía de rodilla o de columna, y también los que llevan meses con dolor de artrosis. Empezamos con la valoración de movilidad y de ahí salís con su plan y los ejercicios para la casa.`

**Opción B**
H1: `¿Extrañás verlo correr <em>con la energía de antes</em>?`
Apoyo: `Dejó de saltar al sillón, se queda atrás en el parque, ya no te busca tanto para jugar. Casi nunca es pereza y casi nunca es solo vejez: es dolor articular, y el dolor articular se trata. Fisioterapia, acupuntura e hidrocaminadora para perros y gatos, en Sabana y en Heredia.`

**Opción C**
H1: `Antes saltaba al sillón <em>sin pensarlo</em>`
Apoyo: `Ahora calcula, desiste y se acomoda en el piso. Ese cambio chiquito casi siempre es una articulación que duele, y llegar temprano es lo que decide cuánto se recupera. Empezamos con la valoración de movilidad y salís con su plan de rehabilitación.`

**Opción D**
H1: `Una segunda oportunidad <em>para el que ya no salta</em>`
Apoyo: `Perros y gatos que amanecen duros, acortan la caminata o dejaron de subirse al sofá. La artrosis no se cura y sí se maneja, y buena parte de lo que perdieron se recupera con fisioterapia, acupuntura e hidrocaminadora.`

**Opción E**
H1: `Que vuelva a ser <em>el mismo de siempre</em>`
Apoyo: `El dolor no se queja, se nota en el silencio: cuando deja de saltar al sillón y ya no te busca tanto para jugar. Somos expertos en devolverles la movilidad y las ganas de explorar el mundo, en Sabana Norte y en San Pablo de Heredia.`

**Elegida: NINGUNA de las 5.** René rechazó la opción A: "el dolor no se queja" no es algo que diría una persona real en español. El caption 13 es copy de agencia, no la voz de la Dra. Caro. Regla nueva: el hero debe pasar la prueba "¿alguien que conozco diría esto en voz alta?". El registro correcto es la pregunta simple de síntoma (caption 9, textual de ellos: "¿Tu mascota se mueve más lento?").

**Hero definitivo (registro natural):**
H1: `¿Tu mascota se mueve más lento <em>que antes</em>?`
Apoyo: `Le cuesta levantarse, ya no salta al carro o se queda atrás en las caminatas. Muchas veces no es la edad, es dolor que se puede tratar. Atendemos perros y gatos que se recuperan de una cirugía de rodilla o de columna, y también a los que llevan meses con artrosis. Empezamos con una valoración de movilidad y de ahí salís con su plan y los ejercicios para la casa.`

---

## 2. index.html

**H1 (hero)**
```
CURRENT: Rehabilitación veterinaria para que <em>vuelva a caminar bien</em>
NEW:     ¿Tu mascota se mueve más lento <em>que antes</em>?
```

**p (hero lead)**
```
CURRENT: ¿A tu perrito le cuesta levantarse, dejó de subirse al carro o ya no se mueve como antes? Atendemos perros y gatos que se recuperan de una cirugía de rodilla o de columna, y también a los que llevan meses con dolor de artrosis. Empezamos con una valoración de movilidad y un plan de rehabilitación, y de ahí salís con los ejercicios que le vas a hacer en casa.
NEW:     Le cuesta levantarse, ya no salta al carro o se queda atrás en las caminatas. Muchas veces no es la edad, es dolor que se puede tratar. Atendemos perros y gatos que se recuperan de una cirugía de rodilla o de columna, y también a los que llevan meses con artrosis. Empezamos con una valoración de movilidad y de ahí salís con su plan y los ejercicios para la casa.
```

**CTA (botón primario del hero)** — ojo: `Escribinos por WhatsApp` aparece dos veces en el archivo. Usar el ancla larga para pegar solo la del hero.
```
CURRENT:             Escribinos por WhatsApp
          </a>
          <a class="btn btn-ghost" href="#servicios">Ver tratamientos</a>
NEW:                 Agendá su valoración
          </a>
          <a class="btn btn-ghost" href="#servicios">Ver tratamientos</a>
```

**H2 (sección 03, hidroterapia)**
```
CURRENT: Hidrocaminadora HydroPhysio
NEW:     La hidrocaminadora es de nuestras terapias favoritas
```

**p (sección 03, segundo párrafo — se ajusta porque el H2 se lleva la frase)**
```
CURRENT: Es de nuestras terapias favoritas porque el paciente recupera estabilidad y confianza rápido. Está en la sede de Sabana y es uno de los dos equipos de este tipo que operan en clínicas veterinarias privadas del país.
NEW:     El paciente recupera estabilidad y confianza rápido, y eso la familia lo nota en las primeras sesiones. Nuestra HydroPhysio está en la sede de Sabana y es uno de los dos equipos de este tipo que operan en clínicas veterinarias privadas del país.
```

**Sección 04 (casos frecuentes): SIN CAMBIOS.** "Con qué llegan la mayoría" y su lead ya están en registro natural; el reemplazo propuesto ("Lo que en casa se lee como pereza o vejez") era escritura de copywriter, descartado.

**p (sección 05, historia de la clínica — se le agrega la misión de los 6 años)**
```
CURRENT: Vet Rehab empezó en pandemia, con la doctora Caro sola, haciendo domicilios y visitando clínicas de colegas con los equipos metidos en un carro pequeño. Hoy hay un equipo de doctoras veterinarias, asistentes y recepción, una sede completa en Sabana y otra en Heredia que acaba de cumplir su primer año.
NEW:     Vet Rehab empezó en pandemia, con la doctora Caro sola, haciendo domicilios y visitando clínicas de colegas con los equipos metidos en un carro pequeño. Hoy hay un equipo de doctoras veterinarias, asistentes y recepción, una sede completa en Sabana y otra en Heredia que acaba de cumplir su primer año. El objetivo con el que arrancó sigue siendo el mismo: darles calidad de vida, que se recuperen más pronto y mejor de sus cirugías, y darle una segunda oportunidad a los pacientes senior.
```

---

## 3. hidroterapia-perros.html

**H2 (sección 01)**
```
CURRENT: Qué cambia la flotabilidad
NEW:     Cuánto peso le quita el agua
```

**H2 (sección 02)**
```
CURRENT: Qué casos se benefician
NEW:     Para cuáles casos sirve más
```

**H2 (sección 03)**
```
CURRENT: Cómo es en la práctica
NEW:     Qué pasa el día de la sesión
```

**H2 (CTA final)**
```
CURRENT: Escribinos y contanos el caso de tu perro
NEW:     Contanos el caso de tu peludito y le armamos su plan
```

**p (CTA final)**
```
CURRENT: Mandanos el diagnóstico y la fecha de la cirugía si la hubo. En la valoración de movilidad definimos si la hidrocaminadora entra en su plan y a qué nivel de agua.
NEW:     Mandanos el diagnóstico y la fecha de la cirugía si la hubo, y agendá su valoración. Ahí definimos si la hidrocaminadora entra en su plan y a qué nivel de agua.
```

---

## 4. hernia-discal-perros.html

**H2 (sección 01)**
```
CURRENT: Salchichas y razas condrodistróficas
NEW:     Por qué les pasa tanto a los salchichas
```

**p (sección 04, límites): SIN CAMBIOS.** El texto actual ya es natural; el reemplazo ("Lo decimos antes, no después") era un remate de contraste, descartado.

---

## 5. ligamento-cruzado-perro.html

**H2 (sección 02)**
```
CURRENT: Lo que hay que tener claro desde el primer día
NEW:     Tres cosas que conviene saber desde el primer día
```

**H2 (CTA final)**
```
CURRENT: Escribinos con el reporte de la cirugía a mano
NEW:     Agendá su valoración con el reporte de la cirugía a mano
```

---

## 6. displasia-cadera-perros.html

**H2 (sección 02)**
```
CURRENT: Manejo conservador
NEW:     Cómo se maneja sin cirugía
```

**p (sección 01, lead de señales)**
```
CURRENT: La displasia rara vez empieza con una cojera evidente. Empieza con cambios de conducta que la familia lee como carácter o como edad. No lo dejés pasar.
NEW:     La displasia rara vez empieza con una cojera evidente. Empieza con cambios chiquitos que en casa se leen como carácter o como edad, y ninguno de estos es normal a ninguna edad. No lo dejés pasar.
```

**H2 (CTA final)**
```
CURRENT: Escribinos y contanos el caso de tu perro
NEW:     Contanos qué dejó de hacer y agendá su valoración
```

---

## 7. artrosis-perro-mayor.html

**H2 (sección 01): SIN CAMBIOS.** El actual ya es directo; "En casa se ve tranquilo, no adolorido" era un contraste de copywriter, descartado.

**H2 (sección 02)**
```
CURRENT: Qué se hace con un paciente artrósico
NEW:     Qué se puede hacer por un perro con artrosis
```

**p (CTA final)**
```
CURRENT: Decinos qué cambió y desde cuándo, y agendá su valoración. No normalicemos su falta de movimiento. Atendemos en Sabana, en Heredia y a domicilio.
NEW:     Decinos qué cambió y desde cuándo, y agendá su valoración. No normalicemos su falta de movimiento: darle una segunda oportunidad a un perro mayor es parte de lo que hacemos todos los días. Atendemos en Sabana, en Heredia y a domicilio.
```

---

## 8. fisioterapia-gatos.html

**H1**
```
CURRENT: ¿Los gatos también necesitan fisioterapia?
NEW:     ¿Tu gato ya no salta como antes?
```

**p (respuesta bajo el H1 — se ajusta porque el H1 deja de ser una pregunta de sí o no)**
```
CURRENT: Sí. Los gatos son expertos en ocultar el dolor, así que su artrosis, que es el desgaste de las articulaciones, casi no llega a consulta. Lo que hace tu gato es cambiar de hábitos: deja de saltar al mueble alto, empieza a fallar la caja de arena y se acicala menos. La fisioterapia le baja el dolor y le devuelve movimiento, con sesiones al ritmo que él aguante.
NEW:     Los gatos son expertos en ocultar el dolor, así que su artrosis, que es el desgaste de las articulaciones, casi no llega a consulta. Lo que hace tu gato es cambiar de hábitos: deja de saltar al mueble alto, empieza a fallar la caja de arena y se acicala menos. Sí, la fisioterapia también es para él. Le baja el dolor y le devuelve movimiento, con sesiones al ritmo que él aguante.
```

**H2 (sección 02)**
```
CURRENT: Lo que hay que observar en casa
NEW:     Las señales que solo se ven en casa
```

**H2 (CTA final)**
```
CURRENT: Escribinos y contanos el caso de tu gato
NEW:     Escribinos y contanos el caso de tu chineado
```

---

## 9. para-veterinarios.html

Registro colegial intacto. **H1 SIN CAMBIOS**: "Referí el caso y el paciente vuelve con vos" ya es natural; la versión de dos frases con punto era un remate publicitario, descartada.

**H2 (sección 03, modalidades) y su lead**
```
CURRENT: Según lo que le sirva al paciente y a tu operación.
NEW:     Tres modalidades, según lo que le sirva al paciente y a tu operación.
```

---

## 10. sede-sabana.html

**p (lead del hero)**
```
CURRENT: Terapia física y acupuntura veterinaria en Mata Redonda. Es la sede donde está la hidrocaminadora HydroPhysio, la caminadora dentro del agua.
NEW:     Terapia física y acupuntura veterinaria en Mata Redonda. Es la sede donde está la hidrocaminadora HydroPhysio, la caminadora dentro del agua donde muchos pacientes vuelven a apoyar la pata por primera vez.
```

**H2 (sección 01)**
```
CURRENT: Servicios de esta sede
NEW:     Qué encontrás en Sabana
```

---

## 11. sede-heredia.html

**p (lead del hero)**
```
CURRENT: Terapia física, acupuntura y láser para perros y gatos, contiguo a Gattos Centro Veterinario. La sede acaba de cumplir su primer año.
NEW:     Terapia física, acupuntura y láser para perros y gatos, contiguo a Gattos Centro Veterinario. La sede acaba de cumplir su primer año, con el mismo equipo de doctoras veterinarias que atiende en Sabana.
```

**H2 (sección 02)**
```
CURRENT: Servicios de esta sede
NEW:     Qué encontrás en Heredia
```

---

## 12. 404.html

**H1**
```
CURRENT: Esta dirección no lleva a ningún lado
NEW:     Esta página se nos perdió
```

---

## No cambiar (y por qué)

- **Todos los `<title>`, `<meta name="description">` y el JSON-LD.** Cargan las consultas por las que se llega al sitio y las respuestas que citan los buscadores. El H1 nuevo de portada ya no dice "rehabilitación veterinaria", pero el title, el kicker del hero y el primer H2 lo siguen diciendo.
- **Los H1 de hernia discal, ligamento cruzado, displasia y artrosis.** Los cuatro ya están escritos como pregunta de dueño ("¿Mi perro está viejito o le duele?") y coinciden con búsquedas reales. El de artrosis es el mejor del sitio.
- **Toda la sección de urgencia de hernia discal** (bloque `alert`, lista de señales, grados 1 a 5). Es contenido de triage y cualquier calentamiento del tono le quita filo.
- **Los párrafos clínicos y las tablas** de displasia, ligamento y para-veterinarios: técnica quirúrgica, tiempos, protocolos, goniometría. Están correctos y los diminutivos ahí sobran.
- **Todos los FAQ** (`summary` y respuestas) en las once páginas. Están redactados como los pregunta la gente y están replicados textualmente en el JSON-LD; cambiarlos obliga a cambiar los dos lados.
- **Direcciones, horarios, mapas, teléfonos y comentarios `[CONFIRMAR]`.**
- **Registro de para-veterinarios.** Solo se cambió el H1 y un lead; el resto se queda sobrio y sin vocabulario cálido.
- **"Escribinos por WhatsApp" del banner de cierre de portada y del resto de páginas.** Es claro y ya está en voseo; el botón del hero es el que pasa a "Agendá su valoración" para que el sitio tenga las dos llamadas y no una repetida.
- **Frases de marca que ya estaban bien** y se mantienen intactas: "No dejés que el dolor le apague la chispa", "No normalicemos su falta de movimiento" (se conserva dentro del párrafo reescrito), "La rehabilitación empieza donde termina la cirugía", "Un perro con dolor crónico casi nunca llora", "Tu gato deja de moverse porque le duele moverse".
- **Sin precios, sin testimonios, sin "la única hidrocaminadora del país".** Las afirmaciones que quedan son las defendibles: HydroPhysio nombrada, uno de dos equipos en clínicas privadas, una de cinco CCRP en Costa Rica, dos sedes.
