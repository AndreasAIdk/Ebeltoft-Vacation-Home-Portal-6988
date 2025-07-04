import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiCalendar, FiClock, FiUser, FiPlus, FiTrash2 } = FiIcons;

const Calendar = () => {
  const [bookings, setBookings] = useState([
    {
      id: 1,
      name: 'Familie Hansen',
      startDate: '2024-02-15',
      endDate: '2024-02-18',
      arrivalTime: '16:00',
      departureTime: '11:00',
      guests: 4,
    },
    {
      id: 2,
      name: 'Anna & Lars',
      startDate: '2024-02-25',
      endDate: '2024-02-28',
      arrivalTime: '15:30',
      departureTime: '10:30',
      guests: 2,
    },
  ]);

  const [newBooking, setNewBooking] = useState({
    name: '',
    startDate: '',
    endDate: '',
    arrivalTime: '',
    departureTime: '',
    guests: 1,
  });

  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newBooking.name && newBooking.startDate && newBooking.endDate) {
      const booking = {
        id: Date.now(),
        ...newBooking,
        guests: parseInt(newBooking.guests),
      };
      setBookings([...bookings, booking].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
      setNewBooking({
        name: '',
        startDate: '',
        endDate: '',
        arrivalTime: '',
        departureTime: '',
        guests: 1,
      });
      setShowForm(false);
    }
  };

  const deleteBooking = (id) => {
    setBookings(bookings.filter(booking => booking.id !== id));
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
                <input
                  type="time"
                  value={newBooking.arrivalTime}
                  onChange={(e) => setNewBooking({...newBooking, arrivalTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Afgang tid (ca.)</label>
                <input
                  type="time"
                  value={newBooking.departureTime}
                  onChange={(e) => setNewBooking({...newBooking, departureTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
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
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
              isDatePassed(booking.endDate) ? 'border-gray-400 opacity-60' : 'border-ebeltoft-blue'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <SafeIcon icon={FiUser} className="w-5 h-5 text-ebeltoft-blue" />
                  <h3 className="text-lg font-semibold text-ebeltoft-dark">{booking.name}</h3>
                  <span className="text-sm text-gray-500">({booking.guests} gæster)</span>
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
              
              <button
                onClick={() => deleteBooking(booking.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <SafeIcon icon={FiTrash2} className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;