// zoom.js

import { clonarObjeto, calcularPorcentaje, renderizarDado } from './utils.js';
import { leaderboardManager } from './leaderboard.js';

class ZoomManager {
    constructor() {
        this.jugadores = {};
        this.jugadorSeleccionado = null;
        this.zoomCallbacks = [];
        this.zoomPendiente = null;
    }

    actualizarJugador(id, datos) {
        if (!this.jugadores[id]) {
            this.jugadores[id] = {
                id,
                nombre: datos.nombre || 'Jugador',
                figura: datos.figura || null,
                celdasColocadas: datos.celdasColocadas || [],
                progreso: 0,
                estado: 'jugando',
                ultimaActualizacion: Date.now()
            };
        }
        
        if (datos.nombre && datos.nombre !== 'Jugador') {
            this.jugadores[id].nombre = datos.nombre;
        }
        if (datos.figura) {
            this.jugadores[id].figura = clonarObjeto(datos.figura);
        }
        if (datos.celdasColocadas) {
            this.jugadores[id].celdasColocadas = clonarObjeto(datos.celdasColocadas);
        }
        if (datos.estado) {
            this.jugadores[id].estado = datos.estado;
        }
        
        if (this.jugadores[id].figura) {
            const total = this.jugadores[id].figura.celdas.length;
            const colocadas = this.jugadores[id].celdasColocadas?.length || 0;
            this.jugadores[id].progreso = calcularPorcentaje(colocadas, total);
        }
        
        this.jugadores[id].ultimaActualizacion = Date.now();
        this.notificarZoomCallbacks(id);
        
        if (this.zoomPendiente === id) {
            this.zoomPendiente = null;
            this.mostrarZoomDirecto(id);
        }
    }

    notificarZoomCallbacks(id) {
        const jugador = this.obtenerJugador(id);
        if (jugador) {
            this.zoomCallbacks.forEach(cb => {
                try { cb(jugador); } catch (e) { console.error('Error en callback:', e); }
            });
        }
    }

    registrarZoomCallback(callback) {
        this.zoomCallbacks.push(callback);
    }

    mostrarZoomDirecto(id) {
        let jugador = this.obtenerJugador(id);
        
        if (!jugador) {
            const jugadorLB = leaderboardManager.obtenerJugador(id);
            if (jugadorLB) {
                this.actualizarJugador(id, {
                    nombre: jugadorLB.nombre,
                    figura: jugadorLB.figuraActual,
                    celdasColocadas: jugadorLB.celdasColocadas || [],
                    estado: jugadorLB.estado || 'jugando'
                });
                jugador = this.obtenerJugador(id);
            }
        }
        
        if (!jugador) return false;
        
        this.notificarZoomCallbacks(id);
        this.jugadorSeleccionado = id;
        return true;
    }

    solicitarZoom(id) {
        const jugador = this.obtenerJugador(id);
        if (jugador?.figura) {
            return this.mostrarZoomDirecto(id);
        }
        
        this.zoomPendiente = id;
        const jugadorLB = leaderboardManager.obtenerJugador(id);
        if (jugadorLB?.figuraActual) {
            this.actualizarJugador(id, {
                nombre: jugadorLB.nombre,
                figura: jugadorLB.figuraActual,
                celdasColocadas: jugadorLB.celdasColocadas || [],
                estado: jugadorLB.estado || 'jugando'
            });
            return this.mostrarZoomDirecto(id);
        }
        
        if (window.__mqttManager?.isConnected()) {
            window.__mqttManager.publicar('estado', { 
                accion: 'sync_request',
                targetId: id 
            });
        }
        
        return false;
    }

    deseleccionarJugador() {
        this.jugadorSeleccionado = null;
        this.zoomPendiente = null;
    }

    obtenerJugador(id) {
        if (!this.jugadores[id]) return null;
        const j = this.jugadores[id];
        return {
            id: j.id,
            nombre: j.nombre,
            figura: j.figura,
            celdasColocadas: j.celdasColocadas,
            progreso: j.progreso,
            estado: j.estado || 'jugando',
            ultimaActualizacion: j.ultimaActualizacion
        };
    }

    obtenerJugadores() {
        return Object.values(this.jugadores).map(j => ({
            id: j.id,
            nombre: j.nombre,
            figura: j.figura,
            celdasColocadas: j.celdasColocadas,
            progreso: j.progreso,
            estado: j.estado || 'jugando',
            ultimaActualizacion: j.ultimaActualizacion
        }));
    }

    estaEnZoom(id) {
        return this.jugadorSeleccionado === id;
    }
}

export const zoomManager = new ZoomManager();

let zoomModal, zoomBoard, zoomJugadorNombre;
let zoomInicializado = false;
let zoomJugadorActual = null;

function initZoomUI() {
    if (zoomInicializado) return;
    zoomModal = document.getElementById('zoomModal');
    zoomBoard = document.getElementById('zoomBoard');
    zoomJugadorNombre = document.getElementById('zoomJugadorNombre');
    zoomInicializado = true;
}

export function mostrarZoom(jugadorId) {
    initZoomUI();
    
    zoomJugadorNombre.textContent = 'Cargando...';
    zoomBoard.innerHTML = '<p>Cargando datos del jugador...</p>';
    zoomModal.style.display = 'flex';
    zoomJugadorActual = jugadorId;
    
    const success = zoomManager.solicitarZoom(jugadorId);
    
    if (!success) {
        setTimeout(() => {
            const jugador = zoomManager.obtenerJugador(jugadorId);
            if (jugador?.figura) {
                actualizarZoomDirecto(jugador);
            }
        }, 1000);
    }
}

export function cerrarZoom() {
    initZoomUI();
    zoomModal.style.display = 'none';
    zoomJugadorActual = null;
    zoomManager.deseleccionarJugador();
}

export function actualizarZoomDirecto(jugador) {
    if (!zoomInicializado) initZoomUI();
    if (!jugador || zoomModal.style.display !== 'flex') return;
    if (zoomJugadorActual && zoomJugadorActual !== jugador.id) return;
    
    if (!jugador.figura?.celdas) {
        zoomJugadorNombre.textContent = jugador.nombre;
        zoomBoard.innerHTML = '<p>Esperando figura...</p>';
        return;
    }
    
    zoomJugadorNombre.textContent = jugador.nombre;
    zoomBoard.innerHTML = renderizarZoomTablero(jugador);
}

export function renderizarZoomTablero(jugador) {
    const figura = jugador.figura;
    const celdasColocadas = jugador.celdasColocadas || [];
    
    if (!figura?.celdas) {
        return '<p>Esperando figura...</p>';
    }
    
    const celdas = figura.celdas;
    const xs = celdas.map(c => c.x);
    const ys = celdas.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const ancho = maxX - minX + 1;
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
            const completado = jugador.estado === 'completado';
            
            let clases = 'dice-cell';
            if (!celda) clases += ' vacio';
            else if (completado) clases += ' completado';
            else if (colocada) clases += ' colocado';
            else clases += ' disponible';
            
            const dadoHtml = renderizarDado(celda.valor);
            
            html += `
                <div class="${clases}">
                    ${dadoHtml}
                </div>
            `;
        }
    }
    
    html += '</div>';
    return html;
}