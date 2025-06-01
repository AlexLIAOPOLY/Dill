import numpy as np
from scipy.integrate import odeint
import math
import matplotlib.pyplot as plt
from io import BytesIO
import base64

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

    def simulate(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_points=100, sine_type='1d', Kx=None, Ky=None, phi_expr=None, V=0, y=0):
        """
        用显式欧拉法在(z, t)二维网格上同步推进I(z, t)和M(z, t)，实现理论上更严谨的耦合积分。
        """
        A, B, C = self.get_abc(z_h, T, t_B)
        z = np.linspace(0, z_h, num_points)
        t_points = 200  # 时间步数
        t = np.linspace(0, t_exp, t_points)
        dz = z[1] - z[0]
        dt = t[1] - t[0]
        # 多维正弦波支持：I0可为I(x)分布
        if sine_type == 'multi' and Kx is not None:
            x = np.linspace(0, 10, num_points)
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            I0_arr = I0 * (1 + V * np.cos(Kx * x + Ky * y + phi))
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

    def generate_plots(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, phi_expr=None, V=0):
        """
        Generate exposure dose and PAC concentration distribution plots (English labels)
        """
        plt.close('all')
        z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V)
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