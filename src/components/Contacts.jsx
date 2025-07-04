import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiUser, FiMail, FiPhone, FiPlus, FiEdit3, FiTrash2 } = FiIcons;

const Contacts = () => {
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: 'Ole Hansen',
      email: 'ole.hansen@email.dk',
      phone: '+45 12 34 56 78',
      relation: 'Onkel',
    },
    {
      id: 2,
      name: 'Anna Larsen',
      email: 'anna.larsen@email.dk',
      phone: '+45 87 65 43 21',
      relation: 'Søster',
    },
    {
      id: 3,
      name: 'Lars Nielsen',
      email: 'lars.nielsen@email.dk',
      phone: '+45 23 45 67 89',
      relation: 'Fætter',
    },
  ]);

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    relation: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newContact.name && (newContact.email || newContact.phone)) {
      if (editingContact) {
        setContacts(contacts.map(contact => 
          contact.id === editingContact.id 
            ? { ...editingContact, ...newContact }
            : contact
        ));
        setEditingContact(null);
      } else {
        const contact = {
          id: Date.now(),
          ...newContact,
        };
        setContacts([...contacts, contact].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setNewContact({ name: '', email: '', phone: '', relation: '' });
      setShowForm(false);
    }
  };

  const deleteContact = (id) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  const startEdit = (contact) => {
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
    setNewContact({ name: '', email: '', phone: '', relation: '' });
    setShowForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">Familie kontakter</h2>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            {editingContact ? 'Rediger kontakt' : 'Ny kontakt'}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-6 border-l-4 border-ebeltoft-blue"
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
              
              <div className="flex gap-2">
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
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Contacts;