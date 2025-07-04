import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCamera, FiPlus, FiTrash2, FiUser, FiCalendar, FiMaximize2, FiUpload, FiHeart, FiMessageCircle } = FiIcons;

const PhotoAlbum = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [newPhoto, setNewPhoto] = useState({
    caption: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [newReply, setNewReply] = useState('');

  useEffect(() => {
    const storedPhotos = JSON.parse(localStorage.getItem('sommerhus_photos') || '[]');
    setPhotos(storedPhotos);
  }, []);

  const sendNotification = (taggedUsers, messageContent) => {
    const users = JSON.parse(localStorage.getItem('sommerhus_users') || '[]');
    
    taggedUsers.forEach(username => {
      const taggedUser = users.find(u => u.username === username && u.allowNotifications);
      if (taggedUser && taggedUser.phoneNumber) {
        console.log(`📱 Notification sent to ${taggedUser.phoneNumber}: You were tagged in a photo comment: ${messageContent}`);
        toast.success(`Notifikation sendt til @${username}`);
      }
    });
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

  const onDrop = (acceptedFiles) => {
    acceptedFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Billedet er for stort. Maksimum 10MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Kun billeder er tilladt.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const photo = {
          id: Date.now() + Math.random(),
          url: e.target.result,
          caption: newPhoto.caption || `Billede uploadet af ${user.fullName}`,
          author: user.fullName,
          authorId: user.id,
          date: new Date().toISOString().split('T')[0],
          likes: [],
          comments: []
        };

        const updatedPhotos = [photo, ...photos];
        setPhotos(updatedPhotos);
        localStorage.setItem('sommerhus_photos', JSON.stringify(updatedPhotos));
        toast.success('Billede uploadet!');
      };
      reader.readAsDataURL(file);
    });

    setNewPhoto({ caption: '' });
    setShowForm(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (newPhoto.url && newPhoto.caption) {
      const photo = {
        id: Date.now(),
        url: newPhoto.url,
        caption: newPhoto.caption,
        author: user.fullName,
        authorId: user.id,
        date: new Date().toISOString().split('T')[0],
        likes: [],
        comments: []
      };

      const updatedPhotos = [photo, ...photos];
      setPhotos(updatedPhotos);
      localStorage.setItem('sommerhus_photos', JSON.stringify(updatedPhotos));
      setNewPhoto({ caption: '' });
      setShowForm(false);
      toast.success('Billede tilføjet!');
    }
  };

  const handleLike = (photoId, isReply = false, replyId = null) => {
    const updatedPhotos = photos.map(photo => {
      if (photo.id === photoId) {
        if (isReply && replyId) {
          // Like a reply
          const updatedComments = photo.comments.map(comment => {
            if (comment.id === replyId) {
              const likes = comment.likes || [];
              const hasLiked = likes.includes(user.id);
              
              return {
                ...comment,
                likes: hasLiked 
                  ? likes.filter(id => id !== user.id)
                  : [...likes, user.id]
              };
            }
            return comment;
          });
          
          return { ...photo, comments: updatedComments };
        } else {
          // Like photo
          const likes = photo.likes || [];
          const hasLiked = likes.includes(user.id);
          
          return {
            ...photo,
            likes: hasLiked 
              ? likes.filter(id => id !== user.id)
              : [...likes, user.id]
          };
        }
      }
      return photo;
    });
    
    setPhotos(updatedPhotos);
    localStorage.setItem('sommerhus_photos', JSON.stringify(updatedPhotos));
  };

  const handleComment = (photoId) => {
    if (newReply.trim()) {
      const mentions = extractMentions(newReply);
      
      const updatedPhotos = photos.map(photo => {
        if (photo.id === photoId) {
          const comment = {
            id: Date.now(),
            author: user.fullName,
            authorId: user.id,
            content: newReply,
            timestamp: new Date().toISOString(),
            likes: []
          };
          
          return {
            ...photo,
            comments: [...(photo.comments || []), comment]
          };
        }
        return photo;
      });
      
      setPhotos(updatedPhotos);
      localStorage.setItem('sommerhus_photos', JSON.stringify(updatedPhotos));
      setNewReply('');
      setReplyingTo(null);
      
      if (mentions.length > 0) {
        sendNotification(mentions, newReply);
      }
      
      toast.success('Kommentar tilføjet!');
    }
  };

  const deletePhoto = (id) => {
    const updatedPhotos = photos.filter(photo => photo.id !== id);
    setPhotos(updatedPhotos);
    localStorage.setItem('sommerhus_photos', JSON.stringify(updatedPhotos));
    toast.success('Billede slettet');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">Fotoalbum</h2>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            Upload billede
          </motion.button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Upload billede</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beskrivelse</label>
                <input
                  type="text"
                  value={newPhoto.caption}
                  onChange={(e) => setNewPhoto({...newPhoto, caption: e.target.value})}
                  placeholder="Beskriv billedet..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>

              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-ebeltoft-blue bg-ebeltoft-light' : 'border-gray-300 hover:border-ebeltoft-blue'
                }`}
              >
                <input {...getInputProps()} />
                <SafeIcon icon={FiUpload} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {isDragActive ? 'Slip billederne her...' : 'Træk og slip billeder her, eller klik for at vælge'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Understøtter: JPG, PNG, GIF, WebP (max 10MB per billede)
                </p>
              </div>

              <div className="text-center text-gray-500">eller</div>

              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billede URL</label>
                  <input
                    type="url"
                    value={newPhoto.url || ''}
                    onChange={(e) => setNewPhoto({...newPhoto, url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
                  >
                    Tilføj fra URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Annuller
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="relative group">
              <img
                src={photo.url}
                alt={photo.caption}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <SafeIcon icon={FiMaximize2} className="w-4 h-4" />
                  </button>
                  {photo.authorId === user.id && (
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors text-red-500"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">{photo.caption}</h3>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiUser} className="w-4 h-4" />
                  <span>{photo.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                  <span>{formatDate(photo.date)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <button
                  onClick={() => handleLike(photo.id)}
                  className={`flex items-center gap-1 transition-colors ${
                    (photo.likes || []).includes(user.id) 
                      ? 'text-red-500' 
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <SafeIcon icon={FiHeart} className="w-4 h-4" />
                  <span>{(photo.likes || []).length}</span>
                </button>
                
                <button
                  onClick={() => setReplyingTo(replyingTo === photo.id ? null : photo.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-ebeltoft-blue transition-colors"
                >
                  <SafeIcon icon={FiMessageCircle} className="w-4 h-4" />
                  <span>{(photo.comments || []).length}</span>
                </button>
              </div>

              {/* Comments */}
              {(photo.comments || []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {photo.comments.slice(-2).map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-ebeltoft-dark">{comment.author}</span>
                          <span className="text-xs text-gray-500">{formatTime(comment.timestamp)}</span>
                        </div>
                        
                        <button
                          onClick={() => handleLike(photo.id, true, comment.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            (comment.likes || []).includes(user.id) 
                              ? 'text-red-500' 
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <SafeIcon icon={FiHeart} className="w-3 h-3" />
                          <span>{(comment.likes || []).length}</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-700">{renderMessageContent(comment.content)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment form */}
              {replyingTo === photo.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Skriv en kommentar... (brug @ for at tagge)"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => handleComment(photo.id)}
                    className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors text-sm"
                  >
                    Send
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {selectedPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="bg-white rounded-xl overflow-hidden max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{selectedPhoto.caption}</h3>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiUser} className="w-4 h-4" />
                  <span>{selectedPhoto.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                  <span>{formatDate(selectedPhoto.date)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default PhotoAlbum;