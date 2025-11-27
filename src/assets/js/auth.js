// auth.js - Handles registration and login via AJAX to PHP endpoints

document.addEventListener("DOMContentLoaded", function () {
  const regForm = document.getElementById("register-form");
  if (regForm) {
    regForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(regForm);
      try {
        const response = await fetch("/src/components/reg/reg.php", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        const result = await response.json();
        if (result.success) {
          try {
            const user = result.user || null;
            if (user) setCookie("user_data", JSON.stringify(user), 1);
            if (result.token) setCookie("auth_token", result.token, 1);
          } catch (e) {}
          window.location.href = "/index.html";
        } else {
          alert(result.message || "Registration failed.");
        }
      } catch (err) {
        alert("Registration error.");
      }
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      try {
        const response = await fetch("/src/components/reg/log.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "same-origin",
        });
        const result = await response.json();
        if (result.success) {
          try {
            const user = result.user || null;
            if (user) {
              setCookie("user_data", JSON.stringify(user), 1);
            }
            if (result.token) {
              setCookie("auth_token", result.token, 1);
            }
          } catch (e) {}
          window.location.href = "/index.html";
        } else {
          alert(result.message || "Login failed.");
        }
      } catch (err) {
        alert("Login error.");
      }
    });
  }
});
