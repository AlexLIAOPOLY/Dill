import json
import numpy as np

def validate_input(data):
    """
    验证输入参数
    
    参数:
        data: 包含输入参数的字典
        
    返回:
        (bool, str) 元组：(是否有效, 错误消息)
    """
    required_fields = ['I_avg', 'V', 'K', 't_exp', 'C']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return False, f"缺少必要参数: {', '.join(missing_fields)}"
    
    # 检查参数类型
    try:
        for field in required_fields:
            data[field] = float(data[field])
    except ValueError:
        return False, "所有参数必须是数值类型"
    
    # 参数范围验证
    if data['I_avg'] <= 0:
        return False, "平均入射光强度必须为正数"
    if data['V'] < 0 or data['V'] > 1:
        return False, "可见度必须在0到1之间"
    if data['K'] <= 0:
        return False, "空间频率必须为正数"
    if data['t_exp'] <= 0:
        return False, "曝光时间必须为正数"
    if data['C'] <= 0:
        return False, "常数C必须为正数"
    
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