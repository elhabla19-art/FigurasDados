import { clonarObjeto } from './utils.js';

class LeaderboardManager {
    constructor() {
        this.jugadores = {};
        this.observers = [];
        this.maxJugadores = 20;
    }

    agregarJugador(id, nombre) {
        if (Object.keys(this.jugadores).length >= this.maxJugadores) {
            return false;
        }
        
        if (!this.jugadores[id]) {
            this.jugadores[id] = {
                id,
                nombre,
                puntos: 0,
                puntosSimples: 0,
                puntosGrupales: 0,
                figurasCompletadas: 0,
                celdasColocadas: [],
                figuraActual: null,
                estado: 'jugando',
                conectado: true
            };
        } else if (nombre !== 'Jugador' || this.jugadores[id].nombre === 'Jugador') {
            this.jugadores[id].nombre = nombre;
            this.jugadores[id].conectado = true;
        }
        
        this.notificar();
        return true;
    }

    actualizarPuntuacion(id, puntos) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].puntos += puntos;
        this.jugadores[id].figurasCompletadas += 1;
        this.notificar();
        return true;
    }

    establecerPuntuacion(id, puntos) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].puntos = puntos;
        this.notificar();
        return true;
    }

    establecerPuntosSimples(id, puntos) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].puntosSimples = puntos;
        this.notificar();
        return true;
    }

    establecerPuntosGrupales(id, puntos) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].puntosGrupales = puntos;
        this.notificar();
        return true;
    }

    actualizarCeldas(id, celdas) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].celdasColocadas = clonarObjeto(celdas);
        this.notificar();
        return true;
    }

    actualizarFigura(id, figura) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].figuraActual = clonarObjeto(figura);
        this.notificar();
        return true;
    }

    actualizarEstado(id, estado) {
        if (!this.jugadores[id]) return false;
        this.jugadores[id].estado = estado;
        this.notificar();
        return true;
    }

    obtenerRanking() {
        return Object.values(this.jugadores)
            .filter(j => j.conectado)
            .map(j => ({
                id: j.id,
                nombre: j.nombre,
                puntos: j.puntos,
                puntosSimples: j.puntosSimples || 0,
                puntosGrupales: j.puntosGrupales || 0,
                figurasCompletadas: j.figurasCompletadas || 0,
                celdasColocadas: j.celdasColocadas || [],
                figuraActual: j.figuraActual,
                estado: j.estado || 'jugando'
            }))
            .sort((a, b) => b.puntos - a.puntos);
    }

    obtenerJugador(id) {
        if (!this.jugadores[id]) return null;
        const j = this.jugadores[id];
        return {
            id: j.id,
            nombre: j.nombre,
            puntos: j.puntos,
            puntosSimples: j.puntosSimples || 0,
            puntosGrupales: j.puntosGrupales || 0,
            figurasCompletadas: j.figurasCompletadas || 0,
            celdasColocadas: j.celdasColocadas || [],
            figuraActual: j.figuraActual,
            estado: j.estado || 'jugando'
        };
    }

    obtenerJugadores() {
        return Object.values(this.jugadores).map(j => ({
            id: j.id,
            nombre: j.nombre,
            puntos: j.puntos,
            puntosSimples: j.puntosSimples || 0,
            puntosGrupales: j.puntosGrupales || 0,
            figurasCompletadas: j.figurasCompletadas || 0,
            celdasColocadas: j.celdasColocadas || [],
            figuraActual: j.figuraActual,
            estado: j.estado || 'jugando',
            conectado: j.conectado
        }));
    }

    suscribir(callback) {
        this.observers.push(callback);
    }

    notificar() {
        const data = this.obtenerJugadores();
        this.observers.forEach(cb => cb(data));
    }
}

export const leaderboardManager = new LeaderboardManager();