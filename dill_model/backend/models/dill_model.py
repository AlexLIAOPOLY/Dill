import numpy as np
import matplotlib
# 设置Matplotlib后端为非交互式后端
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from .enhanced_dill_model import EnhancedDillModel
import math
import ast

def parse_phi_expr(phi_expr, t):
    """
    安全解析phi_expr表达式，t为时间，只允许sin/cos/pi/t等
    """
    allowed_names = {'sin': np.sin, 'cos': np.cos, 'pi': np.pi, 't': t}
    allowed_nodes = (
        ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Load,
        ast.Call, ast.Name, ast.Constant, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow,
        ast.USub, ast.UAdd, ast.Mod, ast.FloorDiv, ast.Tuple, ast.List
    )
    try:
        node = ast.parse(str(phi_expr), mode='eval')
        for n in ast.walk(node):
            if not isinstance(n, allowed_nodes):
                raise ValueError(f"不允许的表达式节点: {type(n).__name__}")
            if isinstance(n, ast.Name) and n.id not in allowed_names:
                raise ValueError(f"不允许的变量: {n.id}")
            if isinstance(n, ast.Call) and (
                not isinstance(n.func, ast.Name) or n.func.id not in allowed_names
            ):
                raise ValueError(f"不允许的函数: {getattr(n.func, 'id', None)}")
        code = compile(node, '<string>', 'eval')
        return eval(code, {"__builtins__": None}, allowed_names)
    except Exception:
        try:
            return float(phi_expr)
        except Exception:
            return 0.0

class DillModel:
    """
    Dill光刻胶模型计算类
    
    实现基于Dill模型的光刻胶曝光剂量分布和厚度分布计算
    """
    
    def __init__(self):
        pass
    
    def calculate_intensity_distribution(self, x, I_avg, V, K=None, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y=0, t=0):
        """
        计算光强分布，支持一维和多维正弦波
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示多维
            Kx: 多维正弦波的x方向空间频率
            Ky: 多维正弦波的y方向空间频率
            phi_expr: 相位表达式
            y: 多维正弦波的y坐标
            t: 时间
            
        返回:
            光强分布数组
        """
        if sine_type == 'multi' and Kx is not None:
            phi = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
            # y默认为0，若后续支持二维分布可扩展
            return I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
        else:
            return I_avg * (1 + V * np.cos(K * x))
    
    def calculate_exposure_dose(self, x, I_avg, V, K=None, t_exp=1, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y=0):
        """
        计算曝光剂量分布，支持一维和多维正弦波
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示多维
            Kx: 多维正弦波的x方向空间频率
            Ky: 多维正弦波的y方向空间频率
            phi_expr: 相位表达式
            y: 多维正弦波的y坐标
            
        返回:
            曝光剂量分布数组
        """
        # 只支持t=0时的phi_expr，后续可扩展为时变
        intensity = self.calculate_intensity_distribution(x, I_avg, V, K, sine_type, Kx, Ky, phi_expr, y, t=0)
        exposure_dose = intensity * t_exp
        return exposure_dose
    
    def calculate_photoresist_thickness(self, x, I_avg, V, K=None, t_exp=1, C=0.01, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y=0):
        """
        计算光刻胶厚度分布，支持一维和多维正弦波
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示多维
            Kx: 多维正弦波的x方向空间频率
            Ky: 多维正弦波的y方向空间频率
            phi_expr: 相位表达式
            y: 多维正弦波的y坐标
            
        返回:
            光刻胶厚度分布数组
        """
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type, Kx, Ky, phi_expr, y)
        # 简化的Dill模型计算光刻胶厚度
        # 实际中可能需要更复杂的模型，这里使用指数衰减模型
        thickness = np.exp(-C * exposure_dose)
        return thickness
    
    def generate_data(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y_range=None):
        x = np.linspace(0, 10, 1000)
        if y_range is not None and len(y_range) > 1:
            y = np.array(y_range)
            X, Y = np.meshgrid(x, y)
            if sine_type == 'multi' and Kx is not None:
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                exposure_dose = I_avg * (1 + V * np.cos(Kx * X + Ky * Y + phi)) * t_exp
                thickness = np.exp(-C * exposure_dose)
            else:
                exposure_dose = I_avg * (1 + V * np.cos(K * X)) * t_exp
                thickness = np.exp(-C * exposure_dose)
            return {
                'x': x.tolist(),
                'y': y.tolist(),
                'exposure_dose': exposure_dose.tolist(),
                'thickness': thickness.tolist()
            }
        else:
            x = x.tolist()
            x_np = np.array(x)
            if sine_type == 'multi' and Kx is not None:
                exposure_dose = self.calculate_exposure_dose(x_np, I_avg, V, None, t_exp, sine_type, Kx, Ky, phi_expr, y=0).tolist()
                thickness = self.calculate_photoresist_thickness(x_np, I_avg, V, None, t_exp, C, sine_type, Kx, Ky, phi_expr, y=0).tolist()
            else:
                exposure_dose = self.calculate_exposure_dose(x_np, I_avg, V, K, t_exp).tolist()
                thickness = self.calculate_photoresist_thickness(x_np, I_avg, V, K, t_exp, C).tolist()
            return {
                'x': x,
                'exposure_dose': exposure_dose,
                'thickness': thickness
            }
    
    def generate_plots(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y_range=None):
        plt.close('all')
        x = np.linspace(0, 10, 1000)
        if y_range is not None and len(y_range) > 1:
            y = np.array(y_range)
            X, Y = np.meshgrid(x, y)
            if sine_type == 'multi' and Kx is not None:
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                exposure_dose = I_avg * (1 + V * np.cos(Kx * X + Ky * Y + phi)) * t_exp
                thickness = np.exp(-C * exposure_dose)
            else:
                exposure_dose = I_avg * (1 + V * np.cos(K * X)) * t_exp
                thickness = np.exp(-C * exposure_dose)
            # 画二维热力图
            fig1 = plt.figure(figsize=(8, 6))
            plt.imshow(exposure_dose, aspect='auto', origin='lower', extent=[x[0], x[-1], y[0], y[-1]], cmap='viridis')
            plt.colorbar(label='Exposure Dose (mJ/cm²)')
            plt.xlabel('x (μm)')
            plt.ylabel('y (μm)')
            plt.title('Exposure Dose Distribution (2D)')
            plt.tight_layout()
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            fig2 = plt.figure(figsize=(8, 6))
            plt.imshow(thickness, aspect='auto', origin='lower', extent=[x[0], x[-1], y[0], y[-1]], cmap='plasma')
            plt.colorbar(label='Relative Thickness')
            plt.xlabel('x (μm)')
            plt.ylabel('y (μm)')
            plt.title('Photoresist Thickness Distribution (2D)')
            plt.tight_layout()
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            return {
                'exposure_plot': exposure_plot,
                'thickness_plot': thickness_plot
            }
        else:
            if sine_type == 'multi' and Kx is not None:
                exposure_dose = self.calculate_exposure_dose(x, I_avg, V, None, t_exp, sine_type, Kx, Ky, phi_expr, y=0)
                thickness = self.calculate_photoresist_thickness(x, I_avg, V, None, t_exp, C, sine_type, Kx, Ky, phi_expr, y=0)
            else:
                exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp)
                thickness = self.calculate_photoresist_thickness(x, I_avg, V, K, t_exp, C)
            fig1 = plt.figure(figsize=(10, 6))
            plt.plot(x, exposure_dose, 'b-', linewidth=2)
            plt.title('Exposure Dose Distribution', fontsize=16)
            plt.xlabel('Position (μm)', fontsize=14)
            plt.ylabel('Exposure Dose (mJ/cm²)', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            fig2 = plt.figure(figsize=(10, 6))
            plt.plot(x, thickness, 'r-', linewidth=2)
            plt.title('Photoresist Thickness Distribution', fontsize=16)
            plt.xlabel('Position (μm)', fontsize=14)
            plt.ylabel('Relative Thickness', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            return {
                'exposure_plot': exposure_plot,
                'thickness_plot': thickness_plot
            }

def get_model_by_name(model_name):
    """
    根据模型名称返回对应模型实例
    支持：'dill', 'enhanced_dill', 'car'
    """
    if model_name == 'dill':
        return DillModel()
    elif model_name == 'enhanced_dill':
        return EnhancedDillModel()
    elif model_name == 'car':
        from .car_model import CARModel
        return CARModel()
    else:
        raise ValueError(f"未知模型类型: {model_name}") 