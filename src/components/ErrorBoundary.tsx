import React from 'react';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="page-container">
          <div className="card card-body text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">אירעה שגיאה</h2>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message ?? 'שגיאה לא ידועה'}
            </p>
            <button
              className="btn btn-primary btn-md mx-auto"
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            >
              חזרה לדשבורד
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
