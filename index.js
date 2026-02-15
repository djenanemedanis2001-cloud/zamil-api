const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;

async function startZamilSystem() {
    // Deep Clean session files for a fresh start
    if (fs.existsSync('zamil_session')) {
        fs.rmSync('zamil_session', { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('zamil_session');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // 🚀 L'HACK: Persona Android Official bach ma y'fiqsh l'système
        browser: ["Android", "Chrome", "20.0.04"],
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 30000
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log("⏳ Stabilisation du tunnel (40s)...");
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(NUMERO_TA3EK);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log('\n======================================');
                console.log('🚀 CLEAN CODE: ' + code);
                console.log('======================================\n');
            } catch (err) {
                console.log('❌ Request failed: ' + err.message);
                setTimeout(() => startZamilSystem(), 20000);
            }
        }, 40000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startZamilSystem(), 10000);
            }
        } else if (connection === 'open') {
            console.log('\n✅ SYSTEM ONLINE - CONNECTION SUCCESS!\n');
        }
    });
}

startZamilSystem();

app.post('/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        let jid = number.replace(/\D/g, '');
        if (jid.startsWith('0')) jid = '213' + jid.substring(1);
        await sock.sendMessage(jid + "@s.whatsapp.net", { text: message });
        res.send({ status: "success" });
    } catch (e) { res.status(500).send({ error: e.toString() }); }
});

app.get('/ping', (req, res) => res.send("ALIVE"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Stable System on ${PORT}`));
