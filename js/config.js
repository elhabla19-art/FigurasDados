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
import { generarIdCorto, clonarObjeto } from './utils.js';

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
    
    window.__mqttManager = mqttManager;
    window.__myId = config.myId;
    window.__myName = config.myName;
    
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
                var payload = {
                    nombre: config.myName,
                    figura: estado.figuraActual,
                    celdas: estado.celdasColocadas,
                    estado: estado.completado ? 'completado' : 'jugando',
                    puntos: jugador ? jugador.puntos : 0,
                    figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                    modoFigura: estado.modoFigura || 'simple'
                };
                
                if (estado.modoFigura === 'grupal') {
                    payload.celdasGrupales = juegoManager.obtenerCeldasGrupales();
                    payload.contribuciones = juegoManager.obtenerContribuciones();
                    payload.puntosPorCelda = juegoManager.obtenerPuntosPorCelda();
                }
                
                mqttManager.publicarEstado(payload);
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

    // Botón Figura Grupal
    document.getElementById('btnFiguraGrupal').addEventListener('click', function() {
        if (config.modoJuego !== 'multi') {
            alert('El modo grupal solo está disponible en multijugador');
            return;
        }
        
        var estado = juegoManager.obtenerEstado();
        if (estado.figuraActual && !estado.completado) {
            return;
        }
        
        var figura = juegoManager.iniciarModoGrupal(config.myId);
        
        if (mqttManager.isConnected()) {
            mqttManager.publicarFiguraGrupal({
                figura: figura,
                modo: 'grupal',
                generadaPor: config.myId,
                nombreGenerador: config.myName
            });
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
                contribuciones: juegoManager.obtenerContribuciones(),
                celdasGrupales: juegoManager.obtenerCeldasGrupales(),
                puntosPorCelda: juegoManager.obtenerPuntosPorCelda()
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
            var payload = {
                nombre: config.myName,
                figura: estado.figuraActual,
                celdas: estado.celdasColocadas,
                estado: estado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
                modoFigura: estado.modoFigura || 'simple'
            };
            
            if (estado.modoFigura === 'grupal') {
                payload.celdasGrupales = juegoManager.obtenerCeldasGrupales();
                payload.contribuciones = juegoManager.obtenerContribuciones();
                payload.puntosPorCelda = juegoManager.obtenerPuntosPorCelda();
            }
            
            mqttManager.publicarEstado(payload);
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
            var payload = {
                nombre: config.myName,
                figura: estadoActual.figuraActual,
                celdas: estadoActual.celdasColocadas,
                estado: estadoActual.completado ? 'completado' : 'jugando',
                puntos: jugadorActual ? jugadorActual.puntos : 0,
                figurasCompletadas: jugadorActual ? jugadorActual.figurasCompletadas : 0,
                modoFigura: estadoActual.modoFigura || 'simple'
            };
            
            if (estadoActual.modoFigura === 'grupal') {
                payload.celdasGrupales = juegoManager.obtenerCeldasGrupales();
                payload.contribuciones = juegoManager.obtenerContribuciones();
                payload.puntosPorCelda = juegoManager.obtenerPuntosPorCelda();
            }
            
            mqttManager.publicarEstado(payload);
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

// Iniciar juego multijugador
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
    console.log('Figura:', figura);
    
    if (modo === 'grupal') {
        juegoManager.iniciarModoGrupal(config.myId, figura);
    } else {
        juegoManager.iniciarModoSimple(config.myId, figura);
    }
    
    var estado = juegoManager.obtenerEstado();
    renderizarTablero(estado);
    actualizarUI(estado);
    actualizarBotonesFigura();
}

// Manejar estado completo - CORREGIDO
function manejarEstadoCompleto(data) {
    var jugadorId = data.id;
    if (jugadorId === config.myId) return;
    
    console.log('manejarEstadoCompleto recibido de:', jugadorId, 'modo:', data.modoFigura);
    console.log('celdasGrupales recibidas:', data.celdasGrupales ? data.celdasGrupales.length : 'ninguna');
    
    var nombre = data.nombre || 'Jugador';
    
    // Actualizar leaderboard
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
    
    var modoFigura = data.modoFigura || 'simple';
    var estadoLocal = juegoManager.obtenerEstado();
    
    // ===== MODO GRUPAL: Sincronizar el tablero compartido =====
    if (modoFigura === 'grupal' && data.celdasGrupales) {
        console.log('Sincronizando celdas grupales desde', jugadorId, data.celdasGrupales.length, 'celdas');
        
        // Verificar si el estado local está en modo grupal
        if (estadoLocal.modoFigura !== 'grupal') {
            console.log('El estado local no está en modo grupal, ignorando sincronización');
            return;
        }
        
        // Verificar que la figura coincida
        var figuraLocal = estadoLocal.figuraActual;
        if (data.figura && figuraLocal && data.figura.id !== figuraLocal.id) {
            console.log('Figura diferente, actualizando figura local');
            juegoManager.estado.figuraActual = clonarObjeto(data.figura);
            juegoManager.figuraCompartida = clonarObjeto(data.figura);
        }
        
        // ACTUALIZAR celdas grupales - SIN perderse las propias
        var celdasRecibidas = clonarObjeto(data.celdasGrupales);
        var celdasLocales = juegoManager.celdasGrupales || [];
        
        // Combinar: las celdas recibidas son la fuente de verdad (el tablero compartido)
        // Pero asegurarse de que las contribuciones locales no se pierdan
        juegoManager.celdasGrupales = celdasRecibidas;
        juegoManager.estado.celdasColocadas = juegoManager.celdasGrupales;
        
        // Actualizar contribuciones si vienen
        if (data.contribuciones) {
            juegoManager.contribuciones = clonarObjeto(data.contribuciones);
        }
        
        // Actualizar puntos por celda de otros jugadores
        if (data.puntosPorCelda) {
            for (var id in data.puntosPorCelda) {
                if (id !== config.myId) {
                    leaderboardManager.establecerPuntuacion(id, data.puntosPorCelda[id]);
                }
            }
        }
        
        // Verificar si está completada
        var totalCeldas = juegoManager.estado.figuraActual ? juegoManager.estado.figuraActual.celdas.length : 0;
        if (juegoManager.celdasGrupales.length === totalCeldas && totalCeldas > 0) {
            if (!juegoManager.estado.completado) {
                console.log('Figura completada por sincronización remota');
                juegoManager.estado.completado = true;
            }
        }
        
        // Renderizar el tablero actualizado
        var nuevoEstado = juegoManager.obtenerEstado();
        renderizarTablero(nuevoEstado);
        actualizarUI(nuevoEstado);
        actualizarBotonesFigura();
    }
    
    // Actualizar zoom
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
    
    // Responder a solicitudes de sincronización
    if (data.accion === 'sync_request') {
        console.log('Recibida solicitud de sincronización, respondiendo...');
        publicarEstadoCompleto();
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
            zoomManager.actualizarJugador(data.jugadorId, {
                celdasColocadas: celdas
            });
        }
    }
}

// Manejar completado remoto
function manejarCompletarRemoto(data) {
    if (data.id === config.myId) return;
    
    var jugadorId = data.jugadorId || data.id;
    
    console.log('Completado remoto recibido de:', jugadorId);
    
    leaderboardManager.actualizarEstado(jugadorId, 'completado');
    
    zoomManager.actualizarJugador(jugadorId, {
        estado: 'completado'
    });
    
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
    
    var estadoLocal = juegoManager.obtenerEstado();
    
    if (estadoLocal.figuraActual && !estadoLocal.completado) {
        console.log('Marcando figura como completada localmente (remota)');
        juegoManager.marcarCompletadoRemoto();
        
        var nuevoEstado = juegoManager.obtenerEstado();
        renderizarTablero(nuevoEstado);
        actualizarUI(nuevoEstado);
    }
    
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

// Función auxiliar para publicar estado completo
function publicarEstadoCompleto() {
    var nuevoEstado = juegoManager.obtenerEstado();
    var jugador = leaderboardManager.obtenerJugador(config.myId);
    var payload = {
        nombre: config.myName,
        figura: nuevoEstado.figuraActual,
        celdas: nuevoEstado.celdasColocadas,
        estado: nuevoEstado.completado ? 'completado' : 'jugando',
        puntos: jugador ? jugador.puntos : 0,
        figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
        modoFigura: nuevoEstado.modoFigura || 'simple'
    };
    
    if (nuevoEstado.modoFigura === 'grupal') {
        payload.celdasGrupales = juegoManager.obtenerCeldasGrupales();
        payload.contribuciones = juegoManager.obtenerContribuciones();
        payload.puntosPorCelda = juegoManager.obtenerPuntosPorCelda();
    }
    
    console.log('Publicando estado completo:', payload);
    mqttManager.publicarEstado(payload);
}

// Manejar click en celda
function handleCellClick(x, y, estaColocada) {
    console.log('handleCellClick:', x, y, 'estaColocada:', estaColocada);
    
    var estado = juegoManager.obtenerEstado();
    
    if (!estado.figuraActual) {
        console.log('No hay figura actual');
        return;
    }
    if (estado.completado) {
        console.log('Figura ya completada');
        return;
    }
    
    // Si ya está colocada, permitir deshacer (solo la última)
    if (estaColocada) {
        console.log('Intentando deshacer celda:', x, y);
        var success = juegoManager.deshacerCelda(x, y);
        if (success) {
            console.log('Deshacer exitoso');
            if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
                mqttManager.publicarAccion('deshacer', {
                    jugadorId: config.myId,
                    celda: { x: x, y: y }
                });
                publicarEstadoCompleto();
            }
        } else {
            console.log('Deshacer falló');
        }
        actualizarBotonesFigura();
        return;
    }
    
    // Verificar si la celda está disponible
    if (!juegoManager.esCeldaDisponible(x, y)) {
        console.log('Celda no disponible:', x, y);
        return;
    }
    
    console.log('Colocando dado en:', x, y);
    var success = juegoManager.colocarDado(x, y);
    console.log('Resultado colocarDado:', success);
    
    if (success) {
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            publicarEstadoCompleto();
            
            var nuevoEstado = juegoManager.obtenerEstado();
            if (nuevoEstado.completado) {
                console.log('Figura completada!');
                mqttManager.publicarCompletar(config.myId);
                var jugador = leaderboardManager.obtenerJugador(config.myId);
                mqttManager.publicarPuntuacion(config.myId, jugador ? jugador.puntos : 0);
            }
        }
    } else {
        console.log('colocarDado falló');
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
    iniciarJuegoMulti,
    manejarMensajeMQTT,
    actualizarBotonesFigura,
    publicarEstadoCompleto
};