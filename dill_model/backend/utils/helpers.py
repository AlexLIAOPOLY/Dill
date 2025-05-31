import json
import numpy as np

def validate_input(data):
    """
    验证输入参数（Dill模型）
    支持一维/多维正弦波类型的分支校验
    """
    sine_type = data.get('sine_type', 'single')
    required_fields = ['I_avg', 'V', 't_exp', 'C']
    missing_fields = [field for field in required_fields if field not in data]
    if sine_type == 'multi':
        # 多维正弦波，必须有Kx、Ky、phi_expr
        for field in ['Kx', 'Ky', 'phi_expr']:
            if field not in data or data[field] in [None, '']:
                missing_fields.append(field)
    else:
        # 一维正弦波，必须有K
        if 'K' not in data or data['K'] in [None, '']:
            missing_fields.append('K')
    if missing_fields:
        return False, f"缺少必要参数: {', '.join(missing_fields)}"
    # 检查参数类型
    try:
        for field in required_fields:
            data[field] = float(data[field])
        if sine_type == 'multi':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
            # phi_expr 不强制转float
        else:
            data['K'] = float(data['K'])
    except ValueError:
        return False, "所有参数必须是数值类型（phi_expr除外）"
    # 参数范围验证
    if data['I_avg'] <= 0:
        return False, "平均入射光强度必须为正数"
    if data['V'] < 0 or data['V'] > 1:
        return False, "可见度必须在0到1之间"
    if sine_type == 'multi':
        if data['Kx'] <= 0 or data['Ky'] <= 0:
            return False, "Kx、Ky必须为正数"
    else:
        if data['K'] <= 0:
            return False, "空间频率K必须为正数"
    if data['t_exp'] <= 0:
        return False, "曝光时间必须为正数"
    if data['C'] <= 0:
        return False, "常数C必须为正数"
    return True, ""

def validate_enhanced_input(data):
    """
    验证增强Dill模型输入参数，支持正弦波类型分支校验
    """
    sine_type = data.get('sine_type', 'single')
    required_fields = ['z_h', 'T', 't_B', 'I0', 'M0', 't_exp']
    missing_fields = [field for field in required_fields if field not in data]
    if sine_type == 'multi':
        for field in ['Kx', 'Ky', 'phi_expr']:
            if field not in data or data[field] in [None, '']:
                missing_fields.append(field)
    else:
        if 'K' not in data or data['K'] in [None, '']:
            missing_fields.append('K')
    if missing_fields:
        return False, f"缺少必要参数: {', '.join(missing_fields)}"
    try:
        for field in required_fields:
            data[field] = float(data[field])
        if sine_type == 'multi':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
        else:
            data['K'] = float(data['K'])
    except ValueError:
        return False, "所有参数必须是数值类型（phi_expr除外）"
    if data['z_h'] <= 0:
        return False, "胶厚必须为正数"
    if data['T'] < 0 or data['T'] > 200:
        return False, "前烘温度应在0-200℃之间"
    if data['t_B'] <= 0:
        return False, "前烘时间必须为正数"
    if data['I0'] <= 0:
        return False, "初始光强必须为正数"
    if data['M0'] <= 0 or data['M0'] > 1.0:
        return False, "初始PAC浓度应在0-1之间"
    if data['t_exp'] <= 0:
        return False, "曝光时间必须为正数"
    if sine_type == 'multi':
        if data['Kx'] <= 0 or data['Ky'] <= 0:
            return False, "Kx、Ky必须为正数"
    else:
        if data['K'] <= 0:
            return False, "空间频率K必须为正数"
    return True, ""

def validate_car_input(data):
    """
    验证CAR模型输入参数，支持正弦波类型分支校验
    """
    sine_type = data.get('sine_type', 'single')
    required_fields = ['I_avg', 'V', 't_exp', 'acid_gen_efficiency', 'diffusion_length', 'reaction_rate', 'amplification', 'contrast']
    missing_fields = [field for field in required_fields if field not in data]
    if sine_type == 'multi':
        for field in ['Kx', 'Ky', 'phi_expr']:
            if field not in data or data[field] in [None, '']:
                missing_fields.append(field)
    else:
        if 'K' not in data or data['K'] in [None, '']:
            missing_fields.append('K')
    if missing_fields:
        return False, f"缺少必要参数: {', '.join(missing_fields)}"
    try:
        for field in required_fields:
            data[field] = float(data[field])
        if sine_type == 'multi':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
        else:
            data['K'] = float(data['K'])
    except ValueError:
        return False, "所有参数必须是数值类型（phi_expr除外）"
    if data['I_avg'] <= 0:
        return False, "平均入射光强度必须为正数"
    if data['V'] < 0 or data['V'] > 1:
        return False, "可见度必须在0到1之间"
    if sine_type == 'multi':
        if data['Kx'] <= 0 or data['Ky'] <= 0:
            return False, "Kx、Ky必须为正数"
    else:
        if data['K'] <= 0:
            return False, "空间频率K必须为正数"
    if data['t_exp'] <= 0:
        return False, "曝光时间必须为正数"
    if data['acid_gen_efficiency'] <= 0:
        return False, "光酸产生效率必须为正数"
    if data['diffusion_length'] < 0:
        return False, "扩散长度不能为负数"
    if data['reaction_rate'] <= 0:
        return False, "反应速率常数必须为正数"
    if data['amplification'] <= 1:
        return False, "放大因子必须大于1"
    if data['contrast'] <= 0:
        return False, "对比度必须为正数"
    return True, ""

def format_response(success, data=None, message=""):
    """
    格式化API响应
    
    参数:
        success: 是否成功
        data: 响应数据（可选）
        message: 响应消息（可选）
        
    返回:
        格式化的JSON响应
    """
    response = {
        "success": success,
        "message": message
    }
    
    if data:
        response["data"] = data
    
    return response

class NumpyEncoder(json.JSONEncoder):
    """处理NumPy数据类型的JSON编码器"""
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
            return float(obj)
        if isinstance(obj, (np.int_, np.int8, np.int16, np.int32, np.int64)):
            return int(obj)
        return json.JSONEncoder.default(self, obj) 