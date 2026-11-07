# KINETIC FPS · First Playable · 01.0

Un prototipo FPS 3D de movimiento, creado para navegador. Mapa original **NODO 09**, un complejo industrial de 96 × 96 m con seis zonas, pasarelas, rampas, escaleras, interiores y pasos bajos.

## Publicar desde el iPhone

1. Descomprime el ZIP en Archivos.
2. Crea tu repositorio en GitHub y sube **todos los archivos sueltos a su raíz**. `index.html` debe quedar directamente en la raíz, junto a los archivos `.js`, `.css` y demás.
3. En **Settings → Pages**, selecciona **Deploy from a branch**, tu rama (normalmente `main`) y **/(root)**. Guarda.
4. Cuando GitHub muestre la dirección publicada, ábrela en Safari y toca **INICIAR RECORRIDO**. En el teléfono, usa orientación horizontal.

No hay que instalar paquetes, compilar ni configurar un servidor. Three.js está incluido localmente. Abre la dirección de GitHub Pages; la vista previa de `index.html` en Archivos no ejecuta los módulos como una web publicada.

## Controles

| Acción | PC |
|---|---|
| Moverse / carrera normal | WASD |
| Caminar | Alt + WASD |
| Sprint | Shift |
| Deslizarse al correr | Pulsar C o Ctrl |
| Agacharse | Mantener C o Ctrl |
| Salto / slide jump | Espacio |
| Mirar | Mouse |
| Disparar | Click izquierdo, mantener para automático |
| Apuntar | Mantener click derecho |
| Pausa / ajustes | Esc o P |
| Volver al inicio | R |

**Táctil:** joystick izquierdo y mirada a la derecha. Sprint y apuntado son interruptores de un toque. DESLIZA inicia el slide con velocidad; estando quieto alterna agachado. SALTO libera el agachamiento manual. Mantén DISPARO; también puedes arrastrar ese mismo botón para mirar. Los dedos se gestionan de forma independiente. Sprint automático está disponible en Ajustes.

**Primera combinación:** sprint → pulsar DESLIZA/C → saltar durante el deslizamiento → seguir moviéndote al aterrizar. El impulso se conserva, con un límite de velocidad.

## Ajustar la sensación

Abre AJUSTES. Todos los valores modifican el controlador o la cámara reales y se conservan en el navegador. Movimiento de cámara en **0** desactiva balanceo, inclinación y golpe visual de aterrizaje. Retroceso visual tiene su propio control. FOV inicial: **100° horizontales**, convertido según el tamaño real de la pantalla.

Si necesitas reducir carga gráfica, baja la escala de resolución. La adaptación automática viene activada. 60 FPS es el objetivo, no una medición garantizada para un dispositivo concreto.

## Archivos y verificación

- `physics.js`: controlador cinemático, reloj fijo y colisiones.
- `level.js`: arquitectura y geometría de colisión compartida.
- `render.js`: escena Three.js, brazos, rifle, cámara y raycasting.
- `input.js`, `audio.js`, `game.js`: controles, efectos de sonido y aplicación.
- `tests.html`: ejecuta las 41 comprobaciones técnicas incluidas.
- `INFORME.md`: alcance, resultados medidos, decisiones y referencias.
- `THREE-LICENSE.txt`: licencia de Three.js 0.170.0.

No hay cuentas, servidores de juego ni multijugador. Los vídeos o imágenes no son necesarios: el escenario y los modelos se construyen con geometría 3D real.

Documentación de publicación: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
