(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function showToast(msg){
    const toast = $("#toast");
    if(!toast) return;
    const text = $("#toastText", toast);
    if(text) text.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      showToast(`Copied: ${text}`);
    }catch(e){
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(`Copied: ${text}`);
    }
  }

  function setupReveal(){
    const reveal = new IntersectionObserver((entries) => {
      for(const e of entries){
        if(e.isIntersecting){
          e.target.classList.add("on");
          reveal.unobserve(e.target);
        }
      }
    }, {threshold: 0.14});

    $$(".reveal").forEach(el => reveal.observe(el));
  }

  function setupMobileDrawer(){
    const hamburger = $("#hamburger");
    const drawer = $("#mobileDrawer");
    if(!hamburger || !drawer) return;
    hamburger.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(open));
    });
  }

  window.App = {
    $,
    $$,
    showToast,
    copyText,
    setupReveal,
    setupMobileDrawer
  };
})();
