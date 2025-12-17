import { GRID_SIZE } from './CrosswordModel.js';


export class ExportTab {
    constructor(model, gridController, fsManager) {
        this.model = model;
        this.gridController = gridController;
        this.fsManager = fsManager;

        this.filenameInput = document.getElementById('export-filename');
        this.exportBtn = document.getElementById('export-json-btn');
        this.puzExportBtn = document.getElementById('export-puz-btn');

        if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportPuzzleJSON());
        if (this.puzExportBtn) this.puzExportBtn.addEventListener('click', () => this.exportPuzzlePUZ());
    }

    updateUI() {
        // Auto-fill filename from title if empty
        const currentVal = this.filenameInput.value.trim();
        if (!currentVal) {
            const title = (this.model.metadata && this.model.metadata.title) || '';
            if (title) {
                this.filenameInput.value = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            }
        }
    }

    getFilename() {
        let filename = this.filenameInput ? this.filenameInput.value.trim() : '';
        if (!filename) {
            const title = (this.model.metadata && this.model.metadata.title) || 'puzzle';
            filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        }
        return filename;
    }

    async saveFile(filename, blobOrString) {
        if (this.fsManager && this.fsManager.dirHandle) {
            await this.fsManager.saveFile('exports', filename, blobOrString);
            alert(`Exported to /exports/${filename}`);
        } else {
            // Fallback to file picker
            if (!('showSaveFilePicker' in window)) {
                // Last ditch: download anchor
                const blob = blobOrString instanceof Blob ? blobOrString : new Blob([blobOrString], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                return;
            }
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                });
                const writable = await handle.createWritable();
                await writable.write(blobOrString);
                await writable.close();
                alert('Exported!');
            } catch (err) {
                // User cancelled or error
                console.error(err);
            }
        }
    }

    generatePuzzleJSON() {
        // Numbering Logic
        const gridnums = Array(GRID_SIZE * GRID_SIZE).fill(0);
        let currentNum = 1;
        const grid = [];

        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            if (this.model.gridState[i] === 1) {
                grid.push('.');
                gridnums[i] = 0;
            } else {
                grid.push(this.model.gridContent[i] || ' ');
                const row = Math.floor(i / GRID_SIZE);
                const col = i % GRID_SIZE;
                let isStart = false;
                if (col < GRID_SIZE - 1 && this.model.gridState[i + 1] === 0) {
                    if (col === 0 || this.model.gridState[i - 1] === 1) isStart = true;
                }
                if (row < GRID_SIZE - 1 && this.model.gridState[i + GRID_SIZE] === 0) {
                    if (row === 0 || this.model.gridState[i - GRID_SIZE] === 1) isStart = true;
                }
                if (isStart) gridnums[i] = currentNum++;
            }
        }

        // Clues
        const finalClues = { across: [], down: [] };
        const getDef = (word) => {
            const entry = this.model.dictionary[word];
            if (entry && entry.defs && entry.defs.length > 0) return entry.defs[0];
            return "___";
        };

        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            if (gridnums[i] > 0) {
                const r = Math.floor(i / GRID_SIZE);
                const c = i % GRID_SIZE;
                const num = gridnums[i];

                // Across
                if (c < GRID_SIZE - 1 && this.model.gridState[i + 1] === 0 && (c === 0 || this.model.gridState[i - 1] === 1)) {
                    let word = '';
                    let k = 0;
                    while (c + k < GRID_SIZE && this.model.gridState[i + k] === 0) {
                        word += this.model.gridContent[i + k] || '?';
                        k++;
                    }
                    if (word.length > 1) finalClues.across.push(`${num}. ${getDef(word)}`);
                }

                // Down
                if (r < GRID_SIZE - 1 && this.model.gridState[i + GRID_SIZE] === 0 && (r === 0 || this.model.gridState[i - GRID_SIZE] === 1)) {
                    let word = '';
                    let k = 0;
                    while (r + k < GRID_SIZE && this.model.gridState[i + k * GRID_SIZE] === 0) {
                        word += this.model.gridContent[i + k * GRID_SIZE] || '?';
                        k++;
                    }
                    if (word.length > 1) finalClues.down.push(`${num}. ${getDef(word)}`);
                }
            }
        }

        const meta = this.model.metadata || {};
        return {
            title: meta.title || "Untitled",
            author: meta.author || "Anonymous",
            copyright: meta.copyright || `©${new Date().getFullYear()}`,
            notes: meta.notes || "",
            clues: finalClues,
            grid: grid,
            gridnums: gridnums,
            size: { rows: GRID_SIZE, cols: GRID_SIZE }
        };
    }

    async exportPuzzleJSON() {
        try {
            const data = this.generatePuzzleJSON();
            const jsonStr = JSON.stringify(data, null, 2);
            let filename = this.getFilename();
            if (!filename.toLowerCase().endsWith('.json')) filename += '.json';
            await this.saveFile(filename, jsonStr);
        } catch (err) {
            console.error(err);
            alert("Export failed: " + err.message);
        }
    }

    // Checksum helper for PUZ
    cksum(data, start = 0, len = null, initial = 0) {
        if (len === null) len = data.length - start;
        let sum = initial;
        for (let i = 0; i < len; i++) {
            if (sum & 1) sum = (sum >> 1) + 0x8000;
            else sum = sum >> 1;
            sum = (sum + data[start + i]) & 0xFFFF;
        }
        return sum;
    }

    async exportPuzzlePUZ() {
        try {
            const width = GRID_SIZE;
            const height = GRID_SIZE;
            const meta = this.model.metadata || {};
            const title = meta.title || "Untitled";
            const author = meta.author || "Anonymous";
            const copyright = meta.copyright || `©${new Date().getFullYear()}`;
            const notes = meta.notes || "";

            // Prepare Grid and Clues
            let solution = "";
            let state = "";
            const cluesList = [];
            const getDef = (word) => {
                const entry = this.model.dictionary[word];
                if (entry && entry.defs && entry.defs.length > 0) return entry.defs[0];
                return "___";
            };

            // Calculate grid numbers and extract clues in proper order
            const gridnums = Array(width * height).fill(0);
            let currentNum = 1;

            for (let i = 0; i < width * height; i++) {
                const r = Math.floor(i / width);
                const c = i % width;
                const isBlack = this.model.gridState[i] === 1;
                const char = this.model.gridContent[i] || ' ';

                solution += isBlack ? '.' : (char === ' ' ? 'X' : char); // 'X' placeholder if empty but not black
                state += isBlack ? '.' : '-';

                if (!isBlack) {
                    let isStart = false;
                    let hasAcross = false;
                    let hasDown = false;

                    // Check Across Start
                    if (c < width - 1 && this.model.gridState[i + 1] === 0) {
                        if (c === 0 || this.model.gridState[i - 1] === 1) {
                            isStart = true;
                            hasAcross = true;
                        }
                    }
                    // Check Down Start
                    if (r < height - 1 && this.model.gridState[i + width] === 0) {
                        if (r === 0 || this.model.gridState[i - width] === 1) {
                            isStart = true;
                            hasDown = true;
                        }
                    }

                    if (isStart) {
                        gridnums[i] = currentNum++;
                        // PUZ order: Across then Down
                        if (hasAcross) {
                            let word = '';
                            let k = 0;
                            while (c + k < width && this.model.gridState[i + k] === 0) {
                                word += this.model.gridContent[i + k] || '?';
                                k++;
                            }
                            cluesList.push(getDef(word));
                        }
                        if (hasDown) {
                            let word = '';
                            let k = 0;
                            while (r + k < height && this.model.gridState[i + k * width] === 0) {
                                word += this.model.gridContent[i + k * width] || '?';
                                k++;
                            }
                            cluesList.push(getDef(word));
                        }
                    }
                }
            }

            // Encode strings (ISO-8859-1 ideally, but UTF-8 is often accepted or we strip)
            const enc = new TextEncoder(); // UTF-8
            const nullByte = new Uint8Array([0]);

            const strBytes = (str) => {
                // Simple cleaning to avoid multibyte if strict, but let's try UTF-8 first.
                // If we want strict binary strings (latin-1), we might need manual mapping.
                // For now, using TextEncoder + null terminator.
                const b = enc.encode(str);
                const res = new Uint8Array(b.length + 1);
                res.set(b);
                return res;
            };

            const titleBytes = strBytes(title);
            const authorBytes = strBytes(author);
            const copyrightBytes = strBytes(copyright);
            const notesBytes = strBytes(notes);
            const clueBytesArr = cluesList.map(c => strBytes(c));

            // Header is 0x34 (52) bytes + data
            // Total size calculation
            let totalSize = 0x34 + (width * height) * 2; // Header + Solution + State
            totalSize += titleBytes.length + authorBytes.length + copyrightBytes.length;
            clueBytesArr.forEach(b => totalSize += b.length);
            totalSize += notesBytes.length;

            const buffer = new Uint8Array(totalSize);
            const view = new DataView(buffer.buffer);

            let offset = 0;

            // 1. Placeholder Checksum (0x00) - fill later
            offset += 2;

            // 2. Magic String (0x02) - 12 bytes
            const magic = "ACROSS&DOWN";
            for (let i = 0; i < magic.length; i++) buffer[2 + i] = magic.charCodeAt(i);
            buffer[2 + 11] = 0; // null terminator implicitly or explicitly
            offset += 12;

            // 3. CIB Checksum (0x0E) - fill later
            offset += 2;

            // 4. Masked Low Checksums (0x10) - 4 bytes - fill later
            offset += 4;

            // 5. Masked High Checksums (0x14) - 4 bytes - fill later
            offset += 4;

            // 6. Version String (0x18) - 4 bytes "1.3\0"
            const version = "1.3";
            for (let i = 0; i < version.length; i++) buffer[0x18 + i] = version.charCodeAt(i);
            buffer[0x18 + 3] = 0;
            offset += 4;

            // 7. Reserved (0x1C) - 2 bytes
            offset += 2;

            // 8. Scrambled Checksum (0x1E) - 2 bytes -> 0
            offset += 2;

            // 9. Reserved (0x20) - 12 bytes
            offset += 12;

            // 10. Width (0x2C)
            view.setUint8(0x2C, width);
            offset++;

            // 11. Height (0x2D)
            view.setUint8(0x2D, height);
            offset++;

            // 12. Num Clues (0x2E)
            view.setUint16(0x2E, cluesList.length, true); // Little endian
            offset += 2;

            // 13. Unknown Bitmask (0x30)
            view.setUint16(0x30, 0x01, true);
            offset += 2;

            // 14. Scrambled Tag (0x32)
            view.setUint16(0x32, 0, true);
            offset += 2;

            // Body: Solution
            const solutionBytes = enc.encode(solution);
            // Ensure solution is exactly w*h bytes and ASCII compatible (TextEncoder handles mostly, but we want 1 char per byte)
            // Just direct copy considering simple chars
            for (let i = 0; i < solution.length; i++) buffer[0x34 + i] = solution.charCodeAt(i);
            let cursor = 0x34 + width * height;

            // Body: State
            for (let i = 0; i < state.length; i++) buffer[cursor + i] = state.charCodeAt(i);
            cursor += width * height;

            // Strings
            const writeStr = (bArr) => {
                buffer.set(bArr, cursor);
                cursor += bArr.length;
            };

            writeStr(titleBytes);
            writeStr(authorBytes);
            writeStr(copyrightBytes);
            clueBytesArr.forEach(b => writeStr(b));
            writeStr(notesBytes);

            // Checksum Calculations
            // CIB Checksum: 0x2C (start), length 8
            const cibSum = this.cksum(buffer, 0x2C, 8, 0);
            view.setUint16(0x0E, cibSum, true);

            // Primary Checksum (0x00)
            let c_cib = cibSum;
            let c_sol = this.cksum(buffer, 0x34, width * height, 0);
            let c_grid = this.cksum(buffer, 0x34 + width * height, width * height, 0);
            let c_part = 0;

            // For partials, we compute checksum of string data including nulls
            // Title
            let strStart = 0x34 + 2 * width * height;
            // Determine length of all strings
            let strLen = cursor - strStart;
            let c_str = 0;
            if (strLen > 0) {
                c_str = this.cksum(buffer, strStart, strLen, 0);
            }

            let finalSum = 0x0000;
            finalSum = c_cib;
            finalSum = this.cksum(buffer, 0x34, width * height, finalSum); // Solution
            finalSum = this.cksum(buffer, 0x34 + width * height, width * height, finalSum); // Grid
            if (strLen > 0) finalSum = this.cksum(buffer, strStart, strLen, finalSum); // Strings

            view.setUint16(0x00, finalSum, true);

            // Export
            let filename = this.getFilename();
            if (!filename.toLowerCase().endsWith('.puz')) filename += '.puz';

            // Create Blob
            const blob = new Blob([buffer], { type: "application/x-crossword" });

            await this.saveFile(filename, blob);

        } catch (err) {
            console.error(err);
            alert("Export PUZ failed: " + err.message);
        }
    }
}
