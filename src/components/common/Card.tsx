import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-gray-800 p-4 rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
      {children}
    </div>
  );
};

export default Card;
