/**
 * @param {String} n 
 * @returns {String}
 */
function encodeV7(n) {
    if(!n) return ''
    return n.replaceAll('%', '%25').replaceAll('|', '%7C').replaceAll('\n', '%0A')
}

/**
 * @param {import('./core').CoreClient} client
 * @param {String} command
 * @param {String[]} args
 * 
 * @returns {undefined | String[]}
 */
function parseV7Command(client, command, args) {
    switch(command.toLocaleLowerCase()) {
        case 'login': {
            if(args.length < 2) return ['err', 'args_bad']
            const [login, passwd] = args
            const err = client.login(login, passwd)
            if(err)
                return ['err', ...err]
            return ['ok']
        }

        case 'register': {
            if(args.length < 2) return ['err', 'args_bad']
            const [login, passwd] = args
            const err = client.register(login, passwd)
            if(err)
                return ['err', ...err]
            return ['ok']
        }

        case 'rules': {
            return ['rules', client.getServerRules()]
        }

        case 'join':
            if(args.length < 1) return ['err', 'args_bad']
            const [room] = args
            client.room = room
        break

        case 'part':
            client.room = undefined
        break

        case 'msg':
            if(args.length < 1) return ['err', 'args_bad']
            const [msg] = args
            client.send(msg)
        break

        default:
            return ['err', 'command_unknown']
    }
}

module.exports = parseV7Command
module.exports.encodeV7 = encodeV7
