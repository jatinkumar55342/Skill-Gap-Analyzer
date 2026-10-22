const mongoose = require("mongoose")
const dns=require('dns')

dns.setServers(['8.8.8.8','8.8.4.4'])

async function connectDB() {
    if (mongoose.connection.readyState >= 1) {
        return
    }
    const uri = process.env.dbkey
    await mongoose.connect(uri)
    console.log("DB has connected successfully")
}

module.exports = connectDB
