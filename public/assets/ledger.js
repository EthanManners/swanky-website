(() => {
  const { $, $$, showToast, copyText, setupReveal, setupMobileDrawer } = window.App;

  const CONFIG = {
    serverIp: "mc.swanky.wtf",
    mapUrl: "http://mc.swanky.wtf:8634/",
    mapEmbedUrl: "http://mc.swanky.wtf:8634/"
  };

  const state = {
    plots: [],
    selectedPlot: null
  };

  function money(cents){
    if(typeof cents !== "number") return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
  }

  function statusTag(status){
    if(status === "available") return '<span class="tag available">Available</span>';
    return '<span class="tag owned">Owned</span>';
  }

  function statusLabel(status){
    if(status === "available") return ["Available", "Ready for purchase"];
    return ["Owned", "Protected by owner + invites"];
  }

  function openModal(plot){
    state.selectedPlot = plot;
    $("#mTitle").textContent = `Plot ${plot.plot_id}`;
    const [lab, note] = statusLabel(plot.status);
    $("#mStatus").textContent = lab;
    $("#mStatusNote").textContent = note;
    $("#mPrice").textContent = money(plot.price_cents);
    $("#mPlotId").textContent = plot.plot_id;
    $("#mDistrict").textContent = plot.district || "—";
    $("#mOwner").textContent = plot.owner_name || "—";
    $("#mOwnerNote").textContent = plot.owner_name ? "Public ownership record" : "Unowned";

    const buyBtn = $("#mBuy");
    if(plot.status !== "available"){
      buyBtn.disabled = true;
      buyBtn.classList.remove("primary");
      buyBtn.textContent = "Owned";
    }else{
      buyBtn.disabled = false;
      buyBtn.classList.add("primary");
      buyBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6h15l-1.5 9h-12L6 6Z"/><path d="M6 6l-2-3H1"/><path d="M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/><path d="M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
        </svg>
        Purchase
      `;
    }

    $("#minecraftUsername").value = "";
    $("#buyerEmail").value = "";

    $("#modalBack").classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeModal(){
    $("#modalBack").classList.remove("show");
    document.body.style.overflow = "";
  }

  function normalize(s){ return (s || "").toLowerCase().trim(); }

  function scoreRecommended(p){
    let s = 0;
    if(p.status === "available") s += 100;
    if(p.district) s += 10;
    s += Math.max(0, 50 - (p.price_cents || 0) / 100);
    return s;
  }

  function applyFilters(){
    const q = normalize($("#q").value);
    const status = $("#status").value;
    const sort = $("#sort").value;

    let rows = state.plots.slice();

    if(status !== "all"){
      rows = rows.filter(p => p.status === status);
    }

    if(q){
      rows = rows.filter(p => {
        const hay = normalize([
          p.plot_id,
          p.district,
          p.owner_name
        ].join(" "));
        return hay.includes(q);
      });
    }

    if(sort === "price_asc") rows.sort((a,b)=>(a.price_cents||0)-(b.price_cents||0));
    else if(sort === "price_desc") rows.sort((a,b)=>(b.price_cents||0)-(a.price_cents||0));
    else if(sort === "name_asc") rows.sort((a,b)=>a.plot_id.localeCompare(b.plot_id));
    else rows.sort((a,b)=> scoreRecommended(b) - scoreRecommended(a));

    render(rows);
  }

  function render(rows){
    const list = $("#list");
    list.innerHTML = "";

    const total = state.plots.length;
    const avail = state.plots.filter(p => p.status === "available").length;
    const owned = total - avail;

    $("#count").textContent = `${rows.length} of ${total} plots`;
    $("#kAvail").textContent = avail;
    $("#kOwned").textContent = owned;
    $("#plotCount").textContent = `${total} plots`;

    const soldPercent = total === 0 ? 0 : Math.round((owned / total) * 100);
    $("#soldLabel").textContent = `${soldPercent}% sold`;
    $("#soldProgress").style.width = `${soldPercent}%`;

    rows.forEach(p => {
      const owner = p.owner_name || "—";

      const el = document.createElement("div");
      el.className = "row";
      el.setAttribute("role","listitem");
      el.innerHTML = `
        <div class="left">
          <div class="titleLine">
            <div class="plotName">${p.plot_id}</div>
            ${statusTag(p.status)}
          </div>
          <div class="meta">
            <span><span class="meta-label">District:</span> ${p.district || "—"}</span>
            <span>•</span>
            <span><span class="meta-label">Owner:</span> ${owner}</span>
          </div>
        </div>
        <div class="right">
          <div class="price">${p.status === "available" ? money(p.price_cents) : "Owned"}</div>
          <div class="smallNote">Protection only</div>
          <button class="btn center ${p.status === "available" ? "primary" : ""}" type="button">
            ${p.status === "available" ? "Buy" : "Details"}
          </button>
        </div>
      `;

      const btn = el.querySelector("button");
      btn.addEventListener("click", () => openModal(p));

      list.appendChild(el);
    });
  }

  async function fetchPlots(){
    const res = await fetch("/api/plots");
    if(!res.ok){
      throw new Error("Failed to load plots");
    }
    const data = await res.json();
    state.plots = data;
  }

  async function createCheckout(){
    const plot = state.selectedPlot;
    if(!plot){
      showToast("Choose a plot first.");
      return;
    }
    const username = $("#minecraftUsername").value.trim();
    if(username.length < 3){
      showToast("Enter a valid Minecraft username.");
      return;
    }
    const email = $("#buyerEmail").value.trim();

    try{
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_id: plot.plot_id,
          minecraft_username: username,
          email: email || undefined
        })
      });

      if(!res.ok){
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Checkout failed");
      }

      const { url } = await res.json();
      if(url){
        window.location.assign(url);
      }else{
        throw new Error("Checkout not available");
      }
    }catch(err){
      showToast(err.message || "Checkout failed");
    }
  }

  function showSuccessBanner(){
    const params = new URLSearchParams(window.location.search);
    if(params.get("success") === "1"){
      $("#successBanner").hidden = false;
    }
  }

  function bindEvents(){
    $("#btnOpenMap").addEventListener("click", () => window.open(CONFIG.mapUrl, "_blank", "noopener"));
    $("#btnCopyMap").addEventListener("click", () => copyText(CONFIG.mapUrl));
    $("#btnCopyIp").addEventListener("click", () => copyText(CONFIG.serverIp));

    $("#btnAvailable").addEventListener("click", () => {
      $("#status").value = "available";
      applyFilters();
      showToast("Showing available plots.");
    });

    $("#btnBuyAny").addEventListener("click", () => {
      $("#status").value = "available";
      applyFilters();
      $("#q").focus();
    });

    $("#btnReset").addEventListener("click", () => {
      $("#q").value = "";
      $("#status").value = "all";
      $("#sort").value = "recommended";
      applyFilters();
      showToast("Filters reset.");
    });

    $("#q").addEventListener("input", applyFilters);
    $("#status").addEventListener("change", applyFilters);
    $("#sort").addEventListener("change", applyFilters);

    $("#mClose").addEventListener("click", closeModal);
    $("#modalBack").addEventListener("click", (e) => {
      if(e.target === $("#modalBack")) closeModal();
    });
    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape") closeModal();
    });

    $("#mBuy").addEventListener("click", createCheckout);
  }

  async function init(){
    $("#mapFrame").src = CONFIG.mapEmbedUrl || "about:blank";
    setupMobileDrawer();
    setupReveal();
    bindEvents();
    showSuccessBanner();

    try{
      await fetchPlots();
      applyFilters();
    }catch(err){
      showToast("Unable to load plots right now.");
    }
  }

  init();
})();
