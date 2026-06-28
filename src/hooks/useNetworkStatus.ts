import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '../store/networkStore';

export function useNetworkStatus() {
  const { setOffline } = useNetworkStore();

  useEffect(() => {
    NetInfo.fetch()
      .then((state) => {
        setOffline(!state.isConnected || state.isInternetReachable === false);
      })
      .catch(() => {});

    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected || state.isInternetReachable === false);
    });

    return () => unsubscribe();
  }, [setOffline]);
}
