const BUSINESS = Object.freeze({
  name: "Tiger Gents Salon",
  bookingUrl: "https://tigergentssaloon.setmore.com",
  mapUrl: "https://share.google/PqwDRzzGm2ZEVF8zT",
  phoneDisplay: "+971 56 228 5900",
  phoneUrl: "tel:+971562285900",
  whatsappUrl: "https://wa.me/971562285900",
  rating: "5 stars",
  hours: "10:00 AM–12:00 AM"
});

const navItems = [
  ["services.html", "Services"],
  ["team.html", "Team"],
  ["standard.html", "The Tiger Standard"],
  ["gallery.html", "Gallery"],
  ["about.html", "About"],
  ["contact.html", "Contact"]
];

const page = location.pathname.split("/").pop() || "index.html";
const relative = "";

function bookingLink(label = "Book appointment", locationName = "unknown", className = "button") {
  return `<a class="${className} js-booking" href="${BUSINESS.bookingUrl}" target="_blank" rel="noopener noreferrer" data-booking-location="${locationName}">${label}<span aria-hidden="true">↗</span></a>`;
}

function renderHeader() {
  const mount = document.querySelector("[data-site-header]");
  if (!mount) return;
  const links = navItems
    .map(([href, label]) => {
      const current = page === href ? ' aria-current="page"' : "";
      return `<li><a class="nav-link" href="${relative}${href}"${current}>${label}</a></li>`;
    })
    .join("");

  mount.innerHTML = `
    <div class="utility">
      <div class="container utility-inner">
        <span>Lake Central Tower · Business Bay, Dubai · <a class="utility-contact" href="${BUSINESS.phoneUrl}" data-track="phone_click" data-phone-location="desktop_utility">${BUSINESS.phoneDisplay}</a></span>
        <span class="utility-rating">${BUSINESS.rating} on Google · Open daily ${BUSINESS.hours}</span>
      </div>
    </div>
    <header class="site-header" data-header>
      <div class="header-inner">
        <a class="brand" href="index.html" aria-label="Tiger Gents Salon home">
          <img src="assets/brand/logo_transparent.png" alt="Tiger Gents Salon" width="1535" height="1024">
        </a>
        <nav class="site-nav" id="site-navigation" aria-label="Primary navigation">
          <ul class="nav-list">${links}</ul>
        </nav>
        <div class="header-actions">
          <a class="button button-secondary header-whatsapp" href="${BUSINESS.whatsappUrl}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_click" data-whatsapp-location="header" aria-label="Chat with Tiger Gents Salon on WhatsApp">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2a9.84 9.84 0 0 0-8.46 14.86L2 22l5.28-1.5A9.9 9.9 0 1 0 12 2Zm0 17.8a7.8 7.8 0 0 1-3.98-1.08l-.28-.17-3.13.89.91-3.04-.18-.3A7.78 7.78 0 1 1 12 19.8Zm4.27-5.83c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.76-.74.91-.14.16-.27.18-.5.06-1.38-.69-2.29-1.23-3.2-2.8-.24-.41.24-.38.69-1.27.08-.16.04-.29-.02-.41-.06-.12-.52-1.26-.72-1.72-.19-.46-.38-.39-.52-.4h-.45c-.16 0-.41.06-.63.29-.21.23-.82.8-.82 1.96s.84 2.28.96 2.44c.12.15 1.66 2.53 4.02 3.55 1.49.64 2.08.7 2.83.59.46-.07 1.38-.57 1.58-1.11.19-.55.19-1.02.13-1.12-.05-.1-.21-.16-.45-.28Z"/></svg>
            <span>WhatsApp</span>
          </a>
          ${bookingLink("Book appointment", "header", "button header-book")}
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" aria-label="Open navigation menu"><span></span></button>
        </div>
      </div>
    </header>`;
}

function renderFooter() {
  const mount = document.querySelector("[data-site-footer]");
  if (!mount) return;
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="assets/brand/logo_transparent.png" alt="Tiger Gents Salon" width="1535" height="1024" loading="lazy">
            <p>Premium grooming, personal attention, and dependable service standards in the heart of Business Bay.</p>
          </div>
          <div>
            <p class="footer-heading">Visit</p>
            <ul class="footer-links">
              <li><a href="contact.html">Lake Central Tower</a></li>
              <li><a href="${BUSINESS.mapUrl}" target="_blank" rel="noopener noreferrer" data-track="maps_click">Marasi Drive, Business Bay</a></li>
              <li><a href="${BUSINESS.mapUrl}" target="_blank" rel="noopener noreferrer" data-track="maps_click">Get directions ↗</a></li>
              <li><a href="${BUSINESS.phoneUrl}" data-track="phone_click" data-phone-location="footer_number">${BUSINESS.phoneDisplay}</a></li>
              <li><span>Daily · ${BUSINESS.hours}</span></li>
            </ul>
          </div>
          <div>
            <p class="footer-heading">Navigate</p>
            <ul class="footer-links">
              <li><a href="services.html">Services</a></li>
              <li><a href="team.html">Team</a></li>
              <li><a href="standard.html">The Tiger Standard</a></li>
              <li><a href="products.html">Product quality</a></li>
              <li><a href="gallery.html">Gallery</a></li>
              <li><a href="faq.html">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p class="footer-heading">Book & policies</p>
            <ul class="footer-links">
              <li><a class="js-booking" href="${BUSINESS.bookingUrl}" target="_blank" rel="noopener noreferrer" data-booking-location="footer">Book online ↗</a></li>
              <li><a href="${BUSINESS.whatsappUrl}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_click" data-whatsapp-location="footer">WhatsApp us ↗</a></li>
              <li><a href="${BUSINESS.phoneUrl}" data-track="phone_click" data-phone-location="footer_call_link">Call us</a></li>
              <li><a href="${BUSINESS.mapUrl}" target="_blank" rel="noopener noreferrer" data-track="google_reviews_click">Reviews on Google ↗</a></li>
              <li><a href="privacy.html">Privacy</a></li>
              <li><a href="cookies.html">Cookies</a></li>
              <li><a href="terms.html">Booking terms</a></li>
              <li><a href="accessibility.html">Accessibility</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© <span data-year></span> Tiger Gents Salon. All rights reserved.</span>
          <span>5.0 rating from 100+ customer reviews on Google.</span>
        </div>
      </div>
    </footer>`;
}

function renderMobileActions() {
  const mount = document.querySelector("[data-mobile-actions]");
  if (!mount) return;
  mount.className = "mobile-actions";
  mount.setAttribute("aria-label", "Quick actions");
  mount.innerHTML = `
    ${bookingLink("Book", "mobile_sticky")}
    <a class="button button-whatsapp" href="${BUSINESS.whatsappUrl}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_click" data-whatsapp-location="mobile_sticky" aria-label="Chat with Tiger Gents Salon on WhatsApp">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2a9.84 9.84 0 0 0-8.46 14.86L2 22l5.28-1.5A9.9 9.9 0 1 0 12 2Zm0 17.8a7.8 7.8 0 0 1-3.98-1.08l-.28-.17-3.13.89.91-3.04-.18-.3A7.78 7.78 0 1 1 12 19.8Zm4.27-5.83c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.76-.74.91-.14.16-.27.18-.5.06-1.38-.69-2.29-1.23-3.2-2.8-.24-.41.24-.38.69-1.27.08-.16.04-.29-.02-.41-.06-.12-.52-1.26-.72-1.72-.19-.46-.38-.39-.52-.4h-.45c-.16 0-.41.06-.63.29-.21.23-.82.8-.82 1.96s.84 2.28.96 2.44c.12.15 1.66 2.53 4.02 3.55 1.49.64 2.08.7 2.83.59.46-.07 1.38-.57 1.58-1.11.19-.55.19-1.02.13-1.12-.05-.1-.21-.16-.45-.28Z"/></svg>
      <span>WhatsApp</span>
    </a>
    <a class="button button-call" href="${BUSINESS.phoneUrl}" data-track="phone_click" data-phone-location="mobile_sticky" aria-label="Call Tiger Gents Salon at ${BUSINESS.phoneDisplay}">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/></svg>
      <span>Call</span>
    </a>`;
}

function renderCookieBanner() {
  const mount = document.querySelector("[data-cookie-banner]");
  if (!mount || localStorage.getItem("tiger-cookie-choice")) return;
  mount.className = "cookie-banner";
  mount.innerHTML = `
    <p><strong>Your privacy, respected.</strong><br>Essential local storage remembers your preferences. Choose whether optional analytics may be used through Google Tag Manager.</p>
    <div class="cookie-actions">
      <button class="button" type="button" data-cookie="accept">Accept optional</button>
      <button class="button button-secondary" type="button" data-cookie="essential">Essential only</button>
      <a class="text-link" href="cookies.html">Details</a>
    </div>`;
}

function track(name, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...details });
}

function initNavigation() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  if (!button || !nav) return;
  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    if (open) nav.querySelector("a")?.focus();
    else button.focus();
  };
  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") setOpen(false);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a") && document.body.classList.contains("nav-open")) setOpen(false);
  });
  matchMedia("(min-width: 1121px)").addEventListener("change", (event) => {
    if (event.matches && button.getAttribute("aria-expanded") === "true") setOpen(false);
  });
}

function initHeader() {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  const sync = () => header.classList.toggle("scrolled", scrollY > 24);
  sync();
  addEventListener("scroll", sync, { passive: true });
}

function initTracking() {
  document.addEventListener("click", (event) => {
    const booking = event.target.closest(".js-booking");
    if (booking) {
      track("booking_click", {
        booking_click_location: booking.dataset.bookingLocation || "unknown",
        booking_click_page: page,
        booking_click_device: matchMedia("(max-width: 820px)").matches ? "mobile" : "desktop"
      });
    }
    const tracked = event.target.closest("[data-track]");
    if (tracked) {
      const details = { page };
      if (tracked.dataset.track === "whatsapp_click") {
        details.whatsapp_click_location = tracked.dataset.whatsappLocation || "unknown";
      }
      if (tracked.dataset.track === "phone_click") {
        details.phone_click_location = tracked.dataset.phoneLocation || "unknown";
      }
      track(tracked.dataset.track, details);
    }
  });
}

function initReveals() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("in-view"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.12 }
  );
  items.forEach((item) => observer.observe(item));
}

function initFilters() {
  const controls = document.querySelectorAll("[data-filter]");
  const rows = document.querySelectorAll("[data-category]");
  if (!controls.length || !rows.length) return;
  controls.forEach((control) => {
    control.addEventListener("click", () => {
      const filter = control.dataset.filter;
      controls.forEach((item) => item.setAttribute("aria-pressed", String(item === control)));
      rows.forEach((row) => {
        row.hidden = filter !== "all" && row.dataset.category !== filter;
      });
      track("service_category_select", { category: filter });
    });
  });
}

function initGallery() {
  const dialog = document.querySelector(".lightbox");
  const items = [...document.querySelectorAll(".gallery-item")];
  if (!dialog || !items.length) return;
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector("[data-caption]");
  const close = () => dialog.close();
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const source = item.querySelector("img");
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      caption.textContent = source.alt;
      dialog.showModal();
      track("gallery_open", { image: source.src.split("/").pop() });
    });
  });
  dialog.querySelector("[data-close]")?.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
}

function initCookieBanner() {
  const banner = document.querySelector(".cookie-banner");
  if (!banner) return;
  banner.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-cookie]")?.dataset.cookie;
    if (!choice) return;
    localStorage.setItem("tiger-cookie-choice", choice);
    banner.hidden = true;
    track("cookie_choice", { choice });
  });
}

renderHeader();
renderFooter();
renderMobileActions();
renderCookieBanner();
document.querySelectorAll("[data-year]").forEach((node) => (node.textContent = new Date().getFullYear()));
initNavigation();
initHeader();
initTracking();
initReveals();
initFilters();
initGallery();
initCookieBanner();
