import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMe, logoutUser } from '../api/auth.api'

/* ─── Context ─────────────────────────────────────────────── */

const AuthContext = createContext(null)

/* ─── Provider ────────────────────────────────────────────── */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)         // { id, name, email }
  const [loading, setLoading] = useState(true) // true only during initial session check

  // Global auth form fields and their updater methods
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const resetAuthForm = () => {
    setUsername('')
    setEmail('')
    setPassword('')
  }

  /* user session state */

  /* logout is global — clears user everywhere */
  const logout = async () => {
    await logoutUser()
    setUser(null)
    resetAuthForm()
  }

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    logout,
    handleLogout: logout,
    // Global form fields and methods
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    resetAuthForm,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ─── Hook ────────────────────────────────────────────────── */

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default AuthContext
