import { useEffect, useState } from 'react';
import { networkService, type NetworkSnapshot } from '@/services/NetworkService';

export function useNetworkStatus(): NetworkSnapshot {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(() => networkService.getSnapshot());

  useEffect(() => networkService.subscribe(setSnapshot), []);

  return snapshot;
}
