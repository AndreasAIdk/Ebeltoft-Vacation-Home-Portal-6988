import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const ColorPicker = ({ color, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [tempColor, setTempColor] = useState(color);
  const pickerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    setHexInput(color);
    setTempColor(color);
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset to original color when closing without saving
        setTempColor(color);
        setHexInput(color);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [color]);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      drawColorWheel();
    }
  }, [isOpen]);

  const drawColorWheel = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw inner circle for saturation/lightness
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius - 20);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    const normalizedAngle = ((angle + 360) % 360);
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.min(centerX, centerY) - 10;
    
    if (distance <= maxDistance) {
      const saturation = Math.min(100, (distance / maxDistance) * 100);
      const lightness = 50;
      const newColor = `hsl(${normalizedAngle}, ${saturation}%, ${lightness}%)`;
      
      // Convert HSL to hex
      const hexColor = hslToHex(normalizedAngle, saturation, lightness);
      setTempColor(hexColor);
      setHexInput(hexColor);
    }
  };

  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const handleHexChange = (e) => {
    const value = e.target.value;
    setHexInput(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setTempColor(value);
    }
  };

  const handleSaveColor = () => {
    onChange(tempColor);
    setIsOpen(false);
  };

  const handleCancelColor = () => {
    setTempColor(color);
    setHexInput(color);
    setIsOpen(false);
  };

  const presetColors = [
    '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
    '#db2777', '#0891b2', '#65a30d', '#ea580c', '#8b5cf6'
  ];

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-lg border-2 border-gray-300 relative overflow-hidden hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      >
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-14 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50"
        >
          {/* Color Wheel */}
          <div className="mb-4">
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              className="mx-auto cursor-crosshair border border-gray-200 rounded-full"
              onClick={handleCanvasClick}
            />
          </div>

          {/* Preset Colors */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Hurtige farver</label>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => {
                    setTempColor(presetColor);
                    setHexInput(presetColor);
                  }}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          {/* Hex Input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Hex kode</label>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="#000000"
            />
          </div>

          {/* Color Preview */}
          <div className="mb-4 flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border border-gray-300"
              style={{ backgroundColor: tempColor }}
            />
            <span className="text-sm text-gray-600">{tempColor}</span>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSaveColor}
              className="flex-1 px-3 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors text-sm font-medium"
            >
              Gem farve
            </button>
            <button
              onClick={handleCancelColor}
              className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Annuller
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ColorPicker;