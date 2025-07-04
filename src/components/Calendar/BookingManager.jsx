import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCalendar, FiClock, FiUser, FiPlus, FiTrash2, FiAlertTriangle } = FiIcons;

const BookingManager = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    const storedBookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
    setBookings(storedBookings);
  }, []);

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

  const timeOptions = generateTimeOptions();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">Booking kalender</h2>
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

        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ankomst dato</label>
                <input
                  type="date"
                  value={newBooking.startDate}
                  onChange={(e) => setNewBooking({...newBooking, startDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Afgang dato</label>
                <input
                  type="date"
                  value={newBooking.endDate}
                  onChange={(e) => setNewBooking({...newBooking, endDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
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

      <div className="space-y-4">
        {bookings.map((booking) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
              isDatePassed(booking.endDate) 
                ? 'border-gray-400 opacity-60' 
                : booking.isDoubleBooking 
                  ? 'border-yellow-400' 
                  : 'border-ebeltoft-blue'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <SafeIcon icon={FiUser} className="w-5 h-5 text-ebeltoft-blue" />
                  <h3 className="text-lg font-semibold text-ebeltoft-dark">{booking.name}</h3>
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
  );
};

export default BookingManager;