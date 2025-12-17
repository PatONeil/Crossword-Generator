import { Crossword, BLANK, FILLER, FILLER2 } from './NewSolver/Crossword.js';
import { GRID_SIZE } from './CrosswordModel.js';

export class SolverTab {
    constructor(model, gridController) {
        this.model = model;
        this.gridController = gridController;

        this.autoFillBtn = document.getElementById('auto-fill-btn');
        this.solverStatus = document.getElementById('solver-status');
        this.deleteWordBtn = document.getElementById('solver-delete-word-btn');

        if (this.autoFillBtn) {
            this.autoFillBtn.addEventListener('click', () => this.autoFillGrid());
        }
        if (this.deleteWordBtn) {
            this.deleteWordBtn.addEventListener('click', () => this.deleteSelectedWord());
        }
    }

    handleCellClick(index) {
        if (this.model.gridState[index] === 1) return;

        if (this.model.selectedCellIndex === index) {
            this.model.direction = this.model.direction === 'across' ? 'down' : 'across';
        } else {
            this.model.selectedCellIndex = index;
        }

        this.gridController.updateHighlights();

        // Show delete button
        if (this.deleteWordBtn) {
            this.deleteWordBtn.style.display = 'block';
            this.deleteWordBtn.disabled = false;
        }
    }

    deleteSelectedWord() {
        if (this.model.selectedCellIndex === -1) return;

        const indices = this.gridController.getWordIndices(this.model.selectedCellIndex, this.model.direction);
        if (indices.length === 0) return;

        this.model.saveState();
        indices.forEach(idx => {
            this.model.gridContent[idx] = '';
        });

        this.gridController.render();
        // Keep selection? Yes.
    }

    async autoFillGrid() {
        if (!this.model.dictionary || Object.keys(this.model.dictionary).length === 0) {
            alert('Dictionary not loaded.');
            return;
        }
		this.model.clearPopup();
        this.solverStatus.textContent = 'Preparing solver...';
        this.autoFillBtn.disabled = true;

        // Yield to allow UI update
        await new Promise(r => setTimeout(r, 50));

        try {
            // 1. Prepare Data for New Solver
            // Convert 1D gridState/gridContent to 2D matrix of strings
            // 0 -> BLANK ('0')
            // 1 -> FILLER ('1')
            // Letter -> 'a-z'

            const gridMatrix = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                let rowStr = "";
                for (let c = 0; c < GRID_SIZE; c++) {
                    const idx = r * GRID_SIZE + c;
                    const state = this.model.gridState[idx]; // 0 or 1
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

             // Standard American Word Filter (from generate_puzzle.js)
            function standardAmericanFilter(word) {
                const length = word.length;
                if (length < 3 || length > 15) return false;
                return true;
            }

            const generator = new Crossword({
                data: gridMatrix,
                data_type: 'grid',
                wordsource: this.model.dictSource,
                wordfilter: standardAmericanFilter
            });

            this.solverStatus.textContent = 'Solving (may take a moment)...';

            // 3. Run Generator
            // Wrapping in a promise to handle the generate call and updates
            const success = await new Promise(resolve => {
                const result = generator.generate({
                    timeout: 120.0, // 2 minutes
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
                        // Update UI periodically
                        // Note: Browsers might throttle this if main thread is blocked heavily, 
                        // but logic yields inside generate_recurse potentially? 
                        // Actually the current generate_recurse is synchronous recursive.
                        // We might not see updates unless we break execution.
                        // For now, simple logging/status.
                        this.solverStatus.textContent = `Progress: ${completed} / ${total}`;
                    }
                });

                // If generate returns a value immediately (synchronous for small grids or if structured specific way), handle it.
                // But typically it returns boolean immediately. 
                // Wait, looking at Crossword.js generate implementation:
                // It calls generate_recurse which is SYNCHRONOUS recursion.
                // So onfinish callbacks are called BEFORE this function returns.
                // So the promise resolve above might happen before we await it?
                // Actually, since generate is synchronous, we don't strictly need a Promise wrapper 
                // UNLESS we want to support a web worker version later.
                // For now, direct return usage.
                resolve(result);
            });


            // 4. Update Model on Success
            if (success) {
                this.model.saveState();

                // GridMatrix is updated in place inside the generator's internal structure?
                // No, internal structure 'this.words' has the data. 
                // generator.words.grid is the 2D matrix.

                const finalGrid = generator.words.grid; // 2D array of chars

                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        const idx = r * GRID_SIZE + c;
                        const char = finalGrid[r][c];

                        // Map back: FILLER/BLANK -> ignore/empty?
                        // If it's a letter, fill it.
                        if (char !== FILLER && char !== BLANK && char !== FILLER2) {
                            this.model.gridContent[idx] = char.toUpperCase();
                        }
                    }
                }

                this.gridController.render();
                // Update suggestions if needed

                this.solverStatus.textContent = 'Solved Successfully!';
                this.model.showPopup("You may select a group of words and delete them and resolve the puzzle if solution is not acceptable",5000);
            } else {
                this.solverStatus.textContent = 'Generation Failed (Timeout or No Solution).';
            }

        } catch (error) {
            console.error(error);
            this.solverStatus.textContent = 'Error: ' + error.message;
        } finally {
            this.autoFillBtn.disabled = false;
        }
    }

 }
