import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiSend, FiUser, FiClock } = FiIcons;

const MessageWall = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      author: 'Anna',
      content: 'Tak for en fantastisk uge! Husk at tjekke fryseren før I tager afsted 😊',
      timestamp: new Date('2024-01-15T10:30:00'),
    },
    {
      id: 2,
      author: 'Lars',
      content: 'Vi kommer næste weekend. Ser frem til at prøve den nye grill!',
      timestamp: new Date('2024-01-16T14:20:00'),
    },
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && authorName.trim()) {
      const message = {
        id: Date.now(),
        author: authorName,
        content: newMessage,
        timestamp: new Date(),
      };
      setMessages([message, ...messages]);
      setNewMessage('');
    }
  };

  const formatTime = (date) => {
    return date.toLocaleDateString('da-DK') + ' kl. ' + date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-ebeltoft-dark mb-4">Besked væg</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Dit navn..."
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Skriv din besked..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
            />
            <motion.button
              type="submit"
              className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SafeIcon icon={FiSend} className="w-5 h-5" />
            </motion.button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <SafeIcon icon={FiUser} className="w-4 h-4 text-ebeltoft-blue" />
              <span className="font-medium text-ebeltoft-dark">{message.author}</span>
              <SafeIcon icon={FiClock} className="w-4 h-4 text-gray-400 ml-auto" />
              <span className="text-sm text-gray-500">{formatTime(message.timestamp)}</span>
            </div>
            <p className="text-gray-700">{message.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MessageWall;