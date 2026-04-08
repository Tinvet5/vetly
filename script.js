document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // VIEWER
  // =========================
  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
    showNavigationControl: true,
    showNavigator: true,
    navigatorPosition: "BOTTOM_LEFT"
  });

  // =========================
  // DATA
  // =========================
  const atlas = {
    skull1: { image: "images/lateral.JPG", labels: [
      { name: "Arco Cigomático", info: "El arco cigomático...", x: 0.395, y: 0.315 },
      { name: "Agujero infraorbitario", info: "El agujero infraorbitario...", x: 0.655, y: 0.360 }
    ]},
    skull2: { image: "images/ventral.JPG", labels: [
      { name: "Agujero Magno", info: "El agujero magno...", x: 0.145, y: 0.335}
    ]},
    skull3: { image: "images/dorsal.JPG", labels: [
      { name: "Hueso Frontal", info: "El hueso frontal...", x: 0.35, y: 0.45 }
    ]},
    skull4: { image: "images/craneal.JPG", labels: [
      { name: "Lamina Cribosa", info: "La lamina cribosa...", x: 0.35, y: 0.45 }
    ]}
  };

  let currentOverlays = [];
  let labelsVisible = true;
  let addingAnnotation = false;

  // =========================
  // LOAD IMAGE
  // =========================
  function loadImage(key) {
    const data = atlas[key];

    viewer.open({ type: "image", url: data.image });

    viewer.addOnceHandler("open", () => {

      currentOverlays.forEach(el => el.remove());
      currentOverlays = [];

      data.labels.forEach(labelData => {

        const el = document.createElement("div");
        el.className = "label-anchor";

        const isLeft = labelData.x < 0.5;
        el.classList.add(isLeft ? "left" : "right");

        el.innerHTML = `
          <svg class="connector-svg">
            <line class="connector-line" x1="0" y1="0" x2="0" y2="0"/>
          </svg>

          <div class="anchor-dot"></div>

          <div class="label-box">
            <span class="label-text">${labelData.name}</span>
          </div>
        `;

        viewer.addOverlay({
          element: el,
          location: new OpenSeadragon.Point(labelData.x, labelData.y),
          placement: OpenSeadragon.Placement.CENTER
        });

        currentOverlays.push(el);

        // Prevent zoom interaction
        el.addEventListener("pointerdown", e => e.stopPropagation());
        el.addEventListener("pointerup", e => e.stopPropagation());
        el.addEventListener("click", e => e.stopPropagation());

        el.addEventListener("click", () => {
          showInfo(labelData.name, labelData.info);
        });

        // Initial line draw
        setTimeout(() => updateConnectorLine(el), 50);
      });

      applyLabelVisibility();
    });
  }

  // =========================
  // FIXED SVG CONNECTOR LOGIC
  // =========================
  function updateConnectorLine(el) {
    const dot = el.querySelector(".anchor-dot");
    const labelBox = el.querySelector(".label-box");
    const svg = el.querySelector(".connector-svg");
    const line = el.querySelector(".connector-line");

    if (!dot || !labelBox) return;

    const dotX = dot.offsetLeft;
    const dotY = dot.offsetTop;

    const labelX = labelBox.offsetLeft + labelBox.offsetWidth / 2;
    const labelY = labelBox.offsetTop + labelBox.offsetHeight / 2;

    const width = Math.max(dotX, labelX) + 50;
    const height = Math.max(dotY, labelY) + 50;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    line.setAttribute("x1", dotX);
    line.setAttribute("y1", dotY);
    line.setAttribute("x2", labelX);
    line.setAttribute("y2", labelY);
  }

  // Update on zoom/pan
  viewer.addHandler("animation", () => {
    currentOverlays.forEach(el => {
      if (el.classList.contains("label-anchor")) {
        updateConnectorLine(el);
      }
    });
  });

  // =========================
  // INFO PANEL
  // =========================
  function showInfo(title, text) {
    const panel = document.getElementById("infoPanel");

    document.getElementById("infoTitle").innerText = title;
    document.getElementById("infoText").innerText = text || "No info available";

    panel.classList.add("show");
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".label-anchor, .user-annotation, #infoPanel, .color-picker-panel")) {
      document.getElementById("infoPanel").classList.remove("show");
    }
  });

  // =========================
  // LABEL VISIBILITY
  // =========================
  function applyLabelVisibility() {
    currentOverlays.forEach(el => {
      if (el.classList.contains("label-anchor")) {
        el.style.display = labelsVisible ? "block" : "none";
      }
    });
  }

  document.getElementById("toggleLabels").addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    applyLabelVisibility();
  });

  // =========================
  // CONTROLS
  // =========================
  document.getElementById("resetView").addEventListener("click", () => {
    viewer.viewport.goHome();
  });

  document.getElementById("toggleTheme").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });

  document.querySelectorAll("[data-img]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadImage(btn.dataset.img);
    });
  });

  // =========================
  // SEARCH
  // =========================
  document.getElementById("labelSearch").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();

    currentOverlays.forEach(el => {
      if (!el.classList.contains("label-anchor")) return;

      const text = el.querySelector(".label-text").innerText.toLowerCase();
      el.style.display = (text.includes(query) && labelsVisible) ? "block" : "none";
    });
  });

  // =========================
  // ANNOTATIONS
  // =========================
  document.getElementById("addAnnotation").addEventListener("click", () => {
    addingAnnotation = !addingAnnotation;
  });

  const pastelColors = ["#fff8a0","#ffb6b9","#a0ffc8","#a0c8ff","#ffd1a0","#e0a0ff"];

  const colorPanel = document.createElement("div");
  colorPanel.className = "color-picker-panel";

  pastelColors.forEach(c => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.background = c;

    swatch.addEventListener("click", () => {
      colorPanel.style.display = "none";

      const title = prompt("Enter annotation title:");
      if (!title) return;

      const desc = prompt("Enter description:");

      addAnnotation({
        title,
        desc,
        x: colorPanel.viewportPoint.x,
        y: colorPanel.viewportPoint.y,
        color: c
      });
    });

    colorPanel.appendChild(swatch);
  });

  document.body.appendChild(colorPanel);

  viewer.addHandler("canvas-click", (event) => {
    if (!addingAnnotation) return;

    if (event.originalEvent.target.closest(".label-anchor, .user-annotation, .color-picker-panel")) return;

    const viewportPoint = viewer.viewport.pointFromPixel(event.position);

    colorPanel.viewportPoint = viewportPoint;
    colorPanel.style.display = "flex";
    colorPanel.style.left = event.originalEvent.clientX + "px";
    colorPanel.style.top = event.originalEvent.clientY + "px";

    addingAnnotation = false;
  });

  function addAnnotation(a) {
    const el = document.createElement("div");
    el.className = "user-annotation";
    el.style.background = a.color || "#fff8a0";

    el.innerHTML = `
      <div class="annotation-title">${a.title}</div>
      <div class="annotation-text">${a.desc || ""}</div>
      <div class="annotation-delete">🗑️</div>
    `;

    viewer.addOverlay({
      element: el,
      location: new OpenSeadragon.Point(a.x, a.y),
      placement: OpenSeadragon.Placement.CENTER
    });

    currentOverlays.push(el);

    makeDraggable(el, a);

    el.querySelector(".annotation-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      el.remove();
      currentOverlays = currentOverlays.filter(item => item !== el);
    });

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showInfo(a.title, a.desc);
    });
  }

  function makeDraggable(el, data) {
    let dragging = false;

    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".annotation-delete")) return;
      e.stopPropagation();
      dragging = true;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;

      const vp = viewer.viewport.pointFromPixel(
        new OpenSeadragon.Point(e.clientX, e.clientY)
      );

      data.x = vp.x;
      data.y = vp.y;

      viewer.updateOverlay(el, vp);
    });

    el.addEventListener("pointerup", () => {
      dragging = false;
    });
  }

  // =========================
  // INIT
  // =========================
  loadImage("skull1");

    // =========================
  // DROPDOWN MENU (FIXED)
  // =========================

  const menuToggle = document.getElementById("menuToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");

  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-container")) {
      dropdownMenu.classList.remove("open");
    }
  });

  // =========================
  // INIT
  // =========================
  loadImage("skull1");

});

