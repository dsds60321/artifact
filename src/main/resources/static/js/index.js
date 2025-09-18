document.addEventListener('DOMContentLoaded', function() {
    // 탭 전환 기능
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // 모든 탭 비활성화
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 선택된 탭 활성화
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 스크롤 기능
    window.scrollToFeatures = function() {
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // 네비게이션 스크롤 효과
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }

        lastScrollTop = scrollTop;
    });

    // 슬라이드 기능 (PPT 탭)
    let currentSlide = 0;
    const slides = [
        {
            title: 'API 개요',
            content: `
                <div class="api-summary">
                    <div class="stat">
                        <span class="number">24</span>
                        <span class="label">Endpoints</span>
                    </div>
                    <div class="stat">
                        <span class="number">8</span>
                        <span class="label">Controllers</span>
                    </div>
                    <div class="stat">
                        <span class="number">15</span>
                        <span class="label">Models</span>
                    </div>
                </div>
            `
        },
        {
            title: '인증 API',
            content: `
                <div class="api-list">
                    <div class="api-item">
                        <span class="method post">POST</span>
                        <span class="endpoint">/auth/login</span>
                    </div>
                    <div class="api-item">
                        <span class="method post">POST</span>
                        <span class="endpoint">/auth/register</span>
                    </div>
                    <div class="api-item">
                        <span class="method post">POST</span>
                        <span class="endpoint">/auth/refresh</span>
                    </div>
                </div>
            `
        },
        {
            title: '사용자 API',
            content: `
                <div class="api-list">
                    <div class="api-item">
                        <span class="method get">GET</span>
                        <span class="endpoint">/users/{id}</span>
                    </div>
                    <div class="api-item">
                        <span class="method put">PUT</span>
                        <span class="endpoint">/users/{id}</span>
                    </div>
                    <div class="api-item">
                        <span class="method delete">DELETE</span>
                        <span class="endpoint">/users/{id}</span>
                    </div>
                </div>
            `
        }
    ];

    function updateSlide() {
        const slideElement = document.querySelector('.slide');
        const counterElement = document.querySelector('.slide-counter');

        if (slideElement && counterElement) {
            slideElement.innerHTML = `
                <h3>${slides[currentSlide].title}</h3>
                <div class="slide-content">
                    ${slides[currentSlide].content}
                </div>
            `;
            counterElement.textContent = `${currentSlide + 1} / ${slides.length}`;
        }
    }

    // 슬라이드 버튼 이벤트
    const prevBtn = document.querySelector('.slide-btn:first-child');
    const nextBtn = document.querySelector('.slide-btn:last-child');

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateSlide();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            currentSlide = (currentSlide + 1) % slides.length;
            updateSlide();
        });
    }

    // 자동 슬라이드 (PPT 탭이 활성화된 경우에만)
    setInterval(function() {
        const pptTab = document.getElementById('ppt');
        if (pptTab && pptTab.classList.contains('active')) {
            currentSlide = (currentSlide + 1) % slides.length;
            updateSlide();
        }
    }, 5000);

    // 모바일 메뉴 토글 (필요시 구현)
    const mobileMenuToggle = document.createElement('button');
    mobileMenuToggle.className = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileMenuToggle.style.display = 'none';

    // 반응형 처리
    function handleResize() {
        if (window.innerWidth <= 768) {
            // 모바일에서는 간단한 탭 드롭다운으로 변경할 수 있음
            mobileMenuToggle.style.display = 'block';
        } else {
            mobileMenuToggle.style.display = 'none';
        }
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    // 애니메이션 효과
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        });
    }, observerOptions);

    // 관찰할 요소들 등록
    document.querySelectorAll('.feature-card, .docs-item, .flow-card, .ppt-feature').forEach(el => {
        observer.observe(el);
    });
});