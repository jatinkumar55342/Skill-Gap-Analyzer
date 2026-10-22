const mongoose = require('mongoose')

const blacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
})

module.exports = mongoose.model('Blacklist', blacklistSchema)
