import React, {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import {useDropzone} from 'react-dropzone';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import ColorPicker from './ColorPicker';
import toast from 'react-hot-toast';

const {FiSettings, FiPlus, FiTrash2, FiLogOut, FiImage, FiUpload, FiCamera, FiEdit3, FiSave, FiX, FiArrowUp, FiArrowDown} = FiIcons;

const Settings = () => {
  const {user, updateUser, logout} = useAuth();
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('rengøring');
  const [heroImage, setHeroImage] = useState('');
  const [selectedColor, setSelectedColor] = useState(user.calendarColor || '#2563eb');
  const [isUploading, setIsUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
    email: user?.email || '',
    newPassword: ''
  });
  const [editingItem, setEditingItem] = useState(null);
  const [editItemText, setEditItemText] = useState('');
  const [categories, setCategories] = useState({
    vand: {name: 'Vand', color: 'bg-blue-100 text-blue-800'},
    strøm: {name: 'Strøm', color: 'bg-yellow-100 text-yellow-800'},
    rengøring: {name: 'Rengøring', color: 'bg-green-100 text-green-800'},
    sikkerhed: {name: 'Sikkerhed', color: 'bg-red-100 text-red-800'},
  });

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
          const maxWidth = 1200;
          const maxHeight = 800;
          let {width, height} = img;

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

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
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
      localStorage.setItem('sommerhus_hero_image', compressedImage);
      setHeroImage(compressedImage);
      window.dispatchEvent(new CustomEvent('heroImageUpdate', {detail: compressedImage}));
      toast.success('Forsidebillede opdateret!');
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Der opstod en fejl ved behandling af billedet. Prøv igen.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearHeroImage = () => {
    localStorage.removeItem('sommerhus_hero_image');
    const defaultImage = 'https://quest-media-storage-bucket.s3.us-east-2.amazonaws.com/1751639393931-blob';
    setHeroImage(defaultImage);
    window.dispatchEvent(new CustomEvent('heroImageUpdate', {detail: defaultImage}));
    toast.success('Forsidebillede nulstillet til standard');
  };

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.heic', '.heif']
    },
    maxSize: 20 * 1024 * 1024,
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

  const startEditItem = (item) => {
    setEditingItem(item.id);
    setEditItemText(item.text);
  };

  const saveEditItem = (id) => {
    if (!editItemText.trim()) return;

    const updatedItems = checklistItems.map(item =>
      item.id === id ? {...item, text: editItemText} : item
    );
    setChecklistItems(updatedItems);
    localStorage.setItem('sommerhus_checklist', JSON.stringify(updatedItems));
    setEditingItem(null);
    setEditItemText('');
    toast.success('Punkt opdateret');
  };

  const cancelEditItem = () => {
    setEditingItem(null);
    setEditItemText('');
  };

  const moveItem = (id, direction) => {
    const currentIndex = checklistItems.findIndex(item => item.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === checklistItems.length - 1)
    ) {
      return;
    }

    const newItems = [...checklistItems];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newItems[currentIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[currentIndex]];

    setChecklistItems(newItems);
    localStorage.setItem('sommerhus_checklist', JSON.stringify(newItems));
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

  const handleProfileUpdate = async () => {
    try {
      const updateData = {
        fullName: profileData.fullName,
        username: profileData.username,
        phoneNumber: profileData.phoneNumber,
        email: profileData.email
      };

      if (profileData.newPassword) {
        if (profileData.newPassword.length < 6) {
          toast.error('Nyt kodeord skal være mindst 6 tegn');
          return;
        }
        updateData.password = profileData.newPassword;
      }

      // Update in Supabase
      try {
        const supabaseData = {
          full_name: updateData.fullName,
          username: updateData.username,
          phone_number: updateData.phoneNumber,
          email: updateData.email
        };

        const {error} = await supabase
          .from('users_sommerhus_2024')
          .update(supabaseData)
          .eq('id', user.id);

        if (error) {
          console.log('Supabase update failed, using localStorage');
        }
      } catch (supabaseError) {
        console.log('Supabase error:', supabaseError);
      }

      // Update localStorage
      const storedUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]');
      const updatedUsers = storedUsers.map(u => 
        u.id === user.id ? {...u, ...updateData} : u
      );
      localStorage.setItem('sommerhus_users', JSON.stringify(updatedUsers));

      // Update contacts
      const contacts = JSON.parse(localStorage.getItem('sommerhus_contacts') || '[]');
      const updatedContacts = contacts.map(contact => 
        contact.createdBy === user.id ? {...contact, name: updateData.fullName, phone: updateData.phoneNumber} : contact
      );
      localStorage.setItem('sommerhus_contacts', JSON.stringify(updatedContacts));

      updateUser(updateData);
      setEditingProfile(false);
      setProfileData({...profileData, newPassword: ''});
      toast.success('Profil opdateret!');

    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Fejl ved opdatering af profil');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Du er nu logget ud');
  };

  // Only show checklist management for superusers
  const canManageChecklist = user?.isSuperUser;

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ebeltoft-dark">Brugerinfo</h3>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="text-ebeltoft-blue hover:text-ebeltoft-dark transition-colors"
              >
                <SafeIcon icon={editingProfile ? FiX : FiEdit3} className="w-5 h-5" />
              </button>
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brugernavn</label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobilnummer</label>
                  <input
                    type="tel"
                    value={profileData.phoneNumber}
                    onChange={(e) => setProfileData({...profileData, phoneNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nyt kodeord (valgfrit)</label>
                  <input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                    placeholder="Lad stå tomt for at beholde nuværende"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleProfileUpdate}
                    className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2 text-sm"
                  >
                    <SafeIcon icon={FiSave} className="w-4 h-4" />
                    Gem
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">
                  <strong>Navn:</strong> {user.fullName}
                </p>
                <p className="text-gray-600">
                  <strong>Brugernavn:</strong> {user.username}
                </p>
                <p className="text-gray-600">
                  <strong>Email:</strong> {user.email || 'Ikke angivet'}
                </p>
                <p className="text-gray-600">
                  <strong>Mobilnummer:</strong> {user.phoneNumber}
                </p>
                {user.isSuperUser && (
                  <p className="text-purple-600 font-medium">
                    👑 Superbruger
                  </p>
                )}
              </div>
            )}
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

      {canManageChecklist && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-ebeltoft-dark mb-6 flex items-center gap-2">
            👑 Administrer tjekliste
            <span className="text-sm font-normal text-gray-600">(Kun superbrugere)</span>
          </h3>
          
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
            {checklistItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${categories[item.category].color}`}>
                    {categories[item.category].name}
                  </span>
                  
                  {editingItem === item.id ? (
                    <input
                      type="text"
                      value={editItemText}
                      onChange={(e) => setEditItemText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && saveEditItem(item.id)}
                    />
                  ) : (
                    <span className="text-gray-800 flex-1">{item.text}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingItem === item.id ? (
                    <>
                      <button
                        onClick={() => saveEditItem(item.id)}
                        className="text-green-500 hover:text-green-700 transition-colors"
                      >
                        <SafeIcon icon={FiSave} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditItem}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <SafeIcon icon={FiX} className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveItem(item.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                        >
                          <SafeIcon icon={FiArrowUp} className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItem(item.id, 'down')}
                          disabled={index === checklistItems.length - 1}
                          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                        >
                          <SafeIcon icon={FiArrowDown} className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => startEditItem(item)}
                        className="text-ebeltoft-blue hover:text-ebeltoft-dark transition-colors"
                      >
                        <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteChecklistItem(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;