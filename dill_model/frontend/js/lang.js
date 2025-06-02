// 语言包
const LANGS = {
    zh: {
        title: '多模型光刻胶计算工具',
        nav_guide: '使用指南',
        nav_single: '单一计算',
        nav_compare: '参数比较',
        model_section: '模型选择与说明',
        select_model: '选择计算模型:',
        dill_model: 'Dill模型（薄胶）',
        enhanced_dill_model: '增强Dill模型（厚胶）',
        param_section: '参数设置',
        avg_intensity: '平均入射光强度 (I<sub>avg</sub>)',
        fringe_visibility: '干涉条纹可见度 (V)',
        spatial_freq: '空间频率 (K)',
        exposure_time: '曝光时间 (t<sub>exp</sub>)',
        rate_constant: '光敏速率常数 (C)',
        calculate: '计算',
        result_section: '计算结果',
        exposure_dist: '曝光剂量分布',
        thickness_dist: '光刻胶厚度分布',
        copyright: '版权所有.',
        lang_btn: 'English/中文',
        param_desc_I_avg: '平均入射光强度，单位：mW/cm²',
        param_desc_V: '干涉条纹的对比度，范围：0-1',
        param_desc_K: '干涉条纹的空间频率，单位：rad/μm',
        param_desc_t_exp: '总曝光时间，单位：秒',
        param_desc_C: '光刻胶的Dill C参数，单位：cm²/mJ',
        param_desc_z_h: '光刻胶厚度，单位：μm',
        param_desc_T: '前烘温度，单位：℃',
        param_desc_t_B: '前烘时间，单位：分钟',
        param_desc_I0: '归一化初始光强',
        param_desc_M0: '归一化初始PAC浓度',
        param_desc_t_exp_enhanced: '曝光时间，单位：秒',
        btn_expand: '展开更多 <i class="fas fa-chevron-down"></i>',
        btn_collapse: '收起详情 <i class="fas fa-chevron-up"></i>',
        dill_formula_title: 'Dill模型',
        dill_formula_core: '核心关系: <code>M(x,z) = exp(-C · D(x,z))</code>',
        dill_formula_note: '<em>M: normalized PAC concentration, C: photosensitivity rate constant, D: exposure dose</em>',
        dill_formula_ode: '微分方程',
        dill_formula_ode_code: '∂M/∂t = -C·I·M',
        dill_formula_ref: '参考：Dill F H, Neureuther A R, Tuttle J A, et al. IEEE Trans Electron Devices, 1975.',
        dill_formula_bg: 'Dill模型是光刻胶曝光过程建模的经典方法，最早由Frederick H. Dill在1975年提出。该模型描述了光刻胶在曝光过程中光敏剂浓度的变化关系。',
        dill_formula_scope: 'Dill模型主要适用于薄胶层（< 3μm）的光刻胶曝光过程建模，其中光的穿透性较好，光强分布较为均匀。',
        dill_formula_math: '完整的Dill模型包括三个关键参数A、B、C：',
        dill_formula_math_A: '参数A：表示光敏剂对光的吸收率',
        dill_formula_math_B: '参数B：表示基底对光的吸收率',
        dill_formula_math_C: '参数C：表示光敏剂对光的反应速率',
        dill_formula_simple: '在本工具的简化模型中，主要使用参数C来表征光刻胶的曝光特性。',
        dill_formula_detail: '核心公式详解',
        dill_formula_param_M: 'M(x,z): 位置(x,z)处的归一化光敏剂浓度，M=1表示未曝光区域，M=0表示完全曝光区域',
        dill_formula_param_C: 'C: 光敏速率常数，表示光刻胶对光的敏感程度，单位: cm²/mJ',
        dill_formula_param_D: 'D(x,z): 位置(x,z)处的曝光剂量，单位: mJ/cm²',
        dill_formula_ode2: '微分方程形式',
        dill_formula_ode2_code: '∂M/∂t = -C · I · M',
        dill_formula_ode2_note: '其中I为光强度，表示单位时间内的曝光剂量。',
        enhanced_formula_title: '增强Dill模型（厚胶）',
        enhanced_formula_core: '核心关系: <code>∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]</code>',
        enhanced_formula_core2: '<code>∂M/∂t = -I·M·C(z_h,T,t_B)</code>',
        enhanced_formula_ode: '微分方程',
        enhanced_formula_ode_code: '∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]<br>∂M/∂t = -I·M·C(z_h,T,t_B)',
        enhanced_formula_ref: '参考：刘世杰等《厚层抗蚀剂曝光模型及其参数测量》, 2005.',
        enhanced_formula_bg: '增强Dill模型是针对厚胶层光刻胶曝光过程的扩展模型，考虑了胶厚、前烘温度、前烘时间等工艺参数对A/B/C参数的影响。',
        enhanced_formula_scope: '该模型特别适用于厚胶层（> 5μm）光刻胶，其中光的穿透性受到明显影响，光强随深度衰减较为显著。',
        enhanced_formula_fit: '参数拟合',
        enhanced_formula_fit_math: '根据刘世杰等的研究，A/B/C参数可以通过以下形式表示：',
        enhanced_formula_fit_A: 'A(z_h,T,t_B) = a₀ + a₁·z_h + a₂·T + a₃·z_h² + a₄·z_h·T + a₅·T²',
        enhanced_formula_fit_B: 'B(z_h,T,t_B) = b₀ + b₁·z_h + b₂·T',
        enhanced_formula_fit_C: 'C(z_h,T,t_B) = c₀ + c₁·z_h + c₂·T + c₃·z_h²',
        enhanced_formula_fit_note: '其中参数a₀~a₅, b₀~b₂, c₀~c₃由实验数据拟合得到。',
        enhanced_formula_detail: '核心公式详解',
        enhanced_formula_param_I: 'I: 光强度，随深度z变化',
        enhanced_formula_param_M: 'M: 归一化光敏剂浓度',
        enhanced_formula_param_A: 'A(z_h,T,t_B): 光敏剂吸收率，与胶厚、前烘温度、前烘时间相关',
        enhanced_formula_param_B: 'B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关',
        enhanced_formula_param_C: 'C(z_h,T,t_B): 光敏速率常数，与胶厚、前烘温度、前烘时间相关',
        enhanced_formula_fit_detail: '参数拟合公式',
        enhanced_formula_fit_desc: 'A、B、C参数通过多项式函数拟合实验数据：',
        welcome_title: '欢迎使用 多模型光刻胶计算工具',
        welcome_subtitle: '专业的光刻胶曝光过程建模与分析平台，支持Dill模型与增强Dill模型（厚胶）',
        welcome_formula_title: '核心公式',
        welcome_formula_dill: 'Dill模型（薄胶）',
        welcome_formula_enhanced: '增强Dill模型（厚胶）',
        welcome_formula_detail: '公式详解',
        welcome_func_title: '主要功能',
        welcome_func_single: '单一计算',
        welcome_func_single_desc: '输入单组参数，快速计算光刻胶的曝光剂量分布和厚度分布，适合初学者和单次分析需求。',
        welcome_func_compare: '参数比较',
        welcome_func_compare_desc: '同时分析多组参数的影响，直观比较不同条件下的计算结果，适合深入研究和优化分析。',
        welcome_func_multi: '多模型支持',
        welcome_func_multi_desc: '可选择经典Dill模型（适合薄胶）或增强Dill模型（适合厚胶、复杂工艺），满足不同科研需求。',
        welcome_func_tag_realtime: '实时计算',
        welcome_func_tag_chart: '交互式图表',
        welcome_func_tag_param: '参数调节',
        welcome_func_tag_multi: '多组对比',
        welcome_func_tag_preset: '预设配置',
        welcome_func_tag_threshold: '阈值分析',
        welcome_func_tag_thick: '厚胶曝光',
        welcome_func_tag_fit: '参数拟合',
        welcome_func_tag_academic: '学术支撑',
        welcome_func_btn_single: '开始计算',
        welcome_func_btn_compare: '开始比较',
        welcome_guide_title: '使用指南',
        welcome_guide_tab_single: '单一计算使用方法',
        welcome_guide_tab_compare: '参数比较使用方法',
        welcome_guide_step1: '选择模型',
        welcome_guide_step1_desc: '在模型选择区域选择Dill模型或增强Dill模型。增强Dill模型适用于厚胶、复杂工艺，参数拟合基于学术论文。',
        welcome_guide_step2: '设置参数',
        welcome_guide_step2_desc: '在参数设置区域调整五个关键参数：',
        welcome_guide_step3: '执行计算',
        welcome_guide_step3_desc: '点击"计算"按钮开始计算。系统将自动生成曝光剂量分布图和光刻胶厚度分布图。',
        welcome_guide_step4: '分析结果',
        welcome_guide_step4_desc: '查看生成的交互式图表，可以缩放、平移和查看具体数值。图表显示光刻胶在不同位置的响应特性。',
        welcome_tech_title: '技术说明',
        welcome_tech_dill: 'Dill模型原理',
        welcome_tech_dill_desc: 'Dill模型描述光刻胶中光敏剂浓度随曝光的变化，是光刻工艺建模的经典方法。',
        welcome_tech_realtime: '实时计算',
        welcome_tech_realtime_desc: '采用高效算法实现实时计算，参数调整后立即显示结果，提升分析效率。',
        welcome_tech_responsive: '响应式设计',
        welcome_tech_responsive_desc: '支持桌面和移动设备，自适应界面设计确保在各种设备上都有良好体验。',
        welcome_tech_export: '数据导出',
        welcome_tech_export_desc: '支持计算结果和图表的导出功能，便于后续分析和报告制作。',
        welcome_academic_title: '学术支撑',
        welcome_academic_note: '增强Dill模型参数拟合与微分方程组实现，详见上述文献。',
        welcome_quick_title: '准备好开始了吗？',
        welcome_quick_desc: '选择适合您需求的功能模块，开始您的Dill模型计算之旅',
        welcome_quick_btn_single: '单一计算',
        welcome_quick_btn_single_tip: '快速计算单组参数',
        welcome_quick_btn_compare: '参数比较',
        welcome_quick_btn_compare_tip: '多组参数对比分析',
        compare_title: '参数比较',
        compare_model_section: '模型选择与说明',
        compare_select_model: '选择计算模型:',
        compare_dill_model: 'Dill模型（薄胶）',
        compare_enhanced_model: '增强Dill模型（厚胶）',
        compare_param_section: '参数比较',
        compare_param_desc: '添加多组参数进行比较，观察不同参数对结果的影响',
        compare_add_set: '添加参数组',
        compare_preset_title: '🚀 快速开始',
        compare_preset_desc: '选择预设配置快速开始参数比较，探索不同参数对光刻胶形貌的影响',
        compare_preset_btn1: '基础对比',
        compare_preset_btn1_tip: '两组基础参数对比',
        compare_preset_btn2: '对比度研究',
        compare_preset_btn2_tip: '高对比度 vs 低对比度',
        compare_preset_btn3: '曝光时间研究',
        compare_preset_btn3_tip: '短时间 vs 长时间曝光',
        compare_set_title: '参数组 {n}',
        compare_set_placeholder: '自定义名称',
        compare_set_tip: '输入自定义名称',
        compare_set_copy: '复制参数组',
        compare_set_remove: '删除参数组',
        compare_btn: '比较',
        compare_result_title: '比较结果',
        compare_measure: '物理测量',
        compare_exp_dist: '曝光剂量分布比较',
        compare_thick_dist: '光刻胶厚度分布比较',
        compare_threshold: '阈值',
        compare_show: '显示',
        compare_hide: '隐藏',
        compare_legend: '图例',
        compare_template_set: '参数组 {n}',
        compare_template_placeholder: '自定义名称',
        compare_template_tip: '输入自定义名称',
        logo: '<span>多模型</span>计算工具',
        error_message: '计算过程中发生错误',
        loading: '加载中...',
        export_img: '导出图片',
        export_data: '导出数据',
        y_exposure: '曝光剂量 (mJ/cm²)',
        y_thickness: '相对厚度',
        x_position: '位置 (μm)',
        back_to_top: '回到顶部',
        param_tip_I_avg: '平均入射光强度，单位：mW/cm²。表示单位面积每秒照射到光刻胶表面的光能量。',
        param_tip_V: '干涉条纹可见度，范围0-1。越接近1，条纹对比度越高。',
        param_tip_K: '空间频率，单位rad/μm。描述干涉条纹的密集程度。',
        param_tip_t_exp: '曝光时间，单位秒。总的曝光持续时间。',
        param_tip_C: 'Dill C参数，单位cm²/mJ。反映光刻胶对光的敏感程度。',
        param_tip_z_h: '光刻胶厚度，单位μm。',
        param_tip_T: '前烘温度，单位℃。',
        param_tip_t_B: '前烘时间，单位分钟。',
        param_tip_I0: '归一化初始光强，通常为1。',
        param_tip_M0: '归一化初始PAC浓度，通常为1。',
        param_tip_t_exp_enhanced: '曝光时间，单位秒。',
        car_formula_title: 'CAR模型',
        car_formula_core: '核心关系: [H⁺] = η·D(x) = η·I(x)·t_exp',
        car_formula_deprotect: 'M = 1-exp(-k·[H⁺]_diff·A)',
        car_formula_note: '核心过程：光酸生成→扩散→催化反应→显影',
        car_formula_param_H: '光酸浓度',
        car_formula_param_eta: '光酸产生效率',
        car_formula_param_k: '反应速率常数',
        car_formula_param_A: '放大因子',
        car_formula_param_M: '脱保护度',
        car_formula_ref: '参考：Hinsberg等, SPIE, 1994',
        welcome_formula_car: 'CAR模型（化学放大型光刻胶）',
        welcome_func_car: 'CAR模型支持',
        welcome_func_car_desc: '支持化学放大型光刻胶（CAR）建模，适用于DUV等高分辨率工艺，包含光酸生成、扩散、催化反应等多物理过程。',
        welcome_func_tag_acid: '光酸扩散',
        welcome_func_tag_amp: '化学放大',
        welcome_func_tag_carmulti: '多参数调节',
        welcome_tech_car: 'CAR模型原理',
        welcome_tech_car_desc: 'CAR模型描述化学放大型光刻胶中光酸生成、扩散和催化反应的全过程，适用于高分辨率光刻工艺。',
        compare_car_model: 'CAR模型（化学放大型光刻胶）',
        compare_car_result_title: 'CAR模型结果对比（支持多组参数）',
        car_acid_gen_efficiency: '光酸产生效率 (η)',
        car_diffusion_length: '扩散长度 (EPDL)',
        car_reaction_rate: '反应速率常数 (k)',
        car_amplification: '放大因子 (A)',
        car_contrast: '对比度因子 (γ)',
        sine_wave_type_label: '正弦波类型：',
        sine_wave_type_single: '一维正弦波',
        sine_wave_type_multi: '二维正弦波',
        kx_label: 'Kx (空间频率x)',
        kx_description: 'x方向空间频率，单位：rad/μm，范围：0.1~10',
        ky_label: 'Ky (空间频率y)',
        ky_description: 'y方向空间频率，单位：rad/μm，范围：0.1~100（必须大于0）',
        phi_label: 'φ(t) (相位表达式)',
        phi_description: '相位，可为常数或t的函数，如0, 1.57, sin(2*t)',
        phi_description_supports: '支持sin/cos/pi/t等',
        y_range_label: 'y范围 (μm)：',
        y_resolution_label: '分辨率：',
        y_range_description: '二维分布时有效，y_min=y_max表示一维',
        heatmap_plot_title: '二维分布热力图',
        export_heatmap_data_btn: '导出二维数据',
        car_model: 'CAR模型（化学放大型光刻胶）',
        param_desc_car_I_avg: '平均入射光强度，单位：mW/cm²',
        param_desc_car_V: '干涉条纹的对比度，范围：0-1',
        param_desc_car_K: '干涉条纹的空间频率，单位：rad/μm',
        param_desc_car_t_exp: '总曝光时间，单位：秒',
        param_desc_car_acid_gen: '光子到光酸分子的转化效率，范围：0-1',
        param_desc_car_diff: '光酸扩散长度，单位：像素',
        param_desc_car_rate: '催化反应速率常数',
        param_desc_car_amp: '每个光酸分子可催化的反应数',
        param_desc_car_contrast: '显影过程的对比度系数',
        model_description_title: '模型选择与说明',
        copy_set_title: '复制参数组',
        remove_set_title: '删除参数组',
        compare_set_placeholder_title: '输入自定义名称',
        collapse_set_title: '折叠/展开参数组',
        add_set: '新增参数组',
        calculate: '一键计算',
        drag_handle_title: '拖拽排序',
    },
    en: {
        title: 'Multi-Model Photoresist Calculator',
        nav_guide: 'Guide',
        nav_single: 'Single Calculation',
        nav_compare: 'Parameter Comparison',
        model_section: 'Model Selection & Description',
        select_model: 'Select Calculation Model:',
        dill_model: 'Dill Model (Thin Resist)',
        enhanced_dill_model: 'Enhanced Dill Model (Thick Resist)',
        param_section: 'Parameter Settings',
        avg_intensity: 'Average Incident Intensity (I<sub>avg</sub>)',
        fringe_visibility: 'Fringe Visibility (V)',
        spatial_freq: 'Spatial Frequency (K)',
        exposure_time: 'Exposure Time (t<sub>exp</sub>)',
        rate_constant: 'Photosensitivity Rate Constant (C)',
        calculate: 'Calculate',
        result_section: 'Calculation Results',
        exposure_dist: 'Exposure Dose Distribution',
        thickness_dist: 'Photoresist Thickness Distribution',
        copyright: 'All rights reserved.',
        lang_btn: 'English/中文',
        param_desc_I_avg: 'Average incident intensity, unit: mW/cm²',
        param_desc_V: 'Fringe contrast, range: 0-1',
        param_desc_K: 'Spatial frequency of fringes, unit: rad/μm',
        param_desc_t_exp: 'Total exposure time, unit: s',
        param_desc_C: 'Dill C parameter of photoresist, unit: cm²/mJ',
        param_desc_z_h: 'Photoresist thickness, unit: μm',
        param_desc_T: 'Prebake temperature, unit: ℃',
        param_desc_t_B: 'Prebake time, unit: min',
        param_desc_I0: 'Normalized initial intensity',
        param_desc_M0: 'Normalized initial PAC concentration',
        param_desc_t_exp_enhanced: 'Exposure time, unit: s',
        btn_expand: 'Expand <i class="fas fa-chevron-down"></i>',
        btn_collapse: 'Collapse <i class="fas fa-chevron-up"></i>',
        dill_formula_title: 'Dill Model',
        dill_formula_core: 'Core relation: <code>M(x,z) = exp(-C · D(x,z))</code>',
        dill_formula_note: '<em>M: normalized PAC concentration, C: photosensitivity rate constant, D: exposure dose</em>',
        dill_formula_ode: 'ODE',
        dill_formula_ode_code: '∂M/∂t = -C·I·M',
        dill_formula_ref: 'Ref: Dill F H, Neureuther A R, Tuttle J A, et al. IEEE Trans Electron Devices, 1975.',
        dill_formula_bg: 'The Dill model is a classic method for modeling the exposure process of photoresist, first proposed by Frederick H. Dill in 1975. It describes the change of PAC concentration during exposure.',
        dill_formula_scope: 'Mainly suitable for thin resist (< 3μm), where light penetration is good and intensity is uniform.',
        dill_formula_math: 'The full Dill model includes three key parameters A, B, C:',
        dill_formula_math_A: 'A: Absorption rate of PAC',
        dill_formula_math_B: 'B: Absorption rate of substrate',
        dill_formula_math_C: 'C: Reaction rate of PAC',
        dill_formula_simple: 'In this tool, only parameter C is used to characterize the exposure property.',
        dill_formula_detail: 'Formula details',
        dill_formula_param_M: 'M(x,z): Normalized PAC concentration at (x,z), M=1 means unexposed, M=0 means fully exposed',
        dill_formula_param_C: 'C: Photosensitivity rate constant, unit: cm²/mJ',
        dill_formula_param_D: 'D(x,z): Exposure dose at (x,z), unit: mJ/cm²',
        dill_formula_ode2: 'ODE form',
        dill_formula_ode2_code: '∂M/∂t = -C · I · M',
        dill_formula_ode2_note: 'I is the light intensity, i.e. exposure dose per unit time.',
        enhanced_formula_title: 'Enhanced Dill Model (Thick Resist)',
        enhanced_formula_core: 'Core relation: <code>∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]</code>',
        enhanced_formula_core2: '<code>∂M/∂t = -I·M·C(z_h,T,t_B)</code>',
        enhanced_formula_ode: 'ODE',
        enhanced_formula_ode_code: '∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]<br>∂M/∂t = -I·M·C(z_h,T,t_B)',
        enhanced_formula_ref: 'Ref: Liu Shijie et al., 2005.',
        enhanced_formula_bg: 'The enhanced Dill model extends to thick resist, considering the effect of thickness, prebake temperature and time on A/B/C.',
        enhanced_formula_scope: 'Especially suitable for thick resist (> 5μm), where light attenuation is significant.',
        enhanced_formula_fit: 'Parameter fitting',
        enhanced_formula_fit_math: 'According to Liu et al., A/B/C can be expressed as:',
        enhanced_formula_fit_A: 'A(z_h,T,t_B) = a₀ + a₁·z_h + a₂·T + a₃·z_h² + a₄·z_h·T + a₅·T²',
        enhanced_formula_fit_B: 'B(z_h,T,t_B) = b₀ + b₁·z_h + b₂·T',
        enhanced_formula_fit_C: 'C(z_h,T,t_B) = c₀ + c₁·z_h + c₂·T + c₃·z_h²',
        enhanced_formula_fit_note: 'Parameters a₀~a₅, b₀~b₂, c₀~c₃ are fitted from experiments.',
        enhanced_formula_detail: 'Formula details',
        enhanced_formula_param_I: 'I: Light intensity, varies with z',
        enhanced_formula_param_M: 'M: Normalized PAC concentration',
        enhanced_formula_param_A: 'A(z_h,T,t_B): PAC absorption, depends on thickness, prebake T/time',
        enhanced_formula_param_B: 'B(z_h,T,t_B): Substrate absorption, depends on thickness, prebake T/time',
        enhanced_formula_param_C: 'C(z_h,T,t_B): Photosensitivity rate, depends on thickness, prebake T/time',
        enhanced_formula_fit_detail: 'Fitting formula',
        enhanced_formula_fit_desc: 'A, B, C are fitted by polynomial functions:',
        welcome_title: 'Welcome to Multi-Model Photoresist Calculator',
        welcome_subtitle: 'A professional platform for photoresist exposure modeling and analysis, supporting Dill and Enhanced Dill models (thick resist)',
        welcome_formula_title: 'Core Formula',
        welcome_formula_dill: 'Dill Model (Thin Resist)',
        welcome_formula_enhanced: 'Enhanced Dill Model (Thick Resist)',
        welcome_formula_detail: 'Formula Details',
        welcome_func_title: 'Main Features',
        welcome_func_single: 'Single Calculation',
        welcome_func_single_desc: 'Input a single set of parameters to quickly calculate exposure and thickness distribution. Suitable for beginners and single analysis.',
        welcome_func_compare: 'Parameter Comparison',
        welcome_func_compare_desc: 'Analyze the influence of multiple parameter sets and compare results visually. Suitable for in-depth research and optimization.',
        welcome_func_multi: 'Multi-Model Support',
        welcome_func_multi_desc: 'Choose classic Dill (thin resist) or Enhanced Dill (thick/complex process) to meet various research needs.',
        welcome_func_tag_realtime: 'Realtime',
        welcome_func_tag_chart: 'Interactive Chart',
        welcome_func_tag_param: 'Parameter Tuning',
        welcome_func_tag_multi: 'Multi-Group',
        welcome_func_tag_preset: 'Preset',
        welcome_func_tag_threshold: 'Threshold Analysis',
        welcome_func_tag_thick: 'Thick Resist',
        welcome_func_tag_fit: 'Parameter Fitting',
        welcome_func_tag_academic: 'Academic',
        welcome_func_btn_single: 'Start Calculation',
        welcome_func_btn_compare: 'Start Comparison',
        welcome_guide_title: 'Guide',
        welcome_guide_tab_single: 'Single Calculation Guide',
        welcome_guide_tab_compare: 'Parameter Comparison Guide',
        welcome_guide_step1: 'Select Model',
        welcome_guide_step1_desc: 'Select Dill or Enhanced Dill in the model selection area. Enhanced Dill is for thick/complex process, parameters fitted from papers.',
        welcome_guide_step2: 'Set Parameters',
        welcome_guide_step2_desc: 'Adjust five key parameters in the parameter area:',
        welcome_guide_step3: 'Run Calculation',
        welcome_guide_step3_desc: 'Click "Calculate" to start. The system will generate exposure and thickness plots automatically.',
        welcome_guide_step4: 'Analyze Results',
        welcome_guide_step4_desc: 'View interactive plots, zoom/pan and check values. Plots show the response at different positions.',
        welcome_tech_title: 'Technical Notes',
        welcome_tech_dill: 'Dill Model Principle',
        welcome_tech_dill_desc: 'Dill model describes PAC concentration change during exposure, a classic for lithography modeling.',
        welcome_tech_realtime: 'Realtime Calculation',
        welcome_tech_realtime_desc: 'Efficient algorithms for instant results after parameter adjustment, improving analysis efficiency.',
        welcome_tech_responsive: 'Responsive Design',
        welcome_tech_responsive_desc: 'Supports desktop and mobile, adaptive UI for good experience on all devices.',
        welcome_tech_export: 'Data Export',
        welcome_tech_export_desc: 'Supports exporting results and plots for further analysis and reporting.',
        welcome_academic_title: 'Academic Support',
        welcome_academic_note: 'Enhanced Dill model parameter fitting and ODE implementation, see above references.',
        welcome_quick_title: 'Ready to start?',
        welcome_quick_desc: 'Choose the module you need and start your Dill model journey!',
        welcome_quick_btn_single: 'Single Calculation',
        welcome_quick_btn_single_tip: 'Quickly calculate a single set',
        welcome_quick_btn_compare: 'Parameter Comparison',
        welcome_quick_btn_compare_tip: 'Multi-group parameter analysis',
        compare_title: 'Parameter Comparison',
        compare_model_section: 'Model Selection & Description',
        compare_select_model: 'Select Calculation Model:',
        compare_dill_model: 'Dill Model (Thin Resist)',
        compare_enhanced_model: 'Enhanced Dill Model (Thick Resist)',
        compare_param_section: 'Parameter Comparison',
        compare_param_desc: 'Add multiple parameter sets to compare and observe the effect of different parameters.',
        compare_add_set: 'Add Parameter Set',
        compare_preset_title: '🚀 Quick Start',
        compare_preset_desc: 'Choose a preset to quickly start parameter comparison and explore the effect on resist profile.',
        compare_preset_btn1: 'Basic Comparison',
        compare_preset_btn1_tip: 'Two basic sets',
        compare_preset_btn2: 'Contrast Study',
        compare_preset_btn2_tip: 'High vs Low Contrast',
        compare_preset_btn3: 'Exposure Study',
        compare_preset_btn3_tip: 'Short vs Long Exposure',
        compare_set_title: 'Parameter Set {n}',
        compare_set_placeholder: 'Custom Name',
        compare_set_tip: 'Enter custom name',
        compare_set_copy: 'Copy Set',
        compare_set_remove: 'Remove Set',
        compare_btn: 'Compare',
        compare_result_title: 'Comparison Results',
        compare_measure: 'Measure',
        compare_exp_dist: 'Exposure Dose Comparison',
        compare_thick_dist: 'Thickness Comparison',
        compare_threshold: 'Threshold',
        compare_show: 'Show',
        compare_hide: 'Hide',
        compare_legend: 'Legend',
        compare_template_set: 'Parameter Set {n}',
        compare_template_placeholder: 'Custom Name',
        compare_template_tip: 'Enter custom name',
        error_message: 'An error occurred during calculation',
        loading: 'Loading...',
        export_img: 'Export Image',
        export_data: 'Export Data',
        y_exposure: 'Exposure Dose (mJ/cm²)',
        y_thickness: 'Relative Thickness',
        x_position: 'Position (μm)',
        back_to_top: 'Back to Top',
        param_tip_I_avg: 'Average incident intensity, unit: mW/cm². The energy per second per area on the resist surface.',
        param_tip_V: 'Fringe visibility, range 0-1. Closer to 1 means higher contrast.',
        param_tip_K: 'Spatial frequency, unit: rad/μm. Describes the density of fringes.',
        param_tip_t_exp: 'Exposure time, unit: seconds. Total duration of exposure.',
        param_tip_C: 'Dill C parameter, unit: cm²/mJ. Indicates the photosensitivity of the resist.',
        param_tip_z_h: 'Photoresist thickness, unit: μm.',
        param_tip_T: 'Prebake temperature, unit: ℃.',
        param_tip_t_B: 'Prebake time, unit: min.',
        param_tip_I0: 'Normalized initial intensity, usually 1.',
        param_tip_M0: 'Normalized initial PAC concentration, usually 1.',
        param_tip_t_exp_enhanced: 'Exposure time, unit: seconds.',
        car_formula_title: 'CAR Model',
        car_formula_core: 'Core relation: [H⁺] = η·D(x) = η·I(x)·t_exp',
        car_formula_deprotect: 'M = 1-exp(-k·[H⁺]_diff·A)',
        car_formula_note: 'Core process: acid generation → diffusion → catalytic reaction → development',
        car_formula_param_H: 'Acid concentration',
        car_formula_param_eta: 'Acid generation efficiency',
        car_formula_param_k: 'Reaction rate constant',
        car_formula_param_A: 'Amplification factor',
        car_formula_param_M: 'Deprotection degree',
        car_formula_ref: 'Ref: Hinsberg et al., SPIE, 1994',
        welcome_formula_car: 'CAR Model (Chemically Amplified Resist)',
        welcome_func_car: 'CAR Model Support',
        welcome_func_car_desc: 'Supports CAR (Chemically Amplified Resist) modeling, suitable for DUV and high-resolution processes, including acid generation, diffusion, and catalytic reaction.',
        welcome_func_tag_acid: 'Acid Diffusion',
        welcome_func_tag_amp: 'Chemical Amplification',
        welcome_func_tag_carmulti: 'Multi-parameter',
        welcome_tech_car: 'CAR Model Principle',
        welcome_tech_car_desc: 'CAR model describes the full process of acid generation, diffusion, and catalytic reaction in chemically amplified resists, suitable for high-resolution lithography.',
        compare_car_model: 'CAR Model (Chemically Amplified Resist)',
        compare_car_result_title: 'CAR Model Comparison Results (Multi-group Supported)',
        car_acid_gen_efficiency: 'Acid Generation Efficiency (η)',
        car_diffusion_length: 'Diffusion Length (EPDL)',
        car_reaction_rate: 'Reaction Rate Constant (k)',
        car_amplification: 'Amplification Factor (A)',
        car_contrast: 'Contrast Factor (γ)',
        sine_wave_type_label: 'Sine Wave Type:',
        sine_wave_type_single: '1D Sine Wave',
        sine_wave_type_multi: '二维正弦波',
        kx_label: 'Kx (Spatial Frequency x)',
        kx_description: 'Spatial frequency in x-direction, unit: rad/μm, range: 0.1~10',
        ky_label: 'Ky (Spatial Frequency y)',
        ky_description: 'Spatial frequency in y-direction, unit: rad/μm, range: 0.1~100 (must >0)',
        phi_label: 'φ(t) (Phase Expression)',
        phi_description: 'Phase, can be a constant or a function of t, e.g., 0, 1.57, sin(2*t)',
        phi_description_supports: 'Supports sin/cos/pi/t etc.',
        y_range_label: 'y-range (μm):',
        y_resolution_label: 'Resolution:',
        y_range_description: 'Effective for 2D distribution, y_min=y_max for 1D',
        heatmap_plot_title: '2D Distribution Heatmap',
        export_heatmap_data_btn: 'Export 2D Data',
        car_model: 'CAR Model (Chemically Amplified Resist)',
        param_desc_car_I_avg: 'Average incident light intensity, unit: mW/cm²',
        param_desc_car_V: 'Interference fringe visibility, range: 0-1',
        param_desc_car_K: 'Spatial frequency of interference fringes, unit: rad/μm',
        param_desc_car_t_exp: 'Total exposure time, unit: seconds',
        param_desc_car_acid_gen: 'Photon to photoacid molecule conversion efficiency, range: 0-1',
        param_desc_car_diff: 'Photoacid diffusion length, unit: pixels',
        param_desc_car_rate: 'Catalytic reaction rate constant',
        param_desc_car_amp: 'Number of reactions catalyzed by each photoacid molecule',
        param_desc_car_contrast: 'Contrast coefficient of the development process',
        model_description_title: 'Model Selection & Description',
        copy_set_title: 'Copy Parameter Set',
        remove_set_title: 'Remove Parameter Set',
        compare_set_placeholder_title: 'Enter custom name',
        collapse_set_title: 'Collapse/Expand Parameter Set',
        add_set: 'Add Parameter Set',
        calculate: 'Calculate',
        logo: '<span>Multi-Model</span> Calculation Tool',
        drag_handle_title: 'Drag to reorder',
    }
};

// Function to get the persisted language or default to 'zh'
function getInitialLang() {
    try {
        const persistedLang = localStorage.getItem('userLanguage');
        if (persistedLang && (persistedLang === 'zh' || persistedLang === 'en')) {
            return persistedLang;
        }
    } catch (e) {
        console.error('Error reading language from localStorage:', e);
    }
    return 'zh'; // Default language
}

let currentLang = getInitialLang();

function switchLang() {
    currentLang = (currentLang === 'zh') ? 'en' : 'zh';
    try {
        localStorage.setItem('userLanguage', currentLang);
    } catch (e) {
        console.error('Error saving language to localStorage:', e);
    }
    applyLang();
    // 新增：切换按钮样式
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.classList.remove('lang-btn-zh', 'lang-btn-en');
        langBtn.classList.add(currentLang === 'zh' ? 'lang-btn-zh' : 'lang-btn-en');
    }
}

function applyLang() {
    console.log('[lang] applyLang called for:', currentLang);
    if (!LANGS[currentLang]) {
        console.error('Language not found in LANGS:', currentLang);
        return;
    }

    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (LANGS[currentLang][key]) {
            if (elem.tagName === 'INPUT' && (elem.type === 'submit' || elem.type === 'button')) {
                elem.value = LANGS[currentLang][key];
            } else if (elem.tagName === 'OPTION') {
                elem.textContent = LANGS[currentLang][key];
            } else if (elem.hasAttribute('placeholder')) {
                elem.placeholder = LANGS[currentLang][key];
            } else {
                elem.innerHTML = LANGS[currentLang][key];
            }
        } else {
            // console.warn(`[lang] Key "${key}" not found for lang "${currentLang}"`);
        }
    });

    // Update page title
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
        const titleKey = titleElement.getAttribute('data-i18n');
        if (LANGS[currentLang][titleKey]) {
            document.title = LANGS[currentLang][titleKey];
        }
    }

    // Update logo specifically, as it might have complex structure not covered by data-i18n innerHTML alone
    const logo = document.querySelector('.logo[data-i18n="logo"]'); // Assuming logo has data-i18n="logo"
    if (logo && LANGS[currentLang].logo) {
        logo.innerHTML = LANGS[currentLang].logo;
    }

    // Update language toggle button text
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn && LANGS[currentLang].lang_btn) {
        langBtn.textContent = LANGS[currentLang].lang_btn;
        // Update button style if you have specific styles for each language state
        langBtn.classList.remove('lang-btn-zh', 'lang-btn-en');
        langBtn.classList.add(currentLang === 'zh' ? 'lang-btn-zh' : 'lang-btn-en');
    }

    // Re-initialize Choices.js instances to reflect language changes in options
    if (typeof initializeChoices === 'function') {
        initializeChoices();
    }

    // Update expand/collapse button texts based on current state and language
    // This is important if their text is set on page load based on language
    document.querySelectorAll('.toggle-details-btn').forEach(function(btn) {
        const details = btn.parentElement.querySelector('.model-full-details');
        if (details) {
            if (details.classList.contains('details-visible')) {
                btn.innerHTML = LANGS[currentLang].btn_collapse;
            } else {
                btn.innerHTML = LANGS[currentLang].btn_expand;
            }
        }
    });

    // After applying language to all static elements,
    // if plots were previously generated, re-render them with the new language.
    if (typeof clearAllCharts === 'function' && typeof displayInteractiveResults === 'function' && window.lastPlotData) {
        console.log('[lang] Re-rendering plots with new language.');
        // It's important that clearAllCharts and displayInteractiveResults are defined,
        // which should be the case if main.js is loaded.
        clearAllCharts(); // Clear existing plots
        displayInteractiveResults(window.lastPlotData); // Re-display with new language
    }
}

document.addEventListener('DOMContentLoaded', function() {
    applyLang(); // Apply the initial language (from localStorage or default)

    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.addEventListener('click', function() {
            console.log('[lang] Toggle button clicked');
            switchLang(); // switchLang now saves to localStorage and calls applyLang
        });
    } else {
        console.log('[lang] lang-toggle-btn not found');
    }
}); 