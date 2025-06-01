/**
 * Dill模型Web应用 - 比较页面脚本
 */

// 文档加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化应用
    initCompareApp();
    console.log('比较应用已初始化');
    initMobileFabBar();
    enableParameterSetDragSort();
    enableModalSwipeClose();
    enableStickyAnimations();
});

// 全局图表控制状态
let globalMeasurementActive = false;
let globalThresholdVisible = false;
// 当前模型类型
let currentModelType = 'dill';

/**
 * 初始化比较应用
 */
function initCompareApp() {
    // 获取DOM元素
    const addParameterSetBtn = document.getElementById('add-parameter-set-btn');
    const parameterSetsContainer = document.getElementById('parameter-sets-container');
    const compareBtn = document.getElementById('compare-btn');
    const comparisonResultsSection = document.getElementById('comparison-results-section');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const globalDistanceMeasureBtn = document.getElementById('global-distance-measure-btn');
    
    // 初始化模型选择
    initModelSelection();
    
    // 初始化参数组集合
    initParameterSets();
    
    // 全局距离测量按钮事件
    globalDistanceMeasureBtn.addEventListener('click', () => {
        globalMeasurementActive = !globalMeasurementActive;
        globalDistanceMeasureBtn.classList.toggle('active', globalMeasurementActive);
        // 触发图表更新
        updateAllChartsForGlobalControls();
    });
    
    // 预设配置按钮事件
    const presetPaperConfigBtn = document.getElementById('preset-paper-config');
    const presetContrastStudyBtn = document.getElementById('preset-contrast-study');
    const presetExposureStudyBtn = document.getElementById('preset-exposure-study');
    
    // 只保留参数应用，不再切换卡片显示
    presetPaperConfigBtn.addEventListener('click', () => {
        applyPaperPresetConfiguration();
        presetPaperConfigBtn.classList.add('active');
        presetContrastStudyBtn.classList.remove('active');
        presetExposureStudyBtn.classList.remove('active');
    });
    
    presetContrastStudyBtn.addEventListener('click', () => {
        applyContrastStudyConfiguration();
        presetContrastStudyBtn.classList.add('active');
        presetPaperConfigBtn.classList.remove('active');
        presetExposureStudyBtn.classList.remove('active');
    });
    
    presetExposureStudyBtn.addEventListener('click', () => {
        applyExposureStudyConfiguration();
        presetExposureStudyBtn.classList.add('active');
        presetPaperConfigBtn.classList.remove('active');
        presetContrastStudyBtn.classList.remove('active');
    });
    
    // 添加新参数组事件
    addParameterSetBtn.addEventListener('click', () => {
        addParameterSet();
    });
    
    // 比较按钮事件
    compareBtn.addEventListener('click', () => {
        // 显示加载动画
        loading.classList.add('active');
        // 隐藏错误消息
        errorMessage.classList.remove('visible');
        // 隐藏结果区域
        comparisonResultsSection.classList.remove('visible');
        
        // 获取所有参数组的参数
        const parameterSets = getAllParameterSets();
        console.log('收集到的参数组数量:', parameterSets.length);
        console.log('参数组数据:', JSON.stringify(parameterSets));
        
        // 更新阈值控制器的可见性
        updateThresholdControlsVisibility(parameterSets.length);

        // 首先尝试获取交互式图表数据
        compareParameterSetsData(parameterSets)
            .then(data => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
                console.log('API返回的数据:', data);
                console.log('曝光剂量数组长度:', data.exposure_doses.length);
                console.log('厚度数组长度:', data.thicknesses.length);
                
                // 显示交互式比较结果
                displayInteractiveComparisonResults(data);
                
                // 添加动画效果
                comparisonResultsSection.classList.add('visible');
                
                // 滚动到结果区域
                comparisonResultsSection.scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                console.error('获取交互式数据失败:', error);
                // 如果获取交互式数据失败，尝试获取静态图片
                compareParameterSets(parameterSets)
                    .then(data => {
                        // 隐藏加载动画
                        loading.classList.remove('active');
                        
                        // 显示比较结果
                        displayComparisonResults(data);
                        
                        // 添加动画效果
                        comparisonResultsSection.classList.add('visible');
                        
                        // 滚动到结果区域
                        comparisonResultsSection.scrollIntoView({ behavior: 'smooth' });
                    })
                    .catch(error => {
                        console.error('获取静态图片失败:', error);
                        // 隐藏加载动画
                        loading.classList.remove('active');
                        
                        // 显示错误消息
                        errorMessage.textContent = error.message || '比较计算过程中发生错误';
                        errorMessage.classList.add('visible');
                        
                        // 添加摇晃动画
                        errorMessage.classList.add('shake');
                        setTimeout(() => {
                            errorMessage.classList.remove('shake');
                        }, 800);
                    });
            });
    });
    
    // 应用进入动画
    applyEntryAnimations();
    // === 新增：初始化时绑定展开更多按钮事件 ===
    bindToggleDetailsEvents();
}

/**
 * 初始化模型选择
 */
function initModelSelection() {
    const modelSelect = document.getElementById('model-select');
    const dillDesc = document.getElementById('dill-desc');
    const enhancedDillDesc = document.getElementById('enhanced-dill-desc');
    const carDesc = document.getElementById('car-desc');
    // const dillToggleBtn = document.getElementById('dill-toggle-details');
    // const enhancedDillToggleBtn = document.getElementById('enhanced-dill-toggle-details');
    // const dillFullDetails = document.getElementById('dill-full-details');
    // const enhancedDillFullDetails = document.getElementById('enhanced-dill-full-details');
    // 移除展开更多详情按钮事件绑定，全部交由bindToggleDetailsEvents统一管理
    
    // 为模型选择添加事件监听
    modelSelect.addEventListener('change', function() {
        currentModelType = this.value;
        if (this.value === 'dill') {
            dillDesc.style.display = 'block';
            enhancedDillDesc.style.display = 'none';
            if (carDesc) carDesc.style.display = 'none';
            clearAllParameterSets();
            addParameterSetWithConfig('参数组 1', { I_avg: 10, V: 0.8, K: 2, t_exp: 5, C: 0.02 });
            addParameterSetWithConfig('参数组 2', { I_avg: 20, V: 0.6, K: 3, t_exp: 5, C: 0.02 });
        } else if (this.value === 'enhanced_dill') {
            dillDesc.style.display = 'none';
            enhancedDillDesc.style.display = 'block';
            if (carDesc) carDesc.style.display = 'none';
            clearAllParameterSets();
            addParameterSetWithConfig('参数组 1', { z_h: 10, T: 100, t_B: 10, I0: 1.0, M0: 1.0, t_exp: 5, K: 2 });
            addParameterSetWithConfig('参数组 2', { z_h: 20, T: 110, t_B: 15, I0: 1.0, M0: 1.0, t_exp: 5, K: 2 });
        } else if (this.value === 'car') {
            if (dillDesc) dillDesc.style.display = 'none';
            if (enhancedDillDesc) enhancedDillDesc.style.display = 'none';
            if (carDesc) carDesc.style.display = 'block';
            clearAllParameterSets();
            addParameterSetWithConfig('参数组 1', {
                I_avg: 10, V: 0.8, K: 2, t_exp: 5, acid_gen_efficiency: 0.5, diffusion_length: 3, reaction_rate: 0.3, amplification: 10, contrast: 3
            });
            addParameterSetWithConfig('参数组 2', {
                I_avg: 20, V: 0.6, K: 3, t_exp: 5, acid_gen_efficiency: 0.6, diffusion_length: 5, reaction_rate: 0.4, amplification: 15, contrast: 2
            });
        }
        clearAllCharts();
    });
}

/**
 * 初始化参数组集合
 */
function initParameterSets() {
    const parameterSets = document.querySelectorAll('.parameter-set');
    parameterSets.forEach((set, idx) => {
        initParameterSet(set);
        initParameterSetCollapse(set, idx === 0);
    });
}

/**
 * 初始化单个参数组
 * 
 * @param {HTMLElement} parameterSet 参数组元素
 */
function initParameterSet(parameterSet) {
    // 为复制按钮绑定事件
    const copyBtn = parameterSet.querySelector('.fa-copy').parentElement;
    copyBtn.addEventListener('click', () => {
        duplicateParameterSet(parameterSet);
    });
    
    // 为删除按钮绑定事件（如果存在）
    const removeBtn = parameterSet.querySelector('.remove-set-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            removeParameterSet(parameterSet);
        });
    }
    
    // 为参数组名称输入框绑定事件
    const nameInput = parameterSet.querySelector('.parameter-set-name-input');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            // 清空图表显示
            clearAllCharts();
        });
    }
    
    // 为所有滑块绑定事件
    bindSliderEvents(parameterSet);
    
    // 参数组渲染/切换时，处理phi_expr输入区
    updatePhiExprUI(parameterSet);
}

/**
 * 绑定滑块事件
 * 
 * @param {HTMLElement} parameterSet 参数组元素
 */
function bindSliderEvents(parameterSet) {
    // 获取所有参数滑块和输入框
    const parameterItems = parameterSet.querySelectorAll('.parameter-item');
    
    parameterItems.forEach(item => {
        const slider = item.querySelector('.slider');
        const input = item.querySelector('.number-input');
        const valueDisplay = item.querySelector('.parameter-value');
        
        // 滑块值变化时更新输入框和显示值
        slider.addEventListener('input', () => {
            input.value = slider.value;
            valueDisplay.textContent = slider.value;
            
            // 添加脉动效果
            valueDisplay.classList.add('pulse');
            setTimeout(() => {
                valueDisplay.classList.remove('pulse');
            }, 300);
            
            // 清空图表显示
            clearAllCharts();
        });
        
        // 输入框值变化时更新滑块和显示值
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
            valueDisplay.textContent = value;
            
            // 添加闪烁效果
            valueDisplay.classList.add('blink');
            setTimeout(() => {
                valueDisplay.classList.remove('blink');
            }, 300);
            
            // 清空图表显示
            clearAllCharts();
        });
    });
}

/**
 * 添加新参数组
 */
function addParameterSet() {
    const parameterSetsContainer = document.getElementById('parameter-sets-container');
    let templateId = 'dill-parameter-set-template';
    if (currentModelType === 'enhanced_dill') templateId = 'enhanced-dill-parameter-set-template';
    else if (currentModelType === 'car') templateId = 'car-parameter-set-template';
    const template = document.getElementById(templateId);
    const newSet = template.content.cloneNode(true).querySelector('.parameter-set');
    const nextId = getNextSetId();
    newSet.dataset.setId = nextId;
    const title = newSet.querySelector('.parameter-set-title');
    title.innerHTML = LANGS[currentLang]['compare_set_title'].replace('{n}', nextId);
    initParameterSet(newSet);
    initParameterSetCollapse(newSet, false);
    parameterSetsContainer.appendChild(newSet);
    newSet.classList.add('fade-in');
    setTimeout(() => { newSet.classList.remove('fade-in'); }, 500);
    if (typeof applyLang === 'function') applyLang(currentLang);
    clearAllCharts();
    return newSet;
}

/**
 * 获取下一个参数组ID
 * 
 * @returns {number} 下一个可用的参数组ID
 */
function getNextSetId() {
    const sets = document.querySelectorAll('.parameter-set');
    let maxId = 0;
    
    sets.forEach(set => {
        const id = parseInt(set.dataset.setId);
        if (id > maxId) {
            maxId = id;
        }
    });
    
    return maxId + 1;
}

/**
 * 复制参数组
 * 
 * @param {HTMLElement} parameterSet 要复制的参数组元素
 */
function duplicateParameterSet(parameterSet) {
    const parameterSetsContainer = document.getElementById('parameter-sets-container');
    let templateId = 'dill-parameter-set-template';
    if (currentModelType === 'enhanced_dill') templateId = 'enhanced-dill-parameter-set-template';
    else if (currentModelType === 'car') templateId = 'car-parameter-set-template';
    const template = document.getElementById(templateId);
    const newSet = template.content.cloneNode(true).querySelector('.parameter-set');
    const nextId = getNextSetId();
    newSet.dataset.setId = nextId;
    const title = newSet.querySelector('.parameter-set-title');
    title.innerHTML = LANGS[currentLang]['compare_set_title'].replace('{n}', nextId);
    initParameterSet(newSet);
    if (currentModelType === 'dill') {
        newSet.querySelector('.slider.I_avg').value = parameterSet.querySelector('.slider.I_avg').value;
        newSet.querySelector('.slider.V').value = parameterSet.querySelector('.slider.V').value;
        newSet.querySelector('.slider.K').value = parameterSet.querySelector('.slider.K').value;
        newSet.querySelector('.slider.t_exp').value = parameterSet.querySelector('.slider.t_exp').value;
        newSet.querySelector('.slider.C').value = parameterSet.querySelector('.slider.C').value;
    } else if (currentModelType === 'enhanced_dill') {
        newSet.querySelector('.slider.z_h').value = parameterSet.querySelector('.slider.z_h').value;
        newSet.querySelector('.slider.T').value = parameterSet.querySelector('.slider.T').value;
        newSet.querySelector('.slider.t_B').value = parameterSet.querySelector('.slider.t_B').value;
        newSet.querySelector('.slider.I0').value = parameterSet.querySelector('.slider.I0').value;
        newSet.querySelector('.slider.M0').value = parameterSet.querySelector('.slider.M0').value;
        newSet.querySelector('.slider.t_exp_enhanced').value = parameterSet.querySelector('.slider.t_exp_enhanced').value;
        newSet.querySelector('.slider.K_enhanced').value = parameterSet.querySelector('.slider.K_enhanced').value;
    } else if (currentModelType === 'car') {
        newSet.querySelector('.slider.car_I_avg').value = parameterSet.querySelector('.slider.car_I_avg').value;
        newSet.querySelector('.slider.car_V').value = parameterSet.querySelector('.slider.car_V').value;
        newSet.querySelector('.slider.car_K').value = parameterSet.querySelector('.slider.car_K').value;
        newSet.querySelector('.slider.car_t_exp').value = parameterSet.querySelector('.slider.car_t_exp').value;
        newSet.querySelector('.slider.car_acid_gen_efficiency').value = parameterSet.querySelector('.slider.car_acid_gen_efficiency').value;
        newSet.querySelector('.slider.car_diffusion_length').value = parameterSet.querySelector('.slider.car_diffusion_length').value;
        newSet.querySelector('.slider.car_reaction_rate').value = parameterSet.querySelector('.slider.car_reaction_rate').value;
        newSet.querySelector('.slider.car_amplification').value = parameterSet.querySelector('.slider.car_amplification').value;
        newSet.querySelector('.slider.car_contrast').value = parameterSet.querySelector('.slider.car_contrast').value;
    }
    newSet.querySelectorAll('.parameter-item').forEach(item => {
        const slider = item.querySelector('.slider');
        const input = item.querySelector('.number-input');
        const valueDisplay = item.querySelector('.parameter-value');
        input.value = slider.value;
        valueDisplay.textContent = slider.value;
    });
    parameterSetsContainer.appendChild(newSet);
    newSet.classList.add('fade-in');
    setTimeout(() => { newSet.classList.remove('fade-in'); }, 500);
    clearAllCharts();
    return newSet;
}

/**
 * 删除参数组
 * 
 * @param {HTMLElement} parameterSet 要删除的参数组元素
 */
function removeParameterSet(parameterSet) {
    // 移除参数组
    parameterSet.remove();
    
    // 更新阈值控制器的可见性
    updateThresholdControlsVisibility(document.querySelectorAll('.parameter-set').length);

    // TODO: 更新参数组标题编号等（如果需要）
    // 清理相关的阈值线
    const allSets = document.querySelectorAll('.parameter-set');
    clearStaleThresholdLines(allSets.length);
    
    // 清空图表显示
    clearAllCharts();
}

/**
 * 获取所有参数组的参数
 * 
 * @returns {Array} 参数组数组
 */
function getAllParameterSets() {
    const parameterSets = [];
    const sets = document.querySelectorAll('.parameter-set');
    sets.forEach(set => {
        const setId = set.dataset.setId;
        const nameInput = set.querySelector('.parameter-set-name-input');
        const customName = nameInput.value.trim();
        const params = { 'model_type': currentModelType, 'setId': setId };
        if (currentModelType === 'dill') {
            params['I_avg'] = parseFloat(set.querySelector('.slider.I_avg').value);
            params['V'] = parseFloat(set.querySelector('.slider.V').value);
            params['K'] = parseFloat(set.querySelector('.slider.K').value);
            params['t_exp'] = parseFloat(set.querySelector('.slider.t_exp').value);
            params['C'] = parseFloat(set.querySelector('.slider.C').value);
        } else if (currentModelType === 'enhanced_dill') {
            params['z_h'] = parseFloat(set.querySelector('.slider.z_h').value);
            params['T'] = parseFloat(set.querySelector('.slider.T').value);
            params['t_B'] = parseFloat(set.querySelector('.slider.t_B').value);
            params['I0'] = parseFloat(set.querySelector('.slider.I0').value);
            params['M0'] = parseFloat(set.querySelector('.slider.M0').value);
            params['t_exp'] = parseFloat(set.querySelector('.slider.t_exp_enhanced').value);
            params['K'] = parseFloat(set.querySelector('.slider.K_enhanced').value);
        } else if (currentModelType === 'car') {
            params['I_avg'] = parseFloat(set.querySelector('.slider.car_I_avg').value);
            params['V'] = parseFloat(set.querySelector('.slider.car_V').value);
            params['K'] = parseFloat(set.querySelector('.slider.car_K').value);
            params['t_exp'] = parseFloat(set.querySelector('.slider.car_t_exp').value);
            params['acid_gen_efficiency'] = parseFloat(set.querySelector('.slider.car_acid_gen_efficiency').value);
            params['diffusion_length'] = parseFloat(set.querySelector('.slider.car_diffusion_length').value);
            params['reaction_rate'] = parseFloat(set.querySelector('.slider.car_reaction_rate').value);
            params['amplification'] = parseFloat(set.querySelector('.slider.car_amplification').value);
            params['contrast'] = parseFloat(set.querySelector('.slider.car_contrast').value);
        }
        if (customName) params['customName'] = customName;
        parameterSets.push(params);
    });
    return parameterSets;
}

/**
 * 调用API比较参数组
 * 
 * @param {Array} parameterSets 参数组数组
 * @returns {Promise} Promise对象
 */
async function compareParameterSets(parameterSets) {
    try {
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ parameter_sets: parameterSets })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '比较计算失败');
        }
        
        return result.data;
    } catch (error) {
        console.error('API调用错误:', error);
        throw error;
    }
}

/**
 * 调用API获取比较数据(用于交互式图表)
 * 
 * @param {Array} parameterSets 参数组数组
 * @returns {Promise} Promise对象
 */
async function compareParameterSetsData(parameterSets) {
    try {
        console.log('发送到API的参数组数量:', parameterSets.length);
        console.log('发送到API的数据:', JSON.stringify({ parameter_sets: parameterSets }));
        
        const response = await fetch('/api/compare_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ parameter_sets: parameterSets })
        });
        
        const result = await response.json();
        console.log('API响应:', result);
        
        if (!result.success) {
            throw new Error(result.message || '比较数据计算失败');
        }
        
        return result.data;
    } catch (error) {
        console.error('API数据调用错误:', error);
        throw error;
    }
}

/**
 * 显示比较结果
 * 
 * @param {Object} data 比较结果数据
 */
function displayComparisonResults(data) {
    if (currentModelType === 'car') {
        document.getElementById('car-comparison-results').style.display = 'block';
        const carPlotContainer = document.getElementById('car-comparison-plot-container');
        carPlotContainer.innerHTML = '';
        if (data.car_plot_data) {
            Plotly.newPlot(carPlotContainer, data.car_plot_data.traces, data.car_plot_data.layout, data.car_plot_data.config);
        }
        document.getElementById('exposure-comparison-plot-container').style.display = 'none';
        document.getElementById('thickness-comparison-plot-container').style.display = 'none';
        document.getElementById('exposure-comparison-plot').style.display = 'none';
        document.getElementById('thickness-comparison-plot').style.display = 'none';
    } else {
        document.getElementById('car-comparison-results').style.display = 'none';
        // 获取图像元素
        const exposureComparisonPlot = document.getElementById('exposure-comparison-plot');
        const thicknessComparisonPlot = document.getElementById('thickness-comparison-plot');
        
        // 设置图像源（Base64数据）
        exposureComparisonPlot.src = `data:image/png;base64,${data.exposure_comparison_plot}`;
        thicknessComparisonPlot.src = `data:image/png;base64,${data.thickness_comparison_plot}`;
        
        // 显示静态图像
        exposureComparisonPlot.style.display = 'block';
        thicknessComparisonPlot.style.display = 'block';
        
        // 隐藏交互式图表容器
        document.getElementById('exposure-comparison-plot-container').style.display = 'none';
        document.getElementById('thickness-comparison-plot-container').style.display = 'none';
        
        // 创建图例
        createLegend('exposure-legend', data.colors);
        createLegend('thickness-legend', data.colors);
        
        // 应用动画效果
        animateResults();
    }
}

/**
 * 显示交互式比较结果
 * 
 * @param {Object} data 比较结果数据
 */
function displayInteractiveComparisonResults(data) {
    // 统一所有模型都用交互式Plotly图表
    document.getElementById('car-comparison-results').style.display = 'none';
    // 隐藏静态图像
    document.getElementById('exposure-comparison-plot').style.display = 'none';
    document.getElementById('thickness-comparison-plot').style.display = 'none';

    // 显示交互式图表容器
    const exposurePlotContainer = document.getElementById('exposure-comparison-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-comparison-plot-container');
    exposurePlotContainer.style.display = 'block';
    thicknessPlotContainer.style.display = 'block';

    // 创建交互式图表
    createExposureComparisonPlot(exposurePlotContainer, data);
    createThicknessComparisonPlot(thicknessPlotContainer, data);

    // 初始化阈值控制器
    setTimeout(() => {
        initAllThresholdControls();
        setTimeout(() => {
            reinitializeThresholdControls();
        }, 200);
    }, 100);

    document.getElementById('exposure-legend').innerHTML = '';
    document.getElementById('thickness-legend').innerHTML = '';
    animateResults();
}

/**
 * 创建曝光剂量比较图表
 * 
 * @param {HTMLElement} container 容器元素
 * @param {Object} data 数据
 */
function createExposureComparisonPlot(container, data) {
    // 定义颜色
    const colors = [
        'rgb(31, 119, 180)', 'rgb(255, 127, 14)', 'rgb(44, 160, 44)', 
        'rgb(214, 39, 40)', 'rgb(148, 103, 189)', 'rgb(140, 86, 75)'
    ];
    
    console.log('创建曝光剂量图表，曝光数据组数:', data.exposure_doses.length);
    
    // 准备数据
    const traces = data.exposure_doses.map((item, index) => {
        console.log(`处理曝光剂量数据组 ${index+1}:`, item);
        const setName = item.params.customName && item.params.customName !== '' 
            ? item.params.customName 
            : `参数组 ${item.setId}`;
            
        return {
            x: data.x,
            y: item.data,
            type: 'scatter',
            mode: 'lines',
            name: setName,
            line: {
                color: colors[index % colors.length],
                width: 2
            },
            hoverinfo: 'x+y+name',
            hovertemplate: '位置: %{x:.2f} μm<br>曝光剂量: %{y:.2f} mJ/cm²<br>' + setName + '<extra></extra>'
        };
    });
    
    // 添加光刻胶阈值线（默认隐藏）
    traces.push({
        x: data.x,
        y: Array(data.x.length).fill(50), // 默认阈值50 mJ/cm²
        type: 'scatter',
        mode: 'lines',
        name: '光刻胶阈值',
        line: {
            color: 'rgba(0, 0, 0, 0.7)',
            width: 1.5,
            dash: 'dash'
        },
        visible: false
    });
    
    // 布局设置
    const layout = {
        title: {
            text: 'Exposure Dose Distribution Comparison',
            font: {
                family: 'Roboto, Arial, sans-serif',
                size: 18,
                color: '#34495e'
            },
            x: 0.5,
            xanchor: 'center'
        },
        xaxis: {
            title: {
                text: 'Position (μm)',
                font: {
                    family: 'Roboto, Arial, sans-serif',
                    size: 14,
                    color: '#34495e'
                }
            },
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: {
                text: 'Exposure Dose (mJ/cm²)',
                font: {
                    family: 'Roboto, Arial, sans-serif',
                    size: 14,
                    color: '#34495e'
                }
            },
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        legend: {
            x: 0.99,
            y: 0.99,
            xanchor: 'right',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            bordercolor: 'rgba(200, 200, 200, 0.5)',
            borderwidth: 1,
            font: {
                family: 'Roboto, Arial, sans-serif',
                size: 12
            }
        },
        hovermode: 'closest',
        margin: { t: 80, r: 50, b: 80, l: 80 },
        plot_bgcolor: 'rgb(255, 255, 255)',
        paper_bgcolor: 'rgb(255, 255, 255)',
        annotations: [],
        updatemenus: [],
        shapes: []
    };
    
    // 配置选项
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            filename: '曝光剂量分布比较',
            width: 1200,
            height: 800
        }
    };
    
    // 创建图表
    const plotInstance = Plotly.newPlot(container, traces, layout, config);
    
    // 存储原始trace数量，用于后续清理
    container.originalTraceCount = traces.length;
    
    // 移除旧的阈值控制器，因为我们现在使用独立的阈值控制器
    // 不再创建旧的阈值控制器
    
    // 点击事件处理
    container.on('plotly_click', function(data) {
        const pt = data.points[0];
        
        if (globalMeasurementActive) {
            // 测量模式：执行原有的测量逻辑
            let firstPoint = container.firstPoint;
            let measurementComplete = container.measurementComplete;
            
            if (measurementComplete) {
                clearMeasurementResults(container);
                return;
            }
            
            if (!firstPoint) {
                firstPoint = {
                    x: pt.x,
                    y: pt.y
                };
                container.firstPoint = firstPoint;
                container.measurementComplete = false;
                
                Plotly.addTraces(container, {
                    x: [pt.x],
                    y: [pt.y],
                    mode: 'markers',
                    marker: {
                        size: 10,
                        color: '#e74c3c',
                        line: {
                            width: 2,
                            color: '#c0392b'
                        }
                    },
                    showlegend: false,
                    hoverinfo: 'none'
                });
                
                Plotly.relayout(container, {
                    annotations: [{
                        text: '物理测量: 选择第二个点',
                        x: 0.5,
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'bottom',
                        showarrow: false,
                        font: {
                            color: '#e74c3c',
                            size: 14
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        bordercolor: '#e74c3c',
                        borderwidth: 1
                    }]
                });
            } else {
                const dx = Math.abs(pt.x - firstPoint.x);
                const dy = Math.abs(pt.y - firstPoint.y);
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                Plotly.addTraces(container, [
                    {
                        x: [firstPoint.x, pt.x],
                        y: [firstPoint.y, pt.y],
                        mode: 'lines+markers',
                        line: {
                            color: '#e74c3c',
                            width: 2,
                            dash: 'dash'
                        },
                        marker: {
                            size: 10,
                            color: '#e74c3c',
                            line: {
                                width: 2,
                                color: '#c0392b'
                            }
                        },
                        showlegend: false,
                        hoverinfo: 'none'
                    }
                ]);
                
                Plotly.relayout(container, {
                    annotations: [{
                        text: `测量结果: Δx=${dx.toFixed(2)} μm, Δy=${dy.toFixed(3)}, 距离=${distance.toFixed(3)} 单位 (点击清除)`,
                        x: 0.5,
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'bottom',
                        showarrow: false,
                        font: {
                            color: '#2ecc71',
                            size: 14
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        bordercolor: '#2ecc71',
                        borderwidth: 1
                    }]
                });
                
                container.measurementComplete = true;
            }
        } else {
            // 信息模式：显示点的详细信息
            showPointDetailsPopup(pt, 'exposure', container, data);
        }
    });
    
    // 添加注释点击事件处理（用于展开/折叠阈值分析详情）
    container.on('plotly_clickannotation', function(event) {
        const annotation = event.annotation;
        if (annotation.name && annotation.name.includes('_title')) {
            // 提取阈值索引和图表类型
            const nameParts = annotation.name.split('_');
            const plotType = nameParts[1]; // 'exposure' 或 'thickness'
            const thresholdIndex = nameParts[2]; // '0', '1', '2', '3'
            
            const detailsName = `threshold_${plotType}_${thresholdIndex}_details`;
            const titleName = `threshold_${plotType}_${thresholdIndex}_title`;
            
            // 查找对应的详细信息注释
            const currentAnnotations = container.layout.annotations || [];
            const detailsAnnotation = currentAnnotations.find(a => a.name === detailsName);
            const titleAnnotation = currentAnnotations.find(a => a.name === titleName);
            
            if (detailsAnnotation && titleAnnotation) {
                // 切换详细信息的可见性
                const isCurrentlyVisible = detailsAnnotation.visible !== false;
                
                // 如果要显示详细信息，创建自定义HTML覆盖层
                if (!isCurrentlyVisible) {
                    createThresholdDetailsOverlay(container, plotType, thresholdIndex, detailsAnnotation.text);
                } else {
                    removeThresholdDetailsOverlay(container, plotType, thresholdIndex);
                }
                
                // 更新注释
                const updatedAnnotations = currentAnnotations.map(a => {
                    if (a.name === detailsName) {
                        return { ...a, visible: !isCurrentlyVisible };
                    } else if (a.name === titleName) {
                        // 更新标题中的箭头方向
                        const currentText = a.text;
                        const newArrow = isCurrentlyVisible ? '▼' : '▲';
                        const newText = currentText.replace(/[▼▲]/, newArrow);
                        return { ...a, text: newText };
                    }
                    return a;
                });
                
                Plotly.relayout(container, { annotations: updatedAnnotations });
            }
        }
    });
}

/**
 * 创建光刻胶厚度比较图表
 * 
 * @param {HTMLElement} container 容器元素
 * @param {Object} data 数据
 */
function createThicknessComparisonPlot(container, data) {
    // 定义颜色
    const colors = [
        'rgb(31, 119, 180)', 'rgb(255, 127, 14)', 'rgb(44, 160, 44)', 
        'rgb(214, 39, 40)', 'rgb(148, 103, 189)', 'rgb(140, 86, 75)'
    ];
    
    console.log('创建厚度图表，厚度数据组数:', data.thicknesses.length);
    
    // 准备数据
    const traces = data.thicknesses.map((item, index) => {
        console.log(`处理厚度数据组 ${index+1}:`, item);
        const setName = item.params.customName && item.params.customName !== '' 
            ? item.params.customName 
            : `参数组 ${item.setId}`;
            
        return {
            x: data.x,
            y: item.data,
            type: 'scatter',
            mode: 'lines',
            name: setName,
            line: {
                color: colors[index % colors.length],
                width: 2
            },
            hoverinfo: 'x+y+name',
            hovertemplate: '位置: %{x:.2f} μm<br>相对厚度: %{y:.2f}<br>' + setName + '<extra></extra>'
        };
    });
    
    // 添加阈值线（默认隐藏）
    traces.push({
        x: data.x,
        y: Array(data.x.length).fill(0.5), // 默认阈值0.5
        type: 'scatter',
        mode: 'lines',
        name: '厚度阈值',
        line: {
            color: 'rgba(0, 0, 0, 0.7)',
            width: 1.5,
            dash: 'dash'
        },
        visible: false
    });
    
    // 布局设置
    const layout = {
        title: {
            text: 'Photoresist Thickness Distribution Comparison',
            font: {
                family: 'Roboto, Arial, sans-serif',
                size: 18,
                color: '#34495e'
            },
            x: 0.5,
            xanchor: 'center'
        },
        xaxis: {
            title: {
                text: 'Position (μm)',
                font: {
                    family: 'Roboto, Arial, sans-serif',
                    size: 14,
                    color: '#34495e'
                }
            },
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: {
                text: 'Relative Thickness',
                font: {
                    family: 'Roboto, Arial, sans-serif',
                    size: 14,
                    color: '#34495e'
                }
            },
            gridcolor: 'rgb(238, 238, 238)',
            showgrid: true,
            zeroline: false
        },
        legend: {
            x: 0.99,
            y: 0.99,
            xanchor: 'right',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            bordercolor: 'rgba(200, 200, 200, 0.5)',
            borderwidth: 1,
            font: {
                family: 'Roboto, Arial, sans-serif',
                size: 12
            }
        },
        hovermode: 'closest',
        margin: { t: 80, r: 50, b: 80, l: 80 },
        plot_bgcolor: 'rgb(255, 255, 255)',
        paper_bgcolor: 'rgb(255, 255, 255)',
        annotations: [],
        updatemenus: [],
        shapes: []
    };
    
    // 配置选项
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            filename: '光刻胶厚度分布比较',
            width: 1200,
            height: 800
        }
    };
    
    // 创建图表
    const plotInstance = Plotly.newPlot(container, traces, layout, config);
    
    // 存储原始trace数量，用于后续清理
    container.originalTraceCount = traces.length;
    
    // 移除旧的阈值控制器，因为我们现在使用独立的阈值控制器
    // 不再创建旧的阈值控制器
    
    // 点击事件处理
    container.on('plotly_click', function(data) {
        const pt = data.points[0];
        
        if (globalMeasurementActive) {
            // 测量模式：执行原有的测量逻辑
            let firstPoint = container.firstPoint;
            let measurementComplete = container.measurementComplete;
            
            if (measurementComplete) {
                clearMeasurementResults(container);
                return;
            }
            
            if (!firstPoint) {
                firstPoint = {
                    x: pt.x,
                    y: pt.y
                };
                container.firstPoint = firstPoint;
                container.measurementComplete = false;
                
                Plotly.addTraces(container, {
                    x: [pt.x],
                    y: [pt.y],
                    mode: 'markers',
                    marker: {
                        size: 10,
                        color: '#e74c3c',
                        line: {
                            width: 2,
                            color: '#c0392b'
                        }
                    },
                    showlegend: false,
                    hoverinfo: 'none'
                });
                
                Plotly.relayout(container, {
                    annotations: [{
                        text: '物理测量: 选择第二个点',
                        x: 0.5,
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'bottom',
                        showarrow: false,
                        font: {
                            color: '#e74c3c',
                            size: 14
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        bordercolor: '#e74c3c',
                        borderwidth: 1
                    }]
                });
            } else {
                const dx = Math.abs(pt.x - firstPoint.x);
                const dy = Math.abs(pt.y - firstPoint.y);
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                Plotly.addTraces(container, [
                    {
                        x: [firstPoint.x, pt.x],
                        y: [firstPoint.y, pt.y],
                        mode: 'lines+markers',
                        line: {
                            color: '#e74c3c',
                            width: 2,
                            dash: 'dash'
                        },
                        marker: {
                            size: 10,
                            color: '#e74c3c',
                            line: {
                                width: 2,
                                color: '#c0392b'
                            }
                        },
                        showlegend: false,
                        hoverinfo: 'none'
                    }
                ]);
                
                Plotly.relayout(container, {
                    annotations: [{
                        text: `测量结果: Δx=${dx.toFixed(2)} μm, Δy=${dy.toFixed(3)}, 距离=${distance.toFixed(3)} 单位 (点击清除)`,
                        x: 0.5,
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'bottom',
                        showarrow: false,
                        font: {
                            color: '#2ecc71',
                            size: 14
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        bordercolor: '#2ecc71',
                        borderwidth: 1
                    }]
                });
                
                container.measurementComplete = true;
            }
        } else {
            // 信息模式：显示点的详细信息
            showPointDetailsPopup(pt, 'thickness', container, data);
        }
    });
    
    // 添加注释点击事件处理（用于展开/折叠阈值分析详情）
    container.on('plotly_clickannotation', function(event) {
        const annotation = event.annotation;
        if (annotation.name && annotation.name.includes('_title')) {
            // 提取阈值索引和图表类型
            const nameParts = annotation.name.split('_');
            const plotType = nameParts[1]; // 'exposure' 或 'thickness'
            const thresholdIndex = nameParts[2]; // '0', '1', '2', '3'
            
            const detailsName = `threshold_${plotType}_${thresholdIndex}_details`;
            const titleName = `threshold_${plotType}_${thresholdIndex}_title`;
            
            // 查找对应的详细信息注释
            const currentAnnotations = container.layout.annotations || [];
            const detailsAnnotation = currentAnnotations.find(a => a.name === detailsName);
            const titleAnnotation = currentAnnotations.find(a => a.name === titleName);
            
            if (detailsAnnotation && titleAnnotation) {
                // 切换详细信息的可见性
                const isCurrentlyVisible = detailsAnnotation.visible !== false;
                
                // 如果要显示详细信息，创建自定义HTML覆盖层
                if (!isCurrentlyVisible) {
                    createThresholdDetailsOverlay(container, plotType, thresholdIndex, detailsAnnotation.text);
                } else {
                    removeThresholdDetailsOverlay(container, plotType, thresholdIndex);
                }
                
                // 更新注释
                const updatedAnnotations = currentAnnotations.map(a => {
                    if (a.name === detailsName) {
                        return { ...a, visible: !isCurrentlyVisible };
                    } else if (a.name === titleName) {
                        // 更新标题中的箭头方向
                        const currentText = a.text;
                        const newArrow = isCurrentlyVisible ? '▼' : '▲';
                        const newText = currentText.replace(/[▼▲]/, newArrow);
                        return { ...a, text: newText };
                    }
                    return a;
                });
                
                Plotly.relayout(container, { annotations: updatedAnnotations });
            }
        }
    });
}

/**
 * 应用结果动画
 */
function animateResults() {
    const plotContainers = document.querySelectorAll('.comparison-plot-container');
    
    plotContainers.forEach((container, index) => {
        // 添加动画类
        container.classList.add('fade-in-up');
        container.style.animationDelay = `${0.2 * index}s`;
        
        // 一段时间后移除动画类，以便可以重复触发
        setTimeout(() => {
            container.classList.remove('fade-in-up');
            container.style.animationDelay = '';
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
    const parameterSets = document.querySelectorAll('.parameter-set');
    const compareBtn = document.getElementById('compare-btn');
    const addBtn = document.getElementById('add-parameter-set-btn');
    
    // 头部动画
    header.classList.add('fade-in-down');
    
    // 参数区域动画
    setTimeout(() => {
        parametersSection.classList.add('fade-in');
    }, 200);
    
    // 添加按钮动画
    setTimeout(() => {
        addBtn.classList.add('fade-in-left');
        
        // 移除动画类
        setTimeout(() => {
            addBtn.classList.remove('fade-in-left');
        }, 1000);
    }, 400);
    
    // 参数组动画
    parameterSets.forEach((set, index) => {
        setTimeout(() => {
            set.classList.add('fade-in-right');
            
            // 移除动画类
            setTimeout(() => {
                set.classList.remove('fade-in-right');
            }, 1000);
        }, 600 + index * 200);
    });
    
    // 比较按钮动画
    setTimeout(() => {
        compareBtn.classList.add('fade-in-up');
        
        // 移除动画类
        setTimeout(() => {
            compareBtn.classList.remove('fade-in-up');
        }, 1000);
    }, 1000);
}

// 创建图例
function createLegend(containerId, colors) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const parameterSets = document.querySelectorAll('.parameter-set');
    
    parameterSets.forEach((set, index) => {
        const color = colors[index];
        const setId = set.dataset.setId;
        const customName = set.querySelector('.parameter-set-name-input').value.trim();
        const setName = customName !== '' ? customName : `参数组 ${setId}`;
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;
        
        const label = document.createElement('span');
        label.textContent = setName;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        container.appendChild(legendItem);
    });
}

/**
 * 更新所有图表以响应全局控件的变化
 */
function updateAllChartsForGlobalControls() {
    const exposurePlotContainer = document.getElementById('exposure-comparison-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-comparison-plot-container');

    // 更新曝光剂量图表
    if (exposurePlotContainer && exposurePlotContainer.data) {
        const newExposureLayout = {
            shapes: [], // 总是重置形状，避免旧的测量线残留
            clickmode: globalMeasurementActive ? 'event+select' : false // 设置点击模式
        };

        Plotly.relayout(exposurePlotContainer, newExposureLayout);
        
        // 添加或移除测量模式的视觉反馈
        if (globalMeasurementActive) {
            exposurePlotContainer.classList.add('measurement-active');
        } else {
            exposurePlotContainer.classList.remove('measurement-active');
        }

        // 如果距离测量关闭，清除可能存在的第一个点（针对该图表实例）
        if (!globalMeasurementActive && exposurePlotContainer.firstPoint) {
            exposurePlotContainer.firstPoint = null;
            exposurePlotContainer.measurementComplete = false;
            // 清除可能由plotly_click添加的临时标记点和测量线
            const currentTraces = exposurePlotContainer.data.length;
            const originalTraces = exposurePlotContainer.originalTraceCount || currentTraces;
            if (currentTraces > originalTraces) {
                const tracesToDelete = [];
                for (let i = originalTraces; i < currentTraces; i++) {
                    tracesToDelete.push(i);
                }
                if (tracesToDelete.length > 0) {
                    Plotly.deleteTraces(exposurePlotContainer, tracesToDelete);
                }
            }
            // 清除注释
            Plotly.relayout(exposurePlotContainer, {
                annotations: []
            });
        }
    }

    // 更新光刻胶厚度图表
    if (thicknessPlotContainer && thicknessPlotContainer.data) {
        const newThicknessLayout = {
            shapes: [], // 总是重置形状
            clickmode: globalMeasurementActive ? 'event+select' : false // 设置点击模式
        };

        Plotly.relayout(thicknessPlotContainer, newThicknessLayout);
        
        // 添加或移除测量模式的视觉反馈
        if (globalMeasurementActive) {
            thicknessPlotContainer.classList.add('measurement-active');
        } else {
            thicknessPlotContainer.classList.remove('measurement-active');
        }

        // 如果距离测量关闭，清除可能存在的第一个点（针对该图表实例）
        if (!globalMeasurementActive && thicknessPlotContainer.firstPoint) {
            thicknessPlotContainer.firstPoint = null;
            thicknessPlotContainer.measurementComplete = false;
            const currentTraces = thicknessPlotContainer.data.length;
            const originalTraces = thicknessPlotContainer.originalTraceCount || currentTraces;
            if (currentTraces > originalTraces) {
                const tracesToDelete = [];
                for (let i = originalTraces; i < currentTraces; i++) {
                    tracesToDelete.push(i);
                }
                if (tracesToDelete.length > 0) {
                    Plotly.deleteTraces(thicknessPlotContainer, tracesToDelete);
                }
            }
            // 清除注释
            Plotly.relayout(thicknessPlotContainer, {
                annotations: []
            });
        }
    }
}

/**
 * 重新初始化阈值控制器（当图表数据更新后）
 */
function reinitializeThresholdControls() {
    console.log('重新初始化阈值控制器以适应新的数据范围');
    
    // 重新初始化曝光剂量阈值控制器
    const exposureThresholdControls = document.querySelectorAll('#exposure-thresholds-container .threshold-control');
    exposureThresholdControls.forEach((control, index) => {
        if (!control.classList.contains('hidden-control')) {
            initSingleThresholdControl(control, index, 'exposure');
        }
    });

    // 重新初始化厚度阈值控制器
    const thicknessThresholdControls = document.querySelectorAll('#thickness-thresholds-container .threshold-control');
    thicknessThresholdControls.forEach((control, index) => {
        if (!control.classList.contains('hidden-control')) {
            initSingleThresholdControl(control, index, 'thickness');
        }
    });
}

/**
 * 初始化所有独立阈值控制器
 */
function initAllThresholdControls() {
    console.log('Initializing all threshold controls');
    const exposureThresholdControls = document.querySelectorAll('#exposure-thresholds-container .threshold-control');
    const thicknessThresholdControls = document.querySelectorAll('#thickness-thresholds-container .threshold-control');

    exposureThresholdControls.forEach((control, index) => {
        initSingleThresholdControl(control, index, 'exposure');
    });

    thicknessThresholdControls.forEach((control, index) => {
        initSingleThresholdControl(control, index, 'thickness');
    });

    // 初始时，根据默认参数组数量（比如2个）来决定显示多少个阈值控制器
    // 或者根据实际的参数组数量（如果有的话）
    const initialParamSets = document.querySelectorAll('.parameter-set').length;
    updateThresholdControlsVisibility(initialParamSets || 2); // 默认显示2个，或者根据实际参数组数量
}

/**
 * 初始化单个阈值控制器
 * @param {HTMLElement} controlElement - 阈值控制器元素
 * @param {number} index - 控制器的索引 (0-3)
 * @param {string} plotType - 'exposure' 或 'thickness'
 */
function initSingleThresholdControl(controlElement, index, plotType) {
    const slider = controlElement.querySelector('.threshold-slider');
    const valueText = controlElement.querySelector('.threshold-value-text');
    const toggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');

    // 获取当前图表数据来动态设置范围
    const plotContainerId = plotType === 'exposure' ? 'exposure-comparison-plot-container' : 'thickness-comparison-plot-container';
    const plotDiv = document.getElementById(plotContainerId);
    
    let minValue, maxValue, defaultValue, step, unit;
    
    if (plotDiv && plotDiv.data && plotDiv.data[index]) {
        // 从实际数据中获取范围
        const yData = plotDiv.data[index].y;
        if (yData && yData.length > 0) {
            const dataMin = Math.min(...yData);
            const dataMax = Math.max(...yData);
            const dataRange = dataMax - dataMin;
            
            if (plotType === 'exposure') {
                // 曝光剂量：扩展范围10%，确保能覆盖所有有意义的阈值
                minValue = Math.max(0, dataMin - dataRange * 0.1);
                maxValue = dataMax + dataRange * 0.1;
                step = Math.max(0.1, dataRange / 1000); // 动态步长
                unit = ' mJ/cm²';
                
                // 默认值设为数据范围的特定百分比
                const percentages = [0.3, 0.5, 0.7, 0.4]; // 对应不同参数组的默认百分比
                defaultValue = dataMin + (dataMax - dataMin) * percentages[index % percentages.length];
            } else {
                // 厚度：通常在0-1范围内
                minValue = Math.max(0, dataMin - dataRange * 0.05);
                maxValue = Math.min(1, dataMax + dataRange * 0.05);
                step = Math.max(0.001, dataRange / 1000); // 动态步长
                unit = '';
                
                // 默认值设为数据范围的特定百分比
                const percentages = [0.3, 0.5, 0.7, 0.4];
                defaultValue = dataMin + (dataMax - dataMin) * percentages[index % percentages.length];
            }
        } else {
            // 如果没有数据，使用默认范围
            setDefaultRange();
        }
    } else {
        // 如果图表还没有数据，使用默认范围
        setDefaultRange();
    }
    
    function setDefaultRange() {
        if (plotType === 'exposure') {
            minValue = 10;
            maxValue = 200;
            step = 1;
            unit = ' mJ/cm²';
            const exposureDefaults = [80, 100, 120, 90];
            defaultValue = exposureDefaults[index] || 100;
        } else {
            minValue = 0;
            maxValue = 1;
            step = 0.01;
            unit = '';
            const thicknessDefaults = [0.3, 0.5, 0.7, 0.4];
            defaultValue = thicknessDefaults[index] || 0.5;
        }
    }
    
    // 设置滑块属性
    slider.min = minValue;
    slider.max = maxValue;
    slider.step = step;
    slider.value = defaultValue;
    
    // 更新显示文本
    valueText.textContent = defaultValue.toFixed(plotType === 'exposure' ? 1 : 3) + unit;
    
    // 移除旧的范围信息显示（如果存在）
    const existingRangeInfo = controlElement.querySelector('.threshold-range-info');
    if (existingRangeInfo) {
        existingRangeInfo.remove();
    }

    // 清除旧的事件监听器，避免重复绑定
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    // 重新获取元素引用
    const finalSlider = controlElement.querySelector('.threshold-slider');
    const finalToggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');
    const finalValueText = controlElement.querySelector('.threshold-value-text');

    // 滑块事件：更新文本显示，并更新图表
    finalSlider.addEventListener('input', () => {
        const value = parseFloat(finalSlider.value);
        const displayValue = value.toFixed(plotType === 'exposure' ? 1 : 3);
        finalValueText.textContent = displayValue + unit;
        updatePlotWithThreshold(plotType, index, value, finalToggleBtn.classList.contains('active'));
    });

    // 按钮事件：切换阈值线可见性，并更新图表
    finalToggleBtn.addEventListener('click', () => {
        finalToggleBtn.classList.toggle('active');
        const isActive = finalToggleBtn.classList.contains('active');
        
        // 更新按钮文本
        finalToggleBtn.textContent = isActive ? '隐藏' : '显示';
        
        // 添加视觉反馈到控制器
        if (isActive) {
            controlElement.classList.add('active-threshold');
        } else {
            controlElement.classList.remove('active-threshold');
        }
        
        // 更新图表
        updatePlotWithThreshold(plotType, index, parseFloat(finalSlider.value), isActive);
    });

    // 默认不显示阈值，让用户主动选择
    finalToggleBtn.textContent = '显示';
    
    console.log(`Initialized threshold control ${index} for ${plotType}:`);
    console.log(`  Range: ${minValue.toFixed(3)} - ${maxValue.toFixed(3)}${unit}`);
    console.log(`  Default: ${defaultValue.toFixed(3)}${unit}`);
    console.log(`  Step: ${step}`);
}

/**
 * 根据参数组数量更新阈值控制器的可见性
 * @param {number} numberOfSets - 当前参数组的数量
 */
function updateThresholdControlsVisibility(numberOfSets) {
    console.log(`Updating threshold controls visibility for ${numberOfSets} sets.`);
    const allExposureControls = document.querySelectorAll('#exposure-thresholds-container .threshold-control');
    const allThicknessControls = document.querySelectorAll('#thickness-thresholds-container .threshold-control');

    allExposureControls.forEach((control, index) => {
        const label = control.querySelector('.threshold-label-text');
        const paramSet = document.querySelectorAll('.parameter-set')[index];
        if (index < numberOfSets && paramSet) {
            control.classList.remove('hidden-control');
            const setName = paramSet.querySelector('.parameter-set-name-input').value || paramSet.querySelector('.parameter-set-title').textContent;
            label.textContent = `${setName} 阈值:`;
        } else {
            control.classList.add('hidden-control');
        }
    });

    allThicknessControls.forEach((control, index) => {
        const label = control.querySelector('.threshold-label-text');
        const paramSet = document.querySelectorAll('.parameter-set')[index];
        if (index < numberOfSets && paramSet) {
            control.classList.remove('hidden-control');
            const setName = paramSet.querySelector('.parameter-set-name-input').value || paramSet.querySelector('.parameter-set-title').textContent;
            label.textContent = `${setName} 阈值:`;
        } else {
            control.classList.add('hidden-control');
        }
    });
}

/**
 * 更新图表上的单个阈值线并进行分析
 * @param {string} plotType - 'exposure' 或 'thickness'
 * @param {number} thresholdIndex - 阈值的索引 (0-3)，对应第几个参数组的阈值
 * @param {number} value - 阈值的值
 * @param {boolean} isVisible - 是否可见
 */
function updatePlotWithThreshold(plotType, thresholdIndex, value, isVisible) {
    console.log(`updatePlotWithThreshold called: plotType=${plotType}, thresholdIndex=${thresholdIndex}, value=${value}, isVisible=${isVisible}`);
    
    const plotContainerId = plotType === 'exposure' ? 'exposure-comparison-plot-container' : 'thickness-comparison-plot-container';
    const plotDiv = document.getElementById(plotContainerId);
    
    console.log(`Plot container found:`, plotDiv ? 'Yes' : 'No');
    console.log(`Plot has layout:`, plotDiv && plotDiv.layout ? 'Yes' : 'No');
    console.log(`Plot has data:`, plotDiv && plotDiv.data ? 'Yes' : 'No');
    console.log(`Data length:`, plotDiv && plotDiv.data ? plotDiv.data.length : 'N/A');
    console.log(`Threshold index data exists:`, plotDiv && plotDiv.data && plotDiv.data[thresholdIndex] ? 'Yes' : 'No');

    if (plotDiv && plotDiv.layout && plotDiv.data) {
        const shapeName = `threshold_line_${plotType}_${thresholdIndex}`;
        let shapes = plotDiv.layout.shapes || [];
        let annotations = plotDiv.layout.annotations || [];
        
        console.log(`Current shapes count: ${shapes.length}`);
        console.log(`Current annotations count: ${annotations.length}`);
        
        // 清除所有与此阈值相关的元素（包括交点标记）
        shapes = shapes.filter(s => {
            if (!s.name) return true;
            return !s.name.startsWith(`threshold_line_${plotType}_${thresholdIndex}`);
        });
        
        // 清除所有与此阈值相关的注释
        annotations = annotations.filter(a => {
            if (!a.name) return true;
            return !a.name.startsWith(`threshold_${plotType}_${thresholdIndex}`);
        });
        
        console.log(`After cleanup - shapes: ${shapes.length}, annotations: ${annotations.length}`);

        if (isVisible && plotDiv.data[thresholdIndex]) {
            console.log(`Adding threshold line for visible threshold`);
            // 获取对应参数组的数据
            const traceData = plotDiv.data[thresholdIndex];
            const xData = traceData.x;
            const yData = traceData.y;
            
            if (xData && yData) {
                console.log(`Data available - xData length: ${xData.length}, yData length: ${yData.length}`);
                // 获取x轴范围
                const xMin = Math.min(...xData);
                const xMax = Math.max(...xData);
                
                // 获取线条颜色
                let lineColor = traceData.line ? traceData.line.color : '#666';
                
                // 添加阈值线
                const thresholdLine = {
                    type: 'line',
                    name: shapeName,
                    x0: xMin,
                    y0: value,
                    x1: xMax,
                    y1: value,
                    line: {
                        color: lineColor,
                        width: 2,
                        dash: 'dashdot'
                    },
                    layer: 'below'
                };
                shapes.push(thresholdLine);
                console.log(`Added threshold line:`, thresholdLine);
                
                // 分析阈值与数据的关系
                const analysis = analyzeThresholdIntersection(xData, yData, value, plotType);
                console.log(`Analysis result:`, analysis);
                
                // 添加交点标记
                if (analysis.intersections.length > 0) {
                    analysis.intersections.forEach((intersection, idx) => {
                        shapes.push({
                            type: 'circle',
                            name: `${shapeName}_intersection_${idx}`,
                            x0: intersection.x - 0.05,
                            y0: intersection.y - (plotType === 'exposure' ? 2 : 0.02),
                            x1: intersection.x + 0.05,
                            y1: intersection.y + (plotType === 'exposure' ? 2 : 0.02),
                            fillcolor: lineColor,
                            line: {
                                color: lineColor,
                                width: 2
                            },
                            layer: 'above'
                        });
                    });
                    console.log(`Added ${analysis.intersections.length} intersection markers`);
                }
                
                // 添加分析信息注释 - 改为可展开的气泡样式
                const unit = plotType === 'exposure' ? 'mJ/cm²' : '';
                const analysisText = createThresholdAnalysisText(analysis, value, unit, plotType);
                
                // 创建简化的标题文本
                const titleText = `阈值: ${value.toFixed(2)}${unit} 交点: ${analysis.intersections.length}个 ▼`;
                
                // 添加标题注释（始终可见）
                annotations.push({
                    name: `threshold_${plotType}_${thresholdIndex}_title`,
                    text: titleText,
                    x: 0.02,
                    y: 0.98 - (thresholdIndex * 0.12), // 与详细信息保持一致的间距
                    xref: 'paper',
                    yref: 'paper',
                    xanchor: 'left',
                    yanchor: 'top',
                    showarrow: false,
                    font: {
                        color: lineColor,
                        size: 12,
                        family: 'Arial, sans-serif',
                        weight: 'bold'
                    },
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    bordercolor: lineColor,
                    borderwidth: 2,
                    borderpad: 6,
                    clicktoshow: false,
                    captureevents: true
                });
                
                // 添加详细信息注释（可点击展开）- 使用纯文本，避免HTML显示
                annotations.push({
                    name: `threshold_${plotType}_${thresholdIndex}_details`,
                    text: analysisText, // 直接使用纯文本，不包含HTML标签
                    x: 0.02,
                    y: 0.94 - (thresholdIndex * 0.12), // 增加垂直间距，为多行内容留出空间
                    xref: 'paper',
                    yref: 'paper',
                    xanchor: 'left',
                    yanchor: 'top',
                    showarrow: false,
                    font: {
                        color: lineColor,
                        size: 10,
                        family: 'monospace'
                    },
                    bgcolor: 'rgba(255, 255, 255, 0.98)',
                    bordercolor: lineColor,
                    borderwidth: 1,
                    borderpad: 10, // 增加内边距
                    visible: false, // 默认隐藏详细信息
                    clicktoshow: false,
                    width: 320, // 增加宽度
                    align: 'left' // 左对齐文本
                });
                
                console.log(`Added annotations - total count: ${annotations.length}`);
            } else {
                console.log(`No data available for threshold line`);
            }
        } else {
            console.log(`Threshold not visible or no data for index ${thresholdIndex}`);
        }
        
        console.log(`Final shapes count: ${shapes.length}, annotations count: ${annotations.length}`);
        
        Plotly.relayout(plotDiv, { 
            shapes: shapes,
            annotations: annotations 
        });
        
        console.log(`Threshold analysis for ${plotType} plot ${isVisible ? 'shown' : 'hidden'} at value ${value}`);
    } else {
        console.log(`Cannot update plot - missing plotDiv, layout, or data`);
    }
}

/**
 * 清除测量结果
 * @param {HTMLElement} container - 图表容器元素
 */
function clearMeasurementResults(container) {
    // 清除所有添加的测量traces（标记点和测量线）
    const currentTraces = container.data.length;
    const originalTraces = container.originalTraceCount || currentTraces;
    
    if (currentTraces > originalTraces) {
        const tracesToDelete = [];
        for (let i = originalTraces; i < currentTraces; i++) {
            tracesToDelete.push(i);
        }
        if (tracesToDelete.length > 0) {
            Plotly.deleteTraces(container, tracesToDelete);
        }
    }
    
    // 清除注释和形状
    Plotly.relayout(container, {
        shapes: [],
        annotations: []
    });
    
    // 重置容器状态
    container.firstPoint = null;
    container.measurementComplete = false;
    
    // 不自动关闭全局测量模式，让用户可以继续测量
    console.log('测量结果已清除，可以开始新的测量');
}

/**
 * 创建阈值详细信息覆盖层
 */
function createThresholdDetailsOverlay(container, plotType, thresholdIndex, content) {
    const overlayId = `threshold-overlay-${plotType}-${thresholdIndex}`;
    
    // 移除已存在的覆盖层
    removeThresholdDetailsOverlay(container, plotType, thresholdIndex);
    
    // 创建覆盖层元素
    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'threshold-details-overlay';
    
    // 提取纯文本内容（移除HTML标签）
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
    
    // 设置样式
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
    
    // 添加到容器
    container.style.position = 'relative';
    container.appendChild(overlay);
}

/**
 * 移除阈值详细信息覆盖层
 */
function removeThresholdDetailsOverlay(container, plotType, thresholdIndex) {
    const overlayId = `threshold-overlay-${plotType}-${thresholdIndex}`;
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // 同时更新对应的标题注释箭头
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

// 将函数设为全局可访问
window.removeThresholdDetailsOverlay = removeThresholdDetailsOverlay;
window.clearAllCharts = clearAllCharts; 

/**
 * 应用基础对比预设配置
 */
function applyPaperPresetConfiguration() {
    // 清除现有参数组
    clearAllParameterSets();
    
    // 添加基础对比配置
    const basicConfigs = [
        {
            name: "基础配置A",
            params: { I_avg: 10, V: 0.8, K: 2.0, t_exp: 5, C: 0.02 }
        },
        {
            name: "基础配置B", 
            params: { I_avg: 20, V: 0.6, K: 3.0, t_exp: 8, C: 0.025 }
        }
    ];
    
    basicConfigs.forEach((config, index) => {
        if (index === 0) {
            // 更新第一个参数组
            updateParameterSet(1, config.name, config.params);
        } else {
            // 添加新参数组，跳过清空图表
            addParameterSetWithConfig(config.name, config.params, true);
        }
    });
    
    // 清空图表显示
    clearAllCharts();
    
    showPresetNotification("已应用基础对比配置！两组基础参数便于快速开始比较。");
}

/**
 * 应用对比度研究配置
 */
function applyContrastStudyConfiguration() {
    clearAllParameterSets();
    
    const contrastConfigs = [
        {
            name: "高对比度",
            params: { I_avg: 15, V: 1.0, K: 2.0, t_exp: 6, C: 0.02 }
        },
        {
            name: "低对比度",
            params: { I_avg: 15, V: 0.6, K: 2.0, t_exp: 6, C: 0.02 }
        }
    ];
    
    contrastConfigs.forEach((config, index) => {
        if (index === 0) {
            updateParameterSet(1, config.name, config.params);
        } else {
            addParameterSetWithConfig(config.name, config.params, true);
        }
    });
    
    // 清空图表显示
    clearAllCharts();
    
    showPresetNotification("已应用对比度研究配置！比较高对比度与低对比度的影响。");
}

/**
 * 应用曝光时间研究配置
 */
function applyExposureStudyConfiguration() {
    clearAllParameterSets();
    
    const exposureConfigs = [
        {
            name: "短时间曝光",
            params: { I_avg: 15, V: 0.8, K: 2.5, t_exp: 3, C: 0.02 }
        },
        {
            name: "长时间曝光",
            params: { I_avg: 15, V: 0.8, K: 2.5, t_exp: 12, C: 0.02 }
        }
    ];
    
    exposureConfigs.forEach((config, index) => {
        if (index === 0) {
            updateParameterSet(1, config.name, config.params);
        } else {
            addParameterSetWithConfig(config.name, config.params, true);
        }
    });
    
    // 清空图表显示
    clearAllCharts();
    
    showPresetNotification("已应用曝光时间研究配置！比较短时间与长时间曝光的效果。");
}

/**
 * 清除所有参数组（保留第一个）
 */
function clearAllParameterSets() {
    const parameterSetsContainer = document.getElementById('parameter-sets-container');
    parameterSetsContainer.innerHTML = '';
}

/**
 * 更新指定参数组的配置
 */
function updateParameterSet(setId, customName, params) {
    const parameterSet = document.querySelector(`[data-set-id="${setId}"]`);
    if (!parameterSet) return;
    
    // 更新自定义名称
    const nameInput = parameterSet.querySelector('.parameter-set-name-input');
    nameInput.value = customName;
    
    // 更新参数值
    Object.keys(params).forEach(paramName => {
        const parameterItem = Array.from(parameterSet.querySelectorAll('.parameter-item')).find(item => 
            item.querySelector(`.${paramName}`)
        );
        
        if (parameterItem) {
            const slider = parameterItem.querySelector(`.${paramName}`);
            const input = parameterItem.querySelector('.number-input');
            const valueDisplay = parameterItem.querySelector('.parameter-value');
            
            if (slider && input && valueDisplay) {
                const value = params[paramName];
                slider.value = value;
                input.value = value;
                valueDisplay.textContent = value;
            }
        }
    });
}

/**
 * 根据配置添加参数组
 * 
 * @param {string} customName 自定义名称
 * @param {object} params 参数对象
 * @param {boolean} skipClearCharts 是否跳过清除图表
 */
function addParameterSetWithConfig(customName, params, skipClearCharts = false) {
    const newSet = addParameterSet();
    
    // 设置自定义名称
    if (customName) {
        const nameInput = newSet.querySelector('.parameter-set-name-input');
        nameInput.value = customName;
    }
    
    // 设置参数值
    if (currentModelType === 'dill') {
        // Dill模型参数
        if (params.I_avg !== undefined) {
            updateSliderValue(newSet, '.slider.I_avg', params.I_avg);
        }
        if (params.V !== undefined) {
            updateSliderValue(newSet, '.slider.V', params.V);
        }
        if (params.K !== undefined) {
            updateSliderValue(newSet, '.slider.K', params.K);
        }
        if (params.t_exp !== undefined) {
            updateSliderValue(newSet, '.slider.t_exp', params.t_exp);
        }
        if (params.C !== undefined) {
            updateSliderValue(newSet, '.slider.C', params.C);
        }
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型参数
        if (params.z_h !== undefined) {
            updateSliderValue(newSet, '.slider.z_h', params.z_h);
        }
        if (params.T !== undefined) {
            updateSliderValue(newSet, '.slider.T', params.T);
        }
        if (params.t_B !== undefined) {
            updateSliderValue(newSet, '.slider.t_B', params.t_B);
        }
        if (params.I0 !== undefined) {
            updateSliderValue(newSet, '.slider.I0', params.I0);
        }
        if (params.M0 !== undefined) {
            updateSliderValue(newSet, '.slider.M0', params.M0);
        }
        if (params.t_exp !== undefined) {
            updateSliderValue(newSet, '.slider.t_exp_enhanced', params.t_exp);
        }
        if (params.K !== undefined) {
            updateSliderValue(newSet, '.slider.K_enhanced', params.K);
        }
    } else if (currentModelType === 'car') {
        // CAR模型参数
        if (params.I_avg !== undefined) {
            updateSliderValue(newSet, '.slider.car_I_avg', params.I_avg);
        }
        if (params.V !== undefined) {
            updateSliderValue(newSet, '.slider.car_V', params.V);
        }
        if (params.K !== undefined) {
            updateSliderValue(newSet, '.slider.car_K', params.K);
        }
        if (params.t_exp !== undefined) {
            updateSliderValue(newSet, '.slider.car_t_exp', params.t_exp);
        }
        if (params.acid_gen_efficiency !== undefined) {
            updateSliderValue(newSet, '.slider.car_acid_gen_efficiency', params.acid_gen_efficiency);
        }
        if (params.diffusion_length !== undefined) {
            updateSliderValue(newSet, '.slider.car_diffusion_length', params.diffusion_length);
        }
        if (params.reaction_rate !== undefined) {
            updateSliderValue(newSet, '.slider.car_reaction_rate', params.reaction_rate);
        }
        if (params.amplification !== undefined) {
            updateSliderValue(newSet, '.slider.car_amplification', params.amplification);
        }
        if (params.contrast !== undefined) {
            updateSliderValue(newSet, '.slider.car_contrast', params.contrast);
        }
    }
    
    // 是否清除图表
    if (!skipClearCharts) {
        clearAllCharts();
    }
    
    return newSet;
}

/**
 * 更新滑块值并同步相关显示
 * 
 * @param {HTMLElement} container 容器元素
 * @param {string} sliderSelector 滑块选择器
 * @param {number} value 新值
 */
function updateSliderValue(container, sliderSelector, value) {
    const slider = container.querySelector(sliderSelector);
    if (slider) {
        slider.value = value;
        const paramItem = slider.closest('.parameter-item');
        const input = paramItem.querySelector('.number-input');
        const valueDisplay = paramItem.querySelector('.parameter-value');
        
        input.value = value;
        valueDisplay.textContent = value;
    }
}

/**
 * 显示预设配置通知
 */
function showPresetNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'preset-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * 清空所有图表显示
 */
function clearAllCharts() {
    console.log('清空所有图表显示');
    
    // 隐藏结果区域
    const comparisonResultsSection = document.getElementById('comparison-results-section');
    comparisonResultsSection.classList.remove('visible');
    
    // 清空交互式图表容器
    const exposurePlotContainer = document.getElementById('exposure-comparison-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-comparison-plot-container');
    
    if (exposurePlotContainer) {
        exposurePlotContainer.innerHTML = '';
        exposurePlotContainer.style.display = 'none';
    }
    
    if (thicknessPlotContainer) {
        thicknessPlotContainer.innerHTML = '';
        thicknessPlotContainer.style.display = 'none';
    }
    
    // 隐藏静态图像
    const exposureComparisonPlot = document.getElementById('exposure-comparison-plot');
    const thicknessComparisonPlot = document.getElementById('thickness-comparison-plot');
    
    if (exposureComparisonPlot) {
        exposureComparisonPlot.style.display = 'none';
        exposureComparisonPlot.src = '';
    }
    
    if (thicknessComparisonPlot) {
        thicknessComparisonPlot.style.display = 'none';
        thicknessComparisonPlot.src = '';
    }
    
    // 清空图例
    const exposureLegend = document.getElementById('exposure-legend');
    const thicknessLegend = document.getElementById('thickness-legend');
    
    if (exposureLegend) {
        exposureLegend.innerHTML = '';
    }
    
    if (thicknessLegend) {
        thicknessLegend.innerHTML = '';
    }
    
    // 重置全局状态
    globalMeasurementActive = false;
    const globalDistanceMeasureBtn = document.getElementById('global-distance-measure-btn');
    if (globalDistanceMeasureBtn) {
        globalDistanceMeasureBtn.classList.remove('active');
    }
    
    console.log('图表已清空，等待用户重新生成');
} 

/**
 * 显示点详细信息弹窗
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型 ('exposure' 或 'thickness')
 * @param {HTMLElement} container - 图表容器
 * @param {Object} eventData - 完整的事件数据
 */
function showPointDetailsPopup(point, plotType, container, eventData) {
    // 移除已存在的弹窗
    removePointDetailsPopup();
    
    // 获取点的详细信息
    const pointInfo = getPointDetailedInfo(point, plotType, eventData);
    
    // 创建弹窗元素
    const popup = document.createElement('div');
    popup.id = 'point-details-popup';
    popup.className = 'point-details-popup';
    
    popup.innerHTML = `
        <div class="point-details-content">
            <div class="point-details-header">
                <span class="point-details-title">📊 点详细信息</span>
                <button class="point-details-close" onclick="removePointDetailsPopup()">×</button>
            </div>
            <div class="point-details-body">
                ${pointInfo.html}
            </div>
            <div class="point-details-footer">
                <small>💡 提示：点击其他位置关闭弹窗</small>
            </div>
        </div>
    `;
    
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取页面滚动位置
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // 获取图表容器的位置信息
    const containerRect = container.getBoundingClientRect();
    
    // 获取图表的实际绘图区域
    const plotArea = container._fullLayout || {};
    const margin = plotArea.margin || { l: 80, r: 50, t: 80, b: 80 };
    
    // 计算实际绘图区域的尺寸
    const plotWidth = containerRect.width - margin.l - margin.r;
    const plotHeight = containerRect.height - margin.t - margin.b;
    
    // 获取x和y轴的范围
    const xRange = plotArea.xaxis ? (plotArea.xaxis.range || [0, 10]) : [0, 10];
    const yRange = plotArea.yaxis ? (plotArea.yaxis.range || [0, 100]) : [0, 100];
    
    // 将数据坐标转换为像素坐标（相对于视口）
    const xPixel = containerRect.left + margin.l + ((point.x - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
    const yPixel = containerRect.top + margin.t + ((yRange[1] - point.y) / (yRange[1] - yRange[0])) * plotHeight;
    
    // 弹窗尺寸设置 - 根据视口大小动态调整
    const maxPopupWidth = Math.min(450, viewportWidth * 0.9);
    const maxPopupHeight = Math.min(600, viewportHeight * 0.8);
    
    // 智能位置计算 - 确保弹窗完全在视口内
    let popupX, popupY;
    
    // 水平位置计算
    if (xPixel + maxPopupWidth / 2 > viewportWidth - 20) {
        // 如果右侧空间不足，放在左侧
        popupX = Math.max(20, xPixel - maxPopupWidth - 20);
    } else if (xPixel - maxPopupWidth / 2 < 20) {
        // 如果左侧空间不足，放在右侧
        popupX = Math.max(20, xPixel + 20);
    } else {
        // 居中显示
        popupX = xPixel - maxPopupWidth / 2;
    }
    
    // 垂直位置计算
    if (yPixel + maxPopupHeight + 20 > viewportHeight) {
        // 如果下方空间不足，放在上方
        popupY = Math.max(20, yPixel - maxPopupHeight - 20);
    } else {
        // 放在下方，稍微偏移避免遮挡点击点
        popupY = Math.max(20, yPixel + 20);
    }
    
    // 最终边界检查，确保弹窗完全在视口内
    popupX = Math.max(20, Math.min(popupX, viewportWidth - maxPopupWidth - 20));
    popupY = Math.max(20, Math.min(popupY, viewportHeight - maxPopupHeight - 20));
    
    // 设置弹窗样式和位置（使用fixed定位相对于视口）
    popup.style.cssText = `
        position: fixed;
        left: ${popupX}px;
        top: ${popupY}px;
        width: ${maxPopupWidth}px;
        max-height: ${maxPopupHeight}px;
        background: rgba(255, 255, 255, 0.98);
        border: 2px solid #3498db;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: 'Roboto', Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: popupFadeIn 0.3s ease-out;
        overflow: hidden;
        backdrop-filter: blur(10px);
    `;
    
    // 添加到body而不是容器，避免容器overflow限制
    document.body.appendChild(popup);
    
    // 阻止弹窗内部的点击事件冒泡
    popup.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // 添加窗口大小变化监听，自动调整弹窗位置
    function handleResize() {
        const newViewportWidth = window.innerWidth;
        const newViewportHeight = window.innerHeight;
        
        // 重新计算位置
        const newMaxWidth = Math.min(450, newViewportWidth * 0.9);
        const newMaxHeight = Math.min(600, newViewportHeight * 0.8);
        
        let newX = Math.max(20, Math.min(popupX, newViewportWidth - newMaxWidth - 20));
        let newY = Math.max(20, Math.min(popupY, newViewportHeight - newMaxHeight - 20));
        
        popup.style.left = newX + 'px';
        popup.style.top = newY + 'px';
        popup.style.width = newMaxWidth + 'px';
        popup.style.maxHeight = newMaxHeight + 'px';
    }
    
    window.addEventListener('resize', handleResize);
    popup._resizeHandler = handleResize;
    
    // 延迟更长时间再添加点击外部关闭功能，确保弹窗完全显示
    setTimeout(() => {
        function handleOutsideClick(event) {
            // 检查点击是否在弹窗外部
            if (!popup.contains(event.target) && event.target !== popup) {
                removePointDetailsPopup();
                document.removeEventListener('click', handleOutsideClick);
                window.removeEventListener('resize', handleResize);
            }
        }
        
        document.addEventListener('click', handleOutsideClick);
        
        // 存储事件处理器引用，以便后续清理
        popup._outsideClickHandler = handleOutsideClick;
    }, 500); // 增加延迟时间到500毫秒
}

/**
 * 获取点的详细信息
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型
 * @param {Object} eventData - 完整的事件数据
 * @returns {Object} 包含详细信息的对象
 */
function getPointDetailedInfo(point, plotType, eventData) {
    const x = point.x;
    const y = point.y;
    const traceIndex = point.curveNumber;
    const pointIndex = point.pointNumber;
    
    // 获取参数组信息
    const parameterSets = document.querySelectorAll('.parameter-set');
    const currentSet = parameterSets[traceIndex];
    
    let setName = `参数组 ${traceIndex + 1}`;
    let params = {};
    
    if (currentSet) {
        const nameInput = currentSet.querySelector('.parameter-set-name-input');
        if (nameInput && nameInput.value.trim()) {
            setName = nameInput.value.trim();
        }
        
        // 获取参数值
        params = {
            I_avg: parseFloat(currentSet.querySelector('.I_avg').value),
            V: parseFloat(currentSet.querySelector('.V').value),
            K: parseFloat(currentSet.querySelector('.K').value),
            t_exp: parseFloat(currentSet.querySelector('.t_exp').value),
            C: parseFloat(currentSet.querySelector('.C').value)
        };
    }
    
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
                <h4>📋 参数组信息</h4>
                <div class="info-item">
                    <span class="info-label">名称:</span>
                    <span class="info-value">${setName}</span>
                </div>
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
                        <div>• I_avg: 平均光强度</div>
                        <div>• t_exp: 曝光时间</div>
                        <div>• K: 吸收系数</div>
                        <div>• C(x): 光刻胶浓度分布</div>
                    </div>
                </div>
            </div>
            
            <div class="point-info-section">
                <h4>📊 数值分析</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="analysis-label">相对强度:</span>
                        <span class="analysis-value">${((y / (params.I_avg * params.t_exp)) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">衰减因子:</span>
                        <span class="analysis-value">${(y / (params.I_avg * params.t_exp)).toFixed(4)}</span>
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
                <h4>📋 参数组信息</h4>
                <div class="info-item">
                    <span class="info-label">名称:</span>
                    <span class="info-value">${setName}</span>
                </div>
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
                        <div>• T₀: 初始厚度</div>
                        <div>• V: 对比度参数</div>
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
                </div>
            </div>
        `;
    }
    
    return { html };
}

/**
 * 移除点详细信息弹窗
 */
function removePointDetailsPopup() {
    const existingPopup = document.getElementById('point-details-popup');
    if (existingPopup) {
        // 清理事件监听器
        if (existingPopup._outsideClickHandler) {
            document.removeEventListener('click', existingPopup._outsideClickHandler);
        }
        if (existingPopup._resizeHandler) {
            window.removeEventListener('resize', existingPopup._resizeHandler);
        }
        
        existingPopup.style.animation = 'popupFadeOut 0.2s ease-in';
        setTimeout(() => {
            if (existingPopup.parentNode) {
                existingPopup.remove();
            }
        }, 200);
    }
}

// 将函数设为全局可访问
window.removeThresholdDetailsOverlay = removeThresholdDetailsOverlay;
window.clearAllCharts = clearAllCharts;
window.removePointDetailsPopup = removePointDetailsPopup;

/**
 * 分析阈值与数据曲线的交点和关系
 * @param {Array} xData - X轴数据
 * @param {Array} yData - Y轴数据  
 * @param {number} threshold - 阈值
 * @param {string} plotType - 图表类型
 * @returns {Object} 分析结果
 */
function analyzeThresholdIntersection(xData, yData, threshold, plotType) {
    const intersections = [];
    const aboveThreshold = [];
    const belowThreshold = [];
    
    // 找到所有交点
    for (let i = 0; i < yData.length - 1; i++) {
        const y1 = yData[i];
        const y2 = yData[i + 1];
        const x1 = xData[i];
        const x2 = xData[i + 1];
        
        // 检查是否跨越阈值线
        if ((y1 <= threshold && y2 >= threshold) || (y1 >= threshold && y2 <= threshold)) {
            // 线性插值找到精确交点
            const t = (threshold - y1) / (y2 - y1);
            const intersectionX = x1 + t * (x2 - x1);
            intersections.push({
                x: intersectionX,
                y: threshold,
                index: i
            });
        }
    }
    
    // 计算超过和低于阈值的区域
    let aboveArea = 0;
    let belowArea = 0;
    let aboveLength = 0;
    let belowLength = 0;
    
    for (let i = 0; i < yData.length - 1; i++) {
        const dx = xData[i + 1] - xData[i];
        const avgY = (yData[i] + yData[i + 1]) / 2;
        
        if (avgY > threshold) {
            aboveArea += (avgY - threshold) * dx;
            aboveLength += dx;
            aboveThreshold.push(i);
        } else {
            belowArea += (threshold - avgY) * dx;
            belowLength += dx;
            belowThreshold.push(i);
        }
    }
    
    // 计算统计信息
    const maxValue = Math.max(...yData);
    const minValue = Math.min(...yData);
    const abovePercentage = (aboveLength / (xData[xData.length - 1] - xData[0])) * 100;
    const belowPercentage = 100 - abovePercentage;
    
    return {
        intersections,
        aboveThreshold,
        belowThreshold,
        aboveArea,
        belowArea,
        aboveLength,
        belowLength,
        abovePercentage,
        belowPercentage,
        maxValue,
        minValue,
        thresholdRatio: threshold / maxValue
    };
}

/**
 * 创建阈值分析文本
 * @param {Object} analysis - 分析结果
 * @param {number} threshold - 阈值
 * @param {string} unit - 单位
 * @param {string} plotType - 图表类型
 * @returns {string} 分析文本
 */
function createThresholdAnalysisText(analysis, threshold, unit, plotType) {
    const lines = [];
    
    // 阈值信息
    lines.push(`阈值: ${threshold.toFixed(2)}${unit}`);
    
    // 交点信息 - 每行最多显示3个
    if (analysis.intersections.length > 0) {
        lines.push(`交点: ${analysis.intersections.length}个`);
        
        // 将交点按每行3个进行分组
        for (let i = 0; i < analysis.intersections.length; i += 3) {
            const group = analysis.intersections.slice(i, i + 3);
            const groupText = group.map((intersection, idx) => 
                `#${i + idx + 1}: x=${intersection.x.toFixed(2)}μm`
            ).join('  ');
            lines.push(`  ${groupText}`);
        }
        
        // 添加工程意义说明
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
    
    // 区域分析
    if (plotType === 'exposure') {
        lines.push(`超阈值区域: ${analysis.abovePercentage.toFixed(1)}%`);
        lines.push(`积分差值: ${analysis.aboveArea.toFixed(1)}${unit}·μm`);
    } else {
        lines.push(`超阈值区域: ${analysis.abovePercentage.toFixed(1)}%`);
        lines.push(`平均超出: ${(analysis.aboveArea / Math.max(analysis.aboveLength, 0.001)).toFixed(3)}`);
    }
    
    // 极值比较
    const maxRatio = (threshold / analysis.maxValue * 100).toFixed(1);
    lines.push(`阈值/峰值: ${maxRatio}%`);
    
    // 工艺建议
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

/**
 * 清理图表上可能存在的、对应已删除参数组的阈值线
 * @param {number} currentNumberOfSets - 当前参数组的数量
 */
function clearStaleThresholdLines(currentNumberOfSets) {
    ['exposure', 'thickness'].forEach(plotType => {
        const plotContainerId = plotType === 'exposure' ? 'exposure-comparison-plot-container' : 'thickness-comparison-plot-container';
        const plotDiv = document.getElementById(plotContainerId);
        if (plotDiv && plotDiv.layout && plotDiv.layout.shapes) {
            const newShapes = plotDiv.layout.shapes.filter(shape => {
                if (shape.name && shape.name.startsWith(`threshold_line_${plotType}_`)) {
                    const shapeIndex = parseInt(shape.name.split('_').pop(), 10);
                    return shapeIndex < currentNumberOfSets; // 只保留与现有参数组对应的阈值线
                }
                return true; // 保留其他非阈值线形状
            });
            if (newShapes.length !== plotDiv.layout.shapes.length) {
                Plotly.relayout(plotDiv, { shapes: newShapes });
                console.log(`Cleared stale threshold lines for ${plotType} plot.`);
            }
        }
    });
}

// === 新增：绑定展开更多按钮事件 ===
function bindToggleDetailsEvents() {
    // Dill
    const dillToggleBtn = document.getElementById('dill-toggle-details');
    const dillFullDetails = document.getElementById('dill-full-details');
    if (dillToggleBtn && dillFullDetails) {
        dillToggleBtn.onclick = function() {
            if (dillFullDetails.style.display === 'block') {
                dillFullDetails.style.display = 'none';
                this.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            } else {
                dillFullDetails.style.display = 'block';
                this.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            }
        };
    }
    // Enhanced Dill
    const enhancedDillToggleBtn = document.getElementById('enhanced-dill-toggle-details');
    const enhancedDillFullDetails = document.getElementById('enhanced-dill-full-details');
    if (enhancedDillToggleBtn && enhancedDillFullDetails) {
        enhancedDillToggleBtn.onclick = function() {
            if (enhancedDillFullDetails.style.display === 'block') {
                enhancedDillFullDetails.style.display = 'none';
                this.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            } else {
                enhancedDillFullDetails.style.display = 'block';
                this.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            }
        };
    }
    // CAR
    const carToggleBtn = document.getElementById('car-toggle-details');
    const carFullDetails = document.getElementById('car-full-details');
    if (carToggleBtn && carFullDetails) {
        carToggleBtn.onclick = function() {
            if (carFullDetails.style.display === 'block') {
                carFullDetails.style.display = 'none';
                this.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            } else {
                carFullDetails.style.display = 'block';
                this.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            }
        };
    }
}

// === 新增：多语言切换后也绑定展开更多按钮事件 ===
if (typeof window.applyLang === 'function') {
    const oldApplyLang = window.applyLang;
    window.applyLang = function() {
        oldApplyLang.apply(this, arguments);
        bindToggleDetailsEvents();
    };
}

// === 移动端参数组折叠/展开与底部浮动按钮交互 ===
function initParameterSetCollapse(parameterSet, isFirst) {
  const collapseBtn = parameterSet.querySelector('.collapse-set-btn');
  if (!collapseBtn) return;
  // 默认移动端只展开第一个
  if (window.innerWidth <= 600 && !isFirst) {
    parameterSet.classList.add('collapsed');
    collapseBtn.setAttribute('aria-expanded', 'false');
    collapseBtn.querySelector('i').classList.remove('fa-chevron-up');
    collapseBtn.querySelector('i').classList.add('fa-chevron-down');
  } else {
    parameterSet.classList.remove('collapsed');
    collapseBtn.setAttribute('aria-expanded', 'true');
    collapseBtn.querySelector('i').classList.remove('fa-chevron-down');
    collapseBtn.querySelector('i').classList.add('fa-chevron-up');
  }
  collapseBtn.addEventListener('click', function() {
    const collapsed = parameterSet.classList.toggle('collapsed');
    if (collapsed) {
      collapseBtn.setAttribute('aria-expanded', 'false');
      collapseBtn.querySelector('i').classList.remove('fa-chevron-up');
      collapseBtn.querySelector('i').classList.add('fa-chevron-down');
    } else {
      collapseBtn.setAttribute('aria-expanded', 'true');
      collapseBtn.querySelector('i').classList.remove('fa-chevron-down');
      collapseBtn.querySelector('i').classList.add('fa-chevron-up');
    }
  });
}
function initMobileFabBar() {
  const addFab = document.querySelector('.add-set-fab');
  const calcFab = document.querySelector('.calc-fab');
  if (addFab) addFab.addEventListener('click', addParameterSet);
  if (calcFab) {
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) calcFab.addEventListener('click', () => compareBtn.click());
  }
}

// === 参数组拖拽排序 ===
function enableParameterSetDragSort() {
  const container = document.querySelector('.parameter-sets-container');
  if (!container) return;
  let draggingElem = null;
  let dragOverElem = null;
  let startY = 0, offsetY = 0;
  let isTouch = false;

  function onDragStart(e, elem) {
    draggingElem = elem;
    elem.classList.add('dragging');
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    offsetY = 0;
    isTouch = !!e.touches;
    document.body.style.userSelect = 'none';
  }
  function onDragMove(e) {
    if (!draggingElem) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    offsetY = y - startY;
    draggingElem.style.transform = `translateY(${offsetY}px)`;
    // 检查与其他参数组的碰撞
    const sets = Array.from(container.querySelectorAll('.parameter-set'));
    sets.forEach(set => {
      if (set === draggingElem) return;
      const rect = set.getBoundingClientRect();
      if (y > rect.top && y < rect.bottom) {
        set.classList.add('drag-over');
        dragOverElem = set;
      } else {
        set.classList.remove('drag-over');
        if (dragOverElem === set) dragOverElem = null;
      }
    });
  }
  function onDragEnd() {
    if (!draggingElem) return;
    draggingElem.classList.remove('dragging');
    draggingElem.style.transform = '';
    document.body.style.userSelect = '';
    // 交换顺序
    if (dragOverElem && dragOverElem !== draggingElem) {
      if (dragOverElem.nextSibling === draggingElem) {
        container.insertBefore(draggingElem, dragOverElem);
      } else {
        container.insertBefore(draggingElem, dragOverElem.nextSibling);
      }
    }
    // 清理
    container.querySelectorAll('.parameter-set').forEach(set => set.classList.remove('drag-over'));
    draggingElem = null;
    dragOverElem = null;
    offsetY = 0;
  }
  // 事件绑定
  container.addEventListener('mousedown', function(e) {
    const btn = e.target.closest('.drag-handle-btn');
    const set = e.target.closest('.parameter-set');
    if (btn && set) {
      e.preventDefault();
      onDragStart(e, set);
      function mouseMove(ev) { onDragMove(ev); }
      function mouseUp() { onDragEnd(); window.removeEventListener('mousemove', mouseMove); window.removeEventListener('mouseup', mouseUp); }
      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mouseup', mouseUp);
    }
  });
  container.addEventListener('touchstart', function(e) {
    const btn = e.target.closest('.drag-handle-btn');
    const set = e.target.closest('.parameter-set');
    if (btn && set) {
      onDragStart(e, set);
      function touchMove(ev) { onDragMove(ev); }
      function touchEnd() { onDragEnd(); window.removeEventListener('touchmove', touchMove); window.removeEventListener('touchend', touchEnd); }
      window.addEventListener('touchmove', touchMove, {passive:false});
      window.addEventListener('touchend', touchEnd);
    }
  }, {passive:false});
}
// === 弹窗滑动手势关闭 ===
function enableModalSwipeClose() {
  const modal = document.getElementById('compare-modal');
  if (!modal) return;
  let startY = 0, startX = 0, swiping = false;
  modal.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    swiping = true;
    modal.classList.remove('closed');
  });
  modal.addEventListener('touchmove', function(e) {
    if (!swiping) return;
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    if (Math.abs(dy) > 30 || Math.abs(dx) > 30) {
      modal.classList.add('swiping');
    }
  });
  modal.addEventListener('touchend', function(e) {
    if (!swiping) return;
    modal.classList.remove('swiping');
    const dy = e.changedTouches[0].clientY - startY;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dy) > 60 || Math.abs(dx) > 60) {
      modal.classList.add('closed');
      setTimeout(()=>{modal.style.display='none';},350);
    }
    swiping = false;
  });
  // 桌面端点击关闭
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.add('closed');
      setTimeout(()=>{modal.style.display='none';},350);
    }
  });
}
// === 参数组头部/底部操作栏吸顶/吸底动画 ===
function enableStickyAnimations() {
  // 头部吸顶阴影
  window.addEventListener('scroll', function() {
    document.querySelectorAll('.parameter-set-header.sticky').forEach(header => {
      if (window.scrollY > header.offsetTop) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
    // 底部操作栏吸底自动隐藏/显示
    const fabBar = document.getElementById('mobile-fab-bar');
    if (!fabBar) return;
    let lastScroll = window.lastFabBarScroll || 0;
    let now = window.scrollY;
    if (now > lastScroll + 10) {
      fabBar.classList.add('hide');
    } else if (now < lastScroll - 10) {
      fabBar.classList.remove('hide');
    }
    window.lastFabBarScroll = now;
  });
}
// === 初始化 ===
document.addEventListener('DOMContentLoaded', function() {
  enableParameterSetDragSort();
  enableModalSwipeClose();
  enableStickyAnimations();
});

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
    const z = [];
    let phiFunc;
    try {
        phiFunc = new Function('t', 'return ' + phi_expr.replace(/\b(sin|cos|pi)\b/g, 'Math.$1'));
    } catch {
        phiFunc = () => 0;
    }
    for (let j = 0; j < yPoints; j++) {
        const row = [];
        for (let i = 0; i < xPoints; i++) {
            const t = 0; // 预览时t=0
            const phi = phiFunc(t);
            row.push(1 + V * Math.cos(Kx * x[i] + Ky * y[j] + phi));
        }
        z.push(row);
    }
    return {x, y, z};
}

// 扩展updatePhiExprUI，支持实时校验、错误提示、禁用比较按钮、预览分布
function updatePhiExprUI(parameterSet) {
    const phiExprItem = parameterSet.querySelector('.phi-expr-item');
    if (!phiExprItem) return;
    const phiInput = phiExprItem.querySelector('.phi-expr-input');
    const errorDiv = phiExprItem.querySelector('.phi-expr-error');
    const previewBtn = phiExprItem.querySelector('.phi-expr-preview-btn');
    const previewPlot = phiExprItem.querySelector('.phi-expr-preview-plot');
    const compareBtn = document.getElementById('compare-btn');
    // 只在二维正弦波时显示
    const sineTypeSel = parameterSet.querySelector('.sine-type-select');
    if (sineTypeSel && sineTypeSel.value === 'multi') {
        phiExprItem.style.display = '';
    } else {
        phiExprItem.style.display = 'none';
        return;
    }
    // 实时校验
    function checkPhiExpr() {
        const expr = phiInput.value;
        if (validatePhiExpr(expr)) {
            errorDiv.style.display = 'none';
            phiInput.classList.remove('input-error');
            compareBtn.disabled = false;
        } else {
            errorDiv.textContent = '表达式非法，仅允许sin/cos/pi/t/数字/加减乘除括号';
            errorDiv.style.display = '';
            phiInput.classList.add('input-error');
            compareBtn.disabled = true;
        }
    }
    phiInput.addEventListener('input', checkPhiExpr);
    checkPhiExpr();
    // 预览分布
    previewBtn.style.display = '';
    let isPreviewShown = false;
    let lastPlotData = null;
    function drawPreviewPlot() {
        // 读取Kx、Ky、V
        let Kx = 2, Ky = 0, V = 0.8;
        const kxInput = parameterSet.querySelector('.kx-input');
        const kyInput = parameterSet.querySelector('.ky-input');
        const vInput = parameterSet.querySelector('.v-input');
        if (kxInput) Kx = parseFloat(kxInput.value);
        if (kyInput) Ky = parseFloat(kyInput.value);
        if (vInput) V = parseFloat(vInput.value);
        lastPlotData = generate2DSine(Kx, Ky, V, phiInput.value, [0, 10], [0, 10]);
        Plotly.newPlot(previewPlot, [{z: lastPlotData.z, x: lastPlotData.x, y: lastPlotData.y, type:'heatmap', colorscale:'Viridis'}], {title:'二维正弦分布热力图',xaxis:{title:'x'},yaxis:{title:'y'}});
        previewPlot.style.display = '';
        setTimeout(()=>{previewPlot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
    function updateBtnUI() {
        previewBtn.innerHTML = isPreviewShown ? '<span class="preview-icon"></span> 收起分布' : '<span class="preview-icon"></span> 预览分布';
    }
    updateBtnUI();
    previewBtn.onclick = function() {
        if (!isPreviewShown) {
            drawPreviewPlot();
            isPreviewShown = true;
            updateBtnUI();
        } else {
            previewPlot.style.display = 'none';
            isPreviewShown = false;
            updateBtnUI();
        }
    };
    // 只要分布图显示，参数变动就自动刷新
    [phiInput, parameterSet.querySelector('.kx-input'), parameterSet.querySelector('.ky-input'), parameterSet.querySelector('.v-input')].forEach(param => {
        if (param) {
            param.addEventListener('input', function() {
                if (isPreviewShown) drawPreviewPlot();
            });
            param.addEventListener('change', function() {
                if (isPreviewShown) drawPreviewPlot();
            });
        }
    });
}