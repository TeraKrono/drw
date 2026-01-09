const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 8080;

// Статичні файли
app.use(express.static(__dirname));

// Структура для зберігання кімнат
const rooms = new Map();

// Список слів для вгадування
const words = [
    'сонце', 'дім', 'кіт', 'дерево', 'машина', 'книга', 'море', 'зірка',
    'квітка', 'собака', 'яблуко', 'школа', 'літак', 'гори', 'ріка', 'місяць',
    'хмара', 'птах', 'риба', 'метелик', 'телефон', 'комп\'ютер', 'стіл',
    'стілець', 'вікно', 'двері', 'їжа', 'хліб', 'вода', 'сік'
];

function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

function isOneLetterOff(guess, correct) {
    if (Math.abs(guess.length - correct.length) > 1) return false;
    
    // Перевірка на заміну однієї букви
    if (guess.length === correct.length) {
        let differences = 0;
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] !== correct[i]) differences++;
            if (differences > 1) return false;
        }
        return differences === 1;
    }
    
    // Перевірка на додавання/видалення однієї букви
    const [shorter, longer] = guess.length < correct.length ? [guess, correct] : [correct, guess];
    let i = 0, j = 0, skipped = false;
    
    while (i < shorter.length && j < longer.length) {
        if (shorter[i] === longer[j]) {
            i++;
            j++;
        } else if (!skipped) {
            j++;
            skipped = true;
        } else {
            return false;
        }
    }
    
    return true;
}

function createRoom(roomId, hostId) {
    return {
        id: roomId,
        hostId: hostId,
        players: new Map(),
        currentDrawer: null,
        currentWord: '',
        round: 0,
        roundTime: 80,
        timeLeft: 80,
        gameStarted: false,
        timer: null,
        guessedPlayers: new Set()
    };
}

function getHiddenWord(word, timeLeft, totalTime) {
    // Показуємо букви поступово: 25%, 50%, 75% часу
    const progress = 1 - (timeLeft / totalTime);
    let lettersToShow = 0;
    
    if (progress >= 0.25) lettersToShow = Math.ceil(word.length * 0.2);
    if (progress >= 0.5) lettersToShow = Math.ceil(word.length * 0.4);
    if (progress >= 0.75) lettersToShow = Math.ceil(word.length * 0.6);
    
    if (lettersToShow === 0) {
        return '_ '.repeat(word.length).trim();
    }
    
    const indices = [];
    const step = Math.floor(word.length / lettersToShow);
    for (let i = 0; i < lettersToShow && i * step < word.length; i++) {
        indices.push(i * step);
    }
    
    return word.split('').map((char, index) => {
        return indices.includes(index) ? char : '_';
    }).join(' ');
}

function startRound(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.players.size < 2) return;

    room.round++;
    room.guessedPlayers.clear();
    
    // Вибір наступного художника
    const playerIds = Array.from(room.players.keys());
    const currentDrawerIndex = playerIds.indexOf(room.currentDrawer);
    const nextDrawerIndex = (currentDrawerIndex + 1) % playerIds.length;
    room.currentDrawer = playerIds[nextDrawerIndex];
    
    // Вибір слова
    room.currentWord = getRandomWord();
    room.timeLeft = room.roundTime;
    room.gameStarted = true;

    // Повідомлення художнику
    io.to(room.currentDrawer).emit('your-turn', {
        word: room.currentWord,
        round: room.round
    });

    // Повідомлення іншим гравцям
    playerIds.forEach(playerId => {
        if (playerId !== room.currentDrawer) {
            io.to(playerId).emit('new-round', {
                drawer: room.players.get(room.currentDrawer).name,
                wordLength: room.currentWord.length,
                word: getHiddenWord(room.currentWord, room.timeLeft, room.roundTime),
                round: room.round,
                timeLeft: room.timeLeft
            });
        }
    });

    // Очистка canvas для всіх
    io.to(roomId).emit('clear-canvas');

    // Таймер раунду
    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
        room.timeLeft--;
        
        // Оновлення підказки зі словом
        const hiddenWord = getHiddenWord(room.currentWord, room.timeLeft, room.roundTime);
        io.to(roomId).emit('timer-update', {
            time: room.timeLeft,
            word: hiddenWord
        });

        if (room.timeLeft <= 0) {
            endRound(roomId, false);
        }
    }, 1000);
}

function endRound(roomId, wordGuessed) {
    const room = rooms.get(roomId);
    if (!room) return;

    clearInterval(room.timer);
    room.gameStarted = false;

    io.to(roomId).emit('round-end', {
        word: room.currentWord,
        guessed: wordGuessed,
        scores: Array.from(room.players.values()).map(p => ({
            name: p.name,
            score: p.score
        }))
    });

    // Наступний раунд через 5 секунд
    setTimeout(() => {
        if (rooms.has(roomId) && room.players.size >= 2) {
            startRound(roomId);
        }
    }, 5000);
}

io.on('connection', (socket) => {
    console.log('Новий гравець підключився:', socket.id);

    socket.on('create-room', (data) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const room = createRoom(roomId, socket.id);
        
        room.players.set(socket.id, {
            id: socket.id,
            name: data.playerName,
            score: 0,
            isDrawer: false,
            isHost: true
        });

        rooms.set(roomId, room);
        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit('room-created', { roomId, players: Array.from(room.players.values()), isHost: true });
        console.log(`Кімната ${roomId} створена гравцем ${data.playerName}`);
    });

    socket.on('join-room', (data) => {
        const room = rooms.get(data.roomId);
        
        if (!room) {
            socket.emit('error', { message: 'Кімната не знайдена' });
            return;
        }

        if (room.players.size >= 8) {
            socket.emit('error', { message: 'Кімната заповнена' });
            return;
        }

        room.players.set(socket.id, {
            id: socket.id,
            name: data.playerName,
            score: 0,
            isDrawer: false,
            isHost: false
        });

        socket.join(data.roomId);
        socket.roomId = data.roomId;

        io.to(data.roomId).emit('player-joined', {
            player: { name: data.playerName, score: 0 },
            players: Array.from(room.players.values())
        });

        const isHost = room.hostId === socket.id;
        socket.emit('room-joined', { 
            roomId: data.roomId, 
            players: Array.from(room.players.values()),
            isHost: isHost,
            gameStarted: room.gameStarted
        });

        // Якщо гра вже йде, показати поточний стан
        if (room.gameStarted && room.currentDrawer) {
            socket.emit('new-round', {
                drawer: room.players.get(room.currentDrawer).name,
                wordLength: room.currentWord.length,
                word: getHiddenWord(room.currentWord, room.timeLeft, room.roundTime),
                round: room.round,
                timeLeft: room.timeLeft
            });
        }

        console.log(`${data.playerName} приєднався до кімнати ${data.roomId}`);
    });

    socket.on('start-game', () => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        // Перевірка чи гравець є хостом
        if (room.hostId !== socket.id) {
            socket.emit('error', { message: 'Тільки хост може розпочати гру' });
            return;
        }

        if (room.players.size < 2) {
            socket.emit('error', { message: 'Потрібно мінімум 2 гравці' });
            return;
        }

        if (room.gameStarted) {
            socket.emit('error', { message: 'Гра вже почалася' });
            return;
        }

        room.currentDrawer = socket.id;
        startRound(socket.roomId);
        console.log(`Гра почалася в кімнаті ${socket.roomId}`);
    });

    socket.on('draw', (data) => {
        const room = rooms.get(socket.roomId);
        if (!room || room.currentDrawer !== socket.id) return;

        socket.to(socket.roomId).emit('draw', data);
    });

    socket.on('clear-canvas', () => {
        const room = rooms.get(socket.roomId);
        if (!room || room.currentDrawer !== socket.id) return;

        io.to(socket.roomId).emit('clear-canvas');
    });

    socket.on('guess', (data) => {
        const room = rooms.get(socket.roomId);
        if (!room || !room.gameStarted || room.currentDrawer === socket.id) return;

        const player = room.players.get(socket.id);
        if (!player || room.guessedPlayers.has(socket.id)) return;

        const guess = data.guess.toLowerCase().trim();
        const correctWord = room.currentWord.toLowerCase();

        // Перевірка на близькість відповіді (помилка в 1 букві)
        const isClose = isOneLetterOff(guess, correctWord);

        io.to(socket.roomId).emit('chat-message', {
            player: player.name,
            message: data.guess,
            isCorrect: guess === correctWord
        });

        if (guess === correctWord) {
            const points = Math.max(50, Math.floor(room.timeLeft * 2));
            player.score += points;
            room.guessedPlayers.add(socket.id);

            io.to(socket.roomId).emit('correct-guess', {
                player: player.name,
                points: points,
                scores: Array.from(room.players.values()).map(p => ({
                    name: p.name,
                    score: p.score
                }))
            });

            // Якщо всі вгадали - завершити раунд
            if (room.guessedPlayers.size === room.players.size - 1) {
                endRound(socket.roomId, true);
            }
        } else if (isClose) {
            // Підказка гравцю що він близько
            io.to(socket.id).emit('close-guess', {
                message: 'Дуже близько!'
            });
        }
    });

    socket.on('chat-message', (data) => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        io.to(socket.roomId).emit('chat-message', {
            player: player.name,
            message: data.message,
            isCorrect: false
        });
    });

    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        room.players.delete(socket.id);

        if (room.players.size === 0) {
            clearInterval(room.timer);
            rooms.delete(roomId);
            console.log(`Кімната ${roomId} видалена`);
        } else {
            io.to(roomId).emit('player-left', {
                playerName: player ? player.name : 'Гравець',
                players: Array.from(room.players.values())
            });

            if (room.currentDrawer === socket.id && room.gameStarted) {
                endRound(roomId, false);
            }
        }

        console.log('Гравець відключився:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Сервер запущено на порту ${PORT}`);
    console.log(`Відкрийте http://localhost:${PORT} у браузері`);
});
