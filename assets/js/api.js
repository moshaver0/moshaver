(function (window) {
  "use strict";

  const config = window.MOSHAVER_CONFIG;

  if (!config) {
    console.error("MOSHAVER_CONFIG is not loaded.");
    return;
  }

  const API = {
    async request(payload = {}) {
      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        Number(config.REQUEST_TIMEOUT) || 30000
      );

      try {
        const token =
          window.MOSHAVER_AUTH &&
          typeof window.MOSHAVER_AUTH.getToken === "function"
            ? window.MOSHAVER_AUTH.getToken()
            : null;

        const requestPayload = {
          ...payload
        };

        if (
          token &&
          !requestPayload.accessToken &&
          !requestPayload.token
        ) {
          requestPayload.accessToken = token;
        }

        const formData = new URLSearchParams();

        Object.keys(requestPayload).forEach((key) => {
          const value = requestPayload[key];

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
    },

    async me() {
      return this.request({
        action: "me"
      });
    },

    async dashboard() {
      return this.request({
        action: "dashboard"
      });
    }
  };

  window.MOSHAVER_API = API;

})(window);
