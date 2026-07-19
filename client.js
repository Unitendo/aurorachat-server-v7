const net = require('net')

const IP = '127.0.0.1'
const PORT = require('./config').TCP_PORT

const LOGIN = 'jakub'
const PASSWD = 'gaming'
const ROOM = 'general'

const socket = net.createConnection(PORT, IP)

socket.on('close', () => process.exit())

socket.on('data', data => {
    console.log(data.toString('utf-8').trim())
})

socket.write(`login|${LOGIN}|${PASSWD}|\njoin|${ROOM}|\nhistory|\n`)

process.stdin.on('data', data => {
    socket.write(`msg|${encodeURIComponent(data.toString('utf-8'))}|`)
})
