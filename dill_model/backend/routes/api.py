from flask import Blueprint, request, jsonify
from ..models import DillModel
from ..utils import validate_input, format_response, NumpyEncoder
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64

# 创建API蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 实例化Dill模型
dill_model = DillModel()

@api_bp.route('/calculate', methods=['POST'])
def calculate():
    """
    计算Dill模型并返回图像
    
    接收参数:
        I_avg: 平均入射光强度
        V: 干涉条纹的可见度
        K: 干涉条纹的空间频率
        t_exp: 总曝光时间
        C: 光刻胶光敏速率常数
        
    返回:
        JSON格式的响应，包含两个Base64编码的图像
    """
    try:
        # 获取JSON数据
        data = request.get_json()
        
        # 验证输入
        is_valid, message = validate_input(data)
        if not is_valid:
            return jsonify(format_response(False, message=message)), 400
        
        # 提取参数
        I_avg = float(data['I_avg'])
        V = float(data['V'])
        K = float(data['K'])
        t_exp = float(data['t_exp'])
        C = float(data['C'])
        
        # 计算结果并生成图像
        plots = dill_model.generate_plots(I_avg, V, K, t_exp, C)
        
        # 返回结果
        return jsonify(format_response(True, data=plots)), 200
    
    except Exception as e:
        return jsonify(format_response(False, message=f"计算错误: {str(e)}")), 500

@api_bp.route('/calculate_data', methods=['POST'])
def calculate_data():
    """
    计算Dill模型并返回原始数据（用于交互式图表）
    
    接收参数:
        I_avg: 平均入射光强度
        V: 干涉条纹的可见度
        K: 干涉条纹的空间频率
        t_exp: 总曝光时间
        C: 光刻胶光敏速率常数
        
    返回:
        JSON格式的响应，包含原始计算数据
    """
    try:
        # 获取JSON数据
        data = request.get_json()
        
        # 验证输入
        is_valid, message = validate_input(data)
        if not is_valid:
            return jsonify(format_response(False, message=message)), 400
        
        # 提取参数
        I_avg = float(data['I_avg'])
        V = float(data['V'])
        K = float(data['K'])
        t_exp = float(data['t_exp'])
        C = float(data['C'])
        
        # 计算结果并返回数据
        plot_data = dill_model.generate_data(I_avg, V, K, t_exp, C)
        
        # 返回结果
        return jsonify(format_response(True, data=plot_data)), 200
    
    except Exception as e:
        return jsonify(format_response(False, message=f"数据计算错误: {str(e)}")), 500

@api_bp.route('/compare', methods=['POST'])
def compare():
    """
    比较多组参数的计算结果
    
    接收参数:
        parameter_sets: 包含多组参数的数组，每组参数都有I_avg, V, K, t_exp和C
        
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
            is_valid, message = validate_input(params)
            if not is_valid:
                return jsonify(format_response(False, message=f"参数组 {i+1}: {message}")), 400
        
        # 生成比较图像
        comparison_plots = generate_comparison_plots(parameter_sets)
        
        # 返回结果
        return jsonify(format_response(True, data=comparison_plots)), 200
    
    except Exception as e:
        return jsonify(format_response(False, message=f"比较计算错误: {str(e)}")), 500

@api_bp.route('/compare_data', methods=['POST'])
def compare_data():
    """
    比较多组参数的计算结果，返回原始数据（用于交互式图表）
    
    接收参数:
        parameter_sets: 包含多组参数的数组，每组参数都有I_avg, V, K, t_exp, C和可选的customName
        
    返回:
        JSON格式的响应，包含所有参数组的原始计算数据
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
            # 移除自定义名称，避免验证错误
            params_to_validate = params.copy()
            if 'customName' in params_to_validate:
                params_to_validate.pop('customName')
            if 'setId' in params_to_validate:
                params_to_validate.pop('setId')
                
            is_valid, message = validate_input(params_to_validate)
            if not is_valid:
                return jsonify(format_response(False, message=f"参数组 {i+1}: {message}")), 400
        
        # 共享的x坐标
        x = np.linspace(0, 10, 1000).tolist()
        
        # 存储每组参数的计算结果
        exposure_doses = []
        thicknesses = []
        
        # 计算每组参数的结果
        for i, params in enumerate(parameter_sets):
            # 提取参数
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params['K'])
            t_exp = float(params['t_exp'])
            C = float(params['C'])
            set_id = params.get('setId', i + 1)
            
            # 计算结果
            exposure_dose = dill_model.calculate_exposure_dose(np.array(x), I_avg, V, K, t_exp).tolist()
            thickness = dill_model.calculate_photoresist_thickness(np.array(x), I_avg, V, K, t_exp, C).tolist()
            
            # 添加到结果集
            exposure_doses.append({
                'setId': set_id,
                'params': params,
                'data': exposure_dose
            })
            
            thicknesses.append({
                'setId': set_id,
                'params': params,
                'data': thickness
            })
        
        # 返回结果
        comparison_data = {
            'x': x,
            'exposure_doses': exposure_doses,
            'thicknesses': thicknesses
        }
        
        return jsonify(format_response(True, data=comparison_data)), 200
    
    except Exception as e:
        return jsonify(format_response(False, message=f"比较数据计算错误: {str(e)}")), 500

def generate_comparison_plots(parameter_sets):
    """
    生成多组参数比较的图像
    
    参数:
        parameter_sets: 多组参数列表
        
    返回:
        包含比较图像的字典
    """
    # 创建坐标
    x = np.linspace(0, 10, 1000)  # 0到10微米，1000个点
    
    # 创建图表
    # 曝光剂量对比图
    fig1 = plt.figure(figsize=(12, 7))
    
    # 颜色列表
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    
    # 存储每组参数的标签（用于图例）
    legend_labels = []
    
    # 计算并绘制每组参数的曝光剂量
    for i, params in enumerate(parameter_sets):
        # 提取参数
        I_avg = float(params['I_avg'])
        V = float(params['V'])
        K = float(params['K'])
        t_exp = float(params['t_exp'])
        
        # 计算曝光剂量
        intensity = dill_model.calculate_intensity_distribution(x, I_avg, V, K)
        exposure_dose = intensity * t_exp
        
        # 绘制曝光剂量曲线
        color = colors[i % len(colors)]
        plt.plot(x, exposure_dose, color=color, linewidth=2)
        
        # 添加图例标签
        legend_labels.append(f"Set {i+1}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}")
    
    # 设置图表标题和标签
    plt.title('Exposure Dose Distribution Comparison', fontsize=16)
    plt.xlabel('Position (μm)', fontsize=14)
    plt.ylabel('Exposure Dose (mJ/cm²)', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend(legend_labels, loc='best', fontsize=10)
    plt.tight_layout()
    
    # 将曝光剂量图形转换为Base64
    buffer1 = BytesIO()
    fig1.savefig(buffer1, format='png', dpi=100)
    buffer1.seek(0)
    exposure_comparison_plot = base64.b64encode(buffer1.getvalue()).decode()
    plt.close(fig1)
    
    # 光刻胶厚度对比图
    fig2 = plt.figure(figsize=(12, 7))
    
    # 重置图例标签
    legend_labels = []
    
    # 计算并绘制每组参数的光刻胶厚度
    for i, params in enumerate(parameter_sets):
        # 提取参数
        I_avg = float(params['I_avg'])
        V = float(params['V'])
        K = float(params['K'])
        t_exp = float(params['t_exp'])
        C = float(params['C'])
        
        # 计算曝光剂量
        intensity = dill_model.calculate_intensity_distribution(x, I_avg, V, K)
        exposure_dose = intensity * t_exp
        
        # 计算光刻胶厚度
        thickness = np.exp(-C * exposure_dose)
        
        # 绘制光刻胶厚度曲线
        color = colors[i % len(colors)]
        plt.plot(x, thickness, color=color, linewidth=2)
        
        # 添加图例标签
        legend_labels.append(f"Set {i+1}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
    
    # 设置图表标题和标签
    plt.title('Photoresist Thickness Distribution Comparison', fontsize=16)
    plt.xlabel('Position (μm)', fontsize=14)
    plt.ylabel('Relative Thickness', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend(legend_labels, loc='best', fontsize=10)
    plt.tight_layout()
    
    # 将光刻胶厚度图形转换为Base64
    buffer2 = BytesIO()
    fig2.savefig(buffer2, format='png', dpi=100)
    buffer2.seek(0)
    thickness_comparison_plot = base64.b64encode(buffer2.getvalue()).decode()
    plt.close(fig2)
    
    # 返回包含两个比较图的字典以及颜色信息
    return {
        'exposure_comparison_plot': exposure_comparison_plot,
        'thickness_comparison_plot': thickness_comparison_plot,
        'colors': colors[:len(parameter_sets)]
    }

@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    API健康检查端点
    """
    return jsonify({"status": "healthy"}), 200 