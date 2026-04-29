const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');
const revealItems = document.querySelectorAll('.reveal');
const inquiryForm = document.getElementById('inquiry-form');
const formStatus = document.getElementById('form-status');
const yearEl = document.getElementById('year');
const galleryGrid = document.getElementById('gallery-grid');
const galleryLoadMore = document.getElementById('gallery-load-more');
const galleryShowLess = document.getElementById('gallery-show-less');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxCaption = document.getElementById('lightbox-caption');
const mobileMenuBreakpoint = window.matchMedia('(max-width: 860px)');
let lastLightboxTrigger = null;

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const closeMenu = () => {
  if (!navMenu || !navToggle) {
    return;
  }

  navMenu.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
};

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('click', (event) => {
    if (!mobileMenuBreakpoint.matches) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!navMenu.contains(target) && !navToggle.contains(target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  mobileMenuBreakpoint.addEventListener('change', (event) => {
    if (!event.matches) {
      closeMenu();
    }
  });
}

if (revealItems.length) {
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 40, 220)}ms`;
  });

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: '0px 0px -40px 0px' }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

// ===== Gallery Load More / Show Less =====
// Shows 3 images first from HTML, then reveals hidden gallery-extra cards in batches of 3.
// This replaces the old placeholder gallery append logic.
if (galleryGrid && galleryLoadMore && galleryShowLess) {
  const galleryExtraItems = Array.from(document.querySelectorAll('.gallery-extra'));
  const batchSize = 3;
  let visibleExtraCount = 0;

  const updateGalleryButtons = () => {
    galleryLoadMore.hidden = visibleExtraCount >= galleryExtraItems.length;
    galleryShowLess.hidden = visibleExtraCount <= 0;
  };

  galleryLoadMore.addEventListener('click', () => {
    galleryLoadMore.blur();

    const nextCount = Math.min(visibleExtraCount + batchSize, galleryExtraItems.length);

    for (let i = visibleExtraCount; i < nextCount; i += 1) {
      galleryExtraItems[i].hidden = false;
    }

    visibleExtraCount = nextCount;
    updateGalleryButtons();
  });

  galleryShowLess.addEventListener('click', () => {
    galleryShowLess.blur();

    const nextCount = Math.max(visibleExtraCount - batchSize, 0);

    for (let i = visibleExtraCount - 1; i >= nextCount; i -= 1) {
      galleryExtraItems[i].hidden = true;
    }

    visibleExtraCount = nextCount;
    updateGalleryButtons();
  });

  updateGalleryButtons();

  galleryGrid.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('.gallery-trigger') : null;

    if (!trigger || !lightbox || !lightboxImage || !lightboxTitle || !lightboxCaption) {
      return;
    }

    const image = trigger.querySelector('img');
    const card = trigger.closest('.gallery-card');
    const title = card?.querySelector('.gallery-caption strong')?.textContent || image?.alt || '';
    const caption = card?.querySelector('.gallery-caption span')?.textContent || '';

    if (!image) {
      return;
    }

    lastLightboxTrigger = trigger;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || title;
    lightboxTitle.textContent = title;
    lightboxCaption.textContent = caption;

    if (typeof lightbox.showModal === 'function') {
      lightbox.showModal();
      return;
    }

    lightbox.setAttribute('open', '');
  });
}

if (lightbox) {
  const closeLightbox = () => {
    if (!lightbox.open) {
      return;
    }

    if (typeof lightbox.close === 'function') {
      lightbox.close();
    } else {
      lightbox.removeAttribute('open');
    }

    lightboxImage.src = '';
    lightboxImage.alt = '';
    lastLightboxTrigger?.focus();
  };

  lightboxClose?.addEventListener('click', closeLightbox);

  lightbox.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeLightbox();
  });

  lightbox.addEventListener('click', (event) => {
    const rect = lightbox.getBoundingClientRect();
    const isOutside = event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right;

    if (isOutside) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.open) {
      closeLightbox();
    }
  });
}

const setStatus = (message, type) => {
  if (!formStatus) {
    return;
  }

  formStatus.textContent = message;
  formStatus.classList.remove('is-success', 'is-error');

  if (type) {
    formStatus.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }
};

const normalizePayload = (formData) => ({
  name: formData.get('name')?.toString().trim() || '',
  email: formData.get('email')?.toString().trim() || '',
  whatsapp: formData.get('whatsapp')?.toString().trim() || '',
  subject: formData.get('subject')?.toString().trim() || '',
  message: formData.get('message')?.toString().trim() || ''
});

if (inquiryForm && formStatus) {
  inquiryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    formStatus.textContent = "";
    formStatus.className = "form-status";
    inquiryForm.classList.add("is-submitting");
    inquiryForm.setAttribute("aria-busy", "true");

    const formData = new FormData(inquiryForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.warning || "We could not send your inquiry at this time.");
      }

      formStatus.textContent = result.message || "Your inquiry has been received successfully.";
      formStatus.classList.add("is-success");

      inquiryForm.reset();
    } catch (error) {
      formStatus.textContent = error.message || "We could not send your inquiry at this time.";
      formStatus.classList.add("is-error");
    } finally {
      inquiryForm.classList.remove("is-submitting");
      inquiryForm.removeAttribute("aria-busy");
    }
  });
}
