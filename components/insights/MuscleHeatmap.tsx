
import React, { useState } from 'react';
import { getFreshnessColor } from '../../utils/fatigueUtils';
import { MuscleGroup } from '../../types';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { getMuscleTKey } from '../../utils/i18nUtils';

interface MuscleHeatmapProps {
  freshnessData?: Record<string, number>;
  highlightMap?: Record<string, string>; // Map of MuscleName -> HexColor
}

interface MusclePathProps {
  d: string;
  muscles: MuscleGroup[];
  data?: Record<string, number>;
  highlightMap?: Record<string, string>;
  onHover: (muscles: string[], score: number | null, label?: string) => void;
  onLeave: () => void;
}

const MusclePath: React.FC<MusclePathProps> = ({ d, muscles, data, highlightMap, onHover, onLeave }) => {
  
  let fill = '#dce8f0'; // Default skin tone (inactive)
  let score: number | null = null;
  let label: string | undefined = undefined;

  // Priority 1: Direct Highlight Map (Used in Exercise Details)
  if (highlightMap) {
    // Check if any muscle in this group is highlighted
    const highlightedMuscle = muscles.find(m => highlightMap[m]);
    if (highlightedMuscle) {
        fill = highlightMap[highlightedMuscle];
        // If strictly highlighting, we don't show a score, just the name
    }
  } 
  // Priority 2: Freshness Data (Used in Insights)
  else if (data) {
    // Calculate average freshness for the group of muscles represented by this path
    let total = 0;
    let count = 0;
    
    muscles.forEach(m => {
        if (data[m] !== undefined) {
            total += data[m];
            count++;
        }
    });
    
    score = count > 0 ? total / count : 100; 
    fill = getFreshnessColor(score);
  }

  return (
    <path 
        d={d} 
        fill={fill} 
        stroke="#1e293b" 
        strokeWidth="1" 
        className="transition-colors duration-500 hover:brightness-110 cursor-pointer"
        onMouseEnter={() => onHover(muscles, score, label)}
        onMouseLeave={onLeave}
    />
  );
};

const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({ freshnessData, highlightMap }) => {
    const { t } = useI18n();
    const [tooltip, setTooltip] = useState<{ name: string; score: number | null; x: number; y: number } | null>(null);

    const handleHover = (muscles: string[], score: number | null) => {
        const translatedNames = muscles.map(m => t(getMuscleTKey(m))).join(', ');
        setTooltip({ name: translatedNames, score: score !== null ? Math.round(score) : null, x: 0, y: 0 });
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Legend: Only show if using Freshness Data mode */}
            {!highlightMap && (
                <div className="bg-surface p-3 rounded-lg border border-white/10 mb-4 w-full flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                        <span className="text-text-secondary">{t('heatmap_fatigued')}</span>
                    </div>
                    <div className="h-1 w-16 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mx-2"></div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
                        <span className="text-text-secondary">{t('heatmap_fresh')}</span>
                    </div>
                </div>
            )}

            {tooltip ? (
                 <div className="mb-2 h-8 text-center animate-fadeIn">
                    <span className="font-bold text-white">{tooltip.name}</span>
                    {tooltip.score !== null && (
                        <>: <span className={`font-mono font-bold ${tooltip.score > 80 ? 'text-green-400' : tooltip.score < 40 ? 'text-red-400' : 'text-yellow-400'}`}>{tooltip.score}% {t('heatmap_recovery')}</span></>
                    )}
                 </div>
            ) : (
                <div className="mb-2 h-8 text-center text-text-secondary/50 text-sm flex items-center justify-center gap-1">
                    <Icon name="question-mark-circle" className="w-4 h-4" />
                    <span>{t('heatmap_hover_hint')}</span>
                </div>
            )}

            <svg viewBox="0 0 600 460" className="w-full h-auto drop-shadow-xl">
                <defs>
                    <style>
                        {`
                            .label { font-family: sans-serif; font-size: 12px; fill: #4a6b8a; text-anchor: middle; font-weight: bold; pointer-events: none; }
                        `}
                    </style>
                </defs>

                {/* FRONT VIEW (Left Side of SVG) */}
                <g transform="translate(150, 50)">
                    {/* Head - Decorative */}
                    <path fill="#dce8f0" stroke="#1e293b" strokeWidth="1" d="M-25,-10 C-35,-10 -35,25 -20,35 L-15,45 L15,45 L20,35 C35,25 35,-10 25,-10 Z" />
                    
                    {/* Traps (Front visible) */}
                    <MusclePath d="M-25,38 L-50,55 L-15,45 Z" muscles={['Traps']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M25,38 L50,55 L15,45 Z" muscles={['Traps']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Shoulders (Front/Side) */}
                    <MusclePath d="M-60,55 C-80,60 -85,80 -70,95 L-55,85 Z" muscles={['Front Delts', 'Side Delts']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M60,55 C80,60 85,80 70,95 L55,85 Z" muscles={['Front Delts', 'Side Delts']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Chest */}
                    <MusclePath d="M-2,45 Q-40,45 -50,35 L-60,55 Q-30,90 -2,80 Z" muscles={['Pectorals', 'Upper Chest', 'Lower Chest']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M2,45 Q40,45 50,35 L60,55 Q30,90 2,80 Z" muscles={['Pectorals', 'Upper Chest', 'Lower Chest']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Abs */}
                    <MusclePath d="M-20,80 L20,80 L15,140 L-15,140 Z" muscles={['Abs', 'Transverse Abdominis']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    
                    {/* Abs Details (Decorative) */}
                    <g pointerEvents="none">
                        <line x1="-20" y1="95" x2="20" y2="95" stroke="#4a6b8a" strokeWidth="1" opacity="0.5" />
                        <line x1="-18" y1="110" x2="18" y2="110" stroke="#4a6b8a" strokeWidth="1" opacity="0.5" />
                        <line x1="-15" y1="125" x2="15" y2="125" stroke="#4a6b8a" strokeWidth="1" opacity="0.5" />
                        <line x1="0" y1="80" x2="0" y2="130" stroke="#4a6b8a" strokeWidth="1" opacity="0.5" />
                    </g>

                    {/* Obliques */}
                    <MusclePath d="M-20,80 L-40,75 Q-45,100 -35,130 L-15,140 Z" muscles={['Obliques']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M20,80 L40,75 Q45,100 35,130 L15,140 Z" muscles={['Obliques']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Pelvis / Hip Flexors */}
                    <MusclePath d="M-35,130 L-15,140 L0,155 L15,140 L35,130 L30,160 L0,170 L-30,160 Z" muscles={['Hip Flexors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Biceps */}
                    <MusclePath d="M-70,95 L-80,130 L-60,130 L-55,85 Z" muscles={['Biceps', 'Brachialis']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M70,95 L80,130 L60,130 L55,85 Z" muscles={['Biceps', 'Brachialis']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Forearms */}
                    <MusclePath d="M-80,130 L-90,170 L-80,180 L-65,170 L-60,130 Z" muscles={['Forearms', 'Wrist Flexors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M80,130 L90,170 L80,180 L65,170 L60,130 Z" muscles={['Forearms', 'Wrist Flexors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Hands (Front) - Mapped to Forearms */}
                    <MusclePath d="M-90,170 L-95,200 L-80,205 L-65,170 Z" muscles={['Forearms']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M90,170 L95,200 L80,205 L65,170 Z" muscles={['Forearms']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Quads */}
                    <MusclePath d="M-30,160 Q-55,200 -40,260 L-30,280 L-10,260 Q-5,200 -10,170 Z" muscles={['Quads', 'Adductors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M30,160 Q55,200 40,260 L30,280 L10,260 Q5,200 10,170 Z" muscles={['Quads', 'Adductors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                    {/* Knees - Decorative */}
                    <path fill="#dce8f0" stroke="#1e293b" strokeWidth="1" d="M-30,280 L-40,260 L-40,300 L-20,300 L-10,260 Z" />
                    <path fill="#dce8f0" stroke="#1e293b" strokeWidth="1" d="M30,280 L40,260 L40,300 L20,300 L10,260 Z" />

                    {/* Tibialis / Shins */}
                    <MusclePath d="M-40,300 L-45,360 L-35,380 L-25,360 L-20,300 Z" muscles={['Tibialis Anterior']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M40,300 L45,360 L35,380 L25,360 L20,300 Z" muscles={['Tibialis Anterior']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                
                    {/* Feet (Front) */}
                    <MusclePath d="M-45,380 L-20,380 L-15,400 L-55,400 Z" muscles={['Tibialis Anterior']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                    <MusclePath d="M45,380 L20,380 L15,400 L55,400 Z" muscles={['Tibialis Anterior']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                </g>

                {/* BACK VIEW (Right Side of SVG) */}
                <g transform="translate(450, 50)">
                     {/* Head - Decorative */}
                     <path fill="#dce8f0" stroke="#1e293b" strokeWidth="1" d="M-25,-10 C-35,-10 -35,25 -20,35 L-15,45 L15,45 L20,35 C35,25 35,-10 25,-10 Z" />

                     {/* Traps */}
                     <MusclePath d="M0,35 L-25,45 L-50,60 L0,100 L50,60 L25,45 Z" muscles={['Traps']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Rear Delts */}
                     <MusclePath d="M-50,60 C-75,65 -85,80 -70,95 L-55,85 Z" muscles={['Rear Delts', 'Side Delts']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M50,60 C75,65 85,80 70,95 L55,85 Z" muscles={['Rear Delts', 'Side Delts']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Lats */}
                     <MusclePath d="M0,100 L-50,60 L-40,110 L-10,135 L0,135 Z" muscles={['Lats', 'Teres Major']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M0,100 L50,60 L40,110 L10,135 L0,135 Z" muscles={['Lats', 'Teres Major']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Lower Back */}
                     <MusclePath d="M-10,135 L-12,160 L12,160 L10,135 Z" muscles={['Lower Back', 'Spinal Erectors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Triceps */}
                     <MusclePath d="M-70,95 L-80,130 L-60,130 L-55,85 Z" muscles={['Triceps']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M70,95 L80,130 L60,130 L55,85 Z" muscles={['Triceps']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Forearms */}
                     <MusclePath d="M-80,130 L-90,170 L-80,180 L-65,170 L-60,130 Z" muscles={['Forearms', 'Wrist Extensors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M80,130 L90,170 L80,180 L65,170 L60,130 Z" muscles={['Forearms', 'Wrist Extensors']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Hands (Back) */}
                     <MusclePath d="M-90,170 L-95,200 L-80,205 L-65,170 Z" muscles={['Forearms']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M90,170 L95,200 L80,205 L65,170 Z" muscles={['Forearms']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Glutes */}
                     <MusclePath d="M-12,160 L-35,160 Q-45,190 -10,200 L0,200 Z" muscles={['Glutes']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M12,160 L35,160 Q45,190 10,200 L0,200 Z" muscles={['Glutes']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Hamstrings */}
                     <MusclePath d="M-10,200 L-40,195 Q-50,230 -35,270 L-10,270 Z" muscles={['Hamstrings']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M10,200 L40,195 Q50,230 35,270 L10,270 Z" muscles={['Hamstrings']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Calves */}
                     <MusclePath d="M-35,270 L-45,300 Q-40,330 -30,350 L-20,350 Q-15,300 -10,270 Z" muscles={['Calves', 'Gastrocnemius', 'Soleus']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M35,270 L45,300 Q40,330 30,350 L20,350 Q15,300 10,270 Z" muscles={['Calves', 'Gastrocnemius', 'Soleus']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />

                     {/* Feet (Back) */}
                     <MusclePath d="M-30,350 L-15,350 L-20,380 L-40,380 Z" muscles={['Calves']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                     <MusclePath d="M30,350 L15,350 L20,380 L40,380 Z" muscles={['Calves']} data={freshnessData} highlightMap={highlightMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
                </g>
                
                <text x="150" y="30" className="label">{t('heatmap_front')}</text>
                <text x="450" y="30" className="label">{t('heatmap_back')}</text>
            </svg>
        </div>
    );
};

export default MuscleHeatmap;
