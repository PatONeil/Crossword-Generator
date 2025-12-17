const FILLER = "1";
const FILLER2 = "~";
const BLANK = "0";
const DEFAULT_GRID = `____*___*____
*_*_______*_*
*_*_*_*_*_*_*
*_**_____****
___**_*_**___
*_*********_*`;
const LOG_INDENT = "- ";
const shuffle = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};
class CWError extends Error {
  constructor(message) {
    super(message);
    this.name = "CWError";
  }
}
class CWTimeoutError extends CWError {
  constructor(message) {
    super(message);
    this.name = "CWTimeoutError";
  }
}
class CWStopCheck extends CWError {
  constructor(message) {
    super(message);
    this.name = "CWStopCheck";
  }
}
class Coords {
  constructor(coord_start, coord_end) {
    this.start = coord_start;
    this.end = coord_end;
    this.length = 0;
    this.validate();
  }
  validate() {
    if (!Array.isArray(this.start) || !Array.isArray(this.end)) {
      throw new CWError("Coords.start and Coords.end must be arrays!");
    }
    if (this.start.length !== 2 || this.end.length !== 2) {
      throw new CWError("Coords.start and Coords.end must be [x, y] tuples!");
    }
    if (this.start[0] === this.end[0]) {
      if (this.end[1] <= this.start[1]) {
        throw new CWError(`End coordinate must be greater than start!`);
      }
      this.dir = "v";
      this.length = this.end[1] - this.start[1] + 1;
    } else if (this.start[1] === this.end[1]) {
      if (this.end[0] <= this.start[0]) {
        throw new CWError(`End coordinate must be greater than start!`);
      }
      this.dir = "h";
      this.length = this.end[0] - this.start[0] + 1;
    } else {
      throw new CWError("One coordinate dimension must be equal!");
    }
  }
  coord_array() {
    const arr = [];
    if (this.dir === "h") {
      const l = this.end[0] - this.start[0] + 1;
      for (let i = 0; i < l; i++) {
        arr.push([this.start[0] + i, this.start[1]]);
      }
    } else {
      const l = this.end[1] - this.start[1] + 1;
      for (let i = 0; i < l; i++) {
        arr.push([this.start[0], this.start[1] + i]);
      }
    }
    return arr;
  }
  toString() {
    return `[${this.start[0]},${this.start[1]}] ${this.dir}`;
  }
}
class Word extends Coords {
  constructor(coord_start, coord_end, num = 0, clue = "", word = null) {
    super(coord_start, coord_end);
    this.num = num;
    this.clue = clue;
    this.set_word(word);
  }
  set_word(wd) {
    if (wd !== null && wd.length !== this.length) {
      throw new CWError(_("Word length is not correct!"));
    }
    this.word = wd;
  }
  // Override toString for a slot identifier
  toString() {
    return `[${this.start[0]},${this.start[1]}] ${this.dir}`;
  }
  print_word() {
    return `Word slot :: num = ${this.num}, start = [${this.start}], end = [${this.end}], dir = '${this.dir}'`;
  }
}
class CWInfo {
  constructor({ title = "", author = "", editor = "", publisher = "", cpyright = "", date = null } = {}) {
    this.title = title;
    this.author = author;
    this.editor = editor;
    this.publisher = publisher;
    this.cpyright = cpyright;
    this.date = date;
  }
  toString() {
    return Object.entries(this).map(([k, v]) => `${k}='${v}'`).join("\n");
  }
}
class Wordgrid {
  constructor(data, dataType = "grid", info = new CWInfo(), options = {}) {
    this.info = info;
    this.on_reset = options.on_reset || null;
    this.on_clear = options.on_clear || null;
    this.on_change = options.on_change || null;
    this.on_clear_word = options.on_clear_word || null;
    this.on_putchar = options.on_putchar || null;
    this.old_words = null;
    this.initialize(data, dataType);
  }
  initialize(data, dataType = "grid") {
    if (dataType === "grid") {
      this.reset(data);
    } else if (dataType === "words") {
      this.from_words(data);
    } else if (dataType === "file") {
      this.from_file(data);
    } else {
      throw new CWError(_(`Wrong 'data_type' argument: '${dataType}'! Must be 'grid' OR 'words' OR 'file'!`));
    }
  }
  validate(grid) {
    if (typeof grid === "string") {
      grid = grid.split("\n");
      if (grid.length < 2) {
        throw new CWError(_("Grid appears incorrect, for it contains less than 2 rows!"));
      }
    }
    if (Array.isArray(grid)) {
      for (let row of grid) {
        const rowArr = Array.isArray(row) ? row : row.split("");
        const valid = rowArr.every((c) => /^[a-zA-Z]$/.test(c) || [BLANK, FILLER, FILLER2].includes(c));
        if (!valid) {
          throw new CWError(_(`Grid contains invalid characters! Must contain only [a-z], '${BLANK}', '${FILLER}' and '${FILLER2}'.`));
        }
      }
      return;
    }
    throw new CWError(_("Grid must be passed either as a list of strings or a single string of rows delimited by new-line symbols!"));
  }
  reset(grid = null, update_internal_strings = false) {
    if (grid === null && !this.grid) {
      throw new CWError(_("Cannot call reset() on a null grid!"));
    }
    if (grid !== null) {
      this.validate(grid);
      if (typeof grid === "string") grid = grid.split("\n");
    }
    let gridMatrix = grid === null && this.grid ? this.grid : grid.map((l) => (typeof l === "string" ? l.split("") : l).map((c) => c.toLowerCase()));
    gridMatrix.forEach((row) => row.forEach((c) => this._validate_char(c)));
    const lgrid = gridMatrix.length;
    this.words = [];
    let grid_width = 0;
    gridMatrix.forEach((row, y) => {
      const lrow = row.length;
      let c_start = null;
      row.forEach((char, x) => {
        if (char === FILLER || char === FILLER2) {
          if (c_start && x - c_start[0] > 1) {
            this.words.push(new Word(c_start, [x - 1, y]));
          }
          c_start = null;
        } else {
          if (!c_start) c_start = [x, y];
        }
      });
      if (c_start && lrow - c_start[0] > 1) {
        this.words.push(new Word(c_start, [lrow - 1, y]));
      }
      if (lrow > grid_width) grid_width = lrow;
    });
    gridMatrix = gridMatrix.map((row) => {
      while (row.length < grid_width) row.push(FILLER2);
      return row;
    });
    for (let x = 0; x < grid_width; x++) {
      let c_start = null;
      for (let y = 0; y < lgrid; y++) {
        const char = gridMatrix[y][x];
        if (char === FILLER || char === FILLER2) {
          if (c_start && y - c_start[1] > 1) {
            this.words.push(new Word(c_start, [x, y - 1]));
          }
          c_start = null;
        } else {
          if (!c_start) c_start = [x, y];
        }
      }
      if (c_start && lgrid - c_start[1] > 1) {
        this.words.push(new Word(c_start, [x, lgrid - 1]));
      }
    }
    const s_words = [...this.words].sort((a, b) => {
      if (a.start[1] === b.start[1]) return a.start[0] - b.start[0];
      return a.start[1] - b.start[1];
    });
    let n = 0;
    s_words.forEach((w, i) => {
      if (i === 0 || (w.start[0] !== s_words[i - 1].start[0] || w.start[1] !== s_words[i - 1].start[1])) {
        n++;
      }
      w.num = n;
    });
    this.sort();
    this.grid = gridMatrix;
    this.width = grid_width;
    this.height = lgrid;
    if (update_internal_strings) this.update_word_strings();
    if (this.on_reset) this.on_reset(this, this.grid);
  }
  from_words(words, update_internal_strings = false) {
    if (!words || !isIterable(words) || !(words[0] instanceof Coords)) {
      throw new CWError(_('"words" argument must be a non-empty collection of Word / Coords objects!'));
    }
    const width = Math.max(...words.map((w) => w.end[0])) + 1;
    const height = Math.max(...words.map((w) => w.end[1])) + 1;
    let grid = Array.from({ length: height }, () => Array(width).fill(FILLER));
    let coords = [];
    words.forEach((w) => coords.push(...w.coord_array()));
    coords.forEach(([col, row]) => {
      grid[row][col] = BLANK;
    });
    const gridStrs = grid.map((row) => row.join(""));
    this.reset(gridStrs);
    const old_callback = this.on_change;
    this.on_change = null;
    this.words.forEach((w) => {
      const ww = words.find(
        (sourceW) => sourceW.start[0] === w.start[0] && sourceW.start[1] === w.start[1] && sourceW.dir === w.dir
      );
      if (ww && ww.word) {
        this.change_word(w, ww.word);
        w.clue = ww.clue;
      }
    });
    this.on_change = old_callback;
    if (update_internal_strings) this.update_word_strings();
  }
  update_word_strings() {
    this.words.forEach((w) => w.set_word(this.get_word_str(w)));
  }
  _validate_char(char) {
    if (!/^[a-zA-Z]$/.test(char) && ![BLANK, FILLER, FILLER2].includes(char)) {
      throw new CWError(_(`Character "${char}" is invalid!`));
    }
  }
  _validate_coord(coord) {
    if (coord[0] < 0 || coord[0] >= this.width || coord[1] < 0 || coord[1] >= this.height) {
      throw new CWError(_(`Coordinate [${coord}] is out of the grid range (w=${this.width}, h=${this.height})!`));
    }
  }
  is_complete() {
    return !this.grid.some((row) => row.includes(BLANK));
  }
  remove_row(row) {
    if (row >= 0 && row < this.height) {
      this.grid.splice(row, 1);
      this.reset();
    }
  }
  remove_column(col) {
    if (col >= 0 && col < this.width) {
      this.grid.forEach((row) => row.splice(col, 1));
      this.reset();
    }
  }
  add_row(index = -1, char = BLANK) {
    const newRow = Array(this.width).fill(char);
    if (index < 0 || index >= this.height) {
      this.grid.push(newRow);
    } else {
      this.grid.splice(index, 0, newRow);
    }
    this.reset();
  }
  add_column(index = -1, char = BLANK) {
    this.grid.forEach((row) => {
      if (index < 0 || index >= this.width) {
        row.push(char);
      } else {
        row.splice(index, 0, char);
      }
    });
    this.reset();
  }
  reflect_bottom(mirror = true, reverse = true, border = "") {
    const last_row = this.grid.length;
    if (border) {
      let sborder = border.repeat(Math.ceil(this.width / border.length)).slice(0, this.width);
      sborder = sborder.replace(/ /g, BLANK).replace(/\*/g, FILLER).replace(/~/g, FILLER2);
      this.grid.push(sborder.split(""));
    }
    const to_insert = [];
    for (let i = 0; i < last_row; i++) {
      let ls = this.grid[i].map((c) => [BLANK, FILLER, FILLER2].includes(c) ? c : BLANK);
      if (reverse) ls.reverse();
      to_insert.push(ls);
    }
    if (mirror) to_insert.reverse();
    this.grid.push(...to_insert);
    this.reset();
  }
  // ... (reflect_top, reflect_right, reflect_left can be implemented similarly, omitted for brevity but follow same pattern)
  intersects_of(word, word_coord_tuples = true) {
    const index1 = word.dir === "h" ? 0 : 1;
    const index2 = index1 === 0 ? 1 : 0;
    const intersects = [];
    this.words.forEach((w) => {
      if (w.dir !== word.dir && w.start[index1] >= word.start[index1] && w.start[index1] <= word.end[index1] && w.start[index2] <= word.start[index2] && w.end[index2] >= word.end[index2]) {
        if (word_coord_tuples) {
          const coord = word.dir === "h" ? [w.start[0], word.start[1]] : [word.start[0], w.start[1]];
          intersects.push({ word: w, coord });
        } else {
          intersects.push(w);
        }
      }
    });
    const sortedIntersects = intersects.sort((a, b) => {
      const lenA = word_coord_tuples ? a.word.length : a.length;
      const lenB = word_coord_tuples ? b.word.length : b.length;
      return lenB - lenA;
    });
    return sortedIntersects;
  }
  find_incomplete(method = "most-complete", exclude = null) {
    let candidate = { word: null, blanks: Infinity, length: 0 };
    let candidates = [];
    for (let w of this.words) {
      if (exclude && exclude(w)) continue;
      let blanks = 0;
      w.coord_array().forEach((coord) => {
        if (this.grid[coord[1]][coord[0]] === BLANK) {
          blanks++;
        }
      });
      if (blanks > 0) {
        if (method === "first-incomplete") return w;
        if (method === "random") {
          candidates.push(w);
        } else if (method === "longest-incomplete") {
          if (candidate.word === null || w.length > candidate.length) {
            candidate = { word: w, blanks, length: w.length };
          }
        } else {
          if (candidate.word === null || method === "most-complete" && blanks < candidate.blanks || method === "most-incomplete" && blanks > candidate.blanks) {
            candidate = { word: w, blanks, length: w.length };
          }
        }
      }
    }
    if (["most-complete", "most-incomplete", "longest-incomplete"].includes(method)) return candidate.word;
    if (method === "random" && candidates.length > 0) return randomChoice(candidates);
    return null;
  }
  count_incomplete() {
    return this.words.filter((w) => !this.is_word_complete(w)).length;
  }
  get_word_str(w) {
    if (!this.words.includes(w)) {
      throw new CWError(_(`Word '${w}' is absent from grid!`));
    }
    return w.coord_array().map((coord) => this.grid[coord[1]][coord[0]]).join("");
  }
  is_word_complete(w) {
    if (!this.words.includes(w)) {
      throw new CWError(_(`Word '${w}' is absent from grid!`));
    }
    return w.coord_array().every((coord) => this.grid[coord[1]][coord[0]] !== BLANK);
  }
  is_word_blank(w) {
    return this.get_word_str(w) === BLANK.repeat(w.length);
  }
  find_by_coord(coord, start_coord = true) {
    const found = { h: null, v: null };
    this.words.forEach((w) => {
      if (start_coord) {
        if (w.start[0] === coord[0] && w.start[1] === coord[1]) found[w.dir] = w;
      } else if (w.does_cross(coord)) {
        found[w.dir] = w;
      }
    });
    return found;
  }
  find_by_num_dir(num, direction) {
    return this.words.find((w) => w.num === num && w.dir === direction) || null;
  }
  get_char(coord) {
    this._validate_coord(coord);
    return this.grid[coord[1]][coord[0]];
  }
  put_char(coord, char) {
    const old_char = this.get_char(coord);
    const new_char = char.toLowerCase();
    this._validate_char(new_char);
    this.grid[coord[1]][coord[0]] = new_char;
    if (this.on_putchar) this.on_putchar(this, coord, old_char, new_char);
  }
  clear() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (![FILLER, FILLER2].includes(this.grid[y][x])) {
          this.grid[y][x] = BLANK;
        }
      }
    }
    if (this.on_clear) this.on_clear(this);
  }
  change_word(word, new_word) {
    if (!this.words.includes(word)) {
      throw new CWError(_(`Word '${word}' is absent from grid!`));
    }
    if (new_word.length !== word.length) {
      throw new CWError("Lengths of words do not match!");
    }
    const w_old = this.on_change ? this.get_word_str(word) : null;
    const coords = word.coord_array();
    for (let i = 0; i < coords.length; i++) {
      this.put_char(coords[i], new_word[i]);
    }
    if (this.on_change) this.on_change(this, word, w_old);
  }
  clear_word(word, force_clear = false) {
    if (this.is_word_blank(word)) return;
    const w_old = this.on_clear_word ? this.get_word_str(word) : null;
    let coord_array = word.coord_array();
    if (!force_clear) {
      const intersects = this.intersects_of(word, true);
      const intersectCoords = intersects.filter((item) => this.is_word_complete(item.word)).map((item) => item.coord);
      coord_array = coord_array.filter(
        (c) => !intersectCoords.some((ic) => ic[0] === c[0] && ic[1] === c[1])
      );
    }
    coord_array.forEach((coord) => this.put_char(coord, BLANK));
    if (this.on_clear_word) this.on_clear_word(this, word, w_old);
  }
  sort() {
    if (this.words) {
      this.words.sort((a, b) => {
        if (a.dir !== b.dir) return a.dir.localeCompare(b.dir);
        return a.num - b.num;
      });
    }
  }
  print_word(w) {
    if (!this.words.includes(w)) throw new CWError(_(`Word '${w}' is absent from grid!`));
    return `[${w.start}] ${w.dir} '${this.get_word_str(w)}'`;
  }
  print_words() {
    let s = `Num${LOG_INDENT}Coord${LOG_INDENT.repeat(2)}Value
-------------------------------------------
`;
    s += "ACROSS:\n-------------------------------------------\n";
    s += this.words.filter((w) => w.dir === "h").map((w) => `[${w.num}]${LOG_INDENT}[${w.start}]${LOG_INDENT.repeat(2)}'${this.words.get_word_str(w)}'`).join("\n");
    s += "\n-------------------------------------------\nDOWN:\n-------------------------------------------\n";
    s += this.words.filter((w) => w.dir === "v").map((w) => `[${w.num}]${LOG_INDENT}[${w.start}]${LOG_INDENT.repeat(2)}'${this.words.get_word_str(w)}'`).join("\n");
    return s;
  }
  tostr() {
    return this.grid ? this.grid.map((row) => row.join("")).join("\n") : "";
  }
  _cell_count(condition = null) {
    let c = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (condition === null || condition(y, x) === true) c++;
      }
    }
    return c;
  }
  _word_count(condition = null) {
    if (!condition) return this.words.length;
    return this.words.filter((w) => condition(w)).length;
  }
  // Handy methods like save/restore require deep copy. 
  // In JS simplest deep copy is JSON parse/stringify for simple data.
  save() {
    this.update_word_strings();
    this.old_words = JSON.parse(JSON.stringify(this.words));
  }
  restore() {
    if (this.old_words !== null) {
      const words = this.old_words.map((d) => new Word(d.start, d.end, d.num, d.clue, d.word));
      this.from_words(words);
    }
  }
  toString() {
    let s = "     " + Array.from({ length: this.width }, (_2, i) => i.toString().padStart(4, " ")).join("");
    s += "\n     " + " ___".repeat(this.width);
    this.grid.forEach((row, n) => {
      s += "\n" + n.toString().padStart(3, " ") + " ";
      s += " | " + row.join(" | ") + " |";
      s += "\n     " + " ---".repeat(this.width);
    });
    return s;
  }
}
class Crossword {
  constructor({
    data = null,
    data_type = "grid",
    wordsource = null,
    wordfilter = null,
    pos = "N",
    ...kwargs
  } = {}) {
    this.data = data === null && data_type === "grid" ? DEFAULT_GRID : data;
    this.data_type = data_type;
    this.used = /* @__PURE__ */ new Set();
    this.wordsource = wordsource;
    this.wordfilter = wordfilter;
    this.pos = pos && pos !== "ALL" ? pos : null;
    this.backtrack_counts = /* @__PURE__ */ new Map();
    this.init_data(kwargs);
  }
  init_data(kwargs) {
    this.words = new Wordgrid(this.data, this.data_type, new CWInfo(), kwargs);
    this.reset_used();
    this.time_start = performance.now();
    this.domain_cache = /* @__PURE__ */ new Map();
  }
  change_word(word, new_word) {
    if (!this.words) return;
    this.words.change_word(word, new_word);
  }
  clear_word(word, force_clear = false) {
    if (!this.words) return;
    this.words.clear_word(word, force_clear);
  }
  clear() {
    this.used.clear();
    this.words.clear();
    this.backtrack_counts.clear();
    this.domain_cache.clear();
  }
  add_completed() {
    this.words.words.forEach((w) => {
      if (this.words.is_word_complete(w)) {
        this.used.add(this.words.get_word_str(w));
      }
    });
  }
  reset_used() {
    this.used.clear();
    this.add_completed();
  }
  /**
   * Fetches all valid words (not in used set) matching the pattern from the source.
   * This is the one-time expensive call used for initial cache population.
   * @param {string} pattern - The word pattern (e.g., 'a_ple').
   */
  suggest(pattern) {
    if (!this.wordsource) return [];
    const filt = (sug) => {
      const not_in_used = !this.used.has(sug);
      return this.wordfilter ? not_in_used && this.wordfilter(sug) : not_in_used;
    };
    return this.wordsource.fetch(pattern, BLANK, this.pos, filt);
  }
  timeout_happened(timeout = null) {
    if (timeout === null) return false;
    return (performance.now() - this.time_start) / 1e3 >= timeout;
  }
  /**
   * Populates the domain_cache by calling the expensive `suggest` function once 
   * for every incomplete word slot.
   */
  _initialize_domain_cache() {
    this.domain_cache.clear();
    for (const w of this.words.words) {
      if (!this.words.is_word_complete(w)) {
        const pattern = this.words.get_word_str(w);
        this.domain_cache.set(w.toString(), this.suggest(pattern));
      }
    }
  }
  generate({
    method = null,
    timeout = 10,
    stopcheck = null,
    onfinish = null,
    ontimeout = null,
    onstop = null,
    onerror = null,
    onvalidate = null,
    on_progress = null
  } = {}) {
    this.time_start = performance.now();
    this.reset_used();
    this.backtrack_counts.clear();
    this._initialize_domain_cache();
    let res = false;
    try {
      if (on_progress) {
        on_progress(this, this.words._word_count((w) => this.words.is_word_complete(w)), this.words.words.length);
      }
      res = this.generate_recurse(null, 0, timeout, stopcheck, on_progress);
    } catch (err) {
      if (err.name === "CWTimeoutError") {
        if (ontimeout) ontimeout(timeout);
      } else if (err.name === "CWStopCheck") {
        if (onstop) onstop();
      } else {
        if (onerror) onerror(err);
        else console.error(err);
      }
    }
    if (on_progress) {
      on_progress(this, this.words._word_count((w) => this.words.is_word_complete(w)), this.words.words.length);
    }
    const elapsed = (performance.now() - this.time_start) / 1e3;
    if (res) {
      const bad_words = this.validate();
      if (onvalidate) onvalidate(bad_words);
    }
    if (onfinish) onfinish(res, elapsed);
    return res;
  }
  /**
   * Implements Forward Checking: Prunes the domains of all intersecting words
   * based on the newly placed word.
   * @param {Word} word_slot - The word slot that was just filled.
   * @param {string} placed_word - The word placed in the slot.
   * @returns {boolean} True if no domain wipeout occurred, false otherwise.
   */
  _prune_intersecting_domains(word_slot, placed_word) {
    const intersections = this.words.intersects_of(word_slot, true);
    const placed_word_coords = word_slot.coord_array();
    for (const intersection of intersections) {
      const cross_word = intersection.word;
      const cross_word_key = cross_word.toString();
      if (this.words.is_word_complete(cross_word) || !this.domain_cache.has(cross_word_key)) {
        if (this.wordsource.check(this.words.get_word_str(cross_word))) continue;
        else return false;
      }
      const cross_domain = this.domain_cache.get(cross_word_key);
      const intersection_coord = intersection.coord;
      const placed_word_index = placed_word_coords.findIndex(
        (c) => c[0] === intersection_coord[0] && c[1] === intersection_coord[1]
      );
      const cross_word_coords = cross_word.coord_array();
      const cross_word_index = cross_word_coords.findIndex(
        (c) => c[0] === intersection_coord[0] && c[1] === intersection_coord[1]
      );
      if (placed_word_index === -1 || cross_word_index === -1) continue;
      const required_letter = placed_word[placed_word_index];
      const new_domain = cross_domain.filter((sug) => {
        const isValid = sug[cross_word_index] === required_letter;
        return isValid;
      });
      this.domain_cache.set(cross_word_key, new_domain);
      if (new_domain.length === 0) {
        return false;
      }
    }
    return true;
  }
  /**
   * Finds the next word slot to fill using the Minimum Remaining Values (MRV) heuristic,
   * with the Max-Degree heuristic as a tie-breaker.
   * * ***MODIFIED to use the cached domain size***
   * * @returns {Word|null} The next most constrained word, or null if all are filled or a failure is detected.
   */
  find_next_word_by_mrv() {
    let best_word = null;
    let min_suggestions = Infinity;
    let max_degree = -1;
    for (const w of this.words.words) {
      if (this.words.is_word_complete(w)) continue;
      const word_slot_key = w.toString();
      const cached_domain = this.domain_cache.get(word_slot_key);
      if (!cached_domain) continue;
      const domain_size = cached_domain.length;
      if (domain_size === 0) {
        return null;
      }
      const current_degree = this.words.intersects_of(w, false).filter(
        (x_word) => !this.words.is_word_complete(x_word)
        // Count only incomplete/unassigned neighbors
      ).length;
      if (domain_size < min_suggestions) {
        best_word = w;
        min_suggestions = domain_size;
        max_degree = current_degree;
      } else if (domain_size === min_suggestions) {
        if (current_degree > max_degree) {
          best_word = w;
          max_degree = current_degree;
        }
      }
    }
    return best_word;
  }
  /**
   * Recursive Backtracking Algorithm for Crossword Generation.
   * **Uses the Minimum Remaining Values (MRV) Heuristic.**
   * @param {Word|null} word_slot - The current word slot to fill.
   * @param {number} recurse_level - The current depth of recursion (for logging).
   * @returns {boolean} True if a solution is found down this path, false otherwise.
   */
  generate_recurse(word_slot = null, recurse_level = 0, timeout = null, stopcheck = null, on_progress = null) {
    let suggestions = [];
    const check_for_fitting_word = () => {
      const word_slot_key = word_slot.toString();
      const original_pattern = this.words.get_word_str(word_slot);
      suggestions = this.domain_cache.get(word_slot_key) || [];
      const count = this.backtrack_counts.get(word_slot_key) || 0;
      if (count > 0) {
        shuffle(suggestions);
      }
      for (let suggestion_index = 0; suggestion_index < suggestions.length; suggestion_index++) {
        const suggestion = suggestions[suggestion_index];
        const saved_cache = /* @__PURE__ */ new Map();
        for (let [key, arr] of this.domain_cache.entries()) {
          saved_cache.set(key, [...arr]);
        }
        this.words.change_word(word_slot, suggestion);
        this.used.add(suggestion);
        if (this._prune_intersecting_domains(word_slot, suggestion)) {
          this.domain_cache.delete(word_slot_key);
          const next_word_to_fill = this.find_next_word_by_mrv();
          if (next_word_to_fill === null) {
            return true;
          }
          if (on_progress) {
            on_progress(this, this.words._word_count((w) => this.words.is_word_complete(w)), this.words.words.length);
          }
          if (this.generate_recurse(next_word_to_fill, recurse_level + 1, timeout, stopcheck, on_progress)) {
            return true;
          }
        }
        this.used.delete(suggestion);
        this.words.change_word(word_slot, original_pattern);
        this.domain_cache = saved_cache;
        this.backtrack_counts.set(word_slot_key, (this.backtrack_counts.get(word_slot_key) || 0) + 1);
      }
      return false;
    };
    if (this.timeout_happened(timeout)) throw new CWTimeoutError();
    if (stopcheck && stopcheck()) throw new CWStopCheck();
 
	(async () => {await new Promise(r => setTimeout(r, 1));})();


	if (word_slot === null) {
      word_slot = this.find_next_word_by_mrv();
    }
    if (word_slot === null) {
      return this.words.find_incomplete("first-incomplete") === null;
    }
    if ((this.domain_cache.get(word_slot.toString()) || []).length === 0) {
      return false;
    }
    return check_for_fitting_word();
  }
  validate() {
    const wordList = this.words.words.map((w) => this.words.get_word_str(w));
    const lst_bad = wordList.filter((w) => !this.wordsource.check(w, this.pos, this.wordfilter));
    if (lst_bad.length > 0) {
      return lst_bad;
    } else {
      return null;
    }
  }
  static basic_grid(cols, rows, base_pattern = 1) {
    if (cols < 2) cols = 2;
    if (rows < 2) rows = 2;
    let pair1 = "", pair2 = "";
    if (base_pattern < 1 || base_pattern > 6) base_pattern = 1;
    if (base_pattern === 1) {
      pair1 = FILLER + BLANK;
      pair2 = BLANK + BLANK;
    } else if (base_pattern === 2) {
      pair1 = BLANK + FILLER;
      pair2 = BLANK + BLANK;
    } else if (base_pattern === 3) {
      pair1 = BLANK + BLANK;
      pair2 = FILLER + BLANK;
    } else if (base_pattern === 4) {
      pair1 = BLANK + BLANK;
      pair2 = BLANK + FILLER;
    } else if (base_pattern === 5) {
      pair1 = BLANK + BLANK;
      pair2 = BLANK + BLANK;
    } else if (base_pattern === 6) {
      pair1 = FILLER + FILLER;
      pair2 = FILLER + FILLER;
    }
    const grid = [];
    for (let i = 0; i < rows; i++) {
      const pair = i === 0 || i % 2 === 0 ? pair1 : pair2;
      let s = pair.repeat(Math.floor(cols / 2));
      if (s.length < cols) s += pair[0];
      grid.push(s);
    }
    return grid.join("\n");
  }
}
export {
  BLANK,
  CWError,
  CWInfo,
  CWStopCheck,
  CWTimeoutError,
  Coords,
  Crossword,
  DEFAULT_GRID,
  FILLER,
  FILLER2,
  Word,
  Wordgrid
};
