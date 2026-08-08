import { clonarObjeto, generarId } from './utils.js';

class DeshacerManager {
    constructor() {
        this.historial = [];
        this.limite = 100;
        this.observers = [];
    }

    pushAccion(accion) {
        if (this.historial.length >= this.limite) {
            this.historial.shift();
        }
        
        var accionConId = {
            ...accion,
            id: generarId(),
            timestamp: Date.now()
        };
        
        this.historial.push(accionConId);
        this.notificar();
        return accionConId;
    }

    popAccion() {
        if (this.historial.length === 0) return null;
        var accion = this.historial.pop();
        this.notificar();
        return accion;
    }

    obtenerUltima() {
        if (this.historial.length === 0) return null;
        return this.historial[this.historial.length - 1];
    }

    obtenerHistorial() {
        return this.historial.slice();
    }

    obtenerHistorialJugador(jugadorId) {
        return this.historial.filter(function(a) { return a.jugadorId === jugadorId; });
    }

    limpiarHistorial() {
        this.historial = [];
        this.notificar();
    }

    limpiarHistorialJugador(jugadorId) {
        this.historial = this.historial.filter(function(a) { return a.jugadorId !== jugadorId; });
        this.notificar();
    }

    deshacerUltima() {
        var accion = this.popAccion();
        if (!accion) return null;
        return accion;
    }

    deshacerJugador(jugadorId) {
        var indices = [];
        for (var i = this.historial.length - 1; i >= 0; i--) {
            if (this.historial[i].jugadorId === jugadorId) {
                indices.push(i);
            }
        }
        
        if (indices.length === 0) return null;
        
        var indice = indices[0];
        var accion = this.historial.splice(indice, 1)[0];
        this.notificar();
        return accion;
    }

    hayAcciones() {
        return this.historial.length > 0;
    }

    hayAccionesJugador(jugadorId) {
        return this.historial.some(function(a) { return a.jugadorId === jugadorId; });
    }

    contarAcciones() {
        return this.historial.length;
    }

    contarAccionesJugador(jugadorId) {
        return this.historial.filter(function(a) { return a.jugadorId === jugadorId; }).length;
    }

    obtenerUltimasN(n) {
        return this.historial.slice(-n);
    }

    suscribir(callback) {
        this.observers.push(callback);
    }

    desuscribir(callback) {
        this.observers = this.observers.filter(function(cb) { return cb !== callback; });
    }

    notificar() {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i](this.historial);
        }
    }

    exportarHistorial() {
        return clonarObjeto(this.historial);
    }

    importarHistorial(historial) {
        this.historial = clonarObjeto(historial);
        this.notificar();
    }

    buscarPorTipo(tipo) {
        return this.historial.filter(function(a) { return a.tipo === tipo; });
    }

    buscarPorRangoFechas(inicio, fin) {
        return this.historial.filter(function(a) {
            return a.timestamp >= inicio && a.timestamp <= fin;
        });
    }
}

var deshacerManager = new DeshacerManager();

export { DeshacerManager, deshacerManager };