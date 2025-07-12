#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Dill模型计算工具启动脚本

这个脚本提供了一个简单的方式来启动Dill模型计算工具的Web服务器。
它会自动检测系统环境，配置必要的参数，并在默认浏览器中打开应用。

使用方法:
    python run.py [选项]

选项:
    --port PORT     指定服务器端口 (默认: 8080)
    --host HOST     指定服务器主机 (默认: 0.0.0.0)
    --debug         启用调试模式
    --no-browser    不自动打开浏览器
    --help          显示帮助信息

示例:
    python run.py                    # 使用默认设置启动
    python run.py --port 5000       # 在端口5000启动
    python run.py --debug           # 启用调试模式
    python run.py --no-browser      # 不自动打开浏览器
"""

import os
import sys
import time
import socket
import argparse
import threading
import webbrowser
from datetime import datetime
import requests

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from backend.app import create_app
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("请确保您在正确的目录中运行此脚本，并且已安装所有依赖。")
    print("尝试运行: pip install -r requirements.txt")
    sys.exit(1)

def print_banner():
    """打印启动横幅"""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                    Dill模型计算工具                            ║
║                   版本: v1.3.0                               ║
║                   启动时间: {time}                            ║
╚══════════════════════════════════════════════════════════════╝
    """.format(time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print(banner)

def check_dependencies():
    """检查必要的依赖包"""
    required_packages = [
        'flask', 'flask_cors', 'numpy', 'matplotlib', 'requests'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            if package == 'flask_cors':
                import flask_cors
            else:
                __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    # 单独检查Pillow/PIL
    try:
        from PIL import Image
    except ImportError:
        missing_packages.append('pillow')
    
    if missing_packages:
        print(f"❌ 缺少必要的依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装依赖:")
        print("pip install -r requirements.txt")
        return False
    
    print("✅ 所有依赖包检查通过")
    return True

def get_local_ip():
    """获取本机IP地址"""
    try:
        # 尝试连接到外部地址以获取本机IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        return ip
    except Exception:
        try:
            # 备用方法：获取主机名对应的IP
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            if ip.startswith("127."):
                return "127.0.0.1"
            return ip
        except Exception:
            return "127.0.0.1"

def check_port_available(host, port):
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((host, port))
        return True
    except OSError:
        return False

def find_available_port(host, start_port, max_attempts=10):
    """查找可用端口"""
    for i in range(max_attempts):
        port = start_port + i
        if check_port_available(host, port):
            return port
    return None

def wait_for_server(url, max_attempts=30, delay=0.5):
    """等待服务器启动"""
    print(f"🔍 等待服务器启动...")
    for i in range(max_attempts):
        try:
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                print(f"✅ 服务器已就绪！")
                return True
        except requests.exceptions.RequestException:
            pass
        
        if i < max_attempts - 1:
            time.sleep(delay)
            if (i + 1) % 5 == 0:
                print(f"   仍在等待服务器启动... ({i + 1}/{max_attempts})")
    
    print(f"⚠️  服务器启动超时，但仍会尝试打开浏览器")
    return False

def open_browser_when_ready(url, max_wait_time=15):
    """等待服务器就绪后打开浏览器"""
    def _open():
        # 等待服务器启动
        server_ready = wait_for_server(url, max_attempts=int(max_wait_time * 2))
        
        print(f"🌐 正在打开浏览器访问: {url}")
        try:
            # 优先尝试用谷歌浏览器打开
            try:
                chrome = webbrowser.get('chrome')
                success = chrome.open(url)
                if success:
                    print(f"✅ 已用谷歌浏览器打开")
                else:
                    print(f"⚠️  谷歌浏览器未能打开，尝试用系统默认浏览器...")
                    fallback = webbrowser.open(url)
                    if fallback:
                        print(f"✅ 已用系统默认浏览器打开")
                    else:
                        print(f"⚠️  无法自动打开浏览器，请手动访问: {url}")
            except webbrowser.Error:
                # 没有chrome时用默认
                fallback = webbrowser.open(url)
                if fallback:
                    print(f"✅ 已用系统默认浏览器打开")
                else:
                    print(f"⚠️  无法自动打开浏览器，请手动访问: {url}")
        except Exception as e:
            print(f"⚠️  打开浏览器时出错: {e}")
            print(f"请手动在浏览器中访问: {url}")
        
        # 显示访问提示
        print("\n" + "="*60)
        print("🎉 应用已启动！")
        print(f"📱 请在浏览器中访问: {url}")
        print("💡 提示: 按 Ctrl+C 可以停止服务器")
        print("="*60)
    
    thread = threading.Thread(target=_open, daemon=True)
    thread.start()
    return thread

def setup_environment():
    """设置运行环境"""
    # 设置工作目录
    os.chdir(current_dir)
    
    # 设置环境变量
    os.environ.setdefault('FLASK_ENV', 'production')
    os.environ.setdefault('PYTHONPATH', current_dir)

def print_server_info(host, port, debug_mode):
    """打印服务器信息"""
    local_ip = get_local_ip()
    
    print("🚀 服务器启动信息:")
    print(f"   主机地址: {host}")
    print(f"   端口号: {port}")
    print(f"   调试模式: {'开启' if debug_mode else '关闭'}")
    print(f"   本机IP: {local_ip}")
    print()
    print("📱 访问地址:")
    print(f"   本地访问: http://127.0.0.1:{port}")
    if local_ip != "127.0.0.1":
        print(f"   网络访问: http://{local_ip}:{port}")
    print()
    print("💡 提示:")
    print("   - 服务器启动后会自动打开浏览器")
    print("   - 按 Ctrl+C 停止服务器")
    if not debug_mode:
        print("   - 使用 --debug 参数启用调试模式")
    print("=" * 60)

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description="Dill模型计算工具启动脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python run.py                    # 使用默认设置启动
  python run.py --port 5000       # 在端口5000启动
  python run.py --debug           # 启用调试模式
  python run.py --no-browser      # 不自动打开浏览器
        """
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=8080,
        help='服务器端口号 (默认: 8080)'
    )
    
    parser.add_argument(
        '--host',
        default='0.0.0.0',
        help='服务器主机地址 (默认: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--debug', '-d',
        action='store_true',
        help='启用调试模式'
    )
    
    parser.add_argument(
        '--no-browser', '-n',
        action='store_true',
        help='不自动打开浏览器'
    )
    
    return parser.parse_args()

def main():
    """主函数"""
    # 解析命令行参数
    args = parse_arguments()
    
    # 打印启动横幅
    print_banner()
    
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)
    
    # 设置环境
    setup_environment()
    
    # 检查端口可用性
    if not check_port_available(args.host, args.port):
        print(f"⚠️  端口 {args.port} 已被占用，正在寻找可用端口...")
        available_port = find_available_port(args.host, args.port)
        if available_port:
            args.port = available_port
            print(f"✅ 找到可用端口: {args.port}")
        else:
            print("❌ 无法找到可用端口，请手动指定其他端口")
            sys.exit(1)
    
    try:
        # 创建Flask应用
        print("🔧 正在创建应用实例...")
        app = create_app()
        
        # 打印服务器信息
        print_server_info(args.host, args.port, args.debug)
        
        # 准备浏览器URL
        local_ip = get_local_ip()
        # 优先使用localhost，因为更可靠
        browser_url = f"http://127.0.0.1:{args.port}"
        
        # 启动浏览器打开线程（如果需要）
        browser_thread = None
        if not args.no_browser:
            print("🌐 准备在服务器启动后自动打开浏览器...")
            browser_thread = open_browser_when_ready(browser_url)
        
        # 启动服务器
        print("🎯 服务器正在启动...")
        print("   请稍等，服务器启动完成后会自动打开浏览器...")
        print()
        
        app.run(
            debug=args.debug,
            host=args.host,
            port=args.port,
            threaded=True,
            use_reloader=False  # 避免重复启动
        )
        
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
        print("感谢使用 Dill模型计算工具！")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main() 