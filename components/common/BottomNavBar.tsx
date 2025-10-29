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
  const activeClass = 'text-primary';
  const inactiveClass = 'text-text-secondary hover:text-text-primary';
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${isActive ? activeClass : inactiveClass}`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useI18n();
  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'TRAIN', label: t('nav_train'), icon: <Icon name="dumbbell" /> },
    { page: 'HISTORY', label: t('nav_history'), icon: <Icon name="history" /> },
    { page: 'EXERCISES', label: t('nav_exercises'), icon: <Icon name="clipboard-list" /> },
    { page: 'TIMERS', label: t('nav_timers'), icon: <Icon name="stopwatch" /> },
    { page: 'PROFILE', label: t('nav_profile'), icon: <Icon name="user" /> },
  ];

  return (
    <nav className="h-20 bg-surface shadow-lg border-t border-secondary/20 flex pb-4">
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