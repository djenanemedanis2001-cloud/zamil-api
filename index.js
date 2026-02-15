const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;

// 1. FASSA7A: N'm7ou l'cache l'qdim qbel ma n'bdaw
if (fs.existsSync('./auth_info_baileys')) {
    console.log("🧹 Cleaning old session traces...");
    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
}

async function startZamilSystem() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // 2. N'badlou l'identite bach WhatsApp ma y'fiqsh
        browser: ["Chrome (Official)", "122.0.0.0", "Windows"],
        connectTimeoutMs: 100000,
        keepAliveIntervalMs: 30000
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log("⏳ ANALYSE: Waiting 40s for total network stability...");
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(NUMERO_TA3EK);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log('\n======================================');
                console.log('🔥 NEW CLEAN CODE: ' + code);
                console.log('======================================\n');
            } catch (err) {
                console.log('❌ Failed: ' + err.message + '. Retrying...');
                setTimeout(() => startZamilSystem(), 15000);
            }
        }, 40000); // 40 seconds bash n'foutou ga3 l'bugs ta3 Render
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Stable System on ${PORT}`));
