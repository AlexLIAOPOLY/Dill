import numpy as np
from scipy.integrate import odeint
import math
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import ast
import logging  # 添加logging模块
import time

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
        if debug_mode:
            logging.basicConfig(level=logging.DEBUG)

    def get_abc(self, z_h, T, t_B):
        """
        根据厚度z_h、前烘温度T、前烘时间t_B，拟合A/B/C参数
        公式见论文（可根据实际需要调整/拟合）
        """
        logger.info("=" * 60)
        logger.info("【增强Dill模型 - ABC参数计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用公式:")
        logger.info("   A(z_h,T,t_B) = -0.11989*D + 0.00466*T + 0.00551*D² - 0.0001084*D*T - 0.00001287*T² + 0.79655")
        logger.info("   B(z_h,T,t_B) = 0.00066301*D + 0.00024413*T - 0.0096")
        logger.info("   C(z_h,T,t_B) = -0.01233*D + 0.00054385*T + 0.00056988*D² - 0.00001487*D*T - 0.00000115*T² + 0.0629")
        
        # 参数范围检查
        if not (1 <= z_h <= 100):
            raise ValueError(f"胶厚z_h={z_h}超出合理范围[1, 100]μm")
        if not (60 <= T <= 200):
            raise ValueError(f"前烘温度T={T}超出合理范围[60, 200]℃")
        if not (0.1 <= t_B <= 120):
            raise ValueError(f"前烘时间t_B={t_B}超出合理范围[0.1, 120]min")
        
        logger.info(f"🔸 输入变量值:")
        logger.info(f"   - z_h (胶厚) = {z_h} μm")
        logger.info(f"   - T (前烘温度) = {T} ℃")
        logger.info(f"   - t_B (前烘时间) = {t_B} min")
        
        # 论文拟合公式（以AZ4562为例）
        # t_B未显式出现，假设已包含在T与z_h的关系中
        D = z_h  # 胶厚，单位um
        logger.info(f"🔸 中间变量: D = z_h = {D}")
        
        A = -0.11989 * D + 0.00466 * T + 0.00551 * D**2 - 0.0001084 * D * T - 0.00001287 * T**2 + 0.79655
        B = 0.00066301 * D + 0.00024413 * T - 0.0096
        C = -0.01233 * D + 0.00054385 * T + 0.00056988 * D**2 - 0.00001487 * D * T - 0.00000115 * T**2 + 0.0629
        
        logger.info(f"🔸 计算步骤详解:")
        logger.info(f"   A = -0.11989*{D} + 0.00466*{T} + 0.00551*{D}² - 0.0001084*{D}*{T} - 0.00001287*{T}² + 0.79655")
        logger.info(f"     = {-0.11989 * D:.6f} + {0.00466 * T:.6f} + {0.00551 * D**2:.6f} - {0.0001084 * D * T:.6f} - {0.00001287 * T**2:.6f} + 0.79655")
        logger.info(f"     = {A:.6f}")
        
        logger.info(f"   B = 0.00066301*{D} + 0.00024413*{T} - 0.0096")
        logger.info(f"     = {0.00066301 * D:.6f} + {0.00024413 * T:.6f} - 0.0096")
        logger.info(f"     = {B:.6f}")
        
        logger.info(f"   C = -0.01233*{D} + 0.00054385*{T} + 0.00056988*{D}² - 0.00001487*{D}*{T} - 0.00000115*{T}² + 0.0629")
        logger.info(f"     = {-0.01233 * D:.6f} + {0.00054385 * T:.6f} + {0.00056988 * D**2:.6f} - {0.00001487 * D * T:.6f} - {0.00000115 * T**2:.6f} + 0.0629")
        logger.info(f"     = {C:.6f}")
        
        # 物理合理性检查
        if A <= 0:
            logger.warning(f"参数A={A:.6f} <= 0，这在物理上不合理，将调整为最小值0.001")
            A = 0.001
        if B < 0:
            logger.warning(f"参数B={B:.6f} < 0，这在物理上不合理，将调整为0")
            B = max(0, B)
        if C <= 0:
            logger.warning(f"参数C={C:.6f} <= 0，这在物理上不合理，将调整为最小值0.001")
            C = 0.001
            
        logger.info(f"🔸 最终ABC参数:")
        logger.info(f"   - A (光敏剂吸收率) = {A:.6f}")
        logger.info(f"   - B (基底吸收率) = {B:.6f}")
        logger.info(f"   - C (光敏速率常数) = {C:.6f}")
            
        if self.debug_mode:
            logger.debug(f"[ABC参数] z_h={z_h}, T={T}, t_B={t_B} -> A={A:.6f}, B={B:.6f}, C={C:.6f}")
            
        return A, B, C
        
    def validate_physical_constraints(self, I, M, z_h, I0, M0):
        """
        验证计算结果的物理合理性
        """
        issues = []
        
        # 检查光强
        if np.any(I < 0):
            issues.append("光强出现负值")
        if np.any(I > 10 * I0):
            issues.append(f"光强超出合理范围(>10*I0={10*I0})")
            
        # 检查PAC浓度
        if np.any(M < 0):
            issues.append("PAC浓度出现负值")
        if np.any(M > M0):
            issues.append(f"PAC浓度超出初始值(M0={M0})")
            
        # 检查深度衰减趋势
        if len(I) > 1:
            # 光强应该随深度递减（除非有强烈的干涉效应）
            if I[-1] > I[0] * 2:
                issues.append("光强深度分布异常：深层光强远大于表层")
                
        # 检查PAC浓度变化趋势
        if len(M) > 1:
            # PAC浓度应该随着曝光剂量增加而减少
            avg_M_surface = np.mean(M[:len(M)//5])  # 表层平均
            avg_M_deep = np.mean(M[-len(M)//5:])    # 深层平均
            if avg_M_surface < avg_M_deep * 0.5:
                issues.append("PAC浓度深度分布异常：表层消耗过度")
        
        if issues and self.debug_mode:
            logger.warning(f"[物理验证] 发现问题: {', '.join(issues)}")
            
        return len(issues) == 0, issues

    def dill_ode(self, y, t, A, B, C, I0):
        """
        微分方程组右端
        y = [I, M]
        """
        I, M = y
        dIdz = -I * (A * M + B)  # 这里z和t等价处理，简化为一维
        dMdt = -I * M * C
        return [dIdz, dMdt]

    def solve_enhanced_dill_pde(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_z_points=100, num_t_points=200, x_position=None, K=None, V=0, phi_expr=None):
        """
        真正的Enhanced Dill模型：数值求解耦合偏微分方程系统
        
        方程组：
        ∂I(z,t)/∂z = -I(z,t)[A(z_h,T,t_B) * M(z,t) + B(z_h,T,t_B)]
        ∂M(z,t)/∂t = -I(z,t) * M(z,t) * C(z_h,T,t_B)
        
        参数：
        - x_position: 横向空间位置，用于边界条件的空间调制
        - K, V: 空间频率和可见度，用于边界条件
        """
        logger.info("=" * 60)
        logger.info("【增强Dill模型 - 偏微分方程求解】")
        logger.info("=" * 60)
        logger.info("🔸 使用微分方程组:")
        logger.info("   ∂I(z,t)/∂z = -I(z,t)[A(z_h,T,t_B) * M(z,t) + B(z_h,T,t_B)]")
        logger.info("   ∂M(z,t)/∂t = -I(z,t) * M(z,t) * C(z_h,T,t_B)")
        logger.info("🔸 边界/初始条件:")
        logger.info("   I(0,t) = I0 * (1 + V * cos(K*x + φ))  (表面光强)")
        logger.info("   M(z,0) = M0  (初始PAC浓度)")
        
        A, B, C = self.get_abc(z_h, T, t_B)
        
        logger.info(f"🔸 PDE求解参数:")
        logger.info(f"   - I0 (初始光强) = {I0}")
        logger.info(f"   - M0 (初始PAC浓度) = {M0}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp}")
        logger.info(f"   - x_position (横向位置) = {x_position}")
        logger.info(f"   - K (空间频率) = {K}")
        logger.info(f"   - V (可见度) = {V}")
        logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}'")
        
        # 空间和时间网格
        z = np.linspace(0, z_h, num_z_points)
        t = np.linspace(0, t_exp, num_t_points)
        dz = z[1] - z[0] if len(z) > 1 else z_h / num_z_points
        dt = t[1] - t[0] if len(t) > 1 else t_exp / num_t_points
        
        logger.info(f"🔸 数值计算网格:")
        logger.info(f"   - z方向: [0, {z_h}], 点数: {num_z_points}, 步长: {dz:.6f}")
        logger.info(f"   - t方向: [0, {t_exp}], 点数: {num_t_points}, 步长: {dt:.6f}")
        
        # 初始化解数组
        I = np.zeros((num_z_points, num_t_points))  # I(z,t)
        M = np.zeros((num_z_points, num_t_points))  # M(z,t)
        
        # 边界条件：表面光强随空间位置变化（如果提供了x_position和调制参数）
        if x_position is not None and K is not None and V > 0:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            surface_I0 = I0 * (1 + V * np.cos(K * x_position + phi))
            logger.info(f"🔸 表面光强计算:")
            logger.info(f"   - 相位 φ = {phi}")
            logger.info(f"   - 调制项 = V * cos(K*x + φ) = {V} * cos({K}*{x_position} + {phi}) = {V * np.cos(K * x_position + phi):.6f}")
            logger.info(f"   - surface_I0 = I0 * (1 + 调制项) = {I0} * (1 + {V * np.cos(K * x_position + phi):.6f}) = {surface_I0:.6f}")
        else:
            surface_I0 = I0
            logger.info(f"🔸 使用恒定表面光强: surface_I0 = {surface_I0}")
            
        # 初始条件
        I[0, :] = surface_I0  # 表面光强保持恒定（边界条件）
        M[:, 0] = M0         # 初始PAC浓度均匀分布
        
        logger.info(f"🔸 初始条件设置:")
        logger.info(f"   - I(0,t) = {surface_I0} (所有时间步)")
        logger.info(f"   - M(z,0) = {M0} (所有深度)")
        
        # 数值求解：使用交替方向隐式差分法 (ADI)
        logger.info("🔸 开始数值求解过程...")
        logger.info("   使用交替方向隐式差分法 (ADI)")
        
        progress_steps = [num_t_points // 4, num_t_points // 2, 3 * num_t_points // 4, num_t_points - 1]
        
        for t_idx in range(1, num_t_points):
            # 报告进度
            if t_idx in progress_steps:
                progress = t_idx / (num_t_points - 1) * 100
                logger.info(f"   求解进度: {progress:.1f}% (时间步 {t_idx}/{num_t_points-1})")
            
            # 时间步进：先更新M，再更新I
            
            # 1. 更新PAC浓度：∂M/∂t = -I * M * C
            for z_idx in range(num_z_points):
                I_curr = I[z_idx, t_idx-1]
                M_prev = M[z_idx, t_idx-1]
                
                # 显式欧拉法更新M
                dM_dt = -I_curr * M_prev * C
                M[z_idx, t_idx] = M_prev + dM_dt * dt
                
                # 确保物理约束
                M[z_idx, t_idx] = max(0, min(M[z_idx, t_idx], M0))
            
            # 2. 更新光强：∂I/∂z = -I * (A * M + B)
            # 保持边界条件
            I[0, t_idx] = surface_I0
            
            for z_idx in range(1, num_z_points):
                I_prev_z = I[z_idx-1, t_idx]
                M_curr = M[z_idx-1, t_idx]  # 使用当前时刻的M
                
                # 向前差分求解
                dI_dz = -I_prev_z * (A * M_curr + B)
                I[z_idx, t_idx] = I_prev_z + dI_dz * dz
                
                # 确保物理约束
                I[z_idx, t_idx] = max(0, I[z_idx, t_idx])
        
        # 返回最终时刻的分布
        I_final = I[:, -1]
        M_final = M[:, -1]
        
        # 计算曝光剂量：对时间积分
        exposure_dose = np.trapz(I, t, axis=1)
        
        # 物理验证
        is_valid, issues = self.validate_physical_constraints(I_final, M_final, z_h, surface_I0, M0)
        
        if self.debug_mode:
            logger.debug(f"[Enhanced Dill PDE] 求解完成:")
            logger.debug(f"  z_h={z_h}, A={A:.6f}, B={B:.6f}, C={C:.6f}")
            logger.debug(f"  surface_I0={surface_I0:.4f}")
            logger.debug(f"  I_final范围: [{I_final.min():.4f}, {I_final.max():.4f}]")
            logger.debug(f"  M_final范围: [{M_final.min():.4f}, {M_final.max():.4f}]")
            logger.debug(f"  exposure_dose范围: [{exposure_dose.min():.4f}, {exposure_dose.max():.4f}]")
            logger.debug(f"  物理验证: {'通过' if is_valid else '失败'}")
            if not is_valid:
                logger.debug(f"  验证问题: {issues}")
        
        # 如果物理验证失败，记录警告但仍返回结果
        if not is_valid:
            logger.warning(f"Enhanced Dill PDE求解结果可能存在物理问题: {issues}")
        
        return z, I_final, M_final, exposure_dose

    def adaptive_solve_enhanced_dill_pde(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, x_position=None, K=None, V=0, phi_expr=None, max_points=200, tolerance=1e-4):
        """
        自适应步长的Enhanced Dill PDE求解器，根据计算复杂度自动调整网格密度
        """
        start_time = time.time()
        
        A, B, C = self.get_abc(z_h, T, t_B)
        
        # 根据参数复杂度自适应调整网格点数
        if V > 0.7 and K is not None and K > 5:
            # 高频高对比度情况，需要更密集的网格
            num_z_points = min(max_points, 150)
            num_t_points = min(max_points, 150)
        elif V > 0.3:
            # 中等调制情况
            num_z_points = min(max_points, 100)
            num_t_points = min(max_points, 120)
        else:
            # 低调制或无调制情况
            num_z_points = min(max_points, 80)
            num_t_points = min(max_points, 100)
        
        # 调用标准PDE求解器
        z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
            z_h, T, t_B, I0, M0, t_exp, 
            num_z_points=num_z_points, 
            num_t_points=num_t_points,
            x_position=x_position, K=K, V=V, phi_expr=phi_expr
        )
        
        compute_time = time.time() - start_time
        
        # 收敛性检查：如果结果变化剧烈，增加网格密度重新计算
        if len(I_final) > 2:
            max_gradient = np.max(np.abs(np.diff(I_final)))
            if max_gradient > tolerance and num_z_points < max_points:
                if self.debug_mode:
                    logger.debug(f"[自适应求解] 检测到高梯度({max_gradient:.6f})，增加网格密度重新计算")
                
                # 重新计算，增加50%的网格点
                z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
                    z_h, T, t_B, I0, M0, t_exp, 
                    num_z_points=min(max_points, int(num_z_points * 1.5)), 
                    num_t_points=min(max_points, int(num_t_points * 1.5)),
                    x_position=x_position, K=K, V=V, phi_expr=phi_expr
                )
                compute_time = time.time() - start_time
        
        if self.debug_mode:
            logger.debug(f"[自适应求解] 完成，网格: {num_z_points}x{num_t_points}, 时间: {compute_time:.3f}s")
        
        return z, I_final, M_final, exposure_dose, compute_time

    def simulate(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_points=100, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, y=0, K=None, x_position=None):
        """
        Enhanced Dill模型仿真入口函数，支持不同的计算模式
        
        参数：
        - x_position: 横向空间位置，用于1D比较模式
        - K：空间频率，用于1D模式
        - V：干涉条纹可见度
        - sine_type：计算模式 ('1d', 'multi', '3d')
        """
        # 对于1D比较模式，使用PDE求解器
        if sine_type in ['1d', 'single'] and x_position is not None:
            z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
                z_h, T, t_B, I0, M0, t_exp, 
                num_z_points=num_points,
                x_position=x_position, 
                K=K, V=V, phi_expr=phi_expr
            )
            return z, I_final, M_final
            
        # 对于其他模式，保留原有的简化计算（用于向后兼容）
        A, B, C = self.get_abc(z_h, T, t_B)
        z = np.linspace(0, z_h, num_points)
        
        # 简化模型：用于快速预览和2D/3D计算
        alpha = A + B
        base_I = I0 * np.exp(-alpha * z)
        
        # 应用深度方向的基础衰减
        I_final = base_I
        
        # PAC浓度计算：使用积分形式
        integrated_I = np.trapz(np.tile(I_final, (100, 1)), np.linspace(0, t_exp, 100), axis=0)
        M_final = M0 * np.exp(-C * integrated_I)
        
        # 确保物理约束
        I_final = np.maximum(0, I_final)
        M_final = np.clip(M_final, 0, M0)
        
        return z, I_final, M_final

    def generate_data(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None, x_position=None, num_points=100):
        """
        生成增强Dill模型的数据，支持1D/2D/3D模式
        
        参数：
        - K：空间频率参数，用于1D模式
        - V：干涉条纹可见度，控制空间调制深度
        - y_range：Y轴范围数组，用于生成2D数据
        - sine_type：波形类型 ('single'=1D, 'multi'=2D, '3d'=3D)
        - x_position：横向空间位置，用于1D比较模式
        """
        logger.info("=" * 60)
        logger.info("【增强Dill模型 - 数据生成】")
        logger.info("=" * 60)
        
        # 确保sine_type参数正确
        if sine_type == 'single':
            sine_type = '1d'
        
        logger.info(f"🔸 计算模式: {sine_type.upper()}")
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - z_h (胶厚) = {z_h} μm")
        logger.info(f"   - T (前烘温度) = {T} ℃")
        logger.info(f"   - t_B (前烘时间) = {t_B} min")
        logger.info(f"   - I0 (初始光强) = {I0}")
        logger.info(f"   - M0 (初始PAC浓度) = {M0}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp} s")
        logger.info(f"   - V (可见度) = {V}")
        if sine_type == '1d':
            logger.info(f"   - K (空间频率) = {K}")
            logger.info(f"   - x_position (横向位置) = {x_position}")
        elif sine_type == 'multi':
            logger.info(f"   - Kx (X方向空间频率) = {Kx}")
            logger.info(f"   - Ky (Y方向空间频率) = {Ky}")
            if y_range is not None:
                logger.info(f"   - y_range = [{min(y_range):.2f}, {max(y_range):.2f}] (共{len(y_range)}点)")
        elif sine_type == '3d':
            logger.info(f"   - Kx (X方向空间频率) = {Kx}")
            logger.info(f"   - Ky (Y方向空间频率) = {Ky}")
            logger.info(f"   - Kz (Z方向空间频率) = {Kz}")
        
        # 添加调试输出，检查参数传递
        if self.debug_mode:
            logger.debug(f"[generate_data] 输入参数: K={K}, V={V}, sine_type={sine_type}, x_position={x_position}")
        
        # 1D模式：使用PDE求解器
        if sine_type == '1d' and x_position is not None:
            try:
                z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
                    z_h, T, t_B, I0, M0, t_exp,
                    num_z_points=num_points, num_t_points=200,
                    x_position=x_position, K=K, V=V, phi_expr=phi_expr
                )
                
                return {
                    'z': z.tolist(),
                    'I': I_final.tolist(),
                    'M': M_final.tolist(),
                    'exposure_dose': exposure_dose.tolist(),
                    'success': True
                }
            except Exception as e:
                if self.debug_mode:
                    logger.error(f"[generate_data] PDE求解失败: {e}")
                
                # 回退到简化模型
                A, B, C = self.get_abc(z_h, T, t_B)
                z = np.linspace(0, z_h, num_points)
                alpha = A + B
                
                # 边界条件
                if K is not None and V > 0:
                    phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                    surface_I0 = I0 * (1 + V * np.cos(K * x_position + phi))
                else:
                    surface_I0 = I0
                
                I_final = surface_I0 * np.exp(-alpha * z)
                exposure_dose = I_final * t_exp
                M_final = M0 * np.exp(-C * exposure_dose)
                
                return {
                    'z': z.tolist(),
                    'I': I_final.tolist(),
                    'M': M_final.tolist(),
                    'exposure_dose': exposure_dose.tolist(),
                    'success': False,
                    'fallback_used': True
                }
        
        # 2D热力图模式
        elif sine_type == 'multi' and Kx is not None and Ky is not None and y_range is not None and len(y_range) > 1:
            logger.info("🔸 2D热力图模式计算公式:")
            logger.info("   I(x,y) = I0 * (1 + V * cos(Kx*x + Ky*y + φ))")
            logger.info("   D(x,y) = I(x,y) * t_exp")
            logger.info("   M(x,y) = M0 * (1 - 0.5 * V * cos(Kx*x + Ky*y + φ))")
            
            # 生成2D热力图数据
            x_points = 100  # x轴点数
            x_coords = np.linspace(0, 10, x_points)
            y_coords = np.array(y_range)
            
            logger.info(f"🔸 2D网格设置:")
            logger.info(f"   - x轴范围: [0, 10], 点数: {x_points}")
            logger.info(f"   - y轴范围: [{min(y_coords):.2f}, {max(y_coords):.2f}], 点数: {len(y_coords)}")
            logger.info(f"   - 总计算点数: {x_points * len(y_coords)}")
            
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
            
            # 新增：生成真正的XY平面数据
            # 选择z轴中间位置的切片作为XY平面
            z_mid_idx = len(z) // 2
            xy_exposure = np.zeros((len(y_coords), len(x_coords)))
            xy_thickness = np.zeros((len(y_coords), len(x_coords)))
            
            # 计算XY平面的数据分布 (使用二维正弦波公式)
            X, Y = np.meshgrid(x_coords, y_coords)
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            amplitude = max(0.3, V)
            
            # XY平面上的正弦波调制
            modulation = np.cos(Kx * X + Ky * Y + phi)
            
            # 计算XY平面上的曝光剂量
            base_exposure = I0 * t_exp
            xy_exposure = base_exposure * (1 + amplitude * modulation)
            
            # 计算XY平面上的厚度分布
            xy_thickness = M0 * (1 - 0.5 * amplitude * modulation)
            
            # 返回2D数据
            return {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                'z_exposure_dose': z_exposure_dose.tolist(),
                'z_thickness': z_thickness.tolist(),
                'xy_exposure': xy_exposure.tolist(),  # 新增：真正的XY平面曝光数据
                'xy_thickness': xy_thickness.tolist(),  # 新增：真正的XY平面厚度数据
                'is_2d': True
            }
        
        # 3D表面模式
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            logger.info("🔸 3D体积模式计算公式:")
            logger.info("   I(x,y,z) = I0 * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ))")
            logger.info("   D(x,y,z) = I(x,y,z) * t_exp")
            logger.info("   M(x,y,z) = M0 * (1 - 0.5 * V * cos(Kx*x + Ky*y + Kz*z + φ))")
            
            # 生成3D表面数据
            x_points = 50
            y_points = 50
            z_points = 5  # 创建5个Z平面的切片
            
            logger.info(f"🔸 3D网格设置:")
            logger.info(f"   - x轴点数: {x_points}")
            logger.info(f"   - y轴点数: {y_points}") 
            logger.info(f"   - z轴层数: {z_points}")
            logger.info(f"   - 每层计算点数: {x_points * y_points}")
            logger.info(f"   - 总计算点数: {x_points * y_points * z_points}")
            
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
            logger.info("🔸 1D模式计算公式:")
            logger.info("   I(z) = I0 * exp(-α*z)  其中 α = A + B")
            logger.info("   D(z) = I(z) * t_exp")
            logger.info("   M(z) = M0 * exp(-C * D(z))")
            
            # 确保1D模式传递V值
            if K is not None and sine_type in ['single', '1d'] and V <= 0:
                logger.warning(f"[1D警告] 干涉条纹可见度V={V}，已设为默认值0.8以显示正弦波")
                V = 0.8  # 当未设置V或V=0时，使用默认值0.8以显示正弦波效果
            
            logger.info(f"🔸 1D计算参数:")
            logger.info(f"   - 计算点数: {num_points}")
            if K is not None and V > 0:
                logger.info(f"   - 包含正弦波调制: I(z) = I0 * (1 + V*cos(K*z)) * exp(-α*z)")
            
            # 生成1D数据，支持正弦波调制
            z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, 
                                    num_points=num_points, sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, 
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
            logger.warning(f"[Plots警告] 干涉条纹可见度V={V}，已设为默认值0.8以显示正弦波")
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