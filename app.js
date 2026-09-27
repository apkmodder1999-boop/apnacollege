/* Nexthope — Apna College static portal (hash router + HLS player) */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var hls = null;

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
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
  }

  /* ---------------- Home ---------------- */
  function renderHome() {
    destroyPlayer();
    app.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p style="color:var(--dim);font-size:.85rem">Loading batches…</p></div>';
    fetchJSON("data/batches.json").then(function (batches) {
      var lectures = batches.reduce(function (a, b) { return a + (b.videoCount || 0); }, 0);
      var notes = batches.reduce(function (a, b) { return a + (b.pdfCount || 0); }, 0);

      var cards = batches.map(function (b, i) {
        var badges = '<span class="badge badge-free">Free</span>' +
          (b.isPopular ? '<span class="badge badge-trending">Trending</span>' : "") +
          '<span class="badge badge-access">Full Access</span>';
        return '' +
          '<a class="card" style="animation-delay:' + Math.min(i * 40, 600) + 'ms" href="#/batch/' + encodeURIComponent(b.id) + '">' +
            '<div class="card-badges">' + badges + "</div>" +
            '<div class="card-img-wrap"><img loading="lazy" src="' + esc(b.image) + '" alt="' + esc(b.name) + '"></div>' +
            '<div class="card-body">' +
              '<div class="card-title">' + esc(b.name) + "</div>" +
              '<div class="card-meta"><span>▶ ' + (b.videoCount || 0) + ' lectures</span><span>📄 ' + (b.pdfCount || 0) + " notes</span></div>" +
            "</div>" +
          "</a>";
      }).join("");

      app.innerHTML = "" +
        '<section class="hero">' +
          '<span class="hero-badge">✦ Excellence in Learning</span>' +
          '<h1>Explore your <span class="gold">next breakthrough.</span></h1>' +
          "<p>Every Apna College batch — lectures and notes — in one premium portal. Free, secure, always on.</p>" +
          '<div class="hero-stats">' +
            "<div><strong>" + batches.length + "</strong><span>Batches</span></div>" +
            "<div><strong>" + lectures.toLocaleString() + "</strong><span>Lectures</span></div>" +
            "<div><strong>" + notes.toLocaleString() + "</strong><span>Notes</span></div>" +
          "</div>" +
          '<a class="btn-gold" href="#batches">Browse All Batches</a>' +
        "</section>" +
        '<section class="section" id="batches">' +
          '<div class="section-head">' +
            "<div><h2>All Batches</h2><p>" + batches.length + " batches available</p></div>" +
            '<input id="q" class="search-input" type="search" placeholder="Search batches…" />' +
          "</div>" +
          '<div class="grid" id="grid">' + cards + "</div>" +
        "</section>";

      var q = document.getElementById("q");
      q.addEventListener("input", function () {
        var term = q.value.toLowerCase();
        document.querySelectorAll("#grid .card").forEach(function (c) {
          var name = c.querySelector(".card-title").textContent.toLowerCase();
          c.style.display = name.indexOf(term) >= 0 ? "" : "none";
        });
      });
      if (location.hash === "#batches") {
        document.getElementById("batches").scrollIntoView();
      }
    }).catch(function () {
      app.innerHTML = '<div class="empty"><h2>Could not load batches</h2><p>Serve this folder over HTTP (e.g. GitHub Pages) — file:// will not work.</p></div>';
    });
  }

  /* ---------------- Batch detail ---------------- */
  function renderBatch(id) {
    destroyPlayer();
    app.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p style="color:var(--dim);font-size:.85rem">Loading batch…</p></div>';
    fetchJSON("data/batch/" + encodeURIComponent(id) + ".json").then(function (b) {
      var lectures = (b.lectures || []).slice().sort(function (a, c) { return (a.orderIdx || 0) - (c.orderIdx || 0); });
      var notes = (b.notes || []).slice().sort(function (a, c) { return (a.orderIdx || 0) - (c.orderIdx || 0); });

      var noteItems = notes.map(function (n) {
        return '<a class="note-item" href="' + esc(n.url) + '" target="_blank" rel="noopener"><span class="pdf">PDF</span><span>' + esc(n.title) + "</span></a>";
      }).join("");

      app.innerHTML = "" +
        '<section class="batch-hero">' +
          '<a class="back-link" href="#/">← Back to all batches</a>' +
          '<div class="batch-head">' +
            '<img src="' + esc(b.image) + '" alt="' + esc(b.name) + '">' +
            "<div><h1>" + esc(b.name) + '</h1><p class="meta">▶ ' + lectures.length + " lectures &nbsp;·&nbsp; 📄 " + notes.length + " notes</p></div>" +
          "</div>" +
        "</section>" +
        '<section class="layout">' +
          "<div>" +
            '<div class="player-shell paused" id="shell">' +
              '<video id="video" playsinline></video>' +
              '<div class="player-title"><span class="live-dot"></span><div style="min-width:0"><small>Now Playing</small><p id="np-title">Select a lecture</p></div></div>' +
              '<div class="player-status" id="status"><p>Select a lecture from the list to start watching.</p></div>' +
              '<div class="player-controls">' +
                '<input type="range" class="seek" id="seek" min="0" max="0" step="0.1" value="0" aria-label="Seek">' +
                '<div class="ctrl-row">' +
                  '<button class="ctrl-btn" id="prev" title="Previous">⏮</button>' +
                  '<button class="ctrl-btn" id="back10" title="Back 10s">⏪</button>' +
                  '<button class="ctrl-btn primary" id="play" title="Play/Pause">▶</button>' +
                  '<button class="ctrl-btn" id="fwd10" title="Forward 10s">⏩</button>' +
                  '<button class="ctrl-btn" id="next" title="Next">⏭</button>' +
                  '<button class="ctrl-btn" id="mute" title="Mute">🔊</button>' +
                  '<span class="ctrl-time" id="time">00:00 <span>/ 00:00</span></span>' +
                  '<span class="ctrl-spacer"></span>' +
                  '<select class="ctrl-select" id="speed" title="Speed">' +
                    [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(function (s) { return '<option value="' + s + '"' + (s === 1 ? " selected" : "") + ">" + s + "x</option>"; }).join("") +
                  "</select>" +
                  '<select class="ctrl-select" id="quality" title="Quality" style="display:none"></select>' +
                  '<button class="ctrl-btn" id="fs" title="Fullscreen">⛶</button>' +
                "</div>" +
              "</div>" +
            "</div>" +
            '<p class="now-playing">Now playing: <span id="np-name">—</span></p>' +
          "</div>" +
          '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
            '<div class="panel"><h3>Lectures (' + lectures.length + ')</h3>' +
              '<input class="search-input" id="lq" type="search" placeholder="Search lectures…">' +
              '<div class="lecture-list" id="llist"></div>' +
            "</div>" +
            (notes.length ? '<div class="panel"><h3>Notes (' + notes.length + ')</h3><div class="note-list">' + noteItems + "</div></div>" : "") +
          "</div>" +
        "</section>";

      var video = document.getElementById("video");
      var shell = document.getElementById("shell");
      var status = document.getElementById("status");
      var seek = document.getElementById("seek");
      var timeEl = document.getElementById("time");
      var playBtn = document.getElementById("play");
      var npTitle = document.getElementById("np-title");
      var npName = document.getElementById("np-name");
      var llist = document.getElementById("llist");
      var qualitySel = document.getElementById("quality");
      var current = -1;

      function renderList(filter) {
        var term = (filter || "").toLowerCase();
        llist.innerHTML = lectures.map(function (l, i) {
          if (term && l.title.toLowerCase().indexOf(term) < 0) return "";
          return '<button class="lecture-item' + (i === current ? " active" : "") + '" data-i="' + i + '">' +
            '<span class="num">' + String(i + 1).padStart(2, "0") + "</span>" +
            '<span class="ttl">' + esc(l.title) + "</span></button>";
        }).join("");
      }
      renderList("");
      document.getElementById("lq").addEventListener("input", function (e) { renderList(e.target.value); });
      llist.addEventListener("click", function (e) {
        var btn = e.target.closest(".lecture-item");
        if (btn) playLecture(Number(btn.dataset.i));
      });

      function setStatus(html) {
        if (!html) { status.style.display = "none"; return; }
        status.style.display = "flex";
        status.innerHTML = html;
      }

      function playLecture(i) {
        if (i < 0 || i >= lectures.length) return;
        current = i;
        var lec = lectures[i];
        npTitle.textContent = lec.title;
        npName.textContent = lec.title;
        renderList(document.getElementById("lq").value);
        destroyPlayer();
        setStatus('<div class="spinner"></div><p><strong>Preparing your lecture…</strong></p><p>Secure adaptive stream</p>');
        video.muted = false;

        function onReady() { setStatus(null); video.play().catch(function () {}); }

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
                opts.push('<option value="' + idx + '">' + label + "</option>");
              });
              qualitySel.innerHTML = opts.join("");
              qualitySel.style.display = "";
            } else {
              qualitySel.style.display = "none";
            }
          });
          hls.on(window.Hls.Events.ERROR, function (_e, data) {
            if (!data.fatal) return;
            if (recoveries < 3) {
              recoveries++;
              if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) { hls.startLoad(); return; }
              if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; }
            }
            setStatus("<p><strong>Playback unavailable</strong></p><p>This stream is temporarily unavailable. Try the next lecture.</p>");
          });
        } else {
          video.src = lec.link;
          video.addEventListener("loadedmetadata", onReady, { once: true });
          video.play().catch(function () {});
        }
      }

      video.addEventListener("timeupdate", function () {
        seek.max = video.duration || 0;
        seek.value = video.currentTime;
        timeEl.innerHTML = fmt(video.currentTime) + " <span>/ " + fmt(video.duration) + "</span>";
      });
      video.addEventListener("play", function () { playBtn.textContent = "⏸"; shell.classList.remove("paused"); });
      video.addEventListener("pause", function () { playBtn.textContent = "▶"; shell.classList.add("paused"); });
      video.addEventListener("waiting", function () { if (current >= 0) setStatus('<div class="spinner"></div>'); });
      video.addEventListener("playing", function () { setStatus(null); });
      video.addEventListener("ended", function () { playLecture(current + 1); });
      video.addEventListener("error", function () {
        if (current >= 0) setStatus("<p><strong>Playback unavailable</strong></p><p>Playback error. Please try another lecture.</p>");
      });

      seek.addEventListener("input", function () { video.currentTime = Number(seek.value); });
      playBtn.addEventListener("click", function () { video.paused ? video.play().catch(function(){}) : video.pause(); });
      video.addEventListener("click", function () { video.paused ? video.play().catch(function(){}) : video.pause(); });
      document.getElementById("back10").addEventListener("click", function () { video.currentTime = Math.max(0, video.currentTime - 10); });
      document.getElementById("fwd10").addEventListener("click", function () { video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); });
      document.getElementById("prev").addEventListener("click", function () { playLecture(current - 1); });
      document.getElementById("next").addEventListener("click", function () { playLecture(current + 1); });
      document.getElementById("mute").addEventListener("click", function () {
        video.muted = !video.muted;
        this.textContent = video.muted ? "🔇" : "🔊";
      });
      document.getElementById("speed").addEventListener("change", function (e) { video.playbackRate = Number(e.target.value); });
      qualitySel.addEventListener("change", function (e) { if (hls) hls.currentLevel = Number(e.target.value); });
      document.getElementById("fs").addEventListener("click", function () {
        if (!document.fullscreenElement) { shell.requestFullscreen && shell.requestFullscreen(); }
        else { document.exitFullscreen && document.exitFullscreen(); }
      });
      document.addEventListener("keydown", function (e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
        if (e.key === " ") { e.preventDefault(); playBtn.click(); }
        if (e.key === "ArrowRight") video.currentTime += 10;
        if (e.key === "ArrowLeft") video.currentTime -= 10;
        if (e.key === "f") document.getElementById("fs").click();
        if (e.key === "m") document.getElementById("mute").click();
      });

      if (lectures.length) playLecture(0);
    }).catch(function () {
      app.innerHTML = '<div class="empty"><h2>Batch not found</h2><p><a class="back-link" href="#/">← Back to all batches</a></p></div>';
    });
  }

  /* ---------------- Router ---------------- */
  function route() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/batch\/(.+)$/);
    if (m) renderBatch(decodeURIComponent(m[1]));
    else renderHome();
  }
  window.addEventListener("hashchange", route);
  route();
})();
