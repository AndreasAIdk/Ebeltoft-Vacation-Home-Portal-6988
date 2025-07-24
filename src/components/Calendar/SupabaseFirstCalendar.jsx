import React, {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiCalendar, FiPlus, FiChevronLeft, FiChevronRight, FiUsers, FiClock, FiAlertTriangle, FiTrash2, FiDownload, FiRefreshCw, FiShield} = FiIcons;

const SupabaseFirstCalendar = () => {
  const {user} = useAuth();
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
    arrivalTime: '',
    departureTime: ''
  });

  // 🔥 Generate PROPER UUID v4 (FIXED!)
  const generateUUID = () => {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Calculate week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // 🔥 SUPABASE FIRST - Load from Supabase ALWAYS
  const loadFromSupabase = async (showToast = false) => {
    if (showToast) setSyncing(true);
    try {
      console.log('📡 Loading from Supabase...');
      
      const {data: supabaseBookings, error} = await supabase
        .from('bookings_sommerhus_2024')
        .select('*')
        .order('start_date', {ascending: true});

      if (!error && supabaseBookings) {
        console.log('✅ Loaded from Supabase:', supabaseBookings.length, 'bookings');
        
        // Convert Supabase format to local format
        const convertedBookings = supabaseBookings.map(booking => ({
          id: booking.id,
          name: booking.name,
          startDate: booking.start_date,
          endDate: booking.end_date,
          arrivalTime: booking.arrival_time || '',
          departureTime: booking.departure_time || '',
          guests: booking.guests,
          userId: booking.user_id,
          userColor: booking.user_color || '#2563eb',
          isDoubleBooking: booking.is_double_booking || false,
          createdAt: booking.created_at,
          isSuperUserBooking: booking.is_super_user_booking || false,
          superUserName: booking.super_user_name || null
        }));

        console.log('✅ Updated with Supabase data');
        setBookings(convertedBookings);
        // Update localStorage as backup only
        localStorage.setItem('sommerhus_bookings', JSON.stringify(convertedBookings));
        
        if (showToast) {
          toast.success(`✅ ${convertedBookings.length} bookinger hentet fra server`);
        }
      } else {
        console.log('⚠️ Supabase error, using localStorage:', error?.message);
        // Fallback to localStorage
        const localBookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
        setBookings(localBookings);
        if (showToast) {
          toast.info('Bruger lokal data som backup');
        }
      }
    } catch (error) {
      console.error('❌ Load error:', error);
      if (showToast) toast.error('Fejl ved forbindelse til server');
      // Fallback to localStorage
      const localBookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
      setBookings(localBookings);
    } finally {
      if (showToast) setSyncing(false);
    }
  };

  // 🔥 SAVE TO SUPABASE ONLY - Fixed UUID and superuser support
  const saveToSupabase = async (bookingData, acceptDoubleBooking = false) => {
    setLoading(true);
    try {
      const finalBooking = {
        ...bookingData,
        id: generateUUID(), // 🔥 Use proper UUID instead of Date.now()
        isDoubleBooking: acceptDoubleBooking,
        createdAt: new Date().toISOString(),
        isSuperUserBooking: user?.isSuperUser || false,
        superUserName: user?.isSuperUser ? user.fullName : null
      };

      console.log('💾 Saving to Supabase:', finalBooking.name, 'with UUID:', finalBooking.id);

      // Prepare Supabase data with UUID and superuser fields
      const supabaseData = {
        id: finalBooking.id,
        name: finalBooking.name,
        start_date: finalBooking.startDate,
        end_date: finalBooking.endDate,
        arrival_time: finalBooking.arrivalTime || null,
        departure_time: finalBooking.departureTime || null,
        guests: finalBooking.guests,
        user_id: finalBooking.userId,
        user_color: finalBooking.userColor,
        is_double_booking: finalBooking.isDoubleBooking,
        created_at: finalBooking.createdAt,
        is_super_user_booking: finalBooking.isSuperUserBooking,
        super_user_name: finalBooking.superUserName
      };

      // Save to Supabase
      const {error} = await supabase
        .from('bookings_sommerhus_2024')
        .insert([supabaseData]);

      if (error) {
        console.error('❌ Supabase save failed:', error);
        toast.error(`Fejl ved gemning: ${error.message}`);
        return false;
      }

      console.log('✅ Saved to Supabase successfully');
      toast.success('✅ Booking gemt!');
      
      // Immediately reload from Supabase to get fresh data
      await loadFromSupabase();
      return true;
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error(`Fejl: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 🔥 DELETE FROM SUPABASE ONLY
  const deleteFromSupabase = async (id) => {
    try {
      const booking = bookings.find(b => b.id === id);
      if (booking?.userId !== user?.id && !user?.isSuperUser) {
        toast.error('Du kan kun slette dine egne bookinger');
        return;
      }

      console.log('🗑️ Deleting from Supabase:', id);
      
      const {error} = await supabase
        .from('bookings_sommerhus_2024')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Supabase delete failed:', error);
        toast.error(`Fejl ved sletning: ${error.message}`);
        return;
      }

      console.log('✅ Deleted from Supabase successfully');
      toast.success('✅ Booking slettet!');
      
      // Immediately reload from Supabase
      await loadFromSupabase();
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast.error(`Fejl: ${error.message}`);
    }
  };

  // 🔥 SETUP - Supabase first, real-time updates
  useEffect(() => {
    console.log('🚀 Setting up Supabase-first calendar...');
    
    // Load from Supabase immediately
    loadFromSupabase();

    // Real-time subscription
    const channel = supabase
      .channel('bookings-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings_sommerhus_2024'
      }, (payload) => {
        console.log('📡 Real-time update:', payload.eventType);
        // Reload immediately when any change happens
        setTimeout(() => loadFromSupabase(), 200);
      })
      .subscribe();

    // Periodic sync every 30 seconds (just to be sure)
    const syncInterval = setInterval(() => {
      console.log('⏰ Periodic Supabase sync');
      loadFromSupabase();
    }, 30000);

    return () => {
      channel.unsubscribe();
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
    return date && 
           date.getDate() === today.getDate() &&
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

  const isDatePassed = (dateString) => {
    return new Date(dateString) < new Date();
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
      name: newBooking.name,
      startDate: newBooking.startDate,
      endDate: newBooking.endDate,
      guests: parseInt(newBooking.guests),
      arrivalTime: newBooking.arrivalTime || '',
      departureTime: newBooking.departureTime || '',
      userId: user?.id || 'unknown',
      userColor: user?.calendarColor || '#2563eb'
    };

    const success = await saveToSupabase(bookingData, acceptDoubleBooking);
    
    if (success) {
      // Reset form
      setNewBooking({
        name: user?.fullName || '',
        startDate: '',
        endDate: '',
        guests: 1,
        arrivalTime: '',
        departureTime: ''
      });
      setShowForm(false);
      setShowConflictDialog(false);
      setConflictBooking(null);
    }
  };

  // Export function 
  const exportToPDF = () => {
    try {
      const sortedBookings = [...bookings].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      
      let content = `SOMMERHUS I EBELTOFT - BOOKING OVERSIGT\n`;
      content += `Genereret: ${new Date().toLocaleDateString('da-DK')} kl. ${new Date().toLocaleTimeString('da-DK')}\n`;
      content += `${'='.repeat(60)}\n\n`;

      if (sortedBookings.length === 0) {
        content += `Ingen bookinger fundet.\n`;
      } else {
        sortedBookings.forEach((booking, index) => {
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          const weekStart = getWeekNumber(startDate);
          const weekEnd = getWeekNumber(endDate);
          
          content += `${index + 1}. ${booking.name}\n`;
          content += `  Periode: ${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}\n`;
          content += `  Uger: ${weekStart === weekEnd ? `Uge ${weekStart}` : `Uge ${weekStart}-${weekEnd}`}\n`;
          content += `  Gæster: ${booking.guests}\n`;
          
          if (booking.arrivalTime || booking.departureTime) {
            content += `  Tider: `;
            if (booking.arrivalTime) content += `Ankomst ${booking.arrivalTime}`;
            if (booking.arrivalTime && booking.departureTime) content += ` | `;
            if (booking.departureTime) content += `Afgang ${booking.departureTime}`;
            content += `\n`;
          }
          
          if (booking.isDoubleBooking) {
            content += `  ⚠️ DOBBELTBOOKING\n`;
          }
          
          if (booking.isSuperUserBooking) {
            content += `  👑 Oprettet af superbruger: ${booking.superUserName}\n`;
          }
          
          content += `\n`;
        });
      }

      content += `${'='.repeat(60)}\n`;
      content += `Eksporteret fra Sommerhus App\n`;

      const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
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
  const monthName = currentMonth.toLocaleDateString('da-DK', {month: 'long', year: 'numeric'});
  const timeOptions = generateTimeOptions();

  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage = backgroundImages.kalender;

  return (
    <div className={`max-w-5xl mx-auto ${backgroundImage ? 'bg-white/95 backdrop-blur-sm rounded-2xl p-4' : ''}`} style={backgroundImage ? {backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {}}>
      {/* Header */}
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
            <SafeIcon icon={FiCalendar} className="w-7 h-7" />
            Kalender
            {loading && <div className="w-4 h-4 border-2 border-ebeltoft-blue border-t-transparent rounded-full animate-spin ml-2" />}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFromSupabase(true)}
            disabled={syncing}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Henter...' : 'Genindlæs'}</span>
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

        {/* Booking Form */}
        {showForm && (
          <motion.form
            initial={{opacity: 0, height: 0}}
            animate={{opacity: 1, height: 'auto'}}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light rounded-xl p-6 mt-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Opret booking</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Navn</label>
                  <input
                    type="text"
                    value={newBooking.name}
                    onChange={(e) => setNewBooking({...newBooking, name: e.target.value})}
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
                    onChange={(e) => setNewBooking({...newBooking, guests: e.target.value})}
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
                    onChange={(e) => setNewBooking({...newBooking, startDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Til dato</label>
                  <input
                    type="date"
                    value={newBooking.endDate}
                    onChange={(e) => setNewBooking({...newBooking, endDate: e.target.value})}
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
                    onChange={(e) => setNewBooking({...newBooking, arrivalTime: e.target.value})}
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
                    onChange={(e) => setNewBooking({...newBooking, departureTime: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  >
                    <option value="">Vælg tid</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
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
            const weekNumber = getWeekNumber(currentDate);

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
                <div className="text-xs text-gray-500 mb-1">
                  Uge {weekNumber}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-xs px-2 py-1 rounded text-white font-medium truncate ${
                        booking.isDoubleBooking ? 'border border-yellow-400' : ''
                      }`}
                      style={{backgroundColor: booking.userColor}}
                      title={`${booking.name} (${booking.guests} gæster)${
                        booking.isDoubleBooking ? ' - DOBBELTBOOKING' : ''
                      }${
                        booking.isSuperUserBooking ? ' - Oprettet af superbruger' : ''
                      }`}
                    >
                      {booking.name.split(' ')[0]}
                      {booking.isDoubleBooking && ' ⚠️'}
                      {booking.isSuperUserBooking && ' 👑'}
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
              })} - Uge {getWeekNumber(selectedDate)}
            </h4>
            
            {getBookingsForDate(selectedDate).length > 0 ? (
              <div className="space-y-3">
                {getBookingsForDate(selectedDate).map(booking => (
                  <div key={booking.id} className={`p-4 bg-white rounded-lg border-l-4 ${
                    booking.isDoubleBooking ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: booking.userColor}}></div>
                        <div>
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {booking.name}
                            {booking.isDoubleBooking && (
                              <span className="text-yellow-600 text-xs font-normal">⚠️ Dobbeltbooking</span>
                            )}
                            {booking.isSuperUserBooking && (
                              <span className="text-purple-600 text-xs font-normal">👑 Superbruger</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <SafeIcon icon={FiUsers} className="w-4 h-4" />
                              {booking.guests} gæster
                            </span>
                            <span>
                              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                            </span>
                            <span>
                              Uge {getWeekNumber(new Date(booking.startDate))}{
                                getWeekNumber(new Date(booking.startDate)) !== getWeekNumber(new Date(booking.endDate)) 
                                  ? `-${getWeekNumber(new Date(booking.endDate))}` 
                                  : ''
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      {(booking.userId === user?.id || user?.isSuperUser) && (
                        <button
                          onClick={() => deleteFromSupabase(booking.id)}
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
          initial={{opacity: 0, scale: 0.9}}
          animate={{opacity: 1, scale: 1}}
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

      {/* Booking List */}
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
        <h3 className="text-xl font-bold text-ebeltoft-dark mb-6">Alle bookinger</h3>
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <SafeIcon icon={FiCalendar} className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Ingen bookinger endnu.</p>
            </div>
          ) : (
            bookings
              .slice()
              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
              .map((booking) => (
                <motion.div
                  key={booking.id}
                  initial={{opacity: 0, y: 10}}
                  animate={{opacity: 1, y: 0}}
                  className={`p-4 border border-gray-200 rounded-lg transition-colors ${
                    isDatePassed(booking.endDate)
                      ? 'opacity-60 bg-gray-50'
                      : booking.isDoubleBooking
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded" style={{backgroundColor: booking.userColor}}></div>
                        <SafeIcon icon={FiUsers} className="w-5 h-5 text-ebeltoft-blue" />
                        <h4 className="font-semibold text-ebeltoft-dark">{booking.name}</h4>
                        <span className="text-sm text-gray-500">({booking.guests} gæster)</span>
                        {booking.isDoubleBooking && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Dobbeltbooking
                          </span>
                        )}
                        {booking.isSuperUserBooking && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                            <SafeIcon icon={FiShield} className="w-3 h-3" />
                            Oprettet af {booking.superUserName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                          <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                        </div>
                        <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                          Uge {getWeekNumber(new Date(booking.startDate))}{
                            getWeekNumber(new Date(booking.startDate)) !== getWeekNumber(new Date(booking.endDate)) 
                              ? `-${getWeekNumber(new Date(booking.endDate))}` 
                              : ''
                          }
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
                    {(booking.userId === user?.id || user?.isSuperUser) && (
                      <button
                        onClick={() => deleteFromSupabase(booking.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <SafeIcon icon={FiTrash2} className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseFirstCalendar;