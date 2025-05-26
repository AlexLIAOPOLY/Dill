// 通用功能JavaScript

/**
 * 初始化回到顶部按钮
 */
function initBackToTop() {
    // 创建回到顶部按钮
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backToTopBtn.title = '回到顶部';
    backToTopBtn.setAttribute('aria-label', '回到顶部');
    
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
});

/**
 * 通用工具函数
 */
window.CommonUtils = {
    initBackToTop: initBackToTop
}; 