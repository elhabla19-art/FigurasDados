import { juegoManager } from './juego.js';
import { leaderboardManager } from './leaderboard.js';
import { mostrarZoom, actualizarZoomDirecto, renderizarZoomTablero } from './zoom.js';
import { handleCellClick } from './config.js';

let gameBoard, playersList, puntosTotal, figurasCompletadas;
let clickHandlerAttached = false;

export function initUI() {
    gameBoard = document.getElementById('game-board');
    playersList = document.getElementById('playersList');
    puntosTotal = document.getElementById('puntos-total');
    figurasCompletadas = document.getElementById('figuras-completadas');
    
    if (!clickHandlerAttached && gameBoard) {
        gameBoard.addEventListener('click', handleBoardClick);
        clickHandlerAttached = true;
    }
}

function handleBoardClick(e) {
    const cell = e.target.closest('.dice-cell');
    if (!cell) return;
    
    if (cell.classList.contains('vacio') || cell.classList.contains('completado')) {
        return;
    }
    
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    if (isNaN(x) || isNaN(y)) return;
    
    const colocada = cell.dataset.colocada === 'true';
    const disponible = cell.dataset.disponible === 'true';
    
    if (!disponible && !colocada) return;
    
    handleCellClick(x, y, colocada);
}

// ===== MODALES =====
export function mostrarModalLobby() {
    document.getElementById('lobbyModal').style.display = 'flex';
    document.getElementById('joinModal').style.display = 'none';
    document.getElementById('loadingModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('zoomModal').style.display = 'none';
}

export function mostrarLoading(texto) {
    document.getElementById('loadingText').textContent = texto || 'Conectando...';
    document.getElementById('loadingModal').style.display = 'flex';
}

export function ocultarLoading() {
    document.getElementById('loadingModal').style.display = 'none';
}

// ===== RENDERIZADO =====
export function renderizarTablero(estado) {
    const figuraActual = estado.figuraActual;
    const celdasColocadas = estado.celdasColocadas;
    const completado = estado.completado;
    
    if (!figuraActual) {
        gameBoard.innerHTML = `
            <div style="text-align:center; padding: 30px; color: var(--text-muted);">
                <p style="font-size: 1.2rem; margin-bottom: 10px;">Esperando figura...</p>
                <p style="font-size: 0.9rem;">Presiona "Figura Simple" o "Figura Grupal" para comenzar</p>
            </div>
        `;
        return;
    }
    
    const celdas = figuraActual.celdas;
    const xs = celdas.map(c => c.x);
    const ys = celdas.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const ancho = maxX - minX + 1;
    
    const disponibles = juegoManager.obtenerCeldasDisponibles();
    const disponiblesSet = new Set(disponibles.map(c => `${c.x},${c.y}`));
    const colocadasSet = new Set(celdasColocadas.map(c => `${c.x},${c.y}`));
    
    let html = `<div class="dice-grid" style="grid-template-columns: repeat(${ancho}, 1fr);">`;
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const celda = celdas.find(c => c.x === x && c.y === y);
            
            if (!celda) {
                html += `<div class="dice-cell vacio"></div>`;
                continue;
            }
            
            const id = `${x},${y}`;
            const colocada = colocadasSet.has(id);
            const esInicio = figuraActual.inicio.x === x && figuraActual.inicio.y === y;
            const disponible = !completado && !colocada && disponiblesSet.has(id);
            
            let clases = 'dice-cell';
            if (completado) clases += ' completado';
            else if (colocada) clases += ' colocado';
            else if (disponible) clases += ' disponible';
            if (esInicio) clases += ' inicio';
            
            html += `
                <div class="${clases}" 
                     data-x="${x}" data-y="${y}" 
                     data-colocada="${colocada}" 
                     data-disponible="${disponible}">
                    <span class="dice-value">${celda.valor}</span>
                    ${esInicio ? '<span class="dice-indice">I</span>' : ''}
                </div>
            `;
        }
    }
    
    html += '</div>';
    gameBoard.innerHTML = html;
}

export function actualizarUI(estado) {
    const jugador = leaderboardManager.obtenerJugador(estado.jugadorId);
    if (jugador) {
        puntosTotal.textContent = jugador.puntos;
        figurasCompletadas.textContent = jugador.figurasCompletadas;
    }
}

export function renderizarLeaderboard() {
    const ranking = leaderboardManager.obtenerRanking();
    const myId = window.__myId || null;
    
    if (ranking.length === 0) {
        playersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Esperando jugadores...</p>';
        return;
    }
    
    let html = '';
    for (const jugador of ranking) {
        const esMi = jugador.id === myId;
        const estado = jugador.estado || 'jugando';
        const estadoText = estado === 'completado' ? 'Completado' : 'Jugando';
        const estadoClass = estado === 'completado' ? 'completado' : '';
        
        html += `
            <div class="player-card ${esMi ? 'me' : ''}" data-player-id="${jugador.id}">
                <span class="nombre">${jugador.nombre}${esMi ? ' (Tu)' : ''}</span>
                <span>
                    <span class="estado ${estadoClass}">${estadoText}</span>
                    <span class="puntos">${jugador.puntos}</span>
                </span>
            </div>
        `;
    }
    
    playersList.innerHTML = html;
    
    // Event listeners para zoom
    playersList.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.dataset.playerId;
            if (id && id !== window.__myId) {
                mostrarZoom(id);
            }
        });
    });
}

// Re-exportar funciones de zoom para compatibilidad
export { mostrarZoom, actualizarZoomDirecto, renderizarZoomTablero };