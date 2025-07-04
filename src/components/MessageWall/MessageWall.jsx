import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiSend, FiUser, FiClock, FiHeart, FiMessageCircle, FiTrash2, FiCornerDownRight } = FiIcons;

// Custom pin icon that looks like a thumbtack/pushpin
const PinIcon = ({ className = '', ...props }) => (
  <svg className={className} {...props} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2C13.1 2 14 2.9 14 4C14 4.74 13.6 5.39 13 5.73V7H16V9H15V16L12 18L9 16V9H8V7H11V5.73C10.4 5.39 10 4.74 10 4C10 2.9 10.9 2 12 2M11 10V15.5L12 16L13 15.5V10H11Z"/>
  </svg>
);

const MessageWall = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [newReply, setNewReply] = useState('');
  const [expandedThreads, setExpandedThreads] = useState(new Set());

  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem('sommerhus_messages') || '[]');
    setMessages(storedMessages);
  }, []);

  const sendNotification = (taggedUsers, messageContent, isReply = false, originalAuthor = null) => {
    const users = JSON.parse(localStorage.getItem('sommerhus_users') || '[]');
    
    // Notify tagged users
    taggedUsers.forEach(username => {
      const taggedUser = users.find(u => u.username === username && u.allowNotifications);
      if (taggedUser && taggedUser.phoneNumber && taggedUser.id !== user.id) {
        addNotification(taggedUser.id, `@${user.username} taggede dig: ${messageContent.substring(0, 50)}...`);
        toast.success(`Notifikation sendt til @${username}`);
      }
    });

    // Notify original message author when someone replies (if not already tagged)
    if (isReply && originalAuthor && originalAuthor.id !== user.id && originalAuthor.allowNotifications) {
      const isAlreadyTagged = taggedUsers.includes(originalAuthor.username);
      if (!isAlreadyTagged) {
        addNotification(originalAuthor.id, `${user.fullName} svarede på din besked: ${messageContent.substring(0, 50)}...`);
      }
    }
  };

  const addNotification = (userId, message) => {
    const notifications = JSON.parse(localStorage.getItem('sommerhus_notifications') || '[]');
    const notification = {
      id: Date.now() + Math.random(),
      userId,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    notifications.push(notification);
    localStorage.setItem('sommerhus_notifications', JSON.stringify(notifications));
    
    // Trigger a custom event to update notification center
    window.dispatchEvent(new CustomEvent('notificationUpdate'));
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const renderMessageContent = (content) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-ebeltoft-blue font-medium bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const mentions = extractMentions(newMessage);
      const message = {
        id: Date.now(),
        author: user.fullName,
        authorId: user.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        likes: [],
        replies: [],
        isPinned: false
      };

      const updatedMessages = [message, ...messages];
      setMessages(updatedMessages);
      localStorage.setItem('sommerhus_messages', JSON.stringify(updatedMessages));
      setNewMessage('');

      if (mentions.length > 0) {
        sendNotification(mentions, newMessage);
      }

      toast.success('Besked sendt!');
    }
  };

  const handleReply = (messageId, parentReplyId = null) => {
    if (newReply.trim()) {
      const mentions = extractMentions(newReply);
      const originalMessage = messages.find(m => m.id === messageId);
      
      // Find the original author for notifications
      let originalAuthor = null;
      if (originalMessage) {
        if (parentReplyId) {
          // Find the author of the reply we're replying to
          const findReplyAuthor = (replies) => {
            for (const reply of replies) {
              if (reply.id === parentReplyId) {
                return {
                  id: reply.authorId,
                  username: reply.author.toLowerCase().replace(/\s+/g, ''),
                  allowNotifications: true
                };
              }
              if (reply.replies && reply.replies.length > 0) {
                const found = findReplyAuthor(reply.replies);
                if (found) return found;
              }
            }
            return null;
          };
          originalAuthor = findReplyAuthor(originalMessage.replies || []);
        } else {
          originalAuthor = {
            id: originalMessage.authorId,
            username: originalMessage.author.toLowerCase().replace(/\s+/g, ''),
            allowNotifications: true
          };
        }
      }

      const reply = {
        id: Date.now(),
        author: user.fullName,
        authorId: user.id,
        content: newReply,
        timestamp: new Date().toISOString(),
        likes: [],
        replies: [],
        parentReplyId
      };

      const updatedMessages = messages.map(message => {
        if (message.id === messageId) {
          if (parentReplyId) {
            // This is a reply to a reply - add it to the nested structure
            const addReplyToNested = (replies) => {
              return replies.map(r => {
                if (r.id === parentReplyId) {
                  return { ...r, replies: [...(r.replies || []), reply] };
                } else if (r.replies && r.replies.length > 0) {
                  return { ...r, replies: addReplyToNested(r.replies) };
                }
                return r;
              });
            };
            return { ...message, replies: addReplyToNested(message.replies || []) };
          } else {
            // This is a direct reply to the main message
            return { ...message, replies: [...(message.replies || []), reply] };
          }
        }
        return message;
      });

      setMessages(updatedMessages);
      localStorage.setItem('sommerhus_messages', JSON.stringify(updatedMessages));
      setNewReply('');
      setReplyingTo(null);
      
      // Expand the thread to show the new reply
      setExpandedThreads(prev => new Set([...prev, messageId]));

      if (mentions.length > 0 || originalAuthor) {
        sendNotification(mentions, newReply, true, originalAuthor);
      }

      toast.success('Svar sendt!');
    }
  };

  const handleLike = (messageId, isReply = false, replyId = null) => {
    const updatedMessages = messages.map(message => {
      if (message.id === messageId) {
        if (isReply && replyId) {
          // Like a reply (could be nested)
          const updateLikesInReplies = (replies) => {
            return replies.map(reply => {
              if (reply.id === replyId) {
                const likes = reply.likes || [];
                const hasLiked = likes.includes(user.id);
                return {
                  ...reply,
                  likes: hasLiked 
                    ? likes.filter(id => id !== user.id)
                    : [...likes, user.id]
                };
              } else if (reply.replies && reply.replies.length > 0) {
                return { ...reply, replies: updateLikesInReplies(reply.replies) };
              }
              return reply;
            });
          };
          return { ...message, replies: updateLikesInReplies(message.replies || []) };
        } else {
          // Like main message
          const likes = message.likes || [];
          const hasLiked = likes.includes(user.id);
          return {
            ...message,
            likes: hasLiked 
              ? likes.filter(id => id !== user.id)
              : [...likes, user.id]
          };
        }
      }
      return message;
    });

    setMessages(updatedMessages);
    localStorage.setItem('sommerhus_messages', JSON.stringify(updatedMessages));
  };

  const togglePin = (messageId) => {
    const updatedMessages = messages.map(message => {
      if (message.id === messageId) {
        return { ...message, isPinned: !message.isPinned };
      }
      return message;
    });

    setMessages(updatedMessages);
    localStorage.setItem('sommerhus_messages', JSON.stringify(updatedMessages));
    toast.success(`Besked ${messages.find(m => m.id === messageId)?.isPinned ? 'unpinnet' : 'pinnet'}`);
  };

  const deleteMessage = (messageId) => {
    const updatedMessages = messages.filter(message => message.id !== messageId);
    setMessages(updatedMessages);
    localStorage.setItem('sommerhus_messages', JSON.stringify(updatedMessages));
    toast.success('Besked slettet');
  };

  const toggleThread = (messageId) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('da-DK', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalRepliesCount = (replies) => {
    let count = replies.length;
    replies.forEach(reply => {
      if (reply.replies && reply.replies.length > 0) {
        count += getTotalRepliesCount(reply.replies);
      }
    });
    return count;
  };

  const renderReplies = (replies, messageId, level = 0) => {
    return replies.map((reply) => (
      <div key={reply.id} className={`${level > 0 ? 'ml-4' : ''} mt-3 border-l-2 border-gray-200 pl-4`}>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <SafeIcon icon={FiUser} className="w-4 h-4 text-ebeltoft-blue" />
            <span className="font-medium text-sm text-ebeltoft-dark">{reply.author}</span>
            <SafeIcon icon={FiClock} className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{formatTime(reply.timestamp)}</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{renderMessageContent(reply.content)}</p>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => handleLike(messageId, true, reply.id)}
              className={`flex items-center gap-1 transition-colors ${
                (reply.likes || []).includes(user.id) 
                  ? 'text-red-500' 
                  : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <SafeIcon icon={FiHeart} className="w-3 h-3" />
              <span>{(reply.likes || []).length}</span>
            </button>
            <button
              onClick={() => setReplyingTo(`${messageId}-${reply.id}`)}
              className="flex items-center gap-1 text-gray-500 hover:text-ebeltoft-blue transition-colors"
            >
              <SafeIcon icon={FiMessageCircle} className="w-3 h-3" />
              <span>Svar</span>
            </button>
          </div>
          {replyingTo === `${messageId}-${reply.id}` && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                placeholder="Skriv et svar..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                autoFocus
              />
              <button
                onClick={() => handleReply(messageId, reply.id)}
                className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors text-sm"
              >
                Svar
              </button>
            </motion.div>
          )}
        </div>
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-2">
            {renderReplies(reply.replies, messageId, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Sort messages: pinned first, then by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-ebeltoft-dark mb-4">Beskedvæg</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Skriv din besked... (brug @ for at tagge andre)"
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
          <p className="text-xs text-gray-500">
            💡 Tip: Skriv @brugernavn for at tagge andre og sende notifikation
          </p>
        </form>
      </div>

      <div className="space-y-4">
        {sortedMessages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl shadow-md p-6 ${
              message.isPinned ? 'border-l-4 border-yellow-400 bg-yellow-50' : ''
            }`}
          >
            {message.isPinned && (
              <div className="flex items-center gap-2 mb-3 text-yellow-600">
                <PinIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Fastgjort besked</span>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SafeIcon icon={FiUser} className="w-5 h-5 text-ebeltoft-blue" />
                <span className="font-medium text-ebeltoft-dark">{message.author}</span>
                <SafeIcon icon={FiClock} className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{formatTime(message.timestamp)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => togglePin(message.id)}
                  className={`transition-colors ${
                    message.isPinned ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                  }`}
                >
                  <PinIcon className="w-4 h-4" />
                </button>
                {message.authorId === user.id && (
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-700 mb-4">{renderMessageContent(message.content)}</p>

            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => handleLike(message.id)}
                className={`flex items-center gap-1 transition-colors ${
                  (message.likes || []).includes(user.id) 
                    ? 'text-red-500' 
                    : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <SafeIcon icon={FiHeart} className="w-4 h-4" />
                <span>{(message.likes || []).length}</span>
              </button>
              
              <button
                onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                className="flex items-center gap-1 text-gray-500 hover:text-ebeltoft-blue transition-colors"
              >
                <SafeIcon icon={FiMessageCircle} className="w-4 h-4" />
                <span>Svar</span>
              </button>

              {(message.replies || []).length > 0 && (
                <button
                  onClick={() => toggleThread(message.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-ebeltoft-blue transition-colors"
                >
                  <SafeIcon icon={FiCornerDownRight} className="w-4 h-4" />
                  <span>
                    {expandedThreads.has(message.id) ? 'Skjul' : 'Vis'} {getTotalRepliesCount(message.replies)} svar
                  </span>
                </button>
              )}
            </div>

            {replyingTo === message.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 flex gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <SafeIcon icon={FiCornerDownRight} className="w-4 h-4 text-gray-400 mt-2" />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Skriv et svar... (brug @ for at tagge)"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handleReply(message.id)}
                    className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors text-sm"
                  >
                    Svar
                  </button>
                </div>
              </motion.div>
            )}

            {(message.replies || []).length > 0 && expandedThreads.has(message.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4"
              >
                {renderReplies(message.replies, message.id)}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MessageWall;