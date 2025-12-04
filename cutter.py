from pydub import AudioSegment
import os
import base64

# ================= 🔧 环境配置 =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AudioSegment.converter = os.path.join(BASE_DIR, "ffmpeg.exe")
AudioSegment.ffprobe   = os.path.join(BASE_DIR, "ffprobe.exe")

# ================= 📁 路径配置 (自动指向网站目录) =================
INPUT_FOLDER = os.path.join(BASE_DIR, "Sources")

# 网站资源路径
WEB_ROOT = os.path.join(BASE_DIR, "NegativeSpaceWeb")
AUDIO_OUTPUT = os.path.join(WEB_ROOT, "assets", "audio")
COVER_OUTPUT = os.path.join(WEB_ROOT, "assets", "covers")

# 音频设置
FADE_DURATION = 2000 

# 1x1像素的纯黑 JPG 图片数据 (用于生成占位封面)
BLACK_PIXEL_JPG = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xdb\x00C\x01\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x15\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x11\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\x9d\xff\xd9'

# =============================================================

def time_str_to_ms(time_str):
    try:
        parts = time_str.split(':')
        minutes = int(parts[0])
        seconds = int(parts[1])
        return (minutes * 60 + seconds) * 1000
    except:
        return 0

def ensure_folders():
    if not os.path.exists(AUDIO_OUTPUT): os.makedirs(AUDIO_OUTPUT)
    if not os.path.exists(COVER_OUTPUT): os.makedirs(COVER_OUTPUT)

def guess_tags(filename):
    # 尝试从文件名猜测 歌手 和 歌名
    # 假设格式： "Artist - Title.flac"
    base = os.path.splitext(filename)[0]
    if " - " in base:
        parts = base.split(" - ")
        return parts[0].strip(), parts[1].strip()
    return "Unknown Artist", base

def create_highlight(filename, start_time_str, end_time_str):
    ensure_folders()
    input_path = os.path.join(INPUT_FOLDER, filename)
    
    if not os.path.exists(input_path):
        print(f"❌ 找不到文件: {filename}")
        return

    # 1. 处理音频
    try:
        song = AudioSegment.from_file(input_path)
    except Exception as e:
        print(f"❌ 加载失败: {e}")
        return

    start_ms = time_str_to_ms(start_time_str)
    end_ms = time_str_to_ms(end_time_str)
    
    highlight = song[start_ms:end_ms]
    highlight = highlight.fade_in(FADE_DURATION).fade_out(FADE_DURATION)

    # 生成基础文件名 (不带后缀)
    file_base_name = os.path.splitext(filename)[0]
    final_name = f"Highlight_{file_base_name}"

    # 2. 导出 MP3
    mp3_filename = f"{final_name}.mp3"
    mp3_path = os.path.join(AUDIO_OUTPUT, mp3_filename)
    highlight.export(mp3_path, format="mp3", bitrate="320k")

    # 3. 生成占位 JPG 封面 (如果不存在的话)
    jpg_filename = f"{final_name}.jpg"
    jpg_path = os.path.join(COVER_OUTPUT, jpg_filename)
    
    if not os.path.exists(jpg_path):
        with open(jpg_path, "wb") as f:
            f.write(BLACK_PIXEL_JPG)
        cover_status = "✅ 已创建占位封面(黑色)"
    else:
        cover_status = "⏩ 封面已存在(跳过)"

    # 4. 生成 JSON 配置代码
    artist, title = guess_tags(filename)
    
    json_snippet = f"""
    {{
        id: Date.now() + Math.floor(Math.random() * 1000), // 随机ID
        title: "{title}", 
        artist: "{artist}",
        file: "assets/audio/{mp3_filename}", 
        cover: "assets/covers/{jpg_filename}", 
        desc: "{start_time_str} Highlight"
    }},"""

    print(f"\n✨ 处理完成: {title}")
    print(f"   📂 音频: assets/audio/{mp3_filename}")
    print(f"   🖼️  封面: {cover_status}")
    print("-" * 40)
    print("👇 复制下面的代码到 index.html 的 playlist 中: 👇")
    print("\033[96m" + json_snippet + "\033[0m") # 青色高亮代码
    print("-" * 40)

# ================= 执行区域 =================

if __name__ == "__main__":
    
    # 格式: ("文件名", "开始", "结束")
    # 建议文件名格式：Artist - Title.flac
    work_list = [
        ("Playing God-Poluphia.flac", "00:28", "00:57"),
    ]

    print("🚀 开始全自动处理...")
    
    for item in work_list:
        create_highlight(item[0], item[1], item[2])