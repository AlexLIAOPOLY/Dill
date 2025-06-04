/**
 * CAR模型功能实现
 */

// 初始CAR模型参数
const defaultCarParams = {
    "I<sub>avg</sub>": 10,
    V: 0.8,
    K: 2,
    "t<sub>exp</sub>": 5,
    acid_gen_efficiency: 0.5,
    diffusion_length: 3,
    reaction_rate: 0.3,
    amplification: 10,
    contrast: 3
};

// 当前CAR模型参数
let currentCarParams = {...defaultCarParams};

// CAR模型参数范围和步长
const carParamRanges = {
    "I<sub>avg</sub>": { min: 1, max: 100, step: 0.1 },
    V: { min: 0, max: 1, step: 0.01 },
    K: { min: 0.1, max: 10, step: 0.1 },
    "t<sub>exp</sub>": { min: 0.1, max: 20, step: 0.1 },
    acid_gen_efficiency: { min: 0.01, max: 1, step: 0.01 },
    diffusion_length: { min: 0, max: 20, step: 0.1 },
    reaction_rate: { min: 0.01, max: 1, step: 0.01 },
    amplification: { min: 1, max: 50, step: 0.5 },
    contrast: { min: 0.1, max: 10, step: 0.1 }
};

// 初始化CAR模型界面
function initCarModel() {
    // 绑定参数滑块事件
    Object.keys(defaultCarParams).forEach(param => {
        const slider = document.getElementById(`car_${param}`);
        const numInput = slider.parentElement.querySelector('input[type="number"]');
        const valueDisplay = slider.parentElement.parentElement.querySelector('.parameter-value');
        
        if (slider && numInput) {
            // 设置初始值
            slider.value = defaultCarParams[param];
            numInput.value = defaultCarParams[param];
            if (valueDisplay) {
                valueDisplay.textContent = defaultCarParams[param];
            }
            
            // 绑定滑块事件
            slider.addEventListener('input', function() {
                numInput.value = this.value;
                if (valueDisplay) {
                    valueDisplay.textContent = this.value;
                }
                currentCarParams[param] = parseFloat(this.value);
            });
            
            // 绑定数字输入框事件
            numInput.addEventListener('change', function() {
                const range = carParamRanges[param];
                let value = parseFloat(this.value);
                
                // 验证范围
                if (value < range.min) value = range.min;
                if (value > range.max) value = range.max;
                
                this.value = value;
                slider.value = value;
                if (valueDisplay) {
                    valueDisplay.textContent = value;
                }
                currentCarParams[param] = value;
            });
        }
    });
    
    // 绑定计算按钮事件
    const calculateBtn = document.getElementById('car-calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateCarModel);
    }
    
    // 绑定重置按钮事件
    const resetBtn = document.getElementById('car-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetCarParams);
    }
    
    // 显示工艺流程图 (未创建时不执行)
    renderCarProcessFlow();
}

// 渲染CAR工艺流程图
function renderCarProcessFlow() {
    const processContainer = document.getElementById('car-process-flow');
    if (!processContainer) return;
    
    const steps = [
        { icon: '☀️', desc: '曝光产生光酸' },
        { icon: '🔥', desc: '后烘扩散' },
        { icon: '⚛️', desc: '脱保护反应' },
        { icon: '💧', desc: '显影溶解' }
    ];
    
    let html = '<div class="car-process-diagram">';
    
    steps.forEach((step, index) => {
        html += `
            <div class="car-process-step">
                <div class="car-step-icon">${step.icon}</div>
                <div class="car-step-description">${step.desc}</div>
            </div>
        `;
        
        if (index < steps.length - 1) {
            html += '<div class="car-process-arrow">→</div>';
        }
    });
    
    html += '</div>';
    processContainer.innerHTML = html;
}

// 计算CAR模型
function calculateCarModel() {
    // 显示加载动画
    document.getElementById('loading').style.display = 'flex';
    
    // 准备API请求数据
    const requestData = {
        model_type: 'car',
        ...currentCarParams
    };
    
    // 发送API请求
    fetch('/api/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayCarResults(data.data);
        } else {
            showErrorMessage(data.message || '计算失败');
        }
    })
    .catch(error => {
        showErrorMessage(`请求错误: ${error.message}`);
    })
    .finally(() => {
        // 隐藏加载动画
        document.getElementById('loading').style.display = 'none';
    });
    
    // 同时请求交互式数据
    fetch('/api/calculate_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderCarInteractivePlots(data.data);
        }
    })
    .catch(error => {
        console.error('获取交互式数据失败:', error);
    });
}

// 显示CAR模型结果
function displayCarResults(results) {
    // 显示结果图
    const resultsContainer = document.getElementById('car-results');
    if (!resultsContainer) return;
    
    let html = '<div class="car-results-container">';
    
    // 显示初始光酸分布图
    if (results.initial_acid_plot) {
        html += `
            <div class="car-result-card">
                <div class="car-result-title">初始光酸分布</div>
                <img class="car-result-image" src="data:image/png;base64,${results.initial_acid_plot}" alt="初始光酸分布">
                <p>曝光后产生的初始光酸空间分布</p>
            </div>
        `;
    }
    
    // 显示光酸扩散对比图
    if (results.acid_diffusion_plot) {
        html += `
            <div class="car-result-card">
                <div class="car-result-title">光酸扩散过程</div>
                <img class="car-result-image" src="data:image/png;base64,${results.acid_diffusion_plot}" alt="光酸扩散过程">
                <p>后烘过程中光酸扩散效果对比</p>
            </div>
        `;
    }
    
    // 显示脱保护程度图
    if (results.deprotection_plot) {
        html += `
            <div class="car-result-card">
                <div class="car-result-title">脱保护反应分布</div>
                <img class="car-result-image" src="data:image/png;base64,${results.deprotection_plot}" alt="脱保护反应分布">
                <p>光酸催化的树脂脱保护反应程度分布</p>
            </div>
        `;
    }
    
    // 显示光刻胶厚度图
    if (results.thickness_plot) {
        html += `
            <div class="car-result-card">
                <div class="car-result-title">显影后光刻胶厚度</div>
                <img class="car-result-image" src="data:image/png;base64,${results.thickness_plot}" alt="显影后光刻胶厚度">
                <p>显影后的光刻胶厚度分布</p>
            </div>
        `;
    }
    
    html += '</div>';
    resultsContainer.innerHTML = html;
}

// 通用导出图片和数据函数
function addExportButtonsForPlot(plotDiv, plotName, xData, yData) {
    // 创建按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.className = 'plot-export-btns';
    btnContainer.style.textAlign = 'center';
    btnContainer.style.margin = '10px 0 20px 0';
    // 导出图片按钮
    const exportImgBtn = document.createElement('button');
    exportImgBtn.textContent = '导出图片';
    exportImgBtn.onclick = function() {
        Plotly.downloadImage(plotDiv, {format: 'png', filename: plotName});
    };
    // 导出数据按钮
    const exportDataBtn = document.createElement('button');
    exportDataBtn.textContent = '导出数据';
    exportDataBtn.onclick = function() {
        let csv = 'x,y\n';
        for (let i = 0; i < xData.length; i++) {
            csv += `${xData[i]},${yData[i]}\n`;
        }
        let blob = new Blob([csv], {type: 'text/csv'});
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = plotName + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    btnContainer.appendChild(exportImgBtn);
    btnContainer.appendChild(exportDataBtn);
    // 插入到图表下方
    plotDiv.parentNode.insertBefore(btnContainer, plotDiv.nextSibling);
}

// 渲染交互式图表
function renderCarInteractivePlots(data) {
    // 准备容器
    const plotContainer = document.getElementById('car-interactive-plots');
    if (!plotContainer || !data || !data.x) return;
    plotContainer.innerHTML = '';
    // 创建初始光酸和扩散后光酸对比图
    if (data.initial_acid && data.diffused_acid) {
        // 新增：大标题
        const acidTitle = document.createElement('h3');
        acidTitle.className = 'plot-title';
        acidTitle.textContent = '光酸分布对比';
        plotContainer.appendChild(acidTitle);
        const acidComparisonDiv = document.createElement('div');
        acidComparisonDiv.id = 'car-acid-comparison-plot';
        acidComparisonDiv.className = 'car-plot-container';
        plotContainer.appendChild(acidComparisonDiv);
        const acidTraces = [
            {
                x: data.x,
                y: data.initial_acid,
                name: '初始光酸分布',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#2ca02c', width: 2 }
            },
            {
                x: data.x,
                y: data.diffused_acid,
                name: '扩散后光酸分布',
                type: 'scatter',
                mode: 'lines',
                line: { color: '#1f77b4', width: 2 }
            }
        ];
        const acidLayout = {
            title: '光酸分布对比',
            xaxis: { title: '位置 (μm)' },
            yaxis: { title: '归一化光酸浓度' },
            legend: { x: 0.05, y: 1 },
            margin: { t: 40, b: 40, l: 60, r: 10 },
            hovermode: 'closest'
        };
        Plotly.newPlot('car-acid-comparison-plot', acidTraces, acidLayout);
        // 弹窗支持
        acidComparisonDiv.on('plotly_click', function(eventData) {
            if (eventData.points && eventData.points.length > 0) {
                const pt = eventData.points[0];
                window.showSinglePointDetailsPopup(pt, 'car_acid_concentration', acidComparisonDiv, eventData);
            }
        });
        addExportButtonsForPlot(acidComparisonDiv, 'car_acid_comparison', data.x, data.initial_acid);
    }
    // 创建树脂脱保护程度图
    if (data.deprotection) {
        // 新增：大标题
        const deprotectionTitle = document.createElement('h3');
        deprotectionTitle.className = 'plot-title';
        deprotectionTitle.textContent = '树脂脱保护程度分布';
        plotContainer.appendChild(deprotectionTitle);
        const deprotectionDiv = document.createElement('div');
        deprotectionDiv.id = 'car-deprotection-plot';
        deprotectionDiv.className = 'car-plot-container';
        plotContainer.appendChild(deprotectionDiv);
        const deprotectionTrace = [{
            x: data.x,
            y: data.deprotection,
            name: '脱保护程度',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#d62728', width: 2 }
        }];
        const deprotectionLayout = {
            title: '树脂脱保护程度分布',
            xaxis: { title: '位置 (μm)' },
            yaxis: { title: '脱保护程度' },
            margin: { t: 40, b: 40, l: 60, r: 10 },
            hovermode: 'closest'
        };
        Plotly.newPlot('car-deprotection-plot', deprotectionTrace, deprotectionLayout);
        deprotectionDiv.on('plotly_click', function(eventData) {
            if (eventData.points && eventData.points.length > 0) {
                const pt = eventData.points[0];
                window.showSinglePointDetailsPopup(pt, 'car_deprotection_degree', deprotectionDiv, eventData);
            }
        });
        addExportButtonsForPlot(deprotectionDiv, 'car_deprotection', data.x, data.deprotection);
    }
    // 创建最终光刻胶厚度图
    if (data.thickness) {
        // 新增：大标题
        const thicknessTitle = document.createElement('h3');
        thicknessTitle.className = 'plot-title';
        thicknessTitle.textContent = '显影后光刻胶厚度分布';
        plotContainer.appendChild(thicknessTitle);
        const thicknessDiv = document.createElement('div');
        thicknessDiv.id = 'car-thickness-plot';
        thicknessDiv.className = 'car-plot-container';
        plotContainer.appendChild(thicknessDiv);
        const thicknessTrace = [{
            x: data.x,
            y: data.thickness,
            name: '光刻胶厚度',
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            fillcolor: 'rgba(148, 103, 189, 0.2)',
            line: { color: '#9467bd', width: 2 }
        }];
        const thicknessLayout = {
            title: '显影后光刻胶厚度分布',
            xaxis: { title: '位置 (μm)' },
            yaxis: { title: '归一化厚度' },
            margin: { t: 40, b: 40, l: 60, r: 10 },
            hovermode: 'closest'
        };
        Plotly.newPlot('car-thickness-plot', thicknessTrace, thicknessLayout);
        thicknessDiv.on('plotly_click', function(eventData) {
            if (eventData.points && eventData.points.length > 0) {
                const pt = eventData.points[0];
                window.showSinglePointDetailsPopup(pt, 'car_thickness', thicknessDiv, eventData);
            }
        });
        addExportButtonsForPlot(thicknessDiv, 'car_thickness', data.x, data.thickness);
    }
}

// 重置CAR模型参数
function resetCarParams() {
    // 重置参数到默认值
    Object.keys(defaultCarParams).forEach(param => {
        const slider = document.getElementById(`car_${param}`);
        const numInput = slider.parentElement.querySelector('input[type="number"]');
        const valueDisplay = slider.parentElement.parentElement.querySelector('.parameter-value');
        
        slider.value = defaultCarParams[param];
        numInput.value = defaultCarParams[param];
        if (valueDisplay) {
            valueDisplay.textContent = defaultCarParams[param];
        }
    });
    
    // 更新当前参数
    currentCarParams = {...defaultCarParams};
    
    // 清空结果
    const resultsContainer = document.getElementById('car-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="empty-results">点击"计算"按钮查看结果</div>';
    }
    
    // 清空交互式图表
    const plotContainer = document.getElementById('car-interactive-plots');
    if (plotContainer) {
        plotContainer.innerHTML = '';
    }
}

// 当页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在CAR模型相关页面
    if (document.getElementById('car-params')) {
        initCarModel();
    }
});

// 保证 showSinglePointDetailsPopup 全局可用
if (typeof window.showSinglePointDetailsPopup !== 'function' && typeof showSinglePointDetailsPopup === 'function') {
    window.showSinglePointDetailsPopup = showSinglePointDetailsPopup;
} 