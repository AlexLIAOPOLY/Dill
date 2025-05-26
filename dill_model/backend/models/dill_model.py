import numpy as np
import matplotlib
# 设置Matplotlib后端为非交互式后端
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64

class DillModel:
    """
    Dill光刻胶模型计算类
    
    实现基于Dill模型的光刻胶曝光剂量分布和厚度分布计算
    """
    
    def __init__(self):
        pass
    
    def calculate_intensity_distribution(self, x, I_avg, V, K):
        """
        计算光强分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            
        返回:
            光强分布数组
        """
        return I_avg * (1 + V * np.cos(K * x))
    
    def calculate_exposure_dose(self, x, I_avg, V, K, t_exp):
        """
        计算曝光剂量分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            
        返回:
            曝光剂量分布数组
        """
        intensity = self.calculate_intensity_distribution(x, I_avg, V, K)
        exposure_dose = intensity * t_exp
        return exposure_dose
    
    def calculate_photoresist_thickness(self, x, I_avg, V, K, t_exp, C):
        """
        计算光刻胶厚度分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            
        返回:
            光刻胶厚度分布数组
        """
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp)
        # 简化的Dill模型计算光刻胶厚度
        # 实际中可能需要更复杂的模型，这里使用指数衰减模型
        thickness = np.exp(-C * exposure_dose)
        return thickness
    
    def generate_data(self, I_avg, V, K, t_exp, C):
        """
        生成曝光剂量和光刻胶厚度分布数据(用于交互式图表)
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            
        返回:
            包含x坐标和y值的数据字典
        """
        # 创建坐标
        x = np.linspace(0, 10, 1000).tolist()  # 0到10微米，1000个点
        
        # 计算曝光剂量
        exposure_dose = self.calculate_exposure_dose(np.array(x), I_avg, V, K, t_exp).tolist()
        
        # 计算光刻胶厚度
        thickness = self.calculate_photoresist_thickness(np.array(x), I_avg, V, K, t_exp, C).tolist()
        
        return {
            'x': x,
            'exposure_dose': exposure_dose,
            'thickness': thickness
        }
    
    def generate_plots(self, I_avg, V, K, t_exp, C):
        """
        生成曝光剂量和光刻胶厚度分布图
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            
        返回:
            包含两个Base64编码图像的字典
        """
        # 创建坐标
        x = np.linspace(0, 10, 1000)  # 0到10微米，1000个点
        
        # 计算曝光剂量
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp)
        
        # 计算光刻胶厚度
        thickness = self.calculate_photoresist_thickness(x, I_avg, V, K, t_exp, C)
        
        # 生成曝光剂量图
        fig1 = plt.figure(figsize=(10, 6))
        plt.plot(x, exposure_dose, 'b-', linewidth=2)
        plt.title('Exposure Dose Distribution', fontsize=16)
        plt.xlabel('Position (μm)', fontsize=14)
        plt.ylabel('Exposure Dose (mJ/cm²)', fontsize=14)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        # 将图形转换为Base64
        buffer1 = BytesIO()
        fig1.savefig(buffer1, format='png', dpi=100)
        buffer1.seek(0)
        exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
        plt.close(fig1)
        
        # 生成光刻胶厚度图
        fig2 = plt.figure(figsize=(10, 6))
        plt.plot(x, thickness, 'r-', linewidth=2)
        plt.title('Photoresist Thickness Distribution', fontsize=16)
        plt.xlabel('Position (μm)', fontsize=14)
        plt.ylabel('Relative Thickness', fontsize=14)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        # 将图形转换为Base64
        buffer2 = BytesIO()
        fig2.savefig(buffer2, format='png', dpi=100)
        buffer2.seek(0)
        thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
        plt.close(fig2)
        
        return {
            'exposure_plot': exposure_plot,
            'thickness_plot': thickness_plot
        } 