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
    calculateBtn.addEventListener('click', () => {
        // 显示加载动画
        loading.classList.add('active');
        // 隐藏错误消息
        errorMessage.classList.remove('visible');
        // 隐藏结果区域
        resultsSection.classList.remove('visible');
        
        // 获取参数值
        const params = getParameterValues();
        
        // 调用API获取数据(使用交互式图表)
        calculateDillModelData(params)
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
                calculateDillModel(params)
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
                        
                        // 显示错误消息
                        errorMessage.textContent = error.message || '计算过程中发生错误';
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

    // 应用进入动画
    applyEntryAnimations();

    // 模型选择与说明区域入场动画
    setTimeout(() => {
        if(modelSelectionSection) modelSelectionSection.classList.add('loaded');
    }, 100); // 延迟一点点确保页面元素已就绪
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
            // 验证输入值是否在范围内
            let value = parseFloat(input.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            if (isNaN(value)) {
                value = min;
            } else if (value < min) {
                value = min;
            } else if (value > max) {
                value = max;
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
    return {
        I_avg: parseFloat(document.getElementById('I_avg').value),
        V: parseFloat(document.getElementById('V').value),
        K: parseFloat(document.getElementById('K').value),
        t_exp: parseFloat(document.getElementById('t_exp').value),
        C: parseFloat(document.getElementById('C').value)
    };
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
}

/**
 * 创建曝光剂量图表
 * 
 * @param {HTMLElement} container 容器元素
 * @param {Object} data 数据
 */
function createExposurePlot(container, data) {
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
        title: 'Exposure Dose Distribution',
        xaxis: {
            title: 'Position (μm)',
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: 'Exposure Dose (mJ/cm²)',
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
        title: 'Photoresist Thickness Distribution',
        xaxis: {
            title: 'Position (μm)',
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: 'Relative Thickness',
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