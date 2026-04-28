const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');
const revealItems = document.querySelectorAll('.reveal');
const inquiryForm = document.getElementById('inquiry-form');
const formStatus = document.getElementById('form-status');
const yearEl = document.getElementById('year');
const galleryGrid = document.getElementById('gallery-grid');
const galleryLoadMore = document.getElementById('gallery-load-more');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxCaption = document.getElementById('lightbox-caption');
const mobileMenuBreakpoint = window.matchMedia('(max-width: 860px)');
let lastLightboxTrigger = null;

const galleryItems = [
  {
    src: 'assets/gallery/placeholder-01.webp',
    alt: 'Strategy dashboard concept placeholder 01 for XTech Algo Trading Solutions gallery',
    title: 'Strategy dashboard concept placeholder 01',
    caption: 'Replace with dashboard imagery, analytics visuals, or company presentation assets.'
  },
  {
    src: 'assets/gallery/placeholder-02.webp',
    alt: 'System workflow placeholder 02 for XTech Algo Trading Solutions gallery',
    title: 'System workflow placeholder 02',
    caption: 'Suitable for logic maps, automation layers, and process-driven architecture visuals.'
  },
  {
    src: 'assets/gallery/placeholder-03.webp',
    alt: 'Execution environment placeholder 03 for XTech Algo Trading Solutions gallery',
    title: 'Execution environment placeholder 03',
    caption: 'Use later for disciplined execution views, platform captures, or company workflow references.'
  },
  {
    src: 'assets/gallery/placeholder-04.webp',
    alt: 'Data systems placeholder 04 for XTech Algo Trading Solutions gallery',
    title: 'Data systems placeholder 04',
    caption: 'Intended for structured data visuals, workflow charts, or technology-led company media.'
  },
  {
    src: 'assets/gallery/placeholder-05.webp',
    alt: 'Control panel placeholder 05 for XTech Algo Trading Solutions gallery',
    title: 'Control panel placeholder 05',
    caption: 'Reserve for risk monitoring panels, control interfaces, or process presentation imagery.'
  },
  {
    src: 'assets/gallery/placeholder-06.webp',
    alt: 'Automation overview placeholder 06 for XTech Algo Trading Solutions gallery',
    title: 'Automation overview placeholder 06',
    caption: 'Ideal for interface overviews, company showcase assets, or logic-driven automation screenshots.'
  },
  {
    src: 'assets/gallery/placeholder-07.webp',
    alt: 'Structured system preview placeholder 07 for XTech Algo Trading Solutions gallery',
    title: 'Structured system preview placeholder 07',
    caption: 'Use later for company process visuals, strategy snapshots, or system presentation imagery.'
  },
  {
    src: 'assets/gallery/placeholder-08.webp',
    alt: 'Monitoring interface placeholder 08 for XTech Algo Trading Solutions gallery',
    title: 'Monitoring interface placeholder 08',
    caption: 'Suitable for monitoring views, reporting layouts, or polished visual presentation assets.'
  }
];

const initialGalleryCount = 6;
const galleryBatchSize = 2;
let renderedGalleryCount = initialGalleryCount;

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

const createGalleryCard = (item, index) => {
  const figure = document.createElement('figure');
  figure.className = 'gallery-card';
  figure.innerHTML = `
    <button class="gallery-trigger" type="button" data-gallery-index="${index}" aria-label="Open gallery image: ${item.title}" aria-haspopup="dialog" aria-controls="lightbox">
      <img src="${item.src}" alt="${item.alt}" width="720" height="520" loading="lazy" decoding="async">
    </button>
    <figcaption class="gallery-caption">
      <strong>${item.title}</strong>
      <span>${item.caption}</span>
    </figcaption>
  `;
  return figure;
};

const syncGalleryButton = () => {
  if (!galleryLoadMore) {
    return;
  }

  if (renderedGalleryCount >= galleryItems.length) {
    galleryLoadMore.hidden = true;
    return;
  }

  galleryLoadMore.hidden = false;
};

if (galleryGrid) {
  syncGalleryButton();

  galleryLoadMore?.addEventListener('click', () => {
    galleryLoadMore.blur();
    const nextCount = Math.min(renderedGalleryCount + galleryBatchSize, galleryItems.length);

    for (let index = renderedGalleryCount; index < nextCount; index += 1) {
      galleryGrid.appendChild(createGalleryCard(galleryItems[index], index));
    }

    renderedGalleryCount = nextCount;
    syncGalleryButton();
  });

  galleryGrid.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('.gallery-trigger') : null;
    if (!trigger) {
      return;
    }

    const index = Number(trigger.getAttribute('data-gallery-index'));
    const item = galleryItems[index];
    if (!item || !lightbox || !lightboxImage || !lightboxTitle || !lightboxCaption) {
      return;
    }

    lastLightboxTrigger = trigger;
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    lightboxTitle.textContent = item.title;
    lightboxCaption.textContent = item.caption;

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
