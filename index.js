const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;

// 1. FRESH START: N'm7ou kolsh l'qdim bash ma n'khaltouch l'identite
if (fs.existsSync('auth_session')) {
    fs.rmSync('auth_session', { recursive: true, force: true });
}

async function startZamilSystem() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // 2. L'HACK: N'banou k'annaho Mobile App machi Browser
        browser: ["Android", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log("⏳ Stabilisation du réseau... Sabr 45s (Render vs Meta).");
        
        setTimeout(async () => {
            try {
                // N'forcew l'connexion t'koun m-helloula
                const code = await sock.requestPairingCode(NUMERO_TA3EK);
                console.log('\n======================================');
                console.log('🔥 CODE FINAL (LIER NUMERO): ' + (code?.match(/.{1,4}/g)?.join("-") || code));
                console.log('======================================\n');
            } catch (err) {
                console.log('⚠️ Erreur: ' + err.message + '. Resetting in 10s...');
                setTimeout(() => startZamilSystem(), 10000);
            }
        }, 45000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startZamilSystem(), 5000);
            }
        } else if (connection === 'open') {
            console.log('\n✅ MABROUK! WHATSAPP ONLINE 24/7\n');
        }
    });
}

startZamilSystem();

// API Endpoint for Google Sheet
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Stable API on port ${PORT}`));
