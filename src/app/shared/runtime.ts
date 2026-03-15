import { Capacitor } from '@capacitor/core';

export const IS_NATIVE = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform
  ? Capacitor.isNativePlatform()
  : false;

export const resolveApiUrl = (webUrl: string, nativeUrl: string): string => {
  return IS_NATIVE ? nativeUrl : webUrl;
};
