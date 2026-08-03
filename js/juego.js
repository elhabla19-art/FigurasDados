import { generarFigura, obtenerProgreso } from './figuras.js';
import { deshacerManager } from './deshacer.js';
import { leaderboardManager } from './leaderboard.js';
import { zoomManager } from './zoom.js';
import { clonarObjeto } from './utils.js';

class JuegoManager {
    constructor() {
        this.estado = {
            jugadorId: null,
            figuraActual: null,
            celdasColocadas: [],
            completado: false,
            ronda: 0,
            enJuego: false,
            modoFigura: 'simple'
        };
        this.observers = [];
        this.modo = 'solo';
        this.salaId = null;
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
    }

    iniciarVacio(jugadorId) {
        this.estado = {
            jugadorId,
            figuraActual: null,
            celdasColocadas: [],
            completado: false,
            ronda: 0,
            enJuego: true,
            modoFigura: 'simple'
        };
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        deshacerManager.limpiarHistorialJugador(jugadorId);
        leaderboardManager.actualizarFigura(jugadorId, null);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        this.notificar();
        return null;
    }

    iniciarModoSimple(jugadorId, figuraRecibida) {
        this.estado.modoFigura = 'simple';
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = figuraRecibida || generarFigura('simple');
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

    iniciarModoGrupal(jugadorId, figuraRecibida) {
        this.estado.modoFigura = 'grupal';
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = figuraRecibida || generarFigura('grupal');
        this.estado.celdasColocadas = this.celdasGrupales;
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        // Inicializar puntuaciones
        const jugadores = leaderboardManager.obtenerJugadores();
        jugadores.forEach(j => {
            leaderboardManager.establecerPuntuacion(j.id, 0);
            this.puntosPorCelda[j.id] = 0;
        });
        
        zoomManager.actualizarJugador(jugadorId, {
            figura: this.estado.figuraActual,
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
        return this.estado.figuraActual;
    }

    sincronizarCeldasGrupales(celdas, contribuciones, figura) {
        if (this.estado.modoFigura !== 'grupal') return;
        
        if (figura) {
            this.estado.figuraActual = clonarObjeto(figura);
        }
        
        this.celdasGrupales = clonarObjeto(celdas || []);
        this.estado.celdasColocadas = this.celdasGrupales;
        
        if (contribuciones) {
            this.contribuciones = clonarObjeto(contribuciones);
        }
        
        const totalCeldas = this.estado.figuraActual?.celdas.length || 0;
        if (this.celdasGrupales.length === totalCeldas && totalCeldas > 0) {
            this.estado.completado = true;
        }
        
        this.notificar();
    }

    colocarDado(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        const valor = this.obtenerValorCelda(x, y);
        if (valor === null) return false;
        
        const nuevaCelda = { x, y, valor };
        
        // Verificar si ya está colocada
        const celdasActuales = this.obtenerCeldasActuales();
        if (celdasActuales.some(c => c.x === x && c.y === y)) return false;
        
        // Verificar adyacencia
        if (celdasActuales.length > 0) {
            const esAdyacente = celdasActuales.some(c => 
                Math.abs(c.x - x) + Math.abs(c.y - y) === 1
            );
            if (!esAdyacente) return false;
        } else {
            // Primera celda debe ser el inicio
            const inicio = this.estado.figuraActual.inicio;
            if (x !== inicio.x || y !== inicio.y) return false;
        }
        
        // Colocar
        if (this.estado.modoFigura === 'grupal') {
            this.celdasGrupales.push(nuevaCelda);
            this.estado.celdasColocadas = this.celdasGrupales;
            
            if (!this.contribuciones[this.estado.jugadorId]) {
                this.contribuciones[this.estado.jugadorId] = [];
            }
            this.contribuciones[this.estado.jugadorId].push(nuevaCelda);
            
            this.puntosPorCelda[this.estado.jugadorId] = (this.puntosPorCelda[this.estado.jugadorId] || 0) + 1;
            leaderboardManager.establecerPuntuacion(this.estado.jugadorId, this.puntosPorCelda[this.estado.jugadorId]);
        } else {
            this.estado.celdasColocadas.push(nuevaCelda);
        }
        
        deshacerManager.pushAccion({
            tipo: 'colocar',
            jugadorId: this.estado.jugadorId,
            celda: nuevaCelda,
            figuraId: this.estado.figuraActual.id,
            modo: this.estado.modoFigura
        });
        
        // Verificar completado
        const totalCeldas = this.estado.figuraActual.celdas.length;
        if (this.obtenerCeldasActuales().length === totalCeldas) {
            this.completarFigura();
        }
        
        const celdasActualizadas = this.obtenerCeldasActuales();
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, celdasActualizadas);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: celdasActualizadas,
            estado: this.estado.completado ? 'completado' : 'jugando'
        });
        
        this.notificar();
        return true;
    }

    obtenerCeldasActuales() {
        return this.estado.modoFigura === 'grupal' 
            ? this.celdasGrupales 
            : this.estado.celdasColocadas;
    }

    obtenerValorCelda(x, y) {
        const celda = this.estado.figuraActual?.celdas?.find(c => c.x === x && c.y === y);
        return celda ? celda.valor : null;
    }

    completarFigura() {
        if (this.estado.completado) return false;
        
        this.estado.completado = true;
        
        if (this.estado.modoFigura === 'simple') {
            leaderboardManager.actualizarPuntuacion(this.estado.jugadorId, 1);
        }
        
        zoomManager.actualizarJugador(this.estado.jugadorId, { estado: 'completado' });
        this.notificar();
        return true;
    }

    marcarCompletadoRemoto() {
        if (this.estado.completado || !this.estado.figuraActual) return false;
        
        this.estado.completado = true;
        zoomManager.actualizarJugador(this.estado.jugadorId, { estado: 'completado' });
        this.notificar();
        return true;
    }

    deshacerCelda(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        const celdasActuales = this.obtenerCeldasActuales();
        const index = celdasActuales.findIndex(c => c.x === x && c.y === y);
        
        if (index === -1 || index !== celdasActuales.length - 1) return false;
        
        const celdaRemovida = celdasActuales.pop();
        
        if (this.estado.modoFigura === 'grupal') {
            // Actualizar contribuciones
            for (const jugadorId in this.contribuciones) {
                const contribs = this.contribuciones[jugadorId];
                const idx = contribs.findIndex(c => c.x === x && c.y === y);
                if (idx !== -1) {
                    contribs.splice(idx, 1);
                    this.puntosPorCelda[jugadorId] = (this.puntosPorCelda[jugadorId] || 1) - 1;
                    leaderboardManager.establecerPuntuacion(jugadorId, this.puntosPorCelda[jugadorId]);
                    break;
                }
            }
            this.estado.celdasColocadas = this.celdasGrupales;
        }
        
        // Limpiar historial de deshacer
        const historial = deshacerManager.obtenerHistorial();
        for (let i = historial.length - 1; i >= 0; i--) {
            if (historial[i].tipo === 'colocar' && 
                historial[i].celda.x === x && 
                historial[i].celda.y === y) {
                historial.splice(i, 1);
                break;
            }
        }
        
        const celdasActualizadas = this.obtenerCeldasActuales();
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, celdasActualizadas);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: celdasActualizadas
        });
        
        this.notificar();
        return true;
    }

    reiniciarTablero() {
        if (this.estado.modoFigura === 'grupal') {
            this.celdasGrupales = [];
            this.estado.celdasColocadas = this.celdasGrupales;
            this.contribuciones = {};
            this.puntosPorCelda = {};
            leaderboardManager.obtenerJugadores().forEach(j => {
                leaderboardManager.establecerPuntuacion(j.id, 0);
            });
        } else {
            this.estado.celdasColocadas = [];
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
        
        const celdasActuales = this.obtenerCeldasActuales();
        const colocadasIds = new Set(celdasActuales.map(c => `${c.x},${c.y}`));
        const disponibles = [];
        
        for (const celda of this.estado.figuraActual.celdas) {
            const id = `${celda.x},${celda.y}`;
            if (colocadasIds.has(id)) continue;
            
            if (celdasActuales.length === 0) {
                if (celda.x === this.estado.figuraActual.inicio.x && 
                    celda.y === this.estado.figuraActual.inicio.y) {
                    disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
                }
            } else {
                const esAdyacente = celdasActuales.some(c => 
                    Math.abs(c.x - celda.x) + Math.abs(c.y - celda.y) === 1
                );
                if (esAdyacente) {
                    disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
                }
            }
        }
        
        return disponibles;
    }

    esCeldaDisponible(x, y) {
        return this.obtenerCeldasDisponibles().some(c => c.x === x && c.y === y);
    }

    obtenerEstado() {
        return {
            ...this.estado,
            celdasColocadas: this.obtenerCeldasActuales().slice(),
            disponibles: this.obtenerCeldasDisponibles(),
            progreso: obtenerProgreso(this.estado.figuraActual, this.obtenerCeldasActuales())
        };
    }

    obtenerContribuciones() {
        return this.estado.modoFigura === 'grupal' ? this.contribuciones : {};
    }

    obtenerPuntosPorCelda() {
        return this.estado.modoFigura === 'grupal' ? this.puntosPorCelda : {};
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

    notificar() {
        const data = this.obtenerEstado();
        this.observers.forEach(cb => cb(data));
    }
}

export const juegoManager = new JuegoManager();