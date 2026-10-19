import { Component, type ErrorInfo, type ReactNode } from 'react';

type ModuleErrorBoundaryProps = {
  children: ReactNode;
  moduleName: string;
  onReturnDashboard: () => void;
};

type ModuleErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Isolates rendering failures to the current page module so shared navigation
 * and the rest of the SHRAMIK shell remain usable.
 */
export default class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModuleErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep diagnostics available to developers without exposing implementation
    // details or stack traces in the user-facing recovery UI.
    console.error(
      `[SHRAMIK] The "${this.props.moduleName}" module failed to render.`,
      error,
      info.componentStack,
    );
  }

  private retry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <section
        className="module-route-placeholder module-error-boundary"
        role="alert"
        aria-labelledby="module-error-title"
      >
        <div className="module-route-eyebrow">SHRAMIK / MODULE RECOVERY</div>
        <h1 id="module-error-title">This page hit a snag.</h1>
        <p>
          This module could not be displayed. You can try loading it again or
          return to the dashboard. Your shared navigation is still available.
        </p>
        <div className="module-error-actions">
          <button className="button-primary" type="button" onClick={this.retry}>
            Try again
          </button>
          <button
            className="button-outline"
            type="button"
            onClick={this.props.onReturnDashboard}
          >
            Return to Dashboard
          </button>
        </div>
      </section>
    );
  }
}
