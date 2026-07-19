#!/bin/env node

const fs = require('fs')
const uuid = require('uuid').v4
const ip = require('ip-address')

/**
 * @param {String} rawip 
 * @returns {String}
 */
function computeIP(rawip) {
    const a = new ip.Address6(rawip)
    return a.correctForm()
}

if(process.argv.length < 3) {
    console.log('Usage: convertv6users.js <v6userfile.json>')
    process.exit(1)
}

const file = process.argv[2]
const v6users = JSON.parse(fs.readFileSync(file, 'utf-8')).users

const v7users = []

for(const u of v6users) {
    const a = computeIP(u.ip)

    const v = {
        uid: uuid(),
        login: u.username,
        passwd: u.password,
        flags: [],
        banreason: u.banReason ? u.banReason : '',
        createIP: a,
        loginIP: a
    }

    if(u.banned) v.flags.push('BANNED')
    if(u.banned) v.flags.push('MUTED')

    v7users.push(v)
}

const v7data = {users: v7users, ipbans: []}

console.log(JSON.stringify(v7data))
