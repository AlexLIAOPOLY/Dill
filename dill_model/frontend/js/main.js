/**
 * Dill模型Web应用 - 主逻辑脚本
 */

// === 加载期间日志相关状态 ===
let loadingLogsPanel = null;
let loadingLogsContainer = null;
let loadingProgressText = null;
let loadingTimeText = null;
let loadingStartTime = null;
let loadingTimeInterval = null;

// 全局变量，用于存储当前计算的模型和维度信息
window.currentCalculationInfo = {
    model: 'dill',
    dimension: '1D'
};

// 坐标轴控制全局变量
let axisReferenceRanges = {
    exposure: {
        xaxis: null,
        yaxis: null
    },
    thickness: {
        xaxis: null,
        yaxis: null
    }
};

// DILL 1D V评估动画控制变量
let dill1DVEvaluationState = {
    animationData: null,
    totalFrames: 0,
    currentFrame: 0,
    isPlaying: false,
    intervalId: null,
    isLooping: false
};

// 文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化波形类型标题国际化
    initWaveTypeTitles();
    
    // 初始化波形类型选择器
    initSineWaveTypeSelectors();
    
    // 初始化应用
    initApp();
    
    // 初始化相位表达式下拉菜单
    initPhaseExpressionDropdowns();
});

// 初始化波形类型标题的国际化支持
function initWaveTypeTitles() {
    // 获取当前语言
    const currentLang = localStorage.getItem('lang') || 'zh-CN';
    
    // 设置所有参数组容器的标题
    const allParamGroupContainers = document.querySelectorAll('.parameter-group-container');
    allParamGroupContainers.forEach(container => {
        if (container.dataset.i18nTitle && LANGS[currentLang][container.dataset.i18nTitle]) {
            container.dataset.title = LANGS[currentLang][container.dataset.i18nTitle];
        }
    });
    
    // 设置波形类型容器的标题
    const waveTypeContainers = document.querySelectorAll('.sine-wave-type-container');
    waveTypeContainers.forEach(container => {
        if (container.dataset.i18nTitle && LANGS[currentLang][container.dataset.i18nTitle]) {
            container.dataset.title = LANGS[currentLang][container.dataset.i18nTitle];
        }
    });
    
    // 设置波形参数容器的标题
    const waveParamsContainers = document.querySelectorAll('.sine-wave-params-container');
    waveParamsContainers.forEach(container => {
        if (container.dataset.i18nTitle && LANGS[currentLang][container.dataset.i18nTitle]) {
            container.dataset.title = LANGS[currentLang][container.dataset.i18nTitle];
        }
    });
    
    // 设置预览按钮的样式
    const previewButtons = document.querySelectorAll('[id$="-preview-btn"]');
    previewButtons.forEach(button => {
        if (!button.classList.contains('preview-button')) {
            button.classList.add('preview-button');
        }
    });
    
    // 设置预览图表容器的样式
    const previewPlots = document.querySelectorAll('[id$="-preview-plot"]');
    previewPlots.forEach(plot => {
        if (!plot.classList.contains('preview-plot')) {
            plot.classList.add('preview-plot');
        }
    });
}

/**
 * 初始化应用
 */
function initApp() {
    console.log('🔍 [DEBUG] initApp 开始执行');
    
    // 强制初始化系统化日志管理器
    console.log('🔍 [DEBUG] 强制初始化系统化日志管理器...');
    try {
        if (typeof initSystematicLogs === 'function') {
            window.systematicLogManager = initSystematicLogs();
            console.log('✅ 系统化日志管理器初始化成功:', window.systematicLogManager);
        } else {
            console.error('❌ initSystematicLogs 函数未找到');
        }
    } catch (error) {
        console.error('❌ 系统化日志管理器初始化失败:', error);
    }
    
    // 初始化界面元素
    initWaveTypeTitles();
    initSineWaveTypeSelectors();
    initPhaseExpressionDropdowns();  // 确保初始化相位表达式下拉框
    bindSliderEvents();
    bindPhiExprUI();
    
    // 触发初始波形类型变化事件以设置正确的初始显示状态
    setTimeout(() => {
        const dillSineType = document.getElementById('dill-sine-type');
        if (dillSineType) {
            dillSineType.dispatchEvent(new Event('change'));
            console.log('✅ 已触发DILL波形类型初始化事件，当前值:', dillSineType.value);
        }
    }, 100);
    
    // 初始化4D动画控制
    console.log('🔍 [DEBUG] 初始化4D动画控制...');
    try {
        setupDill4DAnimationControls();
        setupEnhancedDill4DAnimationControls();
        setupDill1DAnimationControls();  // 添加1D动画控制初始化
        setupDill1DVEvaluationControls(); // 添加1D V评估控制初始化
        console.log('✅ 4D动画控制初始化成功');
    } catch (error) {
        console.error('❌ 4D动画控制初始化失败:', error);
    }
    
    // 获取DOM元素
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const modelSelect = document.getElementById('model-select'); // 获取模型选择下拉框
    const modelSelectionSection = document.getElementById('model-selection-section'); // 获取模型选择区域
    
    // 为计算按钮绑定事件
    calculateBtn.addEventListener('click', function() {
        // 首先滑动到页面最底部
        scrollToBottomAndRefreshLogs();
        
        let modelType = modelSelect.value;
        let postData = getParameterValues(); // 使用 getParameterValues 获取所有参数
        
        // 更新当前计算信息
        let dimension = '1D';
        if (postData.sine_type === 'multi') {
            dimension = '2D';
        } else if (postData.sine_type === '3d') {
            dimension = '3D';
        }
        window.currentCalculationInfo = {
            model: modelType,
            dimension: dimension
        };

        // 显示加载动画
        loading.classList.add('active');
        // 修复：只修改动画里的文字部分，不覆盖整个动画结构
        const loadingText = loading.querySelector('.loading-text');
        if (loadingText) {
            // 获取当前语言，使用更安全的方式
            const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
            // 安全地访问语言对象
            const langObj = LANGS[currentLang] || LANGS['zh-CN'];
            if (langObj && langObj.loading) {
                loadingText.textContent = langObj.loading;
            } else {
                loadingText.textContent = '加载中...';
            }
        }
        // 隐藏错误消息
        errorMessage.classList.remove('visible');
        // 隐藏结果区域
        resultsSection.classList.remove('visible');
        
        // 开始加载期间日志更新
        startLoadingLogsUpdate();
        
        // 自动刷新系统化日志
        if (window.systematicLogManager) {
            window.systematicLogManager.autoRefreshLogsOnCalculation();
        }
        
        // 调用API获取数据(使用交互式图表)
        calculateDillModelData(postData)
            .then(data => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
                // 主图始终渲染
                displayInteractiveResults(data);
                
                // 只有CAR模型时，额外渲染右侧多图
                if (modelType === 'car') {
                    if (typeof renderCarInteractivePlots === 'function') {
                        renderCarInteractivePlots(data);
                        // 确保CAR模型结果区可见
                        const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
                        if (carInteractivePlotsContainer) carInteractivePlotsContainer.style.display = 'block';
                    } else {
                        console.error('renderCarInteractivePlots function not found.');
                        showErrorMessage('CAR模型图表渲染函数未找到。');
                    }
                }
                
                // 添加动画效果
                resultsSection.classList.add('visible');
                
                // 执行日志过渡动画
                transitionLogsFromLoadingToMain();
            })
            .catch(error => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
                // 停止加载期间日志更新
                stopLoadingLogsUpdate();
                
                // 改进错误信息提取
                let msg = '';
                if (error && error.message) {
                    msg = error.message;
                    // 尝试解析JSON错误信息
                    try {
                        if (error.message.startsWith('{') && error.message.endsWith('}')) {
                            const errorObj = JSON.parse(error.message);
                            if (errorObj.message) {
                                msg = errorObj.message;
                            }
                            if ((window.currentLang === 'zh' || window.currentLang === 'zh-CN') && errorObj.message_zh) {
                                msg = errorObj.message_zh;
                            } else if ((window.currentLang === 'en' || window.currentLang === 'en-US') && errorObj.message_en) {
                                msg = errorObj.message_en;
                            }
                        }
                    } catch (parseError) {
                        console.warn('Error message parsing failed:', parseError);
                    }
                }
                
                // 如果error是对象，检查是否包含国际化错误信息
                if (error && typeof error === 'object') {
                    if ((window.currentLang === 'zh' || window.currentLang === 'zh-CN') && error.message_zh) {
                        msg = error.message_zh;
                    } else if ((window.currentLang === 'en' || window.currentLang === 'en-US') && error.message_en) {
                        msg = error.message_en;
                    }
                }
                
                // 如果无法获取错误信息，使用默认信息
                if (!msg || msg === '') {
                    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
                    msg = LANGS[currentLang].error_message || '计算过程中出现错误';
                }
                
                // 记录错误详情到控制台，便于调试
                console.error('计算出错:', {
                    errorObject: error,
                    displayMessage: msg,
                    modelType: modelType,
                    parameters: postData
                });
                
                // 显示错误信息
                errorMessage.textContent = msg;
                errorMessage.classList.add('visible');
                // 添加摇晃动画
                errorMessage.classList.add('shake');
                setTimeout(() => {
                    errorMessage.classList.remove('shake');
                }, 800);
                // 修正：报错时自动滚动到页面顶部
                setTimeout(() => {
                    window.scrollTo({top: 0, behavior: 'smooth'});
                }, 50);
                highlightErrorCard(msg);
            });
    });
    
    // 模型选择事件 (如果将来有多个模型，可以在这里处理)
    modelSelect.addEventListener('change', (event) => {
        clearAllCharts();
        const selectedModel = event.target.value;
        console.log('Selected model:', selectedModel);
        
        // 隐藏所有模型说明
        document.getElementById('dill-desc').style.display = 'none';
        document.getElementById('enhanced-dill-desc').style.display = 'none';
        document.getElementById('car-desc').style.display = 'none';
        
        // 隐藏所有模型参数区域
        document.getElementById('dill-params').style.display = 'none';
        document.getElementById('enhanced-dill-params').style.display = 'none';
        document.getElementById('car-params').style.display = 'none';
        
        // 清除CAR模型特有容器
        const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
        if (carInteractivePlotsContainer) {
            carInteractivePlotsContainer.innerHTML = '';
            carInteractivePlotsContainer.style.display = 'none';
        }
        
        // 重置模型特定组件
        resetModelSpecificComponents();
        
        // 根据所选模型显示相应的说明和参数区域
        switch(selectedModel) {
            case 'dill':
                document.getElementById('dill-desc').style.display = 'block';
                document.getElementById('dill-params').style.display = 'block';
                break;
            case 'enhanced_dill':
                document.getElementById('enhanced-dill-desc').style.display = 'block';
                document.getElementById('enhanced-dill-params').style.display = 'block';
                break;
            case 'car':
                document.getElementById('car-desc').style.display = 'block';
                document.getElementById('car-params').style.display = 'block';
                break;
        }
    });

    // 新增：所有参数输入框变动时提示重新计算
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('input', function() {
            clearAllCharts();
            showRecalculationNotice();
        });
        input.addEventListener('change', function() {
            clearAllCharts();
            showRecalculationNotice();
        });
    });

    // 切换模型详细说明的显示状态
    // if (toggleDetailsBtn && modelFullDetails) {
    //     toggleDetailsBtn.addEventListener('click', () => {
    //         const isHidden = !modelFullDetails.classList.contains('details-visible');
    //         if (isHidden) {
    //             modelFullDetails.classList.add('details-visible');
    //             toggleDetailsBtn.textContent = '隐藏详细说明';
    //             // 可选：平滑滚动到详情区域的顶部
    //             // setTimeout(() => { // 延迟以等待展开动画完成
    //             //     modelFullDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    //             // }, 700); // 动画时间
    //         } else {
    //             modelFullDetails.classList.remove('details-visible');
    //             toggleDetailsBtn.textContent = '显示详细说明';
    //         }
    //     });
    // }

    // 切换Dill模型详细说明的显示状态
    const dillToggleBtn = document.getElementById('dill-toggle-details');
    const dillFullDetails = document.getElementById('dill-full-details');
    if (dillToggleBtn && dillFullDetails) {
        // 默认收起
        dillFullDetails.classList.remove('details-visible');
        dillToggleBtn.classList.remove('active');
        dillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        dillToggleBtn.addEventListener('click', function() {
            const isHidden = !dillFullDetails.classList.contains('details-visible');
            if (isHidden) {
                dillFullDetails.classList.add('details-visible');
                dillToggleBtn.classList.add('active');
                dillToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                dillFullDetails.classList.remove('details-visible');
                dillToggleBtn.classList.remove('active');
                dillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            }
        });
    }
    // 切换增强Dill模型详细说明的显示状态
    const enhancedDillToggleBtn = document.getElementById('enhanced-dill-toggle-details');
    const enhancedDillFullDetails = document.getElementById('enhanced-dill-full-details');
    if (enhancedDillToggleBtn && enhancedDillFullDetails) {
        // 默认收起
        enhancedDillFullDetails.classList.remove('details-visible');
        enhancedDillToggleBtn.classList.remove('active');
        enhancedDillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        enhancedDillToggleBtn.addEventListener('click', function() {
            const isHidden = !enhancedDillFullDetails.classList.contains('details-visible');
            if (isHidden) {
                enhancedDillFullDetails.classList.add('details-visible');
                enhancedDillToggleBtn.classList.add('active');
                enhancedDillToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                enhancedDillFullDetails.classList.remove('details-visible');
                enhancedDillToggleBtn.classList.remove('active');
                enhancedDillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            }
        });
    }
    
    // 切换CAR模型详细说明的显示状态
    const carToggleBtn = document.getElementById('car-toggle-details');
    const carFullDetails = document.getElementById('car-full-details');
    if (carToggleBtn && carFullDetails) {
        // 默认收起
        carFullDetails.classList.remove('details-visible');
        carToggleBtn.classList.remove('active');
        carToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        carToggleBtn.addEventListener('click', function() {
            const isHidden = !carFullDetails.classList.contains('details-visible');
            if (isHidden) {
                carFullDetails.classList.add('details-visible');
                carToggleBtn.classList.add('active');
                carToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                carFullDetails.classList.remove('details-visible');
                carToggleBtn.classList.remove('active');
                carToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            }
        });
    }

    // 应用进入动画
    applyEntryAnimations();

    // 模型选择与说明区域入场动画
    setTimeout(() => {
        if(modelSelectionSection) modelSelectionSection.classList.add('loaded');
    }, 100); // 延迟一点点确保页面元素已就绪

    // 导出图片和数据功能 - 添加安全检查
    const exportExposureImg = document.getElementById('export-exposure-img');
    if (exportExposureImg) {
        exportExposureImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('exposure-plot-container'), {format: 'png', filename: 'exposure_plot'});
        };
    }
    
    const exportThicknessImg = document.getElementById('export-thickness-img');
    if (exportThicknessImg) {
        exportThicknessImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('thickness-plot-container'), {format: 'png', filename: 'thickness_plot'});
        };
    }
    
    const exportExposureData = document.getElementById('export-exposure-data');
    if (exportExposureData) {
        exportExposureData.onclick = function() {
            exportPlotData('exposure');
        };
    }
    
    const exportThicknessData = document.getElementById('export-thickness-data');
    if (exportThicknessData) {
        exportThicknessData.onclick = function() {
            exportPlotData('thickness');
        };
    }
    
    // 增强DILL模型专用的X平面导出功能 - 添加安全检查
    const exportEnhancedDillXPlaneExposureImg = document.getElementById('export-enhanced-dill-x-plane-exposure-img');
    if (exportEnhancedDillXPlaneExposureImg) {
        exportEnhancedDillXPlaneExposureImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-x-plane-exposure-container'), {format: 'png', filename: 'enhanced_dill_x_plane_exposure'});
        };
    }
    
    const exportEnhancedDillXPlaneThicknessImg = document.getElementById('export-enhanced-dill-x-plane-thickness-img');
    if (exportEnhancedDillXPlaneThicknessImg) {
        exportEnhancedDillXPlaneThicknessImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-x-plane-thickness-container'), {format: 'png', filename: 'enhanced_dill_x_plane_thickness'});
        };
    }
    
    const exportEnhancedDillXPlaneExposureData = document.getElementById('export-enhanced-dill-x-plane-exposure-data');
    if (exportEnhancedDillXPlaneExposureData) {
        exportEnhancedDillXPlaneExposureData.onclick = function() {
            exportPlotData('enhanced_dill_x_plane_exposure');
        };
    }
    
    const exportEnhancedDillXPlaneThicknessData = document.getElementById('export-enhanced-dill-x-plane-thickness-data');
    if (exportEnhancedDillXPlaneThicknessData) {
        exportEnhancedDillXPlaneThicknessData.onclick = function() {
            exportPlotData('enhanced_dill_x_plane_thickness');
        };
    }
    
    // 增强DILL模型专用的Y平面导出功能 - 添加安全检查
    const exportEnhancedDillYPlaneExposureImg = document.getElementById('export-enhanced-dill-y-plane-exposure-img');
    if (exportEnhancedDillYPlaneExposureImg) {
        exportEnhancedDillYPlaneExposureImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-y-plane-exposure-container'), {format: 'png', filename: 'enhanced_dill_y_plane_exposure'});
        };
    }
    
    const exportEnhancedDillYPlaneThicknessImg = document.getElementById('export-enhanced-dill-y-plane-thickness-img');
    if (exportEnhancedDillYPlaneThicknessImg) {
        exportEnhancedDillYPlaneThicknessImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-y-plane-thickness-container'), {format: 'png', filename: 'enhanced_dill_y_plane_thickness'});
        };
    }
    
    const exportEnhancedDillYPlaneExposureData = document.getElementById('export-enhanced-dill-y-plane-exposure-data');
    if (exportEnhancedDillYPlaneExposureData) {
        exportEnhancedDillYPlaneExposureData.onclick = function() {
            exportPlotData('enhanced_dill_y_plane_exposure');
        };
    }
    
    const exportEnhancedDillYPlaneThicknessData = document.getElementById('export-enhanced-dill-y-plane-thickness-data');
    if (exportEnhancedDillYPlaneThicknessData) {
        exportEnhancedDillYPlaneThicknessData.onclick = function() {
            exportPlotData('enhanced_dill_y_plane_thickness');
        };
    }

    // 正弦波类型切换逻辑（Dill） - 添加安全检查
    const dillSineType = document.getElementById('dill-sine-type');
    const dillMultisineParams = document.getElementById('dill-multisine-params');
    const dill3DSineParams = document.getElementById('dill-3dsine-params');
    const dillK = document.getElementById('K') ? document.getElementById('K').closest('.parameter-item') : null;
    
    // 改用正确的参数项选择器 - 添加安全检查
    const dillYRange = dillMultisineParams ? dillMultisineParams.querySelector('.parameter-item:last-child') : null;
    
    function updateDillYRangeDisplay() {
        if (dillSineType && dillSineType.value === 'multi') {
            if(dillYRange) dillYRange.style.display = '';
        } else {
            if(dillYRange) dillYRange.style.display = 'none';
        }
    }
    
    if (dillSineType) {
        dillSineType.addEventListener('change', function() {
            console.log('正弦波类型切换:', this.value);
            if (this.value === 'multi') {
                if (dillMultisineParams) dillMultisineParams.style.display = 'block';
                if (dill3DSineParams) dill3DSineParams.style.display = 'none';
                if (dillK) dillK.style.display = 'none';
            } else if (this.value === '3d') {
                if (dillMultisineParams) dillMultisineParams.style.display = 'none';
                if (dill3DSineParams) dill3DSineParams.style.display = 'block';
                if (dillK) dillK.style.display = 'none';
            } else {
                if (dillMultisineParams) dillMultisineParams.style.display = 'none';
                if (dill3DSineParams) dill3DSineParams.style.display = 'none';
                if (dillK) dillK.style.display = '';
            }
            updateDillYRangeDisplay();
        });
        // 新增：页面加载时主动触发一次change，确保初始状态正确
        dillSineType.dispatchEvent(new Event('change'));
        updateDillYRangeDisplay();
    }
    
    // 正弦波类型切换逻辑（增强Dill） - 添加安全检查
    const enhancedDillSineType = document.getElementById('enhanced-dill-sine-type');
    const enhancedDillMultisineParams = document.getElementById('enhanced-dill-multisine-params');
    const enhancedDill3DSineParams = document.getElementById('enhanced-dill-3dsine-params');
    const enhancedK = document.getElementById('enhanced_K');
    const enhancedKItem = document.getElementById('enhanced-dill-params')?.querySelector('#K')?.closest('.parameter-item');
    
    if (enhancedDillSineType) {
        enhancedDillSineType.addEventListener('change', function() {
            if (this.value === 'multi') {
                if (enhancedDillMultisineParams) enhancedDillMultisineParams.style.display = 'block';
                if (enhancedDill3DSineParams) enhancedDill3DSineParams.style.display = 'none';
                if (enhancedKItem) enhancedKItem.style.display = 'none';
            } else if (this.value === '3d') {
                if (enhancedDillMultisineParams) enhancedDillMultisineParams.style.display = 'none';
                if (enhancedDill3DSineParams) enhancedDill3DSineParams.style.display = 'block';
                if (enhancedKItem) enhancedKItem.style.display = 'none';
            } else {
                if (enhancedDillMultisineParams) enhancedDillMultisineParams.style.display = 'none';
                if (enhancedDill3DSineParams) enhancedDill3DSineParams.style.display = 'none';
                if (enhancedKItem) enhancedKItem.style.display = '';
            }
        });
    }
    
    // 正弦波类型切换逻辑（CAR） - 添加安全检查
    const carSineType = document.getElementById('car-sine-type');
    const carMultisineParams = document.getElementById('car-multisine-params');
    const car3DSineParams = document.getElementById('car-3dsine-params');
    const carKElement = document.getElementById('car_K');
    const carK = carKElement ? carKElement.closest('.parameter-item') : null;
    
    if (carSineType) {
        carSineType.addEventListener('change', function() {
            if (this.value === 'multi') {
                if (carMultisineParams) carMultisineParams.style.display = 'block';
                if (car3DSineParams) car3DSineParams.style.display = 'none';
                if (carK) carK.style.display = 'none';
            } else if (this.value === '3d') {
                if (carMultisineParams) carMultisineParams.style.display = 'none';
                if (car3DSineParams) car3DSineParams.style.display = 'block';
                if (carK) carK.style.display = 'none';
            } else {
                if (carMultisineParams) carMultisineParams.style.display = 'none';
                if (car3DSineParams) car3DSineParams.style.display = 'none';
                if (carK) carK.style.display = '';
            }
        });
    }

    // 添加Enhanced DILL层显示模式控制功能
    function addEnhancedDillLayerModeControl() {
        // 检查是否已经添加了控制元素
        if (document.getElementById('enhanced-dill-layer-mode-control')) {
            return;
        }
        
        // 寻找Enhanced DILL模型的控制面板
        const enhancedDillContainer = document.querySelector('#enhanced-dill-4d-animation-container') ||
                                      document.querySelector('.enhanced-dill-controls') ||
                                      document.querySelector('#enhanced-dill-model-tab');
        
        if (!enhancedDillContainer) {
            console.log('未找到Enhanced DILL控制容器，稍后重试');
            // 稍后再试
            setTimeout(addEnhancedDillLayerModeControl, 1000);
            return;
        }
        
        // 创建层控制元素
        const layerControlDiv = document.createElement('div');
        layerControlDiv.id = 'enhanced-dill-layer-mode-control';
        layerControlDiv.className = 'enhanced-dill-layer-control mb-3 p-2 border rounded';
        layerControlDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <label class="form-label me-2 mb-0">🎭 3D层显示模式:</label>
                <select id="enhanced-dill-layer-mode-select" class="form-select form-select-sm" style="width: auto;">
                    <option value="single">🔹 仅表面层</option>
                    <option value="multi" selected>🔶 多层显示 (表面+中间+底部)</option>
                    <option value="all">🔷 全部层显示 (最多5层)</option>
                </select>
                <small class="text-muted ms-2">影响4D动画的层数显示</small>
            </div>
        `;
        
        // 插入到容器的开头
        enhancedDillContainer.insertBefore(layerControlDiv, enhancedDillContainer.firstChild);
        
        // 绑定事件处理
        const layerModeSelect = document.getElementById('enhanced-dill-layer-mode-select');
        if (layerModeSelect) {
            layerModeSelect.addEventListener('change', function() {
                const newMode = this.value;
                window.enhancedDillLayerMode = newMode;
                
                console.log(`Enhanced DILL层显示模式切换为: ${newMode}`);
                
                // 显示切换提示
                showLayerModeChangeNotification(newMode);
                
                // 如果动画正在播放，立即更新当前帧
                if (typeof enhancedDill4DAnimationState !== 'undefined' && 
                    enhancedDill4DAnimationState.isPlaying && 
                    typeof enhancedDill4DAnimationData !== 'undefined' && 
                    enhancedDill4DAnimationData) {
                    updateEnhancedDill4DAnimationFrame(enhancedDill4DAnimationState.currentFrame);
                }
            });
        }
        
        console.log('Enhanced DILL层显示模式控制已添加');
    }

    // 显示模式切换通知
    function showLayerModeChangeNotification(mode) {
        const modeDescriptions = {
            'single': '仅显示表面层 - 清晰查看表面效应',
            'multi': '显示3层 (表面+中间+底部) - 均衡的层次展示',
            'all': '显示全部层 - 完整的深度信息'
        };
        
        const description = modeDescriptions[mode] || '未知模式';
        
        // 创建临时通知
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        notification.innerHTML = `
            <strong>层显示模式已切换</strong><br>
            ${description}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // 在页面加载时添加控制元素
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟添加，确保页面元素已加载
        setTimeout(addEnhancedDillLayerModeControl, 2000);
    });

    // 也在模型切换时尝试添加
    document.addEventListener('modelTypeChanged', function() {
        setTimeout(addEnhancedDillLayerModeControl, 500);
    });
}

/**
 * 绑定滑块事件
 */
function bindSliderEvents() {
    // 获取所有参数滑块和输入框
    const parameterItems = document.querySelectorAll('.parameter-item');
    
    parameterItems.forEach(item => {
        const slider = item.querySelector('.slider');
        const input = item.querySelector('.number-input');
        if (!slider || !input) return; // 没有滑块或输入框直接跳过
        const valueDisplay = item.querySelector('.parameter-value');
        
        // 初始化滑块填充效果
        updateSliderFill(slider, item);
        
        // 滑块值变化时更新输入框
        slider.addEventListener('input', () => {
            input.value = slider.value;
            // 不再更新隐藏的valueDisplay
            // if (valueDisplay) valueDisplay.textContent = slider.value;
            
            // 更新滑块填充效果
            updateSliderFill(slider, item);
            
            // 为输入框添加脉动效果（替代原来的valueDisplay效果）
            input.classList.add('pulse');
            setTimeout(() => {
                input.classList.remove('pulse');
            }, 300);
            
            // 清空图表显示
            clearAllCharts();
        });
        
        // 输入框值变化时更新滑块
        input.addEventListener('input', () => {
            let value = parseFloat(input.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (isNaN(value) || value < min || value > max) {
                input.classList.add('input-error');
                input.setCustomValidity(LANGS[currentLang].error_message);
            } else {
                input.classList.remove('input-error');
                input.setCustomValidity('');
            }
            
            slider.value = value;
            // 确保输入框显示正确的值
            if (input.value != value) {
                input.value = value;
            }
            
            // 更新滑块填充效果
            updateSliderFill(slider, item);
            
            // 添加闪烁效果
            input.classList.add('blink');
            setTimeout(() => {
                input.classList.remove('blink');
            }, 300);
            
            // 清空图表显示
            clearAllCharts();
        });
    });
}

/**
 * 更新滑块填充效果
 * 
 * @param {HTMLElement} slider 滑块元素
 * @param {HTMLElement} item 参数项容器
 */
function updateSliderFill(slider, item) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const fillPercent = ((value - min) / (max - min)) * 100;
    
    // 设置CSS自定义属性
    item.style.setProperty('--fill-percent', `${fillPercent}%`);
}

/**
 * 获取参数值
 * 
 * @returns {Object} 参数对象
 */
function getParameterValues() {
    // 判断当前模型
    const modelType = document.getElementById('model-select').value;
    let params = { model_type: modelType };
    if (modelType === 'dill') {
        const sineTypeElement = document.getElementById('dill-sine-type');
        const sineType = sineTypeElement ? sineTypeElement.value : 'single';
        params.sine_type = sineType;
        
        // 添加空值检查的参数获取
        const I_avg_elem = document.getElementById('I_avg');
        const V_elem = document.getElementById('V');
        const t_exp_elem = document.getElementById('t_exp');
        const C_elem = document.getElementById('C');
        
        params.I_avg = I_avg_elem ? parseFloat(I_avg_elem.value) || 1.0 : 1.0;
        params.V = V_elem ? parseFloat(V_elem.value) || 0.8 : 0.8;
        params.t_exp = t_exp_elem ? parseFloat(t_exp_elem.value) || 5.0 : 5.0;
        params.C = C_elem ? parseFloat(C_elem.value) || 0.01 : 0.01;
        if (sineType === 'single') {
            // 首先设置K参数（必需参数）
            const K_elem = document.getElementById('K');
            params.K = K_elem ? parseFloat(K_elem.value) || 2.0 : 2.0;
            
            // 检查1D动画参数
            const enable1DAnimationElem = document.getElementById('enable_1d_animation_dill');
            const enable1DAnimation = enable1DAnimationElem ? enable1DAnimationElem.checked || false : false;
            if (enable1DAnimation) {
                params.enable_1d_animation = true;
                const t_start_1d_elem = document.getElementById('t_start_1d_dill');
                const t_end_1d_elem = document.getElementById('t_end_1d_dill');
                const time_steps_1d_elem = document.getElementById('time_steps_1d_dill');
                
                params.t_start = t_start_1d_elem ? parseFloat(t_start_1d_elem.value) || 0 : 0;
                params.t_end = t_end_1d_elem ? parseFloat(t_end_1d_elem.value) || 5 : 5;
                params.time_steps = time_steps_1d_elem ? parseInt(time_steps_1d_elem.value) || 500 : 500;
                console.log('DILL模型1D模式启用时间动画:', params.enable_1d_animation, '时间范围:', params.t_start, '-', params.t_end, '步数:', params.time_steps);
            }
            
            // 检查1D V评估参数
            const enable1DVEvaluationElem = document.getElementById('enable_1d_v_evaluation_dill');
            const enable1DVEvaluation = enable1DVEvaluationElem ? enable1DVEvaluationElem.checked || false : false;
            if (enable1DVEvaluation) {
                params.enable_1d_v_evaluation = true;
                const v_start_1d_elem = document.getElementById('v_start_1d_dill');
                const v_end_1d_elem = document.getElementById('v_end_1d_dill');
                const v_steps_1d_elem = document.getElementById('v_steps_1d_dill');
                
                params.v_start = v_start_1d_elem ? parseFloat(v_start_1d_elem.value) || 0.1 : 0.1;
                params.v_end = v_end_1d_elem ? parseFloat(v_end_1d_elem.value) || 1.0 : 1.0;
                params.time_steps = v_steps_1d_elem ? parseInt(v_steps_1d_elem.value) || 500 : 500;
                console.log('DILL模型1D模式启用V评估:', params.enable_1d_v_evaluation, 'V范围:', params.v_start, '-', params.v_end, '步数:', params.time_steps);
            }
        } else if (sineType === 'multi') {
            const Kx_elem = document.getElementById('Kx');
            const Ky_elem = document.getElementById('Ky');
            const phi_expr_elem = document.getElementById('phi_expr');
            const y_min_elem = document.getElementById('y_min');
            const y_max_elem = document.getElementById('y_max');
            const y_points_elem = document.getElementById('y_points');
            
            params.Kx = Kx_elem ? parseFloat(Kx_elem.value) || 2.0 : 2.0;
            params.Ky = Ky_elem ? parseFloat(Ky_elem.value) || 0.0 : 0.0;
            params.phi_expr = phi_expr_elem ? phi_expr_elem.value || '0' : '0';
            // y范围参数
            params.y_min = y_min_elem ? parseFloat(y_min_elem.value) || 0.0 : 0.0;
            params.y_max = y_max_elem ? parseFloat(y_max_elem.value) || 10.0 : 10.0;
            params.y_points = y_points_elem ? parseInt(y_points_elem.value) || 100 : 100;
        } else if (sineType === '3d') {
            const Kx_3d_elem = document.getElementById('Kx_3d');
            const Ky_3d_elem = document.getElementById('Ky_3d');
            const Kz_3d_elem = document.getElementById('Kz_3d');
            const phi_expr_3d_elem = document.getElementById('phi_expr_3d');
            const x_min_3d_elem = document.getElementById('x_min_3d');
            const x_max_3d_elem = document.getElementById('x_max_3d');
            const y_min_3d_elem = document.getElementById('y_min_3d');
            const y_max_3d_elem = document.getElementById('y_max_3d');
            const z_min_3d_elem = document.getElementById('z_min_3d');
            const z_max_3d_elem = document.getElementById('z_max_3d');
            
            params.Kx = Kx_3d_elem ? parseFloat(Kx_3d_elem.value) || 2.0 : 2.0;
            params.Ky = Ky_3d_elem ? parseFloat(Ky_3d_elem.value) || 2.0 : 2.0;
            params.Kz = Kz_3d_elem ? parseFloat(Kz_3d_elem.value) || 2.0 : 2.0;
            params.phi_expr = phi_expr_3d_elem ? phi_expr_3d_elem.value || '0' : '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = x_min_3d_elem ? parseFloat(x_min_3d_elem.value) || 0.0 : 0.0;
            params.x_max = x_max_3d_elem ? parseFloat(x_max_3d_elem.value) || 10.0 : 10.0;
            params.y_min = y_min_3d_elem ? parseFloat(y_min_3d_elem.value) || 0.0 : 0.0;
            params.y_max = y_max_3d_elem ? parseFloat(y_max_3d_elem.value) || 10.0 : 10.0;
            params.z_min = z_min_3d_elem ? parseFloat(z_min_3d_elem.value) || 0.0 : 0.0;
            params.z_max = z_max_3d_elem ? parseFloat(z_max_3d_elem.value) || 10.0 : 10.0;
            
            // 检查4D动画参数
            const enable4DAnimationElem = document.getElementById('enable_4d_animation_dill');
            const enable4DAnimation = enable4DAnimationElem ? enable4DAnimationElem.checked || false : false;
            if (enable4DAnimation) {
                params.enable_4d_animation = true;
                const t_start_elem = document.getElementById('t_start_dill');
                const t_end_elem = document.getElementById('t_end_dill');
                const time_steps_elem = document.getElementById('time_steps_dill');
                
                params.t_start = t_start_elem ? parseFloat(t_start_elem.value) || 0 : 0;
                params.t_end = t_end_elem ? parseFloat(t_end_elem.value) || 5 : 5;
                params.time_steps = time_steps_elem ? parseInt(time_steps_elem.value) || 500 : 500;
                console.log('DILL模型3D模式启用4D动画:', params.enable_4d_animation, '时间范围:', params.t_start, '-', params.t_end, '步数:', params.time_steps);
                console.log('4D动画相位表达式:', params.phi_expr);
                
                // 检查相位表达式是否包含时间变量
                if (params.phi_expr && !params.phi_expr.includes('t') && params.phi_expr !== '0') {
                    console.warn('⚠️ 4D动画提示：相位表达式不包含时间变量t，动画可能不会有变化。建议使用sin(t)、cos(t)等时间相关表达式。');
                } else if (params.phi_expr === '0') {
                    console.warn('⚠️ 4D动画提示：相位表达式为常数0，动画不会有变化。建议改为sin(t)等时间相关表达式。');
                }
            }
        } else {
            const K_elem = document.getElementById('K');
            params.K = K_elem ? parseFloat(K_elem.value) || 2.0 : 2.0;
        }
    } else if (modelType === 'enhanced_dill') {
        const sineTypeElement = document.getElementById('enhanced-dill-sine-type');
        const sineType = sineTypeElement ? sineTypeElement.value : 'single';
        params.sine_type = sineType;
        
        // 添加空值检查的参数获取
        const z_h_elem = document.getElementById('z_h');
        const T_elem = document.getElementById('T');
        const t_B_elem = document.getElementById('t_B');
        const I0_elem = document.getElementById('I0');
        const M0_elem = document.getElementById('M0');
        const t_exp_enhanced_elem = document.getElementById('t_exp_enhanced');
        const enhanced_V_elem = document.getElementById('enhanced_V');
        
        params.z_h = z_h_elem ? parseFloat(z_h_elem.value) || 1.0 : 1.0;
        params.T = T_elem ? parseFloat(T_elem.value) || 95.0 : 95.0;
        params.t_B = t_B_elem ? parseFloat(t_B_elem.value) || 90.0 : 90.0;
        params.I0 = I0_elem ? parseFloat(I0_elem.value) || 1.0 : 1.0;
        params.M0 = M0_elem ? parseFloat(M0_elem.value) || 1.0 : 1.0;
        params.t_exp = t_exp_enhanced_elem ? parseFloat(t_exp_enhanced_elem.value) || 5.0 : 5.0;
        
        // 确保V参数在所有模式下都存在，并有合理的默认值
        params.V = enhanced_V_elem ? parseFloat(enhanced_V_elem.value) || 0.8 : 0.8;
        
        // 添加增强Dill模型的干涉条纹可见度(V)参数
        if (sineType === 'single') {
            const enhanced_K_elem = document.getElementById('enhanced_K');
            params.K = enhanced_K_elem ? parseFloat(enhanced_K_elem.value) || 2.0 : 2.0;
            console.log(`Enhanced Dill 1D模式: V=${params.V}, K=${params.K}`);
        }
        
        // 优化：无论 single 还是 multi 都传递 K
        if (!params.K) {
            const enhanced_K_elem = document.getElementById('enhanced_K');
            if (enhanced_K_elem) {
                params.K = parseFloat(enhanced_K_elem.value) || 2.0;
            } else {
                params.K = 2.0;
            }
        }
        
        if (sineType === 'multi') {
            const enhanced_Kx_elem = document.getElementById('enhanced_Kx');
            const enhanced_Ky_elem = document.getElementById('enhanced_Ky');
            const enhanced_phi_expr_elem = document.getElementById('enhanced_phi_expr');
            const enhanced_y_min_elem = document.getElementById('enhanced_y_min');
            const enhanced_y_max_elem = document.getElementById('enhanced_y_max');
            const enhanced_y_points_elem = document.getElementById('enhanced_y_points');
            
            params.Kx = enhanced_Kx_elem ? parseFloat(enhanced_Kx_elem.value) || 2.0 : 2.0;
            params.Ky = enhanced_Ky_elem ? parseFloat(enhanced_Ky_elem.value) || 0.0 : 0.0;
            params.phi_expr = enhanced_phi_expr_elem ? enhanced_phi_expr_elem.value || '0' : '0';
            // 添加Y轴范围参数
            params.y_min = enhanced_y_min_elem ? parseFloat(enhanced_y_min_elem.value) || 0.0 : 0.0;
            params.y_max = enhanced_y_max_elem ? parseFloat(enhanced_y_max_elem.value) || 10.0 : 10.0;
            params.y_points = enhanced_y_points_elem ? parseInt(enhanced_y_points_elem.value) || 100 : 100;
            
            // 确保K参数存在
            if (!params.K) {
                params.K = params.Kx;
            }
        } else if (sineType === '3d') {
            const enhanced_Kx_3d_elem = document.getElementById('enhanced_Kx_3d');
            const enhanced_Ky_3d_elem = document.getElementById('enhanced_Ky_3d');
            const enhanced_Kz_3d_elem = document.getElementById('enhanced_Kz_3d');
            const enhanced_phi_expr_3d_elem = document.getElementById('enhanced_phi_expr_3d');
            const enhanced_x_min_3d_elem = document.getElementById('enhanced_x_min_3d');
            const enhanced_x_max_3d_elem = document.getElementById('enhanced_x_max_3d');
            const enhanced_y_min_3d_elem = document.getElementById('enhanced_y_min_3d');
            const enhanced_y_max_3d_elem = document.getElementById('enhanced_y_max_3d');
            const enhanced_z_min_3d_elem = document.getElementById('enhanced_z_min_3d');
            const enhanced_z_max_3d_elem = document.getElementById('enhanced_z_max_3d');
            
            params.Kx = enhanced_Kx_3d_elem ? parseFloat(enhanced_Kx_3d_elem.value) || 2.0 : 2.0;
            params.Ky = enhanced_Ky_3d_elem ? parseFloat(enhanced_Ky_3d_elem.value) || 2.0 : 2.0;
            params.Kz = enhanced_Kz_3d_elem ? parseFloat(enhanced_Kz_3d_elem.value) || 2.0 : 2.0;
            params.phi_expr = enhanced_phi_expr_3d_elem ? enhanced_phi_expr_3d_elem.value || '0' : '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = enhanced_x_min_3d_elem ? parseFloat(enhanced_x_min_3d_elem.value) || 0.0 : 0.0;
            params.x_max = enhanced_x_max_3d_elem ? parseFloat(enhanced_x_max_3d_elem.value) || 10.0 : 10.0;
            params.y_min = enhanced_y_min_3d_elem ? parseFloat(enhanced_y_min_3d_elem.value) || 0.0 : 0.0;
            params.y_max = enhanced_y_max_3d_elem ? parseFloat(enhanced_y_max_3d_elem.value) || 10.0 : 10.0;
            params.z_min = enhanced_z_min_3d_elem ? parseFloat(enhanced_z_min_3d_elem.value) || 0.0 : 0.0;
            params.z_max = enhanced_z_max_3d_elem ? parseFloat(enhanced_z_max_3d_elem.value) || 10.0 : 10.0;
            
            // 检查增强DILL模型4D动画参数
            const enable4DAnimationElem = document.getElementById('enable_4d_animation_enhanced_dill');
            const enable4DAnimation = enable4DAnimationElem ? enable4DAnimationElem.checked || false : false;
            if (enable4DAnimation) {
                params.enable_4d_animation = true;
                const t_start_elem = document.getElementById('t_start_enhanced_dill');
                const t_end_elem = document.getElementById('t_end_enhanced_dill');
                const time_steps_elem = document.getElementById('time_steps_enhanced_dill');
                
                params.t_start = t_start_elem ? parseFloat(t_start_elem.value) || 0 : 0;
                params.t_end = t_end_elem ? parseFloat(t_end_elem.value) || 5 : 5;
                params.time_steps = time_steps_elem ? parseInt(time_steps_elem.value) || 500 : 500;
                console.log('Enhanced DILL模型3D模式启用4D动画:', params.enable_4d_animation, '时间范围:', params.t_start, '-', params.t_end, '步数:', params.time_steps);
                console.log('Enhanced DILL 4D动画相位表达式:', params.phi_expr);
                
                // 检查相位表达式是否包含时间变量
                if (params.phi_expr && !params.phi_expr.includes('t') && params.phi_expr !== '0') {
                    console.warn('⚠️ Enhanced DILL 4D动画提示：相位表达式不包含时间变量t，动画可能不会有变化。建议使用sin(t)、cos(t)等时间相关表达式。');
                } else if (params.phi_expr === '0') {
                    console.warn('⚠️ Enhanced DILL 4D动画提示：相位表达式为常数0，动画不会有变化。建议改为sin(t)等时间相关表达式。');
                }
            } else {
                // 确保4D动画参数不会被传递
                params.enable_4d_animation = false;
                console.log('Enhanced DILL模型4D动画已禁用');
            }
        }
        
        // 最后确保关键参数都有值
        if (!params.K) {
            params.K = 2.0; // 默认空间频率
        }
        
        console.log('Enhanced DILL模型参数校验:', {
            sine_type: params.sine_type,
            V: params.V,
            K: params.K,
            Kx: params.Kx,
            Ky: params.Ky,
            enable_4d_animation: params.enable_4d_animation
        });
    } else if (modelType === 'car') {
        const sineTypeElement = document.getElementById('car-sine-type');
        const sineType = sineTypeElement ? sineTypeElement.value : 'single';
        params.sine_type = sineType;
        
        // 添加空值检查的参数获取
        const car_I_avg_elem = document.getElementById('car_I_avg');
        const car_V_elem = document.getElementById('car_V');
        const car_t_exp_elem = document.getElementById('car_t_exp');
        const car_acid_gen_efficiency_elem = document.getElementById('car_acid_gen_efficiency');
        const car_diffusion_length_elem = document.getElementById('car_diffusion_length');
        const car_reaction_rate_elem = document.getElementById('car_reaction_rate');
        const car_amplification_elem = document.getElementById('car_amplification');
        const car_contrast_elem = document.getElementById('car_contrast');
        
        params.I_avg = car_I_avg_elem ? parseFloat(car_I_avg_elem.value) : 1.0;
        params.V = car_V_elem ? parseFloat(car_V_elem.value) : 0.8;
        params.t_exp = car_t_exp_elem ? parseFloat(car_t_exp_elem.value) : 5.0;
        params.acid_gen_efficiency = car_acid_gen_efficiency_elem ? parseFloat(car_acid_gen_efficiency_elem.value) : 0.5;
        params.diffusion_length = car_diffusion_length_elem ? parseFloat(car_diffusion_length_elem.value) : 0.02;
        params.reaction_rate = car_reaction_rate_elem ? parseFloat(car_reaction_rate_elem.value) : 0.5;
        params.amplification = car_amplification_elem ? parseFloat(car_amplification_elem.value) : 5.0;
        params.contrast = car_contrast_elem ? parseFloat(car_contrast_elem.value) : 4.0;
        
        // 确保参数有效，提供默认值
        params.I_avg = isNaN(params.I_avg) ? 1.0 : params.I_avg;
        params.V = isNaN(params.V) ? 0.8 : params.V;
        params.t_exp = isNaN(params.t_exp) ? 5.0 : params.t_exp;
        params.acid_gen_efficiency = isNaN(params.acid_gen_efficiency) ? 0.5 : params.acid_gen_efficiency;
        params.diffusion_length = isNaN(params.diffusion_length) ? 0.02 : params.diffusion_length;
        params.reaction_rate = isNaN(params.reaction_rate) ? 0.5 : params.reaction_rate;
        params.amplification = isNaN(params.amplification) ? 5.0 : params.amplification;
        params.contrast = isNaN(params.contrast) ? 4.0 : params.contrast;
        
        // 添加可选的兼容字段
        params.initial_intensity = params.I_avg;  // 确保后端可以识别
        params.visibility = params.V;             // 可见度别名
        
        if (sineType === 'multi') {
            const car_Kx_elem = document.getElementById('car_Kx');
            const car_Ky_elem = document.getElementById('car_Ky');
            const car_phi_expr_elem = document.getElementById('car_phi_expr');
            const car_y_min_elem = document.getElementById('car_y_min');
            const car_y_max_elem = document.getElementById('car_y_max');
            const car_y_points_elem = document.getElementById('car_y_points');
            
            params.Kx = car_Kx_elem ? parseFloat(car_Kx_elem.value) : 2.0;
            params.Ky = car_Ky_elem ? parseFloat(car_Ky_elem.value) : 0.0;
            params.phi_expr = car_phi_expr_elem ? car_phi_expr_elem.value : '0';
            // 使用CAR模型自己的Y轴范围参数
            params.y_min = car_y_min_elem ? parseFloat(car_y_min_elem.value) : 0.0;
            params.y_max = car_y_max_elem ? parseFloat(car_y_max_elem.value) : 10.0;
            params.y_points = car_y_points_elem ? parseInt(car_y_points_elem.value) : 100;
            
            // 参数有效性校验
            params.Kx = isNaN(params.Kx) ? 2.0 : params.Kx;
            params.Ky = isNaN(params.Ky) ? 0.0 : params.Ky;
            params.phi_expr = params.phi_expr || '0';  // 提供默认相位表达式
            params.y_min = isNaN(params.y_min) ? 0.0 : params.y_min;
            params.y_max = isNaN(params.y_max) ? 10.0 : params.y_max;
            params.y_points = isNaN(params.y_points) ? 100 : params.y_points;
        } else if (sineType === '3d') {
            const car_Kx_3d_elem = document.getElementById('car_Kx_3d');
            const car_Ky_3d_elem = document.getElementById('car_Ky_3d');
            const car_Kz_3d_elem = document.getElementById('car_Kz_3d');
            const car_phi_expr_3d_elem = document.getElementById('car_phi_expr_3d');
            const car_x_min_3d_elem = document.getElementById('car_x_min_3d');
            const car_x_max_3d_elem = document.getElementById('car_x_max_3d');
            const car_y_min_3d_elem = document.getElementById('car_y_min_3d');
            const car_y_max_3d_elem = document.getElementById('car_y_max_3d');
            const car_z_min_3d_elem = document.getElementById('car_z_min_3d');
            const car_z_max_3d_elem = document.getElementById('car_z_max_3d');
            
            params.Kx = car_Kx_3d_elem ? parseFloat(car_Kx_3d_elem.value) : 2.0;
            params.Ky = car_Ky_3d_elem ? parseFloat(car_Ky_3d_elem.value) : 2.0;
            params.Kz = car_Kz_3d_elem ? parseFloat(car_Kz_3d_elem.value) : 2.0;
            params.phi_expr = car_phi_expr_3d_elem ? car_phi_expr_3d_elem.value : '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = car_x_min_3d_elem ? parseFloat(car_x_min_3d_elem.value) : 0.0;
            params.x_max = car_x_max_3d_elem ? parseFloat(car_x_max_3d_elem.value) : 10.0;
            params.y_min = car_y_min_3d_elem ? parseFloat(car_y_min_3d_elem.value) : 0.0;
            params.y_max = car_y_max_3d_elem ? parseFloat(car_y_max_3d_elem.value) : 10.0;
            params.z_min = car_z_min_3d_elem ? parseFloat(car_z_min_3d_elem.value) : 0.0;
            params.z_max = car_z_max_3d_elem ? parseFloat(car_z_max_3d_elem.value) : 10.0;
            
            // 参数有效性校验
            params.Kx = isNaN(params.Kx) ? 2.0 : params.Kx;
            params.Ky = isNaN(params.Ky) ? 2.0 : params.Ky;
            params.Kz = isNaN(params.Kz) ? 2.0 : params.Kz;
            params.phi_expr = params.phi_expr || '0';
            params.x_min = isNaN(params.x_min) ? 0.0 : params.x_min;
            params.x_max = isNaN(params.x_max) ? 10.0 : params.x_max;
            params.y_min = isNaN(params.y_min) ? 0.0 : params.y_min;
            params.y_max = isNaN(params.y_max) ? 10.0 : params.y_max;
            params.z_min = isNaN(params.z_min) ? 0.0 : params.z_min;
            params.z_max = isNaN(params.z_max) ? 10.0 : params.z_max;
        } else {
            const car_K_elem = document.getElementById('car_K');
            params.K = car_K_elem ? parseFloat(car_K_elem.value) || 2.0 : 2.0;
        }
        
        // 无论模式如何，都确保K参数存在
        if (typeof params.K === 'undefined' && typeof params.Kx !== 'undefined') {
            params.K = params.Kx;
        }
    }
    return params;
}

/**
 * 调用API计算Dill模型
 * 
 * @param {Object} params 参数对象
 * @returns {Promise} Promise对象
 */
async function calculateDillModel(params) {
    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '计算失败');
        }
        
        return result.data;
    } catch (error) {
        console.error('API调用错误:', error);
        throw error;
    }
}

/**
 * 检查和转换CAR模型数据格式，确保与前端可视化兼容
 * @param {Object} data - 后端返回的原始数据
 * @returns {Object} - 处理后的数据
 */
function preprocessCarModelData(data) {
    if (!data) return data;
    
    console.log('预处理CAR模型数据');
    
    // 复制数据对象，避免修改原始数据
    const processedData = {...data};
    
    // 确保基本1D数据可用
    if (!processedData.x && processedData.positions) {
        processedData.x = processedData.positions;
    }
    
    if (!processedData.exposure_dose && processedData.acid_concentration) {
        processedData.exposure_dose = processedData.acid_concentration;
    }
    
    if (!processedData.thickness && processedData.deprotection) {
        processedData.thickness = processedData.deprotection;
    }
    
    // 处理2D/3D数据 
    if (processedData.grid_data) {
        // 确保坐标数据可用
        if (!processedData.x_coords && processedData.grid_data.x) {
            processedData.x_coords = processedData.grid_data.x;
        }
        
        if (!processedData.y_coords && processedData.grid_data.y) {
            processedData.y_coords = processedData.grid_data.y;
        }
        
        if (!processedData.z_coords && processedData.grid_data.z) {
            processedData.z_coords = processedData.grid_data.z;
        }
        
        // 确保曝光/厚度数据可用
        if (!processedData.z_exposure_dose && processedData.grid_data.acid_concentration) {
            processedData.z_exposure_dose = processedData.grid_data.acid_concentration;
        }
        
        if (!processedData.z_thickness && processedData.grid_data.deprotection) {
            processedData.z_thickness = processedData.grid_data.deprotection;
        }
    }
    
    // 增加标志，表示这是CAR数据
    processedData.is_car_data = true;
    
    return processedData;
}

/**
 * 调用API获取计算数据(用于交互式图表)
 * 
 * @param {Object} params 参数对象
 * @returns {Promise} Promise对象
 */
async function calculateDillModelData(params) {
    try {
        const response = await fetch('/api/calculate_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '数据计算失败');
        }
        
        let processedData = result.data;
        
        // 为CAR模型数据进行特殊处理
        if (params.model_type === 'car') {
            processedData = preprocessCarModelData(processedData);
        }
        
        return processedData;
    } catch (error) {
        console.error('API数据调用错误:', error);
        throw error;
    }
}

/**
 * 显示计算结果
 * 
 * @param {Object} data 结果数据
 */
function displayResults(data) {
    // 获取图像元素
    const exposurePlot = document.getElementById('exposure-plot');
    const thicknessPlot = document.getElementById('thickness-plot');
    
    // 设置图像源（Base64数据）
    exposurePlot.src = `data:image/png;base64,${data.exposure_plot}`;
    thicknessPlot.src = `data:image/png;base64,${data.thickness_plot}`;
    
    // 显示图像
    exposurePlot.style.display = 'block';
    thicknessPlot.style.display = 'block';
    
    // 隐藏交互式图表容器
    document.getElementById('exposure-plot-container').style.display = 'none';
    document.getElementById('thickness-plot-container').style.display = 'none';
    
    // 应用动画效果
    animateResults();
}

/**
 * 显示交互式计算结果
 * 
 * @param {Object} data 结果数据
 */
function displayInteractiveResults(data) {
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';

    // 调试输出，检查数据结构
    console.log('Received data for display:', data, 'Model type:', currentModelType);
    console.log('数据字段详情:', {
        keys: Object.keys(data),
        is_3d: data.is_3d,
        has_x_coords: !!data.x_coords,
        has_y_coords: !!data.y_coords,
        has_exposure_dose: !!data.exposure_dose,
        exposure_dose_type: Array.isArray(data.exposure_dose) ? 'array' : typeof data.exposure_dose,
        exposure_dose_length: data.exposure_dose ? data.exposure_dose.length : 'undefined',
        exposure_dose_first_element_type: data.exposure_dose && data.exposure_dose[0] ? (Array.isArray(data.exposure_dose[0]) ? '2d_array' : typeof data.exposure_dose[0]) : 'undefined'
    });

    const staticExposurePlot = document.getElementById('exposure-plot');
    const staticThicknessPlot = document.getElementById('thickness-plot');
    if (staticExposurePlot) staticExposurePlot.style.display = 'none';
    if (staticThicknessPlot) staticThicknessPlot.style.display = 'none';

    const exposurePlotContainer = document.getElementById('exposure-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-plot-container');
    
    if (!exposurePlotContainer || !thicknessPlotContainer) {
        console.error("One or more plot containers are missing from the DOM.");
        return;
    }

    // Get title elements to dynamically update them
    const exposureTitleElement = exposurePlotContainer.parentElement.querySelector('.plot-title');
    const thicknessTitleElement = thicknessPlotContainer.parentElement.querySelector('.plot-title');

    // 清空容器，确保旧图被移除
    exposurePlotContainer.innerHTML = '';
    thicknessPlotContainer.innerHTML = '';
    exposurePlotContainer.style.display = 'block';
    thicknessPlotContainer.style.display = 'block';

    // 检查是否有3D数据 - 支持静态3D和4D动画数据
    const has3DData = data.is_3d === true || 
                     (data.x_coords && data.y_coords && 
                      ((data.exposure_dose && Array.isArray(data.exposure_dose) && Array.isArray(data.exposure_dose[0])) ||
                       (data.exposure_dose_frames && Array.isArray(data.exposure_dose_frames))));

    // 检查是否有二维数据
    const has2DData = data.is_2d || (data.z_exposure_dose && data.z_thickness) || 
                     (data.x_coords && data.y_coords && (data.z_exposure_dose || data.z_thickness));
    
    console.log('数据维度判断结果:', {
        has3DData: has3DData,
        has2DData: has2DData,
        currentModelType: currentModelType
    });

    // Dynamically set titles based on data dimensions
    if (has3DData) {
        if (exposureTitleElement) exposureTitleElement.textContent = '曝光剂量分布 (3D)';
        if (thicknessTitleElement) thicknessTitleElement.textContent = '光刻胶厚度分布 (3D)';
    } else if (has2DData) {
        if (currentModelType === 'dill' || currentModelType === 'car') {
            if (exposureTitleElement) exposureTitleElement.textContent = '曝光计量分布 (2D)';
            if (thicknessTitleElement) thicknessTitleElement.textContent = '光刻胶厚度分布 (2D)';
        } else { // For 'enhanced_dill' model
            if (exposureTitleElement) exposureTitleElement.textContent = '曝光计量分布 (2D) (Y, Z平面)';
            if (thicknessTitleElement) thicknessTitleElement.textContent = '光刻胶厚度分布 (2D) (Y, Z平面)';
        }
    } else {
        if (exposureTitleElement) exposureTitleElement.textContent = '曝光计量分布 (1D)';
        if (thicknessTitleElement) thicknessTitleElement.textContent = '光刻胶厚度分布 (1D)';
    }

    // 新增：CAR模型特殊处理 - 始终使用2D热图
    if (currentModelType === 'car') {
        console.log('CAR模型特殊处理：使用专用渲染函数');
        
        // 清空主图表容器，防止重复渲染
        exposurePlotContainer.innerHTML = '';
        thicknessPlotContainer.innerHTML = '';
        exposurePlotContainer.style.display = 'block';
        thicknessPlotContainer.style.display = 'block';
        
        // 首先尝试渲染主图表
        if (has3DData) {
            // 3D数据使用3D可视化
            console.log('CAR模型使用3D可视化');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        } else if (has2DData) {
            // 已有2D数据格式，直接使用热图
            console.log('CAR模型渲染2D热图 - 已有2D数据格式');
            createExposureHeatmap(exposurePlotContainer, data);
            createThicknessHeatmap(thicknessPlotContainer, data);
        } else { // This implies !has3DData && !has2DData, so it should be 1D
            // 1D CAR数据，使用1D线图
            console.log('CAR模型渲染1D线图');
            // Backend for 1D CAR returns data.x, data.exposure_dose, data.thickness etc.
            if (data.x && (typeof data.exposure_dose !== 'undefined' || typeof data.thickness !== 'undefined')) {
                 createExposurePlot(exposurePlotContainer, data); 
                 createThicknessPlot(thicknessPlotContainer, data); 
            } else {
                console.error('CAR模型1D数据不完整或格式错误，无法渲染线图');
                exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">CAR模型1D曝光数据不完整或格式错误</div>';
                thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">CAR模型1D厚度数据不完整或格式错误</div>';
            }
        }
        
        // 渲染CAR模型特有的右侧多图表
        const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
        if (carInteractivePlotsContainer) {
            // 清空容器，确保不会堆叠显示
            carInteractivePlotsContainer.innerHTML = '';
            
            if (typeof renderCarInteractivePlots === 'function') {
                try {
                    renderCarInteractivePlots(data);
                    carInteractivePlotsContainer.style.display = 'block';
                } catch (error) {
                    console.error('渲染CAR模型交互图表出错:', error);
                    carInteractivePlotsContainer.innerHTML = '<div style="color:red;padding:20px;">CAR模型图表渲染失败: ' + error.message + '</div>';
                }
            } else {
                console.error('renderCarInteractivePlots函数未找到');
                carInteractivePlotsContainer.style.display = 'none';
            }
        }
        
        // 处理CAR模型4D动画数据
        if (data.animation_frames || data.initial_acid_frames) {
            console.log('检测到CAR模型4D动画数据，设置4D动画界面');
            if (typeof render4DAnimation === 'function') {
                render4DAnimation(data);
            }
            
            // 显示4D动画区域
            const car4DAnimationSection = document.getElementById('car-4d-animation-section');
            if (car4DAnimationSection) {
                car4DAnimationSection.style.display = 'block';
            }
        }
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型处理逻辑
        console.log('增强Dill模型数据处理', {has3DData, has2DData});
        
        // 首先检查是否有Enhanced DILL模型4D动画数据
        const hasEnhancedDill4DData = currentModelType === 'enhanced_dill' && (
            data.enable_4d_animation === true || 
            (data.exposure_dose_frames && Array.isArray(data.exposure_dose_frames) && data.exposure_dose_frames.length > 0) || 
            (data.thickness_frames && Array.isArray(data.thickness_frames) && data.thickness_frames.length > 0) || 
            (data.time_array && Array.isArray(data.time_array) && data.time_array.length > 1) ||
            (data.time_steps && data.time_steps > 1 && (data.exposure_dose_frames || data.thickness_frames))
        );
        
        if (hasEnhancedDill4DData) {
            console.log('检测到Enhanced DILL模型4D动画数据，首先渲染第一帧作为静态图表');
            console.log('Enhanced DILL 4D动画数据详情:', {
                enable_4d_animation: data.enable_4d_animation,
                has_exposure_dose_frames: !!data.exposure_dose_frames,
                has_thickness_frames: !!data.thickness_frames,
                has_time_array: !!data.time_array,
                time_steps: data.time_steps,
                sine_type: data.sine_type,
                exposure_frames_length: data.exposure_dose_frames ? data.exposure_dose_frames.length : 0,
                thickness_frames_length: data.thickness_frames ? data.thickness_frames.length : 0
            });
            
            // 处理第一帧数据作为静态图表显示
            if (data.exposure_dose_frames && data.thickness_frames && 
                data.exposure_dose_frames.length > 0 && data.thickness_frames.length > 0) {
                
                try {
                    // 构造第一帧的静态数据
                    const firstFrameData = {
                        ...data,
                        exposure_dose: data.exposure_dose_frames[0],
                        thickness: data.thickness_frames[0],
                        is_3d: true,
                        sine_type: data.sine_type
                    };
                    
                    console.log('准备渲染Enhanced DILL 4D动画的第一帧作为静态3D图表');
                    console.log('第一帧数据结构:', {
                        exposure_dose_type: typeof firstFrameData.exposure_dose,
                        exposure_dose_length: Array.isArray(firstFrameData.exposure_dose) ? firstFrameData.exposure_dose.length : 'not array',
                        thickness_type: typeof firstFrameData.thickness,
                        thickness_length: Array.isArray(firstFrameData.thickness) ? firstFrameData.thickness.length : 'not array',
                        has_coords: !!(firstFrameData.x_coords && firstFrameData.y_coords && firstFrameData.z_coords)
                    });
                    
                    // 渲染第一帧的3D图表
                    createExposure3DPlot(exposurePlotContainer, firstFrameData);
                    createThickness3DPlot(thicknessPlotContainer, firstFrameData);
                    
                    console.log('Enhanced DILL 4D动画第一帧静态图表渲染完成');
                    
                } catch (error) {
                    console.error('Enhanced DILL 4D动画第一帧渲染失败:', error);
                    // 回退到错误显示
                    exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">Enhanced DILL 4D曝光数据第一帧渲染失败: ' + error.message + '</div>';
                    thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">Enhanced DILL 4D厚度数据第一帧渲染失败: ' + error.message + '</div>';
                }
            } else {
                console.warn('Enhanced DILL 4D动画数据不完整，无法渲染第一帧');
                exposurePlotContainer.innerHTML = '<div style="color:orange;padding:20px;">Enhanced DILL 4D动画数据不完整</div>';
                thicknessPlotContainer.innerHTML = '<div style="color:orange;padding:20px;">Enhanced DILL 4D动画数据不完整</div>';
            }
            
            // 存储4D动画数据
            enhancedDill4DAnimationData = data;
            
            // 设置总帧数
            if (enhancedDill4DAnimationData.exposure_dose_frames) {
                enhancedDill4DAnimationState.totalFrames = enhancedDill4DAnimationData.exposure_dose_frames.length;
            } else if (enhancedDill4DAnimationData.time_steps) {
                enhancedDill4DAnimationState.totalFrames = enhancedDill4DAnimationData.time_steps;
            } else {
                enhancedDill4DAnimationState.totalFrames = 20; // 默认帧数
            }
            
            console.log('Enhanced DILL 4D动画总帧数:', enhancedDill4DAnimationState.totalFrames);
            
            // 确保总帧数有效
            if (enhancedDill4DAnimationState.totalFrames <= 0) {
                console.warn('Enhanced DILL 4D动画总帧数无效，设置为默认值20');
                enhancedDill4DAnimationState.totalFrames = 20;
            }
            
            // 设置4D动画界面
            setupEnhancedDill4DAnimationUI();
            
            // 显示4D动画区域
            const enhancedDill4DAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
            if (enhancedDill4DAnimationSection) {
                enhancedDill4DAnimationSection.style.display = 'block';
                console.log('Enhanced DILL 4D动画区域已显示');
            } else {
                console.error('未找到Enhanced DILL 4D动画区域元素 #enhanced-dill-4d-animation-section');
            }
            
            // 延迟初始化4D动画第一帧（避免与静态图表冲突）
            console.log('延迟初始化Enhanced DILL 4D动画第一帧');
            setTimeout(() => {
                updateEnhancedDill4DAnimationFrame(0);
            }, 300);
            
        } else if (has3DData) {
            // 处理静态3D数据可视化
            console.log('显示增强Dill模型静态3D可视化');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        } else if (has2DData) {
            // Enhanced Dill模型2D数据的特殊处理 - 显示多张图表
            if (currentModelType === 'enhanced_dill') {
                console.log('显示Enhanced Dill模型多图热图分布');
                console.log('Enhanced Dill 2D数据检查:', {
                    has_z_exposure_dose: !!data.z_exposure_dose,
                    has_z_thickness: !!data.z_thickness,
                    has_x_plane_exposure: !!data.x_plane_exposure,
                    has_x_plane_thickness: !!data.x_plane_thickness,
                    has_y_plane_exposure: !!data.y_plane_exposure,
                    has_y_plane_thickness: !!data.y_plane_thickness,
                    y_coords_length: data.y_coords ? data.y_coords.length : 0,
                    z_coords_length: data.z_coords ? data.z_coords.length : 0,
                    x_coords_length: data.x_coords ? data.x_coords.length : 0
                });
                
                // 显示原有的YZ平面图表（主要图表）
                createExposureHeatmap(exposurePlotContainer, data);
                createThicknessHeatmap(thicknessPlotContainer, data);
                
                // 显示X平面图表（如果有数据）
                if (data.x_plane_exposure && data.x_plane_thickness) {
                    const xPlaneExposureItem = document.getElementById('enhanced-dill-x-plane-exposure-item');
                    const xPlaneThicknessItem = document.getElementById('enhanced-dill-x-plane-thickness-item');
                    const xPlaneExposureContainer = document.getElementById('enhanced-dill-x-plane-exposure-container');
                    const xPlaneThicknessContainer = document.getElementById('enhanced-dill-x-plane-thickness-container');
                    
                    if (xPlaneExposureItem && xPlaneThicknessItem && xPlaneExposureContainer && xPlaneThicknessContainer) {
                        xPlaneExposureItem.style.display = 'block';
                        xPlaneThicknessItem.style.display = 'block';
                        
                        console.log('渲染X平面图表...');
                        createEnhancedDillXPlaneExposureHeatmap(xPlaneExposureContainer, data);
                        createEnhancedDillXPlaneThicknessHeatmap(xPlaneThicknessContainer, data);
                    }
                }
                
                // 显示Y平面图表（如果有数据）
                if (data.y_plane_exposure && data.y_plane_thickness) {
                    const yPlaneExposureItem = document.getElementById('enhanced-dill-y-plane-exposure-item');
                    const yPlaneThicknessItem = document.getElementById('enhanced-dill-y-plane-thickness-item');
                    const yPlaneExposureContainer = document.getElementById('enhanced-dill-y-plane-exposure-container');
                    const yPlaneThicknessContainer = document.getElementById('enhanced-dill-y-plane-thickness-container');
                    
                    if (yPlaneExposureItem && yPlaneThicknessItem && yPlaneExposureContainer && yPlaneThicknessContainer) {
                        yPlaneExposureItem.style.display = 'block';
                        yPlaneThicknessItem.style.display = 'block';
                        
                        console.log('渲染Y平面图表...');
                        createEnhancedDillYPlaneExposureHeatmap(yPlaneExposureContainer, data);
                        createEnhancedDillYPlaneThicknessHeatmap(yPlaneThicknessContainer, data);
                    }
                }
                
                console.log('Enhanced Dill模型多图显示完成');
            } else {
                // 统一处理所有模型的二维数据 - 使用热图
                console.log('Displaying 2D Heatmap for model:', currentModelType);
                createExposureHeatmap(exposurePlotContainer, data);
                createThicknessHeatmap(thicknessPlotContainer, data);
            }
        } else {
            // 默认1D线图，适用于Dill的1D情况
            createExposurePlot(exposurePlotContainer, data);
            createThicknessPlot(thicknessPlotContainer, data);
        }
    } else if (has3DData) {
        // 处理3D数据可视化
        console.log('Displaying 3D visualization for model:', currentModelType);
        
        // 如果是4D动画数据，使用第一帧进行初始显示
        if (data.exposure_dose_frames && data.thickness_frames && data.exposure_dose_frames.length > 0) {
            console.log('检测到4D动画数据，使用第一帧显示3D图表');
            console.log('4D数据结构检查:', {
                exposure_frames_count: data.exposure_dose_frames.length,
                thickness_frames_count: data.thickness_frames.length,
                first_frame_shape: data.exposure_dose_frames[0] ? 
                    `${data.exposure_dose_frames[0].length}×${data.exposure_dose_frames[0][0]?.length}×${data.exposure_dose_frames[0][0]?.[0]?.length}` : 'unknown',
                x_coords_length: data.x_coords?.length,
                y_coords_length: data.y_coords?.length,
                z_coords_length: data.z_coords?.length
            });
            
            const firstFrameData = {
                ...data,
                x_coords: data.x_coords,
                y_coords: data.y_coords,
                z_coords: data.z_coords,
                exposure_dose: data.exposure_dose_frames[0],
                thickness: data.thickness_frames[0],
                is_3d: true,
                sine_type: data.sine_type
            };
            console.log('准备渲染4D动画的第一帧作为静态3D图表');
            createExposure3DPlot(exposurePlotContainer, firstFrameData);
            createThickness3DPlot(thicknessPlotContainer, firstFrameData);
        } else {
            // 静态3D数据
            console.log('渲染静态3D数据');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        }
    } else if (has2DData) {
        // 统一处理所有模型的二维数据 - 使用热图
        console.log('Displaying 2D Heatmap for model:', currentModelType);
        createExposureHeatmap(exposurePlotContainer, data);
        createThicknessHeatmap(thicknessPlotContainer, data);
    } else {
        // 默认1D线图，适用于Dill的1D情况
        createExposurePlot(exposurePlotContainer, data);
        createThicknessPlot(thicknessPlotContainer, data);
    }

    // 统一处理普通DILL模型4D动画数据（不管是1D、2D还是3D）
    if (currentModelType === 'dill' && (data.enable_4d_animation || data.exposure_dose_frames || data.thickness_frames || data.time_array)) {
        console.log('检测到DILL模型4D动画数据，设置4D动画界面');
        console.log('4D动画数据详情:', {
            enable_4d_animation: data.enable_4d_animation,
            has_exposure_dose_frames: !!data.exposure_dose_frames,
            has_thickness_frames: !!data.thickness_frames,
            has_time_array: !!data.time_array,
            time_steps: data.time_steps,
            exposure_frames_length: data.exposure_dose_frames ? data.exposure_dose_frames.length : 0,
            thickness_frames_length: data.thickness_frames ? data.thickness_frames.length : 0
        });
        
        dill4DAnimationData = data;
        
        // 设置总帧数
        if (dill4DAnimationData.exposure_dose_frames) {
            dill4DAnimationState.totalFrames = dill4DAnimationData.exposure_dose_frames.length;
        } else if (dill4DAnimationData.time_steps) {
            dill4DAnimationState.totalFrames = dill4DAnimationData.time_steps;
        }
        
        console.log('设置4D动画总帧数:', dill4DAnimationState.totalFrames);
        
        // 设置4D动画界面
        setupDill4DAnimationUI();
        
        // 显示4D动画区域
        const dill4DAnimationSection = document.getElementById('dill-4d-animation-section');
        if (dill4DAnimationSection) {
            dill4DAnimationSection.style.display = 'block';
            console.log('4D动画区域已显示');
        } else {
            console.error('未找到4D动画区域元素 #dill-4d-animation-section');
        }
        
        // 初始化显示第一帧
        console.log('初始化4D动画第一帧 (frameIndex=0)');
        setTimeout(() => {
            updateDill4DAnimationFrame(0);
        }, 100);
    }

    // 4D动画显示控制 - 严格检查用户是否主动启用了4D动画
    console.log('4D动画显示控制 - 检查用户设置:', {
        currentModelType: currentModelType,
        data_enable_4d_animation: data.enable_4d_animation,
        has_exposure_dose_frames: !!data.exposure_dose_frames,
        has_thickness_frames: !!data.thickness_frames,
        has_time_array: !!data.time_array,
        time_steps: data.time_steps
    });

    // 只有在数据明确标记启用了4D动画时才显示4D动画界面
    if (data.enable_4d_animation === true) {
        if (currentModelType === 'dill' && !dill4DAnimationData) {
            console.log('用户启用了DILL模型4D动画，设置4D动画界面');
            
            dill4DAnimationData = data;
            
            // 设置总帧数
            if (data.exposure_dose_frames) {
                dill4DAnimationState.totalFrames = data.exposure_dose_frames.length;
            } else if (data.time_steps) {
                dill4DAnimationState.totalFrames = data.time_steps;
            } else {
                dill4DAnimationState.totalFrames = 20; // 默认帧数
            }
            
            console.log('设置DILL 4D动画总帧数:', dill4DAnimationState.totalFrames);
            
            // 设置4D动画界面
            setupDill4DAnimationUI();
            
            // 显示4D动画区域
            const dill4DAnimationSection = document.getElementById('dill-4d-animation-section');
            if (dill4DAnimationSection) {
                dill4DAnimationSection.style.display = 'block';
                console.log('DILL 4D动画区域已显示');
            }
            
            // 初始化显示第一帧
            setTimeout(() => {
                updateDill4DAnimationFrame(0);
            }, 100);
        }
    }

    // 检测并处理DILL模型1D动画数据
    if (currentModelType === 'dill' && data.enable_1d_animation === true) {
        console.log('检测到DILL模型1D动画数据，设置1D动画界面');
        console.log('1D动画数据详情:', {
            enable_1d_animation: data.enable_1d_animation,
            has_animation_frames: !!data.animation_frames,
            animation_frames_length: data.animation_frames ? data.animation_frames.length : 0,
            time_steps: data.time_steps,
            sine_type: data.sine_type
        });
        
        // 存储1D动画数据
        dill1DAnimationState.animationData = data.animation_frames;
        dill1DAnimationState.totalFrames = data.animation_frames ? data.animation_frames.length : (data.time_steps || 20);
        dill1DAnimationState.currentFrame = 0;
        
        console.log('设置DILL 1D动画总帧数:', dill1DAnimationState.totalFrames);
        
        // 修复：静态图表应使用用户当前输入参数的计算结果，而不是动画帧数据
        // 这样确保无论是否勾选1D动画，静态图的处理逻辑都保持一致
        console.log('使用用户当前输入参数渲染DILL 1D静态图表（而非动画帧数据）');
        
        try {
            // 直接使用后端返回的静态数据（基于用户当前输入的参数计算）
            // 而不是从animation_frames中选择某一帧
            const staticData = {
                x: data.x_coords || data.x,
                exposure_dose: data.exposure_dose,
                thickness: data.thickness,
                x_coords: data.x_coords || data.x,
                is_1d: true,
                sine_type: data.sine_type || '1d'
            };
            
            console.log('DILL 1D静态图表数据（基于用户当前参数）:', {
                x_length: staticData.x ? staticData.x.length : 0,
                exposure_range: staticData.exposure_dose ? [Math.min(...staticData.exposure_dose), Math.max(...staticData.exposure_dose)] : 'N/A',
                thickness_range: staticData.thickness ? [Math.min(...staticData.thickness), Math.max(...staticData.thickness)] : 'N/A',
                data_source: '用户当前输入参数'
            });
            
            // 渲染静态图表 - 使用与非动画模式相同的数据源
            createExposurePlot(exposurePlotContainer, staticData);
            createThicknessPlot(thicknessPlotContainer, staticData);
            console.log('DILL 1D静态图表渲染完成（使用用户当前参数）');
        } catch (error) {
            console.error('DILL 1D静态图表渲染失败:', error);
            exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">DILL 1D静态曝光图渲染失败: ' + error.message + '</div>';
            thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">DILL 1D静态厚度图渲染失败: ' + error.message + '</div>';
        }
        
        // 显示1D动画区域
        const dill1DAnimationSection = document.getElementById('dill-1d-animation-section');
        if (dill1DAnimationSection) {
            dill1DAnimationSection.style.display = 'block';
            console.log('DILL 1D动画区域已显示');
        } else {
            console.error('未找到1D动画区域元素 #dill-1d-animation-section');
        }
        
        // 设置事件监听器
        setupDill1DAnimationEventListeners();
        
        // 初始化显示第一帧（动画区域）
        if (dill1DAnimationState.animationData && dill1DAnimationState.animationData.length > 0) {
            setTimeout(() => {
                updateDill1DAnimationFrame(0);
                // 初始状态设置为就绪
                const frameData = dill1DAnimationState.animationData[0];
                if (frameData) {
                    const timeValue = frameData.time_value || frameData.time || frameData.t || 0;
                    updateDill1DAnimationStatus(`就绪: 第1/${dill1DAnimationState.totalFrames}帧 (t=${timeValue.toFixed(2)}s)`);
                } else {
                    updateDill1DAnimationStatus('就绪');
                }
            }, 100);
        }
    }
    
    // 注意：不要在else中隐藏1D动画区域，因为用户可能同时启用1D动画和V评估
    // 只有在没有启用1D动画时才隐藏1D动画区域
    if (currentModelType === 'dill' && data.enable_1d_animation !== true) {
        const dill1DAnimationSection = document.getElementById('dill-1d-animation-section');
        if (dill1DAnimationSection) {
            dill1DAnimationSection.style.display = 'none';
        }
    }

    // 检测并处理DILL模型1D V评估数据
    if (currentModelType === 'dill' && data.enable_1d_v_evaluation === true) {
        console.log('检测到DILL模型1D V评估数据，设置V评估界面');
        console.log('1D V评估数据详情:', {
            enable_1d_v_evaluation: data.enable_1d_v_evaluation,
            has_v_evaluation_frames: !!data.v_evaluation_frames,
            v_evaluation_frames_length: data.v_evaluation_frames ? data.v_evaluation_frames.length : 0,
            time_steps: data.time_steps,
            sine_type: data.sine_type
        });
        
        // 存储1D V评估数据
        dill1DVEvaluationState.animationData = data.v_evaluation_frames;
        dill1DVEvaluationState.totalFrames = data.v_evaluation_frames ? data.v_evaluation_frames.length : (data.time_steps || 20);
        dill1DVEvaluationState.currentFrame = 0;
        
        console.log('设置DILL 1D V评估总帧数:', dill1DVEvaluationState.totalFrames);
        
        // 静态图表仍使用用户当前输入参数的计算结果
        console.log('使用用户当前输入参数渲染DILL 1D静态图表（而非V评估帧数据）');
        
        try {
            // 直接使用后端返回的静态数据（基于用户当前输入的参数计算）
            const staticData = {
                x: data.x_coords || data.x,
                exposure_dose: data.exposure_dose,
                thickness: data.thickness,
                x_coords: data.x_coords || data.x,
                is_1d: true,
                sine_type: data.sine_type || '1d'
            };
            
            console.log('DILL 1D静态图表数据（基于用户当前参数）:', {
                x_length: staticData.x ? staticData.x.length : 0,
                exposure_range: staticData.exposure_dose ? [Math.min(...staticData.exposure_dose), Math.max(...staticData.exposure_dose)] : 'N/A',
                thickness_range: staticData.thickness ? [Math.min(...staticData.thickness), Math.max(...staticData.thickness)] : 'N/A',
                data_source: '用户当前输入参数'
            });
            
            // 渲染静态图表
            createExposurePlot(exposurePlotContainer, staticData);
            createThicknessPlot(thicknessPlotContainer, staticData);
            console.log('DILL 1D静态图表渲染完成（使用用户当前参数）');
        } catch (error) {
            console.error('DILL 1D静态图表渲染失败:', error);
            exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">DILL 1D静态曝光图渲染失败: ' + error.message + '</div>';
            thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">DILL 1D静态厚度图渲染失败: ' + error.message + '</div>';
        }
        
        // 显示1D V评估区域
        const dill1DVEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
        if (dill1DVEvaluationSection) {
            dill1DVEvaluationSection.style.display = 'block';
            console.log('DILL 1D V评估区域已显示');
        } else {
            console.error('未找到1D V评估区域元素 #dill-1d-v-evaluation-section');
        }
        
        // 设置事件监听器
        setupDill1DVEvaluationEventListeners();
        
        // 初始化显示第一帧（V评估区域）
        if (dill1DVEvaluationState.animationData && dill1DVEvaluationState.animationData.length > 0) {
            setTimeout(() => {
                updateDill1DVEvaluationFrame(0);
            }, 100);
        }
    }
    
    // 注意：不要在else中隐藏V评估区域，因为用户可能同时启用1D动画和V评估
    // 只有在没有启用V评估时才隐藏V评估区域
    if (currentModelType === 'dill' && data.enable_1d_v_evaluation !== true) {
        const dill1DVEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
        if (dill1DVEvaluationSection) {
            dill1DVEvaluationSection.style.display = 'none';
        }
    }

    // 继续处理其他4D动画逻辑
    if (data.enable_4d_animation === true) {

        // Enhanced Dill模型的4D动画检测
        if (currentModelType === 'enhanced_dill' && !enhancedDill4DAnimationData) {
            console.log('用户启用了Enhanced DILL模型4D动画，设置4D动画界面');
            
            enhancedDill4DAnimationData = data;
            
            // 设置总帧数
            if (data.exposure_dose_frames) {
                enhancedDill4DAnimationState.totalFrames = data.exposure_dose_frames.length;
            } else if (data.time_steps) {
                enhancedDill4DAnimationState.totalFrames = data.time_steps;
            } else {
                enhancedDill4DAnimationState.totalFrames = 20; // 默认帧数
            }
            
            console.log('设置Enhanced DILL 4D动画总帧数:', enhancedDill4DAnimationState.totalFrames);
            
            // 设置4D动画界面
            setupEnhancedDill4DAnimationUI();
            
            // 显示4D动画区域
            const enhancedDill4DAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
            if (enhancedDill4DAnimationSection) {
                enhancedDill4DAnimationSection.style.display = 'block';
                console.log('Enhanced DILL 4D动画区域已显示');
            }
            
            // 初始化显示第一帧
            setTimeout(() => {
                updateEnhancedDill4DAnimationFrame(0);
            }, 100);
        }
    } else {
        // 用户没有启用4D动画，确保4D动画区域被隐藏
        console.log('用户未启用4D动画，隐藏所有4D动画界面');
        
        const dill4DAnimationSection = document.getElementById('dill-4d-animation-section');
        const enhancedDill4DAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
        
        if (dill4DAnimationSection) {
            dill4DAnimationSection.style.display = 'none';
        }
        if (enhancedDill4DAnimationSection) {
            enhancedDill4DAnimationSection.style.display = 'none';
        }
        
        // 停止任何正在播放的动画
        if (dill4DAnimationState.intervalId) {
            clearInterval(dill4DAnimationState.intervalId);
            dill4DAnimationState.intervalId = null;
            dill4DAnimationState.isPlaying = false;
        }
        if (enhancedDill4DAnimationState.intervalId) {
            clearInterval(enhancedDill4DAnimationState.intervalId);
            enhancedDill4DAnimationState.intervalId = null;
            enhancedDill4DAnimationState.isPlaying = false;
        }
    }

    animateResults();
    setTimeout(() => {
        // 对于2D/3D热图不显示阈值控制
        if (!has2DData && !has3DData && currentModelType !== 'car') { // 修改为CAR模型也不显示阈值控制
            initSingleThresholdControl(document.querySelector('#exposure-thresholds-container .threshold-control'), 0, 'exposure', data);
            initSingleThresholdControl(document.querySelector('#thickness-thresholds-container .threshold-control'), 0, 'thickness', data);
        } else {
            // 隐藏2D/3D热图的阈值控制区域
            const exposureThresholds = document.querySelector('#exposure-thresholds-container');
            const thicknessThresholds = document.querySelector('#thickness-thresholds-container');
            if (exposureThresholds) exposureThresholds.style.display = 'none';
            if (thicknessThresholds) thicknessThresholds.style.display = 'none';
        }
    }, 100);
}

// 修改createExposure3DPlot函数，添加更多调试信息
function createExposure3DPlot(container, data) {
    // 添加详细调试信息
    console.log('DEBUG - 3D Exposure Data:', {
        has_x_coords: !!data.x_coords,
        has_y_coords: !!data.y_coords,
        has_z_coords: !!data.z_coords,
        has_exposure_dose: !!data.exposure_dose,
        has_z_exposure_dose: !!data.z_exposure_dose,
        has_intensity_3d: !!data.intensity_3d,
        has_I: !!data.I,
        has_acid_concentration_3d: !!data.acid_concentration_3d, // CAR模型特有
        x_coords_type: data.x_coords && typeof data.x_coords,
        x_coords_length: data.x_coords && data.x_coords.length,
        y_coords_length: data.y_coords && data.y_coords.length,
        z_coords_length: data.z_coords && data.z_coords.length,
        exposure_dose_type: data.exposure_dose && typeof data.exposure_dose,
        exposure_dose_length: data.exposure_dose && data.exposure_dose.length,
        exposure_dose_sample: data.exposure_dose && data.exposure_dose.slice(0, 2),
        full_data_keys: Object.keys(data)
    });

    // 统一字段名处理，确保兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    
    // 优先使用模型特定的3D数据字段，增强对不同模型的兼容性
    let zData;
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    if (currentModelType === 'car') {
        // CAR模型优先使用acid_concentration_3d字段
        zData = data.acid_concentration_3d || data.z_exposure_dose || data.exposure_dose || data.intensity_3d || data.I;
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型优先使用exposure_dose字段（支持3D动画数据格式）
        zData = data.exposure_dose || data.z_exposure_dose || data.intensity_3d || data.I;
    } else {
        // 其他模型使用标准字段
        zData = data.z_exposure_dose || data.exposure_dose || data.intensity_3d || data.I;
    }

    // 更健壮的数据检查 - 添加对3D模式的特殊支持
    console.log('DEBUG - 数据存在检查:', {
        xCoords_exists: !!xCoords,
        yCoords_exists: !!yCoords,
        zData_exists: !!zData,
        xCoords_length: xCoords ? xCoords.length : 0,
        yCoords_length: yCoords ? yCoords.length : 0,
        zData_length: zData ? zData.length : 0,
        is_3d: data.is_3d,
        sine_type: data.sine_type
    });

    if (!xCoords || !yCoords || !zData ||
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.warn('3D曝光数据不完整或缺失');
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_exposure_data || '无有效3D曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    // 检查是否需要转换数据格式
    let plotDataZ = zData;
    
    // 检查z数据结构
    console.log('DEBUG - 3D Exposure plotDataZ:', {
        type: typeof plotDataZ,
        isArray: Array.isArray(plotDataZ),
        length: plotDataZ.length,
        first_item_type: plotDataZ.length > 0 ? typeof plotDataZ[0] : 'unknown', 
        first_item_isArray: plotDataZ.length > 0 ? Array.isArray(plotDataZ[0]) : false,
        first_item_length: plotDataZ.length > 0 && Array.isArray(plotDataZ[0]) ? plotDataZ[0].length : 0,
        intensity_shape: data.intensity_shape // 从后端获取的形状信息
    });

    // 改进的数据格式检测和转换逻辑
    // 首先检查是否是3D数组结构 [x][y][z] 
    const is3DArray = Array.isArray(plotDataZ) && 
                      Array.isArray(plotDataZ[0]) && 
                      Array.isArray(plotDataZ[0][0]);
    
    if (is3DArray) {
        console.log('检测到3D数组结构，需要转换为Plotly surface格式');
        console.log('3D数组维度:', `[Z=${plotDataZ.length}][Y=${plotDataZ[0].length}][X=${plotDataZ[0][0].length}]`);
        
        // 对于Enhanced Dill模型的3D数据格式[z][y][x]，Plotly surface需要的是二维数组z[y][x]
        // 我们需要从3D数组中提取一个Z切片作为表面显示
        try {
            // 取z方向的中间切片作为表面显示
            const midZIndex = Math.floor(plotDataZ.length / 2);
            console.log(`从${plotDataZ.length}个Z层中选择第${midZIndex}层作为表面显示`);
            
            // plotDataZ[midZIndex] 是一个 [y][x] 的二维数组，正好是Plotly需要的格式
            plotDataZ = plotDataZ[midZIndex];
            console.log('成功提取Z中间切片，新维度:', `[Y=${plotDataZ.length}][X=${plotDataZ[0].length}]`);
            
            // 验证提取的数据
            console.log('切片数据样本:', {
                corner_values: {
                    top_left: plotDataZ[0][0],
                    top_right: plotDataZ[0][plotDataZ[0].length-1],
                    bottom_left: plotDataZ[plotDataZ.length-1][0],
                    bottom_right: plotDataZ[plotDataZ.length-1][plotDataZ[0].length-1]
                }
            });
        } catch (error) {
            console.error('3D数据切片提取失败:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">3D数据格式处理失败: ${error.message}</div>`;
            return;
        }
    } else if (!Array.isArray(plotDataZ[0])) {
        console.log('Z数据是扁平数组，需要重塑成二维数组');
        
        // 首先检查是否可以正确重塑
        if (xCoords.length * yCoords.length === plotDataZ.length) {
            try {
                // 尝试检测数据排列顺序 (按行主序还是列主序)
                const isRowMajor = detectDataOrder(plotDataZ, xCoords, yCoords);
                console.log(`检测到数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
                
                // 根据检测到的顺序重塑数据
                const newZ = reshapeArray(plotDataZ, xCoords.length, yCoords.length, isRowMajor);
                plotDataZ = newZ;
            } catch (error) {
                console.error('无法重塑数据:', error);
                container.innerHTML = `<div style="color:red;padding:20px;">数据转换错误: ${error.message}</div>`;
                return;
            }
        } else if (data.z_matrix) {
            // 尝试使用现成的z_matrix（CAR模型可能提供）
            plotDataZ = data.z_matrix;
            console.log('使用提供的z_matrix数据');
        } else if (currentModelType === 'car' && data.grid_data && typeof data.grid_data === 'object') {
            // 尝试从CAR模型特有的grid_data中提取
            try {
                if (data.grid_data.exposure || data.grid_data.acid_concentration) {
                    const gridData = data.grid_data.exposure || data.grid_data.acid_concentration;
                    console.log('使用CAR模型grid_data', gridData);
                    plotDataZ = gridData;
                }
            } catch (error) {
                console.error('处理CAR模型grid_data失败:', error);
            }
        } else {
            console.error('Z数据长度与x和y坐标数量不匹配');
            container.innerHTML = `<div style="color:red;padding:20px;">数据维度不匹配: Z长度=${plotDataZ.length}, X长度=${xCoords.length}, Y长度=${yCoords.length}</div>`;
            return;
        }
    }

    // 创建3D表面图
    const trace = {
        type: 'surface',
        x: xCoords,
        y: yCoords,
        z: plotDataZ,
        colorscale: 'Viridis',
        colorbar: { title: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量' },
        hovertemplate: `X坐标: %{x:.2f} μm<br>Y坐标: %{y:.2f} μm<br>Z坐标: %{z:.2f}<br>${LANGS[currentLang].hover_exposure_value || '曝光剂量值'}: %{z:.2f}<extra></extra>`
    };

    const layout = {
        title: '曝光计量分布 (3D)',
        scene: {
            xaxis: { title: 'X (μm)' },
            yaxis: { title: 'Y (μm)' },
            zaxis: { title: LANGS[currentLang].exposure_dose_unit || '曝光剂量' }
        },
        margin: { l: 20, r: 20, t: 40, b: 20 }
    };

    try {
        Plotly.newPlot(container, [trace], layout, { responsive: true });
        console.log('3D Exposure plot created successfully');
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points && eventData.points.length > 0) {
                const point = eventData.points[0];
                // 对于3D表面图，点击位置包含x、y、z值
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 3D Exposure plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建3D图表失败: ${error.message}</div>`;
    }
}

/**
 * 检测数据的排列顺序是行主序还是列主序
 * @param {Array} data 一维数组形式的数据
 * @param {Array} xCoords X坐标数组
 * @param {Array} yCoords Y坐标数组
 * @returns {boolean} true表示行主序 (C-order), false表示列主序 (F-order)
 */
function detectDataOrder(data, xCoords, yCoords) {
    // 如果数据长度太小，默认为行主序
    if (data.length < 10 || xCoords.length < 3 || yCoords.length < 3) {
        return true;
    }
    
    // 尝试检测数据的模式:
    // 1. 在行主序中，相邻行之间的差异应该较大
    // 2. 在列主序中，相邻列之间的差异应该较大
    
    // 采样检测行主序
    let rowMajorEvidence = 0;
    let colMajorEvidence = 0;
    
    // 检查行主序的证据
    for (let y = 0; y < Math.min(yCoords.length - 1, 5); y++) {
        const rowDiffs = [];
        for (let x = 0; x < Math.min(xCoords.length, 10); x++) {
            // 行主序: 当前行与下一行的差异
            const idx1 = y * xCoords.length + x;
            const idx2 = (y + 1) * xCoords.length + x;
            if (idx1 < data.length && idx2 < data.length) {
                rowDiffs.push(Math.abs(data[idx1] - data[idx2]));
            }
        }
        if (rowDiffs.length > 0) {
            rowMajorEvidence += Math.max(...rowDiffs);
        }
    }
    
    // 检查列主序的证据
    for (let x = 0; x < Math.min(xCoords.length - 1, 5); x++) {
        const colDiffs = [];
        for (let y = 0; y < Math.min(yCoords.length, 10); y++) {
            // 列主序: 当前列与下一列的差异
            const idx1 = x * yCoords.length + y;
            const idx2 = (x + 1) * yCoords.length + y;
            if (idx1 < data.length && idx2 < data.length) {
                colDiffs.push(Math.abs(data[idx1] - data[idx2]));
            }
        }
        if (colDiffs.length > 0) {
            colMajorEvidence += Math.max(...colDiffs);
        }
    }
    
    console.log(`数据排列顺序检测: 行主序证据=${rowMajorEvidence}, 列主序证据=${colMajorEvidence}`);
    
    // 返回更可能的排列顺序
    return rowMajorEvidence >= colMajorEvidence;
}

/**
 * 将一维数组重塑为二维数组
 * @param {Array} array 原始一维数组
 * @param {number} width 宽度 (列数)
 * @param {number} height 高度 (行数)
 * @param {boolean} isRowMajor 数据是否为行主序
 * @returns {Array} 重塑后的二维数组
 */
function reshapeArray(array, width, height, isRowMajor = true) {
    const result = [];
    if (isRowMajor) {
        // 行主序 (C-order): 按行填充
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push(array[i * width + j]);
            }
            result.push(row);
        }
    } else {
        // 列主序 (F-order): 按列填充
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push(array[j * height + i]);
            }
            result.push(row);
        }
    }
    return result;
}

// 同样修改createThickness3DPlot函数
function createThickness3DPlot(container, data) {
    // 添加详细调试信息
    console.log('DEBUG - 3D Thickness Data:', {
        has_x_coords: !!data.x_coords,
        has_y_coords: !!data.y_coords,
        has_z_coords: !!data.z_coords,
        has_thickness: !!data.thickness,
        has_z_thickness: !!data.z_thickness,
        has_M: !!data.M,
        has_thickness_3d: !!data.thickness_3d,
        has_deprotection_3d: !!data.deprotection_3d, // CAR模型特有
        x_coords_type: data.x_coords && typeof data.x_coords,
        x_coords_length: data.x_coords && data.x_coords.length,
        y_coords_length: data.y_coords && data.y_coords.length,
        z_coords_length: data.z_coords && data.z_coords.length,
        thickness_type: data.thickness && typeof data.thickness,
        thickness_length: data.thickness && data.thickness.length,
        thickness_sample: data.thickness && data.thickness.slice(0, 2),
        full_data_keys: Object.keys(data)
    });

    // 统一字段名处理，确保兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    
    // 优先使用模型特定的3D数据字段
    let zData;
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    if (currentModelType === 'car') {
        // CAR模型优先使用deprotection_3d字段
        zData = data.deprotection_3d || data.z_thickness || data.thickness || data.thickness_3d || data.M;
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型优先使用thickness字段（支持3D动画数据格式）
        zData = data.thickness || data.z_thickness || data.thickness_3d || data.M;
    } else {
        // 其他模型使用标准字段
        zData = data.z_thickness || data.thickness || data.thickness_3d || data.M;
    }

    // 更健壮的数据检查 - 添加对3D模式的特殊支持
    console.log('DEBUG - 厚度数据存在检查:', {
        xCoords_exists: !!xCoords,
        yCoords_exists: !!yCoords,
        zData_exists: !!zData,
        xCoords_length: xCoords ? xCoords.length : 0,
        yCoords_length: yCoords ? yCoords.length : 0,
        zData_length: zData ? zData.length : 0,
        is_3d: data.is_3d,
        sine_type: data.sine_type
    });

    if (!xCoords || !yCoords || !zData ||
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.warn('3D厚度数据不完整或缺失');
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_thickness_data || '无有效3D厚度数据，无法绘图。'}</div>`;
        return;
    }

    // 检查是否需要转换数据格式
    let plotDataZ = zData;
    
    // 检查z数据结构
    console.log('DEBUG - 3D Thickness plotDataZ:', {
        type: typeof plotDataZ,
        isArray: Array.isArray(plotDataZ),
        length: plotDataZ.length,
        first_item_type: plotDataZ.length > 0 ? typeof plotDataZ[0] : 'unknown',
        first_item_isArray: plotDataZ.length > 0 ? Array.isArray(plotDataZ[0]) : false,
        first_item_length: plotDataZ.length > 0 && Array.isArray(plotDataZ[0]) ? plotDataZ[0].length : 0,
        intensity_shape: data.intensity_shape // 从后端获取的形状信息
    });

    // 改进的数据格式检测和转换逻辑
    // 首先检查是否是3D数组结构 [x][y][z] 
    const is3DArray = Array.isArray(plotDataZ) && 
                      Array.isArray(plotDataZ[0]) && 
                      Array.isArray(plotDataZ[0][0]);
    
    if (is3DArray) {
        console.log('检测到3D厚度数组结构，需要转换为Plotly surface格式');
        console.log('3D厚度数组维度:', `[Z=${plotDataZ.length}][Y=${plotDataZ[0].length}][X=${plotDataZ[0][0].length}]`);
        
        // 对于Enhanced Dill模型的3D数据格式[z][y][x]，Plotly surface需要的是二维数组z[y][x]
        // 我们需要从3D数组中提取一个Z切片作为表面显示
        try {
            // 取z方向的中间切片作为表面显示
            const midZIndex = Math.floor(plotDataZ.length / 2);
            console.log(`从${plotDataZ.length}个Z层中选择第${midZIndex}层作为厚度表面显示`);
            
            // plotDataZ[midZIndex] 是一个 [y][x] 的二维数组，正好是Plotly需要的格式
            plotDataZ = plotDataZ[midZIndex];
            console.log('成功提取厚度Z中间切片，新维度:', `[Y=${plotDataZ.length}][X=${plotDataZ[0].length}]`);
            
            // 验证提取的厚度数据
            console.log('厚度切片数据样本:', {
                corner_values: {
                    top_left: plotDataZ[0][0],
                    top_right: plotDataZ[0][plotDataZ[0].length-1],
                    bottom_left: plotDataZ[plotDataZ.length-1][0],
                    bottom_right: plotDataZ[plotDataZ.length-1][plotDataZ[0].length-1]
                }
            });
        } catch (error) {
            console.error('3D厚度数据切片提取失败:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">3D厚度数据格式处理失败: ${error.message}</div>`;
            return;
        }
    } else if (!Array.isArray(plotDataZ[0])) {
        console.log('Z数据是扁平数组，需要重塑成二维数组');
        
        // 首先检查是否可以正确重塑
        if (xCoords.length * yCoords.length === plotDataZ.length) {
            try {
                // 尝试检测数据排列顺序 (按行主序还是列主序)
                const isRowMajor = detectDataOrder(plotDataZ, xCoords, yCoords);
                console.log(`检测到数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
                
                // 根据检测到的顺序重塑数据
                const newZ = reshapeArray(plotDataZ, xCoords.length, yCoords.length, isRowMajor);
                plotDataZ = newZ;
            } catch (error) {
                console.error('无法重塑数据:', error);
                container.innerHTML = `<div style="color:red;padding:20px;">数据转换错误: ${error.message}</div>`;
                return;
            }
        } else if (data.z_thickness_matrix || data.thickness_matrix) {
            // 尝试使用现成的矩阵数据
            plotDataZ = data.z_thickness_matrix || data.thickness_matrix;
            console.log('使用提供的thickness_matrix数据');
        } else if (currentModelType === 'car' && data.grid_data && typeof data.grid_data === 'object') {
            // 尝试从CAR模型特有的grid_data中提取
            try {
                if (data.grid_data.thickness || data.grid_data.deprotection) {
                    const gridData = data.grid_data.thickness || data.grid_data.deprotection;
                    console.log('使用CAR模型grid_data', gridData);
                    plotDataZ = gridData;
                }
            } catch (error) {
                console.error('处理CAR模型grid_data失败:', error);
            }
        } else {
            console.error('Z数据长度与x和y坐标数量不匹配');
            container.innerHTML = `<div style="color:red;padding:20px;">数据维度不匹配: Z长度=${plotDataZ.length}, X长度=${xCoords.length}, Y长度=${yCoords.length}</div>`;
            return;
        }
    }

    // 创建3D表面图
    const trace = {
        type: 'surface',
        x: xCoords,
        y: yCoords,
        z: plotDataZ,
        colorscale: 'Plasma',
        colorbar: { title: LANGS[currentLang].thickness_trace_name || '相对厚度' },
        hovertemplate: `X坐标: %{x:.2f} μm<br>Y坐标: %{y:.2f} μm<br>Z坐标: %{z:.2f}<br>${LANGS[currentLang].hover_thickness_value || '相对厚度值'}: %{z:.2f}<extra></extra>`
    };

    const layout = {
        title: '光刻胶厚度分布 (3D)',
        scene: {
            xaxis: { title: 'X (μm)' },
            yaxis: { title: 'Y (μm)' },
            zaxis: { title: LANGS[currentLang].relative_thickness_unit || '相对厚度' }
        },
        margin: { l: 20, r: 20, t: 40, b: 20 }
    };

    try {
        Plotly.newPlot(container, [trace], layout, { responsive: true });
        console.log('3D Thickness plot created successfully');
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points && eventData.points.length > 0) {
                const point = eventData.points[0];
                // 对于3D表面图，点击位置包含x、y、z值
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 3D Thickness plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建3D图表失败: ${error.message}</div>`;
    }
}

/**
 * 标准化热图数据格式，确保数据为二维数组形式
 * @param {Array} data - 原始数据，可能是一维或二维数组
 * @param {Array} xCoords - X坐标数组
 * @param {Array} yCoords - Y坐标数组
 * @returns {Array} - 标准化的二维数组
 */
function standardizeHeatmapData(data, xCoords, yCoords) {
    // 已经是二维数组，直接返回
    if (Array.isArray(data) && Array.isArray(data[0])) {
        return data;
    }
    
    // 一维数组，需要转换为二维数组
    if (Array.isArray(data) && xCoords.length * yCoords.length === data.length) {
        // 使用detectDataOrder检测数据排列顺序
        const isRowMajor = detectDataOrder(data, xCoords, yCoords);
        console.log(`检测到数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
        
        // 使用reshapeArray重塑数据
        return reshapeArray(data, xCoords.length, yCoords.length, isRowMajor);
    }
    
    // 无法处理的情况，返回原始数据并记录错误
    console.error('数据维度不匹配: 无法重塑数组');
    console.error(`数据长度=${data ? data.length : 'undefined'}, X长度=${xCoords.length}, Y长度=${yCoords.length}`);
    return data; // 返回原始数据，让调用函数决定如何处理
}

/**
 * 创建1D曝光剂量分布线图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createExposurePlot(container, data) {
    // 获取当前语言设置
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    
    // 获取当前选择的模型类型
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    // 统一字段名处理，增加更多兼容性
    let xCoords = data.x || data.positions || data.x_coords;
    let yData = data.exposure_dose || data.intensity || data.I;

    // 更健壮的数据检查
    if (!xCoords || !yData || 
        !Array.isArray(xCoords) || !Array.isArray(yData) ||
        xCoords.length === 0 || yData.length === 0 ||
        xCoords.length !== yData.length) {
        container.innerHTML = `<div style="color:red;padding:20px;">${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].error_no_exposure_data) || '无有效1D曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    try {
        const trace = {
            x: xCoords,
            y: yData,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#1f77b4', width: 2 },
            marker: { size: 4, color: '#1f77b4' },
            name: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].exposure_dose_trace_name) || '曝光剂量',
            hovertemplate: `位置: %{x}<br>${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].hover_exposure_value) || '曝光剂量值'}: %{y}<extra></extra>`
        };

        // 根据模型类型设置不同的轴标签
        let xAxisTitle;
        if (currentModelType === 'enhanced_dill') {
            xAxisTitle = 'Z 位置 (μm)'; // 增强DILL模型关注深度方向
        } else {
            xAxisTitle = (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].x_position) || 'X 位置 (μm)';
        }

        const layout = {
            title: '曝光计量分布 (1D)',
            xaxis: { title: xAxisTitle },
            yaxis: { title: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].exposure_dose_trace_name) || '曝光剂量 (mJ/cm²)' },
            margin: { l: 60, r: 20, t: 60, b: 60 },
            showlegend: false
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y
                }, 'exposure', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 1D Exposure plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建1D线图失败: ${error.message}</div>`;
    }
}

/**
 * 创建1D光刻胶厚度分布线图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createThicknessPlot(container, data) {
    // 获取当前语言设置
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    
    // 获取当前选择的模型类型
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    // 统一字段名处理，增加更多兼容性
    let xCoords = data.x || data.positions || data.x_coords;
    let yData = data.thickness || data.M;

    // 更健壮的数据检查
    if (!xCoords || !yData || 
        !Array.isArray(xCoords) || !Array.isArray(yData) ||
        xCoords.length === 0 || yData.length === 0 ||
        xCoords.length !== yData.length) {
        container.innerHTML = `<div style="color:red;padding:20px;">${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].error_no_thickness_data) || '无有效1D厚度数据，无法绘图。'}</div>`;
        return;
    }

    try {
        const trace = {
            x: xCoords,
            y: yData,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#ff7f0e', width: 2 },
            marker: { size: 4, color: '#ff7f0e' },
            name: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].thickness_trace_name) || '相对厚度',
            hovertemplate: `位置: %{x}<br>${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].hover_thickness_value) || '相对厚度值'}: %{y}<extra></extra>`
        };

        // 根据模型类型设置不同的轴标签
        let xAxisTitle;
        if (currentModelType === 'enhanced_dill') {
            xAxisTitle = 'Z 位置 (μm)'; // 增强DILL模型关注深度方向
        } else {
            xAxisTitle = (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].x_position) || 'X 位置 (μm)';
        }

        const layout = {
            title: '光刻胶厚度分布 (1D)',
            xaxis: { title: xAxisTitle },
            yaxis: { title: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].thickness_trace_name) || '相对厚度' },
            margin: { l: 60, r: 20, t: 60, b: 60 },
            showlegend: false
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y
                }, 'thickness', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 1D Thickness plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建1D线图失败: ${error.message}</div>`;
    }
}

function createExposureHeatmap(container, data) {
    // 统一字段名处理，增加更多兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zData = data.z_exposure_dose || data.exposure_dose || data.intensity_2d || data.I;

    // 更健壮的数据检查
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_exposure_data || '无有效2D曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    // 使用标准化函数处理数据格式
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);

        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量' },
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_exposure_value || '曝光剂量值'}: %{z}<extra></extra>`
        };

        // 根据模型类型设置不同的标题和轴标签
        const modelSelect = document.getElementById('model-select');
        const currentModelType = modelSelect ? modelSelect.value : 'dill';
        
        let title, xAxisTitle, yAxisTitle;
        
        if (currentModelType === 'enhanced_dill') {
            title = '曝光计量分布 (2D) (Y, Z平面)';
            xAxisTitle = 'Z 位置 (μm)';  // 对于增强DILL模型，横轴是深度方向
            yAxisTitle = 'Y 位置 (μm)';
        } else {
            title = '曝光计量分布 (2D)';
            xAxisTitle = LANGS[currentLang].x_position || 'X 位置 (μm)';
            yAxisTitle = LANGS[currentLang].y_position || 'Y 位置 (μm)';
        }
        
        const layout = {
            title: title,
            xaxis: { title: xAxisTitle },
            yaxis: { title: yAxisTitle },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                // 对于热力图，point.x和point.y是坐标值，point.z是强度值
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 2D Exposure heatmap:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建2D热图失败: ${error.message}</div>`;
    }
}

function createThicknessHeatmap(container, data) {
    // 统一字段名处理，增加更多兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zData = data.z_thickness || data.thickness || data.M || data.thickness_2d;

    // 更健壮的数据检查
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_thickness_data || '无有效2D厚度数据，无法绘图。'}</div>`;
        return;
    }

    // 使用标准化函数处理数据格式
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);

        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: LANGS[currentLang].thickness_trace_name || '相对厚度' },
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_thickness_value || '相对厚度值'}: %{z}<extra></extra>`
        };

        // 根据模型类型设置不同的标题和轴标签
        const modelSelect = document.getElementById('model-select');
        const currentModelType = modelSelect ? modelSelect.value : 'dill';
        
        let title, xAxisTitle, yAxisTitle;
        
        if (currentModelType === 'enhanced_dill') {
            title = '光刻胶厚度分布 (2D) (Y, Z平面)';
            xAxisTitle = 'Z 位置 (μm)';  // 对于增强DILL模型，横轴是深度方向
            yAxisTitle = 'Y 位置 (μm)';
        } else {
            title = '光刻胶厚度分布 (2D)';
            xAxisTitle = LANGS[currentLang].x_position || 'X 位置 (μm)';
            yAxisTitle = LANGS[currentLang].y_position || 'Y 位置 (μm)';
        }
        
        const layout = {
            title: title,
            xaxis: { title: xAxisTitle },
            yaxis: { title: yAxisTitle },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                // 对于热力图，point.x和point.y是坐标值，point.z是强度值
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 2D Thickness heatmap:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建2D热图失败: ${error.message}</div>`;
    }
}

/**
 * 创建(x, y)平面的曝光计量分布热力图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createExposureXYHeatmap(container, data) {
    // 统一字段名处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    // 支持不同的字段名，保持向后兼容性
    let zData = data.exposure_xy || data.xy_exposure; 
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = '<div style="color:red;padding:20px;">无有效(X, Y)平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量' },
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_exposure_value || '曝光剂量值'}: %{z}<extra></extra>`
        };
        
        const layout = {
            title: '曝光计量分布 (2D) (X, Y平面)',
            xaxis: { title: LANGS[currentLang].x_position || 'X 位置 (μm)' },
            yaxis: { title: LANGS[currentLang].y_position || 'Y 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        // 添加导出功能 - 添加安全检查
        const exportExposureXYImg = document.getElementById('export-exposure-xy-img');
        if (exportExposureXYImg) {
            exportExposureXYImg.onclick = function() {
                Plotly.downloadImage(container, {format: 'png', filename: 'exposure_xy_distribution'});
            };
        }
        
        const exportExposureXYData = document.getElementById('export-exposure-xy-data');
        if (exportExposureXYData) {
            exportExposureXYData.onclick = function() {
                exportPlotData('exposure_xy');
            };
        }
    } catch (error) {
        console.error('创建(X, Y)平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建(X, Y)平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * 创建(x, y)平面的光刻胶厚度分布热力图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createThicknessXYHeatmap(container, data) {
    // 统一字段名处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    // 支持不同的字段名，保持向后兼容性
    let zData = data.thickness_xy || data.xy_thickness;
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = '<div style="color:red;padding:20px;">无有效(X, Y)平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: LANGS[currentLang].thickness_trace_name || '相对厚度' },
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_thickness_value || '相对厚度值'}: %{z}<extra></extra>`
        };
        
        const layout = {
            title: LANGS[currentLang].thickness_xy_dist || '光刻胶厚度分布 (2D) (X, Y平面)',
            xaxis: { title: LANGS[currentLang].x_position || 'X 位置 (μm)' },
            yaxis: { title: LANGS[currentLang].y_position || 'Y 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        // 添加导出功能 - 添加安全检查
        const exportThicknessXYImg = document.getElementById('export-thickness-xy-img');
        if (exportThicknessXYImg) {
            exportThicknessXYImg.onclick = function() {
                Plotly.downloadImage(container, {format: 'png', filename: 'thickness_xy_distribution'});
            };
        }
        
        const exportThicknessXYData = document.getElementById('export-thickness-xy-data');
        if (exportThicknessXYData) {
            exportThicknessXYData.onclick = function() {
                exportPlotData('thickness_xy');
            };
        }
    } catch (error) {
        console.error('创建(X, Y)平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建(X, Y)平面厚度热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建XY平面曝光剂量热图
 */
function createEnhancedDillXYExposureHeatmap(container, data) {
    // Enhanced Dill模型XY平面数据处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.xy_y_coords || data.y_coords || data.y;
    let zData = data.xy_exposure;
    
    console.log('Enhanced Dill XY平面曝光剂量热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        y_coords_length: yCoords ? yCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill XY平面曝光剂量数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效XY平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        console.log('Enhanced Dill XY平面曝光剂量热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: [Math.min(...heatmapZ.flat()), Math.max(...heatmapZ.flat())]
        });
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量 (mJ/cm²)' },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>曝光剂量: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'XY平面曝光剂量分布 (表面)',
            xaxis: { title: 'X 位置 (μm)' },
            yaxis: { title: 'Y 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        console.log('Enhanced Dill XY平面曝光剂量热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill XY平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建XY平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建XY平面厚度热图
 */
function createEnhancedDillXYThicknessHeatmap(container, data) {
    // Enhanced Dill模型XY平面数据处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.xy_y_coords || data.y_coords || data.y;
    let zData = data.xy_thickness;
    
    console.log('Enhanced Dill XY平面厚度热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        y_coords_length: yCoords ? yCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill XY平面厚度数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效XY平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        console.log('Enhanced Dill XY平面厚度热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: [Math.min(...heatmapZ.flat()), Math.max(...heatmapZ.flat())]
        });
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: '相对厚度' },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>相对厚度: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'XY平面厚度分布 (表面)',
            xaxis: { title: 'X 位置 (μm)' },
            yaxis: { title: 'Y 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        console.log('Enhanced Dill XY平面厚度热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill XY平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建XY平面厚度热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建X平面曝光剂量热图
 */
function createEnhancedDillXPlaneExposureHeatmap(container, data) {
    // X平面数据处理 - 使用Y和Z坐标
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    let zData = data.x_plane_exposure;
    
    console.log('Enhanced Dill X平面曝光剂量热图数据检查:', {
        y_coords_length: yCoords ? yCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!yCoords || !zCoords || !zData || 
        !Array.isArray(yCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        yCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill X平面曝光剂量数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效X平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, yCoords, zCoords);
        
        console.log('Enhanced Dill X平面曝光剂量热图数据处理完成:', {
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: [Math.min(...heatmapZ.flat()), Math.max(...heatmapZ.flat())]
        });
        
        const trace = {
            x: yCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量 (mJ/cm²)' },
            hovertemplate: 'Y: %{x}<br>Z: %{y}<br>曝光剂量: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'X平面曝光剂量分布 (Y-Z截面)',
            xaxis: { title: 'Y 位置 (μm)' },
            yaxis: { title: 'Z 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        console.log('Enhanced Dill X平面曝光剂量热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill X平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建X平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建X平面厚度热图
 */
function createEnhancedDillXPlaneThicknessHeatmap(container, data) {
    // X平面数据处理 - 使用Y和Z坐标
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    let zData = data.x_plane_thickness;
    
    console.log('Enhanced Dill X平面厚度热图数据检查:', {
        y_coords_length: yCoords ? yCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!yCoords || !zCoords || !zData || 
        !Array.isArray(yCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        yCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill X平面厚度数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效X平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, yCoords, zCoords);
        
        console.log('Enhanced Dill X平面厚度热图数据处理完成:', {
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: [Math.min(...heatmapZ.flat()), Math.max(...heatmapZ.flat())]
        });
        
        const trace = {
            x: yCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: '相对厚度' },
            hovertemplate: 'Y: %{x}<br>Z: %{y}<br>相对厚度: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'X平面厚度分布 (Y-Z截面)',
            xaxis: { title: 'Y 位置 (μm)' },
            yaxis: { title: 'Z 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        console.log('Enhanced Dill X平面厚度热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill X平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建X平面厚度热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建Y平面曝光剂量热图
 */
function createEnhancedDillYPlaneExposureHeatmap(container, data) {
    // Y平面数据处理 - 使用X和Z坐标
    let xCoords = data.x_coords || data.x;
    let zCoords = data.z_coords || data.z;
    let zData = data.y_plane_exposure;
    
    console.log('Enhanced Dill Y平面曝光剂量热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !zCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill Y平面曝光剂量数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效Y平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, zCoords);
        
        console.log('Enhanced Dill Y平面曝光剂量热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: [Math.min(...heatmapZ.flat()), Math.max(...heatmapZ.flat())]
        });
        
        const trace = {
            x: xCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量 (mJ/cm²)' },
            hovertemplate: 'X: %{x}<br>Z: %{y}<br>曝光剂量: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'Y平面曝光剂量分布 (X-Z截面)',
            xaxis: { title: 'X 位置 (μm)' },
            yaxis: { title: 'Z 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        console.log('Enhanced Dill Y平面曝光剂量热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill Y平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建Y平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建Y平面厚度热图
 */
function createEnhancedDillYPlaneThicknessHeatmap(container, data) {
    // Y平面数据处理 - 使用X和Z坐标
    let xCoords = data.x_coords || data.x;
    let zCoords = data.z_coords || data.z;
    let zData = data.y_plane_thickness;
    
    console.log('Enhanced Dill Y平面厚度热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !zCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill Y平面厚度数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效Y平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, zCoords);
        
        console.log('Enhanced Dill Y平面厚度热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: [Math.min(...heatmapZ.flat()), Math.max(...heatmapZ.flat())]
        });
        
        const trace = {
            x: xCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: '相对厚度' },
            hovertemplate: 'X: %{x}<br>Z: %{y}<br>相对厚度: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'Y平面厚度分布 (X-Z截面)',
            xaxis: { title: 'X 位置 (μm)' },
            yaxis: { title: 'Z 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        console.log('Enhanced Dill Y平面厚度热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill Y平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建Y平面厚度热图失败: ${error.message}</div>`;
    }
}

// Make sure LANGS[currentLang].y_position exists or add it
// Example: LANGS.zh.y_position = 'Y 位置 (μm)'; LANGS.en.y_position = 'Y Position (μm)';

/**
 * 应用结果动画
 */
function animateResults() {
    const plotItems = document.querySelectorAll('.plot-item');
    
    plotItems.forEach((item, index) => {
        // 添加动画类
        item.classList.add('fade-in-up');
        item.style.animationDelay = `${0.2 * index}s`;
        
        // 一段时间后移除动画类，以便可以重复触发
        setTimeout(() => {
            item.classList.remove('fade-in-up');
            item.style.animationDelay = '';
        }, 1000);
    });
}

/**
 * 应用页面加载动画
 */
function applyEntryAnimations() {
    // 页面元素淡入
    const header = document.querySelector('header');
    const parametersSection = document.querySelector('.parameters-section');
    const parameterItems = document.querySelectorAll('.parameter-item');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // 头部动画
    header.classList.add('fade-in-down');
    
    // 参数区域动画
    setTimeout(() => {
        parametersSection.classList.add('fade-in');
    }, 200);
    
    // 参数项动画
    parameterItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('fade-in-left');
            
            // 移除动画类
            setTimeout(() => {
                item.classList.remove('fade-in-left');
            }, 1000);
        }, 400 + index * 100);
    });
    
    // 按钮动画
    setTimeout(() => {
        calculateBtn.classList.add('fade-in-up');
        
        // 移除动画类
        setTimeout(() => {
            calculateBtn.classList.remove('fade-in-up');
        }, 1000);
    }, 800); // 调整参数区域动画之后的延迟，确保模型选择区域先动画
}

/**
 * 清空所有图表显示
 */
function clearAllCharts() {
    console.log('清空所有图表显示');
    
    // 隐藏结果区域
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.classList.remove('visible');
    }
    
    // 清空交互式图表容器
    const exposurePlotContainer = document.getElementById('exposure-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-plot-container');
    
    // 使用Plotly.purge更彻底地清除图表资源
    if (exposurePlotContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && exposurePlotContainer._fullLayout) {
            try {
                Plotly.purge(exposurePlotContainer);
            } catch (e) {
                console.warn('清除曝光图表失败:', e);
            }
        }
        exposurePlotContainer.innerHTML = '';
        exposurePlotContainer.style.display = 'none';
    }
    
    if (thicknessPlotContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && thicknessPlotContainer._fullLayout) {
            try {
                Plotly.purge(thicknessPlotContainer);
            } catch (e) {
                console.warn('清除厚度图表失败:', e);
            }
        }
        thicknessPlotContainer.innerHTML = '';
        thicknessPlotContainer.style.display = 'none';
    }
    
    // 隐藏静态图像
    const exposurePlot = document.getElementById('exposure-plot');
    const thicknessPlot = document.getElementById('thickness-plot');
    
    if (exposurePlot) {
        exposurePlot.style.display = 'none';
        exposurePlot.src = '';
    }
    
    if (thicknessPlot) {
        thicknessPlot.style.display = 'none';
        thicknessPlot.src = '';
    }
    
    // 清除CAR模型特有的图表容器
    const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
    if (carInteractivePlotsContainer) {
        // 尝试调用CAR模型的resetCarPlots函数（如果存在）
        if (typeof resetCarPlots === 'function') {
            try {
                resetCarPlots();
            } catch (e) {
                console.warn('重置CAR图表失败:', e);
            }
        }
        
        // 简单清空容器
        carInteractivePlotsContainer.innerHTML = '';
        carInteractivePlotsContainer.style.display = 'none';
    }
    
    // 隐藏阈值控制
    const thresholdContainers = document.querySelectorAll('.threshold-container');
    thresholdContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // 隐藏XY平面热力图容器
    const exposureXyPlotItem = document.getElementById('exposure-xy-plot-item');
    const thicknessXyPlotItem = document.getElementById('thickness-xy-plot-item');
    if (exposureXyPlotItem) exposureXyPlotItem.style.display = 'none';
    if (thicknessXyPlotItem) thicknessXyPlotItem.style.display = 'none';
    
    // 隐藏增强DILL模型的额外X和Y平面图表
    const enhancedDillExtraPlots = [
        'enhanced-dill-x-plane-exposure-item',
        'enhanced-dill-x-plane-thickness-item',
        'enhanced-dill-y-plane-exposure-item',
        'enhanced-dill-y-plane-thickness-item'
    ];
    
    enhancedDillExtraPlots.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            item.style.display = 'none';
        }
    });
    
    // 清空XY平面热力图内容
    const exposureXyContainer = document.getElementById('exposure-xy-plot-container');
    const thicknessXyContainer = document.getElementById('thickness-xy-plot-container');
    if (exposureXyContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && exposureXyContainer._fullLayout) {
            try {
                Plotly.purge(exposureXyContainer);
            } catch (e) {
                console.warn('清除XY平面曝光图表失败:', e);
            }
        }
        exposureXyContainer.innerHTML = '';
    }
    if (thicknessXyContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && thicknessXyContainer._fullLayout) {
            try {
                Plotly.purge(thicknessXyContainer);
            } catch (e) {
                console.warn('清除XY平面厚度图表失败:', e);
            }
        }
        thicknessXyContainer.innerHTML = '';
    }
    
    // 清空增强DILL模型的额外X和Y平面图表容器
    const enhancedDillExtraContainers = [
        'enhanced-dill-x-plane-exposure-container',
        'enhanced-dill-x-plane-thickness-container',
        'enhanced-dill-y-plane-exposure-container',
        'enhanced-dill-y-plane-thickness-container'
    ];
    
    enhancedDillExtraContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            if (typeof Plotly !== 'undefined' && Plotly.purge && container._fullLayout) {
                try {
                    Plotly.purge(container);
                } catch (e) {
                    console.warn(`清除${containerId}图表失败:`, e);
                }
            }
            container.innerHTML = '';
        }
    });
    
    console.log('图表已清空，等待用户重新生成');
}

/**
 * 显示单一计算页面的点详细信息弹窗
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型 ('exposure' 或 'thickness')
 * @param {HTMLElement} container - 图表容器
 * @param {Object} eventData - 完整的事件数据
 */
function showSinglePointDetailsPopup(point, plotType, container, eventData) {
    removeSinglePointDetailsPopup();
    const params = getParameterValues();
    const pointInfo = getSinglePointDetailedInfo(point, plotType, params);

    // 创建弹窗元素
    const popup = document.createElement('div');
    popup.id = 'single-point-details-popup';
    popup.className = 'point-details-popup';
    popup.innerHTML = `
        <div class="point-details-content">
            <div class="point-details-header">
                <span class="point-details-title">📊 点详细信息</span>
                <button class="point-details-close" onclick="removeSinglePointDetailsPopup()">×</button>
            </div>
            <div class="point-details-body">
                ${pointInfo.html}
            </div>
            <div class="point-details-footer">
                <small>💡 提示：点击其他位置关闭弹窗</small>
            </div>
        </div>
    `;
    // fixed 定位，z-index 提高
    popup.style.cssText = `
        position: fixed;
        left: 0; top: 0;
        width: 320px;
        max-height: 400px;
        background: rgba(255,255,255,0.98);
        border: 2px solid #3498db;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.18);
        z-index: 99999;
        font-family: 'Roboto', Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: popupFadeIn 0.3s ease-out;
        overflow: hidden;
    `;
    document.body.appendChild(popup);

    // 计算弹窗显示位置（基于鼠标点击点或图表容器中心）
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    if (eventData && eventData.event && eventData.event.clientX !== undefined) {
        mouseX = eventData.event.clientX;
        mouseY = eventData.event.clientY;
    } else if (container) {
        // fallback: 容器中心
        const rect = container.getBoundingClientRect();
        mouseX = rect.left + rect.width / 2;
        mouseY = rect.top + rect.height / 2;
    }
    // 弹窗尺寸
    const popupWidth = 320;
    const popupHeight = 400;
    // 计算 left/top，避免超出屏幕
    let left = mouseX - popupWidth / 2;
    let top = mouseY - popupHeight - 20;
    if (left < 10) left = 10;
    if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10;
    if (top < 10) top = mouseY + 20;
    if (top + popupHeight > window.innerHeight - 10) top = window.innerHeight - popupHeight - 10;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // 延迟绑定外部点击关闭事件，防止 plotly_click 误触发
    setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick, {capture:true});
    }, 300);
    function handleOutsideClick(event) {
        if (!popup.contains(event.target)) {
            removeSinglePointDetailsPopup();
            document.removeEventListener('mousedown', handleOutsideClick, {capture:true});
        }
    }
}

function removeSinglePointDetailsPopup() {
    const existingPopup = document.getElementById('single-point-details-popup');
    if (existingPopup) {
        existingPopup.style.animation = 'popupFadeOut 0.2s ease-in';
        setTimeout(() => {
            if (existingPopup.parentNode) existingPopup.parentNode.removeChild(existingPopup);
        }, 200);
    }
}

// 将函数设为全局可访问
window.clearAllCharts = clearAllCharts;
window.removeSinglePointDetailsPopup = removeSinglePointDetailsPopup;

// Dill模型三维正弦分布预览绘图函数 (从bindPhiExprUI提取并重命名)
function dillDraw3DPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('phi_expr_3d');
    const kxInput = document.getElementById('Kx_3d');
    const kyInput = document.getElementById('Ky_3d');
    const kzInput = document.getElementById('Kz_3d');
    const vInput = document.getElementById('V'); // Assuming 'V' is the ID for Dill model's V
    const plot = document.getElementById('phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');
    const controlsElement = document.getElementById('phi-expr-3d-preview-controls');
    const tSlider = document.getElementById('phi-expr-3d-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');

    const xMinInput = document.getElementById('x_min_3d');
    const xMaxInput = document.getElementById('x_max_3d');
    const yMinInput = document.getElementById('y_min_3d');
    const yMaxInput = document.getElementById('y_max_3d');
    const zMinInput = document.getElementById('z_min_3d');
    const zMaxInput = document.getElementById('z_max_3d');
    const yPointsInput = document.getElementById('y_points');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 0.8; // Default V_val
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (kzInput) Kz = parseFloat(kzInput.value);
    if (vInput) V_val = parseFloat(vInput.value);

    const xRange = [parseFloat(xMinInput.value) || 0, parseFloat(xMaxInput.value) || 10];
    const yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    const zRange = [parseFloat(zMinInput.value) || 0, parseFloat(zMaxInput.value) || 10];
    const yPoints = yPointsInput ? parseInt(yPointsInput.value) || 20 : 20;
    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) { 
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。'; 
            errDiv.style.display = 'block'; 
        }
        return;
    }
     if (errDiv) {
        errDiv.textContent = ''; 
        errDiv.style.display = 'none'; 
    }

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange, yPoints, 20, t);
    plot.style.display = 'block';
    
    // 显示t值控制面板
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    const data = [{
        type: 'isosurface',
        x: plotData.x,
        y: plotData.y,
        z: plotData.z,
        value: plotData.values,
        isomin: 0.5,
        isomax: 1.5,
        surface: { show: true, count: 3, fill: 0.7 },
        colorscale: 'Viridis',
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];
    
    Plotly.newPlot(plot, data, {
        title: `Dill 三维正弦分布预览 (t=${t.toFixed(2)})`,
        scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        },
        margin: {t:40, l:0, r:0, b:0},
        height: 350
    }, {displayModeBar: true});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// 绑定phi_expr输入区说明、校验、预览功能
function bindPhiExprUI() {
    // 二维正弦波参数配置
    const configs = [
        // Dill模型二维配置 - 使用新的dillDrawPreviewPlot
        {
            input: 'phi_expr', 
            kx: 'Kx', 
            ky: 'Ky', 
            v: 'V', 
            btn: 'phi-expr-preview-btn', 
            plotElementId: 'phi-expr-preview-plot', 
            drawFunc: dillDrawPreviewPlot,
            controlsId: 'phi-expr-preview-controls',
            tSlider: 'phi-expr-t-slider',
            playBtn: 'phi-expr-play-btn',
            stopBtn: 'phi-expr-stop-btn'
        },
        // Enhanced Dill模型二维配置 - 使用enhancedDrawPreviewPlot
        {
            input: 'enhanced_phi_expr', 
            kx: 'enhanced_Kx', 
            ky: 'enhanced_Ky', 
            v: 'I0', 
            btn: 'enhanced-phi-expr-preview-btn', 
            plotElementId: 'enhanced-phi-expr-preview-plot', 
            drawFunc: enhancedDrawPreviewPlot,
            controlsId: 'enhanced-phi-expr-preview-controls',
            tSlider: 'enhanced-phi-expr-t-slider',
            playBtn: 'enhanced-phi-expr-play-btn',
            stopBtn: 'enhanced-phi-expr-stop-btn'
        }, 
        // CAR模型二维配置 - 使用carDrawPreviewPlot
        {
            input: 'car_phi_expr', 
            kx: 'car_Kx', 
            ky: 'car_Ky', 
            v: 'car_V', 
            btn: 'car-phi-expr-preview-btn', 
            plotElementId: 'car-phi-expr-preview-plot', 
            drawFunc: carDrawPreviewPlot,
            controlsId: 'car-phi-expr-preview-controls',
            tSlider: 'car-phi-expr-t-slider',
            playBtn: 'car-phi-expr-play-btn',
            stopBtn: 'car-phi-expr-stop-btn'
        }
    ];
    
    // 三维正弦波参数配置
    const configs3D = [
        // Dill模型三维配置 - 使用新的dillDraw3DPreviewPlot
        {
            input: 'phi_expr_3d', 
            kx: 'Kx_3d', 
            ky: 'Ky_3d', 
            kz: 'Kz_3d', 
            v: 'V', 
            btn: 'phi-expr-3d-preview-btn', 
            plotElementId: 'phi-expr-3d-preview-plot', 
            xmin: 'x_min_3d', 
            xmax: 'x_max_3d', 
            ymin: 'y_min_3d', 
            ymax: 'y_max_3d', 
            zmin: 'z_min_3d', 
            zmax: 'z_max_3d', 
            drawFunc: dillDraw3DPreviewPlot,
            controlsId: 'phi-expr-3d-preview-controls',
            tSlider: 'phi-expr-3d-t-slider',
            playBtn: 'phi-expr-3d-play-btn',
            stopBtn: 'phi-expr-3d-stop-btn'
        },
        // Enhanced Dill模型三维配置 - 使用enhancedDraw3DPreviewPlot
        {
            input: 'enhanced_phi_expr_3d', 
            kx: 'enhanced_Kx_3d', 
            ky: 'enhanced_Ky_3d', 
            kz: 'enhanced_Kz_3d', 
            v: 'I0', 
            btn: 'enhanced-phi-expr-3d-preview-btn', 
            plotElementId: 'enhanced-phi-expr-3d-preview-plot',
            xmin: 'enhanced_x_min_3d', 
            xmax: 'enhanced_x_max_3d', 
            ymin: 'enhanced_y_min_3d', 
            ymax: 'enhanced_y_max_3d', 
            zmin: 'enhanced_z_min_3d', 
            zmax: 'enhanced_z_max_3d', 
            drawFunc: enhancedDraw3DPreviewPlot,
            controlsId: 'enhanced-phi-expr-3d-preview-controls',
            tSlider: 'enhanced-phi-expr-3d-t-slider',
            playBtn: 'enhanced-phi-expr-3d-play-btn',
            stopBtn: 'enhanced-phi-expr-3d-stop-btn'
        }, 
        // CAR模型三维配置 - 使用carDraw3DPreviewPlot
        {
            input: 'car_phi_expr_3d', 
            kx: 'car_Kx_3d', 
            ky: 'car_Ky_3d', 
            kz: 'car_Kz_3d', 
            v: 'car_V', 
            btn: 'car-phi-expr-3d-preview-btn', 
            plotElementId: 'car-phi-expr-3d-preview-plot',
            xmin: 'car_x_min_3d', 
            xmax: 'car_x_max_3d', 
            ymin: 'car_y_min_3d', 
            ymax: 'car_y_max_3d', 
            zmin: 'car_z_min_3d', 
            zmax: 'car_z_max_3d', 
            drawFunc: carDraw3DPreviewPlot,
            controlsId: 'car-phi-expr-3d-preview-controls',
            tSlider: 'car-phi-expr-3d-t-slider',
            playBtn: 'car-phi-expr-3d-play-btn',
            stopBtn: 'car-phi-expr-3d-stop-btn'
        }
    ];
    
    // 存储动画间隔ID
    const animationIntervals = {};
    
    // 统一处理预览逻辑
    function setupPreview(config, is3D) {
        const input = document.getElementById(config.input);
        const btn = document.getElementById(config.btn);
        const plotElement = document.getElementById(config.plotElementId); // 使用 plotElementId
        const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');
        const calcBtn = document.getElementById('calculate-btn');
        
        // 获取t值控制元素
        const controlsElement = document.getElementById(config.controlsId);
        const tSlider = document.getElementById(config.tSlider);
        const tValueDisplay = controlsElement?.querySelector('.t-value');
        const playBtn = document.getElementById(config.playBtn);
        const stopBtn = document.getElementById(config.stopBtn);

        if (!input || !btn || !plotElement) return;

        // 实时校验
        input.addEventListener('input', function() {
            const expr = input.value;
            const isValid = validatePhaseExpr(expr);
            if (!isValid) {
                input.style.borderColor = '#d00'; // Consider using class for styling
                if (errDiv) { 
                    errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_validation || '表达式格式有误。'; 
                    errDiv.style.display = 'block'; 
                }
                calcBtn.disabled = true;
                btn.disabled = true; // Disable preview button if expression is invalid
            } else {
                input.style.borderColor = ''; // Reset border
                if (errDiv) { 
                    errDiv.textContent = ''; 
                    errDiv.style.display = 'none'; 
                }
                calcBtn.disabled = false;
                btn.disabled = false; // Enable preview button
            }
        });
        
        btn.style.display = 'block'; // Make button visible
        let isPreviewShown = false;

        function updateBtnText() {
            const langKeyShown = is3D ? 'btn_collapse_3d_preview' : 'btn_collapse_2d_preview';
            const langKeyHidden = is3D ? 'btn_preview_3d_distribution' : 'btn_preview_2d_distribution';
            const defaultTextShown = is3D ? '收起3D分布' : '收起分布';
            const defaultTextHidden = is3D ? '预览3D分布' : '预览分布';
            const text = isPreviewShown ? (LANGS[currentLang]?.[langKeyShown] || defaultTextShown) : (LANGS[currentLang]?.[langKeyHidden] || defaultTextHidden);
            btn.innerHTML = `<span class="preview-icon"></span> ${text}`;
        }
        updateBtnText(); // Initial button text

        // 绘制图表的包装函数，接收t值参数
        function drawPlotWithT(t, scrollToPlot = false) {
            if (!validatePhaseExpr(input.value)) return;
            
            // 传递t参数给绘图函数
            config.drawFunc(scrollToPlot, t);
        }

        // 点击预览按钮
        btn.addEventListener('click', function() {
            if (validatePhaseExpr(input.value)) { // Only proceed if expression is valid
                isPreviewShown = !isPreviewShown;
                if (isPreviewShown) {
                    drawPlotWithT(0, true); // 初始t=0，滚动到图表位置
                } else {
                    plotElement.style.display = 'none'; // Hide plot
                    if (controlsElement) controlsElement.style.display = 'none'; // 隐藏控制面板
                    if (Plotly.purge) Plotly.purge(plotElement); // Clear plot to free resources
                    
                    // 停止动画
                    if (animationIntervals[config.plotElementId]) {
                        clearInterval(animationIntervals[config.plotElementId]);
                        animationIntervals[config.plotElementId] = null;
                        
                        // 重置按钮状态
                        if (playBtn && stopBtn) {
                            playBtn.style.display = 'block';
                            stopBtn.style.display = 'none';
                        }
                    }
                }
                updateBtnText();
            } else {
                 if (errDiv) { 
                    errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview_click || '无法预览无效表达式。'; 
                    errDiv.style.display = 'block'; 
                }
            }
        });

        // 如果有t值滑块，添加事件监听
        if (tSlider && tValueDisplay) {
            tSlider.addEventListener('input', function() {
                const t = parseFloat(this.value);
                tValueDisplay.textContent = t.toFixed(2);
                if (isPreviewShown) {
                    drawPlotWithT(t, false);
                }
            });
        }
        
        // 播放/停止动画按钮
        if (playBtn && stopBtn) {
            // 播放动画
            playBtn.addEventListener('click', function() {
                if (animationIntervals[config.plotElementId]) {
                    clearInterval(animationIntervals[config.plotElementId]);
                }
                
                let t = parseFloat(tSlider.value);
                const step = 0.05;
                
                // 根据是否是3D调整动画间隔
                const animationInterval = is3D ? 150 : 50; // 3D动画间隔150ms，2D动画间隔50ms
                
                animationIntervals[config.plotElementId] = setInterval(() => {
                    t += step;
                    if (t > 6.28) t = 0;
                    
                    tSlider.value = t;
                    tValueDisplay.textContent = t.toFixed(2);
                    drawPlotWithT(t, false);
                }, animationInterval);
                
                playBtn.style.display = 'none';
                stopBtn.style.display = 'block';
            });
            
            // 停止动画
            stopBtn.addEventListener('click', function() {
                if (animationIntervals[config.plotElementId]) {
                    clearInterval(animationIntervals[config.plotElementId]);
                    animationIntervals[config.plotElementId] = null;
                }
                
                playBtn.style.display = 'block';
                stopBtn.style.display = 'none';
            });
        }

        // Auto-refresh on parameter change if preview is shown
        const paramInputs = [input];
        if (config.kx) paramInputs.push(document.getElementById(config.kx));
        if (config.ky) paramInputs.push(document.getElementById(config.ky));
        if (config.kz) paramInputs.push(document.getElementById(config.kz));
        if (config.v) paramInputs.push(document.getElementById(config.v));
        if (is3D) {
            ['xmin', 'xmax', 'ymin', 'ymax', 'zmin', 'zmax'].forEach(p => {
                if (config[p]) paramInputs.push(document.getElementById(config[p]));
            });
        }

        paramInputs.forEach(pInput => {
            if (pInput) {
                pInput.addEventListener('input', () => { // Use 'input' for immediate feedback
                    if (isPreviewShown && validatePhaseExpr(input.value)) {
                        // 获取当前的t值（如果有滑块的话）
                        let currentT = 0;
                        if (tSlider) {
                            currentT = parseFloat(tSlider.value) || 0;
                        }
                        config.drawFunc(false, currentT); // No scroll on auto-refresh, use current t value
                    }
                });
            }
        });
    }

    configs.forEach(cfg => setupPreview(cfg, false));
    configs3D.forEach(cfg => setupPreview(cfg, true));
}

function highlightErrorCard(msg) {
    // 先移除所有高亮
    document.querySelectorAll('.parameter-item.error').forEach(e=>e.classList.remove('error'));
    // 简单关键词判断
    if (/phi|表达式|expr|格式|sin|cos|pi|t/.test(msg)) {
        let el = document.getElementById('phi_expr');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/Kx|空间频率x/.test(msg)) {
        let el = document.getElementById('Kx');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/Ky|空间频率y/.test(msg)) {
        let el = document.getElementById('Ky');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/V|可见度|对比度/.test(msg)) {
        let el = document.getElementById('V');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/C|速率常数/.test(msg)) {
        let el = document.getElementById('C');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/t_exp|曝光时间/.test(msg)) {
        let el = document.getElementById('t_exp');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    // 其它参数可按需扩展
    // 3秒后自动移除高亮
    setTimeout(()=>{
        document.querySelectorAll('.parameter-item.error').forEach(e=>e.classList.remove('error'));
    }, 3000);
}

// 为Dill模型生成弹窗HTML的辅助函数
function getDillPopupHtmlContent(x, y, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    let additionalInfo = '';
    
    if (plotType === 'exposure') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
        formulaTitle = 'Dill模型曝光剂量计算：';
        
        // 根据不同的波形模式显示对应的公式
        if (params.sine_type === 'multi') {
            formulaMath = 'D(x,y) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
            formulaExplanation = `
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• φ: 相位值 (${params.phi_expr})</div>
            `;
        } else if (params.sine_type === '3d') {
            formulaMath = 'D(x,y,z) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
            formulaExplanation = `
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• φ: 相位值 (${params.phi_expr})</div>
            `;
        } else {
            formulaMath = 'D(x) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(K·x))';
            formulaExplanation = `
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            `;
        }
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'Dill模型光刻胶厚度计算：';
        
        // 检查是否有多维数据，确定计算公式
        if (params.sine_type === 'multi') {
            formulaMath = 'M(x,y) = e<sup>-C × D(x,y)</sup>';
            formulaMath += '<br>D(x,y) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
        } else if (params.sine_type === '3d') {
            formulaMath = 'M(x,y,z) = e<sup>-C × D(x,y,z)</sup>';
            formulaMath += '<br>D(x,y,z) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
        } else {
            formulaMath = 'M(x) = e<sup>-C × D(x)</sup>';
        }
        
        formulaExplanation = `
            <div>• C: 光敏速率常数 (${params.C} cm²<span class="fraction"><span class="numerator">1</span><span class="denominator">mJ</span></span>)</div>
            <div>• D(x): 该点曝光剂量 (${y.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
        `;
    }
    
    return `
        <div class="point-info-section">
            <h4>🎯 ${LANGS[currentLang].popup_section_location || '位置信息'}</h4>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">X:</span>
                    <span class="info-value">${x.toFixed(3)} µm</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${valueLabel}</span>
                    <span class="info-value">${y.toFixed(3)} ${valueUnit}</span>
                </div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 ${LANGS[currentLang].popup_section_params_dill || '参数组: Dill模型'}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">I_avg:</span><span class="info-value">${params.I_avg} mW/cm²</span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                ${params.sine_type === 'multi' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : params.sine_type === '3d' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">Kz:</span><span class="info-value">${params.Kz}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : `
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K}</span></div>
                `}
                <div class="info-item"><span class="info-label">t_exp:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">C:</span><span class="info-value">${params.C}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 ${LANGS[currentLang].popup_section_formula || '计算公式 (核心)'}</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
    `;
}

// 为增强Dill模型生成弹窗HTML的辅助函数
function getEnhancedDillPopupHtmlContent(x, y, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    let additionalInfo = '';

    if (plotType === 'exposure') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
        formulaTitle = '增强Dill模型曝光剂量计算：';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = 'D(x,y,z) = ∫ I(x,y,z,t) dt';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + φ)) × e<sup>-∫[A(z_h,T,t_B)·M+B(z_h,T,t_B)]dz</sup>';
            formulaExplanation = `
                <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• φ: 相位值 (${params.phi_expr})</div>
                <div>• z_h: 胶厚 (${params.z_h} μm)</div>
                <div>• T: 前烘温度 (${params.T} °C)</div>
                <div>• t_B: 前烘时间 (${params.t_B} min)</div>
                <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
                <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            `;
        } else if (params.sine_type === '3d') {
            formulaMath = 'D(x,y,z) = ∫ I(x,y,z,t) dt';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ)) × e<sup>-∫[A(z_h,T,t_B)·M+B(z_h,T,t_B)]dz</sup>';
            formulaExplanation = `
                <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• φ: 相位值 (${params.phi_expr})</div>
                <div>• z_h: 胶厚 (${params.z_h} μm)</div>
                <div>• T: 前烘温度 (${params.T} °C)</div>
                <div>• t_B: 前烘时间 (${params.t_B} min)</div>
                <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
                <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            `;
        } else {
            formulaMath = 'D(x,z) = ∫ I(x,z,t) dt';
            formulaMath += '<br>I(x,z) = I<sub>0</sub> × (1 + V × cos(K·x)) × e<sup>-∫[A(z_h,T,t_B)·M+B(z_h,T,t_B)]dz</sup>';
            formulaExplanation = `
                <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• z_h: 胶厚 (${params.z_h} μm)</div>
                <div>• T: 前烘温度 (${params.T} °C)</div>
                <div>• t_B: 前烘时间 (${params.t_B} min)</div>
                <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
                <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            `;
        }
        
                 // 计算当前点的光强和相位（根据波形类型）
         let currentIntensity = 0;
         let phaseValue = 0;
         
         if (params.sine_type === 'multi') {
             phaseValue = params.Kx * x + (params.Ky || 0) * 0; // y坐标在这里不可用，假设为0
             currentIntensity = params.I0 * (1 + params.V * Math.cos(phaseValue));
         } else if (params.sine_type === '3d') {
             phaseValue = params.Kx * x + (params.Ky || 0) * 0 + (params.Kz || 0) * 0; // y,z坐标在这里不可用
             currentIntensity = params.I0 * (1 + params.V * Math.cos(phaseValue));
         } else {
             phaseValue = params.K * x;
             currentIntensity = params.I0 * (1 + params.V * Math.cos(phaseValue));
         }
         
         additionalInfo = `
             <div class="point-info-section">
                 <h4>📈 ${LANGS[currentLang].popup_section_calculated_values || '计算值详情'}</h4>
                 <div class="info-grid responsive-grid">
                     <div class="info-item"><span class="info-label">当前光强 I(x,z):</span><span class="info-value">${currentIntensity.toFixed(3)} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                     <div class="info-item"><span class="info-label">该点曝光剂量:</span><span class="info-value">${y.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                     <div class="info-item"><span class="info-label">曝光时间:</span><span class="info-value">${params.t_exp} s</span></div>
                     <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${phaseValue.toFixed(3)} rad</span></div>
                     <div class="info-item"><span class="info-label">A,B,C参数:</span><span class="info-value">由z_h=${params.z_h}μm, T=${params.T}°C, t_B=${params.t_B}min决定</span></div>
                 </div>
             </div>
         `;
        
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = '增强Dill模型光刻胶厚度计算：';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '∂M/∂t = -I(x,y,z)·M·C(z_h,T,t_B)';
            formulaMath += '<br>M(x,y,z) = M<sub>0</sub> × e<sup>-C(z_h,T,t_B) × D(x,y,z)</sup>';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = '∂M/∂t = -I(x,y,z)·M·C(z_h,T,t_B)';
            formulaMath += '<br>M(x,y,z) = M<sub>0</sub> × e<sup>-C(z_h,T,t_B) × D(x,y,z)</sup>';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        } else {
            formulaMath = '∂M/∂t = -I(x,z)·M·C(z_h,T,t_B)';
            formulaMath += '<br>M(x,z) = M<sub>0</sub> × e<sup>-C(z_h,T,t_B) × D(x,z)</sup>';
        }
        
        formulaExplanation = `
            <div>• M<sub>0</sub>: 初始PAC浓度 (${params.M0})</div>
            <div>• C(z_h,T,t_B): 光敏速率常数，与胶厚、前烘温度、前烘时间相关</div>
            <div>• D(x,z): 该点曝光剂量</div>
            <div>• z_h: 胶厚 (${params.z_h} μm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? 
                `<div>• Kx: X方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: Y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                ${params.sine_type === '3d' ? `<div>• Kz: Z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>` : ''}
                <div>• φ: 相位表达式 (${params.phi_expr || '0'})</div>` : 
                `<div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>`
            }
        `;
        
                 // 计算当前点的厚度相关参数（根据波形类型）
         let thicknessPhaseValue = 0;
         let exposureDoseAtPoint = 0;
         
         if (params.sine_type === 'multi') {
             thicknessPhaseValue = params.Kx * x + (params.Ky || 0) * 0; // y坐标在这里不可用
             exposureDoseAtPoint = params.I0 * params.t_exp * (1 + params.V * Math.cos(thicknessPhaseValue));
         } else if (params.sine_type === '3d') {
             thicknessPhaseValue = params.Kx * x + (params.Ky || 0) * 0 + (params.Kz || 0) * 0; // y,z坐标在这里不可用
             exposureDoseAtPoint = params.I0 * params.t_exp * (1 + params.V * Math.cos(thicknessPhaseValue));
         } else {
             thicknessPhaseValue = params.K * x;
             exposureDoseAtPoint = params.I0 * params.t_exp * (1 + params.V * Math.cos(thicknessPhaseValue));
         }
         
         additionalInfo = `
             <div class="point-info-section">
                 <h4>📈 ${LANGS[currentLang].popup_section_calculated_values || '计算值详情'}</h4>
                 <div class="info-grid responsive-grid">
                     <div class="info-item"><span class="info-label">该点厚度值:</span><span class="info-value">${y.toFixed(3)} (归一化)</span></div>
                     <div class="info-item"><span class="info-label">初始PAC浓度:</span><span class="info-value">${params.M0}</span></div>
                     <div class="info-item"><span class="info-label">该点曝光剂量:</span><span class="info-value">${exposureDoseAtPoint.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                     <div class="info-item"><span class="info-label">光敏速率:</span><span class="info-value">C(${params.z_h},${params.T},${params.t_B})</span></div>
                     <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${thicknessPhaseValue.toFixed(3)} rad</span></div>
                     <div class="info-item"><span class="info-label">厚度变化:</span><span class="info-value">M = ${params.M0} × e^(-C×${exposureDoseAtPoint.toFixed(3)})</span></div>
                 </div>
             </div>
         `;
        
    } else if (plotType === 'heatmap') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
        formulaTitle = '增强Dill模型二维曝光剂量:';
        formulaMath = 'D(x,y,z) = ∫ I(x,y,z,t) dt';
        formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        
        formulaExplanation = `
            <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
            <div>• V: 干涉条纹可见度 (${params.V})</div>
            <div>• Kx: X方向空间频率 (${params.Kx || params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• Ky: Y方向空间频率 (${params.Ky || 'N/A'} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• φ: 相位表达式 (${params.phi_expr || '0'})</div>
            <div>• z_h: 胶厚 (${params.z_h} μm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            <div>• A,B,C: 与胶厚、前烘温度、前烘时间相关的参数</div>
        `;
        
    } else if (plotType === 'surface3d') {
        valueLabel = '值:';
        valueUnit = '';
        formulaTitle = '增强Dill模型三维分布:';
        formulaMath = '∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]<br>∂M/∂t = -I·M·C(z_h,T,t_B)';
        formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        
        formulaExplanation = `
            <div>• z_h: 胶厚 (${params.z_h} µm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            <div>• I<sub>0</sub>: 初始光强 (${params.I0})</div>
            <div>• M<sub>0</sub>: 初始PAC浓度 (${params.M0})</div>
            <div>• V: 干涉条纹可见度 (${params.V})</div>
            <div>• Kx: X方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• Ky: Y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• Kz: Z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• φ: 相位表达式 (${params.phi_expr || '0'})</div>
            <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
            <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            <div>• C(z_h,T,t_B): 光敏速率常数，与胶厚、前烘温度、前烘时间相关</div>
        `;
        
        if (plotType.includes('thickness')) {
            valueUnit = '(归一化)';
        }
    }
    
    return `
        <div class="point-info-section">
            <h4>🎯 ${LANGS[currentLang].popup_section_location || '位置信息'}</h4>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">X:</span><span class="info-value">${x.toFixed(3)} µm</span></div>
                <div class="info-item"><span class="info-label">${valueLabel}</span><span class="info-value">${y.toFixed(3)} ${valueUnit}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 ${LANGS[currentLang].popup_section_params_enhanced || '参数组: 增强Dill模型'}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">z_h:</span><span class="info-value">${params.z_h} µm</span></div>
                <div class="info-item"><span class="info-label">T:</span><span class="info-value">${params.T} °C</span></div>
                <div class="info-item"><span class="info-label">t_B:</span><span class="info-value">${params.t_B} min</span></div>
                <div class="info-item"><span class="info-label">I<sub>0</sub>:</span><span class="info-value">${params.I0}</span></div>
                <div class="info-item"><span class="info-label">M<sub>0</sub>:</span><span class="info-value">${params.M0}</span></div>
                <div class="info-item"><span class="info-label">t<sub>exp</sub>:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                ${params.sine_type === 'multi' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : params.sine_type === '3d' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">Kz:</span><span class="info-value">${params.Kz}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : `
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K}</span></div>
                `}
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 ${LANGS[currentLang].popup_section_formula || '计算公式 (核心)'}</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
        ${additionalInfo}
    `;
}

// 为CAR模型生成弹窗HTML的辅助函数
function getCarPopupHtmlContent(x, y, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    
    if (plotType === 'exposure') {
        valueLabel = '光酸浓度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型光酸生成计算:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '[H<sup>+</sup>] = η × D(x,y)';
            formulaMath += '<br>D(x,y) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
            formulaExplanation = `
                <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            `;
        } else if (params.sine_type === '3d') {
            formulaMath = '[H<sup>+</sup>] = η × D(x,y,z)';
            formulaMath += '<br>D(x,y,z) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
            formulaExplanation = `
                <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            `;
        } else {
            // 1D模式：增加详细的计算过程
            formulaMath = '[H<sup>+</sup>] = η × D(x)';
            formulaMath += '<br>D(x) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(K·x))';
            formulaExplanation = `
                <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• K: 空间频率 (${params.K} rad/μm)</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            `;
        }
        
        // 为1D模式添加详细的计算值信息
        if (!params.sine_type || params.sine_type === '1d') {
            // 计算当前点的光强和相位
            let phaseValue = params.K * x;
            let currentIntensity = params.I_avg * (1 + params.V * Math.cos(phaseValue));
            let exposureDoseAtPoint = currentIntensity * params.t_exp;
            let acidConcentration = params.acid_gen_efficiency * exposureDoseAtPoint;
            
            additionalInfo = `
                <div class="point-info-section">
                    <h4>📈 计算值详情</h4>
                    <div class="info-grid responsive-grid">
                        <div class="info-item"><span class="info-label">当前光强 I(x):</span><span class="info-value">${currentIntensity.toFixed(3)} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                        <div class="info-item"><span class="info-label">该点曝光剂量:</span><span class="info-value">${exposureDoseAtPoint.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                        <div class="info-item"><span class="info-label">该点光酸浓度:</span><span class="info-value">${y.toFixed(3)} (归一化)</span></div>
                        <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${phaseValue.toFixed(3)} rad</span></div>
                        <div class="info-item"><span class="info-label">光酸生成过程:</span><span class="info-value">[H⁺] = ${params.acid_gen_efficiency} × ${exposureDoseAtPoint.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">CAR模型阶段:</span><span class="info-value">1. 曝光 → 2. 光酸生成</span></div>
                    </div>
                </div>
            `;
        }
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型脱保护度计算:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi' || params.sine_type === '3d') {
            const dimText = params.sine_type === 'multi' ? '(x,y)' : '(x,y,z)';
            formulaMath = `M${dimText} = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>`;
            formulaExplanation = `
                <div>• k: 反应速率常数 (${params.reaction_rate})</div>
                <div>• [H⁺]<sub>diff</sub>: 扩散后光酸浓度</div>
                <div>• A: 放大因子 (${params.amplification})</div>
                <div>• 对比度: γ = ${params.contrast}</div>
                ${params.sine_type === 'multi' ? `
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : `
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>`}
            `;
        } else {
            // 1D模式：增加详细的计算过程
            formulaMath = 'M(x) = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
            formulaMath += '<br>厚度(x) = M(x)<sup>γ</sup>';
            formulaExplanation = `
                <div>• k: 反应速率常数 (${params.reaction_rate})</div>
                <div>• [H⁺]<sub>diff</sub>: 扩散后光酸浓度</div>
                <div>• A: 放大因子 (${params.amplification})</div>
                <div>• γ: 对比度因子 (${params.contrast})</div>
                <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            `;
        }
        
        // 为1D模式添加详细的计算值信息
        if (!params.sine_type || params.sine_type === '1d') {
            // 计算当前点的完整CAR过程
            let phaseValue = params.K * x;
            let currentIntensity = params.I_avg * (1 + params.V * Math.cos(phaseValue));
            let exposureDoseAtPoint = currentIntensity * params.t_exp;
            let initialAcidConcentration = params.acid_gen_efficiency * exposureDoseAtPoint;
            // 简化扩散计算（实际扩散是高斯滤波）
            let diffusedAcidConcentration = initialAcidConcentration; // 简化显示
            let deprotectionDegree = 1 - Math.exp(-params.reaction_rate * diffusedAcidConcentration * params.amplification);
            let finalThickness = Math.pow(deprotectionDegree, params.contrast);
            
            additionalInfo = `
                <div class="point-info-section">
                    <h4>📈 计算值详情</h4>
                    <div class="info-grid responsive-grid">
                        <div class="info-item"><span class="info-label">该点厚度值:</span><span class="info-value">${y.toFixed(3)} (归一化)</span></div>
                        <div class="info-item"><span class="info-label">脱保护度:</span><span class="info-value">${deprotectionDegree.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">初始光酸浓度:</span><span class="info-value">${initialAcidConcentration.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">扩散后光酸浓度:</span><span class="info-value">${diffusedAcidConcentration.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${phaseValue.toFixed(3)} rad</span></div>
                        <div class="info-item"><span class="info-label">化学放大过程:</span><span class="info-value">M = 1-e^(-${params.reaction_rate}×${diffusedAcidConcentration.toFixed(3)}×${params.amplification})</span></div>
                        <div class="info-item"><span class="info-label">厚度计算:</span><span class="info-value">厚度 = ${deprotectionDegree.toFixed(3)}^${params.contrast}</span></div>
                        <div class="info-item"><span class="info-label">CAR模型阶段:</span><span class="info-value">1. 曝光 → 2. 光酸生成 → 3. 扩散 → 4. 脱保护 → 5. 显影</span></div>
                    </div>
                </div>
            `;
        }
    } else if (plotType === 'car_acid_concentration') {
        valueLabel = '光酸浓度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型过程模拟:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '[H⁺] = η·D(x,y)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = '[H⁺] = η·D(x,y,z)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else {
            formulaMath = '[H⁺] = η·D(x)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        }
        
        formulaExplanation = `
            <div>• 扩散长度: ${params.diffusion_length} μm</div>
            <div>• 光酸产生效率: ${params.acid_gen_efficiency}</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? `
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            ${params.sine_type === '3d' ? `<div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>` : ''}
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : ''}
        `;
    } else if (plotType === 'car_deprotection_degree') {
        valueLabel = '脱保护度:';
        valueUnit = '(0-1)';
        formulaTitle = 'CAR模型脱保护度:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = 'M(x,y) = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = 'M(x,y,z) = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else {
            formulaMath = 'M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        }
        
        formulaExplanation = `
            <div>• k: 反应速率 (${params.reaction_rate})</div>
            <div>• A: 放大因子 (${params.amplification})</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? `
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            ${params.sine_type === '3d' ? `<div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>` : ''}
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : ''}
        `;
    } else if (plotType === 'car_thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型厚度计算:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '厚度(x,y) = f(M, γ) = M<sup>γ</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = '厚度(x,y,z) = f(M, γ) = M<sup>γ</sup>';
        } else {
            formulaMath = '厚度 = f(M, γ) = M<sup>γ</sup>';
        }
        
        formulaExplanation = `
            <div>• M: 脱保护度</div>
            <div>• γ: 对比度因子 (${params.contrast})</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? `
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            ${params.sine_type === '3d' ? `<div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>` : ''}
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : ''}
        `;
    } else if (plotType === 'heatmap') {
        valueLabel = '值:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型二维分布:';
        formulaMath = '[H<sup>+</sup>](x,y) = η × I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
        formulaMath += '<br>扩散: [H⁺]<sub>diff</sub>(x,y) = G([H⁺], l<sub>diff</sub>)';
        formulaMath += '<br>M(x,y) = 1-e<sup>-k·[H⁺]<sub>diff</sub>(x,y)·A</sup>';
        
        formulaExplanation = `
            <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
            <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            <div>• Kx: x方向空间频率 (${params.Kx || params.K} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky || 'N/A'} rad/μm)</div>
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
        `;
    } else if (plotType === 'surface3d') {
        valueLabel = '值:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型三维分布:';
        formulaMath = '[H<sup>+</sup>](x,y,z) = η × I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
        formulaMath += '<br>扩散: [H⁺]<sub>diff</sub>(x,y,z) = G([H⁺], l<sub>diff</sub>)';
        formulaMath += '<br>M(x,y,z) = 1-e<sup>-k·[H⁺]<sub>diff</sub>(x,y,z)·A</sup>';
        
        formulaExplanation = `
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            <div>• k: 反应速率 (${params.reaction_rate})</div>
            <div>• A: 放大因子 (${params.amplification})</div>
            <div>• γ: 对比度 (${params.contrast})</div>
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            <div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>
                        <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
        `;
    }
     
    return `
        <div class="point-info-section">
            <h4>🎯 位置信息</h4>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">X:</span><span class="info-value">${x.toFixed(3)} μm</span></div>
                <div class="info-item"><span class="info-label">${valueLabel}</span><span class="info-value">${y.toFixed(3)} ${valueUnit}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 参数组: ${setName}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">I<sub>avg</sub>:</span><span class="info-value">${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span></span></div>
                <div class="info-item"><span class="info-label">t<sub>exp</sub>:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">η:</span><span class="info-value">${params.acid_gen_efficiency}</span></div>
                <div class="info-item"><span class="info-label">l<sub>diff</sub>:</span><span class="info-value">${params.diffusion_length} μm</span></div>
                <div class="info-item"><span class="info-label">k:</span><span class="info-value">${params.reaction_rate}</span></div>
                <div class="info-item"><span class="info-label">A:</span><span class="info-value">${params.amplification}</span></div>
                <div class="info-item"><span class="info-label">γ:</span><span class="info-value">${params.contrast}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 计算公式</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
    `;
}

/**
 * 获取单个点的详细信息
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型 ('exposure', 'thickness', 'heatmap', 'car_acid_concentration', 'car_deprotection_degree')
 * @param {Object} paramsOverride - 可选的参数对象，如果提供，则使用这些参数而不是从DOM读取
 * @returns {Object} 包含详细信息的对象 { html: "..." }
 */
function getSinglePointDetailedInfo(point, plotType, paramsOverride = null) {
    // 安全检查
    if (!point || (typeof point.x === 'undefined') || (typeof point.y === 'undefined')) {
        console.error('无效的点数据', point);
        return {
            html: `<div class="error-message">无效的点数据</div>`,
            title: '数据错误'
        };
    }
    
    // 解析点数据
    const x = point.x;
    const y = point.y;
    let setName = '';  // 参数组名称
    let params = {};   // 参数对象
    
    // 使用override参数或从点数据中提取
    if (paramsOverride) {
        params = paramsOverride;
        setName = paramsOverride.name || '自定义参数';
    } else if (point.data && point.data.name) {
        setName = point.data.name;
        params = { ...point.data };
    } else if (point.fullData && point.fullData.name) {
        setName = point.fullData.name;  // Plotly格式
        
        // 从曲线名称中提取参数（格式如 "Set 1: Dill (C=0.04,V=0.8)"）
        if (setName.includes('Dill') && !setName.includes('Enhanced')) {
            params = extractDillParamsFromName(setName);
            params.model = 'dill';
        } else if (setName.includes('Enhanced Dill')) {
            params = extractEnhancedDillParamsFromName(setName);
            params.model = 'enhanced_dill';
        } else if (setName.includes('CAR')) {
            params = extractCarParamsFromName(setName);
            params.model = 'car';
        }
    } else {
        // 无法从点数据中获得参数组信息，尝试使用当前选择的模型参数
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            const modelType = modelSelect.value;
            if (modelType === 'dill') {
                params = getDillModelParams();
                params.model = 'dill';
                setName = 'Dill模型（当前参数）';
            } else if (modelType === 'enhanced_dill') {
                params = getEnhancedDillModelParams();
                params.model = 'enhanced_dill';
                setName = '增强Dill模型（当前参数）';
            } else if (modelType === 'car') {
                params = getCarModelParams();
                params.model = 'car';
                setName = 'CAR模型（当前参数）';
            }
        }
    }

    // 确定模型类型，生成相应的HTML内容
    let html = '';
    let title = '';
    
    if (params.model === 'dill' || (!params.model && params.C)) {
        html = getDillPopupHtmlContent(x, y, setName, params, plotType);
        title = `单点详情 - Dill模型`;
    } else if (params.model === 'enhanced_dill' || (!params.model && params.z_h)) {
        html = getEnhancedDillPopupHtmlContent(x, y, setName, params, plotType);
        title = `单点详情 - 增强Dill模型`;
    } else if (params.model === 'car' || (!params.model && params.acid_gen_efficiency)) {
        html = getCarPopupHtmlContent(x, y, setName, params, plotType);
        title = `单点详情 - CAR模型`;
    } else {
        html = `<div class="point-info-section">
                    <h4>🎯 位置信息</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">X:</span>
                            <span class="info-value">${x.toFixed(3)} μm</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">值:</span>
                            <span class="info-value">${y.toFixed(3)}</span>
                        </div>
                    </div>
                </div>
                <div class="point-info-section">
                    <h4>⚠️ 参数信息缺失</h4>
                    <p>无法确定此点的详细参数信息。</p>
                </div>`;
        title = `单点详情`;
    }
    
    return { html, title };
}

// ===== 阈值滑块核心逻辑移植自compare.js，适配单组数据 =====
function initSingleThresholdControl(controlElement, index, plotType, plotData) {
    const slider = controlElement.querySelector('.threshold-slider');
    const valueText = controlElement.querySelector('.threshold-value-text');
    const toggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');
    // 只对index=0
    let minValue, maxValue, defaultValue, step, unit;
    let yData, xData;
    
    // 处理可能是2D数据的情况
    if (plotType === 'exposure') {
        if (plotData.is_2d) {
            console.log('跳过2D数据的阈值控制初始化');
            return; // 对于2D数据直接返回，不初始化阈值控制
        }
        yData = plotData.exposure_dose || plotData.initial_acid;
        xData = plotData.x;
        if (!Array.isArray(yData) || yData.length === 0) {
            console.error('无效的曝光剂量数据', yData);
            return; // 数据无效，不初始化阈值控制
        }
        minValue = Math.max(0, Math.min(...yData) - (Math.max(...yData) - Math.min(...yData)) * 0.1);
        maxValue = Math.max(...yData) + (Math.max(...yData) - Math.min(...yData)) * 0.1;
        step = Math.max(0.1, (maxValue - minValue) / 1000);
        unit = ' mJ/cm²';
        defaultValue = minValue + (maxValue - minValue) * 0.3;
    } else {
        if (plotData.is_2d) {
            console.log('跳过2D数据的阈值控制初始化');
            return; // 对于2D数据直接返回，不初始化阈值控制
        }
        yData = plotData.thickness;
        xData = plotData.x;
        if (!Array.isArray(yData) || yData.length === 0) {
            console.error('无效的厚度数据', yData);
            return; // 数据无效，不初始化阈值控制
        }
        minValue = Math.max(0, Math.min(...yData) - (Math.max(...yData) - Math.min(...yData)) * 0.05);
        maxValue = Math.min(1, Math.max(...yData) + (Math.max(...yData) - Math.min(...yData)) * 0.05);
        step = Math.max(0.001, (maxValue - minValue) / 1000);
        unit = '';
        defaultValue = minValue + (maxValue - minValue) * 0.3;
    }
    slider.min = minValue;
    slider.max = maxValue;
    slider.step = step;
    slider.value = defaultValue;
    valueText.textContent = defaultValue.toFixed(plotType === 'exposure' ? 1 : 3) + unit;
    // 清除旧事件
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    const finalSlider = controlElement.querySelector('.threshold-slider');
    const finalToggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');
    const finalValueText = controlElement.querySelector('.threshold-value-text');
    finalSlider.addEventListener('input', () => {
        const value = parseFloat(finalSlider.value);
        finalValueText.textContent = value.toFixed(plotType === 'exposure' ? 1 : 3) + unit;
        updatePlotWithThreshold(plotType, 0, value, finalToggleBtn.classList.contains('active'), plotData);
    });
    finalToggleBtn.addEventListener('click', () => {
        finalToggleBtn.classList.toggle('active');
        const isActive = finalToggleBtn.classList.contains('active');
        finalToggleBtn.textContent = isActive ? '隐藏' : '显示';
        if (isActive) {
            controlElement.classList.add('active-threshold');
        } else {
            controlElement.classList.remove('active-threshold');
        }
        updatePlotWithThreshold(plotType, 0, parseFloat(finalSlider.value), isActive, plotData);
    });
    finalToggleBtn.textContent = '显示';
}

function updatePlotWithThreshold(plotType, thresholdIndex, value, isVisible, plotData) {
    const plotContainerId = plotType === 'exposure' ? 'exposure-plot-container' : 'thickness-plot-container';
    const plotDiv = document.getElementById(plotContainerId);
    let xData, yData, unit;
    if (plotType === 'exposure') {
        xData = plotData.x;
        yData = plotData.exposure_dose;
        unit = 'mJ/cm²';
    } else {
        xData = plotData.x;
        yData = plotData.thickness;
        unit = '';
    }
    let shapes = plotDiv.layout.shapes || [];
    let annotations = plotDiv.layout.annotations || [];
    // 清除本阈值相关的shape和annotation
    shapes = shapes.filter(s => !s.name || !s.name.startsWith(`threshold_line_${plotType}_${thresholdIndex}`));
    annotations = annotations.filter(a => !a.name || !a.name.startsWith(`threshold_${plotType}_${thresholdIndex}`));
    if (isVisible) {
        // 阈值线
        const xMin = Math.min(...xData);
        const xMax = Math.max(...xData);
        const lineColor = plotType === 'exposure' ? 'rgb(31,119,180)' : 'rgb(214,39,40)';
        shapes.push({
            type: 'line',
            name: `threshold_line_${plotType}_${thresholdIndex}`,
            x0: xMin, y0: value, x1: xMax, y1: value,
            line: { color: lineColor, width: 2, dash: 'dashdot' },
            layer: 'below'
        });
        // 交点圆点
        const analysis = analyzeThresholdIntersection(xData, yData, value, plotType);
        if (analysis.intersections.length > 0) {
            analysis.intersections.forEach((intersection, idx) => {
                shapes.push({
                    type: 'circle',
                    name: `threshold_line_${plotType}_${thresholdIndex}_intersection_${idx}`,
                    x0: intersection.x - 0.05,
                    y0: intersection.y - (plotType === 'exposure' ? 2 : 0.02),
                    x1: intersection.x + 0.05,
                    y1: intersection.y + (plotType === 'exposure' ? 2 : 0.02),
                    fillcolor: lineColor,
                    line: { color: lineColor, width: 2 },
                    layer: 'above'
                });
            });
        }
        // 注释
        const analysisText = createThresholdAnalysisText(analysis, value, unit, plotType);
        const titleText = `阈值: ${value.toFixed(2)}${unit} 交点: ${analysis.intersections.length}个 ▼`;
        annotations.push({
            name: `threshold_${plotType}_${thresholdIndex}_title`,
            text: titleText,
            x: 0.02, y: 0.98, xref: 'paper', yref: 'paper', xanchor: 'left', yanchor: 'top', showarrow: false,
            font: { color: lineColor, size: 12, family: 'Arial, sans-serif', weight: 'bold' },
            bgcolor: 'rgba(255,255,255,0.95)', bordercolor: lineColor, borderwidth: 2, borderpad: 6,
            clicktoshow: false, captureevents: true
        });
        annotations.push({
            name: `threshold_${plotType}_${thresholdIndex}_details`,
            text: analysisText,
            x: 0.02, y: 0.94, xref: 'paper', yref: 'paper', xanchor: 'left', yanchor: 'top', showarrow: false,
            font: { color: lineColor, size: 10, family: 'monospace' },
            bgcolor: 'rgba(255,255,255,0.98)', bordercolor: lineColor, borderwidth: 1, borderpad: 10,
            visible: false, clicktoshow: false, width: 320, align: 'left'
        });
    }
    Plotly.relayout(plotDiv, { shapes, annotations });
    // 绑定annotation点击展开/收起详细分析
    if (!plotDiv._thresholdAnnotationClickBound) {
        plotDiv._thresholdAnnotationClickBound = true;
        plotDiv.on('plotly_clickannotation', function(event) {
            const ann = event.annotation;
            if (ann && ann.name && ann.name.endsWith('_title')) {
                const detailsName = ann.name.replace('_title', '_details');
                const currentAnnotations = plotDiv.layout.annotations || [];
                let detailsAnn = currentAnnotations.find(a => a.name === detailsName);
                let titleAnn = currentAnnotations.find(a => a.name === ann.name);
                if (detailsAnn) {
                    const visible = !detailsAnn.visible;
                    detailsAnn.visible = visible;
                    if (titleAnn) {
                        titleAnn.text = titleAnn.text.replace(/[▼▲]/, visible ? '▲' : '▼');
                    }
                    Plotly.relayout(plotDiv, { annotations: currentAnnotations });
                    // compare风格弹窗
                    if (visible) {
                        createThresholdDetailsOverlay(plotDiv, plotType, thresholdIndex, detailsAnn.text);
                    } else {
                        removeThresholdDetailsOverlay(plotDiv, plotType, thresholdIndex);
                    }
                }
            }
        });
    }
}

function analyzeThresholdIntersection(xData, yData, threshold, plotType) {
    const intersections = [];
    for (let i = 0; i < yData.length - 1; i++) {
        const y1 = yData[i], y2 = yData[i + 1], x1 = xData[i], x2 = xData[i + 1];
        if ((y1 <= threshold && y2 >= threshold) || (y1 >= threshold && y2 <= threshold)) {
            const t = (threshold - y1) / (y2 - y1);
            const intersectionX = x1 + t * (x2 - x1);
            intersections.push({ x: intersectionX, y: threshold, index: i });
        }
    }
    let aboveArea = 0, belowArea = 0, aboveLength = 0, belowLength = 0;
    for (let i = 0; i < yData.length - 1; i++) {
        const dx = xData[i + 1] - xData[i];
        const avgY = (yData[i] + yData[i + 1]) / 2;
        if (avgY > threshold) {
            aboveArea += (avgY - threshold) * dx;
            aboveLength += dx;
        } else {
            belowArea += (threshold - avgY) * dx;
            belowLength += dx;
        }
    }
    const maxValue = Math.max(...yData);
    const minValue = Math.min(...yData);
    const abovePercentage = (aboveLength / (xData[xData.length - 1] - xData[0])) * 100;
    const belowPercentage = 100 - abovePercentage;
    return { intersections, aboveArea, belowArea, aboveLength, belowLength, abovePercentage, belowPercentage, maxValue, minValue, thresholdRatio: threshold / maxValue };
}

function createThresholdAnalysisText(analysis, threshold, unit, plotType) {
    const lines = [];
    lines.push(`阈值: ${threshold.toFixed(2)}${unit}`);
    if (analysis.intersections.length > 0) {
        lines.push(`交点: ${analysis.intersections.length}个`);
        for (let i = 0; i < analysis.intersections.length; i += 3) {
            const group = analysis.intersections.slice(i, i + 3);
            const groupText = group.map((intersection, idx) => `#${i + idx + 1}: x=${intersection.x.toFixed(2)}μm`).join('  ');
            lines.push(`  ${groupText}`);
        }
        if (plotType === 'exposure') {
            if (analysis.intersections.length >= 2) {
                const firstPair = analysis.intersections.slice(0, 2);
                const lineWidth = Math.abs(firstPair[1].x - firstPair[0].x);
                lines.push(`工艺分析:`);
                lines.push(`  有效线宽: ${lineWidth.toFixed(2)}μm`);
                lines.push(`  工艺窗口: ${analysis.abovePercentage.toFixed(1)}%`);
            }
        } else {
            lines.push(`工艺分析:`);
            lines.push(`  厚度达标区域: ${analysis.abovePercentage.toFixed(1)}%`);
            if (analysis.abovePercentage < 80) {
                lines.push(`  ⚠️ 覆盖率偏低，建议优化参数`);
            }
        }
    } else {
        lines.push('交点: 无');
        if (plotType === 'exposure') {
            lines.push('⚠️ 无有效曝光区域');
        } else {
            lines.push('⚠️ 厚度均不达标');
        }
    }
    if (plotType === 'exposure') {
        lines.push(`超阈值区域: ${analysis.abovePercentage.toFixed(1)}%`);
        lines.push(`积分差值: ${analysis.aboveArea.toFixed(1)}${unit}·μm`);
    } else {
        lines.push(`超阈值区域: ${analysis.abovePercentage.toFixed(1)}%`);
        lines.push(`平均超出: ${(analysis.aboveArea / Math.max(analysis.aboveLength, 0.001)).toFixed(3)}`);
    }
    const maxRatio = (threshold / analysis.maxValue * 100).toFixed(1);
    lines.push(`阈值/峰值: ${maxRatio}%`);
    if (plotType === 'exposure') {
        if (maxRatio < 50) {
            lines.push(`💡 建议: 阈值偏低，可提高对比度`);
        } else if (maxRatio > 90) {
            lines.push(`💡 建议: 阈值偏高，可能欠曝光`);
        }
    } else {
        if (analysis.abovePercentage > 90) {
            lines.push(`✅ 厚度分布良好`);
        } else if (analysis.abovePercentage > 70) {
            lines.push(`⚠️ 厚度分布一般，可优化`);
        } else {
            lines.push(`❌ 厚度分布不佳，需要调整`);
        }
    }
    return lines.join('\n');
}

// === 阈值详细分析弹窗逻辑（compare移植） ===
function createThresholdDetailsOverlay(container, plotType, thresholdIndex, content) {
    const overlayId = `threshold-overlay-${plotType}-${thresholdIndex}`;
    removeThresholdDetailsOverlay(container, plotType, thresholdIndex);
    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'threshold-details-overlay';
    const textContent = content.replace(/<[^>]*>/g, '');
    overlay.innerHTML = `
        <div class="threshold-details-content">
            <div class="threshold-details-header">
                <span>详细分析</span>
                <button class="threshold-details-close" onclick="removeThresholdDetailsOverlay(document.getElementById('${container.id}'), '${plotType}', '${thresholdIndex}')">×</button>
            </div>
            <div class="threshold-details-body">
                <pre>${textContent}</pre>
            </div>
        </div>
    `;
    overlay.style.cssText = `
        position: absolute;
        left: 20px;
        top: ${50 + thresholdIndex * 120}px;
        width: 350px;
        max-height: 200px;
        background: rgba(255, 255, 255, 0.98);
        border: 2px solid #3498db;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-family: monospace;
        font-size: 11px;
        line-height: 1.4;
    `;
    container.style.position = 'relative';
    container.appendChild(overlay);
}
function removeThresholdDetailsOverlay(container, plotType, thresholdIndex) {
    const overlayId = `threshold-overlay-${plotType}-${thresholdIndex}`;
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) existingOverlay.remove();
    // 同步箭头
    const titleName = `threshold_${plotType}_${thresholdIndex}_title`;
    const currentAnnotations = container.layout.annotations || [];
    const updatedAnnotations = currentAnnotations.map(a => {
        if (a.name === titleName) {
            const newText = a.text.replace(/[▼▲]/, '▼');
            return { ...a, text: newText };
        }
        return a;
    });
    Plotly.relayout(container, { annotations: updatedAnnotations });
}
window.removeThresholdDetailsOverlay = removeThresholdDetailsOverlay;

// 初始化波形类型选择器
function initSineWaveTypeSelectors() {
    // Dill模型波形类型选择
    const dillSineType = document.getElementById('dill-sine-type');
    const dillMultiSineParams = document.getElementById('dill-multisine-params');
    const dill3dSineParams = document.getElementById('dill-3dsine-params');
    // 添加4D动画参数容器的引用
    const dill4DAnimationGroup = document.querySelector('[data-title="4D动画参数"]');
    // 添加1D动画参数容器的引用
    const dill1DAnimationGroup = document.getElementById('dill-1d-animation-params-container');
    
    if (dillSineType && dillMultiSineParams && dill3dSineParams) {
        dillSineType.addEventListener('change', function() {
            // 隐藏所有参数容器
            dillMultiSineParams.style.display = 'none';
            dill3dSineParams.style.display = 'none';
            
            // 根据选择显示对应参数容器
            if (this.value === 'multi') {
                dillMultiSineParams.style.display = 'block';
            } else if (this.value === '3d') {
                dill3dSineParams.style.display = 'block';
            }
            
            // 新增：控制4D动画参数的显示/隐藏
            if (dill4DAnimationGroup) {
                const dillParamsContainer = document.getElementById('dill-params');
                if (this.value === '3d') {
                    dill4DAnimationGroup.style.display = 'block';
                    // 添加show-4d类名以显示4D动画参数
                    if (dillParamsContainer) {
                        dillParamsContainer.classList.add('show-4d');
                    }
                } else {
                    dill4DAnimationGroup.style.display = 'none';
                    // 移除show-4d类名以隐藏4D动画参数
                    if (dillParamsContainer) {
                        dillParamsContainer.classList.remove('show-4d');
                    }
                    // 如果切换到非3D模式，取消勾选4D动画并隐藏动画区域
                    const enable4dCheckbox = document.getElementById('enable_4d_animation_dill');
                    if (enable4dCheckbox) {
                        enable4dCheckbox.checked = false;
                        const dill4dParams = document.getElementById('dill_4d_time_params');
                        if (dill4dParams) dill4dParams.style.display = 'none';
                        
                        // 隐藏4D动画区域
                        const animationSection = document.getElementById('dill-4d-animation-section');
                        if (animationSection) {
                            animationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的动画
                        if (typeof dill4DAnimationState !== 'undefined' && dill4DAnimationState.intervalId) {
                            clearInterval(dill4DAnimationState.intervalId);
                            dill4DAnimationState.intervalId = null;
                            dill4DAnimationState.isPlaying = false;
                        }
                    }
                }
            }
            
            // 新增：控制1D动画参数的显示/隐藏
            if (dill1DAnimationGroup) {
                if (this.value === 'single') {
                    // 只有在single模式（薄胶1D）下才显示1D动画参数
                    dill1DAnimationGroup.style.display = 'block';
                    console.log('✅ DILL 1D模式：1D动画参数组已显示');
                } else {
                    // 切换到其他模式时隐藏1D动画参数
                    dill1DAnimationGroup.style.display = 'none';
                    
                    // 如果切换到非1D模式，取消勾选1D动画并隐藏动画区域
                    const enable1dCheckbox = document.getElementById('enable_1d_animation_dill');
                    if (enable1dCheckbox) {
                        enable1dCheckbox.checked = false;
                        const dill1dParams = document.getElementById('dill_1d_time_params');
                        if (dill1dParams) dill1dParams.style.display = 'none';
                        
                        // 隐藏1D动画区域
                        const animationSection = document.getElementById('dill-1d-animation-section');
                        if (animationSection) {
                            animationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的动画
                        if (typeof dill1DAnimationState !== 'undefined' && dill1DAnimationState.intervalId) {
                            clearInterval(dill1DAnimationState.intervalId);
                            dill1DAnimationState.intervalId = null;
                            dill1DAnimationState.isPlaying = false;
                        }
                    }
                    console.log('DILL 非1D模式：1D动画参数组已隐藏');
                }
            }
            
            // 新增：控制1D V评估参数的显示/隐藏
            const dill1DVEvaluationGroup = document.getElementById('dill-1d-v-evaluation-params-container');
            if (dill1DVEvaluationGroup) {
                if (this.value === 'single') {
                    // 只有在single模式（薄胶1D）下才显示1D V评估参数
                    dill1DVEvaluationGroup.style.display = 'block';
                    console.log('✅ DILL 1D模式：V评估参数组已显示');
                } else {
                    // 切换到其他模式时隐藏1D V评估参数
                    dill1DVEvaluationGroup.style.display = 'none';
                    
                    // 如果切换到非1D模式，取消勾选V评估并隐藏评估区域
                    const enable1dVEvaluationCheckbox = document.getElementById('enable_1d_v_evaluation_dill');
                    if (enable1dVEvaluationCheckbox) {
                        enable1dVEvaluationCheckbox.checked = false;
                        const dillVParams = document.getElementById('dill_1d_v_params');
                        if (dillVParams) dillVParams.style.display = 'none';
                        
                        // 隐藏1D V评估区域
                        const vEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
                        if (vEvaluationSection) {
                            vEvaluationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的V评估动画
                        if (typeof dill1DVEvaluationState !== 'undefined' && dill1DVEvaluationState.intervalId) {
                            clearInterval(dill1DVEvaluationState.intervalId);
                            dill1DVEvaluationState.intervalId = null;
                            dill1DVEvaluationState.isPlaying = false;
                        }
                    }
                    console.log('DILL 非1D模式：V评估参数组已隐藏');
                }
            }
        });
    }
}

// 坐标轴控制功能实现
/**
 * 初始化坐标轴控制功能
 */
function initAxisControlFeature() {
    console.log('🎯 初始化坐标轴控制功能');
    
    // 绑定展开/收起按钮事件
    bindAxisToggleEvents();
    
    // 绑定坐标轴控制按钮事件
    bindAxisControlEvents();
    
    console.log('✅ 坐标轴控制功能初始化完成');
}

/**
 * 绑定坐标轴面板展开/收起事件
 */
function bindAxisToggleEvents() {
    // 曝光剂量图表
    const exposureToggle = document.getElementById('exposure-axis-toggle');
    const exposureContent = document.getElementById('exposure-axis-control-content');
    
    if (exposureToggle && exposureContent) {
        exposureToggle.addEventListener('click', function() {
            toggleAxisControlPanel('exposure', exposureToggle, exposureContent);
        });
    }
    
    // 光刻胶厚度图表
    const thicknessToggle = document.getElementById('thickness-axis-toggle');
    const thicknessContent = document.getElementById('thickness-axis-control-content');
    
    if (thicknessToggle && thicknessContent) {
        thicknessToggle.addEventListener('click', function() {
            toggleAxisControlPanel('thickness', thicknessToggle, thicknessContent);
        });
    }
}

/**
 * 切换坐标轴控制面板的显示状态
 */
function toggleAxisControlPanel(plotType, toggleBtn, contentElement) {
    const isExpanded = contentElement.style.display !== 'none';
    
    if (isExpanded) {
        // 收起面板
        contentElement.style.display = 'none';
        toggleBtn.classList.remove('expanded');
        toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
        // 展开面板
        contentElement.style.display = 'block';
        toggleBtn.classList.add('expanded');
        toggleBtn.setAttribute('aria-expanded', 'true');
    }
}

/**
 * 绑定坐标轴控制按钮事件
 */
function bindAxisControlEvents() {
    // 曝光剂量图表控制
    bindPlotAxisControls('exposure');
    
    // 光刻胶厚度图表控制
    bindPlotAxisControls('thickness');
}

/**
 * 为指定图表绑定坐标轴控制事件
 */
function bindPlotAxisControls(plotType) {
    // 保存参考范围按钮
    const saveBtn = document.getElementById(`${plotType}-save-reference`);
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveAxisReference(plotType);
        });
    }
    
    // 恢复参考范围按钮
    const restoreBtn = document.getElementById(`${plotType}-restore-reference`);
    if (restoreBtn) {
        restoreBtn.addEventListener('click', function() {
            restoreAxisReference(plotType);
        });
    }
    
    // 自动缩放按钮
    const autoBtn = document.getElementById(`${plotType}-auto-scale`);
    if (autoBtn) {
        autoBtn.addEventListener('click', function() {
            autoScaleAxis(plotType);
        });
    }
}

/**
 * 保存当前坐标轴范围作为参考
 */
function saveAxisReference(plotType) {
    try {
        const container = document.getElementById(`${plotType}-plot-container`);
        if (!container || !container._fullLayout) {
            showAxisNotification('图表未找到或未加载完成', 'error');
            return;
        }
        
        const layout = container._fullLayout;
        const xRange = layout.xaxis.range;
        const yRange = layout.yaxis.range;
        
        if (!xRange || !yRange) {
            showAxisNotification('无法获取当前坐标轴范围', 'error');
            return;
        }
        
        // 保存参考范围
        axisReferenceRanges[plotType] = {
            xaxis: [xRange[0], xRange[1]],
            yaxis: [yRange[0], yRange[1]]
        };
        
        // 更新显示信息
        const referenceInfo = document.getElementById(`${plotType}-reference-info`);
        if (referenceInfo) {
            const xRangeStr = `X: [${xRange[0].toFixed(2)}, ${xRange[1].toFixed(2)}]`;
            const yRangeStr = `Y: [${yRange[0].toFixed(3)}, ${yRange[1].toFixed(3)}]`;
            referenceInfo.textContent = `${xRangeStr}, ${yRangeStr}`;
            referenceInfo.classList.add('has-reference');
        }
        
        // 启用恢复按钮
        const restoreBtn = document.getElementById(`${plotType}-restore-reference`);
        if (restoreBtn) {
            restoreBtn.disabled = false;
        }
        
        // 保存到localStorage
        localStorage.setItem(`axisReference_${plotType}`, JSON.stringify(axisReferenceRanges[plotType]));
        
        showAxisNotification(`📏 ${plotType === 'exposure' ? '曝光剂量' : '光刻胶厚度'}图表参考范围已保存`, 'success');
        
        console.log(`✅ ${plotType}图表参考范围已保存:`, axisReferenceRanges[plotType]);
        
    } catch (error) {
        console.error(`保存${plotType}图表参考范围失败:`, error);
        showAxisNotification('保存参考范围失败', 'error');
    }
}

/**
 * 恢复到保存的参考范围
 */
function restoreAxisReference(plotType) {
    try {
        const container = document.getElementById(`${plotType}-plot-container`);
        if (!container) {
            showAxisNotification('图表未找到', 'error');
            return;
        }
        
        let referenceRange = axisReferenceRanges[plotType];
        
        // 如果内存中没有，尝试从localStorage加载
        if (!referenceRange) {
            const saved = localStorage.getItem(`axisReference_${plotType}`);
            if (saved) {
                referenceRange = JSON.parse(saved);
                axisReferenceRanges[plotType] = referenceRange;
            }
        }
        
        if (!referenceRange) {
            showAxisNotification('未找到保存的参考范围', 'error');
            return;
        }
        
        // 应用参考范围
        Plotly.relayout(container, {
            'xaxis.range': referenceRange.xaxis,
            'yaxis.range': referenceRange.yaxis
        }).then(() => {
            showAxisNotification(`📏 已恢复${plotType === 'exposure' ? '曝光剂量' : '光刻胶厚度'}图表参考范围`, 'success');
            console.log(`✅ ${plotType}图表已恢复到参考范围:`, referenceRange);
        }).catch(error => {
            console.error(`恢复${plotType}图表参考范围失败:`, error);
            showAxisNotification('恢复参考范围失败', 'error');
        });
        
    } catch (error) {
        console.error(`恢复${plotType}图表参考范围失败:`, error);
        showAxisNotification('恢复参考范围失败', 'error');
    }
}

/**
 * 自动缩放坐标轴
 */
function autoScaleAxis(plotType) {
    try {
        const container = document.getElementById(`${plotType}-plot-container`);
        if (!container) {
            showAxisNotification('图表未找到', 'error');
            return;
        }
        
        // 重置坐标轴为自动缩放
        Plotly.relayout(container, {
            'xaxis.autorange': true,
            'yaxis.autorange': true
        }).then(() => {
            showAxisNotification(`🔄 ${plotType === 'exposure' ? '曝光剂量' : '光刻胶厚度'}图表已自动缩放`, 'success');
            console.log(`✅ ${plotType}图表已自动缩放`);
        }).catch(error => {
            console.error(`${plotType}图表自动缩放失败:`, error);
            showAxisNotification('自动缩放失败', 'error');
        });
        
    } catch (error) {
        console.error(`${plotType}图表自动缩放失败:`, error);
        showAxisNotification('自动缩放失败', 'error');
    }
}

/**
 * 显示坐标轴控制通知
 */
function showAxisNotification(message, type = 'success') {
    // 移除现有通知
    const existingNotification = document.querySelector('.axis-control-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = 'axis-control-notification';
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * 初始化时加载保存的参考范围
 */
function loadSavedAxisReferences() {
    ['exposure', 'thickness'].forEach(plotType => {
        const saved = localStorage.getItem(`axisReference_${plotType}`);
        if (saved) {
            try {
                const referenceRange = JSON.parse(saved);
                axisReferenceRanges[plotType] = referenceRange;
                
                // 更新显示信息
                const referenceInfo = document.getElementById(`${plotType}-reference-info`);
                if (referenceInfo) {
                    const xRangeStr = `X: [${referenceRange.xaxis[0].toFixed(2)}, ${referenceRange.xaxis[1].toFixed(2)}]`;
                    const yRangeStr = `Y: [${referenceRange.yaxis[0].toFixed(3)}, ${referenceRange.yaxis[1].toFixed(3)}]`;
                    referenceInfo.textContent = `${xRangeStr}, ${yRangeStr}`;
                    referenceInfo.classList.add('has-reference');
                }
                
                // 启用恢复按钮
                const restoreBtn = document.getElementById(`${plotType}-restore-reference`);
                if (restoreBtn) {
                    restoreBtn.disabled = false;
                }
                
                console.log(`📂 已加载${plotType}图表保存的参考范围:`, referenceRange);
            } catch (error) {
                console.error(`加载${plotType}图表保存的参考范围失败:`, error);
            }
        }
    });
}

// 在DOM加载完成后初始化坐标轴控制功能
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保其他组件已加载
    setTimeout(() => {
        initAxisControlFeature();
        loadSavedAxisReferences();
    }, 1000);
});
    
    // Enhanced Dill模型波形类型选择
function continueInitSineWaveTypeSelectors() {
    const enhancedDillSineType = document.getElementById('enhanced-dill-sine-type');
    const enhancedDillMultiSineParams = document.getElementById('enhanced-dill-multisine-params');
    const enhancedDill3dSineParams = document.getElementById('enhanced-dill-3dsine-params');
    
    if (enhancedDillSineType && enhancedDillMultiSineParams && enhancedDill3dSineParams) {
        enhancedDillSineType.addEventListener('change', function() {
            // 隐藏所有参数容器
            enhancedDillMultiSineParams.style.display = 'none';
            enhancedDill3dSineParams.style.display = 'none';
            
            // 根据选择显示对应参数容器
            if (this.value === 'multi') {
                enhancedDillMultiSineParams.style.display = 'block';
            } else if (this.value === '3d') {
                enhancedDill3dSineParams.style.display = 'block';
            }
            
            // 新增：控制Enhanced Dill 4D动画参数的显示/隐藏
            const enhancedDill4DAnimationGroup = document.querySelector('#enhanced-dill-params [data-title="4D动画参数"]');
            if (enhancedDill4DAnimationGroup) {
                const enhancedDillParamsContainer = document.getElementById('enhanced-dill-params');
                if (this.value === '3d') {
                    enhancedDill4DAnimationGroup.style.display = 'block';
                    // 添加show-4d类名以显示4D动画参数
                    if (enhancedDillParamsContainer) {
                        enhancedDillParamsContainer.classList.add('show-4d');
                    }
                    console.log('✅ Enhanced Dill 3D模式：4D动画参数组已显示');
                } else {
                    enhancedDill4DAnimationGroup.style.display = 'none';
                    // 移除show-4d类名以隐藏4D动画参数
                    if (enhancedDillParamsContainer) {
                        enhancedDillParamsContainer.classList.remove('show-4d');
                    }
                    // 如果切换到非3D模式，取消勾选4D动画并隐藏动画区域
                    const enable4dCheckbox = document.getElementById('enable_4d_animation_enhanced_dill');
                    if (enable4dCheckbox) {
                        enable4dCheckbox.checked = false;
                        const enhancedDill4dParams = document.getElementById('enhanced_dill_4d_time_params');
                        if (enhancedDill4dParams) enhancedDill4dParams.style.display = 'none';
                        
                        // 隐藏4D动画区域
                        const animationSection = document.getElementById('enhanced-dill-4d-animation-section');
                        if (animationSection) {
                            animationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的动画
                        if (typeof enhancedDill4DAnimationState !== 'undefined' && enhancedDill4DAnimationState.intervalId) {
                            clearInterval(enhancedDill4DAnimationState.intervalId);
                            enhancedDill4DAnimationState.intervalId = null;
                            enhancedDill4DAnimationState.isPlaying = false;
                        }
                    }
                    console.log('Enhanced Dill 非3D模式：4D动画参数组已隐藏');
                }
            } else {
                console.error('❌ 找不到Enhanced Dill 4D动画参数组元素');
            }
        });
    }
    
    // CAR模型波形类型选择
    const carSineType = document.getElementById('car-sine-type');
    const carMultiSineParams = document.getElementById('car-multisine-params');
    const car3dSineParams = document.getElementById('car-3dsine-params');
    
    if (carSineType && carMultiSineParams && car3dSineParams) {
        carSineType.addEventListener('change', function() {
            // 隐藏所有参数容器
            carMultiSineParams.style.display = 'none';
            car3dSineParams.style.display = 'none';
            
            // 根据选择显示对应参数容器
            if (this.value === 'multi') {
                carMultiSineParams.style.display = 'block';
            } else if (this.value === '3d') {
                car3dSineParams.style.display = 'block';
            }
        });
    }
    
    // 初始化各模型波形类型（触发change事件以设置初始状态）
    if (dillSineType) {
        // 先检查初始值，如果是3D则添加show-4d类名
        const dillParamsContainer = document.getElementById('dill-params');
        if (dillSineType.value === '3d' && dillParamsContainer) {
            dillParamsContainer.classList.add('show-4d');
        }
        dillSineType.dispatchEvent(new Event('change'));
    }
    if (enhancedDillSineType) {
        // 先检查初始值，如果是3D则添加show-4d类名
        const enhancedDillParamsContainer = document.getElementById('enhanced-dill-params');
        if (enhancedDillSineType.value === '3d' && enhancedDillParamsContainer) {
            enhancedDillParamsContainer.classList.add('show-4d');
        }
        enhancedDillSineType.dispatchEvent(new Event('change'));
    }
    if (carSineType) carSineType.dispatchEvent(new Event('change'));
}

// 处理相位表达式下拉菜单
function initPhaseExpressionDropdowns() {
    // 获取所有相位表达式下拉框和输入框
    const phiSelects = [
        { select: document.getElementById('phi_expr_select'), input: document.getElementById('phi_expr'), previewPlotElement: document.getElementById('phi-expr-preview-plot'), drawFunc: dillDrawPreviewPlot, is3D: false },
        { select: document.getElementById('phi_expr_3d_select'), input: document.getElementById('phi_expr_3d'), previewPlotElement: document.getElementById('phi-expr-3d-preview-plot'), drawFunc: dillDraw3DPreviewPlot, is3D: true },
        { select: document.getElementById('enhanced_phi_expr_select'), input: document.getElementById('enhanced_phi_expr'), previewPlotElement: document.getElementById('enhanced-phi-expr-preview-plot'), drawFunc: enhancedDrawPreviewPlot, is3D: false },
        { select: document.getElementById('enhanced_phi_expr_3d_select'), input: document.getElementById('enhanced_phi_expr_3d'), previewPlotElement: document.getElementById('enhanced-phi-expr-3d-preview-plot'), drawFunc: enhancedDraw3DPreviewPlot, is3D: true },
        { select: document.getElementById('car_phi_expr_select'), input: document.getElementById('car_phi_expr'), previewPlotElement: document.getElementById('car-phi-expr-preview-plot'), drawFunc: carDrawPreviewPlot, is3D: false },
        { select: document.getElementById('car_phi_expr_3d_select'), input: document.getElementById('car_phi_expr_3d'), previewPlotElement: document.getElementById('car-phi-expr-3d-preview-plot'), drawFunc: carDraw3DPreviewPlot, is3D: true }
    ];
    
    // 为每个下拉框添加事件监听
    phiSelects.forEach(item => {
        if (!item.select || !item.input) return;
        
        // 初始化时设置下拉框选中项
        setSelectedOptionBasedOnValue(item.select, item.input.value);
        
        // 添加change事件监听
        item.select.addEventListener('change', function() {
            const selectedValue = this.value;
            
            if (selectedValue !== 'custom') {
                item.input.value = selectedValue;
                // 触发input事件以便执行校验和UI更新
                item.input.dispatchEvent(new Event('input', { bubbles: true }));

                // 检查当前预览是否正在显示，如果是，则自动更新预览
                if (item.previewPlotElement && item.previewPlotElement.style.display !== 'none') {
                    if (validatePhaseExpr(item.input.value)) {
                        if (typeof item.drawFunc === 'function') {
                            // 获取当前的t值（如果有滑块的话）
                            let currentT = 0;
                            const tSlider = document.querySelector(`#${item.select.id.replace('_select', '_t_slider').replace('_3d', '-3d').replace('phi_expr', 'phi-expr')}`);
                            if (tSlider) {
                                currentT = parseFloat(tSlider.value) || 0;
                            }
                            item.drawFunc(false, currentT); // 不滚动到图表，使用当前t值
                        } else {
                            console.error("Draw function is not defined for:", item.select.id);
                        }
                    }
                }
            } else {
                item.input.focus();
            }
        });
        
        // 当输入框值变化时，更新下拉框选中项并进行验证
        item.input.addEventListener('input', function() {
            setSelectedOptionBasedOnValue(item.select, this.value);
            validateAndUpdateUI(this); // validateAndUpdateUI handles error display and input styling
        });
        
        // 添加失焦事件进行验证 (主要是为了样式，input事件已经处理了大部分逻辑)
        item.input.addEventListener('blur', function() {
            validateAndUpdateUI(this);
        });
        
        // 初始验证
        validateAndUpdateUI(item.input);
    });
    
    // 验证表达式并更新UI (input border and error message)
    function validateAndUpdateUI(inputElem) {
        const errorContainer = inputElem.closest('.parameter-item').querySelector('.phi-expr-error');
        const isValid = validatePhaseExpr(inputElem.value);
        const previewButton = inputElem.closest('.parameter-item').querySelector('.preview-button');

        if (isValid) {
            inputElem.classList.remove('invalid-expr');
            inputElem.classList.add('valid-expr');
            if (errorContainer) {
                errorContainer.textContent = ''; // Clear error message
                errorContainer.style.display = 'none';
            }
            if (previewButton) previewButton.disabled = false;
        } else {
            inputElem.classList.remove('valid-expr');
            inputElem.classList.add('invalid-expr');
            if (errorContainer) {
                errorContainer.textContent = LANGS[currentLang]?.phi_expr_invalid_format || '表达式格式无效，请检查语法。';
                errorContainer.style.display = 'block';
            }
            if (previewButton) previewButton.disabled = true;
        }
        // Also disable main calculate button if any phi expression is invalid
        const allPhiInputs = Array.from(document.querySelectorAll('.phi-expr-input'));
        const anyInvalid = allPhiInputs.some(phiInput => !validatePhaseExpr(phiInput.value) && phiInput.closest('.parameters-grid').style.display !== 'none');
        document.getElementById('calculate-btn').disabled = anyInvalid;

        return isValid;
    }
}

// 增强的相位表达式验证函数
function validatePhaseExpr(expr) {
    if (!expr || expr.trim() === '') return false;
    
    try {
        // 定义允许的数学函数和常量
        const allowedFunctions = ['sin', 'cos', 'tan', 'exp', 'abs', 'sqrt', 'log', 'pow'];
        const allowedConstants = ['PI', 'E'];
        const allowedVariables = ['t'];
        
        // 替换所有允许的函数、常量和变量为占位符
        let testExpr = expr;
        allowedFunctions.forEach(func => {
            testExpr = testExpr.replace(new RegExp(func + '\\s*\\(', 'g'), 'Math.sin(');
        });
        allowedConstants.forEach(constant => {
            testExpr = testExpr.replace(new RegExp('\\b' + constant + '\\b', 'g'), '3.14159');
        });
        allowedVariables.forEach(variable => {
            testExpr = testExpr.replace(new RegExp('\\b' + variable + '\\b', 'g'), '0.5');
        });
        
        // 尝试计算表达式
        const t = 0.5; // 模拟变量t
        const PI = Math.PI; // 定义常量
        const E = Math.E;
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const exp = Math.exp;
        const abs = Math.abs;
        const sqrt = Math.sqrt;
        const log = Math.log;
        const pow = Math.pow;
        
        // 使用Function构造器创建函数并计算结果
        const result = new Function('t', 'PI', 'E', 'sin', 'cos', 'tan', 'exp', 'abs', 'sqrt', 'log', 'pow', 'return ' + expr)(t, PI, E, sin, cos, tan, exp, abs, sqrt, log, pow);
        
        return typeof result === 'number' && !isNaN(result);
    } catch (e) {
        return false;
    }
}

// 根据值设置下拉菜单的选择项
function setSelectedOptionBasedOnValue(selectElem, value) {
    let optionFound = false;
    
    // 先检查是否与预设选项匹配
    for (let i = 0; i < selectElem.options.length; i++) {
        if (selectElem.options[i].value === value && selectElem.options[i].value !== 'custom') {
            selectElem.selectedIndex = i;
            optionFound = true;
            break;
        }
    }
    
    // 如果没有找到匹配项，设置为"自定义输入"
    if (!optionFound) {
        for (let i = 0; i < selectElem.options.length; i++) {
            if (selectElem.options[i].value === 'custom') {
                selectElem.selectedIndex = i;
                break;
            }
        }
    }
}

// 增强Dill模型2D预览绘图函数
// 工具函数：生成二维正弦分布
function generate2DSine(Kx, Ky, V, phi_expr, xRange, yRange, yPoints = 100, t = 0) {
    const xPoints = 100;
    const x = Array.from({length: xPoints}, (_, i) => xRange[0] + (xRange[1]-xRange[0])*i/(xPoints-1));
    const y = Array.from({length: yPoints}, (_, i) => yRange[0] + (yRange[1]-yRange[0])*i/(yPoints-1));
    const z = [];
    let phiFunc;
    try {
        // 支持PI和E常量
        const expr = phi_expr.replace(/\bPI\b/g, 'Math.PI').replace(/\bE\b/g, 'Math.E').replace(/\b(sin|cos|tan|exp|abs|sqrt)\b/g, 'Math.$1');
        phiFunc = new Function('t', 'return ' + expr);
    } catch {
        phiFunc = () => 0;
    }
    for (let j = 0; j < yPoints; j++) {
        const row = [];
        for (let i = 0; i < xPoints; i++) {
            const phi = phiFunc(t);
            row.push(1 + V * Math.cos(Kx * x[i] + Ky * y[j] + phi));
        }
        z.push(row);
    }
    return {x, y, z};
}

// 工具函数：生成三维正弦分布
function generate3DSine(Kx, Ky, Kz, V, phi_expr, xRange, yRange, zRange, xPoints = 20, yPoints = 20, t = 0) {
    const zPoints = 20;
    const x = Array.from({length: xPoints}, (_, i) => xRange[0] + (xRange[1]-xRange[0])*i/(xPoints-1));
    const y = Array.from({length: yPoints}, (_, i) => yRange[0] + (yRange[1]-yRange[0])*i/(yPoints-1));
    const z = Array.from({length: zPoints}, (_, i) => zRange[0] + (zRange[1]-zRange[0])*i/(zPoints-1));
    const values = [];
    let phiFunc;
    try {
        // 支持PI和E常量
        const expr = phi_expr.replace(/\bPI\b/g, 'Math.PI').replace(/\bE\b/g, 'Math.E').replace(/\b(sin|cos|tan|exp|abs|sqrt)\b/g, 'Math.$1');
        phiFunc = new Function('t', 'return ' + expr);
    } catch {
        phiFunc = () => 0;
    }
    
    // 为isosurface创建展平的数组
    for (let k = 0; k < zPoints; k++) {
        for (let j = 0; j < yPoints; j++) {
            for (let i = 0; i < xPoints; i++) {
                const phi = phiFunc(t);
                const value = 1 + V * Math.cos(Kx * x[i] + Ky * y[j] + Kz * z[k] + phi);
                values.push(value);
            }
        }
    }
    
    // 为isosurface创建坐标网格
    const xGrid = [], yGrid = [], zGrid = [];
    for (let k = 0; k < zPoints; k++) {
        for (let j = 0; j < yPoints; j++) {
            for (let i = 0; i < xPoints; i++) {
                xGrid.push(x[i]);
                yGrid.push(y[j]);
                zGrid.push(z[k]);
            }
        }
    }
    
    return {x: xGrid, y: yGrid, z: zGrid, values};
}

// Dill模型2D预览绘图函数
function dillDrawPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('phi_expr');
    const kxInput = document.getElementById('Kx');
    const kyInput = document.getElementById('Ky');
    const vInput = document.getElementById('V'); // 使用V作为Dill模型的对比度参数
    const plot = document.getElementById('phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 0.8;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value);
    
    // 获取Y范围参数
    const yMinInput = document.getElementById('y_min');
    const yMaxInput = document.getElementById('y_max');
    const yPointsInput = document.getElementById('y_points');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    let yPoints = 100;
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    }
    if (yPointsInput) {
        yPoints = parseInt(yPointsInput.value) || 100;
    }

    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) {
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。';
            errDiv.style.display = 'block';
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange, yPoints, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('phi-expr-preview-controls');
    const tSlider = document.getElementById('phi-expr-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: `Dill 二维正弦分布预览 (t=${t.toFixed(2)})`,
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

function enhancedDrawPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('enhanced_phi_expr');
    const kxInput = document.getElementById('enhanced_Kx');
    const kyInput = document.getElementById('enhanced_Ky');
    const vInput = document.getElementById('I0'); // 使用I0作为增强Dill模型的V
    const plot = document.getElementById('enhanced-phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 1.0;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value);
    
    // 获取Y范围参数
    const yMinInput = document.getElementById('enhanced_y_min');
    const yMaxInput = document.getElementById('enhanced_y_max');
    const yPointsInput = document.getElementById('enhanced_y_points');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    let yPoints = 100;
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    }
    if (yPointsInput) {
        yPoints = parseInt(yPointsInput.value) || 100;
    }

    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) {
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。';
            errDiv.style.display = 'block';
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange, yPoints, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('enhanced-phi-expr-preview-controls');
    const tSlider = document.getElementById('enhanced-phi-expr-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: `Enhanced Dill 二维正弦分布预览 (t=${t.toFixed(2)})`,
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// 增强Dill模型3D预览绘图函数
function enhancedDraw3DPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('enhanced_phi_expr_3d');
    const kxInput = document.getElementById('enhanced_Kx_3d');
    const kyInput = document.getElementById('enhanced_Ky_3d');
    const kzInput = document.getElementById('enhanced_Kz_3d');
    const vInput = document.getElementById('I0'); // 使用I0作为增强Dill模型的V
    const plot = document.getElementById('enhanced-phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    const xMinInput = document.getElementById('enhanced_x_min_3d');
    const xMaxInput = document.getElementById('enhanced_x_max_3d');
    const yMinInput = document.getElementById('enhanced_y_min_3d');
    const yMaxInput = document.getElementById('enhanced_y_max_3d');
    const zMinInput = document.getElementById('enhanced_z_min_3d');
    const zMaxInput = document.getElementById('enhanced_z_max_3d');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 1.0; // 默认I0为1.0
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (kzInput) Kz = parseFloat(kzInput.value);
    if (vInput) V_val = parseFloat(vInput.value);

    const xRange = [parseFloat(xMinInput.value) || 0, parseFloat(xMaxInput.value) || 10];
    const yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    const zRange = [parseFloat(zMinInput.value) || 0, parseFloat(zMaxInput.value) || 10];
    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) { 
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。'; 
            errDiv.style.display = 'block'; 
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = ''; 
        errDiv.style.display = 'none'; 
    }

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange, 20, 20, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('enhanced-phi-expr-3d-preview-controls');
    const tSlider = document.getElementById('enhanced-phi-expr-3d-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    const data = [{
        type: 'isosurface',
        x: plotData.x,
        y: plotData.y,
        z: plotData.z,
        value: plotData.values,
        isomin: 0.5,
        isomax: 1.5,
        surface: { show: true, count: 3, fill: 0.7 },
        colorscale: 'Viridis',
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];
    
    Plotly.newPlot(plot, data, {
        title: `Enhanced Dill 三维正弦分布预览 (t=${t.toFixed(2)})`,
        scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        },
        margin: {t:40, l:0, r:0, b:0},
        height: 350
    }, {displayModeBar: true});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// CAR模型2D预览绘图函数
function carDrawPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('car_phi_expr');
    const kxInput = document.getElementById('car_Kx');
    const kyInput = document.getElementById('car_Ky');
    const vInput = document.getElementById('car_V');
    const plot = document.getElementById('car-phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 0.8;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value);
    
    // 获取Y范围参数
    const yMinInput = document.getElementById('car_y_min');
    const yMaxInput = document.getElementById('car_y_max');
    const yPointsInput = document.getElementById('car_y_points');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    let yPoints = 100;
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    }
    if (yPointsInput) {
        yPoints = parseInt(yPointsInput.value) || 100;
    }

    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) {
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。';
            errDiv.style.display = 'block';
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange, yPoints, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('car-phi-expr-preview-controls');
    const tSlider = document.getElementById('car-phi-expr-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: `CAR 二维正弦分布预览 (t=${t.toFixed(2)})`,
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// CAR模型3D预览绘图函数
function carDraw3DPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('car_phi_expr_3d');
    const kxInput = document.getElementById('car_Kx_3d');
    const kyInput = document.getElementById('car_Ky_3d');
    const kzInput = document.getElementById('car_Kz_3d');
    const vInput = document.getElementById('car_V');
    const plot = document.getElementById('car-phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    const xMinInput = document.getElementById('car_x_min_3d');
    const xMaxInput = document.getElementById('car_x_max_3d');
    const yMinInput = document.getElementById('car_y_min_3d');
    const yMaxInput = document.getElementById('car_y_max_3d');
    const zMinInput = document.getElementById('car_z_min_3d');
    const zMaxInput = document.getElementById('car_z_max_3d');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 0.8;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (kzInput) Kz = parseFloat(kzInput.value);
    if (vInput) V_val = parseFloat(vInput.value);

    const xRange = [parseFloat(xMinInput.value) || 0, parseFloat(xMaxInput.value) || 10];
    const yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    const zRange = [parseFloat(zMinInput.value) || 0, parseFloat(zMaxInput.value) || 10];
    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) { 
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。'; 
            errDiv.style.display = 'block'; 
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = ''; 
        errDiv.style.display = 'none'; 
    }

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange, 20, 20, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('car-phi-expr-3d-preview-controls');
    const tSlider = document.getElementById('car-phi-expr-3d-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    const data = [{
        type: 'isosurface',
        x: plotData.x,
        y: plotData.y,
        z: plotData.z,
        value: plotData.values,
        isomin: 0.5,
        isomax: 1.5,
        surface: { show: true, count: 3, fill: 0.7 },
        colorscale: 'Viridis',
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];
    
    Plotly.newPlot(plot, data, {
        title: `CAR 三维正弦分布预览 (t=${t.toFixed(2)})`,
        scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        },
        margin: {t:40, l:0, r:0, b:0},
        height: 350
    }, {displayModeBar: true});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// V值对比度类型提示功能
function initVTooltip() {
    const vInfoIcon = document.getElementById('v-info-icon');
    const vSlider = document.getElementById('V');
    const vNumberInput = vSlider ? vSlider.parentElement.querySelector('.number-input') : null;
    
    if (vInfoIcon) {
        vInfoIcon.addEventListener('click', function(event) {
            event.stopPropagation();
            showVTooltip();
        });
    }
    
    // 监听V值变化，动态更新弹窗内容
    if (vSlider) {
        vSlider.addEventListener('input', updateVTooltipContent);
    }
    if (vNumberInput) {
        vNumberInput.addEventListener('input', updateVTooltipContent);
    }
    
    // 点击其他地方关闭弹窗
    document.addEventListener('click', function(event) {
        const tooltip = document.getElementById('v-tooltip');
        const overlay = document.querySelector('.v-tooltip-overlay');
        
        if (tooltip && tooltip.style.display === 'block' && 
            !tooltip.contains(event.target) && 
            event.target !== vInfoIcon) {
            hideVTooltip();
        }
    });
    
    // 初始化内容
    updateVTooltipContent();
}

function showVTooltip() {
    const tooltip = document.getElementById('v-tooltip');
    if (tooltip) {
        updateVTooltipContent();
        
        // 添加覆盖层让背景变暗
        let overlay = document.querySelector('.v-tooltip-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'v-tooltip-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';
        
        // 确保弹窗在body的最顶层，不受覆盖层影响
        document.body.appendChild(tooltip);
        
        // 显示弹窗（在覆盖层之上）
        tooltip.style.display = 'block';
        tooltip.style.zIndex = '10001';
        tooltip.style.opacity = '1';
        tooltip.style.filter = 'none';
        
        // 阻止页面滚动
        document.body.style.overflow = 'hidden';
    }
}

function hideVTooltip() {
    const tooltip = document.getElementById('v-tooltip');
    const overlay = document.querySelector('.v-tooltip-overlay');
    
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // 恢复页面滚动
    document.body.style.overflow = '';
}

function updateVTooltipContent() {
    const vSlider = document.getElementById('V');
    if (!vSlider) return;
    
    const vValue = parseFloat(vSlider.value);
    
    // 更新当前V值
    const currentValueElement = document.getElementById('v-current-value');
    if (currentValueElement) {
        currentValueElement.textContent = vValue.toFixed(3);
    }
    
    // 确定对比度类型
    let contrastType, contrastClass, formula, description;
    
    if (vValue < 0.5) {
        contrastType = '低对比度';
        contrastClass = 'low-contrast';
        formula = 'thickness = exp(-C × D(x))';
        description = '连续的指数衰减，厚度分布呈正弦波形状，无明显阈值效应';
    } else if (vValue <= 0.8) {
        contrastType = '中等对比度';
        contrastClass = 'medium-contrast';
        const alpha = ((vValue - 0.5) * 10).toFixed(1);
        formula = `thickness = 1.0 / (1.0 + exp(${alpha} × (D(x) - D_threshold)))`;
        description = `Sigmoid函数形式的渐进阈值效应，阈值锐度参数α=${alpha}`;
    } else {
        contrastType = '高对比度';
        contrastClass = 'high-contrast';
        formula = 'thickness = { 0.98 if D(x) ≤ D_threshold; exp(-C×D(x))×0.1 if D(x) > D_threshold }';
        description = '严格的二值化阈值效应，未曝光区域厚度≈0.98，曝光区域几乎完全溶解';
    }
    
    // 更新对比度类型
    const typeElement = document.getElementById('v-contrast-type');
    if (typeElement) {
        typeElement.textContent = contrastType;
        typeElement.className = `v-tooltip-type ${contrastClass}`;
    }
    
    // 更新公式
    const formulaElement = document.getElementById('v-formula');
    if (formulaElement) {
        const formulaText = formulaElement.querySelector('.formula-text');
        if (formulaText) {
            formulaText.textContent = formula;
        }
    }
    
    // 更新描述
    const descriptionElement = document.getElementById('v-description');
    if (descriptionElement) {
        descriptionElement.textContent = description;
    }
}

// 在页面加载完成后初始化V值提示功能
document.addEventListener('DOMContentLoaded', function() {
    initVTooltip();
});

// 如果页面已经加载完成，立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVTooltip);
} else {
    initVTooltip();
}

/**
 * 重置模型特定组件和状态
 */
function resetModelSpecificComponents() {
    // 隐藏所有的预览图表
    const previewPlots = [
        document.getElementById('phi-expr-preview-plot'),
        document.getElementById('phi-expr-3d-preview-plot'),
        document.getElementById('enhanced-phi-expr-preview-plot'),
        document.getElementById('enhanced-phi-expr-3d-preview-plot'),
        document.getElementById('car-phi-expr-preview-plot'),
        document.getElementById('car-phi-expr-3d-preview-plot')
    ];
    
    previewPlots.forEach(plot => {
        if (plot) {
            plot.style.display = 'none';
            if (typeof Plotly !== 'undefined' && Plotly.purge) {
                Plotly.purge(plot); // 清除Plotly图表资源
            }
        }
    });
    
    // 隐藏所有的相位预览控制面板
    const previewControls = [
        document.getElementById('phi-expr-preview-controls'),
        document.getElementById('phi-expr-3d-preview-controls'),
        document.getElementById('enhanced-phi-expr-preview-controls'),
        document.getElementById('enhanced-phi-expr-3d-preview-controls'),
        document.getElementById('car-phi-expr-preview-controls'),
        document.getElementById('car-phi-expr-3d-preview-controls')
    ];
    
    previewControls.forEach(control => {
        if (control) {
            control.style.display = 'none';
        }
    });
    
    // 重置预览按钮文本
    const previewButtons = [
        document.getElementById('phi-expr-preview-btn'),
        document.getElementById('phi-expr-3d-preview-btn'),
        document.getElementById('enhanced-phi-expr-preview-btn'),
        document.getElementById('enhanced-phi-expr-3d-preview-btn'),
        document.getElementById('car-phi-expr-preview-btn'),
        document.getElementById('car-phi-expr-3d-preview-btn')
    ];
    
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    previewButtons.forEach(btn => {
        if (btn) {
            const text = LANGS[currentLang]?.btn_preview_2d_distribution || '预览分布';
            btn.innerHTML = `<span class="preview-icon"></span> ${text}`;
        }
    });
    
    // 清除CAR模型特有的交互式图表
    if (typeof resetCarPlots === 'function') {
        try {
            resetCarPlots();
        } catch (error) {
            console.warn('重置CAR模型图表失败:', error);
        }
    }
    
    // 隐藏阈值控制区域
    const thresholdContainers = [
        document.getElementById('exposure-thresholds-container'),
        document.getElementById('thickness-thresholds-container')
    ];
    
    thresholdContainers.forEach(container => {
        if (container) {
            container.style.display = 'none';
        }
    });

    // 取消勾选所有模型的4D动画复选框
    const dill4DCheckbox = document.getElementById('enable_4d_animation_dill');
    if (dill4DCheckbox && dill4DCheckbox.checked) {
        dill4DCheckbox.checked = false;
        dill4DCheckbox.dispatchEvent(new Event('change'));
    }

    const enhancedDill4DCheckbox = document.getElementById('enable_4d_animation_enhanced_dill');
    if (enhancedDill4DCheckbox && enhancedDill4DCheckbox.checked) {
        enhancedDill4DCheckbox.checked = false;
        enhancedDill4DCheckbox.dispatchEvent(new Event('change'));
    }
}

/**
 * 初始化加载期间日志功能
 */
function initLoadingLogs() {
    // 获取DOM元素
    loadingLogsPanel = document.getElementById('loading-logs-panel');
    loadingLogsContainer = document.getElementById('loading-logs-container');
    loadingProgressText = document.getElementById('loading-progress-text');
    loadingTimeText = document.getElementById('loading-time-text');
    
    // 绑定按钮事件
    const loadingLogsBtn = document.getElementById('loading-logs-btn');
    const loadingLogsClose = document.getElementById('loading-logs-close');
    const loadingLogsMinimize = document.getElementById('loading-logs-minimize');
    
    // 显示/隐藏日志面板
    if (loadingLogsBtn) {
        loadingLogsBtn.addEventListener('click', () => {
            toggleLoadingLogsPanel();
        });
    }
    
    // 关闭日志面板
    if (loadingLogsClose) {
        loadingLogsClose.addEventListener('click', () => {
            hideLoadingLogsPanel();
        });
    }
    
    // 最小化/还原日志面板
    if (loadingLogsMinimize) {
        loadingLogsMinimize.addEventListener('click', () => {
            toggleLoadingLogsPanelMinimize();
        });
    }
}

/**
 * 显示/隐藏加载期间日志面板
 */
function toggleLoadingLogsPanel() {
    console.log('🔍 [DEBUG] toggleLoadingLogsPanel 被调用');
    console.log('🔍 [DEBUG] window.systematicLogManager 存在:', !!window.systematicLogManager);
    
    // 如果系统化日志管理器可用，使用新系统
    if (window.systematicLogManager) {
        console.log('🔍 [DEBUG] 使用新的系统化日志管理器');
        window.systematicLogManager.togglePanel();
    } else {
        console.log('🔍 [DEBUG] 回退到旧的日志系统');
        if (!loadingLogsPanel) return;
        
        if (loadingLogsPanel.classList.contains('visible')) {
            hideLoadingLogsPanel();
        } else {
            showLoadingLogsPanel();
        }
    }
}

/**
 * 显示加载期间日志面板
 */
function showLoadingLogsPanel() {
    const loadingLogsPanel = document.getElementById('loading-logs-panel');
    if (loadingLogsPanel) {
        loadingLogsPanel.style.display = 'block';
        setTimeout(() => {
            loadingLogsPanel.classList.add('visible');
            // 新增：滚动到日志面板
            loadingLogsPanel.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 10);
    }
}

/**
 * 隐藏加载期间日志面板
 */
function hideLoadingLogsPanel() {
    if (!loadingLogsPanel) return;
    
    loadingLogsPanel.classList.remove('visible');
    loadingLogsPanel.classList.remove('minimized');
    
    // 等待动画完成后再隐藏
    setTimeout(() => {
        if (!loadingLogsPanel.classList.contains('visible')) {
            loadingLogsPanel.style.display = 'none';
        }
    }, 400); // 与CSS动画时间保持一致
    
    // 停止获取实时日志
    stopLoadingLogsUpdate();
}

/**
 * 最小化/还原日志面板
 */
function toggleLoadingLogsPanelMinimize() {
    if (!loadingLogsPanel) return;
    
    loadingLogsPanel.classList.toggle('minimized');
}

/**
 * 开始加载期间日志更新
 */
function startLoadingLogsUpdate() {
    // 如果系统化日志管理器可用，使用新系统
    if (window.systematicLogManager) {
        window.systematicLogManager.startLogUpdates();
    } else {
        // 记录开始时间
        loadingStartTime = Date.now();
        
        // 开始时间计时器
        loadingTimeInterval = setInterval(() => {
            updateLoadingTime();
        }, 100);
        
        // 开始日志获取
        updateLoadingLogs();
        
        // 定期更新日志
        window.loadingLogsUpdateInterval = setInterval(() => {
            updateLoadingLogs();
        }, 1000);
    }
}

/**
 * 停止加载期间日志更新
 */
function stopLoadingLogsUpdate() {
    // 如果系统化日志管理器可用，使用新系统
    if (window.systematicLogManager) {
        window.systematicLogManager.stopLogUpdates();
    } else {
        if (loadingTimeInterval) {
            clearInterval(loadingTimeInterval);
            loadingTimeInterval = null;
        }
        
        if (window.loadingLogsUpdateInterval) {
            clearInterval(window.loadingLogsUpdateInterval);
            window.loadingLogsUpdateInterval = null;
        }
    }
}

/**
 * 更新加载时间显示
 */
function updateLoadingTime() {
    if (!loadingStartTime || !loadingTimeText) return;
    
    const elapsed = Date.now() - loadingStartTime;
    const seconds = (elapsed / 1000).toFixed(1);
    loadingTimeText.textContent = `${seconds}s`;
}

/**
 * 获取并更新加载期间日志
 */
async function updateLoadingLogs() {
    try {
        const response = await fetch('/api/logs?limit=50');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const logs = await response.json();
        displayLoadingLogs(logs);
        
    } catch (error) {
        console.error('获取加载日志失败:', error);
        // 显示错误信息
        if (loadingLogsContainer) {
            const errorItem = createLoadingLogItem('error', '获取日志失败: ' + error.message);
            prependLoadingLogItem(errorItem);
        }
    }
}

/**
 * 显示加载期间日志
 */
function displayLoadingLogs(logs) {
    if (!loadingLogsContainer || !logs || logs.length === 0) return;
    
    // 清除占位符
    const placeholder = loadingLogsContainer.querySelector('.loading-logs-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    // 获取当前显示的日志条目数
    const currentItems = loadingLogsContainer.querySelectorAll('.loading-log-item').length;
    
    // 只显示新的日志条目
    if (logs.length > currentItems) {
        const newLogs = logs.slice(currentItems);
        
        newLogs.forEach(log => {
            const logItem = createLoadingLogItem(
                getLogType(log.message),
                log.message,
                new Date(log.timestamp)
            );
            prependLoadingLogItem(logItem);
        });
        
        // 更新进度显示
        updateLoadingProgress(logs);
    }
}

/**
 * 创建加载日志条目
 */
function createLoadingLogItem(type, message, timestamp) {
    const item = document.createElement('div');
    item.className = `loading-log-item ${type}`;
    
    const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date());

    let displayMessage = escapeHtml(message);
    
    // 获取当前计算信息
    const calcInfo = window.currentCalculationInfo;
    
    if (calcInfo && calcInfo.model) {
        // 模型名称映射，用于日志匹配
        const modelNameMap = {
            dill: 'Dill',
            enhanced_dill: '增强Dill',
            car: 'CAR'
        };
        
        const modelDisplayName = modelNameMap[calcInfo.model];
        
        // 只有当日志类型与当前计算模型匹配时，才添加维度信息
        if (modelDisplayName && message.includes(`[${modelDisplayName}]`)) {
            const newTag = `[${modelDisplayName}: ${calcInfo.dimension}]`;
            displayMessage = escapeHtml(message.replace(`[${modelDisplayName}]`, newTag));
        }
    }
    
    item.innerHTML = `
        <span class="loading-log-timestamp">[${timeStr}]</span>
        <span class="loading-log-message">${displayMessage}</span>
    `;
    
    return item;
}

/**
 * 在日志列表顶部添加日志条目
 */
function prependLoadingLogItem(item) {
    if (!loadingLogsContainer) return;
    
    // 添加进入动画
    item.style.opacity = '0';
    item.style.transform = 'translateY(-10px)';
    
    loadingLogsContainer.insertBefore(item, loadingLogsContainer.firstChild);
    
    // 触发动画
    setTimeout(() => {
        item.style.transition = 'all 0.3s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
    }, 10);
    
    // 限制显示的日志条目数量
    const maxItems = 20;
    const items = loadingLogsContainer.querySelectorAll('.loading-log-item');
    if (items.length > maxItems) {
        for (let i = maxItems; i < items.length; i++) {
            items[i].remove();
        }
    }
}

/**
 * 根据日志消息确定日志类型
 */
function getLogType(message) {
    if (!message) return 'info';
    
    message = message.toLowerCase();
    
    if (message.includes('error') || message.includes('失败') || message.includes('错误')) {
        return 'error';
    } else if (message.includes('warning') || message.includes('警告')) {
        return 'warning';
    } else if (message.includes('进度:') || message.includes('progress:') || message.includes('计算完成') || message.includes('开始计算')) {
        return 'progress';
    } else if (message.includes('完成') || message.includes('成功') || message.includes('success')) {
        return 'success';
    }
    
    return 'info';
}

/**
 * 更新加载进度显示
 */
function updateLoadingProgress(logs) {
    if (!loadingProgressText || !logs || logs.length === 0) return;
    
    // 寻找最新的进度信息
    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.message && log.message.includes('进度:')) {
            // 提取进度信息
            const match = log.message.match(/进度:\s*(\d+)\/(\d+)/);
            if (match) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                const percentage = ((current / total) * 100).toFixed(1);
                loadingProgressText.textContent = `${current}/${total} (${percentage}%)`;
                return;
            }
        }
    }
    
    // 如果没有找到具体进度，显示状态信息
    if (logs.length > 0) {
        const latestLog = logs[logs.length - 1];
        if (latestLog.message.includes('计算完成')) {
            loadingProgressText.textContent = '计算完成';
        } else if (latestLog.message.includes('开始计算')) {
            loadingProgressText.textContent = '计算中...';
        }
    }
}

/**
 * 格式化时间戳
 */
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * HTML转义
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * 执行从加载页到主页面的日志过渡动画
 */
function transitionLogsFromLoadingToMain() {
    if (!loadingLogsPanel) return;
    
    const mainLogsModal = document.getElementById('logs-modal');
    
    // 如果加载期间日志面板可见，执行过渡动画
    if (loadingLogsPanel.classList.contains('visible')) {
        // 添加过渡动画类
        loadingLogsPanel.classList.add('loading-to-main-transition');
        
        // 停止日志更新
        stopLoadingLogsUpdate();
        
        // 延迟显示主页面日志
        setTimeout(() => {
            hideLoadingLogsPanel();
            
            if (mainLogsModal && typeof showLogsModal === 'function') {
                mainLogsModal.classList.add('main-logs-transition');
                showLogsModal();
                
                // 移除过渡动画类
                setTimeout(() => {
                    mainLogsModal.classList.remove('main-logs-transition');
                }, 800);
            }
        }, 400);
    }
}

/**
 * 测试新日志系统
 */
function testNewLogSystem() {
    console.log('🧪 [TEST] 开始测试新日志系统');
    
    if (!window.systematicLogManager) {
        console.error('❌ [TEST] 系统化日志管理器不存在');
        return false;
    }
    
    console.log('✅ [TEST] 系统化日志管理器存在');
    
    // 强制显示面板
    try {
        window.systematicLogManager.showPanel();
        console.log('✅ [TEST] 强制显示面板成功');
    } catch (error) {
        console.error('❌ [TEST] 强制显示面板失败:', error);
        return false;
    }
    
    // 添加测试日志
    try {
        window.systematicLogManager.addLog('info', '这是一条测试日志信息', '2d', '详细信息测试');
        window.systematicLogManager.addLog('progress', '这是一条测试进度信息', '3d');
        window.systematicLogManager.addLog('success', '这是一条测试成功信息', '1d');
        console.log('✅ [TEST] 添加测试日志成功');
    } catch (error) {
        console.error('❌ [TEST] 添加测试日志失败:', error);
        return false;
    }
    
    return true;
}

// 暴露测试函数到全局作用域，便于在控制台调用
window.testNewLogSystem = testNewLogSystem;

/**
 * 滑动到页面最底部并刷新日志系统
 */
function scrollToBottomAndRefreshLogs() {
    // 查找日志容器并滚动到其底部
    const logsContainer = document.getElementById('logs-container');
    if (logsContainer) {
        // 先滚动到日志区域
        logsContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        // 然后滚动日志容器内部到底部
        setTimeout(() => {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }, 300);
    } else {
        // 如果没有找到日志容器，滚动到页面底部作为后备方案
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    // 延迟一点时间后自动刷新日志
    setTimeout(() => {
        // 检查是否有刷新日志的按钮并点击它
        const refreshBtn = document.getElementById('refresh-logs-btn');
        if (refreshBtn && typeof refreshBtn.onclick === 'function') {
            refreshBtn.onclick();
        } else if (typeof loadLogs === 'function') {
            // 如果没有找到按钮或按钮的点击事件，直接调用加载日志函数
            loadLogs();
        }
    }, 500); // 等待滚动开始后再刷新日志
}

// DILL模型4D动画相关变量和函数
let dill4DAnimationData = null;
let dill4DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    timeArray: [],
    intervalId: null,
    loopEnabled: false
};

let enhancedDill4DAnimationData = null;
let enhancedDill4DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    timeArray: [],
    intervalId: null,
    loopEnabled: false
};

// 4D动画开关互斥管理
function handle4DAnimationExclusivity(enabledModel) {
    console.log(`4D动画开关互斥: 启用${enabledModel}模型，禁用其他模型`);
    
    // 获取所有4D动画复选框
    const dillCheckbox = document.getElementById('enable_4d_animation_dill');
    const enhancedDillCheckbox = document.getElementById('enable_4d_animation_enhanced_dill');
    const carCheckbox = document.getElementById('car_enable_4d_animation');
    
    // 获取所有4D参数面板
    const dillParams = document.getElementById('dill_4d_time_params');
    const enhancedDillParams = document.getElementById('enhanced_dill_4d_time_params');
    const carParams = document.getElementById('car_4d_time_params');
    
    // 获取所有4D动画区域
    const dillAnimationSection = document.getElementById('dill-4d-animation-section');
    const enhancedDillAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
    const carAnimationSection = document.getElementById('car-4d-animation-section');
    
    // 根据启用的模型，禁用其他模型
    switch(enabledModel) {
        case 'dill':
            // 禁用其他模型
            if (enhancedDillCheckbox) {
                enhancedDillCheckbox.checked = false;
                if (enhancedDillParams) enhancedDillParams.style.display = 'none';
                if (enhancedDillAnimationSection) enhancedDillAnimationSection.style.display = 'none';
            }
            if (carCheckbox) {
                carCheckbox.checked = false;
                if (carParams) carParams.style.display = 'none';
                if (carAnimationSection) carAnimationSection.style.display = 'none';
            }
            // 停止其他模型的动画
            if (enhancedDill4DAnimationState.intervalId) {
                clearInterval(enhancedDill4DAnimationState.intervalId);
                enhancedDill4DAnimationState.intervalId = null;
                enhancedDill4DAnimationState.isPlaying = false;
            }
            if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                clearInterval(car4DAnimationState.intervalId);
                car4DAnimationState.intervalId = null;
                car4DAnimationState.isPlaying = false;
            }
            break;
            
        case 'enhanced_dill':
            // 禁用其他模型
            if (dillCheckbox) {
                dillCheckbox.checked = false;
                if (dillParams) dillParams.style.display = 'none';
                if (dillAnimationSection) dillAnimationSection.style.display = 'none';
            }
            if (carCheckbox) {
                carCheckbox.checked = false;
                if (carParams) carParams.style.display = 'none';
                if (carAnimationSection) carAnimationSection.style.display = 'none';
            }
            // 停止其他模型的动画
            if (dill4DAnimationState.intervalId) {
                clearInterval(dill4DAnimationState.intervalId);
                dill4DAnimationState.intervalId = null;
                dill4DAnimationState.isPlaying = false;
            }
            if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                clearInterval(car4DAnimationState.intervalId);
                car4DAnimationState.intervalId = null;
                car4DAnimationState.isPlaying = false;
            }
            break;
            
        case 'car':
            // 禁用其他模型
            if (dillCheckbox) {
                dillCheckbox.checked = false;
                if (dillParams) dillParams.style.display = 'none';
                if (dillAnimationSection) dillAnimationSection.style.display = 'none';
            }
            if (enhancedDillCheckbox) {
                enhancedDillCheckbox.checked = false;
                if (enhancedDillParams) enhancedDillParams.style.display = 'none';
                if (enhancedDillAnimationSection) enhancedDillAnimationSection.style.display = 'none';
            }
            // 停止其他模型的动画
            if (dill4DAnimationState.intervalId) {
                clearInterval(dill4DAnimationState.intervalId);
                dill4DAnimationState.intervalId = null;
                dill4DAnimationState.isPlaying = false;
            }
            if (enhancedDill4DAnimationState.intervalId) {
                clearInterval(enhancedDill4DAnimationState.intervalId);
                enhancedDill4DAnimationState.intervalId = null;
                enhancedDill4DAnimationState.isPlaying = false;
            }
            break;
    }
    
    console.log(`4D动画开关互斥处理完成: ${enabledModel}模型已启用，其他模型已禁用`);
}

// DILL模型4D动画事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // DILL模型4D动画复选框事件
    const enable4DAnimationDill = document.getElementById('enable_4d_animation_dill');
    const dill4DTimeParams = document.getElementById('dill_4d_time_params');
    
    if (enable4DAnimationDill && dill4DTimeParams) {
        enable4DAnimationDill.addEventListener('change', function() {
            if (this.checked) {
                // 启用DILL 4D动画，禁用其他模型
                handle4DAnimationExclusivity('dill');
                dill4DTimeParams.style.display = 'flex';
                console.log('DILL模型4D动画已启用，其他模型已禁用');
            } else {
                dill4DTimeParams.style.display = 'none';
                // 隐藏4D动画区域
                const animationSection = document.getElementById('dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                // 停止当前播放的动画
                if (dill4DAnimationState.intervalId) {
                    clearInterval(dill4DAnimationState.intervalId);
                    dill4DAnimationState.intervalId = null;
                    dill4DAnimationState.isPlaying = false;
                }
                console.log('DILL模型4D动画已禁用');
            }
        });
    }
    
    // 增强DILL模型4D动画复选框事件
    const enable4DAnimationEnhancedDill = document.getElementById('enable_4d_animation_enhanced_dill');
    const enhancedDill4DTimeParams = document.getElementById('enhanced_dill_4d_time_params');
    
    if (enable4DAnimationEnhancedDill && enhancedDill4DTimeParams) {
        // 初始化时根据复选框状态设置参数面板
        enhancedDill4DTimeParams.style.display = enable4DAnimationEnhancedDill.checked ? 'flex' : 'none';
        
        enable4DAnimationEnhancedDill.addEventListener('change', function() {
            if (this.checked) {
                // 启用Enhanced DILL 4D动画，禁用其他模型
                handle4DAnimationExclusivity('enhanced_dill');
                enhancedDill4DTimeParams.style.display = 'flex';
                console.log('Enhanced DILL模型4D动画已启用，其他模型已禁用');
            } else {
                enhancedDill4DTimeParams.style.display = 'none';
                // 隐藏4D动画区域
                const animationSection = document.getElementById('enhanced-dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                // 停止当前播放的动画
                if (enhancedDill4DAnimationState.intervalId) {
                    clearInterval(enhancedDill4DAnimationState.intervalId);
                    enhancedDill4DAnimationState.intervalId = null;
                    enhancedDill4DAnimationState.isPlaying = false;
                }
                console.log('Enhanced DILL模型4D动画已禁用');
            }
        });
    }
    
    // CAR模型4D动画复选框事件 (如果存在)
    const carEnable4DAnimation = document.getElementById('car_enable_4d_animation');
    const car4DTimeParams = document.getElementById('car_4d_time_params');
    
    if (carEnable4DAnimation && car4DTimeParams) {
        carEnable4DAnimation.addEventListener('change', function() {
            if (this.checked) {
                // 启用CAR 4D动画，禁用其他模型
                handle4DAnimationExclusivity('car');
                car4DTimeParams.style.display = 'flex';
                console.log('CAR模型4D动画已启用，其他模型已禁用');
            } else {
                car4DTimeParams.style.display = 'none';
                // 隐藏4D动画区域
                const animationSection = document.getElementById('car-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                // 停止当前播放的动画
                if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                    clearInterval(car4DAnimationState.intervalId);
                    car4DAnimationState.intervalId = null;
                    car4DAnimationState.isPlaying = false;
                }
                console.log('CAR模型4D动画已禁用');
            }
        });
    }
    
    // DILL模型4D动画控制按钮事件
    setupDill4DAnimationControls();
    setupEnhancedDill4DAnimationControls();
    // DILL模型1D动画控制按钮事件
    setupDill1DAnimationControls();
    // DILL模型1D V评估参数控制事件
    setupDill1DVEvaluationParameterControls();
});

// 设置DILL模型4D动画控制事件
function setupDill4DAnimationControls() {
    const enable4DAnimationDill = document.getElementById('enable_4d_animation_dill');
    const dill4DTimeParams = document.getElementById('dill_4d_time_params');
    
    if (enable4DAnimationDill && dill4DTimeParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        dill4DTimeParams.style.display = enable4DAnimationDill.checked ? 'block' : 'none';
        
        enable4DAnimationDill.addEventListener('change', function() {
            dill4DTimeParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏4D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选DILL 4D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (typeof dill4DAnimationState !== 'undefined' && dill4DAnimationState.intervalId) {
                    clearInterval(dill4DAnimationState.intervalId);
                    dill4DAnimationState.intervalId = null;
                    dill4DAnimationState.isPlaying = false;
                }
            }
        });
    }
}

function setupEnhancedDill4DAnimationControls() {
    const enable4DAnimationEnhancedDill = document.getElementById('enable_4d_animation_enhanced_dill');
    const enhancedDill4DTimeParams = document.getElementById('enhanced_dill_4d_time_params');
    
    if (enable4DAnimationEnhancedDill && enhancedDill4DTimeParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        enhancedDill4DTimeParams.style.display = enable4DAnimationEnhancedDill.checked ? 'block' : 'none';
        
        enable4DAnimationEnhancedDill.addEventListener('change', function() {
            enhancedDill4DTimeParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏4D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('enhanced-dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选Enhanced DILL 4D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (typeof enhancedDill4DAnimationState !== 'undefined' && enhancedDill4DAnimationState.intervalId) {
                    clearInterval(enhancedDill4DAnimationState.intervalId);
                    enhancedDill4DAnimationState.intervalId = null;
                    enhancedDill4DAnimationState.isPlaying = false;
                }
            }
        });
    }
}

// 设置DILL模型1D动画控制事件
function setupDill1DAnimationControls() {
    const enable1DAnimationDill = document.getElementById('enable_1d_animation_dill');
    const dill1DTimeParams = document.getElementById('dill_1d_time_params');
    
    if (enable1DAnimationDill && dill1DTimeParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        dill1DTimeParams.style.display = enable1DAnimationDill.checked ? 'block' : 'none';
        
        enable1DAnimationDill.addEventListener('change', function() {
            dill1DTimeParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏1D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('dill-1d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选DILL 1D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (typeof dill1DAnimationState !== 'undefined' && dill1DAnimationState.intervalId) {
                    clearInterval(dill1DAnimationState.intervalId);
                    dill1DAnimationState.intervalId = null;
                    dill1DAnimationState.isPlaying = false;
                }
            }
        });
    }
}

// 设置DILL模型1D V评估控制事件
function setupDill1DVEvaluationParameterControls() {
    console.log('设置DILL 1D V评估参数控制');
    
    const enable1DVEvaluationDill = document.getElementById('enable_1d_v_evaluation_dill');
    const dill1DVParams = document.getElementById('dill_1d_v_params');
    
    if (enable1DVEvaluationDill && dill1DVParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        dill1DVParams.style.display = enable1DVEvaluationDill.checked ? 'block' : 'none';
        
        enable1DVEvaluationDill.addEventListener('change', function() {
            dill1DVParams.style.display = this.checked ? 'block' : 'none';
            console.log(`DILL 1D V评估开关状态: ${this.checked ? '启用' : '禁用'}`);
            
            // 如果取消勾选，立即隐藏V评估区域
            if (!this.checked) {
                const vEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
                if (vEvaluationSection) {
                    vEvaluationSection.style.display = 'none';
                    console.log('用户取消勾选DILL 1D V评估，已隐藏V评估区域');
                }
                // 停止当前播放的V评估动画
                if (typeof dill1DVEvaluationState !== 'undefined' && dill1DVEvaluationState.intervalId) {
                    clearInterval(dill1DVEvaluationState.intervalId);
                    dill1DVEvaluationState.intervalId = null;
                    dill1DVEvaluationState.isPlaying = false;
                }
            }
        });
        
        console.log('DILL 1D V评估参数控制事件已绑定');
    } else {
        console.error('DILL 1D V评估控制元素未找到:', {
            enable1DVEvaluationDill: !!enable1DVEvaluationDill,
            dill1DVParams: !!dill1DVParams
        });
    }
}

// ... existing code ...

function getDillModelParams() {
    const sineType = document.getElementById('dill-sine-type').value;
    const enable4DAnimation = document.getElementById('enable_4d_animation_dill')?.checked || false;
    
    const params = {
        model_type: 'dill',
        sine_type: sineType
    };
    
    // 只有在3D模式且启用4D动画时才添加4D动画参数
    if (enable4DAnimation && sineType === '3d') {
        params.enable_4d_animation = true;
        params.t_start = parseFloat(document.getElementById('t_start_dill')?.value) || 0;
        params.t_end = parseFloat(document.getElementById('t_end_dill')?.value) || 5;
        params.time_steps = parseInt(document.getElementById('time_steps_dill')?.value) || 20;
        params.animation_speed = parseInt(document.getElementById('dill_animation_speed')?.value) || 500;
    }
    
    return params;
}

function getEnhancedDillModelParams() {
    const sineType = document.getElementById('enhanced-dill-sine-type').value;
    const enable4DAnimation = document.getElementById('enable_4d_animation_enhanced_dill')?.checked || false;
    
    const params = {
        model_type: 'enhanced_dill',
        sine_type: sineType
    };
    
    // 只有在3D模式且启用4D动画时才添加4D动画参数
    if (enable4DAnimation && sineType === '3d') {
        params.enable_4d_animation = true;
        params.t_start = parseFloat(document.getElementById('t_start_enhanced_dill')?.value) || 0;
        params.t_end = parseFloat(document.getElementById('t_end_enhanced_dill')?.value) || 5;
        params.time_steps = parseInt(document.getElementById('time_steps_enhanced_dill')?.value) || 20;
        params.animation_speed = parseInt(document.getElementById('enhanced_dill_animation_speed')?.value) || 500;
    } else {
        // 确保4D动画参数不会被传递
        params.enable_4d_animation = false;
        console.log('Enhanced DILL模型4D动画已禁用');
    }
    
    return params;
}

function getCarModelParams() {
    const sineType = document.getElementById('car-sine-type')?.value || 'single';
    const enable4DAnimation = document.getElementById('car_enable_4d_animation')?.checked || false;
    
    const params = {
        model_type: 'car',
        sine_type: sineType
    };
    
    // 只有在3D模式且启用4D动画时才添加4D动画参数
    if (enable4DAnimation && sineType === '3d') {
        params.enable_4d_animation = true;
        params.t_start = parseFloat(document.getElementById('t_start_car')?.value) || 0;
        params.t_end = parseFloat(document.getElementById('t_end_car')?.value) || 5;
        params.time_steps = parseInt(document.getElementById('time_steps_car')?.value) || 20;
        params.animation_speed = parseInt(document.getElementById('car_animation_speed')?.value) || 500;
    } else {
        // 确保4D动画参数不会被传递
        params.enable_4d_animation = false;
        console.log('CAR模型4D动画已禁用');
    }
    
    return params;
}

// 添加缺失的DILL模型4D动画播放控制函数

// DILL模型1D动画状态管理
let dill1DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    intervalId: null,
    loopEnabled: false,
    animationData: null
};

// DILL模型1D动画播放控制函数
function playDill1DAnimation() {
    if (dill1DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!dill1DAnimationState.loopEnabled && dill1DAnimationState.currentFrame >= dill1DAnimationState.totalFrames - 1) {
        resetDill1DAnimation();
    }
    
    dill1DAnimationState.isPlaying = true;
    
    // 直接更新按钮状态 - 隐藏播放按钮，显示暂停按钮
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
        console.log('1D动画播放：隐藏播放按钮，显示暂停按钮');
    } else {
        console.error('1D动画按钮未找到', { playBtn: !!playBtn, pauseBtn: !!pauseBtn });
    }
    
    // 更新状态指示器
    const statusElement = document.getElementById('dill-1d-animation-status');
    if (statusElement) {
        statusElement.classList.remove('status-paused', 'status-stopped');
        statusElement.classList.add('status-playing');
        statusElement.innerHTML = '<i class="fas fa-circle"></i> 播放中';
    }
    
    updateDill1DAnimationStatus('动画播放中...');
    
    dill1DAnimationState.intervalId = setInterval(() => {
        let nextFrame = dill1DAnimationState.currentFrame + 1;
        
        if (nextFrame >= dill1DAnimationState.totalFrames) {
            if (dill1DAnimationState.loopEnabled) {
                nextFrame = 0; // 循环播放
            } else {
                pauseDill1DAnimation(); // 播放到结尾则暂停
                dill1DAnimationState.currentFrame = dill1DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
                return;
            }
        }
        
        dill1DAnimationState.currentFrame = nextFrame;
        updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
    }, 200);
}

function pauseDill1DAnimation() {
    if (!dill1DAnimationState.isPlaying) return;
    dill1DAnimationState.isPlaying = false;
    clearInterval(dill1DAnimationState.intervalId);
    dill1DAnimationState.intervalId = null;
    
    // 直接更新按钮状态 - 显示播放按钮，隐藏暂停按钮
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        console.log('1D动画暂停：显示播放按钮，隐藏暂停按钮');
    } else {
        console.error('1D动画按钮未找到', { playBtn: !!playBtn, pauseBtn: !!pauseBtn });
    }
    
    // 更新状态指示器
    const statusElement = document.getElementById('dill-1d-animation-status');
    if (statusElement) {
        statusElement.classList.remove('status-playing');
        statusElement.classList.add('status-paused');
        statusElement.innerHTML = '<i class="fas fa-circle"></i> 已暂停';
    }
    
    // 更新当前帧状态为就绪
    const frameData = dill1DAnimationState.animationData && dill1DAnimationState.animationData[dill1DAnimationState.currentFrame];
    if (frameData) {
        updateDill1DAnimationStatus(`已暂停: 第${dill1DAnimationState.currentFrame + 1}/${dill1DAnimationState.totalFrames}帧`);
    } else {
        updateDill1DAnimationStatus('已暂停');
    }
}

function resetDill1DAnimation() {
    pauseDill1DAnimation();
    dill1DAnimationState.currentFrame = 0;
    updateDill1DAnimationFrame(0);
    updateDill1DTimeSlider(0);
    // 重置后也显示就绪状态
    const frameData = dill1DAnimationState.animationData && dill1DAnimationState.animationData[0];
    if (frameData) {
        updateDill1DAnimationStatus(`就绪: 第1/${dill1DAnimationState.totalFrames}帧 (t=${frameData.time_value.toFixed(2)}s)`);
    } else {
        updateDill1DAnimationStatus('就绪');
    }
}

function toggleDill1DLoop() {
    dill1DAnimationState.loopEnabled = !dill1DAnimationState.loopEnabled;
    const loopBtn = document.getElementById('dill-1d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (dill1DAnimationState.loopEnabled) {
            // 开启循环时：移除 loop-off 类，显示"关闭循环"
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            // 关闭循环时：添加 loop-off 类，显示"开启循环"
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
    updateDill1DAnimationStatus(dill1DAnimationState.loopEnabled ? '已开启循环播放' : '已关闭循环播放');
}

function updateDill1DAnimationStatus(status) {
    const statusElement = document.getElementById('dill-1d-animation-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// 更新DILL 1D动画按钮状态的显示
function updateDill1DButtonStates() {
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    
    console.log('更新DILL 1D按钮状态:', {
        isPlaying: dill1DAnimationState.isPlaying,
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn
    });
    
    if (playBtn && pauseBtn) {
        if (dill1DAnimationState.isPlaying) {
            // 动画播放中：显示暂停按钮，隐藏播放按钮
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-flex';
            console.log('设置为播放状态：显示暂停按钮');
        } else {
            // 动画暂停/停止：显示播放按钮，隐藏暂停按钮
            playBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
            console.log('设置为暂停状态：显示播放按钮');
        }
    } else {
        console.error('DILL 1D动画按钮未找到，无法更新状态');
    }
}

function updateDill1DAnimationFrame(frameIndex) {
    console.log('🎬 开始更新DILL 1D动画帧:', frameIndex);
    
    if (!dill1DAnimationState.animationData || frameIndex >= dill1DAnimationState.totalFrames) {
        console.error('DILL 1D动画数据无效或帧索引超出范围');
        return;
    }
    
    console.log('DILL 1D动画数据详情:', {
        'animationData length': dill1DAnimationState.animationData.length,
        'totalFrames': dill1DAnimationState.totalFrames,
        'frameIndex': frameIndex,
        'currentFrameData': dill1DAnimationState.animationData[frameIndex]
    });
    
    const frameData = dill1DAnimationState.animationData[frameIndex];
    
    // 获取时间值 - 从不同可能的数据结构中
    let timeValue = frameIndex * 0.25; // 默认时间值
    if (frameData && typeof frameData.time !== 'undefined') {
        timeValue = frameData.time;
    } else if (frameData && typeof frameData.t !== 'undefined') {
        timeValue = frameData.t;
    }
    
    console.log('当前帧时间值:', timeValue);
    
    // 更新曝光剂量分布图
    const exposureContainer = document.getElementById('dill-exposure-1d-plot');
    if (exposureContainer) {
        console.log('开始更新曝光剂量分布图');
        
        // 清除占位符内容
        exposureContainer.innerHTML = '';
        
        // 处理不同的数据格式
        let exposureX, exposureY;
        
        if (frameData && frameData.exposure_data) {
            // 格式1: frameData.exposure_data.x 和 frameData.exposure_data.y
            exposureX = frameData.exposure_data.x;
            exposureY = frameData.exposure_data.y;
        } else if (frameData && frameData.x && frameData.exposure_dose) {
            // 格式2: frameData.x 和 frameData.exposure_dose
            exposureX = frameData.x;
            exposureY = frameData.exposure_dose;
        } else if (frameData && Array.isArray(frameData)) {
            // 格式3: frameData 是数组，使用索引作为x轴
            exposureX = Array.from({ length: frameData.length }, (_, i) => i);
            exposureY = frameData;
        } else {
            console.warn('未识别的曝光数据格式，使用模拟数据');
            // 使用模拟数据
            exposureX = Array.from({ length: 100 }, (_, i) => i * 0.1);
            exposureY = exposureX.map(x => Math.sin(x + timeValue) * Math.exp(-x/5) + 0.5);
        }
        
        const exposureTrace = {
            x: exposureX,
            y: exposureY,
            type: 'scatter',
            mode: 'lines+markers',
            name: `曝光剂量分布 (t=${timeValue.toFixed(2)}s)`,
            line: { color: '#3498db', width: 3 },
            marker: { size: 4, color: '#3498db' }
        };
        
        const exposureLayout = {
            title: `曝光剂量分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'X 位置 (μm)' },
            yaxis: { title: '曝光剂量 (mJ/cm²)' },
            margin: { t: 60, b: 60, l: 80, r: 30 },
            plot_bgcolor: '#f8f9fa',
            paper_bgcolor: 'white'
        };
        
        Plotly.newPlot(exposureContainer, [exposureTrace], exposureLayout, { responsive: true });
        console.log('曝光剂量分布图更新完成');
    }
    
    // 更新光刻胶厚度分布图
    const thicknessContainer = document.getElementById('dill-thickness-1d-plot');
    if (thicknessContainer) {
        console.log('开始更新光刻胶厚度分布图');
        
        // 清除占位符内容
        thicknessContainer.innerHTML = '';
        
        // 处理不同的数据格式
        let thicknessX, thicknessY;
        
        if (frameData && frameData.thickness_data) {
            // 格式1: frameData.thickness_data.x 和 frameData.thickness_data.y
            thicknessX = frameData.thickness_data.x;
            thicknessY = frameData.thickness_data.y;
        } else if (frameData && frameData.x && frameData.thickness) {
            // 格式2: frameData.x 和 frameData.thickness
            thicknessX = frameData.x;
            thicknessY = frameData.thickness;
        } else if (frameData && frameData.x && frameData.exposure_dose) {
            // 格式3: 从曝光剂量推导厚度变化
            thicknessX = frameData.x || exposureX;
            thicknessY = frameData.exposure_dose ? frameData.exposure_dose.map(dose => Math.max(0, 1 - dose * 0.1)) : null;
        } else {
            console.warn('未识别的厚度数据格式，使用模拟数据');
            // 使用模拟数据
            thicknessX = Array.from({ length: 100 }, (_, i) => i * 0.1);
            thicknessY = thicknessX.map(x => Math.max(0, 1 - Math.sin(x + timeValue) * 0.2));
        }
        
        if (thicknessY) {
            const thicknessTrace = {
                x: thicknessX,
                y: thicknessY,
                type: 'scatter',
                mode: 'lines+markers',
                name: `光刻胶厚度分布 (t=${timeValue.toFixed(2)}s)`,
                line: { color: '#e74c3c', width: 3 },
                marker: { size: 4, color: '#e74c3c' },
                fill: 'tonexty',
                fillcolor: 'rgba(231, 76, 60, 0.1)'
            };
            
            const thicknessLayout = {
                title: `光刻胶厚度分布 (t=${timeValue.toFixed(2)}s)`,
                xaxis: { title: 'X 位置 (μm)' },
                yaxis: { title: '相对厚度' },
                margin: { t: 60, b: 60, l: 80, r: 30 },
                plot_bgcolor: '#f8f9fa',
                paper_bgcolor: 'white'
            };
            
            Plotly.newPlot(thicknessContainer, [thicknessTrace], thicknessLayout, { responsive: true });
            console.log('光刻胶厚度分布图更新完成');
        }
    }
    
    // 更新时间滑块和显示信息
    updateDill1DTimeSlider(frameIndex);
    updateDill1DTimeDisplay(timeValue, frameIndex);
    
    // 如果正在播放则显示播放中，否则显示就绪
    if (dill1DAnimationState.isPlaying) {
        updateDill1DAnimationStatus(`播放中: 第${frameIndex + 1}/${dill1DAnimationState.totalFrames}帧 (t=${timeValue.toFixed(2)}s)`);
    } else {
        updateDill1DAnimationStatus(`就绪: 第${frameIndex + 1}/${dill1DAnimationState.totalFrames}帧 (t=${timeValue.toFixed(2)}s)`);
    }
    
    console.log('✅ DILL 1D动画帧更新完成');
}

function updateDill1DTimeSlider(frameIndex) {
    const timeSlider = document.getElementById('dill-1d-time-slider');
    if (timeSlider) {
        timeSlider.value = frameIndex;
        timeSlider.max = dill1DAnimationState.totalFrames - 1;
    }
}

function updateDill1DTimeDisplay(timeValue, frameIndex) {
    // 更新时间显示
    const timeDisplay = document.getElementById('dill-1d-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = `t = ${timeValue.toFixed(2)}s`;
    }
    
    // 更新帧信息显示
    const frameInfo = document.getElementById('dill-1d-frame-info');
    if (frameInfo) {
        frameInfo.textContent = `帧 ${frameIndex + 1}/${dill1DAnimationState.totalFrames}`;
    }
}

// DILL模型4D动画播放控制函数
function playDill4DAnimation() {
    if (dill4DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!dill4DAnimationState.loopEnabled && dill4DAnimationState.currentFrame >= dill4DAnimationState.totalFrames - 1) {
        resetDill4DAnimation();
    }
    
    dill4DAnimationState.isPlaying = true;
    updateDill4DAnimationStatus('动画播放中...');
    
    const playBtn = document.getElementById('dill-4d-play-btn');
    const pauseBtn = document.getElementById('dill-4d-pause-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    dill4DAnimationState.intervalId = setInterval(() => {
        let nextFrame = dill4DAnimationState.currentFrame + 1;
        
        if (nextFrame >= dill4DAnimationState.totalFrames) {
            if (dill4DAnimationState.loopEnabled) {
                nextFrame = 0; // 循环播放
            } else {
                pauseDill4DAnimation(); // 播放到结尾则暂停
                dill4DAnimationState.currentFrame = dill4DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateDill4DAnimationFrame(dill4DAnimationState.currentFrame);
                return;
            }
        }
        
        dill4DAnimationState.currentFrame = nextFrame;
        updateDill4DAnimationFrame(dill4DAnimationState.currentFrame);
    }, 200);
}

function pauseDill4DAnimation() {
    if (!dill4DAnimationState.isPlaying) return;
    dill4DAnimationState.isPlaying = false;
    clearInterval(dill4DAnimationState.intervalId);
    dill4DAnimationState.intervalId = null;
    updateDill4DAnimationStatus('动画已暂停');
    
    const playBtn = document.getElementById('dill-4d-play-btn');
    const pauseBtn = document.getElementById('dill-4d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
}

function resetDill4DAnimation() {
    pauseDill4DAnimation(); // 先暂停
    dill4DAnimationState.currentFrame = 0;
    updateDill4DAnimationFrame(0);
    updateDill4DAnimationStatus('动画已重置');
}

function toggleDill4DLoop() {
    dill4DAnimationState.loopEnabled = !dill4DAnimationState.loopEnabled;
    const loopBtn = document.getElementById('dill-4d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (dill4DAnimationState.loopEnabled) {
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
}

// 增强DILL模型4D动画播放控制函数（类似实现）
function playEnhancedDill4DAnimation() {
    if (enhancedDill4DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!enhancedDill4DAnimationState.loopEnabled && enhancedDill4DAnimationState.currentFrame >= enhancedDill4DAnimationState.totalFrames - 1) {
        resetEnhancedDill4DAnimation();
    }
    
    enhancedDill4DAnimationState.isPlaying = true;
    updateEnhancedDill4DAnimationStatus('动画播放中...');
    
    const playBtn = document.getElementById('enhanced-dill-4d-play-btn');
    const pauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    enhancedDill4DAnimationState.intervalId = setInterval(() => {
        let nextFrame = enhancedDill4DAnimationState.currentFrame + 1;
        
        if (nextFrame >= enhancedDill4DAnimationState.totalFrames) {
            if (enhancedDill4DAnimationState.loopEnabled) {
                nextFrame = 0; // 循环播放
            } else {
                pauseEnhancedDill4DAnimation(); // 播放到结尾则暂停
                enhancedDill4DAnimationState.currentFrame = enhancedDill4DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateEnhancedDill4DAnimationFrame(enhancedDill4DAnimationState.currentFrame);
                return;
            }
        }
        
        enhancedDill4DAnimationState.currentFrame = nextFrame;
        updateEnhancedDill4DAnimationFrame(enhancedDill4DAnimationState.currentFrame);
    }, 200);
}

function pauseEnhancedDill4DAnimation() {
    if (!enhancedDill4DAnimationState.isPlaying) return;
    enhancedDill4DAnimationState.isPlaying = false;
    clearInterval(enhancedDill4DAnimationState.intervalId);
    enhancedDill4DAnimationState.intervalId = null;
    updateEnhancedDill4DAnimationStatus('动画已暂停');
    
    const playBtn = document.getElementById('enhanced-dill-4d-play-btn');
    const pauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
}

function resetEnhancedDill4DAnimation() {
    pauseEnhancedDill4DAnimation(); // 先暂停
    enhancedDill4DAnimationState.currentFrame = 0;
    updateEnhancedDill4DAnimationFrame(0);
    updateEnhancedDill4DAnimationStatus('动画已重置');
}

function toggleEnhancedDill4DLoop() {
    enhancedDill4DAnimationState.loopEnabled = !enhancedDill4DAnimationState.loopEnabled;
    const loopBtn = document.getElementById('enhanced-dill-4d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (enhancedDill4DAnimationState.loopEnabled) {
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
}

// 状态更新函数
function updateDill4DAnimationStatus(status) {
    const statusElement = document.querySelector('#dill-4d-animation-section .animation-status span');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function updateEnhancedDill4DAnimationStatus(status) {
    const statusElement = document.querySelector('#enhanced-dill-4d-animation-section .animation-status span');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * 设置DILL模型4D动画界面
 */
function setupDill4DAnimationUI() {
    const plotContainer = document.getElementById('dill-4d-animation-container');
    if (!plotContainer) {
        console.error('DILL模型：未找到4D动画容器');
        return;
    }
    
    // 清空容器，生成正确的图表ID
    plotContainer.innerHTML = `
        <div class="car-4d-plot-container">
            <h3>光强度分布 (3D+时间)</h3>
            <div id="dill-4d-exposure" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>光刻胶厚度分布 (3D+时间)</h3>
            <div id="dill-4d-thickness" class="car-4d-plot"></div>
        </div>
    `;
    
    // 重新绑定控制按钮事件
    setupDill4DAnimationEventListeners();
}

/**
 * 设置Enhanced DILL模型4D动画界面
 */
function setupEnhancedDill4DAnimationUI() {
    console.log('设置Enhanced DILL模型4D动画界面');
    
    const plotContainer = document.getElementById('enhanced-dill-4d-animation-container');
    if (!plotContainer) {
        console.error('Enhanced DILL模型：未找到4D动画容器 #enhanced-dill-4d-animation-container');
        return;
    }
    
    console.log('找到Enhanced DILL 4D动画容器，开始设置UI');
    
    // 清空容器，生成正确的图表ID
    plotContainer.innerHTML = `
        <div class="car-4d-plot-container">
            <h3>光强度分布 (3D+时间)</h3>
            <div id="enhanced-dill-4d-exposure" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>光刻胶厚度分布 (3D+时间)</h3>
            <div id="enhanced-dill-4d-thickness" class="car-4d-plot"></div>
        </div>
    `;
    
    console.log('Enhanced DILL 4D动画UI内容已设置');
    
    // 重新绑定控制按钮事件
    setupEnhancedDill4DAnimationEventListeners();
    
    console.log('Enhanced DILL 4D动画UI设置完成');
}

// 添加动画帧更新函数
function updateDill4DAnimationFrame(frameIndex) {
    if (!dill4DAnimationData) {
        console.error('DILL模型：无4D动画数据');
        return;
    }
    
    console.log('🎬 DILL 4D动画帧更新开始:', {
        'frameIndex': frameIndex,
        'sine_type': dill4DAnimationData.sine_type,
        'is_3d': dill4DAnimationData.is_3d,
        'is_2d': dill4DAnimationData.is_2d,
        'is_1d': dill4DAnimationData.is_1d,
        'available_keys': Object.keys(dill4DAnimationData),
        'x_coords_length': dill4DAnimationData.x_coords?.length,
        'y_coords_length': dill4DAnimationData.y_coords?.length,
        'z_coords_length': dill4DAnimationData.z_coords?.length,
        'exposure_frames_length': dill4DAnimationData.exposure_dose_frames?.length,
        'thickness_frames_length': dill4DAnimationData.thickness_frames?.length,
        'time_array_length': dill4DAnimationData.time_array?.length
    });
    
    const exposureFrames = dill4DAnimationData.exposure_dose_frames || dill4DAnimationData.exposure_frames;
    const thicknessFrames = dill4DAnimationData.thickness_frames;
    const timeArray = dill4DAnimationData.time_array;
    
    if (!exposureFrames || frameIndex >= exposureFrames.length) {
        console.error(`DILL模型：无效的帧索引(${frameIndex})，总帧数: ${exposureFrames ? exposureFrames.length : 0}`);
        return;
    }
    
    // 获取当前帧的时间值
    const timeValue = timeArray ? timeArray[frameIndex] : frameIndex;
    
    // 配置Plotly选项
    const plotlyConfig = {
        responsive: true,
        toImageButtonOptions: {
            format: 'png',
            filename: `dill_4d_frame_${frameIndex}`,
            scale: 1,
            width: 800,
            height: 600
        }
    };
    
    console.log(`📊 开始更新第${frameIndex}帧 (t=${timeValue.toFixed(2)}s)`);
    
    // 根据不同的数据维度类型处理
    const sineType = dill4DAnimationData.sine_type;
    
    try {
        if (sineType === '3d' && dill4DAnimationData.is_3d) {
            // 3D模式 - 需要处理3D数组数据
            console.log('🔮 处理3D模式数据');
            update3DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } else if (sineType === 'multi' && dill4DAnimationData.is_2d) {
            // 2D模式 - 处理2D数组数据
            console.log('🌐 处理2D模式数据');
            update2DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } else if (sineType === '1d' && dill4DAnimationData.is_1d) {
            // 1D模式 - 处理1D数组数据
            console.log('📈 处理1D模式数据');
            update1DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } else {
            console.warn('⚠️ 未知的数据类型，尝试通用处理');
            // 通用处理逻辑
            updateGenericDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        }
        
        // 更新时间轴进度条（如果存在）
        updateDill4DTimeSlider(frameIndex);
        
        console.log(`✅ 第${frameIndex}帧更新完成`);
        
    } catch (error) {
        console.error(`❌ 更新第${frameIndex}帧时出错:`, error);
        console.error('错误堆栈:', error.stack);
        
        // 尝试降级处理
        try {
            console.log('🔄 尝试降级处理...');
            updateGenericDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } catch (fallbackError) {
            console.error('❌ 降级处理也失败:', fallbackError);
        }
    }
}

// 3D数据处理函数
function update3DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('🔮 3D数据处理开始');
    
    // 公共3D布局设置
    const common3DLayout = {
        scene: {
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 }
            },
            aspectmode: 'cube'
        },
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 40 }
    };
    
    // 处理曝光剂量数据
    if (exposureFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        let surfaceZ = exposureFrames[frameIndex];
        
        console.log('🔍 曝光数据结构分析:', {
            'surfaceZ类型': typeof surfaceZ,
            'surfaceZ长度': Array.isArray(surfaceZ) ? surfaceZ.length : 'N/A',
            '第一级维度': Array.isArray(surfaceZ) && surfaceZ[0] ? (Array.isArray(surfaceZ[0]) ? surfaceZ[0].length : typeof surfaceZ[0]) : 'N/A',
            '第二级维度': Array.isArray(surfaceZ) && surfaceZ[0] && Array.isArray(surfaceZ[0]) && surfaceZ[0][0] ? (Array.isArray(surfaceZ[0][0]) ? surfaceZ[0][0].length : typeof surfaceZ[0][0]) : 'N/A'
        });
        
        // 处理3D数组数据，转换为surface格式
        if (Array.isArray(surfaceZ) && Array.isArray(surfaceZ[0]) && Array.isArray(surfaceZ[0][0])) {
            console.log('🔄 转换3D数组为surface格式');
            const midZ = Math.floor(surfaceZ[0][0].length / 2);
            const surface2D = [];
            
            // 转换为适合plotly surface的格式
            for (let y = 0; y < surfaceZ[0].length; y++) {
                const row = [];
                for (let x = 0; x < surfaceZ.length; x++) {
                    row.push(surfaceZ[x][y][midZ]);
                }
                surface2D.push(row);
            }
            surfaceZ = surface2D;
            console.log(`✅ 3D数据转换完成，取Z切片[${midZ}]，结果维度: ${surface2D.length}x${surface2D[0]?.length}`);
        }
        
        const exposureData = [{
            type: 'surface',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: surfaceZ,
            colorscale: 'Viridis',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>光强度: %{z}<extra></extra>'
        }];
        
        const exposureLayout = {
            ...common3DLayout,
            title: `光强度分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'Z 位置 (μm)' },
                yaxis: { title: 'Y 位置 (μm)' },
                zaxis: { title: '光强度' }
            }
        };
        
        Plotly.newPlot('dill-4d-exposure', exposureData, exposureLayout, plotlyConfig);
        console.log('✅ 3D曝光图表更新完成');
    }
    
    // 处理厚度数据
    if (thicknessFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        let thicknessSurfaceZ = thicknessFrames[frameIndex];
        
        // 处理3D数组数据
        if (Array.isArray(thicknessSurfaceZ) && Array.isArray(thicknessSurfaceZ[0]) && Array.isArray(thicknessSurfaceZ[0][0])) {
            console.log('🔄 转换3D厚度数组为surface格式');
            const midZ = Math.floor(thicknessSurfaceZ[0][0].length / 2);
            const surface2D = [];
            
            for (let y = 0; y < thicknessSurfaceZ[0].length; y++) {
                const row = [];
                for (let x = 0; x < thicknessSurfaceZ.length; x++) {
                    row.push(thicknessSurfaceZ[x][y][midZ]);
                }
                surface2D.push(row);
            }
            thicknessSurfaceZ = surface2D;
            console.log('✅ 3D厚度数据转换完成');
        }
        
        const thicknessData = [{
            type: 'surface',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: thicknessSurfaceZ,
            colorscale: 'RdYlBu',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>厚度: %{z}<extra></extra>'
        }];
        
        const thicknessLayout = {
            ...common3DLayout,
            title: `光刻胶厚度分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'Z 位置 (μm)' },
                yaxis: { title: 'Y 位置 (μm)' },
                zaxis: { title: '厚度 (μm)' }
            }
        };
        
        Plotly.newPlot('dill-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
        console.log('✅ 3D厚度图表更新完成');
    }
}

// 2D数据处理函数
function update2DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('🌐 2D数据处理开始');
    
    // 处理曝光剂量数据 - 2D热图
    if (exposureFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        const exposureData = [{
            type: 'heatmap',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: exposureFrames[frameIndex],
            colorscale: 'Viridis',
            hoverongaps: false,
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>光强度: %{z}<extra></extra>'
        }];
        
        const exposureLayout = {
            title: `光强度分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: 'Y 位置 (μm)' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-exposure', exposureData, exposureLayout, plotlyConfig);
        console.log('✅ 2D曝光热图更新完成');
    }
    
    // 处理厚度数据 - 2D热图
    if (thicknessFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        const thicknessData = [{
            type: 'heatmap',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: thicknessFrames[frameIndex],
            colorscale: 'RdYlBu',
            hoverongaps: false,
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>厚度: %{z}<extra></extra>'
        }];
        
        const thicknessLayout = {
            title: `光刻胶厚度分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: 'Y 位置 (μm)' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
        console.log('✅ 2D厚度热图更新完成');
    }
}

// 1D数据处理函数
function update1DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('📈 1D数据处理开始');
    
    // 处理曝光剂量数据 - 1D线图
    if (exposureFrames && dill4DAnimationData.x_coords) {
        const exposureData = [{
            type: 'scatter',
            mode: 'lines+markers',
            x: dill4DAnimationData.x_coords,
            y: exposureFrames[frameIndex],
            line: { color: '#3498db', width: 3 },
            marker: { size: 5 },
            name: '光强度',
            hovertemplate: 'X: %{x}<br>光强度: %{y}<extra></extra>'
        }];
        
        const exposureLayout = {
            title: `光强度分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: '光强度' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-exposure', exposureData, exposureLayout, plotlyConfig);
        console.log('✅ 1D曝光线图更新完成');
    }
    
    // 处理厚度数据 - 1D线图
    if (thicknessFrames && dill4DAnimationData.x_coords) {
        const thicknessData = [{
            type: 'scatter',
            mode: 'lines+markers',
            x: dill4DAnimationData.x_coords,
            y: thicknessFrames[frameIndex],
            line: { color: '#e74c3c', width: 3 },
            marker: { size: 5 },
            name: '厚度',
            hovertemplate: 'X: %{x}<br>厚度: %{y}<extra></extra>'
        }];
        
        const thicknessLayout = {
            title: `光刻胶厚度分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: '厚度 (μm)' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
        console.log('✅ 1D厚度线图更新完成');
    }
}

// 通用数据处理函数（降级处理）
function updateGenericDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('🔧 通用数据处理开始（降级模式）');
    
    // 尝试自动检测数据格式
    const exposureFrame = exposureFrames[frameIndex];
    const thicknessFrame = thicknessFrames?.[frameIndex];
    
    console.log('🔍 自动检测数据格式:', {
        'exposureFrame类型': typeof exposureFrame,
        'exposureFrame长度': Array.isArray(exposureFrame) ? exposureFrame.length : 'N/A',
        'is嵌套数组': Array.isArray(exposureFrame) && Array.isArray(exposureFrame[0])
    });
    
    // 判断是1D、2D还是3D数据
    if (Array.isArray(exposureFrame)) {
        if (Array.isArray(exposureFrame[0])) {
            if (Array.isArray(exposureFrame[0][0])) {
                // 3D数据
                console.log('🔮 检测为3D数据，使用3D处理方式');
                update3DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
            } else {
                // 2D数据
                console.log('🌐 检测为2D数据，使用2D处理方式');
                update2DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
            }
        } else {
            // 1D数据
            console.log('📈 检测为1D数据，使用1D处理方式');
            update1DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        }
    } else {
        console.error('❌ 无法识别的数据格式');
    }
}

// 时间轴滑块更新函数
function updateDill4DTimeSlider(frameIndex) {
    const slider = document.getElementById('dill-4d-time-slider');
    if (slider) {
        slider.value = frameIndex;
        
        // 更新滑块显示
        const sliderDisplay = document.getElementById('dill-4d-time-display');
        if (sliderDisplay && dill4DAnimationData.time_array) {
            const timeValue = dill4DAnimationData.time_array[frameIndex];
            sliderDisplay.textContent = `t = ${timeValue.toFixed(2)}s`;
        }
        
        // 更新帧数信息显示
        const frameInfo = document.getElementById('dill-4d-frame-info');
        if (frameInfo && dill4DAnimationData) {
            const totalFrames = dill4DAnimationData.time_steps || 
                               (dill4DAnimationData.exposure_dose_frames ? dill4DAnimationData.exposure_dose_frames.length : 20);
            frameInfo.textContent = `帧 ${frameIndex + 1}/${totalFrames}`;
        }
    }
}

function updateEnhancedDill4DAnimationFrame(frameIndex) {
    console.log(`更新Enhanced DILL 4D动画帧: ${frameIndex}`);
    
    if (!enhancedDill4DAnimationData) {
        console.error('Enhanced DILL模型：无4D动画数据');
        return;
    }
    
    console.log('Enhanced DILL 4D动画数据调试:', {
        'enhancedDill4DAnimationData keys': Object.keys(enhancedDill4DAnimationData),
        'x_coords': enhancedDill4DAnimationData.x_coords ? `length=${enhancedDill4DAnimationData.x_coords.length}` : 'undefined',
        'y_coords': enhancedDill4DAnimationData.y_coords ? `length=${enhancedDill4DAnimationData.y_coords.length}` : 'undefined',
        'z_coords': enhancedDill4DAnimationData.z_coords ? `length=${enhancedDill4DAnimationData.z_coords.length}` : 'undefined',
        'exposure_dose_frames': enhancedDill4DAnimationData.exposure_dose_frames ? `length=${enhancedDill4DAnimationData.exposure_dose_frames.length}` : 'undefined',
        'thickness_frames': enhancedDill4DAnimationData.thickness_frames ? `length=${enhancedDill4DAnimationData.thickness_frames.length}` : 'undefined',
        'frameIndex': frameIndex,
        'sine_type': enhancedDill4DAnimationData.sine_type,
        'is_3d': enhancedDill4DAnimationData.is_3d
    });
    
    const exposureFrames = enhancedDill4DAnimationData.exposure_dose_frames;
    const thicknessFrames = enhancedDill4DAnimationData.thickness_frames;
    const timeArray = enhancedDill4DAnimationData.time_array;
    
    if (!exposureFrames || frameIndex >= exposureFrames.length) {
        console.warn(`Enhanced DILL模型：帧索引超出范围(${frameIndex})，总帧数: ${exposureFrames ? exposureFrames.length : 0}`);
        return;
    }
    
    // 获取当前帧的时间值
    const timeValue = timeArray ? timeArray[frameIndex] : frameIndex * 0.25;
    
    // 配置Plotly选项
    const plotlyConfig = {
        responsive: true,
        toImageButtonOptions: {
            format: 'png',
            filename: `enhanced_dill_4d_frame_${frameIndex}`,
            scale: 1,
            width: 800,
            height: 600
        }
    };
    
    // 公共3D布局设置
    const common3DLayout = {
        scene: {
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 }
            },
            aspectmode: 'cube'
        },
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 40 }
    };
    
    // 获取当前帧的完整3D数据
    const currentExposureFrame = exposureFrames[frameIndex];
    const currentThicknessFrame = thicknessFrames[frameIndex];
    
    // 1. 更新曝光剂量3D分布图
    if (currentExposureFrame && enhancedDill4DAnimationData.x_coords && enhancedDill4DAnimationData.y_coords && enhancedDill4DAnimationData.z_coords) {
        const exposureContainer = document.getElementById('enhanced-dill-4d-exposure');
        if (exposureContainer) {
            try {
                // 处理3D数据：创建多个Z层的surface
                const exposureTraces = [];
                const zCoords = enhancedDill4DAnimationData.z_coords;
                const xCoords = enhancedDill4DAnimationData.x_coords;
                const yCoords = enhancedDill4DAnimationData.y_coords;
                
                // 显示多个Z层（表面、中间、底部）
                // 可配置选项：用户可以选择显示模式
                const layerDisplayMode = window.enhancedDillLayerMode || 'multi'; // 'single', 'multi', 'all'
                
                let zIndices, layerNames, opacities;
                
                if (layerDisplayMode === 'single') {
                    // 仅显示表面层
                    zIndices = [0];
                    layerNames = ['表面'];
                    opacities = [0.9];
                } else if (layerDisplayMode === 'all') {
                    // 显示所有层（密集显示）
                    zIndices = Array.from({length: Math.min(zCoords.length, 5)}, (_, i) => 
                        Math.floor(i * (zCoords.length - 1) / 4));
                    layerNames = zIndices.map((idx, i) => `层${i+1} (z=${zCoords[idx].toFixed(2)}μm)`);
                    opacities = zIndices.map((_, i) => 0.9 - i * 0.15);
                } else {
                    // 默认多层显示（表面、中间、底部）
                    zIndices = [0, Math.floor(zCoords.length / 2), zCoords.length - 1];
                    layerNames = ['表面', '中间', '底部'];
                    opacities = [0.9, 0.6, 0.3];
                }
                
                for (let layerIdx = 0; layerIdx < zIndices.length; layerIdx++) {
                    const zIdx = zIndices[layerIdx];
                    const layerData = currentExposureFrame[zIdx];
                    
                    if (layerData && layerData.length > 0) {
                        // 确保数据正确转置（数据格式为[z][y][x]）
                        const surfaceZ = [];
                        for (let yIdx = 0; yIdx < yCoords.length; yIdx++) {
                            const row = [];
                            for (let xIdx = 0; xIdx < xCoords.length; xIdx++) {
                                if (layerData[yIdx] && layerData[yIdx][xIdx] !== undefined) {
                                    row.push(layerData[yIdx][xIdx]);
                                } else {
                                    row.push(0);
                                }
                            }
                            surfaceZ.push(row);
                        }
                        
                        exposureTraces.push({
                            type: 'surface',
                            x: xCoords,
                            y: yCoords,
                            z: surfaceZ,
                            colorscale: layerIdx === 0 ? 'Viridis' : 'Hot',
                            opacity: opacities[layerIdx],
                            name: `${layerNames[layerIdx]} (z=${zCoords[zIdx].toFixed(2)}μm)`,
                            showscale: layerIdx === 0,
                            contours: {
                                z: {
                                    show: true,
                                    usecolormap: true,
                                    highlightcolor: "#42f462",
                                    project: { z: false }
                                }
                            },
                            hovertemplate: `X: %{x}<br>Y: %{y}<br>曝光剂量: %{z}<br>深度: ${zCoords[zIdx].toFixed(2)}μm<extra>${layerNames[layerIdx]}</extra>`
                        });
                    }
                }
                
                const exposureLayout = {
                    ...common3DLayout,
                    title: `曝光剂量分布 (t=${timeValue.toFixed(2)}s) - 多层显示`,
                    scene: {
                        ...common3DLayout.scene,
                        xaxis: { title: 'Z 位置 (μm)' },
                        yaxis: { title: 'Y 位置 (μm)' },
                        zaxis: { title: '曝光剂量 (mJ/cm²)' }
                    }
                };
                
                Plotly.newPlot('enhanced-dill-4d-exposure', exposureTraces, exposureLayout, plotlyConfig);
                console.log(`Enhanced DILL 4D动画：曝光剂量3D分布图更新成功 (帧${frameIndex})`);
            } catch (error) {
                console.error('Enhanced DILL 4D动画：曝光剂量分布图更新失败:', error);
                
                // 回退到表面显示
                try {
                    const surfaceData = currentExposureFrame[0]; // 表面数据
                    if (surfaceData) {
                        const surfaceZ = [];
                        for (let yIdx = 0; yIdx < enhancedDill4DAnimationData.y_coords.length; yIdx++) {
                            const row = [];
                            for (let xIdx = 0; xIdx < enhancedDill4DAnimationData.x_coords.length; xIdx++) {
                                row.push(surfaceData[yIdx] ? surfaceData[yIdx][xIdx] || 0 : 0);
                            }
                            surfaceZ.push(row);
                        }
                        
                        const fallbackTrace = [{
                            type: 'surface',
                            x: enhancedDill4DAnimationData.x_coords,
                            y: enhancedDill4DAnimationData.y_coords,
                            z: surfaceZ,
                            colorscale: 'Viridis',
                            hovertemplate: 'X: %{x}<br>Y: %{y}<br>曝光剂量: %{z}<extra>表面</extra>'
                        }];
                        
                        const fallbackLayout = {
                            ...common3DLayout,
                            title: `曝光剂量分布 (t=${timeValue.toFixed(2)}s) - 表面`,
                            scene: {
                                ...common3DLayout.scene,
                                xaxis: { title: 'Z 位置 (μm)' },
                                yaxis: { title: 'Y 位置 (μm)' },
                                zaxis: { title: '曝光剂量 (mJ/cm²)' }
                            }
                        };
                        
                        Plotly.newPlot('enhanced-dill-4d-exposure', fallbackTrace, fallbackLayout, plotlyConfig);
                        console.log(`Enhanced DILL 4D动画：使用表面数据回退显示成功`);
                    }
                } catch (fallbackError) {
                    console.error('Enhanced DILL 4D动画：表面数据回退也失败:', fallbackError);
                }
            }
        }
    }
    
    // 2. 更新厚度3D分布图
    if (currentThicknessFrame && enhancedDill4DAnimationData.x_coords && enhancedDill4DAnimationData.y_coords && enhancedDill4DAnimationData.z_coords) {
        const thicknessContainer = document.getElementById('enhanced-dill-4d-thickness');
        if (thicknessContainer) {
            try {
                // 处理3D厚度数据：创建多个Z层的surface
                const thicknessTraces = [];
                const zCoords = enhancedDill4DAnimationData.z_coords;
                const xCoords = enhancedDill4DAnimationData.x_coords;
                const yCoords = enhancedDill4DAnimationData.y_coords;
                
                // 显示多个Z层（表面、中间、底部）
                // 使用与曝光剂量相同的配置选项
                const layerDisplayMode = window.enhancedDillLayerMode || 'multi'; // 'single', 'multi', 'all'
                
                let zIndices, layerNames, opacities, colorscales;
                
                if (layerDisplayMode === 'single') {
                    // 仅显示表面层
                    zIndices = [0];
                    layerNames = ['表面'];
                    opacities = [0.9];
                    colorscales = ['Plasma'];
                } else if (layerDisplayMode === 'all') {
                    // 显示所有层（密集显示）
                    zIndices = Array.from({length: Math.min(zCoords.length, 5)}, (_, i) => 
                        Math.floor(i * (zCoords.length - 1) / 4));
                    layerNames = zIndices.map((idx, i) => `层${i+1} (z=${zCoords[idx].toFixed(2)}μm)`);
                    opacities = zIndices.map((_, i) => 0.9 - i * 0.15);
                    colorscales = ['Plasma', 'Cividis', 'Rainbow', 'Viridis', 'Hot'];
                } else {
                    // 默认多层显示（表面、中间、底部）
                    zIndices = [0, Math.floor(zCoords.length / 2), zCoords.length - 1];
                    layerNames = ['表面', '中间', '底部'];
                    opacities = [0.9, 0.6, 0.3];
                    colorscales = ['Plasma', 'Cividis', 'Rainbow'];
                }
                
                for (let layerIdx = 0; layerIdx < zIndices.length; layerIdx++) {
                    const zIdx = zIndices[layerIdx];
                    const layerData = currentThicknessFrame[zIdx];
                    
                    if (layerData && layerData.length > 0) {
                        // 确保数据正确转置（数据格式为[z][y][x]）
                        const surfaceZ = [];
                        for (let yIdx = 0; yIdx < yCoords.length; yIdx++) {
                            const row = [];
                            for (let xIdx = 0; xIdx < xCoords.length; xIdx++) {
                                if (layerData[yIdx] && layerData[yIdx][xIdx] !== undefined) {
                                    row.push(layerData[yIdx][xIdx]);
                                } else {
                                    row.push(0);
                                }
                            }
                            surfaceZ.push(row);
                        }
                        
                        thicknessTraces.push({
                            type: 'surface',
                            x: xCoords,
                            y: yCoords,
                            z: surfaceZ,
                            colorscale: colorscales[layerIdx],
                            opacity: opacities[layerIdx],
                            name: `${layerNames[layerIdx]} (z=${zCoords[zIdx].toFixed(2)}μm)`,
                            showscale: layerIdx === 0,
                            contours: {
                                z: {
                                    show: true,
                                    usecolormap: true,
                                    highlightcolor: "#ff6b6b",
                                    project: { z: false }
                                }
                            },
                            hovertemplate: `X: %{x}<br>Y: %{y}<br>厚度: %{z}<br>深度: ${zCoords[zIdx].toFixed(2)}μm<extra>${layerNames[layerIdx]}</extra>`
                        });
                    }
                }
                
                const thicknessLayout = {
                    ...common3DLayout,
                    title: `厚度分布 (t=${timeValue.toFixed(2)}s) - 多层显示`,
                    scene: {
                        ...common3DLayout.scene,
                        xaxis: { title: 'Z 位置 (μm)' },
                        yaxis: { title: 'Y 位置 (μm)' },
                        zaxis: { title: '相对厚度' }
                    }
                };
                
                Plotly.newPlot('enhanced-dill-4d-thickness', thicknessTraces, thicknessLayout, plotlyConfig);
                console.log(`Enhanced DILL 4D动画：厚度3D分布图更新成功 (帧${frameIndex})`);
            } catch (error) {
                console.error('Enhanced DILL 4D动画：厚度分布图更新失败:', error);
            }
        }
    }
    
    // 3. 更新时间显示和进度条
    const timeDisplay = document.getElementById('enhanced-dill-4d-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = `t = ${timeValue.toFixed(2)}s`;
    }
    
    const progressSlider = document.getElementById('enhanced-dill-4d-time-slider');
    if (progressSlider) {
        progressSlider.value = frameIndex;
        progressSlider.max = enhancedDill4DAnimationData.time_steps - 1;
    }
    
    const frameInfo = document.getElementById('enhanced-dill-4d-frame-info');
    if (frameInfo) {
        frameInfo.textContent = `帧 ${frameIndex + 1}/${enhancedDill4DAnimationData.time_steps}`;
    }
    
    console.log(`Enhanced DILL 4D动画：帧${frameIndex}更新完成，时间=${timeValue.toFixed(2)}s`)
}

// 防抖函数
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 防抖的帧更新函数
const debouncedUpdateDillFrame = debounce((frameIndex) => {
    updateDill4DAnimationFrame(frameIndex);
}, 100);

// 重新绑定DILL模型4D动画控制事件
function setupDill4DAnimationEventListeners() {
    const playBtn = document.getElementById('dill-4d-play-btn');
    const pauseBtn = document.getElementById('dill-4d-pause-btn');
    const resetBtn = document.getElementById('dill-4d-reset-btn');
    const loopBtn = document.getElementById('dill-4d-loop-btn');
    const timeSlider = document.getElementById('dill-4d-time-slider');
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('dill-4d-play-btn');
        newPlayBtn.addEventListener('click', function() {
            if (dill4DAnimationData) {
                playDill4DAnimation();
            } else {
                alert('请先计算DILL模型数据以启用4D动画');
            }
        });
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('dill-4d-pause-btn');
        newPauseBtn.addEventListener('click', pauseDill4DAnimation);
    }
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('dill-4d-reset-btn');
        newResetBtn.addEventListener('click', resetDill4DAnimation);
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('dill-4d-loop-btn');
        newLoopBtn.addEventListener('click', toggleDill4DLoop);
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('dill-4d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            if (isUpdating) return;
            // 暂停当前动画
            pauseDill4DAnimation();
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            dill4DAnimationState.currentFrame = frameIndex;
            debouncedUpdateDillFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            const frameIndex = parseInt(this.value);
            dill4DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateDill4DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
    }
}

// 防抖的Enhanced帧更新函数
const debouncedUpdateEnhancedDillFrame = debounce((frameIndex) => {
    updateEnhancedDill4DAnimationFrame(frameIndex);
}, 100);

// 重新绑定Enhanced DILL模型4D动画控制事件
function setupEnhancedDill4DAnimationEventListeners() {
    console.log('设置Enhanced DILL 4D动画事件监听器');
    
    const playBtn = document.getElementById('enhanced-dill-4d-play-btn');
    const pauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
    const resetBtn = document.getElementById('enhanced-dill-4d-reset-btn');
    const loopBtn = document.getElementById('enhanced-dill-4d-loop-btn');
    const timeSlider = document.getElementById('enhanced-dill-4d-time-slider');
    
    console.log('Enhanced DILL 4D动画按钮状态:', {
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn,
        resetBtn: !!resetBtn,
        loopBtn: !!loopBtn,
        timeSlider: !!timeSlider
    });
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('enhanced-dill-4d-play-btn');
        newPlayBtn.addEventListener('click', function() {
            console.log('Enhanced DILL 4D动画播放按钮被点击');
            if (enhancedDill4DAnimationData) {
                playEnhancedDill4DAnimation();
            } else {
                console.warn('Enhanced DILL 4D动画数据不存在');
                alert('请先计算增强DILL模型数据以启用4D动画');
            }
        });
        console.log('Enhanced DILL 4D动画播放按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画播放按钮未找到');
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
        newPauseBtn.addEventListener('click', pauseEnhancedDill4DAnimation);
        console.log('Enhanced DILL 4D动画暂停按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画暂停按钮未找到');
    }
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('enhanced-dill-4d-reset-btn');
        newResetBtn.addEventListener('click', resetEnhancedDill4DAnimation);
        console.log('Enhanced DILL 4D动画重置按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画重置按钮未找到');
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('enhanced-dill-4d-loop-btn');
        newLoopBtn.addEventListener('click', toggleEnhancedDill4DLoop);
        console.log('Enhanced DILL 4D动画循环按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画循环按钮未找到');
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('enhanced-dill-4d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            if (isUpdating) return;
            // 暂停当前动画
            pauseEnhancedDill4DAnimation();
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            enhancedDill4DAnimationState.currentFrame = frameIndex;
            debouncedUpdateEnhancedDillFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            const frameIndex = parseInt(this.value);
            enhancedDill4DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateEnhancedDill4DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
        console.log('Enhanced DILL 4D动画时间滑块事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画时间滑块未找到');
    }
    
    console.log('Enhanced DILL 4D动画事件监听器设置完成');
}

// 防抖的1D帧更新函数
const debouncedUpdateDill1DFrame = debounce((frameIndex) => {
    updateDill1DAnimationFrame(frameIndex);
}, 100);

// 设置DILL模型1D动画控制事件监听器
function setupDill1DAnimationEventListeners() {
    console.log('设置DILL 1D动画事件监听器');
    
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    const resetBtn = document.getElementById('dill-1d-reset-btn');
    const loopBtn = document.getElementById('dill-1d-loop-btn');
    const timeSlider = document.getElementById('dill-1d-time-slider');
    
    console.log('DILL 1D动画按钮状态:', {
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn,
        resetBtn: !!resetBtn,
        loopBtn: !!loopBtn,
        timeSlider: !!timeSlider,
        isPlaying: dill1DAnimationState.isPlaying
    });
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('dill-1d-play-btn');
        newPlayBtn.addEventListener('click', function() {
            console.log('DILL 1D动画播放按钮被点击');
            if (dill1DAnimationState.animationData) {
                playDill1DAnimation();
            } else {
                console.warn('DILL 1D动画数据不存在');
                alert('请先计算DILL模型1D动画数据');
            }
        });
        console.log('DILL 1D动画播放按钮事件已绑定');
    } else {
        console.error('DILL 1D动画播放按钮未找到');
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('dill-1d-pause-btn');
        newPauseBtn.addEventListener('click', function() {
            console.log('DILL 1D动画暂停按钮被点击');
            pauseDill1DAnimation();
        });
        console.log('DILL 1D动画暂停按钮事件已绑定');
    } else {
        console.error('DILL 1D动画暂停按钮未找到');
    }
    
    // 重新设置按钮的正确显示状态
    updateDill1DButtonStates();
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('dill-1d-reset-btn');
        newResetBtn.addEventListener('click', resetDill1DAnimation);
        console.log('DILL 1D动画重置按钮事件已绑定');
    } else {
        console.error('DILL 1D动画重置按钮未找到');
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('dill-1d-loop-btn');
        newLoopBtn.addEventListener('click', toggleDill1DLoop);
        console.log('DILL 1D动画循环按钮事件已绑定');
    } else {
        console.error('DILL 1D动画循环按钮未找到');
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('dill-1d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            console.log('DILL 1D动画时间滑块拖动:', this.value);
            if (isUpdating) return;
            
            // 暂停当前动画
            pauseDill1DAnimation();
            
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            dill1DAnimationState.currentFrame = frameIndex;
            debouncedUpdateDill1DFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            console.log('DILL 1D动画时间滑块选择:', this.value);
            const frameIndex = parseInt(this.value);
            dill1DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateDill1DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
        
        console.log('DILL 1D动画时间滑块事件已绑定');
    } else {
        console.error('DILL 1D动画时间滑块未找到');
    }
    
    console.log('DILL 1D动画事件监听器设置完成');
}

// ================================
// DILL 1D V评估动画控制功能
// ================================

// 设置DILL模型1D V评估控制
function setupDill1DVEvaluationControls() {
    console.log('设置DILL 1D V评估控制');
    
    // 初始化V评估状态
    dill1DVEvaluationState.currentFrame = 0;
    dill1DVEvaluationState.isPlaying = false;
    dill1DVEvaluationState.isLooping = false;
    
    console.log('DILL 1D V评估控制设置完成');
}

// 播放DILL 1D V评估动画
function playDill1DVEvaluation() {
    console.log('开始播放DILL 1D V评估动画');
    
    if (!dill1DVEvaluationState.animationData || dill1DVEvaluationState.animationData.length === 0) {
        console.warn('没有V评估动画数据可播放');
        return;
    }
    
    if (dill1DVEvaluationState.isPlaying) {
        console.log('V评估动画已在播放中');
        return;
    }
    
    dill1DVEvaluationState.isPlaying = true;
    updateDill1DVEvaluationStatus('播放中');
    
    // 切换播放按钮和暂停按钮的显示状态
    const playBtn = document.getElementById('dill-1d-v-play-btn');
    const pauseBtn = document.getElementById('dill-1d-v-pause-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    console.log('V评估动画播放状态:', {
        totalFrames: dill1DVEvaluationState.totalFrames,
        currentFrame: dill1DVEvaluationState.currentFrame,
        isLooping: dill1DVEvaluationState.isLooping
    });
    
    dill1DVEvaluationState.intervalId = setInterval(() => {
        if (dill1DVEvaluationState.currentFrame < dill1DVEvaluationState.totalFrames - 1) {
            dill1DVEvaluationState.currentFrame++;
        } else if (dill1DVEvaluationState.isLooping) {
            dill1DVEvaluationState.currentFrame = 0;
        } else {
            pauseDill1DVEvaluation();
            return;
        }
        
        updateDill1DVEvaluationFrame(dill1DVEvaluationState.currentFrame);
        updateDill1DVEvaluationTimeSlider(dill1DVEvaluationState.currentFrame);
    }, 500); // 500ms间隔，可根据需要调整
}

// 暂停DILL 1D V评估动画
function pauseDill1DVEvaluation() {
    console.log('暂停DILL 1D V评估动画');
    
    if (dill1DVEvaluationState.intervalId) {
        clearInterval(dill1DVEvaluationState.intervalId);
        dill1DVEvaluationState.intervalId = null;
    }
    
    dill1DVEvaluationState.isPlaying = false;
    // 更新当前帧状态为就绪
    const frameData = dill1DVEvaluationState.animationData && dill1DVEvaluationState.animationData[dill1DVEvaluationState.currentFrame];
    if (frameData) {
        updateDill1DVEvaluationStatus(`就绪: 第${dill1DVEvaluationState.currentFrame + 1}/${dill1DVEvaluationState.totalFrames}帧 (V=${frameData.v_value.toFixed(2)})`);
    } else {
        updateDill1DVEvaluationStatus('就绪');
    }
    
    // 切换播放按钮和暂停按钮的显示状态
    const playBtn = document.getElementById('dill-1d-v-play-btn');
    const pauseBtn = document.getElementById('dill-1d-v-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
}

// 重置DILL 1D V评估动画
function resetDill1DVEvaluation() {
    console.log('重置DILL 1D V评估动画');
    pauseDill1DVEvaluation();
    dill1DVEvaluationState.currentFrame = 0;
    updateDill1DVEvaluationFrame(0);
    updateDill1DVEvaluationTimeSlider(0);
    updateDill1DVEvaluationStatus('已重置');
}

// 切换DILL 1D V评估循环模式
function toggleDill1DVEvaluationLoop() {
    dill1DVEvaluationState.isLooping = !dill1DVEvaluationState.isLooping;
    const loopBtn = document.getElementById('dill-1d-v-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (dill1DVEvaluationState.isLooping) {
            // 开启循环时：移除 loop-off 类，显示"关闭循环"
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            // 关闭循环时：添加 loop-off 类，显示"开启循环"
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
    updateDill1DVEvaluationStatus(dill1DVEvaluationState.isLooping ? '已开启循环播放' : '已关闭循环播放');
}

// 更新DILL 1D V评估动画状态显示
function updateDill1DVEvaluationStatus(status) {
    const statusElement = document.getElementById('dill-1d-v-evaluation-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// 更新DILL 1D V评估动画帧
function updateDill1DVEvaluationFrame(frameIndex) {
    console.log(`更新DILL 1D V评估动画帧: ${frameIndex}/${dill1DVEvaluationState.totalFrames - 1}`);
    
    if (!dill1DVEvaluationState.animationData || frameIndex >= dill1DVEvaluationState.animationData.length) {
        console.error('V评估帧索引超出范围或数据不存在:', frameIndex);
        return;
    }
    
    try {
        const frameData = dill1DVEvaluationState.animationData[frameIndex];
        console.log('V评估帧数据:', {
            frameIndex: frameIndex,
            v_value: frameData.v_value,
            x_length: frameData.x ? frameData.x.length : 0,
            exposure_length: frameData.exposure_dose ? frameData.exposure_dose.length : 0,
            thickness_length: frameData.thickness ? frameData.thickness.length : 0
        });
        
        // 获取图表容器
        const exposureContainer = document.getElementById('dill-v-exposure-1d-plot');
        const thicknessContainer = document.getElementById('dill-v-thickness-1d-plot');
        const contrastContainer = document.getElementById('dill-v-comparison-plot');
        
        if (!exposureContainer || !thicknessContainer || !contrastContainer) {
            console.error('V评估图表容器未找到');
            return;
        }
        
        // 构造图表数据
        const plotData = {
            x: frameData.x,
            x_coords: frameData.x,
            exposure_dose: frameData.exposure_dose,
            thickness: frameData.thickness,
            is_1d: true,
            sine_type: '1d'
        };
        
        // 更新曝光剂量图表
        try {
            exposureContainer.innerHTML = '';
            createExposurePlot(exposureContainer, plotData);
            
            // 添加V值标题
            const exposureTitle = exposureContainer.parentElement.querySelector('.v-evaluation-plot-title');
            if (exposureTitle) {
                exposureTitle.textContent = `曝光剂量分布 (V=${frameData.v_value.toFixed(3)})`;
            }
        } catch (error) {
            console.error('更新V评估曝光剂量图表失败:', error);
            exposureContainer.innerHTML = '<div style="color:red;padding:20px;">曝光剂量图表更新失败</div>';
        }
        
        // 更新厚度图表
        try {
            thicknessContainer.innerHTML = '';
            createThicknessPlot(thicknessContainer, plotData);
            
            // 添加V值标题
            const thicknessTitle = thicknessContainer.parentElement.querySelector('.v-evaluation-plot-title');
            if (thicknessTitle) {
                thicknessTitle.textContent = `光刻胶厚度分布 (V=${frameData.v_value.toFixed(3)})`;
            }
        } catch (error) {
            console.error('更新V评估厚度图表失败:', error);
            thicknessContainer.innerHTML = '<div style="color:red;padding:20px;">厚度图表更新失败</div>';
        }
        
        // 更新对比分析图表
        try {
            contrastContainer.innerHTML = '';
            createVEvaluationContrastPlot(contrastContainer, dill1DVEvaluationState.animationData, frameIndex);
        } catch (error) {
            console.error('更新V评估对比分析图表失败:', error);
            contrastContainer.innerHTML = '<div style="color:red;padding:20px;">对比分析图表更新失败</div>';
        }
        
        // 更新V值显示和时间滑块
        updateDill1DVEvaluationVDisplay(frameData.v_value, frameIndex);
        updateDill1DVEvaluationTimeSlider(frameIndex);
        
    } catch (error) {
        console.error('更新V评估动画帧失败:', error);
    }
}

// 创建V评估对比分析图表
function createVEvaluationContrastPlot(container, allFramesData, currentIndex) {
    if (!allFramesData || allFramesData.length === 0) {
        container.innerHTML = '<div style="color:orange;padding:20px;">对比分析数据不足</div>';
        return;
    }
    
    // 提取V值和对应的最大曝光剂量、最大厚度
    const vValues = [];
    const maxExposures = [];
    const maxThicknesses = [];
    
    allFramesData.forEach(frame => {
        vValues.push(frame.v_value);
        maxExposures.push(Math.max(...frame.exposure_dose));
        maxThicknesses.push(Math.max(...frame.thickness));
    });
    
    const trace1 = {
        x: vValues,
        y: maxExposures,
        type: 'scatter',
        mode: 'lines+markers',
        name: '最大曝光剂量',
        line: { color: '#2E86AB', width: 2 },
        marker: { size: 6 }
    };
    
    const trace2 = {
        x: vValues,
        y: maxThicknesses,
        type: 'scatter',
        mode: 'lines+markers',
        name: '最大厚度',
        line: { color: '#A23B72', width: 2 },
        marker: { size: 6 },
        yaxis: 'y2'
    };
    
    // 添加当前V值的竖线
    const currentV = allFramesData[currentIndex].v_value;
    const trace3 = {
        x: [currentV, currentV],
        y: [Math.min(...maxExposures), Math.max(...maxExposures)],
        type: 'scatter',
        mode: 'lines',
        name: `当前V值 (${currentV.toFixed(3)})`,
        line: { color: '#f39c12', width: 3, dash: 'dash' },
        showlegend: true
    };
    
    const layout = {
        title: 'V值对比分析',
        xaxis: { 
            title: 'V值 (对比度)',
            gridcolor: '#e0e0e0'
        },
        yaxis: {
            title: '最大曝光剂量',
            side: 'left',
            gridcolor: '#e0e0e0',
            titlefont: { color: '#2E86AB' },
            tickfont: { color: '#2E86AB' }
        },
        yaxis2: {
            title: '最大厚度',
            side: 'right',
            overlaying: 'y',
            titlefont: { color: '#A23B72' },
            tickfont: { color: '#A23B72' }
        },
        legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(255,255,255,0.8)'
        },
        margin: { l: 60, r: 60, t: 50, b: 50 },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: 'white'
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
    };
    
    Plotly.newPlot(container, [trace1, trace2, trace3], layout, config);
}

// 更新DILL 1D V评估时间滑块
function updateDill1DVEvaluationTimeSlider(frameIndex) {
    const timeSlider = document.getElementById('dill-1d-v-slider');
    if (timeSlider) {
        timeSlider.value = frameIndex;
        
        // 更新滑块的最大值
        if (timeSlider.max != dill1DVEvaluationState.totalFrames - 1) {
            timeSlider.max = dill1DVEvaluationState.totalFrames - 1;
        }
    }
}

// 更新DILL 1D V评估V值显示
function updateDill1DVEvaluationVDisplay(vValue, frameIndex) {
    const vDisplay = document.getElementById('dill-1d-v-display');
    if (vDisplay) {
        vDisplay.textContent = `V = ${vValue.toFixed(2)}`;
    }
    
    const frameInfo = document.getElementById('dill-1d-v-frame-info');
    if (frameInfo) {
        frameInfo.textContent = `帧 ${frameIndex + 1}/${dill1DVEvaluationState.totalFrames}`;
    }
}

// 防抖的V评估帧更新函数
const debouncedUpdateDill1DVEvaluationFrame = debounce((frameIndex) => {
    updateDill1DVEvaluationFrame(frameIndex);
}, 100);

// 设置DILL模型1D V评估事件监听器
function setupDill1DVEvaluationEventListeners() {
    console.log('设置DILL 1D V评估事件监听器');
    
    const playBtn = document.getElementById('dill-1d-v-play-btn');
    const pauseBtn = document.getElementById('dill-1d-v-pause-btn');
    const resetBtn = document.getElementById('dill-1d-v-reset-btn');
    const loopBtn = document.getElementById('dill-1d-v-loop-btn');
    const timeSlider = document.getElementById('dill-1d-v-slider');
    
    console.log('DILL 1D V评估按钮状态:', {
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn,
        resetBtn: !!resetBtn,
        loopBtn: !!loopBtn,
        timeSlider: !!timeSlider
    });
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('dill-1d-v-play-btn');
        newPlayBtn.addEventListener('click', function() {
            console.log('DILL 1D V评估播放按钮被点击');
            if (dill1DVEvaluationState.animationData) {
                playDill1DVEvaluation();
            } else {
                console.warn('DILL 1D V评估数据不存在');
                alert('请先计算DILL模型1D V评估数据');
            }
        });
        console.log('DILL 1D V评估播放按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估播放按钮未找到');
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('dill-1d-v-pause-btn');
        newPauseBtn.addEventListener('click', pauseDill1DVEvaluation);
        console.log('DILL 1D V评估暂停按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估暂停按钮未找到');
    }
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('dill-1d-v-reset-btn');
        newResetBtn.addEventListener('click', resetDill1DVEvaluation);
        console.log('DILL 1D V评估重置按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估重置按钮未找到');
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('dill-1d-v-loop-btn');
        newLoopBtn.addEventListener('click', toggleDill1DVEvaluationLoop);
        console.log('DILL 1D V评估循环按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估循环按钮未找到');
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('dill-1d-v-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            console.log('DILL 1D V评估时间滑块拖动:', this.value);
            if (isUpdating) return;
            
            // 暂停当前动画
            pauseDill1DVEvaluation();
            
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            dill1DVEvaluationState.currentFrame = frameIndex;
            debouncedUpdateDill1DVEvaluationFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            console.log('DILL 1D V评估时间滑块选择:', this.value);
            const frameIndex = parseInt(this.value);
            dill1DVEvaluationState.currentFrame = frameIndex;
            isUpdating = true;
            updateDill1DVEvaluationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
        
        console.log('DILL 1D V评估时间滑块事件已绑定');
    } else {
        console.error('DILL 1D V评估时间滑块未找到');
    }
    
    console.log('DILL 1D V评估事件监听器设置完成');
}