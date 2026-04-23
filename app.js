let vocabData = [];
let selectedVoice = null;

// DOM Elements
const vocabList = document.getElementById('vocab-list');
const searchBar = document.getElementById('search-bar');
const posFilter = document.getElementById('pos-filter');
const wordCount = document.getElementById('word-count');
const modal = document.getElementById('word-modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');

/**
 * VOICE SYSTEM
 * High-quality French voice (preferring Female voices 
 * like Amélie or Google for better phonetics).
 */
function loadVoices() {
    let voices = window.speechSynthesis.getVoices();
    let frenchVoices = voices.filter(voice => voice.lang.startsWith('fr'));

    // Priority: Google high-quality voices, then named iOS voices, then any female voice
    selectedVoice = frenchVoices.find(v => v.name.includes('Google') || v.name.includes('Amélie') || v.name.includes('Marie')) 
                    || frenchVoices.find(v => v.name.toLowerCase().includes('female'))
                    || frenchVoices[0]; 
}

// Handle browsers loading voices asynchronously
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

/**
 * SPEECH FUNCTION
 * @param {string} text - The French text to speak
 */
function speakFrench(text) {
    window.speechSynthesis.cancel(); // Stop any current speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85; // Slightly slower for learning
    window.speechSynthesis.speak(utterance);
}

/**
 * DATA FETCHING
 */
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        vocabData = data;
        populateFilters();
        renderList(vocabData);
    })
    .catch(error => console.error('Error loading JSON:', error));

/**
 * FILTER LOGIC
 */
function populateFilters() {
    const partsOfSpeech = [...new Set(vocabData.map(item => item.pos))];
    partsOfSpeech.forEach(pos => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = pos;
        posFilter.appendChild(option);
    });
}

function filterData() {
    const searchTerm = searchBar.value.toLowerCase();
    const posTerm = posFilter.value;

    const filtered = vocabData.filter(item => {
        const matchesSearch = item.word.toLowerCase().includes(searchTerm) || 
                              item.meaning.toLowerCase().includes(searchTerm);
        const matchesPos = posTerm === 'all' || item.pos === posTerm;
        return matchesSearch && matchesPos;
    });

    renderList(filtered);
}

searchBar.addEventListener('input', filterData);
posFilter.addEventListener('change', filterData);

/**
 * UI RENDERING
 */
function renderList(data) {
    vocabList.innerHTML = '';
    wordCount.textContent = `${data.length} word${data.length !== 1 ? 's' : ''} learned`;

    if (data.length === 0) {
        vocabList.innerHTML = '<p style="text-align:center; color:gray; margin-top:20px;">No words found.</p>';
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'vocab-row';
        
        const phoneticHTML = item.mainContext.phonetic ? `<div class="context-phonetic">[${item.mainContext.phonetic}]</div>` : '';

        // Safe strings for onclick to handle apostrophes in French sentences
        const safeWord = item.word.replace(/'/g, "\\'");
        const safeMainFr = item.mainContext.fr.replace(/'/g, "\\'");

        row.innerHTML = `
            <div class="row-left">
                <div class="word-title">
                    ${item.word} <span class="pos-tag">${item.pos}</span>
                    <button class="sound-btn" onclick="speakFrench('${safeWord}')">🔊</button>
                </div>
                <div class="pronunciation">[${item.pronunciation}]</div>
            </div>
            
            <div class="row-middle">
                <div class="meaning">${item.meaning}</div>
                <div class="context-fr">
                    ${item.mainContext.fr} 
                    <button class="sound-btn" onclick="speakFrench('${safeMainFr}')">🔊</button>
                </div>
                ${phoneticHTML}
                <div class="context-en">${item.mainContext.en}</div>
            </div>

            <div class="row-right">
                <button class="view-more-btn" data-index="${index}">View More</button>
            </div>
        `;
        vocabList.appendChild(row);
    });

    // Attach events to the buttons
    document.querySelectorAll('.view-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            openModal(data[idx]);
        });
    });
}

/**
 * MODAL LOGIC
 */
function openModal(item) {
    const mainPhoneticHTML = item.mainContext.phonetic ? `<div class="context-phonetic" style="font-size: 0.95rem;">[${item.mainContext.phonetic}]</div>` : '';
    const safeWord = item.word.replace(/'/g, "\\'");
    const safeMainFr = item.mainContext.fr.replace(/'/g, "\\'");

    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="word-title" style="font-size: 1.8rem;">
                ${item.word} 
                <button class="sound-btn" onclick="speakFrench('${safeWord}')">🔊</button>
            </div>
            <p class="pronunciation">[${item.pronunciation}]</p>
            <p class="meaning" style="font-size: 1.2rem; margin-top: 5px;">${item.meaning}</p>
        </div>
        
        <h3>Examples:</h3>
        <div class="example-block">
            <div class="context-fr" style="font-size: 1.1rem; font-weight: bold;">
                ${item.mainContext.fr}
                <button class="sound-btn" onclick="speakFrench('${safeMainFr}')">🔊</button>
            </div>
            ${mainPhoneticHTML}
            <div class="context-en">${item.mainContext.en}</div>
        </div>

        ${item.moreContext.map(ctx => {
            const safeCtxFr = ctx.fr.replace(/'/g, "\\'");
            const morePhoneticHTML = ctx.phonetic ? `<div class="context-phonetic" style="font-size: 0.95rem;">[${ctx.phonetic}]</div>` : '';
            return `
            <div class="example-block">
                <div class="context-fr" style="font-size: 1.1rem; font-weight: bold;">
                    ${ctx.fr}
                    <button class="sound-btn" onclick="speakFrench('${safeCtxFr}')">🔊</button>
                </div>
                ${morePhoneticHTML}
                <div class="context-en">${ctx.en}</div>
            </div>
            `;
        }).join('')}
    `;
    modal.style.display = 'flex';
}

// Close Modal handlers
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});
