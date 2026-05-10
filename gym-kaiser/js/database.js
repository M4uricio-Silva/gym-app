// js/database.js
const dbName = 'GymAppDB';
let dbInstance = null;

function initDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);
        const req = indexedDB.open(dbName, 2);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('exercises')) db.createObjectStore('exercises', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('workouts')) db.createObjectStore('workouts', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
        };
        req.onsuccess = (e) => resolve(dbInstance = e.target.result);
        req.onerror = (e) => reject(e);
    });
}

async function dbAdd(store, data) {
    const db = await initDB();
    return new Promise(r => { db.transaction([store], 'readwrite').objectStore(store).put(data).onsuccess = () => r(); });
}

async function dbGetAll(store) {
    const db = await initDB();
    return new Promise(r => { db.transaction([store], 'readonly').objectStore(store).getAll().onsuccess = (e) => r(e.target.result); });
}

async function dbDelete(store, id) {
    const db = await initDB();
    return new Promise(r => { db.transaction([store], 'readwrite').objectStore(store).delete(id).onsuccess = () => r(); });
}