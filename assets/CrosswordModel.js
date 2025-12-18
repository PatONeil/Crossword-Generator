const GRID_SIZE = 15;
class CrosswordModel {
  constructor() {
    this.gridState = Array(GRID_SIZE * GRID_SIZE).fill(0);
    this.gridContent = Array(GRID_SIZE * GRID_SIZE).fill("");
    this.history = [];
    this.dictionary = {};
    this.popupTimer = null;
    this.dictionaryFileHandle = null;
    this.selectedCellIndex = -1;
    this.direction = "across";
    this.metadata = {
      title: "",
      author: "",
      copyright: "",
      notes: "",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      // YYYY-MM-DD
      difficulty: "3"
      // 1-5 string or number
    };
  }
  saveState() {
    this.history.push({
      gridState: [...this.gridState],
      gridContent: [...this.gridContent]
    });
    if (this.history.length > 50) this.history.shift();
  }
  undo() {
    if (this.history.length === 0) return false;
    const lastState = this.history.pop();
    this.gridState = lastState.gridState;
    this.gridContent = lastState.gridContent;
    return true;
  }
  clear() {
    this.saveState();
    this.gridState.fill(0);
    this.gridContent.fill("");
  }
  toggleBlock(index) {
    this.saveState();
    this.gridState[index] = this.gridState[index] === 0 ? 1 : 0;
    if (this.gridState[index] === 1) {
      this.gridContent[index] = "";
    }
  }
  setLetter(index, letter) {
    this.saveState();
    this.gridContent[index] = letter.toUpperCase();
  }
  clearPopup() {
    if (this.popupTimer) {
      clearInterval(this.popupTimer);
      this.popupTimer = null;
      document.getElementById("solver-popup").classList.remove("show");
    }
  }
  showPopup(message, duration = 3e3) {
    const popup = document.getElementById("solver-popup");
    const self = this;
    if (!popup) return;
    popup.textContent = message;
    popup.classList.add("show");
    this.popupTimer = setTimeout(() => {
      self.clearPopup();
    }, duration);
  }
}
export {
  CrosswordModel as C,
  GRID_SIZE as G
};
