/**
 * CAR模型功能实现
 */

// 初始CAR模型参数
const defaultCarParams = {
    I_avg: 10,
    V: 0.8,
    K: 2,
    t_exp: 5,
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
    I_avg: { min: 1, max: 100, step: 0.1 },
    V: { min: 0, max: 1, step: 0.01 },
    K: { min: 0.1, max: 10, step: 0.1 },
    t_exp: { min: 0.1, max: 20, step: 0.1 },
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
        
        // 添加检查确保slider不是null
        if (!slider) {
            console.warn(`未找到ID为car_${param}的滑块元素`);
            return; // 跳过当前迭代
        }
        
        const numInput = slider.parentElement ? slider.parentElement.querySelector('input[type="number"]') : null;
        const valueDisplay = slider.parentElement && slider.parentElement.parentElement ? 
                            slider.parentElement.parentElement.querySelector('.parameter-value') : null;
        
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
    if (!plotContainer || !data) return;
    plotContainer.innerHTML = '';

    // 配置选项：添加willReadFrequently优化Canvas性能
    const plotlyConfig = {
        responsive: true,
        toImageButtonOptions: {
            format: 'png',
            filename: 'car_model_plot',
            scale: 1,
            width: 800,
            height: 600,
            willReadFrequently: true // 添加Canvas优化属性
        }
    };

    // 检查是否为2D数据
    const is2D = data.is_2d === true && data.x_coords && data.y_coords;
    
    if (is2D) {
        // 处理二维热力图数据
        console.log('CAR模型：渲染2D热力图');
        
        // 初始光酸分布热力图
        if (data.z_exposure_dose || data.z_initial_acid) {
            const acidTitle = document.createElement('h3');
            acidTitle.className = 'plot-title';
            acidTitle.textContent = '初始光酸分布 (2D)';
            plotContainer.appendChild(acidTitle);
            
            const acidHeatmapDiv = document.createElement('div');
            acidHeatmapDiv.id = 'car-acid-heatmap';
            acidHeatmapDiv.className = 'car-plot-container';
            plotContainer.appendChild(acidHeatmapDiv);
            
            const acidHeatmapTrace = {
                x: data.x_coords,
                y: data.y_coords,
                z: data.z_exposure_dose || data.z_initial_acid,
                type: 'heatmap',
                colorscale: 'Viridis',
                colorbar: { title: '光酸浓度' },
                hovertemplate: 'X: %{x}<br>Y: %{y}<br>光酸浓度: %{z}<extra></extra>'
            };
            
            const acidHeatmapLayout = {
                title: '初始光酸分布 (2D)',
                xaxis: { title: '位置 (μm)' },
                yaxis: { title: '位置 (μm)' },
                margin: { l: 60, r: 20, t: 60, b: 60 }
            };
            
            Plotly.newPlot('car-acid-heatmap', [acidHeatmapTrace], acidHeatmapLayout, plotlyConfig);
            // 修改：仅导出按钮，不导出错误的数据格式
            const btnContainer = document.createElement('div');
            btnContainer.className = 'plot-export-btns';
            btnContainer.style.textAlign = 'center';
            btnContainer.style.margin = '10px 0 20px 0';
            
            const exportImgBtn = document.createElement('button');
            exportImgBtn.textContent = '导出图片';
            exportImgBtn.onclick = function() {
                Plotly.downloadImage(acidHeatmapDiv, {format: 'png', filename: 'car_acid_heatmap', willReadFrequently: true});
            };
            
            btnContainer.appendChild(exportImgBtn);
            acidHeatmapDiv.parentNode.insertBefore(btnContainer, acidHeatmapDiv.nextSibling);
        }
        
        // 扩散后光酸分布热力图
        if (data.z_diffused_acid) {
            const diffusedTitle = document.createElement('h3');
            diffusedTitle.className = 'plot-title';
            diffusedTitle.textContent = '扩散后光酸分布 (2D)';
            plotContainer.appendChild(diffusedTitle);
            
            const diffusedHeatmapDiv = document.createElement('div');
            diffusedHeatmapDiv.id = 'car-diffused-heatmap';
            diffusedHeatmapDiv.className = 'car-plot-container';
            plotContainer.appendChild(diffusedHeatmapDiv);
            
            const diffusedHeatmapTrace = {
                x: data.x_coords,
                y: data.y_coords,
                z: data.z_diffused_acid,
                type: 'heatmap',
                colorscale: 'Inferno',
                colorbar: { title: '光酸浓度' },
                hovertemplate: 'X: %{x}<br>Y: %{y}<br>扩散后光酸浓度: %{z}<extra></extra>'
            };
            
            const diffusedHeatmapLayout = {
                title: '扩散后光酸分布 (2D)',
                xaxis: { title: '位置 (μm)' },
                yaxis: { title: '位置 (μm)' },
                margin: { l: 60, r: 20, t: 60, b: 60 }
            };
            
            Plotly.newPlot('car-diffused-heatmap', [diffusedHeatmapTrace], diffusedHeatmapLayout, plotlyConfig);
            // 修改：仅导出按钮，不导出错误的数据格式
            const btnContainer = document.createElement('div');
            btnContainer.className = 'plot-export-btns';
            btnContainer.style.textAlign = 'center';
            btnContainer.style.margin = '10px 0 20px 0';
            
            const exportImgBtn = document.createElement('button');
            exportImgBtn.textContent = '导出图片';
            exportImgBtn.onclick = function() {
                Plotly.downloadImage(diffusedHeatmapDiv, {format: 'png', filename: 'car_diffused_heatmap', willReadFrequently: true});
            };
            
            btnContainer.appendChild(exportImgBtn);
            diffusedHeatmapDiv.parentNode.insertBefore(btnContainer, diffusedHeatmapDiv.nextSibling);
        }
        
        // 脱保护程度热力图
        if (data.z_deprotection) {
            const deprotectionTitle = document.createElement('h3');
            deprotectionTitle.className = 'plot-title';
            deprotectionTitle.textContent = '树脂脱保护程度 (2D)';
            plotContainer.appendChild(deprotectionTitle);
            
            const deprotectionHeatmapDiv = document.createElement('div');
            deprotectionHeatmapDiv.id = 'car-deprotection-heatmap';
            deprotectionHeatmapDiv.className = 'car-plot-container';
            plotContainer.appendChild(deprotectionHeatmapDiv);
            
            const deprotectionHeatmapTrace = {
                x: data.x_coords,
                y: data.y_coords,
                z: data.z_deprotection,
                type: 'heatmap',
                colorscale: 'YlOrRd',
                colorbar: { title: '脱保护程度' },
                hovertemplate: 'X: %{x}<br>Y: %{y}<br>脱保护程度: %{z}<extra></extra>'
            };
            
            const deprotectionHeatmapLayout = {
                title: '树脂脱保护程度 (2D)',
                xaxis: { title: '位置 (μm)' },
                yaxis: { title: '位置 (μm)' },
                margin: { l: 60, r: 20, t: 60, b: 60 }
            };
            
            Plotly.newPlot('car-deprotection-heatmap', [deprotectionHeatmapTrace], deprotectionHeatmapLayout, plotlyConfig);
            // 修改：仅导出按钮，不导出错误的数据格式
            const btnContainer = document.createElement('div');
            btnContainer.className = 'plot-export-btns';
            btnContainer.style.textAlign = 'center';
            btnContainer.style.margin = '10px 0 20px 0';
            
            const exportImgBtn = document.createElement('button');
            exportImgBtn.textContent = '导出图片';
            exportImgBtn.onclick = function() {
                Plotly.downloadImage(deprotectionHeatmapDiv, {format: 'png', filename: 'car_deprotection_heatmap', willReadFrequently: true});
            };
            
            btnContainer.appendChild(exportImgBtn);
            deprotectionHeatmapDiv.parentNode.insertBefore(btnContainer, deprotectionHeatmapDiv.nextSibling);
        }
        
        // 最终厚度热力图
        if (data.z_thickness) {
            const thicknessTitle = document.createElement('h3');
            thicknessTitle.className = 'plot-title';
            thicknessTitle.textContent = '显影后光刻胶厚度 (2D)';
            plotContainer.appendChild(thicknessTitle);
            
            const thicknessHeatmapDiv = document.createElement('div');
            thicknessHeatmapDiv.id = 'car-thickness-heatmap';
            thicknessHeatmapDiv.className = 'car-plot-container';
            plotContainer.appendChild(thicknessHeatmapDiv);
            
            const thicknessHeatmapTrace = {
                x: data.x_coords,
                y: data.y_coords,
                z: data.z_thickness,
                type: 'heatmap',
                colorscale: 'Turbo',
                colorbar: { title: '相对厚度' },
                hovertemplate: 'X: %{x}<br>Y: %{y}<br>相对厚度: %{z}<extra></extra>'
            };
            
            const thicknessHeatmapLayout = {
                title: '显影后光刻胶厚度 (2D)',
                xaxis: { title: '位置 (μm)' },
                yaxis: { title: '位置 (μm)' },
                margin: { l: 60, r: 20, t: 60, b: 60 }
            };
            
            Plotly.newPlot('car-thickness-heatmap', [thicknessHeatmapTrace], thicknessHeatmapLayout, plotlyConfig);
            // 修改：仅导出按钮，不导出错误的数据格式
            const btnContainer = document.createElement('div');
            btnContainer.className = 'plot-export-btns';
            btnContainer.style.textAlign = 'center';
            btnContainer.style.margin = '10px 0 20px 0';
            
            const exportImgBtn = document.createElement('button');
            exportImgBtn.textContent = '导出图片';
            exportImgBtn.onclick = function() {
                Plotly.downloadImage(thicknessHeatmapDiv, {format: 'png', filename: 'car_thickness_heatmap', willReadFrequently: true});
            };
            
            btnContainer.appendChild(exportImgBtn);
            thicknessHeatmapDiv.parentNode.insertBefore(btnContainer, thicknessHeatmapDiv.nextSibling);
        }
    } 
    // 处理3D数据
    else if (data.sine_type === '3d' || data.is_3d === true) {
        console.log('CAR模型：渲染3D图表');
        
        // 创建3D展示的容器标题和样式
        const title3D = document.createElement('h2');
        title3D.className = 'section-title';
        title3D.textContent = 'CAR模型三维分布图';
        plotContainer.appendChild(title3D);
        
        // 创建图表网格容器
        const gridContainer = document.createElement('div');
        gridContainer.className = 'car-3d-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
        gridContainer.style.gap = '20px';
        gridContainer.style.marginBottom = '30px';
        plotContainer.appendChild(gridContainer);
        
        // 1. 初始光酸分布图的容器
        const initialAcidDiv = document.createElement('div');
        initialAcidDiv.className = 'car-3d-plot-container';
        initialAcidDiv.style.height = '400px';
        initialAcidDiv.innerHTML = `
            <h3>初始光酸分布 (3D)</h3>
            <div id="car-initial-acid-3d" class="car-3d-plot" style="width:100%; height:350px;"></div>
        `;
        gridContainer.appendChild(initialAcidDiv);
        
        // 2. 扩散后光酸分布图的容器
        const diffusedAcidDiv = document.createElement('div');
        diffusedAcidDiv.className = 'car-3d-plot-container';
        diffusedAcidDiv.style.height = '400px';
        diffusedAcidDiv.innerHTML = `
            <h3>扩散后光酸分布 (3D)</h3>
            <div id="car-diffused-acid-3d" class="car-3d-plot" style="width:100%; height:350px;"></div>
        `;
        gridContainer.appendChild(diffusedAcidDiv);
        
        // 3. 脱保护程度分布图的容器
        const deprotectionDiv = document.createElement('div');
        deprotectionDiv.className = 'car-3d-plot-container';
        deprotectionDiv.style.height = '400px';
        deprotectionDiv.innerHTML = `
            <h3>脱保护程度分布 (3D)</h3>
            <div id="car-deprotection-3d" class="car-3d-plot" style="width:100%; height:350px;"></div>
        `;
        gridContainer.appendChild(deprotectionDiv);
        
        // 4. 光刻胶厚度分布图的容器
        const thicknessDiv = document.createElement('div');
        thicknessDiv.className = 'car-3d-plot-container';
        thicknessDiv.style.height = '400px';
        thicknessDiv.innerHTML = `
            <h3>显影后光刻胶厚度 (3D)</h3>
            <div id="car-thickness-3d" class="car-3d-plot" style="width:100%; height:350px;"></div>
        `;
        gridContainer.appendChild(thicknessDiv);
        
        // 确保有正确的3D数据
        if (data.x_coords && data.y_coords && 
            (data.initial_acid || data.diffused_acid || data.deprotection || data.thickness)) {
            
            // 创建网格数据
            const x_coords = data.x_coords;
            const y_coords = data.y_coords;
            
            // 为每个3D图表添加交互式Plotly图表
            
            // 1. 初始光酸分布
            if (data.initial_acid) {
                const initialAcidData = [{
                    type: 'surface',
                    x: x_coords,
                    y: y_coords,
                    z: data.initial_acid,
                    colorscale: 'Viridis',
                    contours: {
                        z: {
                            show: true,
                            usecolormap: true,
                            highlightcolor: "#42f462",
                            project: {z: true}
                        }
                    },
                    hovertemplate: 'X: %{x}<br>Y: %{y}<br>光酸浓度: %{z}<extra></extra>'
                }];
                
                const initialAcidLayout = {
                    title: '初始光酸分布 (3D)',
                    scene: {
                        xaxis: {title: 'X位置(μm)'},
                        yaxis: {title: 'Y位置(μm)'},
                        zaxis: {title: '浓度'}
                    },
                    autosize: true,
                    margin: {l: 0, r: 0, b: 0, t: 30}
                };
                
                Plotly.newPlot('car-initial-acid-3d', initialAcidData, initialAcidLayout, plotlyConfig);
                
                // 添加导出按钮
                const btnContainer1 = document.createElement('div');
                btnContainer1.className = 'plot-export-btns';
                btnContainer1.style.textAlign = 'center';
                btnContainer1.style.margin = '10px 0';
                
                const exportImgBtn1 = document.createElement('button');
                exportImgBtn1.textContent = '导出图片';
                exportImgBtn1.onclick = function() {
                    Plotly.downloadImage('car-initial-acid-3d', {
                        format: 'png',
                        filename: 'car_initial_acid_3d',
                        width: 800,
                        height: 600
                    });
                };
                
                btnContainer1.appendChild(exportImgBtn1);
                document.getElementById('car-initial-acid-3d').parentNode.appendChild(btnContainer1);
            }
            
            // 2. 扩散后光酸分布
            if (data.diffused_acid) {
                const diffusedAcidData = [{
                    type: 'surface',
                    x: x_coords,
                    y: y_coords,
                    z: data.diffused_acid,
                    colorscale: 'Cividis',
                    contours: {
                        z: {
                            show: true,
                            usecolormap: true,
                            highlightcolor: "#42f462",
                            project: {z: true}
                        }
                    },
                    hovertemplate: 'X: %{x}<br>Y: %{y}<br>扩散后浓度: %{z}<extra></extra>'
                }];
                
                const diffusedAcidLayout = {
                    title: '扩散后光酸分布 (3D)',
                    scene: {
                        xaxis: {title: 'X位置(μm)'},
                        yaxis: {title: 'Y位置(μm)'},
                        zaxis: {title: '扩散后浓度'}
                    },
                    autosize: true,
                    margin: {l: 0, r: 0, b: 0, t: 30}
                };
                
                Plotly.newPlot('car-diffused-acid-3d', diffusedAcidData, diffusedAcidLayout, plotlyConfig);
                
                // 添加导出按钮
                const btnContainer2 = document.createElement('div');
                btnContainer2.className = 'plot-export-btns';
                btnContainer2.style.textAlign = 'center';
                btnContainer2.style.margin = '10px 0';
                
                const exportImgBtn2 = document.createElement('button');
                exportImgBtn2.textContent = '导出图片';
                exportImgBtn2.onclick = function() {
                    Plotly.downloadImage('car-diffused-acid-3d', {
                        format: 'png',
                        filename: 'car_diffused_acid_3d',
                        width: 800,
                        height: 600
                    });
                };
                
                btnContainer2.appendChild(exportImgBtn2);
                document.getElementById('car-diffused-acid-3d').parentNode.appendChild(btnContainer2);
            }
            
            // 3. 脱保护程度分布
            if (data.deprotection) {
                const deprotectionData = [{
                    type: 'surface',
                    x: x_coords,
                    y: y_coords,
                    z: data.deprotection,
                    colorscale: 'YlOrRd',
                    contours: {
                        z: {
                            show: true,
                            usecolormap: true,
                            highlightcolor: "#42f462",
                            project: {z: true}
                        }
                    },
                    hovertemplate: 'X: %{x}<br>Y: %{y}<br>脱保护程度: %{z}<extra></extra>'
                }];
                
                const deprotectionLayout = {
                    title: '脱保护程度分布 (3D)',
                    scene: {
                        xaxis: {title: 'X位置(μm)'},
                        yaxis: {title: 'Y位置(μm)'},
                        zaxis: {title: '脱保护程度'}
                    },
                    autosize: true,
                    margin: {l: 0, r: 0, b: 0, t: 30}
                };
                
                Plotly.newPlot('car-deprotection-3d', deprotectionData, deprotectionLayout, plotlyConfig);
                
                // 添加导出按钮
                const btnContainer3 = document.createElement('div');
                btnContainer3.className = 'plot-export-btns';
                btnContainer3.style.textAlign = 'center';
                btnContainer3.style.margin = '10px 0';
                
                const exportImgBtn3 = document.createElement('button');
                exportImgBtn3.textContent = '导出图片';
                exportImgBtn3.onclick = function() {
                    Plotly.downloadImage('car-deprotection-3d', {
                        format: 'png',
                        filename: 'car_deprotection_3d',
                        width: 800,
                        height: 600
                    });
                };
                
                btnContainer3.appendChild(exportImgBtn3);
                document.getElementById('car-deprotection-3d').parentNode.appendChild(btnContainer3);
            }
            
            // 4. 光刻胶厚度分布
            if (data.thickness) {
                const thicknessData = [{
                    type: 'surface',
                    x: x_coords,
                    y: y_coords,
                    z: data.thickness,
                    colorscale: 'Plasma',
                    contours: {
                        z: {
                            show: true,
                            usecolormap: true,
                            highlightcolor: "#42f462",
                            project: {z: true}
                        }
                    },
                    hovertemplate: 'X: %{x}<br>Y: %{y}<br>相对厚度: %{z}<extra></extra>'
                }];
                
                const thicknessLayout = {
                    title: '显影后光刻胶厚度 (3D)',
                    scene: {
                        xaxis: {title: 'X位置(μm)'},
                        yaxis: {title: 'Y位置(μm)'},
                        zaxis: {title: '相对厚度'}
                    },
                    autosize: true,
                    margin: {l: 0, r: 0, b: 0, t: 30}
                };
                
                Plotly.newPlot('car-thickness-3d', thicknessData, thicknessLayout, plotlyConfig);
                
                // 添加导出按钮
                const btnContainer4 = document.createElement('div');
                btnContainer4.className = 'plot-export-btns';
                btnContainer4.style.textAlign = 'center';
                btnContainer4.style.margin = '10px 0';
                
                const exportImgBtn4 = document.createElement('button');
                exportImgBtn4.textContent = '导出图片';
                exportImgBtn4.onclick = function() {
                    Plotly.downloadImage('car-thickness-3d', {
                        format: 'png',
                        filename: 'car_thickness_3d',
                        width: 800,
                        height: 600
                    });
                };
                
                btnContainer4.appendChild(exportImgBtn4);
                document.getElementById('car-thickness-3d').parentNode.appendChild(btnContainer4);
            }
        } 
        // 如果没有获取到3D数据，但有图片数据，作为备用显示图片
        else if (data.initial_acid_plot || data.acid_diffusion_plot || 
                data.deprotection_plot || data.thickness_plot) {
            
            // 1. 初始光酸分布
            if (data.initial_acid_plot) {
                const initialAcidImg = document.createElement('img');
                initialAcidImg.src = `data:image/png;base64,${data.initial_acid_plot}`;
                initialAcidImg.alt = '初始光酸分布 (3D)';
                initialAcidImg.style.width = '100%';
                initialAcidImg.style.height = '350px';
                initialAcidImg.style.objectFit = 'contain';
                document.getElementById('car-initial-acid-3d').appendChild(initialAcidImg);
                
                // 添加导出按钮
                const btnContainer1 = document.createElement('div');
                btnContainer1.className = 'plot-export-btns';
                btnContainer1.style.textAlign = 'center';
                btnContainer1.style.margin = '10px 0';
                
                const exportImgBtn1 = document.createElement('button');
                exportImgBtn1.textContent = '导出图片';
                exportImgBtn1.onclick = function() {
                    const link = document.createElement('a');
                    link.href = initialAcidImg.src;
                    link.download = 'car_initial_acid_3d.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };
                
                btnContainer1.appendChild(exportImgBtn1);
                document.getElementById('car-initial-acid-3d').parentNode.appendChild(btnContainer1);
            }
            
            // 2. 扩散后光酸分布
            if (data.acid_diffusion_plot) {
                const diffusedAcidImg = document.createElement('img');
                diffusedAcidImg.src = `data:image/png;base64,${data.acid_diffusion_plot}`;
                diffusedAcidImg.alt = '扩散后光酸分布 (3D)';
                diffusedAcidImg.style.width = '100%';
                diffusedAcidImg.style.height = '350px';
                diffusedAcidImg.style.objectFit = 'contain';
                document.getElementById('car-diffused-acid-3d').appendChild(diffusedAcidImg);
                
                // 添加导出按钮
                const btnContainer2 = document.createElement('div');
                btnContainer2.className = 'plot-export-btns';
                btnContainer2.style.textAlign = 'center';
                btnContainer2.style.margin = '10px 0';
                
                const exportImgBtn2 = document.createElement('button');
                exportImgBtn2.textContent = '导出图片';
                exportImgBtn2.onclick = function() {
                    const link = document.createElement('a');
                    link.href = diffusedAcidImg.src;
                    link.download = 'car_diffused_acid_3d.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };
                
                btnContainer2.appendChild(exportImgBtn2);
                document.getElementById('car-diffused-acid-3d').parentNode.appendChild(btnContainer2);
            }
            
            // 3. 脱保护程度分布
            if (data.deprotection_plot) {
                const deprotectionImg = document.createElement('img');
                deprotectionImg.src = `data:image/png;base64,${data.deprotection_plot}`;
                deprotectionImg.alt = '脱保护程度分布 (3D)';
                deprotectionImg.style.width = '100%';
                deprotectionImg.style.height = '350px';
                deprotectionImg.style.objectFit = 'contain';
                document.getElementById('car-deprotection-3d').appendChild(deprotectionImg);
                
                // 添加导出按钮
                const btnContainer3 = document.createElement('div');
                btnContainer3.className = 'plot-export-btns';
                btnContainer3.style.textAlign = 'center';
                btnContainer3.style.margin = '10px 0';
                
                const exportImgBtn3 = document.createElement('button');
                exportImgBtn3.textContent = '导出图片';
                exportImgBtn3.onclick = function() {
                    const link = document.createElement('a');
                    link.href = deprotectionImg.src;
                    link.download = 'car_deprotection_3d.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };
                
                btnContainer3.appendChild(exportImgBtn3);
                document.getElementById('car-deprotection-3d').parentNode.appendChild(btnContainer3);
            }
            
            // 4. 光刻胶厚度分布
            if (data.thickness_plot) {
                const thicknessImg = document.createElement('img');
                thicknessImg.src = `data:image/png;base64,${data.thickness_plot}`;
                thicknessImg.alt = '显影后光刻胶厚度 (3D)';
                thicknessImg.style.width = '100%';
                thicknessImg.style.height = '350px';
                thicknessImg.style.objectFit = 'contain';
                document.getElementById('car-thickness-3d').appendChild(thicknessImg);
                
                // 添加导出按钮
                const btnContainer4 = document.createElement('div');
                btnContainer4.className = 'plot-export-btns';
                btnContainer4.style.textAlign = 'center';
                btnContainer4.style.margin = '10px 0';
                
                const exportImgBtn4 = document.createElement('button');
                exportImgBtn4.textContent = '导出图片';
                exportImgBtn4.onclick = function() {
                    const link = document.createElement('a');
                    link.href = thicknessImg.src;
                    link.download = 'car_thickness_3d.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };
                
                btnContainer4.appendChild(exportImgBtn4);
                document.getElementById('car-thickness-3d').parentNode.appendChild(btnContainer4);
            }
        } else {
            // 如果没有任何数据
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '无法加载3D数据，请尝试重新计算';
            plotContainer.appendChild(errorMsg);
        }
    }
    else {
        // 处理普通的一维线图数据
        // 确保至少有x和某个y序列数据
        if (!data.x || !data.initial_acid) {
            console.error('CAR模型：缺少必要的一维数据');
            return;
        }
        
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
            Plotly.newPlot('car-acid-comparison-plot', acidTraces, acidLayout, plotlyConfig);
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
            Plotly.newPlot('car-deprotection-plot', deprotectionTrace, deprotectionLayout, plotlyConfig);
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
            Plotly.newPlot('car-thickness-plot', thicknessTrace, thicknessLayout, plotlyConfig);
            thicknessDiv.on('plotly_click', function(eventData) {
                if (eventData.points && eventData.points.length > 0) {
                    const pt = eventData.points[0];
                    window.showSinglePointDetailsPopup(pt, 'car_thickness', thicknessDiv, eventData);
                }
            });
            addExportButtonsForPlot(thicknessDiv, 'car_thickness', data.x, data.thickness);
        }
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