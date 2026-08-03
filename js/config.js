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

// Referencias a botones
let btnFiguraSimple, btnFiguraGrupal;

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
    
    // Referencias a botones
    btnFiguraSimple = document.getElementById('btnFiguraSimple');
    btnFiguraGrupal = document.getElementById('btnFiguraGrupal');
    
    configurarObservers();
    configurarEventos(opciones);
    actualizarBotonesFigura();
}

// Configurar observers
function configurarObservers() {
    console.log('configurarObservers - Registrando observers');
    
    if (juegoManager && typeof juegoManager.suscribir === 'function') {
        juegoManager.suscribir(function(estado) {
            renderizarTablero(estado);
            actualizarUI(estado);
            actualizarBotonesFigura();
            
            if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
                var jugador = leaderboardManager.obtenerJugador(config.myId);
                mqttManager.publicarEstado({
                    nombre: config.myName,
                    figura: estado.figuraActual,
                    celdas: estado.celdasColocadas,
                    estado: estado.completado ? 'completado' : 'jugando',
                    puntos: jugador ? jugador.puntos : 0,
                    figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                    modoFigura: estado.modoFigura || 'simple',
                    contribuciones: juegoManager.obtenerContribuciones()
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

// Actualizar estado de botones de figura
function actualizarBotonesFigura() {
    var estado = juegoManager.obtenerEstado();
    var figuraActiva = estado.figuraActual !== null;
    var completado = estado.completado;
    
    // Los botones se bloquean si hay una figura activa y NO está completada
    var bloqueado = figuraActiva && !completado;
    
    if (btnFiguraSimple) {
        btnFiguraSimple.disabled = bloqueado;
        btnFiguraSimple.style.opacity = bloqueado ? '0.5' : '1';
        btnFiguraSimple.style.cursor = bloqueado ? 'not-allowed' : 'pointer';
    }
    
    if (btnFiguraGrupal) {
        btnFiguraGrupal.disabled = bloqueado;
        btnFiguraGrupal.style.opacity = bloqueado ? '0.5' : '1';
        btnFiguraGrupal.style.cursor = bloqueado ? 'not-allowed' : 'pointer';
    }
}

// Configurar eventos
function configurarEventos(opciones) {
    // Limpiar campo de nombre al abrir el lobby
    document.getElementById('playerName').value = '';
    
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
        // Limpiar campo de código al abrir
        document.getElementById('roomCodeInput').value = '';
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

    // Botón Figura Simple
    document.getElementById('btnFiguraSimple').addEventListener('click', function() {
        var estado = juegoManager.obtenerEstado();
        // Si hay figura activa y no está completada, no hacer nada
        if (estado.figuraActual && !estado.completado) {
            return;
        }
        
        var figura = juegoManager.iniciarModoSimple(config.myId);
        
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            mqttManager.publicarFiguraGrupal({
                figura: figura,
                modo: 'simple',
                generadaPor: config.myId,
                nombreGenerador: config.myName
            });
        }
        
        var nuevoEstado = juegoManager.obtenerEstado();
        renderizarTablero(nuevoEstado);
        actualizarUI(nuevoEstado);
        actualizarBotonesFigura();
        
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas,
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: 'simple'
            });
        }
    });

    // Botón Figura Grupal - MODIFICADO PARA MODO GRUPAL COMPARTIDO
    document.getElementById('btnFiguraGrupal').addEventListener('click', function() {
        if (config.modoJuego !== 'multi') {
            alert('El modo grupal solo está disponible en multijugador');
            return;
        }
        
        var estado = juegoManager.obtenerEstado();
        // Si hay figura activa y no está completada, no hacer nada
        if (estado.figuraActual && !estado.completado) {
            return;
        }
        
        // Verificar si ya hay una figura grupal activa (generada por otro)
        var hayFiguraGrupal = juegoManager.figuraCompartida && 
                              juegoManager.modoFigura === 'grupal';
        
        var figura;
        if (hayFiguraGrupal) {
            // Si ya hay figura grupal, unirse a ella
            console.log('Uniéndose a figura grupal existente');
            var figuraExistente = juegoManager.figuraCompartida;
            figura = juegoManager.iniciarModoGrupal(config.myId, figuraExistente);
        } else {
            // Generar nueva figura grupal
            console.log('Generando nueva figura grupal');
            figura = juegoManager.iniciarModoGrupal(config.myId);
            
            if (mqttManager.isConnected()) {
                mqttManager.publicarFiguraGrupal({
                    figura: figura,
                    modo: 'grupal',
                    generadaPor: config.myId,
                    nombreGenerador: config.myName
                });
            }
        }
        
        var nuevoEstado = juegoManager.obtenerEstado();
        renderizarTablero(nuevoEstado);
        actualizarUI(nuevoEstado);
        actualizarBotonesFigura();
        
        if (mqttManager.isConnected()) {
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas,
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: 'grupal',
                contribuciones: juegoManager.obtenerContribuciones()
            });
        }
    });

    document.getElementById('btnReiniciar').addEventListener('click', function() {
        var estado = juegoManager.obtenerEstado();
        if (!estado.figuraActual) {
            alert('No hay figura activa para reiniciar');
            return;
        }
        if (estado.celdasColocadas.length === 0) {
            alert('No hay celdas colocadas para reiniciar');
            return;
        }
        
        var confirmModal = document.getElementById('confirmModal');
        confirmModal.style.display = 'flex';
    });

    document.getElementById('btnConfirmarReset').addEventListener('click', function() {
        juegoManager.reiniciarTablero();
        actualizarBotonesFigura();
        
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            var estado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: estado.figuraActual,
                celdas: estado.celdasColocadas,
                estado: estado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: estado.modoFigura || 'simple'
            });
        }
        var confirmModal = document.getElementById('confirmModal');
        confirmModal.style.display = 'none';
    });

    document.getElementById('btnCancelar').addEventListener('click', function() {
        var confirmModal = document.getElementById('confirmModal');
        confirmModal.style.display = 'none';
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
    
    leaderboardManager.agregarJugador(config.myId, config.myName);
    
    juegoManager.iniciarVacio(config.myId);
    juegoManager.setModo('multi', codigo);
    
    var estado = juegoManager.obtenerEstado();
    var jugador = leaderboardManager.obtenerJugador(config.myId);
    mqttManager.publicarEstado({
        nombre: config.myName,
        figura: estado.figuraActual,
        celdas: estado.celdasColocadas,
        estado: estado.completado ? 'completado' : 'jugando',
        puntos: jugador ? jugador.puntos : 0,
        figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
        modoFigura: estado.modoFigura || 'simple',
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
                figurasCompletadas: jugadorActual ? jugadorActual.figurasCompletadas : 0,
                modoFigura: estadoActual.modoFigura || 'simple',
                contribuciones: juegoManager.obtenerContribuciones()
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
    juegoManager.iniciarVacio(config.myId);
    actualizarBotonesFigura();
}

// Iniciar juego multijugador - AGREGADA ESTA FUNCIÓN
function iniciarJuegoMulti() {
    juegoManager.setModo('multi', config.salaActual);
    juegoManager.iniciarVacio(config.myId);
    actualizarBotonesFigura();
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
        case 'figura_grupal':
            manejarFiguraGrupalRemota(data);
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

// Manejar figura grupal remota
function manejarFiguraGrupalRemota(data) {
    var figura = data.figura;
    var modo = data.modo || 'simple';
    var generadaPor = data.generadaPor;
    var nombreGenerador = data.nombreGenerador || 'Jugador';
    
    console.log('Figura grupal recibida:', modo, 'generada por:', nombreGenerador);
    
    if (modo === 'grupal') {
        // IMPORTANTE: Guardar la figura compartida y usarla para TODOS
        juegoManager.figuraCompartida = figura;
        juegoManager.iniciarModoGrupal(config.myId, figura);
    } else {
        juegoManager.iniciarModoSimple(config.myId, figura);
    }
    
    var estado = juegoManager.obtenerEstado();
    renderizarTablero(estado);
    actualizarUI(estado);
    actualizarBotonesFigura();
}

function manejarEstadoCompleto(data) {
    var jugadorId = data.id;
    if (jugadorId === config.myId) return;
    
    var nombre = data.nombre || 'Jugador';
    
    var jugadorExistente = leaderboardManager.obtenerJugador(jugadorId);
    
    if (nombre === 'Jugador' && jugadorExistente && jugadorExistente.nombre !== 'Jugador') {
        nombre = jugadorExistente.nombre;
    }
    
    leaderboardManager.agregarJugador(jugadorId, nombre);
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
    if (data.estado) {
        leaderboardManager.actualizarEstado(jugadorId, data.estado);
    }
    
    // SI ES MODO GRUPAL Y VIENEN CELDAS, ACTUALIZAR
    var esModoGrupal = juegoManager.modoFigura === 'grupal';
    if (esModoGrupal && data.celdas && data.celdas.length > 0) {
        console.log('Actualizando celdas grupales desde estado remoto:', data.celdas.length);
        // Reemplazar celdas grupales con las del remoto
        juegoManager.celdasGrupales = data.celdas.slice();
        juegoManager.estado.celdasColocadas = juegoManager.celdasGrupales;
        
        // Actualizar contribuciones si vienen
        if (data.contribuciones) {
            juegoManager.contribuciones = data.contribuciones;
            // Actualizar puntuaciones de todos los jugadores
            for (var jugId in data.contribuciones) {
                var contribs = data.contribuciones[jugId] || [];
                leaderboardManager.establecerPuntuacion(jugId, contribs.length);
            }
        }
        
        // Verificar si está completado
        var totalCeldas = juegoManager.estado.figuraActual ? juegoManager.estado.figuraActual.celdas.length : 0;
        if (juegoManager.celdasGrupales.length === totalCeldas && totalCeldas > 0) {
            juegoManager.estado.completado = true;
        }
        
        // Actualizar UI
        var estadoActual = juegoManager.obtenerEstado();
        renderizarTablero(estadoActual);
        actualizarUI(estadoActual);
        actualizarBotonesFigura();
    }
    
    zoomManager.actualizarJugador(jugadorId, {
        nombre: nombre,
        figura: data.figura || null,
        celdasColocadas: data.celdas || [],
        estado: data.estado || 'jugando'
    });
    
    if (zoomManager.estaEnZoom(jugadorId)) {
        var jugadorActualizado = zoomManager.obtenerJugador(jugadorId);
        if (jugadorActualizado) {
            actualizarZoomDirecto(jugadorActualizado);
        }
    }
    
    if (data.accion === 'sync_request') {
        var estado = juegoManager.obtenerEstado();
        var jugador = leaderboardManager.obtenerJugador(config.myId);
        mqttManager.publicarEstado({
            nombre: config.myName,
            figura: estado.figuraActual,
            celdas: estado.celdasColocadas,
            estado: estado.completado ? 'completado' : 'jugando',
            puntos: jugador ? jugador.puntos : 0,
            figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
            modoFigura: estado.modoFigura || 'simple',
            contribuciones: juegoManager.obtenerContribuciones()
        });
    }
    
    actualizarBotonesFigura();
}

function manejarFiguraRemota(data) {
    if (data.id === config.myId) return;
    zoomManager.actualizarJugador(data.id, {
        figura: data.figura
    });
}

function manejarAccionRemota(data) {
    if (data.id === config.myId) return;
    
    if (data.tipo === 'colocar' && data.celda && data.jugadorId) {
        // Verificar si estamos en modo grupal
        var esModoGrupal = juegoManager.modoFigura === 'grupal';
        
        if (esModoGrupal) {
            // En modo grupal, usar el método agregarCeldaRemota
            var celda = data.celda;
            juegoManager.agregarCeldaRemota(data.jugadorId, celda);
            
            // Actualizar UI
            var estado = juegoManager.obtenerEstado();
            renderizarTablero(estado);
            actualizarUI(estado);
            actualizarBotonesFigura();
        } else {
            // Modo simple - actualizar zoom
            var jugador = zoomManager.obtenerJugador(data.jugadorId);
            if (jugador) {
                var celdas = (jugador.celdasColocadas || []).slice();
                var yaColocada = celdas.some(function(c) {
                    return c.x === data.celda.x && c.y === data.celda.y;
                });
                if (!yaColocada) {
                    celdas.push(data.celda);
                    zoomManager.actualizarJugador(data.jugadorId, {
                        celdasColocadas: celdas
                    });
                }
            }
        }
    }
    
    if (data.tipo === 'deshacer' && data.jugadorId) {
        var esModoGrupal = juegoManager.modoFigura === 'grupal';
        
        if (esModoGrupal && data.celda) {
            // En modo grupal, remover la celda
            juegoManager.removerCeldaRemota(data.jugadorId, data.celda);
            
            // Actualizar UI
            var estado = juegoManager.obtenerEstado();
            renderizarTablero(estado);
            actualizarUI(estado);
            actualizarBotonesFigura();
        } else {
            var jugador = zoomManager.obtenerJugador(data.jugadorId);
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
                zoomManager.actualizarJugador(data.jugadorId, {
                    celdasColocadas: celdas
                });
            }
        }
    }
}

/**
 * Manejar mensaje de completado remoto
 * Cuando otro jugador completa la figura, todos los demás deben marcar su figura como completada
 */
function manejarCompletarRemoto(data) {
    // Ignorar si es nuestro propio mensaje
    if (data.id === config.myId) return;
    
    var jugadorId = data.jugadorId || data.id;
    
    console.log('Completado remoto recibido de:', jugadorId);
    
    // Actualizar estado del jugador en leaderboard
    leaderboardManager.actualizarEstado(jugadorId, 'completado');
    
    // Actualizar zoom
    zoomManager.actualizarJugador(jugadorId, {
        estado: 'completado'
    });
    
    // Actualizar puntuación si viene en el mensaje
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
    
    // CRUCIAL: Marcar la figura como completada en el juego local
    // Esto permite que los botones se desbloqueen para todos los jugadores
    var estadoLocal = juegoManager.obtenerEstado();
    
    // Solo marcar como completado si hay una figura activa y no está completada localmente
    if (estadoLocal.figuraActual && !estadoLocal.completado) {
        console.log('Marcando figura como completada localmente (remota)');
        juegoManager.marcarCompletadoRemoto();
        
        // Actualizar la UI
        var nuevoEstado = juegoManager.obtenerEstado();
        renderizarTablero(nuevoEstado);
        actualizarUI(nuevoEstado);
    }
    
    // Actualizar botones (se desbloquearán porque completado es true)
    actualizarBotonesFigura();
    
    console.log('Completado remoto procesado. Botones actualizados.');
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

// Manejar click en celda - MODIFICADO PARA MODO GRUPAL
function handleCellClick(x, y, estaColocada) {
    var estado = juegoManager.obtenerEstado();
    
    if (!estado.figuraActual) {
        return;
    }
    
    if (estado.completado) {
        return;
    }
    
    // Si es modo grupal, la celda colocada se maneja de forma diferente
    var esModoGrupal = juegoManager.modoFigura === 'grupal';
    
    if (estaColocada) {
        // Solo se puede deshacer si es tuya (en modo grupal)
        if (esModoGrupal) {
            // Verificar si la celda fue colocada por este jugador
            var contribuciones = juegoManager.obtenerContribuciones();
            var misCeldas = contribuciones[config.myId] || [];
            var esMiCelda = misCeldas.some(function(c) {
                return c.x === x && c.y === y;
            });
            
            if (!esMiCelda) {
                // No es tu celda, no puedes deshacerla
                return;
            }
        }
        
        var success = juegoManager.deshacerCelda(x, y);
        if (success && config.modoJuego === 'multi') {
            mqttManager.publicarAccion('deshacer', {
                jugadorId: config.myId,
                celda: { x: x, y: y }
            });
            var nuevoEstado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas,
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: nuevoEstado.modoFigura || 'simple',
                contribuciones: juegoManager.obtenerContribuciones()
            });
        }
        actualizarBotonesFigura();
        return;
    }
    
    // Colocar el dado
    var celdaColocada = juegoManager.colocarDado(x, y);
    if (celdaColocada && config.modoJuego === 'multi') {
        // Publicar la acción de colocar
        mqttManager.publicarAccion('colocar', {
            jugadorId: config.myId,
            celda: { x: x, y: y, valor: celdaColocada.valor }
        });
        
        // SI ES MODO GRUPAL, PUBLICAR EL ESTADO COMPLETO DE LA FIGURA
        if (esModoGrupal) {
            var nuevoEstado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas, // TODAS las celdas grupales
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: 'grupal',
                contribuciones: juegoManager.obtenerContribuciones()
            });
        } else {
            var nuevoEstado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarEstado({
                nombre: config.myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas,
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: nuevoEstado.modoFigura || 'simple'
            });
        }
        
        // Si se completó, publicar completado
        if (nuevoEstado.completado) {
            mqttManager.publicarCompletar(config.myId);
            var jugador = leaderboardManager.obtenerJugador(config.myId);
            mqttManager.publicarPuntuacion(config.myId, jugador ? jugador.puntos : 0);
        }
    }
    actualizarBotonesFigura();
}

// Exportar
export {
    configurarJuego,
    handleCellClick,
    conectarSala,
    unirseSala,
    iniciarJuegoSolo,
    iniciarJuegoMulti,  // AHORA SÍ ESTÁ DEFINIDA
    manejarMensajeMQTT,
    actualizarBotonesFigura
};