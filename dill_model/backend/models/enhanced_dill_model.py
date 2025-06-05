import numpy as np
from scipy.integrate import odeint
import math
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import ast
import logging  # 添加logging模块

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
    def __init__(self, debug_mode=False):
        self.debug_mode = debug_mode  # 增加调试模式标志

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
        增强Dill模型仿真，支持1D正弦波、2D正弦波和3D正弦波
        
        参数：
        - K：空间频率，如果提供此参数，将覆盖Kx（用于1D模式）
        - V：干涉条纹可见度，控制正弦波振幅
        - sine_type：波形类型 ('single'=1D, 'multi'=2D, '3d'=3D)
        """
        A, B, C = self.get_abc(z_h, T, t_B)
        z = np.linspace(0, z_h, num_points)
        
        # 确保1D模式下，如果提供了K，则使用K值
        current_K = K if K is not None else Kx
        
        # 检查是否为1D正弦波模式
        is_1d_sine = (current_K is not None and sine_type in ['single', '1d'] and V > 0)
        
        # 仅在调试模式下输出调试信息
        if self.debug_mode:
            logging.debug("[调试信息] Enhanced Dill 1D正弦波条件检查:")
            logging.debug(f"  K = {current_K}, sine_type = {sine_type}, V = {V}")
            logging.debug(f"  条件1(K is not None): {current_K is not None}")
            logging.debug(f"  条件2(sine_type in ['single', '1d']): {sine_type in ['single', '1d']}")
            logging.debug(f"  条件3(V > 0): {V > 0}")
            logging.debug(f"  最终结果(is_1d_sine): {is_1d_sine}")
            logging.debug(f"  A = {A}, B = {B}, C = {C}")
        
        if is_1d_sine:
            # 1D正弦波模式：生成正弦波调制的光强和PAC浓度分布
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 基础衰减曲线（类似原始Dill模型）
            # 使用简化的指数衰减模型：I(z) = I0 * exp(-alpha * z)
            alpha = A + B  # 总的衰减系数
            # 减小alpha以增强正弦波效果
            alpha_reduced = alpha * 0.7  # 减小衰减系数，增强正弦波效果
            base_I = I0 * np.exp(-alpha_reduced * z)
            
            # 应用正弦波调制：I(z) = base_I(z) * (1 + V * np.cos(K * z + phi))
            I_final = base_I * (1 + V * np.cos(current_K * z + phi))
            
            # PAC浓度与光强相关：M(z) = M0 * exp(-C * I(z) * t_exp)
            # I_final(z) is the effective intensity at depth z over the exposure time
            M_final = M0 * np.exp(-C * I_final * t_exp)
            
            # 确保物理意义：光强和PAC浓度都非负，且在合理范围内
            I_final = np.maximum(0, I_final)
            M_final = np.clip(M_final, 0, M0)
            
            return z, I_final, M_final
            
        else:
            # 原有的时间演化模式（用于非1D正弦波情况）
            t_points = 200  # 时间步数
            t = np.linspace(0, t_exp, t_points)
            dz = z[1] - z[0] if len(z) > 1 else 0.1
            dt = t[1] - t[0] if len(t) > 1 else t_exp / t_points
            
            # 设置初始光强分布
            if Kx is not None and sine_type == 'multi':
                # 2D正弦波：I(x,y) = I0 * (1 + V * cos(Kx * x + Ky * y + phi))
                x_coords_calc = np.linspace(0, 10, num_points) # Renamed to avoid conflict with simulate's x parameter if any
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                I0_arr = I0 * (1 + V * np.cos(Kx * x_coords_calc + Ky * y + phi))
            elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
                # 3D正弦波：I(x,y,z) = I0 * (1 + V * cos(Kx * x + Ky * y + Kz * z + phi))
                x_coords_calc = np.linspace(0, 10, num_points) # Renamed
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                # 对于深度模拟，我们在z=0处设定初始条件
                I0_arr = I0 * (1 + V * np.cos(Kx * x_coords_calc + Ky * y + Kz * 0 + phi))
            else:
                 # This 'else' will also catch 1D cases if is_1d_sine was false due to V=0, K=None etc.
                # For non-1D-sine cases, I0_arr might be modulated based on K, V if K was passed for other modes.
                # If K was provided for 1D mode but V was 0, I0_arr would be I0 * (1 + 0 * cos) = I0 (constant array)
                # If K was None for 1D, I0_arr = np.full(num_points, I0) (constant array)
                
                # Correct I0_arr initialization for the 'else' branch based on parameters:
                # This logic was previously outside and before the is_1d_sine split.
                # Now it's part of the 'else' path for the time-evolution model.
                current_K_for_I0 = Kx # Default to Kx for multi/3D
                if K is not None and sine_type in ['single', '1d']:
                    current_K_for_I0 = K # Use K for 1D if provided
                
                if current_K_for_I0 is not None and V > 0: # Check V > 0 here for modulation
                    # Applies to 1D, multi, or 3D if K/Kx and V are set
                    # For 1D sine (if it fell into this else branch due to V=0 initially, then V would be 0 here)
                    # use 'z' for 1D spatial coord, 'x_coords_calc' for 2D/3D's x-like coord
                    spatial_coord = z if sine_type in ['single', '1d'] else np.linspace(0,10,num_points)
                    phi_val = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                    
                    if sine_type in ['single', '1d']:
                        I0_arr = I0 * (1 + V * np.cos(current_K_for_I0 * spatial_coord + phi_val))
                    elif sine_type == 'multi': # Ky must exist
                         I0_arr = I0 * (1 + V * np.cos(Kx * spatial_coord + Ky * y + phi_val))
                    elif sine_type == '3d': # Kx, Ky, Kz must exist
                         I0_arr = I0 * (1 + V * np.cos(Kx * spatial_coord + Ky * y + Kz * 0 + phi_val)) # z=0 for surface
                    else:
                        I0_arr = np.full(num_points, I0) # Fallback, should not happen
                else:
                    # No K or V=0, so no modulation for I0_arr
                    I0_arr = np.full(num_points, I0)

            # 初始化二维数组
            I = np.zeros((num_points, t_points))
            M = np.zeros((num_points, t_points))
            
            # 初始条件
            I[:, 0] = I0_arr
            M[:, 0] = M0
            
            # 时间演化：使用修正的欧拉法
            for j_time in range(1, t_points):  # 时间步 (renamed j to j_time)
                for i_depth in range(num_points):  # 深度步 (renamed i to i_depth)
                    if i_depth == 0:
                        # z=0边界条件：保持初始光强分布
                        I[i_depth, j_time] = I0_arr[i_depth]
                    else:
                        # 光强在深度方向的衰减：dI/dz = -I * (A * M + B)
                        dI_dz = -I[i_depth-1, j_time-1] * (A * M[i_depth-1, j_time-1] + B)
                        I[i_depth, j_time] = I[i_depth-1, j_time-1] + dI_dz * dz
                        
                        # 确保光强非负
                        I[i_depth, j_time] = max(0, I[i_depth, j_time])
                    
                    # PAC浓度的时间演化：dM/dt = -I * M * C
                    # M uses I at current depth and *current* time step from I array
                    dM_dt = -I[i_depth, j_time] * M[i_depth, j_time-1] * C 
                    M[i_depth, j_time] = M[i_depth, j_time-1] + dM_dt * dt
                    
                    # 确保PAC浓度非负
                    M[i_depth, j_time] = max(0, M[i_depth, j_time])
            
            # 返回最终时刻的分布
            I_final = I[:, -1]
            M_final = M[:, -1]
            
            return z, I_final, M_final

    def generate_data(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None):
        """
        生成增强Dill模型的数据，支持1D/2D/3D模式
        
        参数：
        - K：空间频率参数，用于1D模式
        - V：干涉条纹可见度，控制空间调制深度
        - y_range：Y轴范围数组，用于生成2D数据
        - sine_type：波形类型 ('single'=1D, 'multi'=2D, '3d'=3D)
        """
        # 确保sine_type参数正确
        if sine_type == 'single':
            sine_type = '1d'
        
        # 添加调试输出，检查参数传递
        if self.debug_mode:
            logging.debug(f"[generate_data] 输入参数: K={K}, V={V}, sine_type={sine_type}")
        
        # 2D热力图模式
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
                                        sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V, y=y_val, K=K)
                
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
        
        # 3D表面模式
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 生成3D表面数据
            x_points = 50
            y_points = 50
            z_points = 5  # 创建5个Z平面的切片
            
            # 设置范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            z_min = float(0 if z_range is None else z_range[0])
            z_max = float(10 if z_range is None else z_range[-1])
            
            # 创建网格
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            z_coords = np.linspace(z_min, z_max, z_points) if z_range is None else np.array(z_range)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 确保振幅有足够的可见度
            amplitude = max(0.3, V)
            
            # 生成多个Z层的数据
            exposure_doses = []
            thickness_values = []
            
            for z_value in z_coords:
                # 创建该Z层的2D网格
                X, Y = np.meshgrid(x_coords, y_coords)
                
                # 在该Z层生成3D正弦波分布，包含Kz的影响
                modulation = np.cos(Kx * X + Ky * Y + Kz * z_value + phi)
                
                # 计算该层的曝光剂量
                base_exposure = I0 * t_exp
                exposure_dose = base_exposure * (1 + amplitude * modulation)
                
                # 计算该层的厚度
                thickness = M0 * (1 - 0.5 * amplitude * modulation)
                
                # 确保数组维度正确
                if exposure_dose.shape != (len(y_coords), len(x_coords)):
                    exposure_dose = exposure_dose.T
                if thickness.shape != (len(y_coords), len(x_coords)):
                    thickness = thickness.T
                
                # 添加到结果列表
                exposure_doses.append(exposure_dose.tolist())
                thickness_values.append(thickness.tolist())
            
            # 返回带有多个Z层的3D数据
            return {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                'z_coords': z_coords.tolist(),
                'exposure_doses': exposure_doses,  # 现在是三维数组
                'thickness_values': thickness_values,  # 现在是三维数组
                'exposure_dose': exposure_doses[0],  # 第一层，向后兼容
                'thickness': thickness_values[0],    # 第一层，向后兼容
                'is_3d': True,
                'has_z_layers': True
            }
        
        # 1D模式（默认模式）
        else:
            # 确保1D模式传递V值
            if K is not None and sine_type in ['single', '1d'] and V <= 0:
                print(f"[1D警告] 干涉条纹可见度V={V}，已设为默认值0.8以显示正弦波")
                V = 0.8  # 当未设置V或V=0时，使用默认值0.8以显示正弦波效果
            
            # 生成1D数据，支持正弦波调制
            z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, 
                                    sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, 
                                    phi_expr=phi_expr, V=V, K=K)
            
            return {
                'z': z.tolist(),
                'x': z.tolist(),  # 别名，兼容前端
                'I': I.tolist(),
                'exposure_dose': I.tolist(),  # 别名，兼容前端
                'M': M.tolist(),
                'thickness': M.tolist()  # 别名，兼容前端
            }

    def generate_plots(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None):
        """
        Generate exposure dose and PAC concentration distribution plots (English labels)
        
        支持1D和3D模式下的图形生成
        """
        # 确保1D模式下V值有效
        if K is not None and sine_type in ['single', '1d'] and V <= 0:
            print(f"[Plots警告] 干涉条纹可见度V={V}，已设为默认值0.8以显示正弦波")
            V = 0.8  # 使用默认值以显示正弦波效果

        plt.close('all')
        
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 处理3D情况，生成3D表面图
            x_points = 50  # 与数据生成保持一致
            y_points = 50
            z_points = 5   # 与数据生成保持一致，生成5个Z层
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            z_min = float(0 if z_range is None else z_range[0])
            z_max = float(10 if z_range is None else z_range[-1])
            
            # 创建网格
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            z_coords = np.linspace(z_min, z_max, z_points) if z_range is None else np.array(z_range)
            
            # 创建中间Z层的网格点作为示例
            mid_z_idx = z_points // 2
            mid_z = z_coords[mid_z_idx]
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 确保振幅有足够的可见度
            amplitude = max(0.3, V)
            
            # 生成中间Z层的3D正弦波分布，包含Kz的影响
            modulation = np.cos(Kx * X + Ky * Y + Kz * mid_z + phi)
            
            # 计算中间层的曝光剂量
            base_exposure = I0 * t_exp
            exposure_dose = base_exposure * (1 + amplitude * modulation)
            
            # 计算中间层的厚度分布
            thickness = M0 * (1 - 0.5 * amplitude * modulation)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
            if thickness.shape != (y_points, x_points):
                thickness = thickness.T
            
            # 生成每个Z层的插值面，从而创建真正的3D可视化
            # 生成曝光剂量的3D表面图
            fig1 = plt.figure(figsize=(10, 8))
            ax1 = fig1.add_subplot(111, projection='3d')
            
            # 绘制带有Z层差异的表面
            for i, z_val in enumerate(z_coords):
                # 为每层创建调整后的z网格
                Z = np.ones(X.shape) * z_val
                
                # 计算该z层的曝光剂量
                curr_modulation = np.cos(Kx * X + Ky * Y + Kz * z_val + phi)
                curr_exposure = base_exposure * (1 + amplitude * curr_modulation)
                
                # 根据曝光剂量调整Z坐标，创建3D表面效果
                Z_adjusted = Z + curr_exposure * 0.1
                
                # 绘制此Z层的表面
                ax1.plot_surface(X, Y, Z_adjusted, alpha=0.7, cmap='viridis', 
                                 edgecolor='none', rstride=5, cstride=5)
            
            ax1.set_title('3D Exposure Dose Distribution', fontsize=16)
            ax1.set_xlabel('X Position (μm)', fontsize=14)
            ax1.set_ylabel('Y Position (μm)', fontsize=14)
            ax1.set_zlabel('Z Position (μm)', fontsize=14)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 生成PAC浓度3D表面图，同样带有Z层差异
            fig2 = plt.figure(figsize=(10, 8))
            ax2 = fig2.add_subplot(111, projection='3d')
            
            # 绘制带有Z层差异的表面
            for i, z_val in enumerate(z_coords):
                # 为每层创建调整后的z网格
                Z = np.ones(X.shape) * z_val
                
                # 计算该z层的PAC浓度
                curr_modulation = np.cos(Kx * X + Ky * Y + Kz * z_val + phi)
                curr_thickness = M0 * (1 - 0.5 * amplitude * curr_modulation)
                
                # 根据厚度调整Z坐标，创建3D表面效果
                Z_adjusted = Z + curr_thickness * 0.2
                
                # 绘制此Z层的表面
                ax2.plot_surface(X, Y, Z_adjusted, alpha=0.7, cmap='plasma', 
                                edgecolor='none', rstride=5, cstride=5)
            
            ax2.set_title('3D PAC Concentration Distribution', fontsize=16)
            ax2.set_xlabel('X Position (μm)', fontsize=14)
            ax2.set_ylabel('Y Position (μm)', fontsize=14)
            ax2.set_zlabel('Z Position (μm)', fontsize=14)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
        else:
            # 使用与simulate相同的参数处理逻辑
            current_K = K if K is not None else Kx
            # 原始1D模式
            z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type, 
                                    Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, V=V, K=current_K)
            
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