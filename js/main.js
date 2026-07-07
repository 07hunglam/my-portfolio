// ====================================================
// PRELOADER
// ====================================================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500); // Wait for transition to finish
        }, 1200); // Show preloader for a short time
    }
});

// ====================================================
// BACKGROUND PARTICLES CANVAS
// ====================================================
const canvas = document.getElementById('hero-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particlesArray;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let mouse = {
        x: null,
        y: null,
        radius: (canvas.height / 80) * (canvas.width / 80)
    };

    window.addEventListener('mousemove', function(event) {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        mouse.radius = (canvas.height / 80) * (canvas.width / 80);
        init();
    });

    window.addEventListener('mouseout', function() {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }

            // check collision mouse and particle
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius + this.size) {
                if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
                    this.x += 10;
                }
                if (mouse.x > this.x && this.x > this.size * 10) {
                    this.x -= 10;
                }
                if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
                    this.y += 10;
                }
                if (mouse.y > this.y && this.y > this.size * 10) {
                    this.y -= 10;
                }
            }
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 15000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1;
            let directionY = (Math.random() * 2) - 1;
            let color = 'rgba(56, 189, 248, 0.2)'; // matching accent color

            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                    + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                if (distance < (canvas.width / 10) * (canvas.height / 10)) {
                    opacityValue = 1 - (distance / 20000);
                    ctx.strokeStyle = 'rgba(56, 189, 248,' + opacityValue * 0.2 + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }
    
    init();
    animate();
}

// ====================================================
// EXISTING MAIN JS LOGIC
// ====================================================

// VISITOR COUNTER
async function updateVisitorCounter() {
    try {
        const hasVisited = sessionStorage.getItem('has_visited_hunglam_site');
        let response;
        if (hasVisited) {
            response = await fetch('/api/counter', { method: 'GET' });
        } else {
            response = await fetch('/api/counter', { method: 'POST' });
            sessionStorage.setItem('has_visited_hunglam_site', 'true');
        }
        const data = await response.json();
        if (data.success) {
            document.getElementById('view-counter').textContent = Number(data.value).toLocaleString();
        } else {
            document.getElementById('view-counter').textContent = '---';
        }
    } catch (error) {
        console.error('Lỗi kết nối API:', error);
        if(document.getElementById('view-counter')) {
            document.getElementById('view-counter').textContent = 'Offline';
        }
    }
}
document.addEventListener('DOMContentLoaded', updateVisitorCounter);

// SCROLL ANIMATIONS
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }); 
document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));

// NAVBAR BLUR
const navbar = document.querySelector('.navbar');
if(navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) { navbar.classList.add('scrolled'); } 
        else { navbar.classList.remove('scrolled'); }
    }, { passive: true });
}

// NAVBAR INDICATOR
if (window.innerWidth > 900) {
    const navLinks = document.querySelectorAll('.nav-links li');
    const indicator = document.querySelector('.nav-indicator');
    const navMenu = document.querySelector('.nav-links');

    if (navMenu && indicator) {
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                const rect = link.getBoundingClientRect();
                const parentRect = navMenu.getBoundingClientRect();
                indicator.style.cssText = `
                    width: ${rect.width}px; height: ${rect.height}px;
                    left: ${rect.left - parentRect.left}px; top: ${rect.top - parentRect.top}px;
                    opacity: 1; transform: scale(1);
                `;
            });
        });
        navMenu.addEventListener('mouseleave', () => {
            if(indicator) indicator.style.cssText = `opacity: 0; transform: scale(0.8);`;
        });
    }
}

// MAGNETIC CURSOR (DESKTOP)
if (window.innerWidth > 900) {
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');
    const magneticElements = document.querySelectorAll('.social-btn, .btn-secondary, .btn-primary, .nav-links a');

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
            if(el.classList.contains('glass-panel') || el.classList.contains('social-btn') || el.classList.contains('btn-primary')) {
                isMagnetic = true; 
                if(follower) follower.classList.add('magnetic');
                const rect = el.getBoundingClientRect();
                if(follower) {
                    follower.style.left = (rect.left + rect.width / 2) + 'px';
                    follower.style.top = (rect.top + rect.height / 2) + 'px';
                    follower.style.width = rect.width + 'px'; follower.style.height = rect.height + 'px';
                }
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

// LERP BACK TO TOP
const btt = document.getElementById('backToTop');
if (btt) {
    let currentY = window.scrollY + (window.innerHeight / 2);
    let targetY = currentY;
    const ease = 0.1;

    window.addEventListener('scroll', () => {
        const winScroll = window.scrollY;
        if (winScroll > 400) {
            btt.classList.add('visible');
        } else {
            btt.classList.remove('visible');
        }
        targetY = winScroll + (window.innerHeight / 2) - 23;
    }, { passive: true });

    function updateFloatingPosition() {
        currentY += (targetY - currentY) * ease;
        if (btt) {
            btt.style.top = currentY + 'px';
        }
        requestAnimationFrame(updateFloatingPosition);
    }
    requestAnimationFrame(updateFloatingPosition);
}
