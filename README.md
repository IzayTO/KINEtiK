# KINETIC FPS | NODO 09 · V2

Actualización del proyecto original: mismo mapa y controlador de movimiento, con HUD editable, tres armas y blancos de entrenamiento.

## Subir desde el iPhone

1. Descomprime el ZIP en **Archivos**.
2. Sube **todos los archivos sueltos** a la raíz de tu repositorio KINEtiK y reemplaza los anteriores. `index.html`, los JS y el CSS quedan juntos, sin carpetas.
3. Conserva GitHub Pages con tu rama `main` y `/(root)` como origen. Espera a que termine la publicación y recarga tu página en Safari.
4. Pulsa **INICIAR RECORRIDO**. En teléfono, se recomienda horizontal.

Three.js está incluido: no necesitas instalar paquetes, compilar ni depender de un CDN. Abre GitHub Pages, no la vista previa HTML de la app Archivos.

## Controles

| Acción | PC |
|---|---|
| Movimiento / caminar | WASD / Alt + WASD |
| Sprint | Shift |
| Deslizar / agacharse | C o Ctrl; mantener para agacharse |
| Salto / slide jump | Espacio |
| Disparar / apuntar | Click izquierdo / derecho |
| Recargar | R |
| Cuchillo / K-09 / escopeta | 1 / 2 / 3 |
| Auto / semiautomático K-09 | B |
| Marcador / asistencia | Q / H |
| Ajustes / liberar cursor | P o Esc |
| Volver al inicio | Inicio (Home), también desde Recorrido |

**Táctil:** joystick izquierdo; arrastra a la derecha para mirar. También puedes arrastrar DISPARO mientras disparas. Sprint y ADS se activan con un toque. DESLIZA a velocidad inicia slide; despacio alterna agachado. Los botones pequeños son recarga, marcador, asistencia y modo de disparo. Las tres ranuras cambian de arma. Sprint automático continúa disponible.

## Personalizar

**AJUSTES → Controles → Personalizar HUD.** El jugador y la vista quedan congelados. Toca y arrastra un elemento, ajusta tamaño y opacidad; después Guarda o Cancela. El selector superior permite elegir controles tapados por la barra; arrastra **✥** para mover el seleccionado. Vista previa mantiene el juego en pausa. Se guardan distribuciones independientes para horizontal y vertical. Un control con opacidad 0 sigue respondiendo; en el editor conserva un contorno. Los botones respetan un mínimo táctil de 44 px, por eso algunos no bajan hasta 55 %.

En **Retícula** puedes cambiar diseño, grosor, separación, tamaño, color, punto y expansión. En **Controles** hay sensibilidades separadas para mouse/táctil, ADS, inversión y asistencia. El multiplicador global original sigue en Ajustes. La asistencia táctil es ligera; con mouse requiere activar su casilla específica.

## Armas

K-09: **30** cartuchos, auto/semi, recarga completa. S-07: **7** cartuchos, nueve perdigones, bombeo y recarga individual; disparar la interrumpe si hay munición. Reserva ilimitada. FILO: agarre invertido y tres cortes encadenados; no aumenta la velocidad física. Los doce maniquíes reaparecen cuatro segundos después de eliminarlos; también puedes restablecerlos desde Controles.

`INFORME.md` explica cambios y límites de verificación. `tests.html` ejecuta 46 pruebas de física/combate/geometría. El diagnóstico `index.html?qa=1` prueba el HUD sin renderizar 3D y está claramente identificado; **para jugar abre index.html sin ese parámetro**. Los resultados ejecutados están en `PRUEBAS.json`.
