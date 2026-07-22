import * as Notifications from 'expo-notifications';

export const REMINDER_IDENTIFIER = 'daily-study-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getStudyReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.find((notification) => notification.identifier === REMINDER_IDENTIFIER);
}

export async function requestStudyReminderPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleStudyReminder(hour, minute) {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'Keep your streak alive',
      body: 'Take a few minutes to review your notes today.',
    },
    trigger: { type: 'daily', hour, minute },
  });
}

export async function cancelStudyReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
}
