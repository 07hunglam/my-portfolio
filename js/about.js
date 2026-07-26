// ====================================================
// ABOUT PAGE (EDITORIAL LOOKBOOK)
// ====================================================
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// 1. GSAP & ScrollTrigger Animations
if (!reduceMotion.matches && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Fade up animations
    gsap.utils.toArray('.scroll-animate').forEach((el) => {
        const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
        gsap.fromTo(el,
            { y: 30, opacity: 0 },
            {
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                },
                y: 0,
                opacity: 1,
                duration: 0.8,
                delay: delay,
                ease: "power2.out"
            }
        );
    });

    // Image Parallax (Inner Mask Parallax)
    if (window.innerWidth > 900) {
        gsap.utils.toArray('.parallax').forEach((el) => {
            const speed = parseFloat(el.getAttribute('data-speed')) || 5;
            const img = el.querySelector('img');
            if (img) {
                // To allow parallax, we scale the image slightly so it has room to move
                gsap.set(img, { scale: 1.2, transformOrigin: "center center" });
                gsap.fromTo(img,
                    { yPercent: -speed * 2 },
                    {
                        scrollTrigger: {
                            trigger: el.parentElement,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        },
                        yPercent: speed * 2,
                        ease: "none"
                    }
                );
            }
        });
    }
}

// 2. Spotlight Hover Effect
document.querySelectorAll('.bento-item').forEach(item => {
    item.addEventListener('mousemove', (e) => {
        const rect = item.getBoundingClientRect();
        item.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
        item.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    }, { passive: true });
});

// 3. ACCENT SWATCH THEME CHANGER
const swatches = document.querySelectorAll('.swatch-container');
swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        swatches.forEach(s => {
            s.classList.remove('active');
            s.setAttribute('aria-pressed', 'false');
        });
        swatch.classList.add('active');
        swatch.setAttribute('aria-pressed', 'true');

        document.documentElement.style.setProperty('--accent-color', swatch.dataset.color);
        document.documentElement.style.setProperty('--accent-rgb', swatch.dataset.rgb);
        document.documentElement.style.setProperty('--glass-bg', swatch.dataset.glass);
        document.body.style.backgroundColor = swatch.dataset.bg;
    });
});
