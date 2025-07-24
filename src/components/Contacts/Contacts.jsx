import React, {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiUser, FiMail, FiPhone, FiPlus, FiEdit3, FiTrash2, FiKey, FiShield} = FiIcons;

const Contacts = () => {
  const {user} = useAuth();
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    relation: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [changingPassword, setChangingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Load contacts from both Supabase and localStorage
  const loadContacts = async () => {
    try {
      // Try Supabase first
      const {data: supabaseContacts, error} = await supabase
        .from('contacts_sommerhus_2024')
        .select('*')
        .order('name', {ascending: true});

      if (!error && supabaseContacts) {
        // Convert Supabase format to local format
        const convertedContacts = supabaseContacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          relation: contact.relation,
          createdBy: contact.created_by,
          createdAt: contact.created_at
        }));

        setContacts(convertedContacts);
        localStorage.setItem('sommerhus_contacts', JSON.stringify(convertedContacts));
        console.log('✅ Loaded contacts from Supabase:', convertedContacts.length);
      } else {
        // Fallback to localStorage
        const storedContacts = JSON.parse(localStorage.getItem('sommerhus_contacts') || '[]');
        setContacts(storedContacts);
        console.log('📱 Using localStorage contacts:', storedContacts.length);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Fallback to localStorage
      const storedContacts = JSON.parse(localStorage.getItem('sommerhus_contacts') || '[]');
      setContacts(storedContacts);
    }
  };

  useEffect(() => {
    loadContacts();

    // Real-time subscription
    const channel = supabase
      .channel('contacts-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contacts_sommerhus_2024'
      }, (payload) => {
        console.log('📡 Real-time contact update:', payload.eventType);
        setTimeout(loadContacts, 500);
      })
      .subscribe();

    // Cross-tab sync
    const handleStorageChange = (e) => {
      if (e.key === 'sommerhus_contacts') {
        loadContacts();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const saveContact = async (contactData) => {
    try {
      // Save to localStorage immediately
      const updatedContacts = [...contacts, contactData].sort((a, b) => a.name.localeCompare(b.name));
      setContacts(updatedContacts);
      localStorage.setItem('sommerhus_contacts', JSON.stringify(updatedContacts));

      // Try to save to Supabase
      const supabaseData = {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        relation: contactData.relation,
        created_by: contactData.createdBy,
        created_at: contactData.createdAt
      };

      const {error} = await supabase
        .from('contacts_sommerhus_2024')
        .insert([supabaseData]);

      if (error) {
        console.log('⚠️ Supabase save failed (but saved locally):', error.message);
        toast.success('Kontakt gemt lokalt');
      } else {
        console.log('✅ Saved to both localStorage and Supabase');
        toast.success('Kontakt tilføjet!');
      }

      // Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_contacts',
        newValue: JSON.stringify(updatedContacts)
      }));

    } catch (error) {
      console.error('Save contact error:', error);
      toast.error('Fejl ved gemning af kontakt');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 🔒 ONLY SUPERUSERS CAN CREATE/EDIT CONTACTS
    if (!user?.isSuperUser) {
      toast.error('Kun superbrugere kan oprette eller redigere kontakter');
      return;
    }

    if (newContact.name && (newContact.email || newContact.phone)) {
      if (editingContact) {
        const updatedContacts = contacts.map(contact =>
          contact.id === editingContact.id ? {...editingContact, ...newContact} : contact
        );
        setContacts(updatedContacts);
        localStorage.setItem('sommerhus_contacts', JSON.stringify(updatedContacts));
        setEditingContact(null);
        toast.success('Kontakt opdateret');
      } else {
        const contact = {
          id: Date.now(),
          ...newContact,
          createdBy: user.id,
          createdAt: new Date().toISOString()
        };
        saveContact(contact);
      }

      setNewContact({name: '', email: '', phone: '', relation: ''});
      setShowForm(false);
    }
  };

  const deleteContact = async (id) => {
    // 🔒 ONLY SUPERUSERS CAN DELETE CONTACTS
    if (!user?.isSuperUser) {
      toast.error('Kun superbrugere kan slette kontakter');
      return;
    }

    try {
      // Remove from localStorage
      const updatedContacts = contacts.filter(contact => contact.id !== id);
      setContacts(updatedContacts);
      localStorage.setItem('sommerhus_contacts', JSON.stringify(updatedContacts));

      // Try to delete from Supabase
      try {
        const {error} = await supabase
          .from('contacts_sommerhus_2024')
          .delete()
          .eq('id', id);

        if (error) {
          console.log('⚠️ Supabase delete failed (but removed locally):', error.message);
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase delete error:', supabaseError.message);
      }

      toast.success('Kontakt slettet');

      // Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_contacts',
        newValue: JSON.stringify(updatedContacts)
      }));

    } catch (error) {
      console.error('Delete contact error:', error);
      toast.error('Fejl ved sletning af kontakt');
    }
  };

  const startEdit = (contact) => {
    // 🔒 ONLY SUPERUSERS CAN EDIT CONTACTS
    if (!user?.isSuperUser) {
      toast.error('Kun superbrugere kan redigere kontakter');
      return;
    }

    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      relation: contact.relation,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingContact(null);
    setNewContact({name: '', email: '', phone: '', relation: ''});
    setShowForm(false);
  };

  const handlePasswordChange = async (contactName) => {
    // 🔒 ONLY SUPERUSERS CAN CHANGE PASSWORDS
    if (!user?.isSuperUser) {
      toast.error('Kun superbrugere kan ændre kodeord');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('Kodeord skal være mindst 6 tegn');
      return;
    }

    try {
      // Find user in localStorage
      const storedUsers = JSON.parse(localStorage.getItem('sommerhus_users') || '[]');
      const userToUpdate = storedUsers.find(u => u.fullName === contactName);

      if (!userToUpdate) {
        toast.error('Bruger ikke fundet');
        return;
      }

      // Update password in localStorage
      const updatedUsers = storedUsers.map(u =>
        u.fullName === contactName ? {...u, password: newPassword} : u
      );
      localStorage.setItem('sommerhus_users', JSON.stringify(updatedUsers));

      // Try to update in Supabase (note: we don't store passwords in Supabase in this simple implementation)
      try {
        // In a real app, you'd hash the password and store it securely
        console.log('Password updated for user:', contactName);
      } catch (supabaseError) {
        console.log('Supabase password update not implemented');
      }

      setChangingPassword(null);
      setNewPassword('');
      toast.success(`Kodeord ændret for ${contactName}`);

    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Fejl ved ændring af kodeord');
    }
  };

  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage = backgroundImages.kontakt;

  return (
    <div className={`max-w-4xl mx-auto ${backgroundImage ? 'bg-white/95 backdrop-blur-sm rounded-2xl p-4' : ''}`} style={backgroundImage ? {backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {}}>
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ebeltoft-dark">Familie kontakter</h2>
            {!user?.isSuperUser && (
              <p className="text-sm text-gray-500 mt-1">
                📖 Kun visning - Kontakt en superbruger for at tilføje/redigere
              </p>
            )}
          </div>
          
          {/* 🔒 ONLY SHOW ADD BUTTON FOR SUPERUSERS */}
          {user?.isSuperUser && (
            <motion.button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              {editingContact ? 'Rediger kontakt' : 'Ny kontakt'}
            </motion.button>
          )}
        </div>

        {/* 🔒 ONLY SHOW FORM FOR SUPERUSERS */}
        {showForm && user?.isSuperUser && (
          <motion.form
            initial={{opacity: 0, height: 0}}
            animate={{opacity: 1, height: 'auto'}}
            exit={{opacity: 0, height: 0}}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <SafeIcon icon={FiShield} className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-800">
                👑 Superbruger: {editingContact ? 'Rediger kontakt' : 'Opret ny kontakt'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Navn</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
                <input
                  type="text"
                  value={newContact.relation}
                  onChange={(e) => setNewContact({...newContact, relation: e.target.value})}
                  placeholder="f.eks. Onkel, Søster, Fætter..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="+45 12 34 56 78"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
              >
                {editingContact ? 'Opdater' : 'Gem kontakt'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Annuller
              </button>
            </div>
          </motion.form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <motion.div
            key={contact.id}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-xl shadow-md p-6 border-l-4 border-ebeltoft-blue`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-ebeltoft-light rounded-full flex items-center justify-center">
                  <SafeIcon icon={FiUser} className="w-6 h-6 text-ebeltoft-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ebeltoft-dark">{contact.name}</h3>
                  {contact.relation && (
                    <p className="text-sm text-gray-500">{contact.relation}</p>
                  )}
                </div>
              </div>
              
              {/* 🔒 ONLY SHOW EDIT/DELETE BUTTONS FOR SUPERUSERS */}
              {user?.isSuperUser && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setChangingPassword(contact.name)}
                    className="text-purple-500 hover:text-purple-700 transition-colors"
                    title="Skift kodeord"
                  >
                    <SafeIcon icon={FiKey} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(contact)}
                    className="text-ebeltoft-blue hover:text-ebeltoft-dark transition-colors"
                  >
                    <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SafeIcon icon={FiMail} className="w-4 h-4" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-ebeltoft-blue transition-colors"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SafeIcon icon={FiPhone} className="w-4 h-4" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-ebeltoft-blue transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>

            {/* 🔒 ONLY SHOW PASSWORD CHANGE FOR SUPERUSERS */}
            {changingPassword === contact.name && user?.isSuperUser && (
              <motion.div
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: 'auto'}}
                className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <SafeIcon icon={FiShield} className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-800">
                    👑 Skift kodeord for {contact.name}
                  </h4>
                </div>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nyt kodeord (min. 6 tegn)"
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePasswordChange(contact.name)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Skift kodeord
                    </button>
                    <button
                      onClick={() => {
                        setChangingPassword(null);
                        setNewPassword('');
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    >
                      Annuller
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Contacts;