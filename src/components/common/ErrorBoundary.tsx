import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Klink] Unhandled render error:', error.message);
    console.error('[Klink] Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <LinearGradient colors={Gradients.darkWorship} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>⚠</Text>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred. Please try again or restart the app.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <LinearGradient
              colors={Gradients.glory}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244,164,41,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 36, color: Colors.gold },
  title: {
    color: Colors.white,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: FontSize.body * 1.6,
  },
  button: { width: '100%', marginTop: Spacing.md },
  buttonGradient: {
    height: 54,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.purple,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
  },
});
