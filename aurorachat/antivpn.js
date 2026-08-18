const goodlist = [
    '::ffff:7f00:1', '::1'
]

/**
 * @param {String} ip 
 * @returns {Promise<Boolean>}
 */
module.exports = async function(ip) {
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
