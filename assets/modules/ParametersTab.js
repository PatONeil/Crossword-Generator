import { D as DictionarySource } from "./NewSolver/DictionarySource.js";
class ParametersTab {
  constructor(model) {
    this.model = model;
    this.titleInput = document.getElementById("param-title");
    this.authorInput = document.getElementById("param-author");
    this.copyrightInput = document.getElementById("param-copyright");
    this.dateInput = document.getElementById("param-date");
    this.difficultyInput = document.getElementById("param-difficulty");
    this.difficultyValue = document.getElementById("param-difficulty-val");
    this.attachListeners();
  }
  attachListeners() {
    const updateModel = (key, val) => {
      this.model.metadata[key] = val;
    };
    if (this.titleInput) {
      if (this.model.metadata.title) this.titleInput.value = this.model.metadata.title;
      this.titleInput.addEventListener("input", (e) => updateModel("title", e.target.value));
    }
    if (this.authorInput) {
      if (this.model.metadata.author) this.authorInput.value = this.model.metadata.author;
      this.authorInput.addEventListener("input", (e) => updateModel("author", e.target.value));
    }
    if (this.copyrightInput) {
      if (this.model.metadata.copyright) this.copyrightInput.value = this.model.metadata.copyright;
      this.copyrightInput.addEventListener("input", (e) => updateModel("copyright", e.target.value));
    }
    if (this.dateInput) {
      if (this.model.metadata.date) this.dateInput.value = this.model.metadata.date;
      this.dateInput.addEventListener("input", (e) => updateModel("date", e.target.value));
    }
    if (this.difficultyInput) {
      if (this.model.metadata.difficulty) this.difficultyInput.value = this.model.metadata.difficulty;
      if (this.difficultyValue) this.difficultyValue.textContent = this.difficultyInput.value;
      this.difficultyInput.addEventListener("input", (e) => {
        updateModel("difficulty", e.target.value);
        if (this.difficultyValue) this.difficultyValue.textContent = e.target.value;
        const difficulty = parseInt(this.model.metadata.difficulty || "3");
        const rating = 9 - difficulty;
        this.model.dictSource = new DictionarySource(this.model.dictionary, rating);
      });
    }
  }
  refreshUI() {
    if (this.titleInput) this.titleInput.value = this.model.metadata.title || "";
    if (this.authorInput) this.authorInput.value = this.model.metadata.author || "";
    if (this.copyrightInput) this.copyrightInput.value = this.model.metadata.copyright || "";
    if (this.dateInput) this.dateInput.value = this.model.metadata.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (this.difficultyInput) {
      this.difficultyInput.value = this.model.metadata.difficulty || "3";
      if (this.difficultyValue) this.difficultyValue.textContent = this.difficultyInput.value;
    }
  }
}
export {
  ParametersTab as P
};
