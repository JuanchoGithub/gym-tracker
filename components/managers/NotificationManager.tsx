
import React, { useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { TimerContext } from '../../contexts/TimerContext';
import { scheduleTimerNotification, cancelTimerNotification } from '../../services/notificationService';
import { useI18n } from '../../hooks/useI18n';

const NotificationManager: React.FC = () => {
    const { enableNotifications, getExerciseById } = useContext(AppContext);
    const { activeTimerInfo } = useContext(TimerContext);
    const { t } = useI18n();
    
    // Track the last scheduled target time to avoid spamming the service worker
    // with the same schedule request on every render.
    const lastScheduledTargetRef = useRef<number | null>(null);

    useEffect(() => {
        // Condition 1: Notifications disabled OR Timer doesn't exist OR Timer is paused
        if (!enableNotifications || !activeTimerInfo || activeTimerInfo.isPaused) {
            if (lastScheduledTargetRef.current !== null) {
                cancelTimerNotification('rest-timer-finished');
                lastScheduledTargetRef.current = null;
            }
            return;
        }

        // Condition 2: Valid running timer
        const { targetTime, exerciseId } = activeTimerInfo;
        
        // If this specific target time hasn't been scheduled yet
        if (targetTime !== lastScheduledTargetRef.current) {
            const exerciseInfo = getExerciseById(exerciseId);
            const remainingTime = (targetTime - Date.now()) / 1000;

            if (exerciseInfo && remainingTime > 0) {
                scheduleTimerNotification(remainingTime, t('notification_timer_finished_title'), {
                    body: t('notification_timer_finished_body', { exercise: exerciseInfo.name }),
                    icon: '/icon-192x192.png',
                    tag: 'rest-timer-finished',
                    requireInteraction: true,
                });
                lastScheduledTargetRef.current = targetTime;
            }
        }

    }, [activeTimerInfo, enableNotifications, getExerciseById, t]);

    return null;
};

export default NotificationManager;
