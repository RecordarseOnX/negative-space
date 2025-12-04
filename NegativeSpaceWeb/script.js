// ==========================================
// 🎵 配置区域
// ==========================================
const playlist = [
    {
        id: 1,
        title: "Don't Mind",
        artist: "The Crane",
        file: "assets/audio/The Crane-Don't Mind.mp3", 
        cover: "assets/covers/The Crane-Don't Mind.jpg", 
        desc: "00:09 Highlight"
    },
    {
        id: 2, 
        title: "Playing God",
        artist: "Polyphia",
        file: "assets/audio/Poluphia-Playing God.mp3", // 保持你原有的文件名
        cover: "assets/covers/Poluphia-Playing God.jpg",
        desc: "00:28 Highlight"
    },
    {
        id: 3, 
        title: "Settle Into Ash",
        artist: "MSR",
        file: "assets/audio/MSR-Settle Into Ash.mp3",
        cover: "assets/covers/MSR-Settle Into Ash.jpg",
        desc: "01:14 Highlight"
    },
];

// ==========================================
// ⚙️ DOM 元素与状态
// ==========================================
const audio = document.getElementById('audio-engine');
const grid = document.getElementById('grid-container');
const playerBar = document.getElementById('player-bar');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');

// 沉浸模式元素
const immersiveOverlay = document.getElementById('immersive-overlay');
const immersiveCover = document.getElementById('immersive-cover');
const immersiveTitle = document.getElementById('immersive-title');
const immersiveArtist = document.getElementById('immersive-artist');
const immersivePlayIcon = document.getElementById('immersive-play-icon');

let currentSongId = null;
let isSwitching = false; 

// [新增] 待播放列表 (洗牌池)
let shuffleQueue = []; 
// ==========================================
// 🚀 初始化与渲染
// ==========================================
function renderPlaylist() {
    grid.innerHTML = playlist.map(song => `
        <div class="card group cursor-pointer relative z-10" id="card-${song.id}" onclick="loadAndPlay(${song.id})">
            <div class="cover-container aspect-[1/1] bg-neutral-900 mb-6 relative overflow-hidden">
                <img src="${song.cover}" class="cover-image w-full h-full object-cover" alt="${song.title}">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 z-10">
                    <div class="w-16 h-16 rounded-full border border-white/30 backdrop-blur-sm flex items-center justify-center bg-black/10 hover:bg-black/40 transition">
                        <svg class="w-6 h-6 fill-white ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </div>
            <div class="flex flex-col items-start space-y-1">
                <h3 class="text-xl font-medium text-white tracking-wide group-hover:text-white/80 transition">${song.title}</h3>
                <p class="text-xs text-neutral-500 tracking-[0.15em] uppercase font-semibold">${song.artist}</p>
            </div>
        </div>
    `).join('');
}

// ==========================================
// 🎼 播放控制逻辑 (包含丝滑切换)
// ==========================================

function safePlay() {
    if (!audio.src || audio.src === window.location.href) return;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => { /* 忽略 AbortError */ });
    }
}

// 🔊 声音淡出动画
function fadeOutAudio(callback) {
    if (audio.paused) {
        callback();
        return;
    }
    
    const fadeDuration = 400; 
    const interval = 20;
    const steps = fadeDuration / interval;
    const stepGap = audio.volume / steps;

    const fadeInterval = setInterval(() => {
        if (audio.volume > stepGap) {
            audio.volume -= stepGap;
        } else {
            audio.volume = 0;
            clearInterval(fadeInterval);
            audio.pause();
            callback(); 
        }
    }, interval);
}

// 🔊 声音淡入动画
function fadeInAudio() {
    audio.volume = 0;
    safePlay();
    
    const fadeDuration = 600; 
    const interval = 20;
    const targetVolume = 1.0;
    const steps = fadeDuration / interval;
    const stepGap = targetVolume / steps;

    const fadeInterval = setInterval(() => {
        if (audio.volume < targetVolume - stepGap) {
            audio.volume += stepGap;
        } else {
            audio.volume = targetVolume;
            clearInterval(fadeInterval);
        }
    }, interval);
}

// 核心播放函数
function loadAndPlay(id) {
    if (isSwitching) return; 
    const song = playlist.find(s => s.id === id);
    if (!song) return;

    // 如果点击的是当前歌 -> 仅普通开关
    if (currentSongId === id) {
        togglePlay();
        return;
    }

    isSwitching = true; 

    // UI 立即响应
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${id}`);
    if(activeCard) activeCard.classList.add('active');

    // 视觉淡出 (沉浸模式)
    if (immersiveCover) immersiveCover.style.opacity = '0';
    if (immersiveTitle) immersiveTitle.style.opacity = '0';
    if (immersiveArtist) immersiveArtist.style.opacity = '0';

    // 听觉淡出 -> 切换 -> 听觉淡入
    fadeOutAudio(() => {
        currentSongId = id;
        
        // 更新底部条
        if(document.getElementById('player-title')) document.getElementById('player-title').textContent = song.title;
        if(document.getElementById('player-artist')) document.getElementById('player-artist').textContent = song.artist;
        if(playerBar) playerBar.classList.remove('translate-y-full');

        // 更新沉浸数据
        updateImmersiveData(song);

        // 设置音频源
        audio.src = encodeURI(song.file);

        // 视觉淡入
        setTimeout(() => {
            if (immersiveCover) immersiveCover.style.opacity = '1';
            if (immersiveTitle) immersiveTitle.style.opacity = '1';
            if (immersiveArtist) immersiveArtist.style.opacity = '1';
        }, 50);

        // 听觉淡入
        fadeInAudio();
        
        isSwitching = false; 
    });
}

function togglePlay() {
    if (audio.paused) {
        audio.volume = 1.0;
        safePlay();
    } else {
        audio.pause();
    }
}

// 随机播放下一首
function playRandomNext() {
    // 1. 如果只有一首歌，直接循环
    if (playlist.length <= 1) {
        audio.currentTime = 0;
        safePlay();
        return;
    }

    // 2. 如果池子空了，重新填满
    if (shuffleQueue.length === 0) {
        // 获取所有歌曲 ID
        const allIds = playlist.map(s => s.id);
        
        // 过滤掉当前正在放的这首，避免上一轮刚结束，下一轮立马又随到它
        // (例如：A -> B -> C -> [重置] -> C -> A ...)
        shuffleQueue = allIds.filter(id => id !== currentSongId);
        
        console.log("🔄 播放列表已重置，新一轮循环开始");
    }

    // 3. 从池子中随机抽取一个索引
    const randomIndex = Math.floor(Math.random() * shuffleQueue.length);
    const nextId = shuffleQueue[randomIndex];

    // 4. 从池子中移除这个 ID (确保这一轮不会再播它)
    shuffleQueue.splice(randomIndex, 1);

    console.log(`🔀 即将播放 ID: ${nextId}, 本轮剩余: ${shuffleQueue.length} 首`);

    // 5. 播放
    loadAndPlay(nextId);
}

// 事件监听
audio.addEventListener('play', () => {
    updatePlayIcon(true);
    updateImmersivePlayState(true);
});

audio.addEventListener('pause', () => {
    updatePlayIcon(false);
    updateImmersivePlayState(false);
});

audio.addEventListener('ended', () => {
    playRandomNext();
});

audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${percent}%`;
        document.getElementById('current-time').textContent = formatTime(audio.currentTime);
        document.getElementById('duration-time').textContent = formatTime(audio.duration);
    }
});

progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    if (duration) {
        audio.currentTime = (clickX / width) * duration;
    }
});

function updatePlayIcon(isPlaying) {
    const playIcon = document.getElementById('icon-play');
    const pauseIcon = document.getElementById('icon-pause');
    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// ==========================================
// 🌌 沉浸模式逻辑
// ==========================================

function openImmersive() {
    if (!currentSongId) return;
    const song = playlist.find(s => s.id === currentSongId);
    updateImmersiveData(song);

    // 显现
    immersiveOverlay.classList.remove('opacity-0', 'pointer-events-none');
    immersiveOverlay.classList.add('opacity-100', 'pointer-events-auto');
    
    updateImmersivePlayState(!audio.paused);
}

function closeImmersive() {
    // 隐藏
    immersiveOverlay.classList.remove('opacity-100', 'pointer-events-auto');
    immersiveOverlay.classList.add('opacity-0', 'pointer-events-none');
}

function updateImmersiveData(song) {
    if(immersiveCover) immersiveCover.src = song.cover;
    if(immersiveTitle) immersiveTitle.textContent = song.title; 
    if(immersiveArtist) immersiveArtist.textContent = song.artist;
}

function updateImmersivePlayState(isPlaying) {
    if(!immersivePlayIcon || !immersiveCover) return;
    if (isPlaying) {
        immersivePlayIcon.classList.add('opacity-0');
        immersiveCover.classList.remove('grayscale');
    } else {
        immersivePlayIcon.classList.remove('opacity-0');
        immersiveCover.classList.add('grayscale');
    }
}

// ==========================================
// 👁️ 标签页图标自动变色 (Favicon Auto-Switch)
// ==========================================

// 1. 定义两个图标的 Data URI
// 黑色图标 (聚焦时使用) - fill=%23000000
const faviconBlack = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%23000000%22 d=%22M20 5h30v45L20 95z%22/><path fill=%22%23000000%22 d=%22M80 95H50V50L80 5z%22/></svg>";

// 白色图标 (离开时使用) - fill=%23ffffff
const faviconWhite = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%23ffffff%22 d=%22M20 5h30v45L20 95z%22/><path fill=%22%23ffffff%22 d=%22M80 95H50V50L80 5z%22/></svg>";

// 2. 获取 HTML 中的 link 标签
const faviconLink = document.getElementById("dynamic-favicon");

// 3. 监听页面状态变化
// 当用户离开页面 (blur) -> 变白
window.addEventListener('blur', () => {
    if(faviconLink) faviconLink.href = faviconWhite;
    // 可选：修改标题吸引用户注意
    // document.title = "⚪ NegativeSpace"; 
});

// 当用户回到页面 (focus) -> 变黑
window.addEventListener('focus', () => {
    if(faviconLink) faviconLink.href = faviconBlack;
    // 可选：恢复标题
    // document.title = "NegativeSpace";
});

// 初始化：防止刷新时状态不一致，强制执行一次检测
if (document.hidden) {
    faviconLink.href = faviconWhite;
} else {
    faviconLink.href = faviconBlack;
}

// 启动
renderPlaylist();