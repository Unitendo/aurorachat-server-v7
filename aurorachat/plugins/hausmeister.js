/**
 * @param {import('../core')} core 
 * @param { {name: string} } config
 * @returns {Function} 
 */
function init(core, config) {
    /**
     * @param {import('../core').Message} msg 
     * @returns {import('../core').Message}
     */
    function onmessage(msg) {
        return msg
    }

    function log(...args) {
        console.log(config.name, ...args)
    }

    log('Loaded')

    return onmessage
}

module.exports = init
