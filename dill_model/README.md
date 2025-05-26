# Dill模型计算工具

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://python.org)
[![Flask Version](https://img.shields.io/badge/flask-3.0%2B-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

这是一个基于Python Flask后端和HTML前端的Web应用，用于计算和可视化Dill光刻胶模型。该工具提供了直观的用户界面，支持实时参数调整和结果可视化。

## 🌟 功能特点

- **直观的用户界面**：提供友好的Web界面，支持参数实时调整
- **实时计算**：快速计算并生成曝光剂量分布和光刻胶厚度分布图
- **响应式设计**：适配桌面、平板和移动设备
- **数据导出**：支持计算结果和图表的导出功能
- **参数预设**：内置常用参数组合，快速开始计算
- **计算历史**：保存计算历史，方便对比分析
- **全局命令**：支持在任何位置通过 `dill` 命令启动

## 🛠 技术栈

### 后端
- **Flask 3.0+**：现代化的Python Web框架
- **NumPy**：高性能科学计算库
- **Matplotlib**：专业的数据可视化库
- **SciPy**：科学计算工具集
- **Pandas**：数据处理和分析

### 前端
- **HTML5/CSS3**：现代化的用户界面
- **JavaScript ES6+**：交互逻辑实现
- **响应式设计**：适配多种设备
- **CSS动画**：流畅的用户体验

## 📁 项目结构

```
dill_model/
├── backend/                    # Python后端
│   ├── app.py                 # Flask应用入口和配置
│   ├── models/                # 模型计算模块
│   │   ├── __init__.py
│   │   └── dill_model.py      # Dill模型核心算法
│   ├── routes/                # API路由模块
│   │   ├── __init__.py
│   │   └── api.py             # RESTful API端点
│   └── utils/                 # 工具函数模块
│       ├── __init__.py
│       ├── helpers.py         # 通用辅助函数
│       └── validators.py      # 参数验证函数
├── frontend/                  # 前端资源
│   ├── index.html            # 主页面
│   ├── compare.html          # 对比分析页面
│   ├── css/                  # 样式文件
│   │   ├── style.css         # 主样式表
│   │   └── animations.css    # 动画效果
│   ├── js/                   # JavaScript文件
│   │   ├── main.js           # 主要逻辑
│   │   ├── chart.js          # 图表处理
│   │   └── utils.js          # 前端工具函数
│   └── assets/               # 静态资源
│       └── images/           # 图片资源
├── requirements.txt          # Python依赖包列表
├── run.py                   # 应用启动脚本
├── config.py                # 配置文件
├── dill                     # 全局命令脚本
├── dill_global.py           # 全局启动器
├── install.sh               # 自动安装脚本
└── README.md                # 项目文档
```

## 🚀 快速开始

### 方法一：一键安装（推荐）

```bash
# 运行自动安装脚本
./install.sh

# 安装完成后，在任何位置输入以下命令启动
dill
```

### 方法二：手动安装

#### 1. 环境要求
- **Python**: 3.8 或更高版本
- **pip**: Python包管理器
- **操作系统**: Windows 10+, macOS 10.14+, Ubuntu 18.04+

#### 2. 获取代码
```bash
# 克隆仓库（如果使用Git）
git clone https://github.com/yourusername/dill-model.git
cd dill-model/dill_model

# 或者直接下载并解压到目标目录
```

#### 3. 创建虚拟环境（推荐）
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

#### 4. 安装依赖
```bash
# 安装所有必需的依赖包
pip install -r requirements.txt

# 或者逐个安装核心依赖
pip install flask flask-cors numpy matplotlib pillow
```

#### 5. 启动应用
```bash
# 使用启动脚本（推荐）
python run.py

# 或者直接运行Flask应用
python -m backend.app
```

#### 6. 访问应用
- 打开浏览器访问：`http://localhost:8080`
- 或者访问显示的IP地址：`http://你的IP:8080`

## 📱 多种启动方式

### 🌟 全局命令（推荐）
```bash
# 在任何位置的终端中输入
dill
```

### 💻 命令行启动
```bash
# 进入项目目录后
python run.py                    # 基本启动
python run.py --port 5000       # 指定端口
python run.py --debug           # 调试模式
python run.py --no-browser      # 不自动打开浏览器
python run.py --help            # 查看帮助
```

### 🔧 一键安装
```bash
# 运行安装脚本设置全局命令
./install.sh
```

## 📖 使用指南

### 基本操作

1. **参数设置**
   - 使用滑块或直接输入调整以下参数：
     - **平均入射光强度 (I_avg)**: 控制光照强度
     - **干涉条纹可见度 (V)**: 影响条纹对比度
     - **空间频率 (K)**: 决定条纹密度
     - **曝光时间 (t_exp)**: 控制曝光持续时间
     - **光敏速率常数 (C)**: 材料特性参数

2. **执行计算**
   - 点击"计算"按钮开始计算
   - 等待计算完成（通常几秒钟）
   - 查看生成的图表结果

3. **结果分析**
   - 查看曝光剂量分布图
   - 分析光刻胶厚度分布
   - 使用对比功能分析不同参数的影响

### 高级功能

- **参数预设**: 使用内置的参数组合快速开始
- **批量计算**: 一次性计算多组参数
- **数据导出**: 导出计算结果和图表
- **历史记录**: 查看和比较之前的计算结果

## 🔧 API文档

### 计算接口

**端点**: `POST /api/calculate`

**请求体**:
```json
{
  "I_avg": 10.0,      // 平均入射光强度
  "V": 0.8,           // 干涉条纹可见度
  "K": 2.0,           // 空间频率
  "t_exp": 5.0,       // 曝光时间
  "C": 0.02           // 光敏速率常数
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "exposure_plot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "thickness_plot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "parameters": {
      "I_avg": 10.0,
      "V": 0.8,
      "K": 2.0,
      "t_exp": 5.0,
      "C": 0.02
    },
    "statistics": {
      "max_exposure": 50.0,
      "min_exposure": 0.0,
      "avg_thickness": 1.2
    }
  },
  "message": "计算完成"
}
```

### 其他接口

- `GET /api/presets` - 获取参数预设
- `POST /api/export` - 导出计算结果
- `GET /api/history` - 获取计算历史

## 🐛 故障排除

### 常见问题

1. **全局命令不可用**
   ```bash
   # 重新运行安装脚本
   ./install.sh
   
   # 或手动创建符号链接
   sudo ln -sf "$(pwd)/dill" /usr/local/bin/dill
   ```

2. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :8080
   # 或者修改run.py中的端口号
   python run.py --port 5000
   ```

3. **依赖安装失败**
   ```bash
   # 升级pip
   pip install --upgrade pip
   # 使用国内镜像源
   pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/
   ```

4. **Python版本不兼容**
   ```bash
   # 检查Python版本
   python --version
   # 确保使用Python 3.8+
   ```

5. **图表不显示**
   - 检查浏览器控制台是否有JavaScript错误
   - 确保网络连接正常
   - 尝试刷新页面

### 日志查看

应用运行时会在控制台输出详细日志，包括：
- 请求处理信息
- 计算过程状态
- 错误信息和堆栈跟踪

## 🔨 开发指南

### 开发环境设置

1. **安装开发依赖**
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-flask black flake8
   ```

2. **代码格式化**
   ```bash
   # 使用black格式化代码
   black backend/
   # 使用flake8检查代码质量
   flake8 backend/
   ```

3. **运行测试**
   ```bash
   # 运行所有测试
   pytest
   # 运行特定测试文件
   pytest tests/test_models.py
   ```

### 添加新功能

1. **扩展计算模型**
   - 修改 `backend/models/dill_model.py`
   - 添加新的计算函数
   - 更新参数验证

2. **新增API端点**
   - 在 `backend/routes/api.py` 中添加新路由
   - 实现请求处理逻辑
   - 添加错误处理

3. **前端界面更新**
   - 修改 `frontend/index.html` 添加新元素
   - 更新 `frontend/css/style.css` 样式
   - 在 `frontend/js/main.js` 中添加交互逻辑

### 部署指南

#### 开发环境
```bash
python run.py
```

#### 生产环境
```bash
# 使用Gunicorn部署
gunicorn -w 4 -b 0.0.0.0:8080 "backend.app:create_app()"

# 使用Docker部署
docker build -t dill-model .
docker run -p 8080:8080 dill-model
```

#### Render部署

1. **准备工作**
   - 确保项目包含以下文件：
     - `requirements.txt`: 依赖列表
     - `wsgi.py`: WSGI入口文件
     - `render.yaml`: Render配置文件
     - `Procfile`: 进程定义文件
     - `runtime.txt`: Python版本指定

2. **部署步骤**
   - 注册并登录[Render](https://render.com/)
   - 点击"New +"按钮，选择"Web Service"
   - 连接GitHub/GitLab仓库或直接上传代码
   - 选择项目目录
   - 配置以下选项：
     - **Name**: 应用名称（如"dill-model"）
     - **Environment**: Python
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn wsgi:app`
   - 点击"Create Web Service"完成部署

3. **环境变量**
   - 在Render控制台中，进入应用的"Environment"选项卡
   - 添加以下环境变量：
     - `FLASK_ENV`: `production`
     - `PYTHON_VERSION`: `3.9.0`

4. **访问应用**
   - 部署完成后，Render会提供一个公共URL
   - 通过该URL即可访问您的应用

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献

欢迎提交问题报告和功能请求！如果您想贡献代码：

1. Fork 本仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📞 支持

如果您遇到问题或需要帮助：

- 查看 [FAQ](docs/FAQ.md)
- 提交 [Issue](https://github.com/yourusername/dill-model/issues)
- 发送邮件至：support@example.com

## 🔄 更新日志

### v1.2.0 (2024-05-26)
- ✨ 新增全局 `dill` 命令支持
- 🔧 完善了requirements.txt依赖管理
- 📚 更新了README文档
- 🚀 优化了启动脚本
- 🛠️ 添加了自动安装脚本
- 🐛 添加了更多错误处理
- 🌐 改进了浏览器自动打开逻辑

### v1.1.0 (2024-05-25)
- 添加了参数预设功能
- 改进了用户界面
- 优化了计算性能

### v1.0.0 (2024-05-20)
- 初始版本发布
- 基本的Dill模型计算功能
- Web界面实现

