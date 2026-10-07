// Abstraction over local notifications. Falls back to no-op where unavailable.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface INotificationScheduler {
  requestPermissions(): Promise<boolean>;
  schedule(input: { title: string; body?: string; dateMs: number; data?: Record<string, any> }): Promise<string | null>;
  cancel(id: string): Promise<void>;
}

class ExpoNotificationScheduler implements INotificationScheduler {
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === "web") return false;
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;
      const req = await Notifications.requestPermissionsAsync();
      return !!req.granted;
    } catch {
      return false;
    }
  }
  async schedule({
    title,
    body,
    dateMs,
    data,
  }: {
    title: string;
    body?: string;
    dateMs: number;
    data?: Record<string, any>;
  }): Promise<string | null> {
    try {
      if (Platform.OS === "web") return null;
      const date = new Date(dateMs);
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body: body ?? "", data: data ?? {} },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } as any,
      });
      return id;
    } catch {
      return null;
    }
  }
  async cancel(id: string): Promise<void> {
    try {
      if (Platform.OS === "web") return;
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* ignore */
    }
  }
}

export const notificationScheduler: INotificationScheduler = new ExpoNotificationScheduler();
