import {FileSystemManager } from "./FileSystemManager.js";
export class StructureTab {
  constructor(model, gridController) {
    this.model = model;
    this.gridController = gridController;
//  this.importBtn = document.getElementById("import-btn");
    this.loadDefaultBtn = document.getElementById("load-default-btn");
    this.fsManager = new FileSystemManager();
    this.setupListeners();
  }
  setupListeners() {
//  if (this.importBtn) this.importBtn.addEventListener("click", () => this.importStructure());
    if (this.loadDefaultBtn) this.loadDefaultBtn.addEventListener("click", () => this.loadDefaultStructure());
  }
/*  
  async importStructure() {
    await this.fsManager.connect();
    if (!this.fsManager.dirHandle) {
      alert("Please connect a project folder first.");
      return;
    }
    try {
      const files = await this.fsManager.listFiles("structures", ".txt");
      if (files.length === 0) {
        alert("No saved states found in /structures.");
        return;
      }
      const choice = await this.showLoadDialog("Select Saved State", files);
      if (choice) {
        const name = choice.endsWith(".txt") ? choice : choice + ".txt";
        if (!files.includes(name)) {
          alert("File not found.");
          return;
        }
        const text = await this.fsManager.readFile("structures", name);
        this.parseLayoutText(text);
      }
    } catch (e) {
      console.error(e);
      alert("Load failed: " + e.message);
    }
  }
  showLoadDialog(title, fileNames) {
    return new Promise((resolve, reject) => {
      const radioDialog = document.getElementById("load-dialog");
      const cancelButton = document.querySelector("#load-dialog #cancel-button");
      const okButton = document.querySelector("#load-dialog #ok-button");
      const radioContainer = document.querySelector("#load-dialog #load-options-container");
      const titleElement = document.getElementById("load-dialog-title");
      function addRadioButtons(fileNames2) {
        radioContainer.innerHTML = "";
        const groupName = "choice";
        fileNames2.forEach((option, index) => {
          const input = document.createElement("input");
          input.type = "radio";
          input.name = groupName;
          input.value = option;
          input.id = `radio-${index}`;
          const label = document.createElement("label");
          label.htmlFor = `radio-${index}`;
          label.appendChild(document.createTextNode(option));
          label.appendChild(input);
          radioContainer.appendChild(label);
        });
      }
      function getSelectedOptionValue() {
        const selectedInput = document.querySelector('input[name="choice"]:checked');
        return selectedInput ? selectedInput.value : null;
      }
      okButton.addEventListener("click", () => {
        const selectedValue = getSelectedOptionValue();
        if (selectedValue) {
          resolve(selectedValue);
          radioDialog.close();
        } else {
          alert("Please select an option.");
        }
      });
      cancelButton.addEventListener("click", () => {
        reject(false);
        radioDialog.close();
      });
      titleElement.innerHTML = title;
      addRadioButtons(fileNames);
      radioDialog.showModal();
    });
  }
*/
  handleCellClick(index) {
    this.model.toggleBlock(index);
    this.gridController.render();
  }
  loadDefaultStructure() {
    this.model.clear();
    const def = `____.____._________.____._________.____.________________.___...___.._______________.___..._____.____________.._____..____________._____...___._______________..___...___.________________.____._________.____._________.____.____`;
    this.parseLayoutText(def);
  }
  parseLayoutText(text) {
    const clean = text.replace(/[^A-Za-z0-9_\.]/g, "");
    if (clean.length !== this.model.gridState.length) {
      alert(`Invalid length: ${clean.length}. Expected ${this.model.gridState.length}`);
      return;
    }
    this.model.saveState();
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === ".") {
        this.model.gridState[i] = 1;
        this.model.gridContent[i] = "";
      } else {
        this.model.gridState[i] = 0;
        this.model.gridContent[i] = clean[i] === "_" ? "" : clean[i].toUpperCase();
      }
    }
    this.gridController.render();
  }
}
