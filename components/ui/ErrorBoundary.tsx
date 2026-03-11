import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.headline}>Something went wrong.</Text>
          <Text style={styles.body}>The monks that build the app have been notified.</Text>
          <Text style={styles.body}>Try quitting the app and re-opening.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F4F4',
    paddingHorizontal: 40,
    gap: 12,
  },
  headline: {
    fontFamily: 'Satoshi Variable',
    fontSize: 22,
    fontWeight: '700',
    color: '#273047',
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Satoshi Variable',
    fontSize: 16,
    fontWeight: '400',
    color: '#505970',
    textAlign: 'center',
    lineHeight: 24,
  },
});
