const users = require('./users')
const ip = require('ip-address')

/**
 * @typedef { { author: string, room: string, content: string } } Message
 */

/**
 * @callback MessageCallback
 * @param {Message} msg
 */

/**
 * @callback KickCallback
 */

/**
 * @param {CoreServer} server
 * @param {String} ip
 * @param {MessageCallback} onsend 
 * @param {KickCallback} onkick 
 */
const CoreClient = function(server, ip, onsend, onkick) {
    this.server = server
    this.user = undefined
    /**
     * @type {String | undefined}
     */
    this.room = undefined
    this.ip = ip
    this.onsend = onsend
    this.onkick = onkick

    this.spamtimer = null
    this.spamcount = 0
}

CoreClient.prototype.disconnect = function() {
    const idx = this.server.clients.indexOf(this)
    if(idx === -1) return
    this.server.clients.splice(idx, 1)
}

/**
 * @param {String} login 
 * @param {String} passwd 
 * @returns {undefined | String[]}
 */
CoreClient.prototype.login = function(login, passwd) {
    const user = users.getUserByLogin(login)
    if(!user) return ['bad_login']
    if(!user.comparePasswd(passwd)) return ['bad_login']
    user.loginIP = this.ip
    if(user.checkFlag(users.USER_FLAGS.banned)) return ['banned', user.banreason]
    this.user = user
    console.log(`Login from ${this.ip} on user ${login}`)
    return undefined
}

/**
 * @param {String} login 
 * @param {String} passwd 
 * @returns {undefined | String[]}
 */
CoreClient.prototype.register = function(login, passwd, force = false) {
    if((!force) && this.server.registerdisabled) return ['register_disabled']
    if(users.getUserByLogin(login)) return ['user_exists']
    const user = users.createUser(login, passwd)
    if(!user) return ['register_failure']
    user.loginIP = this.ip
    user.createIP = this.ip
    this.user = user
    console.log(`Register from ${this.ip} on user ${login}`)
    return undefined
}

/**
 * @returns {String} 
 */
CoreClient.prototype.getServerRules = function() {
    return this.server.serverrules
}

/**
 * @returns {String} 
 */
CoreClient.prototype.getServerMOTD = function() {
    return this.server.motd
}

/**
 * @returns {Message[]}
 */
CoreClient.prototype.getRoomHistory = function() {
    return this.server.history[this.room] ? this.server.history[this.room] : []
}

/**
 * @param {String} msg 
 */
CoreClient.prototype.send = function(msg) {
    if(!msg) return // hardcoded message length check
    if(msg.length > 1024) return // hardcoded message length check
        
    if(!this.user) return
    if(!this.room) return
    if(this.user.checkFlag(users.USER_FLAGS.muted)) return

    if(!this.spamtimer)
        this.spamtimer = setTimeout(() => {
            this.spamcount = 0
            this.spamtimer = null
        }, this.server.spaminterval)
    this.spamcount++

    if(this.spamcount > this.server.spamcountkick) {
        console.log(`Kicking ${this.user.login} (${this.ip}) for spam`)
        this.onkick()
        return
    }

    if(this.spamcount > this.server.spamcount) {
        this.onsend({
            author: '[SERVER]',
            content: 'Hey! You\'re sending messages way too fast! Calm down a bit.'
        })
        return
    }

    const mobj = this.server.pluginPassthrough({
        author: this.user.login,
        room: this.room,
        content: msg
    }, this)

    if(!mobj) return
    this.server.send(mobj)
}

CoreClient.prototype.kick = function() {
    this.disconnect()
    this.onkick()
}

/**
 * @callback PluginMessageCallback
 * @param {Message} msg
 * @param {CoreClient} client
 * @returns {Message | undefined}
 */

/**
 * @param {Number} maxroomhistory
 * @param {String} serverrules 
 * @param {Number} spaminterval
 * @param {Number} spamcount
 * @param {Number} spamcountkick
 * @param {Number} registerdisabled
 */
const CoreServer = function(maxroomhistory, serverrules, spaminterval, spamcount, spamcountkick, registerdisabled) {
    /**
     * @type {CoreClient[]}
     */
    this.clients = []
    this.serverrules = serverrules
    this.motd = 'This server hasn\'t set a MOTD yet! Please nag the server admins about this!'
    /**
     * @type { Object.<string, Message[]> }
     */
    this.history = {}
    this.maxroomhistory = maxroomhistory
    this.spaminterval = spaminterval
    this.spamcount = spamcount
    this.spamcountkick = spamcountkick
    this.registerdisabled = registerdisabled

    /**
     * @type {PluginMessageCallback[]}
     */
    this.plugins = []
}

/**
 * @param {String} ip 
 * @param {MessageCallback} onsend 
 * @param {KickCallback} onkick
 * @returns {CoreClient}
 */
CoreServer.prototype.connect = function(ip, onsend, onkick) {
    const client = new CoreClient(this, ip, onsend, onkick)
    this.clients.push(client)
    return client
}

/**
 * @param {Message} msg 
 */
CoreServer.prototype.send = function(msg) {
    console.log(msg)

    if(msg.room) {
        if(!(msg.room in this.history)) this.history[msg.room] = []
        this.history[msg.room].push(msg)
        this.history[msg.room] = this.history[msg.room].slice(-this.maxroomhistory)
    }

    for(const c of this.clients) {
        if(!c.user) continue
        if(!c.room) continue
        if(msg.room) if(c.room !== msg.room) continue
        c.onsend(msg)
    }
}

/**
 * @param {String} rawip 
 * @returns {String}
 */
CoreServer.prototype.computeIP = function(rawip) {
    const a = new ip.Address6(rawip)
    return a.correctForm()
}

/**
 * @param {String} ip 
 * @returns {Boolean}
 */
CoreServer.prototype.checkIPBan = function(ip) {
    return users.checkIPBan(ip)
}

/**
 * @param {String} login 
 * @returns {Number}
 */
CoreServer.prototype.countSessions = function(login) {
    let count = 0
    for(const c of this.clients) {
        if(!c.user) continue
        if(c.user.login !== login) continue
        count++
    } 
    return count
}

/**
 * @param {String} login 
 */
CoreServer.prototype.kickUser = function(login) {
    const kicklist = []
    for(const c of this.clients) {
        if(!c.user) continue
        if(c.user.login !== login) continue
        kicklist.push(c)
    } 
    for(const c of kicklist) {
        c.kick()
    }
}

/**
 * @param {String[]} pluginlist 
 * @param {Object.<string, any>} pluginconfig
 */
CoreServer.prototype.loadPlugins = function(pluginlist, pluginconfig) {
    for(const p of pluginlist) {
        const m = require(`./plugins/${p}`)
        const f = m(this, pluginconfig[p])
        this.plugins.push(f)
    }
}

/**
 * @param {Message} msg
 * @param {CoreClient} client
 * @returns {Message | undefined}
 */
CoreServer.prototype.pluginPassthrough = function(msg, client) {
    for(const p of this.plugins) {
        if(!msg) return
        msg = p(msg, client)
    }
    return msg
}

/**
 * @param {Message} msg
 * @param {MessageCallback} pluginreplycb
 */
CoreServer.prototype.pluginSend = function(msg, pluginreplycb = function(msg){}) {
    const fakeclient = new CoreClient(this, '::1', pluginreplycb, () => {})
    for(const p of this.plugins) {
        p(msg, fakeclient)
    }
    this.send(msg)
}

/**
 * @param {String} login 
 * @returns {users | undefined}
 */
CoreServer.prototype.getUserByLogin = login => users.getUserByLogin(login)
/**
 * @param {String} ip 
 * @returns {users[]}
 */
CoreServer.prototype.getUsersByIP = ip => users.getUsersByIP(ip)
/**
 * @param {String} login 
 * @param {String} passwd 
 * @returns {users}
 */
CoreServer.prototype.createUser = (login, passwd) => users.createUser(login, passwd)
/**
 * @param {String} ip 
 */
CoreServer.prototype.banIP = ip => users.banIP(ip)
/**
 * @param {String} ip 
 */
CoreServer.prototype.unbanIP = ip => users.unbanIP(ip)
/**
 * @returns {String[]}
 */
CoreServer.prototype.getIPBans = () => users.getIPBans()

module.exports = CoreServer
module.exports.CoreClient = CoreClient
module.exports.userSaveInterval = users.userSaveInterval
