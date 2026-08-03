import { clonarObjeto, generarId } from './utils.js';

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
                id: id,
                nombre: nombre,
                puntos: 0,
                figurasCompletadas: 0,
                ultimaFigura: null,
                celdasColocadas: [],
                figuraActual: null,
                estado: 'jugando',
                conectado: true
            };
        } else {
            this.jugadores[id].nombre = nombre;
            this.jugadores[id].conectado = true;
        }
        
        this.notificar();
        return true;
    }

    eliminarJugador(id) {
        if (this.jugadores[id]) {
            delete this.jugadores[id];
            this.notificar();
            return true;
        }
        return false;
    }

    desconectarJugador(id) {
        if (this.jugadores[id]) {
            this.jugadores[id].conectado = false;
            this.notificar();
            return true;
        }
        return false;
    }

    actualizarPuntuacion(id, puntos) {
        if (!this.jugadores[id]) return false;
        
        this.jugadores[id].puntos += puntos;
        if (puntos > 0) {
            this.jugadores[id].figurasCompletadas += 1;
            this.jugadores[id].ultimaFigura = Date.now();
        }
        
        this.notificar();
        return true;
    }

    establecerPuntuacion(id, puntos) {
        if (!this.jugadores[id]) return false;
        
        this.jugadores[id].puntos = puntos;
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
        var jugadoresArray = Object.values(this.jugadores)
            .filter(function(j) { return j.conectado; })
            .map(function(j) { 
                return {
                    id: j.id,
                    nombre: j.nombre,
                    puntos: j.puntos,
                    figurasCompletadas: j.figurasCompletadas || 0,
                    ultimaFigura: j.ultimaFigura,
                    celdasColocadas: j.celdasColocadas || [],
                    figuraActual: j.figuraActual,
                    estado: j.estado || 'jugando',
                    conectado: j.conectado
                };
            });
        
        jugadoresArray.sort(function(a, b) { return b.puntos - a.puntos; });
        return jugadoresArray;
    }

    obtenerJugador(id) {
        if (!this.jugadores[id]) return null;
        return {
            id: this.jugadores[id].id,
            nombre: this.jugadores[id].nombre,
            puntos: this.jugadores[id].puntos,
            figurasCompletadas: this.jugadores[id].figurasCompletadas || 0,
            ultimaFigura: this.jugadores[id].ultimaFigura,
            celdasColocadas: this.jugadores[id].celdasColocadas || [],
            figuraActual: this.jugadores[id].figuraActual,
            estado: this.jugadores[id].estado || 'jugando',
            conectado: this.jugadores[id].conectado
        };
    }

    obtenerJugadores() {
        return Object.values(this.jugadores).map(function(j) {
            return {
                id: j.id,
                nombre: j.nombre,
                puntos: j.puntos,
                figurasCompletadas: j.figurasCompletadas || 0,
                ultimaFigura: j.ultimaFigura,
                celdasColocadas: j.celdasColocadas || [],
                figuraActual: j.figuraActual,
                estado: j.estado || 'jugando',
                conectado: j.conectado
            };
        });
    }

    obtenerJugadoresConectados() {
        return Object.values(this.jugadores)
            .filter(function(j) { return j.conectado; })
            .map(function(j) {
                return {
                    id: j.id,
                    nombre: j.nombre,
                    puntos: j.puntos,
                    figurasCompletadas: j.figurasCompletadas || 0,
                    ultimaFigura: j.ultimaFigura,
                    celdasColocadas: j.celdasColocadas || [],
                    figuraActual: j.figuraActual,
                    estado: j.estado || 'jugando',
                    conectado: j.conectado
                };
            });
    }

    reiniciarPuntuaciones() {
        for (var id in this.jugadores) {
            this.jugadores[id].puntos = 0;
            this.jugadores[id].figurasCompletadas = 0;
            this.jugadores[id].ultimaFigura = null;
            this.jugadores[id].celdasColocadas = [];
            this.jugadores[id].figuraActual = null;
            this.jugadores[id].estado = 'jugando';
        }
        this.notificar();
    }

    obtenerGanador() {
        var ranking = this.obtenerRanking();
        return ranking.length > 0 ? ranking[0] : null;
    }

    obtenerTopN(n) {
        var ranking = this.obtenerRanking();
        return ranking.slice(0, n);
    }

    // METODOS DE SUSCRIPCION
    suscribir(callback) {
        this.observers.push(callback);
    }

    desuscribir(callback) {
        this.observers = this.observers.filter(function(cb) { return cb !== callback; });
    }

    notificar() {
        var data = this.obtenerJugadores();
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i](data);
        }
    }

    exportarDatos() {
        return clonarObjeto(this.jugadores);
    }

    importarDatos(datos) {
        this.jugadores = clonarObjeto(datos);
        this.notificar();
    }

    calcularPromedio() {
        var jugadores = this.obtenerJugadoresConectados();
        if (jugadores.length === 0) return 0;
        var total = jugadores.reduce(function(sum, j) { return sum + j.puntos; }, 0);
        return total / jugadores.length;
    }

    obtenerMasFiguras() {
        var jugadores = this.obtenerJugadoresConectados();
        if (jugadores.length === 0) return null;
        return jugadores.reduce(function(max, j) {
            return j.figurasCompletadas > max.figurasCompletadas ? j : max;
        });
    }
}

// Crear instancia singleton
var leaderboardManager = new LeaderboardManager();

// Exportar para usar en otros modulos
export { LeaderboardManager, leaderboardManager };