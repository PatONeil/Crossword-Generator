import { F as FILLER, B as BLANK, C as Crossword, a as FILLER2 } from "./NewSolver/Crossword.js";
import { G as GRID_SIZE } from "./CrosswordModel.js";
class SolverTab {
  constructor(model, gridController) {
    this.model = model;
    this.gridController = gridController;
    this.autoFillBtn = document.getElementById("auto-fill-btn");
    this.solverStatus = document.getElementById("solver-status");
    this.deleteWordBtn = document.getElementById("solver-delete-word-btn");
    if (this.autoFillBtn) {
      this.autoFillBtn.addEventListener("click", () => this.autoFillGrid());
    }
    if (this.deleteWordBtn) {
      this.deleteWordBtn.addEventListener("click", () => this.deleteSelectedWord());
    }
  }
  handleCellClick(index) {
    if (this.model.gridState[index] === 1) return;
    if (this.model.selectedCellIndex === index) {
      this.model.direction = this.model.direction === "across" ? "down" : "across";
    } else {
      this.model.selectedCellIndex = index;
    }
    this.gridController.updateHighlights();
    if (this.deleteWordBtn) {
      this.deleteWordBtn.style.display = "block";
      this.deleteWordBtn.disabled = false;
    }
  }
  deleteSelectedWord() {
    if (this.model.selectedCellIndex === -1) return;
    const indices = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
    if (indices.length === 0) return;
    this.model.saveState();
    indices.forEach((idx) => {
      this.model.gridContent[idx] = "";
    });
    this.gridController.render();
  }
  async autoFillGrid() {
    if (!this.model.dictionary || Object.keys(this.model.dictionary).length === 0) {
      alert("Dictionary not loaded.");
      return;
    }
    this.model.clearPopup();
    this.solverStatus.textContent = "Preparing solver...";
    this.autoFillBtn.disabled = true;
    await new Promise((r) => setTimeout(r, 50));
    try {
      let standardAmericanFilter = function(word) {
        const length = word.length;
        if (length < 3 || length > 15) return false;
        return true;
      };
      const gridMatrix = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        let rowStr = "";
        for (let c = 0; c < GRID_SIZE; c++) {
          const idx = r * GRID_SIZE + c;
          const state = this.model.gridState[idx];
          const content = this.model.gridContent[idx];
          if (state === 1) {
            rowStr += FILLER;
          } else if (content) {
            rowStr += content.toLowerCase();
          } else {
            rowStr += BLANK;
          }
        }
        gridMatrix.push(rowStr);
      }
      const generator = new Crossword({
        data: gridMatrix,
        data_type: "grid",
        wordsource: this.model.dictSource,
        wordfilter: standardAmericanFilter
      });
      this.solverStatus.textContent = "Solving (may take a moment)...";
      const success = await new Promise((resolve) => {
        const result = generator.generate({
          timeout: 120,
          // 2 minutes
          onfinish: (return_code, elapsed) => {
            console.log(`Generation finished in ${elapsed.toFixed(2)}s. Code: ${return_code}`);
            resolve(return_code);
          },
          ontimeout: (t) => {
            this.solverStatus.textContent = `Timeout after ${t}s`;
            resolve(false);
          },
          onerror: (err) => {
            console.error(err);
            this.solverStatus.textContent = "Error: " + err.message;
            resolve(false);
          },
          on_progress: (cw, completed, total) => {
            this.solverStatus.textContent = `Progress: ${completed} / ${total}`;
          }
        });
        resolve(result);
      });
      if (success) {
        this.model.saveState();
        const finalGrid = generator.words.grid;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const idx = r * GRID_SIZE + c;
            const char = finalGrid[r][c];
            if (char !== FILLER && char !== BLANK && char !== FILLER2) {
              this.model.gridContent[idx] = char.toUpperCase();
            }
          }
        }
        this.gridController.render();
        this.solverStatus.textContent = "Solved Successfully!";
        this.model.showPopup("You may select a group of words and delete them and resolve the puzzle if solution is not acceptable", 5e3);
      } else {
        this.solverStatus.textContent = "Generation Failed (Timeout or No Solution).";
      }
    } catch (error) {
      console.error(error);
      this.solverStatus.textContent = "Error: " + error.message;
    } finally {
      this.autoFillBtn.disabled = false;
    }
  }
}
export {
  SolverTab as S
};
