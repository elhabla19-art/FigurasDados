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

// Renderizar tablero - MODIFICADO PARA MODO GRUPAL
function renderizarTablero(estado) {
    var figuraActual = estado.figuraActual;
    var celdasColocadas = estado.celdasColocadas;
    var completado = estado.completado;
    var modoFigura = estado.modoFigura || 'simple';
    var myId = window.__myId || null;
    var contribuciones = juegoManager.obtenerContribuciones() || {};
    
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
    
    // Construir mapa de celdas colocadas por jugador (para modo grupal)
    var celdasPorJugador = {};
    if (modoFigura === 'grupal') {
        for (var jugadorId in contribuciones) {
            celdasPorJugador[jugadorId] = {};
            var celdasJugador = contribuciones[jugadorId] || [];
            for (var i = 0; i < celdasJugador.length; i++) {
                var key = celdasJugador[i].x + ',' + celdasJugador[i].y;
                celdasPorJugador[jugadorId][key] = true;
            }
        }
    }
    
    // Construir mapa rápido de celdas colocadas
    var celdasColocadasMap = {};
    for (var i = 0; i < celdasColocadas.length; i++) {
        var key = celdasColocadas[i].x + ',' + celdasColocadas[i].y;
        celdasColocadasMap[key] = true;
    }
    
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
            
            var estaColocada = false;
            var colocadaPorMi = false;
            var colocadaPorOtro = false;
            var jugadorQueColoco = null;
            
            // Verificar si está colocada y por quién (modo grupal)
            if (modoFigura === 'grupal') {
                for (var jugadorId in celdasPorJugador) {
                    var key = x + ',' + y;
                    if (celdasPorJugador[jugadorId][key]) {
                        estaColocada = true;
                        jugadorQueColoco = jugadorId;
                        if (jugadorId === myId) {
                            colocadaPorMi = true;
                        } else {
                            colocadaPorOtro = true;
                        }
                        break;
                    }
                }
            } else {
                // Modo simple - usar celdasColocadas directamente
                var key = x + ',' + y;
                estaColocada = celdasColocadasMap[key] || false;
            }
            
            var esInicio = figuraActual.inicio.x === x && figuraActual.inicio.y === y;
            var disponible = juegoManager.esCeldaDisponible(x, y);
            
            var clases = 'dice-cell';
            if (!celda) {
                clases += ' vacio';
            } else if (completado) {
                clases += ' completado';
            } else if (estaColocada) {
                if (modoFigura === 'grupal') {
                    if (colocadaPorMi) {
                        clases += ' colocado-grupal-mio';
                    } else if (colocadaPorOtro) {
                        clases += ' colocado-grupal';
                    }
                } else {
                    clases += ' colocado';
                }
            } else if (disponible) {
                clases += ' disponible';
            }
            
            if (esInicio) {
                clases += ' inicio';
            }
            
            var valor = celda ? celda.valor : '';
            var orden = 0;
            if (celda && estaColocada) {
                for (var k = 0; k < celdasColocadas.length; k++) {
                    if (celdasColocadas[k].x === x && celdasColocadas[k].y === y) {
                        orden = k + 1;
                        break;
                    }
                }
            }
            
            html += '<div class="' + clases + '" data-x="' + x + '" data-y="' + y + 
                    '" data-colocada="' + estaColocada + '" data-colocada-por="' + (jugadorQueColoco || '') + '">';
            if (celda) {
                html += '<span class="dice-value">' + valor + '</span>';
                if (estaColocada && orden > 0 && modoFigura !== 'grupal') {
                    html += '<span class="dice-orden">' + orden + '</span>';
                }
                if (esInicio) {
                    html += '<span class="dice-indice">I</span>';
                }
                // Mostrar badge de quién colocó en modo grupal
                if (modoFigura === 'grupal' && estaColocada && jugadorQueColoco) {
                    var nombreJugador = leaderboardManager.obtenerJugador(jugadorQueColoco);
                    var inicial = nombreJugador ? nombreJugador.nombre.charAt(0).toUpperCase() : '?';
                    var badgeClass = colocadaPorMi ? '' : 'grupal';
                    html += '<span class="contribucion-badge ' + badgeClass + '" title="' + (nombreJugador ? nombreJugador.nombre : 'Desconocido') + '">' + inicial + '</span>';
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
    
    // Mostrar modo de juego
    var modoFigura = estado.modoFigura || 'simple';
    var puntuacionSection = document.querySelector('.puntuacion-section');
    if (puntuacionSection) {
        var puntosElement = document.getElementById('puntos-total');
        if (puntosElement) {
            if (modoFigura === 'grupal') {
                puntosElement.className = 'puntos-total modo-grupal';
            } else {
                puntosElement.className = 'puntos-total';
            }
        }
    }
}

function renderizarLeaderboard() {
    var ranking = leaderboardManager.obtenerRanking();
    var myId = window.__myId || null;
    var esModoGrupal = juegoManager.modoFigura === 'grupal';
    var contribuciones = juegoManager.obtenerContribuciones() || {};
    
    if (ranking.length === 0) {
        playersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Esperando jugadores...</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < ranking.length; i++) {
        var jugador = ranking[i];
        var esMi = jugador.id === myId;
        var estado = jugador.estado || 'jugando';
        var estadoText = estado === 'completado' ? '✓ Completado' : '● Jugando';
        var estadoClass = estado === 'completado' ? 'completado' : '';
        
        // En modo grupal, mostrar contribuciones
        var contribs = contribuciones[jugador.id] || [];
        var contribText = '';
        if (esModoGrupal) {
            contribText = ' <span class="contribuciones">(' + contribs.length + ' celdas)</span>';
        }
        
        html += '<div class="player-card ' + (esMi ? 'me' : '') + '" data-player-id="' + jugador.id + '">';
        html += '    <span class="nombre">' + jugador.nombre + (esMi ? ' (Tu)' : '') + '</span>';
        html += '    <span>';
        html += '        <span class="estado ' + estadoClass + '">' + estadoText + '</span>';
        html += '        <span class="puntos' + (esModoGrupal ? ' grupal' : '') + '">' + jugador.puntos + '</span>';
        html += contribText;
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