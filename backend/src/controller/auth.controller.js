const User = require('../models/User')
const Blacklist = require('../models/blacklist.model')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

function getCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL) ||
    (process.env.frontendurl && process.env.frontendurl.startsWith('https://'))

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}

async function register(req, res) {
  try {
    const { name, username, email, password } = req.body
    const userName = (name || username || '').trim()

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    const conditions = [{ email }]
    if (userName) {
      conditions.push({ name: userName })
    }

    const existingUser = await User.findOne({
      $or: conditions
    })

    if (existingUser) {
      return res.status(409).json({
        message: 'Email or name is already registered'
      })
    }

    const hshpass = await bcrypt.hash(password, 10)

    const user = await User.create({
      name: userName,
      email,
      passwordHash: hshpass
    })

    const jwtSecret = process.env.JWT_SECRET || process.env.jwtkey || 'default_jwt_secret'
    const token = jwt.sign(
      { id: user._id },
      jwtSecret,
      { expiresIn: '1d' }
    )

    res.cookie('token', token, getCookieOptions())

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    return res.status(500).json({
      message: error.message
    })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const isvalid = await bcrypt.compare(
      password,
      user.passwordHash
    )

    if (!isvalid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const jwtSecret = process.env.JWT_SECRET || process.env.jwtkey || 'default_jwt_secret'
    const token = jwt.sign(
      { id: user._id },
      jwtSecret,
      { expiresIn: '1d' }
    )

    res.cookie('token', token, getCookieOptions())

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    return res.status(500).json({
      message: error.message
    })
  }
}

async function logout(req, res) {
  try {
    const token = req.cookies?.token
    if (token) {
      const decoded = jwt.decode(token)
      if (decoded?.exp) {
        await Blacklist.create({
          token,
          expiresAt: new Date(decoded.exp * 1000)
        })
      }
    }

    res.clearCookie('token', getCookieOptions())
    return res.status(200).json({
      message: 'Logout successfully'
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

async function getme(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json({
      message: 'User details fetched successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  register,
  login,
  logout,
  getme
}
