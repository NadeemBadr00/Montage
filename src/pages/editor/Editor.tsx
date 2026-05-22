/**
 * Editor page — renders the full editor HTML in a full-screen iframe.
 * The editor HTML (public/editor.html) handles its own JS, auth, and
 * IndexedDB reading — no React needed inside it.
 */
export default function Editor() {
  return (
    <iframe
      src="/editor.html"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        zIndex: 9999,
      }}
      title="Project 43 Editor"
      allow="camera; microphone; clipboard-read; clipboard-write"
    />
  );
}
