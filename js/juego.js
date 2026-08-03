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
        // Registro de eventos por celda (clave "x,y") con timestamp.
        // Es la fuente de verdad para fusionar el tablero grupal entre jugadores:
        // permite que tanto colocar como deshacer se propaguen correctamente
        // (last-write-wins por timestamp), en vez de una simple union que solo suma.
        this.registroCeldas = {};
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
        this.registroCeldas = {};
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
        this.registroCeldas = {};
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
        this.registroCeldas = {};
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

    sincronizarCeldasGrupales(registroRemoto, figura) {
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
                this.registroCeldas = {};
                this.ultimoEstadoHash = null;
            } else {
                return;
            }
        }
        
        if (figura) {
            this.estado.figuraActual = clonarObjeto(figura);
        }
        
        // FUSIÓN "last-write-wins" por timestamp, en vez de union o reemplazo.
        // Cada celda (colocada o deshecha) es un evento con timestamp. Al fusionar,
        // por cada clave "x,y" nos quedamos con el evento MAS RECIENTE, sea de
        // colocación (activa:true) o de borrado (activa:false). Esto evita dos
        // problemas anteriores:
        //  - reemplazar el array entero perdía celdas por condiciones de carrera
        //  - una union pura nunca podía "olvidar" una celda, así que un deshacer
        //    nunca se propagaba y la celda terminaba reapareciendo sola
        const remoto = clonarObjeto(registroRemoto || {});
        for (const clave in remoto) {
            const eventoRemoto = remoto[clave];
            const eventoLocal = this.registroCeldas[clave];
            if (!eventoLocal || eventoRemoto.timestamp > eventoLocal.timestamp) {
                this.registroCeldas[clave] = eventoRemoto;
            }
        }
        
        // Reconstruir celdasGrupales / contribuciones / puntosPorCelda desde el
        // registro fusionado, en orden cronológico, para que "última celda propia"
        // (usado por deshacerCelda) siga siendo confiable tras la fusión.
        const eventosActivos = Object.values(this.registroCeldas)
            .filter(e => e.activa)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        this.celdasGrupales = [];
        this.contribuciones = {};
        this.puntosPorCelda = {};
        for (const evento of eventosActivos) {
            const celda = { x: evento.x, y: evento.y, valor: evento.valor };
            this.celdasGrupales.push(celda);
            if (!this.contribuciones[evento.jugadorId]) {
                this.contribuciones[evento.jugadorId] = [];
            }
            this.contribuciones[evento.jugadorId].push(celda);
            this.puntosPorCelda[evento.jugadorId] = (this.puntosPorCelda[evento.jugadorId] || 0) + 1;
        }
        this.estado.celdasColocadas = this.celdasGrupales;
        
        const totalCeldas = this.estado.figuraActual?.celdas?.length || 0;
        this.estado.completado = this.celdasGrupales.length === totalCeldas && totalCeldas > 0;
        
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
            this.registroCeldas[`${x},${y}`] = {
                x, y, valor,
                jugadorId: this.estado.jugadorId,
                timestamp: Date.now(),
                activa: true
            };
            
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
        
        if (this.estado.modoFigura === 'grupal') {
            // En grupal, el array compartido se reordena constantemente por la
            // fusion con snapshots remotos, asi que "ser el ultimo del array" ya
            // no es un indicador confiable. Validamos contra la ultima
            // contribucion PROPIA del jugador actual en su lugar.
            const misContribuciones = this.contribuciones[this.estado.jugadorId] || [];
            const ultimaPropia = misContribuciones[misContribuciones.length - 1];
            if (!ultimaPropia || ultimaPropia.x !== x || ultimaPropia.y !== y) {
                return false;
            }
        } else {
            // En modo simple, solo se puede deshacer la última celda colocada
            if (index !== celdasActuales.length - 1) return false;
        }
        
        celdasActuales.splice(index, 1);
        
        if (this.estado.modoFigura === 'grupal') {
            // Tombstone: registramos el borrado con un timestamp nuevo, mayor al
            // de la colocación. Así, cuando este evento se publique y otros
            // jugadores lo reciban, su fusión por timestamp preferirá este
            // borrado sobre la colocación vieja y la celda desaparecerá también
            // en sus tableros, en vez de reaparecer por union pura.
            this.registroCeldas[`${x},${y}`] = {
                x, y,
                valor: this.obtenerValorCelda(x, y),
                jugadorId: this.estado.jugadorId,
                timestamp: Date.now(),
                activa: false
            };
            
            const contribs = this.contribuciones[this.estado.jugadorId];
            contribs.pop();
            this.puntosPorCelda[this.estado.jugadorId] = Math.max(0, (this.puntosPorCelda[this.estado.jugadorId] || 1) - 1);
            this.puntajesGrupales[this.estado.jugadorId] = Math.max(0, (this.puntajesGrupales[this.estado.jugadorId] || 0) - 1);
            const total = (this.puntajesSimples[this.estado.jugadorId] || 0) + (this.puntajesGrupales[this.estado.jugadorId] || 0);
            leaderboardManager.establecerPuntuacion(this.estado.jugadorId, total);
            leaderboardManager.establecerPuntosGrupales(this.estado.jugadorId, this.puntajesGrupales[this.estado.jugadorId] || 0);
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
            // Marcamos como tombstone (borrado) cada celda activa, en vez de solo
            // vaciar el array local, para que el reinicio también se propague
            // correctamente al fusionarse en los demás clientes.
            const ahora = Date.now();
            for (const clave in this.registroCeldas) {
                if (this.registroCeldas[clave].activa) {
                    this.registroCeldas[clave] = {
                        ...this.registroCeldas[clave],
                        timestamp: ahora,
                        activa: false
                    };
                }
            }
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

    obtenerRegistroCeldas() {
        return clonarObjeto(this.registroCeldas);
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