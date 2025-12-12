// kc.js — TTS Reader functionality using the Web Speech API

(() => {
	const $ = sel => document.querySelector(sel);

	// Require client-side login flag. If not set, redirect to login page (simple demo auth).
	const isLoggedIn = localStorage.getItem('kc_logged_in');
	const currentUser = localStorage.getItem('kc_user');
	
	console.log('Authentication check:', { isLoggedIn, currentUser });
	console.log('All localStorage keys:', Object.keys(localStorage));
	
	if(!(isLoggedIn === '1')){
		console.log('User not logged in, redirecting to login page');
		// Add a small delay to allow debugging
		setTimeout(() => {
			window.location.href = 'login.html';
		}, 100);
		return;
	}
	
	console.log('User authenticated, loading application for:', currentUser);

	const textEl = $('#text');
	const tokenizedEl = $('#tokenized');
	const fileInput = $('#file');
	const fileAutoSpeak = $('#fileAutoSpeak');
	const loadSampleBtn = $('#loadSample');
	const imageFile = $('#imageFile');
	const ocrExtractBtn = $('#ocrExtract');
	const ocrAutoSpeak = $('#ocrAutoSpeak');
	const ocrLang = $('#ocrLang');
	const ocrTextType = $('#ocrTextType');
	const ocrStatus = $('#ocrStatus');
	const voicePreviewBtn = $('#voicePreview');
	const readFromCursorBtn = $('#readFromCursor');

	const playBtn = $('#play');
	const pauseBtn = $('#pause');
	const stopBtn = $('#stop');
	const readSelectionBtn = $('#readSelection');

	const voiceSelect = $('#voice');
	const genderSelect = $('#gender');
	const voiceWarning = $('#voiceWarning');
	const showVoicesBtn = $('#showVoices');
	const voiceListEl = $('#voiceList');
	const rateInput = $('#rate');
	const pitchInput = $('#pitch');
	const volumeInput = $('#volume');
	const highlightCheckbox = $('#highlight');

	const rateVal = $('#rateVal');
	const pitchVal = $('#pitchVal');
	const volumeVal = $('#volumeVal');
	const segmentDelay = $('#segmentDelay');
	const segmentDelayVal = $('#segmentDelayVal');
	const bgAnimateCheckbox = $('#bgAnimate');
	const bgSpeedInput = $('#bgSpeed');
	const bgSpeedVal = $('#bgSpeedVal');
	const statusText = $('#statusText');
	const logoutBtn = $('#logoutBtn');

	const LS = {
		voice: 'kc_tts_voice',
		rate: 'kc_tts_rate',
		pitch: 'kc_tts_pitch',
		volume: 'kc_tts_volume',
		highlight: 'kc_tts_highlight',
		segmentDelay: 'kc_tts_segmentDelay',
		gender: 'kc_tts_gender',
		requireGender: 'kc_tts_requireGender',
		translateTo: 'kc_translate_to',
		speechLang: 'kc_speech_lang',
		bgAnimate: 'kc_tts_bgAnimate', bgSpeed: 'kc_tts_bgSpeed',
		ocrTextType: 'kc_ocr_text_type'
		, ocrLang: 'kc_ocr_lang'
	};

	// voices holds the full list returned by speechSynthesis
	let voices = [];
	let utter = null;
	let currentText = '';
	// queued playback state for better audio quality
	let queuedUtterances = [];
	let queuedIndex = 0;
	let nextTimer = null;
	// background animation state
	let bgAnimId = null;
	// default to a blue-gray hue (~210) unless the user has a saved value
	let bgHue = (() => {
		const stored = localStorage.getItem('kc_tts_bgHue');
		return (stored !== null) ? parseFloat(stored) : 210; // blue-gray default
	})();
	let bgLastTs = null;
	let bgSpeed = parseFloat(localStorage.getItem(LS.bgSpeed) || '1.0');

	function setStatus(s, cls='status-ok'){
		statusText.textContent = s;
		statusText.className = `badge ${cls}`;
		// Update badge color based on status
		if(cls === 'status-ok') {
			statusText.className = 'badge bg-success status-ok';
		} else if(cls === 'status-busy') {
			statusText.className = 'badge bg-info status-busy';
		} else if(cls === 'status-off') {
			statusText.className = 'badge bg-danger status-off';
		}
	}

	function supportsTTS(){
		return typeof window.speechSynthesis !== 'undefined' && !!window.SpeechSynthesisUtterance;
	}

	// Tesseract worker - lazily created when OCR requested
	let ocrWorker = null;
	async function ensureOcrWorker(){
		if(ocrWorker) return ocrWorker;
		if(typeof Tesseract === 'undefined'){
			setStatus('OCR library missing', 'status-off');
			throw new Error('Tesseract.js not loaded');
		}
		// Tesseract.js v5 API
		const lang = (ocrLang && ocrLang.value) || 'eng';
		ocrWorker = await Tesseract.createWorker(lang, 1, {
			logger: m => {
				if(m && m.status){
					const prog = Math.round((m.progress||0)*100);
					let statusText = m.status.replace(/_/g, ' ');
					statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
					ocrStatus.textContent = `${statusText}${m.progress > 0 && m.progress < 1 ? ' ' + prog + '%' : ''}`;
				}
			}
		});
		return ocrWorker;
	}
	// Reusable OCR processor: recognize an image File and optionally append and/or speak
	async function processImageFile(file, { append=true, speakText=false } = {}){
		if(!file) return '';
		try{
			setStatus('ocr running','status-busy');
			ocrStatus.textContent = 'starting...';
			const worker = await ensureOcrWorker();
			// Set parameters for this recognition job
			if(ocrTextType && ocrTextType.value){
				await worker.setParameters({ tessedit_pageseg_mode: ocrTextType.value });
			}
			const lang = (ocrLang && ocrLang.value) || 'eng';
			const { data: { text } } = await worker.recognize(file, { lang: lang });
			ocrStatus.textContent = 'done';
			const added = (text||'').trim();
			if(added){
				// remember last OCR text so preview play button can use it
				window.__lastOcrText = added;
				updatePlayPreviewState();
				// dispatch an event in case UI wants to react
				try{ window.dispatchEvent(new CustomEvent('ocr:done',{detail:{text:added}})); }catch(e){}
				if(append){
					if(textEl.value && textEl.value.trim()) textEl.value += '\n\n';
					textEl.value += added;
					setStatus('OCR complete','status-ok');
				} else {
					// if not appending, leave caller to decide; return the text
					setStatus('OCR complete (not appended)','status-ok');
				}
				if(speakText){ speak(added); }
			} else {
				setStatus('No text found','status-off');
			}
			return added;
		}catch(err){
			console.error(err);
			setStatus('OCR failed','status-off');
			ocrStatus.textContent = 'error';
			return '';
		}
	}

	// Play button for previewed OCR image
	const playPreviewBtn = document.getElementById('playPreviewBtn');

	function updatePlayPreviewState(){
		if(!playPreviewBtn) return;
		if(window.__lastOcrText && window.__lastOcrText.trim()){
			playPreviewBtn.disabled = false;
			playPreviewBtn.title = 'Play last OCR result';
		} else {
			playPreviewBtn.disabled = false; // still allow speaking editor text
			playPreviewBtn.title = 'Play editor text';
		}
	}

	if(playPreviewBtn){
		playPreviewBtn.addEventListener('click', ()=>{
			const txt = (window.__lastOcrText && window.__lastOcrText.trim()) ? window.__lastOcrText : textEl.value;
			if(!txt || !txt.trim()) return setStatus('Nothing to play','status-off');
			speak(txt);
		});
		// initialize state
		updatePlayPreviewState();
	}

	// Load voice options into the select
	function loadVoices(){
			voices = speechSynthesis.getVoices().slice().sort((a,b)=> a.name.localeCompare(b.name));
			renderVoiceOptions();
	}

		// Decide if a voice string likely corresponds to a female voice (heuristic)
		function isFemaleVoice(v){
			if(!v || !v.name) return false;
			const name = (v.name + ' ' + (v.voiceURI||'')).toLowerCase();
			const femalePatterns = ['female','samantha','salli','amy','emma','ivy','joanna','alloy','victoria','luna','olivia','sophie','suzanne','angelica','penelope','rosa','linda','alice'];
			return femalePatterns.some(p => name.includes(p.toLowerCase()));
		}

		function isMaleVoice(v){
			if(!v || !v.name) return false;
			const name = (v.name + ' ' + (v.voiceURI||'')).toLowerCase();
			const malePatterns = ['male','alex','mark','john','matthew','david','daniel','max','ben','ryan','michael','paul'];
			return malePatterns.some(p => name.includes(p.toLowerCase()));
		}

		// Render voice options filtered by current gender preference
		const requireGenderCheckbox = $('#requireGender');

		function renderVoiceOptions(){
			const pref = (genderSelect && genderSelect.value) || 'any';
			const requireStrict = requireGenderCheckbox && requireGenderCheckbox.checked;
			voiceSelect.innerHTML = '';
			const filtered = voices.filter(v => {
				if(pref === 'any') return true;
				if(pref === 'female') return isFemaleVoice(v) || (!isMaleVoice(v) && v.name && v.name.toLowerCase().includes('voice'));
				if(pref === 'male') return isMaleVoice(v) || (!isFemaleVoice(v) && v.name && v.name.toLowerCase().includes('voice'));
				return true;
			});

			filtered.forEach(v => {
				const opt = document.createElement('option');
				opt.value = v.voiceURI || v.name;
				opt.textContent = `${v.name} (${v.lang || 'unknown'})${v.default? ' — default':''}`;
				opt.dataset.lang = v.lang || '';
				voiceSelect.appendChild(opt);
			});

			// Try to restore chosen voice or pick first
			const saved = localStorage.getItem(LS.voice);
			if(saved){
				const idx = Array.from(voiceSelect.options).findIndex(o => o.value === saved);
				if(idx >= 0) {
					voiceSelect.selectedIndex = idx;
					return;
				}
			}
			// if previously saved voice isn't present in filtered list, pick a best suggestion
			if(voiceSelect.options.length === 0){
				// nothing to pick, may stay empty or revert depending on requireStrict
				if(requireStrict) return; // leave empty when user requires strict gender
				// fallback: ignore requirement and show all voices
				voiceSelect.innerHTML = '';
				voices.forEach(v => {
					const opt = document.createElement('option');
					opt.value = v.voiceURI || v.name;
					opt.textContent = `${v.name} (${v.lang || 'unknown'})${v.default? ' — default':''}`;
					opt.dataset.lang = v.lang || '';
					voiceSelect.appendChild(opt);
				});
			}
			// choose a best match based on current heuristics
			const best = suggestBestVoice(pref);
			if(best){
				const idx = Array.from(voiceSelect.options).findIndex(o => o.value === (best.voiceURI || best.name));
				if(idx >= 0) voiceSelect.selectedIndex = idx;
				else voiceSelect.selectedIndex = 0;
			} else {
				voiceSelect.selectedIndex = 0;
			}
			// Update any UI warning text after the list/selection changed
			updateVoiceWarning();
		}

		// UI helper: update the voice warning area based on current selection + preference
		function updateVoiceWarning(){
			if(!voiceWarning) return;
			voiceWarning.textContent = '';
			voiceWarning.className = 'muted small';
			const pref = (genderSelect && genderSelect.value) || 'any';
			const requireStrict = requireGenderCheckbox && requireGenderCheckbox.checked;
			const selected = voices.find(v => (v.voiceURI || v.name) === voiceSelect.value);
			if(pref === 'any') return; // no warning
			if(!selected){
				if(requireStrict) {
					voiceWarning.textContent = `No ${pref} voices available (strict mode).`;
					voiceWarning.className = 'error small';
				} else {
					voiceWarning.textContent = `No ${pref} voices available — falling back to available voices.`;
					voiceWarning.className = 'warn small';
				}
				return;
			}
			// If we have a selected voice but it doesn't match the pref
			if(pref === 'female' && !isFemaleVoice(selected)){
				if(requireStrict){
					voiceWarning.textContent = `Selected voice does not match required female gender.`;
					voiceWarning.className = 'error small';
				} else {
					voiceWarning.textContent = `Selected voice appears male; choosing a female voice is recommended.`;
					voiceWarning.className = 'warn small';
				}
				return;
			}
			if(pref === 'male' && !isMaleVoice(selected)){
				if(requireStrict){
					voiceWarning.textContent = `Selected voice does not match required male gender.`;
					voiceWarning.className = 'error small';
				} else {
					voiceWarning.textContent = `Selected voice appears female; choosing a male voice is recommended.`;
					voiceWarning.className = 'warn small';
				}
				return;
			}
		}

	// Persist controls
	function saveControls(){
		localStorage.setItem(LS.rate, rateInput.value);
		localStorage.setItem(LS.pitch, pitchInput.value);
		localStorage.setItem(LS.volume, volumeInput.value);
		localStorage.setItem(LS.highlight, highlightCheckbox.checked ? '1' : '0');
		localStorage.setItem(LS.voice, voiceSelect.value);
		localStorage.setItem(LS.segmentDelay, segmentDelay.value);
		if(genderSelect) localStorage.setItem(LS.gender, genderSelect.value);
		if(bgAnimateCheckbox) localStorage.setItem(LS.bgAnimate, bgAnimateCheckbox.checked ? '1' : '0');
		if(bgSpeedInput) localStorage.setItem(LS.bgSpeed, bgSpeedInput.value);
		if(ocrTextType) localStorage.setItem(LS.ocrTextType, ocrTextType.value);
	}

	function restoreControls(){
		const r = localStorage.getItem(LS.rate);
		const p = localStorage.getItem(LS.pitch);
		const v = localStorage.getItem(LS.volume);
		const h = localStorage.getItem(LS.highlight);
		const sd = localStorage.getItem(LS.segmentDelay);
		const savedGender = localStorage.getItem(LS.gender);
		if(r) rateInput.value = r;
		if(p) pitchInput.value = p;
		if(v) volumeInput.value = v;
		if(h) highlightCheckbox.checked = h === '1';
		if(sd) segmentDelay.value = sd;
		if(savedGender && genderSelect) genderSelect.value = savedGender;
		const req = localStorage.getItem(LS.requireGender);
		const bgan = localStorage.getItem(LS.bgAnimate);
		const bgs = localStorage.getItem(LS.bgSpeed);
				if(bgs && bgSpeedInput) bgSpeedInput.value = bgs;
				if(bgSpeedVal) bgSpeedVal.textContent = (bgSpeedInput ? bgSpeedInput.value : bgSpeed) + 'x';
				if(bgan !== null){
					if(bgAnimateCheckbox) bgAnimateCheckbox.checked = bgan === '1'; // restore saved preference
				} else {
					// default behaviour when first run: disable animated background
					if(bgAnimateCheckbox) bgAnimateCheckbox.checked = false;
				}
		if(requireGenderCheckbox && req) requireGenderCheckbox.checked = req === '1';
		rateVal.textContent = rateInput.value;
		pitchVal.textContent = pitchInput.value;
		volumeVal.textContent = volumeInput.value;
		segmentDelayVal.textContent = segmentDelay.value;
		// when restoring, we should re-render voices if we already loaded them
		if(voices && voices.length) renderVoiceOptions();
		// start/stop bg animation according to settings
		if(bgAnimateCheckbox && bgAnimateCheckbox.checked){ startBgAnimation(); } else { stopBgAnimation(); document.body.style.background = ''; }
	}

	// Build a smooth, time-based animated background using HSL hues
	function applyDynamicBackground(h){
		// multi-layer colorful scheme (3 moving blobs)
		const H = h % 360;
		const hA = Math.round((H + 45) % 360);
		const hB = Math.round((H + 120) % 360);
		const hC = Math.round((H + 240) % 360);

		// compute slowly-shifting positions & pulses for rich motion
		const r1 = 15 + Math.sin(H * Math.PI/180) * 10;
		const r2 = 85 + Math.cos(H/1.5 * Math.PI/180) * 10;
		const c1y = 20 + Math.cos(H/1.9 * Math.PI/180) * 15;
		const c2y = 80 + Math.sin(H/2.0 * Math.PI/180) * 15;
		const c3x = 50 + Math.sin(H/1.1 * Math.PI/180) * 30;
		const c3y = 50 + Math.cos(H/1.3 * Math.PI/180) * 30;
		// pulse sizes for a lively shimmer
		const p1 = 700 + Math.sin(H/8 * Math.PI/180) * 200;
		const p2 = 600 + Math.cos(H/9 * Math.PI/180) * 200;
		const p3 = 900 + Math.sin(H/6 * Math.PI/180) * 250;

		// Use highly saturated, vibrant colors for a more colorful effect
		const c1 = `hsla(${hA}, 95%, 65%, 0.75)`;
		const c2 = `hsla(${hB}, 90%, 70%, 0.65)`;
		const c3 = `hsla(${hC}, 92%, 68%, 0.70)`;

		// add a vivid conic layer (very subtle) for extra richness
		const conic = `radial-gradient(circle at ${c3x}% ${c3y}%, rgba(0,0,0,0.02), transparent 20%)`;

		// Compose background using three radial blobs plus a dark linear base
		document.body.style.background = [
			`radial-gradient(${p1}px ${p1*0.67}px at ${r1}% ${c1y}%, ${c1}, transparent 28%)`,
			`radial-gradient(${p2}px ${p2*0.74}px at ${r2}% ${c2y}%, ${c2}, transparent 40%)`,
			`radial-gradient(${p3}px ${p3*0.7}px at ${c3x}% ${c3y}%, ${c3}, transparent 45%)`,
			conic,
			`linear-gradient(180deg, #fdfdff, #f8f9fa)`
		].join(', ');
	}

	function startBgAnimation(){
		if(bgAnimId) return; // already running
		document.body.setAttribute('data-bg-anim', 'on');
		bgLastTs = null;
		bgAnimId = requestAnimationFrame(function tick(ts){
			if(!bgLastTs) bgLastTs = ts;
			const dt = (ts - bgLastTs) / 1000; // seconds
			bgLastTs = ts;
			// speed: base degrees per second * multiplier
			const degreesPerSecond = 32; // faster rotation for vivid color movement
			bgHue += degreesPerSecond * dt * (parseFloat(bgSpeedInput ? bgSpeedInput.value : bgSpeed));
			// persist a small value for continuity
			localStorage.setItem('kc_tts_bgHue', String(bgHue));
			applyDynamicBackground(bgHue);
			bgAnimId = requestAnimationFrame(tick);
		});
	}

	function stopBgAnimation(){
		if(bgAnimId){ cancelAnimationFrame(bgAnimId); bgAnimId = null; }
		document.body.removeAttribute('data-bg-anim');
		// clear inline background to fall back to CSS theme
		document.body.style.background = '';
	}

	function tokenize(text){
		// Split into tokens keeping whitespace tokens so we can reconstruct
		if(!text) return [];
		// Keep line breaks and whitespace tokens
		return text.split(/(\s+)/g).map(t => ({text:t, isWord: !/^\s+$/.test(t)}));
	}

	// Normalization & segmentation helpers — split into readable sentence-like chunks
	function normalizeText(text){
		if(!text) return text;
		// collapse whitespace and keep punctuation spacing normalized
		return text.replace(/\s+/g, ' ').replace(/\s*([.,!?;:])\s*/g, '$1 ').trim();
	}

	function splitIntoSegments(text, opts = {}){
		// split on sentence boundaries but keep punctuation; fallback to original text
		const segs = text.match(/[^.!?]+[.!?]?(?:\s+|$)/g) || [text];
		const out = [];
		// adapt chunk sizes using rate and segmentDelay for a smoother result
		const rate = opts.rate || parseFloat(rateInput.value) || 1.0;
		const delay = opts.delay || parseInt(segmentDelay.value, 10) || 0;
		// base max length, then reduce when speech rate is higher or when segmentDelay is small
		let maxLen = Math.round(180 - (rate - 1) * 60 - Math.min(120, delay) / 4);
		if(maxLen < 60) maxLen = 60;
		segs.forEach(s => {
			const trimmed = s.trim();
			if(!trimmed) return;
			// keep sensible max lengths - split very long segments further
			if(trimmed.length <= maxLen){ out.push(trimmed + ' '); }
			else {
				let sub = trimmed;
				while(sub.length > Math.max(80, Math.round(maxLen * 0.66))){
					let idx = sub.lastIndexOf(' ', Math.max(80, Math.round(maxLen * 0.66)));
					if(idx <= 0) idx = 120;
					out.push(sub.slice(0, idx) + ' ');
					sub = sub.slice(idx).trim();
				}
				if(sub) out.push(sub + ' ');
			}
		});
		return out;
	}

	function renderTokenized(text){
		tokenizedEl.innerHTML = '';
		const tokens = tokenize(text);
		tokens.forEach((t,i)=>{
			const span = document.createElement('span');
			span.textContent = t.text;
			span.dataset.i = i;
			if(t.isWord) span.className = 'word';
			tokenizedEl.appendChild(span);
		});
	}

	function findTokenIndexAtCharIndex(tokens, charIndex){
		let acc = 0;
		for(let i=0;i<tokens.length;i++){
			const len = tokens[i].text.length;
			if(charIndex < acc + len) return i;
			acc += len;
		}
		return tokens.length - 1;
	}

	function speak(textToSpeak, options = {}){
		if(!supportsTTS()){
			setStatus('Speech Synthesis not supported in this browser', 'status-off');
			return;
		}

		if(!textToSpeak) return setStatus('Nothing to read', 'status-off');

		// Cancel any previous utterances and queue
		speechSynthesis.cancel();
		utter = null;
		queuedUtterances = [];
		queuedIndex = 0;
		if(nextTimer){ clearTimeout(nextTimer); nextTimer = null; }

		// normalize and split
		const normalized = normalizeText(textToSpeak);
		const segments = splitIntoSegments(normalized, { rate: parseFloat(rateInput.value), delay: parseInt(segmentDelay.value, 10) });

		const selectedVoiceUri = voiceSelect.value;
		let chosen = null;

		// If a language is specified (e.g., from translation), find a voice for it.
		if(options.lang){
			const langCode = options.lang.slice(0,2);
			chosen = voices.find(v => v.lang && v.lang.startsWith(langCode));
			if(chosen){
				setStatus(`Using voice for language: ${langCode}`, 'status-ok');
			} else {
				setStatus(`No voice found for language: ${langCode}. Using default.`, 'status-off');
			}
		}

		// If no language-specific voice was found or needed, use the user's selected voice and gender preference.
		if(!chosen){
			chosen = voices.find(v => (v.voiceURI || v.name) === selectedVoiceUri);
			// Enforce gender preference at play time
			const pref = (genderSelect && genderSelect.value) || 'any';
			const requireStrict = requireGenderCheckbox && requireGenderCheckbox.checked;
			if(pref !== 'any'){
				const matchesSelected = chosen && ((pref === 'female' && isFemaleVoice(chosen)) || (pref === 'male' && isMaleVoice(chosen)));
				if(!matchesSelected){
					// try to pick a best matching voice now
					const bestMatch = suggestBestVoice(pref, requireStrict);
					if(!bestMatch){
						if(requireStrict){
							setStatus(`No ${pref} voices available (strict mode)`, 'status-off');
							updateVoiceWarning();
							return; // abort playback because strict required but not available
						} else {
							setStatus(`No ${pref} voices found — using selected voice`, 'status-busy');
						}
					} else {
						// switch to the best match automatically so the user hears the preferred gender
						chosen = bestMatch;
						// update dropdown selection to match
						const idx = Array.from(voiceSelect.options).findIndex(o => o.value === (chosen.voiceURI || chosen.name));
						if(idx >= 0) voiceSelect.selectedIndex = idx;
						saveControls();
						setStatus(`Switched to ${chosen.name} to match ${pref}`, 'status-ok');
						updateVoiceWarning();
					}
				}
			}
		}

		// Prepare full tokens and render for highlighting
		const tokens = tokenize(normalized);
		if(highlightCheckbox.checked){
			tokenizedEl.hidden = false;
			tokenizedEl.setAttribute('aria-hidden','false');
			renderTokenized(normalized);
		} else {
			tokenizedEl.hidden = true;
			tokenizedEl.setAttribute('aria-hidden','true');
		}

		// Build offsets for segments inside normalized text
		let offset = 0;
		const offsets = [];
		segments.forEach(s => { offsets.push(offset); offset += s.length; });

		// Create utterances per segment for smoother, higher-quality playback
		segments.forEach((segText, i) => {
			const u = new SpeechSynthesisUtterance(segText);
			u.rate = parseFloat(rateInput.value);
			u.pitch = parseFloat(pitchInput.value);
			u.volume = parseFloat(volumeInput.value);
			if(chosen) u.voice = chosen;

			u.onstart = () => setStatus('speaking', 'status-busy');
			u.onerror = () => setStatus('error speaking','status-off');

			u.onboundary = (e) => {
				// charIndex can be 0 (start of string) so check for undefined/null explicitly
				if((typeof e.charIndex !== 'number') || !highlightCheckbox.checked) return;
				const globalChar = offsets[i] + e.charIndex;
				const tIdx = findTokenIndexAtCharIndex(tokens, globalChar);
				tokenizedEl.querySelectorAll('.word.active').forEach(n=>n.classList.remove('active'));
				const target = tokenizedEl.querySelector(`[data-i='${tIdx}']`);
				if(target && target.classList.contains('word')){
					target.classList.add('active');
					const rect = target.getBoundingClientRect();
					const parentRect = tokenizedEl.getBoundingClientRect();
					if(rect.top < parentRect.top || rect.bottom > parentRect.bottom){
						target.scrollIntoView({behavior:'smooth',block:'center'});
					}
				}
			};

			u.onend = () => {
				if(highlightCheckbox.checked){
					tokenizedEl.querySelectorAll('.word.active').forEach(n=>n.classList.remove('active'));
				}
				queuedIndex++;
				if(queuedIndex < queuedUtterances.length){
					nextTimer = setTimeout(() => {
						if(!speechSynthesis.paused){
							speechSynthesis.speak(queuedUtterances[queuedIndex]);
						}
					}, parseInt(segmentDelay.value, 10) || 0);
				} else {
					setStatus('idle','status-ok');
					queuedUtterances = [];
					queuedIndex = 0;
				}
			};

			queuedUtterances.push(u);
		});

		if(queuedUtterances.length) speechSynthesis.speak(queuedUtterances[0]);
		currentText = normalized;
	}

	function stop(){
		speechSynthesis.cancel();
		utter = null;
		queuedUtterances = [];
		queuedIndex = 0;
		if(nextTimer){ clearTimeout(nextTimer); nextTimer = null; }
		setStatus('stopped','status-off');
	}

	function pause(){
		if(speechSynthesis.speaking && !speechSynthesis.paused){
			speechSynthesis.pause();
			// stop scheduled next segment while paused
			if(nextTimer){ clearTimeout(nextTimer); nextTimer = null; }
			setStatus('paused','status-off');
		}
	}

	function resume(){
		if(speechSynthesis.paused){
			speechSynthesis.resume();
			setStatus('speaking','status-busy');
		}
	}

	// UI wiring
	function initUI(){
		if(!supportsTTS()){
			setStatus('Speech API not available — TTS won\'t work', 'status-off');
		} else {
			setStatus('idle','status-ok');
		}

		// Controls
		rateInput.addEventListener('input', ()=>{ rateVal.textContent = rateInput.value; saveControls(); });
		pitchInput.addEventListener('input', ()=>{ pitchVal.textContent = pitchInput.value; saveControls(); });
		volumeInput.addEventListener('input', ()=>{ volumeVal.textContent = volumeInput.value; saveControls(); });
		highlightCheckbox.addEventListener('change', () => { saveControls(); tokenizedEl.hidden = !highlightCheckbox.checked; });
		segmentDelay.addEventListener('input', ()=>{ segmentDelayVal.textContent = segmentDelay.value; saveControls(); });
		if(bgSpeedInput){
			bgSpeedInput.addEventListener('input', ()=>{
				bgSpeedVal.textContent = bgSpeedInput.value + 'x';
				saveControls();
			});
		}
		if(bgAnimateCheckbox){
			bgAnimateCheckbox.addEventListener('change', ()=>{
				saveControls();
				if(bgAnimateCheckbox.checked) startBgAnimation(); else stopBgAnimation();
			});
		}
		if(genderSelect){
			genderSelect.addEventListener('change', () => { saveControls(); renderVoiceOptions(); });
		}
		if(requireGenderCheckbox){
			requireGenderCheckbox.addEventListener('change', () => { saveControls(); renderVoiceOptions(); });
		}

		// Buttons
		playBtn.addEventListener('click', () => {
			// if paused -> resume
			if(speechSynthesis.paused){ resume(); return; }
			// otherwise start new
			const selection = textEl.value.substring(textEl.selectionStart, textEl.selectionEnd);
			const text = selection.trim() || textEl.value.trim();
			speak(text);
		});
		pauseBtn.addEventListener('click', pause);
		stopBtn.addEventListener('click', stop);

		readSelectionBtn.addEventListener('click', () => {
			const sel = textEl.value.substring(textEl.selectionStart, textEl.selectionEnd).trim();
			if(!sel) return setStatus('No selection to read','status-off');
			speak(sel, { fromSelection: true });
		});

		// File loader
		fileInput.addEventListener('change', (e) => {
			const f = e.target.files && e.target.files[0];
			if(!f) return;
			if(!f.type || !f.type.includes('text')){
				setStatus('Please select a .txt file','status-off');
				return;
			}
			const reader = new FileReader();
			reader.onload = () => { 
				const newText = reader.result;
				textEl.value = newText; 
				setStatus('file loaded','status-ok'); 
				if(fileAutoSpeak && fileAutoSpeak.checked) speak(newText);
			};
			reader.readAsText(f);
		});

		loadSampleBtn.addEventListener('click', loadSample);

		// OCR handlers
		if(imageFile && ocrExtractBtn){
			imageFile.addEventListener('change', async (e) => {
				const f = e.target.files && e.target.files[0];
				if(!f) return;
				// show preview
				const img = document.getElementById('imagePreview');
				if(img){ img.src = URL.createObjectURL(f); img.onload = () => URL.revokeObjectURL(img.src); }
				await processImageFile(f, { append: true, speakText: (ocrAutoSpeak && ocrAutoSpeak.checked) });
			});

			ocrExtractBtn.addEventListener('click', async ()=>{
				const f = imageFile.files && imageFile.files[0];
				if(!f) return setStatus('Choose an image to OCR','status-off');
				await processImageFile(f, { append: true, speakText: (ocrAutoSpeak && ocrAutoSpeak.checked) });
			});
		}

		// Camera capture button
		const cameraCaptureBtn = document.getElementById('cameraCaptureBtn');
		const imageDropZone = document.getElementById('imageDropZone');
		const imagePreview = document.getElementById('imagePreview');

		if(cameraCaptureBtn){
			cameraCaptureBtn.addEventListener('click', ()=>{
				const cap = document.createElement('input');
				cap.type = 'file';
				cap.accept = 'image/*';
				cap.capture = 'environment';
				cap.onchange = async (e) => {
					const f = e.target.files && e.target.files[0];
					if(!f) return;
					if(imagePreview){ imagePreview.src = URL.createObjectURL(f); imagePreview.onload = () => URL.revokeObjectURL(imagePreview.src); }
					await processImageFile(f, { append: true, speakText: (ocrAutoSpeak && ocrAutoSpeak.checked) });
				};
				cap.click();
			});
		}

		// Drag and drop support
		if(imageDropZone){
			['dragenter','dragover'].forEach(ev => imageDropZone.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); imageDropZone.style.borderColor = 'rgba(255,255,255,0.18)'; }));
			['dragleave','drop'].forEach(ev => imageDropZone.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); imageDropZone.style.borderColor = 'rgba(255,255,255,0.06)'; }));
			imageDropZone.addEventListener('drop', async (e)=>{
				const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
				if(!f) return setStatus('No image dropped','status-off');
				if(imagePreview){ imagePreview.src = URL.createObjectURL(f); imagePreview.onload = () => URL.revokeObjectURL(imagePreview.src); }
				await processImageFile(f, { append: true, speakText: (ocrAutoSpeak && ocrAutoSpeak.checked) });
			});
		}

		// --- Translation support using LibreTranslate (public instance) ---
		const translateTo = document.getElementById('translateTo');
		const translateBtn = document.getElementById('translateBtn');
		const translateReplace = document.getElementById('translateReplace');
		const translateSpeak = document.getElementById('translateSpeak');

		// Translation service configuration
		const TRANSLATION_CONFIG = {
			translationService: {
				// Using MyMemory Translation API - free, no API key, CORS enabled
				endpoint: 'https://api.mymemory.translated.net/get',
				provider: 'mymemory', // 'mymemory' or 'libretranslate'
				timeout: 30000
			},
			preferences: {
				targetLanguage: 'es',
				replaceMode: false,
				autoSpeak: false
			}
		};

		// Get the effective translation endpoint
		function getTranslationEndpoint() {
			return TRANSLATION_CONFIG.translationService.endpoint;
		}

		// Extract text to translate based on selection state
		function getTextToTranslate() {
			if (!textEl) return '';
			const hasSelection = textEl.selectionStart !== undefined && 
			                     textEl.selectionStart !== textEl.selectionEnd;
			if (hasSelection) {
				return textEl.value.substring(textEl.selectionStart, textEl.selectionEnd);
			}
			return textEl.value;
		}

		// Apply translation result to text area based on mode
		function applyTranslation(translatedText, replaceMode, targetLang) {
			if (!textEl || !translatedText) return;
			
			const hasSelection = textEl.selectionStart !== undefined && 
			                     textEl.selectionStart !== textEl.selectionEnd;
			
			if (replaceMode) {
				if (hasSelection) {
					// Replace only selected portion
					const before = textEl.value.substring(0, textEl.selectionStart);
					const after = textEl.value.substring(textEl.selectionEnd);
					textEl.value = before + translatedText + after;
				} else {
					// Replace entire text
					textEl.value = translatedText;
				}
			} else {
				// Append mode - add translated text after original
				const separator = '\n\n[Translated to ' + targetLang + ']\n';
				textEl.value = textEl.value + separator + translatedText;
			}
		}

		const LANGUAGES = [
		  { code: 'en', name: 'English' },
		  { code: 'es', name: 'Spanish' },
		  { code: 'fr', name: 'French' },
		  { code: 'de', name: 'German' },
		  { code: 'pt', name: 'Portuguese' },
		  { code: 'it', name: 'Italian' },
		  { code: 'ru', name: 'Russian' },
		  { code: 'zh', name: 'Chinese' },
		  { code: 'ja', name: 'Japanese' },
		  { code: 'ko', name: 'Korean' },
		  { code: 'ar', name: 'Arabic' },
		  { code: 'hi', name: 'Hindi' }
		];

		function populateTranslateLanguages(){
			if(!translateTo) return;
			translateTo.innerHTML = '';
			LANGUAGES.forEach(l => {
				const opt = document.createElement('option');
				opt.value = l.code;
				opt.textContent = l.name + ` (${l.code})`;
				translateTo.appendChild(opt);
			});
			const saved = localStorage.getItem(LS.translateTo);
			if(saved && translateTo.querySelector(`option[value="${saved}"]`)) translateTo.value = saved;
		}

		// Classify error type for better error handling
		function classifyError(err) {
			const errMsg = err.message || String(err);
			if (err instanceof TypeError && (errMsg.includes('CORS') || errMsg.includes('Failed to fetch'))) {
				return { code: 'CORS_ERROR', message: 'Translation service blocked by browser security. Using proxy...' };
			}
			if (errMsg.includes('NetworkError') || errMsg.includes('timeout')) {
				return { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' };
			}
			if (errMsg.includes('translate error')) {
				return { code: 'API_ERROR', message: errMsg };
			}
			return { code: 'UNKNOWN_ERROR', message: 'Translation failed: ' + errMsg };
		}

		async function translateText(text, targetLang){
			if(!text || !text.trim()) return '';
			try{
				if(ocrStatus) ocrStatus.textContent = 'translating...';
				const provider = TRANSLATION_CONFIG.translationService.provider;
				
				if(provider === 'mymemory'){
					// MyMemory API uses GET with query parameters
					const endpoint = getTranslationEndpoint();
					const langPair = `en|${targetLang}`; // MyMemory format: source|target
					const url = `${endpoint}?q=${encodeURIComponent(text)}&langpair=${langPair}`;
					
					const res = await fetch(url);
					if(!res.ok){
						const txt = await res.text();
						throw new Error(`translate error ${res.status}: ${txt}`);
					}
					const data = await res.json();
					if(ocrStatus) ocrStatus.textContent = 'idle';
					
					// MyMemory response format
					if(data.responseStatus === 200 || data.responseData){
						return data.responseData.translatedText || '';
					}
					throw new Error('Translation failed: ' + (data.responseDetails || 'Unknown error'));
				} else {
					// LibreTranslate format (fallback)
					const endpoint = getTranslationEndpoint();
					const res = await fetch(endpoint, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text' })
					});
					if(!res.ok){
						const txt = await res.text();
						throw new Error(`translate error ${res.status}: ${txt}`);
					}
					const data = await res.json();
					if(ocrStatus) ocrStatus.textContent = 'idle';
					return data.translatedText || data.translated || '';
				}
			}catch(err){
				const classified = classifyError(err);
				console.error('translateText error', { 
					code: classified.code, 
					message: classified.message, 
					originalError: err 
				});
				if(ocrStatus) ocrStatus.textContent = 'translate failed';
				setStatus(classified.message, 'status-off');
				return '';
			}
		}

		if(translateBtn){
			translateBtn.addEventListener('click', async () => {
				const target = translateTo.value;
				if(!target) return;
				
				// Use getTextToTranslate for proper text extraction
				const text = getTextToTranslate();
				if(!text || !text.trim()) return;
				
				// Save preference
				localStorage.setItem(LS.translateTo, target);
				
				// Disable button during translation
				translateBtn.disabled = true;
				
				// Perform translation
				const translated = await translateText(text, target);
				
				// Re-enable button
				translateBtn.disabled = false;
				
				if(!translated) return;
				
				// Apply translation using applyTranslation function
				const replaceMode = translateReplace && translateReplace.checked;
				applyTranslation(translated, replaceMode, target);
				
				// Optionally speak the translation
				if(translateSpeak && translateSpeak.checked){
					const hasSelection = textEl.selectionStart !== undefined && 
					                     textEl.selectionStart !== textEl.selectionEnd;
					speak(translated, { lang: target, fromSelection: hasSelection });
				}
			});
		}

		populateTranslateLanguages();

		// --- Speech-to-text (Google voice input via Web Speech API) ---
		const speechLang = document.getElementById('speechLang');
		const voiceInputBtn = document.getElementById('voiceInputBtn');
		const voiceReplace = document.getElementById('voiceReplace');
		const voiceSpeak = document.getElementById('voiceSpeak');
		const voiceAutoFormat = document.getElementById('voiceAutoFormat');
		const voiceStatus = document.getElementById('voiceStatus');

		function populateSpeechLanguages(){
			if(!speechLang) return;
			speechLang.innerHTML = '';
			LANGUAGES.forEach(l => {
				const opt = document.createElement('option');
				opt.value = l.code;
				opt.textContent = l.name + ` (${l.code})`;
				speechLang.appendChild(opt);
			});
			const saved = localStorage.getItem(LS.speechLang);
			if(saved && speechLang.querySelector(`option[value="${saved}"]`)) speechLang.value = saved;
			else speechLang.value = (navigator.language||'en').slice(0,2);
		}

		let recognition = null;
		let recognizing = false;

		function setVoiceStatus(s){ if(voiceStatus) voiceStatus.textContent = s; }

		function createRecognition(){
			const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
			if(!Rec) return null;
			const r = new Rec();
			r.lang = (speechLang && speechLang.value) ? speechLang.value : (navigator.language || 'en');
			r.interimResults = true;
			r.continuous = false; // stop after a short utterance; user can restart for more
			r.maxAlternatives = 1;
			r.onstart = () => { recognizing = true; setVoiceStatus('listening'); if(voiceInputBtn) voiceInputBtn.textContent = 'Stop Voice Input'; };
			r.onend = () => { recognizing = false; setVoiceStatus('idle'); if(voiceInputBtn) voiceInputBtn.textContent = 'Start Voice Input'; };
			r.onerror = (e) => { console.error('SpeechRecognition error', e); setVoiceStatus('error'); };
			r.onresult = (ev) => {
				let interim = '';
				let final = '';
				for(let i = ev.resultIndex; i < ev.results.length; ++i){
					const res = ev.results[i];
					if(res.isFinal) final += res[0].transcript;
					else interim += res[0].transcript;
				}
				if(interim && !final){ setVoiceStatus('listening (interim)'); }
					if(final){
					setVoiceStatus('received');
					// apply final transcript to textarea: replace selection if requested, else append
						let processed = final;
						// optionally apply simple auto-formatting: sentence capitalization and punctuation
						if(voiceAutoFormat && voiceAutoFormat.checked){
							processed = autoFormatTranscript(processed);
						}
						if(voiceReplace && voiceReplace.checked){
						const hasSel = textEl.selectionStart !== undefined && textEl.selectionStart !== textEl.selectionEnd;
							if(hasSel){
								const before = textEl.value.substring(0, textEl.selectionStart);
								const after = textEl.value.substring(textEl.selectionEnd);
								textEl.value = before + processed + after;
							} else {
								textEl.value = (textEl.value.trim() ? textEl.value + '\n\n' : '') + processed;
							}
					} else {
							textEl.value = (textEl.value.trim() ? textEl.value + '\n\n' : '') + processed;
					}
					if(voiceSpeak && voiceSpeak.checked){
						speak(processed);
					}
				}
			};

				// helper: simple auto-format heuristics
				function autoFormatTranscript(t){
					if(!t) return t;
					let s = t.trim();
					// normalize whitespace
					s = s.replace(/\s+/g,' ');
					// split into sentence-like chunks by pause phrases or commas? keep it simple: split by pause markers (newline) or by long pauses
					const parts = s.split(/\n+/).map(p => p.trim()).filter(Boolean);
					const closed = parts.map(p => {
						let res = p;
						// ensure first letter capitalized
						res = res.charAt(0).toUpperCase() + res.slice(1);
						// ensure ends with punctuation
						if(!/[\.\!\?]$/.test(res)) res = res + '.';
						return res;
					});
					return closed.join(' ');
				}
			return r;
		}

		if(voiceInputBtn){
			voiceInputBtn.addEventListener('click', () => {
				if(!window.SpeechRecognition && !window.webkitSpeechRecognition){
					setVoiceStatus('not supported');
					return;
				}
				if(!recognition) recognition = createRecognition();
				if(!recognition) return setVoiceStatus('not available');
				if(recognizing){ recognition.stop(); }
				else { localStorage.setItem(LS.speechLang, speechLang.value); recognition.start(); }
			});
		}

		populateSpeechLanguages();

		// Read from cursor/caret position
		if(readFromCursorBtn){
			readFromCursorBtn.addEventListener('click', () => {
				const start = textEl.selectionStart || 0;
				const end = textEl.selectionEnd || start;
				const full = textEl.value || '';
				let toRead = '';
				if(start < end){
					// a selection exists; read from caret to end of selection
					toRead = full.substring(start, end).trim();
				} else {
					// no selection: read from caret to end of text
					toRead = full.substring(start).trim();
				}
				if(!toRead) return setStatus('Nothing to read from cursor','status-off');
				speak(toRead, { fromSelection: true });
			});
		}

		// Preview voice quickly
		if(voicePreviewBtn){
			voicePreviewBtn.addEventListener('click', () => {
				if(!supportsTTS()) return setStatus('No TTS available','status-off');
				// cancel other speech
				speechSynthesis.cancel();
				const selectedVoiceUri = voiceSelect.value;
				const chosen = voices.find(v => (v.voiceURI || v.name) === selectedVoiceUri);
				const previewText = 'This is a preview of the selected voice.';
				const u = new SpeechSynthesisUtterance(previewText);
				u.rate = parseFloat(rateInput.value);
				u.pitch = parseFloat(pitchInput.value);
				u.volume = parseFloat(volumeInput.value);
				if(chosen) u.voice = chosen;
				u.onstart = () => setStatus('preview','status-busy');
				u.onend = () => setStatus('idle','status-ok');
				u.onerror = () => setStatus('preview error','status-off');
				speechSynthesis.speak(u);
			});
		}

		// Voice select change
		voiceSelect.addEventListener('change', () => { saveControls(); updateVoiceWarning(); });

		// show available voices (debug helper)
		if(showVoicesBtn && voiceListEl){
			showVoicesBtn.addEventListener('click', () => {
				const all = speechSynthesis.getVoices().map(v => `${v.name} (${v.lang||'unknown'}) ${v.default? '[default]':''}`).join('<br>');
				voiceListEl.innerHTML = all || 'no voices available yet';
				voiceListEl.hidden = false;
			});
		}

		// suggest a high-quality voice (if available)
		const suggestBtn = $('#suggestVoice');
		if(suggestBtn){
			suggestBtn.addEventListener('click', () => {
				const best = suggestBestVoice();
				if(best){
					const idx = Array.from(voiceSelect.options).findIndex(o => o.value === (best.voiceURI || best.name));
					if(idx >= 0) voiceSelect.selectedIndex = idx;
					setStatus('Suggested voice: ' + best.name, 'status-ok');
					saveControls();
				} else {
					setStatus('No voice suggestions found', 'status-off');
				}
			});
		}

		// OCR Language selection
		function populateOcrLanguages(){
			if(!ocrLang) return;
			ocrLang.innerHTML = '';
			// Use the same language list as translation
			LANGUAGES.forEach(l => {
				const opt = document.createElement('option');
				opt.value = l.code;
				opt.textContent = l.name;
				ocrLang.appendChild(opt);
			});
			const saved = localStorage.getItem(LS.ocrLang);
			if(saved && ocrLang.querySelector(`option[value="${saved}"]`)) ocrLang.value = saved;
			else ocrLang.value = 'en'; // Default to English
			ocrLang.addEventListener('change', () => localStorage.setItem(LS.ocrLang, ocrLang.value));
		}

		// OCR Text Type (Page Segmentation Mode)
		function populateOcrTextTypes(){
			if(!ocrTextType) return;
			const types = [
				{ value: '3', name: 'Automatic (Default)' },
				{ value: '1', name: 'Automatic (with OSD)' },
				{ value: '6', name: 'Block of Text' },
				{ value: '4', name: 'Single Column' },
				{ value: '11', name: 'Sparse Text' },
				{ value: '7', name: 'Single Line' },
				{ value: '8', name: 'Single Word' },
				{ value: '10', name: 'Single Character' }
			];
			ocrTextType.innerHTML = '';
			types.forEach(t => {
				const opt = document.createElement('option');
				opt.value = t.value;
				opt.textContent = t.name;
				ocrTextType.appendChild(opt);
			});
			const saved = localStorage.getItem(LS.ocrTextType);
			if(saved) ocrTextType.value = saved;
			ocrTextType.addEventListener('change', () => localStorage.setItem(LS.ocrTextType, ocrTextType.value));
		}

		// Keyboard: space = play/pause; s = stop; l = sample
		window.addEventListener('keydown', (e) => {
			const tag = document.activeElement.tagName.toLowerCase();
			if(tag === 'input' || tag === 'textarea'){
				if(e.code === 'Space' && tag !== 'button'){
					e.preventDefault();
					if(speechSynthesis.speaking && !speechSynthesis.paused){ pause(); } else if(speechSynthesis.paused){ resume(); } else { playBtn.click(); }
				}
			}

			if(e.key.toLowerCase() === 's'){
				e.preventDefault(); stop();
			}
			if(e.key.toLowerCase() === 'l'){
				e.preventDefault(); loadSample();
			}
		});
	}

	function loadSample(){
		const sample = `Hello — welcome to the TTS Reader demo.\n\nThis is a small example demonstrating text-to-speech, voice selection, and word highlighting using the browser's Web Speech API.\n\nUse the controls at right to choose a voice, adjust the rate, pitch and volume, then press Play.`;
		textEl.value = sample;
		setStatus('sample loaded','status-ok');
	}

	function attachVoiceEvents(){
		if(!supportsTTS()) return;
		// When the available voices change
		window.speechSynthesis.onvoiceschanged = () => loadVoices();
		// initial attempt
		loadVoices();
		// auto-suggest/select a high-quality voice if user hasn't explicitly chosen one
		setTimeout(()=>{
			if(!localStorage.getItem(LS.voice)){
				const pref = (genderSelect && genderSelect.value) || 'any';
				const requireStrict = requireGenderCheckbox && requireGenderCheckbox.checked;
				const best = suggestBestVoice(pref, requireStrict);
				if(best){
					const idx = voices.findIndex(v => (v.voiceURI || v.name) === (best.voiceURI || best.name));
					if(idx >= 0) voiceSelect.selectedIndex = idx;
				}
			}
		}, 300);
	}

	// Initialize user greeting
	function initUserGreeting() {
		const userGreeting = document.getElementById('userGreeting');
		if (!userGreeting) {
			console.error('User greeting element not found');
			return;
		}

		const currentUser = localStorage.getItem('kc_user');
		const userData = localStorage.getItem('kc_user_data');
		
		console.log('Initializing user greeting for:', currentUser);
		
		if (userData) {
			try {
				const user = JSON.parse(userData);
				const displayName = user.fullName || user.username || currentUser;
				userGreeting.textContent = displayName;
				console.log('User greeting set to:', displayName);
				
				// Add user role badge if admin
				if (user.username === 'admin') {
					userGreeting.innerHTML = `${displayName} <span class="badge bg-danger ms-1" style="font-size: 0.7rem;">Admin</span>`;
				}
			} catch (error) {
				console.log('Could not parse user data:', error);
				userGreeting.textContent = currentUser || 'User';
			}
		} else {
			userGreeting.textContent = currentUser || 'Guest';
			console.log('User greeting set to fallback:', currentUser || 'Guest');
		}
	}

	// Initialize
	restoreControls();
	initUI();
	attachVoiceEvents();
	populateOcrLanguages();
	populateOcrTextTypes();
	
	// Initialize user greeting with delay to ensure DOM is ready
	setTimeout(() => {
		initUserGreeting();
	}, 100);

	// Logout button: clear client-side login flag and return to login page
	if(logoutBtn){
		console.log('Logout button found and event listener attached');
		logoutBtn.addEventListener('click', async (e)=>{
			e.preventDefault();
			console.log('Logout button clicked');
			
			// Show confirmation dialog
			const confirmLogout = confirm('Are you sure you want to logout?');
			if (!confirmLogout) {
				console.log('Logout cancelled by user');
				return;
			}
			
			console.log('Logging out user...');
			
			// Get current user
			const currentUser = localStorage.getItem('kc_user');
			
			// Show logout message
			setStatus('Logging out...', 'status-busy');
			
			// Add visual feedback
			logoutBtn.disabled = true;
			logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Logging out...';
			
			// Record logout in database if user is not guest
			if (currentUser && currentUser !== 'guest' && window.authDB) {
				try {
					await window.authDB.logoutUser(currentUser);
					console.log('Logout recorded in database');
				} catch (error) {
					console.log('Could not record logout in database:', error);
				}
			}
			
			// Clear all authentication data
			localStorage.removeItem('kc_logged_in');
			localStorage.removeItem('kc_user');
			localStorage.removeItem('kc_user_data');
			
			// Redirect after a short delay
			setTimeout(() => {
				console.log('Redirecting to login page...');
				window.location.href = 'login.html';
			}, 1000);
		});
	} else {
		console.error('Logout button not found! Check if element with id "logoutBtn" exists.');
		// Try to find the button with a different method
		const logoutBtnDirect = document.getElementById('logoutBtn');
		if (logoutBtnDirect) {
			console.log('Found logout button with direct method, attaching event');
			logoutBtnDirect.addEventListener('click', async (e) => {
				e.preventDefault();
				console.log('Logout button clicked (direct method)');
				
				const confirmLogout = confirm('Are you sure you want to logout?');
				if (!confirmLogout) return;
				
				const currentUser = localStorage.getItem('kc_user');
				
				// Clear authentication data
				localStorage.removeItem('kc_logged_in');
				localStorage.removeItem('kc_user');
				localStorage.removeItem('kc_user_data');
				
				// Redirect to login
				window.location.href = 'login.html';
			});
		}
	}

	// Make sure we also persist settings on unload
	window.addEventListener('beforeunload', saveControls);

	// helper to suggest a high-quality voice if available
	function suggestBestVoice(preferredGender = 'any', requireStrict = false){
		if(!voices || !voices.length) return null;
		// prefer higher-quality/neural patterns, then try to match gender preference
		const patterns = ['Neural','WaveNet','Wavenet','Google','Microsoft','Azure','Alloy','Deep','Samantha','Alex'];
		// filter by gender if requested
		let searchPool = voices.slice();
		if(preferredGender === 'female') searchPool = voices.filter(v => isFemaleVoice(v));
		if(preferredGender === 'male') searchPool = voices.filter(v => isMaleVoice(v));
		if(searchPool.length === 0){
			if(requireStrict) return null;
			searchPool = voices.slice();
		}
		for(const p of patterns){
			const v = searchPool.find(v => (v.name||'').includes(p) || (v.voiceURI||'').includes(p));
			if(v) return v;
		}
		// fallback language match
		const lang = (navigator.language || 'en').slice(0,2);
		const match = voices.find(v => v.lang && v.lang.slice(0,2) === lang);
		return match || voices[0];
	}
})();
