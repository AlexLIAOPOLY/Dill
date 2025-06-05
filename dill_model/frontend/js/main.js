/**
 * Dill模型Web应用 - 主逻辑脚本
 */

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
    // 初始化界面元素
    initWaveTypeTitles();
    initSineWaveTypeSelectors();
    initPhaseExpressionDropdowns();  // 确保初始化相位表达式下拉框
    bindSliderEvents();
    bindParamTooltips();
    bindPhiExprUI();
    
    // 获取DOM元素
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const modelSelect = document.getElementById('model-select'); // 获取模型选择下拉框
    const modelSelectionSection = document.getElementById('model-selection-section'); // 获取模型选择区域
    
    // 为计算按钮绑定事件
    calculateBtn.addEventListener('click', function() {
        let modelType = modelSelect.value;
        let postData = getParameterValues(); // 使用 getParameterValues 获取所有参数
        
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
            })
            .catch(error => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
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

    // 新增：所有参数输入框变动时清空结果
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('input', clearAllCharts);
        input.addEventListener('change', clearAllCharts);
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

    // 参数说明tooltip逻辑
    bindParamTooltips();

    // 导出图片和数据功能
    document.getElementById('export-exposure-img').onclick = function() {
        Plotly.downloadImage(document.getElementById('exposure-plot-container'), {format: 'png', filename: 'exposure_plot'});
    };
    document.getElementById('export-thickness-img').onclick = function() {
        Plotly.downloadImage(document.getElementById('thickness-plot-container'), {format: 'png', filename: 'thickness_plot'});
    };
    document.getElementById('export-exposure-data').onclick = function() {
        exportPlotData('exposure');
    };
    document.getElementById('export-thickness-data').onclick = function() {
        exportPlotData('thickness');
    };

    // 正弦波类型切换逻辑（Dill）
    const dillSineType = document.getElementById('dill-sine-type');
    const dillMultisineParams = document.getElementById('dill-multisine-params');
    const dill3DSineParams = document.getElementById('dill-3dsine-params');
    const dillK = document.getElementById('K') ? document.getElementById('K').closest('.parameter-item') : null;
    
    // 改用正确的参数项选择器
    const dillYRange = dillMultisineParams.querySelector('.parameter-item:last-child');
    
    function updateDillYRangeDisplay() {
        if (dillSineType.value === 'multi') {
            if(dillYRange) dillYRange.style.display = '';
        } else {
            if(dillYRange) dillYRange.style.display = 'none';
        }
    }
    dillSineType.addEventListener('change', function() {
        console.log('正弦波类型切换:', this.value);
        if (this.value === 'multi') {
            dillMultisineParams.style.display = 'block';
            dill3DSineParams.style.display = 'none';
            if (dillK) dillK.style.display = 'none';
        } else if (this.value === '3d') {
            dillMultisineParams.style.display = 'none';
            dill3DSineParams.style.display = 'block';
            if (dillK) dillK.style.display = 'none';
        } else {
            dillMultisineParams.style.display = 'none';
            dill3DSineParams.style.display = 'none';
            if (dillK) dillK.style.display = '';
        }
        updateDillYRangeDisplay();
    });
    // 新增：页面加载时主动触发一次change，确保初始状态正确
    dillSineType.dispatchEvent(new Event('change'));
    updateDillYRangeDisplay();
    
    // 正弦波类型切换逻辑（增强Dill）
    const enhancedDillSineType = document.getElementById('enhanced-dill-sine-type');
    const enhancedDillMultisineParams = document.getElementById('enhanced-dill-multisine-params');
    const enhancedDill3DSineParams = document.getElementById('enhanced-dill-3dsine-params');
    const enhancedK = document.getElementById('enhanced_K');
    const enhancedKItem = document.getElementById('enhanced-dill-params')?.querySelector('#K')?.closest('.parameter-item');
    enhancedDillSineType.addEventListener('change', function() {
        if (this.value === 'multi') {
            enhancedDillMultisineParams.style.display = 'block';
            enhancedDill3DSineParams.style.display = 'none';
            if (enhancedKItem) enhancedKItem.style.display = 'none';
        } else if (this.value === '3d') {
            enhancedDillMultisineParams.style.display = 'none';
            enhancedDill3DSineParams.style.display = 'block';
            if (enhancedKItem) enhancedKItem.style.display = 'none';
        } else {
            enhancedDillMultisineParams.style.display = 'none';
            enhancedDill3DSineParams.style.display = 'none';
            if (enhancedKItem) enhancedKItem.style.display = '';
        }
    });
    
    // 正弦波类型切换逻辑（CAR）
    const carSineType = document.getElementById('car-sine-type');
    const carMultisineParams = document.getElementById('car-multisine-params');
    const car3DSineParams = document.getElementById('car-3dsine-params');
    const carK = document.getElementById('car_K').closest('.parameter-item');
    carSineType.addEventListener('change', function() {
        if (this.value === 'multi') {
            carMultisineParams.style.display = 'block';
            car3DSineParams.style.display = 'none';
            if (carK) carK.style.display = 'none';
        } else if (this.value === '3d') {
            carMultisineParams.style.display = 'none';
            car3DSineParams.style.display = 'block';
            if (carK) carK.style.display = 'none';
        } else {
            carMultisineParams.style.display = 'none';
            car3DSineParams.style.display = 'none';
            if (carK) carK.style.display = '';
        }
    });

    // 添加phi_expr输入框下方表达式示例和格式提示
    addPhiExprHint();
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
        const sineType = document.getElementById('dill-sine-type').value;
        params.sine_type = sineType;
        params.I_avg = parseFloat(document.getElementById('I_avg').value);
        params.V = parseFloat(document.getElementById('V').value);
        params.t_exp = parseFloat(document.getElementById('t_exp').value);
        params.C = parseFloat(document.getElementById('C').value);
        if (sineType === 'multi') {
            params.Kx = parseFloat(document.getElementById('Kx').value);
            params.Ky = parseFloat(document.getElementById('Ky').value);
            params.phi_expr = document.getElementById('phi_expr').value;
            // y范围参数
            params.y_min = parseFloat(document.getElementById('y_min').value);
            params.y_max = parseFloat(document.getElementById('y_max').value);
            params.y_points = parseInt(document.getElementById('y_points').value);
        } else if (sineType === '3d') {
            params.Kx = parseFloat(document.getElementById('Kx_3d').value);
            params.Ky = parseFloat(document.getElementById('Ky_3d').value);
            params.Kz = parseFloat(document.getElementById('Kz_3d').value);
            params.phi_expr = document.getElementById('phi_expr_3d').value;
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = parseFloat(document.getElementById('x_min_3d').value);
            params.x_max = parseFloat(document.getElementById('x_max_3d').value);
            params.y_min = parseFloat(document.getElementById('y_min_3d').value);
            params.y_max = parseFloat(document.getElementById('y_max_3d').value);
            params.z_min = parseFloat(document.getElementById('z_min_3d').value);
            params.z_max = parseFloat(document.getElementById('z_max_3d').value);
        } else {
            params.K = parseFloat(document.getElementById('K').value);
        }
    } else if (modelType === 'enhanced_dill') {
        const sineType = document.getElementById('enhanced-dill-sine-type').value;
        params.sine_type = sineType;
        params.z_h = parseFloat(document.getElementById('z_h').value) || 1.0;
        params.T = parseFloat(document.getElementById('T').value) || 95.0;
        params.t_B = parseFloat(document.getElementById('t_B').value) || 90.0;
        params.I0 = parseFloat(document.getElementById('I0').value) || 1.0;
        params.M0 = parseFloat(document.getElementById('M0').value) || 1.0;
        params.t_exp = parseFloat(document.getElementById('t_exp_enhanced').value) || 5.0;
        
        // 添加增强Dill模型的干涉条纹可见度(V)参数
        if (sineType === 'single') {
            params.V = parseFloat(document.getElementById('enhanced_V').value) || 0.8;
            params.K = parseFloat(document.getElementById('enhanced_K').value) || 2.0;
            console.log(`Enhanced Dill 1D模式: V=${params.V}, K=${params.K}`);
        }
        
        // 优化：无论 single 还是 multi 都传递 K
        if (!params.K && document.getElementById('enhanced_K')) {
            params.K = parseFloat(document.getElementById('enhanced_K').value) || 2.0;
        }
        
        if (sineType === 'multi') {
            params.Kx = parseFloat(document.getElementById('enhanced_Kx').value) || 2.0;
            params.Ky = parseFloat(document.getElementById('enhanced_Ky').value) || 0.0;
            params.phi_expr = document.getElementById('enhanced_phi_expr').value || '0';
            // 添加Y轴范围参数
            params.y_min = parseFloat(document.getElementById('enhanced_y_min').value) || 0.0;
            params.y_max = parseFloat(document.getElementById('enhanced_y_max').value) || 10.0;
            params.y_points = parseInt(document.getElementById('enhanced_y_points').value) || 100;
        } else if (sineType === '3d') {
            params.Kx = parseFloat(document.getElementById('enhanced_Kx_3d').value) || 2.0;
            params.Ky = parseFloat(document.getElementById('enhanced_Ky_3d').value) || 2.0;
            params.Kz = parseFloat(document.getElementById('enhanced_Kz_3d').value) || 2.0;
            params.phi_expr = document.getElementById('enhanced_phi_expr_3d').value || '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = parseFloat(document.getElementById('enhanced_x_min_3d').value) || 0.0;
            params.x_max = parseFloat(document.getElementById('enhanced_x_max_3d').value) || 10.0;
            params.y_min = parseFloat(document.getElementById('enhanced_y_min_3d').value) || 0.0;
            params.y_max = parseFloat(document.getElementById('enhanced_y_max_3d').value) || 10.0;
            params.z_min = parseFloat(document.getElementById('enhanced_z_min_3d').value) || 0.0;
            params.z_max = parseFloat(document.getElementById('enhanced_z_max_3d').value) || 10.0;
        }
    } else if (modelType === 'car') {
        const sineType = document.getElementById('car-sine-type').value;
        params.sine_type = sineType;
        params.I_avg = parseFloat(document.getElementById('car_I_avg').value);
        params.V = parseFloat(document.getElementById('car_V').value);
        params.t_exp = parseFloat(document.getElementById('car_t_exp').value);
        params.acid_gen_efficiency = parseFloat(document.getElementById('car_acid_gen_efficiency').value);
        params.diffusion_length = parseFloat(document.getElementById('car_diffusion_length').value);
        params.reaction_rate = parseFloat(document.getElementById('car_reaction_rate').value);
        params.amplification = parseFloat(document.getElementById('car_amplification').value);
        params.contrast = parseFloat(document.getElementById('car_contrast').value);
        
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
            params.Kx = parseFloat(document.getElementById('car_Kx').value);
            params.Ky = parseFloat(document.getElementById('car_Ky').value);
            params.phi_expr = document.getElementById('car_phi_expr').value;
            // 使用CAR模型自己的Y轴范围参数
            params.y_min = parseFloat(document.getElementById('car_y_min').value);
            params.y_max = parseFloat(document.getElementById('car_y_max').value);
            params.y_points = parseInt(document.getElementById('car_y_points').value);
            
            // 参数有效性校验
            params.Kx = isNaN(params.Kx) ? 2.0 : params.Kx;
            params.Ky = isNaN(params.Ky) ? 0.0 : params.Ky;
            params.phi_expr = params.phi_expr || '0';  // 提供默认相位表达式
            params.y_min = isNaN(params.y_min) ? 0.0 : params.y_min;
            params.y_max = isNaN(params.y_max) ? 10.0 : params.y_max;
            params.y_points = isNaN(params.y_points) ? 100 : params.y_points;
        } else if (sineType === '3d') {
            params.Kx = parseFloat(document.getElementById('car_Kx_3d').value);
            params.Ky = parseFloat(document.getElementById('car_Ky_3d').value);
            params.Kz = parseFloat(document.getElementById('car_Kz_3d').value);
            params.phi_expr = document.getElementById('car_phi_expr_3d').value;
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = parseFloat(document.getElementById('car_x_min_3d').value);
            params.x_max = parseFloat(document.getElementById('car_x_max_3d').value);
            params.y_min = parseFloat(document.getElementById('car_y_min_3d').value);
            params.y_max = parseFloat(document.getElementById('car_y_max_3d').value);
            params.z_min = parseFloat(document.getElementById('car_z_min_3d').value);
            params.z_max = parseFloat(document.getElementById('car_z_max_3d').value);
            
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
            params.K = parseFloat(document.getElementById('car_K').value);
            params.K = isNaN(params.K) ? 2.0 : params.K;
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

    // 清空容器，确保旧图被移除
    exposurePlotContainer.innerHTML = '';
    thicknessPlotContainer.innerHTML = '';
    exposurePlotContainer.style.display = 'block';
    thicknessPlotContainer.style.display = 'block';

    // 检查是否有3D数据
    const has3DData = data.is_3d || (data.intensity_3d && (data.x_coords && data.y_coords && data.z_coords));

    // 检查是否有二维数据
    const has2DData = data.is_2d || (data.z_exposure_dose && data.z_thickness) || 
                     (data.x_coords && data.y_coords && (data.z_exposure_dose || data.z_thickness));

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
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型处理逻辑
        console.log('增强Dill模型数据处理', {has3DData, has2DData});
        
        if (has3DData) {
            // 处理3D数据可视化
            console.log('显示增强Dill模型3D可视化');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        } else if (has2DData) {
            // 处理2D数据可视化
            console.log('显示增强Dill模型2D热图'); 
            createExposureHeatmap(exposurePlotContainer, data);
            createThicknessHeatmap(thicknessPlotContainer, data);
        } else {
            // 默认1D处理，确保兼容性
            console.log('显示增强Dill模型1D图表');
            if (data.z && (data.I !== undefined || data.M !== undefined)) {
                createExposurePlot(exposurePlotContainer, { x: data.z, exposure_dose: data.I });
                createThicknessPlot(thicknessPlotContainer, { x: data.z, thickness: data.M });
            } else {
                console.error('增强Dill模型1D数据不完整，无法渲染线图');
                exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">增强Dill模型1D曝光数据不完整</div>';
                thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">增强Dill模型1D厚度数据不完整</div>';
            }
        }
    } else if (has3DData) {
        // 处理3D数据可视化
        console.log('Displaying 3D visualization for model:', currentModelType);
        createExposure3DPlot(exposurePlotContainer, data);
        createThickness3DPlot(thicknessPlotContainer, data);
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
    } else {
        // 其他模型使用标准字段
        zData = data.z_exposure_dose || data.exposure_dose || data.intensity_3d || data.I;
    }

    // 更健壮的数据检查
    if (!xCoords || !yCoords || !zData ||
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
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
        first_item_length: plotDataZ.length > 0 && Array.isArray(plotDataZ[0]) ? plotDataZ[0].length : 0
    });

    // 改进的数据格式检测和转换逻辑
    if (!Array.isArray(plotDataZ[0])) {
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
        title: LANGS[currentLang].exposure_dist + ' (3D)',
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
    } else {
        // 其他模型使用标准字段
        zData = data.z_thickness || data.thickness || data.thickness_3d || data.M;
    }

    // 更健壮的数据检查
    if (!xCoords || !yCoords || !zData ||
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
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
        first_item_length: plotDataZ.length > 0 && Array.isArray(plotDataZ[0]) ? plotDataZ[0].length : 0
    });

    // 改进的数据格式检测和转换逻辑
    if (!Array.isArray(plotDataZ[0])) {
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
        title: LANGS[currentLang].thickness_dist + ' (3D)',
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

// ... (createExposurePlot and createThicknessPlot remain for 1D)
// START - Add 1D plot functions back
function createExposurePlot(container, data) {
    if (!data || !data.x || !data.exposure_dose || 
        !Array.isArray(data.x) || !Array.isArray(data.exposure_dose) ||
        data.x.length === 0 || data.exposure_dose.length === 0 ||
        data.x.length !== data.exposure_dose.length) {
        container.innerHTML = `<div style=\"color:red;padding:20px;\">${LANGS[currentLang].error_no_exposure_data || '无有效曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    const trace = {
        x: data.x,
        y: data.exposure_dose,
        mode: 'lines',
        type: 'scatter',
        name: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量'
    };

    const layout = {
        title: LANGS[currentLang].exposure_dist || '曝光剂量分布',
        xaxis: { title: LANGS[currentLang].x_position },
        yaxis: { title: LANGS[currentLang].exposure_dose_unit || '曝光剂量 (mJ/cm²)' },
        margin: { l: 60, r: 20, t: 60, b: 60 },
        shapes: [],
        annotations: []
    };
    Plotly.newPlot(container, [trace], layout, {responsive: true});
    container.on('plotly_click', function(eventData) {
        if(eventData.points.length > 0) {
            const point = eventData.points[0];
            const params = getParameterValues(); // 获取当前参数
            showSinglePointDetailsPopup({ x: point.x, y: point.y }, 'exposure', container, eventData);
        }
    });
    window.lastPlotData = data; // Store for export
}

function createThicknessPlot(container, data) {
    if (!data || !data.x || !data.thickness || 
        !Array.isArray(data.x) || !Array.isArray(data.thickness) ||
        data.x.length === 0 || data.thickness.length === 0 ||
        data.x.length !== data.thickness.length) {
        container.innerHTML = `<div style=\"color:red;padding:20px;\">${LANGS[currentLang].error_no_thickness_data || '无有效厚度数据，无法绘图。'}</div>`;
        return;
    }

    const trace = {
        x: data.x,
        y: data.thickness,
        mode: 'lines',
        type: 'scatter',
        name: LANGS[currentLang].thickness_trace_name || '相对厚度'
    };

    const layout = {
        title: LANGS[currentLang].thickness_dist || '光刻胶厚度分布',
        xaxis: { title: LANGS[currentLang].x_position },
        yaxis: { title: LANGS[currentLang].relative_thickness_unit || '相对厚度 (归一化)' },
        margin: { l: 60, r: 20, t: 60, b: 60 },
        shapes: [],
        annotations: []
    };
    Plotly.newPlot(container, [trace], layout, {responsive: true});
    container.on('plotly_click', function(eventData) {
        if(eventData.points.length > 0) {
            const point = eventData.points[0];
            const params = getParameterValues(); // 获取当前参数
            showSinglePointDetailsPopup({ x: point.x, y: point.y }, 'thickness', container, eventData);
        }
    });
    window.lastPlotData = data; // Store for export - might overwrite exposure plot data if called sequentially
}
// END - Add 1D plot functions back

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

    // 检查数据格式并进行必要的转换
    let heatmapZ = zData;
    if (!Array.isArray(heatmapZ[0]) && xCoords.length * yCoords.length === heatmapZ.length) {
        try {
            // 尝试检测数据排列顺序 (按行主序还是列主序)
            const isRowMajor = detectDataOrder(heatmapZ, xCoords, yCoords);
            console.log(`热图数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
            
            // 根据检测到的顺序重塑数据
            heatmapZ = reshapeArray(heatmapZ, xCoords.length, yCoords.length, isRowMajor);
        } catch (error) {
            console.error('无法重塑热图数据:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">热图数据转换错误: ${error.message}</div>`;
            return;
        }
    }

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
        title: LANGS[currentLang].exposure_dist + ' (2D)',
        xaxis: { title: LANGS[currentLang].x_position },
        yaxis: { title: LANGS[currentLang].y_position },
        margin: { l: 60, r: 20, t: 60, b: 60 }
    };
    
    try {
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

    // 检查数据格式并进行必要的转换
    let heatmapZ = zData;
    if (!Array.isArray(heatmapZ[0]) && xCoords.length * yCoords.length === heatmapZ.length) {
        try {
            // 尝试检测数据排列顺序 (按行主序还是列主序)
            const isRowMajor = detectDataOrder(heatmapZ, xCoords, yCoords);
            console.log(`热图数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
            
            // 根据检测到的顺序重塑数据
            heatmapZ = reshapeArray(heatmapZ, xCoords.length, yCoords.length, isRowMajor);
        } catch (error) {
            console.error('无法重塑热图数据:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">热图数据转换错误: ${error.message}</div>`;
            return;
        }
    }

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
        title: LANGS[currentLang].thickness_dist + ' (2D)',
        xaxis: { title: LANGS[currentLang].x_position },
        yaxis: { title: LANGS[currentLang].y_position },
        margin: { l: 60, r: 20, t: 60, b: 60 }
    };
    
    try {
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

// 参数说明tooltip逻辑
function bindParamTooltips() {
    // 已无问号，不再需要tooltip逻辑，直接return
    return;

    document.querySelectorAll('.param-tooltip').forEach(function(tip) {
        tip.addEventListener('mouseenter', function() {
            let key = tip.getAttribute('data-tooltip-key');
            let lang = window.currentLang || 'zh';
            let text = (window.LANGS && window.LANGS[lang] && window.LANGS[lang][key]) ? window.LANGS[lang][key] : '';
            let tooltip = document.createElement('div');
            tooltip.className = 'param-tooltip-popup';
            tooltip.textContent = text;
            document.body.appendChild(tooltip);
            let rect = tip.getBoundingClientRect();
            tooltip.style.left = (rect.left + window.scrollX + 20) + 'px';
            tooltip.style.top = (rect.top + window.scrollY - 10) + 'px';
            tip._tooltip = tooltip;
        });
        tip.addEventListener('mouseleave', function() {
            if (tip._tooltip) {
                tip._tooltip.remove();
                tip._tooltip = null;
            }
        });
    });
}

// applyLang时也刷新tooltip
const oldApplyLang = window.applyLang;
window.applyLang = function() {
    if (oldApplyLang) oldApplyLang();
    // bindParamTooltips(); // 已无问号，无需再绑定
};

function exportPlotData(type) {
    let data, x, y, filename;
    if (type === 'exposure') {
        data = window.lastPlotData;
        x = data.x;
        y = data.exposure_dose;
        filename = 'exposure_data.csv';
    } else {
        data = window.lastPlotData;
        x = data.x;
        y = data.thickness;
        filename = 'thickness_data.csv';
    }
    let csv = 'x,y\n';
    for (let i = 0; i < x.length; i++) {
        csv += `${x[i]},${y[i]}\n`;
    }
    let blob = new Blob([csv], {type: 'text/csv'});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 添加phi_expr输入框下方表达式示例和格式提示
function addPhiExprHint() {
    const phiInputs = [
        document.getElementById('phi_expr'),
        document.getElementById('enhanced_phi_expr'),
        document.getElementById('car_phi_expr')
    ];
    phiInputs.forEach(input => {
        if (input && !input.nextElementSibling?.classList?.contains('phi-hint')) {
            const hint = document.createElement('div');
            hint.className = 'phi-hint';
            hint.style.color = '#888';
            hint.style.fontSize = '0.95em';
            hint.innerHTML = '示例：0, pi/2, sin(2*t)，支持sin/cos/pi/t等';
            input.parentNode.appendChild(hint);
        }
    });
}
document.addEventListener('DOMContentLoaded', addPhiExprHint);

// 工具函数：校验phi_expr表达式是否合法
function validatePhiExpr(expr) {
    if (!expr || typeof expr !== 'string') return false;
    try {
        // 只允许sin/cos/pi/t/数字/加减乘除括号
        if (!/^[-+*/(). 0-9tcosinpi]*$/.test(expr.replace(/\s+/g, ''))) return false;
        // eslint-disable-next-line no-new-func
        new Function('t', 'return ' + expr.replace(/\b(sin|cos|pi)\b/g, 'Math.$1'))(0);
        return true;
    } catch {
        return false;
    }
}

// 工具函数：生成二维正弦分布
function generate2DSine(Kx, Ky, V, phi_expr, xRange, yRange) {
    const xPoints = 100, yPoints = 100;
    const x = Array.from({length: xPoints}, (_, i) => xRange[0] + (xRange[1]-xRange[0])*i/(xPoints-1));
    const y = Array.from({length: yPoints}, (_, i) => yRange[0] + (yRange[1]-yRange[0])*i/(yPoints-1));
    const phiFunc = (t) => {
        try {
            // eslint-disable-next-line no-new-func
            return new Function('t', 'return ' + phi_expr.replace(/\b(sin|cos|pi)\b/g, 'Math.$1'))(t);
        } catch { return 0; }
    };
    const phi = phiFunc(0);
    const z = [];
    for (let j = 0; j < yPoints; j++) {
        const row = [];
        for (let i = 0; i < xPoints; i++) {
            row.push(1 + V * Math.cos(Kx * x[i] + Ky * y[j] + phi));
        }
        z.push(row);
    }
    return {x, y, z};
}

// 工具函数：生成三维正弦分布
function generate3DSine(Kx, Ky, Kz, V, phi_expr, xRange, yRange, zRange) {
    // 为了可视化效果，使用较少的点数
    const xPoints = 20, yPoints = 20, zPoints = 20;
    const x = Array.from({length: xPoints}, (_, i) => xRange[0] + (xRange[1]-xRange[0])*i/(xPoints-1));
    const y = Array.from({length: yPoints}, (_, i) => yRange[0] + (yRange[1]-yRange[0])*i/(yPoints-1));
    const z = Array.from({length: zPoints}, (_, i) => zRange[0] + (zRange[1]-zRange[0])*i/(zPoints-1));
    
    const phiFunc = (t) => {
        try {
            // eslint-disable-next-line no-new-func
            return new Function('t', 'return ' + phi_expr.replace(/\b(sin|cos|pi)\b/g, 'Math.$1'))(t);
        } catch { return 0; }
    };
    const phi = phiFunc(0);
    
    // 为3D可视化准备数据
    const values = new Array(xPoints * yPoints * zPoints);
    let idx = 0;
    const xGrid = [], yGrid = [], zGrid = [];
    
    // 生成三维网格点和值
    for (let k = 0; k < zPoints; k++) {
        for (let j = 0; j < yPoints; j++) {
            for (let i = 0; i < xPoints; i++) {
                xGrid.push(x[i]);
                yGrid.push(y[j]);
                zGrid.push(z[k]);
                values[idx++] = 1 + V * Math.cos(Kx * x[i] + Ky * y[j] + Kz * z[k] + phi);
            }
        }
    }
    
    return {
        x: xGrid,
        y: yGrid,
        z: zGrid,
        values: values,
        xGrid: x,
        yGrid: y,
        zGrid: z
    };
}

// Dill模型二维正弦分布预览绘图函数 (从bindPhiExprUI提取并重命名)
function dillDrawPreviewPlot(scrollToPlot = false) {
    const input = document.getElementById('phi_expr');
    const kxInput = document.getElementById('Kx');
    const kyInput = document.getElementById('Ky');
    const vInput = document.getElementById('V'); // Assuming 'V' is the ID for Dill model's V
    const plot = document.getElementById('phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 0.8; // Default V_val
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value); // Use V_val to avoid conflict with V variable if any

    // 获取Y范围参数
    const yMinInput = document.getElementById('y_min');
    const yMaxInput = document.getElementById('y_max');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
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

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange);
    plot.style.display = 'block';
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: LANGS[currentLang]?.preview_2d_title || '二维正弦分布预览', 
        xaxis: {title: 'x'}, 
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// Dill模型三维正弦分布预览绘图函数 (从bindPhiExprUI提取并重命名)
function dillDraw3DPreviewPlot(scrollToPlot = false) {
    const input = document.getElementById('phi_expr_3d');
    const kxInput = document.getElementById('Kx_3d');
    const kyInput = document.getElementById('Ky_3d');
    const kzInput = document.getElementById('Kz_3d');
    const vInput = document.getElementById('V'); // Assuming 'V' is the ID for Dill model's V
    const plot = document.getElementById('phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    const xMinInput = document.getElementById('x_min_3d');
    const xMaxInput = document.getElementById('x_max_3d');
    const yMinInput = document.getElementById('y_min_3d');
    const yMaxInput = document.getElementById('y_max_3d');
    const zMinInput = document.getElementById('z_min_3d');
    const zMaxInput = document.getElementById('z_max_3d');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 0.8; // Default V_val
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

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange);
    plot.style.display = 'block';
    
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
        title: LANGS[currentLang]?.preview_3d_title || '三维正弦分布预览',
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
        {input: 'phi_expr', kx: 'Kx', ky: 'Ky', v: 'V', btn: 'phi-expr-preview-btn', plotElementId: 'phi-expr-preview-plot', drawFunc: dillDrawPreviewPlot},
        // Enhanced Dill模型二维配置 - 使用enhancedDrawPreviewPlot
        {input: 'enhanced_phi_expr', kx: 'enhanced_Kx', ky: 'enhanced_Ky', v: 'I0', btn: 'enhanced-phi-expr-preview-btn', plotElementId: 'enhanced-phi-expr-preview-plot', drawFunc: enhancedDrawPreviewPlot}, // Assuming V corresponds to I0 for enhanced
        // CAR模型二维配置 - 使用carDrawPreviewPlot
        {input: 'car_phi_expr', kx: 'car_Kx', ky: 'car_Ky', v: 'car_V', btn: 'car-phi-expr-preview-btn', plotElementId: 'car-phi-expr-preview-plot', drawFunc: carDrawPreviewPlot}
    ];
    
    // 三维正弦波参数配置
    const configs3D = [
        // Dill模型三维配置 - 使用新的dillDraw3DPreviewPlot
        {input: 'phi_expr_3d', kx: 'Kx_3d', ky: 'Ky_3d', kz: 'Kz_3d', v: 'V', 
         btn: 'phi-expr-3d-preview-btn', plotElementId: 'phi-expr-3d-preview-plot', 
         xmin: 'x_min_3d', xmax: 'x_max_3d', ymin: 'y_min_3d', ymax: 'y_max_3d', zmin: 'z_min_3d', zmax: 'z_max_3d', drawFunc: dillDraw3DPreviewPlot},
        // Enhanced Dill模型三维配置 - 使用enhancedDraw3DPreviewPlot
        {input: 'enhanced_phi_expr_3d', kx: 'enhanced_Kx_3d', ky: 'enhanced_Ky_3d', kz: 'enhanced_Kz_3d', v: 'I0', 
         btn: 'enhanced-phi-expr-3d-preview-btn', plotElementId: 'enhanced-phi-expr-3d-preview-plot',
         xmin: 'enhanced_x_min_3d', xmax: 'enhanced_x_max_3d', ymin: 'enhanced_y_min_3d', ymax: 'enhanced_y_max_3d', 
         zmin: 'enhanced_z_min_3d', zmax: 'enhanced_z_max_3d', drawFunc: enhancedDraw3DPreviewPlot}, // Assuming V corresponds to I0 for enhanced
        // CAR模型三维配置 - 使用carDraw3DPreviewPlot
        {input: 'car_phi_expr_3d', kx: 'car_Kx_3d', ky: 'car_Ky_3d', kz: 'car_Kz_3d', v: 'car_V', 
         btn: 'car-phi-expr-3d-preview-btn', plotElementId: 'car-phi-expr-3d-preview-plot',
         xmin: 'car_x_min_3d', xmax: 'car_x_max_3d', ymin: 'car_y_min_3d', ymax: 'car_y_max_3d', 
         zmin: 'car_z_min_3d', zmax: 'car_z_max_3d', drawFunc: carDraw3DPreviewPlot}
    ];
    
    // 统一处理预览逻辑
    function setupPreview(config, is3D) {
        const input = document.getElementById(config.input);
        const btn = document.getElementById(config.btn);
        const plotElement = document.getElementById(config.plotElementId); // 使用 plotElementId
        const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');
        const calcBtn = document.getElementById('calculate-btn');

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

        btn.addEventListener('click', function() {
            if (validatePhaseExpr(input.value)) { // Only proceed if expression is valid
                isPreviewShown = !isPreviewShown;
                if (isPreviewShown) {
                    config.drawFunc(true); // Call the specific draw function, scroll to plot
                } else {
                    plotElement.style.display = 'none'; // Hide plot
                    if (Plotly.purge) Plotly.purge(plotElement); // Clear plot to free resources
                }
                updateBtnText();
            } else {
                 if (errDiv) { 
                    errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview_click || '无法预览无效表达式。'; 
                    errDiv.style.display = 'block'; 
                }
            }
        });

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
                        config.drawFunc(false); // No scroll on auto-refresh
                    }
                });
            }
        });
    }

    configs.forEach(cfg => setupPreview(cfg, false));
    configs3D.forEach(cfg => setupPreview(cfg, true));
    
    // 为2D模式下的Y范围参数添加监听器
    // Dill模型
    const dillYMin = document.getElementById('y_min');
    const dillYMax = document.getElementById('y_max');
    const dillYPoints = document.getElementById('y_points');
    const dillPlot = document.getElementById('phi-expr-preview-plot');
    
    // Enhanced Dill模型
    const enhancedYMin = document.getElementById('enhanced_y_min');
    const enhancedYMax = document.getElementById('enhanced_y_max');
    const enhancedYPoints = document.getElementById('enhanced_y_points');
    const enhancedPlot = document.getElementById('enhanced-phi-expr-preview-plot');
    
    // CAR模型
    const carYMin = document.getElementById('car_y_min');
    const carYMax = document.getElementById('car_y_max');
    const carYPoints = document.getElementById('car_y_points');
    const carPlot = document.getElementById('car-phi-expr-preview-plot');
    
    // 为Dill模型的Y范围参数添加监听器
    [dillYMin, dillYMax, dillYPoints].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                // 检查是否正在显示预览
                if (dillPlot && dillPlot.style.display !== 'none') {
                    dillDrawPreviewPlot(false); // 不滚动到图表位置
                }
            });
        }
    });
    
    // 为Enhanced Dill模型的Y范围参数添加监听器
    [enhancedYMin, enhancedYMax, enhancedYPoints].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                // 检查是否正在显示预览
                if (enhancedPlot && enhancedPlot.style.display !== 'none') {
                    enhancedDrawPreviewPlot(false); // 不滚动到图表位置
                }
            });
        }
    });
    
    // 为CAR模型的Y范围参数添加监听器
    [carYMin, carYMax, carYPoints].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                // 检查是否正在显示预览
                if (carPlot && carPlot.style.display !== 'none') {
                    carDrawPreviewPlot(false); // 不滚动到图表位置
                }
            });
        }
    });
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
        formulaMath = 'D(x) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(K·x))';
        formulaExplanation = `
            <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
            <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            <div>• V: 干涉条纹可见度 (${params.V})</div>
            <div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
        `;
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'Dill模型光刻胶厚度计算：';
        formulaMath = 'M(x) = e<sup>-C × D(x)</sup>';
        
        // 检查是否有多维数据，确定计算公式
        if (params.sine_type === 'multi') {
            formulaMath += '<br>M(x,y) = e<sup>-C × D(x,y)</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath += '<br>M(x,y,z) = e<sup>-C × D(x,y,z)</sup>';
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

    if (plotType === 'exposure') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ/cm²';
        formulaTitle = '增强Dill模型曝光剂量:';
        formulaMath = 'D(x,z) = ∫ I(x,z,t) dt';
        formulaExplanation = `
            <div>${LANGS[currentLang].popup_enhanced_desc || '参数涉及胶厚、前烘温度、时间等影响A,B,C的值。'}</div>
            <div>• I(x,z,t): 光强度分布</div>
        `;
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = '增强Dill模型光刻胶厚度:';
        formulaMath = '∂M/∂t = -I·M·C(z_h,T,t_B)';
        formulaExplanation = `
            <div>• M: ${LANGS[currentLang].popup_param_M_enh || '归一化光敏剂浓度'}</div>
            <div>• C(z_h,T,t_B): ${LANGS[currentLang].popup_param_C_enh || '光敏速率常数'}</div>
        `;
    } else if (plotType === 'heatmap') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ/cm²';
        formulaTitle = '增强Dill模型二维曝光剂量:';
        formulaMath = 'D(x,y,z) based on A,B,C which depend on z_h, T, t_B';
         formulaExplanation = `
            <div>• Kx: (${params.Kx || params.K})</div>
            <div>• Ky: (${params.Ky || 'N/A'})</div>
            <div>• φ(t): (${params.phi_expr || '0'})</div>
        `;
    } else if (plotType === 'surface3d') {
        valueLabel = '值:';
        valueUnit = '';
        formulaTitle = '增强Dill模型三维分布:';
        formulaMath = '∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]<br>∂M/∂t = -I·M·C(z_h,T,t_B)';
        formulaExplanation = `
            <div>• z_h: 胶厚 (${params.z_h} µm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            <div>• I0: 初始光强 (${params.I0})</div>
            <div>• M0: 初始PAC浓度 (${params.M0})</div>
            <div>• Kx: X方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: Y方向空间频率 (${params.Ky} rad/μm)</div>
            <div>• Kz: Z方向空间频率 (${params.Kz} rad/μm)</div>
            <div>• φ(t): 相位表达式 (${params.phi_expr || '0'})</div>
            <div>• A(z_h,T,t_B): 光敏剂吸收率</div>
            <div>• B(z_h,T,t_B): 基底吸收率</div>
            <div>• C(z_h,T,t_B): 光敏速率常数</div>
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
            <h4>📋 ${LANGS[currentLang].popup_section_params_enhanced || '参数组: 增强Dill'}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">z_h:</span><span class="info-value">${params.z_h} µm</span></div>
                <div class="info-item"><span class="info-label">T:</span><span class="info-value">${params.T} °C</span></div>
                <div class="info-item"><span class="info-label">t_B:</span><span class="info-value">${params.t_B} min</span></div>
                <div class="info-item"><span class="info-label">I0:</span><span class="info-value">${params.I0}</span></div>
                <div class="info-item"><span class="info-label">M0:</span><span class="info-value">${params.M0}</span></div>
                <div class="info-item"><span class="info-label">t_exp:</span><span class="info-value">${params.t_exp} s</span></div>
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
        formulaMath = '[H<sup>+</sup>] = η × D(x)';
        formulaExplanation = `
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• D(x): 曝光剂量 (mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
        `;
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型脱保护度计算:';
        formulaMath = 'M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        formulaExplanation = `
            <div>• k: 反应速率常数 (${params.reaction_rate})</div>
            <div>• [H⁺]<sub>diff</sub>: 扩散后光酸浓度</div>
            <div>• A: 放大因子 (${params.amplification})</div>
            <div>• 对比度: γ = ${params.contrast}</div>
        `;
    } else if (plotType === 'car_acid_concentration') {
        valueLabel = '光酸浓度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型过程模拟:';
        formulaMath = '[H⁺] = η·D(x,y,z)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        formulaExplanation = `
            <div>• 扩散长度: ${params.diffusion_length} μm</div>
            <div>• 光酸产生效率: ${params.acid_gen_efficiency}</div>
        `;
    } else if (plotType === 'car_deprotection_degree') {
        valueLabel = '脱保护度:';
        valueUnit = '(0-1)';
        formulaTitle = 'CAR模型脱保护度:';
        formulaMath = 'M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        formulaExplanation = `
            <div>• k: 反应速率 (${params.reaction_rate})</div>
            <div>• A: 放大因子 (${params.amplification})</div>
        `;
    } else if (plotType === 'car_thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型厚度计算:';
        formulaMath = '厚度 = f(M, γ) = M<sup>γ</sup>';
        formulaExplanation = `
            <div>• M: 脱保护度</div>
            <div>• γ: 对比度因子 (${params.contrast})</div>
        `;
    } else if (plotType === 'heatmap') {
        valueLabel = '值:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型二维分布:';
        formulaMath = '依赖于具体参数和阶段';
        formulaExplanation = `
            <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
            <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
        `;
    } else if (plotType === 'surface3d') {
        valueLabel = '值:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型三维分布:';
        formulaMath = '[H⁺] = η·D(x,y,z)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        formulaExplanation = `
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            <div>• k: 反应速率 (${params.reaction_rate})</div>
            <div>• A: 放大因子 (${params.amplification})</div>
            <div>• γ: 对比度 (${params.contrast})</div>
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
        });
    }
    
    // Enhanced Dill模型波形类型选择
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
    
    // 初始化各模型波形类型
    if (dillSineType) dillSineType.dispatchEvent(new Event('change'));
    if (enhancedDillSineType) enhancedDillSineType.dispatchEvent(new Event('change'));
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

                // REMOVED: Automatic preview plot generation on select change.
                // The user now needs to explicitly click the preview button.
                // if (validatePhaseExpr(item.input.value)) {
                //     if (typeof item.drawFunc === 'function') {
                //         item.drawFunc(true); 
                //     } else {
                //         console.error("Draw function is not defined for:", item.select.id);
                //     }
                // }
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
function enhancedDrawPreviewPlot(scrollToPlot = false) {
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
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
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

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange);
    plot.style.display = 'block';
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: LANGS[currentLang]?.preview_2d_title || '二维正弦分布预览',
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// 增强Dill模型3D预览绘图函数
function enhancedDraw3DPreviewPlot(scrollToPlot = false) {
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

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange);
    plot.style.display = 'block';
    
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
        title: LANGS[currentLang]?.preview_3d_title || '三维正弦分布预览',
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
function carDrawPreviewPlot(scrollToPlot = false) {
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
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
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

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange);
    plot.style.display = 'block';
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: LANGS[currentLang]?.preview_2d_title || '二维正弦分布预览',
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// CAR模型3D预览绘图函数
function carDraw3DPreviewPlot(scrollToPlot = false) {
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

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange);
    plot.style.display = 'block';
    
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
        title: LANGS[currentLang]?.preview_3d_title || '三维正弦分布预览',
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
}