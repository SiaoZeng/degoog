const REQUEST_KEY = "degoog_request_install";

let deferredPrompt = null;

function hasRequestedInstall() {
  try {
    return !!localStorage.getItem(REQUEST_KEY);
  } catch {
    return false;
  }
}

function clearRequestedInstall() {
  try {
    localStorage.removeItem(REQUEST_KEY);
  } catch {}
}

export function initInstallPrompt() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (hasRequestedInstall()) {
      clearRequestedInstall();
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
      });
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    clearRequestedInstall();
  });
}

export function requestInstallPrompt() {
  try {
    localStorage.setItem(REQUEST_KEY, "1");
  } catch {}
  window.location.href = "/";
}
