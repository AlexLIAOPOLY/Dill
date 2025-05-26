// 欢迎页面JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 隐藏加载动画
    const loading = document.getElementById('loading');
    if (loading) {
        setTimeout(() => {
            loading.classList.remove('active');
        }, 500);
    }

    // 初始化标签页功能
    initGuideTabs();
    
    // 初始化动画效果
    initAnimations();
    
    // 初始化滚动效果
    initScrollEffects();
});

/**
 * 初始化使用指南标签页功能
 */
function initGuideTabs() {
    const tabs = document.querySelectorAll('.guide-tab');
    const contents = document.querySelectorAll('.guide-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            const targetContent = document.getElementById(`guide-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // 添加切换动画
            targetContent.style.animation = 'none';
            setTimeout(() => {
                targetContent.style.animation = 'fadeInUp 0.5s ease';
            }, 10);
        });
    });
}

/**
 * 初始化页面动画效果
 */
function initAnimations() {
    // 为卡片添加进入动画
    const cards = document.querySelectorAll('.feature-card, .tech-card, .step-item');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                entry.target.style.transition = 'all 0.6s ease';
                
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    cards.forEach(card => {
        observer.observe(card);
    });
}

/**
 * 初始化滚动效果
 */
function initScrollEffects() {
    // 平滑滚动到锚点
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // 移除视差滚动效果，让页面保持静止
    // 原来的视差效果代码已被移除，页面现在会保持静止状态
}

/**
 * 添加按钮点击效果
 */
document.addEventListener('click', function(e) {
    if (e.target.matches('.feature-btn, .quick-start-btn')) {
        // 创建波纹效果
        const button = e.target;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        // 添加CSS样式
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(0);
                    animation: ripple-animation 0.6s linear;
                    pointer-events: none;
                }
                
                @keyframes ripple-animation {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                
                .feature-btn, .quick-start-btn {
                    position: relative;
                    overflow: hidden;
                }
            `;
            document.head.appendChild(style);
        }
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
});

/**
 * 添加键盘导航支持
 */
document.addEventListener('keydown', function(e) {
    // Tab键导航增强
    if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
            'a[href], button, .guide-tab, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(element => {
            element.addEventListener('focus', function() {
                this.style.outline = '2px solid var(--primary-color)';
                this.style.outlineOffset = '2px';
            });
            
            element.addEventListener('blur', function() {
                this.style.outline = '';
                this.style.outlineOffset = '';
            });
        });
    }
    
    // 快捷键支持
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                window.location.href = 'index.html';
                break;
            case '2':
                e.preventDefault();
                window.location.href = 'compare.html';
                break;
        }
    }
});

/**
 * 添加触摸设备支持
 */
if ('ontouchstart' in window) {
    // 为触摸设备优化悬停效果
    const hoverElements = document.querySelectorAll('.feature-card, .tech-card, .quick-start-btn');
    
    hoverElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.classList.add('touch-hover');
        });
        
        element.addEventListener('touchend', function() {
            setTimeout(() => {
                this.classList.remove('touch-hover');
            }, 300);
        });
    });
    
    // 添加触摸样式
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
        .touch-hover {
            transform: scale(0.98) !important;
            transition: transform 0.1s ease !important;
        }
    `;
    document.head.appendChild(touchStyle);
}

/**
 * 性能优化：图片懒加载
 */
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

/**
 * 错误处理
 */
window.addEventListener('error', function(e) {
    console.error('页面错误:', e.error);
    
    // 可以在这里添加错误报告逻辑
    // 例如发送错误信息到服务器
});

/**
 * 页面可见性API - 优化性能
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // 页面不可见时暂停动画
        document.querySelectorAll('*').forEach(el => {
            if (el.style.animationPlayState !== undefined) {
                el.style.animationPlayState = 'paused';
            }
        });
    } else {
        // 页面可见时恢复动画
        document.querySelectorAll('*').forEach(el => {
            if (el.style.animationPlayState !== undefined) {
                el.style.animationPlayState = 'running';
            }
        });
    }
});

/**
 * 添加页面加载完成后的优化
 */
window.addEventListener('load', function() {
    // 预加载其他页面的关键资源
    const preloadLinks = [
        { href: 'index.html', as: 'document' },
        { href: 'compare.html', as: 'document' },
        { href: 'js/main.js', as: 'script' },
        { href: 'js/compare.js', as: 'script' }
    ];
    
    preloadLinks.forEach(link => {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'prefetch';
        preloadLink.href = link.href;
        if (link.as) preloadLink.as = link.as;
        document.head.appendChild(preloadLink);
    });
    
    // 初始化懒加载
    initLazyLoading();
});

// 导出函数供其他脚本使用
window.WelcomePage = {
    initGuideTabs,
    initAnimations,
    initScrollEffects
}; 