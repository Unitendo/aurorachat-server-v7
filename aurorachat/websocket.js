const ws = require('ws')
const v7 = require('./v7')

/**
 * @param {import('./core')} core 
 * @param {Number} port 
 * @param {string} servername
 */
const WSServer = function(core, port, servername) {
    const server = new ws.WebSocketServer({
        port
    }, () => console.log('WS server on port', port))
    
    server.on('connection', (socket, req) => {
        const rawip = req.socket.remoteAddress
        const ip = core.computeIP(rawip)
        if(core.checkIPBan(ip)) {
            socket.send('ipbanned|\n')
            socket.close()
            console.warn(`Attempted IP-Ban connection from ${ip} (${rawip})`)
            return
        }

        console.log(`Connection from ${ip} (${rawip})`)
        
        const client = core.connect(ip, msg => {
            socket.send(`msg|${v7.encodeV7(msg.author)}|${v7.encodeV7(msg.content)}|\n`)
        })

        socket.on('close', code => {
            client.disconnect()
            console.log(`Goodbye ${ip} (${rawip})`)
        })

        socket.on('message', data => {
            const msg = data.toString('utf-8').trim()
            const [command, ...args] = msg.split('|').map(v => decodeURIComponent(v).trim())
            switch(command) {
                case 'history': {
                    const [rawsize] = args
                    let size = 0
                    if(rawsize) 
                        size = parseInt(rawsize)
                    if(size == NaN) size = 0
                    if(size < 0) size = 0

                    let msgs = client.getRoomHistory().map(msg => `msg|${v7.encodeV7(msg.author)}|${v7.encodeV7(msg.content)}|\n`).join('')
                    if(size) msgs = msgs.slice(-size)

                    socket.send(msgs)
                } break

                default: {
                    const response = v7(client, command, args)
                    if(response)
                        socket.send(response.map(v => v7.encodeV7(v)).join('|') + '|\n')
                }
            }
        })

        socket.send(`hello|v7|${v7.encodeV7(servername)}|\n`)
    })
}

module.exports = WSServer
