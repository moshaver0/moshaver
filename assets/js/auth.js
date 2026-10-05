(function (window) {
  "use strict";

  const config = window.MOSHAVER_CONFIG;

  if (!config) {
    console.error("MOSHAVER_CONFIG is not loaded.");
    return;
  }

  const Auth = {
    async login(username, password) {
      const normalizedUsername = String(username || "").trim();
      const normalizedPassword = String(password || "");

      if (!normalizedUsername) {
        throw new Error("USERNAME_REQUIRED");
      }

      if (!normalizedPassword) {
        throw new Error("PASSWORD_REQUIRED");
      }

      const response = await this.request({
        action: "login",
        username: normalizedUsername,
        password: normalizedPassword
      });

      if (!response || response.success !== true) {
        throw new Error(
          response && response.message
            ? response.message
            : "LOGIN_FAILED"
        );
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
          action: "currentUser",
          accessToken: token
        });

        if (!response || response.success !== true) {
          this.clearSession();
          return null;
        }

        if (response.user) {
          this.saveUser(response.user);
        }

        return response.user || null;
      } catch (error) {
        console.warn("Current user request failed:", error);
        return null;
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
      return user ? String(user.role || "").toUpperCase() : null;
    },

    hasRole(role) {
      const currentRole = this.getRole();

      if (!currentRole || !role) {
        return false;
      }

      return currentRole === String(role).toUpperCase();
    },

  saveSession(response) {
  const data = response && response.data
    ? response.data
    : response;

  if (data && data.accessToken) {
    localStorage.setItem(
      config.TOKEN_KEY,
      String(data.accessToken)
    );
  }

  if (data && data.user) {
    this.saveUser(data.user);
  }

  const session = {
    loggedIn: true,
    expiresIn: data && data.expiresIn
      ? data.expiresIn
      : null,
    savedAt: Date.now()
  };

  localStorage.setItem(
    config.SESSION_KEY,
    JSON.stringify(session)
  );
},

    saveUser(user) {
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

    const data = await response.json();

    return data;

  } finally {
    clearTimeout(timeout);
  }
}

  window.MOSHAVER_AUTH = Auth;

})(window);
