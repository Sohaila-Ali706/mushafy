import { environment } from '../../environments/environment';

export const OFFLINE_MODE = !!environment.offline;
export const OFFLINE_BASE = '/offline';
export const AUDIO_BASE = '/audio';

export const buildUrl = (offlinePath: string, onlineUrl: string): string => {
  return OFFLINE_MODE ? `${OFFLINE_BASE}/${offlinePath}` : onlineUrl;
};

export const padSurah = (value: number): string => value.toString().padStart(3, '0');
