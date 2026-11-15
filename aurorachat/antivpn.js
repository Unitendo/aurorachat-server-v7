require('dns').setDefaultResultOrder('ipv4first');
const { Address6 } = require('ip-address')
const fs = require('fs')
const path = require('path')

const goodlist = [
    '127.0.0.1', '::1'
]

const GOODLISTPATH = path.join(__dirname, 'data', 'goodlist.json')

try {
    if(!fs.existsSync(GOODLISTPATH))
        fs.writeFileSync(GOODLISTPATH, '[]')

    const data = JSON.parse(fs.readFileSync(GOODLISTPATH, 'utf-8'))
    for(const ip of data) {
        if(!goodlist.includes(ip)) goodlist.push(ip)
    }
} catch(e) {
    console.warn(e, 'Could not load goodlist!')
}

/**
 * @param {String} ip 
 * @returns {Promise<Boolean>}
 */
module.exports = async function(ip) {
    try {
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
        const { asn, detection } = data
        const { is_proxy, is_vpn, is_tor, is_hosting } = detection

        const isbad = is_proxy || is_vpn || is_tor || is_hosting || (asn["org"] == "CLOUDFLARENET - Cloudflare, Inc.")

        if(!isbad)
            goodlist.push(ip)

        console.log(`IP ${ip} was IPChecked and was deemed ${isbad ? 'bad' : 'safe'}`)

        return isbad
    } catch(e) {
        console.warn(e, `IP Checker failed on IP ${ip}. Allowing as fallback`)
        return false
    }
}
