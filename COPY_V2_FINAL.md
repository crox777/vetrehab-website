# Vet Rehab — COPY V2 FINAL (síntesis de A y B)

Síntesis: base = propuesta A (Opus), con los aportes de B (Sonnet) donde ganan:
el opener de ligamento y el de displasia (responden el miedo antes que el mecanismo).
Ajustes propios marcados con [SÍNTESIS]. Cada entrada trae el texto actual textual como ancla de Edit.

---

## index.html

**p (hero lead)** — [SÍNTESIS: A con "que salen de" en lugar del gerundio]
```
CURRENT: Le cuesta levantarse, ya no salta al carro o se queda atrás en las caminatas. Muchas veces no es la edad, es dolor que se puede tratar. Atendemos perros y gatos que se recuperan de una cirugía de rodilla o de columna, y también a los que llevan meses con artrosis. Empezamos con una valoración de movilidad y de ahí salís con su plan y los ejercicios para la casa.
NEW:     Le cuesta levantarse, ya no salta al carro, se queda atrás en la caminata que antes hacía completa. En casa eso se lee como que ya está viejito, y casi siempre es dolor de articulación, que sí se trata. Atendemos perros y gatos que salen de una cirugía de rodilla o de columna, y también a los que llevan meses así. Empezás con la valoración de movilidad y ese mismo día salís con su plan y los ejercicios para la casa.
```

**ul.hero-facts (tarjeta completa)** — versión A
```
CURRENT:
        <ul class="hero-facts">
          <li><span class="n">01</span><span><b>Certificación CCRP</b>La doctora Caro se certificó en rehabilitación en la Universidad de Tennessee, una de cinco profesionales con esa certificación en Costa Rica.</span></li>
          <li><span class="n">02</span><span><b>Hidrocaminadora</b>HydroPhysio en la sede de Sabana, uno de dos equipos de este tipo en clínicas privadas del país.</span></li>
          <li><span class="n">03</span><span><b>Dos sedes y domicilio</b>Sabana Norte y San Pablo de Heredia, y visitas a casa cuando el viaje en carro ya es parte del problema.</span></li>
          <li><span class="n">04</span><span><b>Informe al veterinario</b>Si tu veterinario nos refiere el caso, recibe por escrito la valoración y cómo va tu mascota.</span></li>
        </ul>
NEW:
        <ul class="hero-facts">
          <li><span class="n">01</span><span><b>Los perros mayores también mejoran</b>Buena parte de lo que la artrosis les quita se recupera con fisioterapia. Darle una segunda oportunidad a un paciente senior es parte del trabajo de todos los días.</span></li>
<!-- Nota 2026-08-02: René descartó la certificación CCRP como beat de la tarjeta del hero ("not relevant at all"). La credencial queda solo en la sección 05 (quién atiende) y en el JSON-LD. El beat 01 pasa a la esperanza de P2: los seniors mejoran. -->
          <li><span class="n">02</span><span><b>Vuelven a caminar dentro del agua</b>En la hidrocaminadora el agua le sostiene el peso que las articulaciones todavía no aguantan, así que muchos pacientes dan pasos por su cuenta ahí adentro antes de poder darlos en seco.</span></li>
          <li><span class="n">03</span><span><b>Vamos a tu casa</b>Hay perros grandes que ya no pueden subir al carro sin dolor y pacientes mayores a los que el viaje los deja agotados. Llegamos con el equipo, además de las dos sedes en Sabana Norte y San Pablo de Heredia.</span></li>
          <li><span class="n">04</span><span><b>Tu veterinario recibe el informe</b>Si él te mandó para acá, le devolvemos por escrito la valoración y cómo va tu mascota. El paciente sigue siendo suyo y vos no tenés que andar contando la misma historia dos veces.</span></li>
        </ul>
```

**p.pull (sección 01)** — versión A: se retira el quiasmo de agencia
```
CURRENT: La rehabilitación empieza donde termina la cirugía.
NEW:     Camina a los tres días y apoyar bien esa pata le toma meses.
```

**p.lead (sección 01)** — versión A
```
CURRENT: Es fisioterapia para perros y gatos. Trabajamos el músculo, la articulación y el sistema nervioso para que tu mascota recupere fuerza, vuelva a doblar bien la pata y camine parejo, con el dolor controlado todo el camino.
NEW:     Si tu veterinario te dijo que necesita rehabilitación y saliste de la consulta sin tener claro qué es eso, es fisioterapia para perros y gatos. Trabajamos el músculo, la articulación y el sistema nervioso para que tu mascota recupere fuerza, vuelva a doblar bien la pata y camine parejo, con el dolor controlado todo el camino.
```

**p.lead (sección 02, tratamientos)** — versión A
```
CURRENT: La primera cita es la valoración de movilidad y el plan de rehabilitación. De ahí salen las técnicas que le sirven a tu mascota, cada cuánto tiene que venir y los ejercicios que le vas a hacer en casa entre una sesión y otra.
NEW:     La primera cita es la valoración de movilidad y dura alrededor de una hora. Miramos cómo camina, dónde le duele, cuánto músculo perdió y cuánto dobla cada articulación, y de ahí sale su plan: qué técnicas le sirven, cada cuánto tiene que venir y los ejercicios que le vas a hacer en casa entre una sesión y otra.
```

**p (sección 03, hidroterapia)** — [SÍNTESIS: Dottie en la versión B, más fiel al caption; sin la frase de "primeros pasos" porque ya la carga la tarjeta del hero]
```
CURRENT: El paciente recupera estabilidad y confianza rápido, y eso la familia lo nota en las primeras sesiones. Nuestra HydroPhysio está en la sede de Sabana y es uno de los dos equipos de este tipo que operan en clínicas veterinarias privadas del país.
NEW:     A Dottie le costaba muchísimo caminar por las secuelas de un derrame. Llegó a la clínica triste y con el cuerpo rígido. Con un plan hecho a su medida y sesiones en la hidrocaminadora recuperó la estabilidad, la confianza y ese brillo en los ojos que su familia ya extrañaba. Nuestra HydroPhysio está en la sede de Sabana y es uno de los dos equipos de este tipo que operan en clínicas veterinarias privadas del país.
```

**p.lead (sección 05, quién atiende)** — versión A
```
CURRENT: En la clínica todo el mundo le dice la doctora Caro. Es médica veterinaria certificada en rehabilitación física por la Universidad de Tennessee (CCRP) y <a href="https://www.ncsuvetce.com/canine-rehab-ccrp/ccrp-costa-rica/" rel="noopener">una de cinco profesionales con esa certificación en Costa Rica</a>.
NEW:     En la clínica todo el mundo le dice la doctora Caro. Vet Rehab empezó en pandemia, con ella sola, haciendo domicilios y visitando clínicas de colegas con los equipos metidos en un carro tan pequeño que se llenaba completo.
```

**p (sección 05, segundo párrafo)** — versión A
```
CURRENT: Vet Rehab empezó en pandemia, con la doctora Caro sola, haciendo domicilios y visitando clínicas de colegas con los equipos metidos en un carro pequeño. Hoy hay un equipo de doctoras veterinarias, asistentes y recepción, una sede completa en Sabana y otra en Heredia que acaba de cumplir su primer año. El objetivo con el que arrancó sigue siendo el mismo: darles calidad de vida, que se recuperen más pronto y mejor de sus cirugías, y darle una segunda oportunidad a los pacientes senior.
NEW:     Ese carrito ya es de alguien más. Hoy hay un equipo de doctoras veterinarias, asistentes y recepción, una sede completa en Sabana y otra en Heredia que acaba de cumplir su primer año. En el camino se fue a certificarse en rehabilitación física a la Universidad de Tennessee (CCRP) y es <a href="https://www.ncsuvetce.com/canine-rehab-ccrp/ccrp-costa-rica/" rel="noopener">una de cinco profesionales con esa certificación en Costa Rica</a>. El objetivo con el que arrancó sigue siendo el mismo: darles calidad de vida, que se recuperen más pronto y mejor de sus cirugías, y darle una segunda oportunidad a los pacientes senior.
```

**p.lead (sección 07, colegas)** — versión A
```
CURRENT: Recibimos pacientes referidos y devolvemos por escrito la valoración de movilidad, el plan y cómo va el paciente. El animal sigue siendo tuyo y la medicina general se queda con vos.
NEW:     El paciente vuelve con vos. Recibimos el referido, hacemos la rehabilitación y te devolvemos por escrito la valoración de movilidad, el plan y cómo va, y la medicina general se queda en tu clínica.
```

**p (sección 07, segundo párrafo)** — versión A
```
CURRENT: También damos terapia dentro de la clínica del colega cuando trasladar al paciente complica el tratamiento, y los ortopedistas que pasan consulta con nosotros atienden en nuestras instalaciones.
NEW:     Vet Rehab empezó dando terapia dentro de clínicas de colegas y eso sigue vivo: llegamos con el equipo cuando trasladar al paciente complica el tratamiento. Los ortopedistas que pasan consulta con nosotros atienden en nuestras instalaciones.
```

**p.lead (banda final)** — versión A
```
CURRENT: No dejés que el dolor le apague la chispa. Escribinos por WhatsApp en horario de clínica, contanos qué dejó de hacer y desde cuándo, y agendá su valoración. Si tu perro dejó de mover las patas de un momento a otro, llamá en vez de escribir.
NEW:     Contanos qué dejó de hacer y desde cuándo, aunque te parezca una tontera: dejó de subirse al sofá, se queda atrás en la vuelta, amanece duro. Con eso ya te decimos si es un caso para nosotros y te agendamos la valoración. No dejés que el dolor le apague la chispa. Si tu perro dejó de mover las patas de un momento a otro, llamá en vez de escribir.
```

---

## hidroterapia-perros.html — versión A (3 entradas)

```
CURRENT: La hidroterapia es fisioterapia dentro del agua. En la hidrocaminadora, que es una caminadora subacuática, tu perro camina sobre una banda mientras el agua le sostiene parte del peso, así que apoya la pata operada antes y con menos dolor. El agua además le pone resistencia, de modo que cada paso le trabaja más músculo.
NEW:     La hidroterapia es fisioterapia dentro del agua. En la hidrocaminadora, que es una caminadora subacuática, tu perro camina sobre una banda mientras el agua le sostiene parte del peso, así que apoya la pata operada antes y con menos dolor. El agua además le pone resistencia, de modo que cada paso le trabaja más músculo. Muchos pacientes vuelven a dar pasos por su cuenta ahí adentro semanas antes de poder darlos en seco.
```
```
CURRENT: La sesión siempre la supervisa una doctora veterinaria dentro del área, con la temperatura, el nivel del agua y la velocidad ajustados a tu perro.
NEW:     La sesión siempre la supervisa una doctora veterinaria dentro del área, con la temperatura, el nivel del agua y la velocidad ajustados a tu perro. Nunca se queda solo ahí adentro.
```
```
CURRENT: Mandanos el diagnóstico y la fecha de la cirugía si la hubo, y agendá su valoración. Ahí definimos si la hidrocaminadora entra en su plan y a qué nivel de agua.
NEW:     Mandanos el diagnóstico y la fecha de la cirugía si la hubo, y agendá su valoración. Ahí definimos si la hidrocaminadora entra en su plan, a qué nivel de agua y cuántos minutos aguanta la primera vez.
```

---

## hernia-discal-perros.html

**p (respuesta bajo el H1)** — [SÍNTESIS: reconocimiento de A sin el "esto... esto"]
```
CURRENT: Una hernia discal es un disco de la columna que se sale de su lugar y le aprieta la médula. Si tu perro no mueve las patas traseras o no siente cuando le pellizcás fuerte un dedo, salí ya mismo a una clínica con cirugía. Si todavía camina, aunque sea con dolor, lo que sigue es reposo estricto, analgesia y rehabilitación.
NEW:     Si estás leyendo esto de madrugada, lo primero es decidir si es urgencia esta misma noche. Una hernia discal es un disco de la columna que se sale de su lugar y le aprieta la médula. Si tu perro no mueve las patas traseras o no siente cuando le pellizcás fuerte un dedo, salí ya mismo a una clínica con cirugía. Si todavía camina, aunque sea con dolor, lo que sigue es reposo estricto, analgesia y rehabilitación.
```

**h2 (CTA final)** — versión A
```
CURRENT: Contanos qué le pasa a tu perro
NEW:     Cuando pase la emergencia, escribinos
```

**p.lead (CTA final)** — versión A
```
CURRENT: Si ya lo operaron, escribinos con la fecha de la cirugía y el reporte quirúrgico a mano. Empezamos con la valoración de movilidad y el plan de rehabilitación. Atendemos en Sabana, en Heredia y a domicilio.
NEW:     Si ya lo operaron, mandanos la fecha de la cirugía y el reporte quirúrgico. Empezamos con la valoración de movilidad y el plan de rehabilitación, y si tu perro todavía no controla la vejiga te enseñamos a vaciársela con la mano antes de que se vayan de esa primera cita. Atendemos en Sabana, en Heredia y a domicilio.
```

---

## ligamento-cruzado-perro.html

**p (respuesta bajo el H1)** — [SÍNTESIS: apertura B (responde el miedo primero) + cierre A]
```
CURRENT: La rodilla operada aguanta peso a los pocos días y el músculo tarda meses en volver. La rehabilitación arranca en la primera o segunda semana después de la cirugía y avanza por fases hasta los tres o cuatro meses, que es cuando tu perro vuelve a jugar y correr sin restricción.
NEW:     Tu perro va a volver a correr y a jugar. La cirugía le arregla la rodilla en cuestión de semanas, pero el músculo que perdió cojeando tarda meses en regresar, y ahí es donde entra la rehabilitación. Arranca en la primera o segunda semana después de la cirugía y avanza por fases hasta los tres o cuatro meses, que es cuando vuelve a correr sin restricción. Lo que pase en esos meses es lo que define cuánta pata recupera.
```

**p.lead (sección 03, coordinación)** — versión A
```
CURRENT: Antes de la primera sesión pedimos el reporte de la cirugía y las radiografías. Cada cambio de fase se consulta con él, y él recibe por escrito cómo va tu perro.
NEW:     Antes de la primera sesión pedimos el reporte de la cirugía y las radiografías. Cada cambio de fase se consulta con quien operó, y él recibe por escrito cómo va tu perro, así que llega al control sabiendo qué pasó en las semanas de por medio.
```

**p.lead (CTA final)** — versión A
```
CURRENT: Contanos la fecha en que lo operaron y qué técnica le hicieron. Atendemos en Sabana, en Heredia y a domicilio, que para las primeras semanas suele ser lo más cómodo.
NEW:     Contanos la fecha en que lo operaron y qué técnica le hicieron, y agendá su valoración. Atendemos en Sabana, en Heredia y a domicilio, que en las primeras semanas es lo que más rinde, porque el perro no tiene que subirse al carro con la rodilla recién operada.
```

---

## displasia-cadera-perros.html

**p (respuesta bajo el H1)** — [SÍNTESIS: idea de B, sin la frase de anuncio "lo primero es esto:"]
```
CURRENT: La displasia es una cadera que se formó mal y que con los años termina en artrosis, o sea desgaste de la articulación. Se opera cuando el dolor no cede o cuando el perro es un cachorro candidato a corrección. En el resto de los casos se maneja con control de peso, fisioterapia y analgesia, y buena parte de esos pacientes vive muy bien sin pasar por pabellón.
NEW:     Si a tu perro ya le dijeron displasia, lo más importante es que no todos terminan en cirugía. La displasia es una cadera que se formó mal y que con los años termina en artrosis, o sea desgaste de la articulación. Se opera cuando el dolor no cede o cuando el perro es un cachorro candidato a corrección. En el resto de los casos se maneja con control de peso, fisioterapia y analgesia, y buena parte de esos pacientes vive muy bien sin pasar por pabellón.
```

**p.lead (CTA final)** — versión A
```
CURRENT: En la valoración de movilidad medimos cómo camina, dónde le duele, cuánto músculo perdió y cuánto dobla cada articulación. Con eso te decimos qué se puede ganar y en cuánto tiempo. Traé las radiografías si ya las tenés.
NEW:     En la valoración de movilidad medimos cómo camina, dónde le duele, cuánto músculo perdió y cuánto dobla cada articulación. Con eso te decimos qué se puede ganar y en cuánto tiempo, sin prometerte una cadera nueva. Traé las radiografías si ya las tenés.
```

---

## fisioterapia-gatos.html — versión A (3 entradas)

```
CURRENT: La mayor parte de nuestra consulta diaria es de perros. Atendemos gatos, tenemos el equipo y el entrenamiento para hacerlo, y ajustamos todo a lo que un felino aguanta. Si tu gato necesita algo que nosotros no cubrimos, te lo decimos y lo devolvemos con su veterinario.
NEW:     Atendemos gatos, tenemos el equipo y el entrenamiento para hacerlo, y ajustamos cada sesión a lo que un felino aguanta. También te lo decimos de frente: la mayor parte de nuestra consulta diaria es de perros. Si tu gato necesita algo que nosotros no cubrimos, te lo decimos y lo devolvemos con su veterinario.
```
```
CURRENT: Tu gato deja de moverse porque le duele moverse.
NEW:     Lo que nos contás de la casa vale más que cualquier examen aquí.
```
```
CURRENT: Mandanos la lista de lo que dejó de hacer y desde cuándo lo notás, y agendá su valoración. Atendemos en Sabana, en Heredia y a domicilio.
NEW:     Mandanos la lista de lo que dejó de hacer y desde cuándo: el estante alto que abandonó, la caja de arena que empezó a fallar, el pelo apelmazado sobre las caderas. Con eso agendamos su valoración. Atendemos en Sabana, en Heredia y a domicilio.
```

---

## para-veterinarios.html — versión A (3 entradas)

```
CURRENT: Recibimos pacientes referidos para terapia física, acupuntura e hidrocaminadora, y te devolvemos por escrito la valoración de movilidad, la evolución y el informe de egreso. Toda la medicina general se queda con vos. Aquí no damos consulta general ni manejamos vacunación y desparasitación, y tampoco abrimos un expediente paralelo al tuyo.
NEW:     Vet Rehab empezó dando terapia dentro de clínicas de colegas, así que sabemos lo que pesa mandar un paciente a otro lado. Recibimos referidos para terapia física, acupuntura e hidrocaminadora, y te devolvemos por escrito la valoración de movilidad, la evolución y el informe de egreso. Toda la medicina general se queda con vos: aquí no damos consulta general ni manejamos vacunación y desparasitación, y tampoco abrimos un expediente paralelo al tuyo.
```
```
CURRENT: Entre más temprano entra el paciente, menos atrofia hay que revertir. Los casos que nos llegan tarde casi siempre esperaron a que el perro estuviera curado del todo.
NEW:     Entre más temprano entra el paciente, menos atrofia hay que revertir. Los casos que nos llegan tarde casi siempre esperaron a que el perro estuviera curado del todo, y para entonces ya lleva tres meses cargando el peso en la pata sana.
```
```
CURRENT: Respondemos en horario de clínica, lunes a viernes de 9:00 a 18:00 y sábados de 8:00 a 13:00.
NEW:     Mandanos el resumen y te contestamos qué esperar de ese caso, incluso cuando la respuesta es que la rehabilitación no le va a cambiar gran cosa. Respondemos en horario de clínica, lunes a viernes de 9:00 a 18:00 y sábados de 8:00 a 13:00.
```

---

## sede-sabana.html

**p.lead (sección 01)** — [SÍNTESIS: la versión A afirmaba un hecho no verificado sobre pacientes de Heredia; se convierte en oferta]
```
CURRENT: En Sabana está el equipo completo, incluida la única hidrocaminadora de las dos sedes.
NEW:     En Sabana está el equipo completo, incluida la hidrocaminadora, que es la única de las dos sedes. Si estás en Heredia, podés hacer las sesiones de agua acá y el resto del plan allá.
```

---

## Se queda como está

Lo mismo que listan A y B: todos los title/meta/JSON-LD/FAQ, los seis H1 (portada y casos), artrosis-perro-mayor.html completa (página modelo), el bloque de urgencia de hernia, los protocolos y tablas clínicas, el compromiso de co-manejo, sedes salvo la entrada de arriba, 404, direcciones/horarios/[CONFIRMAR]/WhatsApp. Descartado de B: el bloque duplicado de Dottie en hidroterapia (la historia ya vive en portada; en hidroterapia queda la frase de "pasos dentro del agua") y "no se queda con nosotros" (contraste de remate).
