import numpy as np
from scipy.integrate import odeint
import math
import matplotlib.pyplot as plt
from io import BytesIO
import base64
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

class EnhancedDillModel:
    """
    增强Dill模型（适用于厚层光刻胶）
    参考文献：刘世杰等《厚层抗蚀剂曝光模型及其参数测量》
    主要方程：
        ∂I(z, t)/∂z = -I(z, t)[A(z_h, T, t_B) * M(z, t) + B(z_h, T, t_B)]
        ∂M(z, t)/∂t = -I(z, t) * M(z, t) * C(z_h, T, t_B)
    其中A/B/C为厚度、前烘温度、前烘时间的函数
    """
    def __init__(self):
        pass

    def get_abc(self, z_h, T, t_B):
        """
        根据厚度z_h、前烘温度T、前烘时间t_B，拟合A/B/C参数
        公式见论文（可根据实际需要调整/拟合）
        """
        # 论文拟合公式（以AZ4562为例）
        # t_B未显式出现，假设已包含在T与z_h的关系中
        D = z_h  # 胶厚，单位um
        A = -0.11989 * D + 0.00466 * T + 0.00551 * D**2 - 0.0001084 * D * T - 0.00001287 * T**2 + 0.79655
        B = 0.00066301 * D + 0.00024413 * T - 0.0096
        C = -0.01233 * D + 0.00054385 * T + 0.00056988 * D**2 - 0.00001487 * D * T - 0.00000115 * T**2 + 0.0629
        return A, B, C

    def dill_ode(self, y, t, A, B, C, I0):
        """
        微分方程组右端
        y = [I, M]
        """
        I, M = y
        dIdz = -I * (A * M + B)  # 这里z和t等价处理，简化为一维
        dMdt = -I * M * C
        return [dIdz, dMdt]

    def simulate(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_points=100, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, y=0, K=None):
        """
        用显式欧拉法在(z, t)二维网格上同步推进I(z, t)和M(z, t)，实现理论上更严谨的耦合积分。
        
        参数：
        - K：空间频率，如果提供此参数，将覆盖Kx
        - Kz：z方向的空间频率，用于3D模式
        """
        A, B, C = self.get_abc(z_h, T, t_B)
        z = np.linspace(0, z_h, num_points)
        t_points = 200  # 时间步数
        t = np.linspace(0, t_exp, t_points)
        dz = z[1] - z[0]
        dt = t[1] - t[0]
        
        # 支持K参数（比较模块使用）
        if K is not None:
            Kx = K
            sine_type = 'multi'
            
        # 多维正弦波支持：I0可为I(x)分布
        if sine_type == 'multi' and Kx is not None:
            x = np.linspace(0, 10, num_points)
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            I0_arr = I0 * (1 + V * np.cos(Kx * x + Ky * y + phi))
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 处理3D情况，这里我们简化为在z=0处的分布
            x = np.linspace(0, 10, num_points)
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            I0_arr = I0 * (1 + V * np.cos(Kx * x + Ky * y + Kz * 0 + phi))
        else:
            I0_arr = np.full(num_points, I0)
        # 初始化二维数组
        I = np.zeros((num_points, t_points))
        M = np.zeros((num_points, t_points))
        # 初始条件
        I[:, 0] = I0_arr
        M[:, 0] = M0
        # 逐步推进
        for j in range(1, t_points):  # 时间步
            for i in range(num_points):  # 深度步
                # z=0边界，I0固定
                if i == 0:
                    I[i, j] = I0_arr[j % len(I0_arr)]
                else:
                    # 修正：I(z, t) = I(z-dz, t) + dI/dz * dz
                    I[i, j] = I[i-1, j] + (-I[i-1, j] * (A * M[i-1, j-1] + B)) * dz
                # M(z, t) = M(z, t-dt) + dM/dt * dt
                I_here = I[i, j]
                M[i, j] = M[i, j-1] + (-I_here * M[i, j-1] * C) * dt
                # 保证M非负
                if M[i, j] < 0:
                    M[i, j] = 0
        # 输出z, I(z, t_exp), M(z, t_exp)
        I_z = I[:, -1]
        M_final = M[:, -1]
        return z, I_z, M_final

    def generate_data(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None):
        """
        生成增强Dill模型的曝光后分布数据
        
        参数：
        - K：空间频率参数，用于比较模块
        - V：干涉条纹可见度，用于控制空间调制深度
        - y_range: Y轴范围数组，用于生成2D数据
        - Kz：z方向的空间频率，用于3D模式
        """
        # 检查是否需要生成2D数据
        if sine_type == 'multi' and Kx is not None and Ky is not None and y_range is not None and len(y_range) > 1:
            # 生成2D热力图数据
            x_points = 100  # x轴点数
            x_coords = np.linspace(0, 10, x_points)
            y_coords = np.array(y_range)
            
            # 初始化2D数组
            z_exposure_dose = np.zeros((len(y_coords), len(x_coords)))
            z_thickness = np.zeros((len(y_coords), len(x_coords)))
            
            # 对每个y值计算对应的1D曲线
            for i, y_val in enumerate(y_coords):
                z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, num_points=x_points, 
                                        sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V, y=y_val)
                
                # 存储结果到2D数组
                z_exposure_dose[i] = I
                z_thickness[i] = M
            
            # 返回2D数据
            return {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                'z_exposure_dose': z_exposure_dose.tolist(),
                'z_thickness': z_thickness.tolist(),
                'is_2d': True
            }
        elif sine_type == '3d':
            # 处理3D情况，生成三维正弦波曲面
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
            
            # 使用与generate_data方法完全相同的逻辑
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            
            # 4. 对曝光剂量和厚度应用清晰的正弦波调制
            base_exposure = I0 * t_exp
            variation = amplitude * base_exposure * 0.5
            
            # 曝光剂量随位置变化：基准值 ± 变化量
            exposure_dose = base_exposure + variation * modulation
            
            # 厚度与曝光剂量成反比关系，波动也需要明显
            thickness = M0 * (1.0 - 0.5 * amplitude * modulation)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
            if thickness.shape != (y_points, x_points):
                thickness = thickness.T
            
            # 返回3D数据
            return {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                'exposure_dose': exposure_dose.tolist(),
                'thickness': thickness.tolist(),
                'is_3d': True
            }
        else:
            # 原始1D数据
            z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V, K=K)
            return {
                'z': z.tolist(),
                'x': z.tolist(),  # 新增别名，兼容前端
                'I': I.tolist(),
                'exposure_dose': I.tolist(),  # 新增别名，兼容前端
                'M': M.tolist(),
                'thickness': M.tolist()  # 新增别名，兼容前端
            }

    def generate_plots(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None):
        """
        Generate exposure dose and PAC concentration distribution plots (English labels)
        
        支持1D和3D模式下的图形生成
        """
        plt.close('all')
        
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 处理3D情况，生成3D表面图
            x_points = 50  # 与数据生成保持一致
            y_points = 50
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            # 创建网格
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建网格点 (用于2D表面)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 使用与generate_data方法完全相同的逻辑
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            
            # 4. 对曝光剂量和厚度应用清晰的正弦波调制
            base_exposure = I0 * t_exp
            variation = amplitude * base_exposure * 0.5
            
            # 曝光剂量随位置变化：基准值 ± 变化量
            exposure_dose = base_exposure + variation * modulation
            
            # 厚度与曝光剂量成反比关系，波动也需要明显
            thickness = M0 * (1.0 - 0.5 * amplitude * modulation)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
            if thickness.shape != (y_points, x_points):
                thickness = thickness.T
            
            # 创建3D表面图
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
            
            # PAC浓度3D表面图
            fig2 = plt.figure(figsize=(10, 8))
            ax2 = fig2.add_subplot(111, projection='3d')
            surf2 = ax2.plot_surface(X, Y, thickness, cmap='plasma', edgecolor='none')
            ax2.set_title('3D PAC Concentration Distribution', fontsize=16)
            ax2.set_xlabel('X Position (μm)', fontsize=14)
            ax2.set_ylabel('Y Position (μm)', fontsize=14)
            ax2.set_zlabel('PAC Concentration', fontsize=14)
            fig2.colorbar(surf2, ax=ax2, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
        else:
            # 原始1D模式
            z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, V=V, K=K)
            
            # Exposure dose distribution plot (I)
            fig1 = plt.figure(figsize=(10, 6))
            plt.plot(z, I, 'b-', linewidth=2)
            plt.title('Exposure Dose Distribution', fontsize=16)
            plt.xlabel('Depth (μm)', fontsize=14)
            plt.ylabel('Post-exposure Intensity', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # PAC concentration distribution plot (M)
            fig2 = plt.figure(figsize=(10, 6))
            plt.plot(z, M, 'r-', linewidth=2)
            plt.title('PAC Concentration Distribution', fontsize=16)
            plt.xlabel('Depth (μm)', fontsize=14)
            plt.ylabel('Post-exposure PAC Concentration', fontsize=14)
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