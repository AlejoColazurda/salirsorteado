// Browser notifications for draw results (Notification API).
// Permission is requested from a user gesture; firing is a no-op where unsupported/denied.

export const requestNotificationPermission = () => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    try {
      void Notification.requestPermission();
    } catch {
      // Older Safari uses a callback signature; ignore failures.
    }
  }
};

export const notifyDraw = (winnerName: string, role?: string) => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification('¡Salió sorteado! 🎉', {
      body: role ? `${winnerName} — ${role}` : winnerName,
      tag: 'salirsorteado-winner',
    });
  } catch {
    // Notification construction can throw on some platforms; ignore.
  }
};
