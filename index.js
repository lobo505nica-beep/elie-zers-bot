// ========== ELIE-ZERS BOT v5.0 ==========
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, jidNormalizedUser } = require('@whiskeysockets/baileys')
const pino = require('pino')
const { Low, JSONFile } = require('lowdb')

const OWNER = process.env.OWNER // Railway nos da este dato
const PREFIX = '.'
const BOT_NAME = 'ELIE-ZERS'

const adapter = new JSONFile('./database.json')
const db = new Low(adapter)
await db.read()
db.data ||= { welcome: {}, bye: {}, groups: {}, users: {} }

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: [BOT_NAME, 'Chrome', '1.0.0']
    })

    // CODIGO DE 8 DIGITOS
    if (!sock.authState.creds.registered) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        const code = await sock.requestPairingCode(OWNER.split('@')[0])
        console.log(`\n\n✅ TU CODIGO DE 8 DIGITOS: ${code} ✅✅\n\n`)
    }

    sock.ev.on('creds.update', saveCreds)

    // WELCOME / BYE
    sock.ev.on('group-participants.update', async (anu) => {
        const group = anu.id
        const user = anu.participants[0]
        if(!db.data.groups[group]?.on) return
        const metadata = await sock.groupMetadata(group)
        const members = metadata.participants.length
        const time = new Date().toLocaleString('es-NI')
        if(anu.action === 'add' && db.data.welcome[group]?.on){
            let txt = db.data.welcome[group].text.replace('@user', '@'+user.split('@')[0]).replace('@group', metadata.subject).replace('@members', members).replace('@time', time)
            await sock.sendMessage(group, { text: txt, mentions: [user] })
        }
        if(anu.action === 'remove' && db.data.bye[group]?.on){
            let txt = db.data.bye[group].text.replace('@user', '@'+user.split('@')[0]).replace('@group', metadata.subject).replace('@members', members-1).replace('@time', time)
            await sock.sendMessage(group, { text: txt, mentions: [user] })
        }
    })

    // COMANDOS - SOLO TU
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message) return
        const from = msg.key.remoteJid
        const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        if(!text.startsWith(PREFIX)) return
        if(sender!== OWNER) return

        const args = text.slice(PREFIX.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if(command === 'setwelcome'){ db.data.welcome[from] = { text: args.join(' '), on: false }; await db.write(); sock.sendMessage(from, {text: '✐ Welcome guardado ✅'}) }
        if(command === 'welcome'){ db.data.welcome[from].on = args[0] === 'on'; db.data.groups[from] = { on: true }; await db.write(); sock.sendMessage(from, {text: `Bienvenida ${args[0]} ✅`}) }
        if(command === 'setbye'){ db.data.bye[from] = { text: args.join(' '), on: false }; await db.write(); sock.sendMessage(from, {text: '✐ Bye guardado ✅'}) }
        if(command === 'bye'){ db.data.bye[from].on = args[0] === 'on'; db.data.groups[from] = { on: true }; await db.write(); sock.sendMessage(from, {text: `Despedida ${args[0]} ✅`}) }
        if(command === 'bot'){ db.data.groups[from] = { on: args[0] === 'on' }; await db.write(); sock.sendMessage(from, {text: `Bot ${args[0] === 'on'? 'activado' : 'desactivado'}`}) }
        if(command === 'menu'){ sock.sendMessage(from, {text: `*${BOT_NAME} MENU* 👑\n.setwelcome.welcome.setbye.bye.bot.menu\nSolo Owner: ${OWNER.split('@')[0]}`}) }

        await db.write()
    })

    sock.ev.on('connection.update', (update) => {
        const { connection } = update
        if(connection === 'open') console.log(`✅ ${BOT_NAME} CONECTADO 24/7`)
    })
}
startBot()
