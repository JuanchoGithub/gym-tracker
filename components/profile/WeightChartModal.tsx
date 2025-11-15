import React, { useMemo } from 'react';
import Modal from '../common/Modal';
import { WeightEntry, ChartDataPoint } from '../../types';
import Chart from '../common/Chart';
import { useMeasureUnit } from '../../hooks/useWeight';
import { useI18n } from '../../hooks/useI18n';
import { convertKgToLbs } from '../../utils/weightUtils';

interface WeightChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: WeightEntry[];
}

const WeightChartModal: React.FC<WeightChartModalProps> = ({ isOpen, onClose, history }) => {
    const { t } = useI18n();
    const { weightUnit } = useMeasureUnit();

    const chartData: ChartDataPoint[] = useMemo(() => {
        const sortedHistory = [...history].sort((a, b) => a.date - b.date);
        return sortedHistory.map(entry => ({
            date: entry.date,
            label: new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            value: weightUnit === 'lbs' ? convertKgToLbs(entry.weight) : entry.weight,
        }));
    }, [history, weightUnit]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('profile_weight_history_chart_title')} (${t(`workout_${weightUnit}`)})`}>
            <div className="h-64">
                <Chart data={chartData} />
            </div>
        </Modal>
    );
};

export default WeightChartModal;