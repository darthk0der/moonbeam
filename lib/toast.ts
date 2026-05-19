export function showToast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('moonbeam-toast', { detail: message }));
  }
}
