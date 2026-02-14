const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключаемся к базе данных
const db = new sqlite3.Database(path.join(__dirname, 'payments.db'));

db.serialize(() => {
  // Таблица подтвержденных платежей
  db.run(`
    CREATE TABLE IF NOT EXISTS confirmed_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      photo_id TEXT,
      status TEXT DEFAULT 'active',
      confirmed_by INTEGER,
      confirmed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Таблица ожидающих платежей (временная)
  db.run(`
    CREATE TABLE IF NOT EXISTS pending_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('База данных инициализирована');
});



// Функция для сохранения платежа
function savePayment(userId, username, productId, productName, photoId = null) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO confirmed_payments (user_id, username, product_id, product_name, photo_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, username, productId, productName, photoId, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
    
    stmt.finalize();
  });
}

// Функция для получения платежей
function getPayments(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT *, 
       DATE(created_at, '+30 days') as valid_until,
       CASE 
         WHEN DATE(created_at, '+30 days') > DATE('now') THEN 'active'
         ELSE 'expired'
       END as status
       FROM confirmed_payments ORDER BY created_at DESC LIMIT ?`,  
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}


// Функция для сохранения ожидающего платежа
function savePendingPayment(userId, username, productId, productName, photoId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO pending_payments (user_id, username, product_id, product_name, photo_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, username, productId, productName, photoId, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
    
    stmt.finalize();
  });
}

// Функция для получения ожидающего платежа по ID
function getPendingPayment(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM pending_payments WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Функция для подтверждения платежа
function confirmPayment(pendingId, adminId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Получаем данные из pending_payments
      db.get(`SELECT * FROM pending_payments WHERE id = ?`, [pendingId], (err, pending) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!pending) {
          reject(new Error('Pending payment not found'));
          return;
        }
        
        // 2. Сохраняем в confirmed_payments
        const stmt = db.prepare(`
          INSERT INTO confirmed_payments 
          (user_id, username, product_id, product_name, photo_id, confirmed_by, confirmed_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(pending.user_id, pending.username, pending.product_id, 
                 pending.product_name, pending.photo_id, adminId, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const confirmedId = this.lastID;
          
          // 3. Удаляем из pending_payments
          db.run(`DELETE FROM pending_payments WHERE id = ?`, [pendingId], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                confirmedId,
                userId: pending.user_id,
                username: pending.username,
                productName: pending.product_name
              });
            }
          });
        });
        
        stmt.finalize();
      });
    });
  });
}

// Функция для отклонения платежа
function rejectPayment(pendingId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM pending_payments WHERE id = ?`, [pendingId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Функция для получения всех ожидающих платежей
function getPendingPayments() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM pending_payments ORDER BY created_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}


// Функция для автоматической очистки старых записей
function cleanupOldPendingPayments() {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      DELETE FROM pending_payments 
      WHERE created_at < datetime('now', '-7 days')
    `);
    
    stmt.run((err) => {
      if (err) {
        console.error('Ошибка при очистке старых платежей:', err);
        reject(err);
      } else {
        console.log('Старые ожидающие платежи очищены');
        resolve();
      }
    });
    
    stmt.finalize();
  });
}


//добавляем функцию для получения платежей пользователя(для клиента)
function getUserPayments(userId, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT *, 
       DATE(COALESCE(confirmed_at, created_at), '+30 days') as valid_until,
       CASE 
         WHEN DATE(COALESCE(confirmed_at, created_at), '+30 days') > DATE('now') THEN 'active'
         ELSE 'expired'
       END as status
       FROM confirmed_payments 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Также добавим функцию для подсчета активных курсов (для клиента)
function getUserActiveCoursesCount(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count 
       FROM confirmed_payments 
       WHERE user_id = ? 
       AND DATE(COALESCE(confirmed_at, created_at), '+30 days') > DATE('now')`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });
}





module.exports = { 
  savePayment, 
  getPayments, 
  savePendingPayment, 
  getPendingPayment, 
  confirmPayment, 
  rejectPayment, 
  cleanupOldPendingPayments,
  getPendingPayments,
  getUserPayments,
  getUserActiveCoursesCount, 
};
