const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const ejs = require('ejs')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')

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
        const rendered = ejs.render(file, { req })
        res.send(rendered)
    })

    app.get('/adminpanel/login', (req, res) => {
        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'login.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req })
        res.send(rendered)
    })

    app.post('/adminpanel/login', (req, res) => {
        const {login, passwd} = req.body
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

        const {user: login} = req.query
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

        const {user: login} = req.body
        if(!login) {
            res.redirect(`/adminpanel/`)
            return
        }

        core.kickUser(login)

        res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)
    })

    app.post('/adminpanel/flags', (req, res) => {
        if(sessionCheck(req, res)) return

        const {user: login, flag, mode} = req.body
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

        const {user: login, banreason} = req.body
        res.redirect(`/adminpanel/user?user=${encodeURIComponent(login)}`)

        const user = core.getUserByLogin(login)
        if(!user) return

        user.banreason = banreason ? banreason : ''
    })

    app.post('/adminpanel/deleteuser', (req, res) => {
        if(sessionCheck(req, res)) return

        const {user: login, safety} = req.body
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

    app.get('/adminpanel/ip', (req, res) => {
        if(sessionCheck(req, res)) return

        const {ip} = req.query
        if(!ip) {
            res.redirect('/adminpanel/')
            return
        }

        const users = core.getUsersByIP(ip)

        const file = fs.readFileSync(path.join(__dirname, 'adminpanel', 'ip.ejs'), 'utf-8')
        const rendered = ejs.render(file, { req, users })
        res.send(rendered)
    })

    app.post('/adminpanel/bcrypt', (req, res) => {
        if(sessionCheck(req, res)) return

        const {passwd} = req.body
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
 * @param {Number} port 
 */
const WebServer = function(core, port) {
    const app = express()

    app.use(cookieParser())
    adminpanel(core, app)

    app.use('/web/', express.static(path.join(__dirname, 'web')))
    app.get('/', (req, res) => {
        res.redirect('/web/')
    })

    app.listen(port, () => console.log('Web server on port', port))
}

module.exports = WebServer
