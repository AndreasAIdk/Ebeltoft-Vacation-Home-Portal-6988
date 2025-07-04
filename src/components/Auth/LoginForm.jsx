import React, {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiUser, FiLock, FiLogIn, FiUserPlus, FiPhone, FiBell, FiBellOff} = FiIcons;

const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    allowNotifications: false
  });
  const [loading, setLoading] = useState(false);
  const [heroImage, setHeroImage] = useState('');

  const {login, register} = useAuth();

  // Update hero image when component mounts
  useEffect(() => {
    const storedHeroImage = localStorage.getItem('sommerhus_hero_image') || 'https://quest-media-storage-bucket.s3.us-east-2.amazonaws.com/1751639393931-blob';
    setHeroImage(storedHeroImage);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.username, formData.password);
        if (result.success) {
          toast.success('Velkommen tilbage!');
        } else {
          toast.error(result.error);
        }
      } else {
        if (formData.password.length < 6) {
          toast.error('Adgangskoden skal være mindst 6 tegn');
          return;
        }

        if (!formData.phoneNumber) {
          toast.error('Mobilnummer er påkrævet for notifikationer');
          return;
        }

        const result = await register(
          formData.username,
          formData.password,
          formData.fullName,
          formData.phoneNumber,
          formData.allowNotifications
        );

        if (result.success) {
          toast.success('Konto oprettet og tilføjet til kontakter!');
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      toast.error('Der skete en fejl. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const {name, value, type, checked} = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ebeltoft-light to-blue-50 flex items-center justify-center p-4">
      {/* Hero Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{backgroundImage: `url(${heroImage})`}}
      />

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-4xl relative z-10">
        {/* Info Box */}
        <motion.div
          initial={{opacity: 0, x: -20}}
          animate={{opacity: 1, x: 0}}
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 flex-1"
        >
          <h1 className="text-3xl font-bold text-ebeltoft-dark mb-6">
            Sommerhus i Ebeltoft
          </h1>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Her kan du se, om sommerhuset er ledigt, vi kan skrive beskeder til hinanden, 
              dele billeder og læse opslag om, hvordan man nedlukker og starter sommerhuset 
              op til en ny sæson.
            </p>
            <p>
              Hvis det er dit første besøg, så start med at oprette dig som bruger.
            </p>
            <p className="font-medium text-ebeltoft-blue">
              God fornøjelse!
            </p>
          </div>
        </motion.div>

        {/* Login/Register Box */}
        <motion.div
          initial={{opacity: 0, x: 20}}
          animate={{opacity: 1, x: 0}}
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <p className="text-gray-600">
              {isLogin ? 'Log ind for at fortsætte' : 'Opret en ny konto'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fulde navn
                  </label>
                  <div className="relative">
                    <SafeIcon icon={FiUser} className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required={!isLogin}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                      placeholder="Dit fulde navn"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobilnummer
                  </label>
                  <div className="relative">
                    <SafeIcon icon={FiPhone} className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required={!isLogin}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                      placeholder="+45 12 34 56 78"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Påkrævet for at modtage notifikationer ved tagning
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <SafeIcon icon={formData.allowNotifications ? FiBell : FiBellOff} className="w-5 h-5 text-ebeltoft-blue" />
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="allowNotifications"
                        checked={formData.allowNotifications}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 mr-2 flex items-center justify-center ${formData.allowNotifications ? 'bg-ebeltoft-blue border-ebeltoft-blue' : 'border-gray-300'}`}>
                        {formData.allowNotifications && (
                          <SafeIcon icon={FiUser} className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">
                          Tillad notifikationer
                        </span>
                        <p className="text-xs text-gray-600">
                          Modtag besked når du bliver tagget (@dit_navn)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brugernavn
              </label>
              <div className="relative">
                <SafeIcon icon={FiUser} className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  placeholder="Indtast brugernavn"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adgangskode
              </label>
              <div className="relative">
                <SafeIcon icon={FiLock} className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  placeholder="Indtast adgangskode"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-ebeltoft-blue text-white py-3 px-4 rounded-lg font-medium hover:bg-ebeltoft-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              whileHover={{scale: 1.02}}
              whileTap={{scale: 0.98}}
            >
              <SafeIcon icon={isLogin ? FiLogIn : FiUserPlus} className="w-5 h-5" />
              {loading ? 'Vent...' : (isLogin ? 'Log ind' : 'Opret konto')}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-ebeltoft-blue hover:text-ebeltoft-dark transition-colors"
            >
              {isLogin
                ? 'Har du ikke en konto? Opret en her'
                : 'Har du allerede en konto? Log ind'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginForm;