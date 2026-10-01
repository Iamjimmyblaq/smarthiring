/**
 * Talenval embeddable jobs widget.
 *
 *   <div id="talenval-careers"></div>
 *   <script src="https://talenval.com/talenval-jobs.js" data-company="your-company" defer></script>
 *
 * Optional attributes:
 *   data-target="#my-container"   where to mount (defaults to #talenval-careers)
 *   data-height="900"             initial iframe height in px
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute("data-company");
  if (!slug) {
    console.warn("[Talenval] Add data-company=\"your-page-address\" to the script tag.");
    return;
  }

  var origin = new URL(script.src, window.location.href).origin;
  var selector = script.getAttribute("data-target") || "#talenval-careers";
  var height = parseInt(script.getAttribute("data-height") || "900", 10);

  function mount() {
    var host = document.querySelector(selector);
    if (!host) {
      console.warn("[Talenval] No element matches " + selector);
      return;
    }
    var frame = document.createElement("iframe");
    frame.src = origin + "/careers/" + encodeURIComponent(slug) + "?embed=1";
    frame.title = "Open roles";
    frame.loading = "lazy";
    frame.style.width = "100%";
    frame.style.border = "0";
    frame.style.minHeight = height + "px";
    frame.setAttribute("allow", "clipboard-write");
    host.innerHTML = "";
    host.appendChild(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
