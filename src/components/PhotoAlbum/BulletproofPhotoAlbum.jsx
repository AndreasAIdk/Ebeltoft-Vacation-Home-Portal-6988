import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useDropzone } from 'react-dropzone';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCamera, FiPlus, FiTrash2, FiUser, FiCalendar, FiImage, FiMaximize2, FiUpload, FiHeart, FiMessageCircle, FiX, FiRefreshCw, FiAtSign } = FiIcons;

const BulletproofPhotoAlbum = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [newPhoto, setNewPhoto] = useState({
    caption: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);

  // 🔥 PROPER UUID GENERATION (same as calendar)
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 🔥 SUPABASE FIRST - Load from Supabase ALWAYS (same pattern as calendar)
  const loadFromSupabase = async (showToast = false) => {
    if (showToast) setSyncing(true);
    try {
      console.log('📡 Loading photos from Supabase MASTER...');

      const { data: supabasePhotos, error } = await supabase
        .from('photos_sommerhus_2024')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && supabasePhotos) {
        const convertedPhotos = supabasePhotos.map(photo => ({
          id: photo.id,
          url: photo.image_url,
          caption: photo.caption,
          author: photo.author_name,
          authorId: photo.author_id,
          date: photo.created_at ? photo.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          likes: photo.likes || [],
          comments: photo.comments || [],
          mentionedUsers: photo.mentioned_users || []
        }));

        console.log('✅ Loaded from Supabase:', convertedPhotos.length, 'photos');
        setPhotos(convertedPhotos);
        
        // Backup to localStorage
        localStorage.setItem('sommerhus_photos_backup', JSON.stringify(convertedPhotos));

        if (showToast) {
          toast.success(`✅ ${convertedPhotos.length} billeder hentet fra server`);
        }
      } else {
        console.log('⚠️ Supabase error, using localStorage:', error?.message);
        const localPhotos = JSON.parse(localStorage.getItem('sommerhus_photos_backup') || '[]');
        setPhotos(localPhotos);
        if (showToast) {
          toast.info('Bruger lokal data som backup');
        }
      }
    } catch (error) {
      console.error('❌ Load error:', error);
      if (showToast) toast.error('Fejl ved forbindelse til server');
      const localPhotos = JSON.parse(localStorage.getItem('sommerhus_photos_backup') || '[]');
      setPhotos(localPhotos);
    } finally {
      if (showToast) setSyncing(false);
    }
  };

  // Load users for mentions
  const loadUsers = async () => {
    try {
      const { data: supabaseUsers, error } = await supabase
        .from('users_sommerhus_2024')
        .select('id, username, full_name');

      if (!error && supabaseUsers) {
        setAllUsers(supabaseUsers);
      } else {
        const localUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]');
        setAllUsers(localUsers.map(u => ({
          id: u.id,
          username: u.username,
          full_name: u.fullName
        })));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // 🔥 SAVE TO SUPABASE ONLY (same structure as calendar)
  const saveToSupabase = async (photoData) => {
    setLoading(true);
    try {
      const finalPhoto = {
        ...photoData,
        id: generateUUID(), // 🔥 Use proper UUID
        createdAt: new Date().toISOString()
      };

      console.log('💾 Saving to Supabase:', finalPhoto.caption, 'with UUID:', finalPhoto.id);

      const supabaseData = {
        id: finalPhoto.id,
        image_url: finalPhoto.url,
        caption: finalPhoto.caption,
        author_name: finalPhoto.author,
        author_id: finalPhoto.authorId,
        created_at: finalPhoto.date + 'T00:00:00',
        likes: finalPhoto.likes,
        comments: finalPhoto.comments,
        mentioned_users: finalPhoto.mentionedUsers
      };

      const { error } = await supabase
        .from('photos_sommerhus_2024')
        .insert([supabaseData]);

      if (error) {
        console.error('❌ Supabase save failed:', error);
        toast.error(`Fejl ved gemning: ${error.message}`);
        return false;
      }

      console.log('✅ Saved to Supabase successfully');
      toast.success('✅ Billede gemt!');

      // Send notifications for mentions
      if (photoData.mentionedUsers && photoData.mentionedUsers.length > 0) {
        await sendMentionNotifications(photoData.mentionedUsers, finalPhoto.id, photoData.author);
      }

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

  // 🔥 DELETE FROM SUPABASE ONLY (same structure as calendar)
  const deleteFromSupabase = async (id) => {
    try {
      const photo = photos.find(p => p.id === id);
      if (photo?.authorId !== user?.id && !user?.isSuperUser) {
        toast.error('Du kan kun slette dine egne billeder');
        return;
      }

      console.log('🗑️ Deleting from Supabase:', id);

      const { error } = await supabase
        .from('photos_sommerhus_2024')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Supabase delete failed:', error);
        toast.error(`Fejl ved sletning: ${error.message}`);
        return;
      }

      console.log('✅ Deleted from Supabase successfully');
      toast.success('✅ Billede slettet!');

      // Immediately reload from Supabase
      await loadFromSupabase();
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast.error(`Fejl: ${error.message}`);
    }
  };

  // Send mention notifications
  const sendMentionNotifications = async (mentionedUserIds, photoId, fromUserName) => {
    try {
      const notifications = mentionedUserIds.map(userId => ({
        id: generateUUID(),
        user_id: userId,
        type: 'photo_mention',
        message: `${fromUserName} taggede dig i et billede`,
        related_message_id: photoId,
        from_user_name: fromUserName,
        from_user_id: user.id,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notifications_sommerhus_2024')
        .insert(notifications);

      if (!error) {
        console.log('✅ Photo mention notifications sent');
      }
    } catch (error) {
      console.error('Send mention notifications error:', error);
    }
  };

  // 🔥 SETUP - Supabase first, real-time updates (same as calendar)
  useEffect(() => {
    console.log('🚀 Setting up Supabase-first photos...');

    // Load users for mentions
    loadUsers();

    // Load from Supabase immediately
    loadFromSupabase();

    // Real-time subscription
    const channel = supabase
      .channel('photos-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'photos_sommerhus_2024'
      }, (payload) => {
        console.log('📡 Real-time photo update:', payload.eventType);
        setTimeout(() => loadFromSupabase(), 200);
      })
      .subscribe();

    // Cross-tab sync
    const handleStorageChange = (e) => {
      if (e.key === 'sommerhus_photos_backup') {
        console.log('📱 Cross-tab sync detected');
        loadFromSupabase();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Mobile visibility sync
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 App became visible - syncing photos');
        loadFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      console.log('⏰ Periodic Supabase photo sync');
      loadFromSupabase();
    }, 30000);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(syncInterval);
    };
  }, []);

  // Enhanced image compression for mobile compatibility
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          const maxWidth = 1200;
          const maxHeight = 800;
          let { width, height } = img;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.8;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          while (compressedDataUrl.length > 800000 && quality > 0.3) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Kunne ikke indlæse billedet'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Detect mentions in captions/comments
  const detectMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const matches = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1];
      const foundUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (foundUser) {
        matches.push(foundUser.id);
      }
    }

    // Show mention suggestions
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === text.length - 1) {
      setMentionSuggestions(allUsers);
      setShowMentions(true);
    } else if (lastAtIndex !== -1) {
      const searchTerm = text.substring(lastAtIndex + 1);
      if (searchTerm && !searchTerm.includes(' ')) {
        const filtered = allUsers.filter(u => 
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setMentionSuggestions(filtered);
        setShowMentions(filtered.length > 0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    return matches;
  };

  // Select mention
  const selectMention = (selectedUser) => {
    const currentText = newPhoto.caption;
    const lastAtIndex = currentText.lastIndexOf('@');
    const beforeAt = currentText.substring(0, lastAtIndex);
    const afterAt = currentText.substring(lastAtIndex).split(' ').slice(1).join(' ');
    const newText = `${beforeAt}@${selectedUser.username} ${afterAt}`;
    
    setNewPhoto({ ...newPhoto, caption: newText });
    setShowMentions(false);
  };

  // Render content with mentions highlighted
  const renderContentWithMentions = (content) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        const mentionedUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
        return (
          <span
            key={index}
            className={`text-ebeltoft-blue font-medium bg-blue-50 px-1 rounded ${
              mentionedUser?.id === user.id ? 'bg-yellow-100 text-yellow-800' : ''
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const onDrop = async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Billedet er for stort. Maksimum 20MB.');
        continue;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Kun billeder er tilladt.');
        continue;
      }

      try {
        toast.loading('Behandler billede...', { id: `processing-${file.name}` });

        const compressedImage = await compressImage(file);
        const mentionedUsers = detectMentions(newPhoto.caption);

        const photoData = {
          url: compressedImage,
          caption: newPhoto.caption || `Billede uploadet af ${user.fullName}`,
          author: user.fullName,
          authorId: user.id,
          date: new Date().toISOString().split('T')[0],
          likes: [],
          comments: [],
          mentionedUsers
        };

        await saveToSupabase(photoData);
        toast.success('Billede uploadet!', { id: `processing-${file.name}` });
      } catch (error) {
        console.error('Image processing error:', error);
        toast.error('Der opstod en fejl ved behandling af billedet.', { id: `processing-${file.name}` });
      }
    }

    setNewPhoto({ caption: '' });
    setShowForm(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.heic', '.heif']
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true
  });

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (newPhoto.url && newPhoto.caption) {
      const mentionedUsers = detectMentions(newPhoto.caption);

      const photoData = {
        url: newPhoto.url,
        caption: newPhoto.caption,
        author: user.fullName,
        authorId: user.id,
        date: new Date().toISOString().split('T')[0],
        likes: [],
        comments: [],
        mentionedUsers
      };

      await saveToSupabase(photoData);
      setNewPhoto({ caption: '' });
      setShowForm(false);
    }
  };

  const handleLike = async (photoId, isComment = false, commentId = null) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    let updatedPhoto = { ...photo };

    if (isComment && commentId) {
      const updatedComments = photo.comments.map(comment => {
        if (comment.id === commentId) {
          const likes = comment.likes || [];
          const hasLiked = likes.includes(user.id);
          return {
            ...comment,
            likes: hasLiked ? likes.filter(id => id !== user.id) : [...likes, user.id]
          };
        }
        return comment;
      });
      updatedPhoto.comments = updatedComments;
    } else {
      const likes = photo.likes || [];
      const hasLiked = likes.includes(user.id);
      updatedPhoto.likes = hasLiked ? likes.filter(id => id !== user.id) : [...likes, user.id];
    }

    // Update in Supabase
    const supabaseData = {
      likes: updatedPhoto.likes,
      comments: updatedPhoto.comments
    };

    const { error } = await supabase
      .from('photos_sommerhus_2024')
      .update(supabaseData)
      .eq('id', photoId);

    if (!error) {
      const updatedPhotos = photos.map(p => p.id === photoId ? updatedPhoto : p);
      setPhotos(updatedPhotos);
      localStorage.setItem('sommerhus_photos_backup', JSON.stringify(updatedPhotos));
    }
  };

  const handleComment = async (photoId) => {
    if (newReply.trim()) {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      const mentionedUsers = detectMentions(newReply);

      const comment = {
        id: generateUUID(),
        author: user.fullName,
        authorId: user.id,
        content: newReply,
        timestamp: new Date().toISOString(),
        likes: [],
        mentionedUsers
      };

      const updatedPhoto = {
        ...photo,
        comments: [...(photo.comments || []), comment]
      };

      // Update in Supabase
      const { error } = await supabase
        .from('photos_sommerhus_2024')
        .update({ comments: updatedPhoto.comments })
        .eq('id', photoId);

      if (!error) {
        const updatedPhotos = photos.map(p => p.id === photoId ? updatedPhoto : p);
        setPhotos(updatedPhotos);
        localStorage.setItem('sommerhus_photos_backup', JSON.stringify(updatedPhotos));
        
        // Send mention notifications for comment
        if (mentionedUsers.length > 0) {
          await sendMentionNotifications(mentionedUsers, photoId, user.fullName);
        }
        
        setNewReply('');
        setReplyingTo(null);
        toast.success('Kommentar tilføjet!');
      }
    }
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

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && selectedPhoto) {
        closeModal();
      }
    };

    if (selectedPhoto) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'auto';
    };
  }, [selectedPhoto]);

  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage = backgroundImages.fotoalbum;

  return (
    <div 
      className={`max-w-6xl mx-auto ${backgroundImage ? 'bg-white/95 backdrop-blur-sm rounded-2xl p-4' : ''}`}
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">
            Fotoalbum (Bulletproof)
            {loading && <div className="w-4 h-4 border-2 border-ebeltoft-blue border-t-transparent rounded-full animate-spin ml-2 inline-block" />}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFromSupabase(true)}
              disabled={syncing}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Synkroniserer...' : 'Genindlæs'}</span>
            </button>
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
                <div className="relative">
                  <input
                    type="text"
                    value={newPhoto.caption}
                    onChange={(e) => {
                      setNewPhoto({ ...newPhoto, caption: e.target.value });
                      detectMentions(e.target.value);
                    }}
                    placeholder="Beskriv billedet... (brug @ for at tagge andre)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  />
                  
                  {/* Mention suggestions dropdown */}
                  <AnimatePresence>
                    {showMentions && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
                      >
                        {mentionSuggestions.map((suggestionUser) => (
                          <button
                            key={suggestionUser.id}
                            type="button"
                            onClick={() => selectMention(suggestionUser)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                          >
                            <SafeIcon icon={FiAtSign} className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-sm">{suggestionUser.full_name}</div>
                              <div className="text-xs text-gray-500">@{suggestionUser.username}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-ebeltoft-blue bg-ebeltoft-light' : 'border-gray-300 hover:border-ebeltoft-blue'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="flex gap-4">
                      <SafeIcon icon={FiUpload} className="w-12 h-12 text-gray-400" />
                      <SafeIcon icon={FiCamera} className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg text-gray-700 font-medium">
                      {isDragActive ? 'Slip billederne her...' : 'Upload billeder'}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Træk og slip billeder her, eller klik for at vælge
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      📱 Virker også med mobilkamera og fotorulle
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>Understøttede formater: JPG, PNG, GIF, WebP, HEIC</p>
                    <p>Maksimum størrelse: 20MB per billede</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-gray-500">eller</div>

              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billede URL</label>
                  <input
                    type="url"
                    value={newPhoto.url || ''}
                    onChange={(e) => setNewPhoto({ ...newPhoto, url: e.target.value })}
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
            className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}
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
                  {(photo.authorId === user.id || user?.isSuperUser) && (
                    <button
                      onClick={() => deleteFromSupabase(photo.id)}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors text-red-500"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                {renderContentWithMentions(photo.caption)}
              </h3>
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
                    (photo.likes || []).includes(user.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
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
                            (comment.likes || []).includes(user.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <SafeIcon icon={FiHeart} className="w-3 h-3" />
                          <span>{(comment.likes || []).length}</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-700">{renderContentWithMentions(comment.content)}</p>
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
                    onChange={(e) => {
                      setNewReply(e.target.value);
                      detectMentions(e.target.value);
                    }}
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

      {/* Photo Modal */}
      {selectedPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            className="fixed top-4 right-4 z-60 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all duration-200"
            style={{ zIndex: 60 }}
          >
            <SafeIcon icon={FiX} className="w-6 h-6" />
          </button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-xl overflow-hidden max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden flex-shrink-0" style={{ maxHeight: '70vh' }}>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                className="w-full h-auto object-contain"
                style={{ maxHeight: '70vh' }}
              />
            </div>
            <div className="p-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {renderContentWithMentions(selectedPhoto.caption)}
              </h3>
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

export default BulletproofPhotoAlbum;