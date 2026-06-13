// Minimal ambient typing for the webview-only API injected by VS Code.
// (We don't import @types/vscode here — the webview has no Node/host access.)
interface VsCodeApi {
  postMessage(message: unknown): void;
  getState<T = unknown>(): T | undefined;
  setState<T = unknown>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;
