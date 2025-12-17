export class DictionaryTab {
    constructor(model, fsManager) {
        this.model = model;
        this.fsManager = fsManager;

        // UI
        this.search = document.getElementById('dict-search');
        this.lookupBtn = document.getElementById('dict-lookup-btn');
        this.editor = document.getElementById('dict-editor');
        // this.wordTitle removed
        this.ratingInput = document.getElementById('dict-rating');
        this.ratingVal = document.getElementById('dict-rating-val');
        this.defsContainer = document.getElementById('dict-defs-container');
        this.addDefBtn = document.getElementById('add-def-btn');
        this.saveMemBtn = document.getElementById('dict-save-btn');
        this.deleteWordBtn = document.getElementById('dict-delete-btn');
        this.saveDiskBtn = document.getElementById('dict-export-btn');
        this.addWordBtn = document.getElementById('dict-add-btn');

        this.setupListeners();
    }

    setupListeners() {
        if (this.lookupBtn) this.lookupBtn.addEventListener('click', () => this.lookupWord());
        if (this.addWordBtn) this.addWordBtn.addEventListener('click', () => this.addWord());
        if (this.saveMemBtn) this.saveMemBtn.addEventListener('click', () => this.saveEntry());
        if (this.deleteWordBtn) this.deleteWordBtn.addEventListener('click', () => this.deleteEntry());
        if (this.addDefBtn) this.addDefBtn.addEventListener('click', () => this.addDefinitionInput(''));

        if (this.ratingInput) {
            this.ratingInput.addEventListener('input', (e) => {
                if (this.ratingVal) this.ratingVal.textContent = e.target.value;
            });
        }
    }

    lookupWord() {
        const word = this.search.value.toUpperCase().trim();
        if (!word) return;

        if (!this.model.dictionary[word]) {
            alert(`Word "${word}" not found. Use "Add New Word" to create it.`);
            this.editor.style.display = 'none';
            return;
        }
        this.openEditor(word);
    }

    addWord() {
        const word = this.search.value.toUpperCase().trim();
        if (!word) {
            alert("Please enter a word to add.");
            return;
        }

        if (this.model.dictionary[word]) {
            alert(`Word "${word}" already exists. Use "Lookup" to edit it.`);
            this.openEditor(word);
            return;
        }
        this.openEditor(word);
    }

    openEditor(word) {
        this.editor.style.display = 'block';
        this.search.value = word; // Capitalize in input
        this.defsContainer.innerHTML = '';

        const entry = this.model.dictionary[word] || { rating: 3, defs: [] };
        this.ratingInput.value = entry.rating;
        if (this.ratingVal) this.ratingVal.textContent = entry.rating;

        if (entry.defs && entry.defs.length > 0) {
            entry.defs.forEach(d => this.addDefinitionInput(d));
        } else {
            this.addDefinitionInput('');
        }
    }

    addDefinitionInput(value) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        //      div.style.marginBottom = '0.5rem';

        const ta = document.createElement('textarea');
        ta.rows = 2;
        ta.style.flex = '1';
        ta.value = value;
        ta.placeholder = "Enter definition...";

        const btn = document.createElement('button');
        btn.textContent = 'X';
        btn.className = 'btn secondary';
        btn.onclick = () => div.remove();

        div.appendChild(ta);
        div.appendChild(btn);
        this.defsContainer.appendChild(div);
    }

    async deleteEntry() {
        const word = this.search.value.toUpperCase().trim();
        if (!word) return;

        if (!confirm(`Are you sure you want to delete "${word}" from the dictionary?`)) return;

        delete this.model.dictionary[word];

        // Update index
        const len = word.length;
        if (this.model.dictionaryByLength[len]) {
            this.model.dictionaryByLength[len] = this.model.dictionaryByLength[len].filter(x => x.word !== word);
        }

        this.editor.style.display = 'none';
        this.search.value = '';

        await this.saveToDisk();
    }

    async saveEntry() {
        const word = this.search.value.toUpperCase().trim();
        if (!word) {
            alert("No word specified.");
            return;
        }

        const rating = parseInt(this.ratingInput.value) || 3;
        const defs = [];

        this.defsContainer.querySelectorAll('textarea').forEach(ta => {
            const val = ta.value.trim();
            if (val) defs.push(val);
        });

        this.model.dictionary[word] = { rating, defs };
		const adj_rating = 9 - rating;
		this.model.dictSource = new DictionarySource(this.model.dictionary, adj_rating);

        const len = word.length;
        if (this.model.dictionaryByLength[len]) {
            this.model.dictionaryByLength[len] = this.model.dictionaryByLength[len].filter(x => x.word !== word);
            this.model.dictionaryByLength[len].push({ word, rating });
            this.model.dictionaryByLength[len].sort((a, b) => b.rating - a.rating);
        } else {
            this.model.dictionaryByLength[len] = [{ word, rating }];
        }

        //        alert(`Saved ${word} with ${defs.length} definitions.`);
        await this.saveToDisk();
    }

    async saveToDisk() {
        try {
            const content = JSON.stringify(this.model.dictionary, null, 2);

            if (this.fsManager && this.fsManager.dirHandle) {
                await this.fsManager.saveFile('public', 'dictionary.json', content);
                alert('Dictionary saved to project folder (dictionary.json)!');
                return;
            }

            // Fallback
            if (!('showSaveFilePicker' in window)) {
                alert('Browser not supported.');
                return;
            }

            if (!this.model.dictionaryFileHandle) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'dictionary.json',
                    types: [{
                        description: 'JSON Dictionary',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                this.model.dictionaryFileHandle = handle;
            }

            const writable = await this.model.dictionaryFileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            alert('Dictionary saved to disk!');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                if (err.name === 'NotAllowedError') this.model.dictionaryFileHandle = null;
                alert('Save failed: ' + err.message);
            }
        }
    }
}
