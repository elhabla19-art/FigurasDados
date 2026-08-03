import { juegoManager } from './juego.js';
import { leaderboardManager } from './leaderboard.js';
import { zoomManager, mostrarZoom, actualizarZoomDirecto } from './zoom.js';
import { 
    renderizarTablero, 
    renderizarLeaderboard, 
    actualizarUI,
    mostrarModalLobby,
    mostrarLoading,
    ocultarLoading
} from './ui.js';
import { mqttManager } from '../mqtt.js';
import { generarIdCorto } from './utils.js';

// Variables de configuración
let config = {
    myId: null,
    myName: 'Jugador',
    modoJuego: 'solo',
    salaActual: null,
    intervaloPublicacion: null
};

// Configurar juego
function configurarJuego(opciones) {
    config.myId = opciones.getMyId();
    config.myName = opciones.getMyName();
    config.modoJuego = opciones.getModoJuego();
    config.salaActual = opciones.getSalaActual();
    
    // Exponer mqttManager globalmente para zoom
    window.__mqttManager = mqttManager;
    
    // Exponer variables globales para UI
    window.__myId = config.myId;
    window.__myName = config.myName;
    
    configurarObservers();
    configurarEventos(opciones);
}


// Configurar observers
function configurarObservers() {
    console.log('configurarObservers - Registrando observers');
    
    if (juegoManager && typeof juegoManager.suscribir === 'function') {
        juegoManager.suscribir(function(estado) {
            renderizarTablero(estado);
            actualizarUI(estado);
            if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
                var jugador = leaderboardManager.obtenerJugador(config.myId);
                mqttManager.publicarEstado({
                    nombre: config.myName,
                    figura: estado.figuraActual,
                    celdas: estado.celdasColocadas,
                    estado: estado.completado ? 'completado' : 'jugando',
                    puntos: jugador ? jugador.puntos : 0,
                    figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
                });
            }
        });
    }
    
    if (leaderboardManager && typeof leaderboardManager.suscribir === 'function') {
        leaderboardManager.suscribir(function() {
            renderizarLeaderboard();
        });
    }
    
    if (mqttManager && typeof mqttManager.suscribir === 'function') {
        mqttManager.suscribir(function(mensaje) {
            manejarMensajeMQTT(mensaje);
        });
    }
    
    // Registrar callback para zoom - asegurar que está registrado
    if (zoomManager && typeof zoomManager.registrarZoomCallback === 'function') {
        console.log('Registrando callback de zoom...');
        zoomManager.registrarZoomCallback(function(jugador) {
            console.log('Callback de zoom ejecutado para:', jugador.nombre);
            actualizarZoomDirecto(jugador);
        });
    } else {
        console.error('zoomManager no disponible o no tiene registrarZoomCallback');
    }
}

// Configurar eventos
function configurarEventos(opciones) {
    document.getElementById('btnCrearSala').addEventListener('click', function() {
        config.myName = document.getElementById('playerName').value.trim() || 'Jugador';
        var codigo = generarIdCorto();
        config.salaActual = codigo;
        config.modoJuego = 'multi';
        config.myId = 'player_' + Math.random().toString(36).substring(2, 10);
        window.__myId = config.myId;
        window.__myName = config.myName;
        opciones.setMyId(config.myId);
        opciones.setMyName(config.myName);
        opciones.setModoJuego(config.modoJuego);
        opciones.setSalaActual(config.salaActual);
        conectarSala(codigo);
    });

    document.getElementById('btnUnirse').addEventListener('click', function() {
        var joinModal = document.getElementById('joinModal');
        var lobbyModal = document.getElementById('lobbyModal');
        lobbyModal.style.display = 'none';
        joinModal.style.display = 'flex';
    });

    document.getElementById('btnEntrar').addEventListener('click', function() {
        config.myName = document.getElementById('playerName').value.trim() || 'Jugador';
        var codigo = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        
        if (codigo.length !== 4) {
            alert('El codigo debe tener 4 caracteres');
            return;
        }
        
        config.salaActual = codigo;
        config.modoJuego = 'multi';
        config.myId = 'player_' + Math.random().toString(36).substring(2, 10);
        window.__myId = config.myId;
        window.__myName = config.myName;
        opciones.setMyId(config.myId);
        opciones.setMyName(config.myName);
        opciones.setModoJuego(config.modoJuego);
        opciones.setSalaActual(config.salaActual);
        conectarSala(codigo);
    });

    document.getElementById('btnVolver').addEventListener('click', function() {
        mostrarModalLobby();
    });

    document.getElementById('btnJugarSolo').addEventListener('click', function() {
        config.myName = document.getElementById('playerName').value.trim() || 'Jugador';
        config.modoJuego = 'solo';
        config.myId = 'solo_' + Math.random().toString(36).substring(2, 10);
        config.salaActual = null;
        window.__myId = config.myId;
        window.__myName = config.myName;
        opciones.setMyId(config.myId);
        opciones.setMyName(config.myName);
        opciones.setModoJuego(config.modoJuego);
        opciones.setSalaActual(config.salaActual);
        iniciarJuegoSolo();
    });

    document.getElementById('btnCancelar').addEventListener('click', function() {
        var confirmModal = document.getElementById('confirmModal');
        confirmModal.style.display = 'none';
    });

    document.getElementById('btnConfirmarReset').addEventListener('click', function() {
        juegoManager.reiniciarTablero();
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            var estado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: estado.figuraActual,
                celdas: estado.celdasColocadas,
                estado: estado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
            });
        }
        var confirmModal = document.getElementById('confirmModal');
        confirmModal.style.display = 'none';
    });

    document.getElementById('btnReiniciar').addEventListener('click', function() {
        var confirmModal = document.getElementById('confirmModal');
        confirmModal.style.display = 'flex';
    });

    document.getElementById('btnCerrarZoom').addEventListener('click', function() {
        var zoomModal = document.getElementById('zoomModal');
        zoomModal.style.display = 'none';
    });

    var zoomModal = document.getElementById('zoomModal');
    zoomModal.addEventListener('click', function(e) {
        if (e.target === zoomModal) {
            zoomModal.style.display = 'none';
        }
    });
}

// Conectar a sala MQTT
function conectarSala(codigo) {
    mostrarLoading('Conectando a la sala...');
    
    mqttManager.connect(codigo, config.myId)
        .then(function() {
            ocultarLoading();
            unirseSala(codigo);
        })
        .catch(function(err) {
            ocultarLoading();
            alert('Error al conectar: ' + err.message);
            mostrarModalLobby();
        });
}

// Unirse a sala
function unirseSala(codigo) {
    var lobbyModal = document.getElementById('lobbyModal');
    var joinModal = document.getElementById('joinModal');
    var loadingModal = document.getElementById('loadingModal');
    var roomInfoDisplay = document.getElementById('roomInfoDisplay');
    var leaderboardPanel = document.getElementById('leaderboardPanel');
    
    lobbyModal.style.display = 'none';
    joinModal.style.display = 'none';
    loadingModal.style.display = 'none';
    
    roomInfoDisplay.style.display = 'inline-block';
    roomInfoDisplay.textContent = 'SALA: ' + codigo;
    
    leaderboardPanel.style.display = 'flex';
    
    // Asegurar que el nombre del jugador se guarda correctamente
    leaderboardManager.agregarJugador(config.myId, config.myName);
    iniciarJuegoMulti();
    
    var estado = juegoManager.obtenerEstado();
    var jugador = leaderboardManager.obtenerJugador(config.myId);
    mqttManager.publicarEstado({
        nombre: config.myName,  // Usar el nombre guardado
        figura: estado.figuraActual,
        celdas: estado.celdasColocadas,
        estado: estado.completado ? 'completado' : 'jugando',
        puntos: jugador ? jugador.puntos : 0,
        figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
        accion: 'join'
    });
    
    setTimeout(function() {
        mqttManager.publicar('estado', { 
            accion: 'sync_request' 
        });
    }, 500);
    
    if (config.intervaloPublicacion) {
        clearInterval(config.intervaloPublicacion);
        config.intervaloPublicacion = null;
    }
    
    config.intervaloPublicacion = setInterval(function() {
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            var estadoActual = juegoManager.obtenerEstado();
            var jugadorActual = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: estadoActual.figuraActual,
                celdas: estadoActual.celdasColocadas,
                estado: estadoActual.completado ? 'completado' : 'jugando',
                puntos: jugadorActual ? jugadorActual.puntos : 0,
                figurasCompletadas: jugadorActual ? jugadorActual.figurasCompletadas : 0
            });
        }
    }, 3000);
}

// Iniciar juego solo
function iniciarJuegoSolo() {
    var lobbyModal = document.getElementById('lobbyModal');
    var roomInfoDisplay = document.getElementById('roomInfoDisplay');
    var leaderboardPanel = document.getElementById('leaderboardPanel');
    
    lobbyModal.style.display = 'none';
    roomInfoDisplay.style.display = 'none';
    leaderboardPanel.style.display = 'flex';
    
    leaderboardManager.agregarJugador(config.myId, config.myName);
    juegoManager.setModo('solo');
    juegoManager.iniciarRonda(config.myId);
}

// Iniciar juego multijugador
function iniciarJuegoMulti() {
    juegoManager.setModo('multi', config.salaActual);
    juegoManager.iniciarRonda(config.myId);
}

// Manejar mensajes MQTT
function manejarMensajeMQTT(mensaje) {
    var tipo = mensaje.tipo;
    var data = mensaje.data;
    
    if (data.id === config.myId) return;
    
    switch(tipo) {
        case 'estado':
            manejarEstadoCompleto(data);
            break;
        case 'figura':
            manejarFiguraRemota(data);
            break;
        case 'accion':
            manejarAccionRemota(data);
            break;
        case 'completar':
            manejarCompletarRemoto(data);
            break;
        case 'deshacer':
            manejarDeshacerRemoto(data);
            break;
        case 'puntuacion':
            manejarPuntuacionRemota(data);
            break;
        case 'jugadores':
            manejarListaJugadores(data);
            break;
    }
}

function manejarEstadoCompleto(data) {
    var jugadorId = data.id;
    if (jugadorId === config.myId) return;
    
    // USAR EL NOMBRE DEL DATA, PERO SI VIENE VACIO O ES "Jugador", NO SOBREESCRIBIR
    var nombre = data.nombre || 'Jugador';
    
    console.log('manejarEstadoCompleto recibido:', data);
    console.log('Figura recibida:', data.figura);
    console.log('Celdas recibidas:', data.celdas);
    
    // Obtener jugador existente para preservar su nombre si es necesario
    var jugadorExistente = leaderboardManager.obtenerJugador(jugadorId);
    
    // Si el nombre es "Jugador" y el jugador ya existe con otro nombre, mantener su nombre
    if (nombre === 'Jugador' && jugadorExistente && jugadorExistente.nombre !== 'Jugador') {
        nombre = jugadorExistente.nombre;
    }
    
    // Actualizar leaderboard con el nombre correcto
    leaderboardManager.agregarJugador(jugadorId, nombre);
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
    if (data.estado) {
        leaderboardManager.actualizarEstado(jugadorId, data.estado);
    }
    
    // Actualizar zoom con TODOS los datos
    zoomManager.actualizarJugador(jugadorId, {
        nombre: nombre,  // Usar el nombre corregido
        figura: data.figura || null,
        celdasColocadas: data.celdas || [],
        estado: data.estado || 'jugando'
    });
    
    // Si el zoom está abierto para este jugador, actualizar directamente
    if (zoomManager.estaEnZoom(jugadorId)) {
        var jugadorActualizado = zoomManager.obtenerJugador(jugadorId);
        if (jugadorActualizado) {
            console.log('Actualizando zoom directo desde estado completo');
            actualizarZoomDirecto(jugadorActualizado);
        }
    }
    
    if (data.accion === 'sync_request') {
        var estado = juegoManager.obtenerEstado();
        var jugador = leaderboardManager.obtenerJugador(config.myId);
        mqttManager.publicarEstado({
            nombre: config.myName,  // Asegurar que se envía el nombre correcto
            figura: estado.figuraActual,
            celdas: estado.celdasColocadas,
            estado: estado.completado ? 'completado' : 'jugando',
            puntos: jugador ? jugador.puntos : 0,
            figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
        });
    }
}

function manejarFiguraRemota(data) {
    if (data.id === config.myId) return;
    zoomManager.actualizarJugador(data.id, {
        figura: data.figura
    });
}

function manejarAccionRemota(data) {
    if (data.id === config.myId) return;
    
    console.log('manejarAccionRemota:', data);
    
    if (data.tipo === 'colocar' && data.celda && data.jugadorId) {
        var jugador = zoomManager.obtenerJugador(data.jugadorId);
        if (jugador) {
            var celdas = (jugador.celdasColocadas || []).slice();
            var yaColocada = celdas.some(function(c) {
                return c.x === data.celda.x && c.y === data.celda.y;
            });
            if (!yaColocada) {
                celdas.push(data.celda);
                console.log('Actualizando celdas de zoom para:', data.jugadorId, celdas.length);
                zoomManager.actualizarJugador(data.jugadorId, {
                    celdasColocadas: celdas
                });
            }
        }
    }
    if (data.tipo === 'deshacer' && data.jugadorId) {
        var jugador = zoomManager.obtenerJugador(data.jugadorId);
        if (jugador && jugador.celdasColocadas.length > 0) {
            var celdas = jugador.celdasColocadas.slice();
            for (var i = celdas.length - 1; i >= 0; i--) {
                if (celdas[i].x === data.celda.x && celdas[i].y === data.celda.y) {
                    celdas.splice(i, 1);
                    break;
                }
            }
            console.log('Actualizando celdas de zoom (deshacer) para:', data.jugadorId, celdas.length);
            zoomManager.actualizarJugador(data.jugadorId, {
                celdasColocadas: celdas
            });
        }
    }
}

function manejarCompletarRemoto(data) {
    if (data.id === config.myId) return;
    var jugadorId = data.jugadorId || data.id;
    
    leaderboardManager.actualizarEstado(jugadorId, 'completado');
    zoomManager.actualizarJugador(jugadorId, {
        estado: 'completado'
    });
    
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
}

function manejarDeshacerRemoto(data) {
    if (data.id === config.myId) return;
    var jugadorId = data.jugadorId || data.id;
    var jugador = zoomManager.obtenerJugador(jugadorId);
    if (jugador && jugador.celdasColocadas.length > 0) {
        var celdas = jugador.celdasColocadas.slice();
        if (data.celda) {
            for (var i = celdas.length - 1; i >= 0; i--) {
                if (celdas[i].x === data.celda.x && celdas[i].y === data.celda.y) {
                    celdas.splice(i, 1);
                    break;
                }
            }
        } else {
            celdas.pop();
        }
        zoomManager.actualizarJugador(jugadorId, {
            celdasColocadas: celdas
        });
    }
}

function manejarPuntuacionRemota(data) {
    if (data.id === config.myId) return;
    var jugadorId = data.jugadorId || data.id;
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
}

function manejarListaJugadores(data) {
    if (data.jugadores) {
        for (var i = 0; i < data.jugadores.length; i++) {
            var jugador = data.jugadores[i];
            if (jugador.id !== config.myId) {
                leaderboardManager.agregarJugador(jugador.id, jugador.nombre || 'Jugador');
            }
        }
    }
}

// Manejar click en celda - EXPORTADA
function handleCellClick(x, y, estaColocada) {
    console.log('handleCellClick llamado:', x, y, estaColocada);
    var estado = juegoManager.obtenerEstado();
    if (estado.completado) {
        console.log('Figura completada, no se puede modificar');
        return;
    }
    
    if (estaColocada) {
        console.log('Deshaciendo celda:', x, y);
        var success = juegoManager.deshacerCelda(x, y);
        if (success && config.modoJuego === 'multi') {
            mqttManager.publicarAccion('deshacer', {
                jugadorId: config.myId,
                celda: { x: x, y: y }
            });
            var nuevoEstado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            // Enviar estado completo con figura y celdas
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas,
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
            });
        }
        return;
    }
    
    console.log('Colocando celda:', x, y);
    var success = juegoManager.colocarDado(x, y);
    if (success && config.modoJuego === 'multi') {
        mqttManager.publicarAccion('colocar', {
            jugadorId: config.myId,
            celda: { x: x, y: y }
        });
        var nuevoEstado = juegoManager.obtenerEstado();
        var jugador = leaderboardManager.obtenerJugador(config.myId);
        // Enviar estado completo con figura y celdas
        mqttManager.publicarEstado({
            nombre: config.myName,
            figura: nuevoEstado.figuraActual,
            celdas: nuevoEstado.celdasColocadas,
            estado: nuevoEstado.completado ? 'completado' : 'jugando',
            puntos: jugador ? jugador.puntos : 0,
            figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
        });
        
        if (nuevoEstado.completado) {
            mqttManager.publicarCompletar(config.myId);
            mqttManager.publicarPuntuacion(config.myId, jugador ? jugador.puntos : 0);
        }
    }
}

// Exportar
export {
    configurarJuego,
    handleCellClick,
    conectarSala,
    unirseSala,
    iniciarJuegoSolo,
    iniciarJuegoMulti,
    manejarMensajeMQTT
};