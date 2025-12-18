import { G as GRID_SIZE } from "./CrosswordModel.js";
import { m as me } from "./jspdf.bundled.js";
class ExportTab {
  constructor(model, gridController, fsManager) {
    this.model = model;
    this.gridController = gridController;
    this.fsManager = fsManager;
    this.filenameInput = document.getElementById("export-filename");
    this.exportBtn = document.getElementById("export-json-btn");
    this.puzExportBtn = document.getElementById("export-puz-btn");
    this.pdfExportBtn = document.getElementById("export-pdf-btn");
    this.pdfPrintBtn = document.getElementById("print-pdf-btn");
    if (this.exportBtn) this.exportBtn.addEventListener("click", () => this.exportPuzzleJSON());
    if (this.puzExportBtn) this.puzExportBtn.addEventListener("click", () => this.exportPuzzlePUZ());
    if (this.pdfExportBtn) this.pdfExportBtn.addEventListener("click", () => this.exportPuzzlePDF());
    if (this.pdfPrintBtn) this.pdfPrintBtn.addEventListener("click", () => this.print_puzzle());
  }
  updateUI() {
    const currentVal = this.filenameInput.value.trim();
    if (!currentVal) {
      const title = this.model.metadata && this.model.metadata.title || "";
      if (title) {
        this.filenameInput.value = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      }
    }
  }
  getFilename() {
    let filename = this.filenameInput ? this.filenameInput.value.trim() : "";
    if (!filename) {
      const title = this.model.metadata && this.model.metadata.title || "puzzle";
      filename = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    }
    return filename;
  }
  async saveFile(filename, blobOrString, _alert = true) {
    if (this.fsManager && this.fsManager.dirHandle) {
      await this.fsManager.saveFile("exports", filename, blobOrString);
      if (_alert) alert(`Exported to /exports/${filename}`);
    } else {
      if (!("showSaveFilePicker" in window)) {
        const blob = blobOrString instanceof Blob ? blobOrString : new Blob([blobOrString], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename
        });
        const writable = await handle.createWritable();
        await writable.write(blobOrString);
        await writable.close();
        alert("Exported!");
      } catch (err) {
        console.error(err);
      }
    }
  }
  generatePuzzleJSON() {
    const gridnums = Array(GRID_SIZE * GRID_SIZE).fill(0);
    let currentNum = 1;
    const grid = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      if (this.model.gridState[i] === 1) {
        grid.push(".");
        gridnums[i] = 0;
      } else {
        grid.push(this.model.gridContent[i] || " ");
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
    const finalClues = { across: [], down: [] };
    for (let word of this.model.words) {
      if (word.direction == "across") {
        finalClues.across.push(`${word.number}. ${word.definition}`);
      }
      if (word.direction == "down") {
        finalClues.down.push(`${word.number}. ${word.definition}`);
      }
    }
    const meta = this.model.metadata || {};
    return {
      title: meta.title || "Untitled",
      author: meta.author || "Anonymous",
      copyright: meta.copyright || `©${(/* @__PURE__ */ new Date()).getFullYear()}`,
      notes: meta.notes || "",
      clues: finalClues,
      grid,
      gridnums,
      size: { rows: GRID_SIZE, cols: GRID_SIZE }
    };
  }
  async exportPuzzlePDF(_alert = true) {
    try {
      const data = this.generatePuzzleJSON();
      let filename = this.getFilename();
      if (!filename.toLowerCase().endsWith(".pdf")) filename += ".pdf";
      const doc = this.convert_to_PDF(data);
      const pdfBlob = doc.output("blob");
      await this.saveFile(filename, pdfBlob, _alert);
    } catch (err) {
      console.error(err);
      alert("Export failed: " + err.message);
    }
  }
  async exportPuzzleJSON() {
    try {
      const data = this.generatePuzzleJSON();
      const jsonStr = JSON.stringify(data, null, 2);
      let filename = this.getFilename();
      if (!filename.toLowerCase().endsWith(".json")) filename += ".json";
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
      if (sum & 1) sum = (sum >> 1) + 32768;
      else sum = sum >> 1;
      sum = sum + data[start + i] & 65535;
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
      const copyright = meta.copyright || `©${(/* @__PURE__ */ new Date()).getFullYear()}`;
      const notes = meta.notes || "";
      let solution = "";
      let state = "";
      const cluesList = [];
      const getDef = (word) => {
        const matches = this.model.words.filter((w) => w.word == word);
        if (matches && matches[0].definition) return matches[0].definition;
        else {
          console.log(`No definition for ${word}.`);
          debugger;
          return word;
        }
      };
      const gridnums = Array(width * height).fill(0);
      let currentNum = 1;
      for (let i = 0; i < width * height; i++) {
        const r = Math.floor(i / width);
        const c = i % width;
        const isBlack = this.model.gridState[i] === 1;
        const char = this.model.gridContent[i] || " ";
        solution += isBlack ? "." : char === " " ? "X" : char;
        state += isBlack ? "." : "-";
        if (!isBlack) {
          let isStart = false;
          let hasAcross = false;
          let hasDown = false;
          if (c < width - 1 && this.model.gridState[i + 1] === 0) {
            if (c === 0 || this.model.gridState[i - 1] === 1) {
              isStart = true;
              hasAcross = true;
            }
          }
          if (r < height - 1 && this.model.gridState[i + width] === 0) {
            if (r === 0 || this.model.gridState[i - width] === 1) {
              isStart = true;
              hasDown = true;
            }
          }
          if (isStart) {
            gridnums[i] = currentNum++;
            if (hasAcross) {
              let word = "";
              let k = 0;
              while (c + k < width && this.model.gridState[i + k] === 0) {
                word += this.model.gridContent[i + k] || "?";
                k++;
              }
              cluesList.push(getDef(word));
            }
            if (hasDown) {
              let word = "";
              let k = 0;
              while (r + k < height && this.model.gridState[i + k * width] === 0) {
                word += this.model.gridContent[i + k * width] || "?";
                k++;
              }
              cluesList.push(getDef(word));
            }
          }
        }
      }
      const enc = new TextEncoder();
      const nullByte = new Uint8Array([0]);
      const strBytes = (str) => {
        const b = enc.encode(str);
        const res = new Uint8Array(b.length + 1);
        res.set(b);
        return res;
      };
      const titleBytes = strBytes(title);
      const authorBytes = strBytes(author);
      const copyrightBytes = strBytes(copyright);
      const notesBytes = strBytes(notes);
      const clueBytesArr = cluesList.map((c) => strBytes(c));
      let totalSize = 52 + width * height * 2;
      totalSize += titleBytes.length + authorBytes.length + copyrightBytes.length;
      clueBytesArr.forEach((b) => totalSize += b.length);
      totalSize += notesBytes.length;
      const buffer = new Uint8Array(totalSize);
      const view = new DataView(buffer.buffer);
      let offset = 0;
      offset += 2;
      const magic = "ACROSS&DOWN";
      for (let i = 0; i < magic.length; i++) buffer[2 + i] = magic.charCodeAt(i);
      buffer[2 + 11] = 0;
      offset += 12;
      offset += 2;
      offset += 4;
      offset += 4;
      const version = "1.3";
      for (let i = 0; i < version.length; i++) buffer[24 + i] = version.charCodeAt(i);
      buffer[24 + 3] = 0;
      offset += 4;
      offset += 2;
      offset += 2;
      offset += 12;
      view.setUint8(44, width);
      offset++;
      view.setUint8(45, height);
      offset++;
      view.setUint16(46, cluesList.length, true);
      offset += 2;
      view.setUint16(48, 1, true);
      offset += 2;
      view.setUint16(50, 0, true);
      offset += 2;
      const solutionBytes = enc.encode(solution);
      for (let i = 0; i < solution.length; i++) buffer[52 + i] = solution.charCodeAt(i);
      let cursor = 52 + width * height;
      for (let i = 0; i < state.length; i++) buffer[cursor + i] = state.charCodeAt(i);
      cursor += width * height;
      const writeStr = (bArr) => {
        buffer.set(bArr, cursor);
        cursor += bArr.length;
      };
      writeStr(titleBytes);
      writeStr(authorBytes);
      writeStr(copyrightBytes);
      clueBytesArr.forEach((b) => writeStr(b));
      writeStr(notesBytes);
      const cibSum = this.cksum(buffer, 44, 8, 0);
      view.setUint16(14, cibSum, true);
      let c_cib = cibSum;
      let c_sol = this.cksum(buffer, 52, width * height, 0);
      let c_grid = this.cksum(buffer, 52 + width * height, width * height, 0);
      let c_part = 0;
      let strStart = 52 + 2 * width * height;
      let strLen = cursor - strStart;
      let c_str = 0;
      if (strLen > 0) {
        c_str = this.cksum(buffer, strStart, strLen, 0);
      }
      let finalSum = 0;
      finalSum = c_cib;
      finalSum = this.cksum(buffer, 52, width * height, finalSum);
      finalSum = this.cksum(buffer, 52 + width * height, width * height, finalSum);
      if (strLen > 0) finalSum = this.cksum(buffer, strStart, strLen, finalSum);
      view.setUint16(0, finalSum, true);
      let filename = this.getFilename();
      if (!filename.toLowerCase().endsWith(".puz")) filename += ".puz";
      const blob = new Blob([buffer], { type: "application/x-crossword" });
      await this.saveFile(filename, blob);
    } catch (err) {
      console.error(err);
      alert("Export PUZ failed: " + err.message);
    }
  }
  convert_to_PDF(data) {
    const { grid, gridnums, answers, clues, size, title, author, date } = data;
    const gridSize = size.rows;
    const doc = new me({
      orientation: "portrait",
      unit: "in",
      format: "letter"
    });
    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 0.5;
    const maxGridSize = 3.75;
    const cellSize = maxGridSize / gridSize;
    const gridPixelSize = cellSize * gridSize;
    const startX = (pageWidth - gridPixelSize) / 2;
    const startY = 1;
    doc.setFontSize(16);
    doc.setFont(void 0, "bold");
    doc.text(title || "Crossword Puzzle", pageWidth / 2, 0.5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(void 0, "normal");
    if (author) {
      doc.text(`By ${author}`, pageWidth / 2, 0.7, { align: "center" });
    }
    if (date) {
      doc.text(date, pageWidth / 2, 0.85, { align: "center" });
    }
    doc.setLineWidth(0.01);
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        const cell = grid[idx];
        if (cell === ".") {
          doc.setFillColor(0, 0, 0);
          doc.rect(x, y, cellSize, cellSize, "F");
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(x, y, cellSize, cellSize, "FD");
          if (gridnums[idx] > 0) {
            doc.setFontSize(5);
            doc.setFont(void 0, "normal");
            const numX = x + 0.02;
            const numY = y + 0.06;
            doc.text(gridnums[idx].toString(), numX, numY);
          }
        }
      }
    }
    const cluesStartY = startY + gridPixelSize + 0.3;
    const columnWidth = 3.75;
    const leftColumnX = margin;
    const rightColumnX = pageWidth / 2 + 0.1;
    doc.setFontSize(10);
    doc.setFont(void 0, "bold");
    doc.text("ACROSS", leftColumnX, cluesStartY);
    doc.setFontSize(8);
    doc.setFont(void 0, "normal");
    let currentY = cluesStartY + 0.15;
    const lineHeight = 0.12;
    const maxY = pageHeight - margin;
    clues.across.forEach((clue) => {
      if (currentY > maxY) {
        currentY = cluesStartY + 0.15;
      }
      const clueText = clue;
      const lines = doc.splitTextToSize(clueText, columnWidth);
      lines.forEach((line) => {
        if (currentY <= maxY) {
          doc.text(line, leftColumnX, currentY);
          currentY += lineHeight;
        }
      });
    });
    doc.setFontSize(10);
    doc.setFont(void 0, "bold");
    doc.text("DOWN", rightColumnX, cluesStartY);
    doc.setFontSize(8);
    doc.setFont(void 0, "normal");
    currentY = cluesStartY + 0.15;
    clues.down.forEach((clue) => {
      if (currentY > maxY) {
        currentY = cluesStartY + 0.15;
      }
      const clueText = clue;
      const lines = doc.splitTextToSize(clueText, columnWidth);
      lines.forEach((line) => {
        if (currentY <= maxY) {
          doc.text(line, rightColumnX, currentY);
          currentY += lineHeight;
        }
      });
    });
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont(void 0, "bold");
    doc.text("Answer Key", pageWidth / 2, 0.5, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(void 0, "normal");
    if (author) {
      doc.text(`By ${author}`, pageWidth / 2, 0.7, { align: "center" });
    }
    if (date) {
      doc.text(date, pageWidth / 2, 0.85, { align: "center" });
    }
    doc.setLineWidth(0.01);
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        const cell = grid[idx];
        if (cell === ".") {
          doc.setFillColor(0, 0, 0);
          doc.rect(x, y, cellSize, cellSize, "F");
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(x, y, cellSize, cellSize, "FD");
          const letter = grid[idx];
          doc.setFontSize(Math.min(cellSize * 24, 14));
          doc.setFont(void 0, "bold");
          const textX = x + cellSize / 2;
          const textY = y + cellSize / 2 + cellSize * 0.1;
          doc.text(letter, textX, textY, { align: "center" });
          if (gridnums[idx] > 0) {
            doc.setFontSize(5);
            doc.setFont(void 0, "normal");
            const numX = x + 0.02;
            const numY = y + 0.06;
            doc.text(gridnums[idx].toString(), numX, numY);
          }
        }
      }
    }
    return doc;
  }
  print_puzzle() {
    this.exportPuzzlePDF(false);
    const filename = "./exports/" + this.getFilename() + ".pdf";
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "100%";
    iframe.style.bottom = "100%";
    iframe.src = filename;
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      const checkFocus = setInterval(() => {
        if (document.hasFocus()) {
          console.log("User returned to main window; cleaning up.");
          iframe.remove();
          clearInterval(checkFocus);
        }
      }, 500);
    };
    document.body.appendChild(iframe);
  }
}
export {
  ExportTab as E
};
