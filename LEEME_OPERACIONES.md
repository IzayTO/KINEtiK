# NODO 09 · Operaciones — parche de combate

## Instalar desde el iPhone

Descomprime este ZIP y sube sus archivos sueltos a la raíz de KINEtiK. Reemplaza los nombres existentes y agrega los que falten. No borres los demás archivos del repositorio. No necesitas compilación, instalaciones ni servicios externos.

Después de publicar, abre el juego con conexión una vez; cierra todas sus pestañas y vuelve a abrirlo para activar la nueva caché. El worker evita actualizar una partida en curso. Tus preferencias y distribuciones HUD siguen guardadas.

## Reemplazar

`audio.js`, `combat.js`, `game.js`, `hud.js`, `index.html`, `input.js`, `match.js`, `navigation.js`, `preferences.js`, `settings-v2.js`, `soldier.js`, `style.css`, `sw.js`, `weapon-models.js`, `world-v3.js`.

## Agregar

`aim-support.js`, `audio-bank.js`, `blood.js`, `bot-roster.js`, `combat-feedback.js`, `combat-ui.js`, `environment.js`, `field-hud.js`, `field-models.js`, `field-view.js`, `loot-visuals.js`, `objectives.js`, `ordnance.js`, `supplies.js`, y este `LEEME_OPERACIONES.md` (instrucciones; no es necesario para jugar).

La copia de GitHub consultada todavía contiene la V3 anterior a los últimos parches entregados. Por eso se incluyen también las dependencias de esas mejoras: noche, sangre, asistencia, consumibles y pantalla de muerte. Si ya subiste alguno de esos archivos, reemplázalo con el incluido. Ningún archivo de código idéntico al repositorio consultado está en este ZIP. `physics.js`, `level.js`, `render.js` y Three.js permanecen intactos.

## Cómo usar lo nuevo

- Selector: K-09 y S-07 abajo; filo, granada, Molotov y gas arriba; antídoto a la izquierda. Las imágenes se calculan una sola vez a partir de sus modelos reales. Casillas pequeñas y antídoto se editan individualmente; las dos armas largas se editan como grupo en Personalizar HUD.
- Toca el objeto, mantén APUNTAR para ver la trayectoria y pulsa DISPARAR. Con mouse: mantener botón derecho y pulsar izquierdo. Teclas G / T / N: granada / Molotov / gas. V: antídoto. Se conservan 1 / 2 / 3 para filo / K-09 / S-07.
- Reaparición: 3 granadas, 3 Molotov, 2 gases, 2 antídotos. No se regeneran durante esa vida. ×0 bloquea la casilla; agotar el lanzable devuelve la K-09. El antídoto solo se gasta si estás intoxicado.
- Granada: se detiene al tocar suelo; explota un segundo después. Radio de 5 m, hasta 140 puntos, daño menor con distancia y paredes que bloquean. Puede dañarte; no daña aliados.
- Molotov: extensión aproximada de 9 m de diámetro (radio máximo 4.5 m), contorno irregular. Crece durante 1 s; 12 puntos cada 0.5 s, pleno hasta 8 s y decreciente hasta 11 s. La marca se desvanece durante los siguientes 15 s. Fuego bloqueado por paredes y desniveles.
- Gas: radio/altura aproximados de 2.5 m. Activo 2.5 s y disipación de 1 s. Exposición continua de 1 s aplica cuatro pulsos de 20 a la vida durante 8 s, sin acumularse ni bajar de 1 HP. Antídoto instantáneo con gesto de jeringa y protección breve frente al gas restante.
- Números: daño real azul al escudo y blanco a la vida, incluido el sobrante del mismo impacto. Desaparecen en 0.9 s. El arco rojo marca la dirección del daño recibido, no de balas cercanas.
- Partida → Captura la Bandera: lleva la enemiga a tu base con la tuya presente. Bandera caída: un aliado la devuelve al tocarla; un enemigo puede recogerla; retorno automático tras 25 s. Límites de 1, 3, 5 o 10 capturas.
- Partida → Dominación: A/B/C/D; 10 s de captura en solitario, 1.5 s menos por compañero adicional, mínimo 4 s. Disputa pausa; salir conserva progreso. Una zona enemiga debe neutralizarse y después capturarse. Cada zona controlada suma 1 punto/s. Límites 100, 200 o 500. Ambos modos conservan duración configurable y Sin límite.

## IA, sonido y coste

Los bots gastan el mismo inventario, evalúan trayectorias contra el mapa y evitan lanzar cerca de aliados. Eligen lanzables según perfil, distancia y situación, incluyendo últimas posiciones confirmadas recientemente. Reconocen peligros con distancia, visión, memoria y demora de reacción; las rutas penalizan peligros conocidos. En bandera atacan, defienden, escoltan o recuperan; en dominación distribuyen objetivos y capturan/defienden zonas. Una corrección localizada permite descartar nodos que el suavizado de rutas ya había saltado, evitando vueltas innecesarias. No se alteraron las físicas del jugador.

Sonidos originales sintetizados una vez: cuerpo de disparos, mecanismos, casquillos, pisadas, explosión, vidrio, fuego, gas y jeringa. Se mantiene audio espacial, prioridades y máximo de 14 voces. Sin archivos de audio externos, nuevas sombras, postprocesamiento ni dependencias.

Efectos con geometrías/materiales reutilizados: máximo 48 proyectiles y 64 áreas/marcas simultáneas. Las miniaturas no necesitan otra cámara WebGL. Proyección de números/indicadores por fotograma, minimapa de objetivos a 10 Hz y cálculo de trayectoria a 30 Hz. Las decisiones de IA conservan sus frecuencias reducidas.

## Comprobaciones realizadas y límites

16 grupos de pruebas de lógica pasaron en Node: daño dividido/protección, inventario y agotamiento, trayectoria contra paredes, granada y fusible, fuego/duración, gas/no acumulación/vida mínima, antídoto, bandera, dominación/contienda/refuerzos/puntuación, objetivos y lanzamientos de IA, memoria limitada, audio finito y enlaces de recursos.

Además se ejecutaron 60 segundos simulados por modo sobre las colisiones y navegación reales de NODO 09, con 4 bots y combate: bandera terminó ese intervalo rojo 2 / azul 1 con 3 lanzamientos; dominación rojo 84 / azul 50 con 4 lanzamientos y 7 capturas de zona. Estas cifras son resultados de esa ejecución determinista, no una promesa de equilibrio. Se comprobaron modelos, miniaturas y matrices de efectos sin renderizar el mundo; también sintaxis, archivos locales, caché y ZIP plano.

Las comprobaciones no miden FPS ni calidad visual/auditiva en el teléfono. El balance, el aspecto final, el tacto y el rendimiento durante tus partidas quedan para tu evaluación, como pediste. Los efectos son representaciones ligeras con planos translúcidos: no fluidos volumétricos. La IA usa reglas tácticas y rutas, no planificación humana; aún puede tomar decisiones subóptimas bajo combate intenso. Al llenar todos los espacios del pool, un nuevo lanzamiento espera a que quede espacio sin gastar inventario.
