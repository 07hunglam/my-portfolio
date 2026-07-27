// ====================================================
// SHARED HELPERS
// ====================================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDesktop = window.innerWidth > 900;

// ====================================================
// PRELOADER
// ====================================================
// Dismissed as soon as the page has actually loaded. There used to be a fixed
// 1.2s wait on top of that, which made every visitor sit and look at a loading
// bar for a page that was already ready - pure invented latency.
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    preloader.style.opacity = '0';
    setTimeout(() => { preloader.style.display = 'none'; }, 400);
});

// ====================================================
// 3D PARALLAX PARTICLES CANVAS
// ====================================================
const canvas = document.getElementById('hero-canvas');
if (canvas && !prefersReducedMotion.matches) {
    const ctx = canvas.getContext('2d');
    let particlesArray;
    let rafId = null;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let mouse = {
        x: null,
        y: null,
        radius: 150
    };

    window.addEventListener('mousemove', function(event) {
        mouse.x = event.x;
        mouse.y = event.y;
    });
    window.addEventListener('mouseout', function() {
        mouse.x = undefined;
        mouse.y = undefined;
    });
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
    });

    class Particle {
        constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z; // depth for 3D effect
            this.baseX = this.x;
            this.baseY = this.y;
            this.size = (3 - this.z) * 1.5; // closer = larger
            // Base movement
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
        }

        draw() {
            // Apply parallax based on mouse
            let parallaxX = 0;
            let parallaxY = 0;
            if(mouse.x != null) {
                parallaxX = (mouse.x - canvas.width/2) * (this.z * 0.05);
                parallaxY = (mouse.y - canvas.height/2) * (this.z * 0.05);
            }

            ctx.beginPath();
            ctx.arc(this.x + parallaxX, this.y + parallaxY, this.size, 0, Math.PI * 2, false);

            const isLight = document.documentElement.classList.contains('light-mode');
            ctx.fillStyle = isLight ? 'rgba(121, 92, 46, 0.4)' : 'rgba(56, 189, 248, 0.4)';
            ctx.fill();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce off edges
            if (this.x > canvas.width || this.x < 0) this.vx = -this.vx;
            if (this.y > canvas.height || this.y < 0) this.vy = -this.vy;

            // Mouse interaction (repel)
            if (mouse.x != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouse.radius - distance) / mouse.radius;
                    this.x -= forceDirectionX * force * 5;
                    this.y -= forceDirectionY * force * 5;
                }
            }
            this.draw();
        }
    }

    function init() {
        particlesArray = [];
        // connect() is O(n^2) per frame, so cap the count on large displays
        let numberOfParticles = Math.min(140, (canvas.height * canvas.width) / 10000);
        for (let i = 0; i < numberOfParticles; i++) {
            let z = Math.random() * 2; // depth from 0 to 2
            let x = Math.random() * canvas.width;
            let y = Math.random() * canvas.height;
            particlesArray.push(new Particle(x, y, z));
        }
    }

    function connect() {
        let opacityValue = 1;
        const isLight = document.documentElement.classList.contains('light-mode');
        const colorBase = isLight ? '121, 92, 46' : '56, 189, 248';

        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let dx = particlesArray[a].x - particlesArray[b].x;
                let dy = particlesArray[a].y - particlesArray[b].y;
                let distance = dx * dx + dy * dy;
                if (distance < (canvas.width / 12) * (canvas.height / 12)) {
                    opacityValue = 1 - (distance / 20000);
                    // Add parallax to lines
                    let paxA = mouse.x ? (mouse.x - canvas.width/2) * (particlesArray[a].z * 0.05) : 0;
                    let payA = mouse.y ? (mouse.y - canvas.height/2) * (particlesArray[a].z * 0.05) : 0;
                    let paxB = mouse.x ? (mouse.x - canvas.width/2) * (particlesArray[b].z * 0.05) : 0;
                    let payB = mouse.y ? (mouse.y - canvas.height/2) * (particlesArray[b].z * 0.05) : 0;

                    ctx.strokeStyle = `rgba(${colorBase}, ${opacityValue * 0.2})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x + paxA, particlesArray[a].y + payA);
                    ctx.lineTo(particlesArray[b].x + paxB, particlesArray[b].y + payB);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        rafId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    // Stop burning CPU while the tab is in the background
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        } else if (rafId === null) {
            animate();
        }
    });

    init();
    animate();
}

// ====================================================
// VISITOR COUNTER
// ====================================================
async function updateVisitorCounter() {
    const counterEl = document.getElementById('view-counter');
    if (!counterEl) return;
    try {
        const hasVisited = sessionStorage.getItem('has_visited_hunglam_site');
        let response;
        if (hasVisited) {
            response = await fetch('/api/counter', { method: 'GET' });
        } else {
            response = await fetch('/api/counter', { method: 'POST' });
            sessionStorage.setItem('has_visited_hunglam_site', 'true');
        }
        if (!response.ok) throw new Error(`Counter API responded ${response.status}`);
        const data = await response.json();
        counterEl.textContent = data.success ? Number(data.value).toLocaleString() : '---';
    } catch (error) {
        console.error('Visitor counter unavailable:', error);
        counterEl.textContent = 'Offline';
    }
}
document.addEventListener('DOMContentLoaded', updateVisitorCounter);

// ====================================================
// SCROLL ANIMATIONS
// ====================================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));

// ====================================================
// NAVBAR BLUR ON SCROLL
// ====================================================
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
}

// ====================================================
// NAVBAR HOVER INDICATOR
// ====================================================
if (isDesktop) {
    const navHoverLinks = document.querySelectorAll('.nav-links li');
    const indicator = document.querySelector('.nav-indicator');
    const navMenu = document.querySelector('.nav-links');

    if (navMenu && indicator) {
        navHoverLinks.forEach(link => {
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
            indicator.style.cssText = `opacity: 0; transform: scale(0.8);`;
        });
    }
}

// ====================================================
// MAGNETIC CURSOR (DESKTOP ONLY)
// ====================================================
if (isDesktop && !prefersReducedMotion.matches) {
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');
    const magneticElements = document.querySelectorAll('a, button, .project-card, .achievement-card, .swatch-container, .social-btn');
    // Cards own their own transform (VanillaTilt / GSAP Flip) - don't fight them
    const skipTransform = el => el.classList.contains('project-card')
        || el.classList.contains('achievement-card')
        || el.classList.contains('bento-item');

    let isMagnetic = false;

    window.addEventListener('mousemove', (e) => {
        if (cursor) {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        }
        if (!isMagnetic && follower) {
            follower.style.left = e.clientX + 'px';
            follower.style.top = e.clientY + 'px';
        }
    }, { passive: true });

    magneticElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (cursor) cursor.classList.add('hovered');
            if (follower) {
                follower.classList.add('hovered', 'magnetic');
                const rect = el.getBoundingClientRect();
                follower.style.left = (rect.left + rect.width / 2) + 'px';
                follower.style.top = (rect.top + rect.height / 2) + 'px';
            }
            isMagnetic = true;
        });

        el.addEventListener('mousemove', (e) => {
            if (!isMagnetic || skipTransform(el)) return;
            const rect = el.getBoundingClientRect();
            const x = e.clientX - (rect.left + rect.width / 2);
            const y = e.clientY - (rect.top + rect.height / 2);
            el.style.transform = `translate3d(${x * 0.2}px, ${y * 0.2}px, 0) scale(1.02)`;
        });

        el.addEventListener('mouseleave', () => {
            if (cursor) cursor.classList.remove('hovered');
            if (follower) follower.classList.remove('hovered', 'magnetic');
            isMagnetic = false;
            if (!skipTransform(el)) el.style.transform = '';
        });
    });
}

// ====================================================
// BACK TO TOP
//
// The button is pinned by CSS (position: fixed). There used to be an easing
// loop here that rewrote its `top` every animation frame while it was
// absolutely positioned in the document - see the note in style.css for why
// that dragged the page upward on mobile. All that is needed now is the
// show/hide toggle.
// ====================================================
const btt = document.getElementById('backToTop');
if (btt) {
    window.addEventListener('scroll', () => {
        btt.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
}

// ====================================================
// THEME TOGGLE (LIGHT/DARK)
// ====================================================
const GH_CHART_DARK = 'https://ghchart.rshah.org/38bdf8/07hunglam';
const GH_CHART_LIGHT = 'https://ghchart.rshah.org/795c2e/07hunglam';

// Points the toggle's sprite <use> at the sun or the moon
function setThemeIcon(button, light) {
    const use = button.querySelector('use');
    if (use) use.setAttribute('href', light ? '/icons.svg#icon-sun' : '/icons.svg#icon-moon');
}

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        setThemeIcon(themeToggle, true);
        const ghChart = document.getElementById('github-chart-img');
        if (ghChart) ghChart.src = GH_CHART_LIGHT;
    }

    themeToggle.addEventListener('click', (e) => {
        const isLight = !document.documentElement.classList.contains('light-mode');

        const toggleTheme = () => {
            document.documentElement.classList.toggle('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            setThemeIcon(themeToggle, isLight);

            const ghChart = document.getElementById('github-chart-img');
            if (ghChart) ghChart.src = isLight ? GH_CHART_LIGHT : GH_CHART_DARK;
        };

        if (!document.startViewTransition || prefersReducedMotion.matches) {
            toggleTheme();
            return;
        }

        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        // Tells the stylesheet to suppress the default root cross-fade for this
        // transition only, so the clip-path sweep below is the whole effect
        document.documentElement.classList.add('theme-transition');

        const transition = document.startViewTransition(() => {
            toggleTheme();
        });

        transition.finished.finally(() => {
            document.documentElement.classList.remove('theme-transition');
        });

        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
            ];
            document.documentElement.animate(
                {
                    clipPath: isLight ? clipPath : clipPath.slice().reverse()
                },
                {
                    duration: 600,
                    easing: 'ease-out',
                    pseudoElement: isLight ? '::view-transition-new(root)' : '::view-transition-old(root)'
                }
            );
        });
    });
}

// ====================================================
// MULTI-LANGUAGE SUPPORT (i18n)
//
// Every key below must exist in the markup as data-i18n / data-i18n-html,
// and the 'en' values must match the hard-coded HTML exactly - otherwise
// toggling the language silently rewrites the page content.
// ====================================================
const i18n = {
    'en': {
        // --- shared ---
        'skip_link': 'Skip to main content',

        // --- nav ---
        'nav_about': 'About', 'nav_education': 'Education', 'nav_github': 'GitHub',
        'nav_experience': 'Experience', 'nav_achievements': 'Achievements', 'nav_contacts': 'Contacts',

        // --- hero ---
        'greeting': 'INTRODUCTION',
        'hero_title': "Hello, I'm Hung Lam",
        'tag_student': 'IT STUDENT', 'tag_developer': 'SOFTWARE DEVELOPER', 'tag_explorer': 'STOIC EXPLORER',
        'info_name': 'Full name:', 'info_name_val': 'Lâm Gia Hưng',
        'info_gender': 'Gender:', 'info_gender_val': 'Male',
        'info_dob': 'Date of Birth:', 'info_dob_val': 'September 22, 2007',
        'info_edu': 'Education:', 'info_edu_val': 'K26 HCMUS - University of Science',
        'info_exp': 'Expertise:', 'info_exp_val': 'Computer Science, C/C++, English, Chinese',
        'btn_explore': 'Explore My Journey', 'btn_beyond': 'Beyond the Code',

        // --- education timeline ---
        'edu_title': 'Academic Background',
        'edu_1_date': 'August, 2025',
        'edu_1_name': 'Industrial University of Ho Chi Minh City (IUH)',
        'edu_1_desc': 'Focused foundation on Data Structures and Algorithms utilizing C/C++.',
        'edu_2_date': 'November, 2025',
        'edu_2_name': 'ICPC Vietnam National Contest',
        'edu_2_desc': 'Participated in intensive algorithmic challenges alongside the university elite team.',
        'edu_3_date': 'Upcoming',
        'edu_3_name': 'University of Science (HCMUS)',
        'edu_3_desc': 'Mapping a structured academic pathway toward advanced Computer Science research.',

        // --- labels for assistive tech only ---
        'aria_theme': 'Toggle dark or light mode',
        'aria_pagenav': 'Page navigation',
        'aria_email': 'Send an email',
        'aria_facebook': 'Facebook profile (opens in a new tab)',
        'aria_instagram': 'Instagram profile (opens in a new tab)',
        'aria_backtotop': 'Back to top',
        'aria_algo_group': 'Choose an algorithm',
        'aria_code_panel': 'C++ source of demo/sort.cpp',
        'aria_close': 'Close details',
        'aria_prj_1': 'Expand details: "Tài" Short Film Campaign',
        'aria_prj_2': 'Expand details: System Architecture & Algorithms',
        'aria_palette': 'Accent colour theme',
        'aria_swatch_1': 'Sky blue accent',
        'aria_swatch_2': 'Deep navy accent',
        'aria_swatch_3': 'Slate grey accent',
        'aria_swatch_4': 'Off-white accent',

        // --- sorting visualiser ---
        'sd_title': 'Algorithms, Watched',
        'sd_lead': 'Three sorting algorithms, running the way they actually run. The panel on the right is demo/sort.cpp itself - the highlighted line is the line doing the work.',
        'sd_play': 'Play', 'sd_pause': 'Pause', 'sd_step': 'Step', 'sd_shuffle': 'Shuffle',
        'sd_speed': 'Speed', 'sd_compares': 'comparisons', 'sd_swaps': 'swaps',
        'sd_source': 'demo/sort.cpp',

        // --- 404 ---
        'nf_code': '404',
        'nf_title': 'Nothing here.',
        'nf_lead': 'This page does not exist, which is itself a kind of answer.',
        'nf_home': 'Back to the start',

        // --- github ---
        'git_title': 'GitHub Activity',
        'git_repos': 'Public Repos', 'git_followers': 'Followers', 'git_following': 'Following',
        'git_desc': 'Consistently building and exploring new technologies.',

        // --- experience & milestones ---
        'exp_title': 'Experience & Milestones',
        'prj_1_title': '"Tài" Short Film Campaign',
        'prj_1_desc': 'Directed scriptwriting and executed professional PR content editing for a creative media campaign.',
        'prj_2_title': 'System Architecture & Algorithms',
        'prj_2_desc': 'Architecting optimized software lifecycles and deep C/C++ implementations for high-performance systems.',
        'ach_1_title': 'IELTS 7.5 & HSK 3',
        'ach_1_desc': 'Advanced Linguistic Capabilities',
        'ach_1_sub': 'Pursuing IELTS 8.0 & HSK 4',
        'ach_2_title': 'ICPC Vietnam National Contestant',
        'ach_2_sub': 'National Level Contestant',
        'ach_3_title': 'C/C++ Mastery',
        'ach_3_sub': 'Algorithmic Optimization',

        // --- contact & footer ---
        'contact_title': 'Contacts',
        'contact_desc': 'Open to collaborative opportunities or a simple tech conversation.',
        'footer_views': 'Total Views:',
        'footer_copyright': '© 2026 Hung Lam. All rights reserved.',

        // --- about page ---
        'abt_home': 'Home',
        'abt_title1': 'The Core', 'abt_title2': 'Identity.',
        'abt_issue': 'Issue 01', 'abt_meta1': 'Stoic Lifestyle', 'abt_meta2': 'Editorial Spread',
        'abt_ch1': 'Stoic<br>Logic<span class="dot">.</span>',
        'abt_tag1': 'Rationality', 'abt_tag2': 'C++ Architecture',
        'abt_quote1': '"Focus only on what can be controlled."',
        'abt_desc1': "Grounding every action—from debugging complex architectures to interpreting life's chaos—in the rigid principles of Stoicism. The mind is a compiler. It reads the raw inputs of reality, strips away the noise of emotion, and executes only the necessary logic.",
        'abt_ch2': 'Dark Minimal<span class="dot">.</span>',
        'abt_desc2': 'A preference for oversized silhouettes, earth tones, and unbranded functional pieces. Fashion is not a display, but a sharp, consistent visual language in everyday wear.',
        'abt_quote2': '"Silence in colors. Loud in structure."',
        'abt_tag3': 'Earth Tones', 'abt_tag4': 'Unbranded',
        'abt_ch3': 'Iron & Ritual<span class="dot">.</span>',
        'abt_desc3': 'Physical health dictates mental acuity. A rigid structure of cutting phases, protein tracking, and consistency in the weight room is non-negotiable. The iron never lies; it is the truest metric of discipline.',
        'abt_stat_label': 'Relentless Consistency',
        'abt_ch4': 'Details & Motion<span class="dot">.</span>',
        'abt_tag5': 'Urban Cruising', 'abt_tag6': 'Horology',
        'abt_desc4': 'Whether navigating the pulse of the city after hours on a custom ride, or appreciating the intricate mechanics of a modified timepiece—true sophistication always lies in the unseen details.'
    },
    'vi': {
        // --- shared ---
        'skip_link': 'Bỏ qua, đến nội dung chính',

        // --- nav ---
        'nav_about': 'Giới thiệu', 'nav_education': 'Học vấn', 'nav_github': 'GitHub',
        'nav_experience': 'Kinh nghiệm', 'nav_achievements': 'Thành tựu', 'nav_contacts': 'Liên hệ',

        // --- hero ---
        'greeting': 'GIỚI THIỆU',
        'hero_title': 'Xin chào, mình là Hưng Lâm',
        'tag_student': 'SINH VIÊN IT', 'tag_developer': 'LẬP TRÌNH VIÊN', 'tag_explorer': 'NGƯỜI KHẮC KỶ',
        'info_name': 'Họ và tên:', 'info_name_val': 'Lâm Gia Hưng',
        'info_gender': 'Giới tính:', 'info_gender_val': 'Nam',
        'info_dob': 'Ngày sinh:', 'info_dob_val': '22 tháng 9, 2007',
        'info_edu': 'Học vấn:', 'info_edu_val': 'K26 HCMUS - Trường Đại học Khoa học Tự nhiên',
        'info_exp': 'Chuyên môn:', 'info_exp_val': 'Khoa học Máy tính, C/C++, Tiếng Anh, Tiếng Trung',
        'btn_explore': 'Khám phá hành trình', 'btn_beyond': 'Không chỉ là code',

        // --- education timeline ---
        'edu_title': 'Nền tảng học vấn',
        'edu_1_date': 'Tháng 8, 2025',
        'edu_1_name': 'Trường Đại học Công nghiệp TP.HCM (IUH)',
        'edu_1_desc': 'Xây nền tảng vững về Cấu trúc dữ liệu và Giải thuật bằng C/C++.',
        'edu_2_date': 'Tháng 11, 2025',
        'edu_2_name': 'Kỳ thi ICPC Quốc gia Việt Nam',
        'edu_2_desc': 'Tham gia các bài toán thuật toán cường độ cao cùng đội tuyển của trường.',
        'edu_3_date': 'Sắp tới',
        'edu_3_name': 'Trường Đại học Khoa học Tự nhiên (HCMUS)',
        'edu_3_desc': 'Vạch lộ trình học thuật hướng tới nghiên cứu chuyên sâu về Khoa học Máy tính.',

        // --- labels for assistive tech only ---
        'aria_theme': 'Chuyển chế độ sáng/tối',
        'aria_pagenav': 'Điều hướng trang',
        'aria_email': 'Gửi email',
        'aria_facebook': 'Trang Facebook (mở tab mới)',
        'aria_instagram': 'Trang Instagram (mở tab mới)',
        'aria_backtotop': 'Lên đầu trang',
        'aria_algo_group': 'Chọn thuật toán',
        'aria_code_panel': 'Mã nguồn C++ của demo/sort.cpp',
        'aria_close': 'Đóng chi tiết',
        'aria_prj_1': 'Mở chi tiết: Chiến dịch phim ngắn "Tài"',
        'aria_prj_2': 'Mở chi tiết: Kiến trúc hệ thống & Giải thuật',
        'aria_palette': 'Màu nhấn giao diện',
        'aria_swatch_1': 'Màu nhấn xanh trời',
        'aria_swatch_2': 'Màu nhấn xanh navy đậm',
        'aria_swatch_3': 'Màu nhấn xám đá',
        'aria_swatch_4': 'Màu nhấn trắng ngà',

        // --- sorting visualiser ---
        'sd_title': 'Thuật toán, xem tận mắt',
        'sd_lead': 'Ba thuật toán sắp xếp, chạy đúng như cách chúng thực sự chạy. Khung bên phải chính là file demo/sort.cpp — dòng đang sáng là dòng đang làm việc.',
        'sd_play': 'Chạy', 'sd_pause': 'Dừng', 'sd_step': 'Từng bước', 'sd_shuffle': 'Trộn lại',
        'sd_speed': 'Tốc độ', 'sd_compares': 'lượt so sánh', 'sd_swaps': 'lượt đổi chỗ',
        'sd_source': 'demo/sort.cpp',

        // --- 404 ---
        'nf_code': '404',
        'nf_title': 'Không có gì ở đây.',
        'nf_lead': 'Trang này không tồn tại — bản thân điều đó cũng là một câu trả lời.',
        'nf_home': 'Về trang đầu',

        // --- github ---
        'git_title': 'Hoạt động GitHub',
        'git_repos': 'Kho công khai', 'git_followers': 'Người theo dõi', 'git_following': 'Đang theo dõi',
        'git_desc': 'Liên tục xây dựng và khám phá công nghệ mới.',

        // --- experience & milestones ---
        'exp_title': 'Kinh nghiệm & Dấu mốc',
        'prj_1_title': 'Chiến dịch phim ngắn "Tài"',
        'prj_1_desc': 'Phụ trách viết kịch bản và biên tập nội dung PR chuyên nghiệp cho một chiến dịch truyền thông sáng tạo.',
        'prj_2_title': 'Kiến trúc hệ thống & Giải thuật',
        'prj_2_desc': 'Thiết kế vòng đời phần mềm tối ưu và triển khai C/C++ chuyên sâu cho các hệ thống hiệu năng cao.',
        'ach_1_title': 'IELTS 7.5 & HSK 3',
        'ach_1_desc': 'Năng lực ngôn ngữ nâng cao',
        'ach_1_sub': 'Đang hướng tới IELTS 8.0 & HSK 4',
        'ach_2_title': 'Thí sinh ICPC Quốc gia Việt Nam',
        'ach_2_sub': 'Thí sinh cấp Quốc gia',
        'ach_3_title': 'Thành thạo C/C++',
        'ach_3_sub': 'Tối ưu hóa giải thuật',

        // --- contact & footer ---
        'contact_title': 'Liên hệ',
        'contact_desc': 'Luôn sẵn sàng cho cơ hội hợp tác, hoặc đơn giản là một cuộc trò chuyện về công nghệ.',
        'footer_views': 'Tổng lượt xem:',
        'footer_copyright': '© 2026 Hung Lam. Đã đăng ký bản quyền.',

        // --- about page ---
        'abt_home': 'Trang chủ',
        'abt_title1': 'The Core', 'abt_title2': 'Identity.',
        'abt_issue': 'Số 01', 'abt_meta1': 'Lối sống Khắc kỷ', 'abt_meta2': 'Chuyên đề Tạp chí',
        'abt_ch1': 'Tư duy<br>Khắc kỷ<span class="dot">.</span>',
        'abt_tag1': 'Lý trí', 'abt_tag2': 'Kiến trúc C++',
        'abt_quote1': '"Chỉ tập trung vào những gì có thể kiểm soát."',
        'abt_desc1': 'Lấy triết lý Khắc kỷ làm nền tảng cho mọi hành động—từ việc gỡ lỗi những kiến trúc phức tạp đến giải mã sự hỗn loạn của cuộc sống. Tâm trí là một trình biên dịch. Nó đọc dữ liệu thô của thực tại, loại bỏ nhiễu loạn cảm xúc, và chỉ thực thi phần logic cần thiết.',
        'abt_ch2': 'Tối giản<br>Trầm ấm<span class="dot">.</span>',
        'abt_desc2': 'Ưu tiên phom dáng oversized, tông màu đất và những món đồ chức năng không logo. Thời trang không phải để phô trương, mà là một ngôn ngữ hình ảnh sắc bén, nhất quán trong trang phục thường ngày.',
        'abt_quote2': '"Tĩnh lặng trong màu sắc. Sắc sảo trong cấu trúc."',
        'abt_tag3': 'Tông màu đất', 'abt_tag4': 'Không logo',
        'abt_ch3': 'Tạ sắt & Kỷ luật<span class="dot">.</span>',
        'abt_desc3': 'Thể chất quyết định sự nhạy bén của tinh thần. Quy trình nghiêm ngặt gồm các giai đoạn siết cơ, theo dõi lượng protein và sự đều đặn trong phòng tập là điều bất di bất dịch. Tạ sắt không biết nói dối; nó là thước đo chân thực nhất của kỷ luật.',
        'abt_stat_label': 'Kiên định tuyệt đối',
        'abt_ch4': 'Chi tiết & Chuyển động<span class="dot">.</span>',
        'abt_tag5': 'Dạo phố', 'abt_tag6': 'Đồng hồ',
        'abt_desc4': 'Dù là hòa vào nhịp sống thành phố lúc đêm muộn trên một chiếc xe độ, hay chiêm ngưỡng cơ chế tinh xảo của một chiếc đồng hồ tùy chỉnh—sự tinh tế thực sự luôn nằm ở những chi tiết khuất tầm mắt.'
    }
};

// Codes that must be valid BCP 47 for <html lang>; 'vn' is a country code, 'vi' is the language
const LANG_LABEL = { en: 'EN', vi: 'VI' };

function applyLanguage(lang) {
    const dict = i18n[lang];
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) {
            el.textContent = dict[key];
            // The typing effect caches the original string - keep it in sync
            if (el.hasAttribute('data-original')) el.setAttribute('data-original', dict[key]);
        } else {
            console.warn(`[i18n] missing key "${key}" for language "${lang}"`);
        }
    });

    // Values below are author-written literals in this file, never user input
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (dict[key] !== undefined) {
            el.innerHTML = dict[key];
        } else {
            console.warn(`[i18n] missing key "${key}" for language "${lang}"`);
        }
    });

    // Labels that only exist for assistive tech still have to follow the page
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (dict[key] !== undefined) {
            el.setAttribute('aria-label', dict[key]);
        } else {
            console.warn(`[i18n] missing key "${key}" for language "${lang}"`);
        }
    });

    document.documentElement.lang = lang;

    // Hero title is split into per-character spans by GSAP - rebuild after a swap
    if (typeof initHeroGSAP === 'function') initHeroGSAP();

    // Components that build strings in JS (the sort visualiser) re-render here
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
    // Migrate the legacy 'vn' value written by earlier versions of this site
    let currentLang = localStorage.getItem('lang') === 'vn' ? 'vi' : (localStorage.getItem('lang') || 'en');
    if (!i18n[currentLang]) currentLang = 'en';

    langToggle.textContent = LANG_LABEL[currentLang];
    langToggle.setAttribute('aria-label', 'Switch language (currently ' + LANG_LABEL[currentLang] + ')');
    applyLanguage(currentLang);

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'vi' : 'en';
        localStorage.setItem('lang', currentLang);
        langToggle.textContent = LANG_LABEL[currentLang];
        // Kept bilingual on purpose: someone who cannot read the current
        // language still has to be able to find the control that changes it
        langToggle.setAttribute('aria-label',
            'Language / Ngôn ngữ - ' + LANG_LABEL[currentLang]);
        applyLanguage(currentLang);
    });
}

// ====================================================
// GITHUB API FETCH
// ====================================================
async function fetchGitHubActivity() {
    const reposEl = document.getElementById('gh-repos');
    if (!reposEl) return;
    try {
        const response = await fetch('https://api.github.com/users/07hunglam');
        if (!response.ok) throw new Error('API limit or error');
        const data = await response.json();

        const followersEl = document.getElementById('gh-followers');
        const followingEl = document.getElementById('gh-following');

        reposEl.textContent = data.public_repos;
        if (followersEl) followersEl.textContent = data.followers;
        if (followingEl) followingEl.textContent = data.following;
    } catch (error) {
        console.error('GitHub stats unavailable:', error);
    }
}
document.addEventListener('DOMContentLoaded', fetchGitHubActivity);

// ====================================================
// SCROLL SPY (ACTIVE NAV LINK)
// ====================================================
const navLinks = document.querySelectorAll('.nav-links a');

// Track whatever the nav actually points at, not just <section> elements:
// "Achievements" targets a card inside the experience section, so a
// section-only query could never light it up.
const spyTargets = [...navLinks]
    .map(link => ({ link, el: document.querySelector(link.getAttribute('href')) }))
    .filter(t => t.el);

// Distances are measured from the top of the document. offsetTop is relative to
// each element's own offsetParent, so cards nested in a grid reported tiny
// values and sorted ahead of sections that really precede them.
let spyOffsets = [];
function measureSpyTargets() {
    spyOffsets = spyTargets
        .map(t => ({ ...t, top: t.el.getBoundingClientRect().top + window.scrollY }))
        .sort((a, b) => a.top - b.top);
}

if (spyTargets.length) {
    measureSpyTargets();
    window.addEventListener('load', measureSpyTargets);

    let remeasure = null;
    window.addEventListener('resize', () => {
        clearTimeout(remeasure);
        remeasure = setTimeout(measureSpyTargets, 200);
    }, { passive: true });

    window.addEventListener('scroll', () => {
        let current = null;
        for (const t of spyOffsets) {
            if (window.scrollY >= t.top - 200) current = t.link;
        }
        spyTargets.forEach(({ link }) => {
            const isActive = link === current;
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    }, { passive: true });
}

// ====================================================
// PROGRESS BAR
// ====================================================
const progressBar = document.getElementById('readingProgress');
if (progressBar) {
    window.addEventListener('scroll', () => {
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (height <= 0) return;
        progressBar.style.width = ((window.scrollY / height) * 100) + '%';
    }, { passive: true });
}

// ====================================================
// PAGE TRANSITIONS + GSAP CHOREOGRAPHY
// ====================================================
function initHeroGSAP() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle || typeof gsap === 'undefined') return;

    const text = heroTitle.textContent;
    heroTitle.innerHTML = '';

    text.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? ' ' : char; // Preserve space width
        heroTitle.appendChild(span);
    });

    if (prefersReducedMotion.matches) return;

    gsap.fromTo(heroTitle.querySelectorAll('span'),
        { y: 50, opacity: 0, rotateX: -90 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.8, stagger: 0.05, ease: 'back.out(1.7)', transformOrigin: "0% 50% -50" }
    );
}

// ====================================================
// GSAP SCROLLTRIGGER & VANILLATILT
// ====================================================
function initAdvancedAnimations() {
    if (prefersReducedMotion.matches) return;

    // Tilt everything except the project cards - those are expanded by GSAP Flip,
    // and two libraries writing the same inline transform fight each other.
    if (typeof VanillaTilt !== 'undefined' && window.innerWidth > 768) {
        VanillaTilt.init(document.querySelectorAll(".bento-item:not(.project-card), .achievement-card"), {
            max: 3,
            speed: 500,
            glare: true,
            "max-glare": 0.1,
            scale: 1.01
        });
    }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Mobile browsers fire resize every time the address bar slides in or out,
    // which happens constantly while scrolling. Without this, ScrollTrigger
    // recalculates on each one and can shove the scroll position around.
    ScrollTrigger.config({ ignoreMobileResize: true });

    const reveal = (selector, fromVars) => {
        gsap.utils.toArray(selector).forEach((item) => {
            gsap.from(item, {
                scrollTrigger: { trigger: item, start: "top 85%", toggleActions: "play none none reverse" },
                ...fromVars
            });
        });
    };

    reveal('.bento-item', { y: 20, opacity: 0, duration: 0.5, ease: "power2.out" });
    reveal('.section-title', { x: -15, opacity: 0, duration: 0.4, ease: "power2.out" });
    reveal('.timeline-item', { x: -15, opacity: 0, duration: 0.4, ease: "power2.out" });
}

// ====================================================
// EXPANDABLE PROJECT CARDS (GSAP Flip)
// ====================================================
function initProjectCards() {
    const cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    const backdrop = document.querySelector('.project-backdrop');
    const canFlip = typeof gsap !== 'undefined' && typeof Flip !== 'undefined';
    if (canFlip) gsap.registerPlugin(Flip);

    let openCard = null;

    cards.forEach(card => {
        let closeBtn = card.querySelector('.flip-close-btn');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="/icons.svg#icon-x"/></svg>';
            closeBtn.className = 'flip-close-btn';
            closeBtn.setAttribute('data-i18n-aria', 'aria_close');
            closeBtn.setAttribute('aria-label', 'Close details');
            closeBtn.style.cssText = 'display:none;position:absolute;top:16px;right:16px;background:transparent;border:none;color:var(--text-main);font-size:1.5rem;cursor:pointer;z-index:100;';
            card.appendChild(closeBtn);
        }

        const open = () => {
            if (card.classList.contains('expanded')) return;
            const state = canFlip ? Flip.getState(card) : null;

            card.classList.add('expanded');
            card.setAttribute('aria-expanded', 'true');
            card.style.cssText += ';position:fixed;top:10vh;left:10vw;width:80vw;height:80vh;z-index:9999;cursor:default;';
            closeBtn.style.display = 'block';
            document.body.classList.add('modal-open');
            openCard = card;

            if (state) Flip.from(state, { duration: 0.6, ease: 'power4.out', absolute: true });
            closeBtn.focus();
        };

        const close = () => {
            if (!card.classList.contains('expanded')) return;
            const state = canFlip ? Flip.getState(card) : null;

            card.classList.remove('expanded');
            card.setAttribute('aria-expanded', 'false');
            card.style.position = 'relative';
            card.style.top = 'auto';
            card.style.left = 'auto';
            card.style.width = 'auto';
            card.style.height = 'auto';
            card.style.zIndex = '1';
            card.style.cursor = 'pointer';
            closeBtn.style.display = 'none';
            document.body.classList.remove('modal-open');
            openCard = null;

            if (state) Flip.from(state, { duration: 0.6, ease: 'power4.out', absolute: true });
            card.focus();
        };

        card.addEventListener('click', open);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();   // stop Space from scrolling the page
                open();
            }
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            close();
        });

        card._closeProject = close;
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && openCard) openCard._closeProject();
    });
    if (backdrop) backdrop.addEventListener('click', () => { if (openCard) openCard._closeProject(); });
}

// ====================================================
// BOOTSTRAP
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    initHeroGSAP();
    initAdvancedAnimations();
    initProjectCards();

    // applyLanguage already ran at parse time, before the close buttons above
    // existed. Re-apply so anything built by JS is labelled in the right
    // language on a first load rather than only after a manual toggle.
    applyLanguage(document.documentElement.lang === 'vi' ? 'vi' : 'en');

    // TERMINAL TYPING EFFECT FOR TAGLINE
    const taglineSpans = document.querySelectorAll('.tagline span:not(.accent-dot)');
    if (taglineSpans.length && !prefersReducedMotion.matches
        && typeof gsap !== 'undefined' && typeof TextPlugin !== 'undefined') {
        gsap.registerPlugin(TextPlugin);
        taglineSpans.forEach((span, index) => {
            const originalText = span.getAttribute('data-original') || span.innerText;
            span.setAttribute('data-original', originalText); // survive an i18n swap
            span.innerText = '';
            gsap.to(span, {
                duration: 0.8,
                text: originalText,
                ease: "none",
                delay: 1.5 + (index * 0.4) // cascade typing after preloader
            });
        });
    }

    // Page-to-page transitions are handled by the CSS @view-transition rule.
    // No JS, no overlay element, and no click interception: normal navigation
    // still works everywhere, it is just animated where the browser supports it.
});
