const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

let sock;

// ⚠️ KTEB NUMERO TA3EK HNA B 213 (Matalan: "213791059501")
const NUMERO_TA3EK = "213672975420"; 

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // 🛑 NA7INA L'QR CODE!
        logger: pino({ level: "silent" }),
        browser: ["Mac OS", "Chrome", "121.0.6167.159"] // Nkhad3ouhom b Mac
    });

    // 🔥 L'HACK TA3 L'PAIRING CODE (8 Hrouf)
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(NUMERO_TA3EK);
                console.log('\n======================================');
                console.log('🔥 HADA HOWA L\'CODE TA3EK: ' + code);
                console.log('Roh l WhatsApp -> Appareils connectés -> Lier avec le num de tel');
                console.log('======================================\n');
            } catch (err) {
                console.log('❌ Mochkil f l\'Pairing Code: ', err);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if(shouldReconnect) {
                console.log('🔴 WhatsApp tqta3, n-reconnecti...');
                setTimeout(() => connectToWhatsApp(), 5000);
            } else {
                console.log('❌ T-deconnecta. N-fasakh cache...');
                fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        } else if(connection === 'open') {
            console.log('\n✅ MABROUK! WHATSAPP M-CONNECTE 100%\n');
        }
    });
}

connectToWhatsApp();

app.post('/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        if (!number || !message) return res.status(400).send("Khass Numéro wla Message!");
        let cleanNumber = number.toString().replace(/\D/g, '');
        if (cleanNumber.startsWith('0')) cleanNumber = '213' + cleanNumber.substring(1);
        const jid = cleanNumber + "@s.whatsapp.net";
        await sock.sendMessage(jid, { text: message });
        res.send({ status: "success", message: "✅ Message mcha f WhatsApp!" });
    } catch (error) {
        res.status(500).send({ status: "error", error: error.toString() });
    }
});

app.get('/ping', (req, res) => { res.send("PONG! Serveur ZAMIL raho nayed 24/24."); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { console.log(`🚀 Serveur raho ymchi f l'Port ${PORT}`); });
