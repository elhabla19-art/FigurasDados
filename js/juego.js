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
        this.modoFigura = 'simple'; // 'simple' o 'grupal'
        this.figuraCompartida = null; // Para modo grupal
        this.celdasGrupales = []; // Para modo grupal
        this.jugadoresCeldas = {}; // Para modo simple (tracking por jugador)
        this.contribuciones = {}; // Para modo grupal (quién puso qué celda)
    }

    // Iniciar sin figura (estado vacío)
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
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        
        leaderboardManager.actualizarFigura(jugadorId, null);
        leaderboardManager.actualizarCeldas(jugadorId, []);
        
        this.notificar();
        return null;
    }

    // Iniciar ronda normal (individual)
    iniciarRonda(jugadorId) {
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = generarFigura('simple');
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        this.modoFigura = 'simple';
        this.figuraCompartida = this.estado.figuraActual;
        
        // Inicializar celdas del jugador
        if (!this.jugadoresCeldas[jugadorId]) {
            this.jugadoresCeldas[jugadorId] = [];
        }
        this.jugadoresCeldas[jugadorId] = [];
        this.estado.celdasColocadas = this.jugadoresCeldas[jugadorId];
        this.celdasGrupales = [];
        this.contribuciones = {};
        
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

    // Iniciar modo simple (figura compartida visualmente, llenado individual)
    iniciarModoSimple(jugadorId, figura) {
        this.modoFigura = 'simple';
        this.estado.jugadorId = jugadorId;
        this.estado.figuraActual = figura || generarFigura('simple');
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        
        // Guardar figura compartida
        this.figuraCompartida = this.estado.figuraActual;
        this.celdasGrupales = [];
        this.contribuciones = {};
        
        // Inicializar celdas por jugador
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

    // Iniciar modo grupal (figura compartida y llenado compartido)
    iniciarModoGrupal(jugadorId, figura) {
        this.modoFigura = 'grupal';
        this.estado.jugadorId = jugadorId;
        
        // Si no se proporciona figura, generar una nueva SOLO si no hay una ya activa
        if (!figura && !this.figuraCompartida) {
            this.figuraCompartida = generarFigura('grupal');
        } else if (figura) {
            this.figuraCompartida = figura;
        }
        
        // Si ya hay una figura compartida, usarla
        if (this.figuraCompartida) {
            this.estado.figuraActual = this.figuraCompartida;
        } else {
            this.estado.figuraActual = generarFigura('grupal');
            this.figuraCompartida = this.estado.figuraActual;
        }
        
        this.estado.celdasColocadas = this.celdasGrupales; // Usar celdas compartidas
        this.estado.completado = false;
        this.estado.ronda += 1;
        this.estado.enJuego = true;
        
        // Limpiar celdas grupales si es una nueva figura
        if (!figura) {
            this.celdasGrupales = [];
            this.contribuciones = {};
        }
        
        this.estado.celdasColocadas = this.celdasGrupales;
        
        deshacerManager.limpiarHistorialJugador(jugadorId);
        
        leaderboardManager.actualizarFigura(jugadorId, this.estado.figuraActual);
        leaderboardManager.actualizarCeldas(jugadorId, this.celdasGrupales);
        
        zoomManager.actualizarJugador(jugadorId, {
            figura: this.estado.figuraActual,
            celdasColocadas: this.celdasGrupales,
            estado: 'jugando'
        });
        
        this.notificar();
        return this.estado.figuraActual;
    }

    // Colocar un dado en una celda
    colocarDado(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        var valor = this.obtenerValorCelda(x, y);
        if (valor === null) return false;
        
        var nuevaCelda = { x: x, y: y, valor: valor };
        
        // En modo grupal, verificar en celdasGrupales (compartidas)
        var yaColocada = this.celdasGrupales.some(function(c) { 
            return c.x === x && c.y === y; 
        });
        
        if (yaColocada) return false;
        
        // Verificar si es adyacente al inicio o a celdas ya colocadas
        if (this.celdasGrupales.length === 0) {
            var inicio = this.estado.figuraActual.inicio;
            if (x !== inicio.x || y !== inicio.y) return false;
        } else {
            var esAdyacente = this.celdasGrupales.some(function(c) {
                return Math.abs(c.x - x) + Math.abs(c.y - y) === 1;
            });
            if (!esAdyacente) return false;
        }
        
        // Colocar la celda en las celdas grupales (compartidas)
        this.celdasGrupales.push(nuevaCelda);
        this.estado.celdasColocadas = this.celdasGrupales;
        
        // Registrar contribución del jugador
        if (!this.contribuciones[this.estado.jugadorId]) {
            this.contribuciones[this.estado.jugadorId] = [];
        }
        this.contribuciones[this.estado.jugadorId].push(nuevaCelda);
        
        // Registrar en deshacer
        deshacerManager.pushAccion({
            tipo: 'colocar',
            jugadorId: this.estado.jugadorId,
            celda: { x: nuevaCelda.x, y: nuevaCelda.y, valor: nuevaCelda.valor },
            figuraId: this.estado.figuraActual.id,
            modo: 'grupal'
        });
        
        // Verificar si se completó
        var totalCeldas = this.estado.figuraActual.celdas.length;
        if (this.celdasGrupales.length === totalCeldas) {
            this.completarFigura();
        }
        
        // Actualizar leaderboard con puntos por contribuciones
        var contribuciones = this.contribuciones[this.estado.jugadorId] || [];
        leaderboardManager.establecerPuntuacion(this.estado.jugadorId, contribuciones.length);
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, this.celdasGrupales);
        
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: this.celdasGrupales,
            estado: this.estado.completado ? 'completado' : 'jugando'
        });
        
        this.notificar();
        
        // RETORNAR LA CELDA PARA PUBLICARLA
        return nuevaCelda;
    }

    // Deshacer una celda específica
    deshacerCelda(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        // En modo grupal, verificar en celdasGrupales
        var index = -1;
        for (var i = 0; i < this.celdasGrupales.length; i++) {
            if (this.celdasGrupales[i].x === x && this.celdasGrupales[i].y === y) {
                index = i;
                break;
            }
        }
        
        if (index === -1) return false;
        
        // Solo se puede deshacer la ULTIMA celda colocada
        if (index !== this.celdasGrupales.length - 1) {
            return false;
        }
        
        // Remover la celda
        var celdaRemovida = this.celdasGrupales.pop();
        
        // En modo grupal, también remover de contribuciones
        for (var jugadorId in this.contribuciones) {
            var contribs = this.contribuciones[jugadorId];
            for (var j = contribs.length - 1; j >= 0; j--) {
                if (contribs[j].x === x && contribs[j].y === y) {
                    contribs.splice(j, 1);
                    // Actualizar puntuación del jugador
                    leaderboardManager.establecerPuntuacion(jugadorId, contribs.length);
                    break;
                }
            }
        }
        this.estado.celdasColocadas = this.celdasGrupales;
        
        // Eliminar del historial de deshacer
        var acciones = deshacerManager.obtenerHistorialJugador(this.estado.jugadorId);
        for (var j = acciones.length - 1; j >= 0; j--) {
            if (acciones[j].tipo === 'colocar' && 
                acciones[j].celda.x === x && 
                acciones[j].celda.y === y) {
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
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, this.celdasGrupales);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: this.celdasGrupales
        });
        
        this.notificar();
        return true;
    }

    // Obtener el valor de una celda en la figura actual
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

    // Completar la figura actual
    completarFigura() {
        if (this.estado.completado) return false;
        
        this.estado.completado = true;
        
        deshacerManager.pushAccion({
            tipo: 'completar',
            jugadorId: this.estado.jugadorId,
            figuraId: this.estado.figuraActual.id,
            celdas: this.celdasGrupales.slice(),
            modo: 'grupal'
        });
        
        // En modo grupal, los puntos ya se actualizan por contribución
        // pero podemos dar un bonus al que completa
        leaderboardManager.actualizarPuntuacion(this.estado.jugadorId, 2);
        
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            estado: 'completado'
        });
        
        this.notificar();
        return true;
    }

    /**
     * Marcar la figura como completada remotamente (cuando otro jugador completa)
     * Esto permite que todos los jugadores sepan que la ronda terminó
     */
    marcarCompletadoRemoto() {
        // Si ya está completado localmente, no hacer nada
        if (this.estado.completado) return true;
        
        // Si no hay figura activa, no hacer nada
        if (!this.estado.figuraActual) return false;
        
        // Marcar como completado
        this.estado.completado = true;
        
        // Registrar en deshacer
        deshacerManager.pushAccion({
            tipo: 'completar_remoto',
            jugadorId: this.estado.jugadorId,
            figuraId: this.estado.figuraActual.id,
            modo: this.modoFigura,
            timestamp: Date.now()
        });
        
        // Actualizar zoom
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            estado: 'completado'
        });
        
        // Notificar a todos los observers (UI se actualizará)
        this.notificar();
        
        return true;
    }

    // Deshacer la última acción (método legacy)
    deshacer() {
        if (!this.estado.enJuego || this.estado.completado) return false;
        
        var accion = deshacerManager.deshacerJugador(this.estado.jugadorId);
        if (!accion) return false;
        
        if (accion.tipo === 'colocar') {
            var index = -1;
            for (var i = 0; i < this.celdasGrupales.length; i++) {
                if (this.celdasGrupales[i].x === accion.celda.x && 
                    this.celdasGrupales[i].y === accion.celda.y) {
                    index = i;
                    break;
                }
            }
            if (index !== -1) {
                this.celdasGrupales.splice(index, 1);
            }
            
            this.estado.celdasColocadas = this.celdasGrupales;
            
            leaderboardManager.actualizarCeldas(this.estado.jugadorId, this.celdasGrupales);
            zoomManager.actualizarJugador(this.estado.jugadorId, {
                celdasColocadas: this.celdasGrupales
            });
            
            this.notificar();
            return true;
        }
        
        return false;
    }

    // Reiniciar el tablero (limpiar celdas)
    reiniciarTablero() {
        this.celdasGrupales = [];
        this.estado.celdasColocadas = this.celdasGrupales;
        this.contribuciones = {};
        this.estado.completado = false;
        
        deshacerManager.limpiarHistorialJugador(this.estado.jugadorId);
        
        leaderboardManager.actualizarCeldas(this.estado.jugadorId, []);
        zoomManager.actualizarJugador(this.estado.jugadorId, {
            celdasColocadas: [],
            estado: 'jugando'
        });
        
        this.notificar();
    }

    // Obtener celdas disponibles
    obtenerCeldasDisponibles() {
        if (!this.estado.figuraActual) return [];
        
        var figura = this.estado.figuraActual;
        var disponibles = [];
        var colocadasIds = new Set(this.celdasGrupales.map(function(c) { 
            return c.x + ',' + c.y; 
        }));
        
        for (var i = 0; i < figura.celdas.length; i++) {
            var celda = figura.celdas[i];
            var id = celda.x + ',' + celda.y;
            if (colocadasIds.has(id)) continue;
            
            if (this.celdasGrupales.length === 0) {
                // Primera celda debe ser el inicio
                if (celda.x === figura.inicio.x && celda.y === figura.inicio.y) {
                    disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
                }
            } else {
                // Debe ser adyacente a alguna colocada
                var esAdyacente = this.celdasGrupales.some(function(c) {
                    return Math.abs(c.x - celda.x) + Math.abs(c.y - celda.y) === 1;
                });
                if (esAdyacente) {
                    disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
                }
            }
        }
        
        return disponibles;
    }

    // Obtener progreso actual
    obtenerProgreso() {
        if (!this.estado.figuraActual) return { actual: 0, total: 0, porcentaje: 0 };
        return obtenerProgreso(this.estado.figuraActual, this.celdasGrupales);
    }

    // Verificar si una celda está disponible
    esCeldaDisponible(x, y) {
        var disponibles = this.obtenerCeldasDisponibles();
        for (var i = 0; i < disponibles.length; i++) {
            if (disponibles[i].x === x && disponibles[i].y === y) {
                return true;
            }
        }
        return false;
    }

    // Verificar si una celda está colocada
    esCeldaColocada(x, y) {
        for (var i = 0; i < this.celdasGrupales.length; i++) {
            if (this.celdasGrupales[i].x === x && this.celdasGrupales[i].y === y) {
                return true;
            }
        }
        return false;
    }

    // Obtener el estado actual del juego
    obtenerEstado() {
        return {
            jugadorId: this.estado.jugadorId,
            figuraActual: this.estado.figuraActual,
            celdasColocadas: this.celdasGrupales.slice(),
            completado: this.estado.completado,
            ronda: this.estado.ronda,
            enJuego: this.estado.enJuego,
            modoFigura: this.modoFigura,
            disponibles: this.obtenerCeldasDisponibles(),
            progreso: this.obtenerProgreso()
        };
    }

    // Obtener contribuciones por jugador (modo grupal)
    obtenerContribuciones() {
        if (this.modoFigura !== 'grupal') return {};
        return this.contribuciones;
    }

    // Obtener celdas grupales (modo grupal)
    obtenerCeldasGrupales() {
        return this.celdasGrupales.slice();
    }

    // Establecer el modo de juego
    setModo(modo, salaId) {
        this.modo = modo;
        this.salaId = salaId || null;
    }

    // Suscribir observer
    suscribir(callback) {
        this.observers.push(callback);
    }

    // Desuscribir observer
    desuscribir(callback) {
        this.observers = this.observers.filter(function(cb) { return cb !== callback; });
    }

    // Notificar a todos los observers
    notificar() {
        var data = this.obtenerEstado();
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i](data);
        }
    }

    // Exportar estado
    exportarEstado() {
        return clonarObjeto(this.estado);
    }

    // Importar estado
    importarEstado(estado) {
        this.estado = clonarObjeto(estado);
        this.notificar();
    }

    // Sincronizar con datos externos
    sincronizar(datos) {
        if (datos.jugadorId) this.estado.jugadorId = datos.jugadorId;
        if (datos.figuraActual) this.estado.figuraActual = clonarObjeto(datos.figuraActual);
        if (datos.celdasColocadas) {
            this.celdasGrupales = clonarObjeto(datos.celdasColocadas);
            this.estado.celdasColocadas = this.celdasGrupales;
        }
        if (datos.completado !== undefined) this.estado.completado = datos.completado;
        if (datos.ronda) this.estado.ronda = datos.ronda;
        if (datos.modoFigura) this.modoFigura = datos.modoFigura;
        
        this.notificar();
    }

    // Método para agregar una celda remota (desde MQTT)
    agregarCeldaRemota(jugadorId, celda) {
        if (this.modoFigura !== 'grupal') return false;
        
        // Verificar si ya está colocada
        var yaColocada = this.celdasGrupales.some(function(c) {
            return c.x === celda.x && c.y === celda.y;
        });
        
        if (yaColocada) return false;
        
        // Agregar la celda
        this.celdasGrupales.push(celda);
        this.estado.celdasColocadas = this.celdasGrupales;
        
        // Registrar contribución del otro jugador
        if (!this.contribuciones[jugadorId]) {
            this.contribuciones[jugadorId] = [];
        }
        this.contribuciones[jugadorId].push(celda);
        
        // Actualizar leaderboard del otro jugador
        var contribs = this.contribuciones[jugadorId] || [];
        leaderboardManager.establecerPuntuacion(jugadorId, contribs.length);
        leaderboardManager.actualizarCeldas(jugadorId, this.celdasGrupales);
        
        // Verificar si se completó
        var totalCeldas = this.estado.figuraActual.celdas.length;
        if (this.celdasGrupales.length === totalCeldas) {
            this.completarFigura();
        }
        
        // Actualizar zoom
        zoomManager.actualizarJugador(jugadorId, {
            celdasColocadas: this.celdasGrupales,
            estado: this.estado.completado ? 'completado' : 'jugando'
        });
        
        this.notificar();
        return true;
    }

    // Método para remover una celda remota (desde MQTT)
    removerCeldaRemota(jugadorId, celda) {
        if (this.modoFigura !== 'grupal') return false;
        
        // Encontrar y eliminar la celda
        var index = -1;
        for (var i = this.celdasGrupales.length - 1; i >= 0; i--) {
            if (this.celdasGrupales[i].x === celda.x && this.celdasGrupales[i].y === celda.y) {
                index = i;
                break;
            }
        }
        
        if (index === -1) return false;
        
        this.celdasGrupales.splice(index, 1);
        this.estado.celdasColocadas = this.celdasGrupales;
        
        // Remover de contribuciones
        if (this.contribuciones[jugadorId]) {
            var contribs = this.contribuciones[jugadorId];
            for (var j = contribs.length - 1; j >= 0; j--) {
                if (contribs[j].x === celda.x && contribs[j].y === celda.y) {
                    contribs.splice(j, 1);
                    leaderboardManager.establecerPuntuacion(jugadorId, contribs.length);
                    break;
                }
            }
        }
        
        // Actualizar zoom
        zoomManager.actualizarJugador(jugadorId, {
            celdasColocadas: this.celdasGrupales
        });
        
        this.notificar();
        return true;
    }
}

// Crear instancia singleton
var juegoManager = new JuegoManager();

// Exportar para usar en otros modulos
export { JuegoManager, juegoManager };