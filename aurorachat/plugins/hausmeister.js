/**
 * @param {import('../core')} core 
 * @param { {name: string, prefix: string} } config
 * @returns {Function} 
 */
function init(core, config) {
    /**
     * @param {String} m
     * @returns {String | undefined} 
     */
    function filterPrefix(m) {
        if(!m.startsWith(config.prefix)) return undefined
        return m.substring(config.prefix.length + 1)
    }
    
    /**
     * @typedef { { author: string, content: string } } Bulletin
     */

    /**
     * @type { Object.<string, Bulletin[] | undefined> }
     */
    const bulletins = {}

    function postBulletin(author, room, content) {
        if(!(room in bulletins))
            bulletins[room] = []
        bulletins[room].push({author, content})
        bulletins[room] = bulletins[room].slice(-config.bulletinLimit)
    }

    /**
     * @param {import('../core').Message} msg 
     * @param {import('../core').CoreClient} client 
     * @returns {import('../core').Message}
     */
    function onmessage(msg, client) {
        if(msg.author === config.name) return msg
        if(msg.content === config.prefix) {
            client.onsend({
                author: config.name,
                content: `${msg.author}, use ${config.prefix} help for a command list.`
            })
            return undefined
        }
        const m = filterPrefix(msg.content)
        if(m) {
            const [command, ...args] = m.split(' ')
            switch(command) {
                case 'help': 
                    client.onsend({
                        author: config.name,
                        content: `Commands available:
help - Shows this
implode - Implodes you
online - Shows how many clients are online
post <content> - Post a bulletin to the room's bulletin board
viewposts - View posts on the room's bulletin board
`
                    })
                break

                case 'implode':
                    core.pluginSend({
                        author: config.name,
                        room: msg.room,
                        content: `${msg.author} has imploded!`
                    })
                break

                case 'online': 
                    client.onsend({
                        author: config.name,
                        content: core.clients.length === 1 ? 'There is 1 client online.' : `There are ${core.clients.length} clients online.`
                    })
                break

                case 'post':
                    postBulletin(msg.author, msg.room, args.join(' ').replaceAll('\n', '\\n'))
                    client.onsend({
                        author: config.name,
                        content: 'Done, use !haus viewposts to see the bulletin board.'
                    })
                break

                case 'viewposts':
                    const board = bulletins[msg.room]
                    if(!board) {
                        client.onsend({
                            author: config.name,
                            content: 'The bulletin board is empty!'
                        })
                        break
                    }

                    const data = board.map(b => `${b.author} : ${b.content}`).join('\n')

                    client.onsend({
                        author: config.name,
                        content: data
                    })
                break

                default:
                    client.onsend({
                        author: config.name,
                        content: `Unknown command "${command}", use ${config.prefix} help for a command list.`
                    })
            }
            return undefined
        }
        return msg
    }

    function log(...args) {
        console.log(config.name, ...args)
    }

    log('Loaded')

    return onmessage
}

module.exports = init
