# NODO 09 · Informe V2 · 7 de noviembre de 2026

## Procedencia y conservación

Se trabajó desde los archivos reales de https://github.com/IzayTO/KINEtiK, revisión `3b8b4d5d0fc550607b9b8832e48d790498d92229`. Se verificó que los 16 archivos descargados previamente coincidían byte por byte con el contenido del repositorio mediante sus hashes Git.

`physics.js`, `level.js` y `render.js` originales se conservan sin cambiar sus bytes. Las ampliaciones del render viven en `world-v2.js`, que hereda la cámara y la capa de movimiento originales. `refinements.js` agrega acabados visuales después de crear el mapa; no modifica ninguno de los 139 sólidos de colisión.

No hubo cambios inevitables en la física. Se conservaron caminar 4.2 m/s, carrera 7.4 m/s, sprint 11.5 m/s, aceleración 46 m/s², fricción 8 s⁻¹, salto 8.6 m/s, gravedad 24 m/s², impulso slide 2.6 m/s, duración 1.25 s, desaceleración 4.2 m/s², control aéreo 0.34 y FOV horizontal inicial 100°. Se siguen cargando los ajustes personalizados V1. El reloj sigue a 120 Hz con los mismos subpasos y límites de delta.

## Fase A · Control

- Editor sobre la vista del juego, con entradas y simulación suspendidas, render activo y posición, velocidad y cámara conservadas. Selección, arrastre, tamaños, opacidad individual, guardar/cancelar/restaurar/vista previa. Dieciséis elementos reales, incluido el menú. Coordenadas normalizadas dentro de áreas seguras y almacenamiento por orientación. El selector y el asa superior permiten mover elementos cubiertos por la barra. No se recrean los nodos al abrirlo.
- ADS resuelto a partir del eje entre alza y punto delantero. Se interpola hacia una transformación que lleva ambos al eje -Z de la cámara del arma; a ADS completo no queda desplazamiento lateral ni rotación por balanceo. El disparo usa el centro óptico de la cámara del mundo. El retroceso visual ADS es longitudinal.
- Cinco variantes de retícula, parámetros persistentes y expansión calculada desde el cono real de dispersión y la proyección de cámara. Retícula inicial de segmentos de 1 px.
- Sensibilidad horizontal/vertical/ADS para mouse y táctil, inversión y multiplicador global original.
- Minimapa Canvas 2D construido una vez desde las descripciones geométricas, con jugador, rumbo, referencias, límites y marcador. Actualización máxima 10 Hz, sin segunda cámara 3D.
- Marcador por primer impacto en arquitectura. Si la dirección no encuentra una superficie interior válida, se busca suelo con espacio para el personaje dentro del recinto. Un único marcador reutilizado, distancia y pulso breve.

## Fase B · Combate

- Tres ranuras: cuchillo inverso, rifle largo K-09 y escopeta de corredera S-07. Sin pistola ni inventario.
- K-09 con 30 cartuchos, cadencia de 0.105 s, auto/semi y recarga de 1.55 s. La recarga mueve cargador y brazo; la reserva es ilimitada.
- S-07 con siete cartuchos, nueve rayos por disparo, caída de daño por distancia, intervalo de bombeo 0.82 s y alimentación cartucho por cartucho. Se puede interrumpir para disparar si hay munición. El cambio de arma no reinicia su tiempo de bombeo.
- Cuchillo con hoja orientada hacia el antebrazo, brazo superior, antebrazo y muñeca animados. Corte cruzado, retorno y descendente, con impacto diferido en la fase de ataque. Alcance 2.2 m, ángulo limitado y comprobación de pared. Un impacto válido elimina al maniquí. No altera el movimiento.
- Doce maniquíes con cabeza, torso, brazos y piernas, 100 puntos de vida y zonas diferenciadas. Reaparecen a los cuatro segundos; sin IA ni ragdoll.
- Asistencia a pecho superior, activada por defecto para táctil: moderación de sensibilidad y corrección pequeña limitada por la entrada manual. Comprueba visibilidad y rango, también al aplicar la ayuda; no actúa sin movimiento de mirada y no redirige los disparos.
- Estados de armas independientes del controlador. Sprint, slide, salto, caída, aterrizaje y disparo conservan la capa de movimiento de brazos; las nuevas recargas, bombeo y ataques la complementan.

## Fase C · Arquitectura y legibilidad

Se conserva la distribución industrial de seis zonas y su paleta gris, turquesa y naranja. Se añadieron jambas y remates de accesos existentes, placas de apoyo en pilares/vigas, uniones de la grúa, zócalos y pequeños acentos en pasos técnicos. No se añadieron obstáculos a las rutas.

Se separaron ligeramente los tonos de pavimento, asfalto, acero y superficies claras. Se conserva la iluminación hemisférica/direccional y el sombreado estático sencillo del original. No se añadieron sombras dinámicas, postprocesamiento, texturas grandes ni shaders especiales. Los tres modelos de armas tienen siluetas propias y componentes móviles independientes.

## Fase D · Optimización y pruebas ejecutadas

Los doce maniquíes se agrupan en cuatro mallas instanciadas. Las piezas estáticas de las armas se combinan por material; solo se presenta el arma equipada. Los efectos usan el pool original de 16 impactos y un trazador reutilizado. El marcador es único. El plano del minimapa se genera una vez y el HUD se actualiza con frecuencia limitada. Continúan el límite de densidad de píxeles y la resolución adaptativa originales. El cálculo de FPS ahora utiliza el tiempo real del cuadro, aunque el delta físico siga limitado.

**62 comprobaciones automáticas correctas:** 24 del movimiento original, 22 nuevas de combate/geometría/configuración y 16 de DOM/controles. Las primeras 46 se ejecutaron en Node y en Chrome; las 16 del HUD se ejecutaron en Chrome con los elementos y manejadores reales, mediante eventos sintéticos. No se cuentan como pruebas adicionales las repeticiones de una misma comprobación.

Se verificaron sprint, diagonal, frenado, impulso y desaceleración slide, slide jump, aterrizaje/encadenamiento, coyote/buffer, control aéreo, agachado bajo techo, paredes finas, esquinas, escalones, rampas y recorridos originales. Una comparación adicional de **12 000 pasos** frente al controlador V1 produjo posiciones, velocidades, alturas y estados exactamente iguales. La simulación y cadencia coinciden a 30/60/144 Hz de cuadros suministrados al reloj fijo; esto no representa una medición de FPS gráficos.

Se probaron cargadores, recargas, auto/semi, bombeo, perdigones, cambio de arma, cuchillo, daños/zonas/oclusiones, marcador y ADS en 18 combinaciones de arma, FOV y proporción de pantalla. También 720 pasos de movimiento con disparos, cambios y animaciones sin modificar posición ni velocidad del controlador.

El HUD pasó selección, arrastre, tamaño y centro, opacidad cero, guardado/restauración/cancelación, reconstrucción desde localStorage, perfiles separados, límites matemáticos, varios pointerId simultáneos, cancelación de dedos, sensibilidad y bloqueo exacto de posición/cámara/velocidad. Reabrirlo seis veces no aumentó la cantidad de nodos. No se realizó una rotación física de teléfono; se verificaron los perfiles y cálculos de orientación.

### Mediciones y límites

Recuento del grafo Three.js en Node, sin atlas de señales Canvas, incluyendo geometría de armas inactivas y efectos reservados:

| Dato | V1 | V2 |
|---|---:|---:|
| Triángulos totales descritos | 7 500 | 5 946 |
| Mallas | 70 | 68 |
| Objetos del grafo | 118 | 102 |
| Materiales únicos | 47 | 44 |
| Buffers CPU únicos de geometría e instancias | 452 352 bytes | 142 052 bytes |
| Lotes de mallas visibles antes del descarte por cámara | 53 | 35 |

Estos lotes **no son draw calls medidos**. En Chrome, el atlas de señales añade una malla y 22 triángulos, compartidos con la versión original. La reducción de geometría no demuestra por sí sola un aumento de FPS.

Microbenchmark de CPU del contenedor: controlador V1 0.00206 ms/paso; V2 0.00200 ms/paso (20 000 pasos, después de calentamiento). Actualización de cámara/pose V2 0.01221 ms y búsqueda de candidato de asistencia 0.06259 ms, en sus cargas sintéticas. Son cifras de este entorno, sensibles al equipo y a la carga; no predicen Safari.

En Chrome de escritorio, 200 actualizaciones reales de Canvas 2D del minimapa promediaron aproximadamente **0.0055 ms de CPU** por actualización. La lectura aproximada del heap JS de esa sesión fue 6 807 232 bytes; no incluye memoria gráfica ni constituye un límite de memoria del juego.

**No se midieron FPS 3D, tiempo GPU ni draw calls de una partida renderizada:** WebGL está desactivado en el navegador de este entorno. La interfaz se ejecutó mediante el modo explícito de diagnóstico sin 3D; los raycasts, geometrías, matrices y proyecciones Three.js sí son reales. El modo normal sigue usando WebGL y no sustituye el juego por una imagen. No se intentó probar ni emular un iPhone. Quedan pendientes la revisión visual con GPU, la comodidad táctil física y el rendimiento sostenido real.

## Archivos

Modificados: `index.html`, `style.css`, `input.js`, `game.js`, `README.md`, `INFORME.md`, `tests.html`, `verify-scene.js` (entrada de compatibilidad para las nuevas pruebas).

Nuevos: `preferences.js`, `hud.js`, `settings-v2.js`, `combat.js`, `weapon-models.js`, `world-v2.js`, `refinements.js`, `verify-v2.js`, `verify-hud.js`, `PRUEBAS.json`.

Conservados byte por byte: `physics.js`, `level.js`, `render.js`, `audio.js`, `verify.js`, `three.module.min.js`, `THREE-LICENSE.txt`, `icon.svg`.

## Simplificaciones y problemas pendientes

No quedaron fallos en las comprobaciones ejecutadas. La validación gráfica indicada arriba sigue pendiente. Los maniquíes son blancos de raycast, no cuerpos rígidos ni enemigos; su desaparición/reaparición reemplaza animaciones de muerte. Las manos conservan articulación simplificada; no hay animación individual compleja de dedos. Los sonidos reutilizan los efectos sintéticos ligeros originales. No se agregaron sombras dinámicas para mantener el coste original. Los datos locales dependen de que Safari permita almacenamiento; si no, el HUD se aplica durante la sesión y se avisa al guardar.

El ZIP contiene archivos exclusivamente en su raíz, con dependencias relativas locales, listo para reemplazar los archivos en GitHub Pages. No se publicó ni modificó el repositorio remoto.
