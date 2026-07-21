const {Client, Events, GatewayIntentBits} = require('discord.js');

function init(core, config) {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

    client.on(Events.ClientReady, readyClient => {
        log(`Discord Bot Logged in as ${readyClient.user.tag}!`)
    });

    client.on(Events.MessageCreate, message => {
        log(`Message ${message.content} was sent by ${message.author.username}`)
    })

    function onmessage(msg, client) {
        // msg.content
        
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
