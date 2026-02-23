window.addEventListener("DOMContentLoaded", () => {
  const currentPage =
    location.pathname.split("/").pop() || "index.html";

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
      el.style.backgroundImage =
        `radial-gradient(60% 80% at 65% 40%, rgba(201, 164, 92, 0.18), rgba(201, 164, 92, 0.00) 60%),` +
        `linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.25)),` +
        `${urlValue}`;
    }
  });

  const homeHeroEl = document.querySelector(".home-hero");
  const partnerPageEl = document.querySelector(".page.page-partner");
  const homeTopWordmarkEl = homeHeroEl
    ? homeHeroEl.querySelector(".hero-wordmark-line.top")
    : null;
  const homeCharEls = homeHeroEl
    ? Array.from(homeHeroEl.querySelectorAll(".hero-char"))
    : [];
  const charRevealDelays = [60, 180, 300, 420, 540];
  const charRevealDuration = 320;
  let introTimerIds = [];
  let activeTypingCharEl = null;
  let partnerIntroTimerId = null;

  const clearHomeIntroTimers = () => {
    introTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    introTimerIds = [];
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
    const introEndDelay = 1800;
    introTimerIds.push(window.setTimeout(() => {
      homeHeroEl.classList.remove("is-typing");
    }, typingEndDelay));
    introTimerIds.push(window.setTimeout(() => {
      homeHeroEl.classList.remove("is-entering");
    }, introEndDelay));
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
    if (!homeHeroEl || !homeHeroEl.classList.contains("is-typing") || !activeTypingCharEl) return;
    updateTypingCursor(activeTypingCharEl);
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

    const showEvent = (item) => {
      const title = item.dataset.title;
      const date = item.dataset.date;
      const address = item.dataset.address;
      const image = item.dataset.image;
      const content = item.dataset.content;

      listItems.forEach(li => li.classList.remove("active"));
      item.classList.add("active");

      titleEl.textContent = title || "";
      if (dateEl) dateEl.textContent = date ? `Time: ${date}` : "";
      if (addrEl) addrEl.textContent = address ? `Location: ${address}` : "";
      if (bodyEl) {
        const normalizedContent = (content || "").replace(/\\n/g, "\n");
        bodyEl.innerHTML = normalizedContent.replace(/\n/g, "<br>");
      }
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
            const activeItem = document.querySelector(".news-item.active");
            if (activeItem && activeItem.hidden) {
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
