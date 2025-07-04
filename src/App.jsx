import React,{useState,useEffect} from 'react'
import {Toaster} from 'react-hot-toast'
import {motion} from 'framer-motion'
import {AuthProvider,useAuth} from './contexts/AuthContext'
import LoginForm from './components/Auth/LoginForm'
import Navigation from './components/Navigation'
import MessageWall from './components/MessageWall/MessageWall'
import Checklist from './components/Checklist/Checklist'
import CalendarView from './components/Calendar/CalendarView'
import Contacts from './components/Contacts/Contacts'
import PhotoAlbum from './components/PhotoAlbum/PhotoAlbum'
import Guides from './components/Guides/Guides'
import Settings from './components/Settings/Settings'
import AdminPanel from './components/Admin/AdminPanel'
import './App.css'

const AppContent=()=> {
  const {user,loading}=useAuth()
  const [activeTab,setActiveTab]=useState('beskedvaeg')
  const [heroImage,setHeroImage]=useState('')

  // Force cache bust with timestamp
  useEffect(()=> {
    console.log('🚀 App version 1.0.0 - Guides Update')
    console.log('Build time:', new Date().toISOString())
    console.log('Environment:',import.meta.env.MODE)
    console.log('Base URL:',import.meta.env.BASE_URL)
  },[])

  useEffect(()=> {
    const updateHeroImage=()=> {
      const storedHeroImage=localStorage.getItem('sommerhus_hero_image') || 'https://quest-media-storage-bucket.s3.us-east-2.amazonaws.com/1751639393931-blob'
      setHeroImage(storedHeroImage)
    }

    updateHeroImage()

    const handleStorageChange=(e)=> {
      if (e.key==='sommerhus_hero_image') {
        updateHeroImage()
      }
    }

    const handleHeroImageUpdate=(e)=> {
      updateHeroImage()
    }

    window.addEventListener('storage',handleStorageChange)
    window.addEventListener('heroImageUpdate',handleHeroImageUpdate)

    return ()=> {
      window.removeEventListener('storage',handleStorageChange)
      window.removeEventListener('heroImageUpdate',handleHeroImageUpdate)
    }
  },[])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ebeltoft-light to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ebeltoft-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser Guides version...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const renderContent=()=> {
    switch (activeTab) {
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
      case 'guides':
        return <Guides />
      case 'indstillinger':
        return <Settings />
      case 'admin':
        return <AdminPanel />
      default:
        return <MessageWall />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ebeltoft-light to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <motion.header
          initial={{opacity: 0,y: -20}}
          animate={{opacity: 1,y: 0}}
          className="text-center mb-8 relative"
        >
          <div
            className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              height: '320px'
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="relative z-10 flex items-center justify-center h-full p-4">
              <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl w-full mx-auto text-center border border-gray-200">
                <h1 className="text-4xl md:text-6xl font-bold text-ebeltoft-dark mb-4">
                  Sommerhus i Ebeltoft
                </h1>
                <p className="text-gray-700 text-xl font-medium mb-2">
                  Velkommen,{user.fullName || user.username}! 👋
                </p>
                <div className="text-gray-600">
                  Din families digitale sommerhus-hub v1.0.0
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <motion.main
          key={activeTab}
          initial={{opacity: 0,y: 20}}
          animate={{opacity: 1,y: 0}}
          transition={{duration: 0.3}}
          className="mt-8"
        >
          {renderContent()}
        </motion.main>
      </div>
    </div>
  )
}

function App() {
  // Error boundary for debugging
  const [hasError,setHasError]=useState(false)

  useEffect(()=> {
    const handleError=(error)=> {
      console.error('🚨 App Error:',error)
      setHasError(true)
    }

    window.addEventListener('error',handleError)
    window.addEventListener('unhandledrejection',handleError)

    return ()=> {
      window.removeEventListener('error',handleError)
      window.removeEventListener('unhandledrejection',handleError)
    }
  },[])

  if (hasError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Der opstod en fejl</h1>
          <p className="text-red-600 mb-4">Prøv at genindlæse siden</p>
          <button
            onClick={()=> window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Genindlæs
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1e40af',
            border: '1px solid #dbeafe',
          },
        }}
      />
    </AuthProvider>
  )
}

export default App