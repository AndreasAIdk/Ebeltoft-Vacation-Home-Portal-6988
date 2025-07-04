import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiCheck, FiPlus, FiTrash2, FiEdit3 } = FiIcons;

const Checklist = () => {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Luk hovedvandhanerne under køkkenvask og badeværelse', completed: false, category: 'vand' },
    { id: 2, text: 'Sluk for alle elektriske apparater', completed: false, category: 'strøm' },
    { id: 3, text: 'Tøm køleskab for letfordærvelige varer', completed: false, category: 'rengøring' },
    { id: 4, text: 'Støvsug alle rum', completed: false, category: 'rengøring' },
    { id: 5, text: 'Vask køkken og badeværelse', completed: false, category: 'rengøring' },
    { id: 6, text: 'Tøm skraldespande', completed: false, category: 'rengøring' },
    { id: 7, text: 'Lås alle døre og vinduer', completed: false, category: 'sikkerhed' },
  ]);

  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('rengøring');

  const categories = {
    vand: { name: 'Vand', color: 'bg-blue-100 text-blue-800' },
    strøm: { name: 'Strøm', color: 'bg-yellow-100 text-yellow-800' },
    rengøring: { name: 'Rengøring', color: 'bg-green-100 text-green-800' },
    sikkerhed: { name: 'Sikkerhed', color: 'bg-red-100 text-red-800' },
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask,
        completed: false,
        category: newCategory,
      };
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">Tjekliste for afgang</h2>
          <div className="text-sm text-gray-600">
            {completedTasks} af {totalTasks} opgaver færdige
          </div>
        </div>

        <div className="mb-6 bg-gray-100 rounded-lg p-1">
          <div 
            className="bg-summer-green h-2 rounded-lg transition-all duration-300"
            style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
          />
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Tilføj ny opgave..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
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
            onClick={addTask}
            className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
          </motion.button>
        </div>
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

              <button
                onClick={() => deleteTask(task.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Checklist;