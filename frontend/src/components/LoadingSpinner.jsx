import React from 'react';

export const Skeleton = ({ className }) => {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-md ${className}`}></div>
  );
};

export const CardSkeleton = () => (
  <div className="card p-4 space-y-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

const LoadingSpinner = () => {
  // Global full screen spinner typically used during initial load or hard transitions
  return (
    <div className="flex justify-center items-center h-48 w-full">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-t-transparent"></div>
    </div>
  );
};

export default LoadingSpinner;
