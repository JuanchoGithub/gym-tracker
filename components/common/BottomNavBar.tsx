
import React from 'react';
import { Page } from '../../App';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from './Icon';

interface BottomNavBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center w-full h-full group"
    >
      {isActive && (
        <div className="absolute top-0 w-12 h-1 bg-primary rounded-b-full shadow-[0_0_10px_rgba(56,189,248,0.6)] animate-fadeIn" />
      )}
      <div className={`transition-colors duration-300 mb-0.5 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-text-primary'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-text-primary'}`}>
        {label}
      </span>
    </button>
  );
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useI18n();
  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'TRAIN', label: t('nav_train'), icon: <Icon name="dumbbell" className="w-6 h-6" /> },
    { page: 'HISTORY', label: t('nav_history'), icon: <Icon name="history" className="w-6 h-6" /> },
    { page: 'EXERCISES', label: t('nav_exercises'), icon: <Icon name="clipboard-list" className="w-6 h-6" /> },
    { page: 'SUPPLEMENTS', label: t('nav_supplements'), icon: <Icon name="capsule" className="w-6 h-6" /> },
    { page: 'PROFILE', label: t('nav_profile'), icon: <Icon name="user" className="w-6 h-6" /> },
  ];

  return (
    <nav className="h-[calc(4.5rem+env(safe-area-inset-bottom))] w-full bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 flex justify-around items-start pt-2 pb-[env(safe-area-inset-bottom)] z-40 fixed bottom-0 left-0 right-0 shadow-2xl">
      {navItems.map(item => (
        <NavItem
          key={item.page}
          label={item.label}
          icon={item.icon}
          isActive={currentPage === item.page}
          onClick={() => onNavigate(item.page)}
        />
      ))}
    </nav>
  );
};

export default BottomNavBar;
