import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name.includes('ChunkLoadError') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, isChunkError: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
            {this.state.isChunkError
              ? 'Failed to load page resources'
              : 'Something went wrong'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted, #666)' }}>
            {this.state.isChunkError
              ? 'A network issue prevented the page from loading.'
              : 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'var(--accent, #2563eb)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {this.state.isChunkError ? 'Reload Page' : 'Try Again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
