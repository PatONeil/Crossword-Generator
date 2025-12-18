class TrieNode {
  constructor() {
    this.children = {};
    this.data = [];
  }
}
class Trie {
  constructor() {
    this.root = new TrieNode();
  }
  /**
   * Inserts a word and its rating into the Trie.
   */
  insert(word, rating, details) {
    let node = this.root;
    const up_word = word.toUpperCase();
    for (const char of up_word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.data.push({ word: up_word, rating, details });
  }
  /**
   * Searches the Trie for all words matching the given pattern.
   * @param {string} pattern - The word pattern (e.g., "A_T_").
   * @param {string} blankChar - The character used for blanks (e.g., "_").
   * @param {function} wordfilter - External filter (e.g., to prevent reusing words).
   * @returns {Array<{word: string, rating: number}>} Array of matching words with ratings.
   */
  search(pattern, blankChar, wordfilter) {
    const results = [];
    const targetLength = pattern.length;
    const dfs = (node, patternIndex, currentWord) => {
      if (node === null) return;
      if (patternIndex === targetLength) {
        if (currentWord.length === targetLength) {
          for (const item of node.data) {
            if (wordfilter === null || wordfilter(item.word.toLowerCase())) {
              results.push(item);
            }
          }
        }
        return;
      }
      const charInPattern = pattern[patternIndex];
      if (charInPattern === blankChar) {
        for (const char in node.children) {
          dfs(
            node.children[char],
            patternIndex + 1,
            currentWord + char
          );
        }
      } else {
        if (node.children[charInPattern]) {
          dfs(
            node.children[charInPattern],
            patternIndex + 1,
            currentWord + charInPattern
          );
        }
      }
    };
    dfs(this.root, 0, "");
    return results;
  }
}
class DictionarySource {
  /**
   * @param {Object} dictionaryData - The dictionary object loaded in memory.
   * @param {number} minRating - Minimum rating to include.
   */
  constructor(dictionaryData, minRating = 3) {
    this.trie = new Trie();
    this.detailsMap = {};
    this.minRating = minRating;
    this.loadFromData(dictionaryData);
  }
  /**
   * Loads the Trie structure from the memory object.
   */
  loadFromData(data) {
    try {
      const time_start = performance.now();
      let insertedCount = 0;
      for (const [word, details] of Object.entries(data)) {
        if (/\d/.test(word)) continue;
        const rating = details.rating !== void 0 ? details.rating : 3;
        if (rating >= this.minRating) {
          const up_word = word.toUpperCase();
          this.trie.insert(up_word, rating, details);
          this.detailsMap[up_word] = details;
          insertedCount++;
        }
      }
      console.log(`[DictionarySource] Inserted ${insertedCount} words (min rating ${this.minRating} in ${performance.now() - time_start}ms).`);
    } catch (error) {
      console.error("Error processing dictionary data:", error);
    }
  }
  /**
   * Required by Crossword generator: Finds words matching the pattern using Trie search.
   * @param {string} word_pattern - The pattern from the grid (e.g., "A_T_").
   * @param {string} blank_char - The character representing a blank space (BLANK in crossword.js).
   * @param {string} pos - Not used.
   * @param {function} wordfilter - An optional external filter (e.g., to prevent reusing words).
   * @returns {string[]} An array of matching words, sorted by rating.
   */
  fetch(word_pattern, blank_char, pos, wordfilter = null) {
    const results = this.trie.search(
      word_pattern.toUpperCase(),
      blank_char,
      wordfilter
    );
    results.sort((a, b) => b.rating - a.rating);
    return results.map((r) => r.word.toLowerCase());
  }
  /**
   * Required by Crossword generator: Checks if a generated word exists.
   */
  check(word, pos, wordfilter = null) {
    return !!this.detailsMap[word.toUpperCase()];
  }
  /**
   * Retrieves the clue (definition) for a given word.
   */
  getClue(word) {
    const details = this.detailsMap[word.toUpperCase()];
    if (details && details.defs && details.defs.length > 0) {
      return details.defs[0];
    }
    if (details && details.definitions) {
      const defKeys = Object.keys(details.definitions);
      if (defKeys.length > 0) {
        return details.definitions[defKeys[0]][0];
      }
    }
    return "No clue available.";
  }
}
export {
  DictionarySource as D
};
