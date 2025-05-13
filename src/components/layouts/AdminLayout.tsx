import React, { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="container mx-auto px-4 py-6">
      {children}
    </div>
  );
};

export default AdminLayout;
