import { juegoManager } from './juego.js';
import { leaderboardManager } from './leaderboard.js';
import { zoomManager, mostrarZoom, cerrarZoom, actualizarZoomDirecto, renderizarZoomTablero } from './zoom.js';
import { mqttManager } from '../mqtt.js';
import { handleCellClick } from './config.js';

// DOM elements
let lobbyModal, joinModal, loadingModal, confirmModal, zoomModal;
let roomInfoDisplay, gameBoard, playersList;
let puntosTotal, figurasCompletadas, btnReiniciar;
let zoomBoard, zoomJugadorNombre, zoomInfo;

// Inicializar UI
function initUI() {
    // Obtener referencias DOM
    lobbyModal = document.getElementById('lobbyModal');
    joinModal = document.getElementById('joinModal');
    loadingModal = document.getElementById('loadingModal');
    confirmModal = document.getElementById('confirmModal');
    zoomModal = document.getElementById('zoomModal');
    roomInfoDisplay = document.getElementById('roomInfoDisplay');
    gameBoard = document.getElementById('game-board');
    playersList = document.getElementById('playersList');
    puntosTotal = document.getElementById('puntos-total');
    figurasCompletadas = document.getElementById('figuras-completadas');
    btnReiniciar = document.getElementById('btnReiniciar');
    zoomBoard = document.getElementById('zoomBoard');
    zoomJugadorNombre = document.getElementById('zoomJugadorNombre');
    zoomInfo = document.getElementById('zoomInfo');
}

// Mostrar modales
function mostrarModalLobby() {
    lobbyModal.style.display = 'flex';
    joinModal.style.display = 'none';
    loadingModal.style.display = 'none';
    confirmModal.style.display = 'none';
    zoomModal.style.display = 'none';
}

function mostrarModalJoin() {
    lobbyModal.style.display = 'none';
    joinModal.style.display = 'flex';
    loadingModal.style.display = 'none';
}

function mostrarLoading(texto) {
    document.getElementById('loadingText').textContent = texto || 'Conectando...';
    loadingModal.style.display = 'flex';
}

function ocultarLoading() {
    loadingModal.style.display = 'none';
}

function mostrarConfirm() {
    confirmModal.style.display = 'flex';
}

function ocultarConfirm() {
    confirmModal.style.display = 'none';
}

// Renderizar tablero
function renderizarTablero(estado) {
    var figuraActual = estado.figuraActual;
    var celdasColocadas = estado.celdasColocadas;
    var completado = estado.completado;
    
    if (!figuraActual) {
        gameBoard.innerHTML = '<p>Esperando figura...</p>';
        return;
    }
    
    var celdas = figuraActual.celdas;
    var xs = celdas.map(function(c) { return c.x; });
    var ys = celdas.map(function(c) { return c.y; });
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var ancho = maxX - minX + 1;
    
    var html = '<div class="dice-grid" style="grid-template-columns: repeat(' + ancho + ', 1fr);">';
    
    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            var celda = null;
            for (var i = 0; i < celdas.length; i++) {
                if (celdas[i].x === x && celdas[i].y === y) {
                    celda = celdas[i];
                    break;
                }
            }
            
            var colocada = false;
            for (var j = 0; j < celdasColocadas.length; j++) {
                if (celdasColocadas[j].x === x && celdasColocadas[j].y === y) {
                    colocada = true;
                    break;
                }
            }
            
            var esInicio = figuraActual.inicio.x === x && figuraActual.inicio.y === y;
            var disponible = juegoManager.esCeldaDisponible(x, y);
            
            var clases = 'dice-cell';
            if (!celda) {
                clases += ' vacio';
            } else if (completado) {
                clases += ' completado';
            } else if (colocada) {
                clases += ' colocado';
            } else if (disponible) {
                clases += ' disponible';
            }
            
            if (esInicio) {
                clases += ' inicio';
            }
            
            var valor = celda ? celda.valor : '';
            var orden = 0;
            if (celda) {
                for (var k = 0; k < celdasColocadas.length; k++) {
                    if (celdasColocadas[k].x === x && celdasColocadas[k].y === y) {
                        orden = k + 1;
                        break;
                    }
                }
            }
            
            html += '<div class="' + clases + '" data-x="' + x + '" data-y="' + y + 
                    '" data-colocada="' + colocada + '">';
            if (celda) {
                html += '<span class="dice-value">' + valor + '</span>';
                if (colocada && orden > 0) {
                    html += '<span class="dice-orden">' + orden + '</span>';
                }
                if (esInicio) {
                    html += '<span class="dice-indice">I</span>';
                }
            }
            html += '</div>';
        }
    }
    
    html += '</div>';
    gameBoard.innerHTML = html;
    
    // Event listeners para celdas - usar handleCellClick importado
    var celdasElementos = gameBoard.querySelectorAll('.dice-cell');
    for (var m = 0; m < celdasElementos.length; m++) {
        var el = celdasElementos[m];
        var colocada = el.dataset.colocada === 'true';
        var completado2 = el.classList.contains('completado');
        var vacio = el.classList.contains('vacio');
        
        if (!completado2 && !vacio) {
            el.addEventListener('click', function() {
                var x = parseInt(this.dataset.x);
                var y = parseInt(this.dataset.y);
                var colocada = this.dataset.colocada === 'true';
                handleCellClick(x, y, colocada);
            });
        }
    }
}

function actualizarUI(estado) {
    var jugador = leaderboardManager.obtenerJugador(estado.jugadorId);
    if (jugador) {
        puntosTotal.textContent = jugador.puntos;
        figurasCompletadas.textContent = jugador.figurasCompletadas;
    }
}

function renderizarLeaderboard() {
    var ranking = leaderboardManager.obtenerRanking();
    var myId = window.__myId || null;
    
    if (ranking.length === 0) {
        playersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Esperando jugadores...</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < ranking.length; i++) {
        var jugador = ranking[i];
        var esMi = jugador.id === myId;
        var estado = jugador.estado || 'jugando';
        var estadoText = estado === 'completado' ? 'Completado' : 'Jugando';
        var estadoClass = estado === 'completado' ? 'completado' : '';
        
        html += '<div class="player-card ' + (esMi ? 'me' : '') + '" data-player-id="' + jugador.id + '">';
        html += '    <span class="nombre">' + jugador.nombre + (esMi ? ' (Tu)' : '') + '</span>';
        html += '    <span>';
        html += '        <span class="estado ' + estadoClass + '">' + estadoText + '</span>';
        html += '        <span class="puntos">' + jugador.puntos + '</span>';
        html += '    </span>';
        html += '</div>';
    }
    
    playersList.innerHTML = html;
    
    // Event listeners para zoom
    var cards = playersList.querySelectorAll('.player-card');
    for (var j = 0; j < cards.length; j++) {
        var card = cards[j];
        card.addEventListener('click', function() {
            var id = this.dataset.playerId;
            if (id) {
                if (id === window.__myId) {
                    alert('Este es tu tablero. Puedes verlo en la pantalla principal.');
                    return;
                }
                // Mostrar zoom directamente
                mostrarZoom(id);
            }
        });
    }
}

// Exportar funciones
export {
    initUI,
    mostrarModalLobby,
    mostrarModalJoin,
    mostrarLoading,
    ocultarLoading,
    mostrarConfirm,
    ocultarConfirm,
    renderizarTablero,
    actualizarUI,
    renderizarLeaderboard,
    mostrarZoom,
    cerrarZoom,
    actualizarZoomDirecto,
    renderizarZoomTablero
};