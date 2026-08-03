// Gestor de conexion MQTT
class MQTTManager {
    constructor() {
        this.client = null;
        this.connected = false;
        this.room = null;
        this.myId = null;
        this.observers = [];
        this.topics = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }

    // Conectar al broker MQTT
    connect(room, playerId) {
        this.room = room;
        this.myId = playerId;
        
        return new Promise((resolve, reject) => {
            try {
                const brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
                this.client = mqtt.connect(brokerUrl);
                
                this.client.on('connect', () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.suscribirSala();
                    resolve();
                });
                
                this.client.on('error', (err) => {
                    this.connected = false;
                    reject(err);
                });
                
                this.client.on('close', () => {
                    this.connected = false;
                    this.reconectar();
                });
                
                this.client.on('message', (topic, message) => {
                    this.manejarMensaje(topic, message);
                });
                
            } catch (err) {
                reject(err);
            }
        });
    }

    // Suscribirse a los topics de la sala
    suscribirSala() {
        if (!this.client || !this.connected || !this.room) return;
        
        const topicBase = 'figurasdados/sala/' + this.room;
        const topics = [
            topicBase + '/jugadores',
            topicBase + '/figura',
            topicBase + '/figura_grupal',
            topicBase + '/accion',
            topicBase + '/completar',
            topicBase + '/deshacer',
            topicBase + '/puntuacion',
            topicBase + '/estado'
        ];
        
        for (const topic of topics) {
            this.client.subscribe(topic, (err) => {
                if (err) console.error('Error suscribiendo a', topic, err);
            });
        }
        
        this.topics = topics;
    }

    // Manejar mensajes entrantes
    manejarMensaje(topic, message) {
        try {
            const data = JSON.parse(message.toString());
            const tipo = this.obtenerTipoMensaje(topic);
            
            if (data.id === this.myId) return;
            
            this.notificar({
                tipo: tipo,
                data: data,
                topic: topic
            });
            
        } catch (err) {
            console.error('Error procesando mensaje MQTT', err);
        }
    }

    // Obtener tipo de mensaje segun el topic
    obtenerTipoMensaje(topic) {
        if (topic.includes('/jugadores')) return 'jugadores';
        if (topic.includes('/figura_grupal')) return 'figura_grupal';
        if (topic.includes('/figura')) return 'figura';
        if (topic.includes('/accion')) return 'accion';
        if (topic.includes('/completar')) return 'completar';
        if (topic.includes('/deshacer')) return 'deshacer';
        if (topic.includes('/puntuacion')) return 'puntuacion';
        if (topic.includes('/estado')) return 'estado';
        return 'desconocido';
    }

    // Publicar mensaje
    publicar(tipo, data) {
        if (!this.client || !this.connected || !this.room) return false;
        
        const topicBase = 'figurasdados/sala/' + this.room;
        const topics = {
            'jugadores': topicBase + '/jugadores',
            'figura': topicBase + '/figura',
            'figura_grupal': topicBase + '/figura_grupal',
            'accion': topicBase + '/accion',
            'completar': topicBase + '/completar',
            'deshacer': topicBase + '/deshacer',
            'puntuacion': topicBase + '/puntuacion',
            'estado': topicBase + '/estado'
        };
        
        const topic = topics[tipo];
        if (!topic) return false;
        
        const payload = JSON.stringify({
            ...data,
            id: this.myId,
            timestamp: Date.now()
        });
        
        this.client.publish(topic, payload, { qos: 1 });
        return true;
    }

    // Publicar estado del jugador
    publicarEstado(datos) {
        var payload = {
            ...datos,
            id: this.myId,
            timestamp: Date.now()
        };
        return this.publicar('estado', payload);
    }
    
    // Publicar figura actual
    publicarFigura(figura) {
        return this.publicar('figura', { figura });
    }

    // Publicar figura grupal (simple o grupal)
    publicarFiguraGrupal(datos) {
        var payload = {
            figura: datos.figura,
            modo: datos.modo || 'simple',
            generadaPor: datos.generadaPor || this.myId,
            nombreGenerador: datos.nombreGenerador || 'Jugador',
            timestamp: Date.now()
        };
        return this.publicar('figura_grupal', payload);
    }

    // Publicar accion (colocar, deshacer, etc)
    publicarAccion(tipoAccion, datos) {
        return this.publicar('accion', { tipo: tipoAccion, ...datos });
    }

    // Publicar completado de figura
    publicarCompletar(jugadorId) {
        return this.publicar('completar', { jugadorId });
    }

    // Publicar deshacer
    publicarDeshacer(jugadorId) {
        return this.publicar('deshacer', { jugadorId });
    }

    // Publicar puntuacion actualizada
    publicarPuntuacion(jugadorId, puntos) {
        return this.publicar('puntuacion', { jugadorId, puntos });
    }

    // Reconectar
    reconectar() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.notificar({
                tipo: 'error',
                data: { mensaje: 'Maximo de intentos de reconexion alcanzado' }
            });
            return;
        }
        
        this.reconnectAttempts++;
        setTimeout(() => {
            if (!this.connected && this.room) {
                this.connect(this.room, this.myId).catch(() => {
                    this.reconectar();
                });
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    // Desconectar
    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
        this.connected = false;
        this.room = null;
    }

    // Verificar si esta conectado
    isConnected() {
        return this.connected;
    }

    // Obtener sala actual
    getRoom() {
        return this.room;
    }

    // Obtener ID del jugador
    getMyId() {
        return this.myId;
    }

    // Suscribir observer
    suscribir(callback) {
        this.observers.push(callback);
    }

    // Desuscribir observer
    desuscribir(callback) {
        this.observers = this.observers.filter(cb => cb !== callback);
    }

    // Notificar observers
    notificar(data) {
        for (const callback of this.observers) {
            try {
                callback(data);
            } catch (e) {
                console.error('Error en observer de MQTT:', e);
            }
        }
    }
}

// Crear instancia singleton
const mqttManager = new MQTTManager();

// Exportar para usar en main.js
export { mqttManager };