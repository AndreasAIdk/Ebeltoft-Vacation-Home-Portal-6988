import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import SafeIcon from '../../common/SafeIcon'
import * as FiIcons from 'react-icons/fi'
import toast from 'react-hot-toast'

const { FiShield, FiUsers, FiDatabase, FiDownload, FiUpload, FiTrash2, FiSettings, FiBarChart3 } = FiIcons

const AdminPanel = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.isAdmin) {
      loadAdminData()
    }
  }, [user])

  const loadAdminData = async () => {
    try {
      // Load users
      const { data: usersData } = await supabase
        .from('users_sommerhus_2024')
        .select('*')
        .order('created_at', { ascending: false })

      setUsers(usersData || [])

      // Load stats
      const [messagesCount, photosCount, bookingsCount] = await Promise.all([
        supabase.from('messages_sommerhus_2024').select('id', { count: 'exact' }),
        supabase.from('photos_sommerhus_2024').select('id', { count: 'exact' }),
        supabase.from('bookings_sommerhus_2024').select('id', { count: 'exact' })
      ])

      setStats({
        totalUsers: usersData?.length || 0,
        totalMessages: messagesCount.count || 0,
        totalPhotos: photosCount.count || 0,
        totalBookings: bookingsCount.count || 0
      })

      // Load backups
      const { data: backupsData } = await supabase
        .from('backups_sommerhus_2024')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setBackups(backupsData || [])
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
  }

  const createBackup = async () => {
    setLoading(true)
    try {
      // Collect all data
      const [users, contacts, bookings, messages, replies, photos, comments, posts, checklist, checkins, notifications] = await Promise.all([
        supabase.from('users_sommerhus_2024').select('*'),
        supabase.from('contacts_sommerhus_2024').select('*'),
        supabase.from('bookings_sommerhus_2024').select('*'),
        supabase.from('messages_sommerhus_2024').select('*'),
        supabase.from('message_replies_sommerhus_2024').select('*'),
        supabase.from('photos_sommerhus_2024').select('*'),
        supabase.from('photo_comments_sommerhus_2024').select('*'),
        supabase.from('blog_posts_sommerhus_2024').select('*'),
        supabase.from('checklist_items_sommerhus_2024').select('*'),
        supabase.from('checkins_sommerhus_2024').select('*'),
        supabase.from('notifications_sommerhus_2024').select('*')
      ])

      const backupData = {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        tables: {
          users: users.data || [],
          contacts: contacts.data || [],
          bookings: bookings.data || [],
          messages: messages.data || [],
          message_replies: replies.data || [],
          photos: photos.data || [],
          photo_comments: comments.data || [],
          blog_posts: posts.data || [],
          checklist_items: checklist.data || [],
          checkins: checkins.data || [],
          notifications: notifications.data || []
        }
      }

      // Save backup to database
      const backupName = `Backup_${new Date().toLocaleDateString('da-DK')}_${new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`
      
      const { error } = await supabase
        .from('backups_sommerhus_2024')
        .insert([{
          name: backupName,
          data: backupData,
          created_by: user.id
        }])

      if (error) throw error

      // Also create downloadable file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${backupName}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Backup oprettet og downloadet!')
      loadAdminData()
    } catch (error) {
      console.error('Backup error:', error)
      toast.error('Fejl ved oprettelse af backup')
    }
    setLoading(false)
  }

  const downloadBackup = async (backup) => {
    try {
      const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${backup.name}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Backup downloadet!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Fejl ved download af backup')
    }
  }

  const deleteBackup = async (backupId) => {
    try {
      const { error } = await supabase
        .from('backups_sommerhus_2024')
        .delete()
        .eq('id', backupId)

      if (error) throw error

      toast.success('Backup slettet')
      loadAdminData()
    } catch (error) {
      console.error('Delete backup error:', error)
      toast.error('Fejl ved sletning af backup')
    }
  }

  const toggleUserAdmin = async (userId, isCurrentlyAdmin) => {
    try {
      const { error } = await supabase
        .from('users_sommerhus_2024')
        .update({ is_admin: !isCurrentlyAdmin })
        .eq('id', userId)

      if (error) throw error

      toast.success(isCurrentlyAdmin ? 'Admin rettigheder fjernet' : 'Admin rettigheder tildelt')
      loadAdminData()
    } catch (error) {
      console.error('Toggle admin error:', error)
      toast.error('Fejl ved ændring af admin status')
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <SafeIcon icon={FiShield} className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Adgang nægtet</h2>
          <p className="text-gray-600">Du har ikke admin rettigheder til denne sektion.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <SafeIcon icon={FiShield} className="w-8 h-8 text-ebeltoft-blue" />
          <div>
            <h1 className="text-2xl font-bold text-ebeltoft-dark">Admin Panel</h1>
            <p className="text-gray-600">Administrer brugere, data og backups</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <SafeIcon icon={FiUsers} className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <div className="text-sm text-blue-600">Brugere</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <SafeIcon icon={FiBarChart3} className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{stats.totalMessages}</div>
            <div className="text-sm text-green-600">Beskeder</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <SafeIcon icon={FiDatabase} className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">{stats.totalPhotos}</div>
            <div className="text-sm text-purple-600">Billeder</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <SafeIcon icon={FiSettings} className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">{stats.totalBookings}</div>
            <div className="text-sm text-orange-600">Bookinger</div>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-ebeltoft-dark mb-4 flex items-center gap-2">
          <SafeIcon icon={FiUsers} className="w-6 h-6" />
          Brugerstyring
        </h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${u.is_admin ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <div>
                  <div className="font-medium text-gray-800">{u.full_name}</div>
                  <div className="text-sm text-gray-600">@{u.username} • {u.phone_number}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.is_admin && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    Admin
                  </span>
                )}
                {u.id !== user.id && (
                  <button
                    onClick={() => toggleUserAdmin(u.id, u.is_admin)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      u.is_admin
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {u.is_admin ? 'Fjern admin' : 'Gør til admin'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup Management */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ebeltoft-dark flex items-center gap-2">
            <SafeIcon icon={FiDatabase} className="w-6 h-6" />
            Backup Management
          </h2>
          <motion.button
            onClick={createBackup}
            disabled={loading}
            className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiDownload} className="w-4 h-4" />
            {loading ? 'Opretter...' : 'Opret backup'}
          </motion.button>
        </div>

        <div className="space-y-3">
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <SafeIcon icon={FiDatabase} className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Ingen backups endnu. Opret din første backup for at sikre dine data.</p>
            </div>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">{backup.name}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(backup.created_at).toLocaleDateString('da-DK')} kl. {new Date(backup.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadBackup(backup)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">📋 Backup Information</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Backups inkluderer alle brugere, beskeder, billeder og bookinger</li>
            <li>• Backups gemmes både i databasen og downloades lokalt</li>
            <li>• Anbefaling: Opret backup ugentligt eller før større ændringer</li>
            <li>• Gamle backups kan slettes for at spare plads</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel