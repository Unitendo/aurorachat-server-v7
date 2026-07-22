const net = require('net')
const v7 = require('./v7')

/**
 * @param {import('./core')} core 
 * @param {Number} port 
 * @param {string} servername
 */
const TCPServer = function(core, port, servername) {
    const server = net.createServer(socket => {
        const rawip = socket.address().address
        const ip = core.computeIP(rawip)
        if(core.checkIPBan(ip)) {
            socket.write(`ipbanned|\n`)
            socket.destroy()
            console.warn(`Attempted IP-Ban connection from ${ip} (${rawip})`)
            return
        }

        console.log(`Connection from ${ip} (${rawip})`)

        const client = core.connect(ip, msg => {
            socket.write(`msg|${v7.encodeV7(msg.author)}|${v7.encodeV7(msg.content)}|\n`)
        }, () => {
            socket.destroy()
        })

        socket.on('close', err => {
            client.disconnect()
            console.log(`Goodbye ${ip} (${rawip})`)
        })

        socket.on('data', data => {
            const msgs = data.toString('utf-8').trim().split('\n')
            for(const msg of msgs) {
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

                        socket.write(msgs)
                    } break

                    default: {
                        const response = v7(client, command, args)
                        if(response)
                            socket.write(response.map(v => v7.encodeV7(v)).join('|') + '|\n')
                    }
                }
            }
        })

        socket.on('error', e => {
            console.error(e, `Error on ${ip} (${rawip})`)
            client.disconnect()
            socket.destroy()
        })

        socket.write(`hello|v7|${v7.encodeV7(servername)}|\n`)
    } )
    server.listen(port, () => console.log('TCP server on port', port))
}

module.exports = TCPServer
