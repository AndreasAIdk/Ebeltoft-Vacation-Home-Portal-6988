import React,{useState,useRef,useEffect} from 'react';
import {motion} from 'framer-motion';

const ColorPicker=({color,onChange,className=''})=> {
  const [isOpen,setIsOpen]=useState(false);
  const [hexInput,setHexInput]=useState(color);
  const [selectedHue,setSelectedHue]=useState(220);
  const [selectedSaturation,setSelectedSaturation]=useState(70);
  const [selectedLightness,setSelectedLightness]=useState(50);
  const pickerRef=useRef(null);

  useEffect(()=> {
    setHexInput(color);
    // Convert hex to HSL for sliders
    const hsl=hexToHsl(color);
    if (hsl) {
      setSelectedHue(hsl.h);
      setSelectedSaturation(hsl.s);
      setSelectedLightness(hsl.l);
    }
  },[color]);

  useEffect(()=> {
    const handleClickOutside=(event)=> {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown',handleClickOutside);
    return ()=> document.removeEventListener('mousedown',handleClickOutside);
  },[]);

  // Convert hex to HSL
  const hexToHsl=(hex)=> {
    const r=parseInt(hex.slice(1,3),16) / 255;
    const g=parseInt(hex.slice(3,5),16) / 255;
    const b=parseInt(hex.slice(5,7),16) / 255;

    const max=Math.max(r,g,b);
    const min=Math.min(r,g,b);
    let h,s,l;

    l=(max + min) / 2;

    if (max === min) {
      h=s=0;
    } else {
      const d=max - min;
      s=l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h=(g - b) / d + (g < b ? 6 : 0); break;
        case g: h=(b - r) / d + 2; break;
        case b: h=(r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // Convert HSL to hex
  const hslToHex=(h,s,l)=> {
    h=h / 360;
    s=s / 100;
    l=l / 100;

    const hue2rgb=(p,q,t)=> {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r,g,b;

    if (s === 0) {
      r=g=b=l;
    } else {
      const q=l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p=2 * l - q;
      r=hue2rgb(p,q,h + 1/3);
      g=hue2rgb(p,q,h);
      b=hue2rgb(p,q,h - 1/3);
    }

    const toHex=(c)=> {
      const hex=Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleHexChange=(e)=> {
    const value=e.target.value;
    setHexInput(value);
    
    // Validate hex color and apply immediately
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value);
      const hsl=hexToHsl(value);
      if (hsl) {
        setSelectedHue(hsl.h);
        setSelectedSaturation(hsl.s);
        setSelectedLightness(hsl.l);
      }
    }
  };

  const handleSliderChange=(type,value)=> {
    let newHue=selectedHue;
    let newSat=selectedSaturation;
    let newLight=selectedLightness;

    switch(type) {
      case 'hue':
        newHue=value;
        setSelectedHue(value);
        break;
      case 'saturation':
        newSat=value;
        setSelectedSaturation(value);
        break;
      case 'lightness':
        newLight=value;
        setSelectedLightness(value);
        break;
    }

    const newColor=hslToHex(newHue,newSat,newLight);
    setHexInput(newColor);
    onChange(newColor);
  };

  const presetColors=[
    // Vibrant colors
    '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#ADFF2F',
    '#00FF00', '#00CED1', '#0000FF', '#8A2BE2', '#FF1493',
    
    // Professional colors
    '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
    '#db2777', '#0891b2', '#65a30d', '#ea580c', '#8b5cf6',
    
    // Muted colors
    '#6B7280', '#374151', '#1F2937', '#111827', '#F3F4F6',
    '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563',
    
    // Pastel colors
    '#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#E0E7FF',
    '#F3E8FF', '#FCE7F3', '#FDF2F8', '#F0FDF4', '#ECFDF5'
  ];

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <button
        onClick={()=> setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-lg border-2 border-gray-300 relative overflow-hidden hover:scale-110 transition-transform"
        style={{backgroundColor: color}}
      >
      </button>

      {isOpen && (
        <motion.div
          initial={{opacity: 0,y: -10,scale: 0.95}}
          animate={{opacity: 1,y: 0,scale: 1}}
          className="absolute top-14 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50"
        >
          {/* Current Color Display */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded border border-gray-300"
              style={{backgroundColor: color}}
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Valgt farve</div>
              <div className="text-xs text-gray-500 font-mono">{color}</div>
            </div>
          </div>

          {/* Color Sliders */}
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Farvetone ({selectedHue}°)
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={selectedHue}
                onChange={(e)=> handleSliderChange('hue',parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                }}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mætning ({selectedSaturation}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedSaturation}
                onChange={(e)=> handleSliderChange('saturation',parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${hslToHex(selectedHue,0,selectedLightness)} 0%, ${hslToHex(selectedHue,100,selectedLightness)} 100%)`
                }}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lysstyrke ({selectedLightness}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedLightness}
                onChange={(e)=> handleSliderChange('lightness',parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #000000 0%, ${hslToHex(selectedHue,selectedSaturation,50)} 50%, #ffffff 100%)`
                }}
              />
            </div>
          </div>

          {/* Hex Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farve kode (hex)
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
              placeholder="#000000"
              maxLength={7}
            />
          </div>

          {/* Preset Colors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hurtige farver
            </label>
            <div className="grid grid-cols-10 gap-1">
              {presetColors.map((presetColor)=> (
                <button
                  key={presetColor}
                  onClick={()=> {
                    onChange(presetColor);
                    setHexInput(presetColor);
                    const hsl=hexToHsl(presetColor);
                    if (hsl) {
                      setSelectedHue(hsl.h);
                      setSelectedSaturation(hsl.s);
                      setSelectedLightness(hsl.l);
                    }
                  }}
                  className={`w-7 h-7 rounded border hover:scale-110 transition-transform ${
                    color === presetColor ? 'border-gray-800 ring-2 ring-gray-400' : 'border-gray-300'
                  }`}
                  style={{backgroundColor: presetColor}}
                  title={presetColor}
                />
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={()=> setIsOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Luk
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ColorPicker;