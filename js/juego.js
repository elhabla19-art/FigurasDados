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
        this.modoFigura = 'simple';
        this.figuraCompartida = null;
        this.celdasGrupales = [];
        this.jugadoresCeldas = {};
        this.contribuciones = {};
        this.puntosPorCelda = {};
    }

    iniciarVacio(jugadorId) {
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = null;
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.ronda = 0;
        this.estado.enJuego = true;
        this.modoFigura = 'simple';
        this.figuraCompartida = null;
        this.celdasGrupales = [];
        this.jugadoresCeldas = {};
        this.contribuciones = {};
        this.puntosPorCelda = {};
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        
        leaderboardManager.actualizarFigura(jugadorId, null);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        this.notificar();
        return null;
    }

    // ===== CORREGIDO: Usa figuraRecibida si existe =====
    iniciarModoSimple(jugadorId, figuraRecibida) {
        this.modoFigura = 'simple';
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        this.figuraCompartida = null;
        
        this.estado.jugadorId = jugadorId;
        // USA la figura recibida si existe, si no genera una nueva
        this.estado.figuraActual = figuraRecibida || generarFigura('simple');
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        
        if (!this.jugadoresCeldas[jugadorId]) {
            this.jugadoresCeldas[jugadorId] = [];
        }
        this.jugadoresCeldas[jugadorId] = [];
        this.estado.celdasColocadas = this.jugadoresCeldas[jugadorId];
        
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

    // ===== CORREGIDO: Usa figuraRecibida si existe =====
    iniciarModoGrupal(jugadorId, figuraRecibida) {
        this.modoFigura = 'grupal';
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        this.figuraCompartida = null;
        this.estado.celdasColocadas = [];
        
        // USA la figura recibida si existe, si no genera una nueva
        var nuevaFigura = figuraRecibida || generarFigura('grupal');
        
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = nuevaFigura;
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        
        this.figuraCompartida = this.estado.figuraActual;
        this.estado.celdasColocadas = this.celdasGrupales;
        this.jugadoresCeldas = {};
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        var todosLosJugadores = leaderboardManager.obtenerJugadores();
        for (var i = 0; i < todosLosJugadores.length; i++) {
            var jugador = todosLosJugadores[i];
            leaderboardManager.establecerPuntuacion(jugador.id, 0);
            this.puntosPorCelda[jugador.id] = 0;
        }
        
        zoomManager.actualizarJugador(jugadorId, {
            figura: this.estado.figuraActual,
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
        return this.estado.figuraActual;
    }

    sincronizarCeldasGrupales(celdas, contribuciones, figura) {
        if (this.modoFigura !== 'grupal') return;
        
        console.log('sincronizarCeldasGrupales: actualizando', celdas ? celdas.length : 0, 'celdas');
        
        // Si se proporciona una figura, actualizarla
        if (figura) {
            this.estado.figuraActual = clonarObjeto(figura);
            this.figuraCompartida = clonarObjeto(figura);
        }
        
        // Actualizar celdas grupales
        this.celdasGrupales = clonarObjeto(celdas || []);
        this.estado.celdasColocadas = this.celdasGrupales;
        
        if (contribuciones) {
            this.contribuciones = clonarObjeto(contribuciones);
        }
        
        // Verificar si está completada
        var totalCeldas = this.estado.figuraActual ? this.estado.figuraActual.celdas.length : 0;
        if (this.celdasGrupales.length === totalCeldas && totalCeldas > 0) {
            if (!this.estado.completado) {
                console.log('sincronizarCeldasGrupales: figura completada');
                this.estado.completado = true;
            }
        }
        
        this.notificar();
    }

    colocarDado(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        var valor = this.obtenerValorCelda(x, y);
        if (valor === null) return false;
        
        var nuevaCelda = { x: x, y: y, valor: valor };
        
        var yaColocada = false;
        if (this.modoFigura === 'grupal') {
            yaColocada = this.celdasGrupales.some(function(c) { 
                return c.x === x && c.y === y; 
            });
        } else {
            var celdasJugador = this.jugadoresCeldas[this.estado.jugadorId] || [];
            yaColocada = celdasJugador.some(function(c) { 
                return c.x === x && c.y === y; 
            });
        }
        
        if (yaColocada) return false;
        
        var celdasExistentes = this.modoFigura === 'grupal' ? 
            this.celdasGrupales : 
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        if (celdasExistentes.length === 0) {
            var inicio = this.estado.figuraActual.inicio;
            if (x !== inicio.x || y !== inicio.y) return false;
        } else {
            var esAdyacente = celdasExistentes.some(function(c) {
                return Math.abs(c.x - x) + Math.abs(c.y - y) === 1;
            });
            if (!esAdyacente) return false;
        }
        
        if (this.modoFigura === 'grupal') {
            this.celdasGrupales.push(nuevaCelda);
            this.estado.celdasColocadas = this.celdasGrupales;
            
            if (!this.contribuciones[this.estado.jugadorId]) {
                this.contribuciones[this.estado.jugadorId] = [];
            }
            this.contribuciones[this.estado.jugadorId].push(nuevaCelda);
            
            // 1 PUNTO POR CELDA COLOCADA
            if (!this.puntosPorCelda[this.estado.jugadorId]) {
                this.puntosPorCelda[this.estado.jugadorId] = 0;
            }
            this.puntosPorCelda[this.estado.jugadorId] += 1;
            leaderboardManager.establecerPuntuacion(this.estado.jugadorId, this.puntosPorCelda[this.estado.jugadorId]);
            
        } else {
            if (!this.jugadoresCeldas[this.estado.jugadorId]) {
                this.jugadoresCeldas[this.estado.jugadorId] = [];
            }
            this.jugadoresCeldas[this.estado.jugadorId].push(nuevaCelda);
            this.estado.celdasColocadas = this.jugadoresCeldas[this.estado.jugadorId];
        }
        
        deshacerManager.pushAccion({
            tipo: 'colocar',
            jugadorId: this.estado.jugadorId,
            celda: { x: nuevaCelda.x, y: nuevaCelda.y, valor: nuevaCelda.valor },
            figuraId: this.estado.figuraActual.id,
            modo: this.modoFigura
        });
        
        var totalCeldas = this.estado.figuraActual.celdas.length;
        var celdasActuales = this.modoFigura === 'grupal' ? 
            this.celdasGrupales : 
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        if (celdasActuales.length === totalCeldas) {
            this.completarFigura();
        }
        
        var celdasParaLeaderboard = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, celdasParaLeaderboard);
        
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: celdasParaLeaderboard,
            estado: this.estado.completado ? 'completado' : 'jugando'
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
        
        var celdasActuales = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        deshacerManager.pushAccion({
            tipo: 'completar',
            jugadorId: this.estado.jugadorId,
            figuraId: this.estado.figuraActual.id,
            celdas: celdasActuales.slice(),
            modo: this.modoFigura
        });
        
        // SOLO EN MODO SIMPLE: 1 punto por completar
        if (this.modoFigura === 'simple') {
            leaderboardManager.actualizarPuntuacion(this.estado.jugadorId, 1);
        }
        // En modo grupal NO se da punto extra por completar
        
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            estado: 'completado'
        });
        
        this.notificar();
        return true;
    }

    marcarCompletadoRemoto() {
        if (this.estado.completado) return true;
        if (!this.estado.figuraActual) return false;
        
        this.estado.completado = true;
        
        deshacerManager.pushAccion({
            tipo: 'completar_remoto',
            jugadorId: this.estado.jugadorId,
            figuraId: this.estado.figuraActual.id,
            modo: this.modoFigura,
            timestamp: Date.now()
        });
        
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            estado: 'completado'
        });
        
        this.notificar();
        return true;
    }

    deshacerCelda(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        var celdasActuales = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        var index = -1;
        for (var i = 0; i < celdasActuales.length; i++) {
            if (celdasActuales[i].x === x && celdasActuales[i].y === y) {
                index = i;
                break;
            }
        }
        
        if (index === -1) return false;
        if (index !== celdasActuales.length - 1) return false;
        
        var celdaRemovida = celdasActuales.pop();
        
        if (this.modoFigura === 'grupal') {
            for (var jugadorId in this.contribuciones) {
                var contribs = this.contribuciones[jugadorId];
                for (var j = contribs.length - 1; j >= 0; j--) {
                    if (contribs[j].x === x && contribs[j].y === y) {
                        contribs.splice(j, 1);
                        if (this.puntosPorCelda[jugadorId]) {
                            this.puntosPorCelda[jugadorId] -= 1;
                            leaderboardManager.establecerPuntuacion(jugadorId, this.puntosPorCelda[jugadorId]);
                        }
                        break;
                    }
                }
            }
            this.estado.celdasColocadas = this.celdasGrupales;
        } else {
            this.estado.celdasColocadas = this.jugadoresCeldas[this.estado.jugadorId] || [];
        }
        
        var acciones = deshacerManager.obtenerHistorialJugador(this.estado.jugadorId);
        for (var k = acciones.length - 1; k >= 0; k--) {
            if (acciones[k].tipo === 'colocar' && 
                acciones[k].celda.x === x && 
                acciones[k].celda.y === y) {
                var historialCompleto = deshacerManager.obtenerHistorial();
                for (var h = 0; h < historialCompleto.length; h++) {
                    if (historialCompleto[h].id === acciones[k].id) {
                        historialCompleto.splice(h, 1);
                        break;
                    }
                }
                break;
            }
        }
        
        var celdasActualizadas = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, celdasActualizadas);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: celdasActualizadas
        });
        
        this.notificar();
        return true;
    }

    reiniciarTablero() {
        if (this.modoFigura === 'grupal') {
            this.celdasGrupales = [];
            this.estado.celdasColocadas = this.celdasGrupales;
            this.contribuciones = {};
            this.puntosPorCelda = {};
            var todosLosJugadores = leaderboardManager.obtenerJugadores();
            for (var i = 0; i < todosLosJugadores.length; i++) {
                leaderboardManager.establecerPuntuacion(todosLosJugadores[i].id, 0);
            }
        } else {
            if (this.jugadoresCeldas[this.estado.jugadorId]) {
                this.jugadoresCeldas[this.estado.jugadorId] = [];
            }
            this.estado.celdasColocadas = this.jugadoresCeldas[this.estado.jugadorId] || [];
        }
        
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
        if (!this.estado.figuraActual) return [];
        
        var celdasActuales = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        var figura = this.estado.figuraActual;
        var disponibles = [];
        var colocadasIds = new Set(celdasActuales.map(function(c) { 
            return c.x + ',' + c.y; 
        }));
        
        for (var i = 0; i < figura.celdas.length; i++) {
            var celda = figura.celdas[i];
            var id = celda.x + ',' + celda.y;
            if (colocadasIds.has(id)) continue;
            
            if (celdasActuales.length === 0) {
                if (celda.x === figura.inicio.x && celda.y === figura.inicio.y) {
                    disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
                }
            } else {
                var esAdyacente = celdasActuales.some(function(c) {
                    return Math.abs(c.x - celda.x) + Math.abs(c.y - celda.y) === 1;
                });
                if (esAdyacente) {
                    disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
                }
            }
        }
        
        return disponibles;
    }

    obtenerProgreso() {
        if (!this.estado.figuraActual) return { actual: 0, total: 0, porcentaje: 0 };
        
        var celdasActuales = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        return obtenerProgreso(this.estado.figuraActual, celdasActuales);
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
        var celdasActuales = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        for (var i = 0; i < celdasActuales.length; i++) {
            if (celdasActuales[i].x === x && celdasActuales[i].y === y) {
                return true;
            }
        }
        return false;
    }

    obtenerEstado() {
        var celdasActuales = this.modoFigura === 'grupal' ?
            this.celdasGrupales :
            (this.jugadoresCeldas[this.estado.jugadorId] || []);
        
        return {
            jugadorId: this.estado.jugadorId,
            figuraActual: this.estado.figuraActual,
            celdasColocadas: celdasActuales.slice(),
            completado: this.estado.completado,
            ronda: this.estado.ronda,
            enJuego: this.estado.enJuego,
            modoFigura: this.modoFigura,
            disponibles: this.obtenerCeldasDisponibles(),
            progreso: this.obtenerProgreso()
        };
    }

    obtenerContribuciones() {
        if (this.modoFigura !== 'grupal') return {};
        return this.contribuciones;
    }

    obtenerPuntosPorCelda() {
        if (this.modoFigura !== 'grupal') return {};
        return this.puntosPorCelda;
    }

    obtenerCeldasGrupales() {
        return this.celdasGrupales.slice();
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
        if (datos.celdasColocadas) {
            if (this.modoFigura === 'grupal') {
                this.celdasGrupales = clonarObjeto(datos.celdasColocadas);
                this.estado.celdasColocadas = this.celdasGrupales;
            } else {
                this.jugadoresCeldas[this.estado.jugadorId] = clonarObjeto(datos.celdasColocadas);
                this.estado.celdasColocadas = this.jugadoresCeldas[this.estado.jugadorId];
            }
        }
        if (datos.completado !== undefined) this.estado.completado = datos.completado;
        if (datos.ronda) this.estado.ronda = datos.ronda;
        if (datos.modoFigura) this.modoFigura = datos.modoFigura;
        
        this.notificar();
    }
}

var juegoManager = new JuegoManager();

export { JuegoManager, juegoManager };