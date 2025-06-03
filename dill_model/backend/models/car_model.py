import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from scipy.ndimage import gaussian_filter
import math
import ast

# 新增：全局字体设置，优先使用常见的无衬线字体
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans', 'Liberation Sans', 'SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示为方块的问题

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

class CARModel:
    """
    化学放大型光刻胶(CAR)模型
    
    核心原理：曝光产生光酸，光酸在后烘过程中扩散并催化树脂脱保护反应
    主要参数：
    - 光酸产生效率
    - 光酸扩散长度(EPDL)
    - 催化反应速率
    
    参考文献：
    1. Hinsberg et al., "Chemical amplification mechanism with high resolution chemically 
       amplified electron beam resists", Proc. SPIE, 1994.
    2. Kyung-Hoon Choi et al., "Post exposure bake models for chemically amplified resists",
       J. Vac. Sci. Technol. B, 2007.
    """
    
    def __init__(self):
        pass
    
    def calculate_acid_generation(self, x, I_avg, V, K=None, t_exp=1, acid_gen_efficiency=1, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0):
        """
        计算初始光酸分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            sine_type: 正弦波类型
            Kx: 正弦波的x方向频率
            Ky: 正弦波的y方向频率
            Kz: 正弦波的z方向频率
            phi_expr: 相位表达式
            y: 位置的y坐标
            z: 位置的z坐标
            
        返回:
            初始光酸浓度分布数组
        """
        if sine_type == 'multi' and Kx is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi))
        else:
            intensity = I_avg * (1 + V * np.cos(K * x))
        
        # 计算曝光剂量分布
        exposure_dose = intensity * t_exp
        
        # 计算初始光酸生成量 (与曝光剂量和效率成正比)
        initial_acid = acid_gen_efficiency * exposure_dose
        
        # 归一化处理
        initial_acid = initial_acid / np.max(initial_acid)
        
        return initial_acid
    
    def simulate_acid_diffusion(self, initial_acid, diffusion_length):
        """
        模拟光酸扩散过程（使用高斯扩散模型）
        
        参数:
            initial_acid: 初始光酸分布
            diffusion_length: 光酸扩散长度(EPDL)，单位：像素
            
        返回:
            扩散后的光酸分布
        """
        # 使用高斯滤波器模拟扩散
        diffused_acid = gaussian_filter(initial_acid, sigma=diffusion_length)
        return diffused_acid
    
    def calculate_deprotection(self, diffused_acid, reaction_rate, amplification):
        """
        计算树脂的脱保护反应
        
        参数:
            diffused_acid: 扩散后的光酸分布
            reaction_rate: 催化反应速率常数
            amplification: 放大因子 (每个酸分子可催化的反应数)
            
        返回:
            脱保护程度分布
        """
        # 计算催化反应的量，使用饱和模型
        deprotection = 1 - np.exp(-reaction_rate * amplification * diffused_acid)
        return deprotection
    
    def calculate_dissolution(self, deprotection, contrast):
        """
        计算显影后的剩余光刻胶厚度
        
        参数:
            deprotection: 脱保护程度分布
            contrast: 对比度参数
            
        返回:
            显影后的光刻胶厚度分布（归一化）
        """
        # 使用非线性函数模拟显影过程的对比度
        thickness = 1 - np.power(deprotection, contrast)
        return thickness
    
    def calculate_exposure_dose(self, x, I_avg, V, K, t_exp, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0):
        if sine_type == 'multi' and Kx is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi))
        else:
            intensity = I_avg * (1 + V * np.cos(K * x))
        exposure_dose = intensity * t_exp
        return exposure_dose
    
    def generate_data(self, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None):
        """
        生成模型数据用于交互式图表
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            diffusion_length: 光酸扩散长度
            reaction_rate: 催化反应速率常数
            amplification: 放大因子
            contrast: 对比度参数
            sine_type: 正弦波类型
            Kx: 正弦波的x方向频率
            Ky: 正弦波的y方向频率
            Kz: 正弦波的z方向频率
            phi_expr: 相位表达式
            y_range: y坐标范围
            z_range: z坐标范围
            
        返回:
            包含x坐标和各阶段y值的数据字典
        """
        # 创建坐标
        x = np.linspace(0, 10, 1000).tolist()  # 0到10微米，1000个点
        x_np = np.array(x)
        
        # 处理三维正弦波
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 使用与厚胶模型一致的参数和处理方法
            x_points = 50  # x轴点数
            y_points = 50  # y轴点数
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            # 创建网格坐标
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建网格点 (用于2D表面)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            
            # 4. 计算各阶段数据
            # 曝光剂量与光强成正比
            base_exposure = I_avg * t_exp
            variation = amplitude * base_exposure * 0.5
            exposure_dose = base_exposure + variation * modulation
            
            # 初始光酸生成与曝光剂量成正比
            acid_base = acid_gen_efficiency * base_exposure
            acid_variation = acid_gen_efficiency * variation
            initial_acid = acid_base + acid_variation * modulation
            initial_acid = initial_acid / np.max(initial_acid)  # 归一化
            
            # 模拟光酸扩散 - 使用高斯滤波
            diffused_acid = gaussian_filter(initial_acid, sigma=diffusion_length)
            
            # 计算脱保护反应
            deprotection = 1 - np.exp(-reaction_rate * amplification * diffused_acid)
            
            # 计算光刻胶厚度分布
            thickness = 1 - np.power(deprotection, contrast)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
                initial_acid = initial_acid.T
                diffused_acid = diffused_acid.T
                deprotection = deprotection.T
                thickness = thickness.T
            
            # 返回3D数据
            return {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                'exposure_dose': exposure_dose.tolist(),
                'initial_acid': initial_acid.tolist(),
                'diffused_acid': diffused_acid.tolist(),
                'deprotection': deprotection.tolist(),
                'thickness': thickness.tolist(),
                'is_3d': True
            }
        # 二维正弦波
        elif sine_type == 'multi' and Kx is not None and Ky is not None:
            if y_range is not None and len(y_range) > 1:
                y_axis_points = np.array(y_range)
                # 创建二维网格
                X_grid, Y_grid = np.meshgrid(x_np, y_axis_points)
                
                # 计算曝光剂量分布
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                initial_acid_2d = self.calculate_acid_generation(X_grid, I_avg, V, None, t_exp, acid_gen_efficiency, 
                                                          sine_type, Kx, Ky, None, phi_expr, Y_grid)
                                                          
                # 模拟光酸扩散
                diffused_acid_2d = self.simulate_acid_diffusion(initial_acid_2d, diffusion_length)
                
                # 计算脱保护反应
                deprotection_2d = self.calculate_deprotection(diffused_acid_2d, reaction_rate, amplification)
                
                # 计算光刻胶厚度分布
                thickness_2d = self.calculate_dissolution(deprotection_2d, contrast)
                
                # 返回热图所需的网格数据结构
                return {
                    'x_coords': x_np.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'z_exposure_dose': initial_acid_2d.tolist(),  # 使用与Dill模型一致的键名
                    'z_thickness': thickness_2d.tolist(),         # 使用与Dill模型一致的键名
                    'initial_acid': initial_acid_2d.flatten().tolist(),
                    'diffused_acid': diffused_acid_2d.flatten().tolist(),
                    'deprotection': deprotection_2d.flatten().tolist(),
                    'thickness': thickness_2d.flatten().tolist(),
                    'is_2d': True
                }
            else:
                # 如果没有提供有效的y_range，回退到一维模式
                k_for_1d_fallback = K if K is not None else 2.0
                initial_acid = self.calculate_acid_generation(x_np, I_avg, V, k_for_1d_fallback, t_exp, acid_gen_efficiency)
                diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
                deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
                thickness = self.calculate_dissolution(deprotection, contrast)
                
                return {
                    'x': x,
                    'initial_acid': initial_acid.tolist(),
                    'exposure_dose': initial_acid.tolist(),
                    'diffused_acid': diffused_acid.tolist(),
                    'deprotection': deprotection.tolist(),
                    'thickness': thickness.tolist(),
                    'is_2d': False
                }
        # 一维正弦波
        else:
            # 确保 K 不为 None，避免计算错误
            if K is None:
                K = 2.0  # 设置一个默认值
            initial_acid = self.calculate_acid_generation(x_np, I_avg, V, K, t_exp, acid_gen_efficiency)
            
            # 模拟光酸扩散
            diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
            
            # 计算脱保护反应
            deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
            
            # 计算光刻胶厚度分布
            thickness = self.calculate_dissolution(deprotection, contrast)
            
            # 检查有效性
            if (not initial_acid.any() or not diffused_acid.any() or not deprotection.any() or not thickness.any() or
                np.isnan(initial_acid).all() or np.isnan(diffused_acid).all() or np.isnan(deprotection).all() or np.isnan(thickness).all()):
                raise ValueError('CAR模型计算结果无效，可能参数设置不合理或数值溢出。')
            
            # 返回数据
            return {
                'x': x,
                'initial_acid': initial_acid.tolist(),
                'exposure_dose': initial_acid.tolist(),
                'diffused_acid': diffused_acid.tolist(),
                'deprotection': deprotection.tolist(),
                'thickness': thickness.tolist(),
                'is_2d': False
            }
    
    def generate_plots(self, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None):
        """
        生成模型可视化图像
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            diffusion_length: 光酸扩散长度
            reaction_rate: 催化反应速率常数
            amplification: 放大因子
            contrast: 对比度参数
            sine_type: 正弦波类型
            Kx: 正弦波的x方向频率
            Ky: 正弦波的y方向频率
            Kz: 正弦波的z方向频率
            phi_expr: 相位表达式
            y_range: y坐标范围
            z_range: z坐标范围
            
        返回:
            包含多个Base64编码图像的字典
        """
        plt.close('all')
        
        # 对于一维和二维情况的常规处理
        # 创建坐标
        x = np.linspace(0, 10, 1000)  # 0到10微米，1000个点
        
        # 二维正弦波
        if sine_type == 'multi' and Kx is not None and Ky is not None:
            if y_range is not None and len(y_range) > 1:
                y_axis_points = np.array(y_range)
                X_grid, Y_grid = np.meshgrid(x, y_axis_points)
                
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                initial_acid_2d = self.calculate_acid_generation(X_grid, I_avg, V, None, t_exp, acid_gen_efficiency, 
                                                    sine_type, Kx, Ky, None, phi_expr, Y_grid)
                
                # 模拟光酸扩散
                diffused_acid_2d = self.simulate_acid_diffusion(initial_acid_2d, diffusion_length)
                
                # 计算脱保护反应
                deprotection_2d = self.calculate_deprotection(diffused_acid_2d, reaction_rate, amplification)
                
                # 计算光刻胶厚度分布
                thickness_2d = self.calculate_dissolution(deprotection_2d, contrast)
                
                # 绘制曝光剂量热图
                fig1 = plt.figure(figsize=(8, 6))
                plt.imshow(initial_acid_2d, aspect='auto', origin='lower', 
                          extent=[min(x), max(x), min(y_axis_points), max(y_axis_points)], cmap='viridis')
                plt.colorbar(label='曝光剂量 (mJ/cm²)')
                plt.xlabel('X 位置 (μm)')
                plt.ylabel('Y 位置 (μm)')
                plt.title('曝光剂量分布 (2D)')
                plt.tight_layout()
                buffer1 = BytesIO()
                fig1.savefig(buffer1, format='png', dpi=100)
                buffer1.seek(0)
                exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
                plt.close(fig1)
                
                # 绘制光刻胶厚度热图
                fig2 = plt.figure(figsize=(8, 6))
                plt.imshow(thickness_2d, aspect='auto', origin='lower', 
                          extent=[min(x), max(x), min(y_axis_points), max(y_axis_points)], cmap='plasma')
                plt.colorbar(label='相对厚度')
                plt.xlabel('X 位置 (μm)')
                plt.ylabel('Y 位置 (μm)')
                plt.title('光刻胶厚度分布 (2D)')
                plt.tight_layout()
                buffer2 = BytesIO()
                fig2.savefig(buffer2, format='png', dpi=100)
                buffer2.seek(0)
                thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
                plt.close(fig2)
                
                # 同时提供其他CAR模型需要的图表键
                return {
                    'initial_acid_plot': exposure_plot,
                    'thickness_plot': thickness_plot,
                    'exposure_plot': exposure_plot,
                    'acid_diffusion_plot': exposure_plot,
                    'deprotection_plot': thickness_plot
                }
            else:
                # 如果没有有效的y_range，回退到一维模式
                k_for_1d_fallback = K if K is not None else 2.0
                initial_acid = self.calculate_acid_generation(x, I_avg, V, k_for_1d_fallback, t_exp, acid_gen_efficiency)
                diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
                deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
                thickness = self.calculate_dissolution(deprotection, contrast)
        # 三维正弦波
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 使用与generate_data方法一致的参数和处理方法
            x_points = 50  # x轴点数
            y_points = 50  # y轴点数
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            # 创建网格坐标
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建网格点 (用于2D表面)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            
            # 4. 计算各阶段数据
            # 曝光剂量与光强成正比
            base_exposure = I_avg * t_exp
            variation = amplitude * base_exposure * 0.5
            exposure_dose = base_exposure + variation * modulation
            
            # 初始光酸生成与曝光剂量成正比
            acid_base = acid_gen_efficiency * base_exposure
            acid_variation = acid_gen_efficiency * variation
            initial_acid = acid_base + acid_variation * modulation
            initial_acid = initial_acid / np.max(initial_acid)  # 归一化
            
            # 模拟光酸扩散 - 使用高斯滤波
            diffused_acid = gaussian_filter(initial_acid, sigma=diffusion_length)
            
            # 计算脱保护反应
            deprotection = 1 - np.exp(-reaction_rate * amplification * diffused_acid)
            
            # 计算光刻胶厚度分布
            thickness = 1 - np.power(deprotection, contrast)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
                initial_acid = initial_acid.T
                diffused_acid = diffused_acid.T
                deprotection = deprotection.T
                thickness = thickness.T
            
            # 创建3D表面图 - 光酸浓度
            fig1 = plt.figure(figsize=(10, 8))
            ax1 = fig1.add_subplot(111, projection='3d')
            surf1 = ax1.plot_surface(X, Y, diffused_acid, cmap='viridis', edgecolor='none')
            ax1.set_title('3D Acid Concentration Distribution', fontsize=16)
            ax1.set_xlabel('X Position (μm)', fontsize=14)
            ax1.set_ylabel('Y Position (μm)', fontsize=14)
            ax1.set_zlabel('Acid Concentration', fontsize=14)
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
            
            # 同时提供其他CAR模型需要的图表键
            return {
                'initial_acid_plot': exposure_plot,
                'thickness_plot': thickness_plot,
                'exposure_plot': exposure_plot,
                'acid_diffusion_plot': exposure_plot,
                'deprotection_plot': thickness_plot
            }
        
        elif sine_type == 'multi' and Kx is not None:
            initial_acid = self.calculate_acid_generation(x, I_avg, V, None, t_exp, acid_gen_efficiency, sine_type, Kx, Ky, None, phi_expr, y=0)
        else:
            initial_acid = self.calculate_acid_generation(x, I_avg, V, K, t_exp, acid_gen_efficiency)
        
        # 处理一维情况
        if sine_type != '3d' and (sine_type != 'multi' or (y_range is None or len(y_range) <= 1)):
            # 模拟光酸扩散
            diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
            
            # 计算脱保护反应
            deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
            
            # 计算光刻胶厚度分布
            thickness = self.calculate_dissolution(deprotection, contrast)
            
            # 检查有效性
            if (not initial_acid.any() or not diffused_acid.any() or not deprotection.any() or not thickness.any() or
                np.isnan(initial_acid).all() or np.isnan(diffused_acid).all() or np.isnan(deprotection).all() or np.isnan(thickness).all()):
                raise ValueError('CAR模型计算结果无效，可能参数设置不合理或数值溢出。')
        
        # 生成图像集
        plots = {}
        
        # 1. 初始光酸分布图
        fig1 = plt.figure(figsize=(10, 6))
        plt.plot(x, initial_acid, 'g-', linewidth=2)
        plt.title('Initial Acid Distribution', fontsize=16)
        plt.xlabel('Position (μm)', fontsize=14)
        plt.ylabel('Normalized Acid Concentration', fontsize=14)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buffer1 = BytesIO()
        fig1.savefig(buffer1, format='png', dpi=100)
        buffer1.seek(0)
        plots['initial_acid_plot'] = base64.b64encode(buffer1.getvalue()).decode()
        plt.close(fig1)
        
        # 2. 扩散后光酸分布图
        fig2 = plt.figure(figsize=(10, 6))
        plt.plot(x, initial_acid, 'g--', linewidth=1.5, label='Initial')
        plt.plot(x, diffused_acid, 'b-', linewidth=2, label='After Diffusion')
        plt.title('Acid Diffusion Comparison', fontsize=16)
        plt.xlabel('Position (μm)', fontsize=14)
        plt.ylabel('Normalized Acid Concentration', fontsize=14)
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buffer2 = BytesIO()
        fig2.savefig(buffer2, format='png', dpi=100)
        buffer2.seek(0)
        plots['acid_diffusion_plot'] = base64.b64encode(buffer2.getvalue()).decode()
        plt.close(fig2)
        
        # 3. 脱保护程度分布图
        fig3 = plt.figure(figsize=(10, 6))
        plt.plot(x, deprotection, 'r-', linewidth=2)
        plt.title('Deprotection Degree Distribution', fontsize=16)
        plt.xlabel('Position (μm)', fontsize=14)
        plt.ylabel('Deprotection Degree', fontsize=14)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buffer3 = BytesIO()
        fig3.savefig(buffer3, format='png', dpi=100)
        buffer3.seek(0)
        plots['deprotection_plot'] = base64.b64encode(buffer3.getvalue()).decode()
        plt.close(fig3)
        
        # 4. 光刻胶厚度分布图
        fig4 = plt.figure(figsize=(10, 6))
        plt.plot(x, thickness, 'm-', linewidth=2)
        plt.title('Photoresist Thickness After Development', fontsize=16)
        plt.xlabel('Position (μm)', fontsize=14)
        plt.ylabel('Normalized Thickness', fontsize=14)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        buffer4 = BytesIO()
        fig4.savefig(buffer4, format='png', dpi=100)
        buffer4.seek(0)
        plots['thickness_plot'] = base64.b64encode(buffer4.getvalue()).decode()
        plt.close(fig4)
        
        plots['exposure_plot'] = plots['acid_diffusion_plot']
        return plots 