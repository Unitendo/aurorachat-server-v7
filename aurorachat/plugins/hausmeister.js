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
     * @param {import('../core').Message} msg 
     * @param {import('../core').CoreClient} client 
     * @returns {import('../core').Message}
     */
    function onmessage(msg, client) {
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
`
                    })
                break

                case 'implode':
                    core.send({
                        author: config.name,
                        room: msg.room,
                        content: `${msg.author} has imploded!`
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
