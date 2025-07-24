import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCalendar, FiUsers, FiPlus, FiTrash2, FiChevronLeft, FiChevronRight } = FiIcons;

const SimpleWorkingCalendar = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newBooking, setNewBooking] = useState({
    name: user?.fullName || '',
    startDate: '',
    endDate: '',
    guests: 1,
  });

  // Error boundary
  useEffect(() => {
    const handleError = (error) => {
      console.error('🚨 Calendar Error:', error);
      setError(error.message);
      toast.error('Der opstod en fejl i kalenderen');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Load bookings safely
  const loadBookings = () => {
    try {
      console.log('📅 Loading bookings...');
      const stored = localStorage.getItem('sommerhus_bookings');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ Loaded bookings:', parsed.length);
        setBookings(Array.isArray(parsed) ? parsed : []);
        return parsed;
      } else {
        console.log('📅 No bookings found, initializing empty array');
        setBookings([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      setError('Kunne ikke indlæse bookinger');
      setBookings([]);
      return [];
    }
  };

  // Safe sync function
  const syncBookings = (newBookings) => {
    try {
      console.log('🔄 Syncing bookings:', newBookings.length);
      
      // Validate data
      if (!Array.isArray(newBookings)) {
        throw new Error('Bookings is not an array');
      }

      // Save to localStorage
      localStorage.setItem('sommerhus_bookings', JSON.stringify(newBookings));
      
      // Update state
      setBookings(newBookings);
      
      // Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_bookings',
        newValue: JSON.stringify(newBookings)
      }));
      
      console.log('✅ Sync complete');
    } catch (error) {
      console.error('❌ Sync error:', error);
      setError('Kunne ikke synkronisere data');
    }
  };

  // Setup listeners
  useEffect(() => {
    console.log('🚀 Setting up calendar...');
    
    try {
      // Initial load
      loadBookings();

      // Storage listener
      const handleStorageChange = (e) => {
        if (e.key === 'sommerhus_bookings') {
          console.log('📡 Storage change detected');
          loadBookings();
        }
      };

      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    } catch (error) {
      console.error('❌ Setup error:', error);
      setError('Kunne ikke initialisere kalender');
    }
  }, []);

  // Calendar helpers
  const getDaysInMonth = () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startingDay = firstDay.getDay();
      const daysInMonth = lastDay.getDate();

      const days = [];
      
      for (let i = 0; i < startingDay; i++) {
        days.push(null);
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }
      
      return days;
    } catch (error) {
      console.error('❌ getDaysInMonth error:', error);
      return [];
    }
  };

  const getBookingsForDate = (date) => {
    try {
      if (!date || !Array.isArray(bookings)) return [];
      
      return bookings.filter(booking => {
        if (!booking.startDate || !booking.endDate) return false;
        
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        return checkDate >= start && checkDate <= end;
      });
    } catch (error) {
      console.error('❌ getBookingsForDate error:', error);
      return [];
    }
  };

  // Save booking
  const saveBooking = () => {
    if (!newBooking.name || !newBooking.startDate || !newBooking.endDate) {
      toast.error('Udfyld navn og datoer');
      return;
    }

    setLoading(true);
    
    try {
      const booking = {
        id: Date.now(),
        name: newBooking.name,
        startDate: newBooking.startDate,
        endDate: newBooking.endDate,
        guests: parseInt(newBooking.guests) || 1,
        userId: user?.id,
        userColor: user?.calendarColor || '#2563eb',
        createdAt: new Date().toISOString()
      };

      console.log('💾 Creating booking:', booking);

      const updatedBookings = [...bookings, booking].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );
      
      syncBookings(updatedBookings);

      setNewBooking({
        name: user?.fullName || '',
        startDate: '',
        endDate: '',
        guests: 1,
      });
      
      setShowForm(false);
      toast.success('Booking oprettet!');
    } catch (error) {
      console.error('❌ Save booking error:', error);
      setError('Kunne ikke gemme booking');
      toast.error('Fejl ved gemning');
    } finally {
      setLoading(false);
    }
  };

  // Delete booking
  const deleteBooking = (id) => {
    try {
      console.log('🗑️ Deleting booking:', id);
      
      const updatedBookings = bookings.filter(booking => booking.id !== id);
      syncBookings(updatedBookings);
      
      toast.success('Booking slettet!');
    } catch (error) {
      console.error('❌ Delete booking error:', error);
      toast.error('Fejl ved sletning');
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Ugyldig dato';
    }
  };

  // Error display
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h3 className="text-red-800 font-semibold mb-2">Kalender Fejl</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadBookings();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Prøv igen
          </button>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const monthName = currentMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
              <SafeIcon icon={FiCalendar} className="w-7 h-7" />
              Kalender
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {bookings.length} bookinger
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            Ny booking
          </button>
        </div>

        {/* Booking Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Opret booking</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Navn</label>
                  <input
                    type="text"
                    value={newBooking.name}
                    onChange={(e) => setNewBooking({ ...newBooking, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fra dato</label>
                  <input
                    type="date"
                    value={newBooking.startDate}
                    onChange={(e) => setNewBooking({ ...newBooking, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Til dato</label>
                  <input
                    type="date"
                    value={newBooking.endDate}
                    onChange={(e) => setNewBooking({ ...newBooking, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-2">Gæster</label>
                <input
                  type="number"
                  min="1"
                  value={newBooking.guests}
                  onChange={(e) => setNewBooking({ ...newBooking, guests: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveBooking}
                  disabled={loading}
                  className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors disabled:opacity-50"
                >
                  {loading ? 'Gemmer...' : 'Gem booking'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Annuller
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiChevronLeft} className="w-6 h-6" />
          </button>
          <h3 className="text-2xl font-bold text-ebeltoft-dark capitalize">
            {monthName}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiChevronRight} className="w-6 h-6" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'].map(day => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-50 rounded-lg">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-20"></div>;
            }

            const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayBookings = getBookingsForDate(currentDate);

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(currentDate)}
                className="h-20 border border-gray-200 rounded-lg p-1 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="text-sm font-semibold text-gray-700 mb-1">{day}</div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <div
                      key={booking.id}
                      className="text-xs px-1 py-0.5 rounded text-white truncate"
                      style={{ backgroundColor: booking.userColor }}
                      title={`${booking.name} (${booking.guests} gæster)`}
                    >
                      {booking.name.split(' ')[0]}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500">+{dayBookings.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="mt-6 p-4 bg-ebeltoft-light rounded-lg">
            <h4 className="font-semibold text-ebeltoft-dark mb-3">
              {selectedDate.toLocaleDateString('da-DK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </h4>
            {getBookingsForDate(selectedDate).length > 0 ? (
              <div className="space-y-3">
                {getBookingsForDate(selectedDate).map(booking => (
                  <div key={booking.id} className="p-4 bg-white rounded-lg border-l-4 border-gray-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: booking.userColor }}
                        ></div>
                        <div>
                          <div className="font-medium text-gray-800">{booking.name}</div>
                          <div className="text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <SafeIcon icon={FiUsers} className="w-4 h-4" />
                              {booking.guests} gæster
                            </span>
                            <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                          </div>
                        </div>
                      </div>
                      {booking.userId === user?.id && (
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Ingen bookinger på denne dato</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleWorkingCalendar;