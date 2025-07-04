import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiImage, FiTrash2, FiEye } = FiIcons;

const BackgroundSettings = () => {
  const [backgroundImages, setBackgroundImages] = useState({});
  const [previewTab, setPreviewTab] = useState(null);

  const tabs = [
    { id: 'beskedvaeg', label: 'Beskedvæg' },
    { id: 'kalender', label: 'Kalender' },
    { id: 'tjekliste', label: 'Tjekliste' },
    { id: 'kontakt', label: 'Kontakter' },
    { id: 'fotoalbum', label: 'Fotoalbum' },
    { id: 'blog', label: 'Nedlukning/Opstart' },
  ];

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
    setBackgroundImages(stored);
  }, []);

  const handleDrop = useCallback((tabId) => {
    return (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
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
          const newBackgrounds = {
            ...backgroundImages,
            [tabId]: e.target.result
          };
          setBackgroundImages(newBackgrounds);
          localStorage.setItem('sommerhus_background_images', JSON.stringify(newBackgrounds));
          toast.success(`Baggrund opdateret for ${tabs.find(t => t.id === tabId)?.label}`);
        };
        reader.readAsDataURL(file);
      }
    };
  }, [backgroundImages, tabs]);

  const removeBackground = (tabId) => {
    const newBackgrounds = { ...backgroundImages };
    delete newBackgrounds[tabId];
    setBackgroundImages(newBackgrounds);
    localStorage.setItem('sommerhus_background_images', JSON.stringify(newBackgrounds));
    toast.success(`Baggrund fjernet for ${tabs.find(t => t.id === tabId)?.label}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-ebeltoft-dark mb-6">Baggrundsbilleder</h2>
        <p className="text-gray-600 mb-8">
          Tilpas baggrundsbillederne for hver sektion. Billederne gælder for alle brugere.
        </p>

        <div className="space-y-6">
          {tabs.map((tab) => {
            const TabDropzone = ({ children }) => {
              const { getRootProps, getInputProps, isDragActive } = useDropzone({
                onDrop: handleDrop(tab.id),
                accept: {
                  'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
                },
                maxSize: 10 * 1024 * 1024,
                multiple: false
              });

              return (
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-ebeltoft-blue bg-blue-50' : 'border-gray-300 hover:border-ebeltoft-blue'
                  }`}
                >
                  <input {...getInputProps()} />
                  {children}
                </div>
              );
            };

            const hasBackground = backgroundImages[tab.id];

            return (
              <div key={tab.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">{tab.label}</h3>
                  <div className="flex gap-2">
                    {hasBackground && (
                      <>
                        <button
                          onClick={() => setPreviewTab(previewTab === tab.id ? null : tab.id)}
                          className="px-3 py-1 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors text-sm flex items-center gap-1"
                        >
                          <SafeIcon icon={FiEye} className="w-4 h-4" />
                          {previewTab === tab.id ? 'Skjul' : 'Vis'}
                        </button>
                        <button
                          onClick={() => removeBackground(tab.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                        >
                          <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          Fjern
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <TabDropzone>
                  {hasBackground ? (
                    <div className="space-y-2">
                      <div className="w-20 h-20 mx-auto rounded-lg bg-gray-100 overflow-hidden">
                        <img 
                          src={backgroundImages[tab.id]} 
                          alt={`${tab.label} baggrund`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-green-600 font-medium">Baggrund indstillet</p>
                      <p className="text-xs text-gray-500">
                        Klik eller træk nyt billede for at ændre
                      </p>
                    </div>
                  ) : (
                    <>
                      <SafeIcon icon={FiImage} className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        Træk og slip billede her, eller klik for at vælge
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WebP (max 10MB)
                      </p>
                    </>
                  )}
                </TabDropzone>

                {/* Preview */}
                {previewTab === tab.id && hasBackground && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <p className="text-sm text-gray-600 mb-2">Forhåndsvisning:</p>
                    <div 
                      className="w-full h-32 rounded-lg bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${backgroundImages[tab.id]})` }}
                    >
                      <div className="w-full h-full bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <p className="text-gray-700 font-medium">Eksempel på indhold med baggrund</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BackgroundSettings;