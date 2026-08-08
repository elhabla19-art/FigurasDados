import { juegoManager } from './juego.js';
import { renderizarDado } from './utils.js';

var gameBoard = null;
var clickHandlerAttached = false;
var ultimoEstadoRenderizado = null;

export function initUI() {
    gameBoard = document.getElementById('game-board');
    
    if (!gameBoard) {
        console.error('No se encontró el elemento game-board');
        return;
    }
    
    if (!clickHandlerAttached) {
        gameBoard.addEventListener('click', handleBoardClick);
        clickHandlerAttached = true;
    }
}

function handleBoardClick(e) {
    var cell = e.target.closest('.dice-cell');
    if (!cell) return;
    
    if (cell.classList.contains('vacio') || cell.classList.contains('completado')) {
        return;
    }
    
    var x = parseInt(cell.dataset.x);
    var y = parseInt(cell.dataset.y);
    if (isNaN(x) || isNaN(y)) return;
    
    var colocada = cell.dataset.colocada === 'true';
    var esDeFigura = cell.dataset.esfigura === 'true';
    
    if (!esDeFigura) return;
    
    handleCellClick(x, y, colocada);
}

function handleCellClick(x, y, estaColocada) {
    var estado = juegoManager.obtenerEstado();
    
    if (!estado.figuraActual || estado.completado) {
        return;
    }
    
    // Si la celda ya está colocada, deshacer (LIFO)
    if (estaColocada) {
        juegoManager.deshacerCelda(x, y);
        return;
    }
    
    // Verificar que la celda pertenece a la figura
    if (!juegoManager.esCeldaDeFigura(x, y)) {
        return;
    }
    
    // Colocar dado
    juegoManager.colocarDado(x, y);
}

export function renderizarTablero(estado) {
    if (!gameBoard) {
        gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;
    }
    
    var figuraActual = estado.figuraActual;
    var celdasColocadas = estado.celdasColocadas || [];
    var completado = estado.completado || false;
    
    if (!figuraActual) {
        gameBoard.innerHTML = 
            '<div style="text-align:center; padding: 30px; color: var(--text-muted);">' +
                '<p style="font-size: 1.2rem; margin-bottom: 10px;">Esperando figura...</p>' +
                '<p style="font-size: 0.9rem;">Presiona "Figura Simple" o "Figura Grupal" para comenzar</p>' +
            '</div>';
        ultimoEstadoRenderizado = null;
        return;
    }
    
    // Verificar si hay cambios para evitar re-renderizados innecesarios
    var hash = JSON.stringify({
        figuraId: figuraActual.id || 'none',
        celdasColocadas: celdasColocadas.map(function(c) { return c.x + ',' + c.y; }).sort().join('|'),
        completado: completado,
        totalCeldas: figuraActual.celdas ? figuraActual.celdas.length : 0
    });
    
    if (ultimoEstadoRenderizado === hash) {
        return;
    }
    ultimoEstadoRenderizado = hash;
    
    var celdas = figuraActual.celdas || [];
    if (celdas.length === 0) {
        gameBoard.innerHTML = '<p style="color: var(--text-muted);">Figura vacía</p>';
        return;
    }
    
    // Calcular dimensiones
    var xs = [];
    var ys = [];
    for (var i = 0; i < celdas.length; i++) {
        xs.push(celdas[i].x);
        ys.push(celdas[i].y);
    }
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var ancho = maxX - minX + 1;
    
    // Celdas colocadas en un Set para búsqueda rápida
    var colocadasSet = {};
    for (var j = 0; j < celdasColocadas.length; j++) {
        colocadasSet[celdasColocadas[j].x + ',' + celdasColocadas[j].y] = true;
    }
    
    var totalCeldas = celdas.length;
    var cellSize = '50px';
    var gap = '8px';
    
    if (totalCeldas > 25) {
        cellSize = '35px';
        gap = '5px';
    } else if (totalCeldas > 15) {
        cellSize = '40px';
        gap = '6px';
    } else if (totalCeldas > 8) {
        cellSize = '45px';
        gap = '7px';
    }
    
    var html = '<div class="dice-grid" style="grid-template-columns: repeat(' + ancho + ', 1fr); gap: ' + gap + '; padding: 8px;">';
    
    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            // Buscar celda en la figura
            var celda = null;
            for (var k = 0; k < celdas.length; k++) {
                if (celdas[k].x === x && celdas[k].y === y) {
                    celda = celdas[k];
                    break;
                }
            }
            
            if (!celda) {
                html += '<div class="dice-cell vacio" style="width: ' + cellSize + '; height: ' + cellSize + ';"></div>';
                continue;
            }
            
            var id = x + ',' + y;
            var colocada = !!colocadasSet[id];
            
            var clase = 'dice-cell';
            if (completado) {
                clase += ' completado';
            } else if (colocada) {
                clase += ' colocado';
            }
            
            var dadoHtml = renderizarDado(celda.valor);
            
            html += '<div class="' + clase + '" data-x="' + x + '" data-y="' + y + '" data-colocada="' + colocada + '" data-esfigura="true" style="width: ' + cellSize + '; height: ' + cellSize + ';">';
            html += dadoHtml;
            html += '</div>';
        }
    }
    
    html += '</div>';
    gameBoard.innerHTML = html;
}

export function actualizarUI(estado) {
    // UI simplificada - no es necesario hacer nada adicional
}