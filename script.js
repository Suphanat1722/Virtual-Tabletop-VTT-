// =================================================================
// SECTION: Global Variables & Initialization
// =================================================================
const board = document.getElementById('game-board');
let fogContainer = document.getElementById('fog-container');
let drawCanvas = document.getElementById('drawing-canvas');
let ctx;
const contextMenu = document.getElementById('context-menu');
const helpModal = document.getElementById('help-modal');

const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
let activeToken = null;
let initialX, initialY;
let selectedToken = null;
let isRevealingFog = false;
let isDrawing = false;
let currentTool = null;
let lastX = 0, lastY = 0;
let turnOrder = [];
let currentTurnIndex = -1;
let rightClickedToken = null;

document.addEventListener('DOMContentLoaded', () => {
    ctx = drawCanvas.getContext('2d');
    initializeCanvas();
    initializeFog();
    setupContextMenu();
    addCanvasListeners();
    loadGame(); // โหลดเกมล่าสุดอัตโนมัติเมื่อเปิดหน้า
});

// =================================================================
// SECTION: Help Modal
// =================================================================
function openHelpModal() {
    helpModal.classList.remove('hidden');
}

function closeHelpModal() {
    helpModal.classList.add('hidden');
}

// =================================================================
// SECTION: Context Menu
// =================================================================
function setupContextMenu() {
    contextMenu.classList.add('hidden');
    document.getElementById('ctx-edit-hp').addEventListener('click', handleEditHp);
    document.getElementById('ctx-add-tracker').addEventListener('click', handleAddToTracker);
    document.getElementById('ctx-delete').addEventListener('click', handleDeleteToken);
    window.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });
}

function showContextMenu(e, token) {
    e.preventDefault();
    e.stopPropagation();
    rightClickedToken = token;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.classList.remove('hidden');
}

function handleEditHp() {
    if (!rightClickedToken) return;
    const token = rightClickedToken;
    const currentHp = token.dataset.hpCurrent;
    const maxHp = token.dataset.hpMax;
    const name = token.querySelector('.token-name')?.innerText || 'Token';
    const newHpInput = prompt(`Edit HP for ${name}\n(Current: ${currentHp}/${maxHp})`, currentHp);
    if (newHpInput !== null) {
        const newHp = parseInt(newHpInput);
        if (!isNaN(newHp)) {
            token.dataset.hpCurrent = newHp;
            updateHpDisplay(token);
        } else {
            alert("Please enter a valid number.");
        }
    }
}

function handleAddToTracker() {
    if (!rightClickedToken) return;
    const name = rightClickedToken.querySelector('.token-name')?.innerText;
    if (name) {
        addToTracker(name);
    } else {
        alert("This token has no name to add to the tracker.");
    }
}

function handleDeleteToken() {
    if (rightClickedToken && confirm(`Are you sure you want to delete ${rightClickedToken.querySelector('.token-name')?.innerText || 'this token'}?`)) {
        rightClickedToken.remove();
        if (selectedToken === rightClickedToken) {
            selectedToken = null;
        }
        rightClickedToken = null;
    }
}

// =================================================================
// SECTION: Board & Token Management
// =================================================================
function addToken() {
    const tokenUrlInput = document.getElementById('token-url');
    const tokenFileInput = document.getElementById('token-file');
    const tokenNameInput = document.getElementById('token-name');
    const tokenHpInput = document.getElementById('token-hp');
    const tokenSizeInput = document.getElementById('token-size');
    const tokenTypeInput = document.getElementById('token-type');

    const tokenFile = tokenFileInput.files[0];
    const tokenName = tokenNameInput.value;
    const tokenHp = tokenHpInput.value;
    const tokenSize = parseInt(tokenSizeInput.value);
    const tokenType = tokenTypeInput.value;

    if (tokenFile) {
        processAndResizeImage(tokenFile, 300, 300, (resizedImageUrl) => {
            createTokenElement(`url('${resizedImageUrl}')`, tokenType, tokenName, tokenSize, tokenHp);
        });
        tokenFileInput.value = '';
    } else if (tokenUrlInput.value) {
        createTokenElement(`url('${tokenUrlInput.value}')`, tokenType, tokenName, tokenSize, tokenHp);
        tokenUrlInput.value = '';
    } else {
        alert('กรุณาใส่ URL หรือเลือกไฟล์สำหรับโทเคน');
    }
    tokenNameInput.value = '';
    tokenHpInput.value = '10';
}

function createTokenElement(imageUrl, tokenType, tokenName, size, hp) {
    const newToken = document.createElement('div');
    newToken.classList.add('token', tokenType);
    newToken.dataset.hpMax = hp || 0;
    newToken.dataset.hpCurrent = hp || 0;
    const dimension = size * cellSize;
    newToken.style.width = `${dimension}px`;
    newToken.style.height = `${dimension}px`;
    newToken.style.top = '0px';
    newToken.style.left = '0px';
    newToken.style.backgroundImage = imageUrl;

    if (tokenName) {
        const nameElement = document.createElement('div');
        nameElement.classList.add('token-name');
        nameElement.innerText = tokenName;
        newToken.appendChild(nameElement);
    }
    const hpElement = document.createElement('div');
    hpElement.classList.add('token-hp');
    newToken.appendChild(hpElement); // Append HP element first
    updateHpDisplay(newToken);      // Then update it

    addDragListeners(newToken);
    board.appendChild(newToken);
    return newToken;
}

function addDragListeners(token) {
    token.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only allow left-click to drag
        e.stopPropagation();
        contextMenu.classList.add('hidden');
        selectToken(token);
        activeToken = token;
        e.preventDefault();

        const tokenRect = activeToken.getBoundingClientRect();
        initialX = e.clientX - tokenRect.left;
        initialY = e.clientY - tokenRect.top;
        activeToken.style.zIndex = 1000;
    });

    token.addEventListener('contextmenu', (e) => showContextMenu(e, token));
}

function updateHpDisplay(token) {
    const hpElement = token.querySelector('.token-hp');
    if (hpElement) {
        hpElement.innerText = `${token.dataset.hpCurrent}/${token.dataset.hpMax}`;
    }
}

function selectToken(tokenToSelect) {
    if (selectedToken) {
        selectedToken.classList.remove('selected');
    }
    selectedToken = tokenToSelect;
    if (selectedToken) {
        selectedToken.classList.add('selected');
    }
}

function deselectTokens() {
    if (selectedToken) {
        selectedToken.classList.remove('selected');
        selectedToken = null;
    }
}

function setMapFromUrl() {
    const mapUrl = document.getElementById('map-url').value;
    board.style.backgroundImage = mapUrl ? `url('${mapUrl}')` : 'none';
}

function setMapFromFile(event) {
    const file = event.target.files[0];
    if (file) {
        processAndResizeImage(file, 1920, 1080, (resizedImageUrl) => {
            board.style.backgroundImage = `url('${resizedImageUrl}')`;
        });
    }
}

function processAndResizeImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress JPEG
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// =================================================================
// SECTION: Sub-systems (Fog, Drawing, Tracker, Dice)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    ctx = drawCanvas.getContext('2d');
    initializeCanvas();
    initializeFog();
    setupContextMenu();
    addCanvasListeners();
    loadGame(); // โหลดเกมล่าสุดอัตโนมัติเมื่อเปิดหน้า

    // === เพิ่มส่วนนี้สำหรับการฟังผลลูกเต๋าจาก Firestore ===
    if (window.db) { // ตรวจสอบว่า Firebase โหลดแล้ว
        const diceRollsCol = window.collection(window.db, 'diceRolls');
        const q = window.query(diceRollsCol, window.orderBy('timestamp', 'desc'), window.limit(15)); // ดึง 15 รายการล่าสุด

        window.onSnapshot(q, (snapshot) => {
            const diceLogEl = document.getElementById('dice-log');
            // ล้าง Log เดิมก่อนแสดงรายการใหม่
            diceLogEl.innerHTML = ''; 

            snapshot.forEach((doc) => {
                const data = doc.data();
                const logEntry = document.createElement('div');
                const playerName = data.playerName ? `<strong>${data.playerName}</strong> ` : '';
                logEntry.innerHTML = `${playerName} d${data.sides} 🎲: <strong>${data.result}</strong>`;
                diceLogEl.appendChild(logEntry); // เพิ่มต่อท้าย (Firestore Query แบบ desc)
            });

            // แสดงผลลัพธ์ล่าสุดใน dice-result
            if (snapshot.docs.length > 0) {
                document.getElementById('dice-result').innerText = snapshot.docs[0].data().result;
            } else {
                document.getElementById('dice-result').innerText = '-';
            }
        });
    } else {
        console.warn("Firebase Firestore not initialized. Dice rolls will not sync.");
    }
    // === สิ้นสุดการเพิ่มส่วนนี้ ===
});

function initializeCanvas() {
    const boardRect = board.getBoundingClientRect();
    drawCanvas.width = boardRect.width;
    drawCanvas.height = boardRect.height;
    ctx.strokeStyle = document.getElementById('draw-color').value;
    ctx.lineWidth = document.getElementById('draw-width').value;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
}

function initializeFog() {
    fogContainer.innerHTML = ''; // Clear old fog cells

    const style = getComputedStyle(document.documentElement);
    const cols = parseInt(style.getPropertyValue('--grid-cols'));
    const rows = parseInt(style.getPropertyValue('--grid-rows'));

    fogContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    fogContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const totalCells = cols * rows;
    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.classList.add('fog-cell');
        fogContainer.appendChild(cell);
    }

    fogContainer.addEventListener('mousedown', (e) => {
        if (!fogContainer.classList.contains('is-active')) return;
        e.preventDefault();
        isRevealingFog = true;
        revealFog(e);
    });

    fogContainer.addEventListener('mousemove', (e) => {
        if (!isRevealingFog || !fogContainer.classList.contains('is-active')) return;
        revealFog(e);
    });

    // We use a global mouseup listener to stop revealing
}

function revealFog(e) {
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    if (targetElement && targetElement.classList.contains('fog-cell')) {
        targetElement.classList.add('is-revealed');
    }
}

function toggleFog() {
    fogContainer.classList.toggle('is-active');
    if (fogContainer.classList.contains('is-active') && currentTool) {
        selectTool(currentTool); // Deactivate current tool if fog is turned on
    }
}

function selectTool(tool) {
    // If clicking the same tool, deactivate it
    if (currentTool === tool) {
        currentTool = null;
        drawCanvas.style.pointerEvents = 'none';
        document.getElementById('tool-pen').classList.remove('active');
        document.getElementById('tool-eraser').classList.remove('active');
    } else {
        currentTool = tool;
        drawCanvas.style.pointerEvents = 'auto'; // Enable drawing on canvas
        document.getElementById('tool-pen').classList.toggle('active', tool === 'pen');
        document.getElementById('tool-eraser').classList.toggle('active', tool === 'eraser');
    }
}

function handleDrawing(e) {
    if (!isDrawing) return;
    const [x, y] = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

function startDrawing(e) {
    if (e.button !== 0 || !currentTool) return;
    isDrawing = true;
    [lastX, lastY] = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.strokeStyle = document.getElementById('draw-color').value;
    ctx.lineWidth = document.getElementById('draw-width').value;
    ctx.globalCompositeOperation = (currentTool === 'eraser') ? 'destination-out' : 'source-over';
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();
}

function clearCanvas() {
    if (confirm('Are you sure you want to clear all drawings?')) {
        ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
}

function getCanvasCoords(e) {
    const boardRect = drawCanvas.getBoundingClientRect();
    return [e.clientX - boardRect.left, e.clientY - boardRect.top];
}

function addToTracker(nameFromMenu = null) {
    const nameInput = document.getElementById('turn-add-name');
    const name = nameFromMenu || nameInput.value.trim();
    if (name) {
        if (turnOrder.some(p => p.name === name)) {
            alert(`'${name}' is already in the turn tracker.`);
            return;
        }
        turnOrder.push({ name: name });
        nameInput.value = '';
        redrawTurnList();
    }
}

function nextTurn() {
    if (turnOrder.length === 0) return;
    currentTurnIndex++;
    if (currentTurnIndex >= turnOrder.length) {
        currentTurnIndex = 0; // Loop back to the start
    }
    redrawTurnList();
}

function clearTracker() {
    if (confirm('Are you sure you want to clear the turn tracker?')) {
        turnOrder = [];
        currentTurnIndex = -1;
        redrawTurnList();
    }
}

function redrawTurnList() {
    const listEl = document.getElementById('turn-list');
    listEl.innerHTML = '';
    turnOrder.forEach((p, index) => {
        const li = document.createElement('li');
        li.innerText = p.name;
        if (index === currentTurnIndex) {
            li.classList.add('current-turn');
        }
        listEl.appendChild(li);
    });
}

function rollDice(sides) {
    const diceResultEl = document.getElementById('dice-result');
    const diceLogEl = document.getElementById('dice-log');
    const result = Math.floor(Math.random() * sides) + 1;
    
    // ไม่จำเป็นต้องอัปเดต UI ตรงนี้โดยตรงแล้ว เพราะ onSnapshot จะจัดการให้
    // diceResultEl.innerText = result; 

    // ไม่จำเป็นต้องบันทึกใน diceLogEl ตรงนี้แล้ว เพราะ onSnapshot จะจัดการให้
    // const logEntry = document.createElement('div');
    // logEntry.innerHTML = `d${sides} 🎲: <strong>${result}</strong>`;
    // diceLogEl.prepend(logEntry); // Add to the top
    // if (diceLogEl.children.length > 15) {
    //     diceLogEl.lastChild.remove();
    // }

    // === เพิ่มส่วนนี้เพื่อส่งข้อมูลไป Firestore ===
    if (window.db) {
        window.addDoc(window.collection(window.db, 'diceRolls'), {
            result: result,
            sides: sides,
            // ในหน้าหลักอาจจะไม่มี playerName โดยตรง, หรือจะใส่ 'DM' ก็ได้
            playerName: "DM", 
            timestamp: window.serverTimestamp() // เวลาปัจจุบันของ Server
        }).then(() => {
            console.log("Dice roll sent to Firestore!");
        }).catch((error) => {
            console.error("Error writing document: ", error);
        });
    } else {
        console.warn("Firebase Firestore not initialized. Dice roll not sent.");
        // ถ้า Firebase ไม่มี ให้ย้อนกลับไปใช้ logic เดิม (ไม่แนะนำ)
        diceResultEl.innerText = result;
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `d${sides} 🎲: <strong>${result}</strong>`;
        diceLogEl.prepend(logEntry);
        if (diceLogEl.children.length > 15) {
            diceLogEl.lastChild.remove();
        }
    }
    // === สิ้นสุดการเพิ่มส่วนนี้ ===
}

// =================================================================
// SECTION: Save & Load (localStorage version)
// =================================================================
function saveGame() {
    const fogState = [];
    document.querySelectorAll('.fog-cell').forEach(cell => {
        fogState.push(cell.classList.contains('is-revealed'));
    });

    const boardState = {
        mapUrl: board.style.backgroundImage,
        tokens: [],
        fog: fogState,
        isFogActive: fogContainer.classList.contains('is-active'),
        drawingData: drawCanvas.toDataURL(),
        turnOrder: turnOrder,
        currentTurnIndex: currentTurnIndex
    };

    document.querySelectorAll('.token').forEach(tokenEl => {
        boardState.tokens.push({
            imageUrl: tokenEl.style.backgroundImage,
            name: tokenEl.querySelector('.token-name')?.innerText || "",
            type: tokenEl.classList.contains('player') ? 'player' : 'monster',
            hpMax: tokenEl.dataset.hpMax,
            hpCurrent: tokenEl.dataset.hpCurrent,
            size: Math.round(tokenEl.offsetWidth / cellSize),
            top: tokenEl.style.top,
            left: tokenEl.style.left
        });
    });

    try {
        localStorage.setItem('dndBoardSave', JSON.stringify(boardState));
        alert('Game Saved!');
    } catch (e) {
        console.error("Error saving to localStorage:", e);
        alert('Error: Could not save game. The board state might be too large.');
    }
}

function loadGame() {
    const savedStateJSON = localStorage.getItem('dndBoardSave');
    if (!savedStateJSON) {
        console.log("No saved game found.");
        return;
    }
    try {
        const savedState = JSON.parse(savedStateJSON);
        buildBoardFromState(savedState);
    } catch (e) {
        console.error("Error loading data:", e);
        alert("Could not load game. Save file may be corrupt.");
    }
}

function buildBoardFromState(state) {
    // Clear board and recreate main elements to prevent duplicating listeners
    board.innerHTML = '';
    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'grid-overlay';
    const newFogContainer = document.createElement('div');
    newFogContainer.id = 'fog-container';
    const newDrawCanvas = document.createElement('canvas');
    newDrawCanvas.id = 'drawing-canvas';
    board.append(gridOverlay, newFogContainer, newDrawCanvas);

    // Re-assign global variables to the new elements
    fogContainer = document.getElementById('fog-container');
    drawCanvas = document.getElementById('drawing-canvas');
    ctx = drawCanvas.getContext('2d');

    // Re-initialize systems with the new elements
    addCanvasListeners();
    initializeCanvas();
    initializeFog();

    // Restore state
    board.style.backgroundImage = state.mapUrl;

    if (state.isFogActive) {
        fogContainer.classList.add('is-active');
    }

    const allFogCells = document.querySelectorAll('.fog-cell');
    if (state.fog && state.fog.length === allFogCells.length) {
        allFogCells.forEach((cell, index) => {
            if (state.fog[index]) {
                cell.classList.add('is-revealed');
            }
        });
    }

    if (state.drawingData) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state.drawingData;
    }

    turnOrder = state.turnOrder || [];
    currentTurnIndex = state.currentTurnIndex === undefined ? -1 : state.currentTurnIndex;
    redrawTurnList();

    if (state.tokens && Array.isArray(state.tokens)) {
        state.tokens.forEach(tokenData => {
            const newToken = createTokenElement(
                tokenData.imageUrl,
                tokenData.type,
                tokenData.name,
                tokenData.size,
                tokenData.hpMax
            );
            newToken.dataset.hpCurrent = tokenData.hpCurrent;
            updateHpDisplay(newToken);
            newToken.style.top = tokenData.top;
            newToken.style.left = tokenData.left;
        });
    }
}

// =================================================================
// SECTION: Core Event Listeners
// =================================================================

// Token Movement
board.addEventListener('mousemove', (e) => {
    if (!activeToken) return;
    e.preventDefault();
    const boardRect = board.getBoundingClientRect();
    let newX = e.clientX - initialX - boardRect.left;
    let newY = e.clientY - initialY - boardRect.top;
    activeToken.style.left = `${newX}px`;
    activeToken.style.top = `${newY}px`;
});

// Snap token to grid on release
document.addEventListener('mouseup', (e) => {
    isRevealingFog = false; // Stop revealing fog on any mouseup event
    if (!activeToken) return;

    const boardRect = board.getBoundingClientRect();
    const currentTokenX = parseFloat(activeToken.style.left);
    const currentTokenY = parseFloat(activeToken.style.top);

    // Snap to grid
    const snapX = Math.round(currentTokenX / cellSize) * cellSize;
    const snapY = Math.round(currentTokenY / cellSize) * cellSize;

    // Boundary checks
    const maxCols = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols'));
    const maxRows = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-rows'));
    const tokenCols = Math.round(activeToken.offsetWidth / cellSize);
    const tokenRows = Math.round(activeToken.offsetHeight / cellSize);
    const maxSnapX = (maxCols - tokenCols) * cellSize;
    const maxSnapY = (maxRows - tokenRows) * cellSize;

    activeToken.style.left = `${Math.max(0, Math.min(snapX, maxSnapX))}px`;
    activeToken.style.top = `${Math.max(0, Math.min(snapY, maxSnapY))}px`;

    activeToken.style.zIndex = (activeToken.classList.contains('player')) ? 30 : 25;
    activeToken = null;
});

// Deselect tokens when clicking on the board itself
board.addEventListener('mousedown', (e) => {
    if (e.target === board || e.target === grid - overlay) {
        deselectTokens();
    }
});

// Delete selected token with keyboard
document.addEventListener('keydown', (e) => {
    if (selectedToken && (e.key === 'Delete' || e.key === 'Backspace')) {
        // Prevent browser back navigation on Backspace
        e.preventDefault();
        rightClickedToken = selectedToken; // Use the context menu's logic for deletion
        handleDeleteToken();
    }
});

// Drawing Listeners
function addCanvasListeners() {
    drawCanvas.addEventListener('mousedown', startDrawing);
    drawCanvas.addEventListener('mousemove', handleDrawing);
    drawCanvas.addEventListener('mouseup', stopDrawing);
    drawCanvas.addEventListener('mouseleave', stopDrawing);
}