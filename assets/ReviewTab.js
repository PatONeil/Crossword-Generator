import { GRID_SIZE } from "./CrosswordModel.js";

export class ReviewTab {
    constructor(model, gridController) {
        this.model = model;
		this.gridController = gridController;

        this.reviewWords = [];
        this.currentReviewIndex = 0;

        // UI
        this.controls = document.getElementById('review-controls');
        this.emptyState = document.getElementById('review-empty-state');
        this.prevBtn = document.getElementById('review-prev-btn');
        this.nextBtn = document.getElementById('review-next-btn');
        this.counter = document.getElementById('review-counter');
        this.wordDisplay = document.getElementById('review-word-display');
        this.wordType = document.getElementById('review-word-type');
        this.defsList = document.getElementById('review-defs-list');
        this.newDefInput = document.getElementById('review-new-def');
        this.addDefBtn = document.getElementById('review-add-def-btn');

        this.setupListeners();
    }

    setupListeners() {
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());
        if (this.addDefBtn) this.addDefBtn.addEventListener('click', () => this.addDefinition());
    }

    // Called when tab becomes active
    init() {
        this.reviewWords = [];
        this.extractWords();

        if (this.reviewWords.length === 0) {
            this.controls.style.display = 'none';
            this.emptyState.style.display = 'block';
            return;
        }

        this.controls.style.display = 'flex';
        this.emptyState.style.display = 'none';
        this.currentReviewIndex = 0;
        this.showCurrentWord();
    }

    extractWords() {
        const size = GRID_SIZE;
        const { gridState, gridContent } = this.model;

        // Helper
        const scan = (r, c, dr, dc, type) => {
            // ... Logic simplified: Iterate grid for start of words
        };

        // Let's iterate grid completely for consistency
        // Across
        for (let i = 0; i < size * size; i++) {
            const row = Math.floor(i / size);
            const col = i % size;

            if (gridState[i] === 0) {
                // Check Across Start
                if (col < size - 1 && gridState[i + 1] === 0 && (col === 0 || gridState[i - 1] === 1)) {
                    let w = '';
                    let k = 0;
                    while (col + k < size && gridState[i + k] === 0) {
                        w += gridContent[i + k] || '_';
                        k++;
                    }
                    if (w.length > 1 && !w.includes('_')) {
                        this.reviewWords.push({ word: w, type: 'Across', grid: i });
                    }
                }
                // Check Down Start
                if (row < size - 1 && gridState[i + size] === 0 && (row === 0 || gridState[i - size] === 1)) {
                    let w = '';
                    let k = 0;
                    while (row + k < size && gridState[i + k * size] === 0) {
                        w += gridContent[i + k * size] || '_';
                        k++;
                    }
                    if (w.length > 1 && !w.includes('_')) {
                        this.reviewWords.push({ word: w, type: 'Down' ,grid: i});
                    }
                }
            }
        }
    }
	handleCellClick(index) { 
	if (this.model.gridState[index] === 1) return;
	if (this.model.selectedCellIndex === index) {
	  this.toggleDirection();
	} else {
	  this.model.selectedCellIndex = index;
	}
	this.gridController.updateHighlights();
	this.updateWordNumber();
	}
	
	updateWordNumber() {
		let indicies = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
		let word = "";
		for (let ndx of indicies) word += this.model.gridContent[ndx];
		for (let i=0; i<this.reviewWords.length; i++) {
			if (this.reviewWords[i].word==word) {
				this.currentReviewIndex=i;
				this.showCurrentWord();
			}
		}
	}

   toggleDirection() {
    this.model.direction = this.model.direction === "across" ? "down" : "across";
    if (this.directionBtn) this.directionBtn.textContent = this.model.direction === "across" ? "Across ➡" : "Down ⬇";
    this.gridController.updateHighlights();
    this.updateWordNumber();
  }

   showCurrentWord() {
        if (this.reviewWords.length === 0) return;
        const item = this.reviewWords[this.currentReviewIndex];

        this.wordDisplay.textContent = item.word;
        this.wordType.textContent = `${item.type} (${this.currentReviewIndex + 1} / ${this.reviewWords.length})`;
        this.counter.textContent = `${this.currentReviewIndex + 1} / ${this.reviewWords.length}`;

        this.renderDefs(item.word);
    }

    renderDefs(word) {
        this.defsList.innerHTML = '';
        const entry = this.model.dictionary[word];
        const defs = entry ? (entry.defs || []) : [];

        if (defs.length === 0) {
            this.defsList.textContent = 'No definitions found.';
            return;
        }

        defs.forEach((def, i) => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.gap = '0.5rem';
            label.style.fontSize = '0.9rem';
            label.style.color = '#e2e8f0';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `def-select-${word}`; // Make unique name? Or shared? user wants selection.
            // If we want detailed selection state, we should store it. For now, UI only.
            radio.value = i;
            if (i === 0) radio.checked = true;

            const span = document.createElement('span');
            span.textContent = def;

            label.appendChild(radio);
            label.appendChild(span);
            this.defsList.appendChild(label);
        });
    }

    next() {
        if (this.currentReviewIndex < this.reviewWords.length - 1) {
            this.currentReviewIndex++;
            this.showCurrentWord();
        }
    }

    prev() {
        if (this.currentReviewIndex > 0) {
            this.currentReviewIndex--;
            this.showCurrentWord();
        }
    }

    addDefinition() {
        const val = this.newDefInput.value.trim();
        if (!val) return;

        const item = this.reviewWords[this.currentReviewIndex];
        if (!this.model.dictionary[item.word]) {
            this.model.dictionary[item.word] = { rating: 3, defs: [] };
        }
        this.model.dictionary[item.word].defs.push(val);

        alert('Definition added!');
        this.newDefInput.value = '';
        this.showCurrentWord(); // Refresh
    }
}
export {
  ReviewTab as R
};
