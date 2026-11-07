# KINETIC FPS · Informe de entrega

Versión 01.0 · 7 de noviembre de 2026.

## Qué contiene

Aplicación estática HTML/CSS/JavaScript con Three.js 0.170.0 incluido. No descarga motores, modelos, sonidos ni fuentes desde terceros al iniciar. La escena es 3D interactiva, con arma y brazos tridimensionales y disparos por intersección geométrica. No utiliza un vídeo ni una representación 2D para simular el juego.

La plataforma prevista es Safari de iPhone con WebGL2, Chrome y Edge. No se añadió un proceso de compilación. Todos los archivos del paquete se sitúan en la raíz.

## Movimiento y colisiones

El controlador usa un cilindro cinemático vertical de radio 0.31 m. Tiene tapas planas para simplificar el apoyo estable en escalones. Es una alternativa ligera a un motor de cuerpos rígidos: no incluye simulación de articulaciones, empuje de objetos ni ragdoll.

Alturas: 1.82 m de pie, 1.02 m agachado y 0.76 m deslizando. El espacio sobre la cabeza se comprueba antes de aumentar la altura. La cámara baja suavemente y se limita también contra el techo mientras desciende.

La física avanza a 120 Hz mediante acumulador, independientemente del render. Cada desplazamiento se subdivide adicionalmente a un máximo de 12 cm. Se separa la resolución horizontal de la vertical. El contacto usa prismas convexos, planos inclinados analíticos y un índice espacial de celdas de 8 m. Las colisiones y las superficies visibles nacen de la misma definición del nivel.

Se incluyen: escalones de hasta 0.32 m; apoyo estable al bajar rampas; deslizamiento tangencial contra paredes; coyote time de 105 ms; buffer de salto de 140 ms. Al regresar de una pestaña en segundo plano se vacía el acumulador, evitando simular de golpe toda la ausencia.

| Parámetro inicial | Valor |
|---|---:|
| Caminar | 4.2 m/s |
| Carrera normal | 7.4 m/s |
| Sprint | 11.5 m/s |
| Aceleración | 46 m/s² |
| Fricción de suelo | 8 s⁻¹ |
| Impulso de salto | 8.6 m/s |
| Gravedad | 24 m/s² |
| Impulso de slide | +2.6 m/s, limitado |
| Duración máxima de slide | 1.25 s |
| Desaceleración de slide | 4.2 m/s² |
| Control aéreo | 0.34 × aceleración |

El slide gira gradualmente su vector de velocidad y aplica desaceleración real. Las pendientes influyen en su impulso. Saltar conserva prácticamente toda la velocidad horizontal. El aterrizaje no la reinicia. Existe un límite general de velocidad y un límite adicional para el impulso del slide, con recuperación mínima, de modo que repetir la combinación no acumula velocidad indefinidamente.

## Cámara, brazos y disparo

La conversión de cámara es `vertical = 2 × atan(tan(horizontal / 2) / aspecto)`. A un aspecto 19.5:9, 100° horizontales equivalen a 57.625° verticales. Al redimensionar la ventana se recalcula la proyección. Apuntar interpola a 76° horizontales con los valores iniciales.

La mirada responde directamente al mouse o al dedo. La suavidad se aplica al cuerpo, balanceo, arma y transiciones, sin filtrar en exceso la dirección de apuntado. No se aplica un aumento artificial del FOV al esprintar.

Los antebrazos, puños, palmas y dedos son geometría low-poly. La postura de los dedos es fija; las cadenas de los brazos y el conjunto del rifle reaccionan al movimiento y se interpolan. Las piezas estáticas de cada brazo se agrupan para reducir llamadas de dibujo. El arma se renderiza en una segunda escena, después de limpiar la profundidad, un recurso habitual para mantener legibles las manos junto a paredes. Las colisiones pertenecen al personaje, no a cada dedo o al cañón.

El rifle K-09 dispara aproximadamente 9.52 veces por segundo. Tiene munición ilimitada para facilitar la prueba, un fogonazo breve, impactos reutilizables, confirmación de blanco, retroceso visual y sonido procedural opcional. El raycasting parte del centro de la cámara e impacta primero en la estructura más cercana. El disparo no modifica la velocidad del jugador ni introduce una dispersión aleatoria que oculte la precisión.

## NODO 09: diseño del mapa

Superficie interior de referencia: 96 × 96 m. No hay distribución aleatoria de edificios. El conjunto representa un campus de mantenimiento: nave de reparación al oeste, transferencia en el centro, terrazas y paso de servicio al este, control al norte y patio de llegada al sur.

| Zona | Función espacial y de movimiento |
|---|---|
| 01 Patio | Aproximación para acelerar; paso de 1.12 m y rampa hacia la pasarela. |
| 02 Taller | Nave con cubierta dentada, vanos, bancos, pilares, entreplanta y 16 escalones de 20 cm. |
| 03 Terrazas | Rampa, niveles de 2.4 y 3.2 m, separación de 3 m para saltar y descenso alternativo. |
| 04 Control | Interior atravesable con accesos separados y cubierta de 6.4 m mediante rampa exterior. |
| 05 Vía rápida | Corredor perimetral largo para alcanzar y comprobar velocidad. |
| 06 Transferencia | Pasarela que enlaza taller y terrazas; circulación bajo el puente y referencia vertical central. |

El recorrido principal enlaza patio, paso bajo, rampa, plataforma, pasarela, salto a las terrazas y regreso exterior. Hay alternativas a nivel de suelo bajo las conexiones elevadas. Las proporciones de puertas, columnas, apoyos y dinteles corresponden a la misma geometría que resuelve el controlador.

Las zonas se distinguen mediante materiales y acentos: hormigón claro, pavimento oscuro, acero azul grisáceo, señalización turquesa, amarillo en bordes y un puente grúa coral como hito. La señalización y el plano sirven para orientarse; no hay objetivos, misiones ni historia añadidos.

## Rendimiento

La escena completa contiene aproximadamente 7.5 mil triángulos, incluidos los modelos de primera persona y efectos reservados. Las cajas arquitectónicas se agrupan con InstancedMesh por material; los prismas se combinan por material. Los blancos y las piezas del arma también se agrupan. El número de llamadas de dibujo real varía con la visibilidad y se muestra en Ajustes.

Se utilizan materiales simples, una luz hemisférica y una direccional, cielo liso y niebla de distancia sencilla. No hay mapas de sombras, reflejos, volumétricos ni cadena de postprocesado. Las sombras de contacto son superficies estáticas discretas. El mapeo tonal se realiza en el material, sin un pase de pantalla adicional.

La densidad de píxel inicial se limita a 1.6; puede bajar automáticamente si la tasa observada se mantiene baja. El usuario también dispone de escala manual. Los efectos de impacto están en un conjunto reutilizable de 16 elementos. La geometría no se reconstruye cada fotograma y los nodos de sonido se desconectan al terminar.

## Pruebas realmente ejecutadas

**41 / 41 comprobaciones automáticas correctas en Chrome.** De ellas, 36 también se ejecutaron en Node. Las cinco adicionales utilizan eventos de puntero sintéticos del navegador.

| Caso solicitado | Qué se comprobó |
|---|---|
| A Velocidad | Aceleración, sprint de 11.50 m/s, igualdad de diagonal y recta, frenado con inercia. |
| B Slide | Velocidad medida: 11.50 → 14.06 m/s al iniciar → 11.54 m/s tras 0.6 s. |
| C Slide jump | 13.64 → 13.61 m/s al saltar, conservando el impulso horizontal. |
| D Encadenamiento | Catorce combinaciones seguidas sin velocidad infinita; última velocidad 14.10 m/s. |
| E Arquitectura | Pared de 6 cm a 18 m/s, esquinas, escalones, rampas, techos, coyote time, buffer y recorridos del mapa. |
| F Disparo | Intersecciones Three.js sobre blancos al correr, deslizarse y saltar; una estructura bloquea el rayo; disparar no cambia la velocidad. |
| G Entrada táctil | Cuatro pointerId simultáneos: movimiento, mirada, disparo y salto. Cancelación independiente, arrastre sobre disparo y acción contextual. Eventos sintéticos, sin emulación de dispositivo. |
| H Independencia temporal | 480 pasos físicos con render supuesto a 30, 60 y 144 FPS; posiciones iguales con diferencia menor de 0.0000001 m. |

También se comprobaron geometría finita, correspondencia entre rampa visual y colisión, transformaciones de animación sin valores inválidos, cámara bajo techo, desactivación de sus efectos y aplicación efectiva de ajustes de velocidad y gravedad.

**Límite de verificación:** el navegador de este entorno informa `GL_RENDERER = Disabled` y no permite crear un contexto WebGL. Por tanto, no se validó una sesión gráfica interactiva ni se midieron FPS de render. Los tests de raycasting y animación operaron sobre el grafo Three.js real, sin dibujarlo. No se intentó probar ni emular un iPhone. La presentación final, la comodidad táctil y el rendimiento en el dispositivo quedan para la prueba de uso del usuario; no se declaran aprobados.

Para repetir las comprobaciones, abre `tests.html` desde la misma web publicada y pulsa **Ejecutar pruebas**. Esa página es opcional y no forma parte del bucle del juego.

## Referencias consultadas

Se aplicaron principios de conectividad, alternancia entre interiores y exteriores, recorridos elevados y separación funcional de edificios. No se copió la geometría completa de un mapa comercial.

- Activision, Shoot House Map Intel: rutas principales, conexiones y posiciones elevadas. https://www.callofduty.com/blog/2022/11/modern-warfare-ii-shoot-house-map-intel-guide-season-01
- Christopher Dionne / Respawn, GDC 2018, resumen público de “Designing Unforgettable Titanfall Single Player Levels with Action Blocks”: secuencias breves diseñadas alrededor de acciones. Se consultó el resumen de la sesión, no se afirma haber visto su vídeo completo. https://www.gdcvault.com/play/1025105/Designing-Unforgettable-Titanfall-Single-Player
- allmannwappner, Construction depot, Poing: programa de talleres, mantenimiento y administración en edificios de proporciones distintas. https://www.allmannwappner.com/en/projekte/13173/construction-depot-poing
- Three.js, PerspectiveCamera: el FOV de la cámara es vertical. https://threejs.org/docs/pages/PerspectiveCamera.html
- Three.js, Raycaster: intersecciones ordenadas por distancia. https://threejs.org/docs/pages/Raycaster
- GitHub, publicar desde una rama y la raíz. https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
