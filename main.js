import { juegoManager } from './js/juego.js';
import { initUI, renderizarTablero, actualizarUI } from './js/ui.js';

var juegoIniciado = false;

function iniciarJuego() {
    if (juegoIniciado) return;
    juegoIniciado = true;
    
    document.getElementById('startModal').style.display = 'none';
    
    // Configurar juego
    var jugadorId = 'player_' + Math.random().toString(36).substring(2, 10);
    juegoManager.setJugadorId(jugadorId);
    juegoManager.iniciarVacio();
    
    // Inicializar UI (esto agrega el event listener de clics)
    initUI();
    
    // Suscribir observers para actualizar el tablero
    juegoManager.suscribir(function(estado) {
        renderizarTablero(estado);
        actualizarUI(estado);
    });
    
    // Boton Figura Simple
    document.getElementById('btnFiguraSimple').addEventListener('click', function() {
        juegoManager.iniciarFigura('simple');
    });
    
    // Boton Figura Grupal
    document.getElementById('btnFiguraGrupal').addEventListener('click', function() {
        juegoManager.iniciarFigura('grupal');
    });
    
    // Renderizar estado inicial
    renderizarTablero(juegoManager.obtenerEstado());
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnEntrar').addEventListener('click', iniciarJuego);
});