/** Returns the current auth token from localStorage for use in media URLs */
export function useMediaUrl() {
  const token = localStorage.getItem('olu_token') || '';
  return (path: string) => `${path}?token=${encodeURIComponent(token)}`;
}

/** Build a media URL with token inline (for use outside components) */
export function mediaUrl(path: string): string {
  const token = localStorage.getItem('olu_token') || '';
  return `${path}?token=${encodeURIComponent(token)}`;
}
