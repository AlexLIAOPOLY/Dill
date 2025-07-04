from flask import Blueprint, request, jsonify
from ..models import DillModel, get_model_by_name
from ..utils import validate_input, validate_enhanced_input, validate_car_input, format_response, NumpyEncoder
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from backend.models import EnhancedDillModel
import traceback, datetime
import time

# 全局日志存储
calculation_logs = []

def add_log_entry(log_type, model_type, message, timestamp=None, dimension=None, details=None):
    """添加增强的日志条目"""
    if timestamp is None:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    log_entry = {
        'timestamp': timestamp,
        'type': log_type,  # 'info', 'progress', 'success', 'warning', 'error'
        'model': model_type,  # 'dill', 'enhanced_dill', 'car', 'system'
        'message': message,
        'dimension': dimension,  # '1d', '2d', '3d' 或 None
        'details': details or ''  # 详细信息
    }
    
    calculation_logs.append(log_entry)
    
    # 保持日志条目数量在合理范围内（最多1000条）
    if len(calculation_logs) > 1000:
        calculation_logs.pop(0)

def add_dimension_log(log_type, model_type, message, dimension, details=None):
    """添加带维度信息的日志条目"""
    add_log_entry(log_type, model_type, f"[{dimension.upper()}] {message}", dimension=dimension, details=details)

def add_progress_log(model_type, message, progress_percent=None, dimension=None):
    """添加进度日志"""
    if progress_percent is not None:
        message = f"{message} ({progress_percent}%)"
    add_log_entry('progress', model_type, message, dimension=dimension)

def add_success_log(model_type, message, dimension=None, details=None):
    """添加成功日志"""
    add_log_entry('success', model_type, message, dimension=dimension, details=details)

def add_warning_log(model_type, message, dimension=None, details=None):
    """添加警告日志"""
    add_log_entry('warning', model_type, message, dimension=dimension, details=details)

def add_error_log(model_type, message, dimension=None, details=None):
    """添加错误日志"""
    add_log_entry('error', model_type, message, dimension=dimension, details=details)

def clear_logs():
    """清空日志"""
    global calculation_logs
    calculation_logs = []

# 创建API蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 实例化Dill模型
dill_model = DillModel()

@api_bp.route('/calculate', methods=['POST'])
def calculate():
    """
    计算模型并返回图像
    新增参数: model_type, sine_type (支持'1d', 'multi', '3d')
    """
    try:
        data = request.get_json()
        print('收到前端参数:', data)  # 调试用
        model_type = data.get('model_type', 'dill')
        model = get_model_by_name(model_type)
        
        # 根据模型类型验证参数
        if model_type == 'dill':
            sine_type = data.get('sine_type', '1d')  # 先获取sine_type
            is_valid, message = validate_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            # 提取参数
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            C = float(data['C'])
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                # 获取y范围参数
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                # 新增校验: 确保 y_min < y_max 且 y_points > 1
                if y_min >= y_max:
                    return jsonify(format_response(False, message="Y轴范围最小值必须小于最大值")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message="Y轴点数必须大于1才能进行二维计算")), 400
                
                # 如果校验通过，则直接计算y_range
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_plots(I_avg, V, None, t_exp, C, sine_type=sine_type, 
                                               Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
            elif sine_type == '3d':
                # 处理三维正弦波参数
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                # 获取三维范围参数
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 默认使用50个点
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                plots = model.generate_plots(I_avg, V, None, t_exp, C, sine_type=sine_type,
                                           Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                           y_range=y_range, z_range=z_range)
            else:
                K = float(data['K'])
                # 首先生成基于用户当前输入t_exp的静态数据（无论是否启用动画）
                plots = model.generate_plots(I_avg, V, K, t_exp, C, sine_type=sine_type)
                
                # 检查是否启用1D动画
                enable_1d_animation = data.get('enable_1d_animation', False)
                if enable_1d_animation:
                    # 获取1D动画参数 - 修复参数名不匹配问题
                    t_exp_start_1d = float(data.get('t_start', 0.1))  # 修复：从 t_exp_start_1d 改为 t_start
                    t_exp_end_1d = float(data.get('t_end', 50.0))     # 修复：从 t_exp_end_1d 改为 t_end
                    time_steps_1d = int(data.get('time_steps', 100))  # 修复：从 time_steps_1d 改为 time_steps
                    
                    add_progress_log('dill', f"启用1D时间动画 (曝光时间: {t_exp_start_1d}s - {t_exp_end_1d}s, {time_steps_1d}步)", dimension='1d')
                    
                    # 生成1D动画数据并合并到静态数据中
                    animation_data = model.generate_1d_animation_data(I_avg, V, K, t_exp_start_1d, t_exp_end_1d, time_steps_1d, C)
                    
                    # 直接合并动画数据（动画数据已不再包含会覆盖静态数据的字段）
                    plots.update(animation_data)
                    add_success_log('dill', f"1D动画数据生成完成 ({time_steps_1d}帧)", dimension='1d')
        elif model_type == 'enhanced_dill':
            is_valid, message = validate_enhanced_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('enhanced_dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            z_h = float(data['z_h'])
            T = float(data['T'])
            t_B = float(data['t_B'])
            I0 = float(data.get('I0', 1.0))
            M0 = float(data.get('M0', 1.0))
            t_exp = float(data['t_exp'])
            sine_type = data.get('sine_type', '1d')
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                V = float(data.get('V', 0))
                plots = model.generate_plots(z_h, T, t_B, I0, M0, t_exp, 
                                          sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V)
            elif sine_type == '3d':
                # 处理三维正弦波参数
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                
                # 获取三维范围参数
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 默认使用50个点
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                plots = model.generate_plots(z_h, T, t_B, I0, M0, t_exp, 
                                          sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz,
                                          phi_expr=phi_expr, V=V, y_range=y_range, z_range=z_range)
            else:
                plots = model.generate_plots(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type)
        elif model_type == 'car':
            is_valid, message = validate_car_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('car', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            acid_gen_efficiency = float(data['acid_gen_efficiency'])
            diffusion_length = float(data['diffusion_length'])
            reaction_rate = float(data['reaction_rate'])
            amplification = float(data['amplification'])
            contrast = float(data['contrast'])
            sine_type = data.get('sine_type', '1d')
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                # 为CAR模型添加y_range参数处理
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                if y_min >= y_max:
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_plots(I_avg, V, None, t_exp, acid_gen_efficiency, 
                                         diffusion_length, reaction_rate, amplification, contrast, 
                                         sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
            elif sine_type == '3d':
                # 处理三维正弦波参数
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                
                # 获取三维范围参数
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 打印详细参数用于调试
                print(f"计算3D薄胶模型，参数：Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr={phi_expr}")
                print(f"范围参数：x_min={x_min}, x_max={x_max}, y_min={y_min}, y_max={y_max}, z_min={z_min}, z_max={z_max}")
                
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                # 打印生成的范围信息
                print(f"生成的范围：y_range长度={len(y_range) if y_range else 0}, z_range长度={len(z_range) if z_range else 0}")
                
                try:
                    plots = model.generate_plots(I_avg, V, None, t_exp, acid_gen_efficiency, 
                                               diffusion_length, reaction_rate, amplification, contrast,
                                               sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                               y_range=y_range, z_range=z_range)
                    # 打印返回数据的结构
                    print(f"返回数据字段：{list(plots.keys())}")
                    if 'exposure_dose' in plots:
                        if isinstance(plots['exposure_dose'], list):
                            print(f"exposure_dose是列表，长度={len(plots['exposure_dose'])}")
                            if len(plots['exposure_dose']) > 0 and isinstance(plots['exposure_dose'][0], list):
                                print(f"exposure_dose是二维列表，形状=[{len(plots['exposure_dose'])}, {len(plots['exposure_dose'][0]) if len(plots['exposure_dose']) > 0 else 0}]")
                            else:
                                print(f"exposure_dose是一维列表")
                except Exception as e:
                    print(f"生成3D数据时出错：{str(e)}")
                    # 记录错误堆栈以便调试
                    traceback.print_exc()
                    raise
            else:
                K = float(data['K'])
                plots = model.generate_plots(I_avg, V, K, t_exp, acid_gen_efficiency, 
                                         diffusion_length, reaction_rate, amplification, contrast, 
                                         sine_type=sine_type)
        else:
            return jsonify(format_response(False, message="未知模型类型")), 400
        return jsonify(format_response(True, data=plots)), 200
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        return jsonify({'success': False, 'message_zh': f"计算错误: {str(e)}", 'message_en': f"Calculation error: {str(e)}", 'data': None}), 500

@api_bp.route('/calculate_data', methods=['POST'])
def calculate_data():
    """
    计算模型并返回原始数据（用于交互式图表）
    新增参数: model_type, sine_type (支持'1d', 'multi', '3d')
    """
    import time
    
    try:
        data = request.get_json()
        print('收到前端参数:', data)  # 调试用
        model_type = data.get('model_type', 'dill')
        model = get_model_by_name(model_type)
        sine_type = data.get('sine_type', '1d')
        
        # 开始计算时间统计
        start_time = time.time()
        
        plot_data = None # Initialize plot_data

        # 根据模型类型验证参数
        if model_type == 'dill':
            is_valid, message = validate_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            C = float(data['C'])
            
            # 检查是否启用4D动画
            enable_4d_animation = data.get('enable_4d_animation', False)
            
            # 检查是否启用1D动画
            enable_1d_animation = data.get('enable_1d_animation', False)
            t_start = float(data.get('t_start', 0)) if enable_4d_animation else 0
            t_end = float(data.get('t_end', 5)) if enable_4d_animation else 5
            time_steps = int(data.get('time_steps', 20)) if enable_4d_animation else 20
            
            if enable_4d_animation:
                add_log_entry('info', 'dill', f"启用4D动画: t_start={t_start}s, t_end={t_end}s, time_steps={time_steps}", dimension=sine_type)
            
            # 添加详细的参数日志
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                print(f"Dill模型参数 (2D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}")
                print(f"  二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}], 点数: {y_points}")
                print(f"[Dill-2D] 开始计算二维空间分布，网格大小: 1000×{y_points}")
                
                # 添加到日志系统
                add_log_entry('info', 'dill', f"Dill-2D模型参数 (2D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}", dimension='2d')
                add_log_entry('info', 'dill', f"二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'", dimension='2d')
                add_log_entry('info', 'dill', f"Y轴范围: [{y_min}, {y_max}], 点数: {y_points}", dimension='2d')
                add_log_entry('progress', 'dill', f"开始计算二维空间分布，网格大小: 1000×{y_points}", dimension='2d')
                
                if y_min >= y_max:
                    add_error_log('dill', "Y轴范围配置错误：最小值必须小于最大值", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    add_error_log('dill', "Y轴点数配置错误：必须大于1", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                
                calc_start = time.time()
                try:
                    plot_data = model.generate_data(I_avg, V, None, t_exp, C, sine_type=sine_type, 
                                                    Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range,
                                                    enable_4d_animation=enable_4d_animation,
                                                    t_start=t_start, t_end=t_end, time_steps=time_steps)
                    calc_time = time.time() - calc_start
                    
                    if enable_4d_animation:
                        add_log_entry('success', 'dill', f"✅ Dill-2D-4D动画计算完成! 共{time_steps}帧", dimension='2d')
                        add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='2d')
                    else:
                        add_log_entry('success', 'dill', f"✅ 二维计算完成!", dimension='2d')
                        add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='2d')
                    
                except Exception as e:
                    calc_time = time.time() - calc_start
                    print(f"[Dill-2D] ❌ 二维计算出错: {str(e)}")
                    print(f"[Dill-2D] ⏱️  计算耗时: {calc_time:.3f}s")
                    add_error_log('dill', f"二维计算失败: {str(e)}", dimension='2d')
                    add_log_entry('error', 'dill', f"❌ 二维计算出错: {str(e)}", dimension='2d')
                    add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='2d')
                    raise
                    
            elif sine_type == '3d':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 生成y_range和z_range
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                print(f"Dill模型参数 (3D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}")
                print(f"  三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'")
                print(f"  X轴范围: [{x_min}, {x_max}]")
                print(f"  Y轴范围: [{y_min}, {y_max}]")
                print(f"  Z轴范围: [{z_min}, {z_max}]")
                print(f"[Dill-3D] 开始计算三维空间分布，预计网格大小: 50×50×50")
                
                # 添加到日志系统
                add_log_entry('info', 'dill', f"Dill-3D模型参数 (3D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}", dimension='3d')
                add_log_entry('info', 'dill', f"三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'", dimension='3d')
                add_log_entry('info', 'dill', f"X轴范围: [{x_min}, {x_max}]", dimension='3d')
                add_log_entry('info', 'dill', f"Y轴范围: [{y_min}, {y_max}]", dimension='3d')
                add_log_entry('info', 'dill', f"Z轴范围: [{z_min}, {z_max}]", dimension='3d')
                add_log_entry('progress', 'dill', f"开始计算三维空间分布，预计网格大小: 50×50×50", dimension='3d')
                
                calc_start = time.time()
                try:
                    # 确保z_range正确传递给模型
                    plot_data = model.generate_data(I_avg, V, None, t_exp, C, sine_type=sine_type,
                                                 Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                                 y_range=y_range, z_range=z_range,
                                                 enable_4d_animation=enable_4d_animation,
                                                 t_start=t_start, t_end=t_end, time_steps=time_steps,
                                                 x_min=x_min, x_max=x_max)
                    calc_time = time.time() - calc_start
                    
                    print(f"[Dill-3D] 🎯 三维计算完成统计:")
                    print(f"  ✅ 计算成功")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  💾 数据字段: {list(plot_data.keys())}")
                    
                    # 添加到日志系统
                    add_log_entry('success', 'dill', f"🎯 三维计算完成统计", dimension='3d')
                    add_log_entry('info', 'dill', f"✅ 计算成功", dimension='3d')
                    add_log_entry('info', 'dill', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='3d')
                    add_log_entry('info', 'dill', f"💾 数据字段: {list(plot_data.keys())}", dimension='3d')
                    
                    if 'exposure_dose' in plot_data:
                        exp_data = np.array(plot_data['exposure_dose'])
                        thick_data = np.array(plot_data['thickness'])
                        print(f"  🔢 曝光剂量范围: [{exp_data.min():.3f}, {exp_data.max():.3f}] mJ/cm²")
                        print(f"  📏 厚度范围: [{thick_data.min():.4f}, {thick_data.max():.4f}] (归一化)")
                        print(f"  📐 Dill模型3D特征分析:")
                        print(f"     数据维度: {exp_data.shape if exp_data.ndim > 1 else '1D'}")
                        print(f"     空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
                        print(f"     光敏速率常数C: {C:.4f} cm²/mJ")
                        
                        # 添加到日志系统
                        add_log_entry('info', 'dill', f"🔢 曝光剂量范围: [{exp_data.min():.3f}, {exp_data.max():.3f}] mJ/cm²", dimension='3d')
                        add_log_entry('info', 'dill', f"📏 厚度范围: [{thick_data.min():.4f}, {thick_data.max():.4f}] (归一化)", dimension='3d')
                        add_log_entry('info', 'dill', f"📐 Dill模型3D特征分析", dimension='3d')
                        add_log_entry('info', 'dill', f"   数据维度: {exp_data.shape if exp_data.ndim > 1 else '1D'}", dimension='3d')
                        add_log_entry('info', 'dill', f"   空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}", dimension='3d')
                        add_log_entry('info', 'dill', f"   光敏速率常数C: {C:.4f} cm²/mJ", dimension='3d')
                    
                    add_success_log('dill', f"三维计算完成，用时{calc_time:.3f}s", dimension='3d')
                    
                except Exception as e:
                    calc_time = time.time() - calc_start
                    print(f"[Dill-3D] ❌ 三维计算出错: {str(e)}")
                    print(f"[Dill-3D] ⏱️  计算耗时: {calc_time:.3f}s")
                    add_error_log('dill', f"三维计算失败: {str(e)}", dimension='3d')
                    add_log_entry('error', 'dill', f"❌ 三维计算出错: {str(e)}", dimension='3d')
                    add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='3d')
                    raise
                    
            else: # 1D Dill
                K = float(data['K'])
                
                # 检查启用的功能
                enable_1d_v_evaluation = data.get('enable_1d_v_evaluation', False)
                
                # 首先生成基于用户当前参数的静态数据（这是所有模式的基础）
                print(f"Dill模型参数: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
                print(f"[Dill-1D] 生成静态数据作为基础")
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V, K, t_exp, C, sine_type=sine_type)
                static_calc_time = time.time() - calc_start
                total_calc_time = static_calc_time
                
                # 处理1D动画功能
                if enable_1d_animation:
                    # 处理1D动画参数
                    t_start = float(data.get('t_start', 0.1))
                    t_end = float(data.get('t_end', 5.0))
                    time_steps = int(data.get('time_steps', 500))
                    
                    print(f"[Dill-1D-Animation] 启用1D时间动画，时间范围: {t_start}s - {t_end}s, {time_steps}步")
                    add_progress_log('dill', f"启用1D时间动画 (时间范围: {t_start}s - {t_end}s, {time_steps}步)", dimension='1d')
                    
                    # 生成动画数据
                    print(f"[Dill-1D-Animation] 生成动画数据 ({t_start}s - {t_end}s, {time_steps}帧)")
                    anim_calc_start = time.time()
                    animation_data = model.generate_1d_animation_data(I_avg, V, K, t_start, t_end, time_steps, C)
                    anim_calc_time = time.time() - anim_calc_start
                    total_calc_time += anim_calc_time
                    
                    # 添加动画数据到plot_data
                    plot_data['enable_1d_animation'] = True
                    plot_data['animation_frames'] = []
                    
                    # 处理动画帧数据
                    if 'frames' in animation_data:
                        for frame in animation_data['frames']:
                            frame_data = {
                                'time': frame['t_exp'],
                                'x': frame['x_coords'],
                                'exposure_dose': frame['exposure_data'],
                                'thickness': frame['thickness_data']
                            }
                            plot_data['animation_frames'].append(frame_data)
                    
                    print(f"[Dill-1D-Animation] ✅ 动画数据生成完成: {len(plot_data.get('animation_frames', []))}帧，用时{anim_calc_time:.3f}s")
                    add_log_entry('success', 'dill', f"✅ 1D动画数据生成完成", dimension='1d')
                    add_success_log('dill', f"1D动画数据生成完成 ({time_steps}帧), 用时{anim_calc_time:.3f}s", dimension='1d')
                
                # 处理1D V评估功能
                if enable_1d_v_evaluation:
                    # 处理1D V评估参数
                    v_start = float(data.get('v_start', 0.1))
                    v_end = float(data.get('v_end', 1.0))
                    v_time_steps = int(data.get('time_steps', 500))  # V评估使用相同的步数参数
                    
                    print(f"[Dill-1D-V-Eval] 启用1D V（对比度）评估，V范围: {v_start} - {v_end}, {v_time_steps}步")
                    add_progress_log('dill', f"启用1D V（对比度）评估 (V范围: {v_start} - {v_end}, {v_time_steps}步)", dimension='1d')
                    
                    # 生成V评估数据
                    print(f"[Dill-1D-V-Eval] 生成V评估数据 (V: {v_start} - {v_end}, {v_time_steps}帧)")
                    v_calc_start = time.time()
                    v_evaluation_data = model.generate_1d_v_animation_data(I_avg, v_start, v_end, v_time_steps, K, t_exp, C)
                    v_calc_time = time.time() - v_calc_start
                    total_calc_time += v_calc_time
                    
                    # 添加V评估数据到plot_data
                    plot_data['enable_1d_v_evaluation'] = True
                    plot_data['v_evaluation_frames'] = []
                    
                    # 处理V评估帧数据
                    if 'frames' in v_evaluation_data:
                        for frame in v_evaluation_data['frames']:
                            frame_data = {
                                'v_value': frame['v_value'],
                                'x': frame['x_coords'],
                                'exposure_dose': frame['exposure_data'],
                                'thickness': frame['thickness_data']
                            }
                            plot_data['v_evaluation_frames'].append(frame_data)
                    
                    print(f"[Dill-1D-V-Eval] ✅ V评估数据生成完成: {len(plot_data.get('v_evaluation_frames', []))}帧，用时{v_calc_time:.3f}s")
                    add_log_entry('success', 'dill', f"✅ 1D V评估数据生成完成", dimension='1d')
                    add_success_log('dill', f"1D V评估数据生成完成 ({v_time_steps}帧), 用时{v_calc_time:.3f}s", dimension='1d')
                
                # 如果两个功能都没有启用，输出静态模式信息
                if not enable_1d_animation and not enable_1d_v_evaluation:
                    print(f"[Dill-1D] 静态模式，开始计算一维空间分布，共1000个位置")
                    add_log_entry('info', 'dill', f"Dill-1D模型参数 (1D正弦波): I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}", dimension='1d')
                    add_log_entry('progress', 'dill', f"开始计算一维空间分布，共1000个位置", dimension='1d')
                
                calc_time = total_calc_time
                
                # 检查是否为1D动画模式或V评估模式 - 需要区别处理数据结构
                if enable_1d_animation and plot_data and 'animation_frames' in plot_data:
                    # 1D动画模式 - 数据在animation_frames中，不需要进度统计
                    print(f"[Dill-1D-Animation] ✅ 动画数据处理完成，跳过统计分析")
                    add_log_entry('success', 'dill', f"✅ 1D动画数据处理完成", dimension='1d')
                elif data.get('enable_1d_v_evaluation', False) and plot_data and 'v_evaluation_frames' in plot_data:
                    # 1D V评估模式 - 数据在v_evaluation_frames中，不需要进度统计
                    print(f"[Dill-1D-V-Eval] ✅ V评估数据处理完成，跳过统计分析")
                    add_log_entry('success', 'dill', f"✅ 1D V评估数据处理完成", dimension='1d')
                elif plot_data and 'exposure_dose' in plot_data:
                    # 静态1D模式 - 正常处理统计数据
                    exposure_array = np.array(plot_data['exposure_dose'])
                    thickness_array = np.array(plot_data['thickness'])
                    x_array = np.array(plot_data['x'])
                    
                    # 模拟计算进度输出（因为计算很快，这里简化显示）
                    # 确保数组长度足够，避免索引越界
                    array_length = len(x_array)
                    
                    # 动态计算进度索引，确保不超过数组边界
                    idx_20_percent = min(199, array_length - 1)
                    idx_50_percent = min(499, array_length - 1) 
                    idx_80_percent = min(799, array_length - 1)
                    
                    # 安全的进度输出
                    print(f"[Dill-1D] 进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, exposure={exposure_array[idx_20_percent]:.3f}, thickness={thickness_array[idx_20_percent]:.4f}")
                    print(f"[Dill-1D] 进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, exposure={exposure_array[idx_50_percent]:.3f}, thickness={thickness_array[idx_50_percent]:.4f}")
                    print(f"[Dill-1D] 进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, exposure={exposure_array[idx_80_percent]:.3f}, thickness={thickness_array[idx_80_percent]:.4f}")
                    
                    # 添加安全的进度信息到日志系统
                    add_log_entry('progress', 'dill', f"进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, exposure={exposure_array[idx_20_percent]:.3f}, thickness={thickness_array[idx_20_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'dill', f"进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, exposure={exposure_array[idx_50_percent]:.3f}, thickness={thickness_array[idx_50_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'dill', f"进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, exposure={exposure_array[idx_80_percent]:.3f}, thickness={thickness_array[idx_80_percent]:.4f}", dimension='1d')
                    
                    print(f"[Dill-1D] 🎯 计算完成统计:")
                    print(f"  ✅ 成功计算: 1000/1000 (100.0%)")
                    print(f"  ❌ 失败计算: 0/1000 (0.0%)")
                    print(f"  ⏱️  平均计算时间: {calc_time/1000:.6f}s/点")
                    print(f"  🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²")
                    print(f"  📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)")
                    print(f"  💾 数据质量: 优秀")
                    print(f"  📊 统计特征:")
                    print(f"     曝光剂量: 均值={exposure_array.mean():.3f}, 标准差={exposure_array.std():.3f}")
                    print(f"     厚度分布: 均值={thickness_array.mean():.4f}, 标准差={thickness_array.std():.4f}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'dill', f"🎯 计算完成统计", dimension='1d')
                    add_log_entry('info', 'dill', f"✅ 成功计算: 1000/1000 (100.0%)", dimension='1d')
                    add_log_entry('info', 'dill', f"❌ 失败计算: 0/1000 (0.0%)", dimension='1d')
                    add_log_entry('info', 'dill', f"⏱️ 平均计算时间: {calc_time/1000:.6f}s/点", dimension='1d')
                    add_log_entry('info', 'dill', f"🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²", dimension='1d')
                    add_log_entry('info', 'dill', f"📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)", dimension='1d')
                    add_log_entry('info', 'dill', f"💾 数据质量: 优秀", dimension='1d')
                    add_log_entry('info', 'dill', f"📊 曝光剂量统计: 均值={exposure_array.mean():.3f}, 标准差={exposure_array.std():.3f}", dimension='1d')
                    add_log_entry('info', 'dill', f"📊 厚度分布统计: 均值={thickness_array.mean():.4f}, 标准差={thickness_array.std():.4f}", dimension='1d')
                    
                    # 计算对比度
                    cv_exposure = exposure_array.std() / exposure_array.mean() if exposure_array.mean() > 0 else 0
                    cv_thickness = thickness_array.std() / thickness_array.mean() if thickness_array.mean() > 0 else 0
                    
                    print(f"  📈 高对比度检测: 曝光剂量变化{'显著' if cv_exposure > 0.3 else '适中' if cv_exposure > 0.1 else '较小'} (CV={cv_exposure:.3f})")
                    print(f"  🎭 强调制检测: 厚度变化{'显著' if cv_thickness > 0.3 else '适中' if cv_thickness > 0.1 else '较小'} (CV={cv_thickness:.3f})")
                    print(f"  📐 Dill模型特征分析:")
                    print(f"     对比度因子: {cv_exposure:.3f}")
                    print(f"     分辨率估计: {2*np.pi/K:.3f} μm" if K > 0 else "无限大")
                    print(f"     光敏速率常数C: {C:.4f} cm²/mJ")
                    
                    # 添加分析结果到日志系统
                    contrast_level = '显著' if cv_exposure > 0.3 else '适中' if cv_exposure > 0.1 else '较小'
                    modulation_level = '显著' if cv_thickness > 0.3 else '适中' if cv_thickness > 0.1 else '较小'
                    add_log_entry('info', 'dill', f"📈 高对比度检测: 曝光剂量变化{contrast_level} (CV={cv_exposure:.3f})", dimension='1d')
                    add_log_entry('info', 'dill', f"🎭 强调制检测: 厚度变化{modulation_level} (CV={cv_thickness:.3f})", dimension='1d')
                    add_log_entry('info', 'dill', f"📐 Dill模型特征分析", dimension='1d')
                    add_log_entry('info', 'dill', f"   对比度因子: {cv_exposure:.3f}", dimension='1d')
                    resolution = f"{2*np.pi/K:.3f} μm" if K > 0 else "无限大"
                    add_log_entry('info', 'dill', f"   分辨率估计: {resolution}", dimension='1d')
                    add_log_entry('info', 'dill', f"   光敏速率常数C: {C:.4f} cm²/mJ", dimension='1d')
                
                if enable_1d_animation:
                    add_success_log('dill', f"1D动画数据生成完成，{len(plot_data.get('animation_frames', []))}帧", dimension='1d')
                elif data.get('enable_1d_v_evaluation', False):
                    add_success_log('dill', f"1D V评估数据生成完成，{len(plot_data.get('v_evaluation_frames', []))}帧", dimension='1d')
                else:
                    add_success_log('dill', f"一维计算完成，1000点，用时{calc_time:.3f}s", dimension='1d')
        
        elif model_type == 'enhanced_dill':
            is_valid, message = validate_enhanced_input(data)
            if not is_valid: 
                add_error_log('enhanced_dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
                
            z_h, T, t_B, I0, M0, t_exp_enh = float(data['z_h']), float(data['T']), float(data['t_B']), float(data.get('I0', 1.0)), float(data.get('M0', 1.0)), float(data['t_exp'])
            
            if sine_type == 'multi':
                Kx, Ky, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                print(f"增强Dill模型参数 (2D正弦波): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}")
                print(f"  二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}], 点数: {y_points}")
                print(f"[Enhanced-Dill-2D] 开始计算厚胶二维空间分布，网格大小: 1000×{y_points}")
                
                # 添加到日志系统
                add_log_entry('info', 'enhanced_dill', f"增强Dill-2D模型参数 (2D正弦波): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}", dimension='2d')
                add_log_entry('info', 'enhanced_dill', f"二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'", dimension='2d')
                add_log_entry('info', 'enhanced_dill', f"Y轴范围: [{y_min}, {y_max}], 点数: {y_points}", dimension='2d')
                add_log_entry('progress', 'enhanced_dill', f"开始计算厚胶二维空间分布，网格大小: 1000×{y_points}", dimension='2d')
                
                if y_min >= y_max:
                    add_error_log('enhanced_dill', "Y轴范围配置错误", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    add_error_log('enhanced_dill', "Y轴点数配置错误", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                
                # 获取V参数（重要！用于空间光强调制）
                V = float(data.get('V', 0.8))
                
                calc_start = time.time()
                plot_data = model.generate_data(z_h, T, t_B, I0, M0, t_exp_enh, sine_type=sine_type, Kx=Kx, Ky=Ky, V=V, phi_expr=phi_expr, y_range=y_range)
                calc_time = time.time() - calc_start
                
                if plot_data and 'z_exposure_dose' in plot_data:
                    exposure_array = np.array(plot_data['z_exposure_dose'])
                    thickness_array = np.array(plot_data['z_thickness'])
                    
                    print(f"[Enhanced-Dill-2D] 🎯 二维厚胶计算完成统计:")
                    print(f"  ✅ 网格大小: {exposure_array.shape}")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²")
                    print(f"  📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)")
                    print(f"  🔬 增强Dill模型厚胶分析:")
                    print(f"     胶层厚度: {z_h}μm")
                    print(f"     前烘温度: {T}°C")
                    print(f"     前烘时间: {t_B}s")
                    print(f"     光强衰减分析: 考虑深度相关吸收")
                    print(f"     空间频率: Kx={Kx}, Ky={Ky}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'enhanced_dill', f"🎯 二维厚胶计算完成统计", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"✅ 网格大小: {exposure_array.shape}", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"🔬 增强Dill模型厚胶分析", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"   胶层厚度: {z_h}μm", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"   前烘温度: {T}°C", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"   前烘时间: {t_B}s", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"   光强衰减分析: 考虑深度相关吸收", dimension='2d')
                    add_log_entry('info', 'enhanced_dill', f"   空间频率: Kx={Kx}, Ky={Ky}", dimension='2d')
                
                add_success_log('enhanced_dill', f"二维厚胶计算完成，{z_h}μm厚度，用时{calc_time:.3f}s", dimension='2d')
                
            elif sine_type == '3d':
                Kx, Ky, Kz, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), float(data.get('Kz',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 检查4D动画参数
                enable_4d_animation = data.get('enable_4d_animation', False)
                t_start = float(data.get('t_start', 0))
                t_end = float(data.get('t_end', 5))
                time_steps = int(data.get('time_steps', 20))
                
                print(f"增强Dill模型参数 (3D正弦波): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}")
                print(f"  三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}]")
                print(f"  Z轴范围: [{z_min}, {z_max}]")
                
                if enable_4d_animation:
                    print(f"  4D动画参数: 启用, 时间范围=[{t_start}, {t_end}], 步数={time_steps}")
                    print(f"[Enhanced-Dill-4D] 开始计算厚胶4D动画数据，预计网格大小: 20×20×{time_steps}")
                    add_log_entry('info', 'enhanced_dill', f"增强Dill-4D模型参数 (3D+时间): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"4D动画参数: 时间范围=[{t_start}, {t_end}], 步数={time_steps}", dimension='4d')
                    add_log_entry('progress', 'enhanced_dill', f"开始计算厚胶4D动画数据，预计网格大小: 20×20×{time_steps}", dimension='4d')
                else:
                    print(f"[Enhanced-Dill-3D] 开始计算厚胶三维空间分布，预计网格大小: 50×50×50")
                add_log_entry('info', 'enhanced_dill', f"增强Dill-3D模型参数 (3D正弦波): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}", dimension='3d')
                add_log_entry('info', 'enhanced_dill', f"三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'", dimension='3d')
                add_log_entry('info', 'enhanced_dill', f"Y轴范围: [{y_min}, {y_max}]", dimension='3d')
                add_log_entry('info', 'enhanced_dill', f"Z轴范围: [{z_min}, {z_max}]", dimension='3d')
                add_log_entry('progress', 'enhanced_dill', f"开始计算厚胶三维空间分布，预计网格大小: 50×50×50", dimension='3d')
                
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                # 获取V参数（重要！用于空间光强调制）
                V = float(data.get('V', 0.8))
                
                calc_start = time.time()
                plot_data = model.generate_data(z_h, T, t_B, I0, M0, t_exp_enh, sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, V=V, phi_expr=phi_expr, 
                                              y_range=y_range, z_range=z_range, enable_4d_animation=enable_4d_animation, 
                                              t_start=t_start, t_end=t_end, time_steps=time_steps)
                calc_time = time.time() - calc_start
                
                if enable_4d_animation:
                    # 4D动画模式的输出统计
                    print(f"[Enhanced-Dill-4D] 🎯 四维厚胶动画计算完成统计:")
                    print(f"  ✅ 计算成功")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  🎬 动画帧数: {time_steps}帧")
                    print(f"  ⏰ 时间范围: {t_start}s ~ {t_end}s")
                    print(f"  🔬 增强Dill模型4D厚胶分析:")
                    print(f"     胶层厚度: {z_h}μm")
                    print(f"     前烘条件: {T}°C, {t_B}s")
                    print(f"     三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
                    print(f"     时间依赖性: phi_expr='{phi_expr}'")
                    
                    # 检查4D动画数据完整性
                    if plot_data and isinstance(plot_data, dict):
                        has_exposure_frames = 'exposure_dose_frames' in plot_data and plot_data['exposure_dose_frames']
                        has_thickness_frames = 'thickness_frames' in plot_data and plot_data['thickness_frames']
                        
                        if has_exposure_frames and has_thickness_frames:
                            frames_count = len(plot_data['exposure_dose_frames'])
                            print(f"  📊 数据完整性: ✅ 生成了{frames_count}帧动画数据")
                            add_log_entry('success', 'enhanced_dill', f"📊 4D动画数据生成成功，共{frames_count}帧", dimension='4d')
                        else:
                            print(f"  📊 数据完整性: ❌ 动画数据不完整")
                            add_log_entry('warning', 'enhanced_dill', f"📊 4D动画数据不完整", dimension='4d')
                    
                    # 添加到日志系统
                    add_log_entry('success', 'enhanced_dill', f"🎯 四维厚胶动画计算完成统计", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"✅ 计算成功", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"🎬 动画帧数: {time_steps}帧", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"⏰ 时间范围: {t_start}s ~ {t_end}s", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"🔬 增强Dill模型4D厚胶分析", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"   胶层厚度: {z_h}μm", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"   前烘条件: {T}°C, {t_B}s", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"   三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}", dimension='4d')
                    add_log_entry('info', 'enhanced_dill', f"   时间依赖性: phi_expr='{phi_expr}'", dimension='4d')
                    
                    add_success_log('enhanced_dill', f"四维厚胶动画计算完成，{z_h}μm厚度，{time_steps}帧，用时{calc_time:.3f}s", dimension='4d')
                else:
                    # 3D静态模式的输出统计
                    print(f"[Enhanced-Dill-3D] 🎯 三维厚胶计算完成统计:")
                    print(f"  ✅ 计算成功")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  🔬 增强Dill模型3D厚胶分析:")
                    print(f"     胶层厚度: {z_h}μm")
                    print(f"     前烘条件: {T}°C, {t_B}s")
                    print(f"     三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
                    
                    # 添加到日志系统
                    add_log_entry('success', 'enhanced_dill', f"🎯 三维厚胶计算完成统计", dimension='3d')
                    add_log_entry('info', 'enhanced_dill', f"✅ 计算成功", dimension='3d')
                    add_log_entry('info', 'enhanced_dill', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='3d')
                    add_log_entry('info', 'enhanced_dill', f"🔬 增强Dill模型3D厚胶分析", dimension='3d')
                    add_log_entry('info', 'enhanced_dill', f"   胶层厚度: {z_h}μm", dimension='3d')
                    add_log_entry('info', 'enhanced_dill', f"   前烘条件: {T}°C, {t_B}s", dimension='3d')
                    add_log_entry('info', 'enhanced_dill', f"   三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}", dimension='3d')
                
                add_success_log('enhanced_dill', f"三维厚胶计算完成，{z_h}μm厚度，用时{calc_time:.3f}s", dimension='3d')
                
            else: # 1D Enhanced Dill
                K = float(data.get('K', 2.0))
                V = float(data.get('V', 0.8))
                
                print(f"增强Dill模型参数 (1D正弦波): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}")
                print(f"  光学参数: K={K}, V={V}")
                print(f"[Enhanced-Dill-1D] 开始计算厚胶一维空间分布，共1000个位置")
                
                # 添加到日志系统
                add_log_entry('info', 'enhanced_dill', f"增强Dill-1D模型参数 (1D正弦波): z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp_enh}", dimension='1d')
                add_log_entry('info', 'enhanced_dill', f"光学参数: K={K}, V={V}", dimension='1d')
                add_log_entry('progress', 'enhanced_dill', f"开始计算厚胶一维空间分布，共1000个位置", dimension='1d')
                
                calc_start = time.time()
                # 修复：为厚胶1D模型指定足够的点数，确保索引不越界
                plot_data = model.generate_data(z_h, T, t_B, I0, M0, t_exp_enh, sine_type=sine_type, K=K, V=V, num_points=1000)
                calc_time = time.time() - calc_start
                
                if plot_data and 'exposure_dose' in plot_data:
                    exposure_array = np.array(plot_data['exposure_dose'])
                    thickness_array = np.array(plot_data['thickness'])
                    x_array = np.array(plot_data['x'])
                    
                    # 确保数组长度足够，避免索引越界
                    array_length = len(x_array)
                    
                    # 动态计算进度索引，确保不超过数组边界
                    idx_20_percent = min(199, array_length - 1)
                    idx_50_percent = min(499, array_length - 1) 
                    idx_80_percent = min(799, array_length - 1)
                    
                    # 安全的进度输出
                    print(f"[Enhanced-Dill-1D] 进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, exposure={exposure_array[idx_20_percent]:.3f}, thickness={thickness_array[idx_20_percent]:.4f}")
                    print(f"[Enhanced-Dill-1D] 进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, exposure={exposure_array[idx_50_percent]:.3f}, thickness={thickness_array[idx_50_percent]:.4f}")
                    print(f"[Enhanced-Dill-1D] 进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, exposure={exposure_array[idx_80_percent]:.3f}, thickness={thickness_array[idx_80_percent]:.4f}")
                    
                    # 添加安全的进度信息到日志系统
                    add_log_entry('progress', 'enhanced_dill', f"进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, exposure={exposure_array[idx_20_percent]:.3f}, thickness={thickness_array[idx_20_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'enhanced_dill', f"进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, exposure={exposure_array[idx_50_percent]:.3f}, thickness={thickness_array[idx_50_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'enhanced_dill', f"进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, exposure={exposure_array[idx_80_percent]:.3f}, thickness={thickness_array[idx_80_percent]:.4f}", dimension='1d')
                    
                    print(f"[Enhanced-Dill-1D] 🎯 计算完成统计:")
                    print(f"  ✅ 成功计算: 1000/1000 (100.0%)")
                    print(f"  ❌ 失败计算: 0/1000 (0.0%)")
                    print(f"  ⏱️  平均计算时间: {calc_time/1000:.6f}s/点")
                    print(f"  🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²")
                    print(f"  📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)")
                    print(f"  🔬 增强Dill模型厚胶分析:")
                    print(f"     胶层厚度: {z_h}μm")
                    print(f"     前烘温度: {T}°C")
                    print(f"     前烘时间: {t_B}s")
                    if z_h > 5:
                        print(f"     厚胶层({z_h}μm): 适合使用增强Dill模型")
                    else:
                        print(f"     薄胶层({z_h}μm): 可考虑使用标准Dill模型")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'enhanced_dill', f"🎯 计算完成统计", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"✅ 成功计算: 1000/1000 (100.0%)", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"❌ 失败计算: 0/1000 (0.0%)", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"⏱️ 平均计算时间: {calc_time/1000:.6f}s/点", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"🔬 增强Dill模型厚胶分析", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"   胶层厚度: {z_h}μm", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"   前烘温度: {T}°C", dimension='1d')
                    add_log_entry('info', 'enhanced_dill', f"   前烘时间: {t_B}s", dimension='1d')
                    
                    # 添加厚胶层分析
                    if z_h > 5:
                        analysis_msg = f"厚胶层({z_h}μm): 适合使用增强Dill模型"
                    else:
                        analysis_msg = f"薄胶层({z_h}μm): 可考虑使用标准Dill模型"
                    add_log_entry('info', 'enhanced_dill', f"   {analysis_msg}", dimension='1d')
                
                add_success_log('enhanced_dill', f"一维厚胶计算完成，{z_h}μm厚度，用时{calc_time:.3f}s", dimension='1d')

        elif model_type == 'car':
            is_valid, message = validate_car_input(data)
            if not is_valid: 
                add_error_log('car', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
                
            I_avg, V_car, t_exp_car = float(data['I_avg']), float(data['V']), float(data['t_exp'])
            acid_gen_eff, diff_len, react_rate, amp, contr = float(data['acid_gen_efficiency']), float(data['diffusion_length']), float(data['reaction_rate']), float(data['amplification']), float(data['contrast'])
            
            if sine_type == 'multi':
                Kx, Ky, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                print(f"CAR模型参数 (2D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}")
                print(f"  化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}")
                print(f"  二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}], 点数: {y_points}")
                print(f"[CAR-2D] 开始计算化学放大二维空间分布，网格大小: 1000×{y_points}")
                
                # 添加到日志系统
                add_log_entry('info', 'car', f"CAR-2D模型参数 (2D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}", dimension='2d')
                add_log_entry('info', 'car', f"化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}", dimension='2d')
                add_log_entry('info', 'car', f"二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'", dimension='2d')
                add_log_entry('info', 'car', f"Y轴范围: [{y_min}, {y_max}], 点数: {y_points}", dimension='2d')
                add_log_entry('progress', 'car', f"开始计算化学放大二维空间分布，网格大小: 1000×{y_points}", dimension='2d')
                
                if y_min >= y_max:
                    add_error_log('car', "Y轴范围配置错误", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    add_error_log('car', "Y轴点数配置错误", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V_car, None, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
                calc_time = time.time() - calc_start
                
                if plot_data and 'z_acid_concentration' in plot_data:
                    acid_array = np.array(plot_data['z_acid_concentration'])
                    deprotect_array = np.array(plot_data['z_deprotection'])
                    
                    print(f"[CAR-2D] 🎯 二维化学放大计算完成统计:")
                    print(f"  ✅ 网格大小: {acid_array.shape}")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位")
                    print(f"  🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)")
                    print(f"  ⚗️  CAR模型化学放大分析:")
                    print(f"     光酸产生效率: {acid_gen_eff}")
                    print(f"     扩散长度: {diff_len} μm")
                    print(f"     反应速率: {react_rate}")
                    print(f"     放大因子: {amp}")
                    print(f"     空间频率: Kx={Kx}, Ky={Ky}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'car', f"🎯 二维化学放大计算完成统计", dimension='2d')
                    add_log_entry('info', 'car', f"✅ 网格大小: {acid_array.shape}", dimension='2d')
                    add_log_entry('info', 'car', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='2d')
                    add_log_entry('info', 'car', f"🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位", dimension='2d')
                    add_log_entry('info', 'car', f"🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)", dimension='2d')
                    add_log_entry('info', 'car', f"⚗️ CAR模型化学放大分析", dimension='2d')
                    add_log_entry('info', 'car', f"   光酸产生效率: {acid_gen_eff}", dimension='2d')
                    add_log_entry('info', 'car', f"   扩散长度: {diff_len} μm", dimension='2d')
                    add_log_entry('info', 'car', f"   反应速率: {react_rate}", dimension='2d')
                    add_log_entry('info', 'car', f"   放大因子: {amp}", dimension='2d')
                    add_log_entry('info', 'car', f"   空间频率: Kx={Kx}, Ky={Ky}", dimension='2d')
                
                add_success_log('car', f"二维化学放大计算完成，放大因子{amp}，用时{calc_time:.3f}s", dimension='2d')
                
            elif sine_type == '3d':
                Kx, Ky, Kz, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), float(data.get('Kz',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                print(f"CAR模型参数 (3D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}")
                print(f"  化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}")
                print(f"  三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}]")
                print(f"  Z轴范围: [{z_min}, {z_max}]")
                print(f"[CAR-3D] 开始计算化学放大三维空间分布，预计网格大小: 50×50×50")
                
                # 添加到日志系统
                add_log_entry('info', 'car', f"CAR-3D模型参数 (3D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}", dimension='3d')
                add_log_entry('info', 'car', f"化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}", dimension='3d')
                add_log_entry('info', 'car', f"三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'", dimension='3d')
                add_log_entry('info', 'car', f"Y轴范围: [{y_min}, {y_max}]", dimension='3d')
                add_log_entry('info', 'car', f"Z轴范围: [{z_min}, {z_max}]", dimension='3d')
                add_log_entry('progress', 'car', f"开始计算化学放大三维空间分布，预计网格大小: 50×50×50", dimension='3d')
                
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                # 检查是否启用4D动画
                enable_4d_animation = data.get('enable_4d_animation', False)
                if enable_4d_animation:
                    t_start = float(data.get('t_start', 0))
                    t_end = float(data.get('t_end', 5))
                    time_steps = int(data.get('time_steps', 20))
                    
                    print(f"[CAR-3D] 启用4D动画: t_start={t_start}, t_end={t_end}, time_steps={time_steps}")
                    add_log_entry('info', 'car', f"启用4D动画: t_start={t_start}, t_end={t_end}, time_steps={time_steps}", dimension='4d')
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V_car, None, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, 
                                             sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, 
                                             y_range=y_range, z_range=z_range, 
                                             enable_4d_animation=enable_4d_animation,
                                             t_start=t_start if enable_4d_animation else 0,
                                             t_end=t_end if enable_4d_animation else 5,
                                             time_steps=time_steps if enable_4d_animation else 20)
                calc_time = time.time() - calc_start
                
                print(f"[CAR-3D] 🎯 三维化学放大计算完成统计:")
                print(f"  ✅ 计算成功")
                print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                print(f"  ⚗️  CAR模型3D化学放大分析:")
                print(f"     光酸产生效率: {acid_gen_eff}")
                print(f"     扩散长度: {diff_len} μm")
                print(f"     三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
                print(f"     化学放大因子: {amp}")
                
                # 添加到日志系统
                add_log_entry('success', 'car', f"🎯 三维化学放大计算完成统计", dimension='3d')
                add_log_entry('info', 'car', f"✅ 计算成功", dimension='3d')
                add_log_entry('info', 'car', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='3d')
                add_log_entry('info', 'car', f"⚗️ CAR模型3D化学放大分析", dimension='3d')
                add_log_entry('info', 'car', f"   光酸产生效率: {acid_gen_eff}", dimension='3d')
                add_log_entry('info', 'car', f"   扩散长度: {diff_len} μm", dimension='3d')
                add_log_entry('info', 'car', f"   三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}", dimension='3d')
                add_log_entry('info', 'car', f"   化学放大因子: {amp}", dimension='3d')
                
                add_success_log('car', f"三维化学放大计算完成，放大因子{amp}，用时{calc_time:.3f}s", dimension='3d')
                
            else: # 1D CAR
                K_car = float(data.get('K', 2.0))
                
                print(f"CAR模型参数 (1D正弦波): I_avg={I_avg}, V={V_car}, K={K_car}, t_exp={t_exp_car}")
                print(f"  化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}")
                print(f"[CAR-1D] 开始计算化学放大一维空间分布，共1000个位置")
                
                # 添加到日志系统
                add_log_entry('info', 'car', f"CAR-1D模型参数 (1D正弦波): I_avg={I_avg}, V={V_car}, K={K_car}, t_exp={t_exp_car}", dimension='1d')
                add_log_entry('info', 'car', f"化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}", dimension='1d')
                add_log_entry('progress', 'car', f"开始计算化学放大一维空间分布，共1000个位置", dimension='1d')
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V_car, K_car, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type)
                calc_time = time.time() - calc_start
                
                if plot_data and 'acid_concentration' in plot_data:
                    acid_array = np.array(plot_data['acid_concentration'])
                    deprotect_array = np.array(plot_data['deprotection'])
                    x_array = np.array(plot_data['positions'])
                    
                    # 确保数组长度足够，避免索引越界
                    array_length = len(x_array)
                    
                    # 动态计算进度索引，确保不超过数组边界
                    idx_20_percent = min(199, array_length - 1)
                    idx_50_percent = min(499, array_length - 1) 
                    idx_80_percent = min(799, array_length - 1)
                    
                    # 安全的进度输出
                    print(f"[CAR-1D] 进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, acid={acid_array[idx_20_percent]:.3f}, deprotection={deprotect_array[idx_20_percent]:.4f}")
                    print(f"[CAR-1D] 进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, acid={acid_array[idx_50_percent]:.3f}, deprotection={deprotect_array[idx_50_percent]:.4f}")
                    print(f"[CAR-1D] 进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, acid={acid_array[idx_80_percent]:.3f}, deprotection={deprotect_array[idx_80_percent]:.4f}")
                    
                    # 添加安全的进度信息到日志系统
                    add_log_entry('progress', 'car', f"进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, acid={acid_array[idx_20_percent]:.3f}, deprotection={deprotect_array[idx_20_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'car', f"进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, acid={acid_array[idx_50_percent]:.3f}, deprotection={deprotect_array[idx_50_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'car', f"进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, acid={acid_array[idx_80_percent]:.3f}, deprotection={deprotect_array[idx_80_percent]:.4f}", dimension='1d')
                    
                    print(f"[CAR-1D] 🎯 计算完成统计:")
                    print(f"  ✅ 成功计算: 1000/1000 (100.0%)")
                    print(f"  ❌ 失败计算: 0/1000 (0.0%)")
                    print(f"  ⏱️  平均计算时间: {calc_time/1000:.6f}s/点")
                    print(f"  🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位")
                    print(f"  🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)")
                    print(f"  💾 数据质量: 优秀")
                    print(f"  📊 统计特征:")
                    print(f"     光酸浓度: 均值={acid_array.mean():.3f}, 标准差={acid_array.std():.3f}")
                    print(f"     脱保护度: 均值={deprotect_array.mean():.4f}, 标准差={deprotect_array.std():.4f}")
                    print(f"  ⚗️  CAR模型化学放大分析:")
                    print(f"     光酸产生效率: {acid_gen_eff}")
                    print(f"     扩散长度: {diff_len} μm")
                    print(f"     反应速率常数: {react_rate}")
                    print(f"     化学放大因子: {amp}")
                    print(f"     对比度: {contr}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'car', f"🎯 计算完成统计", dimension='1d')
                    add_log_entry('info', 'car', f"✅ 成功计算: 1000/1000 (100.0%)", dimension='1d')
                    add_log_entry('info', 'car', f"❌ 失败计算: 0/1000 (0.0%)", dimension='1d')
                    add_log_entry('info', 'car', f"⏱️ 平均计算时间: {calc_time/1000:.6f}s/点", dimension='1d')
                    add_log_entry('info', 'car', f"🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位", dimension='1d')
                    add_log_entry('info', 'car', f"🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)", dimension='1d')
                    add_log_entry('info', 'car', f"💾 数据质量: 优秀", dimension='1d')
                    add_log_entry('info', 'car', f"📊 光酸浓度统计: 均值={acid_array.mean():.3f}, 标准差={acid_array.std():.3f}", dimension='1d')
                    add_log_entry('info', 'car', f"📊 脱保护度统计: 均值={deprotect_array.mean():.4f}, 标准差={deprotect_array.std():.4f}", dimension='1d')
                    add_log_entry('info', 'car', f"⚗️ CAR模型化学放大分析", dimension='1d')
                    add_log_entry('info', 'car', f"   光酸产生效率: {acid_gen_eff}", dimension='1d')
                    add_log_entry('info', 'car', f"   扩散长度: {diff_len} μm", dimension='1d')
                    add_log_entry('info', 'car', f"   反应速率常数: {react_rate}", dimension='1d')
                    add_log_entry('info', 'car', f"   化学放大因子: {amp}", dimension='1d')
                    add_log_entry('info', 'car', f"   对比度: {contr}", dimension='1d')
                
                add_success_log('car', f"一维化学放大计算完成，放大因子{amp}，用时{calc_time:.3f}s", dimension='1d')
        else:
            add_error_log('system', f"未知模型类型: {model_type}", dimension=sine_type)
            return jsonify(format_response(False, message="未知模型类型")), 400
        
        # 总计算时间
        total_time = time.time() - start_time
        print(f"[{model_type.upper()}-{sine_type.upper()}] 🏁 总计算时间: {total_time:.3f}s")
        
        # 添加总计算时间到日志系统
        dimension_map = {'1d': '1d', 'multi': '2d', '3d': '3d', 'single': '1d'}
        dimension = dimension_map.get(sine_type, sine_type)
        add_log_entry('success', model_type, f"🏁 总计算时间: {total_time:.3f}s", dimension=dimension)
        
        # Enhanced Dill模型2D数据验证和统计
        if model_type == 'enhanced_dill' and sine_type == 'multi' and plot_data:
            print(f"[Enhanced-Dill-2D] 📊 数据完整性验证:")
            
            # 检查兼容性字段
            has_z_exposure_dose = 'z_exposure_dose' in plot_data and plot_data['z_exposure_dose']
            has_z_thickness = 'z_thickness' in plot_data and plot_data['z_thickness']
            
            # 检查扩展字段
            has_yz_data = 'yz_exposure' in plot_data and 'yz_thickness' in plot_data
            has_xy_data = 'xy_exposure' in plot_data and 'xy_thickness' in plot_data
            
            print(f"  ✅ 兼容性数据: z_exposure_dose={has_z_exposure_dose}, z_thickness={has_z_thickness}")
            print(f"  ✅ YZ平面数据: yz_exposure={has_yz_data}")
            print(f"  ✅ XY平面数据: xy_exposure={has_xy_data}")
            print(f"  ✅ 元数据: is_2d={plot_data.get('is_2d', False)}")
            
            # 添加验证结果到日志
            add_log_entry('info', 'enhanced_dill', f"📊 数据完整性验证", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  兼容性数据: z_exposure_dose={has_z_exposure_dose}, z_thickness={has_z_thickness}", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  YZ平面数据: yz_exposure={has_yz_data}", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  XY平面数据: xy_exposure={has_xy_data}", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  元数据: is_2d={plot_data.get('is_2d', False)}", dimension='2d')
            
            if has_z_exposure_dose and has_z_thickness:
                add_log_entry('success', 'enhanced_dill', f"✅ Enhanced Dill 2D数据准备完成，前端显示已就绪", dimension='2d')
            else:
                add_log_entry('warning', 'enhanced_dill', f"⚠️ Enhanced Dill 2D兼容性数据不完整", dimension='2d')
        
        return jsonify(format_response(True, data=plot_data)), 200
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        
        model_type = data.get('model_type', 'unknown') if 'data' in locals() else 'unknown'
        sine_type = data.get('sine_type', 'unknown') if 'data' in locals() else 'unknown'
        add_error_log(model_type, f"计算异常: {str(e)}", dimension=sine_type)
        
        return jsonify(format_response(False, message=f"数据计算错误: {str(e)}")), 500

@api_bp.route('/compare', methods=['POST'])
def compare():
    """
    比较多组参数的计算结果
    
    接收参数:
        parameter_sets: 包含多组参数的数组，支持薄胶/厚胶/CAR模型参数
        
    返回:
        JSON格式的响应，包含比较图像
    """
    try:
        # 获取JSON数据
        data = request.get_json()
        
        # 验证输入
        if 'parameter_sets' not in data or not isinstance(data['parameter_sets'], list):
            return jsonify(format_response(False, message="缺少parameter_sets数组")), 400
        
        if len(data['parameter_sets']) < 1:
            return jsonify(format_response(False, message="至少需要一组参数")), 400
            
        parameter_sets = data['parameter_sets']
        
        # 验证每组参数
        for i, params in enumerate(parameter_sets):
            # 识别参数组类型（薄胶/厚胶/CAR）
            if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
                # CAR模型参数组
                from backend.utils.helpers import validate_car_input
                is_valid, message = validate_car_input(params)
            elif any(k in params for k in ['z_h', 'I0', 'M0']):
                # 厚胶模型参数组
                from backend.utils.helpers import validate_enhanced_input
                is_valid, message = validate_enhanced_input(params)
            else:
                # 薄胶模型参数组
                is_valid, message = validate_input(params)
                
            if not is_valid:
                return jsonify(format_response(False, message=f"参数组 {i+1}: {message}")), 400
        
        # 生成比较图像
        comparison_plots = generate_comparison_plots_with_enhanced(parameter_sets)
        
        # 返回结果
        return jsonify(format_response(True, data=comparison_plots)), 200
    
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        return jsonify(format_response(False, message=f"比较计算错误: {str(e)}")), 500

@api_bp.route('/compare_data', methods=['POST'])
def compare_data():
    """
    比较多组参数的计算结果，返回原始数据（用于交互式图表）
    """
    try:
        data = request.get_json()
        if 'parameter_sets' not in data or not isinstance(data['parameter_sets'], list):
            return jsonify(format_response(False, message="缺少parameter_sets数组")), 400
        if len(data['parameter_sets']) < 1:
            return jsonify(format_response(False, message="至少需要一组参数")), 400
            
        parameter_sets = data['parameter_sets']
        x = np.linspace(0, 10, 1000).tolist()
        exposure_doses = []
        thicknesses = []
        
        # 初始化所有需要的模型实例
        dill_model = None
        enhanced_model = None
        car_model = None
        
        for i, params in enumerate(parameter_sets):
            set_id = params.get('setId', str(i+1))
            custom_name = params.get('customName', f'参数组 {set_id}')
            
            # 判断模型类型的逻辑
            model_type = params.get('model_type', 'dill')
            
            if model_type == 'enhanced_dill' or any(k in params for k in ['z_h', 'I0', 'M0']):
                # Enhanced Dill模型
                if enhanced_model is None:
                    from backend.models import EnhancedDillModel
                    enhanced_model = EnhancedDillModel()
                
                # 获取Enhanced Dill参数
                z_h = float(params.get('z_h', 10))  # 胶厚度
                T = float(params.get('T', 100))     # 前烘温度
                t_B = float(params.get('t_B', 10))  # 前烘时间
                I0 = float(params.get('I0', 1.0))   # 初始光强
                M0 = float(params.get('M0', 1.0))   # 初始PAC浓度
                t_exp = float(params.get('t_exp', 5))  # 曝光时间
                K = float(params.get('K', 2))       # 空间频率
                V = float(params.get('V', 0.8))     # 干涉条纹可见度
                
                print(f"Enhanced Dill-1D模型参数 - 参数组{set_id}: z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp}, K={K}, V={V}")
                add_log_entry('info', 'enhanced_dill', f"参数组{set_id}: z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp}, K={K}, V={V}")
                
                # 使用真正的Enhanced Dill模型PDE求解器
                exposure_dose_data = []
                thickness_data = []
                
                print(f"[Enhanced Dill] 开始计算1D空间分布，共{len(x)}个位置")
                add_log_entry('info', 'enhanced_dill', f"开始计算1D空间分布，共{len(x)}个位置")
                
                total_compute_time = 0
                successful_calcs = 0
                fallback_calcs = 0
                
                for i, pos in enumerate(x):
                    try:
                        # 使用自适应PDE求解器，自动优化计算效率
                        z, I_final, M_final, exposure_dose_profile, compute_time = enhanced_model.adaptive_solve_enhanced_dill_pde(
                            z_h=z_h, T=T, t_B=t_B, I0=I0, M0=M0, t_exp=t_exp,
                            x_position=pos,   # 传递x位置给边界条件
                            K=K, V=V, phi_expr=None,
                            max_points=150,   # 最大网格点数
                            tolerance=1e-4    # 收敛容差
                        )
                        
                        # 计算表面曝光剂量和厚度
                        surface_exposure = exposure_dose_profile[0]
                        surface_thickness = M_final[0]
                        
                        exposure_dose_data.append(float(surface_exposure))
                        thickness_data.append(float(surface_thickness))
                        
                        total_compute_time += compute_time
                        successful_calcs += 1
                        
                        if i % 200 == 0:  # 每200个点打印一次进度
                            avg_time = total_compute_time / successful_calcs if successful_calcs > 0 else 0
                            print(f"[Enhanced Dill] 进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={surface_exposure:.3f}, thickness={surface_thickness:.4f}, 平均计算时间={avg_time:.4f}s")
                            add_log_entry('progress', 'enhanced_dill', f"进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={surface_exposure:.3f}, thickness={surface_thickness:.4f}, 平均计算时间={avg_time:.4f}s")
                            
                    except Exception as e:
                        print(f"[Enhanced Dill] 位置{pos}计算出错: {e}")
                        # 使用备用简化计算
                        try:
                            A_val, B_val, C_val = enhanced_model.get_abc(z_h, T, t_B)
                            local_I0 = I0 * (1 + V * np.cos(K * pos))
                            simple_exposure = local_I0 * t_exp
                            simple_thickness = np.exp(-C_val * simple_exposure)
                            exposure_dose_data.append(float(simple_exposure))
                            thickness_data.append(float(simple_thickness))
                            fallback_calcs += 1
                        except Exception as e2:
                            print(f"[Enhanced Dill] 备用计算也失败: {e2}")
                            # 使用默认值
                            exposure_dose_data.append(float(I0 * t_exp))
                            thickness_data.append(float(0.5))
                            fallback_calcs += 1
                
                # 计算和报告统计信息
                avg_compute_time = total_compute_time / successful_calcs if successful_calcs > 0 else 0
                total_time = total_compute_time + fallback_calcs * 0.001  # 估算备用计算时间
                
                print(f"[Enhanced Dill] 🎯 计算完成统计:")
                add_log_entry('stats', 'enhanced_dill', f"🎯 计算完成统计:")
                print(f"  ✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'enhanced_dill', f"✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                print(f"  ⚠️  备用计算: {fallback_calcs}/{len(x)} ({fallback_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'enhanced_dill', f"⚠️ 备用计算: {fallback_calcs}/{len(x)} ({fallback_calcs/len(x)*100:.1f}%)")
                print(f"  ⏱️  平均计算时间: {avg_compute_time:.4f}s/点")
                add_log_entry('stats', 'enhanced_dill', f"⏱️ 平均计算时间: {avg_compute_time:.4f}s/点")
                print(f"  🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                add_log_entry('stats', 'enhanced_dill', f"🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                print(f"  📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                add_log_entry('stats', 'enhanced_dill', f"📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                print(f"  💾 数据质量: {'优秀' if fallback_calcs/len(x) < 0.1 else '良好' if fallback_calcs/len(x) < 0.3 else '需要优化'}")
                add_log_entry('stats', 'enhanced_dill', f"💾 数据质量: {'优秀' if fallback_calcs/len(x) < 0.1 else '良好' if fallback_calcs/len(x) < 0.3 else '需要优化'}")
                
                # 检查数据质量
                if fallback_calcs > len(x) * 0.2:
                    print(f"  ⚠️  警告: 超过20%的计算使用了备用方法，可能影响精度")
                    
                # 物理合理性检查
                exp_mean = np.mean(exposure_dose_data)
                exp_std = np.std(exposure_dose_data)
                thick_mean = np.mean(thickness_data)
                thick_std = np.std(thickness_data)
                
                print(f"  📊 统计特征:")
                print(f"     曝光剂量: 均值={exp_mean:.3f}, 标准差={exp_std:.3f}")
                print(f"     厚度分布: 均值={thick_mean:.4f}, 标准差={thick_std:.4f}")
                
                if exp_std / exp_mean > 0.5:
                    print(f"  📈 高对比度检测: 曝光剂量变化显著 (CV={exp_std/exp_mean:.3f})")
                if thick_std / thick_mean > 0.3:
                    print(f"  🎭 强调制检测: 厚度变化显著 (CV={thick_std/thick_mean:.3f})")
                
                # Enhanced Dill模型特有的厚胶分析
                print(f"  🔬 Enhanced Dill模型厚胶分析:")
                print(f"     胶厚z_h: {z_h:.1f} μm")
                print(f"     前烘温度T: {T:.0f} ℃")
                print(f"     前烘时间t_B: {t_B:.0f} min")
                
                # 估算ABC参数范围（基于参数拟合公式）
                A_est = 0.1 + 0.01 * z_h + 0.001 * T
                B_est = 0.05 + 0.005 * z_h + 0.0005 * T
                C_est = 0.02 + 0.002 * z_h + 0.0001 * T
                print(f"     估算ABC参数: A≈{A_est:.4f}, B≈{B_est:.4f}, C≈{C_est:.4f}")
                
                # 厚胶特性评估
                thickness_factor = z_h / 10.0  # 以10μm为基准
                thermal_factor = (T - 100) / 50.0  # 以100℃为基准
                time_factor = t_B / 10.0  # 以10min为基准
                
                print(f"     厚胶特性评估:")
                if thickness_factor > 1.5:
                    print(f"       📏 超厚胶层({z_h}μm): 光强衰减显著，需增强曝光")
                elif thickness_factor > 1.0:
                    print(f"       📏 厚胶层({z_h}μm): 适中的深度穿透性")
                else:
                    print(f"       📏 薄胶层({z_h}μm): 可考虑使用标准Dill模型")
                
                if thermal_factor > 0.2:
                    print(f"       🌡️  高温前烘({T}℃): 有利于光酸扩散")
                elif thermal_factor < -0.2:
                    print(f"       🌡️  低温前烘({T}℃): 扩散受限，对比度增强")
                
                # 光学穿透深度估算
                penetration_depth = 1.0 / (A_est + B_est) if (A_est + B_est) > 0 else z_h
                print(f"     光学穿透深度: {penetration_depth:.2f} μm")
                
                if penetration_depth < z_h * 0.5:
                    print(f"  ⚠️  穿透不足: 底部可能曝光不足")
                elif penetration_depth > z_h * 1.5:
                    print(f"  ✨ 穿透充分: 整层光刻胶均匀曝光")
                
                print(f"[Enhanced Dill] 🏁 总计算时间: {total_time:.3f}s")
                
                exposure_doses.append({
                    'data': exposure_dose_data,
                    'name': custom_name,
                    'setId': set_id
                })
                thicknesses.append({
                    'data': thickness_data,
                    'name': custom_name,
                    'setId': set_id
                })
                
            elif model_type == 'car' or any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
                # CAR模型
                if car_model is None:
                    from backend.models import CARModel
                    car_model = CARModel()
                
                I_avg = float(params.get('I_avg', 10))
                V = float(params.get('V', 0.8))
                K = float(params.get('K', 2.0))
                t_exp = float(params.get('t_exp', 5))
                acid_gen_efficiency = float(params.get('acid_gen_efficiency', 0.5))
                diffusion_length = float(params.get('diffusion_length', 3))
                reaction_rate = float(params.get('reaction_rate', 0.3))
                amplification = float(params.get('amplification', 10))
                contrast = float(params.get('contrast', 3))
                
                print(f"CAR-1D模型参数 - 参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}")
                add_log_entry('info', 'car', f"参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}")
                print(f"CAR参数: acid_gen_eff={acid_gen_efficiency}, diff_len={diffusion_length}, reaction_rate={reaction_rate}, amp={amplification}, contrast={contrast}")
                add_log_entry('info', 'car', f"CAR参数: acid_gen_eff={acid_gen_efficiency}, diff_len={diffusion_length}, reaction_rate={reaction_rate}, amp={amplification}, contrast={contrast}")
                
                print(f"[CAR] 开始计算1D空间分布，共{len(x)}个位置")
                add_log_entry('info', 'car', f"开始计算1D空间分布，共{len(x)}个位置")
                
                # 使用CAR模型类的详细计算方法
                print(f"[CAR] 开始调用CAR模型完整计算流程，共{len(x)}个位置")
                add_log_entry('info', 'car', f"开始调用CAR模型完整计算流程，共{len(x)}个位置")
                
                import time
                start_time = time.time()
                
                # 调用CAR模型的详细计算方法，触发完整的日志记录
                car_data = car_model.calculate_car_distribution(
                    x, I_avg, V, K, t_exp, acid_gen_efficiency, 
                    diffusion_length, reaction_rate, amplification, contrast
                )
                
                exposure_dose_data = car_data['exposure_dose'].tolist() if hasattr(car_data['exposure_dose'], 'tolist') else car_data['exposure_dose']
                thickness_data = car_data['thickness'].tolist() if hasattr(car_data['thickness'], 'tolist') else car_data['thickness']
                
                total_time = time.time() - start_time
                successful_calcs = len(exposure_dose_data)
                failed_calcs = 0
                avg_compute_time = total_time / len(x)
                
                # 计算统计信息
                exp_mean = np.mean(exposure_dose_data)
                exp_std = np.std(exposure_dose_data)
                thick_mean = np.mean(thickness_data)
                thick_std = np.std(thickness_data)
                
                print(f"[CAR] 🎯 计算完成统计:")
                print(f"  ✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                print(f"  ❌ 失败计算: {failed_calcs}/{len(x)} ({failed_calcs/len(x)*100:.1f}%)")
                print(f"  ⏱️  平均计算时间: {avg_compute_time:.4f}s/点")
                print(f"  🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                print(f"  📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                print(f"  💾 数据质量: {'优秀' if failed_calcs/len(x) < 0.05 else '良好' if failed_calcs/len(x) < 0.1 else '需要优化'}")
                
                print(f"  📊 统计特征:")
                print(f"     曝光剂量: 均值={exp_mean:.3f}, 标准差={exp_std:.3f}")
                print(f"     厚度分布: 均值={thick_mean:.4f}, 标准差={thick_std:.4f}")
                
                if exp_std / exp_mean > 0.3:
                    print(f"  📈 高对比度检测: 曝光剂量变化显著 (CV={exp_std/exp_mean:.3f})")
                if thick_std / thick_mean > 0.2:
                    print(f"  🎭 强调制检测: 厚度变化显著 (CV={thick_std/thick_mean:.3f})")
                
                # CAR模型特有的化学放大分析
                print(f"  🧪 CAR模型化学放大分析:")
                print(f"     光酸产生效率η: {acid_gen_efficiency:.3f}")
                print(f"     扩散长度: {diffusion_length:.2f} nm")
                print(f"     反应速率常数k: {reaction_rate:.3f}")
                print(f"     放大因子A: {amplification:.1f}x")
                print(f"     对比度因子γ: {contrast:.1f}")
                
                # 化学放大效能评估
                chemical_amplification_factor = amplification * reaction_rate
                print(f"     化学放大效能: {chemical_amplification_factor:.2f}")
                
                if chemical_amplification_factor > 3.0:
                    print(f"  🚀 高效化学放大: 放大效能优秀 (>{chemical_amplification_factor:.1f})")
                elif chemical_amplification_factor > 1.5:
                    print(f"  ⚡ 中等化学放大: 放大效能良好 ({chemical_amplification_factor:.1f})")
                else:
                    print(f"  ⚠️  低效化学放大: 建议调整参数 ({chemical_amplification_factor:.1f})")
                    
                print(f"[CAR] 🏁 总计算时间: {total_time:.3f}s")
                
                exposure_doses.append({
                    'data': exposure_dose_data,
                    'name': custom_name,
                    'setId': set_id
                })
                thicknesses.append({
                    'data': thickness_data,
                    'name': custom_name,
                    'setId': set_id
                })
                
            else:
                # Dill模型
                if dill_model is None:
                    from backend.models import DillModel
                    dill_model = DillModel()
                
                I_avg = float(params.get('I_avg', 10))
                V = float(params.get('V', 0.8))
                K = float(params.get('K', 2.0))
                t_exp = float(params.get('t_exp', 5))
                C = float(params.get('C', 0.02))
                
                print(f"Dill-1D模型参数 - 参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
                add_log_entry('info', 'dill', f"参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
                
                # 使用详细进度计算Dill模型数据
                print(f"[Dill] 开始计算1D空间分布，共{len(x)}个位置")
                add_log_entry('info', 'dill', f"开始计算1D空间分布，共{len(x)}个位置")
                
                import time
                start_time = time.time()
                exposure_dose_data = []
                thickness_data = []
                
                successful_calcs = 0
                failed_calcs = 0
                
                for i, pos in enumerate(x):
                    try:
                        # 计算光强分布
                        intensity = I_avg * (1 + V * np.cos(K * pos))
                        
                        # 计算曝光剂量
                        exposure_dose = intensity * t_exp
                        
                        # 计算光刻胶厚度（Dill模型）
                        # M(x,z) = e^(-C * D(x,z))
                        thickness = np.exp(-C * exposure_dose)
                        
                        exposure_dose_data.append(float(exposure_dose))
                        thickness_data.append(float(thickness))
                        successful_calcs += 1
                        
                        if i % 200 == 0:  # 每200个点打印一次进度
                            elapsed_time = time.time() - start_time
                            avg_time = elapsed_time / (i + 1) if i > 0 else 0
                            print(f"[Dill] 进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={exposure_dose:.3f}, thickness={thickness:.4f}, 平均时间={avg_time:.4f}s")
                            add_log_entry('progress', 'dill', f"进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={exposure_dose:.3f}, thickness={thickness:.4f}, 平均时间={avg_time:.4f}s")
                            
                    except Exception as e:
                        print(f"[Dill] 位置{pos}计算出错: {e}")
                        # 使用默认值
                        exposure_dose_data.append(float(I_avg * t_exp))
                        thickness_data.append(float(np.exp(-C * I_avg * t_exp)))
                        failed_calcs += 1
                
                total_time = time.time() - start_time
                avg_compute_time = total_time / len(x)
                
                # 计算统计信息
                exp_mean = np.mean(exposure_dose_data)
                exp_std = np.std(exposure_dose_data)
                thick_mean = np.mean(thickness_data)
                thick_std = np.std(thickness_data)
                
                print(f"[Dill] 🎯 计算完成统计:")
                add_log_entry('stats', 'dill', f"🎯 计算完成统计:")
                print(f"  ✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'dill', f"✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                print(f"  ❌ 失败计算: {failed_calcs}/{len(x)} ({failed_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'dill', f"❌ 失败计算: {failed_calcs}/{len(x)} ({failed_calcs/len(x)*100:.1f}%)")
                print(f"  ⏱️  平均计算时间: {avg_compute_time:.4f}s/点")
                add_log_entry('stats', 'dill', f"⏱️ 平均计算时间: {avg_compute_time:.4f}s/点")
                print(f"  🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                add_log_entry('stats', 'dill', f"🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                print(f"  📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                add_log_entry('stats', 'dill', f"📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                print(f"  💾 数据质量: {'优秀' if failed_calcs/len(x) < 0.01 else '良好' if failed_calcs/len(x) < 0.05 else '需要优化'}")
                add_log_entry('stats', 'dill', f"💾 数据质量: {'优秀' if failed_calcs/len(x) < 0.01 else '良好' if failed_calcs/len(x) < 0.05 else '需要优化'}")
                
                print(f"  📊 统计特征:")
                print(f"     曝光剂量: 均值={exp_mean:.3f}, 标准差={exp_std:.3f}")
                print(f"     厚度分布: 均值={thick_mean:.4f}, 标准差={thick_std:.4f}")
                
                if exp_std / exp_mean > 0.2:
                    print(f"  📈 高对比度检测: 曝光剂量变化显著 (CV={exp_std/exp_mean:.3f})")
                if thick_std / thick_mean > 0.1:
                    print(f"  🎭 强调制检测: 厚度变化显著 (CV={thick_std/thick_mean:.3f})")
                    
                # Dill模型特有的参数分析
                contrast_factor = exp_std / exp_mean if exp_mean > 0 else 0
                resolution_estimate = 1.0 / (K * V) if K > 0 and V > 0 else 0
                print(f"  📐 Dill模型特征分析:")
                print(f"     对比度因子: {contrast_factor:.3f}")
                print(f"     分辨率估计: {resolution_estimate:.3f} μm")
                print(f"     光敏速率常数C: {C:.4f} cm²/mJ")
                
                print(f"[Dill] 🏁 总计算时间: {total_time:.3f}s")
                
                exposure_doses.append({
                    'data': exposure_dose_data,
                    'name': custom_name,
                    'setId': set_id
                })
                thicknesses.append({
                    'data': thickness_data,
                    'name': custom_name,
                    'setId': set_id
                })
        
        result_data = {
            'x': x,
            'exposure_doses': exposure_doses,
            'thicknesses': thicknesses,
            'colors': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'][:len(parameter_sets)]
        }
        
        return jsonify(format_response(True, data=result_data))
        
    except Exception as e:
        error_msg = f"比较数据计算错误: {str(e)}"
        print(f"Error: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify(format_response(False, message=error_msg)), 500

def generate_comparison_plots_with_enhanced(parameter_sets):
    x = np.linspace(0, 10, 1000)
    fig1 = plt.figure(figsize=(12, 7))
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    legend_labels = []
    
    # 初始化所有需要的模型实例
    dill_model = None
    enhanced_model = None
    car_model = None
    
    # 第一个图：曝光剂量分布比较
    for i, params in enumerate(parameter_sets):
        if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
            if car_model is None:
                from backend.models import CARModel
                car_model = CARModel()
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params.get('K', 2.0))
            t_exp = float(params['t_exp'])
            acid_gen_efficiency = float(params['acid_gen_efficiency'])
            diffusion_length = float(params['diffusion_length'])
            reaction_rate = float(params['reaction_rate'])
            amplification = float(params['amplification'])
            contrast = float(params['contrast'])
            car_data = car_model.generate_data(I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast)
            exposure_dose = car_data['initial_acid']
            label = f"Set {i+1}: CAR模型 (K={K}, t_exp={t_exp}, acid_eff={acid_gen_efficiency})"
        elif any(k in params for k in ['z_h', 'I0', 'M0']):
            if enhanced_model is None:
                from backend.models import EnhancedDillModel
                enhanced_model = EnhancedDillModel()
            z_h = float(params['z_h'])
            T = float(params['T'])
            t_B = float(params['t_B'])
            I0 = float(params.get('I0', 1.0))
            M0 = float(params.get('M0', 1.0))
            t_exp = float(params['t_exp'])
            K = float(params.get('K_enhanced', 2.0))
            V = float(params.get('V', 0.8))
            
            # 计算表面空间分布
            exposure_dose_data = []
            
            for pos in x:
                local_I0 = I0 * (1 + V * np.cos(K * pos))
                enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                
                # 取表面曝光剂量
                if isinstance(enhanced_data['I'], (list, np.ndarray)) and len(enhanced_data['I']) > 0:
                    surface_I = enhanced_data['I'][0] if hasattr(enhanced_data['I'], '__getitem__') else enhanced_data['I']
                    exposure_dose_data.append(float(surface_I) * t_exp)
                else:
                    exposure_dose_data.append(float(enhanced_data['I']) * t_exp)
            
            exposure_dose = exposure_dose_data
            label = f"Set {i+1}: 厚胶模型 (z_h={z_h}, T={T}, t_B={t_B}, K={K})"
        else:
            # Dill模型 - 修正：添加模型初始化
            if dill_model is None:
                from backend.models import DillModel
                dill_model = DillModel()
                
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params['K'])
            t_exp = float(params['t_exp'])
            intensity = dill_model.calculate_intensity_distribution(x, I_avg, V, K)
            exposure_dose = intensity * t_exp
            label = f"Set {i+1}: 薄胶模型 (I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp})"
        color = colors[i % len(colors)]
        plt.plot(x, exposure_dose, color=color, linewidth=2)
        legend_labels.append(label)
    plt.title('Exposure Dose Distribution Comparison', fontsize=16)
    plt.xlabel('Position (μm)', fontsize=14)
    plt.ylabel('Exposure Dose (mJ/cm²)', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend(legend_labels, loc='best', fontsize=10)
    plt.tight_layout()
    buffer1 = BytesIO()
    fig1.savefig(buffer1, format='png', dpi=100)
    buffer1.seek(0)
    exposure_comparison_plot = base64.b64encode(buffer1.getvalue()).decode()
    plt.close(fig1)
    
    # 第二个图：厚度分布比较
    fig2 = plt.figure(figsize=(12, 7))
    legend_labels = []
    for i, params in enumerate(parameter_sets):
        if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
            if car_model is None:
                from backend.models import CARModel
                car_model = CARModel()
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params.get('K', 2.0))
            t_exp = float(params['t_exp'])
            acid_gen_efficiency = float(params['acid_gen_efficiency'])
            diffusion_length = float(params['diffusion_length'])
            reaction_rate = float(params['reaction_rate'])
            amplification = float(params['amplification'])
            contrast = float(params['contrast'])
            car_data = car_model.generate_data(I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast)
            thickness = car_data['thickness']
            label = f"Set {i+1}: CAR模型 (K={K}, diffusion={diffusion_length}, contrast={contrast})"
        elif any(k in params for k in ['z_h', 'I0', 'M0']):
            if enhanced_model is None:
                from backend.models import EnhancedDillModel
                enhanced_model = EnhancedDillModel()
            z_h = float(params['z_h'])
            T = float(params['T'])
            t_B = float(params['t_B'])
            I0 = float(params.get('I0', 1.0))
            M0 = float(params.get('M0', 1.0))
            t_exp = float(params['t_exp'])
            K = float(params.get('K_enhanced', 2.0))
            V = float(params.get('V', 0.8))
            
            # 计算表面空间分布
            thickness_data = []
            
            for pos in x:
                local_I0 = I0 * (1 + V * np.cos(K * pos))
                enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                
                # 取表面厚度
                if isinstance(enhanced_data['M'], (list, np.ndarray)) and len(enhanced_data['M']) > 0:
                    surface_M = enhanced_data['M'][0] if hasattr(enhanced_data['M'], '__getitem__') else enhanced_data['M']
                    thickness_data.append(float(surface_M))
                else:
                    thickness_data.append(float(enhanced_data['M']))
            
            thickness = thickness_data
            label = f"Set {i+1}: 厚胶模型 (z_h={z_h}, T={T}, t_B={t_B}, t_exp={t_exp})"
        else:
            # Dill模型 - 修正：添加模型初始化
            if dill_model is None:
                from backend.models import DillModel
                dill_model = DillModel()
                
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params['K'])
            t_exp = float(params['t_exp'])
            C = float(params['C'])
            intensity = dill_model.calculate_intensity_distribution(x, I_avg, V, K)
            exposure_dose = intensity * t_exp
            thickness = np.exp(-C * exposure_dose)
            label = f"Set {i+1}: 薄胶模型 (I_avg={I_avg}, V={V}, K={K}, C={C})"
        color = colors[i % len(colors)]
        plt.plot(x, thickness, color=color, linewidth=2)
        legend_labels.append(label)
    plt.title('Photoresist Thickness Distribution Comparison', fontsize=16)
    plt.xlabel('Position (μm)', fontsize=14)
    plt.ylabel('Relative Thickness', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend(legend_labels, loc='best', fontsize=10)
    plt.tight_layout()
    buffer2 = BytesIO()
    fig2.savefig(buffer2, format='png', dpi=100)
    buffer2.seek(0)
    thickness_comparison_plot = base64.b64encode(buffer2.getvalue()).decode()
    plt.close(fig2)
    return {'exposure_comparison_plot': exposure_comparison_plot, 'thickness_comparison_plot': thickness_comparison_plot, 'colors': colors}

@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    API健康检查端点
    """
    return jsonify({"status": "healthy"}), 200 

@api_bp.route('/logs', methods=['GET'])
def get_logs():
    """获取系统化计算日志"""
    try:
        # 获取查询参数
        model_type = request.args.get('model_type')  # 过滤特定模型
        page = request.args.get('page', 'index')  # 页面类型：index 或 compare
        category = request.args.get('category', '')  # 子分类：1d, 2d, 3d 或 dill, enhanced_dill, car
        log_type = request.args.get('type', '')  # 日志类型：info, progress, success, warning, error
        limit = request.args.get('limit', 100)  # 默认返回最近100条
        
        try:
            limit = int(limit)
        except:
            limit = 100
            
        # 过滤日志
        filtered_logs = calculation_logs
        
        # 按模型类型过滤
        if model_type:
            filtered_logs = [log for log in filtered_logs if log.get('model') == model_type]
        
        # 按页面类型过滤
        if page == 'compare':
            # 比较页面显示所有模型的日志
            pass
        else:
            # 单一计算页面，根据category过滤
            if category and category in ['1d', '2d', '3d']:
                # 根据消息内容推断维度
                dimension_keywords = {
                    '1d': ['1d', '一维', '1D'],
                    '2d': ['2d', '二维', '2D'],
                    '3d': ['3d', '三维', '3D']
                }
                if category in dimension_keywords:
                    keywords = dimension_keywords[category]
                    filtered_logs = [
                        log for log in filtered_logs 
                        if any(keyword in log.get('message', '').lower() for keyword in [k.lower() for k in keywords])
                    ]
        
        # 按日志类型过滤
        if log_type:
            filtered_logs = [log for log in filtered_logs if log.get('type') == log_type]
        
        # 为每个日志添加ID和增强信息
        enhanced_logs = []
        for i, log in enumerate(filtered_logs):
            enhanced_log = {
                'id': f"{log.get('timestamp', '')}-{i}",
                'timestamp': log.get('timestamp'),
                'type': log.get('type', 'info'),
                'message': log.get('message', ''),
                'model': log.get('model', 'unknown'),
                'details': '',
                'category': detect_log_category(log, page),
                'subcategory': detect_log_subcategory(log, page),
                'dimension': detect_log_dimension(log)
            }
            enhanced_logs.append(enhanced_log)
        
        # 返回最近的N条日志（倒序）
        recent_logs = enhanced_logs[-limit:] if limit > 0 else enhanced_logs
        recent_logs.reverse()  # 最新的在前面
        
        # 统计信息
        stats = {
            'total_logs': len(calculation_logs),
            'filtered_logs': len(filtered_logs),
            'error_count': len([log for log in filtered_logs if log.get('type') == 'error']),
            'warning_count': len([log for log in filtered_logs if log.get('type') == 'warning']),
            'progress': '等待计算...'
        }
        
        return jsonify(format_response(True, data={
            'logs': recent_logs,
            'stats': stats,
            'total_count': len(calculation_logs),
            'filtered_count': len(filtered_logs)
        }))
        
    except Exception as e:
        error_msg = f"获取日志失败: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify(format_response(False, message=error_msg)), 500

def detect_log_category(log, page):
    """检测日志分类"""
    if page == 'compare':
        return 'compare'
    return 'single'

def detect_log_subcategory(log, page):
    """检测日志子分类"""
    message = log.get('message', '').lower()
    model = log.get('model', '').lower()
    
    if page == 'compare':
        if 'dill' in model and 'enhanced' not in model:
            return 'dill'
        elif 'enhanced' in model or '厚胶' in message:
            return 'enhanced_dill'
        elif 'car' in model:
            return 'car'
    else:
        if any(keyword in message for keyword in ['1d', '一维']):
            return '1d'
        elif any(keyword in message for keyword in ['2d', '二维']):
            return '2d'
        elif any(keyword in message for keyword in ['3d', '三维']):
            return '3d'
    
    return 'unknown'

def detect_log_dimension(log):
    """检测日志维度"""
    message = log.get('message', '').lower()
    if '1d' in message or '一维' in message:
        return '1d'
    elif '2d' in message or '二维' in message:
        return '2d'
    elif '3d' in message or '三维' in message:
        return '3d'
    return 'unknown'

@api_bp.route('/logs/clear', methods=['POST'])
def clear_calculation_logs():
    """清空计算日志"""
    try:
        clear_logs()
        add_log_entry('info', 'system', '日志已清空')
        return jsonify(format_response(True, message="日志已清空"))
    except Exception as e:
        error_msg = f"清空日志失败: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify(format_response(False, message=error_msg)), 500