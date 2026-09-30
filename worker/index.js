const CONSULTANT_ROUTES = {
  home: "/consultant/dashboard.html",
  clients: "/consultant/clients.html",
  "client-profile": "/consultant/client-profile.html",
  appointments: "/consultant/appointments.html",
  "follow-ups": "/consultant/follow-ups.html",
  notes: "/consultant/notes.html",
  reports: "/consultant/reports.html"
};

function getConsultantRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  const organizationId = parts[0];
  const page = parts[1];

  if (!organizationId || !CONSULTANT_ROUTES[page]) {
    return null;
  }

  return CONSULTANT_ROUTES[page];
}

function getAssetRequest(request, path) {
  const url = new URL(request.url);

  url.pathname = path;

  return new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * /login
     * /login/
     */
    if (url.pathname === "/login" || url.pathname === "/login/") {
      return env.ASSETS.fetch(
        getAssetRequest(request, "/login.html")
      );
    }

    /*
     * Consultant clean routes
     */
    const consultantTarget = getConsultantRoute(url.pathname);

    if (consultantTarget) {
      return env.ASSETS.fetch(
        getAssetRequest(request, consultantTarget)
      );
    }

    /*
     * Existing static files
     *
     * /index.html
     * /login.html
     * /assets/*
     * /consultant/*
     * /manager/*
     * /super-admin/*
     */
    return env.ASSETS.fetch(request);
  }
};
