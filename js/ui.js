import { juegoManager } from './juego.js';
import { leaderboardManager } from './leaderboard.js';
import { mostrarZoom, actualizarZoomDirecto, renderizarZoomTablero } from './zoom.js';
import { handleCellClick } from './config.js';

let gameBoard, playersList, puntosTotal, figurasCompletadas;
let clickHandlerAttached = false;
let ultimoEstadoRenderizado = null;

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
    const esDeFigura = cell.dataset.esfigura === 'true';
    
    // Si no es de la figura o está completado, ignorar
    if (!esDeFigura) return;
    
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
        ultimoEstadoRenderizado = null;
        return;
    }
    
    // Crear un hash del estado actual para evitar renders innecesarios
    const hash = JSON.stringify({
        figuraId: figuraActual.id,
        celdasColocadas: celdasColocadas.map(c => `${c.x},${c.y}`).sort().join('|'),
        completado: completado,
        modoFigura: estado.modoFigura,
        totalCeldas: figuraActual.celdas.length
    });
    
    // Si el estado no cambió, no renderizar
    if (ultimoEstadoRenderizado === hash) {
        return;
    }
    ultimoEstadoRenderizado = hash;
    
    const celdas = figuraActual.celdas;
    const xs = celdas.map(c => c.x);
    const ys = celdas.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const ancho = maxX - minX + 1;
    const alto = maxY - minY + 1;
    
    const colocadasSet = new Set(celdasColocadas.map(c => `${c.x},${c.y}`));
    
    // Determinar el tamaño de celda basado en la cantidad de celdas
    const totalCeldas = celdas.length;
    let cellSize = '50px';
    let fontSize = '1.4rem';
    let valueFontSize = '1.6rem';
    let gap = '8px';
    
    if (totalCeldas > 25) {
        cellSize = '35px';
        fontSize = '0.9rem';
        valueFontSize = '1.1rem';
        gap = '5px';
    } else if (totalCeldas > 15) {
        cellSize = '40px';
        fontSize = '1rem';
        valueFontSize = '1.3rem';
        gap = '6px';
    } else if (totalCeldas > 8) {
        cellSize = '45px';
        fontSize = '1.2rem';
        valueFontSize = '1.4rem';
        gap = '7px';
    }
    
    let html = `<div class="dice-grid" style="grid-template-columns: repeat(${ancho}, 1fr); gap: ${gap}; padding: 8px;">`;
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const celda = celdas.find(c => c.x === x && c.y === y);
            
            if (!celda) {
                html += `<div class="dice-cell vacio" style="width: ${cellSize}; height: ${cellSize};"></div>`;
                continue;
            }
            
            const id = `${x},${y}`;
            const colocada = colocadasSet.has(id);
            
            let clase = 'dice-cell';
            if (completado) {
                clase += ' completado';
            } else if (colocada) {
                clase += ' colocado';
            }
            
            html += `
                <div class="${clase}" 
                     data-x="${x}" data-y="${y}" 
                     data-colocada="${colocada}" 
                     data-esfigura="true"
                     style="width: ${cellSize}; height: ${cellSize}; font-size: ${fontSize};">
                    <span class="dice-value" style="font-size: ${valueFontSize};">
                        ${celda.valor}
                    </span>
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
    let miPosicion = -1;
    
    for (let i = 0; i < ranking.length; i++) {
        const jugador = ranking[i];
        const esMi = jugador.id === myId;
        if (esMi) miPosicion = i;
        
        const estado = jugador.estado || 'jugando';
        const estadoText = estado === 'completado' ? '✅ Completado' : '🎯 Jugando';
        const estadoClass = estado === 'completado' ? 'completado' : '';
        const posicion = i + 1;
        const medalla = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : `#${posicion}`;
        
        html += `
            <div class="player-card ${esMi ? 'me' : ''}" data-player-id="${jugador.id}">
                <div class="player-info">
                    <span class="posicion">${medalla}</span>
                    <span class="nombre">${jugador.nombre}${esMi ? ' (Tu)' : ''}</span>
                    <span class="estado ${estadoClass}">${estadoText}</span>
                </div>
                <div class="player-puntos">
                    <span class="puntos-total">${jugador.puntos}</span>
                    <div class="puntos-detalle">
                        <span class="puntos-simples">S:${jugador.puntosSimples}</span>
                        <span class="puntos-grupales">G:${jugador.puntosGrupales}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    playersList.innerHTML = html;
    
    // Agregar evento click a cada tarjeta para mostrar zoom
    playersList.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', function(e) {
            const id = this.dataset.playerId;
            if (id && id !== window.__myId) {
                // Evitar que el click se propague si estamos en el elemento de posicion
                if (e.target.closest('.posicion')) return;
                mostrarZoom(id);
            }
        });
    });
}

export { mostrarZoom, actualizarZoomDirecto, renderizarZoomTablero };