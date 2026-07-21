window.addEventListener('load', e => {
    let mode = 'login'

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

                case 'msg':
                    onMessage(...args)
                break
            }
        }
    })

    socket.addEventListener('close', e => {
        if(mode === 'badprotocol') return
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

    function onMessage(author, msg) {
        const msgdiv = document.createElement('div')
        const authordiv = document.createElement('div')
        const contentdiv = document.createElement('div')

        msgdiv.classList.add('msg')
        authordiv.classList.add('msg-author')
        contentdiv.classList.add('msg-content')

        authordiv.innerText = author
        contentdiv.innerText = msg

        msgdiv.append(authordiv, contentdiv)
        messagesdiv.append(msgdiv)

        messagesdiv.scrollTop = messagesdiv.scrollHeight
    }

    function clearMessages() {
        messagesdiv.innerHTML = ''
    }

    const welcomediv = document.getElementById('welcome')
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

    document.getElementById('welcome-login').addEventListener('click', e => {
        welcomediv.style.display = 'none'
        loginform.style.display = 'inherit'
    })

    document.getElementById('welcome-register').addEventListener('click', e => {
        welcomediv.style.display = 'none'
        registerform.style.display = 'inherit'
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
})
