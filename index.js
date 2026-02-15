const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;
let pairingRequestSent = false;

async function startZamilSystem() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Windows", "Chrome", "121.0.6167.184"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            pairingRequestSent = false; // Reset pairing state on close
            
            if (reason === 428 || reason === 515) {
                console.log("⚠️ Conflict detected. Clearing cache and cooling down (15s)...");
                if (fs.existsSync('./auth_info_baileys')) fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                setTimeout(() => startZamilSystem(), 15000);
            } else if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startZamilSystem(), 5000);
            }
        } else if (connection === 'open') {
            console.log('\n🚀 MABROUK! ZAMIL SYSTEM IS ONLINE 24/7\n');
        }

        // Generate pairing code only if not registered and not already sent
        if (!sock.authState.creds.registered && !pairingRequestSent && connection !== 'close') {
            pairingRequestSent = true;
            console.log("🛠️ Tunneling secure... Sabr 30s for IP stability.");
            
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(NUMERO_TA3EK);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log('\n======================================');
                    console.log('🔥 CODE DE LIAISON: ' + code);
                    console.log('======================================\n');
                } catch (err) {
                    console.log('❌ Request Failed. Retrying in 20s...');
                    pairingRequestSent = false;
                    setTimeout(() => startZamilSystem(), 20000);
                }
            }, 30000); 
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
