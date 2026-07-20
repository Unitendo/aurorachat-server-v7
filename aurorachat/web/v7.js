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
                            chatui.style.display = 'flex'
                        } break
                    }
                break

                case 'msg':
                    onMessage(...args)
                break
            }
        }
    })

    socket.addEventListener('open', e => {
        welcomediv.style.display = 'none'
        socket.send('login|jakub|gaming|')
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
        messagesdiv.innerText += `<${author}> ${msg.replaceAll('\n', '    \n')}\n`
    }

    function clearMessages() {
        messagesdiv.innerHTML = ''
    }

    const welcomediv = document.getElementById('welcome')
    /**
     * @type {HTMLFormElement}
     */
    const loginform = document.getElementById('loginform')
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

    document.getElementById('welcome-login').addEventListener('click', e => {
        welcomediv.style.display = 'none'
        loginform.style.display = 'inherit'
    })

    loginform.addEventListener('submit', e => {
        e.preventDefault()
        const {login, passwd} = loginform.elements
        tryLogin('login', login.value, passwd.value)
        passwd.value = ''
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
