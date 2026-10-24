(function (window) {
  "use strict";

  /*
   * Moshaver central data adapter.
   * This file is intentionally not wired into any page yet: the Apps Script
   * routes must be installed and tested before existing screens are switched.
   * Organization scope must be derived and authorized by the backend from the
   * access token; never trust an organizationId supplied by the browser.
   */

  const API = window.MOSHAVER_API;

  function requireApi() {
    if (!API || typeof API.request !== "function") {
      throw new Error("MOSHAVER_API_NOT_READY");
    }
  }

  async function request(action, fields) {
    requireApi();
    const response = await API.request(Object.assign({ action: action }, fields || {}));

    if (!response || response.success !== true) {
      const error = response && response.error;
      throw new Error(String((error && (error.code || error.message)) || "API_REQUEST_FAILED"));
    }

    return response.data || response;
  }

  function normalizeEntity(entity) {
    const value = String(entity || "").trim().toLowerCase();
    const allowed = new Set([
      "clients",
      "appointments",
      "followups",
      "notes",
      "finance",
      "activity"
    ]);

    if (!allowed.has(value)) {
      throw new Error("UNSUPPORTED_DATA_ENTITY");
    }

    return value;
  }

  const DataService = {
    async list(entity, filters) {
      return request("records.list", {
        entity: normalizeEntity(entity),
        filters: JSON.stringify(filters || {})
      });
    },

    async save(entity, record) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("RECORD_MUST_BE_AN_OBJECT");
      }

      return request("records.save", {
        entity: normalizeEntity(entity),
        record: JSON.stringify(record)
      });
    },

    async remove(entity, recordId) {
      const id = String(recordId || "").trim();
      if (!id) throw new Error("RECORD_ID_REQUIRED");

      return request("records.delete", {
        entity: normalizeEntity(entity),
        recordId: id
      });
    },

    async uploadFile(file, metadata) {
      if (!(file instanceof Blob)) throw new Error("FILE_REQUIRED");
      if (!file.name) throw new Error("FILE_NAME_REQUIRED");

      const base64 = await new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () { reject(new Error("FILE_READ_FAILED")); };
        reader.onload = function () {
          const result = String(reader.result || "");
          const comma = result.indexOf(",");
          if (comma < 0) return reject(new Error("FILE_ENCODING_FAILED"));
          resolve(result.slice(comma + 1));
        };
        reader.readAsDataURL(file);
      });

      const details = metadata || {};
      return request("drive.upload", {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileDataBase64: base64,
        clientId: String(details.clientId || ""),
        category: String(details.category || "general")
      });
    }
  };

  window.MOSHAVER_DATA = DataService;
})(window);
