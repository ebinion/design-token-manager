// The webview GUI entry point. Vanilla TS + CSS, themed entirely with
// var(--vscode-*) (FR-2.6 / AC-10). `acquireVsCodeApi()` is called exactly
// ONCE here (per VS Code guidance).
const vscode = acquireVsCodeApi();

interface DocumentMessage {
  type: 'document';
  coreVersion: string;
  uri: string;
  text: string;
}

type IncomingMessage = DocumentMessage | { type: string };

function render(msg: DocumentMessage): void {
  const root = document.getElementById('root');
  if (!root) return;

  const fileName = msg.uri.split('/').pop() ?? msg.uri;

  root.replaceChildren();

  const header = document.createElement('header');
  header.className = 'dtm-header';
  header.textContent = fileName;

  const note = document.createElement('p');
  note.className = 'dtm-note';
  note.textContent = `Webview wired up · @dtm/core ${msg.coreVersion}. Per-type editors land in Phase 1 feature work.`;

  // STUB read-only view of the raw document, proving the doc->webview channel.
  const pre = document.createElement('pre');
  pre.className = 'dtm-raw';
  pre.textContent = msg.text;

  root.append(header, note, pre);
}

window.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;
  if (msg.type === 'document') {
    render(msg as DocumentMessage);
  }
});

// Tell the host we're ready to receive the document (FR-2.4 handshake).
vscode.postMessage({ type: 'ready' });
