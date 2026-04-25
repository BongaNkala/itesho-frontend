import { useState } from 'react';

export const Tabs = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (child.type === TabsList) {
          return React.cloneElement(child, { activeTab, setActiveTab });
        }
        if (child.type === TabsContent) {
          return React.cloneElement(child, { activeTab });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ children, activeTab, setActiveTab, className }) => {
  return (
    <div className={`flex flex-wrap gap-1 border-b ${className || ''}`}>
      {React.Children.map(children, child => {
        return React.cloneElement(child, { activeTab, setActiveTab });
      })}
    </div>
  );
};

export const TabsTrigger = ({ value, children, activeTab, setActiveTab, className }) => {
  const isActive = activeTab === value;
  return (
    <button
      className={`px-4 py-2 text-sm font-medium transition-all ${
        isActive 
          ? 'border-b-2 border-orange-500 text-orange-600' 
          : 'text-gray-500 hover:text-gray-700'
      } ${className || ''}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, activeTab, className }) => {
  if (activeTab !== value) return null;
  return <div className={`mt-4 ${className || ''}`}>{children}</div>;
};

// Add React import for the cloneElement to work
import React from 'react';
