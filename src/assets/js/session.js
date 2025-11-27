// session.js - Handles logout for all pages
function logout() {
  fetch("/src/components/reg/logout.php", {
    method: "GET",
    credentials: "same-origin",
  }).finally(() => {
    setCookie("user_data", "", -1);
    setCookie("auth_token", "", -1);
    window.location.href = "/src/components/reg/index.html";
  });
}

async function ensureSession() {
  try {
    const res = await fetch("/src/components/reg/session_check.php", {
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!data.success) {
      const path = window.location.pathname;
      const isLogin =
        path.endsWith("/src/components/reg/index.html") ||
        path.endsWith("/src/components/reg/reg.html") ||
        path.endsWith("/index.html");
      if (!isLogin) window.location.href = "/src/components/reg/index.html";
      return false;
    }
    try {
      setCookie("user_data", JSON.stringify(data.user), 1);
    } catch (e) {}
    const path = window.location.pathname;
    const isAuthPage =
      path.endsWith("/src/components/reg/index.html") ||
      path.endsWith("/src/components/reg/reg.html");
    if (isAuthPage) {
      window.location.href = "/index.html";
      return true;
    }
    return true;
  } catch (e) {
    window.location.href = "/src/components/reg/index.html";
    return false;
  }
}

window.ensureSession = ensureSession;
