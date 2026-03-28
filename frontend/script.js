document.addEventListener('DOMContentLoaded', () => {
    // ===== Scroll animations =====
    const fadeTargets = document.querySelectorAll(
        '.step-card, .stat-card, .feature-card, .sms-feature, .profits-banner, ' +
        '.benefits-top, .integrate-block, .cta-block'
    );
    fadeTargets.forEach(el => el.classList.add('fade-in'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    fadeTargets.forEach(el => observer.observe(el));

    // ===== Navbar shadow =====
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.style.boxShadow = window.scrollY > 20 ? '0 1px 8px rgba(0,0,0,0.04)' : 'none';
    });

    // ===== Smooth scroll =====
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function(e) {
            e.preventDefault();
            const t = document.querySelector(this.getAttribute('href'));
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // ===== Demo call form =====
    const demoForm = document.getElementById('demoForm');
    if (demoForm) {
        const demoBtn = document.getElementById('demoBtn');
        const demoPhone = document.getElementById('demoPhone');
        const demoStatus = document.getElementById('demoStatus');

        demoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phone = demoPhone.value.replace(/[^0-9+]/g, '');
            if (!phone) {
                showDemoStatus('Please enter a phone number.', 'error');
                return;
            }

            demoBtn.disabled = true;
            demoBtn.textContent = 'Calling...';
            demoStatus.textContent = '';
            demoStatus.className = 'demo-status';

            try {
                const res = await fetch('https://trymiro.onrender.com/demo/call', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone }),
                });

                const data = await res.json();

                if (res.ok) {
                    showDemoStatus("Check your phone! We're calling you now.", 'success');
                    // Disable button for 30 seconds after success
                    demoBtn.textContent = 'Call sent!';
                    setTimeout(() => {
                        demoBtn.disabled = false;
                        demoBtn.textContent = 'Try it live';
                    }, 30000);
                } else {
                    showDemoStatus(data.error || 'Something went wrong.', 'error');
                    demoBtn.disabled = false;
                    demoBtn.textContent = 'Try it live';
                }
            } catch {
                showDemoStatus('Network error. Please try again.', 'error');
                demoBtn.disabled = false;
                demoBtn.textContent = 'Try it live';
            }
        });

        function showDemoStatus(message, type) {
            demoStatus.textContent = message;
            demoStatus.className = 'demo-status ' + type;
        }
    }
});
