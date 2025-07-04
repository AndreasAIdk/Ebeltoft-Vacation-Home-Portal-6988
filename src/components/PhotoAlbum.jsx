import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiCamera, FiPlus, FiTrash2, FiUser, FiCalendar, FiMaximize2 } = FiIcons;

const PhotoAlbum = () => {
  const [photos, setPhotos] = useState([
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      caption: 'Solnedgang over Ebeltoft Vig',
      author: 'Anna',
      date: '2024-01-15',
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
      caption: 'Morgenmad på terrassen',
      author: 'Lars',
      date: '2024-01-16',
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
      caption: 'Strand gåtur',
      author: 'Familie Hansen',
      date: '2024-01-17',
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop',
      caption: 'Grillaften i haven',
      author: 'Ole',
      date: '2024-01-18',
    },
  ]);

  const [newPhoto, setNewPhoto] = useState({
    url: '',
    caption: '',
    author: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPhoto.url && newPhoto.caption && newPhoto.author) {
      const photo = {
        id: Date.now(),
        ...newPhoto,
        date: new Date().toISOString().split('T')[0],
      };
      setPhotos([photo, ...photos]);
      setNewPhoto({ url: '', caption: '', author: '' });
      setShowForm(false);
    }
  };

  const deletePhoto = (id) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">Foto album</h2>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            Tilføj foto
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto URL</label>
                <input
                  type="url"
                  value={newPhoto.url}
                  onChange={(e) => setNewPhoto({...newPhoto, url: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beskrivelse</label>
                <input
                  type="text"
                  value={newPhoto.caption}
                  onChange={(e) => setNewPhoto({...newPhoto, caption: e.target.value})}
                  placeholder="Beskriv billedet..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uploadet af</label>
                <input
                  type="text"
                  value={newPhoto.author}
                  onChange={(e) => setNewPhoto({...newPhoto, author: e.target.value})}
                  placeholder="Dit navn..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
              >
                Tilføj foto
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
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors text-red-500"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">{photo.caption}</h3>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiUser} className="w-4 h-4" />
                  <span>{photo.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                  <span>{formatDate(photo.date)}</span>
                </div>
              </div>
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