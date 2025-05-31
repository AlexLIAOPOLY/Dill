from flask import Flask, send_from_directory
from flask_cors import CORS
import os
import json
from .routes import api_bp
from .utils import NumpyEncoder

def create_app():
    """
    创建并配置Flask应用
    
    返回:
        配置好的Flask应用实例
    """
    # 获取当前文件的绝对路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # 项目根目录
    root_dir = os.path.dirname(current_dir)
    # 静态文件目录
    static_dir = os.path.join(root_dir, 'frontend')
    
    # 创建Flask应用
    app = Flask(
        __name__, 
        static_folder=static_dir,
        static_url_path=''
    )
    
    # 配置CORS，允许跨域请求
    CORS(app)
    
    # 配置应用
    app.config['JSON_SORT_KEYS'] = False
    # 自定义JSON编码器以处理NumPy数据类型
    app.json_encoder = NumpyEncoder
    
    # 注册API蓝图
    app.register_blueprint(api_bp)
    
    # 首页路由
    @app.route('/')
    def index():
        return send_from_directory(static_dir, 'index.html')
    
    # 单一计算页面路由
    @app.route('/index.html')
    def single_calculation():
        return send_from_directory(static_dir, 'index.html')
    
    # 参数比较页面路由
    @app.route('/compare.html')
    def parameter_comparison():
        return send_from_directory(static_dir, 'compare.html')
    
    # 404错误处理 - 返回index.html
    @app.errorhandler(404)
    def not_found(e):
        return send_from_directory(static_dir, 'index.html')
    
    return app

# 主入口点
if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port) 