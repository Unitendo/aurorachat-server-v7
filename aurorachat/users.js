const uuid = require('uuid').v4
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const HASH_ROUNDS = 12
const USERFILE = path.join(__dirname, 'data', 'users.json.gz')

/**
 * @typedef {String} uid
 */

/**
 * @returns {uid}
 */
function generateRandomUID() {
    let uid = uuid()
    while(uid in users) 
        uid = uuid()

    return uid
}

/**
 * @param {uid} uid
 * @param {String} login 
 * @param {String} passwd
 * @param {String[]} flags 
 * @param {String} banreason
 * @param {String | undefined} createIP
 * @param {String | undefined} loginIP
 */
const User = function(uid, login, passwd, flags, banreason, createIP, loginIP) {
    this.uid = uid
    this.login = login
    this.passwd = passwd
    this.flags = flags
    this.banreason = banreason
    this.createIP = createIP
    this.loginIP = loginIP
}

User.USER_FLAGS = {
    banned: 'BANNED', muted: 'MUTED'
}

/**
 * @type { { Object.<uid, User> } }
 */
const users = {}

/** 
 * @param {String} passwd 
 * @returns {Boolean}
 */
User.prototype.comparePasswd = function(passwd) {
    return bcrypt.compareSync(passwd, this.passwd)
}

/**
 * @param {String} flag 
 */
User.prototype.addFlag = function(flag) {
    if(!this.flags.includes(flag))
        this.flags.push(flag)
}

/**
 * @param {String} flag 
 */
User.prototype.removeFlag = function(flag) {
    const idx = this.flags.indexOf(flag)
    if(idx === -1) return
    this.flags.splice(idx, 1)
}

/**
 * @param {String} flag 
 * @returns {Boolean}
 */
User.prototype.checkFlag = function(flag) {
    return this.flags.includes(flag)
}

User.prototype.deleteUser = function() {
    delete users[this.uid]
}

User.USERNAME_REGEX = /^[a-z0-9\ \.\,\-\/\\\|\:\;]{2,32}$/i

/**
 * @param {String} login 
 * @returns {Boolean}
 */
User.isUsernameValid = function(login) {
    return Boolean(login.match(User.USERNAME_REGEX))
}

/**
 * @param {String} login 
 * @param {String} passwd 
 * @returns {User | undefined}
 */
User.createUser = function(login, passwd) {
    if(!User.isUsernameValid(login)) return undefined
    const uid = generateRandomUID()
    const passwd_hash = bcrypt.hashSync(passwd, HASH_ROUNDS)
    const user = new User(uid, login, passwd_hash, [], '', undefined, undefined)
    users[uid] = user
    return user
}

/**
 * @param {uid} uid 
 * @returns {User | undefined}
 */
User.getUser = function(uid) {
    return users[uid]
}

/**
 * @param {String} login 
 * @returns {User | undefined}
 */
User.getUserByLogin = function(login) {
    return Object.values(users).find(v => v.login === login)
}

/**
 * @param {String} ip 
 * @returns {User[]}
 */
User.getUsersByIP = function(ip) {
    return Object.values(users).filter(v => v.createIP === ip || v.loginIP === ip)
}

/**
 * @type {String[]}
 */
const ipbans = []

/**
 * @param {String} ip 
 * @returns {Boolean}
 */
function checkIPBan(ip) {
    return ipbans.includes(ip)
}

/**
 * @param {String} ip 
 */
function banIP(ip) {
    if(!ipbans.includes(ip))
        ipbans.push(ip)
}

/**
 * @param {String} ip 
 */
function unbanIP(ip){
    const idx = ipbans.indexOf(ip)
    if(idx === -1) return
    ipbans.splice(idx, 1)
}

function tryLoadUsers() {
    try {
        console.log('Loading users.')
        const compressed = fs.readFileSync(USERFILE)
        const data = zlib.gunzipSync(compressed).toString('utf-8')
        const json = JSON.parse(data)
        for(const u of json.users) {
            users[u.uid] = new User(u.uid, u.login, u.passwd, u.flags, u.banreason, u.createIP, u.loginIP)
        }
        for(const i of json.ipbans) {
            banIP(i)
        }
    } catch(e) {
        console.warn('Userfile load error.', e.message)
    }
}

function trySaveUsers() {
    console.log('Saving users.')
    const data = JSON.stringify({
        users: Object.values(users),
        ipbans
    })
    const compressed = zlib.gzipSync(Buffer.from(data, 'utf-8'))
    fs.writeFileSync(USERFILE, compressed)
}

/**
 * @param {Number} delay
 */
function userSaveInterval(delay) {
    setInterval(trySaveUsers, delay * 1000)
}

function onexit() {
    console.log('Exiting cleanly.')
    trySaveUsers()
}

process.on('exit', onexit)
process.on('SIGINT', () => process.exit(0))
process.on('SIGUSR2', () => process.exit(0))

module.exports = User
module.exports.checkIPBan = checkIPBan
module.exports.banIP = banIP
module.exports.unbanIP = unbanIP
module.exports.userSaveInterval = userSaveInterval

tryLoadUsers()
