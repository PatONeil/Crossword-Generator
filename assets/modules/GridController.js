import { G as GRID_SIZE } from "./CrosswordModel.js";
class GridController {
  constructor(containerId, model) {
    this.container = document.getElementById(containerId);
    this.model = model;
    this.onCellClick = null;
  }
  render() {
    this.container.innerHTML = "";
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.index = i;
      if (this.model.gridState[i] === 1) {
        cell.classList.add("is-block");
      }
      if (this.model.gridContent[i]) {
        const letterSpan = document.createElement("span");
        letterSpan.textContent = this.model.gridContent[i];
        cell.appendChild(letterSpan);
      }
      cell.addEventListener("click", (e) => {
        if (this.onCellClick) this.onCellClick(i, e);
      });
      this.container.appendChild(cell);
    }
    this.updateNumbers();
    this.updateHighlights();
  }
  updateNumbers() {
    let currentNumber = 1;
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = this.container.children[i];
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const existingNum = cell.querySelector(".cell-number");
      if (existingNum) existingNum.remove();
      if (this.model.gridState[i] === 1) continue;
      let isAcrossStart = false;
      let isDownStart = false;
      if (col < GRID_SIZE - 1 && this.model.gridState[i + 1] === 0) {
        if (col === 0 || this.model.gridState[i - 1] === 1) isAcrossStart = true;
      }
      if (row < GRID_SIZE - 1 && this.model.gridState[i + GRID_SIZE] === 0) {
        if (row === 0 || this.model.gridState[i - GRID_SIZE] === 1) isDownStart = true;
      }
      if (isAcrossStart || isDownStart) {
        const numSpan = document.createElement("span");
        numSpan.classList.add("cell-number");
        numSpan.textContent = currentNumber;
        cell.appendChild(numSpan);
        currentNumber++;
      }
    }
  }
  updateHighlights(highlightWord = true) {
    const idx = this.model.selectedCellIndex;
    Array.from(this.container.children).forEach((c) => {
      c.classList.remove("is-selected", "is-highlighted", "related-clue", "invalid-word");
    });
    if (idx === -1) return;
    if (this.container.children[idx]) {
      this.container.children[idx].classList.add("is-selected");
    }
    if (highlightWord) {
      const indices = this.getWordIndices(idx, this.model.direction);
      indices.forEach((i) => {
        if (this.container.children[i]) this.container.children[i].classList.add("is-highlighted");
      });
    }
  }
  getWordIndices(index, direction) {
    if (this.model.gridState[index] === 1) return [];
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const indices = [];
    if (direction === "across") {
      let c = col;
      while (c > 0 && this.model.gridState[row * GRID_SIZE + c - 1] === 0) c--;
      while (c < GRID_SIZE && this.model.gridState[row * GRID_SIZE + c] === 0) {
        indices.push(row * GRID_SIZE + c);
        c++;
      }
    } else {
      let r = row;
      while (r > 0 && this.model.gridState[(r - 1) * GRID_SIZE + col] === 0) r--;
      while (r < GRID_SIZE && this.model.gridState[r * GRID_SIZE + col] === 0) {
        indices.push(r * GRID_SIZE + col);
        r++;
      }
    }
    return indices;
  }
  // Helper to update just one cell content visually (optimization)
  updateCellContent(index) {
    const cell = this.container.children[index];
    const letter = this.model.gridContent[index];
    const oldSpan = cell.querySelector("span:not(.cell-number)");
    if (oldSpan) oldSpan.remove();
    if (letter) {
      const span = document.createElement("span");
      span.textContent = letter;
      cell.appendChild(span);
    }
  }
}
export {
  GridController as G
};
