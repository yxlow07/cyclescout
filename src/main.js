import './style.css';
import { processImageWithGemini, chatWithRepairAssistant } from './api/gemini';
import { searchYouTubeTutorial } from './api/youtube';
import { submitToScrapBoard, fetchScrapBoard } from './api/sheets';

// --- DOM Elements ---
const views = {
  scanner: document.getElementById('view-scanner'),
  results: document.getElementById('view-results'),
  board: document.getElementById('view-board')
};

const navButtons = {
  scanner: document.getElementById('nav-scanner'),
  board: document.getElementById('nav-board')
};

// Scanner View
const uploadArea = document.getElementById('upload-area');
const imageInput = document.getElementById('image-input');
const loadingState = document.getElementById('loading-state');

// Results View
const btnBack = document.getElementById('btn-back');
const resItemName = document.getElementById('res-item-name');
const resScore = document.getElementById('res-score');
const resMaterials = document.getElementById('res-materials');
const resIdeas = document.getElementById('res-ideas');
const videoWrapper = document.getElementById('video-wrapper');
const videoCounter = document.getElementById('video-counter');
const btnPrevVideo = document.getElementById('btn-prev-video');
const btnNextVideo = document.getElementById('btn-next-video');
const btnDone = document.getElementById('btn-done');
const btnScrapIntent = document.getElementById('btn-scrap-intent');
const refineInput = document.getElementById('refine-model-input');
const btnRefine = document.getElementById('btn-refine');
const formContainer = document.getElementById('scrap-form-container');
const scrapLocation = document.getElementById('scrap-location');
const scrapContact = document.getElementById('scrap-contact');
const btnSubmitScrap = document.getElementById('btn-submit-scrap');
const scrapStatus = document.getElementById('scrap-status');
const actionButtons = document.getElementById('action-buttons');
const chatWidget = document.getElementById('chat-widget');
const btnChatToggle = document.getElementById('btn-chat-toggle');
const chatHeaderToggle = document.getElementById('chat-header-toggle');
const chatBody = document.getElementById('chat-body');
const chatContainer = document.getElementById('repair-chat-container');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const btnCloseChat = document.getElementById('btn-close-chat');

// Board View
const grid = document.getElementById('scrap-grid');
const btnRefreshBoard = document.getElementById('btn-refresh-board');
const boardLoading = document.getElementById('board-loading');
const boardEmpty = document.getElementById('board-empty');

// --- App State ---
const state = {
  currentView: 'scanner',
  currentAnalysis: null, // Holds the Gemini JSON output
  scrapLoaded: false,
  currentBase64: null,
  currentMimeType: null,
  videos: [],
  currentVideoIndex: 0,
  chatHistory: [] // {role: 'user'|'assistant', text: '...'}
};

// --- Navigation Logic ---
function switchView(viewName) {
  state.currentView = viewName;
  Object.keys(views).forEach(key => {
    if (key === viewName) {
      views[key].classList.add('active');
      views[key].classList.remove('hidden');
    } else {
      views[key].classList.remove('active');
      views[key].classList.add('hidden');
    }
  });

  Object.keys(navButtons).forEach(key => {
    if (navButtons[key]) {
      if (key === viewName) navButtons[key].classList.add('active');
      else navButtons[key].classList.remove('active');
    }
  });

  if (viewName === 'board' && !state.scrapLoaded) {
    loadScrapBoard();
  }
}

navButtons.scanner.addEventListener('click', () => switchView('scanner'));
navButtons.board.addEventListener('click', () => switchView('board'));

// --- Scanner Logic ---
uploadArea.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFileUpload(file);
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--color-primary)';
  uploadArea.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = 'var(--color-border)';
  uploadArea.style.backgroundColor = 'var(--color-surface)';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--color-border)';
  uploadArea.style.backgroundColor = 'var(--color-surface)';

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFileUpload(file);
});

async function handleFileUpload(file) {
  // Read file as Base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const base64 = reader.result;

    // UI Loading state
    uploadArea.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
      // 1. Get AI Triage
      state.currentBase64 = base64;
      state.currentMimeType = file.type;
      const analysisData = await processImageWithGemini(base64, file.type);
      state.currentAnalysis = analysisData;

      // 2. Populate Results UI
      populateResultsUI(analysisData);

      // 3. Kickoff YouTube Search async (don't block UI transition)
      fetchAndEmbedVideo(analysisData.Youtube_query);

      // 4. Reset Scanner and Switch Views
      imageInput.value = '';
      uploadArea.classList.remove('hidden');
      loadingState.classList.add('hidden');
      switchView('results');

    } catch (err) {
      console.error(err);
      alert("Error analyzing image: " + err.message);
      uploadArea.classList.remove('hidden');
      loadingState.classList.add('hidden');
    }
  };
}

// --- Results Logic ---
function populateResultsUI(data) {
  const modelText = data.product_model && data.product_model !== "Generic" ? ` (${data.product_model})` : '';
  resItemName.textContent = (data.item_name || "Unknown Item") + modelText;
  resScore.textContent = data.repairability_score || "?";

  // Set score color
  const score = Number(data.repairability_score);
  if (score < 4) resScore.style.color = '#EF4444'; // Red
  else if (score < 7) resScore.style.color = '#F59E0B'; // Yellow
  else resScore.style.color = '#10B981'; // Green

  // Build materials pills
  resMaterials.innerHTML = '';
  if (data.primary_materials && data.primary_materials.length) {
    data.primary_materials.forEach(mat => {
      const li = document.createElement('li');
      li.textContent = mat;
      resMaterials.appendChild(li);
    });
  } else {
    resMaterials.innerHTML = '<li class="text-light">No materials identified.</li>';
  }

  // Build upcycle ideas bullets
  resIdeas.innerHTML = '';
  if (data.upcycle_ideas && data.upcycle_ideas.length) {
    data.upcycle_ideas.forEach(idea => {
      const li = document.createElement('li');
      li.textContent = idea;
      resIdeas.appendChild(li);
    });
  } else {
    resIdeas.innerHTML = '<li class="text-light">No upcycle ideas generated.</li>';
  }

  // Reset video and contexts
  state.videos = [];
  state.currentVideoIndex = 0;
  state.chatHistory = [];
  videoWrapper.innerHTML = '<div class="placeholder-video">Searching for best tutorial...</div>';
  videoCounter.textContent = '';
  if (btnPrevVideo) btnPrevVideo.disabled = true;
  if (btnNextVideo) btnNextVideo.disabled = true;

  formContainer.classList.add('hidden');
  scrapStatus.classList.add('hidden');
  chatWidget.classList.remove('hidden');
  chatContainer.classList.add('hidden');
  btnChatToggle.classList.remove('hidden');
  chatBody.classList.remove('collapsed');
  chatHistory.innerHTML = '';
  chatInput.value = '';
  actionButtons.classList.remove('hidden');

  // No location auto-fill per user request
  scrapLocation.value = '';
  scrapContact.value = '';
}

async function fetchAndEmbedVideo(query) {
  if (!query) {
    videoWrapper.innerHTML = '<div class="placeholder-video">No tutorial search query generated.</div>';
    return;
  }

  try {
    const videoIds = await searchYouTubeTutorial(query);
    if (videoIds && videoIds.length > 0) {
      state.videos = videoIds;
      state.currentVideoIndex = 0;
      updateVideoCarousel();
    } else {
      videoWrapper.innerHTML = '<div class="placeholder-video">No relevant videos found.</div>';
      videoCounter.textContent = '';
    }
  } catch (e) {
    console.warn("YouTube integration skipped/failed:", e);
    videoWrapper.innerHTML = `<div class="placeholder-video">Video tutorial unavailable. (${e.message})</div>`;
    videoCounter.textContent = '';
  }
}

function updateVideoCarousel() {
  if (state.videos.length === 0) return;
  const videoId = state.videos[state.currentVideoIndex];

  videoWrapper.innerHTML = `
    <iframe 
      src="https://www.youtube.com/embed/${videoId}" 
      title="YouTube video player" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;

  videoCounter.textContent = `${state.currentVideoIndex + 1} of ${state.videos.length}`;

  if (btnPrevVideo) btnPrevVideo.disabled = state.currentVideoIndex === 0;
  if (btnNextVideo) btnNextVideo.disabled = state.currentVideoIndex === state.videos.length - 1;
}

if (btnPrevVideo) {
  btnPrevVideo.addEventListener('click', () => {
    if (state.currentVideoIndex > 0) {
      state.currentVideoIndex--;
      updateVideoCarousel();
    }
  });
}

if (btnNextVideo) {
  btnNextVideo.addEventListener('click', () => {
    if (state.currentVideoIndex < state.videos.length - 1) {
      state.currentVideoIndex++;
      updateVideoCarousel();
    }
  });
}

// Result Action Listeners
btnBack.addEventListener('click', () => switchView('scanner'));

btnDone.addEventListener('click', () => {
  // Show the chat widget and open the popup
  chatWidget.classList.remove('hidden');
  chatContainer.classList.remove('hidden');
  btnChatToggle.classList.add('hidden');
  chatBody.classList.remove('collapsed');

  if (state.chatHistory.length === 0) {
    const msg = `Hi! I see you're ready to fix the ${state.currentAnalysis?.item_name || 'item'}. What seems to be the main issue you're facing?`;
    appendChatMessage("assistant", msg);
    state.chatHistory.push({ role: 'assistant', text: msg });
  }
});

btnCloseChat.addEventListener('click', (e) => {
  e.stopPropagation();
  chatContainer.classList.add('hidden');
  btnChatToggle.classList.remove('hidden');
});

chatHeaderToggle.addEventListener('click', () => {
  chatContainer.classList.add('hidden');
  btnChatToggle.classList.remove('hidden');
});

btnChatToggle.addEventListener('click', () => {
  btnChatToggle.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  chatBody.classList.remove('collapsed');
  if (state.chatHistory.length === 0) {
    const msg = `Hi! I see you're ready to fix the ${state.currentAnalysis?.item_name || 'item'}. What seems to be the main issue you're facing?`;
    appendChatMessage("assistant", msg);
    state.chatHistory.push({ role: 'assistant', text: msg });
  }
});

function appendChatMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}`;
  msgDiv.textContent = text;
  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

btnSendChat.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text) return;

  // User message
  appendChatMessage('user', text);
  chatInput.value = '';
  btnSendChat.disabled = true;

  // Create loading element
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-msg assistant text-light loading-dots';
  loadingDiv.textContent = '...';
  chatHistory.appendChild(loadingDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const response = await chatWithRepairAssistant(state.chatHistory, text, state.currentAnalysis);

    // Remove loading
    chatHistory.removeChild(loadingDiv);

    // Assistant message
    appendChatMessage('assistant', response.reply);

    // Save to history
    state.chatHistory.push({ role: 'user', text: text });
    state.chatHistory.push({ role: 'assistant', text: response.reply });

    // Refine video if suggested
    if (response.refined_youtube_query) {
      appendChatMessage('system', `AI updated video tutorials based on your chat -> Searching for: "${response.refined_youtube_query}"`);
      await fetchAndEmbedVideo(response.refined_youtube_query);
    }

  } catch (err) {
    chatHistory.removeChild(loadingDiv);
    appendChatMessage('system', `Error: ${err.message}`);
  }

  btnSendChat.disabled = false;
  chatInput.focus();
});

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btnSendChat.click();
  }
});

btnScrapIntent.addEventListener('click', () => {
  // Show the scrap listing form
  formContainer.classList.remove('hidden');
  // Scroll to form smoothly if needed
  formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

btnRefine.addEventListener('click', async () => {
  const newModel = refineInput.value.trim();
  if (!newModel) return;

  // Show loading state
  switchView('scanner');
  uploadArea.classList.add('hidden');
  loadingState.classList.remove('hidden');

  try {
    const analysisData = await processImageWithGemini(state.currentBase64, state.currentMimeType, newModel);
    state.currentAnalysis = analysisData;
    populateResultsUI(analysisData);
    fetchAndEmbedVideo(analysisData.Youtube_query);

    refineInput.value = '';
    loadingState.classList.add('hidden');
    switchView('results');
  } catch (err) {
    console.error(err);
    alert("Error refining details: " + err.message);
    loadingState.classList.add('hidden');
    switchView('results');
  }
});

btnSubmitScrap.addEventListener('click', async () => {
  const loc = scrapLocation.value.trim();
  const contact = scrapContact.value.trim();

  if (!loc) {
    alert("Please provide a location so people can find it.");
    return;
  }

  if (!contact) {
    alert("Please provide contact info so people can reach you to pick it up.");
    return;
  }

  btnSubmitScrap.disabled = true;
  btnSubmitScrap.textContent = "Submitting...";

  const payload = {
    item_name: state.currentAnalysis?.item_name || "Unknown Item",
    product_model: state.currentAnalysis?.product_model || "Generic", // Added Product Model
    materials: (state.currentAnalysis?.primary_materials || []).join(', '),
    location: loc,
    contact: contact,
    image_base64: state.currentBase64
  };

  try {
    const res = await submitToScrapBoard(payload);
    scrapStatus.textContent = res.message || "Successfully listed on the Scrap Board!";
    scrapStatus.className = "mt-1 text-center";
    scrapStatus.style.color = "var(--color-primary)";
    scrapStatus.classList.remove('hidden');

    // Auto redirect back to board after 1.5s
    setTimeout(() => {
      // Force reload of board
      state.scrapLoaded = false;
      switchView('board');
      // Reset form
      scrapLocation.value = "";
      scrapContact.value = "";
      formContainer.classList.add('hidden');
      btnSubmitScrap.disabled = false;
      btnSubmitScrap.textContent = "Submit to Community Board";
    }, 1500);
  } catch (e) {
    scrapStatus.textContent = "Error submitting listing. Try again later.";
    scrapStatus.className = "mt-1 text-center";
    scrapStatus.style.color = "#EF4444";
    scrapStatus.classList.remove('hidden');
    btnSubmitScrap.disabled = false;
    btnSubmitScrap.textContent = "Submit to Community Board";
  }
});

// --- Board Logic ---
async function loadScrapBoard() {
  boardLoading.classList.remove('hidden');
  boardEmpty.classList.add('hidden');
  grid.innerHTML = '';

  try {
    const items = await fetchScrapBoard();
    boardLoading.classList.add('hidden');

    if (items.length === 0) {
      boardEmpty.classList.remove('hidden');
      state.scrapLoaded = true;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card scrap-item';

      const title = document.createElement('h3');
      title.textContent = item.item_name || "Unknown Item";

      const matStr = document.createElement('div');
      matStr.className = 'materials';
      matStr.textContent = item.materials || "Various Materials";

      const locStr = document.createElement('div');
      locStr.className = 'location';
      locStr.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${item.location}`;

      card.appendChild(title);
      card.appendChild(matStr);

      if (item.contact) {
        const btnContact = document.createElement('div');
        btnContact.className = 'contact';
        btnContact.textContent = `Contact: ${item.contact}`;
        card.appendChild(btnContact);
      }

      card.appendChild(locStr);
      grid.appendChild(card);
    });

    state.scrapLoaded = true;
  } catch (e) {
    console.error("Failed to load board", e);
    boardLoading.classList.add('hidden');
    boardEmpty.innerHTML = `<p style="color:red">Failed to load items: ${e.message}</p>`;
    boardEmpty.classList.remove('hidden');
  }
}

btnRefreshBoard.addEventListener('click', () => loadScrapBoard());

// Initialize
switchView('scanner');
