const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;
let isGeneratingCode = false; 

async function startZamilSystem() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "121.0.6167.184"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered && !isGeneratingCode) {
        isGeneratingCode = true;
        console.log("🛠️ ANALYSE: Tunnel stable... Sabr 20s (Render is slow today).");
        
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(NUMERO_TA3EK);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log('\n======================================');
                console.log('✅ SOLUTION FINALE - CODE GENERE');
                console.log('🔥 CODE: ' + code);
                console.log('======================================\n');
                isGeneratingCode = false;
            } catch (err) {
                console.log('⚠️ ALERTE: WhatsApp a refusé la demande. Reset en cours...');
                isGeneratingCode = false;
                if (err.message.includes('428')) {
                    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                }
                setTimeout(() => startZamilSystem(), 10000);
            }
        }, 20000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startZamilSystem(), 8000);
            } else {
                fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                startZamilSystem();
            }
        } else if(connection === 'open') {
            console.log('\n🚀 MABROUK! ZAMIL SYSTEM IS ONLINE 24/7\n');
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
app.listen(PORT, () => console.log(`System running on port ${PORT}`));
