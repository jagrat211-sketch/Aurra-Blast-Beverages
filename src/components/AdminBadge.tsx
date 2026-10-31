import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminLoginModal } from './AdminLoginModal';

export const AdminBadge: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={handleClick}
          title="Sign in as Administrator"
          className="group flex items-center gap-1.5 rounded-full border border-slate-300/80 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-md backdrop-blur-md hover:border-amber-400 hover:bg-amber-50/80 hover:text-amber-800 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-amber-400 transition-all cursor-pointer active:scale-95"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Lock className="h-2.5 w-2.5" />
          </span>
          <span>{user?.role === 'admin' ? 'Admin Studio' : 'Admin Sign In'}</span>
        </button>
      </div>

      <AdminLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
