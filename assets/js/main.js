window.addEventListener("DOMContentLoaded", () => {
  const currentPage =
    location.pathname.split("/").pop() || "index.html";
  const bgOverlayGradient =
    "radial-gradient(60% 80% at 65% 40%, rgba(201, 164, 92, 0.18), rgba(201, 164, 92, 0.00) 60%)," +
    "linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.25))";

  document.querySelectorAll(".nav a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("active");
    }
  });

  document.querySelectorAll("[data-bg]").forEach(el => {
    const bg = el.dataset.bg;
    if (bg) {
      const normalized = bg.replace(/\\/g, "/");
      const urlValue = `url("${normalized}")`;
      el.style.setProperty("--bg", urlValue);
      el.style.backgroundImage = `${bgOverlayGradient},${urlValue}`;
    }
  });

  const homeHeroEl = document.querySelector(".home-hero");
  const partnerPageEl = document.querySelector(".page.page-partner");
  const homeTopWordmarkEl = homeHeroEl
    ? homeHeroEl.querySelector(".hero-wordmark-line.top")
    : null;
  const handwritingLayerEl = document.querySelector(".hero-handwriting-layer");
  const homeCharEls = homeHeroEl
    ? Array.from(homeHeroEl.querySelectorAll(".hero-char"))
    : [];
  const charRevealDelays = [60, 180, 300, 420, 540];
  const charRevealDuration = 320;
  const handwritingWords = [
    "Guten Tag!",
    "Moin!",
    "Hallo!",
    "Servus!",
    "Grüß dich!",
    "Grüß Gott!",
    "Wie geht’s?",
    "Alles gut?",
    "Was geht?",
    "Freut mich!",
    "Willkommen!",
    "Guten Morgen!",
    "Guten Abend!",
    "Gute Nacht!",
    "Danke!",
    "Danke schön!",
    "Bitte!",
    "Kein Problem!",
    "Alles klar!",
    "Genau!",
    "Super!",
    "Tschüss!"
  ];
  const handwritingConcurrentMinBase = 5;
  const handwritingConcurrentMaxBase = 6;
  const handwritingSpawnDelayMinBase = 1100;
  const handwritingSpawnDelayMaxBase = 2200;
  const handwritingWordDurationMinBase = 2600;
  const handwritingWordDurationMaxBase = 4600;
  const handwritingPlacementAttemptsBase = 28;
  const handwritingCollisionPaddingBase = 14;
  const handwritingViewportBaseWidth = 2560;
  const handwritingViewportBaseHeight = 1440;
  const introEndDelay = 1800;
  let introTimerIds = [];
  let activeTypingCharEl = null;
  let partnerIntroTimerId = null;
  let handwritingStartTimerId = null;
  let handwritingLoopTimerId = null;
  let handwritingWordIndex = 0;
  let typingResizeQueued = false;

  const clearHomeIntroTimers = () => {
    introTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    introTimerIds = [];
  };

  const clearHandwritingTimers = () => {
    if (handwritingStartTimerId) {
      window.clearTimeout(handwritingStartTimerId);
      handwritingStartTimerId = null;
    }
    if (handwritingLoopTimerId) {
      window.clearTimeout(handwritingLoopTimerId);
      handwritingLoopTimerId = null;
    }
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getHandwritingViewportScale = () => {
    const widthScale = window.innerWidth / handwritingViewportBaseWidth;
    const heightScale = window.innerHeight / handwritingViewportBaseHeight;
    return clamp(Math.min(widthScale, heightScale), 0.42, 1);
  };

  const isHandwritingViewportSupported = () => {
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    const longSide = Math.max(window.innerWidth, window.innerHeight);
    return shortSide >= 320 && longSide >= 568;
  };

  const getHandwritingSpawnDelayRange = () => {
    const scale = getHandwritingViewportScale();
    const delayFactor = clamp(1 / scale, 1, 1.8);
    return {
      min: Math.round(handwritingSpawnDelayMinBase * delayFactor),
      max: Math.round(handwritingSpawnDelayMaxBase * delayFactor)
    };
  };

  const getHandwritingWordDurationRange = () => {
    const scale = getHandwritingViewportScale();
    const durationFactor = clamp(1 / scale, 1, 1.45);
    return {
      min: Math.round(handwritingWordDurationMinBase * durationFactor),
      max: Math.round(handwritingWordDurationMaxBase * durationFactor)
    };
  };

  const getHandwritingConcurrentRange = () => {
    const scale = getHandwritingViewportScale();
    const minConcurrent = Math.max(2, Math.round(handwritingConcurrentMinBase * scale));
    const maxConcurrent = Math.max(minConcurrent, Math.round(handwritingConcurrentMaxBase * scale));
    return {
      min: minConcurrent,
      max: maxConcurrent
    };
  };

  const clearHandwritingWords = () => {
    if (handwritingLayerEl) handwritingLayerEl.innerHTML = "";
  };

  const getRandomInRange = (min, max) => {
    if (max <= min) return min;
    return min + Math.random() * (max - min);
  };

  const getRandomIntInRange = (min, max) => {
    if (max <= min) return min;
    return Math.floor(getRandomInRange(min, max + 1));
  };

  const getHomeHeroContentRect = () => {
    if (!homeHeroEl) return null;

    const heroContentNodes = [
      homeHeroEl.querySelector(".hero-wordmark-line.top"),
      homeHeroEl.querySelector(".hero-wordmark-line.bottom"),
      homeHeroEl.querySelector(".hero-hint")
    ];

    const heroContentRects = heroContentNodes
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect())
      .filter((rect) => rect.width && rect.height);

    if (!heroContentRects.length) {
      const heroRect = homeHeroEl.getBoundingClientRect();
      return heroRect.width && heroRect.height ? heroRect : null;
    }

    return heroContentRects.reduce((acc, rect) => ({
      left: Math.min(acc.left, rect.left),
      right: Math.max(acc.right, rect.right),
      top: Math.min(acc.top, rect.top),
      bottom: Math.max(acc.bottom, rect.bottom),
      width: Math.max(acc.right, rect.right) - Math.min(acc.left, rect.left),
      height: Math.max(acc.bottom, rect.bottom) - Math.min(acc.top, rect.top)
    }));
  };

  const getHandwritingPositionOutsideHero = () => {
    if (!homeHeroEl || !handwritingLayerEl) return null;

    const heroRect = getHomeHeroContentRect();
    if (!heroRect || !heroRect.width || !heroRect.height) return null;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportScale = getHandwritingViewportScale();
    const viewportPadding = Math.max(26, Math.round(110 * viewportScale));
    const safeGap = Math.max(10, Math.round(26 * viewportScale));
    const sideDepth = Math.max(56, Math.round(140 * viewportScale));

    const zones = [
      {
        xMin: Math.max(viewportPadding, heroRect.left),
        xMax: Math.min(viewportWidth - viewportPadding, heroRect.right),
        yMin: viewportPadding,
        yMax: Math.min(viewportHeight - viewportPadding, heroRect.top - safeGap)
      },
      {
        xMin: Math.max(viewportPadding, heroRect.left),
        xMax: Math.min(viewportWidth - viewportPadding, heroRect.right),
        yMin: Math.max(viewportPadding, heroRect.bottom + safeGap),
        yMax: Math.min(viewportHeight - viewportPadding, heroRect.bottom + sideDepth)
      },
      {
        xMin: Math.max(viewportPadding, heroRect.left - sideDepth),
        xMax: Math.min(viewportWidth - viewportPadding, heroRect.left - safeGap),
        yMin: Math.max(viewportPadding, heroRect.top),
        yMax: Math.min(viewportHeight - viewportPadding, heroRect.bottom)
      },
      {
        xMin: Math.max(viewportPadding, heroRect.right + safeGap),
        xMax: Math.min(viewportWidth - viewportPadding, heroRect.right + sideDepth),
        yMin: Math.max(viewportPadding, heroRect.top),
        yMax: Math.min(viewportHeight - viewportPadding, heroRect.bottom)
      }
    ].filter((zone) => zone.xMax - zone.xMin > 24 && zone.yMax - zone.yMin > 20);

    if (zones.length) {
      const zone = zones[Math.floor(Math.random() * zones.length)];

      return {
        x: getRandomInRange(zone.xMin, zone.xMax),
        y: getRandomInRange(zone.yMin, zone.yMax)
      };
    }

    const anchorRect = getHomeHeroContentRect();
    if (!anchorRect || !anchorRect.width || !anchorRect.height) return null;

    const centerX = anchorRect.left + anchorRect.width / 2;
    const centerY = anchorRect.top + anchorRect.height / 2;
    const deadZoneHalfW = Math.max(160, anchorRect.width * 0.68);
    const deadZoneHalfH = Math.max(70, anchorRect.height * 1.45);

    const fallbackZones = [
      {
        xMin: viewportPadding,
        xMax: viewportWidth - viewportPadding,
        yMin: viewportPadding,
        yMax: Math.max(viewportPadding, centerY - deadZoneHalfH - safeGap)
      },
      {
        xMin: viewportPadding,
        xMax: viewportWidth - viewportPadding,
        yMin: Math.min(viewportHeight - viewportPadding, centerY + deadZoneHalfH + safeGap),
        yMax: viewportHeight - viewportPadding
      },
      {
        xMin: viewportPadding,
        xMax: Math.max(viewportPadding, centerX - deadZoneHalfW - safeGap),
        yMin: Math.max(viewportPadding, centerY - deadZoneHalfH),
        yMax: Math.min(viewportHeight - viewportPadding, centerY + deadZoneHalfH)
      },
      {
        xMin: Math.min(viewportWidth - viewportPadding, centerX + deadZoneHalfW + safeGap),
        xMax: viewportWidth - viewportPadding,
        yMin: Math.max(viewportPadding, centerY - deadZoneHalfH),
        yMax: Math.min(viewportHeight - viewportPadding, centerY + deadZoneHalfH)
      }
    ].filter((zone) => zone.xMax - zone.xMin > 24 && zone.yMax - zone.yMin > 20);

    if (!fallbackZones.length) return null;
    const fallbackZone = fallbackZones[Math.floor(Math.random() * fallbackZones.length)];

    return {
      x: getRandomInRange(fallbackZone.xMin, fallbackZone.xMax),
      y: getRandomInRange(fallbackZone.yMin, fallbackZone.yMax)
    };
  };

  const getGuaranteedVisibleFallbackPosition = () => {
    const heroRect = getHomeHeroContentRect();
    if (!heroRect) return { x: Math.max(120, window.innerWidth * 0.22), y: Math.max(120, window.innerHeight * 0.24) };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportScale = getHandwritingViewportScale();
    const padding = Math.max(28, Math.round(120 * viewportScale));
    const verticalOffset = Math.max(12, Math.round(34 * viewportScale));
    const sideOffset = Math.max(16, Math.round(42 * viewportScale));

    const candidates = [
      { x: heroRect.left + heroRect.width * 0.5, y: heroRect.top - verticalOffset },
      { x: heroRect.left + heroRect.width * 0.5, y: heroRect.bottom + verticalOffset },
      { x: heroRect.left - sideOffset, y: heroRect.top + heroRect.height * 0.45 },
      { x: heroRect.right + sideOffset, y: heroRect.top + heroRect.height * 0.45 }
    ];

    const visibleCandidate = candidates.find((point) =>
      point.x >= padding &&
      point.x <= viewportWidth - padding &&
      point.y >= padding &&
      point.y <= viewportHeight - padding
    );

    if (visibleCandidate) return visibleCandidate;

    const first = candidates[0];
    return {
      x: Math.min(viewportWidth - padding, Math.max(padding, first.x)),
      y: Math.min(viewportHeight - padding, Math.max(padding, first.y))
    };
  };

  const expandRect = (rect, padding) => ({
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding
  });

  const rectsOverlap = (a, b) =>
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top;

  const getWordViewportEdgePadding = () =>
    Math.max(12, Math.round(20 * getHandwritingViewportScale()));

  const getForbiddenHandwritingRects = () => {
    const forbiddenRects = [];
    const collisionPadding = Math.max(6, Math.round(handwritingCollisionPaddingBase * getHandwritingViewportScale()));
    const structurePadding = collisionPadding + 4;
    const heroContentPadding = collisionPadding + 8;
    const structuralEls = [
      document.querySelector(".topbar"),
      document.querySelector(".topbar .nav"),
      document.querySelector(".footer")
    ];

    structuralEls.forEach((el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      forbiddenRects.push(expandRect(rect, structurePadding));
    });

    const heroContentRect = getHomeHeroContentRect();
    if (heroContentRect && heroContentRect.width && heroContentRect.height) {
      forbiddenRects.push(expandRect(heroContentRect, heroContentPadding));
    }

    return forbiddenRects;
  };

  const isWithinViewportSafeArea = (rect) => {
    const edgePadding = getWordViewportEdgePadding();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return (
      rect.left >= edgePadding &&
      rect.right <= viewportWidth - edgePadding &&
      rect.top >= edgePadding &&
      rect.bottom <= viewportHeight - edgePadding
    );
  };

  const canPlaceHandwritingWord = (wordEl, position) => {
    if (!handwritingLayerEl) return false;

    wordEl.style.left = `${position.x}px`;
    wordEl.style.top = `${position.y}px`;

    const wordRect = wordEl.getBoundingClientRect();
    if (!wordRect.width || !wordRect.height) return false;

    const collisionPadding = Math.max(6, Math.round(handwritingCollisionPaddingBase * getHandwritingViewportScale()));
    const candidateRect = expandRect(wordRect, collisionPadding);

    if (!isWithinViewportSafeArea(candidateRect)) return false;

    const forbiddenRects = getForbiddenHandwritingRects();
    const intersectsStructure = forbiddenRects.some((forbiddenRect) => rectsOverlap(candidateRect, forbiddenRect));
    if (intersectsStructure) return false;

    const activeWords = Array.from(handwritingLayerEl.querySelectorAll(".hero-handwriting-word"));

    return activeWords.every((activeWordEl) => {
      if (activeWordEl === wordEl) return true;
      const activeRect = activeWordEl.getBoundingClientRect();
      if (!activeRect.width || !activeRect.height) return true;
      return !rectsOverlap(candidateRect, activeRect);
    });
  };

  const showNextHandwritingWord = () => {
    if (!homeHeroEl || !handwritingLayerEl || !homeTopWordmarkEl || homeHeroEl.classList.contains("is-typing")) return;
    if (!isHandwritingViewportSupported()) return;
    if (!handwritingWords.length) return;

    const word = handwritingWords[handwritingWordIndex % handwritingWords.length];
    handwritingWordIndex += 1;
    const tilt = -12 + Math.random() * 24;
    const wordDurationRange = getHandwritingWordDurationRange();
    const wordDuration = getRandomInRange(wordDurationRange.min, wordDurationRange.max);

    const wordEl = document.createElement("span");
    wordEl.className = "hero-handwriting-word";
    wordEl.textContent = word;
    wordEl.style.setProperty("--word-tilt", `${tilt}deg`);
    wordEl.style.animationDuration = `${wordDuration}ms`;
    wordEl.style.visibility = "hidden";
    handwritingLayerEl.appendChild(wordEl);

    let placed = false;
    const placementAttemptFactor = clamp(1 / getHandwritingViewportScale(), 1, 2);
    const placementAttempts = Math.round(handwritingPlacementAttemptsBase * placementAttemptFactor);
    for (let attempt = 0; attempt < placementAttempts; attempt += 1) {
      const candidatePosition = getHandwritingPositionOutsideHero() || getGuaranteedVisibleFallbackPosition();
      if (canPlaceHandwritingWord(wordEl, candidatePosition)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      const fallbackPosition = getGuaranteedVisibleFallbackPosition();
      placed = canPlaceHandwritingWord(wordEl, fallbackPosition);
    }

    if (!placed) {
      wordEl.remove();
      return;
    }

    wordEl.style.visibility = "";

    window.requestAnimationFrame(() => {
      wordEl.classList.add("is-showing");
    });

    window.setTimeout(() => {
      wordEl.remove();
    }, wordDuration + 140);
  };

  const scheduleHandwritingWords = () => {
    if (!homeHeroEl || !handwritingLayerEl || !homeTopWordmarkEl || document.hidden) return;
    if (!isHandwritingViewportSupported()) {
      clearHandwritingTimers();
      clearHandwritingWords();
      return;
    }
    const spawnDelayRange = getHandwritingSpawnDelayRange();
    if (homeHeroEl.classList.contains("is-entering") || homeHeroEl.classList.contains("is-typing")) {
      const retryDelay = getRandomInRange(spawnDelayRange.min, spawnDelayRange.max);
      handwritingLoopTimerId = window.setTimeout(scheduleHandwritingWords, retryDelay);
      return;
    }

    const concurrentRange = getHandwritingConcurrentRange();
    const targetConcurrentCount = getRandomIntInRange(concurrentRange.min, concurrentRange.max);
    const activeCount = handwritingLayerEl.querySelectorAll(".hero-handwriting-word").length;
    if (activeCount < targetConcurrentCount) {
      showNextHandwritingWord();
    }

    const nextDelay = getRandomInRange(spawnDelayRange.min, spawnDelayRange.max);
    handwritingLoopTimerId = window.setTimeout(scheduleHandwritingWords, nextDelay);
  };

  const startHandwritingLoop = () => {
    clearHandwritingTimers();
    if (!homeHeroEl || !handwritingLayerEl || !homeTopWordmarkEl) return;
    if (!isHandwritingViewportSupported()) {
      clearHandwritingWords();
      return;
    }

    const startDelay = introEndDelay + 180;
    handwritingStartTimerId = window.setTimeout(() => {
      scheduleHandwritingWords();
    }, startDelay);
  };

  const updateTypingCursor = (charEl) => {
    if (!homeTopWordmarkEl || !charEl) return;
    const lineRect = homeTopWordmarkEl.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();
    const cursorX = charRect.right - lineRect.left + 3;
    const cursorTop = charRect.top - lineRect.top + Math.max(2, charRect.height * 0.09);
    const cursorHeight = Math.max(18, charRect.height * 0.82);

    homeTopWordmarkEl.style.setProperty("--typing-cursor-x", `${cursorX}px`);
    homeTopWordmarkEl.style.setProperty("--typing-cursor-top", `${cursorTop}px`);
    homeTopWordmarkEl.style.setProperty("--typing-cursor-height", `${cursorHeight}px`);
    activeTypingCharEl = charEl;
  };

  const playHomeHeroIntro = () => {
    if (!homeHeroEl) return;
    clearHomeIntroTimers();
    clearHandwritingTimers();
    clearHandwritingWords();
    homeHeroEl.classList.remove("is-entering", "is-typing");
    void homeHeroEl.offsetWidth;
    homeHeroEl.classList.add("is-entering", "is-typing");

    homeCharEls.forEach((charEl, index) => {
      const timerId = window.setTimeout(() => {
        updateTypingCursor(charEl);
      }, charRevealDelays[index] || 0);
      introTimerIds.push(timerId);
    });

    const typingEndDelay = (charRevealDelays[charRevealDelays.length - 1] || 0) + charRevealDuration + 60;
    introTimerIds.push(window.setTimeout(() => {
      homeHeroEl.classList.remove("is-typing");
    }, typingEndDelay));
    introTimerIds.push(window.setTimeout(() => {
      homeHeroEl.classList.remove("is-entering");
    }, introEndDelay));

    startHandwritingLoop();
  };

  const clearPartnerIntroTimer = () => {
    if (partnerIntroTimerId) {
      window.clearTimeout(partnerIntroTimerId);
      partnerIntroTimerId = null;
    }
  };

  const playPartnerIntro = () => {
    if (!partnerPageEl) return;
    clearPartnerIntroTimer();
    partnerPageEl.classList.remove("is-entering");
    void partnerPageEl.offsetWidth;
    partnerPageEl.classList.add("is-entering");

    partnerIntroTimerId = window.setTimeout(() => {
      partnerPageEl.classList.remove("is-entering");
    }, 1400);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      playHomeHeroIntro();
      playPartnerIntro();
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      playHomeHeroIntro();
      playPartnerIntro();
    }
  });

  window.addEventListener("resize", () => {
    if (!homeHeroEl || !handwritingLayerEl) return;

    if (!isHandwritingViewportSupported()) {
      clearHandwritingTimers();
      clearHandwritingWords();
    } else if (!document.hidden && !homeHeroEl.classList.contains("is-entering") && !handwritingStartTimerId && !handwritingLoopTimerId) {
      startHandwritingLoop();
    }

    if (!homeHeroEl.classList.contains("is-typing") || !activeTypingCharEl) return;
    if (typingResizeQueued) return;
    typingResizeQueued = true;

    window.requestAnimationFrame(() => {
      typingResizeQueued = false;
      if (homeHeroEl.classList.contains("is-typing") && activeTypingCharEl) {
        updateTypingCursor(activeTypingCharEl);
      }
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (!homeHeroEl) return;
    if (document.hidden) {
      clearHandwritingTimers();
      return;
    }
    if (!isHandwritingViewportSupported()) {
      clearHandwritingWords();
      return;
    }
    if (!homeHeroEl.classList.contains("is-entering")) {
      startHandwritingLoop();
    }
  });

  const listItems = document.querySelectorAll(".news-item");
  const imageEl = document.querySelector(".news-image");
  const titleEl = document.querySelector(".news-title");
  const dateEl = document.querySelector(".news-date");
  const addrEl = document.querySelector(".news-address");
  const bodyEl = document.querySelector(".news-body");
  const newsListEl = document.querySelector(".news-list");
  const toggleBtnEl = document.querySelector(".news-list-toggle");

  if (listItems.length && imageEl && titleEl) {
    let activeNewsItem = null;

    const setMultilineText = (el, rawText) => {
      if (!el) return;
      const normalizedText = (rawText || "").replace(/\\n/g, "\n");
      const lines = normalizedText.split("\n");
      el.textContent = "";

      lines.forEach((line, idx) => {
        if (idx > 0) {
          el.appendChild(document.createElement("br"));
        }
        el.appendChild(document.createTextNode(line));
      });
    };

    const showEvent = (item) => {
      const title = item.dataset.title;
      const date = item.dataset.date;
      const address = item.dataset.address;
      const image = item.dataset.image;
      const content = item.dataset.content;

      if (activeNewsItem && activeNewsItem !== item) {
        activeNewsItem.classList.remove("active");
      }
      item.classList.add("active");
      activeNewsItem = item;

      titleEl.textContent = title || "";
      if (dateEl) dateEl.textContent = date ? `Time: ${date}` : "";
      if (addrEl) addrEl.textContent = address ? `Location: ${address}` : "";
      setMultilineText(bodyEl, content);
      if (image) imageEl.setAttribute("src", image);
    };

    listItems.forEach(item => {
      item.addEventListener("click", () => showEvent(item));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showEvent(item);
        }
      });
    });

    showEvent(listItems[0]);

    if (newsListEl && toggleBtnEl) {
      const maxItems = Number.parseInt(newsListEl.dataset.maxItems || "", 10);
      if (Number.isFinite(maxItems) && maxItems > 0 && listItems.length > maxItems) {
        let expanded = false;

        const updateCollapsedState = () => {
          listItems.forEach((item, idx) => {
            item.hidden = !expanded && idx >= maxItems;
          });

          const hiddenCount = Math.max(0, listItems.length - maxItems);
          toggleBtnEl.hidden = false;
          toggleBtnEl.textContent = expanded ? "Collapse" : `Show more (+${hiddenCount})`;
          toggleBtnEl.setAttribute("aria-expanded", String(expanded));
        };

        toggleBtnEl.addEventListener("click", () => {
          expanded = !expanded;

          if (!expanded) {
            if (activeNewsItem && activeNewsItem.hidden) {
              showEvent(listItems[0]);
            }
          }

          updateCollapsedState();
        });

        updateCollapsedState();
      } else {
        toggleBtnEl.hidden = true;
      }
    }
  }

  const aboutSliders = document.querySelectorAll("[data-about-slider]");

  const initAboutSlider = (rootEl) => {
    const track = rootEl.querySelector(".about-slider-track");
    const slides = Array.from(rootEl.querySelectorAll(".about-slide"));
    const prevBtn = rootEl.querySelector(".about-slider-btn.prev");
    const nextBtn = rootEl.querySelector(".about-slider-btn.next");
    const counterEl = rootEl.querySelector(".about-slider-counter");

    if (!track || slides.length === 0) return;

    let index = 0;

    const setIndex = (nextIndex) => {
      const len = slides.length;
      index = ((nextIndex % len) + len) % len;
      track.style.transform = `translateX(${-index * 100}%)`;
      if (counterEl) counterEl.textContent = `${index + 1} / ${len}`;
    };

    if (prevBtn) prevBtn.addEventListener("click", () => setIndex(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => setIndex(index + 1));

    rootEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex(index + 1);
      }
    });

    setIndex(0);
  };

  aboutSliders.forEach(initAboutSlider);

  const aboutSwitchers = document.querySelectorAll("[data-about-switcher]");

  const initAboutSwitcher = (rootEl) => {
    const tabs = Array.from(rootEl.querySelectorAll(".about-media-tab"));
    const panels = Array.from(rootEl.querySelectorAll(".about-media-panel"));
    if (tabs.length === 0 || panels.length === 0) return;

    const setActive = (name) => {
      tabs.forEach((tabEl) => {
        const active = tabEl.dataset.target === name;
        tabEl.classList.toggle("is-active", active);
        tabEl.setAttribute("aria-selected", String(active));
      });

      panels.forEach((panelEl) => {
        const active = panelEl.dataset.panel === name;
        panelEl.classList.toggle("is-active", active);
      });
    };

    const initialTab = tabs.find(t => t.classList.contains("is-active")) || tabs[0];
    setActive(initialTab.dataset.target);

    tabs.forEach((tabEl) => {
      tabEl.addEventListener("click", () => setActive(tabEl.dataset.target));
    });
  };

  aboutSwitchers.forEach(initAboutSwitcher);

  const contentSections = document.querySelectorAll("section.content");
  contentSections.forEach((sectionEl, idx) => {
    if (sectionEl.querySelector("[data-content-anchor]")) return;
    const anchor = document.createElement("div");
    anchor.dataset.contentAnchor = "true";
    anchor.id = `content-anchor-${idx + 1}`;
    sectionEl.appendChild(anchor);
  });

  let lastContentAnchor = null;

  const getFullscreenElement = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;

  const handleFullscreenChange = () => {
    const fullscreenEl = getFullscreenElement();
    if (fullscreenEl && fullscreenEl.tagName === "VIDEO") {
      const contentEl = fullscreenEl.closest("section.content");
      if (contentEl) {
        lastContentAnchor = contentEl.querySelector("[data-content-anchor]");
      }
      return;
    }

    if (!fullscreenEl && lastContentAnchor) {
      lastContentAnchor.scrollIntoView({ behavior: "auto", block: "end" });
    }
  };

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

});
