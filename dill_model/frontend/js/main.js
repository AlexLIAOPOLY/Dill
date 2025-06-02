/**
 * Dill模型Web应用 - 主逻辑脚本
 */

// 文档加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化应用
    initApp();
});

/**
 * 初始化应用
 */
function initApp() {
    // 获取DOM元素
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const modelSelect = document.getElementById('model-select'); // 获取模型选择下拉框
    const modelSelectionSection = document.getElementById('model-selection-section'); // 获取模型选择区域
    
    // 为所有滑块绑定事件
    bindSliderEvents();
    
    // 为计算按钮绑定事件
    calculateBtn.addEventListener('click', function() {
        let modelType = modelSelect.value;
        let postData = getParameterValues(); // 使用 getParameterValues 获取所有参数
        
        // 显示加载动画
        loading.classList.add('active');
        // 修复：只修改动画里的文字部分，不覆盖整个动画结构
        const loadingText = loading.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = LANGS[currentLang].loading;
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
                
                // 判断后端返回的message_zh/message_en
                let msg = error.message;
                if (error && error.message_zh && error.message_en) {
                    msg = (window.currentLang === 'zh') ? error.message_zh : error.message_en;
                }
                errorMessage.textContent = msg || LANGS[currentLang].error_message;
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
        // TODO: 根据 selectedModel 更新模型说明和可能需要的参数界面
        // 例如，可以有一个函数 updateModelDescription(selectedModel)
        // 目前只有一个DILL模型，所以暂时不需要复杂逻辑
        if (selectedModel === 'dill') {
            // 确保DILL模型相关的说明是可见的 (如果曾被隐藏)
            // 如果有多个模型的说明块，这里需要做显隐切换
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
        dillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        dillToggleBtn.addEventListener('click', function() {
            const isHidden = !dillFullDetails.classList.contains('details-visible');
            if (isHidden) {
                dillFullDetails.classList.add('details-visible');
                dillToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                dillFullDetails.classList.remove('details-visible');
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
        enhancedDillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        enhancedDillToggleBtn.addEventListener('click', function() {
            const isHidden = !enhancedDillFullDetails.classList.contains('details-visible');
            if (isHidden) {
                enhancedDillFullDetails.classList.add('details-visible');
                enhancedDillToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                enhancedDillFullDetails.classList.remove('details-visible');
                enhancedDillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
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
    const dillK = document.getElementById('K')?.closest('.parameter-item');
    const dillYRange = document.getElementById('y-range-container');
    // 新增：关键DOM元素检查和调试输出
    if (!dillSineType) console.error('找不到dill-sine-type');
    if (!dillMultisineParams) console.error('找不到dill-multisine-params');
    if (!dillK) console.error('找不到K参数区');
    if (!dillYRange) console.error('找不到y-range-container');
    function updateDillYRangeDisplay() {
        if (dillSineType.value === 'multi') {
            dillYRange.style.display = '';
        } else {
            dillYRange.style.display = 'none';
        }
    }
    dillSineType.addEventListener('change', function() {
        console.log('正弦波类型切换:', this.value);
        if (this.value === 'multi') {
            dillMultisineParams.style.display = 'block';
            if (dillK) dillK.style.display = 'none';
        } else {
            dillMultisineParams.style.display = 'none';
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
    const enhancedK = document.getElementById('enhanced_K');
    const enhancedKItem = document.getElementById('enhanced-dill-params')?.querySelector('#K')?.closest('.parameter-item');
    enhancedDillSineType.addEventListener('change', function() {
        if (this.value === 'multi') {
            enhancedDillMultisineParams.style.display = 'block';
            if (enhancedKItem) enhancedKItem.style.display = 'none';
        } else {
            enhancedDillMultisineParams.style.display = 'none';
            if (enhancedKItem) enhancedKItem.style.display = '';
        }
    });
    // 正弦波类型切换逻辑（CAR）
    const carSineType = document.getElementById('car-sine-type');
    const carMultisineParams = document.getElementById('car-multisine-params');
    const carK = document.getElementById('car_K').closest('.parameter-item');
    carSineType.addEventListener('change', function() {
        if (this.value === 'multi') {
            carMultisineParams.style.display = 'block';
            if (carK) carK.style.display = 'none';
        } else {
            carMultisineParams.style.display = 'none';
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
        } else {
            params.K = parseFloat(document.getElementById('K').value);
        }
    } else if (modelType === 'enhanced_dill') {
        const sineType = document.getElementById('enhanced-dill-sine-type').value;
        params.sine_type = sineType;
        params.z_h = parseFloat(document.getElementById('z_h').value);
        params.T = parseFloat(document.getElementById('T').value);
        params.t_B = parseFloat(document.getElementById('t_B').value);
        params.I0 = parseFloat(document.getElementById('I0').value);
        params.M0 = parseFloat(document.getElementById('M0').value);
        params.t_exp = parseFloat(document.getElementById('t_exp_enhanced').value);
        // 优化：无论 single 还是 multi 都传递 K
        params.K = parseFloat(document.getElementById('K').value);
        if (sineType === 'multi') {
            params.Kx = parseFloat(document.getElementById('enhanced_Kx').value);
            params.Ky = parseFloat(document.getElementById('enhanced_Ky').value);
            params.phi_expr = document.getElementById('enhanced_phi_expr').value;
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
        if (sineType === 'multi') {
            params.Kx = parseFloat(document.getElementById('car_Kx').value);
            params.Ky = parseFloat(document.getElementById('car_Ky').value);
            params.phi_expr = document.getElementById('car_phi_expr').value;
        } else {
            params.K = parseFloat(document.getElementById('car_K').value);
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
        
        return result.data;
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
    // 调试输出
    if (currentModelType === 'car') {
        console.log('CAR主图数据', data.x, data.initial_acid, data.thickness);
    }
    // 隐藏静态图像
    const staticExposurePlot = document.getElementById('exposure-plot');
    const staticThicknessPlot = document.getElementById('thickness-plot');
    if (staticExposurePlot) staticExposurePlot.style.display = 'none';
    if (staticThicknessPlot) staticThicknessPlot.style.display = 'none';
    const exposurePlotContainer = document.getElementById('exposure-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-plot-container');
    const heatmapPlotItem = document.getElementById('heatmap-plot-item');
    const heatmapPlotContainer = document.getElementById('heatmap-plot-container');
    if (!exposurePlotContainer || !thicknessPlotContainer || !heatmapPlotItem || !heatmapPlotContainer) {
        console.error("One or more plot containers are missing from the DOM.");
        return;
    }
    exposurePlotContainer.style.display = 'block';
    thicknessPlotContainer.style.display = 'block';
    if (currentModelType === 'enhanced_dill') {
        createExposurePlot(exposurePlotContainer, { x: data.z, exposure_dose: data.I });
        createThicknessPlot(thicknessPlotContainer, { x: data.z, thickness: data.M });
    } else if (currentModelType === 'car') {
        // CAR模型主图适配
        createExposurePlot(exposurePlotContainer, { x: data.x, exposure_dose: data.initial_acid });
        createThicknessPlot(thicknessPlotContainer, { x: data.x, thickness: data.thickness });
    } else {
        createExposurePlot(exposurePlotContainer, data);
        createThicknessPlot(thicknessPlotContainer, data);
    }
    animateResults();
    // 阈值滑块初始化
    setTimeout(() => {
        initSingleThresholdControl(document.querySelector('#exposure-thresholds-container .threshold-control'), 0, 'exposure', data);
        initSingleThresholdControl(document.querySelector('#thickness-thresholds-container .threshold-control'), 0, 'thickness', data);
    }, 100);
}

/**
 * 创建曝光剂量图表
 * 
 * @param {HTMLElement} container 容器元素
 * @param {Object} data 数据
 */
function createExposurePlot(container, data) {
    // 优化：只要 x 和 exposure_dose 都是数组且长度一致且有数值就渲染
    if (!data || !Array.isArray(data.x) || !Array.isArray(data.exposure_dose) || data.x.length === 0 || data.exposure_dose.length === 0 || data.x.length !== data.exposure_dose.length) {
        container.innerHTML = `<div style=\"color:red;padding:20px;\">${LANGS[currentLang].error_no_exposure_data || '无有效曝光剂量数据，无法绘图。'}</div>`;
        return;
    }
    const trace = {
        x: data.x,
        y: data.exposure_dose,
        type: 'scatter',
        mode: 'lines',
        line: {
            color: 'rgb(31, 119, 180)',
            width: 2
        },
        name: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量'
    };
    
    const layout = {
        title: LANGS[currentLang].exposure_dist,
        xaxis: {
            title: LANGS[currentLang].x_position,
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: LANGS[currentLang].y_exposure,
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        margin: { l: 60, r: 20, t: 60, b: 60 },
        plot_bgcolor: 'rgb(255, 255, 255)',
        paper_bgcolor: 'rgb(255, 255, 255)',
        hovermode: 'closest',
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot(container, [trace], layout, config);
    
    // 添加点击事件处理，确保调用 showSinglePointDetailsPopup
    container.on('plotly_click', function(eventData) {
        const pt = eventData.points[0];
        // 调用通用的弹窗显示函数
        showSinglePointDetailsPopup(pt, 'exposure', container, eventData);
    });
}

/**
 * 创建光刻胶厚度图表
 * 
 * @param {HTMLElement} container 容器元素
 * @param {Object} data 数据
 */
function createThicknessPlot(container, data) {
    // 优化：只要 x 和 thickness 都是数组且长度一致且有数值就渲染
    if (!data || !Array.isArray(data.x) || !Array.isArray(data.thickness) || data.x.length === 0 || data.thickness.length === 0 || data.x.length !== data.thickness.length) {
        container.innerHTML = `<div style=\"color:red;padding:20px;\">${LANGS[currentLang].error_no_thickness_data || '无有效厚度数据，无法绘图。'}</div>`;
        return;
    }
    const trace = {
        x: data.x,
        y: data.thickness,
        type: 'scatter',
        mode: 'lines',
        line: {
            color: 'rgb(214, 39, 40)',
            width: 2
        },
        name: LANGS[currentLang].thickness_trace_name || '相对厚度'
    };
    
    const layout = {
        title: LANGS[currentLang].thickness_dist,
        xaxis: {
            title: LANGS[currentLang].x_position,
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: LANGS[currentLang].y_thickness,
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        margin: { l: 60, r: 20, t: 60, b: 60 },
        plot_bgcolor: 'rgb(255, 255, 255)',
        paper_bgcolor: 'rgb(255, 255, 255)',
        hovermode: 'closest',
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot(container, [trace], layout, config);
    
    // 添加点击事件处理，确保调用 showSinglePointDetailsPopup
    container.on('plotly_click', function(eventData) {
        const pt = eventData.points[0];
        // 调用通用的弹窗显示函数
        showSinglePointDetailsPopup(pt, 'thickness', container, eventData);
    });
}

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
    
    if (exposurePlotContainer) {
        exposurePlotContainer.innerHTML = '';
        exposurePlotContainer.style.display = 'none';
    }
    
    if (thicknessPlotContainer) {
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

// 绑定phi_expr输入区说明、校验、预览功能
function bindPhiExprUI() {
    const configs = [
        {input: 'phi_expr', kx: 'Kx', ky: 'Ky', v: 'V', btn: 'phi-expr-preview-btn', plot: 'phi-expr-preview-plot', err: 'phi-expr-error'},
        {input: 'enhanced_phi_expr', kx: 'enhanced_Kx', ky: 'enhanced_Ky', v: 'V', btn: 'phi-expr-preview-btn', plot: 'phi-expr-preview-plot', err: 'phi-expr-error'},
        {input: 'car_phi_expr', kx: 'car_Kx', ky: 'car_Ky', v: 'car_V', btn: 'phi-expr-preview-btn', plot: 'phi-expr-preview-plot', err: 'phi-expr-error'}
    ];
    configs.forEach(cfg => {
        const input = document.getElementById(cfg.input);
        const kxInput = document.getElementById(cfg.kx);
        const kyInput = document.getElementById(cfg.ky);
        const vInput = document.getElementById(cfg.v);
        const btn = document.getElementById(cfg.btn);
        const plot = document.getElementById(cfg.plot);
        const errDiv = input?.parentNode?.parentNode?.querySelector('.phi-expr-error');
        const calcBtn = document.getElementById('calculate-btn');
        if (!input || !btn || !plot) return;
        // 实时校验
        input.addEventListener('input', function() {
            const expr = input.value;
            if (!validatePhiExpr(expr)) {
                input.style.borderColor = '#d00';
                if (errDiv) { errDiv.textContent = '表达式格式有误，仅支持sin/cos/pi/t/数字/加减乘除等。'; errDiv.style.display = ''; }
                calcBtn.disabled = true;
                btn.disabled = true;
            } else {
                input.style.borderColor = '';
                if (errDiv) { errDiv.textContent = ''; errDiv.style.display = 'none'; }
                calcBtn.disabled = false;
                btn.disabled = false;
            }
        });
        // 预览分布
        btn.style.display = '';
        let isPreviewShown = false;
        let lastPlotData = null;
        function drawPreviewPlot(scrollToPlot = false) {
            let Kx = 2, Ky = 0, V = 0.8;
            if (kxInput) Kx = parseFloat(kxInput.value);
            if (kyInput) Ky = parseFloat(kyInput.value);
            if (vInput) V = parseFloat(vInput.value);
            const xRange = [0, 10], yRange = [0, 10];
            const expr = input.value;
            if (!validatePhiExpr(expr)) {
                if (errDiv) { errDiv.textContent = '表达式格式有误，无法预览。'; errDiv.style.display = ''; }
                return;
            }
            lastPlotData = generate2DSine(Kx, Ky, V, expr, xRange, yRange);
            plot.style.display = '';
            Plotly.newPlot(plot, [{
                z: lastPlotData.z, x: lastPlotData.x, y: lastPlotData.y, type: 'heatmap', colorscale: 'Viridis',
                colorbar: {title: 'I(x,y)'}
            }], {
                title: '二维正弦分布预览', xaxis: {title: 'x'}, yaxis: {title: 'y'},
                margin: {t:40, l:40, r:20, b:10}, height: 260
            }, {displayModeBar: false});
            if (scrollToPlot) {
                setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
            }
        }
        function updateBtnUI() {
            btn.innerHTML = isPreviewShown ? '<span class="preview-icon"></span> 收起分布' : '<span class="preview-icon"></span> 预览分布';
        }
        updateBtnUI();
        btn.addEventListener('click', function() {
            if (!isPreviewShown) {
                drawPreviewPlot();
                isPreviewShown = true;
                updateBtnUI();
            } else {
                plot.style.display = 'none';
                isPreviewShown = false;
                updateBtnUI();
            }
        });
        // 只要分布图显示，参数变动就自动刷新（但不自动滚动）
        [input, kxInput, kyInput, vInput].forEach(param => {
            if (param) {
                param.addEventListener('input', function() {
                    if (isPreviewShown) drawPreviewPlot(false);
                });
                param.addEventListener('change', function() {
                    if (isPreviewShown) drawPreviewPlot(false);
                });
                // 仅在blur时自动滚动
                param.addEventListener('blur', function() {
                    if (isPreviewShown) drawPreviewPlot(true);
                });
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', bindPhiExprUI);

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

    if (plotType === 'exposure') {
        valueLabel = LANGS[currentLang].popup_exposure_dose || '曝光剂量:';
        valueUnit = 'mJ/cm²';
        formulaTitle = LANGS[currentLang].popup_dill_exposure_title || 'Dill模型曝光剂量计算：';
        formulaMath = 'D(x) = I_avg × t_exp × (1 + V × cos(2πKx))';
        formulaExplanation = `
            <div>• I_avg: ${LANGS[currentLang].param_I_avg || '平均光强度'} (${params.I_avg} mW/cm²)</div>
            <div>• t_exp: ${LANGS[currentLang].param_t_exp || '曝光时间'} (${params.t_exp} s)</div>
            <div>• V: ${LANGS[currentLang].param_V || '干涉条纹可见度'} (${params.V})</div>
            <div>• K: ${LANGS[currentLang].param_K || '空间频率'} (${params.K})</div>
        `;
    } else if (plotType === 'thickness') {
        valueLabel = LANGS[currentLang].popup_thickness || '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = LANGS[currentLang].popup_dill_thickness_title || 'Dill模型光刻胶厚度计算：';
        formulaMath = 'M(x) = exp(-C × D(x))';
        formulaExplanation = `
            <div>• C: ${LANGS[currentLang].param_C || '光敏速率常数'} (${params.C})</div>
            <div>• D(x): ${LANGS[currentLang].popup_dose_at_point || '该点曝光剂量'} (${y.toFixed(2)} mJ/cm² - 若适用)</div>
        `;
    } else if (plotType === 'heatmap') {
        valueLabel = LANGS[currentLang].popup_exposure_dose || '曝光剂量:';
        valueUnit = 'mJ/cm²';
        formulaTitle = LANGS[currentLang].popup_dill_exposure_title || 'Dill模型二维曝光剂量:';
        formulaMath = 'D(x,y) = I_avg × t_exp × (1 + V × cos(Kx·x + Ky·y + φ(t)))';
        formulaExplanation = `
            <div>• I_avg: (${params.I_avg} mW/cm²)</div>
            <div>• t_exp: (${params.t_exp} s)</div>
            <div>• V: (${params.V})</div>
            <div>• Kx: (${params.Kx || params.K})</div>
            <div>• Ky: (${params.Ky || 'N/A'})</div>
            <div>• φ(t): (${params.phi_expr || '0'})</div>
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
        valueLabel = LANGS[currentLang].popup_exposure_dose || '曝光剂量:';
        valueUnit = 'mJ/cm²';
        formulaTitle = LANGS[currentLang].popup_enhanced_exposure_title || '增强Dill模型曝光剂量:';
        formulaMath = 'D(x,z) = ∫ I(x,z,t) dt';
        formulaExplanation = `
            <div>${LANGS[currentLang].popup_enhanced_desc || '参数涉及胶厚、前烘温度、时间等影响A,B,C的值。'}</div>
            <div>• I(x,z,t): 光强度分布</div>
        `;
    } else if (plotType === 'thickness') {
        valueLabel = LANGS[currentLang].popup_thickness || '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = LANGS[currentLang].popup_enhanced_thickness_title || '增强Dill模型光刻胶厚度:';
        formulaMath = '∂M/∂t = -I·M·C(z_h,T,t_B)';
        formulaExplanation = `
            <div>• M: ${LANGS[currentLang].popup_param_M_enh || '归一化光敏剂浓度'}</div>
            <div>• C(z_h,T,t_B): ${LANGS[currentLang].popup_param_C_enh || '光敏速率常数'}</div>
        `;
    } else if (plotType === 'heatmap') {
        valueLabel = LANGS[currentLang].popup_exposure_dose || '曝光剂量:';
        valueUnit = 'mJ/cm²';
        formulaTitle = LANGS[currentLang].popup_enhanced_exposure_title || '增强Dill模型二维曝光剂量:';
        formulaMath = 'D(x,y,z) based on A,B,C which depend on z_h, T, t_B';
         formulaExplanation = `
            <div>• Kx: (${params.Kx || params.K})</div>
            <div>• Ky: (${params.Ky || 'N/A'})</div>
            <div>• φ(t): (${params.phi_expr || '0'})</div>
        `;
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

    // CAR模型的结果图通常是显影后的形貌或脱保护度，而不是直接的曝光剂量。
    // 我们需要根据 plotType 和 CAR模型的典型输出来调整这些标签和公式。
    if (plotType === 'exposure' || plotType === 'car_acid_concentration') { // 假设 'exposure' 对于CAR可以代表光酸浓度
        valueLabel = LANGS[currentLang].popup_car_acid || '光酸浓度:';
        valueUnit = '(归一化)';
        formulaTitle = LANGS[currentLang].popup_car_acid_title || 'CAR模型光酸生成:';
        formulaMath = '[H⁺] = η·D(x) = η·I(x)·t_exp';
        formulaExplanation = `
            <div>• η: ${LANGS[currentLang].param_car_acid_gen_efficiency || '光酸产生效率'} (${params.acid_gen_efficiency})</div>
            <div>• I(x): 光强度</div>
            <div>• t_exp: ${LANGS[currentLang].param_car_t_exp || '曝光时间'} (${params.t_exp} s)</div>
        `;
    } else if (plotType === 'thickness' || plotType === 'car_deprotection_degree') { // 'thickness' 代表脱保护度或最终厚度
        valueLabel = LANGS[currentLang].popup_car_deprotection || '脱保护度/厚度:';
        valueUnit = '(归一化)';
        formulaTitle = LANGS[currentLang].popup_car_deprotection_title || 'CAR模型脱保护度:';
        formulaMath = 'M = 1-exp(-k·[H⁺]_diff·A)';
        formulaExplanation = `
            <div>• k: ${LANGS[currentLang].param_car_reaction_rate || '反应速率'} (${params.reaction_rate})</div>
            <div>• [H⁺]_diff: ${LANGS[currentLang].popup_param_H_diff_car || '扩散后光酸浓度'}</div>
            <div>• A: ${LANGS[currentLang].param_car_amplification || '放大因子'} (${params.amplification})</div>
            <div>• EPDL: ${LANGS[currentLang].param_car_diffusion_length || '扩散长度'} (${params.diffusion_length})</div>
            <div>• γ: ${LANGS[currentLang].param_car_contrast || '对比度因子'} (${params.contrast})</div>
        `;
    } else if (plotType === 'heatmap') { // 二维热力图，通常显示光酸浓度或脱保护度
        valueLabel = LANGS[currentLang].popup_car_value_heatmap || '值:'; // 通用标签
        valueUnit = '(归一化)';
        formulaTitle = LANGS[currentLang].popup_car_heatmap_title || 'CAR模型二维分布:';
        formulaMath = '依赖于具体参数和阶段';
        formulaExplanation = `
            <div>• Kx: (${params.Kx || params.K})</div>
            <div>• Ky: (${params.Ky || 'N/A'})</div>
            <div>• φ(t): (${params.phi_expr || '0'})</div>
        `;
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
            <h4>📋 ${LANGS[currentLang].popup_section_params_car || '参数组: CAR模型'}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">I_avg:</span><span class="info-value">${params.I_avg} mW/cm²</span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                 ${params.sine_type === 'multi' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : `
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K}</span></div>
                `}
                <div class="info-item"><span class="info-label">t_exp:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">η:</span><span class="info-value">${params.acid_gen_efficiency}</span></div>
                <div class="info-item"><span class="info-label">EPDL:</span><span class="info-value">${params.diffusion_length}</span></div>
                <div class="info-item"><span class="info-label">k:</span><span class="info-value">${params.reaction_rate}</span></div>
                <div class="info-item"><span class="info-label">A:</span><span class="info-value">${params.amplification}</span></div>
                <div class="info-item"><span class="info-label">γ:</span><span class="info-value">${params.contrast}</span></div>
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

/**
 * 获取单个点的详细信息
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型 ('exposure', 'thickness', 'heatmap', 'car_acid_concentration', 'car_deprotection_degree')
 * @param {Object} paramsOverride - 可选的参数对象，如果提供，则使用这些参数而不是从DOM读取
 * @returns {Object} 包含详细信息的对象 { html: "..." }
 */
function getSinglePointDetailedInfo(point, plotType, paramsOverride = null) {
    const x = point.x;
    const y = point.y;
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    let params = paramsOverride;
    let html = '';
    const setName = LANGS[currentLang].current_calculation || "当前计算"; // 单一计算，无多参数组名称
    if (!params) { // 如果没有覆盖参数，则从DOM读取
        params = {};
        if (currentModelType === 'dill') {
            params.sine_type = document.getElementById('dill-sine-type').value;
            params.I_avg = parseFloat(document.getElementById('I_avg').value);
            params.V = parseFloat(document.getElementById('V').value);
            params.t_exp = parseFloat(document.getElementById('t_exp').value);
            params.C = parseFloat(document.getElementById('C').value);
            if (params.sine_type === 'multi') {
                params.Kx = parseFloat(document.getElementById('Kx').value);
                params.Ky = parseFloat(document.getElementById('Ky').value);
                params.phi_expr = document.getElementById('phi_expr').value;
            } else {
                params.K = parseFloat(document.getElementById('K').value);
            }
        } else if (currentModelType === 'enhanced_dill') {
            params.sine_type = document.getElementById('enhanced-dill-sine-type').value;
            params.z_h = parseFloat(document.getElementById('z_h').value);
            params.T = parseFloat(document.getElementById('T').value);
            params.t_B = parseFloat(document.getElementById('t_B').value);
            params.I0 = parseFloat(document.getElementById('I0').value);
            params.M0 = parseFloat(document.getElementById('M0').value);
            params.t_exp = parseFloat(document.getElementById('t_exp_enhanced').value);
            if (params.sine_type === 'multi') {
                params.Kx = parseFloat(document.getElementById('enhanced_Kx').value);
                params.Ky = parseFloat(document.getElementById('enhanced_Ky').value);
                params.phi_expr = document.getElementById('enhanced_phi_expr').value;
            } else {
                // 增强Dill模型的一维情况可能也需要K，或者由后端处理
                // 假设它也可能使用ID为K的输入框（如果存在），或默认为一个合理值
                const kInput = document.getElementById('K'); // 尝试通用K
                params.K = kInput ? parseFloat(kInput.value) : (params.Kx || 2); // Fallback
            }
        } else if (currentModelType === 'car') {
            params.sine_type = document.getElementById('car-sine-type').value;
            params.I_avg = parseFloat(document.getElementById('car_I_avg').value);
            params.V = parseFloat(document.getElementById('car_V').value);
            params.t_exp = parseFloat(document.getElementById('car_t_exp').value);
            params.acid_gen_efficiency = parseFloat(document.getElementById('car_acid_gen_efficiency').value);
            params.diffusion_length = parseFloat(document.getElementById('car_diffusion_length').value);
            params.reaction_rate = parseFloat(document.getElementById('car_reaction_rate').value);
            params.amplification = parseFloat(document.getElementById('car_amplification').value);
            params.contrast = parseFloat(document.getElementById('car_contrast').value);
            if (params.sine_type === 'multi') {
                params.Kx = parseFloat(document.getElementById('car_Kx').value);
                params.Ky = parseFloat(document.getElementById('car_Ky').value);
                params.phi_expr = document.getElementById('car_phi_expr').value;
            } else {
                params.K = parseFloat(document.getElementById('car_K').value);
            }
        }
    }
    // 根据模型类型调用相应的HTML生成函数
    if (currentModelType === 'dill') {
        html = getDillPopupHtmlContent(x, y, setName, params, plotType);
    } else if (currentModelType === 'enhanced_dill') {
        html = getEnhancedDillPopupHtmlContent(x, y, setName, params, plotType);
    } else if (currentModelType === 'car') {
        html = getCarPopupHtmlContent(x, y, setName, params, plotType);
    } else {
        html = `<p>详细信息无法加载，模型类型未知: ${currentModelType}</p>`;
    }
    return { html };
}

// ===== 阈值滑块核心逻辑移植自compare.js，适配单组数据 =====
function initSingleThresholdControl(controlElement, index, plotType, plotData) {
    const slider = controlElement.querySelector('.threshold-slider');
    const valueText = controlElement.querySelector('.threshold-value-text');
    const toggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');
    // 只对index=0
    let minValue, maxValue, defaultValue, step, unit;
    let yData, xData;
    if (plotType === 'exposure') {
        yData = plotData.exposure_dose;
        xData = plotData.x;
        minValue = Math.max(0, Math.min(...yData) - (Math.max(...yData) - Math.min(...yData)) * 0.1);
        maxValue = Math.max(...yData) + (Math.max(...yData) - Math.min(...yData)) * 0.1;
        step = Math.max(0.1, (maxValue - minValue) / 1000);
        unit = ' mJ/cm²';
        defaultValue = minValue + (maxValue - minValue) * 0.3;
    } else {
        yData = plotData.thickness;
        xData = plotData.x;
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