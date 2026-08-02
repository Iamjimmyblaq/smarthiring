/*!
 * SmartHire JS SDK v1 — drop-in client for the SmartHire public API.
 * Usage (browser):
 *   <script src="https://smarthiring.lovable.app/smarthire.js"></script>
 *   <script>
 *     const sh = SmartHire.init({ apiKey: "sh_live_..." }); // server-side key: proxy through your backend
 *     await sh.jobs.create({ external_id: "req-1", external_source: "acme", title: "Engineer" });
 *   </script>
 * Usage (Node / Deno / bundlers):
 *   import SmartHire from "https://smarthiring.lovable.app/smarthire.js";
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SmartHire = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var DEFAULT_BASE = "https://yafghloodzqbcjmupuwb.supabase.co/functions/v1/api/v1";

  function createClient(options) {
    options = options || {};
    var apiKey = options.apiKey;
    var baseUrl = (options.baseUrl || DEFAULT_BASE).replace(/\/$/, "");
    if (!apiKey) throw new Error("SmartHire: apiKey is required");

    function request(method, path, body, query) {
      var url = baseUrl + path;
      if (query) {
        var qs = Object.keys(query)
          .filter(function (k) { return query[k] !== undefined && query[k] !== null; })
          .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(query[k]); })
          .join("&");
        if (qs) url += "?" + qs;
      }
      return fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: body ? JSON.stringify(body) : undefined,
      }).then(function (res) {
        return res.text().then(function (text) {
          var data;
          try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { error: text }; }
          if (!res.ok) {
            var err = new Error((data && data.error) || ("SmartHire request failed with " + res.status));
            err.status = res.status;
            err.body = data;
            throw err;
          }
          return data;
        });
      });
    }

    return {
      request: request,
      jobs: {
        list: function (params) { return request("GET", "/jobs", null, params); },
        get: function (id) { return request("GET", "/jobs/" + id); },
        /** Creates or updates a job. Pass external_id + external_source for safe retries. */
        create: function (job) { return request("POST", "/jobs", job); },
        update: function (id, patch) { return request("PATCH", "/jobs/" + id, patch); },
        remove: function (id) { return request("DELETE", "/jobs/" + id); },
        /** Mirror every job from your careers site into SmartHire in one call. */
        sync: function (jobs) {
          return Promise.all((jobs || []).map(function (j) { return request("POST", "/jobs", j); }));
        },
      },
      candidates: {
        list: function (params) { return request("GET", "/candidates", null, params); },
        get: function (id) { return request("GET", "/candidates/" + id); },
        apply: function (candidate) { return request("POST", "/candidates", candidate); },
        setStage: function (id, stage) { return request("PATCH", "/candidates/" + id, { stage: stage }); },
      },
      interviews: {
        schedule: function (interview) { return request("POST", "/interviews", interview); },
        createAiSession: function (candidateId) {
          return request("POST", "/interviews/ai-sessions", { candidate_id: candidateId });
        },
        getAiSession: function (id) { return request("GET", "/interviews/ai-sessions/" + id); },
      },
      webhooks: {
        list: function () { return request("GET", "/webhooks"); },
        create: function (url, events) { return request("POST", "/webhooks", { url: url, events: events || [] }); },
        remove: function (id) { return request("DELETE", "/webhooks/" + id); },
      },
    };
  }

  return { init: createClient, create: createClient, version: "1.0.0" };
});
