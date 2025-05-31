import numpy as np
from scipy.integrate import odeint
import math

def parse_phi_expr(phi_expr, t):
    try:
        safe_dict = {'sin': np.sin, 'cos': np.cos, 'pi': np.pi, 'e': np.e, 't': t, 'math': math}
        return eval(str(phi_expr), {"__builtins__": None}, safe_dict)
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

    def simulate(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_points=1000, sine_type='1d', Kx=None, Ky=None, phi_expr=None, V=0, y=0):
        """
        数值解增强Dill模型，返回曝光后各深度的M(z)、I(z)
        参数：
            z_h: 胶厚（um）
            T: 前烘温度（摄氏度）
            t_B: 前烘时间（分钟）
            I0: 入射光强（归一化）
            M0: 初始PAC浓度（归一化）
            t_exp: 曝光时间（秒）
            num_points: 计算点数
            sine_type: 光强分布类型，'1d'表示一维，'multi'表示多维
            Kx: 多维正弦波的Kx参数
            Ky: 多维正弦波的Ky参数
            phi_expr: 多维正弦波的phi表达式
            V: 多维正弦波的V参数
            y: 多维正弦波的y参数
        返回：
            z: 深度数组
            I: 曝光后各深度光强
            M: 曝光后各深度PAC浓度
        """
        A, B, C = self.get_abc(z_h, T, t_B)
        z = np.linspace(0, z_h, num_points)
        # 多维正弦波支持：I0可为I(x)分布
        if sine_type == 'multi' and Kx is not None:
            x = np.linspace(0, 10, num_points)
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            I0_arr = I0 * (1 + V * np.cos(Kx * x + Ky * y + phi))
        else:
            I0_arr = np.full(num_points, I0)
        def ode_z(y, z):
            I, M = y
            dIdz = -I * (A * M + B)
            return [dIdz, 0]
        # 对每个x点分别积分
        I_z = np.zeros(num_points)
        M_final = np.zeros(num_points)
        for i in range(num_points):
            y0 = [I0_arr[i], M0]
            sol_z = odeint(ode_z, y0, z)
            I_z[i] = sol_z[-1, 0]
            # t方向积分
            def ode_t(M, t):
                return -I_z[i] * M * C
            M_final[i] = odeint(ode_t, M0, [0, t_exp])[-1][0]
        return z, I_z, M_final

    def generate_data(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, phi_expr=None, V=0):
        """
        生成增强Dill模型的曝光后分布数据
        """
        z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V)
        return {
            'z': z.tolist(),
            'I': I.tolist(),
            'M': M.tolist()
        } 