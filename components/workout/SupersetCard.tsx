
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SupersetDefinition, WorkoutExercise } from '../../types';
import { Icon } from '../common/Icon';
import { useClickOutside } from '../../hooks/useClickOutside';

interface SupersetCardProps {
    definition: SupersetDefinition;
    children: React.ReactNode;
    onRename: (newName: string) => void;
    onUngroup: () => void;
    onAddExercise: () => void;
    onPlay?: () => void;
    exercises?: WorkoutExercise[];
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    defaultCollapsed?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isReorganizeMode?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
    isBeingDraggedOver?: boolean;
}

const SupersetCard: React.FC<SupersetCardProps> = ({ 
    definition, 
    children, 
    onRename, 
    onUngroup, 
    onAddExercise, 
    onPlay, 
    exercises, 
    isCollapsed: propsIsCollapsed,
    onToggleCollapse: propsOnToggleCollapse,
    defaultCollapsed = false,
    onMoveUp,
    onMoveDown,
    isReorganizeMode,
    onDragStart,
    onDragEnter,
    onDragEnd,
    isBeingDraggedOver
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState(definition.name);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Internal state used only if props are not provided
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useClickOutside(menuRef, () => setIsMenuOpen(false));

    useEffect(() => {
        if (isEditingName && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingName]);

    // Determine if controlled or uncontrolled
    const isControlled = propsIsCollapsed !== undefined;
    const isCollapsed = isControlled ? propsIsCollapsed : internalCollapsed;

    const handleToggleCollapse = () => {
        if (isControlled && propsOnToggleCollapse) {
            propsOnToggleCollapse();
        } else {
            setInternalCollapsed(!internalCollapsed);
        }
    };

    const handleSaveName = () => {
        if (name.trim()) {
            onRename(name.trim());
        } else {
            setName(definition.name);
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            setName(definition.name);
            setIsEditingName(false);
        }
    };

    const nextRoundNumber = useMemo(() => {
        if (!exercises || exercises.length === 0) return 1;
        const maxSets = Math.max(...exercises.map(ex => ex.sets.length));
        if (maxSets === 0) return 1;

        for (let i = 0; i < maxSets; i++) {
            const isRoundComplete = exercises.every(ex => {
                const set = ex.sets[i];
                return set && set.isComplete;
            });
            if (!isRoundComplete) return i + 1;
        }
        return maxSets + 1;
    }, [exercises]);

    return (
        <div 
            className={`bg-surface-highlight/20 rounded-2xl border-l-4 border-indigo-500 mb-4 relative transition-all ${isReorganizeMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            draggable={isReorganizeMode}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragEnd={onDragEnd}
            onDragOver={(e) => { if(isReorganizeMode) e.preventDefault(); }}
        >
            {isBeingDraggedOver && <div className="absolute -top-1 left-0 w-full h-1 bg-primary rounded-full animate-pulse z-50"></div>}
            
            <div className={`bg-indigo-500/10 p-3 flex items-center justify-between border-b border-indigo-500/20 transition-all ${isCollapsed ? 'rounded-r-xl' : 'rounded-tr-xl'} rounded-tl-xl`}>
                <div className="flex items-center gap-3 flex-grow min-w-0">
                    <button 
                        onClick={handleToggleCollapse}
                        className="p-1 hover:bg-white/5 rounded transition-colors"
                        aria-label={isCollapsed ? "Expand superset" : "Collapse superset"}
                    >
                        <Icon name="arrow-down" className={`w-5 h-5 text-indigo-300 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>

                    <div className="bg-indigo-500 p-1.5 rounded-lg flex-shrink-0">
                        <Icon name="duplicate" className="w-4 h-4 text-white" />
                    </div>
                    {isEditingName ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={handleKeyDown}
                            className="bg-black/30 text-white font-bold px-2 py-1 rounded border border-indigo-500/50 w-full outline-none min-w-[100px]"
                        />
                    ) : (
                        <button 
                            onClick={() => setIsEditingName(true)}
                            className="font-bold text-indigo-200 hover:text-white text-left truncate"
                        >
                            {definition.name}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {onPlay && !isReorganizeMode && (
                        <button 
                            onClick={onPlay}
                            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm mr-1 uppercase tracking-wide"
                        >
                            <Icon name="play" className="w-3 h-3 fill-current" />
                            <span>START ROUND {nextRoundNumber}</span>
                        </button>
                    )}
                    {!isReorganizeMode && (
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-indigo-300 hover:text-white rounded-full hover:bg-indigo-500/20 transition-colors">
                                <Icon name="ellipsis" className="w-5 h-5" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-indigo-500/30 rounded-md shadow-lg z-30 overflow-hidden">
                                    <button onClick={() => { setIsEditingName(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20 flex items-center gap-2">
                                        <Icon name="edit" className="w-4 h-4"/>
                                        <span>Rename</span>
                                    </button>
                                    <button onClick={() => { onAddExercise(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20 flex items-center gap-2">
                                        <Icon name="plus" className="w-4 h-4"/>
                                        <span>Add Exercise</span>
                                    </button>
                                    <div className="h-px bg-indigo-500/20 my-1"></div>
                                    {onMoveUp && (
                                        <button onClick={() => { onMoveUp(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20 flex items-center gap-2">
                                            <Icon name="arrow-up" className="w-4 h-4"/>
                                            <span>Move Up</span>
                                        </button>
                                    )}
                                    {onMoveDown && (
                                        <button onClick={() => { onMoveDown(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-500/20 flex items-center gap-2">
                                            <Icon name="arrow-down" className="w-4 h-4"/>
                                            <span>Move Down</span>
                                        </button>
                                    )}
                                    <div className="h-px bg-indigo-500/20 my-1"></div>
                                    <button onClick={() => { onUngroup(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                                        <Icon name="minus" className="w-4 h-4"/>
                                        <span>Ungroup Superset</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {isReorganizeMode && (
                        <div className="p-1.5 text-indigo-300">
                            <Icon name="sort" className="w-5 h-5" />
                        </div>
                    )}
                </div>
            </div>
            {!isCollapsed && (
                <div className="p-2 sm:p-3 space-y-3 animate-fadeIn rounded-b-2xl">
                    {children}
                </div>
            )}
        </div>
    );
};

export default SupersetCard;
