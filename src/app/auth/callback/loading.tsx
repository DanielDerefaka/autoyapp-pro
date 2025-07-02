// app/loading.tsx - Next.js App Router loading file
import React from 'react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8">
      {/* Loading spinner */}
      <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
      
      {/* Loading text */}
    
    </div>
  );
}