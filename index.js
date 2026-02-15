const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "110.0.5481.177"],
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log("⏳ Stabilisation du tunnel (15s)... Sabr khouya!");
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(NUMERO_TA3EK);
                const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log('\n======================================');
                console.log('🔥 CODE DE LIAISON: ' + formattedCode);
                console.log('======================================\n');
            } catch (err) {
                console.log('⚠️ Erreur Pairing (Retry in 10s):', err.message);
                setTimeout(() => connectToWhatsApp(), 10000);
            }
        }, 15000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const code = (lastDisconnect.error)?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnexion en cours...');
                setTimeout(() => connectToWhatsApp(), 5000);
            } else {
                fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                connectToWhatsApp();
            }
        } else if(connection === 'open') {
            console.log('\n✅ MABROUK! WHATSAPP CONNECTE 24/7\n');
        }
    });
}

connectToWhatsApp();

app.post('/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        let cleanNumber = number.toString().replace(/\D/g, '');
        if (cleanNumber.startsWith('0')) cleanNumber = '213' + cleanNumber.substring(1);
        await sock.sendMessage(cleanNumber + "@s.whatsapp.net", { text: message });
        res.send({ status: "success" });
    } catch (e) { res.status(500).send({ error: e.toString() }); }
});

app.get('/ping', (req, res) => res.send("ALIVE"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
