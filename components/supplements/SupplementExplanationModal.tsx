import React, { useMemo } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { Explanation } from '../../services/explanationService';

interface SupplementExplanationModalProps {
    isOpen: boolean;
    onClose: () => void;
    explanations: Explanation[];
    explanationIdToShow?: string;
}

// A simple parser for **bold** text.
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    // Split by **bolded text**, keeping the delimiters
    const parts = text.split(/(\*\*.*?\*\*)/g);
  
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            // It's a bold part, render it as <strong>
            return <strong key={index}>{part.slice(2, -2)}</strong>;
          }
          // It's a regular text part
          return part;
        })}
      </>
    );
};


const SupplementExplanationModal: React.FC<SupplementExplanationModalProps> = ({ isOpen, onClose, explanations, explanationIdToShow }) => {
    const { t } = useI18n();

    const explanationsToRender = useMemo(() => {
        if (explanationIdToShow) {
            return explanations.filter(e => e.id === explanationIdToShow);
        }
        const general = explanations.find(e => e.id === 'general');
        const specifics = explanations.filter(e => e.id !== 'general');
        return general ? [general, ...specifics] : specifics;
    }, [explanations, explanationIdToShow]);

    const title = explanationIdToShow && explanationsToRender.length === 1
        ? explanationsToRender[0].title
        : t('explanation_modal_title');
    

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            contentClassName="bg-surface rounded-lg shadow-xl w-[calc(100%-1rem)] max-w-2xl h-[calc(100%-2rem)] max-h-[700px] m-auto flex flex-col p-4 sm:p-6"
        >
            <div className="flex-grow overflow-y-auto min-h-0 pr-2 space-y-6" style={{ overscrollBehaviorY: 'contain' }}>
                {explanationsToRender.map((exp, index) => (
                    <div key={index} className="bg-slate-900/50 p-4 rounded-lg">
                        <h3 className="font-bold text-xl text-primary mb-3">{exp.title}</h3>
                        <div className="space-y-3">
                            {exp.sections.map((sec, secIndex) => (
                                <div key={secIndex}>
                                    {sec.subtitle && <h4 className="font-semibold text-text-secondary mb-1">{sec.subtitle}</h4>}
                                    <p className="text-text-primary whitespace-pre-wrap">
                                        <SimpleMarkdown text={sec.content} />
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-secondary/20">
                <button onClick={onClose} className="w-full bg-secondary text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                    {t('common_close')}
                </button>
            </div>
        </Modal>
    );
};

export default SupplementExplanationModal;