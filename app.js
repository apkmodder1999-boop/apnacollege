/**
 * APNA COLLEGE MOD APK — Core Application Script
 * 100% Cloudflare Pages & Static CDN Compatible
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var globalSearch = document.getElementById("global-search");
  var sidebar = document.getElementById("sidebar");
  var sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  var sidebarCloseBtn = document.getElementById("sidebar-close-btn");
  var enrolledBadgeCount = document.getElementById("enrolled-badge-count");
  var navAll = document.getElementById("nav-all-batches");
  var navEnrolled = document.getElementById("nav-enrolled-batches");
  var mbNavAll = document.getElementById("mb-nav-all");
  var mbNavEnrolled = document.getElementById("mb-nav-enrolled");

  var hls = null;
  var allBatchesData = [];
  var pdfBlobCache = {};

  // LocalStorage Helper for Enrolled Batches
  function getEnrolledIds() {
    try {
      var raw = localStorage.getItem("apna_mod_enrolled");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setEnrolledIds(ids) {
    try {
      localStorage.setItem("apna_mod_enrolled", JSON.stringify(ids));
      updateEnrolledBadge();
    } catch (e) {}
  }

  function toggleEnroll(id) {
    var ids = getEnrolledIds();
    var idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
    } else {
      ids.push(id);
    }
    setEnrolledIds(ids);
    return ids.indexOf(id) >= 0;
  }

  function updateEnrolledBadge() {
    var count = getEnrolledIds().length;
    if (enrolledBadgeCount) enrolledBadgeCount.textContent = count;
  }
  updateEnrolledBadge();

  // Mobile Sidebar Toggle
  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener("click", function () {
      sidebar.classList.add("open");
    });
  }
  if (sidebarCloseBtn && sidebar) {
    sidebarCloseBtn.addEventListener("click", function () {
      sidebar.classList.remove("open");
    });
  }

  // Close sidebar on link click (mobile)
  document.addEventListener("click", function (e) {
    if (window.innerWidth < 900 && sidebar && sidebar.classList.contains("open")) {
      if (!sidebar.contains(e.target) && e.target !== sidebarToggleBtn && !sidebarToggleBtn.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    }
  });

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return h > 0 ? p(h) + ":" + p(m) + ":" + p(s) : p(m) + ":" + p(s);
  }

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url);
      return r.json();
    });
  }

  function destroyPlayer() {
    if (hls) {
      try { hls.destroy(); } catch (e) {}
      hls = null;
    }
  }

  // Cloudflare & Static Compatible PDF Resolver
  async function resolvePDFBlob(title, batchName) {
    var cacheKey = title + "::" + batchName;
    if (pdfBlobCache[cacheKey]) {
      return pdfBlobCache[cacheKey];
    }

    // Attempt Client-Side Generation via PDFLib (Works on 100% static Cloudflare Pages!)
    if (window.generateClientPDF) {
      try {
        var blob = await window.generateClientPDF(title, batchName);
        var url = URL.createObjectURL(blob);
        pdfBlobCache[cacheKey] = url;
        return url;
      } catch (err) {
        console.warn("Client PDF generation fallback:", err);
      }
    }

    // Fallback to Express backend endpoint if running with Node
    var backendUrl = "/api/pdf/download?title=" + encodeURIComponent(title) + "&batch=" + encodeURIComponent(batchName);
    return backendUrl;
  }

  /* ---------------- View: Home & Batches ---------------- */
  function renderHome(showOnlyEnrolled) {
    destroyPlayer();
    if (sidebar) sidebar.classList.remove("open");

    // Nav state
    if (showOnlyEnrolled) {
      if (navAll) navAll.classList.remove("active");
      if (navEnrolled) navEnrolled.classList.add("active");
      if (mbNavAll) mbNavAll.classList.remove("active");
      if (mbNavEnrolled) mbNavEnrolled.classList.add("active");
    } else {
      if (navAll) navAll.classList.add("active");
      if (navEnrolled) navEnrolled.classList.remove("active");
      if (mbNavAll) mbNavAll.classList.add("active");
      if (mbNavEnrolled) mbNavEnrolled.classList.remove("active");
    }

    app.innerHTML = '<div class="loading-box"><div class="spinner"></div><p style="color:var(--text-muted);font-size:.85rem">Loading APNA COLLEGE MOD APK…</p></div>';

    fetchJSON("data/batches.json").then(function (batches) {
      allBatchesData = batches;
      var enrolledIds = getEnrolledIds();

      var list = showOnlyEnrolled
        ? batches.filter(function (b) { return enrolledIds.indexOf(b.id) >= 0; })
        : batches;

      var totalLectures = batches.reduce(function (a, b) { return a + (b.videoCount || 0); }, 0);
      var totalNotes = batches.reduce(function (a, b) { return a + (b.pdfCount || 0); }, 0);

      var cardsHtml = list.map(function (b) {
        var isSaved = enrolledIds.indexOf(b.id) >= 0;
        return '' +
          '<div class="batch-card" data-id="' + esc(b.id) + '">' +
            '<div class="batch-card-img-wrap">' +
              '<div class="card-tags">' +
                '<span class="tag-badge tag-free">Free</span>' +
                (b.isPopular ? '<span class="tag-badge tag-trending">Trending</span>' : "") +
                '<span class="tag-badge tag-mod">Full Access</span>' +
              '</div>' +
              '<button class="card-bookmark-btn' + (isSaved ? " saved" : "") + '" data-id="' + esc(b.id) + '" title="' + (isSaved ? "Enrolled" : "Enroll / Bookmark") + '">' +
                (isSaved ? "★" : "☆") +
              '</button>' +
              '<a href="#/batch/' + encodeURIComponent(b.id) + '">' +
                '<img class="batch-card-img" loading="lazy" src="' + esc(b.image) + '" alt="' + esc(b.name) + '">' +
              '</a>' +
            '</div>' +
            '<a class="batch-card-body" href="#/batch/' + encodeURIComponent(b.id) + '">' +
              '<h3 class="batch-card-title">' + esc(b.name) + '</h3>' +
              '<div class="batch-card-meta">' +
                '<span>▶ ' + (b.videoCount || 0) + ' Lectures</span>' +
                '<span>📄 ' + (b.pdfCount || 0) + ' Notes &amp; PDFs</span>' +
              '</div>' +
            '</a>' +
          '</div>';
      }).join("");

      var heroHtml = '' +
        '<div class="hero-container">' +
          '<div class="welcome-badge">✦ Welcome to Apna College</div>' +
          '<h1 class="hero-h1">Explore <br><span class="gradient-text">' + (showOnlyEnrolled ? 'Enrolled Batches' : 'All Batches') + '</span></h1>' +
          '<p class="hero-desc">Discover our premium live batches and recorded courses tailored for your success. Start exploring now with complete free access!</p>' +
        '</div>' +
        '<div class="filter-tabs-bar">' +
          '<a href="#/" class="filter-tab' + (!showOnlyEnrolled ? ' active' : '') + '">All Batches (' + batches.length + ')</a>' +
          '<a href="#/enrolled" class="filter-tab' + (showOnlyEnrolled ? ' active' : '') + '">Enrolled Batches (' + enrolledIds.length + ')</a>' +
        '</div>';

      if (!list.length) {
        app.innerHTML = heroHtml + '<div class="empty-box"><h3>No enrolled batches found</h3><p>Click the star (☆) on any batch card to enroll and access it quickly here.</p></div>';
        return;
      }

      app.innerHTML = heroHtml + '<div class="batches-grid" id="batches-grid">' + cardsHtml + '</div>';

      // Card bookmark event listeners
      document.querySelectorAll(".card-bookmark-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute("data-id");
          var saved = toggleEnroll(id);
          btn.classList.toggle("saved", saved);
          btn.innerHTML = saved ? "★" : "☆";
          btn.title = saved ? "Enrolled" : "Enroll / Bookmark";
          if (showOnlyEnrolled && !saved) {
            renderHome(true);
          }
        });
      });

      // Search functionality
      function applyFilter(term) {
        var t = (term || "").toLowerCase();
        document.querySelectorAll("#batches-grid .batch-card").forEach(function (card) {
          var title = card.querySelector(".batch-card-title").textContent.toLowerCase();
          card.style.display = title.indexOf(t) >= 0 ? "" : "none";
        });
      }

      if (globalSearch) {
        globalSearch.value = "";
        globalSearch.oninput = function () {
          applyFilter(globalSearch.value);
        };
      }
    }).catch(function (err) {
      app.innerHTML = '<div class="empty-box"><h3>Error loading batches</h3><p>' + esc(err.message) + '</p></div>';
    });
  }

  /* ---------------- View: Batch Detail & Player ---------------- */
  function renderBatch(id) {
    destroyPlayer();
    if (sidebar) sidebar.classList.remove("open");
    if (navAll) navAll.classList.remove("active");
    if (navEnrolled) navEnrolled.classList.remove("active");

    app.innerHTML = '<div class="loading-box"><div class="spinner"></div><p style="color:var(--text-muted);font-size:.85rem">Loading batch lectures &amp; notes…</p></div>';

    fetchJSON("data/batch/" + encodeURIComponent(id) + ".json").then(function (batch) {
      var lectures = (batch.lectures || []).slice().sort(function (a, c) { return (a.orderIdx || 0) - (c.orderIdx || 0); });
      var notes = (batch.notes || []).slice().sort(function (a, c) { return (a.orderIdx || 0) - (c.orderIdx || 0); });

      var enrolledIds = getEnrolledIds();
      var isEnrolled = enrolledIds.indexOf(batch.id) >= 0;

      app.innerHTML = '' +
        '<div class="batch-detail-top">' +
          '<a class="back-btn" href="#/">← Back to All Batches</a>' +
          '<div class="batch-banner-header">' +
            '<img class="batch-banner-thumb" src="' + esc(batch.image) + '" alt="' + esc(batch.name) + '" />' +
            '<div class="batch-banner-title">' +
              '<h1>' + esc(batch.name) + '</h1>' +
              '<p>▶ ' + lectures.length + ' Lectures &nbsp;·&nbsp; 📄 ' + notes.length + ' Notes &amp; PDFs &nbsp;·&nbsp; <span style="color:var(--primary);font-weight:700">Full Access</span></p>' +
            '</div>' +
            '<button class="enroll-btn' + (isEnrolled ? ' enrolled' : '') + '" id="detail-enroll-btn">' +
              (isEnrolled ? '✓ Enrolled' : '+ Enroll Free') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="batch-main-grid">' +
          '<div>' +
            '<div class="player-shell paused" id="player-shell">' +
              '<video id="batch-video" playsinline></video>' +
              '<div class="player-title-overlay" id="p-title-overlay">' +
                '<span class="live-dot"></span>' +
                '<div style="min-width:0">' +
                  '<small id="np-badge">Now Playing</small>' +
                  '<p id="np-title">Select a lecture</p>' +
                '</div>' +
              '</div>' +
              '<div class="player-status" id="player-status"><p>Select a lecture or PDF from the list to start.</p></div>' +
              '<div class="player-controls" id="player-controls">' +
                '<input type="range" class="seek-bar" id="seek-bar" min="0" max="0" step="0.1" value="0" aria-label="Seek">' +
                '<div class="controls-row">' +
                  '<button class="ctrl-btn" id="ctrl-prev" title="Previous Lecture">⏮</button>' +
                  '<button class="ctrl-btn" id="ctrl-back10" title="Back 10s">⏪</button>' +
                  '<button class="ctrl-btn primary" id="ctrl-play" title="Play/Pause">▶</button>' +
                  '<button class="ctrl-btn" id="ctrl-fwd10" title="Forward 10s">⏩</button>' +
                  '<button class="ctrl-btn" id="ctrl-next" title="Next Lecture">⏭</button>' +
                  '<button class="ctrl-btn" id="ctrl-mute" title="Mute/Unmute">🔊</button>' +
                  '<span class="time-display" id="time-display">00:00 <span>/ 00:00</span></span>' +
                  '<span class="controls-spacer"></span>' +
                  '<select class="ctrl-select" id="ctrl-speed" title="Speed">' +
                    [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(function (s) { return '<option value="' + s + '"' + (s === 1 ? ' selected' : '') + '>' + s + 'x</option>'; }).join('') +
                  '</select>' +
                  '<select class="ctrl-select" id="ctrl-quality" title="Quality" style="display:none"></select>' +
                  '<button class="ctrl-btn" id="ctrl-fs" title="Fullscreen">⛶</button>' +
                '</div>' +
              '</div>' +
              '<!-- PDF Viewer Shell -->' +
              '<div class="pdf-viewer-shell" id="pdf-shell" style="display:none">' +
                '<div class="pdf-nav-bar">' +
                  '<div class="pdf-nav-left">' +
                    '<button class="pdf-btn" id="pdf-back-video-btn">◀ Back to Video</button>' +
                    '<strong id="pdf-nav-title">PDF Notes</strong>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;gap:0.4rem">' +
                    '<a class="pdf-btn" id="pdf-open-tab-btn" href="#" target="_blank" rel="noopener">👁 Open in New Tab</a>' +
                    '<a class="pdf-btn primary" id="pdf-download-btn" href="#" download>⬇ Save PDF</a>' +
                  '</div>' +
                '</div>' +
                '<div class="pdf-iframe-container">' +
                  '<iframe id="pdf-embed-frame" title="PDF Document" allow="fullscreen"></iframe>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<p style="margin-top:0.75rem;font-size:0.84rem;color:var(--text-muted)">Currently Playing: <span id="np-label" style="color:#fff;font-weight:700">—</span></p>' +
          '</div>' +
          '<div>' +
            '<div class="side-panel">' +
              '<div class="panel-tabs-nav">' +
                '<button class="panel-tab-btn active" id="tab-btn-lec">▶ Lectures (' + lectures.length + ')</button>' +
                '<button class="panel-tab-btn" id="tab-btn-notes">📄 Notes &amp; PDFs (' + notes.length + ')</button>' +
              '</div>' +
              '<input class="panel-search-input" id="panel-search" type="search" placeholder="Search in this batch…">' +
              '<div class="lecture-list" id="lec-list-container"></div>' +
              '<div class="notes-list" id="notes-list-container" style="display:none"></div>' +
            '</div>' +
          '</div>' +
        '</div>';

      var video = document.getElementById("batch-video");
      var shell = document.getElementById("player-shell");
      var status = document.getElementById("player-status");
      var seekBar = document.getElementById("seek-bar");
      var timeDisplay = document.getElementById("time-display");
      var playBtn = document.getElementById("ctrl-play");
      var speedSelect = document.getElementById("ctrl-speed");
      var qualitySelect = document.getElementById("ctrl-quality");
      var muteBtn = document.getElementById("ctrl-mute");
      var npBadge = document.getElementById("np-badge");
      var npTitle = document.getElementById("np-title");
      var npLabel = document.getElementById("np-label");
      var tabBtnLec = document.getElementById("tab-btn-lec");
      var tabBtnNotes = document.getElementById("tab-btn-notes");
      var panelSearch = document.getElementById("panel-search");
      var lecListContainer = document.getElementById("lec-list-container");
      var notesListContainer = document.getElementById("notes-list-container");
      var detailEnrollBtn = document.getElementById("detail-enroll-btn");

      var pdfShell = document.getElementById("pdf-shell");
      var pdfNavTitle = document.getElementById("pdf-nav-title");
      var pdfEmbedFrame = document.getElementById("pdf-embed-frame");
      var pdfOpenTabBtn = document.getElementById("pdf-open-tab-btn");
      var pdfDownloadBtn = document.getElementById("pdf-download-btn");
      var pdfBackVideoBtn = document.getElementById("pdf-back-video-btn");

      var currentLecIdx = -1;
      var currentNoteIdx = -1;
      var isPdfMode = false;
      var activeTab = "lec";

      // Detail Enroll Button Click
      detailEnrollBtn.addEventListener("click", function () {
        var enrolled = toggleEnroll(batch.id);
        detailEnrollBtn.classList.toggle("enrolled", enrolled);
        detailEnrollBtn.textContent = enrolled ? "✓ Enrolled" : "+ Enroll Free";
      });

      // Render Lecture List
      function renderLectures(filter) {
        var term = (filter || "").toLowerCase();
        lecListContainer.innerHTML = lectures.map(function (l, i) {
          if (term && l.title.toLowerCase().indexOf(term) < 0) return "";
          return '' +
            '<button class="lec-row-btn' + (!isPdfMode && i === currentLecIdx ? ' active' : '') + '" data-i="' + i + '">' +
              '<span class="lec-num">' + String(i + 1).padStart(2, "0") + '</span>' +
              '<span class="lec-title">' + esc(l.title) + '</span>' +
            '</button>';
        }).join("");
      }

      // Render Notes List with View & Save buttons
      function renderNotes(filter) {
        var term = (filter || "").toLowerCase();
        notesListContainer.innerHTML = notes.map(function (n, i) {
          if (term && n.title.toLowerCase().indexOf(term) < 0) return "";
          return '' +
            '<div class="note-row-item' + (isPdfMode && i === currentNoteIdx ? ' active' : '') + '" data-i="' + i + '">' +
              '<button class="note-click-btn" data-i="' + i + '">' +
                '<span class="note-tag">PDF</span>' +
                '<span class="note-title-text">' + esc(n.title) + '</span>' +
              '</button>' +
              '<div class="note-actions-wrap">' +
                '<button class="mini-action-btn view-btn" data-i="' + i + '" title="View in Player">👁 View</button>' +
                '<button class="mini-action-btn save save-btn" data-i="' + i + '" title="Save to Device">⬇ Save</button>' +
              '</div>' +
            '</div>';
        }).join("");
      }

      renderLectures("");
      renderNotes("");

      // Tab switcher
      tabBtnLec.addEventListener("click", function () {
        activeTab = "lec";
        tabBtnLec.classList.add("active");
        tabBtnNotes.classList.remove("active");
        lecListContainer.style.display = "flex";
        notesListContainer.style.display = "none";
        panelSearch.placeholder = "Search lectures…";
        renderLectures(panelSearch.value);
      });

      tabBtnNotes.addEventListener("click", function () {
        activeTab = "notes";
        tabBtnNotes.classList.add("active");
        tabBtnLec.classList.remove("active");
        notesListContainer.style.display = "flex";
        lecListContainer.style.display = "none";
        panelSearch.placeholder = "Search notes & PDFs…";
        renderNotes(panelSearch.value);
      });

      panelSearch.addEventListener("input", function (e) {
        if (activeTab === "lec") renderLectures(e.target.value);
        else renderNotes(e.target.value);
      });

      // Play Lecture
      function playLecture(i) {
        if (i < 0 || i >= lectures.length) return;
        currentLecIdx = i;
        isPdfMode = false;
        shell.classList.remove("pdf-mode");
        pdfShell.style.display = "none";

        var lec = lectures[i];
        npBadge.textContent = "Now Playing Lecture";
        npTitle.textContent = lec.title;
        npLabel.textContent = (i + 1) + ". " + lec.title;

        renderLectures(panelSearch.value);
        renderNotes(panelSearch.value);

        destroyPlayer();
        status.style.display = "flex";
        status.innerHTML = '<div class="spinner"></div><p><strong>Preparing stream…</strong></p>';

        function onReady() {
          status.style.display = "none";
          video.play().catch(function () {});
        }

        if (lec.link.indexOf(".m3u8") >= 0 && window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ enableWorker: true, backBufferLength: 90 });
          hls.loadSource(lec.link);
          hls.attachMedia(video);
          var recoveries = 0;
          hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
            onReady();
            var levels = hls.levels || [];
            if (levels.length > 1) {
              var opts = ['<option value="-1">Auto</option>'];
              var seen = {};
              levels.forEach(function (l, idx) {
                var label = l.height ? l.height + "p" : Math.round(l.bitrate / 1000) + "kbps";
                if (seen[label]) return;
                seen[label] = 1;
                opts.push('<option value="' + idx + '">' + label + '</option>');
              });
              qualitySelect.innerHTML = opts.join("");
              qualitySelect.style.display = "";
            } else {
              qualitySelect.style.display = "none";
            }
          });
          hls.on(window.Hls.Events.ERROR, function (_e, data) {
            if (!data.fatal) return;
            if (recoveries < 3) {
              recoveries++;
              if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) { hls.startLoad(); return; }
              if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; }
            }
            status.innerHTML = '<p><strong>Stream unavailable</strong></p><p>Please select another lecture.</p>';
          });
        } else {
          video.src = lec.link;
          video.addEventListener("loadedmetadata", onReady, { once: true });
          video.play().catch(function () {});
        }
      }

      // View PDF Note
      async function viewNote(i) {
        if (i < 0 || i >= notes.length) return;
        currentNoteIdx = i;
        isPdfMode = true;

        if (video) video.pause();
        status.style.display = "none";

        shell.classList.add("pdf-mode");
        pdfShell.style.display = "flex";

        var note = notes[i];
        pdfNavTitle.textContent = (i + 1) + ". " + note.title;
        npLabel.textContent = "📄 " + note.title + " (PDF Note)";

        var safeName = (note.title.replace(/[^a-zA-Z0-9_-]/g, "_")) + ".pdf";

        // Resolve PDF URL (Blob or API)
        var pdfUrl = await resolvePDFBlob(note.title, batch.name);

        pdfEmbedFrame.src = pdfUrl + "#toolbar=1&navpanes=0";
        pdfOpenTabBtn.href = pdfUrl;
        pdfDownloadBtn.href = pdfUrl;
        pdfDownloadBtn.download = safeName;

        renderLectures(panelSearch.value);
        renderNotes(panelSearch.value);

        if (window.innerWidth < 960) {
          shell.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      // Direct Save Note helper
      async function saveNoteDirect(i) {
        var note = notes[i];
        if (!note) return;
        var pdfUrl = await resolvePDFBlob(note.title, batch.name);
        var safeName = (note.title.replace(/[^a-zA-Z0-9_-]/g, "_")) + ".pdf";

        var a = document.createElement("a");
        a.href = pdfUrl;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // List delegation
      lecListContainer.addEventListener("click", function (e) {
        var btn = e.target.closest(".lec-row-btn");
        if (btn) playLecture(Number(btn.dataset.i));
      });

      notesListContainer.addEventListener("click", function (e) {
        var row = e.target.closest(".note-row-item");
        if (!row) return;
        var idx = Number(row.dataset.i);

        if (e.target.closest(".save-btn")) {
          saveNoteDirect(idx);
        } else {
          viewNote(idx);
        }
      });

      pdfBackVideoBtn.addEventListener("click", function () {
        if (currentLecIdx >= 0) playLecture(currentLecIdx);
        else if (lectures.length) playLecture(0);
      });

      // Video event listeners
      video.addEventListener("timeupdate", function () {
        seekBar.max = video.duration || 0;
        seekBar.value = video.currentTime;
        timeDisplay.innerHTML = fmt(video.currentTime) + " <span>/ " + fmt(video.duration) + "</span>";
      });
      video.addEventListener("play", function () {
        playBtn.textContent = "⏸";
        shell.classList.remove("paused");
      });
      video.addEventListener("pause", function () {
        playBtn.textContent = "▶";
        shell.classList.add("paused");
      });
      video.addEventListener("ended", function () {
        playLecture(currentLecIdx + 1);
      });

      seekBar.addEventListener("input", function () {
        video.currentTime = Number(seekBar.value);
      });
      playBtn.addEventListener("click", function () {
        video.paused ? video.play().catch(function(){}) : video.pause();
      });
      video.addEventListener("click", function () {
        video.paused ? video.play().catch(function(){}) : video.pause();
      });

      document.getElementById("ctrl-back10").addEventListener("click", function () {
        video.currentTime = Math.max(0, video.currentTime - 10);
      });
      document.getElementById("ctrl-fwd10").addEventListener("click", function () {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      });
      document.getElementById("ctrl-prev").addEventListener("click", function () {
        playLecture(currentLecIdx - 1);
      });
      document.getElementById("ctrl-next").addEventListener("click", function () {
        playLecture(currentLecIdx + 1);
      });

      muteBtn.addEventListener("click", function () {
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? "🔇" : "🔊";
      });
      speedSelect.addEventListener("change", function (e) {
        video.playbackRate = Number(e.target.value);
      });
      qualitySelect.addEventListener("change", function (e) {
        if (hls) hls.currentLevel = Number(e.target.value);
      });
      document.getElementById("ctrl-fs").addEventListener("click", function () {
        if (!document.fullscreenElement) {
          shell.requestFullscreen && shell.requestFullscreen();
        } else {
          document.exitFullscreen && document.exitFullscreen();
        }
      });

      // Default start first lecture
      if (lectures.length) playLecture(0);
    }).catch(function (err) {
      app.innerHTML = '<div class="empty-box"><h3>Batch not found</h3><p><a class="back-btn" href="#/">← Back to All Batches</a></p></div>';
    });
  }

  /* ---------------- Router ---------------- */
  function route() {
    var hash = location.hash || "#/";
    if (hash === "#/enrolled") {
      renderHome(true);
    } else {
      var m = hash.match(/^#\/batch\/(.+)$/);
      if (m) renderBatch(decodeURIComponent(m[1]));
      else renderHome(false);
    }
  }

  window.addEventListener("hashchange", route);
  route();
})();
