import { clonarObjeto, calcularPorcentaje } from './utils.js';

class ZoomManager {
    constructor() {
        this.jugadores = {};
        this.jugadorSeleccionado = null;
        this.nivelZoom = 1;
        this.observers = [];
        this.zoomCallbacks = [];
    }

    actualizarJugador(id, datos) {
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
        }
        
        if (datos.nombre) this.jugadores[id].nombre = datos.nombre;
        if (datos.figura) this.jugadores[id].figura = clonarObjeto(datos.figura);
        if (datos.celdasColocadas) {
            this.jugadores[id].celdasColocadas = clonarObjeto(datos.celdasColocadas);
        }
        if (datos.estado) this.jugadores[id].estado = datos.estado;
        
        // Calcular progreso
        if (this.jugadores[id].figura) {
            var total = this.jugadores[id].figura.celdas.length;
            var colocadas = this.jugadores[id].celdasColocadas ? this.jugadores[id].celdasColocadas.length : 0;
            this.jugadores[id].progreso = calcularPorcentaje(colocadas, total);
        }
        
        this.jugadores[id].ultimaActualizacion = Date.now();
        this.notificar();
        
        // Si el zoom está abierto para este jugador, actualizar la vista directamente
        if (this.jugadorSeleccionado === id) {
            this.actualizarZoomDirecto(id);
        }
    }

    actualizarZoomDirecto(id) {
        var jugador = this.obtenerJugador(id);
        if (jugador) {
            // Llamar directamente a los callbacks registrados para zoom
            for (var i = 0; i < this.zoomCallbacks.length; i++) {
                this.zoomCallbacks[i](jugador);
            }
        }
    }

    // Registrar callback para actualizar zoom
    registrarZoomCallback(callback) {
        this.zoomCallbacks.push(callback);
    }

    eliminarJugador(id) {
        if (this.jugadores[id]) {
            delete this.jugadores[id];
            if (this.jugadorSeleccionado === id) {
                this.jugadorSeleccionado = null;
            }
            this.notificar();
            return true;
        }
        return false;
    }

    seleccionarJugador(id) {
        if (this.jugadores[id]) {
            this.jugadorSeleccionado = id;
            this.nivelZoom = 2;
            this.notificar();
            // Actualizar zoom inmediatamente
            this.actualizarZoomDirecto(id);
            return true;
        }
        return false;
    }

    deseleccionarJugador() {
        this.jugadorSeleccionado = null;
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
        if (!this.jugadores[id]) return null;
        return {
            id: this.jugadores[id].id,
            nombre: this.jugadores[id].nombre,
            figura: this.jugadores[id].figura,
            celdasColocadas: this.jugadores[id].celdasColocadas,
            progreso: this.jugadores[id].progreso,
            estado: this.jugadores[id].estado || 'jugando',
            ultimaActualizacion: this.jugadores[id].ultimaActualizacion
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

    obtenerJugadoresActivos() {
        var ahora = Date.now();
        var limite = 30000;
        return Object.values(this.jugadores)
            .filter(function(j) { return ahora - j.ultimaActualizacion < limite; })
            .map(function(j) {
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

    obtenerProgreso(id) {
        if (!this.jugadores[id]) return null;
        return this.jugadores[id].progreso;
    }

    obtenerEstado(id) {
        if (!this.jugadores[id]) return null;
        return this.jugadores[id].estado;
    }

    obtenerFigura(id) {
        if (!this.jugadores[id]) return null;
        return this.jugadores[id].figura;
    }

    obtenerCeldas(id) {
        if (!this.jugadores[id]) return null;
        return this.jugadores[id].celdasColocadas;
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
            this.observers[i](data);
        }
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

    obtenerRankingProgreso() {
        var jugadores = this.obtenerJugadores();
        jugadores.sort(function(a, b) {
            return b.progreso - a.progreso;
        });
        return jugadores;
    }

    obtenerLiderProgreso() {
        var ranking = this.obtenerRankingProgreso();
        return ranking.length > 0 ? ranking[0] : null;
    }

    estaEnZoom(id) {
        return this.jugadorSeleccionado === id;
    }
}

// Crear instancia singleton
var zoomManager = new ZoomManager();

// Exportar para usar en otros modulos
export { ZoomManager, zoomManager };