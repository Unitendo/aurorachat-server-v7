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
 * @param {CoreServer} server
 * @param {String} ip
 * @param {MessageCallback} onsend 
 */
const CoreClient = function(server, ip, onsend) {
    this.server = server
    this.user = undefined
    this.room = undefined
    this.ip = ip
    this.onsend = onsend
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
CoreClient.prototype.register = function(login, passwd) {
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
 * @return {String} 
 */
CoreClient.prototype.getServerRules = function() {
    return this.server.serverrules
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
    if(!this.user) return
    if(!this.room) return
    if(this.user.checkFlag(users.USER_FLAGS.muted)) return
    this.server.send({
        author: this.user.login,
        room: this.room,
        content: msg
    })
}

/**
 * @param {Number} maxroomhistory
 * @param {String} serverrules 
 */
const CoreServer = function(maxroomhistory, serverrules) {
    /**
     * @type {CoreClient[]}
     */
    this.clients = []
    this.serverrules = serverrules
    /**
     * @type { Object.<string, Message[]> }
     */
    this.history = {}
    this.maxroomhistory = maxroomhistory
}

/**
 * @param {String} ip 
 * @param {MessageCallback} onsend 
 * @returns {CoreClient}
 */
CoreServer.prototype.connect = function(ip, onsend) {
    const client = new CoreClient(this, ip, onsend)
    this.clients.push(client)
    return client
}

/**
 * @param {Message} msg 
 */
CoreServer.prototype.send = function(msg) {
    console.log(msg)

    if(!(msg.room in this.history)) this.history[msg.room] = []
    this.history[msg.room].push(msg)
    this.history[msg.room] = this.history[msg.room].slice(-this.maxroomhistory)

    for(const c of this.clients) {
        if(!c.login) continue
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
    const canon = a.canonicalForm()
    return canon
}

/**
 * @param {String} ip 
 * @returns {Boolean}
 */
CoreServer.prototype.checkIPBan = function(ip) {
    return users.checkIPBan(ip)
}

module.exports = CoreServer
module.exports.CoreClient = CoreClient
