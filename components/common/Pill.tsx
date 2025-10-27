
import React from 'react';
import { Icon } from './Icon';

interface PillProps {
  value: string;
  type: 'increase' | 'decrease' | 'neutral';
}

const Pill: React.FC<PillProps> = ({ value, type }) => {
  const config = {
    increase: {
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      icon: <Icon name="arrow-up" className="w-3 h-3" />,
    },
    decrease: {
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      icon: <Icon name="arrow-down" className="w-3 h-3" />,
    },
    neutral: {
      bgColor: 'bg-slate-500/20',
      textColor: 'text-slate-400',
      icon: <Icon name="arrow-right" className="w-3 h-3" />,
    },
  };

  const { bgColor, textColor, icon } = config[type];

  return (
    <div className={`flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgColor} ${textColor}`}>
      {icon}
      <span>{value}</span>
    </div>
  );
};

export default Pill;
