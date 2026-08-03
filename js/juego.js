import { generarFigura, esColocacionValida, figuraCompletada, obtenerProgreso, obtenerCeldasDisponibles } from './figuras.js';
import { deshacerManager } from './deshacer.js';
import { leaderboardManager } from './leaderboard.js';
import { zoomManager } from './zoom.js';
import { clonarObjeto, generarId, sonAdyacentes } from './utils.js';

class JuegoManager {
    constructor() {
        this.estado = {
            jugadorId: null,
            figuraActual: null,
            celdasColocadas: [],
            completado: false,
            ronda: 0,
            enJuego: false
        };
        this.observers = [];
        this.modo = 'solo';
        this.salaId = null;
    }

    iniciarRonda(jugadorId) {
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = generarFigura();
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        zoomManager.actualizarJugador(jugadorId, {
            figura: this.estado.figuraActual,
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
        return this.estado.figuraActual;
    }

    colocarDado(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        var nuevaCelda = { x: x, y: y, valor: this.obtenerValorCelda(x, y) };
        
        if (!esColocacionValida(this.estado.figuraActual, this.estado.celdasColocadas, nuevaCelda)) {
            return false;
        }
        
        this.estado.celdasColocadas.push(nuevaCelda);
        
        deshacerManager.pushAccion({
            tipo: 'colocar',
            jugadorId: this.estado.jugadorId,
            celda: { x: nuevaCelda.x, y: nuevaCelda.y, valor: nuevaCelda.valor },
            figuraId: this.estado.figuraActual.id
        });
        
        if (figuraCompletada(this.estado.figuraActual, this.estado.celdasColocadas)) {
            this.completarFigura();
        }
        
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, this.estado.celdasColocadas);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: this.estado.celdasColocadas,
            estado: this.estado.completado ? 'completado' : 'jugando'
        });
        
        this.notificar();
        return true;
    }

    // NUEVA FUNCION: Deshacer una celda especifica
    deshacerCelda(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        // Buscar la celda en las colocadas
        var index = -1;
        for (var i = 0; i < this.estado.celdasColocadas.length; i++) {
            if (this.estado.celdasColocadas[i].x === x && this.estado.celdasColocadas[i].y === y) {
                index = i;
                break;
            }
        }
        
        if (index === -1) return false;
        
        // Solo se puede deshacer la ULTIMA celda colocada
        if (index !== this.estado.celdasColocadas.length - 1) {
            return false;
        }
        
        // Remover la celda
        var celdaRemovida = this.estado.celdasColocadas.pop();
        
        // Eliminar del historial de deshacer
        var acciones = deshacerManager.obtenerHistorialJugador(this.estado.jugadorId);
        for (var j = acciones.length - 1; j >= 0; j--) {
            if (acciones[j].tipo === 'colocar' && 
                acciones[j].celda.x === x && 
                acciones[j].celda.y === y) {
                // Remover esta accion del historial
                var historialCompleto = deshacerManager.obtenerHistorial();
                for (var k = 0; k < historialCompleto.length; k++) {
                    if (historialCompleto[k].id === acciones[j].id) {
                        historialCompleto.splice(k, 1);
                        break;
                    }
                }
                break;
            }
        }
        
        // Actualizar leaderboard y zoom
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, this.estado.celdasColocadas);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: this.estado.celdasColocadas
        });
        
        this.notificar();
        return true;
    }

    obtenerValorCelda(x, y) {
        if (!this.estado.figuraActual) return null;
        var celda = null;
        for (var i = 0; i < this.estado.figuraActual.celdas.length; i++) {
            if (this.estado.figuraActual.celdas[i].x === x && this.estado.figuraActual.celdas[i].y === y) {
                celda = this.estado.figuraActual.celdas[i];
                break;
            }
        }
        return celda ? celda.valor : null;
    }

    completarFigura() {
        if (this.estado.completado) return false;
        
        this.estado.completado = true;
        
        deshacerManager.pushAccion({
            tipo: 'completar',
            jugadorId: this.estado.jugadorId,
            figuraId: this.estado.figuraActual.id,
            celdas: this.estado.celdasColocadas.slice()
        });
        
        leaderboardManager.actualizarPuntuacion(this.estado.jugadorId, 1);
        
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            estado: 'completado'
        });
        
        this.notificar();
        return true;
    }

    deshacer() {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        var accion = deshacerManager.deshacerJugador(this.estado.jugadorId);
        if (!accion) return false;
        
        if (accion.tipo === 'colocar') {
            var index = -1;
            for (var i = 0; i < this.estado.celdasColocadas.length; i++) {
                if (this.estado.celdasColocadas[i].x === accion.celda.x && 
                    this.estado.celdasColocadas[i].y === accion.celda.y) {
                    index = i;
                    break;
                }
            }
            if (index !== -1) {
                this.estado.celdasColocadas.splice(index, 1);
            }
            
            leaderboardManager.actualizarCeldas(this.estado.jugadorId, this.estado.celdasColocadas);
            zoomManager.actualizarJugador(this.estado.jugadorId, {
                celdasColocadas: this.estado.celdasColocadas
            });
            
            this.notificar();
            return true;
        }
        
        return false;
    }

    reiniciarTablero() {
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        
        deshacerManager.limpiarHistorialJugador(this.estado.jugadorId);
        
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, []);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
    }

    obtenerCeldasDisponibles() {
        return obtenerCeldasDisponibles(this.estado.figuraActual, this.estado.celdasColocadas);
    }

    obtenerProgreso() {
        return obtenerProgreso(this.estado.figuraActual, this.estado.celdasColocadas);
    }

    esCeldaDisponible(x, y) {
        var disponibles = this.obtenerCeldasDisponibles();
        for (var i = 0; i < disponibles.length; i++) {
            if (disponibles[i].x === x && disponibles[i].y === y) {
                return true;
            }
        }
        return false;
    }

    esCeldaColocada(x, y) {
        for (var i = 0; i < this.estado.celdasColocadas.length; i++) {
            if (this.estado.celdasColocadas[i].x === x && this.estado.celdasColocadas[i].y === y) {
                return true;
            }
        }
        return false;
    }

    obtenerEstado() {
        return {
            jugadorId: this.estado.jugadorId,
            figuraActual: this.estado.figuraActual,
            celdasColocadas: this.estado.celdasColocadas.slice(),
            completado: this.estado.completado,
            ronda: this.estado.ronda,
            enJuego: this.estado.enJuego,
            disponibles: this.obtenerCeldasDisponibles(),
            progreso: this.obtenerProgreso()
        };
    }

    setModo(modo, salaId) {
        this.modo = modo;
        this.salaId = salaId || null;
    }

    suscribir(callback) {
        this.observers.push(callback);
    }

    desuscribir(callback) {
        this.observers = this.observers.filter(function(cb) { return cb !== callback; });
    }

    notificar() {
        var data = this.obtenerEstado();
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i](data);
        }
    }

    exportarEstado() {
        return clonarObjeto(this.estado);
    }

    importarEstado(estado) {
        this.estado = clonarObjeto(estado);
        this.notificar();
    }

    sincronizar(datos) {
        if (datos.jugadorId) this.estado.jugadorId = datos.jugadorId;
        if (datos.figuraActual) this.estado.figuraActual = clonarObjeto(datos.figuraActual);
        if (datos.celdasColocadas) this.estado.celdasColocadas = clonarObjeto(datos.celdasColocadas);
        if (datos.completado !== undefined) this.estado.completado = datos.completado;
        if (datos.ronda) this.estado.ronda = datos.ronda;
        
        this.notificar();
    }
}

// Crear instancia singleton
var juegoManager = new JuegoManager();

// Exportar para usar en otros modulos
export { JuegoManager, juegoManager };