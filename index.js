const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;

// 1. FRESH START: N'khad3ouhom b folder jdid ga3
const SESSION_NAME = 'zamil_session_final';

async function startZamilSystem() {
    // N'faskhou l'qdim ida mazalou
    if (fs.existsSync(SESSION_NAME)) {
        console.log("🧹 Deep cleaning session...");
        fs.rmSync(SESSION_NAME, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_NAME);
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // 2. N'badlou l'ism b tariqa advanced (Chrome on macOS)
        browser: ["macOS", "Chrome", "121.0.0.0"],
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 30000
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log("⏳ Stabilisation (50s)... Khalli l'internet t'ssfa mlih.");
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(NUMERO_TA3EK);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log('\n======================================');
                console.log('🚀 CLEAN CODE FOR STANDARD WHATSAPP: ' + code);
                console.log('======================================\n');
            } catch (err) {
                console.log('❌ Failed. Retrying in 20s...');
                setTimeout(() => startZamilSystem(), 20000);
            }
        }, 50000); // 50 seconds bach n'badlou l'IP reputation
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startZamilSystem(), 10000);
            }
        } else if (connection === 'open') {
            console.log('\n✅ MABROUK! WHATSAPP IS CONNECTED!\n');
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`System on ${PORT}`));
