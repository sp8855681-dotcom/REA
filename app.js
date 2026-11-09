const authScreen = document.querySelector('#auth-screen');
const loadingScreen = document.querySelector('#loading-screen');
const dashboard = document.querySelector('#dashboard');
const authForm = document.querySelector('#auth-form');
const authSwitch = document.querySelector('#auth-switch');
const nameField = document.querySelector('#name-field');
const nameWrap = document.querySelector('#name-wrap');
const passwordField = document.querySelector('#password-field');
const permissionModal = document.querySelector('#permission-modal');
const dashboardContent = document.querySelector('#dashboard-content');
const homeMarkup = dashboardContent.innerHTML;
const toast = document.querySelector('#toast');

let isSignIn = false;
let currentName = sessionStorage.getItem('rea-current-name') || localStorage.getItem('rea-name') || 'Alex';
let toastTimeout;
let deferredInstallPrompt;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 2800);
}

function startIntroLoading() {
  const name = document.querySelector('#typing-name');
  name.textContent = '';
  let index = 0;
  const typeNextLetter = () => {
    if (index < 3) {
      name.textContent += 'REA'[index];
      index += 1;
      window.setTimeout(typeNextLetter, 350);
      return;
    }

    window.setTimeout(() => {
      loadingScreen.hidden = true;
      authScreen.hidden = false;
    }, 650);
  };
  window.setTimeout(typeNextLetter, 350);
}

function setAuthMode(signIn) {
  isSignIn = signIn;
  nameWrap.hidden = signIn;
  nameField.required = !signIn;
  nameField.autocomplete = signIn ? 'off' : 'name';
  passwordField.autocomplete = signIn ? 'current-password' : 'new-password';
  document.querySelector('#auth-title').innerHTML = signIn
    ? 'Good to have<br>you back.'
    : 'Make space for<br>your best work.';
  document.querySelector('.auth-subtitle').textContent = signIn
    ? 'Sign in to pick up right where your ideas left off.'
    : 'Create your REA space. No setup overwhelm, just a better place to begin.';
  document.querySelector('#submit-label').textContent = signIn ? 'Sign in to REA' : 'Create my space';
  document.querySelector('#auth-switch').textContent = signIn ? 'Create account' : 'Sign in';
  document.querySelector('#password-field').placeholder = signIn ? 'Enter your password' : 'Create a password';
  document.querySelector('.password-hint').textContent = signIn ? '' : 'At least 8 characters';
  document.querySelector('.top-help').firstChild.textContent = signIn ? 'New to REA? ' : 'Already have an account? ';
  document.querySelector('#form-error').textContent = '';
}

function startLoading(name) {
  currentName = name.trim().split(/\s+/)[0] || 'friend';
  sessionStorage.setItem('rea-current-name', currentName);
  authScreen.hidden = true;
  loadingScreen.hidden = false;
  document.querySelector('#typing-name').textContent = '';
  document.querySelector('#loading-caption').innerHTML = `Getting your space ready, ${escapeHtml(currentName)}<span class="loading-dots">...</span>`;

  const letters = 'REA';
  let index = 0;
  const typeNextLetter = () => {
    if (index < letters.length) {
      document.querySelector('#typing-name').textContent += letters[index];
      index += 1;
      window.setTimeout(typeNextLetter, 300);
      return;
    }

    window.setTimeout(() => {
      loadingScreen.hidden = true;
      dashboard.hidden = false;
      prepareDashboard();
      if (!localStorage.getItem('rea-permissions-decided')) openPermissionModal();
    }, 750);
  };
  window.setTimeout(typeNextLetter, 350);
}

function prepareDashboard() {
  const firstName = currentName.charAt(0).toUpperCase() + currentName.slice(1);
  restoreHomeView();
  document.querySelector('#profile-name').textContent = firstName;
  document.querySelector('#avatar-initials').textContent = firstName.charAt(0).toUpperCase();
  document.querySelector('#top-avatar').textContent = firstName.charAt(0).toUpperCase();
  document.querySelector('#welcome-title').textContent = `A little space to think, ${firstName}.`;
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  document.querySelector('#full-date').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
}

function openPermissionModal() {
  const savedPermissions = JSON.parse(localStorage.getItem('rea-permissions') || '[]');
  document.querySelectorAll('input[name="permission"]').forEach((input) => {
    input.checked = savedPermissions.includes(input.value);
  });
  permissionModal.hidden = false;
  document.querySelector('#permission-close').focus();
}

function closePermissionModal(decided) {
  permissionModal.hidden = true;
  if (decided) localStorage.setItem('rea-permissions-decided', 'true');
}

function restoreHomeView() {
  dashboardContent.innerHTML = homeMarkup;
  bindHomeActions();
  setActiveNav('home');
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
    const active = item.dataset.view === view;
    item.classList.toggle('active', active);
    const oldIndicator = item.querySelector('.nav-current');
    if (active && !oldIndicator) item.insertAdjacentHTML('beforeend', '<span class="nav-current"></span>');
    if (!active && oldIndicator) oldIndicator.remove();
  });
  const labels = { home: 'HOME', call: 'CALL REA', chat: 'CHAT WITH REA', notes: 'THOUGHT CATCHER', preferences: 'PREFERENCES' };
  document.querySelector('#breadcrumb-current').textContent = labels[view] || 'HOME';
}

function bindHomeActions() {
  document.querySelector('#call-rea-button').addEventListener('click', () => {
    setActiveNav('call');
    callRea();
  });
  document.querySelector('#open-chat').addEventListener('click', () => renderView('chat'));
  document.querySelector('#manage-permissions').addEventListener('click', openPermissionModal);
  document.querySelector('#thought-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#thought-input');
    const thought = input.value.trim();
    if (!thought) {
      input.focus();
      return;
    }
    const thoughts = JSON.parse(localStorage.getItem('rea-thoughts') || '[]');
    thoughts.unshift(thought);
    localStorage.setItem('rea-thoughts', JSON.stringify(thoughts.slice(0, 20)));
    document.querySelector('#thought-saved').textContent = `Saved for later: “${thought}”`;
    input.value = '';
    showToast('Thought tucked away for later.');
  });
  document.querySelectorAll('.voice-option').forEach((option) => {
    option.addEventListener('click', () => selectVoice(option.dataset.voice));
  });
  document.querySelector('#preview-voice').addEventListener('click', previewVoice);
  applySavedVoice();
}

function selectVoice(voice) {
  localStorage.setItem('rea-voice', voice);
  document.querySelectorAll('.voice-option').forEach((option) => {
    const selected = option.dataset.voice === voice;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-pressed', String(selected));
  });
  const label = voice === 'masculine' ? 'Male' : 'Female';
  document.querySelector('#voice-status').textContent = `${label} voice selected`;
}

function applySavedVoice() {
  const savedVoice = localStorage.getItem('rea-voice') || 'feminine';
  const selected = document.querySelector(`.voice-option[data-voice="${savedVoice}"]`);
  if (selected) selectVoice(savedVoice);
}

function previewVoice() {
  if (!('speechSynthesis' in window)) {
    showToast('Voice preview is not available in this browser.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(`Hi ${currentName}, I'm REA. Let's find a rhythm that works for you.`);
  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function getPreferredVoice() {
  const requestedGender = localStorage.getItem('rea-voice') || 'feminine';
  return window.speechSynthesis.getVoices().find((candidate) => {
    const name = candidate.name.toLowerCase();
    return requestedGender === 'feminine'
      ? /female|woman|samantha|victoria|karen|zira|susan/.test(name)
      : /\b(male|man)\b|daniel|david|alex|mark|james/.test(name);
  });
}

function callRea() {
  const card = document.querySelector('#call-rea-card');
  const response = document.querySelector('#assistant-response');
  const button = document.querySelector('#call-rea-button');
  if (!card || card.classList.contains('is-calling')) return;

  const firstName = currentName.charAt(0).toUpperCase() + currentName.slice(1);
  const greeting = `I'm here, ${firstName}. What would you like to work through?`;
  response.textContent = greeting;
  card.classList.add('is-calling');
  button.disabled = true;

  let finished = false;
  const finishCall = () => {
    if (finished) return;
    finished = true;
    card.classList.remove('is-calling');
    button.disabled = false;
  };
  if (!('speechSynthesis' in window)) {
    window.setTimeout(finishCall, 2600);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(greeting);
  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = finishCall;
  utterance.onerror = finishCall;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  window.setTimeout(finishCall, 8000);
}

function getConversation() {
  const conversation = JSON.parse(localStorage.getItem('rea-conversation') || '[]');
  return Array.isArray(conversation) ? conversation : [];
}

function saveConversation(conversation) {
  localStorage.setItem('rea-conversation', JSON.stringify(conversation.slice(-60)));
}

function createMessage(role, text, relatedThought) {
  const message = { role, text, time: Date.now() };
  if (relatedThought) message.relatedThought = relatedThought;
  const conversation = getConversation();
  conversation.push(message);
  saveConversation(conversation);
  appendMessage(message);
}

function appendMessage(message) {
  const list = document.querySelector('#conversation-list');
  if (!list) return;

  const article = document.createElement('article');
  article.className = `chat-message ${message.role === 'user' ? 'user-message' : 'rea-message'}`;
  const mark = document.createElement('span');
  mark.className = 'chat-message-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = message.role === 'user' ? currentName.charAt(0).toUpperCase() : '✳';
  const body = document.createElement('div');
  body.className = 'chat-message-body';
  const meta = document.createElement('div');
  meta.className = 'chat-message-meta';
  const author = document.createElement('b');
  author.textContent = message.role === 'user' ? 'You' : 'REA';
  const time = document.createElement('time');
  time.dateTime = new Date(message.time).toISOString();
  time.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.time));
  meta.append(author, time);
  const bubble = document.createElement('p');
  bubble.className = 'chat-bubble';
  bubble.textContent = message.text;
  body.append(meta, bubble);

  if (message.role === 'user') {
    const saveButton = document.createElement('button');
    saveButton.className = 'message-action';
    saveButton.type = 'button';
    saveButton.textContent = 'Save thought';
    saveButton.addEventListener('click', () => saveThought(message.text));
    body.append(saveButton);
  } else {
    const controls = document.createElement('div');
    controls.className = 'message-controls';
    const copyButton = document.createElement('button');
    copyButton.className = 'message-action';
    copyButton.type = 'button';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(message.text);
        showToast('REA’s reply copied.');
      } catch (error) {
        showToast('Could not copy here. You can select the reply text instead.');
      }
    });
    const speakButton = document.createElement('button');
    speakButton.className = 'message-action';
    speakButton.type = 'button';
    speakButton.textContent = 'Read aloud';
    speakButton.addEventListener('click', () => speakReply(message.text));
    controls.append(copyButton, speakButton);
    body.append(controls);
    if (message.relatedThought) {
      const actionCard = document.createElement('div');
      actionCard.className = 'response-action-card';
      const actionText = document.createElement('span');
      actionText.textContent = 'Want to keep your thought for later?';
      const saveButton = document.createElement('button');
      saveButton.className = 'message-action';
      saveButton.type = 'button';
      saveButton.textContent = 'Save thought ↗';
      saveButton.addEventListener('click', () => saveThought(message.relatedThought));
      actionCard.append(actionText, saveButton);
      body.append(actionCard);
    }
  }

  article.append(mark, body);
  list.append(article);
  list.scrollTop = list.scrollHeight;
}

function saveThought(text) {
  const thoughts = JSON.parse(localStorage.getItem('rea-thoughts') || '[]');
  thoughts.unshift(text);
  localStorage.setItem('rea-thoughts', JSON.stringify(thoughts.slice(0, 20)));
  showToast('Thought tucked away for later.');
}

function previewReply(text) {
  const normalized = text.toLowerCase();
  let response = 'Thanks for sharing that with me. What feels like the smallest useful next step? We can take it one piece at a time.';
  if (/\b(stress|stressed|overwhelm(?:ed|ing)?|anxious|too much|tired)\b/.test(normalized)) {
    response = 'That sounds like a lot to carry. Let’s make a little room: what is one thing that needs your attention first, and what can wait?';
  } else if (/\b(idea|ideas|brainstorm|creative|design)\b/.test(normalized)) {
    response = 'Let’s explore it together. What’s the part of that idea you’re most excited about? We can build from there.';
  } else if (/\b(write|writing|draft|email|message)\b/.test(normalized)) {
    response = 'I can help you shape your words. Who is this for, and what would you like them to understand or do?';
  } else if (/\b(plan|planning|organize|organise|where do i start|next step)\b/.test(normalized)) {
    response = 'Let’s make it feel manageable. Name the outcome you want, then we can break it into one small first step.';
  } else if (/\b(hello|hi|hey)\b/.test(normalized)) {
    response = `Hi ${currentName}! I’m glad you’re here. What’s on your mind today?`;
  }
  return `${response} (REA preview reply — live AI responses will be connected separately.)`;
}

function sendChatMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  createMessage('user', trimmed);
  const input = document.querySelector('#chat-input');
  input.value = '';
  updateChatStatus('REA is thinking…');
  document.querySelector('#chat-send').disabled = true;
  const indicator = document.querySelector('#chat-thinking');
  indicator.hidden = false;
  window.setTimeout(() => {
    if (!document.querySelector('#conversation-list')) return;
    indicator.hidden = true;
    createMessage('assistant', previewReply(trimmed), trimmed);
    document.querySelector('#chat-send').disabled = false;
    updateChatStatus('Preview mode · replies are sample text, not live AI.');
    input.focus();
  }, 650);
}

function updateChatStatus(text) {
  const status = document.querySelector('#chat-status');
  if (status) status.textContent = text;
}

function speakReply(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech playback is not available in this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;
  utterance.onstart = () => {
    updateChatStatus('REA is speaking…');
    const stopButton = document.querySelector('#stop-speaking');
    if (stopButton) stopButton.hidden = false;
  };
  const finishSpeaking = () => {
    const stopButton = document.querySelector('#stop-speaking');
    if (stopButton) stopButton.hidden = true;
    updateChatStatus('Preview mode · replies are sample text, not live AI.');
  };
  utterance.onend = finishSpeaking;
  utterance.onerror = finishSpeaking;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  const stopButton = document.querySelector('#stop-speaking');
  if (stopButton) stopButton.hidden = true;
  updateChatStatus('Preview mode · replies are sample text, not live AI.');
}

function startVoiceInput() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showToast('Voice input is not supported in this browser. You can type your message instead.');
    return;
  }

  const button = document.querySelector('#chat-mic');
  if (button.dataset.listening === 'true') {
    window.activeRecognition?.stop();
    return;
  }

  const recognition = new Recognition();
  window.activeRecognition = recognition;
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => {
    if (!button.isConnected) {
      recognition.stop();
      return;
    }
    button.dataset.listening = 'true';
    button.setAttribute('aria-label', 'Stop voice input');
    button.textContent = '■';
    updateChatStatus('Listening… tap stop when you’re done.');
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join('');
    const input = document.querySelector('#chat-input');
    if (input) input.value = transcript;
  };
  recognition.onerror = (event) => {
    const reason = event.error === 'not-allowed'
      ? 'Microphone access was not allowed. You can continue by typing.'
      : `Voice input stopped (${event.error}). You can continue by typing.`;
    updateChatStatus(reason);
  };
  recognition.onend = () => {
    if (button.isConnected) {
      button.dataset.listening = 'false';
      button.setAttribute('aria-label', 'Start voice input');
      button.textContent = '♩';
    }
    if (document.querySelector('#chat-status')?.textContent.startsWith('Listening')) {
      updateChatStatus('Voice input ready.');
    }
    document.querySelector('#chat-input')?.focus();
    window.activeRecognition = null;
  };
  try {
    recognition.start();
  } catch (error) {
    updateChatStatus('Could not start voice input. Please try typing instead.');
    showToast('Voice input could not start.');
  }
}

function renderView(view) {
  if (view !== 'chat' && window.activeRecognition) {
    window.activeRecognition.stop();
    window.activeRecognition = null;
  }
  if (view !== 'chat' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    stopSpeaking();
  }
  setActiveNav(view);
  if (view === 'home') {
    prepareDashboard();
    return;
  }

  if (view === 'call') {
    if (!document.querySelector('#call-rea-card')) prepareDashboard();
    setActiveNav('call');
    callRea();
    return;
  }

  if (view === 'chat') {
    renderChatView();
    return;
  }

  if (view === 'notes') {
    const thoughts = JSON.parse(localStorage.getItem('rea-thoughts') || '[]');
    dashboardContent.innerHTML = `<section class="alt-view"><p class="eyebrow">A GENTLE PLACE TO PARK YOUR IDEAS</p><h2>Thought Catcher</h2><p>Keep a thought here so you can return to it later. Your notes stay in this browser on this device.</p><form class="note-task-form" id="note-form"><label class="sr-only" for="note-input">Capture a thought</label><input id="note-input" type="text" maxlength="120" placeholder="A thought, a reminder, a little spark…" required><button type="submit">Save thought ↗</button></form><ul class="task-list" id="note-list"></ul></section>`;
    const list = document.querySelector('#note-list');
    thoughts.forEach((thought) => addTaskElement(list, thought));
    document.querySelector('#note-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.querySelector('#note-input');
      const thought = input.value.trim();
      if (!thought) return;
      const currentThoughts = JSON.parse(localStorage.getItem('rea-thoughts') || '[]');
      currentThoughts.unshift(thought);
      localStorage.setItem('rea-thoughts', JSON.stringify(currentThoughts.slice(0, 20)));
      addTaskElement(list, thought);
      input.value = '';
      showToast('Thought tucked away for later.');
    });
    return;
  }

  function renderChatView() {
    dashboardContent.innerHTML = `
      <section class="conversation-view" aria-labelledby="conversation-title">
        <header class="conversation-header">
          <div><p class="eyebrow"><span class="status-dot"></span> A LITTLE SPACE TO THINK OUT LOUD</p><h1 id="conversation-title">Chat with REA</h1><p>Share what’s on your mind, or start with a prompt below.</p></div>
          <div class="conversation-header-actions"><button class="stop-speaking-button" id="stop-speaking" type="button" hidden>Stop speaking</button><button class="new-chat-button" id="new-chat" type="button"><span aria-hidden="true">＋</span> New chat</button></div>
        </header>
        <div class="preview-notice"><span aria-hidden="true">✳</span><p><b>Front-end preview</b><br>REA’s AI replies aren’t connected yet. Messages here are sample responses and stay in this browser.</p></div>
        <div class="conversation-scroll" id="conversation-list" role="log" aria-live="polite" aria-relevant="additions text"></div>
        <div class="chat-thinking" id="chat-thinking" hidden><span class="thinking-dots"><i></i><i></i><i></i></span><span>REA is thinking</span></div>
        <div class="suggested-prompts" id="suggested-prompts">
          <span>TRY ASKING</span>
          <button type="button">Help me get started</button><button type="button">I have an idea</button><button type="button">I feel overwhelmed</button>
        </div>
        <form class="chat-composer" id="chat-form">
          <label class="sr-only" for="chat-input">Message REA</label>
          <textarea id="chat-input" rows="1" maxlength="800" placeholder="Write what’s on your mind…" required></textarea>
          <div class="composer-controls"><span id="chat-status" role="status">Preview mode · replies are sample text, not live AI.</span><div><button class="chat-mic" id="chat-mic" type="button" aria-label="Start voice input">♩</button><button class="chat-send" id="chat-send" type="submit" aria-label="Send message">↑</button></div></div>
        </form>
        <p class="conversation-privacy">Microphone permission is requested only when you tap the mic. Your typed conversation is stored in this browser.</p>
      </section>`;

    const conversation = getConversation();
    conversation.forEach(appendMessage);
    if (!conversation.length) {
      const firstName = currentName.charAt(0).toUpperCase() + currentName.slice(1);
      appendMessage({
        role: 'assistant',
        text: `Hi ${firstName}, I’m REA. What would you like to think through today?`,
        time: Date.now(),
      });
    }

    document.querySelector('#chat-form').addEventListener('submit', (event) => {
      event.preventDefault();
      sendChatMessage(document.querySelector('#chat-input').value);
    });
    document.querySelector('#chat-mic').addEventListener('click', startVoiceInput);
    document.querySelector('#stop-speaking').addEventListener('click', stopSpeaking);
    document.querySelector('#new-chat').addEventListener('click', () => {
      if (window.activeRecognition) {
        window.activeRecognition.stop();
        window.activeRecognition = null;
      }
      stopSpeaking();
      localStorage.removeItem('rea-conversation');
      renderChatView();
      document.querySelector('#chat-input').focus();
    });
    document.querySelectorAll('.suggested-prompts button').forEach((button) => {
      button.addEventListener('click', () => sendChatMessage(button.textContent));
    });
    document.querySelector('#chat-input').addEventListener('input', (event) => {
      event.currentTarget.style.height = 'auto';
      event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 140)}px`;
    });
    document.querySelector('#chat-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.querySelector('#chat-form').requestSubmit();
      }
    });
    document.querySelector('#chat-input').focus();
  }

  if (view === 'preferences') {
    dashboardContent.innerHTML = `
      <section class="alt-view">
        <p class="eyebrow">YOUR SPACE, YOUR WAY</p>
        <h2>Preferences</h2>
        <p>Make REA feel like your own. Choose a voice, adjust motion, and manage laptop permissions.</p>
        <div class="panel voice-panel preferences-voice">
          <div class="panel-heading"><div><p class="eyebrow">MAKE IT SOUND LIKE YOU</p><h3>REA's voice</h3></div></div>
          <p class="panel-description">Pick the voice you feel most comfortable hearing.</p>
          <div class="voice-options" role="group" aria-label="Choose a voice">
            <button class="voice-option" type="button" data-voice="feminine"><span class="voice-avatar voice-f">F</span><span><b>Female</b><small>Warm &amp; clear</small></span><span class="voice-check">✓</span></button>
            <button class="voice-option" type="button" data-voice="masculine"><span class="voice-avatar voice-m">M</span><span><b>Male</b><small>Calm &amp; steady</small></span><span class="voice-check">✓</span></button>
          </div>
          <div class="panel-foot voice-foot"><span id="voice-status"></span><button id="preview-voice" type="button"><span>▶</span> Preview</button></div>
        </div>
        <div class="panel accessibility-panel">
          <div><p class="eyebrow">MAKE IT COMFORTABLE</p><h3>Reduce animations</h3><p>Turn off REA's decorative motion.</p></div>
          <button class="accessibility-toggle" id="reduce-motion" type="button" aria-pressed="false"><span></span><b>Off</b></button>
        </div>
        <button class="inline-link preferences-permissions" id="preference-permissions" type="button">Manage laptop permissions ↗</button>
      </section>`;
    document.querySelectorAll('.voice-option').forEach((option) => option.addEventListener('click', () => selectVoice(option.dataset.voice)));
    document.querySelector('#preview-voice').addEventListener('click', previewVoice);
    document.querySelector('#preference-permissions').addEventListener('click', openPermissionModal);
    bindReducedMotionPreference();
    applySavedVoice();
  }
}

function bindReducedMotionPreference() {
  const toggle = document.querySelector('#reduce-motion');
  const enabled = localStorage.getItem('rea-reduced-motion') === 'true';
  document.body.classList.toggle('rea-reduced-motion', enabled);
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.querySelector('b').textContent = enabled ? 'On' : 'Off';
  toggle.addEventListener('click', () => {
    const nextEnabled = toggle.getAttribute('aria-pressed') !== 'true';
    localStorage.setItem('rea-reduced-motion', String(nextEnabled));
    document.body.classList.toggle('rea-reduced-motion', nextEnabled);
    toggle.setAttribute('aria-pressed', String(nextEnabled));
    toggle.querySelector('b').textContent = nextEnabled ? 'On' : 'Off';
  });
}

function addTaskElement(list, text) {
  const item = document.createElement('li');
  item.textContent = text;
  list.append(item);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

authSwitch.addEventListener('click', () => setAuthMode(!isSignIn));
authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = isSignIn
    ? (localStorage.getItem('rea-name') || document.querySelector('#email-field').value.split('@')[0] || 'friend')
    : nameField.value.trim();
  const password = passwordField.value;
  const error = document.querySelector('#form-error');
  if (password.length < 8) {
    error.textContent = 'Please use at least 8 characters for your password.';
    passwordField.focus();
    return;
  }
  if (!isSignIn) localStorage.setItem('rea-name', name);
  error.textContent = '';
  startLoading(name);
});

document.querySelector('#show-password').addEventListener('click', (event) => {
  const show = passwordField.type === 'password';
  passwordField.type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
  item.addEventListener('click', () => renderView(item.dataset.view));
});
document.querySelector('#connect-nav').addEventListener('click', openPermissionModal);
document.querySelector('#profile-button').addEventListener('click', () => renderView('preferences'));
document.querySelector('#top-avatar').addEventListener('click', () => renderView('preferences'));
document.querySelector('#help-button').addEventListener('click', () => showToast('Call REA when you need a little help, or save a thought for later.'));
document.querySelector('#date-pill').addEventListener('click', () => showToast('Your day, at your pace.'));

document.querySelector('#save-permissions').addEventListener('click', () => {
  const granted = Array.from(document.querySelectorAll('input[name="permission"]:checked')).map((input) => input.value);
  localStorage.setItem('rea-permissions', JSON.stringify(granted));
  closePermissionModal(true);
  showToast(granted.length ? 'Your choices are saved. REA will always ask before acting.' : 'No laptop connections enabled. You can decide anytime.');
});
document.querySelector('#skip-permissions').addEventListener('click', () => {
  localStorage.setItem('rea-permissions', JSON.stringify([]));
  closePermissionModal(true);
  showToast('No laptop connections enabled. You can decide anytime.');
});
document.querySelector('#permission-close').addEventListener('click', () => closePermissionModal(false));
permissionModal.addEventListener('click', (event) => {
  if (event.target === permissionModal) closePermissionModal(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !permissionModal.hidden) closePermissionModal(false);
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.querySelector('#install-app').hidden = false;
});
document.querySelector('#install-app').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  await deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = undefined;
  document.querySelector('#install-app').hidden = true;
  if (choice.outcome === 'accepted') showToast('REA is ready to install.');
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = undefined;
  document.querySelector('#install-app').hidden = true;
  showToast('REA is installed on your device.');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch((error) => {
    console.error('REA offline support could not be enabled.', error);
  });
}

function loadRememberedName() {
  const savedName = localStorage.getItem('rea-name');
  if (savedName) nameField.value = savedName;
}
loadRememberedName();
document.body.classList.toggle('rea-reduced-motion', localStorage.getItem('rea-reduced-motion') === 'true');
startIntroLoading();
