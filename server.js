const fs = require('fs')
const path = require('path')

const DATADIR = path.join(__dirname, 'aurorachat', 'data')

if(!fs.existsSync(DATADIR)) {
    fs.mkdirSync(DATADIR)
    console.log('data dir nonexistent, creating')
}

const config = require('./config')
const Core = require('./aurorachat/core')
const tcpserver = require('./aurorachat/tcp')
const wsserver = require('./aurorachat/websocket')
const webstuff = require('./aurorachat/webstuff')

const core = new Core(
    config.SERVER_NAME, config.MAX_ROOM_HISTORY, config.SERVER_RULES, 
    config.SPAM_INTERVAL, config.SPAM_COUNT, config.SPAM_COUNT_KICK,
    config.REGISTER_DISABLED, config.DEFAULT_MOTD
)
tcpserver(core, config.TCP_PORT)
wsserver(core, config.WS_PORT)
webstuff(core, config.WEB_PORT)
core.loadPlugins(config.PLUGINS, config.PLUGIN_CONFIG)

Core.userSaveInterval(config.USER_SAVE_INTERVAL)

process.stdin.on('data', data => {
    const msg = data.toString('utf-8')
    core.send({
        author: '[SERVER]',
        room: undefined,
        content: msg.trim()
    })
})
