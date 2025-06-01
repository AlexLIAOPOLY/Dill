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
    const toggleDetailsBtn = document.getElementById('toggle-model-details-btn'); // 获取切换详情按钮
    const modelFullDetails = document.getElementById('model-full-details'); // 获取详情内容区域
    const modelSelectionSection = document.getElementById('model-selection-section'); // 获取模型选择区域
    
    // 为所有滑块绑定事件
    bindSliderEvents();
    
    // 为计算按钮绑定事件
    calculateBtn.addEventListener('click', function() {
        let modelType = modelSelect.value;
        let postData = { model_type: modelType };
        if (modelType === 'dill') {
            // 正弦波类型分支
            const sineType = document.getElementById('dill-sine-type').value;
            postData['sine_type'] = sineType;
            postData['I_avg'] = parseFloat(document.getElementById('I_avg').value);
            postData['V'] = parseFloat(document.getElementById('V').value);
            postData['t_exp'] = parseFloat(document.getElementById('t_exp').value);
            postData['C'] = parseFloat(document.getElementById('C').value);
            if (sineType === 'multi') {
                postData['Kx'] = parseFloat(document.getElementById('Kx').value);
                postData['Ky'] = parseFloat(document.getElementById('Ky').value);
                postData['phi_expr'] = document.getElementById('phi_expr').value;
                // 不传K
            } else {
                postData['K'] = parseFloat(document.getElementById('K').value);
            }
            // y范围参数（仅多维时有效）
            if (sineType === 'multi') {
                postData['y_min'] = parseFloat(document.getElementById('y_min').value);
                postData['y_max'] = parseFloat(document.getElementById('y_max').value);
                postData['y_points'] = parseInt(document.getElementById('y_points').value);
            }
        } else if (modelType === 'enhanced_dill') {
            const sineType = document.getElementById('enhanced-dill-sine-type').value;
            postData['sine_type'] = sineType;
            postData['z_h'] = parseFloat(document.getElementById('z_h').value);
            postData['T'] = parseFloat(document.getElementById('T').value);
            postData['t_B'] = parseFloat(document.getElementById('t_B').value);
            postData['I0'] = parseFloat(document.getElementById('I0').value);
            postData['M0'] = parseFloat(document.getElementById('M0').value);
            postData['t_exp'] = parseFloat(document.getElementById('t_exp_enhanced').value);
            // 优化：无论 single 还是 multi 都传递 K
            postData['K'] = parseFloat(document.getElementById('K').value);
            if (sineType === 'multi') {
                postData['Kx'] = parseFloat(document.getElementById('enhanced_Kx').value);
                postData['Ky'] = parseFloat(document.getElementById('enhanced_Ky').value);
                postData['phi_expr'] = document.getElementById('enhanced_phi_expr').value;
            }
        } else if (modelType === 'car') {
            const sineType = document.getElementById('car-sine-type').value;
            postData['sine_type'] = sineType;
            postData['I_avg'] = parseFloat(document.getElementById('car_I_avg').value);
            postData['V'] = parseFloat(document.getElementById('car_V').value);
            postData['t_exp'] = parseFloat(document.getElementById('car_t_exp').value);
            postData['acid_gen_efficiency'] = parseFloat(document.getElementById('car_acid_gen_efficiency').value);
            postData['diffusion_length'] = parseFloat(document.getElementById('car_diffusion_length').value);
            postData['reaction_rate'] = parseFloat(document.getElementById('car_reaction_rate').value);
            postData['amplification'] = parseFloat(document.getElementById('car_amplification').value);
            postData['contrast'] = parseFloat(document.getElementById('car_contrast').value);
            if (sineType === 'multi') {
                postData['Kx'] = parseFloat(document.getElementById('car_Kx').value);
                postData['Ky'] = parseFloat(document.getElementById('car_Ky').value);
                postData['phi_expr'] = document.getElementById('car_phi_expr').value;
            } else {
                postData['K'] = parseFloat(document.getElementById('car_K').value);
            }
        }
        
        // 显示加载动画
        loading.classList.add('active');
        loading.setAttribute('data-i18n', 'loading');
        loading.textContent = LANGS[currentLang].loading;
        // 隐藏错误消息
        errorMessage.classList.remove('visible');
        // 隐藏结果区域
        resultsSection.classList.remove('visible');
        
        // 调用API获取数据(使用交互式图表)
        calculateDillModelData(postData)
            .then(data => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
                // 显示结果
                displayInteractiveResults(data);
                
                // 添加动画效果
                resultsSection.classList.add('visible');
            })
            .catch(error => {
                // 如果获取数据失败，尝试获取图像
                calculateDillModel(postData)
                    .then(data => {
                        // 隐藏加载动画
                        loading.classList.remove('active');
                        
                        // 显示结果
                        displayResults(data);
                        
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
                        errorMessage.setAttribute('data-i18n', 'error_message');
                        errorMessage.classList.add('visible');
                        
                        // 添加摇晃动画
                        errorMessage.classList.add('shake');
                        setTimeout(() => {
                            errorMessage.classList.remove('shake');
                        }, 800);
                    });
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
    if (toggleDetailsBtn && modelFullDetails) {
        toggleDetailsBtn.addEventListener('click', () => {
            const isHidden = !modelFullDetails.classList.contains('details-visible');
            if (isHidden) {
                modelFullDetails.classList.add('details-visible');
                toggleDetailsBtn.textContent = '隐藏详细说明';
                // 可选：平滑滚动到详情区域的顶部
                // setTimeout(() => { // 延迟以等待展开动画完成
                //     modelFullDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                // }, 700); // 动画时间
            } else {
                modelFullDetails.classList.remove('details-visible');
                toggleDetailsBtn.textContent = '显示详细说明';
            }
        });
    }

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
    const dillK = document.getElementById('K').closest('.parameter-item');
    const dillYRange = document.getElementById('y-range-container');
    function updateDillYRangeDisplay() {
        if (dillSineType.value === 'multi') {
            dillYRange.style.display = '';
        } else {
            dillYRange.style.display = 'none';
        }
    }
    dillSineType.addEventListener('change', function() {
        if (this.value === 'multi') {
            dillMultisineParams.style.display = 'block';
            if (dillK) dillK.style.display = 'none';
        } else {
            dillMultisineParams.style.display = 'none';
            if (dillK) dillK.style.display = '';
        }
        updateDillYRangeDisplay();
    });
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
    // 隐藏静态图像
    document.getElementById('exposure-plot').style.display = 'none';
    document.getElementById('thickness-plot').style.display = 'none';
    
    // 显示交互式图表容器
    const exposurePlotContainer = document.getElementById('exposure-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-plot-container');
    exposurePlotContainer.style.display = 'block';
    thicknessPlotContainer.style.display = 'block';
    
    // 创建曝光剂量图表
    createExposurePlot(exposurePlotContainer, data);
    
    // 创建光刻胶厚度图表
    createThicknessPlot(thicknessPlotContainer, data);
    
    // 应用动画效果
    animateResults();

    // 导出按钮国际化
    document.getElementById('export-img-btn').textContent = LANGS[currentLang].export_img;
    document.getElementById('export-data-btn').textContent = LANGS[currentLang].export_data;

    // 在displayInteractiveResults中保存数据
    window.lastPlotData = data;

    // 结果展示区二维热力图
    if (data.y && data.exposure_dose && Array.isArray(data.y) && Array.isArray(data.exposure_dose[0])) {
        document.getElementById('heatmap-plot-item').style.display = '';
        const x = data.x;
        const y = data.y;
        const z = data.exposure_dose;
        Plotly.newPlot('heatmap-plot-container', [{
            z: z,
            x: x,
            y: y,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量' }
        }], {
            title: '二维曝光剂量分布',
            xaxis: { title: 'x (μm)' },
            yaxis: { title: 'y (μm)' }
        });
    } else {
        document.getElementById('heatmap-plot-item').style.display = 'none';
    }
}

/**
 * 创建曝光剂量图表
 * 
 * @param {HTMLElement} container 容器元素
 * @param {Object} data 数据
 */
function createExposurePlot(container, data) {
    // 新增：数据有效性检查
    if (!data.x || !data.exposure_dose || data.x.length === 0 || data.exposure_dose.length === 0 || data.exposure_dose.every(v => !v || isNaN(v))) {
        container.innerHTML = '<div style="color:red;padding:20px;">无有效曝光剂量数据，无法绘图。</div>';
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
        name: '曝光剂量'
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
    
    // 添加点击事件处理
    container.on('plotly_click', function(eventData) {
        const pt = eventData.points[0];
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
    // 新增：数据有效性检查
    if (!data.x || !data.thickness || data.x.length === 0 || data.thickness.length === 0 || data.thickness.every(v => !v || isNaN(v))) {
        container.innerHTML = '<div style="color:red;padding:20px;">无有效厚度数据，无法绘图。</div>';
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
        name: '相对厚度'
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
    
    // 添加点击事件处理
    container.on('plotly_click', function(eventData) {
        const pt = eventData.points[0];
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
    // 移除已存在的弹窗
    removeSinglePointDetailsPopup();
    
    // 获取当前参数值
    const params = getParameterValues();
    
    // 获取点的详细信息
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
    
    // 计算弹窗位置（相对于图表容器）
    const containerRect = container.getBoundingClientRect();
    
    // 获取图表的实际绘图区域
    const plotArea = container._fullLayout || {};
    const margin = plotArea.margin || { l: 60, r: 20, t: 60, b: 60 };
    
    // 计算实际绘图区域的尺寸
    const plotWidth = containerRect.width - margin.l - margin.r;
    const plotHeight = containerRect.height - margin.t - margin.b;
    
    // 获取x和y轴的范围
    const xRange = plotArea.xaxis ? (plotArea.xaxis.range || [0, 10]) : [0, 10];
    const yRange = plotArea.yaxis ? (plotArea.yaxis.range || [0, 100]) : [0, 100];
    
    // 将数据坐标转换为像素坐标
    const xPixel = margin.l + ((point.x - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
    const yPixel = margin.t + ((yRange[1] - point.y) / (yRange[1] - yRange[0])) * plotHeight;
    
    // 确保弹窗不会超出容器边界
    const popupWidth = 320;
    const popupHeight = 400;
    const popupX = Math.min(containerRect.width - popupWidth - 10, Math.max(10, xPixel - popupWidth / 2));
    const popupY = Math.min(containerRect.height - popupHeight - 10, Math.max(10, yPixel - 50));
    
    // 设置弹窗样式和位置
    popup.style.cssText = `
        position: absolute;
        left: ${popupX}px;
        top: ${popupY}px;
        width: ${popupWidth}px;
        max-height: ${popupHeight}px;
        background: rgba(255, 255, 255, 0.98);
        border: 2px solid #3498db;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-family: 'Roboto', Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: popupFadeIn 0.3s ease-out;
        overflow: hidden;
    `;
    
    // 添加到容器
    container.style.position = 'relative';
    container.appendChild(popup);
    
    // 添加点击外部关闭功能
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100);
    
    function handleOutsideClick(event) {
        if (!popup.contains(event.target)) {
            removeSinglePointDetailsPopup();
            document.removeEventListener('click', handleOutsideClick);
        }
    }
}

/**
 * 获取单一计算页面点的详细信息
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型
 * @param {Object} params - 当前参数值
 * @returns {Object} 包含详细信息的对象
 */
function getSinglePointDetailedInfo(point, plotType, params) {
    const x = point.x;
    const y = point.y;
    
    // 根据图表类型生成不同的信息
    let html = '';
    
    if (plotType === 'exposure') {
        html = `
            <div class="point-info-section">
                <h4>🎯 位置信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">X坐标:</span>
                        <span class="info-value">${x.toFixed(3)} μm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">曝光剂量:</span>
                        <span class="info-value">${y.toFixed(2)} mJ/cm²</span>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>📋 当前参数</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">I_avg:</span>
                        <span class="info-value">${params.I_avg} mW/cm²</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">V:</span>
                        <span class="info-value">${params.V}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">K:</span>
                        <span class="info-value">${params.K}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">t_exp:</span>
                        <span class="info-value">${params.t_exp} s</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">C:</span>
                        <span class="info-value">${params.C}</span>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>🧮 计算公式</h4>
                <div class="formula-container">
                    <div class="formula-title">Dill模型曝光剂量计算：</div>
                    <div class="formula-math">
                        E(x) = I_avg × t_exp × exp(-K × ∫[0 to x] C(x') dx')
                    </div>
                    <div class="formula-explanation">
                        <div>• I_avg: 平均光强度 (${params.I_avg} mW/cm²)</div>
                        <div>• t_exp: 曝光时间 (${params.t_exp} s)</div>
                        <div>• K: 吸收系数 (${params.K})</div>
                        <div>• C: 光刻胶浓度 (${params.C})</div>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>📊 数值分析</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="analysis-label">理论最大值:</span>
                        <span class="analysis-value">${(params.I_avg * params.t_exp).toFixed(2)} mJ/cm²</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">相对强度:</span>
                        <span class="analysis-value">${((y / (params.I_avg * params.t_exp)) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">衰减因子:</span>
                        <span class="analysis-value">${(y / (params.I_avg * params.t_exp)).toFixed(4)}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">积分深度:</span>
                        <span class="analysis-value">${(-Math.log(y / (params.I_avg * params.t_exp)) / params.K).toFixed(3)} μm</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="point-info-section">
                <h4>🎯 位置信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">X坐标:</span>
                        <span class="info-value">${x.toFixed(3)} μm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">相对厚度:</span>
                        <span class="info-value">${y.toFixed(4)}</span>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>📋 当前参数</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">I_avg:</span>
                        <span class="info-value">${params.I_avg} mW/cm²</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">V:</span>
                        <span class="info-label">${params.V}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">K:</span>
                        <span class="info-value">${params.K}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">t_exp:</span>
                        <span class="info-value">${params.t_exp} s</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">C:</span>
                        <span class="info-value">${params.C}</span>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>🧮 计算公式</h4>
                <div class="formula-container">
                    <div class="formula-title">Dill模型厚度计算：</div>
                    <div class="formula-math">
                        T(x) = T₀ × (1 - V × (1 - exp(-E(x)/E_th)))
                    </div>
                    <div class="formula-explanation">
                        <div>• T₀: 初始厚度 (归一化为1)</div>
                        <div>• V: 对比度参数 (${params.V})</div>
                        <div>• E(x): 曝光剂量</div>
                        <div>• E_th: 阈值剂量</div>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>📊 数值分析</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="analysis-label">厚度百分比:</span>
                        <span class="analysis-value">${(y * 100).toFixed(2)}%</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">溶解程度:</span>
                        <span class="analysis-value">${((1 - y) * 100).toFixed(2)}%</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">对比度影响:</span>
                        <span class="analysis-value">${(params.V * 100).toFixed(1)}%</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">工艺状态:</span>
                        <span class="analysis-value">${y > 0.5 ? '未充分曝光' : '充分曝光'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    return { html };
}

/**
 * 移除单一计算页面的点详细信息弹窗
 */
function removeSinglePointDetailsPopup() {
    const existingPopup = document.getElementById('single-point-details-popup');
    if (existingPopup) {
        existingPopup.style.animation = 'popupFadeOut 0.2s ease-in';
        setTimeout(() => {
            existingPopup.remove();
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

// phi_expr参数校验
function validatePhiExpr(expr) {
    try {
        // eslint-disable-next-line no-new-func
        new Function('t', 'return ' + expr.replace(/\b(sin|cos|pi|e)\b/g, 'Math.$1'))(0);
        return true;
    } catch {
        return false;
    }
}

// 在计算前校验phi_expr
const oldGetParameterValues = getParameterValues;
getParameterValues = function() {
    const params = oldGetParameterValues();
    const phiFields = [
        params.phi_expr,
        params.enhanced_phi_expr,
        params.car_phi_expr
    ];
    for (const expr of phiFields) {
        if (expr && !validatePhiExpr(expr)) {
            alert('phi(t)表达式格式有误，请参考示例！');
            throw new Error('phi_expr invalid');
        }
    }
    return params;
}; 