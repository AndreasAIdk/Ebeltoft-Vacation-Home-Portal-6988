import React, {useState, useEffect, useRef} from 'react';
import {motion} from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import toast from 'react-hot-toast';

const {FiCalendar, FiUsers, FiClock, FiPlus, FiTrash2, FiAlertTriangle, FiList, FiGrid} = FiIcons;

const CalendarView = () => {
  const {user} = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [newBooking, setNewBooking] = useState({
    name: user.fullName,
    startDate: '',
    endDate: '',
    arrivalTime: '',
    departureTime: '',
    guests: 1,
  });
  const [showForm, setShowForm] = useState(false);
  const [conflictBooking, setConflictBooking] = useState(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');
  const [loading, setLoading] = useState(false);

  const bookingFormRef = useRef(null);

  // 🔥 SAFE SYNC - Never lose data
  useEffect(() => {
    loadBookings();
    
    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'sommerhus_bookings') {
        console.log('📱 Cross-tab sync detected, reloading...');
        loadBookingsFromLocalStorage(); // Only reload from localStorage on storage events
      }
    };
    
    // Listen for custom events
    const handleBookingUpdate = () => {
      console.log('📱 Booking update event detected');
      loadBookingsFromLocalStorage(); // Immediate local update
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bookingUpdate', handleBookingUpdate);
    
    // Poll every 30 seconds for Supabase sync (reduced frequency)
    const syncInterval = setInterval(() => {
      console.log('📱 Periodic sync check...');
      syncWithSupabase();
    }, 30000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bookingUpdate', handleBookingUpdate);
      clearInterval(syncInterval);
    };
  }, []);

  const loadBookingsFromLocalStorage = () => {
    const storedBookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
    console.log('📱 Loaded from localStorage:', storedBookings.length, 'bookings');
    setBookings(storedBookings);
  };

  const syncWithSupabase = async () => {
    try {
      const {data: supabaseBookings, error} = await supabase
        .from('bookings_sommerhus_2024')
        .select('*')
        .order('start_date', {ascending: true});

      if (!error && supabaseBookings) {
        console.log('📱 Supabase sync successful:', supabaseBookings.length, 'bookings');
        
        // Convert Supabase format to local format
        const convertedBookings = supabaseBookings.map(booking => ({
          id: booking.id,
          name: booking.name || booking.guest_name,
          startDate: booking.start_date,
          endDate: booking.end_date,
          arrivalTime: booking.arrival_time,
          departureTime: booking.departure_time,
          guests: booking.guests || booking.guest_count,
          userId: booking.user_id,
          userColor: booking.user_color || '#2563eb',
          isDoubleBooking: booking.is_double_booking,
          createdAt: booking.created_at
        }));
        
        // Only update if we have data from Supabase
        if (convertedBookings.length > 0) {
          setBookings(convertedBookings);
          localStorage.setItem('sommerhus_bookings', JSON.stringify(convertedBookings));
          console.log('📱 Updated from Supabase sync');
        }
      } else {
        console.log('📱 Supabase sync failed, keeping localStorage data');
      }
    } catch (error) {
      console.log('📱 Supabase sync error, keeping localStorage data:', error.message);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      
      // Always start with localStorage data
      const storedBookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
      console.log('📱 Initial load from localStorage:', storedBookings.length, 'bookings');
      setBookings(storedBookings);
      
      // Then try to sync with Supabase
      const {data: supabaseBookings, error} = await supabase
        .from('bookings_sommerhus_2024')
        .select('*')
        .order('start_date', {ascending: true});

      if (!error && supabaseBookings) {
        console.log('📱 Supabase connection successful:', supabaseBookings.length, 'bookings');
        
        // Convert Supabase format to local format
        const convertedBookings = supabaseBookings.map(booking => ({
          id: booking.id,
          name: booking.name || booking.guest_name,
          startDate: booking.start_date,
          endDate: booking.end_date,
          arrivalTime: booking.arrival_time,
          departureTime: booking.departure_time,
          guests: booking.guests || booking.guest_count,
          userId: booking.user_id,
          userColor: booking.user_color || '#2563eb',
          isDoubleBooking: booking.is_double_booking,
          createdAt: booking.created_at
        }));
        
        // Merge localStorage and Supabase data (prefer Supabase if it has more data)
        if (convertedBookings.length >= storedBookings.length) {
          setBookings(convertedBookings);
          localStorage.setItem('sommerhus_bookings', JSON.stringify(convertedBookings));
          console.log('📱 Updated with Supabase data');
        } else {
          console.log('📱 Keeping localStorage data (more complete)');
        }
      } else {
        console.log('📱 Supabase error, using localStorage:', error?.message);
      }
      
    } catch (error) {
      console.error('📱 Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showForm && bookingFormRef.current) {
      setTimeout(() => {
        bookingFormRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [showForm]);

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  const checkForConflicts = (start, end) => {
    return bookings.find(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      const newStart = new Date(start);
      const newEnd = new Date(end);

      return (
        (newStart >= bookingStart && newStart <= bookingEnd) ||
        (newEnd >= bookingStart && newEnd <= bookingEnd) ||
        (newStart <= bookingStart && newEnd >= bookingEnd)
      );
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newBooking.name && newBooking.startDate && newBooking.endDate) {
      const conflict = checkForConflicts(newBooking.startDate, newBooking.endDate);
      if (conflict) {
        setConflictBooking(conflict);
        setShowConflictDialog(true);
        return;
      }
      saveBooking();
    }
  };

  const saveBooking = async (acceptDoubleBooking = false) => {
    try {
      setLoading(true);
      
      const booking = {
        id: Date.now(),
        ...newBooking,
        guests: parseInt(newBooking.guests),
        userId: user.id,
        userColor: user.calendarColor || '#2563eb',
        isDoubleBooking: acceptDoubleBooking,
        createdAt: new Date().toISOString()
      };

      console.log('📱 Saving booking:', booking);

      // 🔥 ALWAYS update localStorage first (NEVER LOSE DATA)
      const updatedBookings = [...bookings, booking].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );
      
      setBookings(updatedBookings);
      localStorage.setItem('sommerhus_bookings', JSON.stringify(updatedBookings));

      // Try to save to Supabase (but don't fail if it doesn't work)
      try {
        const supabaseBooking = {
          id: booking.id,
          name: booking.name,
          guest_name: booking.name,
          start_date: booking.startDate,
          end_date: booking.endDate,
          arrival_time: booking.arrivalTime || null,
          departure_time: booking.departureTime || null,
          guests: booking.guests,
          guest_count: booking.guests,
          user_id: booking.userId,
          user_color: booking.userColor,
          is_double_booking: booking.isDoubleBooking,
          created_at: booking.createdAt
        };

        const {error} = await supabase
          .from('bookings_sommerhus_2024')
          .insert([supabaseBooking]);

        if (error) {
          console.log('📱 Supabase save failed (but localStorage saved):', error.message);
        } else {
          console.log('📱 Saved to both localStorage and Supabase');
        }
      } catch (supabaseError) {
        console.log('📱 Supabase save error (but localStorage saved):', supabaseError.message);
      }
      
      // 🔥 TRIGGER CROSS-TAB SYNC
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_bookings',
        newValue: JSON.stringify(updatedBookings)
      }));
      
      // 🔥 TRIGGER CUSTOM EVENT FOR SAME TAB
      window.dispatchEvent(new CustomEvent('bookingUpdate', { detail: updatedBookings }));

      console.log('📱 Booking saved and sync triggered');

      setNewBooking({
        name: user.fullName,
        startDate: '',
        endDate: '',
        arrivalTime: '',
        departureTime: '',
        guests: 1,
      });
      setShowForm(false);
      setShowConflictDialog(false);
      setConflictBooking(null);
      
      toast.success(acceptDoubleBooking ? 'Dobbeltbooking accepteret!' : 'Booking oprettet!');
      
    } catch (error) {
      console.error('📱 Save booking error:', error);
      toast.error('Fejl ved oprettelse af booking');
    } finally {
      setLoading(false);
    }
  };

  const deleteBooking = async (id) => {
    try {
      setLoading(true);
      
      console.log('📱 Deleting booking:', id);
      
      // 🔥 ALWAYS update localStorage first (NEVER LOSE DATA)
      const updatedBookings = bookings.filter(booking => booking.id !== id);
      setBookings(updatedBookings);
      localStorage.setItem('sommerhus_bookings', JSON.stringify(updatedBookings));

      // Try to delete from Supabase (but don't fail if it doesn't work)
      try {
        const {error} = await supabase
          .from('bookings_sommerhus_2024')
          .delete()
          .eq('id', id);

        if (error) {
          console.log('📱 Supabase delete failed (but localStorage updated):', error.message);
        } else {
          console.log('📱 Deleted from both localStorage and Supabase');
        }
      } catch (supabaseError) {
        console.log('📱 Supabase delete error (but localStorage updated):', supabaseError.message);
      }

      // 🔥 TRIGGER CROSS-TAB SYNC
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_bookings',
        newValue: JSON.stringify(updatedBookings)
      }));
      
      // 🔥 TRIGGER CUSTOM EVENT
      window.dispatchEvent(new CustomEvent('bookingUpdate', { detail: updatedBookings }));

      console.log('📱 Booking deleted and sync triggered');
      toast.success('Booking slettet');
      
    } catch (error) {
      console.error('📱 Delete booking error:', error);
      toast.error('Fejl ved sletning af booking');
    } finally {
      setLoading(false);
    }
  };

  const getBookingForDate = (date) => {
    return bookings.find(booking => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return checkDate >= start && checkDate <= end;
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isDatePassed = (dateString) => {
    return new Date(dateString) < new Date();
  };

  const generateCalendarOverview = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getBookingsForMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return bookings.filter(booking => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      return (startDate <= monthEnd && endDate >= monthStart);
    });
  };

  const getUserColors = () => {
    const users = new Map();
    bookings.forEach(booking => {
      if (!users.has(booking.userId)) {
        users.set(booking.userId, {
          name: booking.name,
          color: booking.userColor || '#2563eb',
          userId: booking.userId
        });
      }
    });
    return Array.from(users.values());
  };

  const selectedDateBooking = getBookingForDate(selectedDate);
  const timeOptions = generateTimeOptions();
  const calendarDays = generateCalendarOverview();
  const monthBookings = getBookingsForMonth();
  const userColors = getUserColors();

  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage = backgroundImages.kalender;

  if (loading && bookings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ebeltoft-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser kalender...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
            <SafeIcon icon={FiCalendar} className="w-7 h-7" />
            Kalender & Booking
            {loading && <div className="w-4 h-4 border-2 border-ebeltoft-blue border-t-transparent rounded-full animate-spin ml-2" />}
          </h2>
          <div className="flex items-center gap-2">
            <div className="md:hidden flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-white shadow-sm text-ebeltoft-blue' 
                    : 'text-gray-600'
                }`}
              >
                <SafeIcon icon={FiGrid} className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm text-ebeltoft-blue' 
                    : 'text-gray-600'
                }`}
              >
                <SafeIcon icon={FiList} className="w-4 h-4" />
              </button>
            </div>

            <motion.button
              onClick={() => setShowForm(!showForm)}
              disabled={loading}
              className="px-4 md:px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2 disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              <span className="hidden sm:inline">Ny booking</span>
            </motion.button>
          </div>
        </div>

        {(viewMode === 'calendar' || window.innerWidth >= 768) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ebeltoft-dark">
                {currentMonth.toLocaleDateString('da-DK', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
                >
                  I dag
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  →
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50">
                {['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'].map(day => (
                  <div
                    key={day}
                    className="p-2 md:p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0 text-xs md:text-sm"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={index}
                        className="h-12 md:h-16 border-r border-b border-gray-200 last:border-r-0"
                      ></div>
                    );
                  }

                  const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const dayBookings = monthBookings.filter(booking => {
                    const startDate = new Date(booking.startDate);
                    const endDate = new Date(booking.endDate);
                    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    
                    return checkDate >= start && checkDate <= end;
                  });

                  return (
                    <div
                      key={day}
                      className="h-12 md:h-16 border-r border-b border-gray-200 last:border-r-0 p-1 relative cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedDate(currentDate)}
                    >
                      <div className="text-xs md:text-sm font-medium text-gray-700 mb-1">{day}</div>
                      {dayBookings.length > 0 && (
                        <div className="space-y-1">
                          {dayBookings.slice(0, 1).map((booking) => (
                            <div
                              key={booking.id}
                              className="text-xs px-1 py-0.5 rounded text-white truncate"
                              style={{ backgroundColor: booking.userColor }}
                              title={`${booking.name} (${booking.guests} gæster)`}
                            >
                              <span className="hidden md:inline">{booking.name}</span>
                              <span className="md:hidden">•</span>
                            </div>
                          ))}
                          {dayBookings.length > 1 && (
                            <div className="text-xs text-gray-500">
                              +{dayBookings.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {userColors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Farvekoder:</h4>
                <div className="flex flex-wrap gap-3">
                  {userColors.map(user => (
                    <div key={user.userId} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: user.color }}
                      ></div>
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'list' && window.innerWidth < 768 && (
          <div className="md:hidden mb-6">
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Alle bookinger</h3>
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-3 border border-gray-200 rounded-lg ${
                    isDatePassed(booking.endDate) 
                      ? 'opacity-60 bg-gray-50' 
                      : booking.isDoubleBooking 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : 'bg-white hover:bg-gray-50'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: booking.userColor }}
                        ></div>
                        <h4 className="font-semibold text-ebeltoft-dark text-sm">{booking.name}</h4>
                        <span className="text-xs text-gray-500">({booking.guests} gæster)</span>
                        {booking.isDoubleBooking && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Dobbeltbooking
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center gap-1 mb-1">
                          <SafeIcon icon={FiCalendar} className="w-3 h-3" />
                          <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                        </div>
                        {(booking.arrivalTime || booking.departureTime) && (
                          <div className="flex items-center gap-1">
                            <SafeIcon icon={FiClock} className="w-3 h-3" />
                            <span>
                              {booking.arrivalTime && `Ankomst: ${booking.arrivalTime}`}
                              {booking.arrivalTime && booking.departureTime && ' | '}
                              {booking.departureTime && `Afgang: ${booking.departureTime}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {booking.userId === user.id && (
                      <button
                        onClick={() => deleteBooking(booking.id)}
                        disabled={loading}
                        className="text-red-500 hover:text-red-700 transition-colors ml-2 disabled:opacity-50"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="bg-ebeltoft-light/90 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">
              {formatDate(selectedDate)}
            </h3>
            {selectedDateBooking ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-ebeltoft-dark">
                  <SafeIcon icon={FiUsers} className="w-5 h-5" />
                  <span className="font-medium">{selectedDateBooking.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Periode:</strong> {formatDate(selectedDateBooking.startDate)} - {formatDate(selectedDateBooking.endDate)}
                  </p>
                  <p>
                    <strong>Gæster:</strong> {selectedDateBooking.guests}
                  </p>
                  {(selectedDateBooking.arrivalTime || selectedDateBooking.departureTime) && (
                    <div className="flex items-center gap-1 mt-2">
                      <SafeIcon icon={FiClock} className="w-4 h-4" />
                      <span>
                        {selectedDateBooking.arrivalTime && `Ankomst: ${selectedDateBooking.arrivalTime}`}
                        {selectedDateBooking.arrivalTime && selectedDateBooking.departureTime && ' | '}
                        {selectedDateBooking.departureTime && `Afgang: ${selectedDateBooking.departureTime}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Ingen booking på denne dato</p>
            )}
          </div>
        )}

        {showForm && (
          <motion.form
            ref={bookingFormRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light/90 backdrop-blur-sm rounded-xl p-6 mt-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Opret ny booking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Antal gæster</label>
                <input
                  type="number"
                  min="1"
                  value={newBooking.guests}
                  onChange={(e) => setNewBooking({ ...newBooking, guests: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ankomst dato</label>
                <input
                  type="date"
                  value={newBooking.startDate}
                  onChange={(e) => setNewBooking({ ...newBooking, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Afgang dato</label>
                <input
                  type="date"
                  value={newBooking.endDate}
                  onChange={(e) => setNewBooking({ ...newBooking, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ankomst tid (ca.)</label>
                <select
                  value={newBooking.arrivalTime}
                  onChange={(e) => setNewBooking({ ...newBooking, arrivalTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                >
                  <option value="">Vælg tid</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Afgang tid (ca.)</label>
                <select
                  value={newBooking.departureTime}
                  onChange={(e) => setNewBooking({ ...newBooking, departureTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                >
                  <option value="">Vælg tid</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Gemmer...' : 'Gem booking'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Annuller
              </button>
            </div>
          </motion.form>
        )}

        {showConflictDialog && conflictBooking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <SafeIcon icon={FiAlertTriangle} className="w-8 h-8 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-800">Booking konflikt</h3>
              </div>
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
                  Der er allerede en booking i denne periode:
                </p>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-800">{conflictBooking.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(conflictBooking.startDate)} - {formatDate(conflictBooking.endDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {conflictBooking.guests} gæster
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveBooking(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex-1 disabled:opacity-50"
                >
                  Accepter dobbeltbooking
                </button>
                <button
                  onClick={() => setShowConflictDialog(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex-1"
                >
                  Ændre booking
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className={`hidden md:block ${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
        <h3 className="text-xl font-bold text-ebeltoft-dark mb-6">Alle bookinger</h3>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 border border-gray-200 rounded-lg ${
                isDatePassed(booking.endDate) 
                  ? 'opacity-60 bg-gray-50/90' 
                  : booking.isDoubleBooking 
                    ? 'bg-yellow-50/90 border-yellow-200' 
                    : 'bg-white/90 hover:bg-gray-50/90'
              } transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: booking.userColor }}
                    ></div>
                    <SafeIcon icon={FiUsers} className="w-5 h-5 text-ebeltoft-blue" />
                    <h4 className="font-semibold text-ebeltoft-dark">{booking.name}</h4>
                    <span className="text-sm text-gray-500">({booking.guests} gæster)</span>
                    {booking.isDoubleBooking && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Dobbeltbooking
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                      <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                    </div>
                    {(booking.arrivalTime || booking.departureTime) && (
                      <div className="flex items-center gap-1">
                        <SafeIcon icon={FiClock} className="w-4 h-4" />
                        <span>
                          {booking.arrivalTime && `Ankomst: ${booking.arrivalTime}`}
                          {booking.arrivalTime && booking.departureTime && ' | '}
                          {booking.departureTime && `Afgang: ${booking.departureTime}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {booking.userId === user.id && (
                  <button
                    onClick={() => deleteBooking(booking.id)}
                    disabled={loading}
                    className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    <SafeIcon icon={FiTrash2} className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;