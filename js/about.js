const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('show'); }
    });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }); 
document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));

// PARALLAX SCRIPT
if (window.innerWidth > 900) {
    const viewportHeight = window.innerHeight;
    window.addEventListener('scroll', () => {
        document.querySelectorAll('.parallax').forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed')) || 0;
            const rect = el.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0) {
                const elementCenter = rect.top + rect.height / 2;
                const viewportCenter = viewportHeight / 2;
                const distanceFromCenter = elementCenter - viewportCenter;
                el.style.transform = `translate3d(0, ${distanceFromCenter * (speed / 100)}px, 0)`;
            }
        });
    }, { passive: true });
}

// SWATCH THEME CHANGER
const swatches = document.querySelectorAll('.swatch-container');
swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        document.querySelector('.swatch-container.active').classList.remove('active');
        swatch.classList.add('active');
        
        const accentColor = swatch.getAttribute('data-color');
        const accentRGB = swatch.getAttribute('data-rgb');
        const bodyBG = swatch.getAttribute('data-bg');
        const glassBG = swatch.getAttribute('data-glass');
        
        document.documentElement.style.setProperty('--accent-color', accentColor);
        document.documentElement.style.setProperty('--accent-rgb', accentRGB);
        document.documentElement.style.setProperty('--glass-bg', glassBG);
        document.body.style.backgroundColor = bodyBG;
    });
});

// MAGAZINE PROGRESS
window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progress = document.getElementById('readingProgress');
    if (progress) {
        progress.style.width = scrolled + '%';
    }
}, { passive: true });

// MAGNETIC CURSOR ABOUT PAGE
if (window.innerWidth > 900) {
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');
    const magneticElements = document.querySelectorAll('.back-nav a, .swatch-container');

    let mouseX = 0, mouseY = 0;
    let isMagnetic = false;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if(cursor) {
            cursor.style.left = mouseX + 'px'; cursor.style.top = mouseY + 'px';
        }
        if (!isMagnetic && follower) {
            follower.style.left = mouseX + 'px'; follower.style.top = mouseY + 'px';
        }
    });

    magneticElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if(cursor) cursor.classList.add('hovered'); 
            if(follower) follower.classList.add('hovered');
            isMagnetic = true; 
            if(follower) follower.classList.add('magnetic');
            const rect = el.getBoundingClientRect();
            if(follower) {
                follower.style.left = (rect.left + rect.width / 2) + 'px';
                follower.style.top = (rect.top + rect.height / 2) + 'px';
                follower.style.width = rect.width + 'px'; follower.style.height = rect.height + 'px';
            }
        });
        el.addEventListener('mousemove', (e) => {
            if (isMagnetic) {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - (rect.left + rect.width / 2);
                const y = e.clientY - (rect.top + rect.height / 2);
                el.style.transform = `translate3d(${x * 0.2}px, ${y * 0.2}px, 0) scale(1.02)`;
            }
        });
        el.addEventListener('mouseleave', () => {
            if(cursor) cursor.classList.remove('hovered'); 
            if(follower) follower.classList.remove('hovered');
            isMagnetic = false; 
            if(follower) {
                follower.classList.remove('magnetic');
                follower.style.width = '40px'; follower.style.height = '40px';
            }
            el.style.transform = '';
        });
    });
}
