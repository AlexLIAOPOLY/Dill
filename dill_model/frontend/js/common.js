// 通用功能JavaScript

/**
 * 初始化回到顶部按钮
 */
function initBackToTop() {
    // 创建回到顶部按钮
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backToTopBtn.title = LANGS[currentLang].back_to_top;
    backToTopBtn.setAttribute('aria-label', LANGS[currentLang].back_to_top);
    
    // 添加到页面
    document.body.appendChild(backToTopBtn);
    
    // 监听滚动事件
    let ticking = false;
    
    function updateBackToTopVisibility() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateBackToTopVisibility);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
    
    // 点击回到顶部
    backToTopBtn.addEventListener('click', function() {
        // 平滑滚动到顶部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 添加点击动画效果
        this.style.transform = 'translateY(-2px) scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
    
    // 键盘支持
    backToTopBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initBackToTop();
    // 用事件委托修复所有详情按钮
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.toggle-details-btn');
        if (btn) {
            // 找到同级下一个.model-full-details
            let details = btn.parentElement.querySelector('.model-full-details');
            if (details) {
                const isVisible = details.classList.contains('details-visible');
                // 获取当前语言和语言包
                const lang = window.currentLang || 'zh';
                const LANGS = window.LANGS || {
                    zh: { btn_expand: '展开更多 <i class="fas fa-chevron-down"></i>', btn_collapse: '收起详情 <i class="fas fa-chevron-up"></i>' },
                    en: { btn_expand: 'Expand <i class="fas fa-chevron-down"></i>', btn_collapse: 'Collapse <i class="fas fa-chevron-up"></i>' }
                };
                if (isVisible) {
                    details.classList.remove('details-visible');
                    btn.innerHTML = LANGS[lang].btn_expand;
                } else {
                    details.classList.add('details-visible');
                    btn.innerHTML = LANGS[lang].btn_collapse;
                }
            }
        }
    });
});

/**
 * 通用工具函数
 */
window.CommonUtils = {
    initBackToTop: initBackToTop
}; 