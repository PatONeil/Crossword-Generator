import { GRID_SIZE } from "./CrosswordModel.js";
import DictionarySource from './NewSolver/DictionarySource.js';
import { Crossword as CrosswordClass } from "./NewSolver/Crossword.js";
class FillTab {
  constructor(model, gridController) {
    this.model = model;
    this.gridController = gridController;
    this.directionBtn = document.getElementById("direction-btn");
    this.manualWordInput = document.getElementById("manual-word");
    this.manualBtn = document.getElementById("manual-btn");
    this.clueDisplay = document.getElementById("clue-display");
    this.suggestionsList = document.getElementById("suggestions-list");
    this.deleteWordBtn = document.getElementById("delete-word-btn");
    this.setupListeners();
  }
  setupListeners() {
    if (this.directionBtn) this.directionBtn.addEventListener("click", () => this.toggleDirection());
    if (this.manualBtn) this.manualBtn.addEventListener("click", () => this.insertManualWord());
    if (this.deleteWordBtn) this.deleteWordBtn.addEventListener("click", () => this.deleteCurrentWord());
  }
  handleCellClick(index) {
    if (this.model.gridState[index] === 1) return;
    if (this.model.selectedCellIndex === index) {
      this.toggleDirection();
    } else {
      this.model.selectedCellIndex = index;
    }
    this.gridController.updateHighlights();
    this.updateSuggestions();
  }
  toggleDirection() {
    this.model.direction = this.model.direction === "across" ? "down" : "across";
    if (this.directionBtn) this.directionBtn.textContent = this.model.direction === "across" ? "Across ➡" : "Down ⬇";
    this.gridController.updateHighlights();
    this.updateSuggestions();
  }
  handleKeyDown(e) {
    if (this.model.selectedCellIndex === -1) return;
    if (e.key.startsWith("Arrow")) {
      this.moveSelectionArrow(e.key);
      return;
    }
    if (e.key.match(/^[a-zA-Z]$/)) {
      this.model.setLetter(this.model.selectedCellIndex, e.key);
      this.gridController.updateCellContent(this.model.selectedCellIndex);
      this.moveSelection(1);
      this.gridController.updateHighlights();
      this.updateSuggestions();
      this.validateGrid();
    }
    if (e.key === "Backspace") {
      this.model.setLetter(this.model.selectedCellIndex, "");
      this.gridController.updateCellContent(this.model.selectedCellIndex);
      this.moveSelection(-1);
      this.gridController.updateHighlights();
      this.updateSuggestions();
    }
  }
  moveSelection(step) {
    let next = this.model.selectedCellIndex;
    if (this.model.direction === "across") next += step;
    else next += step * GRID_SIZE;
    if (next >= 0 && next < GRID_SIZE * GRID_SIZE && this.model.gridState[next] === 0) {
      this.model.selectedCellIndex = next;
    }
  }
  moveSelectionArrow(key) {
    let dRow = 0, dCol = 0;
    if (key === "ArrowRight") dCol = 1;
    if (key === "ArrowLeft") dCol = -1;
    if (key === "ArrowDown") dRow = 1;
    if (key === "ArrowUp") dRow = -1;
    const row = Math.floor(this.model.selectedCellIndex / GRID_SIZE);
    const col = this.model.selectedCellIndex % GRID_SIZE;
    const newRow = row + dRow;
    const newCol = col + dCol;
    if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
      this.model.selectedCellIndex = newRow * GRID_SIZE + newCol;
      this.gridController.updateHighlights();
      this.updateSuggestions();
    }
  }
  // --- Suggestion Logic ---
  updateSuggestions() {
    if (this.model.selectedCellIndex === -1) return;
    const indices = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
    if (indices.length === 0) {
      this.clueDisplay.textContent = "Block selected";
      this.suggestionsList.innerHTML = "";
      return;
    }
    let pattern = "";
    indices.forEach((i) => {
      pattern += this.model.gridContent[i] || "_";
    });
    this.clueDisplay.textContent = `Pattern: ${pattern}`;
    this.suggestionsList.innerHTML = "Thinking...";
    const matches = this.findMatches(pattern);
    this.shuffleArray(matches);
	let valid = [];
	for (let word of matches) {
		if (this.isValidCandidateV2(word, indices, 
									this.model.direction, 
									[...this.model.gridContent])) {
			valid.push(word);
		}	
		if (valid.length>=50) break;
	}
    this.renderSuggestions(valid, indices);
  }
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  findMatches(pattern) {
    return this.model.dictSource.fetch(pattern, "_", null, null).map((w) => w.toUpperCase());
  }
  isValidCandidateV2(word, indices, dir, grid) {
    for (let i = 0; i < indices.length; i++) {
      grid[indices[i]] = word[i];
    }
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      word[i];
      const perpDirection = dir === "across" ? "down" : "across";
      const crossingIndices = this.gridController.getWordIndices(idx, perpDirection);
      if (crossingIndices.length <= 1) continue;
      let pattern = "";
      for (const cIdx of crossingIndices) {
        pattern += grid[cIdx] || "_";
      }
      const matches = this.model.dictSource.fetch(pattern, "_", null, null);
      if (matches.length === 0) {
        return false;
      }
    }
    return true;
  }
  renderSuggestions(matches, indices) {
    this.suggestionsList.innerHTML = "";
    if (matches.length === 0) {
      this.suggestionsList.innerHTML = '<div class="suggestion-item">No matches found</div>';
      return;
    }
    matches.forEach((word) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = word;
      div.addEventListener("click", () => {
        this.fillWord(word, indices);
      });
      this.suggestionsList.appendChild(div);
    });
  }
  fillWord(word, indices) {
    this.model.saveState();
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      this.model.gridContent[idx] = word[i];
    }
    this.gridController.render();
    this.updateSuggestions();
    this.validateGrid();
  }
  insertManualWord() {
    const val = this.manualWordInput.value.toUpperCase().trim();
    if (!val || this.model.selectedCellIndex === -1) return;
    const indices = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
    this.fillWord(val.substring(0, indices.length), indices);
    this.manualWordInput.value = "";
    this.validateGrid();
  }
  deleteCurrentWord() {
    if (this.model.selectedCellIndex === -1) return;
    const indices = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
    this.model.saveState();
    indices.forEach((idx) => this.model.gridContent[idx] = "");
    this.gridController.render();
    this.updateSuggestions();
  }
  async validateGrid() {
    if (this.model.selectedCellIndex === -1) return;
    const indices = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
    if (indices.length === 0) return;
    const gridMatrix = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      let rowStr = "";
      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = r * GRID_SIZE + c;
        const state = this.model.gridState[idx];
        const content = this.model.gridContent[idx];
        if (state === 1) {
          rowStr += "1";
        } else if (content) {
          rowStr += content.toLowerCase();
        } else {
          rowStr += "0";
        }
      }
      gridMatrix.push(rowStr);
    }
    function standardAmericanFilter(word) {
      const length = word.length;
      if (length < 3 || length > 15) return false;
      return true;
    }
    const generator = new CrosswordClass({
      data: gridMatrix,
      data_type: "grid",
      wordsource: this.model.dictSource,
      wordfilter: standardAmericanFilter
    });
    const possible = await new Promise((resolve) => {
      generator.generate({
        timeout: 2,
        // 1 second max
        onfinish: (res) => resolve(res),
        // true if solved
        ontimeout: () => resolve(false),
        // treat timeout as "maybe invalid" or "too hard" -> let's say invalid for red highlighting
        stopcheck: () => false
        // No need for progress updates
      });
    });
    indices.forEach((idx) => {
      const cell = this.gridController.container.children[idx];
      if (cell) {
        if (!possible) {
          cell.classList.add("invalid-word");
        } else {
          cell.classList.remove("invalid-word");
        }
      }
    });
  }
}
export {
  FillTab
};
