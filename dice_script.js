// ใน dice_script.js

document.addEventListener('DOMContentLoaded', () => {
    // โหลดชื่อผู้เล่นจาก localStorage
    const savedName = localStorage.getItem('dicePlayerName');
    if (savedName) {
        document.getElementById('player-name').value = savedName;
    }

    // เมื่อชื่อผู้เล่นเปลี่ยน ให้บันทึก
    document.getElementById('player-name').addEventListener('input', (e) => {
        localStorage.setItem('dicePlayerName', e.target.value);
    });

    // === เพิ่มส่วนนี้สำหรับการฟังผลลูกเต๋าจาก Firestore ===
    if (window.db) { // ตรวจสอบว่า Firebase โหลดแล้ว
        const diceRollsCol = window.collection(window.db, 'diceRolls');
        const q = window.query(diceRollsCol, window.orderBy('timestamp', 'desc'), window.limit(20)); // ดึง 20 รายการล่าสุด

        window.onSnapshot(q, (snapshot) => {
            const diceLogEl = document.getElementById('dice-log');
            // ล้าง Log เดิมก่อนแสดงรายการใหม่
            diceLogEl.innerHTML = ''; 

            snapshot.forEach((doc) => {
                const data = doc.data();
                const logEntry = document.createElement('div');
                const playerName = data.playerName ? `<strong>${data.playerName}</strong> ` : '';
                logEntry.innerHTML = `${playerName} d${data.sides} 🎲: <strong>${data.result}</strong>`;
                diceLogEl.appendChild(logEntry); // เพิ่มต่อท้าย
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

function rollDice(sides) {
    const playerName = document.getElementById('player-name').value.trim();
    const diceResultEl = document.getElementById('dice-result');
    const diceLogEl = document.getElementById('dice-log');
    const result = Math.floor(Math.random() * sides) + 1;

    // ไม่จำเป็นต้องอัปเดต UI ตรงนี้โดยตรงแล้ว เพราะ onSnapshot จะจัดการให้
    // diceResultEl.innerText = result; 
    // const logEntry = document.createElement('div');
    // const namePrefix = playerName ? `<strong>${playerName}</strong> ` : '';
    // logEntry.innerHTML = `${namePrefix} d${sides} 🎲: <strong>${result}</strong>`;
    // diceLogEl.prepend(logEntry); 
    // if (diceLogEl.children.length > 20) {
    //     diceLogEl.lastChild.remove();
    // }

    // === เพิ่มส่วนนี้เพื่อส่งข้อมูลไป Firestore ===
    if (window.db) {
        window.addDoc(window.collection(window.db, 'diceRolls'), {
            result: result,
            sides: sides,
            playerName: playerName || "Anonymous", // ใช้ชื่อที่ผู้เล่นใส่ หรือ "Anonymous"
            timestamp: window.serverTimestamp() // เวลาปัจจุบันของ Server
        }).then(() => {
            console.log("Dice roll sent to Firestore!");
        }).catch((error) => {
            console.error("Error writing document: ", error);
        });
    } else {
        console.warn("Firebase Firestore not initialized. Dice roll not sent.");
        // ถ้า Firebase ไม่มี ให้ย้อนกลับไปใช้ logic เดิม
        diceResultEl.innerText = result;
        const logEntry = document.createElement('div');
        const namePrefix = playerName ? `<strong>${playerName}</strong> ` : '';
        logEntry.innerHTML = `${namePrefix} d${sides} 🎲: <strong>${result}</strong>`;
        diceLogEl.prepend(logEntry);
        if (diceLogEl.children.length > 20) {
            diceLogEl.lastChild.remove();
        }
    }
    // === สิ้นสุดการเพิ่มส่วนนี้ ===
}