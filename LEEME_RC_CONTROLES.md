# NODO 09 · RC, controles y operaciones

Actualización sobre la versión «COMBATE Y OBJETIVOS» del repositorio IzayTO/KINEtiK, revisada el 13 de noviembre de 2026. Este ZIP contiene solamente los archivos nuevos y modificados; no es el juego completo.

## Instalación

Descomprime y sube TODOS los archivos sueltos a la raíz del repositorio, donde está index.html. Reemplaza los que tengan el mismo nombre. Conserva los demás archivos existentes. No requiere compilación ni carpetas nuevas.

- **Reemplazar:** audio.js, field-view.js, game.js, hud.js, index.html, input.js, match.js, objectives.js, ordnance.js, preferences.js, settings-v2.js, sw.js, world-v3.js.
- **Agregar:** field-effects.js, interface.css, interface.js, rc.js, rc-view.js y este LEEME_RC_CONTROLES.md.

Una vez publicada la actualización, abre la página para descargarla, cierra las otras pestañas del juego y vuelve a abrirla. El caché sin conexión se renueva cuando se cierran las pestañas de la versión anterior. Tus ajustes y distribuciones del HUD se conservan.

## Lanzar y apuntar

Con un lanzable, toca APUNTAR para mostrar u ocultar la trayectoria. También puedes mantener DISPARAR directamente: aparece la trayectoria, arrastras el dedo incluso fuera del botón para dirigirla y sueltas para lanzar. Subir o bajar la mirada cambia el alcance. Cancelar el gesto, pausar o cambiar de orientación no lanza el objeto.

La trayectoria se recalcula cada fotograma renderizado desde la posición interpolada del personaje. El círculo marca la primera colisión prevista; la granada puede rebotar si golpea una pared.

En PC: clic derecho alterna la trayectoria; mantén clic izquierdo, orienta con el mouse y suelta para lanzar.

En **Opciones → Controles**, activa «Activar mira al mantener presionado botón de acción/disparo». Con K-09 o S-07, mantener DISPARAR entra en ADS, permite arrastrar para apuntar y respeta la cadencia y el modo del arma. Al soltar, termina el disparo y el ADS de ese gesto. La opción está desactivada inicialmente.

## RC explosivo

Cada 10 bajas obtienes una carga; las no utilizadas se acumulan y sobreviven a tus reapariciones. Se reinician al iniciar otra partida.

La casilla RC aparece junto al antídoto cuando tienes cargas. Se mueve, escala y ajusta desde el editor HUD. En PC puedes desplegar con X. Debes estar en el suelo y tener espacio cercano.

El monitor asciende desde abajo. Joystick/WASD mueve el RC; SALTO/Espacio permite saltar; SPRINT/Shift activa turbo; DISPARAR/clic izquierdo detona. También explota al tocar un enemigo o después de 20 segundos. Las paredes bloquean el movimiento y no lo hacen explotar.

Elimina enemigos a 2,5 m o menos y causa daño decreciente entre 2,5 y 4 m, respetando paredes, equipos y protección de aparición. Tras «SEÑAL PERDIDA» se guarda el monitor y recuperas la cámara del personaje. Tu personaje permanece vulnerable durante el control remoto; morir interrumpe el enlace.

## Otras mejoras

- Inicio con Partida rápida, Selección de modos, Multijugador bloqueado y Opciones. Cinco tarjetas de modos, transiciones cortas y configuración agrupada.
- Partida rápida elige modos competitivos, 4–8 bots, día/noche, dificultad y duración de 10 o 15 minutos. Usa límites de 100 bajas, 10 capturas o 500 puntos, según el modo. La partida puede terminar antes si se alcanza su objetivo.
- El editor HUD utiliza una captura estática de la perspectiva actual; los controles reales siguen siendo editables. No avanza la simulación.
- Avisos centrales de banderas, zonas y rachas, con entrada/salida suave y dos segundos por aviso. Cola limitada para evitar saturación.
- Nube N-09: 10 segundos activa y 1 segundo de desvanecimiento. La intoxicación conserva sus reglas anteriores de 8 segundos; el antídoto sigue funcionando.
- Molotov: radio máximo de 11,5 m (7 m adicionales respecto a los 4,5 anteriores), con borde irregular. Fuego, humo y quemado moteado renovados; paredes y pisos siguen limitando el daño. Los bots consideran el nuevo tamaño al lanzar y escapar.
- Explosiones por capas, destello breve, humo, polvo y fragmentos ligeros. Sin luces o sombras dinámicas nuevas ni postprocesamiento.
- Movimiento de cámara ajustable de 0 a 4×; valor inicial conservado en 0,65×.

## Comprobaciones realizadas

Sintaxis JavaScript, imports, referencias HTML, estructura de paneles y recursos del caché. Comprobaciones de lógica de lanzamiento/cancelación, ADS, inventario y duración del RC, colisiones del RC, distancias de daño, paredes y equipos, contacto enemigo, acumulación de rachas, partida rápida y duración del gas. Geometría de efectos y predicción verificadas numéricamente, sin renderizar el juego.

physics.js, level.js, navigation.js, combat.js, weapon-models.js y soldier.js permanecen idénticos a la versión base. Se añaden integraciones de rachas y efectos sin sustituir esos sistemas.

No se realizaron pruebas de jugabilidad ni mediciones de FPS en esta entrega. El acabado visual, el tacto de los gestos y el rendimiento quedan para tu prueba del juego. Los efectos tienen límites de geometría y se comparten texturas/materiales; el monitor utiliza la misma cámara de renderizado, sin una segunda vista 3D simultánea.
