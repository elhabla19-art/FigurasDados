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
        this.puntajesAcumulados = {};
        this.puntajesGrupales = {};
        this.puntajesSimples = {};
        this.ultimoEstadoHash = null; // Para evitar notificaciones duplicadas
    }

    iniciarVacio(jugadorId, figuraInicial = null, modoFigura = 'simple') {
        this.estado = {
            jugadorId,
            figuraActual: figuraInicial || null,
            celdasColocadas: [],
            completado: false,
            ronda: 0,
            enJuego: true,
            modoFigura: modoFigura
        };
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        this.ultimoEstadoHash = null;
        deshacerManager.limpiarHistorialJugador(jugadorId);
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
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
        this.ultimoEstadoHash = null;
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        if (!this.puntajesSimples[jugadorId]) {
            this.puntajesSimples[jugadorId] = 0;
        }
        
        const total = this.puntajesSimples[jugadorId] + (this.puntajesGrupales[jugadorId] || 0);
        leaderboardManager.establecerPuntuacion(jugadorId, total);
        leaderboardManager.establecerPuntosSimples(jugadorId, this.puntajesSimples[jugadorId]);
        leaderboardManager.establecerPuntosGrupales(jugadorId, this.puntajesGrupales[jugadorId] || 0);
        
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
        this.ultimoEstadoHash = null;
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        if (!this.puntajesGrupales[jugadorId]) {
            this.puntajesGrupales[jugadorId] = 0;
        }
        
        const total = (this.puntajesSimples[jugadorId] || 0) + (this.puntajesGrupales[jugadorId] || 0);
        leaderboardManager.establecerPuntuacion(jugadorId, total);
        leaderboardManager.establecerPuntosSimples(jugadorId, this.puntajesSimples[jugadorId] || 0);
        leaderboardManager.establecerPuntosGrupales(jugadorId, this.puntajesGrupales[jugadorId] || 0);
        
        zoomManager.actualizarJugador(jugadorId, {
            figura: this.estado.figuraActual,
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
        return this.estado.figuraActual;
    }

    sincronizarCeldasGrupales(celdas, contribuciones, figura) {
        // Si no estamos en modo grupal pero recibimos datos grupales, inicializar el modo grupal
        if (this.estado.modoFigura !== 'grupal') {
            if (figura) {
                this.estado.modoFigura = 'grupal';
                this.estado.figuraActual = clonarObjeto(figura);
                this.estado.enJuego = true;
                this.estado.completado = false;
                this.celdasGrupales = [];
                this.contribuciones = {};
                this.puntosPorCelda = {};
                this.ultimoEstadoHash = null;
            } else {
                return;
            }
        }
        
        if (figura) {
            this.estado.figuraActual = clonarObjeto(figura);
        }
        
        this.celdasGrupales = clonarObjeto(celdas || []);
        this.estado.celdasColocadas = this.celdasGrupales;
        
        if (contribuciones) {
            this.contribuciones = clonarObjeto(contribuciones);
        }
        
        const totalCeldas = this.estado.figuraActual?.celdas?.length || 0;
        if (this.celdasGrupales.length === totalCeldas && totalCeldas > 0) {
            this.estado.completado = true;
        }
        
        this.ultimoEstadoHash = null;
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
        
        // Verificar que la celda pertenece a la figura
        const perteneceFigura = this.estado.figuraActual.celdas.some(c => c.x === x && c.y === y);
        if (!perteneceFigura) return false;
        
        // Colocar
        if (this.estado.modoFigura === 'grupal') {
            this.celdasGrupales.push(nuevaCelda);
            this.estado.celdasColocadas = this.celdasGrupales;
            
            if (!this.contribuciones[this.estado.jugadorId]) {
                this.contribuciones[this.estado.jugadorId] = [];
            }
            this.contribuciones[this.estado.jugadorId].push(nuevaCelda);
            
            this.puntosPorCelda[this.estado.jugadorId] = (this.puntosPorCelda[this.estado.jugadorId] || 0) + 1;
            this.puntajesGrupales[this.estado.jugadorId] = (this.puntajesGrupales[this.estado.jugadorId] || 0) + 1;
            const total = (this.puntajesSimples[this.estado.jugadorId] || 0) + (this.puntajesGrupales[this.estado.jugadorId] || 0);
            leaderboardManager.establecerPuntuacion(this.estado.jugadorId, total);
            leaderboardManager.establecerPuntosGrupales(this.estado.jugadorId, this.puntajesGrupales[this.estado.jugadorId]);
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
        
        const celdasActualizadas = this.obtenerCeldasActuales();
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, celdasActualizadas);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: celdasActualizadas,
            estado: this.estado.completado ? 'completado' : 'jugando'
        });
        
        // Verificar completado DESPUÉS de actualizar las celdas
        const totalCeldas = this.estado.figuraActual.celdas.length;
        if (this.obtenerCeldasActuales().length === totalCeldas) {
            this.completarFigura();
        }
        
        // Notificar una sola vez al final
        this.ultimoEstadoHash = null;
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
            this.puntajesSimples[this.estado.jugadorId] = (this.puntajesSimples[this.estado.jugadorId] || 0) + 1;
            const total = (this.puntajesSimples[this.estado.jugadorId] || 0) + (this.puntajesGrupales[this.estado.jugadorId] || 0);
            leaderboardManager.establecerPuntuacion(this.estado.jugadorId, total);
            leaderboardManager.establecerPuntosSimples(this.estado.jugadorId, this.puntajesSimples[this.estado.jugadorId]);
        }
        
        zoomManager.actualizarJugador(this.estado.jugadorId, { estado: 'completado' });
        this.ultimoEstadoHash = null;
        this.notificar();
        return true;
    }

    marcarCompletadoRemoto() {
        if (this.estado.completado || !this.estado.figuraActual) return false;
        
        this.estado.completado = true;
        zoomManager.actualizarJugador(this.estado.jugadorId, { estado: 'completado' });
        this.ultimoEstadoHash = null;
        this.notificar();
        return true;
    }

    deshacerCelda(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        const celdasActuales = this.obtenerCeldasActuales();
        const index = celdasActuales.findIndex(c => c.x === x && c.y === y);
        
        if (index === -1) return false;
        
        // Solo se puede deshacer la última celda colocada
        if (index !== celdasActuales.length - 1) return false;
        
        const celdaRemovida = celdasActuales.pop();
        
        if (this.estado.modoFigura === 'grupal') {
            // Buscar en qué contribución estaba esta celda
            let encontrado = false;
            for (const jugadorId in this.contribuciones) {
                const contribs = this.contribuciones[jugadorId];
                const idx = contribs.findIndex(c => c.x === x && c.y === y);
                if (idx !== -1) {
                    contribs.splice(idx, 1);
                    this.puntosPorCelda[jugadorId] = Math.max(0, (this.puntosPorCelda[jugadorId] || 1) - 1);
                    this.puntajesGrupales[jugadorId] = Math.max(0, (this.puntajesGrupales[jugadorId] || 0) - 1);
                    const total = (this.puntajesSimples[jugadorId] || 0) + (this.puntajesGrupales[jugadorId] || 0);
                    leaderboardManager.establecerPuntuacion(jugadorId, total);
                    leaderboardManager.establecerPuntosGrupales(jugadorId, this.puntajesGrupales[jugadorId] || 0);
                    encontrado = true;
                    break;
                }
            }
            this.estado.celdasColocadas = this.celdasGrupales;
        }
        
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
        
        this.ultimoEstadoHash = null;
        this.notificar();
        return true;
    }

    reiniciarTablero() {
        if (this.estado.modoFigura === 'grupal') {
            this.celdasGrupales = [];
            this.estado.celdasColocadas = this.celdasGrupales;
            this.contribuciones = {};
            this.puntosPorCelda = {};
        } else {
            this.estado.celdasColocadas = [];
        }
        
        this.estado.completado = false;
        this.ultimoEstadoHash = null;
        deshacerManager.limpiarHistorialJugador(this.estado.jugadorId);
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, []);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
    }

    esCeldaColocada(x, y) {
        const celdasActuales = this.obtenerCeldasActuales();
        return celdasActuales.some(c => c.x === x && c.y === y);
    }

    esCeldaDeFigura(x, y) {
        if (!this.estado.figuraActual) return false;
        return this.estado.figuraActual.celdas.some(c => c.x === x && c.y === y);
    }

    obtenerEstado() {
        return {
            ...this.estado,
            celdasColocadas: this.obtenerCeldasActuales().slice(),
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
        // Crear hash para evitar notificaciones duplicadas
        const hash = JSON.stringify({
            figuraId: data.figuraActual?.id || null,
            celdas: data.celdasColocadas.map(c => `${c.x},${c.y}`).sort().join('|'),
            completado: data.completado,
            modoFigura: data.modoFigura
        });
        
        // Solo notificar si hay cambios reales
        if (this.ultimoEstadoHash !== hash) {
            this.ultimoEstadoHash = hash;
            this.observers.forEach(cb => cb(data));
        }
    }
}

export const juegoManager = new JuegoManager();