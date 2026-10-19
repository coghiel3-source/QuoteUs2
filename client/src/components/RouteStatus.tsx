import { Component, type ReactNode } from "react";

export function RouteLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="max-w-md text-center space-y-4">
        <p role="status" aria-live="polite" className="text-xl font-semibold text-primary">
          Loading your page…
        </p>
        <p className="text-sm text-muted-foreground">
          Your dashboard may take a moment to open. If this message stays here, reload the page.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-5 py-3 text-white"
        >
          Reload page
        </button>
      </div>
    </main>
  );
}

export class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
          <div role="alert" className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-semibold text-primary">This page couldn’t load</h1>
            <p className="text-sm text-muted-foreground">
              Please reload to fetch the latest version. If the problem continues, return to sign-in or contact QuoteUs support.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-5 py-3 text-white"
            >
              Reload page
            </button>
            <p><a href="/login" className="text-primary underline">Return to sign-in</a></p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
