const {Client, Events, GatewayIntentBits} = require('discord.js');

/**
 * @param {import('../core')} core 
 * @param { {channelId: string, token: string, userId: string, room: string} } config
 * @returns {Function} 
 */
function init(core, config) {
    const client = new Client({ 
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    })
    var channel = null

    client.on(Events.ClientReady, async readyClient => {
        channel = await client.channels.fetch(config.channelId)
        log(`Discord Bot Logged in as ${readyClient.user.tag}!`)
    })

    function senddiscordmsg(author, content) {
        channel.send(`<**${author}**> ${content}`)
    }

    client.on(Events.MessageCreate, message => {
        if(message.author.id === config.userId) return
        if(message.channel.id !== config.channelId) return
        core.pluginSend({
            author: `${message.author.username} [DISCORD]`,
            room: config.room,
            content: message.content
        }, msg => {
            senddiscordmsg(msg.author, msg.content)
        })
    })

    /**
     * @param {import('../core').Message} msg 
     * @returns 
     */
    function onmessage(msg, _) {
        if(msg.author.endsWith('[DISCORD]')) return msg
        if(msg.room === config.room)
            senddiscordmsg(msg.author, msg.content)
        return msg
    }

    function log(...args) {
        console.log("[DISCORDRELAY]", ...args)
    }

    log('Loaded')
    client.login(config.token)
    
    return onmessage
}

module.exports = init
