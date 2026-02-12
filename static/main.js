lucide.createIcons();

let vozSeleccionadaID = null;
let audioPreviewActual = new Audio();

// ── Preview audio ──
function playPreview(event, url) {
  event.stopPropagation();
  event.preventDefault();
  if (!audioPreviewActual.paused) {
    audioPreviewActual.pause();
    if (audioPreviewActual.src.includes(url)) return;
  }
  audioPreviewActual.src = url;
  audioPreviewActual.play().catch((e) => console.error("Error audio:", e));
}

// ── Select voice ──
function seleccionarVoz(id, nombre, elementoCard) {
  vozSeleccionadaID = id;
  document.querySelectorAll(".voice-card").forEach((c) => {
    c.classList.remove("selected");
    c.querySelector(".check-icon").classList.add("hidden");
  });
  elementoCard.classList.add("selected");
  elementoCard.querySelector(".check-icon").classList.remove("hidden");

  const tag = document.getElementById("voice-tag");
  tag.classList.remove("hidden");
  tag.classList.add("flex");
  document.getElementById("voice-tag-name").textContent = nombre;
  document.getElementById("btn-enviar").disabled = false;
}

// ── Textarea auto-resize ──
const textarea = document.getElementById("texto-input");
const charCount = document.getElementById("char-count");
textarea.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
  if (this.value === "") this.style.height = "auto";
  charCount.innerText = `${this.value.length} car.`;
});

// ── Enter to send ──
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    generarAudioFinal();
  }
});

// ── Helpers ──
function showChatMode() {
  const welcome = document.getElementById("welcome-section");
  const divider = document.getElementById("day-divider");
  if (welcome.style.display !== "none") {
    welcome.style.display = "none";
    divider.classList.remove("hidden");
  }
}

function addUserBubble(text) {
  showChatMode();
  const resultados = document.getElementById("resultados");
  const row = document.createElement("div");
  row.className = "msg-row flex justify-end";
  row.innerHTML = `
                <div class="max-w-[480px] bg-white rounded-[18px_18px_4px_18px] px-4 py-3">
                    <div class="flex items-center justify-end gap-1.5 mb-1">
                        <span class="text-[11px] font-semibold text-[#666]">Yo</span>
                        <span class="text-[11px] text-[#b0b0b8]">· justo ahora</span>
                    </div>
                    <p class="text-sm text-[#1a1a1a] leading-relaxed">${text}</p>
                </div>
            `;
  resultados.appendChild(row);
  scrollToBottom();
}

let playerIdCounter = 0;

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function addAudioCard(text, audioUrl) {
  const pid = "player-" + ++playerIdCounter;
  const resultados = document.getElementById("resultados");
  const row = document.createElement("div");
  row.className = "msg-row flex justify-start";
  row.innerHTML = `
                <div class="max-w-[440px] w-full">
                    <div class="flex items-center gap-1.5 mb-1.5">
                        <span class="text-[11px] font-semibold text-[#666]">Voice Studio</span>
                        <span class="text-[11px] text-[#b0b0b8]">· justo ahora</span>
                    </div>
                    <div class="audio-card bg-white border border-[#e8e8eb] rounded-[14px] p-4 relative">
                        <button class="absolute top-3 right-3 text-[#ccc] hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition" onclick="this.closest('.msg-row').remove()">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                        <div class="flex items-center gap-2.5 mb-3">
                            <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                <i data-lucide="check-circle" class="w-4 h-4 text-green-500"></i>
                            </div>
                            <div>
                                <p class="text-[13px] font-semibold text-[#1a1a1a]">Audio generado</p>
                                <p class="text-[11px] text-[#b0b0b8]">Hace un momento</p>
                            </div>
                        </div>
                        <p class="text-[13px] text-[#888] italic mb-3 leading-relaxed line-clamp-2">"${text}"</p>

                        <!-- Custom Audio Player -->
                        <div class="custom-player" id="${pid}">
                            <audio preload="auto" src="${audioUrl}" id="${pid}-audio"></audio>
                            <div class="player-top">
                                <button class="player-play-btn" id="${pid}-playbtn">
                                    <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                                    <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
                                </button>
                                <div class="player-info">
                                    <div class="player-title">Audio generado · Voceape.</div>
                                    <div class="player-subtitle">${text.length > 50 ? text.substring(0, 50) + "..." : text}</div>
                                </div>
                                <button class="player-speed-btn" id="${pid}-speed">1x</button>
                            </div>
                            <div class="player-time-row">
                                <button class="player-skip-btn" id="${pid}-skipback" title="Retroceder 5s">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                                        <text x="12" y="16" font-size="7" fill="currentColor" stroke="none" text-anchor="middle" font-weight="700">5</text>
                                    </svg>
                                </button>
                                <span class="player-time" id="${pid}-current">0:00</span>
                                <div class="player-progress-wrap" id="${pid}-progresswrap">
                                    <div class="player-progress-bg">
                                        <div class="player-progress-fill" id="${pid}-fill"></div>
                                    </div>
                                    <div class="player-progress-thumb" id="${pid}-thumb"></div>
                                </div>
                                <span class="player-time right" id="${pid}-duration">0:00</span>
                                <button class="player-skip-btn" id="${pid}-skipfwd" title="Adelantar 5s">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
                                        <text x="12" y="16" font-size="7" fill="currentColor" stroke="none" text-anchor="middle" font-weight="700">5</text>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <a href="${audioUrl}" download="voz_ia_${Date.now()}.mp3"
                           class="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f7f7f8] border border-[#e8e8eb] rounded-lg text-[12px] font-medium text-[#555] hover:bg-green-500 hover:border-green-500 hover:text-white transition">
                            <i data-lucide="download" class="w-3 h-3"></i>
                            Descargar MP3
                        </a>
                    </div>
                    <div class="msg-actions flex gap-1 mt-2">
                        <button class="w-7 h-7 rounded-md flex items-center justify-center text-[#b0b0b8] hover:bg-[#f0f0f3] hover:text-[#666] transition">
                            <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i>
                        </button>
                        <button class="w-7 h-7 rounded-md flex items-center justify-center text-[#b0b0b8] hover:bg-[#f0f0f3] hover:text-[#666] transition">
                            <i data-lucide="thumbs-down" class="w-3.5 h-3.5"></i>
                        </button>
                        <button class="w-7 h-7 rounded-md flex items-center justify-center text-[#b0b0b8] hover:bg-[#f0f0f3] hover:text-[#666] transition">
                            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `;
  resultados.appendChild(row);
  lucide.createIcons();
  initPlayer(pid);
  scrollToBottom();
}

function initPlayer(pid) {
  const audio = document.getElementById(pid + "-audio");
  const playBtn = document.getElementById(pid + "-playbtn");
  const fill = document.getElementById(pid + "-fill");
  const thumb = document.getElementById(pid + "-thumb");
  const progressWrap = document.getElementById(pid + "-progresswrap");
  const currentEl = document.getElementById(pid + "-current");
  const durationEl = document.getElementById(pid + "-duration");
  const speedBtn = document.getElementById(pid + "-speed");
  const skipBack = document.getElementById(pid + "-skipback");
  const skipFwd = document.getElementById(pid + "-skipfwd");

  const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75];
  let speedIdx = 0;

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    fill.style.width = pct + "%";
    thumb.style.left = pct + "%";
    currentEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("ended", () => {
    playBtn.classList.remove("playing");
  });

  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      // Pause all other players
      document.querySelectorAll(".custom-player audio").forEach((a) => {
        if (a !== audio && !a.paused) {
          a.pause();
          a.closest(".custom-player")
            .querySelector(".player-play-btn")
            .classList.remove("playing");
        }
      });
      audio.play();
      playBtn.classList.add("playing");
    } else {
      audio.pause();
      playBtn.classList.remove("playing");
    }
  });

  // Click/drag on progress bar
  let dragging = false;
  function seek(e) {
    const rect = progressWrap.getBoundingClientRect();
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    audio.currentTime = pct * audio.duration;
  }

  progressWrap.addEventListener("mousedown", (e) => {
    dragging = true;
    seek(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (dragging) seek(e);
  });
  document.addEventListener("mouseup", () => {
    dragging = false;
  });

  // Touch support
  progressWrap.addEventListener(
    "touchstart",
    (e) => {
      dragging = true;
      seek(e.touches[0]);
    },
    { passive: true },
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (dragging) seek(e.touches[0]);
    },
    { passive: true },
  );
  document.addEventListener("touchend", () => {
    dragging = false;
  });

  // Speed
  speedBtn.addEventListener("click", () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    audio.playbackRate = speeds[speedIdx];
    speedBtn.textContent = speeds[speedIdx] + "x";
  });

  // Skip
  skipBack.addEventListener("click", () => {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
  skipFwd.addEventListener("click", () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  });

  // Auto-play
  audio
    .play()
    .then(() => playBtn.classList.add("playing"))
    .catch(() => {});
}

function addErrorMessage(msg) {
  const resultados = document.getElementById("resultados");
  const row = document.createElement("div");
  row.className = "msg-row flex justify-start";
  row.innerHTML = `
                <div class="max-w-[440px]">
                    <div class="flex items-center gap-1.5 mb-1.5">
                        <span class="text-[11px] font-semibold text-[#666]">Voice Studio</span>
                        <span class="text-[11px] text-[#b0b0b8]">· justo ahora</span>
                    </div>
                    <p class="text-sm text-red-500">⚠️ ${msg}</p>
                </div>
            `;
  resultados.appendChild(row);
  scrollToBottom();
}

function scrollToBottom() {
  const area = document.getElementById("scroll-area");
  setTimeout(
    () => area.scrollTo({ top: area.scrollHeight, behavior: "smooth" }),
    50,
  );
}

// ── Generate audio (same logic as original) ──
async function generarAudioFinal() {
  const texto = textarea.value.trim();
  if (!texto || !vozSeleccionadaID) return;

  const btn = document.getElementById("btn-enviar");
  const dots = document.getElementById("loading-dots");

  // Show user message
  addUserBubble(texto);
  textarea.value = "";
  textarea.style.height = "auto";
  charCount.innerText = "0 car.";

  btn.disabled = true;
  dots.classList.add("active");
  scrollToBottom();

  try {
    const response = await fetch(
      `/generar?text=${encodeURIComponent(texto)}&voice=${vozSeleccionadaID}`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error("Error generando audio");
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    addAudioCard(texto, audioUrl);
  } catch (e) {
    addErrorMessage("Ocurrió un error: " + e.message);
  } finally {
    btn.disabled = false;
    dots.classList.remove("active");
  }
}
// ── Logic for Voice Dropdown ──

function toggleVoiceMenu() {
  const menu = document.getElementById("voice-menu");
  menu.classList.toggle("hidden");
}

// Cierra el menú si haces clic fuera de él
document.addEventListener("click", function (event) {
  const menu = document.getElementById("voice-menu");
  const btn = document.getElementById("voice-selector-btn");
  if (
    !menu.classList.contains("hidden") &&
    !menu.contains(event.target) &&
    !btn.contains(event.target)
  ) {
    menu.classList.add("hidden");
  }
});

// ── Actualiza la función seleccionarVoz existente ──
function seleccionarVoz(id, nombre, elementoCard = null, fromDropdown = false) {
  vozSeleccionadaID = id;

  // 1. Actualizar Grid Principal (Tarjetas grandes)
  document.querySelectorAll(".voice-card").forEach((c) => {
    c.classList.remove("selected");
    c.querySelector(".check-icon").classList.add("hidden");
  });

  // Si el clic vino del dropdown, buscamos la tarjeta correspondiente para marcarla
  if (fromDropdown) {
    // Buscamos la tarjeta en el grid que tenga el onclick con ese ID
    // (Nota: Esto es un truco rápido, idealmente pon un data-id en las cards)
    const cards = document.querySelectorAll(".voice-card");
    cards.forEach((card) => {
      if (card.getAttribute("onclick").includes(id)) {
        card.classList.add("selected");
        card.querySelector(".check-icon").classList.remove("hidden");
      }
    });
  } else if (elementoCard) {
    // Si vino de la tarjeta directamente
    elementoCard.classList.add("selected");
    elementoCard.querySelector(".check-icon").classList.remove("hidden");
  }

  // 2. Actualizar el Botón Selector (Abajo)
  const btn = document.getElementById("voice-selector-btn");
  const nameSpan = document.getElementById("voice-selector-name");

  // Cambiar estilo del botón para mostrar que está activo (Verde)
  btn.classList.remove("hidden", "bg-[#f0f0f3]", "text-[#555]");
  btn.classList.add(
    "flex",
    "bg-green-50",
    "text-green-700",
    "border-green-200",
  ); // Estilo activo

  // Actualizar icono del mic dentro del botón
  const micIcon = btn.querySelector('[data-lucide="mic"]');
  if (micIcon) micIcon.classList.replace("text-[#888]", "text-green-600");

  nameSpan.textContent = nombre;

  // 3. Actualizar la lista del Dropdown (Poner check al item seleccionado)
  document.querySelectorAll("#voice-menu button").forEach((item) => {
    item.classList.remove("active", "bg-[#f7f7f8]"); // Limpiar anteriores
    const check = item.querySelector('[data-lucide="check"]');
    if (check) check.classList.add("opacity-0"); // Ocultar checks

    if (item.dataset.voiceId === id) {
      item.classList.add("active", "bg-[#f7f7f8]");
      if (check) check.classList.remove("opacity-0");
    }
  });

  // Habilitar botón de enviar y cerrar menú
  document.getElementById("btn-enviar").disabled = false;
  document.getElementById("voice-menu").classList.add("hidden");

  // Refrescar iconos (por si acaso se generó alguno nuevo dinámicamente)
  lucide.createIcons();
}
