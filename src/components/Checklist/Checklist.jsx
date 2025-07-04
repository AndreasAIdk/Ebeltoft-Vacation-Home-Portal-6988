import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCheck, FiCheckCircle, FiRefreshCw } = FiIcons;

const Checklist = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  const categories = {
    vand: { name: 'Vand', color: 'bg-blue-100 text-blue-800' },
    strøm: { name: 'Strøm', color: 'bg-yellow-100 text-yellow-800' },
    rengøring: { name: 'Rengøring', color: 'bg-green-100 text-green-800' },
    sikkerhed: { name: 'Sikkerhed', color: 'bg-red-100 text-red-800' },
  };

  useEffect(() => {
    const storedTasks = JSON.parse(localStorage.getItem('sommerhus_checklist') || '[]');
    if (storedTasks.length === 0) {
      // Initialize with default tasks
      const defaultTasks = [
        { id: 1, text: 'Luk hovedvandhanerne under køkkenvask og badeværelse', completed: false, category: 'vand' },
        { id: 2, text: 'Sluk for alle elektriske apparater', completed: false, category: 'strøm' },
        { id: 3, text: 'Tøm køleskab for letfordærvelige varer', completed: false, category: 'rengøring' },
        { id: 4, text: 'Støvsug alle rum', completed: false, category: 'rengøring' },
        { id: 5, text: 'Vask køkken og badeværelse', completed: false, category: 'rengøring' },
        { id: 6, text: 'Tøm skraldespande', completed: false, category: 'rengøring' },
        { id: 7, text: 'Lås alle døre og vinduer', completed: false, category: 'sikkerhed' },
      ];
      setTasks(defaultTasks);
      localStorage.setItem('sommerhus_checklist', JSON.stringify(defaultTasks));
    } else {
      setTasks(storedTasks);
    }
  }, []);

  const toggleTask = (id) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('sommerhus_checklist', JSON.stringify(updatedTasks));
  };

  const resetChecklist = () => {
    const resetTasks = tasks.map(task => ({ ...task, completed: false }));
    setTasks(resetTasks);
    localStorage.setItem('sommerhus_checklist', JSON.stringify(resetTasks));
    toast.success('Tjekliste ryddet!');
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ebeltoft-dark">Tjekliste for afgang</h2>
            <div className="text-sm text-gray-600 mt-1">
              {completedTasks} af {totalTasks} opgaver færdige
            </div>
          </div>
          
          <motion.button
            onClick={resetChecklist}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
            Ryd
          </motion.button>
        </div>

        <div className="mb-6 bg-gray-100 rounded-lg p-1">
          <div 
            className="bg-summer-green h-2 rounded-lg transition-all duration-300"
            style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
          />
        </div>

        {completedTasks === totalTasks && totalTasks > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <SafeIcon icon={FiCheckCircle} className="w-8 h-8 text-summer-green" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">Alle opgaver er færdige!</h3>
                <p className="text-sm text-green-700">Du kan nu tjekke ud af sommerhuset.</p>
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Udfyld alle punkter på tjeklisten før du tjekker ud. Du kan administrere tjeklisten under "Indstillinger".
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${
              task.completed ? 'border-summer-green' : 'border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  task.completed 
                    ? 'bg-summer-green border-summer-green text-white' 
                    : 'border-gray-300 hover:border-ebeltoft-blue'
                }`}
              >
                {task.completed && <SafeIcon icon={FiCheck} className="w-4 h-4" />}
              </button>
              
              <div className="flex-1">
                <span className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {task.text}
                </span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${categories[task.category].color}`}>
                  {categories[task.category].name}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Checklist;