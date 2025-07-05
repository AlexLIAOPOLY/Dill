# -*- coding: utf-8 -*-
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
    
    核心公式 (根据PDF文档):
    - M = e^(-CIt)  (方程 2.7)
    - cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹  (方程 2.8)
    - Dc = 2D₀[1-Γcos(πd)]  (临界剂量)
    
    其中:
    - M: 归一化PAC浓度
    - C: 光敏速率常数
    - I: 光强度
    - t: 曝光时间
    - d: 占空比
    - Γ: 对比度参数
    - Dc: 临界剂量
    - D₀: 实际曝光剂量
    """
    
    def __init__(self):
        pass
    
    def calculate_duty_cycle_parameters(self, exposure_dose, D0, gamma=1.0):
        """
        计算占空比相关参数
        
        根据PDF文档方程(2.8): cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹
        
        参数:
            exposure_dose: 实际曝光剂量数组
            D0: 参考曝光剂量
            gamma: 对比度参数Γ
            
        返回:
            duty_cycle: 占空比数组
            critical_dose: 临界剂量数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 占空比计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用公式: cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹")
        logger.info("🔸 以及: Dc = 2D₀[1-Γcos(πd)]")
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - D₀ (参考曝光剂量) = {D0}")
        logger.info(f"   - Γ (对比度参数) = {gamma}")
        
        # 计算临界剂量 Dc，假设为清除光刻胶所需的最小剂量
        # 对于正性光刻胶，Dc通常为D0的某个倍数
        critical_dose = 0.8 * exposure_dose  # 简化假设
        
        # 根据方程(2.8)计算占空比
        # cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹
        cos_pi_d = (1.0 / gamma) - (critical_dose / (2.0 * gamma * D0))
        
        # 确保cos值在有效范围内
        cos_pi_d = np.clip(cos_pi_d, -1.0, 1.0)
        
        # 计算占空比 d = arccos(cos_pi_d) / π
        duty_cycle = np.arccos(cos_pi_d) / np.pi
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 占空比范围: [{np.min(duty_cycle):.4f}, {np.max(duty_cycle):.4f}]")
        logger.info(f"   - 临界剂量范围: [{np.min(critical_dose):.4f}, {np.max(critical_dose):.4f}]")
        
        return duty_cycle, critical_dose
    
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
            
            # 参数检查和默认值设置
            if Kx is None:
                Kx = K if K is not None else 1.0
                logger.warning(f"🔸 Kx为None，使用默认值: {Kx}")
            if Ky is None:
                Ky = K if K is not None else 1.0
                logger.warning(f"🔸 Ky为None，使用默认值: {Ky}")
            
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
            
            # 参数检查和默认值设置
            if Kx is None:
                Kx = K if K is not None else 1.0
                logger.warning(f"🔸 Kx为None，使用默认值: {Kx}")
            if Ky is None:
                Ky = K if K is not None else 1.0
                logger.warning(f"🔸 Ky为None，使用默认值: {Ky}")
            if Kz is None:
                Kz = K if K is not None else 1.0
                logger.warning(f"🔸 Kz为None，使用默认值: {Kz}")
            
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
            
            # 参数检查和默认值设置
            if K is None:
                K = 1.0
                logger.warning(f"🔸 K为None，使用默认值: {K}")
            
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
        现在包含对比度阈值机制，更符合真实光刻胶行为
        
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
        logger.info("🔸 使用改进的对比度阈值模型")
        logger.info("🔸 基础公式: M(x) = exp(-C * D(x))")
        logger.info("🔸 高对比度时引入阈值效应")
        logger.info(f"🔸 输入变量值:")
        logger.info(f"   - C (光敏速率常数) = {C}")
        logger.info(f"   - V (对比度) = {V}")
        
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type, Kx, Ky, Kz, phi_expr, y, z)
        
        # 计算基础厚度（指数衰减模型）
        basic_thickness = np.exp(-C * exposure_dose)
        
        # 对比度阈值机制 - 统一使用 Sigmoid 函数方式
        # 计算曝光阈值（基于平均曝光剂量和对比度）
        avg_dose = np.mean(exposure_dose)
        
        # 阈值随对比度增加而更明显
        # V=0.5时轻微阈值效应，V→1.0时强阈值效应
        # 对于 V < 0.5，也使用相同的 Sigmoid 函数，但效果会更平缓
        threshold_sharpness = max(0.1, (V - 0.5) * 10)  # 至少0.1，避免过于平缓
        
        # 使用Sigmoid函数实现阈值效应
        # 当V较大时，transition变得更锐利
        dose_threshold = avg_dose
        thickness = 1.0 / (1.0 + np.exp(threshold_sharpness * (exposure_dose - dose_threshold)))
        
        # 在低dose区域保持接近1.0的厚度（未曝光状态）
        # 在高dose区域快速衰减到接近0（完全曝光状态）
        
        logger.info(f"🔸 统一使用Sigmoid阈值效应 (V={V:.3f})")
        logger.info(f"   - Sigmoid阈值: {dose_threshold:.4f}")
        logger.info(f"   - 阈值锐度: {threshold_sharpness:.2f}")
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 光刻胶厚度范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
        logger.info(f"   - 光刻胶厚度平均值: {np.mean(thickness):.6f}")
        logger.info("   注: 厚度值为归一化值，1.0表示未曝光区域，0.0表示完全曝光区域")
        
        return thickness
    
    def calculate_enhanced_photoresist_thickness(self, x, I_avg, V, K=None, t_exp=1, C=0.01, 
                                               gamma=1.0, enable_duty_cycle=False, 
                                               sine_type='1d', Kx=None, Ky=None, Kz=None, 
                                               phi_expr=None, y=0, z=0):
        """
        计算增强的光刻胶厚度分布，包含占空比和临界剂量概念
        现在包含对比度阈值机制，更符合真实光刻胶行为
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            gamma: 对比度参数Γ
            enable_duty_cycle: 是否启用占空比计算
            sine_type: 正弦波类型
            其他参数: 与原方法相同
            
        返回:
            包含厚度、占空比、临界剂量等信息的字典
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 增强光刻胶厚度计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用改进的对比度阈值模型")
        logger.info("🔸 核心公式: M(x) = exp(-C * D(x))")
        logger.info("🔸 根据PDF文档方程(2.7): M = e^(-CIt)")
        logger.info("🔸 高对比度时引入阈值效应")
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - C (光敏速率常数) = {C}")
        logger.info(f"   - Γ (对比度参数) = {gamma}")
        logger.info(f"   - V (干涉可见度) = {V}")
        logger.info(f"   - 启用占空比计算 = {enable_duty_cycle}")
        
        # 计算基础曝光剂量
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type, Kx, Ky, Kz, phi_expr, y, z)
        
        # 计算基础厚度（指数衰减模型）
        basic_thickness = np.exp(-C * exposure_dose)
        
        # 对比度阈值机制 - 统一使用 Sigmoid 函数方式
        # 计算曝光阈值（基于平均曝光剂量和对比度）
        avg_dose = np.mean(exposure_dose)
        
        # 阈值随对比度增加而更明显
        # V=0.5时轻微阈值效应，V→1.0时强阈值效应
        # 对于 V < 0.5，也使用相同的 Sigmoid 函数，但效果会更平缓
        threshold_sharpness = max(0.1, (V - 0.5) * 10)  # 至少0.1，避免过于平缓
        
        # 使用Sigmoid函数实现阈值效应
        dose_threshold = avg_dose
        thickness = 1.0 / (1.0 + np.exp(threshold_sharpness * (exposure_dose - dose_threshold)))
        
        # 在低dose区域保持接近1.0的厚度（未曝光状态）
        # 在高dose区域快速衰减到接近0（完全曝光状态）
        
        logger.info(f"🔸 统一使用Sigmoid阈值效应 (V={V:.3f})")
        logger.info(f"   - Sigmoid阈值: {dose_threshold:.4f}")
        logger.info(f"   - 阈值锐度: {threshold_sharpness:.2f}")
        
        result = {
            'x': x,
            'thickness': thickness,
            'exposure_dose': exposure_dose,
            'gamma': gamma,
            'C': C
        }
        
        # 如果启用占空比计算
        if enable_duty_cycle:
            D0 = np.mean(exposure_dose)  # 使用平均曝光剂量作为参考
            duty_cycle, critical_dose = self.calculate_duty_cycle_parameters(exposure_dose, D0, gamma)
            
            result.update({
                'duty_cycle': duty_cycle,
                'critical_dose': critical_dose,
                'D0': D0,
                'enable_duty_cycle': True
            })
            
            logger.info("🔸 占空比分析:")
            logger.info(f"   - 参考剂量D₀ = {D0:.4f}")
            logger.info(f"   - 平均占空比 = {np.mean(duty_cycle):.4f}")
            logger.info(f"   - 平均临界剂量 = {np.mean(critical_dose):.4f}")
        else:
            result['enable_duty_cycle'] = False
        
        logger.info(f"🔸 最终计算结果:")
        logger.info(f"   - 光刻胶厚度范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
        logger.info(f"   - 光刻胶厚度平均值: {np.mean(thickness):.6f}")
        logger.info("   注: 厚度值为归一化值，1.0表示未曝光区域，0.0表示完全曝光区域")
        
        return result

    def generate_data(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None, enable_4d_animation=False, t_start=0, t_end=5, time_steps=20, x_min=0, x_max=10):
        """
        生成数据，支持一维、二维、三维正弦波和4D动画
        
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
            enable_4d_animation: 是否启用4D动画
            t_start: 动画开始时间
            t_end: 动画结束时间
            time_steps: 时间步数
            
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
        logger.info(f"   - enable_4d_animation = {enable_4d_animation}")
        
        x_axis_points = np.linspace(0, 10, 1000)
        
        # 三维正弦波处理
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            logger.info(f"🔸 三维正弦波数据生成")
            
            # 设置3D网格参数，使用传入的坐标范围
            x_points = 50
            y_points = 50
            z_points = 50
            
            # 使用传入的x坐标范围
            x_min_val = float(x_min)
            x_max_val = float(x_max)
            y_min_val = float(0 if y_range is None else y_range[0])
            y_max_val = float(10 if y_range is None else y_range[-1])
            z_min_val = float(0 if z_range is None else z_range[0])
            z_max_val = float(10 if z_range is None else z_range[-1])
            
            logger.info(f"🔸 3D网格坐标范围:")
            logger.info(f"   - X: [{x_min_val:.2f}, {x_max_val:.2f}]")
            logger.info(f"   - Y: [{y_min_val:.2f}, {y_max_val:.2f}]")
            logger.info(f"   - Z: [{z_min_val:.2f}, {z_max_val:.2f}]")
            
            x_coords = np.linspace(x_min_val, x_max_val, x_points)
            y_coords = np.linspace(y_min_val, y_max_val, y_points) if y_range is None else np.array(y_range[:y_points])
            z_coords = np.linspace(z_min_val, z_max_val, z_points) if z_range is None else np.array(z_range[:z_points])
            
            # 检查是否启用4D动画
            if enable_4d_animation:
                logger.info(f"🔸 3D模式4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                logger.info(f"   - 3D网格大小: {x_points}×{y_points}×{z_points}")
                
                time_array = np.linspace(t_start, t_end, time_steps)
                
                animation_data = {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'z_coords': z_coords.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'exposure_dose_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': '3d',
                    'is_3d': True
                }
                
                # 创建3D网格
                X, Y, Z = np.meshgrid(x_coords, y_coords, z_coords, indexing='ij')
                
                for t_idx, t in enumerate(time_array):
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    # 修正：使用完整的3D Dill模型公式
                    # I(x,y,z,t) = I_avg * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ(t)))
                    modulation_t = np.cos(Kx * X + Ky * Y + Kz * Z + phi_t)
                    intensity_t = I_avg * (1 + V * modulation_t)
                    
                    # 调试信息：验证相位变化
                    if t_idx < 3:  # 只打印前几帧
                        logger.info(f"   - 帧{t_idx}: t={t:.2f}s, φ(t)={phi_t:.4f}")
                        logger.info(f"     3D强度范围=[{intensity_t.min():.4f}, {intensity_t.max():.4f}]")
                        logger.info(f"     3D网格形状: {intensity_t.shape}")
                    
                    exposure_dose_t = intensity_t * t_exp
                    thickness_t = np.exp(-C * exposure_dose_t)
                    
                    # 将3D数据转换为嵌套列表格式，便于前端处理
                    # 格式: [[[z0_values], [z1_values], ...], ...]
                    try:
                        exposure_3d_frame = intensity_t.tolist()
                        thickness_3d_frame = thickness_t.tolist()
                        
                        # 验证数据结构
                        if t_idx == 0:  # 只在第一帧打印详细信息
                            logger.info(f"   - 4D帧数据结构验证:")
                            logger.info(f"     exposure_3d_frame类型: {type(exposure_3d_frame)}")
                            logger.info(f"     exposure_3d_frame维度: {len(exposure_3d_frame)}x{len(exposure_3d_frame[0]) if exposure_3d_frame else 0}x{len(exposure_3d_frame[0][0]) if exposure_3d_frame and exposure_3d_frame[0] else 0}")
                        
                    except Exception as e:
                        logger.error(f"   - 4D帧{t_idx}数据转换失败: {str(e)}")
                        exposure_3d_frame = intensity_t.flatten().tolist()
                        thickness_3d_frame = thickness_t.flatten().tolist()
                    
                    animation_data['exposure_dose_frames'].append(exposure_3d_frame)
                    animation_data['thickness_frames'].append(thickness_3d_frame)
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 3D计算完成")
                
                logger.info(f"🔸 Dill模型3D-4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 静态3D数据生成 - 生成完整的3D数据而不是2D切片
                logger.info("🔸 生成完整3D静态数据...")
                
                # 创建完整的3D网格
                X_grid, Y_grid, Z_grid = np.meshgrid(x_coords, y_coords, z_coords, indexing='ij')
                
                logger.info(f"   - 3D网格形状: X={X_grid.shape}, Y={Y_grid.shape}, Z={Z_grid.shape}")
                
                # 计算完整3D空间的光强分布
                phi_val = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                modulation_3d = np.cos(Kx * X_grid + Ky * Y_grid + Kz * Z_grid + phi_val)
                intensity_3d = I_avg * (1 + V * modulation_3d)
                
                logger.info(f"   - 3D光强计算完成，范围: [{intensity_3d.min():.4f}, {intensity_3d.max():.4f}]")
                
                # 计算3D曝光剂量和厚度分布
                exposure_dose_3d = intensity_3d * t_exp
                thickness_3d = np.exp(-C * exposure_dose_3d)
                
                logger.info(f"   - 3D曝光剂量范围: [{exposure_dose_3d.min():.4f}, {exposure_dose_3d.max():.4f}]")
                logger.info(f"   - 3D厚度范围: [{thickness_3d.min():.4f}, {thickness_3d.max():.4f}]")

                # 返回完整的3D数据，使用嵌套列表格式便于前端处理
                try:
                    exposure_3d_list = exposure_dose_3d.tolist()
                    thickness_3d_list = thickness_3d.tolist()
                    
                    logger.info(f"   - 3D数据转换为列表格式完成")
                    logger.info(f"   - 曝光剂量数据维度: {len(exposure_3d_list)}×{len(exposure_3d_list[0])}×{len(exposure_3d_list[0][0])}")
                    logger.info(f"   - 厚度数据维度: {len(thickness_3d_list)}×{len(thickness_3d_list[0])}×{len(thickness_3d_list[0][0])}")
                    
                except Exception as e:
                    logger.error(f"   - 3D数据转换失败: {str(e)}")
                    # 备用方案：返回扁平化数据
                    exposure_3d_list = exposure_dose_3d.flatten().tolist()
                    thickness_3d_list = thickness_3d.flatten().tolist()
                    logger.info(f"   - 使用备用方案：扁平化数据")

                return {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'z_coords': z_coords.tolist(),
                    'exposure_dose': exposure_3d_list,
                    'thickness': thickness_3d_list,
                    'is_3d': True,
                    'is_2d': False,
                    'sine_type': '3d',
                    'data_shape': [len(x_coords), len(y_coords), len(z_coords)],
                    'is_row_major': True,  # 明确告知前端数据是行主序
                    'phi_value': phi_val  # 记录使用的相位值
                }

        # 二维正弦波处理  
        elif sine_type == 'multi' and Kx is not None and Ky is not None:
            logger.info(f"🔸 二维正弦波数据生成")
            
            y_axis_points = np.array(y_range) if y_range is not None else np.linspace(0, 10, 100)
            
            if enable_4d_animation:
                logger.info(f"🔸 2D模式4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                
                time_array = np.linspace(t_start, t_end, time_steps)
                
                animation_data = {
                    'x_coords': x_axis_points.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'exposure_dose_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': 'multi',
                    'is_2d': True
                }
                
                for t_idx, t in enumerate(time_array):
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    exposure_dose_2d = []
                    thickness_2d = []
                    
                    for y in y_axis_points:
                        intensity_line = I_avg * (1 + V * np.cos(Kx * x_axis_points + Ky * y + phi_t))
                        exposure_dose_line = intensity_line * t_exp
                        thickness_line = np.exp(-C * exposure_dose_line)
                        
                        exposure_dose_2d.append(exposure_dose_line.tolist())
                        thickness_2d.append(thickness_line.tolist())
                    
                    animation_data['exposure_dose_frames'].append(exposure_dose_2d)
                    animation_data['thickness_frames'].append(thickness_2d)
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 计算完成")
                
                logger.info(f"🔸 Dill模型2D-4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 静态2D数据生成
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                
                X_grid, Y_grid = np.meshgrid(x_axis_points, y_axis_points)
                exposure_dose_2d = I_avg * (1 + V * np.cos(Kx * X_grid + Ky * Y_grid + phi)) * t_exp
                thickness_2d = np.exp(-C * exposure_dose_2d)
                
                return {
                    'x_coords': x_axis_points.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'z_exposure_dose': exposure_dose_2d.tolist(),
                    'z_thickness': thickness_2d.tolist(),
                    'is_2d': True
                }
        
        # 一维正弦波处理
        else:
            logger.info(f"🔸 一维正弦波数据生成")
            
            if enable_4d_animation:
                logger.info(f"🔸 1D模式4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                
                time_array = np.linspace(t_start, t_end, time_steps)
                
                animation_data = {
                    'x_coords': x_axis_points.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'exposure_dose_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': '1d',
                    'is_1d': True
                }
                
                for t_idx, t in enumerate(time_array):
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    intensity_t = I_avg * (1 + V * np.cos(K * x_axis_points + phi_t))
                    exposure_dose_t = intensity_t * t_exp
                    thickness_t = np.exp(-C * exposure_dose_t)
                    
                    animation_data['exposure_dose_frames'].append(exposure_dose_t.tolist())
                    animation_data['thickness_frames'].append(thickness_t.tolist())
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 计算完成")
                
                logger.info(f"🔸 Dill模型1D-4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 静态1D数据生成
                logger.info(f"🔸 正在计算一维曝光剂量分布...")
                exposure_dose = self.calculate_exposure_dose(x_axis_points, I_avg, V, K, t_exp, sine_type, Kx, Ky, Kz, phi_expr)
                
                logger.info(f"🔸 正在计算一维光刻胶厚度分布...")
                thickness = self.calculate_photoresist_thickness(x_axis_points, I_avg, V, K, t_exp, C, sine_type, Kx, Ky, Kz, phi_expr)
                
                logger.info(f"🔸 一维数据生成完成")
                logger.info(f"   - X坐标点数: {len(x_axis_points)}")
                logger.info(f"   - 曝光剂量范围: [{np.min(exposure_dose):.6f}, {np.max(exposure_dose):.6f}]")
                logger.info(f"   - 光刻胶厚度范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
                
                return {
                    'x': x_axis_points.tolist(),
                    'exposure_dose': exposure_dose.tolist(),
                    'thickness': thickness.tolist()
                }

    def generate_plots(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None, enable_4d_animation=False, t_start=0, t_end=5, time_steps=20, x_min=0, x_max=10):
        """
        生成图表数据的包装器方法
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型
            Kx, Ky, Kz: 空间频率分量
            phi_expr: 相位表达式
            y_range, z_range: 坐标范围
            enable_4d_animation: 是否启用4D动画
            t_start, t_end: 时间范围
            time_steps: 时间步数
            x_min, x_max: x轴范围
            
        返回:
            包含图表数据的字典
        """
        logger.info("🎯 调用DillModel.generate_plots方法")
        return self.generate_data(I_avg, V, K, t_exp, C, sine_type, Kx, Ky, Kz, phi_expr, y_range, z_range, enable_4d_animation, t_start, t_end, time_steps, x_min, x_max)

    def generate_1d_animation_data(self, I_avg, V, K, t_exp_start, t_exp_end, time_steps, C):
        """
        生成1D时间动画数据
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp_start: 开始曝光时间
            t_exp_end: 结束曝光时间
            time_steps: 时间步数
            C: 光刻胶光敏速率常数
            
        返回:
            包含动画数据的字典
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 1D时间动画数据生成】")
        logger.info("=" * 60)
        logger.info(f"🔸 曝光时间范围: {t_exp_start}s - {t_exp_end}s")
        logger.info(f"🔸 时间步数: {time_steps}")
        logger.info(f"🔸 其他参数: I_avg={I_avg}, V={V}, K={K}, C={C}")
        
        # 生成x坐标
        x = np.linspace(0, 10, 100)
        
        # 生成时间序列
        time_values = np.linspace(t_exp_start, t_exp_end, time_steps)
        
        # 为每个时间点生成数据
        animation_frames = []
        for i, t_exp in enumerate(time_values):
            # 计算当前时间点的曝光剂量和厚度分布
            exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type='1d')
            thickness = self.calculate_photoresist_thickness(x, I_avg, V, K, t_exp, C, sine_type='1d')
            
            frame_data = {
                't_exp': float(t_exp),
                'x_coords': x.tolist(),
                'exposure_data': exposure_dose.tolist(),
                'thickness_data': thickness.tolist(),
                'frame_index': i
            }
            animation_frames.append(frame_data)
            
            logger.info(f"✅ 生成第 {i+1}/{time_steps} 帧 (t_exp={t_exp:.2f}s)")
        
        # 返回动画数据结构（移除会覆盖静态数据的兼容性字段）
        result = {
            'model_type': 'dill',
            'sine_type': '1d',
            'is_animation': True,
            'animation_type': '1d_time',
            'time_steps': time_steps,
            'time_values': time_values.tolist(),
            'frames': animation_frames,
            'x_coords': x.tolist()
            # 注意：移除了exposure_data, thickness_data, exposure_dose, thickness字段
            # 这些字段应该来自基于用户当前t_exp的静态数据，而不是动画数据
        }
        
        logger.info(f"🎬 1D时间动画数据生成完成，共{time_steps}帧")
        return result

    def generate_1d_v_animation_data(self, I_avg, V_start, V_end, time_steps, K, t_exp, C):
        """
        生成1D V（对比度）评估动画数据
        
        参数:
            I_avg: 平均入射光强度
            V_start: 开始V值（对比度）
            V_end: 结束V值（对比度）
            time_steps: V值步数
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            C: 光刻胶光敏速率常数
            
        返回:
            包含V评估动画数据的字典
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 1D V（对比度）评估数据生成】")
        logger.info("=" * 60)
        logger.info(f"🔸 V值范围: {V_start} - {V_end}")
        logger.info(f"🔸 V值步数: {time_steps}")
        logger.info(f"🔸 其他参数: I_avg={I_avg}, K={K}, t_exp={t_exp}, C={C}")
        
        # 生成x坐标
        x = np.linspace(0, 10, 100)
        
        # 生成V值序列
        v_values = np.linspace(V_start, V_end, time_steps)
        
        # 为每个V值生成数据
        animation_frames = []
        for i, v_val in enumerate(v_values):
            # 计算当前V值的曝光剂量和厚度分布
            exposure_dose = self.calculate_exposure_dose(x, I_avg, v_val, K, t_exp, sine_type='1d')
            thickness = self.calculate_photoresist_thickness(x, I_avg, v_val, K, t_exp, C, sine_type='1d')
            
            frame_data = {
                'v_value': float(v_val),
                'x_coords': x.tolist(),
                'exposure_data': exposure_dose.tolist(),
                'thickness_data': thickness.tolist(),
                'frame_index': i
            }
            animation_frames.append(frame_data)
            
            logger.info(f"✅ 生成第 {i+1}/{time_steps} 帧 (V={v_val:.3f})")
        
        # 返回V评估动画数据结构
        result = {
            'model_type': 'dill',
            'sine_type': '1d',
            'is_animation': True,
            'animation_type': '1d_v_contrast',
            'time_steps': time_steps,
            'v_values': v_values.tolist(),
            'frames': animation_frames,
            'x_coords': x.tolist()
        }
        
        logger.info(f"🎬 1D V（对比度）评估动画数据生成完成，共{time_steps}帧")
        return result

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