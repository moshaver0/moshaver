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
      throw new Error(String((error && (error.message || error.code)) || "API_REQUEST_FAILED"));
    }
    return response.data === undefined ? response : response.data;
  }
  function call(action, fields) {
    const token = auth.getToken();
    if (!token) return Promise.reject(new Error("AUTH_REQUIRED"));
    return auth.request(Object.assign({action, accessToken: token}, fields || {})).then(unwrap);
  }
  function input(record) { return {input: JSON.stringify(record || {})}; }
  function items(result) { return Array.isArray(result) ? result : (result && Array.isArray(result.items) ? result.items : []); }
  function clientFromApi(c) {
    return Object.assign({}, c, {
      id: c.clientId || c.id,
      mobile: c.phone || c.mobile || "",
      caseCode: c.clientId || c.caseCode || "",
      status: String(c.status || "ACTIVE").toLowerCase(),
      mode: c.mode || "حضوری",
      payment: c.payment || "cash",
      contacts: Array.isArray(c.contacts) ? c.contacts : [],
      allergy: Boolean(c.allergy), disease: Boolean(c.disease), lab: Boolean(c.lab)
    });
  }
  function clientToApi(c) {
    return {
      clientId: c.clientId || c.id,
      firstName: c.firstName || "", lastName: c.lastName || "",
      phone: c.phone || c.mobile || "", alternatePhone: c.alternatePhone || "",
      email: c.email || "", nationalId: c.nationalId || "",
      gender: c.gender || "UNSPECIFIED", birthDate: c.birthDate || "",
      occupation: c.occupation || "", address: c.address || "", city: c.city || "",
      source: c.source || "WEB", status: String(c.status || "ACTIVE").toUpperCase(),
      priority: c.priority || "NORMAL", tags: c.tags || [], notes: c.notes || c.description || ""
    };
  }
  const api = {
    request: call,
    me: () => call("me"),
    dashboard: () => call("dashboard"),
    clients: {
      list: async filters => items(await call("clientsList", filters || {})).map(clientFromApi),
      create: async record => clientFromApi(await call("clientsCreate", input(clientToApi(record)))),
      update: async record => clientFromApi(await call("clientsUpdate", input(clientToApi(record)))),
      remove: id => call("clientsUpdate", input({clientId:id, status:"ARCHIVED"}))
    },
    appointments: {
      list: filters => call("appointmentsList", filters || {}).then(items),
      create: record => call("appointmentsCreate", input(record)),
      update: record => call("appointmentsUpdate", input(record)),
      remove: id => call("appointmentsDelete", input({id}))
    },
    followUps: {
      list: filters => call("followUpsList", filters || {}).then(items),
      create: record => call("followUpsCreate", input(record)),
      update: record => call("followUpsUpdate", input(record)),
      remove: id => call("followUpsDelete", input({id}))
    },
    notes: {
      list: filters => call("notesList", filters || {}).then(items),
      create: record => call("notesCreate", input(record)),
      update: record => call("notesUpdate", input(record)),
      remove: id => call("notesDelete", input({noteId:id}))
    }
  };
  window.MOSHAVER_API = api;
})(window);
