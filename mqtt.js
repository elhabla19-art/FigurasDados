class MQTTManager {
    constructor() {
        this.client = null;
        this.connected = false;
        this.room = null;
        this.myId = null;
        this.observers = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect(room, playerId) {
        this.room = room;
        this.myId = playerId;
        
        return new Promise((resolve, reject) => {
            try {
                this.client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
                
                this.client.on('connect', () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.suscribirSala();
                    resolve();
                });
                
                this.client.on('error', reject);
                
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

    suscribirSala() {
        if (!this.client || !this.connected || !this.room) return;
        
        const base = `figurasdados/sala/${this.room}`;
        const topics = ['/jugadores', '/figura_grupal', '/estado', '/completar', '/puntuacion'];
        topics.forEach(t => {
            this.client.subscribe(base + t, err => {
                if (err) console.error('Error suscribiendo a', t, err);
            });
        });
    }

    manejarMensaje(topic, message) {
        try {
            const data = JSON.parse(message.toString());
            if (data.id === this.myId) return;
            
            const tipo = topic.split('/').pop();
            this.notificar({ tipo, data });
        } catch (err) {
            console.error('Error procesando mensaje:', err);
        }
    }

    publicar(tipo, data) {
        if (!this.client || !this.connected || !this.room) return false;
        
        const topic = `figurasdados/sala/${this.room}/${tipo}`;
        const payload = JSON.stringify({ ...data, id: this.myId, timestamp: Date.now() });
        this.client.publish(topic, payload, { qos: 1 });
        return true;
    }

    publicarEstado(datos) {
        return this.publicar('estado', datos);
    }

    publicarFiguraGrupal(datos) {
        return this.publicar('figura_grupal', datos);
    }

    publicarCompletar(jugadorId, modoFigura) {
        return this.publicar('completar', { jugadorId, modoFigura });
    }

    publicarPuntuacion(jugadorId, puntos) {
        return this.publicar('puntuacion', { jugadorId, puntos });
    }

    reconectar() {
        if (this.reconnectAttempts >= 5) return;
        
        this.reconnectAttempts++;
        setTimeout(() => {
            if (!this.connected && this.room) {
                this.connect(this.room, this.myId).catch(() => this.reconectar());
            }
        }, 2000 * this.reconnectAttempts);
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
        this.connected = false;
        this.room = null;
    }

    isConnected() {
        return this.connected;
    }

    suscribir(callback) {
        this.observers.push(callback);
    }

    notificar(data) {
        this.observers.forEach(cb => {
            try { cb(data); } catch (e) { console.error('Error en observer:', e); }
        });
    }
}

export const mqttManager = new MQTTManager();