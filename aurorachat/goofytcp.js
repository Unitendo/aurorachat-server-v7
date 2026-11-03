const net = require('net')
const v7 = require('./v7')
const antivpn = require('./antivpn')
// Made for a certain in development client that doesn't work well with non-terminating TCP.
/**
 * @param {import('./core')} core 
 * @param {Number} port
 */
const GoofyTCPServer = function(core, port) {
    const server = net.createServer(socket => {
        const rawip = socket.remoteAddress
        const ip = core.computeIP(rawip)
        if(core.checkIPBan(ip)) {
            socket.end(`ipbanned|\n`)
            console.warn(`Attempted IP-Ban connection from ${ip} (${rawip})`)
            return
        }

        let responseBuffer = []
        const client = core.connect(ip, msg => {
            responseBuffer.push(`msg|${v7.encodeV7(msg.author)}|${v7.encodeV7(msg.content)}|\n`)
        }, () => {
            socket.destroy()
        })

        antivpn(ip).then(isbad => {
            if(!isbad) return
            client.disconnect()
            socket.destroy()
            core.banIP(ip)
        })

        socket.on('data', data => {
            try {
                const msgs = data.toString('utf-8').trim().split('\n')
                let replyOutput = `hello|v7|${v7.encodeV7(core.servername)}|\n`

                for(const msg of msgs) {
                    const [command, ...args] = msg.split('|').map(v => decodeURIComponent(v).trim())
                    switch(command) {
                        case 'history': {
                            const [rawsize] = args
                            let size = 0
                            if(rawsize) size = parseInt(rawsize)
                            if(isNaN(size)) size = 0
                            if(size < 0) size = 0

                            let histMsgs = client.getRoomHistory().map(msg => `msg|${v7.encodeV7(msg.author)}|${v7.encodeV7(msg.content)}|\n`).join('')
                            if(size) histMsgs = histMsgs.slice(-size)
                            replyOutput += histMsgs
                        } break

                        default: {
                            const response = v7(client, command, args)
                            if(response)
                                replyOutput += response.map(v => v7.encodeV7(v)).join('|') + '|\n'
                        }
                    }
                }

                if(responseBuffer.length > 0) {
                    replyOutput += responseBuffer.join('')
                }

                
                socket.end(replyOutput, () => {
                    client.disconnect()
                })
            } catch(e) {
                console.error(e)
                socket.end(`err|unknown_internal|\n`, () => {
                    client.disconnect()
                })
            }
        })

        socket.on('error', e => {
            client.disconnect()
            socket.destroy()
        })
    })

    server.listen(port, () => console.log('goofy ahh TCP server on port', port))
}

module.exports = GoofyTCPServer