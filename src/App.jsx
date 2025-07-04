import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginForm from './components/Auth/LoginForm'
import Navigation from './components/Navigation'
import CheckInOutManager from './components/CheckInOut/CheckInOutManager'
import MessageWall from './components/MessageWall/MessageWall'
import Checklist from './components/Checklist/Checklist'
import CalendarView from './components/Calendar/CalendarView'
import Contacts from './components/Contacts/Contacts'
import PhotoAlbum from './components/PhotoAlbum/PhotoAlbum'
import Blog from './components/Blog/Blog'
import Settings from './components/Settings/Settings'
import AdminPanel from './components/Admin/AdminPanel'
import './App.css'

const AppContent = () => {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('checkin')
  const [heroImage, setHeroImage] = useState('')

  // Update hero image when component mounts and when localStorage changes
  useEffect(() => {
    const updateHeroImage = () => {
      const storedHeroImage = localStorage.getItem('sommerhus_hero_image') || 
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop'
      setHeroImage(storedHeroImage)
    }

    updateHeroImage()

    // Listen for storage changes (when hero image is updated in settings)
    const handleStorageChange = (e) => {
      if (e.key === 'sommerhus_hero_image') {
        updateHeroImage()
      }
    }

    // Listen for custom events (when updated in same tab)
    const handleHeroImageUpdate = (e) => {
      updateHeroImage()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('heroImageUpdate', handleHeroImageUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('heroImageUpdate', handleHeroImageUpdate)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ebeltoft-light to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ebeltoft-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'checkin':
        return <CheckInOutManager />
      case 'beskedvaeg':
        return <MessageWall />
      case 'kalender':
        return <CalendarView />
      case 'tjekliste':
        return <Checklist />
      case 'kontakt':
        return <Contacts />
      case 'fotoalbum':
        return <PhotoAlbum />
      case 'blog':
        return <Blog />
      case 'indstillinger':
        return <Settings />
      case 'admin':
        return <AdminPanel />
      default:
        return <CheckInOutManager />
    }
  }

  // Get background image for current tab
  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}')
  const backgroundImage = backgroundImages[activeTab]

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-ebeltoft-light to-blue-50"
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : {}}
    >
      {backgroundImage && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm"></div>
      )}
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 relative"
        >
          {/* Header with background image and white box */}
          <div
            className="relative rounded-2xl overflow-hidden mb-6"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              height: '200px'
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h1 className="text-4xl md:text-5xl font-bold text-ebeltoft-dark mb-2">
                  Sommerhus i Ebeltoft
                </h1>
                <p className="text-gray-600 text-lg">
                  Velkommen, {user.fullName}!
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <motion.main
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          {renderContent()}
        </motion.main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

export default App