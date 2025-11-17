export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.error('This browser does not support desktop notification');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const scheduleTimerNotification = (duration: number, title: string, options: NotificationOptions): void => {
  if (Notification.permission !== 'granted' || !navigator.serviceWorker.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    payload: { duration, title, options }
  });
};

export const cancelTimerNotification = (tag: string): void => {
  if (!navigator.serviceWorker.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({
    type: 'CANCEL_NOTIFICATION',
    payload: { tag }
  });
};

export const sendSupplementUpdateNotification = (title: string, options: NotificationOptions): void => {
  if (Notification.permission !== 'granted' || !navigator.serviceWorker.controller) {
    return;
  }
  // This is not a scheduled notification, so we send it directly to the SW to show.
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification(title, options);
  });
};

export const showTimerNotification = (title: string, options: NotificationOptions): void => {
  if (Notification.permission !== 'granted') {
    return;
  }

  navigator.serviceWorker.ready.then(registration => {
    // To ensure re-notification, close any existing notification with the same tag.
    if (options.tag) {
      registration.getNotifications({ tag: options.tag }).then(notifications => {
        notifications.forEach(notification => notification.close());
        registration.showNotification(title, options);
      });
    } else {
      registration.showNotification(title, options);
    }
  });
};
