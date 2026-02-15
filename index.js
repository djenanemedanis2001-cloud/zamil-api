const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["ZamilSystem", "Chrome", "1.0.0"] // 🔥 L'Hack hna: nkhad3ou Meta
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n======================================');
            console.log('📸 SCANNI HAD L QR CODE BEL KHAF 👇👇👇');
            console.log('======================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            if(shouldReconnect) {
                console.log('🔴 WhatsApp tqta3, n-reconnecti f 3 tawanir...');
                setTimeout(() => connectToWhatsApp(), 3000); // ⏰ Frein ta3 3 secondes
            } else {
                console.log('❌ L\'compte t-deconnecta. Lazem n-fasakh l\'cache w n3awd.');
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

app.get('/ping', (req, res) => {
    res.send("PONG! Serveur ZAMIL raho nayed 24/24.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur raho ymchi f l'Port ${PORT}`);
});
