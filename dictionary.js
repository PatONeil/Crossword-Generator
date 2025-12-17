const fs = require('fs');
const path = require('path');

const WORD_DEFINITIONS_FILE = 'C:/Users/pjone/Downloads/Crossword/wordDefinitions.js';
const PUZZLE_SRC_DIR = 'C:/Users/pjone/Downloads/Crossword/puzzleSrc';
const OUTPUT_FILE = 'C:/Users/pjone/Downloads/Crossword/combinedDefinitions.json';

const dictionary = {};

function processWordDefinitions() {
    console.log('Reading wordDefinitions.js...');
    const content = fs.readFileSync(WORD_DEFINITIONS_FILE, 'utf8');
    const lines = content.split('\n');

    let count = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Scrabble.wordDefinitions') || trimmed === '`;' || trimmed === ';') {
            continue;
        }

        // Find the first space to separate word and definition
        const firstSpaceIndex = trimmed.indexOf(' ');
        if (firstSpaceIndex === -1) {
            continue; // Skip lines with no space (if any)
        }

        const word = trimmed.substring(0, firstSpaceIndex).toUpperCase(); // Ensure uppercase
        const definition = trimmed.substring(firstSpaceIndex + 1).trim();

        if (!dictionary[word]) {
            dictionary[word] = {rating:7,definitions:[]};
        }
        // Avoid duplicates if the file has them, though unlikely for this file format
        if (!dictionary[word].definitions.includes(definition)) {
            dictionary[word].definitions.push(definition);
        }
        count++;
    }
    console.log(`Processed ${count} definitions from wordDefinitions.js`);
}

function processPuzzles() {
    console.log('Reading puzzle files...');
    const files = fs.readdirSync(PUZZLE_SRC_DIR).filter(file => file.endsWith('.json'));

    let fileCount = 0;
    let clueCount = 0;

    for (const file of files) {
        const filePath = path.join(PUZZLE_SRC_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const puzzle = JSON.parse(content);

            if (puzzle.answers && puzzle.clues) {
                processClues(puzzle.answers.across, puzzle.clues.across);
                processClues(puzzle.answers.down, puzzle.clues.down);
            }
            fileCount++;
        } catch (err) {
            console.error(`Error processing file ${file}:`, err.message);
        }
    }
    console.log(`Processed ${fileCount} puzzle files, added ${clueCount} clues.`);

    function processClues(answers, clues) {
        if (!answers || !clues || answers.length !== clues.length) {
            return;
        }

        for (let i = 0; i < answers.length; i++) {
            const word = answers[i];
            if (!word) continue;

            const rawClue = clues[i];
            if (!rawClue) continue;

            // Remove leading number and dot/space (e.g., "1. Clue" -> "Clue")
            const cleanClue = rawClue.replace(/^\d+\.\s*/, '').trim();

            if (!dictionary[word]) {
            dictionary[word] = {rating:3,definitions:[]};
            }

            if (!dictionary[word].definitions.includes(cleanClue)) {
                dictionary[word].definitions.push(cleanClue);
                clueCount++;
            }
			if (dictionary[word].rating<8) dictionary[word].rating++;
        }
    }
}

function saveDictionary() {
    console.log('Saving combined dictionary...');
    const jsonContent = JSON.stringify(dictionary, null, 2);
    fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf8');
    console.log(`Saved dictionary to ${OUTPUT_FILE}`);
}

try {
    processWordDefinitions();
    processPuzzles();
    saveDictionary();
} catch (err) {
    console.error('An error occurred:', err);
}
