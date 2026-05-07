import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  reloadKey: string;
};

type State = {
  failed: boolean;
  message: string | null;
};

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /import|chunk|module|fetch/i.test(message);
};

export class RouteLoadBoundary extends Component<Props, State> {
  override state: State = { failed: false, message: null };

  override componentDidCatch(error: unknown, _info: ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Route load failed", error);

    if (isChunkLoadError(error) && sessionStorage.getItem(this.props.reloadKey) !== "1") {
      sessionStorage.setItem(this.props.reloadKey, "1");
      window.setTimeout(() => window.location.reload(), 80);
      return;
    }

    this.setState({ failed: true, message });
  }

  override render() {
    if (this.state.failed) {
      return (
        <div>
          {this.props.fallback}
          {this.state.message ? (
            <p className="mx-auto -mt-24 max-w-3xl px-4 text-center text-xs text-rose-200">
              Runtime: {this.state.message}
            </p>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
