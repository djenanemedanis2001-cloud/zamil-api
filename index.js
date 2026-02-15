const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());

const NUMERO_TA3EK = "213672975420"; 
let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Chrome (Linux)", "", ""] // Hna nkhad3ouhom bash ma yfiqouch
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        console.log("⏳ Ntsenaw 8 Thawanir bash l'khet ykoun wajed 100%...");
        
        // ⏰ L'Frein ta3 8 seconds bash WhatsApp ma y-blokilnach l'connexion
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(NUMERO_TA3EK);
                // Nriglou l'ktiba ta3 l'code bash tban chaba
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log('\n======================================');
                console.log('🔥 HADA HOWA L\'CODE TA3EK: ' + code);
                console.log('Roh l WhatsApp -> Appareils connectés -> Lier avec le num de tel');
                console.log('======================================\n');
            } catch (err) {
                console.log('❌ Mochkil f l\'Pairing Code: ', err.message);
            }
        }, 8000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if(shouldReconnect) {
                console.log('🔴 WhatsApp tqta3, n-reconnecti chwiya...');
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
