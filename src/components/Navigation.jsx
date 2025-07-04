import React from 'react'
import {motion} from 'framer-motion'
import {useAuth} from '../contexts/AuthContext'
import SafeIcon from '../common/SafeIcon'
import NotificationCenter from './Notifications/NotificationCenter'
import * as FiIcons from 'react-icons/fi'

const {FiMessageCircle,FiCalendar,FiCheckSquare,FiUsers,FiCamera,FiBook,FiSettings,FiShield} = FiIcons

const Navigation = ({activeTab, setActiveTab}) => {
  const {user} = useAuth()

  const tabs = [
    {id: 'beskedvaeg', label: 'Beskedvæg', icon: FiMessageCircle},
    {id: 'kalender', label: 'Kalender', icon: FiCalendar},
    {id: 'tjekliste', label: 'Tjekliste', icon: FiCheckSquare},
    {id: 'kontakt', label: 'Kontakter', icon: FiUsers},
    {id: 'fotoalbum', label: 'Fotoalbum', icon: FiCamera},
    {id: 'blog', label: 'Nedlukning/Opstart', icon: FiBook},
    {id: 'indstillinger', label: 'Indstillinger', icon: FiSettings},
  ]

  // Add admin tab if user is admin
  if (user?.isAdmin) {
    tabs.push({id: 'admin', label: 'Admin', icon: FiShield})
  }

  return (
    <nav className="bg-white rounded-2xl shadow-lg p-2 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap justify-center gap-2 flex-1">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 text-sm ${
                activeTab === tab.id
                  ? tab.id === 'admin'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-ebeltoft-blue text-white shadow-md'
                  : 'text-gray-600 hover:bg-ebeltoft-light hover:text-ebeltoft-dark'
              }`}
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}
            >
              <SafeIcon icon={tab.icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </motion.button>
          ))}
        </div>
        
        {/* Notification Center */}
        <div className="ml-4">
          <NotificationCenter />
        </div>
      </div>
    </nav>
  )
}

export default Navigation