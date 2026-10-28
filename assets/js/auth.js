(function (window) {
"use strict";

const config = window.MOSHAVER_CONFIG;

if (!config) {
console.error("MOSHAVER_CONFIG is not loaded.");
return;
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_CACHE_KEYS = [
  "moshaver:dashboard-view-cache:v1", "moshaver:prefetch:v1",
  "moshaver:clients-cache:v1", "moshaver:appointments-cache:v1",
  "moshaver:followups-cache:v1", "moshaver:notes-cache:v1",
  "moshaver:reports-cache:v1"
];

function isProtectedPage() {
  const path = window.location.pathname;
  return path.indexOf("/consultant/") >= 0 ||
    path.indexOf("/manager/") >= 0 ||
    path.indexOf("/super-admin/") >= 0;
}

function redirectToLogin() {
  const loginUrl = new URL("../login.html", window.location.href);
  loginUrl.searchParams.set("reason", "session-expired");
  window.location.replace(loginUrl.href);
}

function enforceSessionExpiry() {
  if (!isProtectedPage()) return true;

  const token = localStorage.getItem(config.TOKEN_KEY) ||
    sessionStorage.getItem("moshaver-access-token");
  if (!token) {
    redirectToLogin();
    return false;
  }

  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(config.SESSION_KEY) || "null");
  } catch (_) {}

  let startedAt = Number(session && session.savedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    // Migrate an older active session once without unexpectedly logging users out.
    startedAt = Date.now();
    session = Object.assign({}, session || {}, {
      loggedIn: true,
      savedAt: startedAt,
      expiresAt: startedAt + SESSION_TTL_MS
    });
    try { localStorage.setItem(config.SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }

  const expiresAt = Number(session && session.expiresAt) || (startedAt + SESSION_TTL_MS);
  if (Date.now() >= expiresAt || Date.now() - startedAt >= SESSION_TTL_MS) {
    localStorage.removeItem(config.SESSION_KEY);
    localStorage.removeItem(config.USER_KEY);
    localStorage.removeItem(config.TOKEN_KEY);
    sessionStorage.removeItem("moshaver-access-token");
    sessionStorage.removeItem("moshaver-user");
    SESSION_CACHE_KEYS.forEach(function(key) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    redirectToLogin();
    return false;
  }
  return true;
}

const AUTH_ERROR_CODES = new Set([
"UNAUTHORIZED",
"AUTH_REQUIRED",
"INVALID_TOKEN",
"TOKEN_INVALID",
"SESSION_EXPIRED",
"SESSION_INVALID",
"SESSION_NOT_FOUND",
"USER_NOT_FOUND",
"ACCOUNT_DISABLED",
"ACCOUNT_SUSPENDED"
]);

const Auth = {
async login(username, password) {
const normalizedUsername = String(username || "").trim();
const normalizedPassword = String(password || "");


  if (!normalizedUsername) throw new Error("USERNAME_REQUIRED");
  if (!normalizedPassword) throw new Error("PASSWORD_REQUIRED");

  const response = await this.request({
    action: "login",
    username: normalizedUsername,
    password: normalizedPassword
  });


  if (!response || response.success !== true) {
    const code = response?.error?.code || response?.error?.message || "LOGIN_FAILED";
    throw new Error(String(code));
  }

  this.saveSession(response);
  return response;
},

async logout() {
  const token = this.getToken();

  try {
    if (token) {
      await this.request({
        action: "logout",
        accessToken: token
      });
    }
  } catch (error) {
    console.warn("Logout request failed:", error);
  } finally {
    this.clearSession();
  }

  return true;
},

async getCurrentUser() {
  const token = this.getToken();

  if (!token) {
    return null;
  }

  try {
    const response = await this.request({
      action: "me",
      accessToken: token
    });


    if (!response || response.success !== true) {
      const code = String(
        response?.error?.code ||
        response?.error?.message ||
        ""
      ).trim().toUpperCase();

      /*
       * Only clear the local session when the backend explicitly says
       * that the authentication/session is invalid.
       */
      if (AUTH_ERROR_CODES.has(code)) {
        this.clearSession();
        return null;
      }

      /*
       * A non-auth API error must not destroy an otherwise valid session.
       * Fall back to the locally cached user.
       */
      return this.getUser();
    }

    const user = response?.data?.user || null;

    if (!user) {
      console.warn("MOSHAVER ME returned no user.");
      return this.getUser();
    }

    this.saveUser(user);
    return user;

  } catch (error) {
    /*
     * Network, CORS, timeout, cold-start, or temporary API errors must
     * never erase the authenticated session.
     */
    console.warn("Current user request failed:", error);
    return this.getUser();
  }
},

isLoggedIn() {
  return Boolean(this.getToken());
},

getUser() {
  const raw = localStorage.getItem(config.USER_KEY) || sessionStorage.getItem("moshaver-user");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Invalid stored user:", error);
    localStorage.removeItem(config.USER_KEY);
    return null;
  }
},

getToken() {
  return localStorage.getItem(config.TOKEN_KEY) || sessionStorage.getItem("moshaver-access-token");
},

getRole() {
  const user = this.getUser();
  return user ? String(user.role || "").trim().toUpperCase() : null;
},

hasRole(role) {
  const currentRole = this.getRole();

  if (!currentRole || !role) {
    return false;
  }

  return currentRole === String(role).trim().toUpperCase();
},

saveSession(response) {
  const data = response?.data || response;

  if (data?.accessToken) {
    localStorage.setItem(
      config.TOKEN_KEY,
      String(data.accessToken)
    );
  }

  if (data?.user) {
    this.saveUser(data.user);
  }

  const savedAt = Date.now();
  const session = {
    loggedIn: true,
    expiresIn: data?.expiresIn || 28800,
    savedAt,
    expiresAt: savedAt + SESSION_TTL_MS
  };

  localStorage.setItem(
    config.SESSION_KEY,
    JSON.stringify(session)
  );
},

saveUser(user) {
  if (!user) return;

  localStorage.setItem(
    config.USER_KEY,
    JSON.stringify(user)
  );
},

clearSession() {
  localStorage.removeItem(config.SESSION_KEY);
  localStorage.removeItem(config.USER_KEY);
  localStorage.removeItem(config.TOKEN_KEY);
  sessionStorage.removeItem("moshaver-access-token");
  sessionStorage.removeItem("moshaver-user");
},

async request(payload) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    Number(config.REQUEST_TIMEOUT) || 30000
  );

  try {
    const formData = new URLSearchParams();

    Object.keys(payload || {}).forEach((key) => {
      const value = payload[key];

      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(config.API_BASE_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("HTTP_" + response.status);
    }

    return await response.json();

  } finally {
    clearTimeout(timeout);
  }
}


};

function showWelcomeToast() {
  if (sessionStorage.getItem("moshaver-login-success") !== "1") return;
  sessionStorage.removeItem("moshaver-login-success");

  if (!document.getElementById("moshaverWelcomeToastStyle")) {
    const style = document.createElement("style");
    style.id = "moshaverWelcomeToastStyle";
    style.textContent = `
      .moshaver-welcome-toast{position:fixed;z-index:100000;top:18px;left:50%;width:min(390px,calc(100vw - 28px));display:flex;align-items:center;gap:13px;padding:14px 17px;border:1px solid rgba(110,231,183,.28);border-radius:20px;background:rgba(22,14,37,.96);color:#fbf9ff;box-shadow:0 22px 65px rgba(0,0,0,.28),0 0 35px rgba(16,185,129,.10);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);opacity:0;transform:translate(-50%,-22px) scale(.96);transition:opacity .28s ease,transform .36s cubic-bezier(.2,.8,.2,1);pointer-events:none;font-family:Vazirmatn,Tahoma,sans-serif}
      .moshaver-welcome-toast.is-visible{opacity:1;transform:translate(-50%,0) scale(1)}
      .moshaver-welcome-check{flex:0 0 45px;width:45px;height:45px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#34d399,#059669);color:#fff;box-shadow:0 8px 22px rgba(16,185,129,.25)}
      .moshaver-welcome-check svg{width:25px;height:25px}
      .moshaver-welcome-check path{fill:none;stroke:currentColor;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:30;stroke-dashoffset:30;animation:moshaverWelcomeTick .38s .06s ease-out forwards}
      .moshaver-welcome-copy strong{display:block;font-size:12px;font-weight:900;color:#6ee7b7}
      .moshaver-welcome-copy span{display:block;margin-top:3px;font-size:9px;color:#d6cde3}
      html[data-theme="light"] .moshaver-welcome-toast{background:rgba(255,255,255,.97);color:#21162c;box-shadow:0 22px 65px rgba(63,39,89,.18)}
      html[data-theme="light"] .moshaver-welcome-copy span{color:#675873}
      @keyframes moshaverWelcomeTick{to{stroke-dashoffset:0}}
      @media(prefers-reduced-motion:reduce){.moshaver-welcome-toast,.moshaver-welcome-check path{animation:none!important;transition:none!important}.moshaver-welcome-check path{stroke-dashoffset:0}}
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement("div");
  toast.className = "moshaver-welcome-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = '<span class="moshaver-welcome-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7.5"/></svg></span><span class="moshaver-welcome-copy"><strong>ورود موفق بود</strong><span>خوش آمدید؛ پنل شما آماده است.</span></span>';
  document.body.appendChild(toast);
  window.requestAnimationFrame(function() { toast.classList.add("is-visible"); });
  window.setTimeout(function() {
    toast.classList.remove("is-visible");
    window.setTimeout(function() { toast.remove(); }, 400);
  }, 2600);
}

window.MOSHAVER_AUTH = Auth;

// Enforce a fixed 8-hour login lifetime on protected pages, including tabs
// left open in the background or restored after the computer wakes.
if (isProtectedPage()) {
  const validSession = enforceSessionExpiry();
  if (validSession) showWelcomeToast();
  window.setInterval(enforceSessionExpiry, 15000);
  window.addEventListener("focus", enforceSessionExpiry);
  window.addEventListener("pageshow", enforceSessionExpiry);
  document.addEventListener("visibilitychange", function() {
    if (!document.hidden) enforceSessionExpiry();
  });
}

})(window);
