(() => {
  "use strict";

  const DATABASE_NAME = "cifraPocketClub";
  const DATABASE_VERSION = 2;
  const POCKET_STORE = "tPocket";
  const SONG_STORE = "tPocketMusicas";

  const addButton = document.querySelector("#add-pocket");
  const list = document.querySelector("#pocket-list");
  const status = document.querySelector("#status-message");
  const dialog = document.querySelector("#pocket-dialog");
  const form = document.querySelector("#pocket-form");
  const nameInput = document.querySelector("#pocket-name");
  const formError = document.querySelector("#form-error");
  const saveButton = document.querySelector("#save-pocket");
  const pocketsPanel = document.querySelector(".pockets-panel");
  const songsPanel = document.querySelector("#songs-panel");
  const songsTitle = document.querySelector("#songs-title");
  const songsStatus = document.querySelector("#songs-status");
  const songList = document.querySelector("#song-list");
  const songCount = document.querySelector("#song-count");
  const songDetailPanel = document.querySelector("#song-detail-panel");
  const songDetailTitle = document.querySelector("#song-detail-title");
  const detailSongKey = document.querySelector("#detail-song-key");
  const detailStatus = document.querySelector("#detail-status");
  const lyricsContent = document.querySelector("#lyrics-content");
  const backToSongsLabel = document.querySelector("#back-to-songs-label");
  const addSongButton = document.querySelector("#add-song");
  const songDialog = document.querySelector("#song-dialog");
  const songForm = document.querySelector("#song-form");
  const songNameInput = document.querySelector("#song-name-input");
  const songKeyInput = document.querySelector("#song-key-input");
  const songChartInput = document.querySelector("#song-chart-input");
  const songFormError = document.querySelector("#song-form-error");
  const saveSongButton = document.querySelector("#save-song");
  const snackbar = document.querySelector("#snackbar");

  let database;
  let pockets = [];
  let routeVersion = 0;
  let snackbarTimeout;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Este navegador não oferece suporte ao armazenamento local necessário."));
        return;
      }

      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(POCKET_STORE)) {
          db.createObjectStore(POCKET_STORE, { keyPath: "id" });
        }
        let songs;
        if (!db.objectStoreNames.contains(SONG_STORE)) {
          songs = db.createObjectStore(SONG_STORE, { keyPath: "id" });
        } else {
          songs = request.transaction.objectStore(SONG_STORE);
        }
        if (!songs.indexNames.contains("pocketId")) {
          songs.createIndex("pocketId", "pocketId", { unique: false });
        }

        if (event.oldVersion > 0 && event.oldVersion < 2) {
          const cursorRequest = songs.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const song = cursor.value;
            if (!song.tom) {
              cursor.update({ ...song, tom: "Não informado" });
            }
            cursor.continue();
          };
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o banco de dados."));
      request.onblocked = () => reject(new Error("Feche outras abas deste app para concluir a atualização do armazenamento."));
    });
  }

  function getPockets() {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(POCKET_STORE, "readonly");
      const request = transaction.objectStore(POCKET_STORE).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível carregar os pockets."));
      transaction.onabort = () => reject(transaction.error || new Error("A leitura dos pockets foi interrompida."));
    });
  }

  function getSongs(pocketId) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(SONG_STORE, "readonly");
      const store = transaction.objectStore(SONG_STORE);
      const request = store.index("pocketId").getAll(IDBKeyRange.only(pocketId));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível carregar as músicas."));
      transaction.onabort = () => reject(transaction.error || new Error("A leitura das músicas foi interrompida."));
    });
  }

  function createPocket(nome) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(POCKET_STORE, "readwrite");
      transaction.objectStore(POCKET_STORE).add({ id: createUuid(), nome });

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Não foi possível salvar o pocket."));
      transaction.onabort = () => reject(transaction.error || new Error("O salvamento do pocket foi interrompido."));
    });
  }

  function createSong(song) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(SONG_STORE, "readwrite");
      transaction.objectStore(SONG_STORE).add(song);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Não foi possível salvar a música."));
      transaction.onabort = () => reject(transaction.error || new Error("O salvamento da música foi interrompido."));
    });
  }

  function createUuid() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    if (!crypto.getRandomValues) {
      throw new Error("Este navegador não oferece suporte à geração segura de identificadores.");
    }

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function renderPockets() {
    list.replaceChildren();

    if (pockets.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "♪";

      const title = document.createElement("h2");
      title.textContent = "Seu primeiro pocket começa aqui";

      const description = document.createElement("p");
      description.textContent = "Crie um agrupamento para reunir as músicas de um evento, viagem ou momento especial.";

      empty.append(icon, title, description);
      list.append(empty);
      return;
    }

    pockets.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    pockets.forEach((pocket, index) => {
      const item = document.createElement("li");
      item.className = "pocket-item";

      const number = document.createElement("span");
      number.className = "pocket-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(index + 1).padStart(2, "0");

      const link = document.createElement("a");
      link.className = "pocket-link";
      link.href = `#pocket-${encodeURIComponent(pocket.id)}`;
      link.textContent = pocket.nome;
      link.setAttribute("aria-label", `Ver músicas do pocket ${pocket.nome}`);

      const arrow = document.createElement("span");
      arrow.className = "pocket-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";

      item.append(number, link, arrow);
      list.append(item);
    });
  }

  async function refreshPockets() {
    pockets = await getPockets();
    renderPockets();
    setStatus("");
  }

  function setSongsStatus(message, isError = false) {
    songsStatus.textContent = message;
    songsStatus.classList.toggle("is-error", isError);
  }

  function setDetailStatus(message, isError = false) {
    detailStatus.textContent = message;
    detailStatus.classList.toggle("is-error", isError);
  }

  function showSnackbar(message, isError = false) {
    window.clearTimeout(snackbarTimeout);
    snackbar.textContent = message;
    snackbar.classList.toggle("is-error", isError);
    snackbar.classList.add("is-visible");
    snackbarTimeout = window.setTimeout(() => snackbar.classList.remove("is-visible"), 3600);
  }

  function parseChart(rawText, title) {
    let lines = rawText
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/\r\n?/g, "\n")
      .split("\n");
    const firstContentIndex = lines.findIndex((line) => line.trim());
    if (
      firstContentIndex >= 0 &&
      /^(?:body|div|pre|p|h[1-6]|b|a|span)\b/i.test(lines[firstContentIndex].trim()) &&
      /\{/.test(lines[firstContentIndex]) &&
      /(?:color|background|margin|text-decoration)\s*:/i.test(lines[firstContentIndex])
    ) {
      const firstBlankLine = lines.findIndex((line, index) => index > firstContentIndex && !line.trim());
      lines = firstBlankLine >= 0 ? lines.slice(firstBlankLine + 1) : lines.slice(firstContentIndex + 1);
    }

    const sections = [];
    let ignoringIntro = false;
    let checkedLeadingTitle = false;
    const chordNamePattern = /^[A-G](?:#|b)?[A-Za-z0-9º°ø+#-]*(?:\/[A-G](?:#|b)?[A-Za-z0-9º°ø+#-]*)?(?:\([0-9#b+/-]+\))?$/;

    function parseUnmarkedChordLine(sourceLine) {
      const tokens = Array.from(sourceLine.matchAll(/\S+/g));
      if (tokens.length === 0) return [];

      const chords = [];
      for (const tokenMatch of tokens) {
        const token = tokenMatch[0];
        const prefix = token.match(/^[("'“‘]*/)[0];
        let chord = token.slice(prefix.length).replace(/["'”’]+$/g, "");
        let offset = prefix.length;

        if (chord.startsWith("(")) {
          chord = chord.slice(1);
          offset += 1;
        }
        if (chord.endsWith(")")) {
          chord = chord.slice(0, -1);
        }
        if (!chord) continue;
        if (!chordNamePattern.test(chord)) return [];

        chords.push({
          chord,
          chartIndex: sourceLine
            .slice(0, tokenMatch.index + offset)
            .replace(/["'”’()]/g, "")
            .length
        });
      }

      return chords;
    }

    lines.forEach((sourceLine, index) => {
      const trimmed = sourceLine.trim();
      if (!trimmed) {
        return;
      }
      if (/^[-_]{5,}$/.test(trimmed)) return;

      if (/^\[intro\]/i.test(trimmed)) {
        ignoringIntro = true;
        return;
      }

      const hasChordMarkup = /\*\*[^*]+\*\*/.test(sourceLine);
      const unmarkedChords = hasChordMarkup ? [] : parseUnmarkedChordLine(sourceLine);
      const nextNonEmptyIndex = lines.findIndex((line, nextIndex) => nextIndex > index && line.trim());
      const nextNonEmpty = nextNonEmptyIndex >= 0 ? lines[nextNonEmptyIndex] : null;
      const hasBlankAfter = nextNonEmptyIndex > index + 1;
      if (
        !checkedLeadingTitle &&
        !hasChordMarkup &&
        unmarkedChords.length === 0 &&
        !/^tom\s*:/i.test(trimmed) &&
        (trimmed.localeCompare(title.trim(), "pt-BR", { sensitivity: "base" }) === 0 ||
          !nextNonEmpty ||
          hasBlankAfter ||
          /^\[intro\]/i.test(nextNonEmpty.trim()) ||
          /^tom\s*:/i.test(nextNonEmpty.trim()))
      ) {
        checkedLeadingTitle = true;
        return;
      }
      checkedLeadingTitle = true;

      if (/^tom\s*:/i.test(trimmed)) return;

      const parsed = { text: "", chords: [] };
      const chordPattern = /\*\*([^*]+)\*\*/g;
      let previousIndex = 0;
      let match;
      while ((match = chordPattern.exec(sourceLine)) !== null) {
        parsed.text += sourceLine.slice(previousIndex, match.index);
        parsed.chords.push({
          chord: match[1].trim(),
          chartIndex: sourceLine
            .slice(0, match.index)
            .replace(/\*\*[^*]+\*\*/g, "")
            .replace(/[()]/g, "")
            .length
        });
        previousIndex = chordPattern.lastIndex;
      }
      parsed.text += sourceLine.slice(previousIndex);
      if (!hasChordMarkup) {
        if (unmarkedChords.length > 0) {
          parsed.text = "";
          parsed.chords = unmarkedChords;
        }
      }

      const isChordOnlyLine =
        parsed.chords.length > 0 &&
        parsed.text.replace(/[\s()[\]]/g, "") === "";
      if (ignoringIntro && isChordOnlyLine) return;
      if (isChordOnlyLine) {
        parsed.text = parsed.text.replace(/[()]/g, "");
      }
      if (parsed.text.trim() || parsed.chords.length) {
        ignoringIntro = false;
        sections.push(parsed);
      }
    });

    if (sections.length === 0) {
      throw new Error("Não encontramos letra ou acordes. Confira o texto e tente novamente.");
    }

    const mergedSections = [];
    let pendingChords = [];
    let pendingChartText = "";
    sections.forEach((section) => {
      if (!section.text.trim() && section.chords.length) {
        pendingChords.push(...section.chords);
        if (section.text.length > pendingChartText.length) {
          pendingChartText = section.text;
        }
        return;
      }

      mergedSections.push({
        text: section.text,
        chords: [...pendingChords, ...section.chords].sort((a, b) => a.chartIndex - b.chartIndex)
      });
      pendingChords = [];
      pendingChartText = "";
    });

    if (pendingChords.length) {
      mergedSections.push({ text: pendingChartText, chords: pendingChords });
    }

    return { sections: mergedSections };
  }

  function renderSongs(songs) {
    songList.replaceChildren();
    songCount.textContent = `${songs.length} ${songs.length === 1 ? "música" : "músicas"}`;

    if (songs.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "♪";

      const title = document.createElement("h2");
      title.textContent = "Nenhuma música por aqui ainda";

      const description = document.createElement("p");
      description.textContent = "As músicas adicionadas a este pocket aparecerão nesta lista.";

      empty.append(icon, title, description);
      songList.append(empty);
      return;
    }

    songs.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    songs.forEach((song, index) => {
      const item = document.createElement("li");
      item.className = "song-item";

      const number = document.createElement("span");
      number.className = "pocket-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(index + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "song-name";
      const link = document.createElement("a");
      link.className = "song-link";
      link.href = `#pocket-${encodeURIComponent(song.pocketId)}/song-${encodeURIComponent(song.id)}`;
      link.textContent = song.nome;
      link.setAttribute("aria-label", `Visualizar cifra e letra de ${song.nome}`);
      name.append(link);

      const key = document.createElement("span");
      key.className = "song-key";
      key.textContent = song.tom || "Não informado";
      key.setAttribute("aria-label", `Tom: ${key.textContent}`);

      item.append(number, name, key);
      songList.append(item);
    });
  }

  function parseSections(value) {
    let data;
    try {
      data = typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      throw new Error("O conteúdo da cifra está em um formato inválido.");
    }

    if (!data || typeof data !== "object" || !Array.isArray(data.sections)) {
      throw new Error("O conteúdo desta música não possui seções de letra e cifra válidas.");
    }

    return data.sections.map((section) => {
      if (!section || typeof section.text !== "string" || !Array.isArray(section.chords)) {
        throw new Error("Uma das seções desta música está em um formato inválido.");
      }

      const chords = section.chords.map((chord) => {
        if (
          !chord ||
          typeof chord.chord !== "string" ||
          !Number.isSafeInteger(chord.chartIndex) ||
          chord.chartIndex < 0
        ) {
          throw new Error("Um acorde desta música possui uma posição inválida.");
        }
        return chord;
      });

      return { text: section.text, chords };
    });
  }

  function renderSongDetail(song, pocket) {
    songDetailTitle.textContent = song.nome;
    detailSongKey.textContent = song.tom || "Não informado";
    detailSongKey.setAttribute("aria-label", `Tom: ${detailSongKey.textContent}`);
    backToSongsLabel.textContent = `Músicas de ${pocket.nome}`;
    lyricsContent.replaceChildren();
    setDetailStatus("");

    let sections;
    try {
      sections = parseSections(song.sections);
    } catch (error) {
      setDetailStatus(error.message || "Não foi possível interpretar a cifra desta música.", true);
      return;
    }

    if (sections.length === 0) {
      setDetailStatus("Esta música ainda não possui letra ou cifra cadastrada.");
      return;
    }

    const alignedSections = [];
    let pendingChords = [];
    sections.forEach((section) => {
      if (!section.text.trim() && section.chords.length > 0) {
        pendingChords.push(...section.chords);
        return;
      }

      alignedSections.push({
        text: section.text,
        chords: [...pendingChords, ...section.chords].sort((a, b) => a.chartIndex - b.chartIndex)
      });
      pendingChords = [];
    });

    if (pendingChords.length > 0) {
      alignedSections.push({ text: "", chords: pendingChords });
    }

    alignedSections.forEach((section) => {
      const line = document.createElement("div");
      const sectionHeading = /^\[[^\]]+\]$/.test(section.text.trim());
      line.className = sectionHeading ? "lyric-line lyric-section-heading" : "lyric-line";

      section.chords.forEach((chord) => {
        const chordLabel = document.createElement("span");
        chordLabel.className = "lyric-chord";
        chordLabel.textContent = chord.chord;
        chordLabel.style.setProperty("--chord-index", String(chord.chartIndex));
        line.append(chordLabel);
      });

      const text = document.createElement("span");
      text.className = "lyric-text";
      text.textContent = section.text || " ";
      line.append(text);
      lyricsContent.append(line);
    });
  }

  async function renderRoute() {
    const currentVersion = ++routeVersion;
    const match = location.hash.match(/^#pocket-([^/]+)(?:\/song-(.+))?$/);
    if (!match) {
      songDetailPanel.hidden = true;
      songsPanel.hidden = true;
      pocketsPanel.hidden = false;
      setStatus("");
      return;
    }

    let pocketId;
    let songId;
    try {
      pocketId = decodeURIComponent(match[1]);
      songId = match[2] ? decodeURIComponent(match[2]) : null;
    } catch {
      songDetailPanel.hidden = true;
      songsPanel.hidden = true;
      pocketsPanel.hidden = false;
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      setStatus("O endereço desse pocket é inválido.", true);
      return;
    }

    const pocket = pockets.find((item) => item.id === pocketId);
    if (!pocket) {
      songDetailPanel.hidden = true;
      songsPanel.hidden = true;
      pocketsPanel.hidden = false;
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      setStatus("Esse pocket não foi encontrado.", true);
      return;
    }

    pocketsPanel.hidden = true;
    songsPanel.hidden = Boolean(songId);
    songDetailPanel.hidden = !songId;
    if (songId) {
      songDetailTitle.textContent = "";
      lyricsContent.replaceChildren();
      setDetailStatus("Carregando música…");
    } else {
      songsTitle.textContent = pocket.nome;
      songCount.textContent = "";
      songList.replaceChildren();
      setSongsStatus("Carregando músicas…");
    }

    try {
      const songs = await getSongs(pocket.id);
      if (currentVersion !== routeVersion) return;
      if (songId) {
        const song = songs.find((item) => item.id === songId);
        if (!song) {
          history.replaceState(null, "", `#pocket-${encodeURIComponent(pocket.id)}`);
          await renderRoute();
          setSongsStatus("Essa música não foi encontrada neste pocket.", true);
          return;
        }
        renderSongDetail(song, pocket);
        return;
      }
      setSongsStatus("");
      renderSongs(songs);
    } catch (error) {
      if (currentVersion !== routeVersion) return;
      if (songId) {
        setDetailStatus(error.message || "Não foi possível carregar a música.", true);
      } else {
        setSongsStatus(error.message || "Não foi possível carregar as músicas.", true);
      }
    }
  }

  function openDialog() {
    formError.textContent = "";
    nameInput.value = "";
    dialog.showModal();
    nameInput.focus();
  }

  function openSongDialog() {
    songFormError.textContent = "";
    songForm.reset();
    songDialog.showModal();
    songNameInput.focus();
  }

  function closeSongDialog() {
    songDialog.close();
    addSongButton.focus();
  }

  function closeDialog() {
    dialog.close();
    addButton.focus();
  }

  addButton.addEventListener("click", openDialog);
  document.querySelector("#back-to-pockets").addEventListener("click", () => {
    history.pushState(null, "", `${location.pathname}${location.search}`);
    renderRoute();
  });
  document.querySelector("#back-to-songs").addEventListener("click", () => {
    const match = location.hash.match(/^#pocket-([^/]+)/);
    if (!match) return;
    history.pushState(null, "", `#pocket-${match[1]}`);
    renderRoute();
  });
  addSongButton.addEventListener("click", openSongDialog);
  document.querySelector("#close-song-dialog").addEventListener("click", closeSongDialog);
  document.querySelector("#cancel-song-dialog").addEventListener("click", closeSongDialog);

  songDialog.addEventListener("click", (event) => {
    if (event.target === songDialog) closeSongDialog();
  });

  songForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = songNameInput.value.trim();
    const tom = songKeyInput.value.trim();
    const rawChart = songChartInput.value.trim();
    const routeMatch = location.hash.match(/^#pocket-([^/]+)/);
    let pocketId = null;
    try {
      pocketId = routeMatch ? decodeURIComponent(routeMatch[1]) : null;
    } catch {
      pocketId = null;
    }

    if (!nome || !tom || !rawChart || !pocketId) {
      const message = !pocketId
        ? "Não foi possível identificar o pocket. Feche esta janela e tente novamente."
        : "Preencha o título, o tom e a cifra antes de salvar.";
      songFormError.textContent = message;
      if (!nome) songNameInput.focus();
      else if (!tom) songKeyInput.focus();
      else if (!rawChart) songChartInput.focus();
      showSnackbar(message, true);
      return;
    }

    saveSongButton.disabled = true;
    songFormError.textContent = "";
    try {
      const parsed = parseChart(rawChart, nome);
      const serialized = JSON.stringify(parsed);
      await createSong({
        id: createUuid(),
        nome,
        tom,
        cifra: serialized,
        sections: serialized,
        pocketId
      });
      songDialog.close();
      history.replaceState(null, "", `#pocket-${encodeURIComponent(pocketId)}`);
      await renderRoute();
      showSnackbar(`“${nome}” foi adicionada ao pocket.`);
    } catch (error) {
      songFormError.textContent = error.message || "Não foi possível adicionar a música. Confira os dados e tente novamente.";
      showSnackbar("Não foi possível salvar a música. Revise os dados.", true);
    } finally {
      saveSongButton.disabled = false;
    }
  });
  document.querySelector("#close-dialog").addEventListener("click", closeDialog);
  document.querySelector("#cancel-dialog").addEventListener("click", closeDialog);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = nameInput.value.trim();
    if (!nome) {
      formError.textContent = "Informe um nome para o pocket.";
      nameInput.focus();
      return;
    }

    saveButton.disabled = true;
    formError.textContent = "";
    try {
      await createPocket(nome);
      await refreshPockets();
      closeDialog();
    } catch (error) {
      formError.textContent = error.message || "Ocorreu um erro ao salvar o pocket.";
    } finally {
      saveButton.disabled = false;
    }
  });

  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("popstate", renderRoute);

  openDatabase()
    .then((db) => {
      database = db;
      database.onversionchange = () => database.close();
      return refreshPockets();
    })
    .then(() => {
      addButton.disabled = false;
      return renderRoute();
    })
    .catch((error) => {
      setStatus(error.message || "Não foi possível carregar os pockets.", true);
      addButton.disabled = true;
    });
})();
