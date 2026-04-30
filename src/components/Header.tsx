import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1
          className="text-2xl font-semibold text-gray-800"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: '#4a90a4' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#357a8f';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4a90a4';
          }}
        >
          {actionButton.icon && <actionButton.icon size={16} />}
          {actionButton.label}
        </button>
      )}
    </div>
  );
}
