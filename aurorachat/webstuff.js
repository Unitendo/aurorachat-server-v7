const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const ejs = require('ejs')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')
const { encodeV7 } = require('./v7')
const antivpn = require('./antivpn')

const HASH_ROUNDS = 12
const ADMINFILE = path.join(__dirname, 'data', 'admins.json')
const ADMINFALLBACK = [
    {
        login: 'root',
        passwd: bcrypt.hashSync('toor', HASH_ROUNDS)
    }
]
const JWTKEY = crypto.randomBytes(128)

/**
 * @typedef { {login: string, passwd: string} } User
 */

/**
 * @returns {User[]}
 */
function loadAdminList() {
    try {
        const data = fs.readFileSync(ADMINFILE, 'utf-8')
        return JSON.parse(data)
    } catch(e) {
        console.warn('Admin list load error!', e.message)
        fs.writeFile(ADMINFILE, JSON.stringify(ADMINFALLBACK, undefined, 4), (err, data) => {})
        return ADMINFALLBACK
    }
}

/**
 * @param {String} login 
 * @param {String} passwd
 * @returns {User | undefined} 
 */
function checkCreds(login, passwd) {
    const users = loadAdminList()
    const user = users.find(u => u.login === login)
    if(!user) return undefined
    if(bcrypt.compareSync(passwd, user.passwd)) return user
    return undefined
}

/**
 * @param {import('./core')} core 
 * @param {express.Express} app 
 */
function adminpanel(core, app) {
    /**
     * @param {express.Request} req 
     */
    function getSession(req) {
        const cookie = req.cookies.session
        if(!cookie) return undefined
        try {
            return jwt.verify(cookie, JWTKEY)
        } catch(e) {
            return undefined
        }
    }

    /**
     * @param {express.Request} req 
     * @param {express.Response} res 
     */
    function sessionCheck(req, res) {
        const session = getSession(req)
        if(!session) {
            res.redirect('/adminpanel/login')
            return true
        }
    }

    app.use('/adminpanel/', bodyParser.urlencoded())

    app.get('/adminpanel/', (req, res) => {
        if(sessionCheck(req, res)) return
        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'index.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req, motd: core.motd })
        res.send(rendered)
    })

    app.get('/adminpanel/login', (req, res) => {
        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'login.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req })
        res.send(rendered)
    })

    app.post('/adminpanel/login', (req, res) => {
        const login = String(req.body.login)
        const passwd = String(req.body.passwd)
        if(!login || !passwd) {
            res.redirect('/adminpanel/login?err=1')
            return
        }

        const user = checkCreds(login, passwd)
        if(!user) {
            res.redirect('/adminpanel/login?err=1')
            return
        }

        const token = jwt.sign( {login: user.login}, JWTKEY, { expiresIn: 1440 })
        res.cookie('session', token)

        res.redirect('/adminpanel/')
    })

    app.get('/adminpanel/user', (req, res) => {
        if(sessionCheck(req, res)) return

        const login = String(req.query.user)
        const user = core.getUserByLogin(login)

        if(!user) {
            res.redirect('/adminpanel/?lookup_err=1')
            return
        }

        const sessioncount = core.countSessions(login)

        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'user.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req, user, sessioncount })
        res.send(rendered)
    })

    app.post('/adminpanel/kick', (req, res) => {
        if(sessionCheck(req, res)) return

        const login = String(req.body.user)
        if(!login) {
            res.redirect(`/adminpanel/`)
            return
        }

        core.kickUser(login)

        res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)
    })

    app.post('/adminpanel/flags', (req, res) => {
        if(sessionCheck(req, res)) return

        const login = String(req.body.user)
        const flag = String(req.body.flag)
        const mode = String(req.body.mode)

        res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)
        if(!flag || !mode) return

        const user = core.getUserByLogin(login)
        if(!user) return

        switch(mode) {
            case 'add':
                user.addFlag(flag.trim())
            break

            case 'remove':
                user.removeFlag(flag.trim())
        }
    })

    app.post('/adminpanel/banreason', (req, res) => {
        if(sessionCheck(req, res)) return

        const login = String(req.body.user)
        const banreason = String(req.body.banreason)

        res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)

        const user = core.getUserByLogin(login)
        if(!user) return

        user.banreason = banreason ? banreason : ''
    })

    app.post('/adminpanel/deleteuser', (req, res) => {
        if(sessionCheck(req, res)) return

        const login = String(req.body.user)
        const safety = req.body.safety

        const user = core.getUserByLogin(login)
        if(!user) {
            res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)
            return
        }

        if(!safety) {
            res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)
            return
        }

        user.deleteUser()

        res.redirect(`/adminpanel/`)
    })

    app.post('/adminpanel/ipban', (req, res) => {
        if(sessionCheck(req, res)) return

        const ip = String(req.body.ip)
        const mode = String(req.body.mode)

        res.redirect(`/adminpanel/`)
        if(!ip || !mode) return
        const cip = core.computeIP(ip)

        switch(mode) {
            case 'add':
                core.banIP(cip)
            break

            case 'remove':
                core.unbanIP(cip)
        }
    })

    app.post('/adminpanel/createuser', (req, res) => {
        if(sessionCheck(req, res)) return

        const login = String(req.body.login)
        const passwd = String(req.body.passwd)

        res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)

        if(core.getUserByLogin(login)) return
        const user = core.createUser(login, passwd)
        if(!user) return
        user.loginIP = core.computeIP('::1')
        user.createIP = core.computeIP('::1')
    })

    app.get('/adminpanel/ip', (req, res) => {
        if(sessionCheck(req, res)) return

        const ip = String(req.query.ip)
        if(!ip) {
            res.redirect('/adminpanel/')
            return
        }

        const users = core.getUsersByIP(ip)

        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'ip.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req, users })
        res.send(rendered)
    })

    app.get('/adminpanel/listipbans', (req, res) => {
        if(sessionCheck(req, res)) return

        const ips = core.getIPBans()

        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'ipbans.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req, ips })
        res.send(rendered)
    })

    app.post('/adminpanel/motd', (req, res) => {
        if(sessionCheck(req, res)) return

        res.redirect('/adminpanel/')

        const motd = String(req.body.motd)
        if(!motd) 
            return

        core.motd = motd.replace('\r', '')
    })

    app.post('/adminpanel/bcrypt', (req, res) => {
        if(sessionCheck(req, res)) return

        const passwd = String(req.body.passwd)
        if(!passwd) {
            res.redirect('/adminpanel/')
            return
        }

        const hash = bcrypt.hashSync(passwd, HASH_ROUNDS)
        res.redirect(`/adminpanel/?hash=${encodeURIComponent(hash)}`)
    })
}

/**
 * @param {import('./core')} core 
 * @param {express.Express} app 
 * @param {Number} maxembedbacklog 
 */
function embedserver(core, app, maxembedbacklog) {
    /**
     * @param {Buffer} buffer 
     * @param {String} type 
     * @param {String} author 
     */
    function Embed(buffer, type, author) {
        this.buffer = buffer
        this.type = type
        this.author = author
    }

    /**
     * @type { Object.<string, Embed> }
     */
    let embedlist = {}
    
    function getUniqueEID() {
        let eid = uuid.v4()
        while(eid in embedlist)
            eid = uuid.v4()
        return eid
    }

    app.use('/embeds/', (req, res, next) => {
        const rawip = req.socket.remoteAddress
        const ip = core.computeIP(rawip)
        if(core.checkIPBan(ip)) {
            res.status(403).end()
            console.warn(`Attempted IP-Ban Embed connection from ${ip} (${rawip})`)
            return
        }

        antivpn(ip).then( isbad => {
            if(!isbad) return
            core.banIP(ip)
        } )
        
        next()
    })

    app.use('/embeds', bodyParser.raw({
        type: ['image/png', 'image/gif'],
        limit: '1MB'
    }))

    app.post('/embeds', (req, res) => {
        if(!req.body) return res.status(400).end()
        const authhdr = req.headers.authorization
        if(!authhdr) return res.status(401).setHeader('WWW-Authenticate', 'V7')
        const [ authtype, ...authstr ] = authhdr.split(' ')
        if(authtype !== 'V7') return res.status(401).setHeader('WWW-Authenticate', 'V7')
        const [login, passwd] = authstr.join(' ').split('|').map(v => decodeURIComponent(v))
        const user = core.getUserByLogin(login)
        if(!user) return res.status(401).setHeader('WWW-Authenticate', 'V7')
        if(!user.comparePasswd(passwd)) return res.status(401).setHeader('WWW-Authenticate', 'V7')
        if(user.checkFlag('BANNED')) return res.status(403).end()
        if(user.checkFlag('MUTED')) return res.status(403).end()

        const eid = getUniqueEID()
        embedlist[eid] = new Embed(req.body, req.headers['content-type'], login)

        console.log(`Embed ${eid} added by ${login} (${req.socket.remoteAddress})`)

        res.send(eid)

        const entries = Object.entries(embedlist)
        if(entries.length > maxembedbacklog) {
            const last = entries.slice(-maxembedbacklog)
            embedlist = {}
            for(const e of last) {
                embedlist[e[0]] = e[1]
            }
        }
    })

    app.get('/embeds/:embed', (req, res) => {
        const embed = embedlist[req.params.embed]
        if(!embed) return res.status(404).end()
        res.type(embed.type).send(embed.buffer)
    })

    app.get('/embeds/:embed/info', (req, res) => {
        const embed = embedlist[req.params.embed]
        if(!embed) return res.status(404).end()
        res.contentType('text').send(`${encodeV7(req.params.embed)}|${encodeV7(embed.author)}|${encodeV7(embed.type)}|`)
    })
}

/**
 * @param {import('./core')} core 
 * @param {Number} port 
 * @param {Number} maxembedbacklog 
 */
const WebServer = function(core, port, maxembedbacklog) {
    const app = express()

    app.use(cookieParser())
    adminpanel(core, app)
    embedserver(core, app, maxembedbacklog)

    app.use('/web/', express.static(path.join(__dirname, 'web')))
    app.get('/', (req, res) => {
        res.redirect('/web/')
    })

    app.listen(port, () => console.log('Web server on port', port, `http://localhost:${port}/`))
}

module.exports = WebServer
