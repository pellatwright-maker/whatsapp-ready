const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const P = require('pino')

const BOT_TOKEN = process.env.BOT_TOKEN
const RENDER_API_URL = process.env.RENDER_API_URL
const CHANNELS = ["0029VaxSPRCJENxy7Nhq5s2Y","0029Vb5pc270VycKAb1tc631","0029Vb5zwt61noz9BxMaAz2g","0029VazAVen90x2zI4HS5A2Z"]

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), printQRInTerminal: false })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            console.log('=== QR POUR 056608621 ===')
            qrcode.generate(qr, {small:true})
        }
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startSock()
        }
        if (connection === 'open') {
            console.log('✅ Connecté 056608621')
            for (const id of CHANNELS) { try { await sock.newsletterFollow(id) } catch(e){} }
        }
    })
    sock.ev.on('messages.upsert', async ({messages}) => {
        for (const msg of messages) {
            const jid = msg.key.remoteJid || ""
            if (jid.includes('newsletter') || CHANNELS.some(c=>jid.includes(c))) {
                const text = msg.message?.extendedTextMessage?.text || msg.message?.conversation || ""
                if (text.length > 20) {
                    console.log('NOUVELLE OFFRE:', text.substring(0,80))
                    try { await axios.post(`${RENDER_API_URL}/api/new_offre`, {text, source: jid}) } catch(e){}
                }
            }
        }
    })
}
startSock()
