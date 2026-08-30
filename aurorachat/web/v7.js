window.addEventListener('load', e => {
    let mode = 'login'
    const credentials = {
        login: '', passwd: ''
    }

    const urlregex = /(https?:\/\/[^\s]+)/g
    // ^ This probably sucks, but it should work well enough
    const embed_endpoint = '/embeds'

    const socket = new WebSocket(`ws://${location.hostname}:7071/`)
    socket.addEventListener('message', e => {
        const msgs = e.data.trim().split('\n')
        for(const msg of msgs) {
            const [command, ...args] = msg.split('|').map(v => decodeURIComponent(v).trim())
            console.log(command, args)
            switch(command) {
                case 'err':
                    switch(mode) {
                        case 'login': {
                            alert(args.join('\n').trim())
                            location.reload()
                        } break
                    }
                break

                case 'ok':
                    switch(mode) {
                        case 'login': {
                            joinRoom('general')

                            loginform.style.display = 'none'
                            registerform.style.display = 'none'
                            chatui.style.display = 'flex'
                        } break
                    }
                break

                case 'hello': {
                    if(args[0].toLowerCase() !== 'v7') {
                        alert('This server is not a v7 server!')
                        mode = 'badprotocol'
                        socket.close()
                    }
                    servernamediv.innerText = args[1]
                } break

                case 'ipbanned': {
                    mode = 'ipbanned'
                } break

                case 'msg':
                    onMessage(...args)
                break

                case 'rules': { 
                    const [ rules ] = args
                    rulespage.style.display = 'inherit'
                    rulesdiv.innerText = rules
                } break

                case 'motd': {
                    const [ motd ] = args
                    alert(`Message of the day:\n\n${motd}`)
                } break
            }
        }
    })

    socket.addEventListener('close', e => {
        if(mode === 'badprotocol') return
        if(mode === 'ipbanned') {
            welcomediv.innerHTML = `<h1>You're IP-Banned.</h1>`
            return
        }
        location.reload()
    })

    /**
     * @param {String} n 
     * @returns {String}
     */
    function encodeV7(n) {
        if(!n) return ''
        return n.replaceAll('%', '%25').replaceAll('|', '%7C').replaceAll('\n', '%0A')
    }

    function sendV7(data) {
        socket.send(data.map(v => encodeV7(v)).join('|') + '|\n')
    }

    function tryLogin(cmd, login, passwd) {
        sendV7([cmd, login, passwd])
        credentials.login = login
        credentials.passwd = passwd
    }

    function sendMsg(msg) {
        sendV7(['msg', msg])
    }

    function joinRoom(room) {
        sendV7(['join', room])
        clearMessages()
        sendV7(['history'])
        document.getElementById('room').value = room
    }

    function getMOTD() {
        sendV7(['motd'])
    }

    function urlify(text) {
        return text.replace(urlregex, '<a href="$1" target="_blank">$1</a>')
    }

    function onMessage(author, msg) {
        const msgdiv = document.createElement('div')
        const authordiv = document.createElement('div')
        const contentdiv = document.createElement('div')

        msgdiv.classList.add('msg')
        authordiv.classList.add('msg-author')
        contentdiv.classList.add('msg-content')

        authordiv.innerText = author
        contentdiv.innerText = msg
        contentdiv.innerHTML = urlify(contentdiv.innerHTML)

        msgdiv.append(authordiv, contentdiv)

        try {
            const embedurl = new URL(msg)
            if(embedurl.host !== window.location.host) return
            if(!embedurl.pathname.startsWith(embed_endpoint)) return
            
            const img = new Image()
            img.src = embedurl.href
            img.className = 'embedimg'
            msgdiv.append(img)
        } catch(e) {} // not a link or embed

        messagesdiv.append(msgdiv)

        messagesdiv.scrollTop = messagesdiv.scrollHeight
    }

    function clearMessages() {
        messagesdiv.innerHTML = ''
    }

    const welcomediv = document.getElementById('welcome')
    const rulespage = document.getElementById('rulespage')
    const rulesdiv = document.getElementById('rules')
    /**
     * @type {HTMLFormElement}
     */
    const loginform = document.getElementById('loginform')
    const registerform = document.getElementById('registerform')
    const chatui = document.getElementById('chatui')
    const messagesdiv = document.getElementById('messages')
    /**
     * @type {HTMLFormElement}
     */
    const msginput = document.getElementById('msginput')
    /**
     * @type {HTMLFormElement}
     */
    const roominput = document.getElementById('roominput')
    const servernamediv = document.getElementById('servername')
    const motdbtn = document.getElementById('motdbtn')
    const embedbtn = document.getElementById('embedbtn')

    document.getElementById('welcome-login').addEventListener('click', e => {
        welcomediv.style.display = 'none'
        loginform.style.display = 'inherit'
        sendV7(['rules'])
    })

    document.getElementById('welcome-register').addEventListener('click', e => {
        welcomediv.style.display = 'none'
        registerform.style.display = 'inherit'
        sendV7(['rules'])
    })

    document.getElementById('rulesclose').addEventListener('click', e => {
        rulespage.style.display = 'none'
    })

    loginform.addEventListener('submit', e => {
        e.preventDefault()
        const {login, passwd} = loginform.elements
        tryLogin('login', login.value, passwd.value)
        passwd.value = ''
    })

    registerform.addEventListener('submit', e => {
        e.preventDefault()
        const {login, passwd, passwd2} = registerform.elements
        if(passwd.value !== passwd2.value) {
            alert('Passwords must match!')
            passwd.value = ''
            passwd2.value = ''
            return
        }
        tryLogin('register', login.value, passwd.value)
        passwd.value = ''
        passwd2.value = ''
    })

    msginput.addEventListener('submit', e => {
        e.preventDefault()
        const {msg} = msginput.elements
        sendMsg(msg.value)
        msg.value = ''
    })

    roominput.addEventListener('submit', e => {
        e.preventDefault()
        const {room} = roominput.elements
        joinRoom(room.value)
    })

    motdbtn.addEventListener('click', () => {
        getMOTD()
    })

    embedbtn.addEventListener('click', () => {
        const fileinput = document.createElement('input')
        fileinput.type = 'file'
        fileinput.accept = 'image/png,image/gif'

        fileinput.addEventListener('change', async e => {
            try {
                const files = fileinput.files
                if(!files) return
                const [file] = files
                const buffer = await file.arrayBuffer()
                const res = await fetch(embed_endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': file.type,
                        'Authorization': `V7 ${encodeV7(credentials.login)}|${encodeV7(credentials.passwd)}|`
                    },
                    body: buffer
                })
                if(res.status !== 200)
                    return alert(`Upload request gave status code ${res.status}`)
                const eid = await res.text()
                const embedlink = new URL(`${embed_endpoint}/${eid}`, window.location)
                sendMsg(embedlink.href)
            } catch(e) {
                alert(e)
            }
        })

        fileinput.click()
    })
})
