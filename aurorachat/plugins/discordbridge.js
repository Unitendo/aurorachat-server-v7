const {Client, Events, GatewayIntentBits} = require('discord.js');

function init(core, config) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
    var channel = null;

    client.on(Events.ClientReady, async readyClient => {
        channel = await client.channels.fetch(config.channelId);
        log(`Discord Bot Logged in as ${readyClient.user.tag}!`)
    });

    client.on(Events.MessageCreate, message => {
        if (message.author.id === config.userId) {return}
        if (message.channel.id !== config.channelId) {return}
        core.send({
            author: message.author.username+" [DISCORD]",
            room: "general",
            content: message.content
        })
    })

    function onmessage(msg, _) {
        if(msg.room === config.room)
            channel.send(`<**${msg.author}**>: ${msg.content}`);
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
