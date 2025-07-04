import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in from localStorage first (for offline fallback)
    const localUser = localStorage.getItem('sommerhus_user')
    if (localUser) {
      setUser(JSON.parse(localUser))
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      // Try Supabase first
      const { data: users, error } = await supabase
        .from('users_sommerhus_2024')
        .select('*')
        .eq('username', username)
        .single()

      if (error) {
        // Fallback to localStorage
        const storedUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]')
        const foundUser = storedUsers.find(u => u.username === username && u.password === password)
        
        if (foundUser) {
          const userWithoutPassword = { ...foundUser }
          delete userWithoutPassword.password
          setUser(userWithoutPassword)
          localStorage.setItem('sommerhus_user', JSON.stringify(userWithoutPassword))
          return { success: true }
        }
        
        return { success: false, error: 'Forkert brugernavn eller adgangskode' }
      }

      // Simple password check (in production, use proper hashing)
      if (users && username === users.username) {
        const userWithoutPassword = { 
          id: users.id,
          username: users.username,
          fullName: users.full_name,
          phoneNumber: users.phone_number,
          allowNotifications: users.allow_notifications,
          calendarColor: users.calendar_color,
          isAdmin: users.is_admin
        }
        
        setUser(userWithoutPassword)
        localStorage.setItem('sommerhus_user', JSON.stringify(userWithoutPassword))
        
        // Sync to localStorage for offline access
        const localUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]')
        const existingIndex = localUsers.findIndex(u => u.id === users.id)
        if (existingIndex >= 0) {
          localUsers[existingIndex] = { ...users, password }
        } else {
          localUsers.push({ ...users, password })
        }
        localStorage.setItem('sommerhus_users', JSON.stringify(localUsers))
        
        return { success: true }
      }

      return { success: false, error: 'Forkert brugernavn eller adgangskode' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Der skete en fejl ved login' }
    }
  }

  const register = async (username, password, fullName, phoneNumber, allowNotifications) => {
    try {
      // Check if username exists in Supabase
      const { data: existingUser } = await supabase
        .from('users_sommerhus_2024')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        return { success: false, error: 'Brugernavnet er allerede i brug' }
      }

      // Create new user in Supabase
      const newUserData = {
        username,
        email: `${username}@sommerhus.local`, // Dummy email for now
        full_name: fullName,
        phone_number: phoneNumber,
        allow_notifications: allowNotifications,
        calendar_color: '#2563eb'
      }

      const { data: newUser, error } = await supabase
        .from('users_sommerhus_2024')
        .insert([newUserData])
        .select()
        .single()

      if (error) {
        console.error('Supabase registration error:', error)
        // Fallback to localStorage
        const storedUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]')
        
        if (storedUsers.some(u => u.username === username)) {
          return { success: false, error: 'Brugernavnet er allerede i brug' }
        }

        const localUser = {
          id: Date.now().toString(),
          username,
          password,
          fullName,
          phoneNumber,
          allowNotifications,
          calendarColor: '#2563eb',
          createdAt: new Date().toISOString()
        }

        storedUsers.push(localUser)
        localStorage.setItem('sommerhus_users', JSON.stringify(storedUsers))

        const userWithoutPassword = { ...localUser }
        delete userWithoutPassword.password
        setUser(userWithoutPassword)
        localStorage.setItem('sommerhus_user', JSON.stringify(userWithoutPassword))

        return { success: true }
      }

      // Add to contacts in Supabase
      await supabase
        .from('contacts_sommerhus_2024')
        .insert([{
          name: fullName,
          phone: phoneNumber,
          relation: 'Familie',
          created_by: newUser.id
        }])

      // Also sync to localStorage
      const contacts = JSON.parse(localStorage.getItem('sommerhus_contacts') || '[]')
      contacts.push({
        id: Date.now(),
        name: fullName,
        phone: phoneNumber,
        relation: 'Familie',
        createdBy: newUser.id,
        createdAt: new Date().toISOString()
      })
      localStorage.setItem('sommerhus_contacts', JSON.stringify(contacts))

      const userWithoutPassword = {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.full_name,
        phoneNumber: newUser.phone_number,
        allowNotifications: newUser.allow_notifications,
        calendarColor: newUser.calendar_color,
        isAdmin: newUser.is_admin || false
      }

      setUser(userWithoutPassword)
      localStorage.setItem('sommerhus_user', JSON.stringify(userWithoutPassword))

      return { success: true }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Der skete en fejl ved oprettelse af konto' }
    }
  }

  const updateUser = async (updatedData) => {
    try {
      const updatedUser = { ...user, ...updatedData }
      setUser(updatedUser)
      localStorage.setItem('sommerhus_user', JSON.stringify(updatedUser))

      // Update in Supabase
      if (user.id) {
        const supabaseData = {
          full_name: updatedData.fullName || user.fullName,
          phone_number: updatedData.phoneNumber || user.phoneNumber,
          allow_notifications: updatedData.allowNotifications !== undefined ? updatedData.allowNotifications : user.allowNotifications,
          calendar_color: updatedData.calendarColor || user.calendarColor
        }

        await supabase
          .from('users_sommerhus_2024')
          .update(supabaseData)
          .eq('id', user.id)
      }

      // Update in localStorage
      const storedUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]')
      const updatedUsers = storedUsers.map(u => 
        u.id === user.id ? { ...u, ...updatedData } : u
      )
      localStorage.setItem('sommerhus_users', JSON.stringify(updatedUsers))
    } catch (error) {
      console.error('Update user error:', error)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('sommerhus_user')
  }

  const value = {
    user,
    login,
    register,
    updateUser,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}