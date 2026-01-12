// Підключення до сервера
const socket = io();

// Стан гри
let myName = '';
let currentRoom = '';
let isDrawer = false;
let isHost = false;
let players = [];

// Екрани
const lobbyScreen = document.getElementById('lobbyScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const wordChoiceModal = document.getElementById('wordChoiceModal');

// Елементи лобі
const playerNameInput = document.getElementById('playerName');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCode');

// Елементи очікування
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playerCount = document.getElementById('playerCount');
const waitingPlayersList = document.getElementById('waitingPlayersList');
const startGameBtn = document.getElementById('startGameBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

// Елементи гри
const gameRoomCode = document.getElementById('gameRoomCode');
const roundNumber = document.getElementById('roundNumber');
const timerEl = document.getElementById('timer');

// Аудіо елементи
const playlistAudio = document.getElementById('playlistAudio');
const clockTickSound = document.getElementById('clockTickSound');
const correctAnswerSound = document.getElementById('correctAnswerSound');
const volumeSlider = document.getElementById('volumeSlider');
const musicTitle = document.getElementById('musicTitle');
let isClockTicking = false;

// Плейлист пісень
const playlist = [
    { name: 'Dnipro', file: 'audio/playlist/Dnipro.mp3' },
    { name: 'Nove oblychchia', file: 'audio/playlist/Nove oblychchia.mp3' },
    { name: 'Pohliady', file: 'audio/playlist/Pohliady .mp3' },
    { name: 'Popaiane mistse', file: 'audio/playlist/Popaiane mistse.mp3' },
    { name: 'Propashchi roky', file: 'audio/playlist/Propashchi roky.mp3' },
    { name: 'Staryi telefon', file: 'audio/playlist/Staryi telefon.mp3' },
    { name: 'Tam, de znykaiut slidy', file: 'audio/playlist/Tam, de znykaiut slidy.mp3' },
    { name: 'Tilky mrii', file: 'audio/playlist/Tilky mrii .mp3' },
    { name: 'Tudy-siudy i smert', file: 'audio/playlist/Tudy-siudy i smert.mp3' },
    { name: 'Ty mene ne znaiesh', file: 'audio/playlist/Ty mene ne znaiesh.mp3' },
    { name: 'Ya maliuiu znak', file: 'audio/playlist/Ya maliuiu znak.mp3' }
];
let currentTrackIndex = -1;
let shuffledPlaylist = [];

// Встановлення гучності для звукових ефектів
clockTickSound.volume = 0.20;
correctAnswerSound.volume = 0.20;
const gameStatus = document.getElementById('gameStatus');
const secretWord = document.getElementById('secretWord');
const playersList = document.getElementById('playersList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// Canvas
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const clearBtn = document.getElementById('clearBtn');
const drawingTools = document.getElementById('drawingTools');

// Нові елементи: гумка та заливка
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');
const bucketBtn = document.getElementById('bucketBtn');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool = 'brush'; // 'brush', 'eraser' або 'bucket'
let backgroundColor = '#FFFFFF'; // Колір фону

// Ініціалізація canvas
function initCanvas() {
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = brushSize.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

// Ініціалізація плейлиста
function initPlaylist() {
    playlistAudio.volume = volumeSlider.value / 100;
    
    // Створення перемішаного плейлиста
    shuffledPlaylist = [...playlist];
    shuffleArray(shuffledPlaylist);
    
    // Початок відтворення першого трека
    playNextTrack();
    
    // Коли трек закінчився - наступний
    playlistAudio.addEventListener('ended', () => {
        playNextTrack();
    });
    
    // Спроба автоплею
    const startPlayback = () => {
        playlistAudio.play().catch(e => {
            console.log('Autoplay blocked, will start on user interaction');
            document.addEventListener('click', () => {
                playlistAudio.play().catch(err => console.log('Music play failed:', err));
            }, { once: true });
        });
    };
    
    if (playlistAudio.readyState >= 3) {
        startPlayback();
    } else {
        playlistAudio.addEventListener('canplaythrough', startPlayback, { once: true });
    }
}

// Функція перемішування масиву
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Відтворення наступного трека
function playNextTrack() {
    currentTrackIndex++;
    
    // Якщо плейлист закінчився - перемішати і почати спочатку
    if (currentTrackIndex >= shuffledPlaylist.length) {
        currentTrackIndex = 0;
        shuffleArray(shuffledPlaylist);
    }
    
    loadAndPlayTrack();
}

// Відтворення попереднього трека
function playPrevTrack() {
    currentTrackIndex--;
    
    // Якщо це перший трек - перейти в кінець плейлиста
    if (currentTrackIndex < 0) {
        currentTrackIndex = shuffledPlaylist.length - 1;
    }
    
    loadAndPlayTrack();
}

// Завантаження та відтворення треку
function loadAndPlayTrack() {
    const track = shuffledPlaylist[currentTrackIndex];
    playlistAudio.src = track.file;
    musicTitle.textContent = track.name;
    playlistAudio.play().catch(err => console.log('Track play failed:', err));
    updatePlayPauseButton();
}

// Оновлення кнопки play/pause
function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playlistAudio.paused) {
        playPauseBtn.textContent = '▶️';
        playPauseBtn.title = 'Відтворення';
    } else {
        playPauseBtn.textContent = '⏸️';
        playPauseBtn.title = 'Пауза';
    }
}

// Контроль гучності
volumeSlider.addEventListener('input', (e) => {
    playlistAudio.volume = e.target.value / 100;
});

// Кнопки керування плеєром
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

playPauseBtn.addEventListener('click', () => {
    if (playlistAudio.paused) {
        playlistAudio.play().catch(err => console.log('Play failed:', err));
    } else {
        playlistAudio.pause();
    }
    updatePlayPauseButton();
});

prevBtn.addEventListener('click', () => {
    playPrevTrack();
});

nextBtn.addEventListener('click', () => {
    playNextTrack();
});

// Оновлення кнопки при зміні стану аудіо
playlistAudio.addEventListener('play', updatePlayPauseButton);
playlistAudio.addEventListener('pause', updatePlayPauseButton);

// Функції малювання
function startDrawing(e) {
    if (!isDrawer) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Якщо інструмент заливки - заливаємо фон
    if (currentTool === 'bucket') {
        backgroundColor = colorPicker.value;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        socket.emit('fill-background', { color: backgroundColor });
        return;
    }
    
    isDrawing = true;
    lastX = clickX;
    lastY = clickY;
}

function draw(e) {
    if (!isDrawing || !isDrawer) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    // Перевірка чи координати в межах canvas
    if (currentX < 0 || currentX > canvas.width || currentY < 0 || currentY > canvas.height) {
        // Оновлюємо позицію але не малюємо
        lastX = currentX;
        lastY = currentY;
        return;
    }
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    
    // Якщо гумка - використовуємо колір фону
    const drawColor = currentTool === 'eraser' ? backgroundColor : colorPicker.value;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize.value;
    ctx.stroke();
    
    // Відправка даних малювання на сервер
    socket.emit('draw', {
        lastX, lastY, currentX, currentY,
        color: drawColor,
        width: brushSize.value,
        tool: currentTool
    });
    
    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    isDrawing = false;
}

// Події canvas
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);

// Глобальні події для відстеження миші навіть за межами canvas
document.addEventListener('mousemove', (e) => {
    if (isDrawing && isDrawer) {
        draw(e);
    }
});

document.addEventListener('mouseup', () => {
    if (isDrawing) {
        stopDrawing();
    }
});

// Підтримка тачскріну
canvas.addEventListener('touchstart', (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});

// Оновлення товщини пензля
brushSize.addEventListener('input', (e) => {
    brushSizeValue.textContent = e.target.value;
});

// Швидкий вибір кольору
const colorBtns = document.querySelectorAll('.color-btn');
colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        colorPicker.value = color;
        ctx.strokeStyle = color;
    });
});

// Перемикання інструментів: пензель/гумка/заливка
brushBtn.addEventListener('click', () => {
    currentTool = 'brush';
    brushBtn.classList.add('active');
    eraserBtn.classList.remove('active');
    bucketBtn.classList.remove('active');
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    eraserBtn.classList.add('active');
    brushBtn.classList.remove('active');
    bucketBtn.classList.remove('active');
});

bucketBtn.addEventListener('click', () => {
    currentTool = 'bucket';
    bucketBtn.classList.add('active');
    brushBtn.classList.remove('active');
    eraserBtn.classList.remove('active');
});

// Очистка canvas
clearBtn.addEventListener('click', () => {
    if (!isDrawer) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear-canvas', { bgColor: backgroundColor });
});

// Створення кімнати
createRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Введіть ваше ім\'я!');
        return;
    }
    
    myName = name;
    socket.emit('create-room', { playerName: name });
});

// Приєднання до кімнати
joinRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const roomId = roomCodeInput.value.trim().toUpperCase();
    
    if (!name) {
        alert('Введіть ваше ім\'я!');
        return;
    }
    
    if (!roomId || roomId.length !== 6) {
        alert('Введіть коректний код кімнати (6 символів)!');
        return;
    }
    
    myName = name;
    socket.emit('join-room', { playerName: name, roomId });
});

// Початок гри
startGameBtn.addEventListener('click', () => {
    socket.emit('start-game');
});

// Покинути кімнату
leaveRoomBtn.addEventListener('click', () => {
    location.reload();
});

// Відправка повідомлення/відповіді
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    socket.emit('guess', { guess: message });
    chatInput.value = '';
}

// Функції відображення
function showScreen(screen) {
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

function updateWaitingPlayers(playersList) {
    waitingPlayersList.innerHTML = '';
    playersList.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        waitingPlayersList.appendChild(li);
    });
    playerCount.textContent = playersList.length;
}

function updateGamePlayers(playersList) {
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        if (player.isDrawer) {
            li.classList.add('drawer');
            li.innerHTML = `🎨 ${player.name} <span class="player-score">${player.score}</span>`;
        } else {
            li.innerHTML = `${player.name} <span class="player-score">${player.score}</span>`;
        }
        if (player.guessed) {
            li.classList.add('guessed');
        }
        playersList.appendChild(li);
    });
}

function addChatMessage(text, isSystem = false, isCorrect = false) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    if (isSystem) div.classList.add('system');
    if (isCorrect) div.classList.add('correct');
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setDrawingMode(canDraw) {
    isDrawer = canDraw;
    if (canDraw) {
        canvas.classList.remove('disabled');
        drawingTools.classList.remove('disabled');
    } else {
        canvas.classList.add('disabled');
        drawingTools.classList.add('disabled');
    }
}

function showWordChoice(words) {
    const wordChoiceBtns = document.querySelectorAll('.word-choice-btn');
    wordChoiceBtns.forEach((btn, index) => {
        btn.textContent = words[index];
        btn.onclick = () => selectWord(index);
    });
    wordChoiceModal.classList.remove('hidden');
}

function hideWordChoice() {
    wordChoiceModal.classList.add('hidden');
}

function selectWord(index) {
    socket.emit('word-selected', { index });
    hideWordChoice();
}

// Обробники подій Socket.IO
socket.on('room-created', (data) => {
    currentRoom = data.roomId;
    isHost = data.isHost;
    roomCodeDisplay.textContent = data.roomId;
    gameRoomCode.textContent = data.roomId;
    updateWaitingPlayers(data.players);
    
    // Показ кнопки старту тільки для хоста
    startGameBtn.style.display = isHost ? 'block' : 'none';
    
    showScreen(waitingScreen);
});

socket.on('room-joined', (data) => {
    currentRoom = data.roomId;
    isHost = data.isHost;
    roomCodeDisplay.textContent = data.roomId;
    gameRoomCode.textContent = data.roomId;
    updateWaitingPlayers(data.players);
    
    // Показ кнопки старту тільки для хоста
    startGameBtn.style.display = isHost ? 'block' : 'none';
    
    // Якщо гра вже йде, перейти на екран гри
    if (data.gameStarted) {
        showScreen(gameScreen);
    } else {
        showScreen(waitingScreen);
    }
});

socket.on('player-joined', (data) => {
    updateWaitingPlayers(data.players);
    addChatMessage(`${data.player.name} приєднався до гри`, true);
});

socket.on('player-left', (data) => {
    updateWaitingPlayers(data.players);
    addChatMessage(`${data.playerName} покинув гру`, true);
});

socket.on('your-turn', (data) => {
    showScreen(gameScreen);
    setDrawingMode(true);
    gameStatus.textContent = 'Ви малюєте!';
    secretWord.textContent = data.word;
    roundNumber.textContent = data.round;
    addChatMessage(`Раунд ${data.round}: Ваша черга малювати слово "${data.word}"`, true);
});

socket.on('choose-word', (data) => {
    showScreen(gameScreen);
    roundNumber.textContent = data.round;
    gameStatus.textContent = 'Оберіть слово для малювання';
    secretWord.textContent = '? ? ?';
    showWordChoice(data.words);
    addChatMessage(`Раунд ${data.round}: Оберіть слово`, true);
});

socket.on('choice-timer-update', (data) => {
    const choiceTimerEl = document.getElementById('choiceTimer');
    if (choiceTimerEl) {
        choiceTimerEl.textContent = data.time;
        
        // Відтворення тікання годинника на останніх 3 секундах
        if (data.time <= 3 && data.time > 0 && !isClockTicking) {
            isClockTicking = true;
            clockTickSound.currentTime = 0;
            clockTickSound.play().catch(e => console.log('Audio play failed:', e));
        } else if (data.time > 3 || data.time === 0) {
            isClockTicking = false;
            clockTickSound.pause();
            clockTickSound.currentTime = 0;
        }
    }
});

socket.on('word-chosen', (data) => {
    hideWordChoice();
    setDrawingMode(true);
    gameStatus.textContent = 'Ви малюєте!';
    secretWord.textContent = data.word;
    addChatMessage(`Ви малюєте слово: "${data.word}"`, true);
});

socket.on('waiting-for-word', (data) => {
    showScreen(gameScreen);
    setDrawingMode(false);
    gameStatus.textContent = `${data.drawer} обирає слово...`;
    secretWord.textContent = 'Очікування...';
    roundNumber.textContent = data.round;
    addChatMessage(`Раунд ${data.round}: ${data.drawer} обирає слово`, true);
});

socket.on('new-round', (data) => {
    showScreen(gameScreen);
    setDrawingMode(false);
    gameStatus.textContent = `${data.drawer} малює`;
    secretWord.textContent = data.word || '_ '.repeat(data.wordLength).trim();
    roundNumber.textContent = data.round;
    addChatMessage(`Раунд ${data.round}: ${data.drawer} малює`, true);
});

socket.on('timer-update', (data) => {
    const time = typeof data === 'number' ? data : data.time;
    timerEl.textContent = time;
    
    // Відтворення тікання годинника на останніх 3 секундах
    if (time <= 3 && time > 0 && !isClockTicking) {
        isClockTicking = true;
        clockTickSound.currentTime = 0;
        clockTickSound.play().catch(e => console.log('Audio play failed:', e));
    } else if (time > 3 || time === 0) {
        isClockTicking = false;
        clockTickSound.pause();
        clockTickSound.currentTime = 0;
    }
    
    // Оновлення підказки зі словом (якщо не художник)
    if (!isDrawer && data.word) {
        secretWord.textContent = data.word;
    }
});

socket.on('draw', (data) => {
    ctx.beginPath();
    ctx.moveTo(data.lastX, data.lastY);
    ctx.lineTo(data.currentX, data.currentY);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.stroke();
});

socket.on('clear-canvas', (data) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (data && data.bgColor) {
        backgroundColor = data.bgColor;
    }
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

socket.on('fill-background', (data) => {
    backgroundColor = data.color;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

socket.on('chat-message', (data) => {
    const message = data.isCorrect 
        ? `${data.player} вгадав слово! ✅`
        : `${data.player}: ${data.message}`;
    addChatMessage(message, false, data.isCorrect);
});

socket.on('close-guess', (data) => {
    addChatMessage(`💡 ${data.message}`, true);
});

socket.on('correct-guess', (data) => {
    // Відтворення звуку правильної відповіді
    correctAnswerSound.currentTime = 0;
    correctAnswerSound.play().catch(e => console.log('Audio play failed:', e));
    
    addChatMessage(`${data.player} вгадав слово і отримав ${data.points} очок!`, true);
    players = data.scores.map(p => ({ ...p, isDrawer: false }));
    updateGamePlayers(playersList);
});

socket.on('round-end', (data) => {
    // Зупинка тікання годинника
    isClockTicking = false;
    clockTickSound.pause();
    clockTickSound.currentTime = 0;
    
    const message = data.guessed 
        ? `Раунд завершено! Слово було: "${data.word}"`
        : `Час вийшов! Слово було: "${data.word}"`;
    addChatMessage(message, true);
    secretWord.textContent = data.word;
    
    players = data.scores.map(p => ({ ...p, isDrawer: false }));
    updateGamePlayers(playersList);
});

socket.on('error', (data) => {
    alert(data.message);
});

// Ініціалізація
initCanvas();
initPlaylist();
