import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const { FiCalendar, FiUsers, FiClock, FiPlus, FiTrash2, FiAlertTriangle } = FiIcons;

const CalendarView = () => {
  const { user } = useAuth();
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
  
  // Create ref for booking form
  const bookingFormRef = useRef(null);

  useEffect(() => {
    const storedBookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
    setBookings(storedBookings);
  }, []);

  // Auto-scroll to booking form when it's shown
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

  const saveBooking = (acceptDoubleBooking = false) => {
    const booking = {
      id: Date.now(),
      ...newBooking,
      guests: parseInt(newBooking.guests),
      userId: user.id,
      userColor: user.calendarColor || '#2563eb',
      isDoubleBooking: acceptDoubleBooking,
      createdAt: new Date().toISOString()
    };

    const updatedBookings = [...bookings, booking].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    setBookings(updatedBookings);
    localStorage.setItem('sommerhus_bookings', JSON.stringify(updatedBookings));
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
  };

  const deleteBooking = (id) => {
    const updatedBookings = bookings.filter(booking => booking.id !== id);
    setBookings(updatedBookings);
    localStorage.setItem('sommerhus_bookings', JSON.stringify(updatedBookings));
    toast.success('Booking slettet');
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

  // Generate visual calendar overview
  const generateCalendarOverview = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Get bookings for the current month
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

  // Get unique users with their colors
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

  // Get background image for this tab
  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage = backgroundImages.kalender;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
            <SafeIcon icon={FiCalendar} className="w-7 h-7" />
            Kalender & Booking
          </h2>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            Ny booking
          </motion.button>
        </div>

        {/* Visual Calendar Overview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ebeltoft-dark">
              {currentMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })}
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

          {/* Calendar Grid */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'].map(day => (
                <div key={day} className="p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="h-16 border-r border-b border-gray-200 last:border-r-0"></div>;
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
                    className="h-16 border-r border-b border-gray-200 last:border-r-0 p-1 relative cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedDate(currentDate)}
                  >
                    <div className="text-sm font-medium text-gray-700 mb-1">{day}</div>
                    {dayBookings.length > 0 && (
                      <div className="space-y-1">
                        {dayBookings.slice(0, 2).map((booking, bookingIndex) => (
                          <div
                            key={booking.id}
                            className="text-xs px-1 py-0.5 rounded text-white truncate"
                            style={{ backgroundColor: booking.userColor }}
                            title={`${booking.name} (${booking.guests} gæster)`}
                          >
                            {booking.name}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayBookings.length - 2} mere
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Legend */}
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

        {/* Booking Form */}
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
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
              >
                Gem booking
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
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex-1"
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

      {/* Bookings List */}
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
        <h3 className="text-xl font-bold text-ebeltoft-dark mb-6">Alle bookinger</h3>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 border border-gray-200 rounded-lg ${
                isDatePassed(booking.endDate) ? 'opacity-60 bg-gray-50/90' : 
                booking.isDoubleBooking ? 'bg-yellow-50/90 border-yellow-200' : 
                'bg-white/90 hover:bg-gray-50/90'
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
                    className="text-red-500 hover:text-red-700 transition-colors"
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