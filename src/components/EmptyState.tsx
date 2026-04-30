interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg
        className="w-20 h-20 mb-5 opacity-20"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="10"
          y="8"
          width="60"
          height="64"
          rx="6"
          stroke="#0f2a2a"
          strokeWidth="3"
          fill="none"
        />
        <rect x="20" y="20" width="40" height="4" rx="2" fill="#0f2a2a" opacity="0.4" />
        <rect x="20" y="30" width="30" height="4" rx="2" fill="#0f2a2a" opacity="0.3" />
        <rect x="20" y="40" width="35" height="4" rx="2" fill="#0f2a2a" opacity="0.2" />
        <rect x="20" y="50" width="25" height="4" rx="2" fill="#0f2a2a" opacity="0.15" />
        <circle cx="55" cy="55" r="15" fill="#3d7a6e" opacity="0.15" stroke="#3d7a6e" strokeWidth="2" />
        <path
          d="M49 55h12M55 49v12"
          stroke="#3d7a6e"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      <h3
        className="text-xl font-semibold text-gray-600 mb-2"
        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
      >
        {title}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: '#3d7a6e' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2d5e55';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3d7a6e';
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
