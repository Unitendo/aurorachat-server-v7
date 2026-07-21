const {Client, Events, GatewayIntentBits} = require('discord.js');

function init(core, config) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
    var channel = null;

    client.on(Events.ClientReady, async readyClient => {
        channel = await client.channels.fetch(config.channelId);
        log(`Discord Bot Logged in as ${readyClient.user.tag}!`)
    });

    client.on(Events.MessageCreate, message => {
        if (message.author.username === "Auroracross v6") {return}
        if (message.channel.id !== config.channelId) {return}
        core.send({
            author: message.author.username+" [DISCORD]",
            room: "general",
            content: message.content
        })
    })

    function onmessage(msg, _) {
        // msg.content
        channel.send(`[*${msg.room}*] <**${msg.author}**>: ${msg.content}`);
        return msg
    }

    function log(...args) {
        console.log("[DISCORDRELAY]", ...args)
    }

    log('Loaded')
    client.login(config.token);
    
    return onmessage
}

module.exports = init
