const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const http = require('http');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const users = {};

client.on('qr', (qr) => {
    console.log('\n📲 Escanea este código QR con tu WhatsApp:\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado exitosamente a WhatsApp');
});

client.on('message', async (msg) => {
    // Ignorar mensajes de grupos
    if (msg.from.includes('@g.us')) return;

    const chatId = msg.from;
    const text = msg.body.trim();

    if (!users[chatId]) {
        users[chatId] = { step: 0, completo: false };
    }

    const user = users[chatId];

    // Si ya completó y vuelve a escribir
    if (user.completo) {
        await msg.reply('✅ Ya completaste el formulario. ¡Gracias por participar! 🙌');
        return;
    }

    switch (user.step) {
        case 0:
            await msg.reply(
                `👋 *Bienvenido*\nPuedes participar desde el *01 al 30 de agosto del 2025*\n\nPor favor lee los términos y condiciones aquí:\nhttps://molipromo.pe/tyc\n\n*Selecciona una opción:*\n\n1️⃣ Estoy de acuerdo\n2️⃣ No estoy de acuerdo`
            );
            user.step = 1;
            break;

        case 1:
            if (text === "2") {
                await msg.reply('❌ Entendemos, muchas gracias por tu tiempo.');
                delete users[chatId];
            } else if (text === "1") {
                await msg.reply('✅ Gracias. Por favor indícame tus *nombres y apellidos completos*.');
                user.step = 2;
            } else {
                await msg.reply('❗ Por favor responde con:\n1️⃣ Estoy de acuerdo\n2️⃣ No estoy de acuerdo');
            }
            break;

        case 2:
            user.nombreCompleto = text;
            await msg.reply('🆔 Ahora escribe tu *número de DNI o cédula extranjera* (mínimo 8 dígitos).');
            user.step = 3;
            break;

        case 3:
            if (/^\d{8,}$/.test(text)) {
                user.dni = text;
                await msg.reply('📅 Escribe tu *fecha de nacimiento* en formato DD/MM/AAAA.');
                user.step = 4;
            } else {
                await msg.reply('⚠️ El DNI o cédula debe tener al menos 8 dígitos. Intenta nuevamente.');
            }
            break;

        case 4:
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
                user.fechaNacimiento = text;
                await msg.reply('📱 Indícame tu *número de celular* (exactamente 9 dígitos).');
                user.step = 5;
            } else {
                await msg.reply('⚠️ Fecha incorrecta. Usa el formato DD/MM/AAAA (ej: 15/08/1990).');
            }
            break;

        case 5:
            if (/^\d{9}$/.test(text)) {
                user.celular = text;
                const resumen = `✅ *Revisión de datos:*\n\n🧾 *Nombres:* ${user.nombreCompleto}\n🆔 *DNI/Cédula:* ${user.dni}\n🎂 *Nacimiento:* ${user.fechaNacimiento}\n📱 *Celular:* ${user.celular}\n\n📢 En caso de ser ganador, te contactaremos a este número.\n\n*Selecciona una opción:*\n\n1️⃣ Sí, son correctos\n2️⃣ No, deseo editar`;
                await msg.reply(resumen);
                user.step = 6;
            } else {
                await msg.reply('⚠️ El número de celular debe tener exactamente 9 dígitos.');
            }
            break;

        case 6:
            if (text === "1") {
                await msg.reply('🎉 Muchas gracias. ¡Te deseamos mucha suerte!');
                user.completo = true;  // marca que ya terminó
            } else if (text === "2") {
                await msg.reply('🔁 Vamos a editar.\n\nPor favor indícame tus *nombres y apellidos completos*.');
                user.step = 2;
            } else {
                await msg.reply('❗ Por favor responde con:\n1️⃣ Sí, son correctos\n2️⃣ No, deseo editar');
            }
            break;
    }
});

client.initialize();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot de WhatsApp funcionando');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP escuchando en puerto ${PORT}`);
});