// Orstando's Jackbot Plugin

/**
 * 
 * @param {import('../core')} core 
 * @param { { name: String } } config 
 * @returns 
 */

function init(core, config) {
    /**
     * 
     * @param {import('../core').Message} msg
     * @param {*} client 
     * @returns 
     */
    function onmessage(msg, client) {
        if(msg.author === config.name) return msg
        if(msg.content.includes("jack")) {
            setTimeout(()=>{
                core.pluginSend({
                    author: config.name,
                    room: msg.room,
                    content: "im jacking you."
                })
            }, 1)
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
