import { C as CrosswordModel, G as GRID_SIZE } from "./CrosswordModel.js";
import { G as GridController } from "./GridController.js";
import { S as StructureTab } from "./StructureTab.js";
import { F as FillTab } from "./FillTab.js";
import { S as SolverTab } from "./SolverTab.js";
import { R as ReviewTab } from "./ReviewTab.js";
import { D as DictionaryTab } from "./DictionaryTab.js";
import { E as ExportTab } from "./ExportTab.js";
import { P as ParametersTab } from "./ParametersTab.js";
import { F as FileSystemManager } from "./FileSystemManager.js";
import { D as DictionarySource } from "./NewSolver-DictionarySource.js";
import "./NewSolver-Crossword.js";
import "./jspdf.bundled.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const scriptRel = "modulepreload";
const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep, importerUrl);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        const isBaseRelative = !!importerUrl;
        if (isBaseRelative) {
          for (let i = links.length - 1; i >= 0; i--) {
            const link2 = links[i];
            if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
              return;
            }
          }
        } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
function registerSW(options = {}) {
  const {
    immediate = false,
    onNeedRefresh,
    onOfflineReady,
    onRegistered,
    onRegisteredSW,
    onRegisterError
  } = options;
  let wb;
  let registerPromise;
  const updateServiceWorker = async (_reloadPage = true) => {
    await registerPromise;
  };
  async function register() {
    if ("serviceWorker" in navigator) {
      wb = await __vitePreload(async () => {
        const { Workbox } = await import("./vendor.js");
        return { Workbox };
      }, true ? [] : void 0, import.meta.url).then(({ Workbox }) => {
        return new Workbox("./sw.js", { scope: "./", type: "classic" });
      }).catch((e) => {
        onRegisterError == null ? void 0 : onRegisterError(e);
        return void 0;
      });
      if (!wb)
        return;
      {
        {
          wb.addEventListener("activated", (event) => {
            if (event.isUpdate || event.isExternal)
              window.location.reload();
          });
          wb.addEventListener("installed", (event) => {
            if (!event.isUpdate) {
              onOfflineReady == null ? void 0 : onOfflineReady();
            }
          });
        }
      }
      wb.register({ immediate }).then((r) => {
        if (onRegisteredSW)
          onRegisteredSW("./sw.js", r);
        else
          onRegistered == null ? void 0 : onRegistered(r);
      }).catch((e) => {
        onRegisterError == null ? void 0 : onRegisterError(e);
      });
    }
  }
  registerPromise = register();
  return updateServiceWorker;
}
registerSW({ immediate: true });
class CrosswordApp {
  constructor() {
    this.model = new CrosswordModel();
    this.fsManager = new FileSystemManager();
    this.gridController = new GridController("grid-container", this.model);
    this.parametersTab = new ParametersTab(this.model);
    this.structureTab = new StructureTab(this.model, this.gridController);
    this.fillTab = new FillTab(this.model, this.gridController);
    this.solverTab = new SolverTab(this.model, this.gridController);
    this.reviewTab = new ReviewTab(this.model, this.gridController);
    this.dictTab = new DictionaryTab(this.model, this.fsManager);
    this.exportTab = new ExportTab(this.model, this.gridController, this.fsManager);
    this.undoBtn = document.getElementById("undo-btn");
    this.clearBtn = document.getElementById("clear-btn");
    this.loadBtn = document.getElementById("load-btn");
    this.saveBtn = document.getElementById("save-btn");
    this.connectBtn = document.getElementById("project-connect-btn");
    this.tabs = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");
    this.popupTimer = null;
    this.init();
  }
  async init() {
    const hasHandle = await this.fsManager.connect(false);
    this.updateConnectUI(hasHandle);
    if (this.connectBtn) {
      this.connectBtn.addEventListener("click", async () => {
        const connected = await this.fsManager.connect(true);
        this.updateConnectUI(connected);
        if (connected) alert("Project connected!");
      });
    }
    if (!hasHandle) {
      this.model.showPopup("This application requires a folder to store state information and generated crossword puzzle files.   Please press the button and select a folder for this applications content", 1e4);
    }
    if (this.undoBtn) this.undoBtn.addEventListener("click", () => {
      if (this.model.undo()) {
        this.gridController.render();
        if (this.currentTabId === "fill") this.fillTab.updateSuggestions();
      }
    });
    if (this.clearBtn) this.clearBtn.addEventListener("click", () => {
      this.model.clear();
      this.gridController.render();
    });
    if (this.loadBtn) this.loadBtn.addEventListener("click", async () => {
      if (!this.fsManager.dirHandle) {
        alert("Please connect a project folder first.");
        return;
      }
      try {
        let files = await this.fsManager.listFiles("layouts", ".json");
        if (files.length === 0) {
          alert("No saved states found in /layouts.");
          return;
        }
        files.sort(function(a, b) {
          return a < b ? 1 : -1;
        });
        const choice = await this.showLoadDialog("Select Saved State", files);
        if (choice) {
          const name = choice.endsWith(".json") ? choice : choice + ".json";
          if (!files.includes(name)) {
            alert("File not found.");
            return;
          }
          const text = await this.fsManager.readFile("layouts", name);
          const data = JSON.parse(text);
          this.model.saveState();
          if (data.gridState) this.model.gridState = data.gridState;
          if (data.gridContent) this.model.gridContent = data.gridContent;
          const newMeta = {};
          const metaKeys = ["title", "author", "copyright", "notes", "date", "difficulty"];
          metaKeys.forEach((key) => {
            if (data[key] !== void 0) newMeta[key] = data[key];
          });
          if (data.metadata) {
            Object.assign(newMeta, data.metadata);
          }
          this.model.metadata = { ...this.model.metadata, ...newMeta };
          this.parametersTab.refreshUI();
          this.gridController.render();
          if (this.currentTabId === "fill") this.fillTab.updateSuggestions();
        }
      } catch (e) {
        console.error(e);
        alert("Load failed: " + e.message);
      }
    });
    if (this.saveBtn) this.saveBtn.addEventListener("click", async () => {
      if (this.fsManager.dirHandle) {
        const layout = {
          gridState: this.model.gridState,
          gridContent: this.model.gridContent,
          size: GRID_SIZE,
          ...this.model.metadata
        };
        const now = /* @__PURE__ */ new Date();
        const pad = (n) => n.toString().padStart(2, "0");
        const filename = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}.json`;
        try {
          await this.fsManager.saveFile("layouts", filename, JSON.stringify(layout, null, 2));
          alert(`State saved: /layouts/${filename}`);
        } catch (e) {
          console.error(e);
          alert("Save failed: " + e.message);
        }
      } else {
        const layout = {
          gridState: this.model.gridState,
          gridContent: this.model.gridContent,
          size: GRID_SIZE,
          ...this.model.metadata
        };
        localStorage.setItem("crosswordLayout", JSON.stringify(layout));
        alert("Saved to browser storage (Connect project to save history)");
      }
    });
    this.tabs.forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });
    document.addEventListener("keydown", (e) => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (this.currentTabId === "fill") {
        this.fillTab.handleKeyDown(e);
      }
    });
    this.gridController.onCellClick = (index, e) => {
      if (this.currentTabId === "structure") {
        this.structureTab.handleCellClick(index);
      } else if (this.currentTabId === "fill") {
        this.fillTab.handleCellClick(index);
      } else if (this.currentTabId === "solver") {
        this.solverTab.handleCellClick(index);
      } else if (this.currentTabId === "post-solver") {
        this.reviewTab.handleCellClick(index);
      }
    };
    await this.loadDictionary();
    this.gridController.render();
    this.switchTab("settings");
  }
  updateConnectUI(connected) {
    if (!this.connectBtn) return;
    if (connected) {
      this.connectBtn.textContent = "✅ Project Connected";
      this.connectBtn.classList.remove("secondary");
      this.connectBtn.classList.add("primary");
      this.connectBtn.disabled = true;
    } else {
      this.connectBtn.textContent = "📂 Connect Project Folder";
      this.connectBtn.disabled = false;
    }
  }
  switchTab(tabId) {
    this.model.selectedCellIndex = -1;
    this.gridController.updateHighlights(false);
    this.model.clearPopup();
    this.currentTabId = tabId;
    this.tabs.forEach((t) => t.classList.remove("active"));
    this.tabContents.forEach((c) => c.classList.remove("active"));
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`view-${tabId}`);
    if (activeBtn) activeBtn.classList.add("active");
    if (activeContent) activeContent.classList.add("active");
    if (tabId === "fill") {
      this.fillTab.updateSuggestions();
      this.model.showPopup("Enter theme word and/or seed words here before using solver", 4e3);
    }
    if (tabId === "post-solver") {
      this.reviewTab.init();
      this.model.showPopup("Click on cells to go directly to word to review", 4e3);
    }
    if (tabId === "export") {
      this.exportTab.updateUI();
    }
  }
  async loadDictionary() {
    try {
      const status = document.getElementById("solver-status");
      if (status) status.textContent = "Loading dictionary...";
      const response = await fetch("./dictionary.json");
      const result = await response.json();
      const newDict = {};
      if (Array.isArray(result)) {
        result.forEach((w) => newDict[w.toUpperCase()] = { rating: 3, defs: [] });
      } else {
        for (const [key, val] of Object.entries(result)) {
          if (typeof val === "object" && val.rating) {
            newDict[key.toUpperCase()] = val;
          } else {
            newDict[key.toUpperCase()] = { rating: 3, defs: val ? [val] : [] };
          }
        }
      }
      this.model.dictionary = newDict;
      const difficulty = parseInt(this.model.metadata.difficulty || "3");
      const rating = 9 - difficulty;
      this.model.dictSource = new DictionarySource(this.model.dictionary, rating);
      if (status) status.textContent = `Dictionary loaded (${Object.keys(newDict).length} words).`;
      console.log("Dictionary Loaded");
    } catch (e) {
      console.error("Dict Load Fail", e);
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
}
new CrosswordApp();
