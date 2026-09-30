const CONSULTANT_ROUTES = {
  home: "/consultant/dashboard.html",
  clients: "/consultant/clients.html",
  "client-profile": "/consultant/client-profile.html",
  appointments: "/consultant/appointments.html",
  "follow-ups": "/consultant/follow-ups.html",
  notes: "/consultant/notes.html",
  reports: "/consultant/reports.html"
};

function getCleanRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  const organizationId = parts[0];
  const page = parts[1];

  if (!organizationId || !CONSULTANT_ROUTES[page]) {
    return null;
  }

  return {
    organizationId,
    page,
    target: CONSULTANT_ROUTES[page]
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * Clean consultant routes
     *
     * /{organizationId}/home
     * /{organizationId}/clients
     * /{organizationId}/client-profile
     * /{organizationId}/appointments
     * /{organizationId}/follow-ups
     * /{organizationId}/notes
     * /{organizationId}/reports
     */
    const route = getCleanRoute(url.pathname);

    if (route) {
      const targetUrl = new URL(route.target, url.origin);

      targetUrl.search = url.search;

      const targetRequest = new Request(
        targetUrl.toString(),
        request
      );

      return env.ASSETS.fetch(targetRequest);
    }

    /*
     * Clean login route
     */
    if (url.pathname === "/login" || url.pathname === "/login/") {
      const targetUrl = new URL("/login.html", url.origin);
      targetUrl.search = url.search;

      const targetRequest = new Request(
        targetUrl.toString(),
        request
      );

      return env.ASSETS.fetch(targetRequest);
    }

    /*
     * Everything else goes directly to Static Assets.
     */
    return env.ASSETS.fetch(request);
  }
};
