import { Alert } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function confirmAction(options: ConfirmOptions) {
  Alert.alert(
    options.title,
    options.message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: options.confirmLabel ?? 'Confirm', style: 'destructive', onPress: options.onConfirm },
    ],
  );
}

export function confirmDelete(options: Omit<ConfirmOptions, 'confirmLabel'> & { confirmLabel?: string }) {
  confirmAction({ confirmLabel: 'Delete', ...options });
}

export function confirmDeactivate(memberName: string, onConfirm: () => void) {
  Alert.alert(
    `Deactivate ${memberName}?`,
    'This member will lose access to the app immediately. You can reactivate them at any time.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export function confirmReactivate(memberName: string, onConfirm: () => void) {
  Alert.alert(
    `Reactivate ${memberName}?`,
    'This member will regain access to the app.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reactivate', onPress: onConfirm },
    ],
  );
}
