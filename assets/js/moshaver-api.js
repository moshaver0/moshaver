(function (window) {
  "use strict";

  const config = window.MOSHAVER_CONFIG;
  const auth = window.MOSHAVER_AUTH;
  if (!config || !auth || typeof auth.request !== "function") {
    console.error("MOSHAVER API: config/auth must load before this adapter.");
    return;
  }

  function unwrap(response) {
    if (!response || response.success !== true) {
      const error = response && response.error;
      throw new Error(String((error && (error.code || error.message)) || "API_REQUEST_FAILED"));
    }
    return response.data === undefined ? response : response.data;
  }

  async function call(action, fields) {
    const token = auth.getToken();
    if (!token) throw new Error("AUTH_REQUIRED");
    return unwrap(await auth.request(Object.assign({ action: action, accessToken: token }, fields || {})));
  }

  function inputFields(record) {
    return { input: JSON.stringify(record || {}) };
  }

  const api = {
    request: call,
    me: () => call("me"),
    dashboard: () => call("dashboard"),
    clients: {
      list: (filters) => call("clientsList", filters || {}),
      create: (record) => call("clientsCreate", inputFields(record)),
      update: (record) => call("clientsUpdate", inputFields(record))
    },
    appointments: {
      list: (filters) => call("appointmentsList", filters || {}),
      create: (record) => call("appointmentsCreate", inputFields(record)),
      update: (record) => call("appointmentsUpdate", inputFields(record)),
      remove: (id) => call("appointmentsDelete", inputFields({ appointmentId: id }))
    },
    followUps: {
      list: (filters) => call("followUpsList", filters || {}),
      create: (record) => call("followUpsCreate", inputFields(record)),
      update: (record) => call("followUpsUpdate", inputFields(record)),
      remove: (id) => call("followUpsDelete", inputFields({ followUpId: id }))
    },
    notes: {
      list: (filters) => call("notesList", filters || {}),
      create: (record) => call("notesCreate", inputFields(record)),
      update: (record) => call("notesUpdate", inputFields(record)),
      remove: (id) => call("notesDelete", inputFields({ noteId: id }))
    }
  };

  window.MOSHAVER_API = api;
})(window);
