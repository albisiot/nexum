import { useSyncExternalStore } from 'react';
import type { ClientSnapshot, GameClient } from './GameClient';

export function useGame(client: GameClient): ClientSnapshot {
  return useSyncExternalStore(client.subscribe, client.getSnapshot);
}
