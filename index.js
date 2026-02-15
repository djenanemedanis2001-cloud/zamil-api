const express = require('express');
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;

async function connectToWhatsApp() {
    // Ykhabi l'QR Code w l'Connexion bash ma t3awdch t-scanni kol youm
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            console.log('🔴 WhatsApp tqta3, rani n-reconnecti...');
            connectToWhatsApp();
        } else if(connection === 'open') {
            console.log('✅ MABROUK! WHATSAPP M-CONNECTE 100%');
        }
    });
}

connectToWhatsApp();

// 🚀 L'API li Google Sheet yb3athliha l'Message w Numéro
app.post('/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        if (!number || !message) return res.status(400).send("Khass Numéro wla Message!");
        
        // Nriglou l'Numéro l'Format ta3 WhatsApp (213...)
        let cleanNumber = number.toString().replace(/\D/g, '');
        if (cleanNumber.startsWith('0')) cleanNumber = '213' + cleanNumber.substring(1);
        
        const jid = cleanNumber + "@s.whatsapp.net";
        await sock.sendMessage(jid, { text: message });
        res.send({ status: "success", message: "✅ Message mcha f WhatsApp!" });
    } catch (error) {
        res.status(500).send({ status: "error", error: error.toString() });
    }
});

// ⏰ L'Anti-Sleep bash Serveur ma yor9odch (Google Sheet y-pingih kol 5 dqaq)
app.get('/ping', (req, res) => {
    res.send("PONG! Serveur ZAMIL raho nayed 24/24.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur raho ymchi f l'Port ${PORT}`);
});
