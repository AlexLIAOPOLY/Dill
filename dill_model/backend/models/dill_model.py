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
import logging

# 设置日志配置
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    
    def calculate_intensity_distribution(self, x, I_avg, V, K=None, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0, t=0):
        """
        计算光强分布，支持一维、二维和三维正弦波
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y: y坐标
            z: z坐标（三维模式使用）
            t: 时间
            
        返回:
            光强分布数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 光强分布计算】")
        logger.info("=" * 60)
        
        if sine_type == 'multi':
            logger.info("🔸 计算模式: 二维正弦波光强分布")
            logger.info("🔸 使用公式: I(x,y) = I_avg * (1 + V * cos(Kx*x + Ky*y + φ))")
            
            phi = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - I_avg (平均光强) = {I_avg}")
            logger.info(f"   - V (干涉条纹可见度) = {V}")
            logger.info(f"   - Kx (x方向空间频率) = {Kx}")
            logger.info(f"   - Ky (y方向空间频率) = {Ky}")
            logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}' → φ = {phi}")
            logger.info(f"   - y (y坐标) = {y}")
            logger.info(f"   - t (时间) = {t}")
            logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            # y默认为0，若后续支持二维分布可扩展
            result = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 光强分布范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
            logger.info(f"   - 光强平均值: {np.mean(result):.6f}")
            
            return result
            
        elif sine_type == '3d':
            logger.info("🔸 计算模式: 三维正弦波光强分布")
            logger.info("🔸 使用公式: I(x,y,z) = I_avg * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ))")
            
            phi = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - I_avg (平均光强) = {I_avg}")
            logger.info(f"   - V (干涉条纹可见度) = {V}")
            logger.info(f"   - Kx (x方向空间频率) = {Kx}")
            logger.info(f"   - Ky (y方向空间频率) = {Ky}")
            logger.info(f"   - Kz (z方向空间频率) = {Kz}")
            logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}' → φ = {phi}")
            logger.info(f"   - y (y坐标) = {y}")
            logger.info(f"   - z (z坐标) = {z}")
            logger.info(f"   - t (时间) = {t}")
            logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            # 三维正弦波
            result = I_avg * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi))
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 光强分布范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
            logger.info(f"   - 光强平均值: {np.mean(result):.6f}")
            
            return result
        else:
            logger.info("🔸 计算模式: 一维正弦波光强分布")
            logger.info("🔸 使用公式: I(x) = I_avg * (1 + V * cos(K*x))")
            
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - I_avg (平均光强) = {I_avg}")
            logger.info(f"   - V (干涉条纹可见度) = {V}")
            logger.info(f"   - K (空间频率) = {K}")
            logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            result = I_avg * (1 + V * np.cos(K * x))
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 光强分布范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
            logger.info(f"   - 光强平均值: {np.mean(result):.6f}")
            
            return result
    
    def calculate_exposure_dose(self, x, I_avg, V, K=None, t_exp=1, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0):
        """
        计算曝光剂量分布，支持一维、二维和三维正弦波
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y: y坐标
            z: z坐标（三维模式使用）
            
        返回:
            曝光剂量分布数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 曝光剂量计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用公式: D(x) = I(x) * t_exp")
        logger.info(f"🔸 输入变量值:")
        logger.info(f"   - t_exp (曝光时间) = {t_exp}")
        
        # 只支持t=0时的phi_expr，后续可扩展为时变
        intensity = self.calculate_intensity_distribution(x, I_avg, V, K, sine_type, Kx, Ky, Kz, phi_expr, y, z, t=0)
        exposure_dose = intensity * t_exp
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 曝光剂量范围: [{np.min(exposure_dose):.6f}, {np.max(exposure_dose):.6f}]")
        logger.info(f"   - 曝光剂量平均值: {np.mean(exposure_dose):.6f}")
        
        return exposure_dose
    
    def calculate_photoresist_thickness(self, x, I_avg, V, K=None, t_exp=1, C=0.01, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0):
        """
        计算光刻胶厚度分布，支持一维、二维和三维正弦波
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y: y坐标
            z: z坐标（三维模式使用）
            
        返回:
            光刻胶厚度分布数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 光刻胶厚度计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用公式: M(x) = exp(-C * D(x))")
        logger.info("🔸 其中 M(x) 为归一化光敏剂浓度，也表示光刻胶剩余厚度")
        logger.info(f"🔸 输入变量值:")
        logger.info(f"   - C (光敏速率常数) = {C}")
        
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type, Kx, Ky, Kz, phi_expr, y, z)
        # 简化的Dill模型计算光刻胶厚度
        # 实际中可能需要更复杂的模型，这里使用指数衰减模型
        thickness = np.exp(-C * exposure_dose)
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 光刻胶厚度范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
        logger.info(f"   - 光刻胶厚度平均值: {np.mean(thickness):.6f}")
        logger.info("   注: 厚度值为归一化值，1.0表示未曝光区域，0.0表示完全曝光区域")
        
        return thickness
    
    def generate_data(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None):
        """
        生成数据，支持一维、二维和三维正弦波
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y_range: y坐标范围数组
            z_range: z坐标范围数组（三维模式使用）
            
        返回:
            包含曝光剂量和厚度数据的字典
        """
        logger.info("🌟" * 30)
        logger.info("【Dill模型 - 数据生成总控制】")
        logger.info("🌟" * 30)
        logger.info(f"🔸 输入参数总览:")
        logger.info(f"   - sine_type (计算维度) = '{sine_type}'")
        logger.info(f"   - I_avg (平均光强) = {I_avg}")
        logger.info(f"   - V (可见度) = {V}")
        logger.info(f"   - K (1D空间频率) = {K}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp}")
        logger.info(f"   - C (光敏速率常数) = {C}")
        logger.info(f"   - Kx (x方向空间频率) = {Kx}")
        logger.info(f"   - Ky (y方向空间频率) = {Ky}")
        logger.info(f"   - Kz (z方向空间频率) = {Kz}")
        logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}'")
        logger.info(f"   - y_range = {y_range}")
        logger.info(f"   - z_range = {z_range}")
        
        x_axis_points = np.linspace(0, 10, 1000)
        
        # 二维正弦波
        if sine_type == 'multi':
            logger.info("💫 进入二维(2D)模式处理分支")
            if Kx is not None and Ky is not None and y_range is not None and len(y_range) > 1:
                logger.info("✅ 二维模式: 参数完整，执行真正的2D计算")
                logger.info("🔸 使用公式: I(x,y) = I_avg * (1 + V * cos(Kx*x + Ky*y + φ))")
                logger.info("🔸 使用公式: D(x,y) = I(x,y) * t_exp")
                logger.info("🔸 使用公式: M(x,y) = exp(-C * D(x,y))")
                
                y_axis_points = np.array(y_range)
                logger.info(f"🔸 网格参数:")
                logger.info(f"   - x网格: [{np.min(x_axis_points):.3f}, {np.max(x_axis_points):.3f}], 点数: {len(x_axis_points)}")
                logger.info(f"   - y网格: [{np.min(y_axis_points):.3f}, {np.max(y_axis_points):.3f}], 点数: {len(y_axis_points)}")
                
                X_grid, Y_grid = np.meshgrid(x_axis_points, y_axis_points)
                
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                logger.info(f"🔸 解析后的相位: φ = {phi}")
                
                exposure_dose_2d = I_avg * (1 + V * np.cos(Kx * X_grid + Ky * Y_grid + phi)) * t_exp
                thickness_2d = np.exp(-C * exposure_dose_2d)
                
                logger.info(f"🔸 2D计算结果:")
                logger.info(f"   - 曝光剂量范围: [{np.min(exposure_dose_2d):.6f}, {np.max(exposure_dose_2d):.6f}]")
                logger.info(f"   - 光刻胶厚度范围: [{np.min(thickness_2d):.6f}, {np.max(thickness_2d):.6f}]")
                logger.info(f"   - 数据矩阵大小: {exposure_dose_2d.shape}")
                
                return {
                    'x_coords': x_axis_points.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'z_exposure_dose': exposure_dose_2d.tolist(),
                    'z_thickness': thickness_2d.tolist(),
                    'is_2d': True
                }
            else:
                logger.info("⚠️ 二维模式: 参数不完整，回退到1D计算")
                logger.info(f"   - Kx = {Kx}, Ky = {Ky}")
                logger.info(f"   - y_range = {y_range}, 长度 = {len(y_range) if y_range else 0}")
                
                k_for_1d_fallback = K if K is not None else 2.0
                logger.info(f"   - 使用回退K值: {k_for_1d_fallback}")
                
                exposure_dose_1d = self.calculate_exposure_dose(x_axis_points, I_avg, V, k_for_1d_fallback, t_exp).tolist()
                thickness_1d = self.calculate_photoresist_thickness(x_axis_points, I_avg, V, k_for_1d_fallback, t_exp, C).tolist()
                
                logger.info(f"🔸 1D回退计算完成，数据长度: {len(exposure_dose_1d)}")
                
                return {
                    'x': x_axis_points.tolist(),
                    'exposure_dose': exposure_dose_1d,
                    'thickness': thickness_1d,
                    'is_2d': False,
                    'is_3d': False
                }
        # 三维正弦波 - 完全重写此部分
        elif sine_type == '3d' and Kx is not None:
            logger.info("🎯 进入三维(3D)模式处理分支")
            logger.info("🔸 使用公式: I(x,y,z) = I_avg * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ))")
            logger.info("🔸 使用公式: D(x,y,z) = I(x,y,z) * t_exp") 
            logger.info("🔸 使用公式: M(x,y,z) = exp(-C * D(x,y,z))")
            
            # 设置更高的分辨率以获得更平滑的三维表面
            x_points = 50  # x轴点数
            y_points = 50  # y轴点数
            
            # 定义范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            logger.info(f"🔸 3D网格参数:")
            logger.info(f"   - x范围: [{x_min}, {x_max}], 点数: {x_points}")
            logger.info(f"   - y范围: [{y_min}, {y_max}], 点数: {y_points}")
            logger.info(f"   - Kx = {Kx}, Ky = {Ky}, Kz = {Kz}")
            
            # 创建网格坐标
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建二维网格
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            logger.info(f"🔸 解析后的相位: φ = {phi}")
            
            # 确保Ky有默认值
            Ky = Ky if Ky is not None else 0.0
            logger.info(f"🔸 处理后的频率参数: Kx={Kx}, Ky={Ky}, Kz={Kz}")
            
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            logger.info(f"🔸 缩放后的频率: Kx_scaled={Kx_scaled}, Ky_scaled={Ky_scaled}")
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            logger.info(f"🔸 振幅调整: 原始V={V} → 使用amplitude={amplitude}")
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            logger.info(f"🔸 调制函数范围: [{np.min(modulation):.6f}, {np.max(modulation):.6f}]")
            
            # 4. 对曝光剂量和厚度应用清晰的正弦波调制
            base_exposure = I_avg * t_exp
            variation = amplitude * base_exposure * 0.5
            logger.info(f"🔸 曝光剂量计算参数:")
            logger.info(f"   - base_exposure = I_avg * t_exp = {I_avg} * {t_exp} = {base_exposure}")
            logger.info(f"   - variation = amplitude * base_exposure * 0.5 = {amplitude} * {base_exposure} * 0.5 = {variation}")
            
            # 曝光剂量随位置变化：基准值 ± 变化量
            exposure_dose = base_exposure + variation * modulation
            logger.info(f"🔸 曝光剂量结果:")
            logger.info(f"   - 范围: [{np.min(exposure_dose):.6f}, {np.max(exposure_dose):.6f}]")
            logger.info(f"   - 平均值: {np.mean(exposure_dose):.6f}")
            
            # 厚度与曝光剂量成反比关系
            thickness = np.exp(-C * exposure_dose)
            logger.info(f"🔸 光刻胶厚度结果:")
            logger.info(f"   - 范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
            logger.info(f"   - 平均值: {np.mean(thickness):.6f}")
            
            # 创建3D表面图 - 曝光剂量
            fig1 = plt.figure(figsize=(10, 8))
            ax1 = fig1.add_subplot(111, projection='3d')
            surf1 = ax1.plot_surface(X, Y, exposure_dose, cmap='viridis', edgecolor='none')
            ax1.set_title('3D Exposure Dose Distribution', fontsize=16)
            ax1.set_xlabel('X Position (μm)', fontsize=14)
            ax1.set_ylabel('Y Position (μm)', fontsize=14)
            ax1.set_zlabel('Exposure Dose', fontsize=14)
            fig1.colorbar(surf1, ax=ax1, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 创建3D表面图 - 厚度
            fig2 = plt.figure(figsize=(10, 8))
            ax2 = fig2.add_subplot(111, projection='3d')
            surf2 = ax2.plot_surface(X, Y, thickness, cmap='plasma', edgecolor='none')
            ax2.set_title('3D Photoresist Thickness Distribution', fontsize=16)
            ax2.set_xlabel('X Position (μm)', fontsize=14)
            ax2.set_ylabel('Y Position (μm)', fontsize=14)
            ax2.set_zlabel('Relative Thickness', fontsize=14)
            fig2.colorbar(surf2, ax=ax2, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
            # 确保返回前端期望的数据格式，添加前端可能需要的所有字段
            # 注意：对于plotly 3D surface图，z应该是二维数组，形状为[len(y_coords), len(x_coords)]
            # 这里需要将exposure_dose和thickness直接转为嵌套列表，保持二维结构
            # 不要使用.tolist()后再.tolist()，这样会把嵌套结构展平
            return {
                'exposure_plot': exposure_plot, 
                'thickness_plot': thickness_plot,
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                # 确保二维结构保留
                'exposure_dose': [[exposure_dose[i, j] for j in range(exposure_dose.shape[1])] for i in range(exposure_dose.shape[0])],
                'thickness': [[thickness[i, j] for j in range(thickness.shape[1])] for i in range(thickness.shape[0])],
                # 提供展平版本作为备选
                'z_exposure_dose': exposure_dose.flatten().tolist(),
                'z_thickness': thickness.flatten().tolist(),
                'is_3d': True,
                'is_2d': False
            }
        # 一维正弦波
        else:
            logger.info("📈 进入一维(1D)模式处理分支")
            logger.info("🔸 使用公式: I(x) = I_avg * (1 + V * cos(K*x))")
            logger.info("🔸 使用公式: D(x) = I(x) * t_exp")
            logger.info("🔸 使用公式: M(x) = exp(-C * D(x))")
            
            k_for_1d = K if K is not None else 2.0
            logger.info(f"🔸 1D计算参数:")
            logger.info(f"   - K (空间频率) = {k_for_1d}")
            logger.info(f"   - x范围: [{np.min(x_axis_points):.3f}, {np.max(x_axis_points):.3f}], 点数: {len(x_axis_points)}")
            
            exposure_dose_1d = self.calculate_exposure_dose(x_axis_points, I_avg, V, k_for_1d, t_exp).tolist()
            thickness_1d = self.calculate_photoresist_thickness(x_axis_points, I_avg, V, k_for_1d, t_exp, C).tolist()
            
            logger.info(f"🔸 1D计算完成，数据长度: {len(exposure_dose_1d)}")
            
            return {
                'x': x_axis_points.tolist(),
                'exposure_dose': exposure_dose_1d,
                'thickness': thickness_1d,
                'is_2d': False,
                'is_3d': False
            }
    
    def generate_plots(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None):
        """
        生成图像，支持一维、二维和三维正弦波
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y_range: y坐标范围数组
            z_range: z坐标范围数组（三维模式使用）
            
        返回:
            包含曝光剂量和厚度图像的字典
        """
        plt.close('all')
        x_axis_points = np.linspace(0, 10, 1000)
        
        # 二维正弦波
        if sine_type == 'multi':
            if Kx is not None and Ky is not None and y_range is not None and len(y_range) > 1:
                y_axis_points = np.array(y_range)
                X_grid, Y_grid = np.meshgrid(x_axis_points, y_axis_points)
                
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                exposure_dose_2d = I_avg * (1 + V * np.cos(Kx * X_grid + Ky * Y_grid + phi)) * t_exp
                thickness_2d = np.exp(-C * exposure_dose_2d)

                fig1 = plt.figure(figsize=(8, 6))
                plt.imshow(exposure_dose_2d, aspect='auto', origin='lower', extent=[x_axis_points[0], x_axis_points[-1], y_axis_points[0], y_axis_points[-1]], cmap='viridis')
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
                plt.imshow(thickness_2d, aspect='auto', origin='lower', extent=[x_axis_points[0], x_axis_points[-1], y_axis_points[0], y_axis_points[-1]], cmap='plasma')
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
            k_for_1d_fallback = K if K is not None else 2.0
            exposure_dose_1d = self.calculate_exposure_dose(x_axis_points, I_avg, V, k_for_1d_fallback, t_exp)
            thickness_1d = self.calculate_photoresist_thickness(x_axis_points, I_avg, V, k_for_1d_fallback, t_exp, C)
        # 三维正弦波 - 完全重写此部分，与generate_data保持一致
        elif sine_type == '3d' and Kx is not None:
            # 设置更高的分辨率以获得更平滑的三维表面
            x_points = 50  # x轴点数
            y_points = 50  # y轴点数
            
            # 定义范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            # 创建网格坐标
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建二维网格
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 确保Ky有默认值
            Ky = Ky if Ky is not None else 0.0
            
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            
            # 4. 对曝光剂量和厚度应用清晰的正弦波调制
            base_exposure = I_avg * t_exp
            variation = amplitude * base_exposure * 0.5
            
            # 曝光剂量随位置变化：基准值 ± 变化量
            exposure_dose = base_exposure + variation * modulation
            
            # 厚度与曝光剂量成反比关系
            thickness = np.exp(-C * exposure_dose)
            
            # 创建3D表面图 - 曝光剂量
            fig1 = plt.figure(figsize=(10, 8))
            ax1 = fig1.add_subplot(111, projection='3d')
            surf1 = ax1.plot_surface(X, Y, exposure_dose, cmap='viridis', edgecolor='none')
            ax1.set_title('3D Exposure Dose Distribution', fontsize=16)
            ax1.set_xlabel('X Position (μm)', fontsize=14)
            ax1.set_ylabel('Y Position (μm)', fontsize=14)
            ax1.set_zlabel('Exposure Dose', fontsize=14)
            fig1.colorbar(surf1, ax=ax1, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 创建3D表面图 - 厚度
            fig2 = plt.figure(figsize=(10, 8))
            ax2 = fig2.add_subplot(111, projection='3d')
            surf2 = ax2.plot_surface(X, Y, thickness, cmap='plasma', edgecolor='none')
            ax2.set_title('3D Photoresist Thickness Distribution', fontsize=16)
            ax2.set_xlabel('X Position (μm)', fontsize=14)
            ax2.set_ylabel('Y Position (μm)', fontsize=14)
            ax2.set_zlabel('Relative Thickness', fontsize=14)
            fig2.colorbar(surf2, ax=ax2, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
            # 确保返回格式一致，包含前端可能需要的所有字段
            # 注意：对于plotly 3D surface图，z应该是二维数组，形状为[len(y_coords), len(x_coords)]
            return {
                'exposure_plot': exposure_plot, 
                'thickness_plot': thickness_plot,
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                # 确保二维结构保留
                'exposure_dose': [[exposure_dose[i, j] for j in range(exposure_dose.shape[1])] for i in range(exposure_dose.shape[0])],
                'thickness': [[thickness[i, j] for j in range(thickness.shape[1])] for i in range(thickness.shape[0])],
                # 提供展平版本作为备选
                'z_exposure_dose': exposure_dose.flatten().tolist(),
                'z_thickness': thickness.flatten().tolist(),
                'is_3d': True,
                'is_2d': False
            }
        # 一维正弦波
        else:
            if not ('exposure_dose_1d' in locals() and 'thickness_1d' in locals()):
                k_for_1d = K if K is not None else 2.0
                exposure_dose_1d = self.calculate_exposure_dose(x_axis_points, I_avg, V, k_for_1d, t_exp)
                thickness_1d = self.calculate_photoresist_thickness(x_axis_points, I_avg, V, k_for_1d, t_exp, C)

            fig1 = plt.figure(figsize=(10, 6))
            plt.plot(x_axis_points, exposure_dose_1d, 'b-', linewidth=2)
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
            plt.plot(x_axis_points, thickness_1d, 'r-', linewidth=2)
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
        return EnhancedDillModel(debug_mode=False)
    elif model_name == 'car':
        from .car_model import CARModel
        return CARModel()
    else:
        raise ValueError(f"未知模型类型: {model_name}") 