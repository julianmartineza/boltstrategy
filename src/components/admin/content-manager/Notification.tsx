import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  return (
    <div className={`rounded-md p-4 mb-4 flex items-start justify-between ${
      type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-start">
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
        )}
        <p className={`text-sm ${
          type === 'success' ? 'text-green-700' : 'text-red-700'
        }`}>
          {message}
        </p>
      </div>
      <button
        type="button"
        className={`ml-3 inline-flex ${
          type === 'success' ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'
        }`}
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Notification;
