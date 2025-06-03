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
        for field in ['Kx', 'Ky', 'phi_expr']:
            if field not in data or data[field] in [None, '']:
                missing_fields.append(field)
    elif sine_type == '3d':
        for field in ['Kx', 'Ky', 'Kz', 'phi_expr']:
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
        elif sine_type == '3d':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
            data['Kz'] = float(data['Kz'])
        else:
            data['K'] = float(data['K'])
    except ValueError:
        return False, "所有参数必须是数值类型（phi_expr除外）"
    # 智能范围校验
    if not (0 < data['I_avg'] <= 10000):
        return False, "平均入射光强度必须为正且不超过10000 mW/cm²"
    if not (0 <= data['V'] <= 1):
        return False, "可见度必须在0到1之间"
    if sine_type == 'multi':
        if not (0 < data['Kx'] <= 100):
            return False, "Kx必须为正且不超过100"
        if not (0 < data['Ky'] <= 100):
            return False, "Ky必须为正且不超过100"
    elif sine_type == '3d':
        if not (0 < data['Kx'] <= 100):
            return False, "Kx必须为正且不超过100"
        if not (0 < data['Ky'] <= 100):
            return False, "Ky必须为正且不超过100"
        if not (0 < data['Kz'] <= 100):
            return False, "Kz必须为正且不超过100"
    else:
        if not (0 < data['K'] <= 100):
            return False, "空间频率K必须为正且不超过100"
    if not (0 < data['t_exp'] <= 10000):
        return False, "曝光时间必须为正且不超过10000秒"
    if not (0 < data['C'] <= 100):
        return False, "常数C必须为正且不超过100"
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
    elif sine_type == '3d':
        for field in ['Kx', 'Ky', 'Kz', 'phi_expr']:
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
        elif sine_type == '3d':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
            data['Kz'] = float(data['Kz'])
        else:
            data['K'] = float(data['K'])
    except ValueError:
        return False, "所有参数必须是数值类型（phi_expr除外）"
    # 智能范围校验
    if not (0 < data['z_h'] <= 1000):
        return False, "胶厚必须为正且不超过1000微米"
    if not (0 <= data['T'] <= 300):
        return False, "前烘温度应在0-300℃之间"
    if not (0 < data['t_B'] <= 10000):
        return False, "前烘时间必须为正且不超过10000秒"
    if not (0 < data['I0'] <= 10000):
        return False, "初始光强必须为正且不超过10000 mW/cm²"
    if not (0 < data['M0'] <= 1.0):
        return False, "初始PAC浓度应在0-1之间"
    if not (0 < data['t_exp'] <= 10000):
        return False, "曝光时间必须为正且不超过10000秒"
    if sine_type == 'multi':
        if not (0 < data['Kx'] <= 100):
            return False, "Kx必须为正且不超过100"
        if not (0 < data['Ky'] <= 100):
            return False, "Ky必须为正且不超过100"
    elif sine_type == '3d':
        if not (0 < data['Kx'] <= 100):
            return False, "Kx必须为正且不超过100"
        if not (0 < data['Ky'] <= 100):
            return False, "Ky必须为正且不超过100"
        if not (0 < data['Kz'] <= 100):
            return False, "Kz必须为正且不超过100"
    else:
        if not (0 < data['K'] <= 100):
            return False, "空间频率K必须为正且不超过100"
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
    elif sine_type == '3d':
        for field in ['Kx', 'Ky', 'Kz', 'phi_expr']:
            if field not in data or data[field] in [None, '']:
                missing_fields.append(field)
    else:
        # 对于1D情况，如果没有K参数，路由处理函数将提供默认值
        if 'K' in data and data['K'] in [None, '']:
            # 如果K存在但为空，仍然报错
            missing_fields.append('K')
    if missing_fields:
        return False, f"缺少必要参数: {', '.join(missing_fields)}"
    try:
        for field in required_fields:
            data[field] = float(data[field])
        if sine_type == 'multi':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
        elif sine_type == '3d':
            data['Kx'] = float(data['Kx'])
            data['Ky'] = float(data['Ky'])
            data['Kz'] = float(data['Kz'])
        elif 'K' in data:  # 只有在K存在时才尝试转换
            data['K'] = float(data['K'])
    except ValueError:
        return False, "所有参数必须是数值类型（phi_expr除外）"
    # 智能范围校验
    if not (0 < data['I_avg'] <= 10000):
        return False, "平均入射光强度必须为正且不超过10000 mW/cm²"
    if not (0 <= data['V'] <= 1):
        return False, "可见度必须在0到1之间"
    if sine_type == 'multi':
        if not (0 < data['Kx'] <= 100):
            return False, "Kx必须为正且不超过100"
        if not (0 < data['Ky'] <= 100):
            return False, "Ky必须为正且不超过100"
    elif sine_type == '3d':
        if not (0 < data['Kx'] <= 100):
            return False, "Kx必须为正且不超过100"
        if not (0 < data['Ky'] <= 100):
            return False, "Ky必须为正且不超过100"
        if not (0 < data['Kz'] <= 100):
            return False, "Kz必须为正且不超过100"
    elif 'K' in data:  # 只有在K存在时才检查
        if not (0 < data['K'] <= 100):
            return False, "空间频率K必须为正且不超过100"
    if not (0 < data['t_exp'] <= 10000):
        return False, "曝光时间必须为正且不超过10000秒"
    if not (0 < data['acid_gen_efficiency'] <= 100):
        return False, "光酸产生效率必须为正且不超过100"
    if not (0 <= data['diffusion_length'] <= 100):
        return False, "扩散长度必须在0-100之间"
    if not (0 < data['reaction_rate'] <= 100):
        return False, "反应速率常数必须为正且不超过100"
    if not (1 < data['amplification'] <= 1000):
        return False, "放大因子必须大于1且不超过1000"
    if not (0 < data['contrast'] <= 100):
        return False, "对比度必须为正且不超过100"
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
    # 优化：如果message是dict，自动转为字符串
    if isinstance(message, dict):
        message = json.dumps(message, ensure_ascii=False)
    return {
        'success': success,
        'data': data,
        'message': message
    }

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