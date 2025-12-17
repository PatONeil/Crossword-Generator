const DB_NAME = 'CrosswordGenDB';
const STORE_NAME = 'handles';
const KEY_NAME = 'projectDirectory';

export class FileSystemManager {
    constructor() {
        this.dirHandle = null;
    }

    // --- IndexedDB Helpers ---
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getStoredHandle() {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(KEY_NAME);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async storeHandle(handle) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(handle, KEY_NAME);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // --- Directory Logic ---

    async connect(interactive = false) {
        // 1. Check existing
        const existing = await this.getStoredHandle();

        if (existing) {
            // Verify permission
            const perm = await this.verifyPermission(existing, true, interactive);
            if (perm) {
                this.dirHandle = existing;
                return true;
            }
        }

        // If not interactive, stop here
        if (!interactive) return false;

        // 2. Request new
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            this.dirHandle = handle;
            await this.storeHandle(handle);
            return true;
        } catch (e) {
            console.error("Directory picker cancelled or failed", e);
            return false;
        }
    }

    async verifyPermission(fileHandle, withWrite, interactive = false) {
        const opts = {};
        if (withWrite) {
            opts.mode = 'readwrite';
        }
        // Check if we already have permission
        try {
            if ((await fileHandle.queryPermission(opts)) === 'granted') {
                return true;
            }
            // Request permission only if interactive
            if (interactive) {
                if ((await fileHandle.requestPermission(opts)) === 'granted') {
                    return true;
                }
            }
        } catch (e) {
            console.error("Permission check failed", e);
            return false;
        }
        return false;
    }

    // --- File Operations ---

    async getSubFile(subfolder, filename, create = false) {
        if (!this.dirHandle) throw new Error("No directory connected");

        let targetHandle = this.dirHandle;

        if (subfolder) {
            targetHandle = await this.dirHandle.getDirectoryHandle(subfolder, { create: true });
        }

        return await targetHandle.getFileHandle(filename, { create });
    }

    async saveFile(subfolder, filename, content) {
        const fileHandle = await this.getSubFile(subfolder, filename, true);
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async readFile(subfolder, filename) {
        const fileHandle = await this.getSubFile(subfolder, filename, false);
        const file = await fileHandle.getFile();
        return await file.text();
    }

    async listFiles(subfolder, extension = '') {
        if (!this.dirHandle) return [];
        try {
            let targetHandle = this.dirHandle;
            if (subfolder) {
                // If subfolder doesn't exist, return empty
                try {
                    targetHandle = await this.dirHandle.getDirectoryHandle(subfolder);
                } catch {
                    return [];
                }
            }

            const files = [];
            for await (const entry of targetHandle.values()) {
                if (entry.kind === 'file') {
                    if (!extension || entry.name.endsWith(extension)) {
                        files.push(entry.name);
                    }
                }
            }
            return files;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
}
