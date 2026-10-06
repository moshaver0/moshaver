(function (window) {
"use strict";

const config = window.MOSHAVER_CONFIG;

if (!config) {
console.error("MOSHAVER_CONFIG is not loaded.");
return;
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

  console.log("MOSHAVER LOGIN RESPONSE:", response);

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

    console.log("MOSHAVER ME RESPONSE:", response);

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
  const raw = localStorage.getItem(config.USER_KEY);

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
  return localStorage.getItem(config.TOKEN_KEY);
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

  const session = {
    loggedIn: true,
    expiresIn: data?.expiresIn || null,
    savedAt: Date.now()
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

window.MOSHAVER_AUTH = Auth;

})(window);
