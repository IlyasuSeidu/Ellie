import NetInfo from '@react-native-community/netinfo';
import { NetworkService } from '../NetworkService';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(() => {
    (NetInfo as unknown as { __reset: () => void }).__reset();
    service = new NetworkService();
  });

  afterEach(() => {
    service.stop();
  });

  it('reports slow connection quality on 3g cellular', async () => {
    (NetInfo as unknown as { __setState: (state: Record<string, unknown>) => void }).__setState({
      type: 'cellular',
      isConnected: true,
      isInternetReachable: true,
      details: {
        cellularGeneration: '3g',
      },
    });

    await service.refresh();

    expect(service.getConnectionQuality()).toBe('slow');
  });

  it('reports offline connection quality when disconnected', async () => {
    (NetInfo as unknown as { __setState: (state: Record<string, unknown>) => void }).__setState({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    });

    await service.refresh();

    expect(service.getConnectionQuality()).toBe('offline');
  });
});
