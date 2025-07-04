import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { FiAlertTriangle } from 'react-icons/fi';

const SafeIcon = ({ icon, name, className = '', size = 24, ...props }) => {
  let IconComponent;
  
  try {
    IconComponent = icon || (name && FiIcons[`Fi${name}`]);
  } catch (e) {
    IconComponent = null;
  }

  // Clean props to avoid SVG warnings
  const cleanProps = {
    ...props,
    className,
    width: size,
    height: size
  };

  // Remove any inherit values that cause SVG errors
  if (cleanProps.width === 'inherit') cleanProps.width = size;
  if (cleanProps.height === 'inherit') cleanProps.height = size;

  return IconComponent ? 
    React.createElement(IconComponent, cleanProps) : 
    <FiAlertTriangle {...cleanProps} />;
};

export default SafeIcon;