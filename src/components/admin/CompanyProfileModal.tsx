import React from 'react';
import { X } from 'lucide-react';
import CompanyProfileForm from '../auth/CompanyProfileForm';

interface CompanyProfileModalProps {
  userId: string;
  onClose: () => void;
}

const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ userId, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Información de Empresa</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <CompanyProfileForm 
            userId={userId} 
            isAdmin={true} 
            onComplete={onClose} 
          />
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileModal;
