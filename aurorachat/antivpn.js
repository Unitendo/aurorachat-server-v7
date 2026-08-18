const { Address6 } = require('ip-address')

const goodlist = [
    '127.0.0.1', '::1'
]

/**
 * @param {String} ip 
 * @returns {Promise<Boolean>}
 */
module.exports = async function(ip) {
    const ipobj = new Address6(ip)
    if(ipobj.isMapped4()) {
        const v = ipobj.getBits(96, 128)
        ip = `${v >> BigInt(24)}.${(v >> BigInt(16)) & BigInt(255)}.${(v >> BigInt(8)) & BigInt(255)}.${v & BigInt(255)}`
    }

    if(goodlist.includes(ip)) {
        console.log(`IP ${ip} was in IP Safelist`)
        return false
    }

    const res = await fetch(`https://geoiphub.com/api/lookup/${ip}`)
    const data = await res.json()
    const { detection } = data
    const { is_proxy, is_vpn, is_tor, is_hosting } = detection

    const isbad = is_proxy || is_vpn || is_tor || is_hosting

    if(!isbad)
        goodlist.push(ip)

    console.log(`IP ${ip} was IPChecked and was deemed ${isbad ? 'bad' : 'safe'}`)

    return isbad
}
