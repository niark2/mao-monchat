// ==========================================================================
// MAO'S RED BOOK INTERACTIVE CONTROLLER
// ==========================================================================

// Configure PDF.js Worker dynamically to bypass CORS
async function initPDFWorker() {
    if (pdfjsLib.GlobalWorkerOptions.workerSrc) return;
    try {
        const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js');
        const blob = await response.blob();
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    } catch (e) {
        console.warn("CORS Worker fallback:", e);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
}


// Application State
const state = {
    pdf: null,
    currentPage: 1,
    totalPages: 0,
    zoom: 1.25,
    pdfUrl: 'petit-livre-rouge.pdf',
    audioContext: null,
    musicNode: null,
    isPlayingMusic: false,
    soundEffectsEnabled: true,
    tempo: 120, // BPM for L'Internationale melody
    isSearching: false,
    textPagesCache: {}, // Cache text for search
    lang: 'fr' // Current language: 'fr' or 'zh'
};

// Selected Quotes from the Little Red Book (French translations)
const S = '<span style="color:#C91A25;font-weight:700;">Séréna</span>';
const quotesFr = [
    `« Une seule étincelle peut mettre le feu à toute la plaine... et ton simple regard, ${S}, a suffi pour m'embraser toute entière pour l'éternité. »`,
    `« La force dirigeante de notre cause, c'est le Parti communiste... mais la force dirigeante de mes pensées quotidiennes, ${S}, c'est toi. »`,
    `« Les réactionnaires sont des tigres en papier, ${S}. Ma résistance face à ton charme l'est tout autant. »`,
    `« Pour mener la révolution, il faut s'appuyer sur les masses. Pour être heureuse, ${S}, je n'ai besoin de m'appuyer que sur toi. »`,
    `« La révolution n'est pas un dîner de gala, ${S}... mais j'aimerais tellement t'inviter à dîner en tête-à-tête. »`,
    `« Voyager sur dix mille lis ne vaut pas un seul pas à tes côtés, ${S}. »`
];

// Quotes in Chinese
const Sz = '<span style="color:#C91A25;font-weight:700;">Séréna</span>';
const quotesZh = [
    `「星星之火，可以燎原……而你简单的眼神，${Sz}，就足以永远点燃我的整颗心。」`,
    `「领导我们事业的核心力量是中国共产党……但领导我每日思绪的核心力量是你，${Sz}。」`,
    `「一切反动派都是纸老虎，${Sz}，而我在你魅力面前的抵抗力也同样是纸老虎。」`,
    `「进行革命要依靠群众，而要获得幸福，${Sz}，我只需要依靠你。」`,
    `「革命不是请客吃饭，${Sz}……但我真的非常想邀请你共进晚餐。」`,
    `「行万里路，也比不上陪在你身旁迈出的一步，${Sz}。」`
];

// Bilingual Translations Dictionaries
const translations = {
    fr: {
        title: "LE PETIT LIVRE ROUGE",
        subtitle: "CITATIONS DU PRÉSIDENT MAO ZEDONG",
        buttonOpen: "OUVRIR LE LIVRE DE LA REVOLUTION",
        footerText: "« La force dirigeante de notre cause, c'est le Parti communiste chinois. »",
        chapsHeading: "CHAPITRES & ACCÈS RAPIDE",
        quotesHeading: "LA PENSÉE DU JOUR",
        quotesAuthor: "— Président Mao Zedong",
        btnNextQuote: "Voir les citations",
        audioHeading: "AMBIANCE RÉVOLUTIONNAIRE",
        btnToggleMusic_on: "🎵 L'Orient est rouge (ON)",
        btnToggleMusic_off: "🎵 L'Orient est rouge (OFF)",
        btnSoundEffects_on: "🔊 Bruits de page",
        btnSoundEffects_off: "🔇 Bruits de page",
        btnPrev: "◀ Précédent",
        btnNext: "Suivant ▶",
        searchInputPlaceholder: "Rechercher dans le texte...",
        btnSearch: "Rechercher",
        pageLabel: "Page"
    },
    zh: {
        title: "毛主席语录",
        subtitle: "毛泽东主席的思想指南",
        buttonOpen: "开启革命之书",
        footerText: "「领导我们事业的核心力量是中国共产党。」",
        chapsHeading: "章节与快速导航",
        quotesHeading: "每日毛主席语录",
        quotesAuthor: "—— 毛泽东主席",
        btnNextQuote: "查看语录",
        audioHeading: "革命音乐与音效",
        btnToggleMusic_on: "🎵 东方红 (开启)",
        btnToggleMusic_off: "🎵 东方红 (关闭)",
        btnSoundEffects_on: "🔊 翻页音效",
        btnSoundEffects_off: "🔇 翻页音效",
        btnPrev: "◀ 上一页",
        btnNext: "下一页 ▶",
        searchInputPlaceholder: "在文献中搜索...",
        btnSearch: "搜索",
        pageLabel: "页码"
    }
};

const chaptersList = {
    fr: [
        { page: 1, text: "Sommaire & Titre" },
        { page: 2, text: "1. Le Parti Communiste" },
        { page: 4, text: "2. Les Classes et la Lutte de Classes" },
        { page: 8, text: "3. Le Socialisme et le Communisme" },
        { page: 15, text: "4. La Juste Solution des Contradictions..." },
        { page: 20, text: "5. La Guerre et la Paix" },
        { page: 25, text: "6. L'Impérialisme et les Réactionnaires..." },
        { page: 28, text: "7. Oser Lutter, Oser Vaincre" },
        { page: 30, text: "8. La Guerre Populaire" },
        { page: 35, text: "9. L'Armée Populaire" },
        { page: 36, text: "10. Le Rôle des Comités du Parti" },
        { page: 42, text: "11. La Ligne de Masse" },
        { page: 48, text: "12. Le Travail Politique" },
        { page: 53, text: "13. Rapports Officiers - Soldats" },
        { page: 54, text: "14. Rapports Armée - Peuple" },
        { page: 55, text: "15. Les « Trois Démocraties »" },
        { page: 58, text: "16. Éducation et Entraînement" },
        { page: 59, text: "17. Servir le Peuple" },
        { page: 61, text: "18. Patriotisme et Internationalisme" },
        { page: 63, text: "19. L'Héroïsme Révolutionnaire" },
        { page: 64, text: "20. Édifier le Pays avec Diligence" },
        { page: 67, text: "21. Compter sur ses Propres Forces..." },
        { page: 70, text: "22. Méthodes de Pensée et de Travail" },
        { page: 80, text: "23. Enquêtes et Recherches" },
        { page: 82, text: "24. Élimination des Conceptions Erronées" },
        { page: 87, text: "25. L'Unité" },
        { page: 88, text: "26. La Discipline" },
        { page: 89, text: "27. La Critique et l'Autocritique" },
        { page: 93, text: "28. Les Communistes" },
        { page: 96, text: "29. Les Cadres" },
        { page: 100, text: "30. Les Jeunes" },
        { page: 101, text: "31. Les Femmes" },
        { page: 103, text: "32. La Culture et l'Art" },
        { page: 105, text: "33. L'Étude" }
    ],
    zh: [
        { page: 1, text: "扉页与目录" },
        { page: 2, text: "一、 共产党" },
        { page: 4, text: "二、 阶级和阶级斗争" },
        { page: 8, text: "三、 社会主义和共产主义" },
        { page: 15, text: "四、 正确处理人民内部矛盾" },
        { page: 20, text: "五、 战争与和平" },
        { page: 25, text: "六、 帝国主义和一切反动派都是纸老虎" },
        { page: 28, text: "七、 敢于斗争，敢于胜利" },
        { page: 30, text: "八、 人民战争" },
        { page: 35, text: "九、 人民军队" },
        { page: 36, text: "十、 党委领导" },
        { page: 42, text: "十一、 群众路线" },
        { page: 48, text: "十二、 政治工作" },
        { page: 53, text: "十三、 官兵关系" },
        { page: 54, text: "十四、 军民关系" },
        { page: 55, text: "十五、 民主三原则" },
        { page: 58, text: "十六、 军队整训" },
        { page: 59, text: "十七、 为人民服务" },
        { page: 61, text: "十八、 爱国主义和国际主义" },
        { page: 63, text: "十九、 革命英雄主义" },
        { page: 64, text: "二十、 勤俭建国" },
        { page: 67, text: "二十一、 自力更生，艰苦奋斗" },
        { page: 70, text: "二十二、 思想方法和工作方法" },
        { page: 80, text: "二十三、 调查研究" },
        { page: 82, text: "二十四、 纠正错误思想" },
        { page: 87, text: "二十五、 团结" },
        { page: 88, text: "二十六、 纪律" },
        { page: 89, text: "二十七、 批评和自我批评" },
        { page: 93, text: "二十八、 共产党人" },
        { page: 96, text: "二十九、 干部" },
        { page: 100, text: "三十、 青年" },
        { page: 101, text: "三十一、 妇女" },
        { page: 103, text: "三十二、 文化艺术" },
        { page: 105, text: "三十三、 学习" }
    ]
};

// Function to switch language dynamically
function switchLanguage(lang) {
    state.lang = lang;
    const t = translations[lang];

    // Update active class on language switcher buttons
    document.querySelectorAll('.btn-lang').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Translate Cover view
    document.querySelector('.main-title').textContent = t.title;
    document.querySelector('.subtitle').textContent = t.subtitle;
    document.getElementById('btn-open-book').textContent = t.buttonOpen;
    document.querySelector('.cover-footer p').textContent = t.footerText;

    // Translate Sidebar
    document.querySelector('.sidebar-section h4').textContent = t.chapsHeading;
    document.querySelector('.quote-generator-box h4').textContent = t.quotesHeading;
    document.getElementById('quote-author').textContent = t.quotesAuthor;
    document.getElementById('btn-next-quote').textContent = t.btnNextQuote;
    document.querySelector('.audio-controls h4').textContent = t.audioHeading;

    // Update quote display with new language
    const currentQuotes = lang === 'fr' ? quotesFr : quotesZh;
    document.getElementById('quote-text').innerHTML = currentQuotes[0];

    // Audio text update based on current state
    if (state.isPlayingMusic) {
        docElements.btnToggleMusic.innerHTML = `<span class="music-icon">🎵</span> ${t.btnToggleMusic_on}`;
    } else {
        docElements.btnToggleMusic.innerHTML = `<span class="music-icon">🎵</span> ${t.btnToggleMusic_off}`;
    }

    if (state.soundEffectsEnabled) {
        docElements.btnSoundEffects.innerHTML = `<span class="sfx-icon">🔊</span> ${t.btnSoundEffects_on}`;
    } else {
        docElements.btnSoundEffects.innerHTML = `<span class="sfx-icon">🔇</span> ${t.btnSoundEffects_off}`;
    }

    // Translate Toolbar
    docElements.btnPrev.textContent = t.btnPrev;
    docElements.btnNext.textContent = t.btnNext;
    docElements.searchInput.placeholder = t.searchInputPlaceholder;
    docElements.btnSearch.textContent = t.btnSearch;

    // Update Page counter label
    const lblPage = document.getElementById('lbl-page');
    if (lblPage) {
        lblPage.textContent = t.pageLabel;
    }

    // Re-populate Chapter List
    const chapters = chaptersList[lang];
    docElements.chapterList.innerHTML = '';
    chapters.forEach((chap, idx) => {
        const li = document.createElement('li');
        li.setAttribute('data-page', chap.page);
        li.textContent = chap.text;
        if (state.currentPage === chap.page) {
            li.classList.add('active');
        }
        docElements.chapterList.appendChild(li);
    });
    updateChapterActiveState(state.currentPage);
}

// Document Selectors
const docElements = {
    app: document.getElementById('app'),
    btnOpenBook: document.getElementById('btn-open-book'),
    btnCloseBook: document.getElementById('btn-close-book'),
    canvas: document.getElementById('pdf-canvas'),
    ctx: document.getElementById('pdf-canvas').getContext('2d'),
    pageNumInput: document.getElementById('page-num'),
    pageCountSpan: document.getElementById('page-count'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    zoomValue: document.getElementById('zoom-value'),
    spinner: document.getElementById('pdf-loading-spinner'),
    quoteText: document.getElementById('quote-text'),
    btnNextQuote: document.getElementById('btn-next-quote'),
    btnToggleMusic: document.getElementById('btn-toggle-music'),
    btnSoundEffects: document.getElementById('btn-sound-effects'),
    chapterList: document.getElementById('chapter-list'),
    searchInput: document.getElementById('search-input'),
    btnSearch: document.getElementById('btn-search'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    sidebar: document.querySelector('.sidebar'),
    canvasViewport: document.getElementById('canvas-viewport')
};

// ==========================================================================
// AUDIO SYSTEM (Web Audio API Synthesizer)
// ==========================================================================

function initAudio() {
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Generate Page Turn Sound Effect (Synthetic Paper Rustle)
function playPageTurnSound() {
    if (!state.soundEffectsEnabled) return;
    initAudio();
    
    const ctx = state.audioContext;
    if (ctx.state === 'suspended') ctx.resume();

    // Create White Noise Buffer
    const bufferSize = ctx.sampleRate * 0.25; // 0.25 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Lowpass filter sweep
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
    
    // Gain (Volume) sweep
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noise.start();
}

// L'Internationale Melody Sequencer
// Structure: [Note, Octave, Duration (1 = quarter note)]
const INTERNATIONALE_MELODY = [
    ['C', 4, 1], ['F', 4, 1.5], ['E', 4, 0.5], ['F', 4, 1], ['G', 4, 1], ['A', 4, 1.5], ['G', 4, 0.5], ['F', 4, 1], ['D', 4, 1],
    ['G', 4, 2], ['F', 4, 1], ['E', 4, 1], ['D', 4, 2], ['C', 4, 2],
    ['C', 4, 1], ['F', 4, 1.5], ['E', 4, 0.5], ['F', 4, 1], ['G', 4, 1], ['A', 4, 1.5], ['G', 4, 0.5], ['F', 4, 1], ['D', 4, 1],
    ['G', 4, 2], ['F', 4, 1], ['E', 4, 1], ['F', 4, 3], ['rest', 0, 1]
];

// Note frequencies map
const NOTE_FREQS = {
    'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.00, 'A': 440.00, 'B': 493.88
};

let playTimeoutId = null;

function playNote(noteIndex, startTime) {
    if (!state.isPlayingMusic) return;
    
    const ctx = state.audioContext;
    if (noteIndex >= INTERNATIONALE_MELODY.length) {
        // Loop back
        playNote(0, startTime);
        return;
    }
    
    const [note, octave, duration] = INTERNATIONALE_MELODY[noteIndex];
    const durationSeconds = (duration * 60) / state.tempo;
    
    if (note !== 'rest') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Vintage warm pulse-width modulation style using Triangle + Sine blend
        osc.type = 'triangle';
        const baseFreq = NOTE_FREQS[note];
        osc.frequency.setValueAtTime(baseFreq * Math.pow(2, octave - 4), startTime);
        
        // Soft attack & decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05); // low volume background
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + durationSeconds - 0.05);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + durationSeconds);
    }
    
    const nextStartTime = startTime + durationSeconds;
    const delayMs = (nextStartTime - ctx.currentTime) * 1000;
    
    playTimeoutId = setTimeout(() => {
        playNote(noteIndex + 1, nextStartTime);
    }, delayMs);
}

function startMusic() {
    if (!state.backgroundMusic) {
        state.backgroundMusic = new Audio("东方红 L orient est rouge version moderne VOSTFR.mp3");
        state.backgroundMusic.loop = true;
    }
    
    state.backgroundMusic.play().catch(e => console.warn("Audio play blocked by browser policy:", e));
    
    state.isPlayingMusic = true;
    docElements.btnToggleMusic.classList.add('active');
    const t = translations[state.lang];
    docElements.btnToggleMusic.innerHTML = `<span class="music-icon">🎵</span> ${t.btnToggleMusic_on}`;
}

function stopMusic() {
    state.isPlayingMusic = false;
    if (state.backgroundMusic) {
        state.backgroundMusic.pause();
    }
    docElements.btnToggleMusic.classList.remove('active');
    const t = translations[state.lang];
    docElements.btnToggleMusic.innerHTML = `<span class="music-icon">🎵</span> ${t.btnToggleMusic_off}`;
}

// ==========================================================================
// PDF RENDERING SYSTEM
// ==========================================================================

// Auto zoom PDF to fit viewport width
async function autoZoomToFit() {
    if (!state.pdf) return;
    const containerWidth = docElements.canvasViewport.clientWidth;
    const padding = window.innerWidth < 800 ? 20 : 60;
    const targetWidth = containerWidth - padding;
    
    try {
        const page = await state.pdf.getPage(state.currentPage);
        const baseViewport = page.getViewport({ scale: 1 });
        const targetScale = targetWidth / baseViewport.width;
        // Clamp scale between 0.4 and 2.5
        state.zoom = Math.min(Math.max(targetScale, 0.4), 2.5);
        docElements.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
        await renderPage(state.currentPage);
    } catch (e) {
        console.error("Autozoom error:", e);
    }
}

async function loadPDF() {
    docElements.spinner.style.display = 'flex';
    try {
        await initPDFWorker();
        const loadingTask = pdfjsLib.getDocument(state.pdfUrl);
        state.pdf = await loadingTask.promise;
        state.totalPages = state.pdf.numPages;
        docElements.pageCountSpan.textContent = state.totalPages;
        docElements.pageNumInput.max = state.totalPages;
        
        // Initial render with auto-zoom to fit container
        await autoZoomToFit();
        
        // Cache text contents asynchronously for search
        cacheAllPagesText();
    } catch (error) {
        console.error('Error loading PDF:', error);
        docElements.spinner.innerHTML = `<div style="color:var(--color-communist-red); font-size:3rem">⚠️</div><p>Échec du chargement du livre de Mao.</p>`;
    }
}

async function renderPage(pageNum) {
    if (!state.pdf) return;
    
    docElements.spinner.style.display = 'flex';
    state.currentPage = pageNum;
    docElements.pageNumInput.value = pageNum;
    
    // Update Chapter list active class
    updateChapterActiveState(pageNum);

    try {
        const page = await state.pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: state.zoom });
        
        docElements.canvas.height = viewport.height;
        docElements.canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: docElements.ctx,
            viewport: viewport
        };
        
        await renderContext.canvasContext.clearRect(0, 0, docElements.canvas.width, docElements.canvas.height);
        await page.render(renderContext).promise;
        
        // Enable/Disable buttons based on page index
        docElements.btnPrev.disabled = (pageNum <= 1);
        docElements.btnNext.disabled = (pageNum >= state.totalPages);
        
        docElements.spinner.style.display = 'none';
    } catch (err) {
        console.error('Error rendering page:', err);
    }
}

function updateChapterActiveState(currentPage) {
    const listItems = docElements.chapterList.querySelectorAll('li');
    let activeIndex = 0;
    
    // Determine closest preceding chapter
    listItems.forEach((item, index) => {
        const startPage = parseInt(item.getAttribute('data-page'), 10);
        if (currentPage >= startPage) {
            activeIndex = index;
        }
    });

    listItems.forEach((item, index) => {
        if (index === activeIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ==========================================================================
// SEARCH & IN-DOCUMENT JUMPS
// ==========================================================================

async function cacheAllPagesText() {
    if (!state.pdf) return;
    for (let i = 1; i <= state.totalPages; i++) {
        try {
            const page = await state.pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textStr = textContent.items.map(item => item.str).join(' ');
            state.textPagesCache[i] = textStr.toLowerCase();
        } catch (e) {
            console.warn(`Failed to cache text for page ${i}`, e);
        }
    }
}

function performSearch() {
    const query = docElements.searchInput.value.trim().toLowerCase();
    if (!query) return;
    
    // Search cache
    let foundPage = -1;
    
    // Search starting from current page forward, then wrap around
    for (let i = state.currentPage + 1; i <= state.totalPages; i++) {
        if (state.textPagesCache[i] && state.textPagesCache[i].includes(query)) {
            foundPage = i;
            break;
        }
    }
    
    if (foundPage === -1) {
        for (let i = 1; i <= state.currentPage; i++) {
            if (state.textPagesCache[i] && state.textPagesCache[i].includes(query)) {
                foundPage = i;
                break;
            }
        }
    }
    
    if (foundPage !== -1) {
        renderPage(foundPage);
        playPageTurnSound();
        docElements.searchInput.style.borderColor = 'var(--color-accent-gold)';
    } else {
        docElements.searchInput.style.borderColor = 'red';
        alert(`Aucun résultat pour: "${query}" dans le Petit Livre Rouge.`);
    }
}

// ==========================================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function registerEvents() {
    // Open/Close cover transitions
    docElements.btnOpenBook.addEventListener('click', () => {
        docElements.app.classList.remove('cover-mode');
        docElements.app.classList.add('read-mode');
        initAudio();
        loadPDF();
        startMusic();
    });

    docElements.btnCloseBook.addEventListener('click', () => {
        docElements.app.classList.remove('read-mode');
        docElements.app.classList.add('cover-mode');
        // Close mobile sidebar and overlay
        docElements.sidebar.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay').classList.remove('active');
        stopMusic();
    });

    // Language switch buttons trigger
    document.querySelectorAll('.btn-lang').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.getAttribute('data-lang');
            switchLanguage(lang);
        });
    });

    // Sidebar toggle (hamburger button)
    docElements.btnToggleSidebar.addEventListener('click', () => {
        if (window.innerWidth < 900) {
            docElements.sidebar.classList.toggle('mobile-open');
            document.getElementById('sidebar-overlay').classList.toggle('active');
        } else {
            docElements.sidebar.classList.toggle('collapsed');
            setTimeout(autoZoomToFit, 300);
        }
    });

    // Sidebar mobile overlay close trigger
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
        docElements.sidebar.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    });

    // Window Resize autozoomer with debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (state.pdf) {
                autoZoomToFit();
            }
        }, 150);
    });

    // Page navigation
    docElements.btnPrev.addEventListener('click', () => {
        if (state.currentPage > 1) {
            renderPage(state.currentPage - 1);
            playPageTurnSound();
        }
    });

    docElements.btnNext.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            renderPage(state.currentPage + 1);
            playPageTurnSound();
        }
    });

    docElements.pageNumInput.addEventListener('change', (e) => {
        let targetPage = parseInt(e.target.value, 10);
        if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
        if (targetPage > state.totalPages) targetPage = state.totalPages;
        renderPage(targetPage);
        playPageTurnSound();
    });

    // Zoom handlers
    docElements.btnZoomIn.addEventListener('click', () => {
        if (state.zoom < 3.0) {
            state.zoom += 0.25;
            docElements.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
            renderPage(state.currentPage);
        }
    });

    docElements.btnZoomOut.addEventListener('click', () => {
        if (state.zoom > 0.5) {
            state.zoom -= 0.25;
            docElements.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
            renderPage(state.currentPage);
        }
    });

    // Search events
    docElements.btnSearch.addEventListener('click', performSearch);
    docElements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Sidebar chapters quick links
    docElements.chapterList.addEventListener('click', (e) => {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const pageNum = parseInt(targetLi.getAttribute('data-page'), 10);
            renderPage(pageNum);
            playPageTurnSound();
            // Close mobile sidebar after navigation
            if (window.innerWidth < 900) {
                docElements.sidebar.classList.remove('mobile-open');
                document.getElementById('sidebar-overlay').classList.remove('active');
            }
        }
    });

    // Quote generation
    // Quote button navigation is handled natively by the <a> link to citation.html

    // Music and SFX buttons
    docElements.btnToggleMusic.addEventListener('click', () => {
        if (state.isPlayingMusic) {
            stopMusic();
        } else {
            startMusic();
        }
    });

    docElements.btnSoundEffects.addEventListener('click', () => {
        state.soundEffectsEnabled = !state.soundEffectsEnabled;
        const t = translations[state.lang];
        if (state.soundEffectsEnabled) {
            docElements.btnSoundEffects.classList.add('active');
            docElements.btnSoundEffects.innerHTML = `<span class="sfx-icon">🔊</span> ${t.btnSoundEffects_on}`;
        } else {
            docElements.btnSoundEffects.classList.remove('active');
            docElements.btnSoundEffects.innerHTML = `<span class="sfx-icon">🔇</span> ${t.btnSoundEffects_off}`;
        }
    });
}

// Launch application
registerEvents();
// Initial configuration
switchLanguage('fr');

