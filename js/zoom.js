import { clonarObjeto, calcularPorcentaje } from './utils.js';
import { leaderboardManager } from './leaderboard.js';

// ===== ZOOM MANAGER =====
class ZoomManager {
    constructor() {
        this.jugadores = {};
        this.jugadorSeleccionado = null;
        this.nivelZoom = 1;
        this.observers = [];
        this.zoomCallbacks = [];
        this.zoomPendiente = null;
    }

    actualizarJugador(id, datos) {
        console.log('actualizarJugador llamado para:', id);
        
        if (!this.jugadores[id]) {
            this.jugadores[id] = {
                id: id,
                nombre: datos.nombre || 'Jugador',
                figura: datos.figura || null,
                celdasColocadas: datos.celdasColocadas || [],
                progreso: 0,
                estado: 'jugando',
                ultimaActualizacion: Date.now()
            };
            console.log('Nuevo jugador creado en zoom:', id);
        }
        
        if (datos.nombre) this.jugadores[id].nombre = datos.nombre;
        if (datos.figura) {
            this.jugadores[id].figura = clonarObjeto(datos.figura);
            console.log('Figura actualizada para:', id);
        }
        if (datos.celdasColocadas) {
            this.jugadores[id].celdasColocadas = clonarObjeto(datos.celdasColocadas);
            console.log('Celdas actualizadas para:', id, datos.celdasColocadas.length);
        }
        if (datos.estado) this.jugadores[id].estado = datos.estado;
        
        if (this.jugadores[id].figura) {
            var total = this.jugadores[id].figura.celdas.length;
            var colocadas = this.jugadores[id].celdasColocadas ? this.jugadores[id].celdasColocadas.length : 0;
            this.jugadores[id].progreso = calcularPorcentaje(colocadas, total);
        }
        
        this.jugadores[id].ultimaActualizacion = Date.now();
        this.notificar();
        this.notificarZoomCallbacks(id);
        
        // Si hay un zoom pendiente para este jugador, mostrarlo
        if (this.zoomPendiente === id) {
            console.log('Mostrando zoom pendiente para:', id);
            this.zoomPendiente = null;
            this.mostrarZoomDirecto(id);
        }
    }

    notificarZoomCallbacks(id) {
        var jugador = this.obtenerJugador(id);
        if (jugador) {
            for (var i = 0; i < this.zoomCallbacks.length; i++) {
                try {
                    this.zoomCallbacks[i](jugador);
                } catch (e) {
                    console.error('Error en callback de zoom:', e);
                }
            }
        }
    }

    registrarZoomCallback(callback) {
        this.zoomCallbacks.push(callback);
        console.log('Callback de zoom registrado. Total:', this.zoomCallbacks.length);
    }

    // Método para mostrar zoom directamente desde el manager
    mostrarZoomDirecto(id) {
        var jugador = this.obtenerJugador(id);
        if (!jugador) {
            console.warn('Jugador no encontrado para mostrar zoom:', id);
            this.zoomPendiente = id;
            // Intentar obtener del leaderboard
            var jugadorLB = leaderboardManager.obtenerJugador(id);
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
        
        if (!jugador) {
            console.error('No se pudo obtener el jugador para zoom:', id);
            return false;
        }
        
        // Notificar a los callbacks para que actualicen la UI
        this.notificarZoomCallbacks(id);
        this.jugadorSeleccionado = id;
        this.nivelZoom = 2;
        this.notificar();
        return true;
    }

    // Método para solicitar zoom con espera de datos
    solicitarZoom(id) {
        console.log('solicitarZoom para:', id);
        var jugador = this.obtenerJugador(id);
        if (jugador && jugador.figura) {
            // Si ya tiene datos, mostrar directamente
            return this.mostrarZoomDirecto(id);
        } else {
            // Si no tiene datos, marcar como pendiente
            console.log('Zoom pendiente para:', id);
            this.zoomPendiente = id;
            
            // Intentar obtener del leaderboard
            var jugadorLB = leaderboardManager.obtenerJugador(id);
            if (jugadorLB && jugadorLB.figuraActual) {
                this.actualizarJugador(id, {
                    nombre: jugadorLB.nombre,
                    figura: jugadorLB.figuraActual,
                    celdasColocadas: jugadorLB.celdasColocadas || [],
                    estado: jugadorLB.estado || 'jugando'
                });
                return this.mostrarZoomDirecto(id);
            }
            
            // Si no hay datos, solicitar sincronización
            if (mqttManager && mqttManager.isConnected()) {
                mqttManager.publicar('estado', { 
                    accion: 'sync_request',
                    targetId: id 
                });
            }
            
            return false;
        }
    }

    eliminarJugador(id) {
        if (this.jugadores[id]) {
            delete this.jugadores[id];
            if (this.jugadorSeleccionado === id) {
                this.jugadorSeleccionado = null;
            }
            if (this.zoomPendiente === id) {
                this.zoomPendiente = null;
            }
            this.notificar();
            return true;
        }
        return false;
    }

    seleccionarJugador(id) {
        console.log('seleccionarJugador:', id);
        return this.solicitarZoom(id);
    }

    deseleccionarJugador() {
        this.jugadorSeleccionado = null;
        this.zoomPendiente = null;
        this.nivelZoom = 1;
        this.notificar();
    }

    toggleZoom(id) {
        if (this.jugadorSeleccionado === id) {
            this.deseleccionarJugador();
        } else {
            this.seleccionarJugador(id);
        }
    }

    obtenerJugadorSeleccionado() {
        if (!this.jugadorSeleccionado) return null;
        return this.obtenerJugador(this.jugadorSeleccionado);
    }

    obtenerJugador(id) {
        if (!this.jugadores[id]) {
            return null;
        }
        var jugador = this.jugadores[id];
        return {
            id: jugador.id,
            nombre: jugador.nombre,
            figura: jugador.figura,
            celdasColocadas: jugador.celdasColocadas,
            progreso: jugador.progreso,
            estado: jugador.estado || 'jugando',
            ultimaActualizacion: jugador.ultimaActualizacion
        };
    }

    obtenerJugadores() {
        return Object.values(this.jugadores).map(function(j) {
            return {
                id: j.id,
                nombre: j.nombre,
                figura: j.figura,
                celdasColocadas: j.celdasColocadas,
                progreso: j.progreso,
                estado: j.estado || 'jugando',
                ultimaActualizacion: j.ultimaActualizacion
            };
        });
    }

    suscribir(callback) {
        this.observers.push(callback);
    }

    desuscribir(callback) {
        this.observers = this.observers.filter(function(cb) { return cb !== callback; });
    }

    notificar() {
        var data = {
            jugadores: this.obtenerJugadores(),
            seleccionado: this.jugadorSeleccionado,
            nivelZoom: this.nivelZoom
        };
        for (var i = 0; i < this.observers.length; i++) {
            try {
                this.observers[i](data);
            } catch (e) {
                console.error('Error en observer:', e);
            }
        }
    }

    estaEnZoom(id) {
        return this.jugadorSeleccionado === id;
    }

    exportarDatos() {
        return clonarObjeto({
            jugadores: this.jugadores,
            seleccionado: this.jugadorSeleccionado,
            nivelZoom: this.nivelZoom
        });
    }

    importarDatos(datos) {
        this.jugadores = clonarObjeto(datos.jugadores || {});
        this.jugadorSeleccionado = datos.seleccionado || null;
        this.nivelZoom = datos.nivelZoom || 1;
        this.notificar();
    }

    limpiarInactivos(tiempoLimite) {
        if (tiempoLimite === undefined) tiempoLimite = 60000;
        var ahora = Date.now();
        var idsAEliminar = [];
        
        for (var id in this.jugadores) {
            if (ahora - this.jugadores[id].ultimaActualizacion > tiempoLimite) {
                idsAEliminar.push(id);
            }
        }
        
        for (var i = 0; i < idsAEliminar.length; i++) {
            this.eliminarJugador(idsAEliminar[i]);
        }
        
        return idsAEliminar;
    }
}

// Crear instancia singleton
var zoomManager = new ZoomManager();

// ===== ZOOM HANDLER =====
let zoomModal, zoomBoard, zoomJugadorNombre, zoomInfo;
let zoomInicializado = false;
let zoomJugadorActual = null;

function initZoomUI() {
    if (zoomInicializado) return;
    zoomModal = document.getElementById('zoomModal');
    zoomBoard = document.getElementById('zoomBoard');
    zoomJugadorNombre = document.getElementById('zoomJugadorNombre');
    zoomInfo = document.getElementById('zoomInfo');
    zoomInicializado = true;
    console.log('Zoom UI inicializado');
}

function mostrarZoom(jugadorId) {
    console.log('mostrarZoom llamado para:', jugadorId);
    initZoomUI();
    
    // Mostrar loading mientras se obtienen los datos
    zoomJugadorNombre.textContent = 'Cargando...';
    zoomBoard.innerHTML = '<p>Cargando datos del jugador...</p>';
    zoomInfo.innerHTML = '';
    zoomModal.style.display = 'flex';
    
    // Solicitar zoom al manager (con espera de datos si es necesario)
    var success = zoomManager.solicitarZoom(jugadorId);
    
    if (!success) {
        // Si no se pudo obtener inmediatamente, mostrar mensaje de espera
        zoomJugadorNombre.textContent = 'Esperando datos...';
        zoomBoard.innerHTML = '<p>Esperando sincronización...</p>';
        
        // Programar reintento después de 1 segundo
        setTimeout(function() {
            var jugador = zoomManager.obtenerJugador(jugadorId);
            if (jugador && jugador.figura) {
                actualizarZoomDirecto(jugador);
            } else {
                // Intentar una vez más
                var jugadorLB = leaderboardManager.obtenerJugador(jugadorId);
                if (jugadorLB && jugadorLB.figuraActual) {
                    zoomManager.actualizarJugador(jugadorId, {
                        nombre: jugadorLB.nombre,
                        figura: jugadorLB.figuraActual,
                        celdasColocadas: jugadorLB.celdasColocadas || [],
                        estado: jugadorLB.estado || 'jugando'
                    });
                    var jugador2 = zoomManager.obtenerJugador(jugadorId);
                    if (jugador2) {
                        actualizarZoomDirecto(jugador2);
                    }
                }
            }
        }, 1000);
    }
}

function cerrarZoom() {
    if (!zoomInicializado) initZoomUI();
    zoomModal.style.display = 'none';
    zoomJugadorActual = null;
    zoomManager.deseleccionarJugador();
}

function actualizarZoomDirecto(jugador) {
    if (!zoomInicializado) initZoomUI();
    if (!jugador) {
        console.warn('actualizarZoomDirecto: jugador es null');
        return;
    }
    
    console.log('actualizarZoomDirecto para:', jugador.nombre);
    console.log('Figura:', jugador.figura);
    console.log('Celdas colocadas:', jugador.celdasColocadas);
    
    // Verificar si el zoom está abierto
    if (zoomModal.style.display !== 'flex') {
        console.log('Zoom no está abierto, no se actualiza');
        return;
    }
    
    // Verificar que el jugador en zoom sea el mismo
    if (zoomJugadorActual && zoomJugadorActual !== jugador.id) {
        console.log('El jugador en zoom no coincide:', zoomJugadorActual, 'vs', jugador.id);
        return;
    }
    
    // Si no hay figura, mostrar mensaje
    if (!jugador.figura || !jugador.figura.celdas) {
        zoomJugadorNombre.textContent = jugador.nombre;
        zoomBoard.innerHTML = '<p>Esperando figura...</p>';
        zoomInfo.innerHTML = 'Progreso: 0/0 (0%) - Esperando';
        return;
    }
    
    zoomJugadorNombre.textContent = jugador.nombre;
    zoomBoard.innerHTML = renderizarZoomTablero(jugador);
    
    var progreso = jugador.progreso || 0;
    var estado = jugador.estado || 'jugando';
    var total = jugador.figura ? jugador.figura.celdas.length : 0;
    var colocadas = jugador.celdasColocadas ? jugador.celdasColocadas.length : 0;
    
    zoomInfo.innerHTML = 'Progreso: ' + colocadas + '/' + total + ' (' + progreso + '%) - ' + 
                         (estado === 'completado' ? 'Completado!' : 'Jugando');
    
    console.log('Zoom actualizado correctamente');
}

function renderizarZoomTablero(jugador) {
    var figura = jugador.figura;
    var celdasColocadas = jugador.celdasColocadas || [];
    
    if (!figura || !figura.celdas) {
        return '<p>Esperando figura...</p>';
    }
    
    var celdas = figura.celdas;
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
            
            var esInicio = figura.inicio && figura.inicio.x === x && figura.inicio.y === y;
            var completado = jugador.estado === 'completado';
            
            var clases = 'dice-cell';
            if (!celda) {
                clases += ' vacio';
            } else if (completado) {
                clases += ' completado';
            } else if (colocada) {
                clases += ' colocado';
            } else {
                clases += ' disponible';
            }
            if (esInicio) {
                clases += ' inicio';
            }
            
            var valor = celda ? celda.valor : '';
            html += '<div class="' + clases + '">';
            if (celda) {
                html += '<span class="dice-value">' + valor + '</span>';
            }
            html += '</div>';
        }
    }
    
    html += '</div>';
    return html;
}

// Exportar
export {
    zoomManager,
    initZoomUI,
    mostrarZoom,
    cerrarZoom,
    actualizarZoomDirecto,
    renderizarZoomTablero
};