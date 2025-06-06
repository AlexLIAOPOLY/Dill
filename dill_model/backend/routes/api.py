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
            is_valid, message = validate_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                return jsonify(format_response(False, message=message)), 400
            # 提取参数
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            C = float(data['C'])
            sine_type = data.get('sine_type', '1d')
            
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
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
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
                plots = model.generate_plots(I_avg, V, K, t_exp, C, sine_type=sine_type)
        elif model_type == 'enhanced_dill':
            is_valid, message = validate_enhanced_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
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
    try:
        data = request.get_json()
        print('收到前端参数:', data)  # 调试用
        model_type = data.get('model_type', 'dill')
        model = get_model_by_name(model_type)
        
        plot_data = None # Initialize plot_data

        # 根据模型类型验证参数
        if model_type == 'dill':
            is_valid, message = validate_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                return jsonify(format_response(False, message=message)), 400
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            C = float(data['C'])
            sine_type = data.get('sine_type', '1d')
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                if y_min >= y_max:
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_data(I_avg, V, None, t_exp, C, sine_type=sine_type, 
                                             Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
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
                
                # 打印详细参数用于调试
                print(f"计算3D薄胶模型，参数：Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr={phi_expr}")
                print(f"范围参数：x_min={x_min}, x_max={x_max}, y_min={y_min}, y_max={y_max}, z_min={z_min}, z_max={z_max}")
                
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                # 打印生成的范围信息
                print(f"生成的范围：y_range长度={len(y_range) if y_range else 0}, z_range长度={len(z_range) if z_range else 0}")
                
                try:
                    plot_data = model.generate_data(I_avg, V, None, t_exp, C, sine_type=sine_type,
                                                 Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                                 y_range=y_range, z_range=z_range)
                    # 打印返回数据的结构
                    print(f"返回数据字段：{list(plot_data.keys())}")
                    if 'exposure_dose' in plot_data:
                        if isinstance(plot_data['exposure_dose'], list):
                            print(f"exposure_dose是列表，长度={len(plot_data['exposure_dose'])}")
                            if len(plot_data['exposure_dose']) > 0 and isinstance(plot_data['exposure_dose'][0], list):
                                print(f"exposure_dose是二维列表，形状=[{len(plot_data['exposure_dose'])}, {len(plot_data['exposure_dose'][0]) if len(plot_data['exposure_dose']) > 0 else 0}]")
                            else:
                                print(f"exposure_dose是一维列表")
                except Exception as e:
                    print(f"生成3D数据时出错：{str(e)}")
                    # 记录错误堆栈以便调试
                    traceback.print_exc()
                    raise
            else: # 1D Dill
                K = float(data['K'])
                plot_data = model.generate_data(I_avg, V, K, t_exp, C, sine_type=sine_type)
        
        elif model_type == 'enhanced_dill':
            is_valid, message = validate_enhanced_input(data)
            if not is_valid: return jsonify(format_response(False, message=message)), 400
            z_h, T, t_B, I0, M0, t_exp_enh = float(data['z_h']), float(data['T']), float(data['t_B']), float(data.get('I0', 1.0)), float(data.get('M0', 1.0)), float(data['t_exp'])
            sine_type = data.get('sine_type', '1d')
            if sine_type == 'multi':
                Kx, Ky, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), data.get('phi_expr','0')
                # 新增：处理y_range参数用于生成2D数据
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                if y_min >= y_max:
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_data(z_h, T, t_B, I0, M0, t_exp_enh, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
            elif sine_type == '3d':
                Kx, Ky, Kz, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), float(data.get('Kz',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                plot_data = model.generate_data(z_h, T, t_B, I0, M0, t_exp_enh, sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, y_range=y_range, z_range=z_range)
            else: # 1D Enhanced Dill
                # 获取1D模式的空间频率K和干涉条纹可见度V参数
                K = float(data.get('K', 2.0))
                V = float(data.get('V', 0.8))
                # 确保传递K和V参数
                plot_data = model.generate_data(z_h, T, t_B, I0, M0, t_exp_enh, sine_type=sine_type, K=K, V=V)

        elif model_type == 'car':
            is_valid, message = validate_car_input(data)
            if not is_valid: return jsonify(format_response(False, message=message)), 400
            I_avg, V_car, t_exp_car = float(data['I_avg']), float(data['V']), float(data['t_exp'])
            acid_gen_eff, diff_len, react_rate, amp, contr = float(data['acid_gen_efficiency']), float(data['diffusion_length']), float(data['reaction_rate']), float(data['amplification']), float(data['contrast'])
            sine_type = data.get('sine_type', '1d')
            if sine_type == 'multi':
                Kx, Ky, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), data.get('phi_expr','0')
                # 为CAR模型添加y_range参数处理
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                if y_min >= y_max:
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_data(I_avg, V_car, None, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
            elif sine_type == '3d':
                Kx, Ky, Kz, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), float(data.get('Kz',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                plot_data = model.generate_data(I_avg, V_car, None, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, y_range=y_range, z_range=z_range)
                
                # 对CAR模型3D数据进行详细诊断
                print(f"CAR 3D数据生成完成，返回数据字段: {list(plot_data.keys() if plot_data else [])}")
                if plot_data and 'initial_acid' in plot_data and isinstance(plot_data['initial_acid'], list):
                    print(f"CAR 3D initial_acid 数组形状: [{len(plot_data['initial_acid'])}, {len(plot_data['initial_acid'][0]) if plot_data['initial_acid'] and len(plot_data['initial_acid']) > 0 else 0}]")
                if plot_data and 'x_coords' in plot_data and 'y_coords' in plot_data:
                    print(f"CAR 3D 坐标维度: x={len(plot_data['x_coords'])}, y={len(plot_data['y_coords'])}")
            else: # 1D CAR
                K_car = float(data.get('K', 2.0))
                plot_data = model.generate_data(I_avg, V_car, K_car, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type)
        else:
            return jsonify(format_response(False, message="未知模型类型")), 400
        
        return jsonify(format_response(True, data=plot_data)), 200
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
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
        for i, params in enumerate(parameter_sets):
            set_id = params.get('setId', i + 1)
            if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
                from backend.models import CARModel
                car_model = CARModel()
                I_avg = float(params['I_avg'])
                V = float(params['V'])
                t_exp = float(params['t_exp'])
                acid_gen_efficiency = float(params['acid_gen_efficiency'])
                diffusion_length = float(params['diffusion_length'])
                reaction_rate = float(params['reaction_rate'])
                amplification = float(params['amplification'])
                contrast = float(params['contrast'])
                sine_type = params.get('sine_type', '1d')
                
                # 处理不同的正弦波类型
                if sine_type == 'multi':
                    Kx = float(params.get('Kx', 0))
                    Ky = float(params.get('Ky', 0))
                    phi_expr = params.get('phi_expr', '0')
                    car_data = car_model.generate_data(I_avg, V, None, t_exp, acid_gen_efficiency, 
                                                   diffusion_length, reaction_rate, amplification, contrast,
                                                   sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr)
                    exposure_dose = car_model.calculate_exposure_dose(np.array(x), I_avg, V, None, t_exp, 
                                                                  sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr).tolist()
                elif sine_type == '3d':
                    # 处理三维正弦波参数
                    Kx = float(params.get('Kx', 0))
                    Ky = float(params.get('Ky', 0))
                    Kz = float(params.get('Kz', 0))
                    phi_expr = params.get('phi_expr', '0')
                    
                    # 获取三维范围参数
                    x_min = float(params.get('x_min', 0))
                    x_max = float(params.get('x_max', 10))
                    y_min = float(params.get('y_min', 0))
                    y_max = float(params.get('y_max', 10))
                    z_min = float(params.get('z_min', 0))
                    z_max = float(params.get('z_max', 10))
                    
                    # 打印详细参数用于调试
                    print(f"计算3D薄胶模型，参数：Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr={phi_expr}")
                    print(f"范围参数：x_min={x_min}, x_max={x_max}, y_min={y_min}, y_max={y_max}, z_min={z_min}, z_max={z_max}")
                    
                    y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                    z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                    
                    # 打印生成的范围信息
                    print(f"生成的范围：y_range长度={len(y_range) if y_range else 0}, z_range长度={len(z_range) if z_range else 0}")
                    
                    try:
                        car_data = car_model.generate_data(I_avg, V, None, t_exp, acid_gen_efficiency, 
                                                       diffusion_length, reaction_rate, amplification, contrast,
                                                       sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                                       y_range=y_range, z_range=z_range)
                        # 打印返回数据的结构
                        print(f"返回数据字段：{list(car_data.keys())}")
                        if 'exposure_dose' in car_data:
                            if isinstance(car_data['exposure_dose'], list):
                                print(f"exposure_dose是列表，长度={len(car_data['exposure_dose'])}")
                                if len(car_data['exposure_dose']) > 0 and isinstance(car_data['exposure_dose'][0], list):
                                    print(f"exposure_dose是二维列表，形状=[{len(car_data['exposure_dose'])}, {len(car_data['exposure_dose'][0]) if len(car_data['exposure_dose']) > 0 else 0}]")
                                else:
                                    print(f"exposure_dose是一维列表")
                    except Exception as e:
                        print(f"生成3D数据时出错：{str(e)}")
                        # 记录错误堆栈以便调试
                        traceback.print_exc()
                        raise
                else:
                    K = float(params.get('K', 2.0))
                    car_data = car_model.generate_data(I_avg, V, K, t_exp, acid_gen_efficiency, 
                                                   diffusion_length, reaction_rate, amplification, contrast, 
                                                   sine_type=sine_type)
                    exposure_dose = car_model.calculate_exposure_dose(np.array(x), I_avg, V, K, t_exp).tolist()
                    thickness = car_data['thickness']
            elif any(k in params for k in ['z_h', 'I0', 'M0']):
                from backend.models import EnhancedDillModel
                enhanced_model = EnhancedDillModel()
                z_h = float(params['z_h'])
                T = float(params['T'])
                t_B = float(params['t_B'])
                I0 = float(params.get('I0', 1.0))
                M0 = float(params.get('M0', 1.0))
                t_exp = float(params['t_exp'])
                K = float(params.get('K_enhanced', 2.0))  # 获取空间频率参数
                V = float(params.get('V', 0.8))  # 获取对比度参数，默认0.8
                
                # 考虑空间分布
                thickness_data = []
                exposure_dose_data = []
                
                # 对每个位置点计算相应的厚度和曝光剂量
                for pos in x:
                    # 计算该位置的入射光强度，考虑空间频率
                    local_I0 = I0 * (1 + V * np.cos(K * pos))
                    # 生成该位置的厚度数据
                    enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                    # 取深度平均值或表面值
                    thickness_data.append(enhanced_data['M'][0])
                    exposure_dose_data.append(enhanced_data['I'][0] * t_exp)
                
                exposure_dose = exposure_dose_data
                thickness = thickness_data
            else:
                I_avg = float(params['I_avg'])
                V = float(params['V'])
                K = float(params['K'])
                t_exp = float(params['t_exp'])
                C = float(params['C'])
                exposure_dose = dill_model.calculate_exposure_dose(np.array(x), I_avg, V, K, t_exp).tolist()
                thickness = dill_model.calculate_photoresist_thickness(np.array(x), I_avg, V, K, t_exp, C).tolist()
            exposure_doses.append({'setId': set_id, 'params': params, 'data': exposure_dose})
            thicknesses.append({'setId': set_id, 'params': params, 'data': thickness})
        comparison_data = {'x': x, 'exposure_doses': exposure_doses, 'thicknesses': thicknesses}
        return jsonify(format_response(True, data=comparison_data)), 200
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        return jsonify(format_response(False, message=f"比较数据计算错误: {str(e)}")), 500

def generate_comparison_plots_with_enhanced(parameter_sets):
    x = np.linspace(0, 10, 1000)
    fig1 = plt.figure(figsize=(12, 7))
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    legend_labels = []
    enhanced_model = None
    car_model = None
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
            K = float(params.get('K_enhanced', 2.0))  # 获取空间频率参数
            V = float(params.get('V', 0.8))  # 获取对比度参数，默认0.8
            
            # 考虑空间分布
            thickness_data = []
            exposure_dose_data = []
            
            # 对每个位置点计算相应的厚度和曝光剂量
            for pos in x:
                # 计算该位置的入射光强度，考虑空间频率
                local_I0 = I0 * (1 + V * np.cos(K * pos))
                # 生成该位置的厚度数据
                enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                # 取深度平均值或表面值
                thickness_data.append(enhanced_data['M'][0])
                exposure_dose_data.append(enhanced_data['I'][0] * t_exp)
            
            thickness = thickness_data
            label = f"Set {i+1}: 厚胶模型 (z_h={z_h}, T={T}, t_B={t_B}, K={K})"
        else:
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
            K = float(params.get('K_enhanced', 2.0))  # 获取空间频率参数
            V = float(params.get('V', 0.8))  # 获取对比度参数，默认0.8
            
            # 考虑空间分布
            thickness_data = []
            exposure_dose_data = []
            
            # 对每个位置点计算相应的厚度和曝光剂量
            for pos in x:
                # 计算该位置的入射光强度，考虑空间频率
                local_I0 = I0 * (1 + V * np.cos(K * pos))
                # 生成该位置的厚度数据
                enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                # 取深度平均值或表面值
                thickness_data.append(enhanced_data['M'][0])
                exposure_dose_data.append(enhanced_data['I'][0] * t_exp)
            
            exposure_dose = exposure_dose_data
            thickness = thickness_data
            label = f"Set {i+1}: 厚胶模型 (z_h={z_h}, T={T}, t_B={t_B}, t_exp={t_exp})"
        else:
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