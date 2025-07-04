import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import SafeIcon from '../../common/SafeIcon'
import * as FiIcons from 'react-icons/fi'
import toast from 'react-hot-toast'

const { FiLogIn, FiLogOut, FiUsers, FiCheckCircle, FiAlertCircle, FiClock } = FiIcons

const CheckInOutManager = () => {
  const { user } = useAuth()
  const [checkIns, setCheckIns] = useState([])
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInCondition, setCheckInCondition] = useState('')
  const [showCheckOut, setShowCheckOut] = useState(false)
  const [currentCheckIn, setCurrentCheckIn] = useState(null)

  useEffect(() => {
    loadCheckIns()
  }, [user.id])

  const loadCheckIns = async () => {
    try {
      // Try Supabase first
      const { data: supabaseCheckIns, error } = await supabase
        .from('checkins_sommerhus_2024')
        .select('*')
        .order('checkin_time', { ascending: false })

      let allCheckIns = []
      
      if (error) {
        console.log('Using localStorage fallback for checkins')
        allCheckIns = JSON.parse(localStorage.getItem('sommerhus_checkins') || '[]')
      } else {
        allCheckIns = supabaseCheckIns || []
        // Sync to localStorage
        localStorage.setItem('sommerhus_checkins', JSON.stringify(allCheckIns))
      }

      setCheckIns(allCheckIns)

      // Check if current user is checked in
      const userCheckIn = allCheckIns.find(c => c.user_id === user.id && !c.checkout_time)
      setIsCheckedIn(!!userCheckIn)
      setCurrentCheckIn(userCheckIn)
    } catch (error) {
      console.error('Error loading check-ins:', error)
      // Fallback to localStorage
      const storedCheckIns = JSON.parse(localStorage.getItem('sommerhus_checkins') || '[]')
      setCheckIns(storedCheckIns)
      const userCheckIn = storedCheckIns.find(c => c.userId === user.id && !c.checkOutTime)
      setIsCheckedIn(!!userCheckIn)
    }
  }

  const handleCheckIn = async () => {
    if (!checkInCondition.trim()) {
      toast.error('Beskriv venligst husets tilstand ved indtjek')
      return
    }

    try {
      const newCheckIn = {
        user_id: user.id,
        user_name: user.fullName,
        checkin_condition: checkInCondition,
        checkin_time: new Date().toISOString(),
        checkout_time: null,
        checkout_completed: false
      }

      // Try Supabase first
      const { data, error } = await supabase
        .from('checkins_sommerhus_2024')
        .insert([newCheckIn])
        .select()
        .single()

      if (error) {
        console.log('Using localStorage fallback for check-in')
        // Fallback to localStorage
        const localCheckIn = {
          id: Date.now(),
          userId: user.id,
          userName: user.fullName,
          checkInTime: new Date().toISOString(),
          checkInCondition: checkInCondition,
          checkOutTime: null,
          checkOutCompleted: false
        }

        const updatedCheckIns = [localCheckIn, ...checkIns]
        setCheckIns(updatedCheckIns)
        localStorage.setItem('sommerhus_checkins', JSON.stringify(updatedCheckIns))
        setCurrentCheckIn(localCheckIn)
      } else {
        setCurrentCheckIn(data)
        loadCheckIns() // Reload to get updated data
      }

      setIsCheckedIn(true)
      setCheckInCondition('')
      toast.success('Du er nu tjekket ind!')
    } catch (error) {
      console.error('Check-in error:', error)
      toast.error('Fejl ved indtjek')
    }
  }

  const handleCheckOut = async () => {
    try {
      if (currentCheckIn) {
        // Try Supabase first
        const { error } = await supabase
          .from('checkins_sommerhus_2024')
          .update({
            checkout_time: new Date().toISOString(),
            checkout_completed: true
          })
          .eq('id', currentCheckIn.id)

        if (error) {
          console.log('Using localStorage fallback for check-out')
          // Fallback to localStorage
          const updatedCheckIns = checkIns.map(checkIn => {
            if ((checkIn.userId || checkIn.user_id) === user.id && !checkIn.checkOutTime && !checkIn.checkout_time) {
              return {
                ...checkIn,
                checkOutTime: new Date().toISOString(),
                checkout_time: new Date().toISOString(),
                checkOutCompleted: true,
                checkout_completed: true
              }
            }
            return checkIn
          })

          setCheckIns(updatedCheckIns)
          localStorage.setItem('sommerhus_checkins', JSON.stringify(updatedCheckIns))
        } else {
          loadCheckIns() // Reload to get updated data
        }

        setIsCheckedIn(false)
        setCurrentCheckIn(null)
        setShowCheckOut(false)
        toast.success('Du er nu tjekket ud!')
      }
    } catch (error) {
      console.error('Check-out error:', error)
      toast.error('Fejl ved udtjek')
    }
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const currentGuests = checkIns.filter(c => !c.checkout_time && !c.checkOutTime)
  const recentCheckOuts = checkIns.filter(c => c.checkout_time || c.checkOutTime).slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-ebeltoft-dark mb-6">Check-in & Check-ud</h2>

        {!isCheckedIn ? (
          <div className="bg-ebeltoft-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Check ind</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Husets tilstand ved ankomst
                </label>
                <textarea
                  value={checkInCondition}
                  onChange={(e) => setCheckInCondition(e.target.value)}
                  placeholder="Beskriv hvordan huset ser ud ved ankomst (renhed, skader, etc.)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent resize-none"
                  rows="3"
                />
              </div>
              <motion.button
                onClick={handleCheckIn}
                className="px-6 py-2 bg-summer-green text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <SafeIcon icon={FiLogIn} className="w-5 h-5" />
                Check ind
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SafeIcon icon={FiCheckCircle} className="w-8 h-8 text-summer-green" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Du er tjekket ind</h3>
                  <p className="text-sm text-gray-600">
                    Tjekket ind: {formatDateTime(currentCheckIn?.checkin_time || currentCheckIn?.checkInTime)}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => setShowCheckOut(true)}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <SafeIcon icon={FiLogOut} className="w-5 h-5" />
                Check ud
              </motion.button>
            </div>
          </div>
        )}

        {showCheckOut && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 bg-red-50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-red-800 mb-4">Check ud</h3>
            <p className="text-sm text-red-700 mb-4">
              Er du sikker på at du vil tjekke ud? Sørg for at have udfyldt tjeklisten først.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCheckOut}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Bekræft udtjek
              </button>
              <button
                onClick={() => setShowCheckOut(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Annuller
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4 flex items-center gap-2">
            <SafeIcon icon={FiUsers} className="w-5 h-5" />
            Nuværende gæster ({currentGuests.length})
          </h3>
          <div className="space-y-3">
            {currentGuests.length === 0 ? (
              <p className="text-gray-500 text-sm">Ingen gæster er tjekket ind</p>
            ) : (
              currentGuests.map((guest) => (
                <div key={guest.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{guest.user_name || guest.userName}</p>
                    <p className="text-sm text-gray-600">
                      <SafeIcon icon={FiClock} className="w-3 h-3 inline mr-1" />
                      Tjekket ind: {formatDateTime(guest.checkin_time || guest.checkInTime)}
                    </p>
                  </div>
                  <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-summer-green" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">
            Seneste udtjek
          </h3>
          <div className="space-y-3">
            {recentCheckOuts.length === 0 ? (
              <p className="text-gray-500 text-sm">Ingen seneste udtjek</p>
            ) : (
              recentCheckOuts.map((guest) => (
                <div key={guest.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-800">{guest.user_name || guest.userName}</p>
                    <SafeIcon icon={FiLogOut} className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Udtjek: {formatDateTime(guest.checkout_time || guest.checkOutTime)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Indtjek tilstand: {guest.checkin_condition || guest.checkInCondition}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckInOutManager