(() => {
  const { $, $$, showToast, copyText, setupReveal, setupMobileDrawer } = window.App;

  const CONFIG = {
    serverIp: "play.example.com",
    serverVersion: "1.21.x",
    discord: "discord.gg/yourcode"
  };

  function smoothScrollTo(id){
    const el = document.getElementById(id);
    if(!el) return;
    el.scrollIntoView({behavior:"smooth", block:"start"});
  }

  $("#serverIp").textContent = CONFIG.serverIp;
  $$(".serverVersion").forEach((el) => {
    el.textContent = CONFIG.serverVersion;
  });
  $("#year").textContent = new Date().getFullYear();

  function bindScrollLinks(){
    $$('[data-scroll]').forEach(a => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href") || "";
        if(href.startsWith("#")){
          e.preventDefault();
          const id = href.slice(1) || "top";
          smoothScrollTo(id);

          const drawer = $("#mobileDrawer");
          if(drawer && drawer.classList.contains("open")){
            drawer.classList.remove("open");
            $("#hamburger").setAttribute("aria-expanded", "false");
          }
        }
      });
    });
  }
  bindScrollLinks();

  $("#btnJoin").addEventListener("click", () => smoothScrollTo("join"));
  $("#ctaJoin").addEventListener("click", () => smoothScrollTo("join"));
  $("#btnReadMore").addEventListener("click", () => smoothScrollTo("how"));

  const ledgerNav = () => window.location.assign("/ledger/");
  $("#btnLedger").addEventListener("click", ledgerNav);
  $("#btnLedger2").addEventListener("click", ledgerNav);
  $("#ctaLedger").addEventListener("click", ledgerNav);

  const wikiSoon = () => showToast("Wiki page coming soon — we’ll draft it next.");
  $("#btnWiki").addEventListener("click", wikiSoon);

  const copyIp = () => copyText(CONFIG.serverIp);
  $("#btnCopyIp").addEventListener("click", copyIp);
  $("#btnCopyIp2").addEventListener("click", copyIp);
  $("#ctaCopyIp").addEventListener("click", copyIp);

  const sections = ["top","how","power","ledger","join","rules","commands","wiki","about","terms"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const navLinks = $$(".nav-links a[data-scroll]");
  function setActive(id){
    navLinks.forEach(a => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", href === "#" + id);
    });
  }

  const spy = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if(visible){
      setActive(visible.target.id || "top");
    }
  }, { rootMargin: `-${Math.floor(parseInt(getComputedStyle(document.documentElement).getPropertyValue("--navH")))}px 0px -70% 0px`, threshold: [0.12, 0.2, 0.35] });

  sections.forEach(s => spy.observe(s));

  setupMobileDrawer();
  setupReveal();
})();
