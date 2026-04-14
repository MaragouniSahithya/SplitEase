import React from 'react';

const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full min-h-[50vh]">
      <div className="text-5xl text-slate-300 drop-shadow-sm mb-2">{icon}</div>
      <h3 className="text-xl font-bold text-text-primary tracking-tight">{title}</h3>
      <p className="text-text-secondary max-w-sm">{description}</p>
      
      {action && (
        <button 
          onClick={action.onClick}
          className="btn-primary mt-4 px-6 py-2 rounded-xl"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
