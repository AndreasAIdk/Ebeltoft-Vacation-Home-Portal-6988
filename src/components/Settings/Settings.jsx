import React, {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {useDropzone} from 'react-dropzone';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import ColorPicker from './ColorPicker';
import toast from 'react-hot-toast';

const {FiSettings, FiPlus, FiTrash2, FiLogOut, FiImage, FiBell, FiBellOff, FiUpload, FiCamera} = FiIcons;

const Settings = () => {
  const {user, updateUser, logout} = useAuth();
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('rengøring');
  const [heroImage, setHeroImage] = useState('');
  const [selectedColor, setSelectedColor] = useState(user.calendarColor || '#2563eb');
  const [isUploading, setIsUploading] = useState(false);

  const categories = {
    vand: {name: 'Vand', color: 'bg-blue-100 text-blue-800'},
    strøm: {name: 'Strøm', color: 'bg-yellow-100 text-yellow-800'},
    rengøring: {name: 'Rengøring', color: 'bg-green-100 text-green-800'},
    sikkerhed: {name: 'Sikkerhed', color: 'bg-red-100 text-red-800'},
  };

  useEffect(() => {
    const storedChecklist = JSON.parse(localStorage.getItem('sommerhus_checklist') || '[]');
    if (storedChecklist.length === 0) {
      const defaultItems = [
        {id: 1, text: 'Luk hovedvandhanerne under køkkenvask og badeværelse', completed: false, category: 'vand'},
        {id: 2, text: 'Sluk for alle elektriske apparater', completed: false, category: 'strøm'},
        {id: 3, text: 'Tøm køleskab for letfordærvelige varer', completed: false, category: 'rengøring'},
        {id: 4, text: 'Støvsug alle rum', completed: false, category: 'rengøring'},
        {id: 5, text: 'Vask køkken og badeværelse', completed: false, category: 'rengøring'},
        {id: 6, text: 'Tøm skraldespande', completed: false, category: 'rengøring'},
        {id: 7, text: 'Lås alle døre og vinduer', completed: false, category: 'sikkerhed'},
      ];
      setChecklistItems(defaultItems);
      localStorage.setItem('sommerhus_checklist', JSON.stringify(defaultItems));
    } else {
      setChecklistItems(storedChecklist);
    }

    const storedHeroImage = localStorage.getItem('sommerhus_hero_image');
    const defaultHeroImage = 'https://quest-media-storage-bucket.s3.us-east-2.amazonaws.com/1751639393931-blob';
    setHeroImage(storedHeroImage || defaultHeroImage);
  }, []);

  // Enhanced image compression for mobile compatibility
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Target max dimensions for mobile compatibility
          const maxWidth = 1200;
          const maxHeight = 800;
          let {width, height} = img;

          // Calculate new dimensions maintaining aspect ratio
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

          // Draw with good quality
          ctx.drawImage(img, 0, 0, width, height);

          // Progressive compression - start with higher quality and reduce if needed
          let quality = 0.8;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // If too large, reduce quality
          while (compressedDataUrl.length > 800000 && quality > 0.3) { // ~800KB limit
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

  // Enhanced file upload handler with mobile support
  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) { // Increased to 20MB for mobile photos
      toast.error('Billedet er for stort. Maksimum 20MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Kun billeder er tilladt.');
      return;
    }

    setIsUploading(true);

    try {
      const compressedImage = await compressImage(file);

      // Try to save to localStorage
      try {
        localStorage.setItem('sommerhus_hero_image', compressedImage);
        setHeroImage(compressedImage);
        window.dispatchEvent(new CustomEvent('heroImageUpdate', {detail: compressedImage}));
        toast.success('Forsidebillede opdateret!');
      } catch (quotaError) {
        toast.error('Billedet er for stort til at gemme lokalt. Prøv et mindre billede.');
      }
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Der opstod en fejl ved behandling af billedet. Prøv igen.');
    } finally {
      setIsUploading(false);
    }
  };

  // Clear hero image
  const clearHeroImage = () => {
    localStorage.removeItem('sommerhus_hero_image');
    const defaultImage = 'https://quest-media-storage-bucket.s3.us-east-2.amazonaws.com/1751639393931-blob';
    setHeroImage(defaultImage);
    window.dispatchEvent(new CustomEvent('heroImageUpdate', {detail: defaultImage}));
    toast.success('Forsidebillede nulstillet til standard');
  };

  // Dropzone configuration with mobile support
  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.heic', '.heif'] // Added HEIC for iPhone
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false,
    disabled: isUploading
  });

  const addChecklistItem = () => {
    if (!newItem.trim()) return;

    const newChecklistItem = {
      id: Date.now(),
      text: newItem,
      completed: false,
      category: newCategory
    };

    const updatedItems = [...checklistItems, newChecklistItem];
    setChecklistItems(updatedItems);
    localStorage.setItem('sommerhus_checklist', JSON.stringify(updatedItems));
    setNewItem('');
    toast.success('Punkt tilføjet til tjekliste');
  };

  const deleteChecklistItem = (id) => {
    const updatedItems = checklistItems.filter(item => item.id !== id);
    setChecklistItems(updatedItems);
    localStorage.setItem('sommerhus_checklist', JSON.stringify(updatedItems));
    toast.success('Punkt fjernet fra tjekliste');
  };

  const toggleNotifications = () => {
    const newValue = !user.allowNotifications;
    updateUser({allowNotifications: newValue});
    toast.success(newValue ? 'Notifikationer aktiveret' : 'Notifikationer deaktiveret');
  };

  const handleColorChange = (color) => {
    updateUser({calendarColor: color});
    setSelectedColor(color);

    const bookings = JSON.parse(localStorage.getItem('sommerhus_bookings') || '[]');
    const updatedBookings = bookings.map(booking => {
      if (booking.userId === user.id) {
        return {...booking, userColor: color};
      }
      return booking;
    });
    localStorage.setItem('sommerhus_bookings', JSON.stringify(updatedBookings));

    toast.success('Kalenderfarve gemt!');
  };

  const handleLogout = () => {
    logout();
    toast.success('Du er nu logget ud');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
            <SafeIcon icon={FiSettings} className="w-7 h-7" />
            Indstillinger
          </h2>
          <motion.button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            whileHover={{scale: 1.05}}
            whileTap={{scale: 0.95}}
          >
            <SafeIcon icon={FiLogOut} className="w-4 h-4" />
            Log ud
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-ebeltoft-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Brugerinfo</h3>
            <div className="space-y-2">
              <p className="text-gray-600">
                <strong>Navn:</strong> {user.fullName}
              </p>
              <p className="text-gray-600">
                <strong>Brugernavn:</strong> {user.username}
              </p>
              <p className="text-gray-600">
                <strong>Mobilnummer:</strong> {user.phoneNumber}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={toggleNotifications}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${
                  user.allowNotifications
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <SafeIcon icon={user.allowNotifications ? FiBell : FiBellOff} className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">
                    {user.allowNotifications ? 'Notifikationer aktiveret' : 'Notifikationer deaktiveret'}
                  </div>
                  <div className="text-sm opacity-75">
                    Modtag besked når du bliver tagget
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-ebeltoft-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Kalenderfarve</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vælg din personlige farve til kalenderoversigten
            </p>
            <div className="flex items-center gap-4 mb-4">
              <ColorPicker color={selectedColor} onChange={handleColorChange} />
              <div>
                <div className="text-sm text-gray-700 font-medium">Valgt farve</div>
                <div className="text-xs text-gray-500 font-mono">{selectedColor}</div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <div className="text-xs text-gray-600 mb-2">Forhåndsvisning i kalender:</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{backgroundColor: selectedColor}}></div>
                <span className="text-sm text-gray-700">{user.fullName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-ebeltoft-light rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Forsidebillede</h3>
          
          {/* Current image preview */}
          {heroImage && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Nuværende billede:</p>
                <button
                  onClick={clearHeroImage}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Nulstil til standard
                </button>
              </div>
              <img
                src={heroImage}
                alt="Forsidebillede"
                className="w-full h-32 object-cover rounded border"
                onError={(e) => {
                  e.target.src = 'https://quest-media-storage-bucket.s3.us-east-2.amazonaws.com/1751639393931-blob';
                }}
              />
            </div>
          )}

          {/* Enhanced upload area */}
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-ebeltoft-blue bg-blue-50'
                  : isUploading
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-ebeltoft-blue hover:bg-ebeltoft-light'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-3">
                <div className="flex justify-center">
                  {isUploading ? (
                    <SafeIcon icon={FiUpload} className="w-12 h-12 text-blue-500 animate-spin" />
                  ) : (
                    <div className="flex gap-4">
                      <SafeIcon icon={FiImage} className="w-12 h-12 text-gray-400" />
                      <SafeIcon icon={FiCamera} className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg text-gray-700 font-medium">
                    {isUploading
                      ? 'Behandler billede...'
                      : isDragActive
                      ? 'Slip billedet her...'
                      : 'Upload forsidebillede'}
                  </p>
                  {!isUploading && (
                    <>
                      <p className="text-sm text-gray-600 mt-2">
                        Træk og slip billede her, eller klik for at vælge
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        📱 Virker også med mobilkamera og fotorulle
                      </p>
                    </>
                  )}
                </div>
                {!isUploading && (
                  <div className="text-xs text-gray-500">
                    <p>Understøttede formater: JPG, PNG, GIF, WebP, HEIC</p>
                    <p>Maksimum størrelse: 20MB</p>
                    <p>Billedet komprimeres automatisk for optimal ydeevne</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-ebeltoft-dark mb-6">Administrer tjekliste</h3>
        
        <div className="bg-ebeltoft-light rounded-xl p-6 mb-6">
          <h4 className="text-lg font-semibold text-ebeltoft-dark mb-4">Tilføj nyt punkt</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Beskriv det nye punkt..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
            >
              {Object.entries(categories).map(([key, category]) => (
                <option key={key} value={key}>{category.name}</option>
              ))}
            </select>
            <motion.button
              onClick={addChecklistItem}
              className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              Tilføj
            </motion.button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-ebeltoft-dark">Eksisterende punkter</h4>
          {checklistItems.map(item => (
            <motion.div
              key={item.id}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded-full ${categories[item.category].color}`}>
                  {categories[item.category].name}
                </span>
                <span className="text-gray-800">{item.text}</span>
              </div>
              <button
                onClick={() => deleteChecklistItem(item.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <SafeIcon icon={FiTrash2} className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;