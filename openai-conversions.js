(function () {
  var leadKeys = {};

  function measure(eventName, data, options) {
    if (typeof window.oaiq !== "function") return;
    window.oaiq("measure", eventName, data, options);
  }

  function eventId(prefix) {
    var random =
      window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
    return prefix + "_" + random;
  }

  function pageContent() {
    var path = window.location.pathname || "/";
    return {
      type: "contents",
      contents: [
        {
          id: path,
          name: document.title || path,
          content_type: "page",
        },
      ],
    };
  }

  function trackPageView() {
    measure("page_viewed", pageContent(), { event_id: eventId("page_viewed") });
  }

  function trackLead(prefix) {
    var key = prefix + ":" + window.location.pathname;
    if (leadKeys[key]) return;
    leadKeys[key] = true;
    measure(
      "lead_created",
      { type: "customer_action" },
      { event_id: eventId(prefix) }
    );
  }

  function isWhatsAppLink(link) {
    if (!link || !link.href) return false;
    return /(^|\.)wa\.me$|(^|\.)api\.whatsapp\.com$|(^|\.)whatsapp\.com$/i.test(
      link.hostname
    );
  }

  function bindLeadEvents() {
    document.addEventListener(
      "click",
      function (event) {
        var link = event.target.closest && event.target.closest("a[href]");
        if (isWhatsAppLink(link)) trackLead("whatsapp_click");
      },
      true
    );

    document.addEventListener(
      "submit",
      function (event) {
        var form = event.target;
        if (form && form.tagName === "FORM") trackLead("form_submit");
      },
      true
    );
  }

  window.trackOpenAILead = trackLead;

  function boot() {
    trackPageView();
    bindLeadEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
