import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from scipy.ndimage import gaussian_filter
import math

# 新增：全局字体设置，优先使用常见的无衬线字体
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans', 'Liberation Sans', 'SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示为方块的问题

def parse_phi_expr(phi_expr, t):
    try:
        safe_dict = {'sin': np.sin, 'cos': np.cos, 'pi': np.pi, 'e': np.e, 't': t, 'math': math}
        return eval(str(phi_expr), {"__builtins__": None}, safe_dict)
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
    
    def calculate_acid_generation(self, x, I_avg, V, K=None, t_exp=1, acid_gen_efficiency=1, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y=0):
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
            phi_expr: 相位表达式
            y: 位置的y坐标
            
        返回:
            初始光酸浓度分布数组
        """
        if sine_type == 'multi' and Kx is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
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
    
    def calculate_exposure_dose(self, x, I_avg, V, K, t_exp, sine_type='1d', Kx=None, Ky=None, phi_expr=None, y=0):
        if sine_type == 'multi' and Kx is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
        else:
            intensity = I_avg * (1 + V * np.cos(K * x))
        exposure_dose = intensity * t_exp
        return exposure_dose
    
    def generate_data(self, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast, sine_type='1d', Kx=None, Ky=None, phi_expr=None):
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
            phi_expr: 相位表达式
            
        返回:
            包含x坐标和各阶段y值的数据字典
        """
        # 创建坐标
        x = np.linspace(0, 10, 1000).tolist()  # 0到10微米，1000个点
        x_np = np.array(x)
        
        if sine_type == 'multi' and Kx is not None:
            initial_acid = self.calculate_acid_generation(x_np, I_avg, V, None, t_exp, acid_gen_efficiency, sine_type, Kx, Ky, phi_expr, y=0)
        else:
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
        return {
            'x': x,
            'initial_acid': initial_acid.tolist(),
            'diffused_acid': diffused_acid.tolist(),
            'deprotection': deprotection.tolist(),
            'thickness': thickness.tolist()
        }
    
    def generate_plots(self, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast, sine_type='1d', Kx=None, Ky=None, phi_expr=None):
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
            phi_expr: 相位表达式
            
        返回:
            包含多个Base64编码图像的字典
        """
        plt.close('all')
        # 创建坐标
        x = np.linspace(0, 10, 1000)  # 0到10微米，1000个点
        
        if sine_type == 'multi' and Kx is not None:
            initial_acid = self.calculate_acid_generation(x, I_avg, V, None, t_exp, acid_gen_efficiency, sine_type, Kx, Ky, phi_expr, y=0)
        else:
            initial_acid = self.calculate_acid_generation(x, I_avg, V, K, t_exp, acid_gen_efficiency)
        
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