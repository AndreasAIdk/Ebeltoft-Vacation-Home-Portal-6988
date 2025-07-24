import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCalendar, FiPlus, FiChevronLeft, FiChevronRight, FiUsers, FiClock, FiMessageCircle, FiAlertTriangle, FiTrash2, FiDownload, FiRefreshCw } = FiIcons;

const WorkingCalendar = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conflictBooking, setConflictBooking] = useState(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  
  const [newBooking, setNewBooking] = useState({
    name: user?.fullName || '',
    startDate: '',
    endDate: '',
    guests: 1,
    comments: '',
    arrivalTime: '',
    departureTime: ''
  });

  const STORAGE_KEY = 'sommerhus_bookings';

  // 🔄 PROPER SYNC FUNCTION
  const syncBookings = async (showToast = false) => {
    if (showToast) setSyncing(true);
    
    try {
      console.log('🔄 Starting sync...');
      
      // Get from Supabase
      const { data: supabaseBookings, error } = await supabase
        .from('bookings_sommerhus_2024')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Supabase sync error:', error);
        if (showToast) toast.error('Fejl ved synkronisering');
        return;
      }

      // Convert to our format
      const converted = (supabaseBookings || []).map(booking => ({
        id: booking.id,
        name: booking.name,
        startDate: booking.start_date,
        endDate: booking.end_date,
        arrivalTime: booking.arrival_time || '',
        departureTime: booking.departure_time || '',
        guests: booking.guests,
        comments: booking.comments || '',
        userId: booking.user_id,
        userColor: booking.user_color || '#2563eb',
        isDoubleBooking: booking.is_double_booking || false,
        createdAt: booking.created_at
      }));

      console.log('✅ Synced bookings:', converted.length);
      
      // Update state and localStorage
      setBookings(converted);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(converted));
      
      if (showToast && converted.length > 0) {
        toast.success(`Synkroniseret ${converted.length} bookinger`);
      }
      
    } catch (error) {
      console.error('Sync error:', error);
      if (showToast) toast.error('Fejl ved synkronisering');
    } finally {
      if (showToast) setSyncing(false);
    }
  };

  // 💾 SAVE TO BOTH PLACES
  const saveBooking = async (bookingData, acceptDoubleBooking = false) => {
    setLoading(true);
    
    try {
      const finalBooking = {
        ...bookingData,
        isDoubleBooking: acceptDoubleBooking,
        createdAt: new Date().toISOString()
      };

      console.log('💾 Saving booking:', finalBooking.name);

      // 1. Save to Supabase FIRST
      const supabaseData = {
        id: finalBooking.id,
        name: finalBooking.name,
        start_date: finalBooking.startDate,
        end_date: finalBooking.endDate,
        arrival_time: finalBooking.arrivalTime || null,
        departure_time: finalBooking.departureTime || null,
        guests: finalBooking.guests,
        comments: finalBooking.comments || null,
        user_id: finalBooking.userId,
        user_color: finalBooking.userColor,
        is_double_booking: finalBooking.isDoubleBooking,
        created_at: finalBooking.createdAt
      };

      const { error } = await supabase
        .from('bookings_sommerhus_2024')
        .insert([supabaseData]);

      if (error) {
        console.error('Supabase save error:', error);
        toast.error('Fejl ved gemning til server');
        return;
      }

      console.log('✅ Saved to Supabase');

      // 2. Update local state immediately
      const updatedBookings = [...bookings, finalBooking].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );
      
      setBookings(updatedBookings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookings));

      // 3. Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(updatedBookings)
      }));

      toast.success('Booking gemt og synkroniseret! ✅');

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fejl ved gemning');
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ DELETE FROM BOTH PLACES
  const deleteBooking = async (id) => {
    try {
      const booking = bookings.find(b => b.id === id);
      if (booking?.userId !== user?.id) {
        toast.error('Du kan kun slette dine egne bookinger');
        return;
      }

      console.log('🗑️ Deleting booking:', id);

      // 1. Delete from Supabase FIRST
      const { error } = await supabase
        .from('bookings_sommerhus_2024')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        toast.error('Fejl ved sletning fra server');
        return;
      }

      console.log('✅ Deleted from Supabase');

      // 2. Update local state
      const updatedBookings = bookings.filter(b => b.id !== id);
      setBookings(updatedBookings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookings));

      // 3. Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(updatedBookings)
      }));

      toast.success('Booking slettet og synkroniseret! ✅');
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Fejl ved sletning');
    }
  };

  // 🚀 SETUP WITH PROPER SYNC
  useEffect(() => {
    console.log('🚀 Setting up calendar...');
    
    // Initial sync
    syncBookings();

    // Real-time subscription
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings_sommerhus_2024' 
      }, (payload) => {
        console.log('📡 Real-time change:', payload.eventType);
        // Sync after any change
        setTimeout(() => syncBookings(), 500);
      })
      .subscribe();

    // Cross-tab sync
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        console.log('📱 Cross-tab sync');
        const newData = JSON.parse(e.newValue || '[]');
        setBookings(newData);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      console.log('⏰ Periodic sync');
      syncBookings();
    }, 30000);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(syncInterval);
    };
  }, []);

  // Helper functions
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      options.push(time);
    }
    return options;
  };

  const checkForConflicts = (startDate, endDate) => {
    return bookings.find(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      return (
        (newStart >= bookingStart && newStart <= bookingEnd) ||
        (newEnd >= bookingStart && newEnd <= bookingEnd) ||
        (newStart <= bookingStart && newEnd >= bookingEnd)
      );
    });
  };

  const validateDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return bookings.filter(booking => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date && date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newBooking.name || !newBooking.startDate || !newBooking.endDate) {
      toast.error('Udfyld navn og datoer');
      return;
    }

    if (!validateDates(newBooking.startDate, newBooking.endDate)) {
      toast.error('Slutdato skal være efter eller samme som startdato');
      return;
    }

    const conflict = checkForConflicts(newBooking.startDate, newBooking.endDate);
    if (conflict) {
      setConflictBooking(conflict);
      setShowConflictDialog(true);
      return;
    }

    handleSaveBooking();
  };

  const handleSaveBooking = async (acceptDoubleBooking = false) => {
    const bookingData = {
      id: Date.now(),
      name: newBooking.name,
      startDate: newBooking.startDate,
      endDate: newBooking.endDate,
      guests: parseInt(newBooking.guests),
      comments: newBooking.comments || '',
      arrivalTime: newBooking.arrivalTime || '',
      departureTime: newBooking.departureTime || '',
      userId: user?.id || 'unknown',
      userColor: user?.calendarColor || '#2563eb'
    };

    await saveBooking(bookingData, acceptDoubleBooking);

    // Reset form
    setNewBooking({
      name: user?.fullName || '',
      startDate: '',
      endDate: '',
      guests: 1,
      comments: '',
      arrivalTime: '',
      departureTime: ''
    });
    setShowForm(false);
    setShowConflictDialog(false);
    setConflictBooking(null);
  };

  // Export function
  const exportToPDF = () => {
    try {
      const sortedBookings = [...bookings].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );

      let content = `SOMMERHUS I EBELTOFT - BOOKING OVERSIGT\n`;
      content += `Genereret: ${new Date().toLocaleDateString('da-DK')} kl. ${new Date().toLocaleTimeString('da-DK')}\n`;
      content += `Total antal bookinger: ${sortedBookings.length}\n\n`;
      content += `${'='.repeat(60)}\n\n`;

      if (sortedBookings.length === 0) {
        content += `Ingen bookinger fundet.\n`;
      } else {
        sortedBookings.forEach((booking, index) => {
          content += `${index + 1}. ${booking.name}\n`;
          content += `   Periode: ${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}\n`;
          content += `   Gæster: ${booking.guests}\n`;
          
          if (booking.arrivalTime || booking.departureTime) {
            content += `   Tider: `;
            if (booking.arrivalTime) content += `Ankomst ${booking.arrivalTime}`;
            if (booking.arrivalTime && booking.departureTime) content += ` | `;
            if (booking.departureTime) content += `Afgang ${booking.departureTime}`;
            content += `\n`;
          }
          
          if (booking.comments) {
            content += `   Kommentar: ${booking.comments}\n`;
          }
          
          if (booking.isDoubleBooking) {
            content += `   ⚠️ DOBBELTBOOKING\n`;
          }
          
          content += `\n`;
        });
      }

      content += `${'='.repeat(60)}\n`;
      content += `Eksporteret fra Sommerhus App\n`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sommerhus_Bookinger_${new Date().toLocaleDateString('da-DK').replace(/\./g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Booking oversigt downloadet!');
    } catch (error) {
      toast.error('Fejl ved eksport');
    }
  };

  const days = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' });
  const timeOptions = generateTimeOptions();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
              <SafeIcon icon={FiCalendar} className="w-7 h-7" />
              Kalender
            </h2>
            <div className="text-sm text-gray-500">
              {bookings.length} bookinger
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => syncBookings(true)}
              disabled={syncing}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Synkroniserer...' : 'Synkroniser'}</span>
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <SafeIcon icon={FiDownload} className="w-5 h-5" />
              <span className="hidden sm:inline">Eksporter</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              Ny booking
            </button>
          </div>
        </div>

        {/* Booking Form */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Opret booking</h3>
            <div className="space-y-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bemærkning (valgfrit)</label>
                <textarea
                  value={newBooking.comments}
                  onChange={(e) => setNewBooking({ ...newBooking, comments: e.target.value })}
                  placeholder="f.eks. Familieferie, weekend ophold, etc."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent resize-none"
                />
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
              return <div key={index} className="h-28"></div>;
            }

            const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayBookings = getBookingsForDate(currentDate);
            const isCurrentDay = isToday(currentDate);

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(currentDate)}
                className={`h-28 border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md ${
                  isCurrentDay
                    ? 'border-blue-400 bg-blue-50'
                    : selectedDate && selectedDate.getTime() === currentDate.getTime()
                    ? 'border-ebeltoft-blue bg-ebeltoft-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-xs px-2 py-1 rounded text-white font-medium truncate ${
                        booking.isDoubleBooking ? 'border border-yellow-400' : ''
                      }`}
                      style={{ backgroundColor: booking.userColor }}
                      title={`${booking.name} (${booking.guests} gæster)${
                        booking.isDoubleBooking ? ' - DOBBELTBOOKING' : ''
                      }`}
                    >
                      {booking.name.split(' ')[0]}
                      {booking.isDoubleBooking && ' ⚠️'}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayBookings.length - 2} mere
                    </div>
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
                  <div
                    key={booking.id}
                    className={`p-4 bg-white rounded-lg border-l-4 ${
                      booking.isDoubleBooking ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: booking.userColor }}></div>
                        <div>
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {booking.name}
                            {booking.isDoubleBooking && (
                              <span className="text-yellow-600 text-xs font-normal">⚠️ Dobbeltbooking</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
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

                    {(booking.arrivalTime || booking.departureTime) && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <SafeIcon icon={FiClock} className="w-4 h-4" />
                        <span>
                          {booking.arrivalTime && `Ankomst: ${formatTime(booking.arrivalTime)}`}
                          {booking.arrivalTime && booking.departureTime && ' | '}
                          {booking.departureTime && `Afgang: ${formatTime(booking.departureTime)}`}
                        </span>
                      </div>
                    )}

                    {booking.comments && (
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <SafeIcon icon={FiMessageCircle} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="bg-gray-50 rounded p-2 flex-1">{booking.comments}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Ingen bookinger på denne dato</p>
            )}
          </div>
        )}
      </div>

      {/* Conflict Dialog */}
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
              <p className="text-gray-600 mb-3">Der er allerede en booking i denne periode:</p>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="font-medium text-gray-800">{conflictBooking.name}</p>
                <p className="text-sm text-gray-600">
                  {formatDate(conflictBooking.startDate)} - {formatDate(conflictBooking.endDate)}
                </p>
                <p className="text-sm text-gray-600">{conflictBooking.guests} gæster</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveBooking(true)}
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
  );
};

export default WorkingCalendar;