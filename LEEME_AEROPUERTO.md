# KINEtiK / NODO 09 — Aeródromo y combate

Actualización sobre la versión del repositorio que ya incluye RC, lanzables, Captura la Bandera y Dominación. No es una instalación completa: conserva los demás archivos que ya tienes.

## Subir desde el teléfono

1. Descomprime `NODO09_AEROPUERTO_Y_COMBATE.zip`.
2. Sube todos los archivos sueltos a la misma raíz de tu repositorio, junto a `index.html`. Reemplaza los que tienen el mismo nombre.
3. Espera a que GitHub Pages termine de publicar. Abre el juego una vez, cierra sus pestañas y vuelve a abrirlo para que se active la nueva caché sin interrumpir una partida. Si lo tienes como acceso en la pantalla de inicio, ciérralo también.

No borres los otros archivos, no subas el ZIP cerrado y no necesitas instalar librerías.

**Archivos nuevos:** `airport.js`, `rocket-model.js`, `config-io.js`, `airfield.css` y este documento.

**Archivos para reemplazar:** `audio.js`, `blood.js`, `combat-ui.js`, `environment.js`, `field-effects.js`, `field-hud.js`, `field-models.js`, `field-view.js`, `game.js`, `hud.js`, `index.html`, `input.js`, `interface.css`, `interface.js`, `loot-visuals.js`, `match.js`, `navigation.js`, `objectives.js`, `ordnance.js`, `physics.js`, `rc.js`, `render.js`, `supplies.js`, `sw.js` y `world-v3.js`.

## Cambios

- Avisos de capturas, robos y objetivos más pequeños, colocados debajo del marcador y del estado de partida. Siguen la posición personalizada del marcador.
- Menús opacos, con fondo técnico de planos y líneas. Interfaz en grafito, grises y azul marino. Se conservan los colores informativos de equipos, vida, escudo y consumibles.
- RC con sonido continuo de motor eléctrico que responde a velocidad y turbo. La pantalla gira sobre su borde inferior: muestra estática mientras se levanta y adquiere señal; después aparecen la cámara y los controles. Al cerrar invierte el movimiento. Las flechas blancas de aliados también se proyectan desde su cámara.
- Gas: basta permanecer medio segundo dentro para intoxicarse. Se mantienen la nube de diez segundos, el antídoto y el daño periódico que no reduce la vida por debajo de uno.
- Granada: eliminación directa hasta 4 m y daño decreciente hasta 7 m. Conserva la comprobación de paredes, la protección de aparición y las reglas de equipo. Sus víctimas dejan charcos irregulares de sangre de hasta unos 3,5 m de radio, visibles cinco segundos y desvanecidos entre los segundos cinco y diez.
- Duelo por equipos, Captura la Bandera y Dominación empiezan con diez segundos de preparación en sus bases. Puedes mirar, pero nadie se mueve ni combate. El contador comienza en cero; el color vuelve durante los últimos dos segundos y una frase da la salida simultánea. Este tiempo no consume la duración de la partida. Entrenamiento y Todos contra todos conservan el inicio inmediato.
- R-12: lanzacohetes que puede aparecer al abrir cajas (32 % por caja, un cohete por aparición, máximo tres guardados). Su miniatura flota igual que el resto del botín. Al recogerlo aparece su botón personalizable; también puedes seleccionarlo con **U**. Apuntar acerca el arma y Disparar lanza el misil. No se repone automáticamente al reaparecer. Al gastar el último vuelve a la K-09.
- R-12: impacto letal hasta 7 m; de más de 7 a 10 m causa daño decreciente sin rematar, dejando como mínimo un punto de vida. Respeta paredes, equipos y protección de aparición. Explosión propia de fuego, humo y polvo, sin luces ni sombras adicionales. La marca irregular alcanza 8 m de radio, permanece trece segundos y se desvanece hasta el segundo veinte.
- **Exportar configuración / Importar configuración**, en Opciones: guarda y restaura movimiento, cámara, sonido, asistencia, retícula, partida, mapa y ambos perfiles del HUD, con posición, tamaño y opacidad. El archivo JSON tiene formato versionado: se aplican los campos reconocidos, se validan sus límites y se conservan los ajustes nuevos que no estén en un archivo anterior. La selección de mapa importada se aplica al iniciar la siguiente partida. Guarda tu JSON fuera del repositorio; lo eliges desde el botón Importar.
- Noche con cielo más oscuro. Se conserva el cielo diurno y la iluminación cálida del mapa.
- **AERÓDROMO 12**, seleccionable en Recorrido o al configurar la partida: recinto de 128 × 104 m, terminal transitable con cristales y puertas, mostradores, equipaje, asientos, entrepiso, escaleras, pasarela y rampa; hangar, dos aviones low-poly, tractor, carros, contenedores y torre. Tiene sus propias bases, objetivos, cajas, navegación, minimapa y quince lámparas. NODO 09 sigue disponible con su arquitectura original.
- Deslizamiento desde el aire: pulsarlo durante el salto baja la postura, acelera el descenso y enlaza un slide al tocar suelo, conservando el impulso dentro de los límites existentes. No añade impulsos repetidos mientras sigues en el aire.
- Nuevo ajuste **Campo de visión al apuntar**, entre 35° y 100°. Un valor menor acerca más la mira. El valor inicial es 76°, como antes; el zoom nunca amplía más que tu campo de visión normal. También se incluye al exportar.

## Comprobaciones realizadas

Se verificaron sintaxis de los módulos, resolución de importaciones, referencias del HTML y lista de recursos sin conexión. Las comprobaciones de lógica cubrieron: espera por equipos y posiciones válidas, acceso por navegación a bases/zonas/cajas del aeropuerto, radios de explosión y bloqueo por paredes, intoxicación a los 0,5 s, disparo real del misil y retorno de arma, enlace salto-deslizamiento, exportación/importación y geometría finita de los efectos.

El mapa original, el módulo de armas K-09/S-07 y el modelo/animación de los soldados no se reemplazaron ni rehicieron. La extensión de movimiento se limita al deslizamiento aéreo solicitado. Los efectos reutilizan los lotes y límites existentes; no se añadieron dependencias ni sombras por explosión.

No se ejecutaron pruebas visuales repetitivas ni mediciones de FPS. La sensación de control, el encuadre de la pantalla RC y el rendimiento real del aeropuerto con muchos bots quedan para tu prueba de juego. No hay una cifra de FPS prometida. Los aviones son geometría de escenario, no vehículos pilotables; el lanzacohetes es botín para el jugador.

## Referencias del aeropuerto

Modelado y distribución originales para este juego; no se descargaron ni incorporaron modelos de terceros. Las referencias públicas se usaron para orientar terminal, puertas, plataforma y siluetas:

- Heathrow, mapas del aeropuerto: https://www.heathrow.com/at-the-airport/airport-maps
- Airbus, características de aeronaves: https://www.aircraft.airbus.com/en/customer-care/fleet-wide-care/airport-operations-and-aircraft-characteristics/aircraft-characteristics
- London City Airport, puertas y embarque: https://www.londoncityairport.com/at-the-airport/need-to-know/gates-and-boarding
